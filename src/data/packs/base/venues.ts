import type { SeatDef, StationDef, TableDef, VenueDef } from '../../../content/types';

const SEAT_OFFSET = 92;
const SERVE_OFFSET = 150;
const TABLE_RADIUS = 62;

/** Four seats around a round table (N, E, S, W), each with a serving spot further out. */
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
    interactPos: { x: x + dx * SERVE_OFFSET, y: y + dy * SERVE_OFFSET },
  }));
  return { id, pos: { x, y }, radius: TABLE_RADIUS, seats };
}

const tables = [
  roundTable('table-1', 500, 470),
  roundTable('table-2', 870, 470),
  roundTable('table-3', 500, 780),
  roundTable('table-4', 870, 780),
];

const stations: StationDef[] = [
  { id: 'entrance', kind: 'entrance', name: 'Entrance', pos: { x: 70, y: 935 }, interactPos: { x: 150, y: 930 }, hitRadius: 0 },
  { id: 'gift-table', kind: 'giftTable', name: 'Gift Table', pos: { x: 115, y: 250 }, interactPos: { x: 200, y: 300 }, hitRadius: 80 },
  { id: 'dj-booth', kind: 'djBooth', name: 'DJ Booth', pos: { x: 330, y: 185 }, interactPos: { x: 330, y: 262 }, hitRadius: 72 },
  { id: 'couple-table', kind: 'coupleTable', name: 'Sweetheart Table', pos: { x: 700, y: 200 }, interactPos: { x: 700, y: 290 }, hitRadius: 100 },
  {
    id: 'cake-table',
    kind: 'cakeTable',
    name: 'Cake Table',
    pos: { x: 930, y: 200 },
    interactPos: { x: 930, y: 285 },
    providesItemId: 'wedding-cake',
    hitRadius: 68,
  },
  {
    id: 'dessert-table',
    kind: 'dessertTable',
    name: 'Dessert Table',
    pos: { x: 1100, y: 205 },
    interactPos: { x: 1100, y: 285 },
    providesItemId: 'cake-slice',
    hitRadius: 66,
  },
  { id: 'kitchen', kind: 'kitchenPass', name: 'Kitchen', pos: { x: 1305, y: 455 }, interactPos: { x: 1205, y: 455 }, hitRadius: 90 },
  {
    id: 'tap-champagne',
    kind: 'drinkTap',
    name: 'Champagne',
    pos: { x: 1305, y: 700 },
    interactPos: { x: 1205, y: 700 },
    providesItemId: 'champagne',
    hitRadius: 58,
  },
  {
    id: 'tap-lemonade',
    kind: 'drinkTap',
    name: 'Pink Lemonade',
    pos: { x: 1305, y: 810 },
    interactPos: { x: 1205, y: 810 },
    providesItemId: 'lemonade',
    hitRadius: 58,
  },
  { id: 'bin', kind: 'bin', name: 'Bin', pos: { x: 1310, y: 935 }, interactPos: { x: 1215, y: 930 }, hitRadius: 48 },
];

const aisleX = [250, 685, 1060, 1180];
const aisleY = [320, 625, 930];

export const gardenHall: VenueDef = {
  id: 'garden-hall',
  name: 'Rosewood Garden Hall',
  size: { width: 1400, height: 1000 },
  stations,
  tables,
  waitingSlots: [
    { x: 105, y: 800 },
    { x: 105, y: 690 },
    { x: 105, y: 580 },
    { x: 105, y: 470 },
  ],
  doorPos: { x: 60, y: 985 },
  plannerStart: { x: 685, y: 625 },
  couplePos: { x: 700, y: 170 },
  passSlots: [
    { x: 1300, y: 355 },
    { x: 1300, y: 422 },
    { x: 1300, y: 489 },
    { x: 1300, y: 556 },
  ],
  obstacles: [
    ...tables.map((t) => ({ kind: 'circle' as const, center: t.pos, radius: t.radius })),
    { kind: 'rect', x: 590, y: 170, w: 220, h: 60 },
    { kind: 'circle', center: { x: 930, y: 200 }, radius: 42 },
    { kind: 'rect', x: 1045, y: 180, w: 110, h: 50 },
    { kind: 'rect', x: 1270, y: 320, w: 70, h: 270 },
    { kind: 'rect', x: 1270, y: 660, w: 70, h: 190 },
    { kind: 'rect', x: 55, y: 215, w: 120, h: 70 },
    { kind: 'rect', x: 275, y: 150, w: 110, h: 65 },
  ],
  waypoints: aisleX.flatMap((x) => aisleY.map((y) => ({ x, y }))),
  floorColor: 0xf6e6da,
  accentColor: 0xe07a95,
};
