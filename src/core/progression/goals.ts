import type { GoalDef, LevelDef } from '../../content/types';
import type { ReceptionResult } from '../scoring/results';

/**
 * Bonus goals: optional extra challenges per level ("no guest storms off",
 * "a ×5 chain"). Met only in a completed wedding; each pays coins the first
 * time. Keys are derived from the goal itself so saves survive reordering.
 */
export function goalKey(goal: GoalDef): string {
  switch (goal.kind) {
    case 'minFinalMood':
      return `${goal.kind}:${goal.value}`;
    case 'noDisasterFailed':
    case 'allMoments':
    case 'noRescue':
      return goal.kind;
    default:
      return `${goal.kind}:${goal.count}`;
  }
}

export function goalMet(goal: GoalDef, result: ReceptionResult): boolean {
  if (result.outcome !== 'COMPLETE') return false;
  const s = result.stats;
  switch (goal.kind) {
    case 'maxUpset':
      return s.guestsUpset <= goal.count;
    case 'minChain':
      return s.bestChain >= goal.count;
    case 'minFinalMood':
      return result.finalMood >= goal.value;
    case 'noDisasterFailed':
      return s.disastersFailed === 0;
    case 'allMoments':
      return s.momentsFailed === 0;
    case 'minSongs':
      return s.servicesGranted >= goal.count;
    case 'noRescue':
      return s.rescuesUsed === 0;
    case 'minHappyGoodbyes':
      return s.guestsLeftHappy >= goal.count;
    case 'minGifts':
      return s.giftsDelivered >= goal.count;
  }
}

/** The keys of this level's goals met by this result. */
export function goalsMet(level: LevelDef, result: ReceptionResult): string[] {
  return (level.goals ?? []).filter((g) => goalMet(g, result)).map(goalKey);
}
