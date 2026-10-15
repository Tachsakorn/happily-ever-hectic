/**
 * The in-game update log ("What's new" on the title screen), newest first.
 * Written for the player, not the developer: say what changed in the game.
 * To add an entry, put it at the top and bump `version` in package.json to
 * match (a test keeps the two in step).
 */
export interface ChangelogEntry {
  /** Shown as "v0.5"; also the id the save remembers as "last read". */
  readonly version: string;
  /** ISO date, YYYY-MM-DD. */
  readonly date: string;
  readonly title: string;
  readonly notes: readonly string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '0.5',
    date: '2026-10-15',
    title: 'A watercolour storybook',
    notes: [
      'The reception is painted like a picture book now: soft pencil outlines, feathered shading and a little paper texture on the venue, the guests and the food.',
      'At the end of a wedding the camera no longer squashes the score bar and the heart meter; they fade away while it moves in on the couple.',
      'The wedding plan screen stays still while you pick flowers, menu, cake and honeymoon.',
      'New: this update log.',
    ],
  },
  {
    version: '0.4',
    date: '2026-09-30',
    title: 'Sweeter sounds, happier moments',
    notes: [
      'Richer sound: a touch of reverb, a bell that climbs the scale as your chain grows, and new cheers for milestones, stars and happy goodbyes.',
      'The music speeds up and a hi-hat ticks in when the couple get stressed; the waltz is longer, too.',
      'Chain milestones shout a word with confetti, and the chain counter changes colour as it grows.',
      'The mood bar glides, and leaves a pale trail when it drops.',
      'Results are a show: the score counts up, then the stars land one by one.',
    ],
  },
  {
    version: '0.3',
    date: '2026-09-24',
    title: 'A prettier game',
    notes: [
      'New look for every screen: the garden title with the couple under the flower arch, a winding wedding map, invitation-style planning and a plaque for pausing.',
      'The venue has plank floors, hedges, a flower arch, chairs with place settings, a DJ deck and drink carts.',
      'Guests walk, breathe, hop into their seats and change faces with their mood; the planner and couple react too.',
    ],
  },
  {
    version: '0.2',
    date: '2026-09-24',
    title: 'Gentler weddings',
    notes: [
      'The venue is more compact, like the original wedding rush: tables, kitchen, bar and waiting area sit close together.',
      'Each wedding teaches one new thing: serving, then gifts, then cake and your first disaster, then who sits with whom.',
      'Fewer guests, more patience, a faster planner and a faster kitchen. Gifts are easier to tap.',
    ],
  },
  {
    version: '0.1',
    date: '2026-09-24',
    title: 'The first reception',
    notes: [
      'Seat guests, serve courses, deliver gifts and keep the couple smiling as five kinds of wedding disaster pop up.',
      'A wedding map, coins and a shop, stars and bonus goals, achievements, and a save that remembers everything.',
    ],
  },
];
