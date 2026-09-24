import type { SeatDef, StationDef, TableDef, VenueDef } from '../../../content/types';

const SEAT_OFFSET = 92;
/** The planner serves from beside the chair (clockwise), so she never covers the guest's bubble. */
const SERVE_SIDE = 62;
const TABLE_RADIUS = 62;

/** Four seats around a round table (N, E, S, W), each with a serving spot beside it. */
function roundTable(id: string, x: number, y: number): TableDef {
  const dirs: [string, number, number][] = [
    ['n', 0, -1],
    ['e', 1, 0],
    ['s', 0, 1],
    ['w', -1, 0],
  ];
  const seats: SeatDef[] = dirs.map(([suffix, dx, dy]) => ({
    id: `${id}-${suffix}`,
    pos: { x: x + dx * SEAT_OFFSET, y: y + dy * SEAT_OFFSET },
    // Perpendicular (clockwise) to the seat direction: (dx, dy) → (-dy, dx).
    interactPos: { x: x + dx * SEAT_OFFSET - dy * SERVE_SIDE, y: y + dy * SEAT_OFFSET + dx * SERVE_SIDE },
  }));
  return { id, pos: { x, y }, radius: TABLE_RADIUS, seats };
}

/*
 * Compact layout: like the classic Dash games, everything is a short walk
 * away. The long walks of the first layout made one planner feel hopeless
 * against a full room (playtest feedback, day 1).
 */
const tables = [
  roundTable('table-1', 520, 440),
  roundTable('table-2', 830, 440),
  roundTable('table-3', 520, 700),
  roundTable('table-4', 830, 700),
];

const KITCHEN_X = 1180;
const DJ = { x: 250, y: 185 };
const GIFT_TABLE = { x: 300, y: 905 };
/** Dancers stand on the floor in front of the DJ. */
const DANCE_SPOTS = [
  { x: 324, y: 296 },
  { x: 402, y: 290 },
  { x: 328, y: 364 },
  { x: 406, y: 358 },
];
const SERVICE_X = 1092;

const stations: StationDef[] = [
  { id: 'entrance', kind: 'entrance', name: 'Entrance', pos: { x: 120, y: 950 }, interactPos: { x: 180, y: 930 }, hitRadius: 0 },
  // Gifts are dropped off by the entrance, the way guests come in.
  { id: 'gift-table', kind: 'giftTable', name: 'Gift Table', pos: { x: GIFT_TABLE.x, y: GIFT_TABLE.y }, interactPos: { x: GIFT_TABLE.x + 20, y: GIFT_TABLE.y - 58 }, hitRadius: 80 },
  { id: 'dj-booth', kind: 'djBooth', name: 'DJ Booth', pos: { x: DJ.x, y: DJ.y }, interactPos: { x: DJ.x, y: DJ.y + 72 }, hitRadius: 72 },
  { id: 'couple-table', kind: 'coupleTable', name: 'Sweetheart Table', pos: { x: 675, y: 200 }, interactPos: { x: 675, y: 290 }, hitRadius: 100 },
  {
    id: 'cake-table',
    kind: 'cakeTable',
    name: 'Cake Table',
    pos: { x: 905, y: 200 },
    interactPos: { x: 905, y: 285 },
    providesItemId: 'wedding-cake',
    hitRadius: 68,
  },
  {
    id: 'dessert-table',
    kind: 'dessertTable',
    name: 'Dessert Table',
    pos: { x: 1070, y: 205 },
    interactPos: { x: 1070, y: 285 },
    providesItemId: 'cake-slice',
    hitRadius: 66,
  },
  { id: 'kitchen', kind: 'kitchenPass', name: 'Kitchen', pos: { x: KITCHEN_X, y: 455 }, interactPos: { x: SERVICE_X, y: 455 }, hitRadius: 90 },
  {
    id: 'tap-champagne',
    kind: 'drinkTap',
    name: 'Champagne',
    pos: { x: KITCHEN_X, y: 660 },
    interactPos: { x: SERVICE_X, y: 660 },
    providesItemId: 'champagne',
    hitRadius: 58,
  },
  {
    id: 'tap-lemonade',
    kind: 'drinkTap',
    name: 'Pink Lemonade',
    pos: { x: KITCHEN_X, y: 765 },
    interactPos: { x: SERVICE_X, y: 765 },
    providesItemId: 'lemonade',
    hitRadius: 58,
  },
  { id: 'bin', kind: 'bin', name: 'Bin', pos: { x: KITCHEN_X, y: 880 }, interactPos: { x: SERVICE_X, y: 875 }, hitRadius: 48 },
];

const aisleX = [330, 675, 985, 1060];
const aisleY = [300, 570, 850];

export const gardenHall: VenueDef = {
  id: 'garden-hall',
  name: 'Rosewood Garden Hall',
  theme: 'garden',
  danceSpots: DANCE_SPOTS,
  size: { width: 1400, height: 1000 },
  stations,
  tables,
  waitingSlots: [
    { x: 185, y: 770 },
    { x: 185, y: 665 },
    { x: 185, y: 560 },
    { x: 185, y: 455 },
  ],
  doorPos: { x: 120, y: 990 },
  plannerStart: { x: 675, y: 570 },
  couplePos: { x: 675, y: 170 },
  passSlots: [
    { x: KITCHEN_X, y: 355 },
    { x: KITCHEN_X, y: 422 },
    { x: KITCHEN_X, y: 489 },
    { x: KITCHEN_X, y: 556 },
  ],
  obstacles: [
    ...tables.map((t) => ({ kind: 'circle' as const, center: t.pos, radius: t.radius })),
    { kind: 'rect', x: 565, y: 170, w: 220, h: 60 },
    { kind: 'circle', center: { x: 905, y: 200 }, radius: 42 },
    { kind: 'rect', x: 1015, y: 180, w: 110, h: 50 },
    { kind: 'rect', x: KITCHEN_X - 35, y: 320, w: 70, h: 270 },
    { kind: 'rect', x: KITCHEN_X - 35, y: 625, w: 70, h: 180 },
    { kind: 'rect', x: GIFT_TABLE.x - 62, y: GIFT_TABLE.y - 34, w: 124, h: 70 },
    { kind: 'rect', x: DJ.x - 80, y: DJ.y - 32, w: 160, h: 62 },
  ],
  waypoints: aisleX.flatMap((x) => aisleY.map((y) => ({ x, y }))),
  floorColor: 0xf6e6da,
  accentColor: 0xe07a95,
};

/* Same floor plan, different weddings: themes only change how the room is painted. */
export const beachDeck: VenueDef = { ...gardenHall, id: 'beach-deck', name: 'Seashell Beach Deck', theme: 'beach', floorColor: 0xf3e2c0 };
export const grandBallroom: VenueDef = { ...gardenHall, id: 'grand-ballroom', name: 'The Grand Ballroom', theme: 'ballroom', floorColor: 0xf4e6e8 };
export const lanternNight: VenueDef = { ...gardenHall, id: 'lantern-night', name: 'Lantern Night Terrace', theme: 'night', floorColor: 0xd9c3ae };
