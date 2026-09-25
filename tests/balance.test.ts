// Balancing report: plays every shipped level with the autoplayer across seeds,
// as a "casual" player (slow reactions) and an "expert" (fast reactions).
// Run: pnpm vitest run tests/balance.test.ts --silent=false
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data';
import { ReceptionSimulation } from '../src/core/sim/ReceptionSimulation';
import { autoplay } from './support/autoplayer';

const content = loadContent();
const SEEDS = [1, 2, 3, 4, 5, 6];
const PROFILES = { casual: 1.2, expert: 0.35 } as const;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

function play(levelId: string, reaction: number) {
  return SEEDS.map((seed) => {
    const sim = new ReceptionSimulation({ content, levelId, seed });
    autoplay(sim, reaction);
    return sim.result();
  });
}

describe('level balance (autoplayer)', () => {
  for (const level of content.orderedLevels()) {
    it(`${level.id}: a casual player can finish it and earn a star`, () => {
      const casual = play(level.id, PROFILES.casual);
      const expert = play(level.id, PROFILES.expert);
      const summary = {
        level: level.id,
        casualScores: casual.map((r) => r.score).join(' '),
        casualUpset: casual.map((r) => r.stats.guestsUpset).join(' '),
        casualStars: casual.map((r) => r.stars).join(''),
        expertScores: expert.map((r) => r.score).join(' '),
        expertStars: expert.map((r) => r.stars).join(''),
        // Stars: ~55% / 80% / 95% of what a steady casual player scores; the third star
        // never above what a quick player always reaches (with no clock to race, speed
        // alone no longer lifts the score much).
        suggested: [0.55, 0.8, 0.95]
          .map((f, i) => {
            const target = median(casual.map((r) => r.score)) * f;
            const cap = i === 2 ? Math.min(...expert.map((r) => r.score)) * 0.98 : Infinity;
            return Math.floor(Math.min(target, cap) / 50) * 50;
          })
          .join('/'),
        thresholds: level.starScores.join('/'),
      };
      console.log(JSON.stringify(summary));
      expect(casual.every((r) => r.outcome === 'COMPLETE')).toBe(true);
      expect(Math.min(...casual.map((r) => r.stars))).toBeGreaterThanOrEqual(1);
      expect(expert.every((r) => r.stars === 3)).toBe(true);
    });
  }
});
