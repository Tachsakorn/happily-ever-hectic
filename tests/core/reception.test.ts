import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src/core/sim/events';
import { guest, guestByKey, makeSim, runFor, runUntil } from '../support/fixtures';

describe('guest lifecycle', () => {
  it('arrives, waits, is seated, orders, eats and becomes satisfied', () => {
    const { sim } = makeSim();
    const events: DomainEvent[] = [];
    runUntil(sim, () => sim.state.guests[0]?.state === 'WAITING_TO_BE_SEATED', 30, events);

    expect(sim.command({ type: 'seatGuest', guestKey: 'g1', seatId: 'table-1-n' })).toEqual({ ok: true });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'READY_TO_ORDER', 30, events);

    sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'WAITING_FOR_FOOD', 30, events);
    expect(guestByKey(sim, 'g1').wantsItemId).toBe('roast-chicken');

    runUntil(sim, () => sim.state.kitchen.pass.includes('roast-chicken'), 30, events);
    const slot = sim.state.kitchen.pass.indexOf('roast-chicken');
    sim.command({ type: 'queueAction', target: { kind: 'passSlot', index: slot } });
    sim.command({ type: 'queueAction', target: { kind: 'guest', id: 'g1' } });
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'EATING', 30, events);
    runUntil(sim, () => guestByKey(sim, 'g1').state === 'SATISFIED', 30, events);

    const transitions = events
      .filter((e): e is Extract<DomainEvent, { type: 'guestStateChanged' }> => e.type === 'guestStateChanged')
      .map((e) => e.to);
    expect(transitions).toEqual([
      'WAITING_TO_BE_SEATED',
      'WALKING_TO_SEAT',
      'SEATED',
      'READY_TO_ORDER',
      'WAITING_FOR_FOOD',
      'EATING',
      'SATISFIED',
    ]);
    expect(sim.state.score).toBeGreaterThan(0);
  });

  it('gets upset and leaves when ignored, hurting the couple', () => {
    const { sim } = makeSim();
    const events: DomainEvent[] = [];
    runUntil(sim, () => events.some((e) => e.type === 'guestUpset'), 200, events);
    const moodEvent = events.find((e) => e.type === 'moodChanged' && e.delta < -5);
    expect(moodEvent).toBeDefined();
    expect(sim.state.moodLedger.get('Guests stormed off')).toBeLessThan(0);
    expect(events.some((e) => e.type === 'moodChanged' && e.cause === 'Guest One stormed off')).toBe(true);
    runUntil(sim, () => sim.state.guests.length === 0, 30, events);
    expect(events.some((e) => e.type === 'guestLeft')).toBe(true);
    expect(sim.state.stats.guestsUpset).toBe(1);
  });

  it('refuses to seat a guest in a taken seat', () => {
    const { sim } = makeSim({
      guests: [guest('a', 'A', 'regular', 'friends', 0), guest('b', 'B', 'regular', 'friends', 0)],
    });
    runFor(sim, 0.5);
    expect(sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-1-n' }).ok).toBe(true);
    expect(sim.command({ type: 'seatGuest', guestKey: 'b', seatId: 'table-1-n' })).toEqual({ ok: false, reason: 'Seat is taken' });
    expect(sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-2-n' }).ok).toBe(false);
  });

  it('queues guests outside when the waiting area is full, and moves them in as spots free up', () => {
    const guests = Array.from({ length: 6 }, (_, i) => guest(`g${i}`, `G${i}`, 'regular', 'friends', 0));
    const { sim } = makeSim({ guests });
    runFor(sim, 0.2);
    const outside = sim.state.guests.filter((g) => g.waitingSlot === null);
    expect(outside).toHaveLength(2);
    sim.command({ type: 'seatGuest', guestKey: 'g0', seatId: 'table-1-n' });
    expect(sim.state.guests.filter((g) => g.state === 'WAITING_TO_BE_SEATED' && g.waitingSlot === null)).toHaveLength(1);
  });
});

describe('seating relationships', () => {
  it('liked neighbours raise happiness over time; disliked ones lower it', () => {
    const { sim } = makeSim({
      guests: [
        guest('fan', 'Fan', 'regular', 'friends', 0, { likes: ['star'] }),
        guest('star', 'Star', 'regular', 'work', 0),
        guest('grump', 'Grump', 'regular', 'family', 0, { dislikes: ['work'] }),
      ],
    });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'star', seatId: 'table-1-n' });
    sim.command({ type: 'seatGuest', guestKey: 'fan', seatId: 'table-1-e' });
    // Beside the star (north): west is next to north, south is across the table.
    sim.command({ type: 'seatGuest', guestKey: 'grump', seatId: 'table-1-w' });
    runFor(sim, 8);
    expect(guestByKey(sim, 'fan').seatingMood).toBeGreaterThan(0);
    expect(guestByKey(sim, 'grump').seatingMood).toBeLessThan(0);
  });

  it('only the seats either side count: across the table is not a neighbour', () => {
    const { sim } = makeSim({
      guests: [guest('a', 'A', 'regular', 'work', 0), guest('b', 'B', 'regular', 'family', 0, { dislikes: ['a'] })],
    });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-1-n' });
    const preview = sim.seatingPreview('b');
    expect(preview.get('table-1-e')).toBeLessThan(0);
    expect(preview.get('table-1-w')).toBeLessThan(0);
    expect(preview.get('table-1-s')).toBe(0);
    expect(preview.has('table-1-n')).toBe(false); // taken
  });

  it('previews how a waiting guest would feel in each seat', () => {
    const { sim } = makeSim({
      guests: [guest('a', 'A', 'regular', 'family', 0), guest('b', 'B', 'regular', 'family', 0, { dislikes: ['a'] })],
    });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-2-n' });
    const preview = sim.seatingPreview('b');
    expect(preview.get('table-2-e')).toBeLessThan(0);
    expect(preview.get('table-1-e')).toBe(0);
  });
});

describe('planner', () => {
  it('limits the action queue and can clear it', () => {
    const { sim } = makeSim();
    const target = { kind: 'station' as const, id: 'tap-lemonade' };
    const results = Array.from({ length: 8 }, () => sim.command({ type: 'queueAction', target }));
    expect(results.filter((r) => r.ok)).toHaveLength(6);
    sim.command({ type: 'clearQueue' });
    expect(sim.state.planner.queue).toHaveLength(0);
  });

  it('carries at most two hands of items', () => {
    const { sim } = makeSim();
    for (let i = 0; i < 3; i++) sim.command({ type: 'queueAction', target: { kind: 'station', id: 'tap-lemonade' } });
    runUntil(sim, () => sim.state.planner.queue.length === 0 && !sim.state.planner.current, 30);
    expect(sim.state.planner.hands).toEqual(['lemonade', 'lemonade']);
  });

  it('skips an action whose target is no longer useful when she arrives', () => {
    const { sim } = makeSim();
    const events: DomainEvent[] = [];
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'gift-table' } });
    runUntil(sim, () => events.some((e) => e.type === 'actionSkipped'), 30, events);
  });

  it('bins unwanted items', () => {
    const { sim } = makeSim();
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'tap-champagne' } });
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'bin' } });
    runUntil(sim, () => sim.state.planner.queue.length === 0 && !sim.state.planner.current, 30);
    expect(sim.state.planner.hands).toEqual([]);
  });
});

describe('kitchen', () => {
  it('cooks with limited burners and stalls when the pass is full', () => {
    const guests = Array.from({ length: 7 }, (_, i) => guest(`g${i}`, `G${i}`, 'grandparent', 'family', 0));
    const { sim } = makeSim({ guests, kitchen: { burners: 2, cookSeconds: 2 } });
    runFor(sim, 0.2);
    const seats = ['table-1-n', 'table-1-e', 'table-1-s', 'table-1-w', 'table-2-n', 'table-2-e', 'table-2-s'];
    guests.forEach((g, i) => sim.command({ type: 'seatGuest', guestKey: g.key, seatId: seats[i]! }));
    runUntil(sim, () => sim.state.guests.every((g) => g.state === 'READY_TO_ORDER'), 40);
    for (const g of guests.slice(0, 6)) sim.command({ type: 'queueAction', target: { kind: 'guest', id: g.key } });
    runUntil(sim, () => sim.state.planner.queue.length === 0 && !sim.state.planner.current, 60);
    runFor(sim, 12);
    expect(sim.state.kitchen.pass.every((s) => s !== null)).toBe(true);
    expect(sim.state.kitchen.orders.length).toBe(2);
  });
});

describe('gifts', () => {
  it('seated guests leave gifts that can be carried to the gift table', () => {
    const { sim } = makeSim({ guests: [guest('g', 'G', 'regular', 'friends', 0, { bringsGift: true })] });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'g', seatId: 'table-1-n' });
    runUntil(sim, () => sim.state.gifts.length === 1, 20);
    const gift = sim.state.gifts[0]!;
    sim.command({ type: 'queueAction', target: { kind: 'gift', id: gift.id } });
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'gift-table' } });
    runUntil(sim, () => sim.state.stats.giftsDelivered === 1, 30);
    expect(sim.state.planner.hands).toEqual([]);
  });

  it('gifts left too long go missing and cost mood', () => {
    const { sim } = makeSim({ guests: [guest('g', 'G', 'grandparent', 'friends', 0, { bringsGift: true })] });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'g', seatId: 'table-1-n' });
    runUntil(sim, () => sim.state.gifts.length === 1, 20);
    runUntil(sim, () => sim.state.gifts.length === 0, 60);
    expect(sim.state.moodLedger.get('A gift went missing')).toBeLessThan(0);
  });
});

describe('touch picking', () => {
  it('a tap on a gift picks the gift, not the guest sitting behind it', () => {
    const { sim } = makeSim({ guests: [guest('g', 'G', 'grandparent', 'friends', 0, { bringsGift: true })] });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'g', seatId: 'table-1-n' });
    runUntil(sim, () => sim.state.gifts.length === 1, 20);
    const gift = sim.state.gifts[0]!;
    expect(sim.pickTarget(gift.pos)).toEqual({ kind: 'gift', id: gift.id });
    const feet = guestByKey(sim, 'g').pos;
    expect(sim.pickTarget({ x: feet.x, y: feet.y - 40 })).toEqual({ kind: 'guest', id: 'g' });
  });
});
