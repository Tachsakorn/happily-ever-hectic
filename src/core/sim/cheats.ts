/**
 * Test shortcuts for playtesting. They go through the simulation like
 * everything else (events, results, saves), so a cheated finish exercises the
 * same results → progression → save path as a real one.
 */
export type Cheat =
  /** End the reception now as a success with at least this many stars (0 = survived, no star). */
  | { readonly type: 'finish'; readonly stars: 0 | 1 | 2 | 3 }
  /** End the reception now as a failure (the couple ran out of patience). */
  | { readonly type: 'fail' }
  /** Jump ahead in time, running the simulation normally. */
  | { readonly type: 'skipTime'; readonly seconds: number }
  /** Top the couple's mood up to full. */
  | { readonly type: 'fillMood' }
  /** Make a secret event this venue can have appear right now, ignoring its odds. */
  | { readonly type: 'spawnSecret' };

export const CHEAT_CAUSE = 'Test shortcut';
