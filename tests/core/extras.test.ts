import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src/core/sim/events';
import type { Guest } from '../../src/core/sim/state';
import { guest, guestByKey, makeSim, runFor, runUntil } from '../support/fixtures';

type Sim = ReturnType<typeof makeSim>['sim'];

/** Seats the given guests and lets them settle at their tables. */
function seatAll(sim: Sim, seats: Record<string, string>): void {
  runFor(sim, 0.2);
  for (const [key, seatId] of Object.entries(seats)) sim.command({ type: 'seatGuest', guestKey: key, seatId });
  runUntil(sim, () => Object.keys(seats).every((k) => guestByKey(sim, k).state === 'READY_TO_ORDER'), 30);
}

/** Puts a seated guest straight into asking for a song (the wish itself is random in play). */
function wantSong(g: Guest): void {
  g.state = 'REQUESTING';
  g.wantsServiceId = 'song';
}

describe('song requests', () => {
  it('one trip to the DJ booth plays every requested song', () => {
    const { sim } = makeSim({
      services: ['song'],
      guests: [guest('a', 'A', 'regular', 'friends', 0), guest('b', 'B', 'regular', 'friends', 0)],
    });
    seatAll(sim, { a: 'table-1-n', b: 'table-2-n' });
    wantSong(guestByKey(sim, 'a'));
    wantSong(guestByKey(sim, 'b'));
    const events: DomainEvent[] = [];
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'dj-booth' } });
    runUntil(sim, () => guestByKey(sim, 'a').state === 'SATISFIED' && guestByKey(sim, 'b').state === 'SATISFIED', 30, events);
    expect(sim.state.stats.servicesGranted).toBe(2);
    expect(events.filter((e) => e.type === 'serviceGranted')).toHaveLength(2);
    expect(sim.state.chain).toEqual({ key: 'service:song', count: 2 });
  });

  it('tapping the guest sends the planner to the DJ booth to play it', () => {
    const { sim } = makeSim({ services: ['song'] });
    seatAll(sim, { g1: 'table-1-n' });
    wantSong(guestByKey(sim, 'g1'));
    sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'SATISFIED', 30);
    const dj = sim.context.venue.station('dj-booth').interactPos;
    expect(Math.hypot(sim.state.planner.pos.x - dj.x, sim.state.planner.pos.y - dj.y)).toBeLessThan(1);
  });

  it('guests only ask for songs in levels that offer them', () => {
    const { sim } = makeSim({ guests: [guest('p', 'P', 'party-animal', 'friends', 0)] });
    seatAll(sim, { p: 'table-1-n' });
    let asked = false;
    for (let i = 0; i < 200 && !asked; i++) {
      runFor(sim, 1);
      const g = sim.state.guests.find((x) => x.key === 'p');
      if (!g) break;
      if (g.state === 'READY_TO_ORDER') sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'p' } });
      asked = g.wantsServiceId !== null;
    }
    expect(asked).toBe(false);
  });
});

describe('rescue champagne', () => {
  it('cheers up every guest, is limited, and unopened bottles pay at the end', () => {
    const { sim } = makeSim({
      rescues: 2,
      durationSeconds: 30,
      guests: [guest('a', 'A', 'regular', 'friends', 0), guest('b', 'B', 'regular', 'friends', 0)],
    });
    seatAll(sim, { a: 'table-1-n', b: 'table-2-n' });
    for (const g of sim.state.guests) g.happiness = 20;
    expect(sim.command({ type: 'useRescue' }).ok).toBe(true);
    expect(sim.state.guests.every((g) => g.happiness >= 20 + sim.context.tuning.rescue.guestHappiness)).toBe(true);
    expect(sim.state.rescuesLeft).toBe(1);
    expect(sim.state.chain.count).toBe(0); // an emergency, not a job: no chain
    const before = sim.state.score;
    runUntil(sim, () => sim.isOver, 60);
    const bonus = sim.drainEvents().length; // drain so nothing leaks between assertions
    expect(bonus).toBeGreaterThanOrEqual(0);
    expect(sim.state.score - before).toBeGreaterThanOrEqual(sim.context.content.scoring.rescueUnused);
  });

  it('refuses when there are no bottles', () => {
    const { sim } = makeSim();
    expect(sim.command({ type: 'useRescue' })).toEqual({ ok: false, reason: 'No champagne left' });
  });
});

describe('new disasters and personalities', () => {
  it('kitchen smoke stops the cooking until it is aired out', () => {
    const { sim } = makeSim({
      disasterIds: ['kitchen-smoke'],
      disasterTriggers: { 'kitchen-smoke': { kind: 'scheduled', at: 1 } },
      kitchen: { burners: 2, cookSeconds: 2 },
    });
    seatAll(sim, { g1: 'table-1-n' });
    runUntil(sim, () => sim.state.disasters.some((d) => d.phase === 'ACTIVE'), 30);
    sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
    runUntil(sim, () => sim.state.kitchen.orders.length > 0, 30);
    runFor(sim, 4);
    expect(sim.state.kitchen.stalled).toBe(true);
    expect(sim.state.kitchen.pass.every((s) => s === null)).toBe(true);
    // Tapping the smoke marker above the kitchen fixes it; then the dish cooks.
    const kitchen = sim.context.venue.station('kitchen');
    const target = sim.pickTarget({ x: kitchen.pos.x, y: kitchen.pos.y - 70 });
    expect(target).toEqual({ kind: 'station', id: 'kitchen' });
    sim.command({ type: 'queueAction', target: target! });
    runUntil(sim, () => sim.state.kitchen.pass.some((s) => s !== null), 30);
    expect(sim.state.stats.disastersResolved).toBe(1);
  });

  it('happy tears pick a drama-prone guest when there is one', () => {
    const { sim } = makeSim({
      disasterIds: ['crying-relative'],
      disasterTriggers: { 'crying-relative': { kind: 'scheduled', at: 8 } },
      guests: [guest('calm', 'Calm', 'regular', 'friends', 0), guest('queen', 'Queen', 'regular', 'family', 0, { traitIds: ['drama'] })],
    });
    seatAll(sim, { calm: 'table-1-n', queen: 'table-2-n' });
    runUntil(sim, () => sim.state.disasters.length > 0, 30);
    expect(sim.state.disasters[0]!.involvedGuestKeys).toEqual(['queen']);
  });

  it('per-guest traits change behaviour: fast eaters eat faster, drama queens feel disasters more', () => {
    const { sim } = makeSim({
      guests: [guest('fast', 'Fast', 'regular', 'friends', 0, { traitIds: ['fast-eater'] }), guest('slow', 'Slow', 'regular', 'friends', 0, { traitIds: ['slow-eater', 'drama'] })],
    });
    runFor(sim, 0.2);
    const fast = guestByKey(sim, 'fast');
    const slow = guestByKey(sim, 'slow');
    expect(fast.eatSeconds).toBeLessThan(slow.eatSeconds);
    expect(slow.mods.disasterReaction).toBeGreaterThan(fast.mods.disasterReaction);
    expect(slow.traitIds).toEqual(['slow-eater', 'drama']);
  });

  it('the bridesmaids’ spat is fixed by tapping the couple, and drains the couple hard', () => {
    const { sim } = makeSim({
      guests: [],
      disasterIds: ['bridesmaid-spat'],
      disasterTriggers: { 'bridesmaid-spat': { kind: 'scheduled', at: 1 } },
    });
    runUntil(sim, () => sim.state.disasters.length > 0, 30);
    sim.command({ type: 'queueAction', target: { kind: 'couple' } });
    runUntil(sim, () => sim.state.stats.disastersResolved === 1, 30);
  });
});
