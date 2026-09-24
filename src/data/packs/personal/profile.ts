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
  // Looks drawn from a photo the owner shared (short crop for Goji, long dark
  // side-swept hair for Tanya, her star-print style and cheeky tongue-out face).
  partnerA: {
    name: 'Goji',
    outfit: 'suit' as 'suit' | 'dress',
    outfitColor: 0x34405e,
    hairColor: 0x1c1512,
    look: { skin: 0xd9a47e, hairStyle: 'crop', shirt: 0xe4dcf0, signatureMood: 'happy' },
  },
  partnerB: {
    name: 'Tanya',
    outfit: 'dress' as 'suit' | 'dress',
    outfitColor: 0xffffff,
    hairColor: 0x1c1512,
    look: { skin: 0xe6b48e, hairStyle: 'longSide', accessory: 'star-clip', signatureMood: 'cheeky' },
  },
  /** ✏️ Decor tags the two of you love: flowers, pastel, lights, rustic, classic, elegant, bright, tropical. */
  lovesTags: ['flowers', 'lights'],
  /** ✏️ Intro before the final wedding. */
  introLines: [
    { speaker: 'Goji', text: 'Everyone we love, in one room. Are you ready?' },
    { speaker: 'Tanya', text: 'With you? Always.' },
  ],
  /** ✏️ The special ending, shown after completing the final wedding. */
  endingLines: [
    { speaker: 'Goji', text: 'Every wedding you planned was practice for this one.' },
    { speaker: 'Tanya', text: 'And this is the only one that was ours.' },
    { speaker: 'Goji', text: 'Happily ever after — hectic parts included.' },
  ],
};
