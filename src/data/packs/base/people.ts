import type { GroupDef, GuestTypeDef, ItemDef, TraitDef } from '../../../content/types';

export const items: ItemDef[] = [
  { id: 'roast-chicken', name: 'Roast Chicken', kind: 'dish', hands: 1, visual: { color: 0xd9a066, icon: 'chicken' } },
  { id: 'salmon', name: 'Grilled Salmon', kind: 'dish', hands: 1, visual: { color: 0xf08a6c, icon: 'fish' } },
  { id: 'risotto', name: 'Garden Risotto', kind: 'dish', hands: 1, visual: { color: 0x7fae4f, icon: 'risotto' } },
  { id: 'champagne', name: 'Champagne', kind: 'drink', hands: 1, visual: { color: 0xf3d46b, icon: 'flute' } },
  { id: 'lemonade', name: 'Pink Lemonade', kind: 'drink', hands: 1, visual: { color: 0xf49ac1, icon: 'glass' } },
  { id: 'cake-slice', name: 'Cake Slice', kind: 'dessert', hands: 1, visual: { color: 0xfff1e0, accent: 0xe07a95, icon: 'slice' } },
  { id: 'wedding-cake', name: 'Wedding Cake', kind: 'cake', hands: 2, visual: { color: 0xfffaf2, accent: 0xe8b4c4, icon: 'cake' } },
  { id: 'gift', name: 'Gift', kind: 'gift', hands: 1, visual: { color: 0x8fb8de, accent: 0xe07a95, icon: 'gift' } },
];

export const groups: GroupDef[] = [
  { id: 'family', name: 'Family', visual: { color: 0xe07a95 } },
  { id: 'friends', name: 'Friends', visual: { color: 0x6fae84 } },
  { id: 'work', name: 'Coworkers', visual: { color: 0x6b8fd6 } },
  { id: 'neighbours', name: 'Neighbours', visual: { color: 0xe0a44a } },
];

export const traits: TraitDef[] = [
  { id: 'social', name: 'Social butterfly', description: 'Happy next to anyone.', modifiers: {}, otherGroupBonus: 0.75 },
  { id: 'family-first', name: 'Family first', description: 'Loves sitting with their own group.', modifiers: {}, sameGroupBonus: 1 },
  { id: 'easygoing', name: 'Easygoing', description: 'Very patient.', modifiers: { guestPatienceDrain: 0.8 } },
  { id: 'big-tipper', name: 'Big tipper', description: 'Tips generously.', modifiers: { guestTip: 1.6 } },
  { id: 'picky', name: 'Picky', description: 'Impatient, but tips well when treated right.', modifiers: { guestPatienceDrain: 1.15, guestTip: 1.3 } },
  { id: 'restless', name: 'Restless', description: 'Loses patience fast and asks for more.', modifiers: { guestPatienceDrain: 1.2, guestRequestInterval: 0.8 } },
  { id: 'demanding', name: 'Demanding', description: 'Very impatient. Huge tips.', modifiers: { guestPatienceDrain: 1.3, guestTip: 2 } },
];

const afterCake = 'cake-cut';

export const guestTypes: GuestTypeDef[] = [
  {
    id: 'regular',
    name: 'Guest',
    patienceSeconds: 70,
    eatSeconds: 9,
    requestIntervalSeconds: [26, 42],
    requestPool: [
      { itemId: 'champagne', weight: 3 },
      { itemId: 'lemonade', weight: 3 },
      { itemId: 'cake-slice', weight: 4, requiresFlag: afterCake },
    ],
    staysFor: [1, 2],
    danceWeight: 2,
    traitIds: [],
    visual: { color: 0xf4d3b8, icon: 'guest' },
  },
  {
    id: 'grandparent',
    name: 'Grandparent',
    patienceSeconds: 90,
    eatSeconds: 13,
    requestIntervalSeconds: [32, 48],
    requestPool: [
      { itemId: 'lemonade', weight: 4 },
      { itemId: 'cake-slice', weight: 3, requiresFlag: afterCake },
    ],
    staysFor: [1, 2],
    danceWeight: 1,
    traitIds: ['family-first', 'easygoing'],
    visual: { color: 0xe9c8ad, accent: 0xdddddd, icon: 'grandparent' },
  },
  {
    id: 'party-animal',
    name: 'Party Animal',
    patienceSeconds: 55,
    eatSeconds: 7,
    requestIntervalSeconds: [18, 30],
    requestPool: [
      { itemId: 'champagne', weight: 6 },
      { itemId: 'cake-slice', weight: 3, requiresFlag: afterCake },
    ],
    staysFor: [2, 3],
    danceWeight: 7,
    traitIds: ['social', 'big-tipper'],
    visual: { color: 0xf2c9a8, accent: 0xb86bd6, icon: 'party' },
  },
  {
    id: 'foodie',
    name: 'Foodie',
    patienceSeconds: 60,
    eatSeconds: 12,
    requestIntervalSeconds: [22, 36],
    requestPool: [
      { itemId: 'cake-slice', weight: 5, requiresFlag: afterCake },
      { itemId: 'lemonade', weight: 2 },
      { itemId: 'champagne', weight: 1 },
    ],
    staysFor: [2, 2],
    danceWeight: 1,
    traitIds: ['picky'],
    visual: { color: 0xd9b08c, accent: 0xffffff, icon: 'foodie' },
  },
  {
    id: 'kid',
    name: 'Kid',
    patienceSeconds: 50,
    eatSeconds: 8,
    requestIntervalSeconds: [18, 30],
    requestPool: [
      { itemId: 'lemonade', weight: 5 },
      { itemId: 'cake-slice', weight: 6, requiresFlag: afterCake },
    ],
    staysFor: [1, 2],
    danceWeight: 3,
    traitIds: ['restless'],
    visual: { color: 0xf6d7bf, accent: 0x6fc2d6, icon: 'kid' },
  },
  {
    id: 'boss',
    name: 'The Boss',
    patienceSeconds: 62,
    eatSeconds: 10,
    requestIntervalSeconds: [22, 36],
    requestPool: [
      { itemId: 'champagne', weight: 5 },
      { itemId: 'cake-slice', weight: 2, requiresFlag: afterCake },
    ],
    staysFor: [1, 1],
    danceWeight: 1,
    traitIds: ['demanding'],
    visual: { color: 0xeac3a2, accent: 0x33384a, icon: 'boss' },
  },
  {
    id: 'critic',
    name: 'Food Critic',
    patienceSeconds: 55,
    eatSeconds: 11,
    requestIntervalSeconds: [20, 32],
    requestPool: [
      { itemId: 'champagne', weight: 3 },
      { itemId: 'cake-slice', weight: 4, requiresFlag: afterCake },
      { itemId: 'lemonade', weight: 1 },
    ],
    staysFor: [2, 3],
    danceWeight: 1,
    traitIds: ['picky', 'demanding'],
    visual: { color: 0xeac3a2, accent: 0x6a4b6e, icon: 'boss' },
  },
];
