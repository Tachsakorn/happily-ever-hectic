import type { Vec2 } from '../../content/types';

export type { Vec2 };

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Moves `from` toward `to` by at most `maxStep`. Returns the new point and whether it arrived. */
export function stepToward(from: Vec2, to: Vec2, maxStep: number): { pos: Vec2; arrived: boolean } {
  const d = distance(from, to);
  if (d <= maxStep || d === 0) return { pos: to, arrived: true };
  const t = maxStep / d;
  return { pos: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, arrived: false };
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Shortest distance from point p to segment ab. */
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return distance(p, a);
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq, 0, 1);
  return distance(p, { x: a.x + abx * t, y: a.y + aby * t });
}
