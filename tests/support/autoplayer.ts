import type { ReceptionSimulation } from '../../src/core/sim/ReceptionSimulation';
import type { TargetRef } from '../../src/core/sim/state';
import { SIM_STEP_SECONDS } from '../../src/core/sim/ReceptionSimulation';

/**
 * A greedy automated player used to prove levels are winnable and to
 * calibrate star thresholds. It is deliberately "good but not perfect":
 * it reacts only when idle and plans one step at a time, with a reaction delay.
 */
export function autoplay(sim: ReceptionSimulation, reactionSeconds = 0.35): void {
  let cooldown = 0;
  while (!sim.isOver) {
    sim.step(SIM_STEP_SECONDS);
    sim.drainEvents();
    cooldown -= SIM_STEP_SECONDS;
    if (cooldown > 0) continue;
    cooldown = reactionSeconds;
    seatEveryone(sim);
    const p = sim.state.planner;
    if (p.current || p.queue.length) continue;
    const target = chooseAction(sim);
    if (target) sim.command({ type: 'queueAction', target });
  }
}

function seatEveryone(sim: ReceptionSimulation): void {
  const ctx = sim.context;
  for (const g of sim.state.guests) {
    if (g.state !== 'WAITING_TO_BE_SEATED' && g.state !== 'ARRIVING') continue;
    const preview = sim.seatingPreview(g.key);
    let best: { seat: string; score: number } | null = null;
    for (const table of ctx.venue.tables) {
      for (const seat of table.seats) {
        const taken = sim.state.guests.some((o) => o.seatId === seat.id && o.state !== 'UPSET' && o.state !== 'LEAVING' && o.state !== 'GONE');
        if (taken) continue;
        const score = preview.get(table.id) ?? 0;
        if (!best || score > best.score) best = { seat: seat.id, score };
      }
    }
    if (best) sim.command({ type: 'seatGuest', guestKey: g.key, seatId: best.seat });
  }
}

function chooseAction(sim: ReceptionSimulation): TargetRef | null {
  const ctx = sim.context;
  const s = sim.state;
  const hands = s.planner.hands;
  const handsUsed = hands.reduce((n, id) => n + ctx.content.items.get(id).hands, 0);
  const room = ctx.tuning.hands - handsUsed;
  const stationFor = (itemId: string) => ctx.venue.def.stations.find((st) => st.providesItemId === itemId);

  const req = s.couple.request;
  if (req) {
    if (hands.includes(req.itemId)) return { kind: 'couple' };
    const need = ctx.content.items.get(req.itemId).hands;
    if (room < need) {
      if (hands.includes('gift')) return { kind: 'station', id: ctx.venue.firstStationOfKind('giftTable').id };
      return { kind: 'station', id: ctx.venue.firstStationOfKind('bin').id };
    }
    const st = stationFor(req.itemId);
    if (st && !s.disasters.some((d) => d.stationId === st.id)) return { kind: 'station', id: st.id };
  }

  const disaster = s.disasters[0];
  if (disaster) return disaster.stationId ? { kind: 'station', id: disaster.stationId } : { kind: 'disaster', id: disaster.id };

  const waiting = s.guests
    .filter((g) => (g.state === 'WAITING_FOR_FOOD' || g.state === 'REQUESTING') && g.wantsItemId)
    .sort((a, b) => a.happiness - b.happiness);
  const serveable = waiting.find((g) => hands.includes(g.wantsItemId as string));
  if (serveable) return { kind: 'guest', id: serveable.key };

  const ordering = s.guests.filter((g) => g.state === 'READY_TO_ORDER').sort((a, b) => a.happiness - b.happiness)[0];
  if (ordering) return { kind: 'guest', id: ordering.key };

  if (room > 0) {
    const heldCounts = new Map<string, number>();
    for (const h of hands) heldCounts.set(h, (heldCounts.get(h) ?? 0) + 1);
    const unmet = waiting.filter((g) => {
      const id = g.wantsItemId as string;
      const held = heldCounts.get(id) ?? 0;
      if (held > 0) {
        heldCounts.set(id, held - 1);
        return false;
      }
      return true;
    });
    for (const g of unmet) {
      const slot = s.kitchen.pass.indexOf(g.wantsItemId);
      if (slot !== -1) return { kind: 'passSlot', index: slot };
    }
    for (const g of unmet) {
      if (g.state !== 'REQUESTING') continue;
      const st = stationFor(g.wantsItemId as string);
      if (st) return { kind: 'station', id: st.id };
    }
    const gift = s.gifts.find((x) => x.state === 'waiting');
    if (gift) return { kind: 'gift', id: gift.id };
  }

  if (hands.includes('gift')) return { kind: 'station', id: ctx.venue.firstStationOfKind('giftTable').id };
  const wantedIds = new Set(waiting.map((g) => g.wantsItemId));
  if (hands.some((h) => !wantedIds.has(h) && h !== 'gift')) return { kind: 'station', id: ctx.venue.firstStationOfKind('bin').id };
  return null;
}
