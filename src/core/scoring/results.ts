import type { LevelDef } from '../../content/types';
import { hearts, isAtTable } from '../guests/guestMachine';
import type { ReceptionOutcome, ReceptionState, ReceptionStats } from '../sim/state';

export interface ReceptionResult {
  readonly levelId: string;
  readonly outcome: Exclude<ReceptionOutcome, 'RUNNING'>;
  readonly score: number;
  readonly stars: 0 | 1 | 2 | 3;
  readonly finalMood: number;
  readonly stats: Readonly<ReceptionStats>;
  /** Mood changes grouped by cause, biggest impact first. */
  readonly moodBreakdown: readonly { cause: string; amount: number }[];
  /** Secret events found this reception (definition ids). */
  readonly secretsFound: readonly string[];
}

export function starsFor(score: number, thresholds: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/** End-of-reception bonus: happy guests still at their tables, and the couple's final mood. */
export function endBonus(state: ReceptionState, perHeart: number, perMoodPoint: number): number {
  const guestHearts = state.guests.filter(isAtTable).reduce((n, g) => n + hearts(g), 0);
  return Math.round(guestHearts * perHeart + state.couple.mood * perMoodPoint);
}

export function buildResult(state: ReceptionState, level: LevelDef): ReceptionResult {
  if (state.outcome === 'RUNNING') throw new Error('Reception has not ended');
  const moodBreakdown = [...state.moodLedger.entries()]
    .map(([cause, amount]) => ({ cause, amount: Math.round(amount) }))
    .filter((e) => e.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  return {
    levelId: level.id,
    outcome: state.outcome,
    score: state.score,
    stars: state.outcome === 'FAILED' ? 0 : starsFor(state.score, level.starScores),
    finalMood: Math.round(state.couple.mood),
    stats: { ...state.stats },
    moodBreakdown,
    secretsFound: state.secrets.filter((s) => s.state === 'found').map((s) => s.defId),
  };
}
