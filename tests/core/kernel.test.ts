import { describe, expect, it } from 'vitest';
import { FixedStepRunner } from '../../src/core/sim/FixedStepRunner';
import { combineModifiers } from '../../src/core/sim/modifiers';
import { Rng } from '../../src/core/sim/Rng';
import { NavGraph } from '../../src/core/nav/NavGraph';
import { distanceToSegment } from '../../src/core/math/vec';
import { EventBus } from '../../src/core/sim/events';

describe('Rng', () => {
  it('is deterministic per seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Rng(43).next()).not.toBe(seqA[0]);
  });

  it('stays in range and respects weights', () => {
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) counts[r.weighted(['a', 'b'] as const, (x) => (x === 'a' ? 9 : 1))!]++;
    expect(counts.a).toBeGreaterThan(counts.b * 5);
    expect(r.weighted([1, 2], () => 0)).toBeUndefined();
  });
});

describe('FixedStepRunner', () => {
  it('runs a whole number of fixed steps and carries the remainder', () => {
    let ticks = 0;
    const runner = new FixedStepRunner(0.1, () => ticks++);
    expect(runner.advance(0.25)).toBe(2);
    expect(runner.advance(0.05)).toBe(1);
    expect(ticks).toBe(3);
  });

  it('caps catch-up after a long hitch', () => {
    let ticks = 0;
    const runner = new FixedStepRunner(0.01, () => ticks++, 5);
    runner.advance(10);
    expect(ticks).toBe(5);
    expect(runner.alpha).toBe(0);
  });
});

describe('combineModifiers', () => {
  it('multiplies multiplicative and adds additive knobs', () => {
    const m = combineModifiers([{ plannerSpeed: 1.2, startMood: 5 }, { plannerSpeed: 1.5, startMood: 10 }, undefined]);
    expect(m.plannerSpeed).toBeCloseTo(1.8);
    expect(m.startMood).toBe(15);
    expect(m.guestTip).toBe(1);
  });
});

describe('NavGraph', () => {
  const table = { kind: 'circle' as const, center: { x: 100, y: 100 }, radius: 40 };
  const nav = new NavGraph([table], [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 0, y: 200 },
    { x: 200, y: 200 },
  ]);

  it('walks straight when the line is clear', () => {
    expect(nav.findPath({ x: 0, y: 0 }, { x: 200, y: 0 })).toEqual([{ x: 200, y: 0 }]);
  });

  it('routes around obstacles instead of through them', () => {
    const from = { x: 20, y: 20 };
    const to = { x: 180, y: 180 };
    const path = nav.findPath(from, to);
    expect(path.length).toBeGreaterThan(1);
    let prev = from;
    for (const p of path) {
      expect(distanceToSegment(table.center, prev, p)).toBeGreaterThanOrEqual(table.radius);
      prev = p;
    }
    expect(path[path.length - 1]).toEqual(to);
  });
});

describe('EventBus', () => {
  it('notifies subscribers synchronously and drains the outbox', () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.on('queueCleared', () => seen.push(1));
    bus.emit({ type: 'queueCleared' });
    expect(seen).toEqual([1]);
    expect(bus.drain()).toHaveLength(1);
    expect(bus.drain()).toHaveLength(0);
  });
});
