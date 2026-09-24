// Balancing report: plays every shipped level with the autoplayer across seeds.
// Run: pnpm vitest run tests/balance --reporter=verbose  (prints a table)
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data';
import { ReceptionSimulation } from '../src/core/sim/ReceptionSimulation';
import { autoplay } from './support/autoplayer';

const content = loadContent();
const SEEDS = [1, 2, 3, 4, 5, 6];

describe('level balance (autoplayer)', () => {
  for (const level of content.orderedLevels()) {
    it(`${level.id} is winnable and stars are reachable`, () => {
      const rows = SEEDS.map((seed) => {
        const sim = new ReceptionSimulation({ content, levelId: level.id, seed });
        autoplay(sim);
        return sim.result();
      });
      const scores = rows.map((r) => r.score);
      const summary = {
        level: level.id,
        outcomes: rows.map((r) => r.outcome[0]).join(''),
        scores: scores.join(' '),
        stars: rows.map((r) => r.stars).join(''),
        mood: rows.map((r) => r.finalMood).join(' '),
        upset: rows.map((r) => r.stats.guestsUpset).join(' '),
        thresholds: level.starScores.join('/'),
      };
      console.log(JSON.stringify(summary));
      // A competent player must be able to finish every wedding.
      expect(rows.every((r) => r.outcome === 'COMPLETE')).toBe(true);
      expect(Math.min(...rows.map((r) => r.stars))).toBeGreaterThanOrEqual(1);
    });
  }
});
