/**
 * Seeded PRNG (mulberry32). All gameplay randomness goes through an Rng
 * instance so a reception is reproducible from its seed — essential for
 * tests and for reproducing bugs.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.range(minInclusive, maxInclusive + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items.length ? items[Math.floor(this.next() * items.length)] : undefined;
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
    if (total <= 0) return undefined;
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, weight(item));
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  }
}
