import type { ContentPack, ItemDef } from '../../../content/types';
import { guest } from '../base/weddings';
import { personal } from './profile';

const gift = { bringsGift: true };
const a = personal.partnerA;
const b = personal.partnerB;
const fav = personal.favourites;

const favouriteItems: ItemDef[] = [
  ...fav.dishes.map((d) => ({ id: d.id, name: d.name, kind: 'dish' as const, hands: 1 as const, visual: { color: d.color, icon: d.icon } })),
  { id: fav.drink.id, name: fav.drink.name, kind: 'drink', hands: 1, visual: { color: fav.drink.color, icon: fav.drink.icon } },
  { id: fav.secondDrink.id, name: fav.secondDrink.name, kind: 'drink', hands: 1, visual: { color: fav.secondDrink.color, icon: fav.secondDrink.icon } },
  { id: fav.dessert.id, name: fav.dessert.name, kind: 'dessert', hands: 1, visual: { color: fav.dessert.color, icon: fav.dessert.icon } },
];

/**
 * The personal pack: the final wedding and the special ending. It only adds
 * content and retitles the game — no system knows it exists.
 */
export const personalPack: ContentPack = {
  id: 'personal',
  items: favouriteItems,
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
      menuItemIds: fav.dishes.map((d) => d.id),
      coupleRequestItemIds: [fav.drink.id, fav.secondDrink.id],
      coupleRequestIntervalSeconds: [40, 58],
    },
  ],
  levels: [
    {
      id: 'our-wedding',
      order: 100,
      name: 'Our Wedding',
      weddingId: 'our-wedding',
      venueId: 'garden-hall',
      durationSeconds: 215,
      dancing: true,
      // The finale is hard through variety, not volume: fewer guests than
      // weddings 8–9, but every one is a different personality, the seating is a
      // puzzle (five family members for four seats per table, a feud), and a
      // new kind of surprise arrives roughly every 20 seconds — one at a time.
      // ✏️ Guest names are placeholders — replace with your real people.
      guests: [
        guest('mom-a', 'Mom', 'grandparent', 'family', 2, { bringsGift: true, likes: ['dad-a'] }),
        guest('dad-a', 'Dad', 'regular', 'family', 5, { bringsGift: true, likes: ['mom-a'] }),
        guest('bestie-a', 'Best Friend', 'party-animal', 'friends', 12, { bringsGift: true, likes: ['bestie-b'] }),
        guest('bestie-b', 'Other Best Friend', 'foodie', 'friends', 18, { bringsGift: true, likes: ['bestie-a'] }),
        guest('cousin', 'Little Cousin', 'kid', 'family', 30, { dislikes: ['teacher'] }),
        guest('teacher', 'Favourite Teacher', 'boss', 'work', 40, { bringsGift: true, dislikes: ['cousin'] }),
        guest('grandma', 'Grandma', 'grandparent', 'family', 52, gift),
        guest('uncle', 'Uncle', 'regular', 'family', 66, { bringsGift: true, dislikes: ['work'] }),
        guest('classmate', 'Classmate', 'regular', 'friends', 80, { likes: ['bestie-a'] }),
        guest('roommate', 'Old Roommate', 'party-animal', 'friends', 96, { likes: ['classmate'] }),
        guest('aunt', 'Aunt', 'grandparent', 'family', 110, gift),
        guest('coworker', 'Coworker', 'regular', 'work', 124),
      ],
      disasterIds: ['spilled-drink', 'toppled-gifts', 'missing-rings', 'leaning-cake', 'dj-glitch', 'loose-puppy', 'photo-time', 'guest-argument'],
      disasterTriggers: {
        'spilled-drink': { kind: 'random', from: 28, to: 40, chancePerSecond: 0.15 },
        'toppled-gifts': { kind: 'random', from: 58, to: 72, chancePerSecond: 0.15 },
        'missing-rings': { kind: 'scheduled', at: 88 },
        // Steady the cake just before it is needed for the cutting.
        'leaning-cake': { kind: 'random', from: 100, to: 112, chancePerSecond: 0.2 },
        'dj-glitch': { kind: 'random', from: 138, to: 152, chancePerSecond: 0.15 },
        'loose-puppy': { kind: 'random', from: 158, to: 172, chancePerSecond: 0.15 },
        'photo-time': { kind: 'random', from: 176, to: 190, chancePerSecond: 0.2 },
      },
      // Our wedding serves Tanya's favourites instead of the hall's usual menu.
      itemSwaps: { champagne: fav.drink.id, lemonade: fav.secondDrink.id, 'cake-slice': fav.dessert.id },
      moments: [
        { momentId: 'toast', at: 48 },
        { momentId: 'cake-cutting', at: 122 },
      ],
      kitchen: { burners: 3, cookSeconds: 5 },
      // A forgiving first star: finishing the finale is what unlocks the ending.
      starScores: [1800, 3450, 4100],
      coinReward: 400,
      unlockRequiresLevelId: 'big-night',
      introDialogueId: 'intro-our-wedding',
      tutorialTips: ['This one is ours. Fewer guests, but expect a new surprise every few moments!'],
    },
  ],
  dialogues: [
    { id: 'intro-our-wedding', lines: personal.introLines },
    { id: 'ending', lines: personal.endingLines },
  ],
};
