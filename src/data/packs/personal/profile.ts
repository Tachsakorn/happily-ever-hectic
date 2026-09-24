/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PERSONAL DETAILS — the one file to edit to make the game yours.
 *  Everything personal in the game is built from these values.
 *  Placeholders are marked with ✏️ and must be replaced.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const personal = {
  /** ✏️ Shown on the title screen. */
  gameTitle: 'Happily Ever Hectic',
  /** ✏️ Who the player is (the wedding planner character). */
  plannerName: 'Planner',
  partnerA: {
    /** ✏️ */
    name: 'Partner A',
    outfit: 'suit' as 'suit' | 'dress',
    outfitColor: 0x3d4f73,
    hairColor: 0x2b1d14,
  },
  partnerB: {
    /** ✏️ */
    name: 'Partner B',
    outfit: 'dress' as 'suit' | 'dress',
    outfitColor: 0xffffff,
    hairColor: 0x2b1d14,
  },
  /** ✏️ Decor tags the two of you love: flowers, pastel, lights, rustic, classic, elegant, bright, tropical. */
  lovesTags: ['flowers', 'lights'],
  /** ✏️ Intro before the final wedding. */
  introLines: [
    { speaker: 'Partner A', text: 'Everyone we love, in one room. Are you ready?' },
    { speaker: 'Partner B', text: 'With you? Always.' },
  ],
  /** ✏️ The special ending, shown after completing the final wedding. */
  endingLines: [
    { speaker: 'Partner A', text: 'Every wedding you planned was practice for this one.' },
    { speaker: 'Partner B', text: 'And this is the only one that was ours.' },
    { speaker: 'Partner A', text: 'Happily ever after — hectic parts included.' },
  ],
};
