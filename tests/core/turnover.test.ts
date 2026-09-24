import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src/core/sim/events';
import { guestByKey, makeSim, runFor, runUntil } from '../support/fixtures';

/** Seats g1, gets their dinner served and waits until they are satisfied. */
function dineGuest(sim: ReturnType<typeof makeSim>['sim'], events: DomainEvent[]): void {
  runUntil(sim, () => sim.state.guests[0]?.state === 'WAITING_TO_BE_SEATED', 30, events);
  sim.command({ type: 'seatGuest', guestKey: 'g1', seatId: 'table-1-n' });
  runUntil(sim, () => guestByKey(sim, 'g1').state === 'READY_TO_ORDER', 30, events);
  sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
  runUntil(sim, () => sim.state.kitchen.pass.some((x) => x !== null), 30, events);
  const slot = sim.state.kitchen.pass.findIndex((x) => x !== null);
  sim.command({ type: 'queueAction', target: { kind: 'passSlot', index: slot } });
  sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
  runUntil(sim, () => guestByKey(sim, 'g1').state === 'SATISFIED', 60, events);
}

describe('guest turnover', () => {
  it('a guest whose visit is over says a happy goodbye and frees the seat', () => {
    const { sim } = makeSim();
    const events: DomainEvent[] = [];
    dineGuest(sim, events);
    // Regular guests make 1–2 follow-up requests; serve until they leave.
    for (let i = 0; i < 4 && sim.state.guests.some((g) => g.key === 'g1' && g.state !== 'LEAVING'); i++) {
      runUntil(sim, () => ['REQUESTING', 'LEAVING'].includes(guestByKey(sim, 'g1')?.state ?? 'LEAVING'), 120, events);
      const g = sim.state.guests.find((x) => x.key === 'g1');
      if (!g || g.state === 'LEAVING') break;
      const tap = sim.context.venue.def.stations.find((s) => s.providesItemId === g.wantsItemId)!;
      sim.command({ type: 'queueAction', target: { kind: 'station', id: tap.id } });
      sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
      runUntil(sim, () => sim.state.guests.find((x) => x.key === 'g1')?.state !== 'REQUESTING', 60, events);
    }
    runUntil(sim, () => !sim.state.guests.some((g) => g.key === 'g1'), 120, events);
    const left = events.find((e) => e.type === 'guestLeft');
    expect(left).toMatchObject({ upset: false });
    expect(sim.state.stats.guestsLeftHappy).toBe(1);
    expect(sim.state.stats.guestsUpset).toBe(0);
    expect(sim.command({ type: 'seatGuest', guestKey: 'nobody', seatId: 'table-1-n' }).ok).toBe(false);
  });
});

describe('dance floor', () => {
  it('a guest who wants to dance can be sent to the floor, dances, and returns to their seat', () => {
    const party = [{ key: 'g1', name: 'Party', typeId: 'party-animal', groupId: 'friends', arriveAt: 0, bringsGift: false, likes: [], dislikes: [] }];
    // Party animals usually ask to dance first; find a seed where this one does.
    let found: ReturnType<typeof makeSim>['sim'] | null = null;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const { sim } = makeSim({ dancing: true, guests: party }, { seed });
      dineGuest(sim, []);
      runUntil(sim, () => ['WANTS_TO_DANCE', 'REQUESTING'].includes(guestByKey(sim, 'g1').state), 120);
      if (guestByKey(sim, 'g1').state === 'WANTS_TO_DANCE') found = sim;
    }
    const sim = found!;
    expect(sim).not.toBeNull();
    const spot = sim.context.venue.def.danceSpots![0]!;
    expect(sim.isOnDanceFloor(spot)).toBe(true);
    const g = guestByKey(sim, 'g1');
    expect(sim.pickDraggableGuest({ x: g.pos.x, y: g.pos.y - 38 })).toBe('g1');
    expect(sim.command({ type: 'sendToDance', guestKey: 'g1' })).toEqual({ ok: true });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'DANCING', 30);
    // The seat stays theirs while they dance.
    expect(sim.state.guests.some((x) => x.seatId === 'table-1-n')).toBe(true);
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'SATISFIED', 60);
    expect(guestByKey(sim, 'g1').seatId).toBe('table-1-n');
    expect(sim.state.stats.dances).toBe(1);
  });

  it('refuses guests who did not ask to dance', () => {
    const { sim } = makeSim({ dancing: true });
    runFor(sim, 3);
    expect(sim.command({ type: 'sendToDance', guestKey: 'g1' }).ok).toBe(false);
  });
});

describe('Extra Stove upgrade', () => {
  it('lets the kitchen cook one more dish at once', () => {
    const three = (mods: object[]) => {
      const guests = ['a', 'b', 'c'].map((k, i) => ({ key: k, name: k, typeId: 'regular', groupId: 'friends', arriveAt: i * 0.2, bringsGift: false, likes: [], dislikes: [] }));
      const { sim } = makeSim({ guests, kitchen: { burners: 2, cookSeconds: 30 } }, { modifiers: mods });
      runUntil(sim, () => sim.state.guests.filter((g) => g.state === 'WAITING_TO_BE_SEATED').length === 3, 30);
      ['table-1-n', 'table-1-e', 'table-1-s'].forEach((seat, i) => sim.command({ type: 'seatGuest', guestKey: ['a', 'b', 'c'][i]!, seatId: seat }));
      runUntil(sim, () => sim.state.guests.every((g) => g.state === 'READY_TO_ORDER'), 30);
      for (const k of ['a', 'b', 'c']) sim.command({ type: 'queueAction', target: { kind: 'guest', id: k } });
      runUntil(sim, () => sim.state.kitchen.orders.length === 3, 30);
      runFor(sim, 1);
      return sim.state.kitchen.orders.filter((o) => o.cookLeft !== null).length;
    };
    expect(three([])).toBe(2);
    expect(three([{ kitchenBurners: 1 }])).toBe(3);
  });
});
