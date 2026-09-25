import type { ContentRegistry } from '../../content/ContentRegistry';
import type { AchievementCondition, AchievementDef, Id } from '../../content/types';
import type { ReceptionResult } from '../scoring/results';
import type { LifetimeStats, SaveData } from './saveData';
import { goalKey } from './goals';

/**
 * Pure achievement rules: content + save (+ the reception just played) →
 * which achievements hold. Unlocking only ever adds; nothing is taken away.
 */

export interface AchievementCheck {
  /** The reception that just ended, for single-reception conditions. */
  readonly result?: ReceptionResult;
  /** Device time, for time-of-day achievements. Passed in so the rules stay testable. */
  readonly now: Date;
  /** How the wedding plan of that reception went, if there was one. */
  readonly plan?: { readonly right: number; readonly total: number };
}

const LIFETIME_FIELD: Record<Extract<AchievementCondition, { kind: 'lifetime' }>['stat'], keyof LifetimeStats> = {
  dances: 'dances',
  giftsDelivered: 'giftsDelivered',
  disastersFixed: 'disastersFixed',
  happyGoodbyes: 'happyGoodbyes',
  guestsServed: 'guestsServed',
};

/** Bonus goals met, counting only goals the loaded levels still have. */
export function goalsCompletedCount(content: ContentRegistry, save: SaveData): number {
  return content.levels.all().reduce((n, l) => {
    const keys = new Set((l.goals ?? []).map(goalKey));
    return n + (save.levels[l.id]?.goals ?? []).filter((k) => keys.has(k)).length;
  }, 0);
}

/** Only levels that exist in the loaded content count (old saves may name removed ones). */
function threeStarCount(content: ContentRegistry, save: SaveData): number {
  return content.levels.all().filter((l) => save.levels[l.id]?.stars === 3).length;
}

/** A counter to show under a locked achievement (e.g. 12 / 50), when it has one. */
export function achievementProgress(content: ContentRegistry, save: SaveData, def: AchievementDef): { current: number; target: number } | null {
  const c = def.condition;
  const clamp = (current: number, target: number) => ({ current: Math.min(current, target), target });
  switch (c.kind) {
    case 'weddingsCompleted':
      return clamp(save.lifetime.weddingsCompleted, c.count);
    case 'lifetime':
      return clamp(save.lifetime[LIFETIME_FIELD[c.stat]], c.count);
    case 'threeStarLevels':
      return clamp(threeStarCount(content, save), c.count === 'all' ? content.levels.all().length : c.count);
    case 'allUpgradesOwned':
      return clamp(content.upgrades.all().filter((u) => save.upgrades.includes(u.id)).length, content.upgrades.all().length);
    case 'goalsCompleted':
      return clamp(goalsCompletedCount(content, save), c.count);
    case 'allSecretsFound':
      return clamp(content.secretEvents.all().filter((s) => save.secretsFound.includes(s.id)).length, content.secretEvents.all().length);
    default:
      return null;
  }
}

function holds(content: ContentRegistry, save: SaveData, c: AchievementCondition, check: AchievementCheck): boolean {
  const r = check.result;
  const completed = r?.outcome === 'COMPLETE';
  switch (c.kind) {
    case 'weddingsCompleted':
      return save.lifetime.weddingsCompleted >= c.count;
    case 'lifetime':
      return save.lifetime[LIFETIME_FIELD[c.stat]] >= c.count;
    case 'threeStarLevels':
      return threeStarCount(content, save) >= (c.count === 'all' ? content.levels.all().length : c.count);
    case 'finalLevelCompleted': {
      const id = content.info.finalLevelId;
      return !!id && save.levels[id]?.completed === true;
    }
    case 'reception': {
      if (!r || !completed) return false;
      const guests = content.levels.has(r.levelId) ? content.levels.get(r.levelId).guests.length : 0;
      return (
        (c.minGuests === undefined || guests >= c.minGuests) &&
        (c.maxUpset === undefined || r.stats.guestsUpset <= c.maxUpset) &&
        (c.maxFinalMood === undefined || r.finalMood <= c.maxFinalMood) &&
        (c.minStars === undefined || r.stars >= c.minStars)
      );
    }
    case 'secretFound':
      return save.secretsFound.includes(c.secretId);
    case 'goalsCompleted':
      return goalsCompletedCount(content, save) >= c.count;
    case 'allSecretsFound': {
      const all = content.secretEvents.all();
      return all.length > 0 && all.every((s) => save.secretsFound.includes(s.id));
    }
    case 'allUpgradesOwned': {
      const all = content.upgrades.all();
      return all.length > 0 && all.every((u) => save.upgrades.includes(u.id));
    }
    case 'perfectPlan':
      return completed && !!check.plan && check.plan.total >= 3 && check.plan.right === check.plan.total;
    case 'completedDuringHours': {
      if (!completed) return false;
      const h = check.now.getHours();
      return h >= c.from && h < c.to;
    }
  }
}

/** Unlocks every achievement whose condition now holds; returns the new save and what was newly unlocked. */
export function unlockAchievements(content: ContentRegistry, save: SaveData, check: AchievementCheck): { save: SaveData; unlocked: Id[] } {
  const unlocked = content.achievements
    .all()
    .filter((a) => save.achievements[a.id] === undefined && holds(content, save, a.condition, check))
    .map((a) => a.id);
  if (!unlocked.length) return { save, unlocked };
  const at = check.now.getTime();
  const achievements = { ...save.achievements };
  for (const id of unlocked) achievements[id] = at;
  return { save: { ...save, achievements }, unlocked };
}
