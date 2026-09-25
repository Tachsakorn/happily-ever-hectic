import type { Modifiers } from '../../content/types';

type Resolved = { -readonly [K in keyof Modifiers]-?: number };

const IDENTITY: Resolved = {
  guestPatienceDrain: 1,
  guestTip: 1,
  guestEatTime: 1,
  guestRequestInterval: 1,
  plannerSpeed: 1,
  kitchenCookTime: 1,
  disasterWarningTime: 1,
  disasterChance: 1,
  coupleMoodDrain: 1,
  startMood: 0,
  scoreBonus: 0,
  kitchenBurners: 0,
  disasterReaction: 1,
};

const ADDITIVE = new Set<keyof Modifiers>(['startMood', 'scoreBonus', 'kitchenBurners']);

export type ResolvedModifiers = Readonly<Resolved>;

/** Folds any number of modifier sets: multiplicative knobs multiply, additive knobs add. */
export function combineModifiers(sets: readonly (Modifiers | undefined)[]): ResolvedModifiers {
  const out: Resolved = { ...IDENTITY };
  for (const set of sets) {
    if (!set) continue;
    for (const key of Object.keys(set) as (keyof Modifiers)[]) {
      const value = set[key];
      if (value === undefined) continue;
      out[key] = ADDITIVE.has(key) ? out[key] + value : out[key] * value;
    }
  }
  return out;
}

export const NO_MODIFIERS: ResolvedModifiers = IDENTITY;
