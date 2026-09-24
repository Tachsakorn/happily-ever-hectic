import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id, LevelDef, Modifiers } from '../../content/types';
import type { ReceptionResult } from '../scoring/results';
import { newSave, type LevelProgress, type SaveData } from './saveData';

/** Pure progression rules: unlocks, rewards, the shop and which modifiers apply to a reception. */

export function isUnlocked(save: SaveData, level: LevelDef): boolean {
  return !level.unlockRequiresLevelId || save.levels[level.unlockRequiresLevelId]?.completed === true;
}

export interface ResultOutcome {
  readonly save: SaveData;
  readonly coinsEarned: number;
  readonly newBest: boolean;
  readonly newlyUnlocked: readonly Id[];
}

/**
 * Coins reward stars, and replaying only pays for improvement: the full reward
 * for the first clear, then a share for each extra star earned later.
 */
export function applyResult(content: ContentRegistry, save: SaveData, result: ReceptionResult): ResultOutcome {
  const level = content.levels.get(result.levelId);
  const before = save.levels[level.id];
  const completed = result.outcome === 'COMPLETE' && result.stars > 0;
  const previousStars = before?.stars ?? 0;
  const extraStars = Math.max(0, result.stars - previousStars);
  let coinsEarned = 0;
  if (completed) {
    coinsEarned = before?.completed ? Math.round((level.coinReward / 3) * extraStars) : level.coinReward + Math.round((level.coinReward / 3) * (result.stars - 1));
  }
  const progress: LevelProgress = {
    bestScore: Math.max(before?.bestScore ?? 0, result.score),
    stars: Math.max(previousStars, result.stars) as LevelProgress['stars'],
    completed: (before?.completed ?? false) || completed,
  };
  const next: SaveData = { ...save, coins: save.coins + coinsEarned, levels: { ...save.levels, [level.id]: progress } };
  const newlyUnlocked = content
    .orderedLevels()
    .filter((l) => !isUnlocked(save, l) && isUnlocked(next, l))
    .map((l) => l.id);
  return { save: next, coinsEarned, newBest: result.score > (before?.bestScore ?? 0), newlyUnlocked };
}

export function buyUpgrade(content: ContentRegistry, save: SaveData, upgradeId: Id): SaveData | { error: string } {
  const upgrade = content.upgrades.get(upgradeId);
  if (save.upgrades.includes(upgradeId)) return { error: 'Already owned' };
  if (save.coins < upgrade.cost) return { error: 'Not enough coins' };
  return { ...save, coins: save.coins - upgrade.cost, upgrades: [...save.upgrades, upgradeId] };
}

export function decorMatches(content: ContentRegistry, weddingId: Id, decorId: Id | null): boolean {
  if (!decorId) return false;
  const loves = content.weddings.get(weddingId).lovesTags;
  return content.decor.get(decorId).tags.some((t) => loves.includes(t));
}

/** Everything that tweaks a reception before it starts: owned upgrades plus a decor match bonus. */
export function receptionModifiers(content: ContentRegistry, save: SaveData, levelId: Id, decorId: Id | null): Modifiers[] {
  const level = content.levels.get(levelId);
  const mods: Modifiers[] = save.upgrades.filter((id) => content.upgrades.has(id)).map((id) => content.upgrades.get(id).modifiers);
  if (decorMatches(content, level.weddingId, decorId)) mods.push(content.tuning.decorMatchBonus);
  return mods;
}

/** Test tools: every wedding playable, keeping any stars and best scores already earned. */
export function unlockAllLevels(content: ContentRegistry, save: SaveData): SaveData {
  const levels: Record<string, LevelProgress> = { ...save.levels };
  for (const l of content.orderedLevels()) {
    const p = levels[l.id];
    levels[l.id] = { bestScore: p?.bestScore ?? 0, stars: p?.stars ?? 0, completed: true };
  }
  return { ...save, levels };
}

/** Test tools: extra coins for trying the shop. */
export function grantCoins(save: SaveData, amount: number): SaveData {
  return { ...save, coins: Math.max(0, save.coins + Math.floor(amount)) };
}

/** Test tools: start over, keeping only settings. */
export function resetProgress(save: SaveData): SaveData {
  return { ...newSave(), settings: save.settings };
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((n, l) => n + l.stars, 0);
}
