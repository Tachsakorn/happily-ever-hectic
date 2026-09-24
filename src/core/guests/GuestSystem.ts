import type { Vec2 } from '../../content/types';
import { stepToward } from '../math/vec';
import type { SimContext, System } from '../sim/SimContext';
import { GuestState, MAX_HAPPINESS, type Guest } from '../sim/state';
import { makeUpset } from './guestActions';
import { isAtTable, isWaiting, transitionGuest } from './guestMachine';
import { refreshTableMoods } from './seating';
import { servedItem } from '../sim/items';

/** Moves a walker along its path. Returns true when the path is complete. */
export function walk(guest: { pos: Guest['pos']; path: Guest['path'] }, speed: number, dt: number): boolean {
  let budget = speed * dt;
  while (guest.path.length && budget > 0) {
    const target = guest.path[0];
    if (!target) break;
    const before = guest.pos;
    const { pos, arrived } = stepToward(before, target, budget);
    budget -= Math.hypot(pos.x - before.x, pos.y - before.y);
    guest.pos = pos;
    if (arrived) guest.path.shift();
    else break;
  }
  return guest.path.length === 0;
}

function scheduleNextRequest(ctx: SimContext, guest: Guest): void {
  const [min, max] = ctx.content.guestTypes.get(guest.typeId).requestIntervalSeconds;
  guest.nextRequestIn = ctx.rng.range(min, max) * guest.mods.guestRequestInterval;
}

function chooseRequest(ctx: SimContext, guest: Guest): string | null {
  const pool = ctx.content.guestTypes
    .get(guest.typeId)
    .requestPool.filter((r) => !r.requiresFlag || ctx.state.flags.has(r.requiresFlag));
  const picked = ctx.rng.weighted(pool, (r) => r.weight)?.itemId;
  return picked ? servedItem(ctx, picked) : null;
}

/**
 * Per-state guest behaviour. Each state is a small handler; the transition
 * table in guestMachine keeps them honest. New behaviour = new handler or a
 * new trait modifier, never a branch in some giant update.
 */
const behaviours: Partial<Record<Guest['state'], (ctx: SimContext, g: Guest, dt: number) => void>> = {
  ARRIVING(ctx, g, dt) {
    if (walk(g, ctx.tuning.guestWalkSpeed, dt)) transitionGuest(ctx, g, GuestState.WAITING_TO_BE_SEATED);
  },
  WAITING_TO_BE_SEATED(ctx, g, dt) {
    walk(g, ctx.tuning.guestWalkSpeed, dt);
  },
  WALKING_TO_SEAT(ctx, g, dt) {
    if (!walk(g, ctx.tuning.guestWalkSpeed, dt)) return;
    const [min, max] = ctx.tuning.settleSeconds;
    transitionGuest(ctx, g, GuestState.SEATED, ctx.rng.range(min, max));
    if (g.tableId) refreshTableMoods(ctx, g.tableId);
    if (g.bringsGift && g.seatId) {
      const { seat, table } = ctx.venue.seat(g.seatId);
      const pos = giftSpot(seat.pos, seat.interactPos, table.pos);
      ctx.state.gifts.push({ id: ctx.nextId(), guestKey: g.key, pos, state: 'waiting', age: 0 });
    }
  },
  SEATED(ctx, g) {
    if (g.stateTime >= g.stateDuration) transitionGuest(ctx, g, GuestState.READY_TO_ORDER);
  },
  EATING(ctx, g, dt) {
    g.happiness = Math.min(MAX_HAPPINESS, g.happiness + ctx.tuning.eatingRecoveryPerSecond * dt);
    if (g.stateTime >= g.stateDuration) {
      g.wantsItemId = null;
      transitionGuest(ctx, g, GuestState.SATISFIED);
      scheduleNextRequest(ctx, g);
    }
  },
  SATISFIED(ctx, g, dt) {
    g.happiness = Math.min(MAX_HAPPINESS, g.happiness + ctx.tuning.satisfiedRecoveryPerSecond * dt);
    g.nextRequestIn -= dt;
    if (g.nextRequestIn > 0) return;
    const itemId = chooseRequest(ctx, g);
    if (!itemId) {
      scheduleNextRequest(ctx, g);
      return;
    }
    g.wantsItemId = itemId;
    transitionGuest(ctx, g, GuestState.REQUESTING);
  },
  UPSET(ctx, g) {
    if (g.stateTime < g.stateDuration) return;
    g.path = ctx.nav.findPath(g.pos, ctx.venue.def.doorPos);
    transitionGuest(ctx, g, GuestState.LEAVING);
  },
  LEAVING(ctx, g, dt) {
    if (!walk(g, ctx.tuning.guestWalkSpeed * 1.3, dt)) return;
    transitionGuest(ctx, g, GuestState.GONE);
    ctx.events.emit({ type: 'guestLeft', guestKey: g.key, upset: true });
  },
};

function updateHappiness(ctx: SimContext, g: Guest, dt: number): void {
  if (isWaiting(g)) {
    const outside = g.state === GuestState.WAITING_TO_BE_SEATED && g.waitingSlot === null && g.path.length === 0;
    const factor = outside ? ctx.tuning.outsideDrainFactor : 1;
    const drainPerSecond = (MAX_HAPPINESS / g.patienceSeconds) * g.mods.guestPatienceDrain * g.disasterDrain * factor;
    g.happiness -= drainPerSecond * dt;
  }
  if (isAtTable(g)) g.happiness += g.seatingMood * dt;
  g.happiness = Math.min(MAX_HAPPINESS, g.happiness);
  if (g.happiness <= 0 && (isWaiting(g) || isAtTable(g))) makeUpset(ctx, g, `${g.name} stormed off`);
}

export const GuestSystem: System = {
  name: 'guests',
  update(ctx, dt) {
    for (const g of ctx.state.guests) {
      if (g.state === GuestState.GONE) continue;
      g.stateTime += dt;
      behaviours[g.state]?.(ctx, g, dt);
      updateHappiness(ctx, g, dt);
    }
    // Drop guests who have left entirely; nothing references them any more.
    for (let i = ctx.state.guests.length - 1; i >= 0; i--) {
      if (ctx.state.guests[i]?.state === GuestState.GONE) ctx.state.guests.splice(i, 1);
    }
  },
};

export { scheduleNextRequest };

const GIFT_SIDE_OFFSET = 46;
const GIFT_TABLEWARD_OFFSET = 50;
const GIFT_DROP = 8;

/**
 * Where a seated guest sets their gift down: beside them, never under their
 * head (people are drawn standing up from their seat, so anything placed
 * above a seat hides behind them) and never on the side the planner serves
 * from. Guests at the top or bottom of a table put it beside their chair;
 * guests at the sides put it on the table's edge in front of them.
 */
export function giftSpot(seat: Vec2, serveSpot: Vec2, table: Vec2): Vec2 {
  const dx = seat.x - table.x;
  const dy = seat.y - table.y;
  if (Math.abs(dy) >= Math.abs(dx)) {
    const away = Math.sign(seat.x - serveSpot.x) || 1;
    return { x: seat.x + away * GIFT_SIDE_OFFSET, y: seat.y + GIFT_DROP };
  }
  return { x: seat.x - Math.sign(dx) * GIFT_TABLEWARD_OFFSET, y: seat.y + GIFT_DROP + 2 };
}
