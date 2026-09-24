import type { ContentPack } from '../../../content/types';
import { guest } from '../base/weddings';
import { personal } from './profile';

const gift = { bringsGift: true };
const a = personal.partnerA;
const b = personal.partnerB;

/**
 * The personal pack: the final wedding and the special ending. It only adds
 * content and retitles the game — no system knows it exists.
 */
export const personalPack: ContentPack = {
  id: 'personal',
  info: {
    title: personal.gameTitle,
    tagline: 'A wedding planner’s race against chaos',
    plannerName: personal.plannerName,
    endingDialogueId: 'ending',
    finalLevelId: 'our-wedding',
  },
  weddings: [
    {
      id: 'our-wedding',
      title: `${a.name} & ${b.name}`,
      partnerA: { id: 'partner-a', name: a.name, visual: { color: a.outfitColor, accent: a.hairColor, icon: a.outfit }, look: a.look },
      partnerB: { id: 'partner-b', name: b.name, visual: { color: b.outfitColor, accent: b.hairColor, icon: b.outfit }, look: b.look },
      lovesTags: personal.lovesTags,
      menuItemIds: ['roast-chicken', 'salmon', 'risotto'],
      coupleRequestItemIds: ['champagne', 'lemonade'],
      coupleRequestIntervalSeconds: [30, 45],
    },
  ],
  levels: [
    {
      id: 'our-wedding',
      order: 100,
      name: 'Our Wedding',
      weddingId: 'our-wedding',
      venueId: 'garden-hall',
      durationSeconds: 210,
      // ✏️ Guest names are placeholders — replace with your real people.
      guests: [
        guest('mom-a', 'Mom', 'grandparent', 'family', 2, gift),
        guest('dad-a', 'Dad', 'regular', 'family', 4, gift),
        guest('bestie-a', 'Best Friend', 'party-animal', 'friends', 10, { bringsGift: true, likes: ['bestie-b'] }),
        guest('bestie-b', 'Other Best Friend', 'party-animal', 'friends', 14, { bringsGift: true, likes: ['bestie-a'] }),
        guest('grandma', 'Grandma', 'grandparent', 'family', 20, gift),
        guest('cousin', 'Little Cousin', 'kid', 'family', 26),
        guest('teacher', 'Favourite Teacher', 'boss', 'work', 33, gift),
        guest('classmate-1', 'Classmate', 'regular', 'friends', 40),
        guest('classmate-2', 'Classmate', 'foodie', 'friends', 47, gift),
        guest('neighbour-1', 'Neighbour', 'regular', 'neighbours', 55),
        guest('uncle', 'Uncle', 'regular', 'family', 63, { bringsGift: true, dislikes: ['neighbours'] }),
        guest('auntie', 'Auntie', 'grandparent', 'family', 72),
        guest('friend-3', 'Friend', 'regular', 'friends', 82, gift),
        guest('kid-2', 'Tiny Flower Kid', 'kid', 'neighbours', 92),
      ],
      disasterIds: ['spilled-drink', 'leaning-cake', 'dj-glitch', 'loose-puppy', 'guest-argument'],
      moments: [
        { momentId: 'toast', at: 60 },
        { momentId: 'cake-cutting', at: 140 },
      ],
      kitchen: { burners: 3, cookSeconds: 5 },
      starScores: [2200, 3150, 3750],
      coinReward: 400,
      unlockRequiresLevelId: 'level-5',
      introDialogueId: 'intro-our-wedding',
      tutorialTips: ['This one is ours. Make it perfect.'],
    },
  ],
  dialogues: [
    { id: 'intro-our-wedding', lines: personal.introLines },
    { id: 'ending', lines: personal.endingLines },
  ],
};
