import { describe, expect, it } from 'vitest';
import { extendChain } from '../../src/core/scoring/chain';
import type { DomainEvent } from '../../src/core/sim/events';
import type { SimContext } from '../../src/core/sim/SimContext';
import { guestByKey, makeSim, runFor, runUntil } from '../support/fixtures';

type Sim = ReturnType<typeof makeSim>['sim'];

/** Walks the planner through getting `itemId` from wherever it comes from, then serving g1. */
function fetchAndServe(sim: Sim, itemId: string, events: DomainEvent[]): void {
  const station = sim.context.venue.def.stations.find((s) => s.providesItemId === itemId);
  if (station) sim.command({ type: 'queueAction', target: { kind: 'station', id: station.id } });
  else {
    runUntil(sim, () => sim.state.kitchen.pass.includes(itemId), 30, events);
    sim.command({ type: 'queueAction', target: { kind: 'passSlot', index: sim.state.kitchen.pass.indexOf(itemId) } });
  }
  sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
  runUntil(sim, () => guestByKey(sim, 'g1').state === 'EATING', 30, events);
}

describe('three-course meal', () => {
  it('starter → main → dessert, each served in turn', () => {
    const { sim } = makeSim({}, { courses: true });
    const events: DomainEvent[] = [];
    runUntil(sim, () => sim.state.guests[0]?.state === 'WAITING_TO_BE_SEATED', 30, events);
    sim.command({ type: 'seatGuest', guestKey: 'g1', seatId: 'table-1-n' });

    // Starter: no order needed, the kitchen plates it as the guest settles.
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'WAITING_FOR_FOOD', 30, events);
    expect(guestByKey(sim, 'g1')).toMatchObject({ course: 'appetizer', wantsItemId: 'garden-salad' });
    fetchAndServe(sim, 'garden-salad', events);

    // Main: the guest orders, the kitchen cooks.
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'READY_TO_ORDER', 30, events);
    expect(guestByKey(sim, 'g1').course).toBe('main');
    sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'WAITING_FOR_FOOD', 30, events);
    fetchAndServe(sim, guestByKey(sim, 'g1').wantsItemId!, events);

    // Dessert: from the dessert table.
    runUntil(sim, () => guestByKey(sim, 'g1').course === 'dessert', 60, events);
    expect(guestByKey(sim, 'g1').wantsItemId).toBe('cake-slice');
    fetchAndServe(sim, 'cake-slice', events);
    expect(sim.state.stats.coursesServed).toBe(3);
    expect(sim.state.stats.guestsServed).toBe(1);
  });

  it('a wedding without starters or dessert serves just the main', () => {
    const { sim } = makeSim();
    runUntil(sim, () => sim.state.guests[0]?.state === 'WAITING_TO_BE_SEATED', 30);
    sim.command({ type: 'seatGuest', guestKey: 'g1', seatId: 'table-1-n' });
    runUntil(sim, () => guestByKey(sim, 'g1').state !== 'WALKING_TO_SEAT' && guestByKey(sim, 'g1').state !== 'SEATED', 30);
    expect(guestByKey(sim, 'g1')).toMatchObject({ state: 'READY_TO_ORDER', course: 'main' });
  });
});

describe('chains', () => {
  it('the same job in a row grows the chain and pays more each step; another job starts over', () => {
    const { sim } = makeSim();
    const ctx = sim.context as SimContext;
    const bonus = ctx.score.rules.chainBonusPerStep;
    const before = sim.state.score;
    extendChain(ctx, 'serve:garden-salad', null);
    extendChain(ctx, 'serve:garden-salad', null);
    extendChain(ctx, 'serve:garden-salad', null);
    expect(sim.state.chain).toEqual({ key: 'serve:garden-salad', count: 3 });
    expect(sim.state.score - before).toBe(bonus * (1 + 2));
    extendChain(ctx, 'order', null);
    expect(sim.state.chain).toEqual({ key: 'order', count: 1 });
    expect(sim.state.stats.bestChain).toBe(3);
    const events = sim.drainEvents().filter((e) => e.type === 'chainChanged');
    expect(events.at(-1)).toMatchObject({ key: 'order', count: 1, broken: 3 });
  });

  it('serving two of the same dish back to back is a chain', () => {
    const { sim } = makeSim({ guests: [] });
    const ctx = sim.context as SimContext;
    extendChain(ctx, 'gift', null);
    extendChain(ctx, 'gift', null);
    expect(sim.state.chain.count).toBe(2);
  });
});

describe('ending', () => {
  it("with ending 'guestsGone', the reception ends once every guest has come and gone", () => {
    const { sim } = makeSim({ ending: 'guestsGone', durationSeconds: 60 });
    runFor(sim, 5);
    expect(sim.isOver).toBe(false);
    // Nobody seats the guest: they lose patience, storm off, and the day is over.
    runUntil(sim, () => sim.isOver, 400);
    expect(sim.state.outcome).toBe('COMPLETE');
    expect(sim.state.stats.guestsUpset).toBe(1);
    expect(sim.state.time).toBeGreaterThan(60); // the estimate is not a limit
  });

  it("with ending 'timer', it ends on the clock even with guests still there", () => {
    const { sim } = makeSim({ ending: 'timer', durationSeconds: 20 });
    runUntil(sim, () => sim.isOver, 30);
    expect(sim.state.time).toBeCloseTo(20, 0);
    expect(sim.state.guests.length).toBe(1);
  });
});
