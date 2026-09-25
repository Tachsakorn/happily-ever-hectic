import type { CoupleStateDef, TuningDef } from '../../content/types';

/** The couple's mood band for a mood value (bands are ordered best first). */
export function coupleStateFor(tuning: TuningDef, mood: number): CoupleStateDef {
  const bands = tuning.coupleStates;
  return bands.find((b) => mood >= b.minMood) ?? (bands[bands.length - 1] as CoupleStateDef);
}
