import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate';
import { loadContent } from '../../src/data';
import { makeSim, runFor } from '../support/fixtures';

describe('per-level disaster choreography', () => {
  it('a level trigger replaces the disaster default in that level', () => {
    // The spilled drink normally cannot happen before 30 s.
    const { sim } = makeSim({ disasterIds: ['spilled-drink'], disasterTriggers: { 'spilled-drink': { kind: 'scheduled', at: 5 } } });
    runFor(sim, 6);
    expect(sim.state.disasters.map((d) => d.defId)).toContain('spilled-drink');
  });

  it('without a level trigger the default still applies', () => {
    const { sim } = makeSim({ disasterIds: ['spilled-drink'] });
    runFor(sim, 6);
    expect(sim.state.disasters).toHaveLength(0);
  });

  it('shipped content choreography is valid', () => {
    expect(validateContent(loadContent())).toEqual([]);
  });
});

describe('disasters at the sweetheart table', () => {
  it('missing rings can be fixed by tapping the couple (their table is the same tap target)', () => {
    const { sim } = makeSim({ disasterIds: ['missing-rings'], disasterTriggers: { 'missing-rings': { kind: 'scheduled', at: 1 } } });
    runFor(sim, 1.5);
    expect(sim.state.disasters.map((d) => d.defId)).toContain('missing-rings');
    const target = sim.pickTarget(sim.context.venue.def.couplePos);
    expect(target).not.toBeNull();
    expect(sim.command({ type: 'queueAction', target: target! }).ok).toBe(true);
    runFor(sim, 8);
    expect(sim.state.stats.disastersResolved).toBe(1);
  });
});

describe('level item swaps (the finale serves her favourites)', () => {
  it('moments, guests and stations all use the swapped items', async () => {
    const { ReceptionSimulation } = await import('../../src/core/sim/ReceptionSimulation');
    const { stationItem } = await import('../../src/core/sim/items');
    const content = loadContent();
    const sim = new ReceptionSimulation({ content, levelId: 'our-wedding', seed: 3 });
    const swaps = sim.context.level.itemSwaps!;
    const provided = sim.context.venue.def.stations.map((s) => stationItem(sim.context, s)).filter(Boolean);
    expect(provided).toContain(swaps.champagne);
    expect(provided).not.toContain('champagne');
    const requested = new Set<string>();
    let toastItem: string | null = null;
    for (let t = 0; t < 200 * 60 && !sim.isOver; t++) {
      sim.step(1 / 60);
      for (const e of sim.drainEvents()) if (e.type === 'coupleRequested' && e.momentId === 'toast') toastItem = e.itemId;
      for (const g of sim.state.guests) if (g.wantsItemId) requested.add(g.wantsItemId);
      if (!sim.state.guests.some((g) => g.state === 'WAITING_TO_BE_SEATED')) continue;
      for (const g of sim.state.guests.filter((x) => x.state === 'WAITING_TO_BE_SEATED')) {
        const seat = sim.context.venue.tables.flatMap((tb) => tb.seats).find((s) => !sim.state.guests.some((o) => o.seatId === s.id));
        if (seat) sim.command({ type: 'seatGuest', guestKey: g.key, seatId: seat.id });
      }
    }
    expect(toastItem).toBe(swaps.champagne);
    for (const id of ['champagne', 'lemonade', 'cake-slice']) expect(requested.has(id)).toBe(false);
  });
});

describe('gift placement', () => {
  it('gifts sit beside seated guests: never above the seat (under the guest) and never on the serving side', async () => {
    const { giftSpot } = await import('../../src/core/guests/GuestSystem');
    const venue = loadContent().venues.get('garden-hall');
    for (const table of venue.tables) {
      for (const seat of table.seats) {
        const g = giftSpot(seat.pos, seat.interactPos, table.pos);
        expect(g.y).toBeGreaterThanOrEqual(seat.pos.y);
        const toServe = Math.hypot(g.x - seat.interactPos.x, g.y - seat.interactPos.y);
        expect(toServe).toBeGreaterThan(40);
        expect(Math.hypot(g.x - seat.pos.x, g.y - seat.pos.y)).toBeLessThan(70);
      }
    }
  });
});
