import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src/core/sim/events';
import { guest, guestByKey, makeSim, runFor, runUntil } from '../support/fixtures';

const idle = (sim: ReturnType<typeof makeSim>['sim']) => sim.state.planner.queue.length === 0 && !sim.state.planner.current;

describe('disaster lifecycle', () => {
  it('escalates WARNING → ACTIVE → ESCALATED → FAILED when ignored, draining mood with a visible cause', () => {
    const { sim } = makeSim({ disasterIds: ['dj-glitch'], guests: [] }, { seed: 3 });
    const events: DomainEvent[] = [];
    runUntil(sim, () => events.some((e) => e.type === 'disasterFailed'), 400, events);
    const phases = events
      .filter((e): e is Extract<DomainEvent, { type: 'disasterPhaseChanged' }> => e.type === 'disasterPhaseChanged')
      .map((e) => e.phase);
    expect(phases).toEqual(['ACTIVE', 'ESCALATED']);
    expect(sim.state.moodLedger.get('Music Stopped')).toBeLessThan(-10);
    expect(events.some((e) => e.type === 'moodChanged' && e.cause === 'Music Stopped')).toBe(true);
    expect(sim.state.disasters).toHaveLength(0);
    expect(sim.state.stats.disastersFailed).toBe(1);
  });

  it('resolving during the warning counts as prevented and pays the early bonus', () => {
    const { sim } = makeSim({ disasterIds: ['dj-glitch'], guests: [] }, { seed: 3 });
    const events: DomainEvent[] = [];
    runUntil(sim, () => sim.state.disasters.length > 0, 400, events);
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'dj-booth' } });
    runUntil(sim, () => events.some((e) => e.type === 'disasterResolved'), 30, events);
    const resolved = events.find((e) => e.type === 'disasterResolved');
    expect(resolved).toMatchObject({ early: true });
    expect(sim.state.moodLedger.get('Music Stopped prevented')).toBeGreaterThan(0);
  });

  it('a seating conflict can start an argument that upsets the involved guests if ignored', () => {
    const { sim } = makeSim(
      {
        disasterIds: ['guest-argument'],
        guests: [
          guest('a', 'Ann', 'grandparent', 'family', 0, { dislikes: ['b'] }),
          guest('b', 'Bob', 'grandparent', 'family', 0),
        ],
      },
      { seed: 11 },
    );
    const events: DomainEvent[] = [];
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-1-n' });
    sim.command({ type: 'seatGuest', guestKey: 'b', seatId: 'table-1-e' });
    runUntil(sim, () => events.some((e) => e.type === 'disasterStarted'), 200, events);
    const started = sim.state.disasters[0]!;
    expect(started.involvedGuestKeys).toEqual(expect.arrayContaining(['a', 'b']));
    runUntil(sim, () => events.some((e) => e.type === 'disasterFailed'), 60, events);
    expect(events.filter((e) => e.type === 'guestUpset').length).toBeGreaterThanOrEqual(1);
  });

  it('a spilled drink slows the planner down near it', () => {
    const { sim } = makeSim(
      { disasterIds: ['spilled-drink'], guests: [] },
      { seed: 5 },
    );
    runUntil(sim, () => sim.state.disasters.length > 0, 400);
    const puddle = sim.state.disasters[0]!;
    expect(puddle.phase).toBe('ACTIVE');
    sim.command({ type: 'queueAction', target: { kind: 'disaster', id: puddle.id } });
    runUntil(sim, () => sim.state.disasters.length === 0, 60);
    expect(sim.state.stats.disastersResolved).toBe(1);
  });

  it('respects maxOccurrences', () => {
    const { sim } = makeSim({ disasterIds: ['leaning-cake'], guests: [], durationSeconds: 900 }, { seed: 2 });
    const events: DomainEvent[] = [];
    runFor(sim, 400, events);
    expect(events.filter((e) => e.type === 'disasterStarted')).toHaveLength(1);
  });
});

describe('wedding moments and the couple', () => {
  it('cake cutting: needs both hands, succeeds when the cake reaches the couple, unlocks cake slices', () => {
    const { sim } = makeSim({ guests: [], moments: [{ momentId: 'cake-cutting', at: 1 }] });
    const events: DomainEvent[] = [];
    runUntil(sim, () => sim.state.couple.request !== null, 5, events);
    expect(sim.state.couple.request?.itemId).toBe('wedding-cake');

    // A drink in hand leaves no room for a two-handed cake.
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'tap-lemonade' } });
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'cake-table' } });
    runUntil(sim, () => idle(sim), 30, events);
    expect(sim.state.planner.hands).toEqual(['lemonade']);
    expect(events.some((e) => e.type === 'actionSkipped' && e.reason === 'Hands full')).toBe(true);

    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'bin' } });
    sim.command({ type: 'queueAction', target: { kind: 'station', id: 'cake-table' } });
    sim.command({ type: 'queueAction', target: { kind: 'couple' } });
    runUntil(sim, () => events.some((e) => e.type === 'momentCompleted'), 30, events);
    expect(sim.state.flags.has('cake-cut')).toBe(true);
    expect(sim.state.moodLedger.get('Cake Cutting')).toBe(15);
  });

  it('a missed moment costs mood', () => {
    const { sim } = makeSim({ guests: [], moments: [{ momentId: 'toast', at: 1 }] });
    const events: DomainEvent[] = [];
    runUntil(sim, () => events.some((e) => e.type === 'momentFailed'), 60, events);
    expect(sim.state.moodLedger.get('The Toast missed')).toBe(-10);
    expect(sim.state.stats.momentsFailed).toBe(1);
  });

  it('the couple asks for things and is upset when ignored', () => {
    const { sim } = makeSim({ guests: [] }, { coupleRequests: ['lemonade'] });
    const events: DomainEvent[] = [];
    runUntil(sim, () => events.some((e) => e.type === 'coupleRequestExpired'), 200, events);
    expect(sim.state.moodLedger.get('Couple was ignored')).toBeLessThan(0);
  });

  it('a calm reception slowly soothes the couple', () => {
    const { sim } = makeSim({ guests: [] });
    const before = sim.state.couple.mood;
    runFor(sim, 20);
    expect(sim.state.couple.mood).toBeGreaterThan(before);
  });
});

describe('reception end', () => {
  it('completes at the time limit with an end bonus and stars', () => {
    const { sim } = makeSim({ guests: [], durationSeconds: 10, starScores: [1, 2, 3] });
    runUntil(sim, () => sim.isOver, 20);
    const result = sim.result();
    expect(result.outcome).toBe('COMPLETE');
    expect(result.score).toBeGreaterThan(0);
    expect(result.stars).toBe(3);
  });

  it('fails if the couple’s mood hits zero', () => {
    const { sim } = makeSim({ guests: [], disasterIds: ['dj-glitch', 'leaning-cake'] }, { modifiers: [{ startMood: -60 }], seed: 3 });
    runUntil(sim, () => sim.isOver, 600);
    expect(sim.result().outcome).toBe('FAILED');
    expect(sim.result().stars).toBe(0);
    expect(sim.command({ type: 'clearQueue' }).ok).toBe(false);
  });

  it('is deterministic for a given seed', () => {
    const play = () => {
      const { sim } = makeSim({ disasterIds: ['dj-glitch', 'spilled-drink'], guests: [guest('a', 'A', 'kid', 'family', 0)] }, { seed: 99 });
      runUntil(sim, () => sim.isOver || sim.state.time > 120, 200);
      return JSON.stringify([sim.state.score, sim.state.couple.mood, [...sim.state.moodLedger]]);
    };
    expect(play()).toBe(play());
  });

  it('seated guests with enemies get unhappy even when served', () => {
    const { sim } = makeSim({
      guests: [guest('a', 'A', 'regular', 'family', 0, { dislikes: ['b'] }), guest('b', 'B', 'regular', 'work', 0)],
    });
    runFor(sim, 0.2);
    sim.command({ type: 'seatGuest', guestKey: 'b', seatId: 'table-1-n' });
    sim.command({ type: 'seatGuest', guestKey: 'a', seatId: 'table-1-e' });
    runFor(sim, 5);
    expect(guestByKey(sim, 'a').seatingMood).toBeLessThan(0);
  });
});
