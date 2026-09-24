import type { StationDef, TableDef, VenueDef } from '../content/types';
import { disc, flat, FONT_DISPLAY, groundShadow, hex, INK, outline, oval, rrect, seeded, shade, toon } from './canvas';
import { bloom, bush, flower, leaf, LEAF, LEAF_DARK, posy } from './flora';
import { paintArch } from './scenery';
import type { Painter } from './canvas';

/** Decor affects the look of every table — the preparation choice is visible in play. */
export interface DecorLook {
  readonly flower: number;
  readonly cloth: number;
}

const WOOD = 0xe9c9a4;
const CHAIR = 0xf2d27e;
const STEEL = 0xd9dde6;
const KITCHEN_TILE_A = 0xf3eefa;
const KITCHEN_TILE_B = 0xdcd3ea;

/** A small wooden sign on a peg: the venue's labels. */
function sign(c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 16, face = 0xfffaf0): void {
  c.font = `${size}px ${FONT_DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = Math.ceil(c.measureText(text).width) + 20;
  const h = size + 12;
  c.fillStyle = hex(INK, 0.2);
  c.fill(rrect(x - w / 2, y - h / 2 + 3, w, h, 8));
  const board = rrect(x - w / 2, y - h / 2, w, h, 8);
  c.fillStyle = hex(face);
  c.fill(board);
  outline(c, board, 2.2);
  c.fillStyle = hex(INK);
  c.fillText(text, x, y + 1);
}

function floor(c: CanvasRenderingContext2D, v: VenueDef, kitchenX: number): void {
  const { height } = v.size;
  const rnd = seeded(101);
  const plankH = 36;
  for (let y = 100, row = 0; y < height; y += plankH, row++) {
    let x = row % 2 ? -90 : -20;
    while (x < kitchenX) {
      const len = 150 + Math.floor(rnd() * 90);
      const tone = shade(v.floorColor, (rnd() - 0.5) * 0.08);
      c.fillStyle = hex(tone);
      c.fillRect(x, y, len, plankH);
      // Grain: a couple of faint arcs per plank.
      c.strokeStyle = hex(shade(tone, -0.08), 0.6);
      c.lineWidth = 1.2;
      c.beginPath();
      const gx = x + len * (0.3 + rnd() * 0.4);
      c.ellipse(gx, y + plankH / 2, len * 0.18, plankH * 0.18, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = hex(shade(v.floorColor, -0.16), 0.55);
      c.lineWidth = 1.6;
      c.strokeRect(x, y, len, plankH);
      x += len;
    }
  }
}

function kitchenFloor(c: CanvasRenderingContext2D, v: VenueDef, fromX: number): void {
  const size = 44;
  for (let y = 100, r = 0; y < v.size.height; y += size, r++) {
    for (let x = fromX, k = 0; x < v.size.width; x += size, k++) {
      c.fillStyle = hex((r + k) % 2 ? KITCHEN_TILE_A : KITCHEN_TILE_B);
      c.fillRect(x, y, size, size);
    }
  }
  c.strokeStyle = hex(INK, 0.9);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(fromX, 100);
  c.lineTo(fromX, v.size.height);
  c.stroke();
}

/** Hedge and flower border along the top wall, with lights strung in front of it. */
function gardenWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  const { width } = v.size;
  const rnd = seeded(7);
  c.fillStyle = hex(0xbfe0a8);
  c.fillRect(0, 0, width, 104);
  for (let x = -30; x < width + 40; x += 58) bush(c, x, 64 + rnd() * 10, 40 + rnd() * 8, rnd, rnd() > 0.5 ? LEAF : 0x8cc38e);
  for (let x = 10; x < width; x += 46) {
    const tone = [0xfffaf0, 0xf7b7c6, 0xfffaf0, 0xf2b84b][Math.floor(rnd() * 4)]!;
    flower(c, x + rnd() * 20, 40 + rnd() * 50, 6 + rnd() * 3, tone, rnd() * 3, 1.4);
  }
  // A low white picket edge where the hedge meets the floor.
  c.fillStyle = hex(0xfffaf0);
  c.fillRect(0, 96, width, 10);
  c.strokeStyle = hex(INK);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(0, 96);
  c.lineTo(width, 96);
  c.moveTo(0, 106);
  c.lineTo(width, 106);
  c.stroke();
}

function chair(c: CanvasRenderingContext2D, x: number, y: number, awayX: number, awayY: number): void {
  groundShadow(c, x + 2, y + 6, 22, 12, 0.16);
  const seat = rrect(x - 19, y - 17, 38, 34, 9);
  toon(c, seat, CHAIR, { x: x - 19, y: y - 17, w: 38, h: 34 }, { line: 2.2, shadeAmount: -0.12 });
  flat(c, rrect(x - 13, y - 11, 26, 22, 7), 0xfffaf0, 1.6);
  // Chair back on the side facing away from the table.
  const bx = x + awayX * 19;
  const by = y + awayY * 17;
  const back = awayX !== 0 ? rrect(bx - 5, y - 20, 10, 40, 4) : rrect(x - 21, by - 5, 42, 10, 4);
  toon(c, back, shade(CHAIR, -0.05), awayX !== 0 ? { x: bx - 5, y: y - 20, w: 10, h: 40 } : { x: x - 21, y: by - 5, w: 42, h: 10 }, { line: 2.2 });
}

function placeSetting(c: CanvasRenderingContext2D, x: number, y: number): void {
  flat(c, disc(x, y, 11), 0xffffff, 1.6);
  c.strokeStyle = hex(0xd9c2a7);
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(x, y, 7, 0, Math.PI * 2);
  c.stroke();
}

function paintTable(c: CanvasRenderingContext2D, t: TableDef, decor: DecorLook, seed: number): void {
  const { x, y } = t.pos;
  const r = t.radius;
  for (const seat of t.seats) {
    const dx = Math.sign(Math.round(seat.pos.x - x));
    const dy = Math.sign(Math.round(seat.pos.y - y));
    chair(c, seat.pos.x, seat.pos.y, dx, dy);
  }
  groundShadow(c, x + 4, y + 14, r + 14, r * 0.62, 0.2);
  // Cloth skirt peeking out below the top, with scallops.
  const skirt = disc(x, y + 7, r + 7);
  c.fillStyle = hex(shade(decor.cloth, -0.12));
  c.fill(skirt);
  outline(c, skirt, 2.6);
  const top = disc(x, y, r);
  toon(c, top, decor.cloth, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, { shadeAmount: -0.07 });
  c.strokeStyle = hex(shade(decor.cloth, -0.18));
  c.lineWidth = 1.6;
  c.setLineDash([4, 5]);
  c.beginPath();
  c.arc(x, y, r - 7, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  for (const seat of t.seats) {
    const a = Math.atan2(seat.pos.y - y, seat.pos.x - x);
    placeSetting(c, x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66);
  }
  const rnd = seeded(seed);
  for (const [dx, dy] of [
    [-15, 10],
    [16, 12],
  ]) {
    flat(c, rrect(x + dx! - 4, y + dy! - 12, 8, 14, 2), 0xfffaf0, 1.6);
    flat(c, oval(x + dx!, y + dy! - 16, 2.5, 4), 0xf2b84b, 1.2);
  }
  posy(c, x, y - 4, 17, decor.flower, rnd, 1.6);
}

function giftTable(c: CanvasRenderingContext2D, x: number, y: number, decor: DecorLook): void {
  groundShadow(c, x, y + 40, 72, 14, 0.2);
  const cloth = rrect(x - 64, y - 34, 128, 70, 10);
  toon(c, cloth, 0xfffaf0, { x: x - 64, y: y - 34, w: 128, h: 70 }, { shadeAmount: -0.06 });
  const skirt = rrect(x - 64, y + 20, 128, 18, 6);
  flat(c, skirt, shade(decor.flower, 0.25), 2.4);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = hex(shade(decor.flower, 0.05));
    c.fill(disc(x - 54 + i * 21.6, y + 38, 6));
  }
  // Big satin bow on the front.
  const bow = new Path2D();
  bow.ellipse(x - 13, y + 28, 12, 7, 0.5, 0, Math.PI * 2);
  bow.ellipse(x + 13, y + 28, 12, 7, -0.5, 0, Math.PI * 2);
  flat(c, bow, decor.flower, 2);
  flat(c, disc(x, y + 29, 5), shade(decor.flower, -0.2), 2);
}

function djBooth(c: CanvasRenderingContext2D, x: number, y: number): void {
  groundShadow(c, x, y + 38, 80, 12, 0.22);
  for (const dx of [-68, 68]) {
    const box = rrect(x + dx - 17, y - 32, 34, 60, 6);
    toon(c, box, 0x4a4258, { x: x + dx - 17, y: y - 32, w: 34, h: 60 });
    flat(c, disc(x + dx, y - 12, 10), 0x6a6080, 2);
    flat(c, disc(x + dx, y - 12, 4), 0x2e2838, 1.4);
    flat(c, disc(x + dx, y + 13, 7), 0x6a6080, 2);
  }
  const desk = rrect(x - 50, y - 34, 100, 64, 10);
  toon(c, desk, 0x3c3350, { x: x - 50, y: y - 34, w: 100, h: 64 });
  for (const dx of [-24, 24]) {
    flat(c, disc(x + dx, y - 8, 17), 0x221c2b, 2);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x + dx, y - 8, 11, 0, Math.PI * 2);
    c.stroke();
    flat(c, disc(x + dx, y - 8, 4), 0xe86f8e, 1.2);
  }
  // Glowing front panel.
  const panel = rrect(x - 42, y + 14, 84, 12, 4);
  flat(c, panel, 0x8fd0e8, 1.8);
  for (let i = 0; i < 6; i++) flat(c, rrect(x - 36 + i * 13, y + 17, 7, 6, 1.5), [0xe86f8e, 0xf2b84b, 0x7fb08a][i % 3]!, 0);
}

function sweetheartTable(c: CanvasRenderingContext2D, x: number, y: number, decor: DecorLook): void {
  paintArch(c, x, y - 4, 240, 176, decor.flower, 17);
  groundShadow(c, x, y + 38, 124, 14, 0.2);
  const top = rrect(x - 112, y - 24, 224, 58, 12);
  toon(c, top, 0xffffff, { x: x - 112, y: y - 24, w: 224, h: 58 }, { shadeAmount: -0.05 });
  // Swagged garland along the front edge.
  c.strokeStyle = hex(LEAF_DARK);
  c.lineWidth = 4;
  c.beginPath();
  for (let i = 0; i < 4; i++) {
    const x0 = x - 110 + i * 55;
    c.moveTo(x0, y + 22);
    c.quadraticCurveTo(x0 + 27.5, y + 40, x0 + 55, y + 22);
  }
  c.stroke();
  const rnd = seeded(29);
  for (let i = 0; i <= 4; i++) bloom(c, x - 110 + i * 55, y + 22, 7, i % 2 ? 0xfffaf0 : decor.flower, 1.6);
  for (let i = 0; i < 4; i++) leaf(c, x - 82 + i * 55, y + 30, 10, Math.PI / 2 + (rnd() - 0.5), LEAF, 1.3);
  posy(c, x, y - 2, 16, decor.flower, rnd, 1.6);
}

function cakeTable(c: CanvasRenderingContext2D, x: number, y: number, decor: DecorLook): void {
  groundShadow(c, x, y + 36, 54, 12, 0.2);
  const skirt = disc(x, y + 12, 48);
  c.fillStyle = hex(0xf3ece2);
  c.fill(skirt);
  outline(c, skirt, 2.6);
  const top = disc(x, y + 4, 44);
  toon(c, top, 0xfffaf0, { x: x - 44, y: y - 40, w: 88, h: 88 }, { shadeAmount: -0.06 });
  // Lace edge.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    c.strokeStyle = hex(0xd9c2a7);
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x + Math.cos(a) * 44, y + 4 + Math.sin(a) * 44, 4, 0, Math.PI * 2);
    c.stroke();
  }
  flower(c, x - 36, y + 34, 7, decor.flower, 0.3, 1.4);
  flower(c, x + 36, y + 34, 7, 0xfffaf0, 1.1, 1.4);
}

function dessertTable(c: CanvasRenderingContext2D, x: number, y: number, decor: DecorLook): void {
  groundShadow(c, x, y + 34, 66, 12, 0.2);
  const top = rrect(x - 60, y - 26, 120, 54, 10);
  toon(c, top, 0xfffaf0, { x: x - 60, y: y - 26, w: 120, h: 54 }, { shadeAmount: -0.06 });
  // Stripy skirt in the decor colour.
  c.save();
  const skirt = rrect(x - 60, y + 16, 120, 16, 6);
  c.clip(skirt);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = hex(i % 2 ? 0xfffaf0 : shade(decor.flower, 0.15));
    c.fillRect(x - 60 + i * 10, y + 16, 10, 16);
  }
  c.restore();
  outline(c, skirt, 2.2);
  for (const dx of [-32, 0, 32]) {
    flat(c, oval(x + dx, y + 4, 15, 6), 0xffffff, 1.6);
    flat(c, rrect(x + dx - 2, y + 4, 4, 8, 1.5), 0xd9c2a7, 1.2);
  }
}

function passCounter(c: CanvasRenderingContext2D, v: VenueDef, x: number): { top: number; bottom: number } {
  const top = Math.min(...v.passSlots.map((p) => p.y)) - 40;
  const bottom = Math.max(...v.passSlots.map((p) => p.y)) + 40;
  groundShadow(c, x + 6, (top + bottom) / 2 + 4, 44, (bottom - top) / 2 + 4, 0.2);
  const counter = rrect(x - 34, top, 68, bottom - top, 10);
  toon(c, counter, STEEL, { x: x - 34, y: top, w: 68, h: bottom - top }, { shadeAmount: -0.1 });
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x - 24, top + 10);
  c.lineTo(x - 24, bottom - 10);
  c.stroke();
  // Empty spots are dashed outlines, so an empty pass never looks like ready food.
  c.setLineDash([5, 5]);
  c.lineWidth = 2;
  c.strokeStyle = hex(INK, 0.35);
  for (const slot of v.passSlots) {
    c.beginPath();
    c.ellipse(slot.x, slot.y + 4, 24, 16, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.setLineDash([]);
  // Heat lamp bar across the top.
  flat(c, rrect(x - 40, top - 12, 80, 14, 6), 0xf2b84b, 2.2);
  for (let i = 0; i < 3; i++) flat(c, disc(x - 22 + i * 22, top - 5, 3.5), 0xfff4d6, 1.2);
  return { top, bottom };
}

function stove(c: CanvasRenderingContext2D, x: number, y: number): void {
  groundShadow(c, x, y + 44, 70, 10, 0.2);
  const body = rrect(x - 66, y - 40, 132, 84, 10);
  toon(c, body, 0x4a4258, { x: x - 66, y: y - 40, w: 132, h: 84 });
  const hob = rrect(x - 58, y - 34, 116, 50, 8);
  flat(c, hob, 0x2e2838, 2);
  for (const [dx, pot] of [
    [-30, 0xe86f8e],
    [30, 0x8fd0e8],
  ] as const) {
    flat(c, disc(x + dx, y - 9, 18), 0x6a6080, 2);
    const potPath = rrect(x + dx - 17, y - 30, 34, 26, 8);
    toon(c, potPath, pot, { x: x + dx - 17, y: y - 30, w: 34, h: 26 }, { line: 2.2 });
    flat(c, rrect(x + dx - 20, y - 33, 40, 7, 3), shade(pot, -0.15), 2);
  }
  for (let i = 0; i < 4; i++) flat(c, disc(x - 45 + i * 30, y + 30, 5), 0xf2b84b, 1.6);
}

function drinkCart(c: CanvasRenderingContext2D, x: number, y: number, tint: number): void {
  groundShadow(c, x + 4, y + 40, 44, 10, 0.2);
  const cart = rrect(x - 36, y - 30, 72, 64, 10);
  toon(c, cart, WOOD, { x: x - 36, y: y - 30, w: 72, h: 64 }, { shadeAmount: -0.12 });
  // Striped awning in the drink's colour.
  c.save();
  const awning = rrect(x - 40, y - 42, 80, 18, 6);
  c.clip(awning);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = hex(i % 2 ? 0xfffaf0 : tint);
    c.fillRect(x - 40 + i * 10, y - 42, 10, 18);
  }
  c.restore();
  outline(c, awning, 2.2);
  for (const dx of [-24, 24]) flat(c, disc(x + dx, y + 36, 6), 0x6a4b6e, 1.8);
  flat(c, oval(x, y + 2, 22, 9), 0xffffff, 1.6);
}

function bin(c: CanvasRenderingContext2D, x: number, y: number): void {
  groundShadow(c, x, y + 30, 28, 8, 0.2);
  const body = new Path2D();
  body.moveTo(x - 22, y - 20);
  body.lineTo(x + 22, y - 20);
  body.lineTo(x + 18, y + 28);
  body.lineTo(x - 18, y + 28);
  body.closePath();
  toon(c, body, 0x9fb6c9, { x: x - 22, y: y - 20, w: 44, h: 48 });
  c.strokeStyle = hex(INK, 0.35);
  c.lineWidth = 1.8;
  for (const dx of [-8, 0, 8]) {
    c.beginPath();
    c.moveTo(x + dx, y - 12);
    c.lineTo(x + dx * 0.85, y + 22);
    c.stroke();
  }
  flat(c, rrect(x - 26, y - 28, 52, 10, 5), shade(0x9fb6c9, -0.12), 2.2);
  flat(c, rrect(x - 7, y - 33, 14, 6, 3), shade(0x9fb6c9, -0.2), 1.8);
}

function entrance(c: CanvasRenderingContext2D, x: number, v: VenueDef): void {
  const y = v.size.height;
  // Doorway cut into the bottom wall, with a welcome mat and two potted topiaries.
  const mat = rrect(x - 56, y - 64, 112, 50, 10);
  toon(c, mat, 0xc98a5a, { x: x - 56, y: y - 64, w: 112, h: 50 }, { shadeAmount: -0.12 });
  c.strokeStyle = hex(0xfffaf0, 0.8);
  c.lineWidth = 2;
  c.setLineDash([6, 5]);
  c.strokeRect(x - 48, y - 56, 96, 34);
  c.setLineDash([]);
  const rnd = seeded(3);
  for (const dx of [-84, 84]) {
    flat(c, rrect(x + dx - 16, y - 40, 32, 30, 5), 0xc9773e, 2.2);
    bush(c, x + dx, y - 58, 22, rnd, LEAF);
  }
}

function waitingArea(c: CanvasRenderingContext2D, v: VenueDef): void {
  const xs = v.waitingSlots.map((p) => p.x);
  const ys = v.waitingSlots.map((p) => p.y);
  const x = Math.min(...xs) - 62;
  const y = Math.min(...ys) - 70;
  const w = Math.max(...xs) - Math.min(...xs) + 124;
  const h = Math.max(...ys) - Math.min(...ys) + 130;
  const rug = rrect(x, y, w, h, 30);
  c.fillStyle = hex(INK, 0.12);
  c.fill(rrect(x + 3, y + 5, w, h, 30));
  toon(c, rug, 0xf4c7cf, { x, y, w, h }, { shadeAmount: -0.06 });
  c.strokeStyle = hex(0xfffaf0);
  c.lineWidth = 3;
  c.setLineDash([2, 8]);
  c.stroke(rrect(x + 10, y + 10, w - 20, h - 20, 22));
  c.setLineDash([]);
  for (const p of v.waitingSlots) {
    c.fillStyle = hex(0xe8a3b3);
    c.fill(oval(p.x, p.y + 2, 34, 13));
  }
}

function paintStation(c: CanvasRenderingContext2D, s: StationDef, v: VenueDef, decor: DecorLook, itemColor: (itemId: string) => number): void {
  const { x, y } = s.pos;
  switch (s.kind) {
    case 'entrance':
      entrance(c, x, v);
      sign(c, 'Welcome', x, v.size.height - 88, 15, 0xfff1d6);
      break;
    case 'giftTable':
      giftTable(c, x, y, decor);
      sign(c, 'Gift Table', x, y + 66);
      break;
    case 'djBooth':
      djBooth(c, x, y);
      sign(c, 'DJ', x, y + 54);
      break;
    case 'coupleTable':
      sweetheartTable(c, x, y, decor);
      break;
    case 'cakeTable':
      cakeTable(c, x, y, decor);
      sign(c, 'Wedding Cake', x, y + 70);
      break;
    case 'dessertTable':
      dessertTable(c, x, y, decor);
      sign(c, 'Cake Slices', x, y + 62);
      break;
    case 'kitchenPass': {
      const { top } = passCounter(c, v, x);
      sign(c, 'Kitchen', x, top - 34, 17, 0xfff1d6);
      break;
    }
    case 'drinkTap':
      drinkCart(c, x, y, s.providesItemId ? itemColor(s.providesItemId) : decor.flower);
      sign(c, s.name, x - 104, y + 4, 14);
      break;
    case 'bin':
      bin(c, x, y);
      sign(c, 'Bin', x - 62, y, 14);
      break;
  }
}

/** Where the kitchen stove stands (steam rises from it while the chef cooks). */
export function stovePos(v: VenueDef): { x: number; y: number } | null {
  const kitchen = v.stations.find((s) => s.kind === 'kitchenPass');
  if (!kitchen || !v.passSlots.length) return null;
  const kitchenX = kitchen.pos.x + 32;
  return { x: kitchenX + (v.size.width - kitchenX) / 2 + 10, y: Math.min(...v.passSlots.map((p) => p.y)) - 150 };
}

/** The static venue: floor, rugs, furniture and signs. Dynamic things (people, food, cake) are sprites on top. */
export function paintVenue(v: VenueDef, decor: DecorLook, itemColor: (itemId: string) => number): Painter {
  return (c) => {
    const kitchen = v.stations.find((s) => s.kind === 'kitchenPass');
    const kitchenX = kitchen ? kitchen.pos.x + 32 : v.size.width;
    floor(c, v, kitchenX);
    kitchenFloor(c, v, kitchenX);
    const stoveAt = stovePos(v);
    if (stoveAt) stove(c, stoveAt.x, stoveAt.y);
    gardenWall(c, v);

    // The aisle: a white runner from the door side of the room up to the couple.
    const aisle = rrect(v.couplePos.x - 34, 250, 68, v.size.height - 250 + 20, 6);
    c.fillStyle = hex(0xfffaf0, 0.75);
    c.fill(aisle);
    c.strokeStyle = hex(INK, 0.25);
    c.lineWidth = 2;
    c.stroke(aisle);
    const rnd = seeded(61);
    for (let y = 300; y < v.size.height; y += 60) {
      flower(c, v.couplePos.x + (rnd() - 0.5) * 40, y + rnd() * 30, 4.5, rnd() > 0.5 ? 0xf7b7c6 : decor.flower, rnd() * 3, 1.1);
    }

    waitingArea(c, v);
    for (const s of v.stations) paintStation(c, s, v, decor, itemColor);
    v.tables.forEach((t, i) => paintTable(c, t, decor, 40 + i));
    if (v.waitingSlots.length) {
      const xs = v.waitingSlots.map((p) => p.x);
      const top = Math.min(...v.waitingSlots.map((p) => p.y)) - 70;
      sign(c, 'Please wait here', (Math.min(...xs) + Math.max(...xs)) / 2, top - 4, 14, 0xfff1d6);
    }
  };
}
