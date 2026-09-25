import type { ContentPack, ItemDef } from '../../../content/types';
import { guest } from '../base/weddings';
import { personal } from './profile';

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
      planHints: personal.planHints,
      // Tanya's favourites are the menu; the plan doesn't change it.
      menuLocked: true,
      // Sushi to start, then smoked crying tiger; dragon fruit (via the dessert swap) to finish.
      appetizerItemIds: [fav.dishes[0]!.id],
      menuItemIds: fav.dishes.slice(1).map((d) => d.id),
      dessertItemId: 'cake-slice',
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
      durationSeconds: 335,
      dancing: true,
      // The finale is hard through variety, not volume: fewer guests than
      // weddings 8–9, but every one is a different personality, the seating is a
      // puzzle (five family members for four seats per table, a feud), and a
      // new kind of surprise arrives roughly every 20 seconds — one at a time.
      // ✏️ Guest names are placeholders — replace with your real people.
      guests: [
        guest('mom-a', 'Mom', 'grandparent', 'family', 2, { bringsGift: true, likes: ['dad-a'] }),
        guest('dad-a', 'Dad', 'regular', 'family', 6, { bringsGift: true, likes: ['mom-a'] }),
        guest('bestie-a', 'Best Friend', 'party-animal', 'friends', 14, { bringsGift: true, likes: ['bestie-b'] }),
        guest('bestie-b', 'Other Best Friend', 'foodie', 'friends', 22, { bringsGift: true, likes: ['bestie-a'] }),
        guest('cousin', 'Little Cousin', 'kid', 'family', 36, { dislikes: ['teacher'] }),
        guest('teacher', 'Favourite Teacher', 'boss', 'work', 48, { bringsGift: true, dislikes: ['cousin'] }),
        guest('grandma', 'Grandma', 'grandparent', 'family', 62, { bringsGift: true, traitIds: ['slow-eater'] }),
        guest('uncle', 'Uncle', 'regular', 'family', 79, { bringsGift: true, dislikes: ['work'] }),
        guest('classmate', 'Classmate', 'regular', 'friends', 96, { likes: ['bestie-a'] }),
        guest('roommate', 'Old Roommate', 'party-animal', 'friends', 115, { likes: ['classmate'] }),
        guest('aunt', 'Aunt', 'grandparent', 'family', 132, { bringsGift: true, traitIds: ['drama'] }),
        guest('coworker', 'Coworker', 'regular', 'work', 149),
      ],
      disasterIds: [
        'spilled-drink',
        'toppled-gifts',
        'missing-rings',
        'leaning-cake',
        'kitchen-smoke',
        'dj-glitch',
        'loose-puppy',
        'bridesmaid-spat',
        'photo-time',
        'guest-argument',
      ],
      disasterTriggers: {
        'spilled-drink': { kind: 'random', from: 28, to: 40, chancePerSecond: 0.15 },
        'toppled-gifts': { kind: 'random', from: 58, to: 72, chancePerSecond: 0.15 },
        'missing-rings': { kind: 'scheduled', at: 88 },
        // Steady the cake just before it is needed for the cutting.
        'leaning-cake': { kind: 'random', from: 100, to: 112, chancePerSecond: 0.2 },
        'kitchen-smoke': { kind: 'random', from: 128, to: 136, chancePerSecond: 0.2 },
        'dj-glitch': { kind: 'random', from: 142, to: 154, chancePerSecond: 0.15 },
        'loose-puppy': { kind: 'random', from: 160, to: 172, chancePerSecond: 0.15 },
        'bridesmaid-spat': { kind: 'random', from: 178, to: 188, chancePerSecond: 0.2 },
        'photo-time': { kind: 'random', from: 194, to: 206, chancePerSecond: 0.2 },
      },
      // Our wedding serves Tanya's favourites instead of the hall's usual menu.
      services: ['song'],
      rescues: 3,
      itemSwaps: { champagne: fav.drink.id, lemonade: fav.secondDrink.id, 'cake-slice': fav.dessert.id },
      moments: [
        { momentId: 'toast', at: 48 },
        { momentId: 'cake-cutting', at: 122 },
      ],
      kitchen: { burners: 3, cookSeconds: 5 },
      // A forgiving first star: finishing the finale is what unlocks the ending.
      starScores: [2100, 4050, 4850],
      coinReward: 400,
      unlockRequiresLevelId: 'big-night',
      introDialogueId: 'intro-our-wedding',
      tutorialTips: ['This one is ours. Fewer guests, but expect a new surprise every few moments!'],
      goals: [{ kind: 'allMoments' }, { kind: 'maxUpset', count: 0 }, { kind: 'minFinalMood', value: 80 }],
    },
  ],
  dialogues: [
    { id: 'intro-our-wedding', lines: personal.introLines },
    { id: 'ending', lines: personal.endingLines },
  ],
};
