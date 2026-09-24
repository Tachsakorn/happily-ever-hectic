import type { Obstacle, Vec2 } from '../../content/types';
import { distance, distanceToSegment } from '../math/vec';

/**
 * Visibility-graph navigation. Venues are small (dozens of points), so we
 * connect every pair of nav points with a clear line once at setup, then run
 * Dijkstra per path request. Walkers route around tables instead of through them.
 */
export class NavGraph {
  private readonly nodes: Vec2[] = [];
  private readonly edges: number[][] = [];

  constructor(
    private readonly obstacles: readonly Obstacle[],
    points: readonly Vec2[],
    /** Extra clearance so walkers don't brush obstacle edges. */
    private readonly clearance = 12,
  ) {
    for (const p of points) this.addNode(p);
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  isClear(a: Vec2, b: Vec2): boolean {
    for (const o of this.obstacles) {
      if (o.kind === 'circle') {
        if (distanceToSegment(o.center, a, b) < o.radius + this.clearance) return false;
      } else if (segmentHitsRect(a, b, o.x - this.clearance, o.y - this.clearance, o.w + 2 * this.clearance, o.h + 2 * this.clearance)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the waypoints to walk from `from` to `to`, excluding `from` and
   * including `to`. Falls back to a straight line if no route exists, so a
   * content mistake degrades to clipping rather than a stuck character.
   */
  findPath(from: Vec2, to: Vec2): Vec2[] {
    if (this.isClear(from, to)) return [to];
    const n = this.nodes.length;
    const startLinks = this.visibleFrom(from);
    const endLinks = new Set(this.visibleFrom(to));
    if (!startLinks.length || !endLinks.size) return [to];

    const dist = new Array<number>(n).fill(Infinity);
    const prev = new Array<number>(n).fill(-1);
    const done = new Array<boolean>(n).fill(false);
    for (const i of startLinks) dist[i] = distance(from, this.node(i));

    let bestEnd = -1;
    let bestTotal = Infinity;
    for (;;) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        const d = dist[i] ?? Infinity;
        if (!done[i] && d < best) {
          best = d;
          u = i;
        }
      }
      if (u === -1 || best >= bestTotal) break;
      done[u] = true;
      if (endLinks.has(u)) {
        const total = best + distance(this.node(u), to);
        if (total < bestTotal) {
          bestTotal = total;
          bestEnd = u;
        }
      }
      for (const v of this.edges[u] ?? []) {
        const alt = best + distance(this.node(u), this.node(v));
        if (alt < (dist[v] ?? Infinity)) {
          dist[v] = alt;
          prev[v] = u;
        }
      }
    }
    if (bestEnd === -1) return [to];

    const path: Vec2[] = [to];
    for (let i = bestEnd; i !== -1; i = prev[i] ?? -1) path.unshift(this.node(i));
    return path;
  }

  private node(i: number): Vec2 {
    const p = this.nodes[i];
    if (!p) throw new Error(`Nav node ${i} out of range`);
    return p;
  }

  private addNode(p: Vec2): void {
    const index = this.nodes.length;
    this.nodes.push(p);
    this.edges.push([]);
    for (let i = 0; i < index; i++) {
      if (this.isClear(p, this.node(i))) {
        this.edges[index]?.push(i);
        this.edges[i]?.push(index);
      }
    }
  }

  private visibleFrom(p: Vec2): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) if (this.isClear(p, this.node(i))) out.push(i);
    return out;
  }
}

function segmentHitsRect(a: Vec2, b: Vec2, x: number, y: number, w: number, h: number): boolean {
  const inside = (p: Vec2) => p.x > x && p.x < x + w && p.y > y && p.y < y + h;
  if (inside(a) || inside(b)) return true;
  const corners: Vec2[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  for (let i = 0; i < 4; i++) {
    const c = corners[i] as Vec2;
    const d = corners[(i + 1) % 4] as Vec2;
    if (segmentsIntersect(a, b, c, d)) return true;
  }
  return false;
}

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}
