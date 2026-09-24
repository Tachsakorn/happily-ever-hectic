import { danceFloorBounds, venueTheme } from '../content/venueLayout';
import type { VenueDef, VenueTheme } from '../content/types';
import { disc, flat, groundShadow, hex, INK, oval, rrect, seeded, shade, toon } from './canvas';
import { bush, flower, leaf, LEAF } from './flora';

/*
 * How each venue theme dresses the shared floor plan: the back wall, the
 * floor, the aisle runner, a few props in the free left strip, lighting and
 * the dance floor. Layout (tables, stations) never changes with the theme, so
 * a theme is purely visual and can never break gameplay.
 */

const WALL_H = 104;
/** The free strip left of the waiting area, where theme props stand. */
const PROP_X = 62;
const PROP_YS = [250, 520, 790];

interface ThemeLook {
  readonly aisle: number;
  readonly aisleAlpha: number;
  readonly petals: readonly number[];
  readonly danceTiles: readonly [number, number];
  readonly danceRim: number;
}

const LOOKS: Record<VenueTheme, ThemeLook> = {
  garden: { aisle: 0xfffaf0, aisleAlpha: 0.75, petals: [0xf7b7c6, 0xfffaf0], danceTiles: [0xf7d9e3, 0xe6d8f5], danceRim: 0xe9c9a4 },
  beach: { aisle: 0xfff4e0, aisleAlpha: 0.8, petals: [0xf49ac1, 0xf2b84b], danceTiles: [0xfbeccd, 0xbfe6ef], danceRim: 0xd6b27a },
  ballroom: { aisle: 0xc9485f, aisleAlpha: 0.95, petals: [0xfffaf0, 0xf2b84b], danceTiles: [0xfff4d6, 0xeed29a], danceRim: 0xd9a441 },
  night: { aisle: 0xf1e6ff, aisleAlpha: 0.7, petals: [0xf3d46b, 0xfffaf0], danceTiles: [0x6f63b0, 0x9784d6], danceRim: 0x3f3a6b },
};

export const themeOf = venueTheme;

export function themeLook(v: VenueDef): ThemeLook {
  return LOOKS[themeOf(v)];
}

// ---------------------------------------------------------------- floor

function planks(c: CanvasRenderingContext2D, v: VenueDef, kitchenX: number): void {
  const rnd = seeded(101);
  const plankH = 36;
  for (let y = 100, row = 0; y < v.size.height; y += plankH, row++) {
    let x = row % 2 ? -90 : -20;
    while (x < kitchenX) {
      const len = 150 + Math.floor(rnd() * 90);
      const tone = shade(v.floorColor, (rnd() - 0.5) * 0.08);
      c.fillStyle = hex(tone);
      c.fillRect(x, y, len, plankH);
      c.strokeStyle = hex(shade(tone, -0.08), 0.6);
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(x + len * (0.3 + rnd() * 0.4), y + plankH / 2, len * 0.18, plankH * 0.18, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = hex(shade(v.floorColor, -0.16), 0.55);
      c.lineWidth = 1.6;
      c.strokeRect(x, y, len, plankH);
      x += len;
    }
  }
}

function marble(c: CanvasRenderingContext2D, v: VenueDef, kitchenX: number): void {
  const size = 84;
  const rnd = seeded(33);
  for (let y = 100, r = 0; y < v.size.height; y += size, r++) {
    for (let x = 0, k = 0; x < kitchenX; x += size, k++) {
      c.fillStyle = hex((r + k) % 2 ? v.floorColor : shade(v.floorColor, -0.05));
      c.fillRect(x, y, size, size);
      // A faint vein across some tiles.
      if (rnd() > 0.55) {
        c.strokeStyle = hex(shade(v.floorColor, -0.18), 0.45);
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x + rnd() * size, y);
        c.bezierCurveTo(x + rnd() * size, y + size * 0.4, x + rnd() * size, y + size * 0.6, x + rnd() * size, y + size);
        c.stroke();
      }
    }
  }
  c.strokeStyle = hex(shade(v.floorColor, -0.14), 0.7);
  c.lineWidth = 1.5;
  for (let x = size; x < kitchenX; x += size) {
    c.beginPath();
    c.moveTo(x, 100);
    c.lineTo(x, v.size.height);
    c.stroke();
  }
  for (let y = 100 + size; y < v.size.height; y += size) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(kitchenX, y);
    c.stroke();
  }
}

/** A sandy strip along the left edge of the beach deck. */
function sandStrip(c: CanvasRenderingContext2D, v: VenueDef): void {
  const p = new Path2D();
  p.moveTo(0, WALL_H);
  p.lineTo(118, WALL_H);
  for (let y = WALL_H; y <= v.size.height - 110; y += 60) p.quadraticCurveTo(138, y + 30, 120, y + 60);
  p.lineTo(0, v.size.height - 110);
  p.closePath();
  c.fillStyle = hex(0xf1d9a8);
  c.fill(p);
  c.strokeStyle = hex(shade(0xf1d9a8, -0.2));
  c.lineWidth = 2.4;
  c.stroke(p);
  const rnd = seeded(12);
  c.fillStyle = hex(shade(0xf1d9a8, -0.12));
  for (let i = 0; i < 40; i++) c.fill(disc(8 + rnd() * 100, WALL_H + 10 + rnd() * (v.size.height - 240), 1.6));
}

export function paintThemeFloor(c: CanvasRenderingContext2D, v: VenueDef, kitchenX: number): void {
  const theme = themeOf(v);
  if (theme === 'ballroom') marble(c, v, kitchenX);
  else planks(c, v, kitchenX);
  if (theme === 'beach') sandStrip(c, v);
}

// ---------------------------------------------------------------- walls

function hedgeWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  const { width } = v.size;
  const rnd = seeded(7);
  c.fillStyle = hex(0xbfe0a8);
  c.fillRect(0, 0, width, WALL_H);
  for (let x = -30; x < width + 40; x += 58) bush(c, x, 64 + rnd() * 10, 40 + rnd() * 8, rnd, rnd() > 0.5 ? LEAF : 0x8cc38e);
  for (let x = 10; x < width; x += 46) {
    const tone = [0xfffaf0, 0xf7b7c6, 0xfffaf0, 0xf2b84b][Math.floor(rnd() * 4)]!;
    flower(c, x + rnd() * 20, 40 + rnd() * 50, 6 + rnd() * 3, tone, rnd() * 3, 1.4);
  }
  edge(c, width, 0xfffaf0);
}

/** The strip where the wall meets the floor. */
function edge(c: CanvasRenderingContext2D, width: number, color: number): void {
  c.fillStyle = hex(color);
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

function seaWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  const { width } = v.size;
  const sky = c.createLinearGradient(0, 0, 0, 50);
  sky.addColorStop(0, hex(0x9fdcf0));
  sky.addColorStop(1, hex(0xd6f1f7));
  c.fillStyle = sky;
  c.fillRect(0, 0, width, 50);
  c.fillStyle = hex(0x5fbfd6);
  c.fillRect(0, 44, width, 56);
  c.strokeStyle = hex(0xffffff, 0.8);
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  const rnd = seeded(19);
  for (let row = 0; row < 3; row++) {
    const y = 56 + row * 14;
    for (let x = (row * 37) % 90; x < width; x += 90 + rnd() * 30) {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 10, y - 6, x + 20, y);
      c.quadraticCurveTo(x + 30, y + 6, x + 40, y);
      c.stroke();
    }
  }
  // Sailboat on the horizon.
  flat(c, rrect(1040, 38, 44, 10, 4), 0xfffaf0, 2);
  const sail = new Path2D();
  sail.moveTo(1062, 36);
  sail.lineTo(1062, 6);
  sail.lineTo(1082, 34);
  sail.closePath();
  flat(c, sail, 0xf49ac1, 2);
  edge(c, width, 0xf1d9a8);
  // Rope railing posts.
  for (let x = 30; x < width; x += 120) flat(c, rrect(x - 6, 84, 12, 22, 3), 0xc9955e, 2);
  c.strokeStyle = hex(0xb9874f);
  c.lineWidth = 3;
  c.beginPath();
  for (let x = 30; x < width - 120; x += 120) {
    c.moveTo(x, 90);
    c.quadraticCurveTo(x + 60, 104, x + 120, 90);
  }
  c.stroke();
}

function curtainWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  const { width } = v.size;
  const base = 0x9c3d57;
  c.fillStyle = hex(base);
  c.fillRect(0, 0, width, WALL_H);
  for (let x = 0; x < width; x += 36) {
    const g = c.createLinearGradient(x, 0, x + 36, 0);
    g.addColorStop(0, hex(shade(base, -0.2)));
    g.addColorStop(0.5, hex(shade(base, 0.18)));
    g.addColorStop(1, hex(shade(base, -0.2)));
    c.fillStyle = g;
    c.fillRect(x, 0, 36, WALL_H);
  }
  // Gold valance with scallops.
  c.fillStyle = hex(0xe3b653);
  c.fillRect(0, 0, width, 14);
  c.beginPath();
  for (let x = 0; x < width; x += 48) {
    c.moveTo(x, 12);
    c.arc(x + 24, 12, 24, 0, Math.PI);
  }
  c.fillStyle = hex(0xb4344e);
  c.fill();
  c.strokeStyle = hex(0xe3b653);
  c.lineWidth = 3;
  c.stroke();
  // Chandeliers over the room.
  for (const x of [520, 830]) chandelier(c, x, 48);
  edge(c, width, 0xe3b653);
}

function chandelier(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.strokeStyle = hex(0xb58a2e);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, y - 10);
  c.stroke();
  flat(c, oval(x, y, 30, 9), 0xe3b653, 2.2);
  for (const dx of [-24, -8, 8, 24]) {
    flat(c, rrect(x + dx - 3, y - 20, 6, 14, 2), 0xfffaf0, 1.6);
    flat(c, oval(x + dx, y - 24, 3, 5), 0xf6c85f, 1.2);
  }
  for (const dx of [-18, 0, 18]) flat(c, oval(x + dx, y + 16, 4, 7), 0xdff3fb, 1.4);
}

function nightWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  const { width } = v.size;
  const sky = c.createLinearGradient(0, 0, 0, WALL_H);
  sky.addColorStop(0, hex(0x23264d));
  sky.addColorStop(1, hex(0x4a4a86));
  c.fillStyle = sky;
  c.fillRect(0, 0, width, WALL_H);
  const rnd = seeded(5);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = hex(0xfffaf0, 0.4 + rnd() * 0.6);
    c.fill(disc(rnd() * width, rnd() * 70, 0.8 + rnd() * 1.4));
  }
  // Crescent moon.
  c.fillStyle = hex(0xfff3c4);
  c.fill(disc(930, 38, 20));
  c.fillStyle = hex(0x2c2e59);
  c.fill(disc(940, 32, 17));
  for (let x = -30; x < width + 40; x += 62) bush(c, x, 78 + rnd() * 8, 32 + rnd() * 6, rnd, 0x3f6b62);
  edge(c, width, 0x5a4f86);
  stringLights(c, width, 22);
}

/** Warm bulbs on a sagging wire. */
function stringLights(c: CanvasRenderingContext2D, width: number, y: number): void {
  const span = 150;
  c.strokeStyle = hex(INK, 0.7);
  c.lineWidth = 1.6;
  c.beginPath();
  for (let x = 0; x < width; x += span) {
    c.moveTo(x, y);
    c.quadraticCurveTo(x + span / 2, y + 26, x + span, y);
  }
  c.stroke();
  for (let x = 0; x < width; x += span) {
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const bx = x + span * t;
      const by = y + 2 * 13 * t * (1 - t) * 2;
      glow(c, bx, by + 6, 14, 0xffd97a, 0.35);
      flat(c, oval(bx, by + 6, 4, 5.5), [0xffd97a, 0xf7b7c6, 0xbfe6ef][i % 3]!, 1.2);
    }
  }
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, alpha: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hex(color, alpha));
  g.addColorStop(1, hex(color, 0));
  c.fillStyle = g;
  c.fill(disc(x, y, r));
}

export function paintThemeWall(c: CanvasRenderingContext2D, v: VenueDef): void {
  switch (themeOf(v)) {
    case 'beach':
      seaWall(c, v);
      break;
    case 'ballroom':
      curtainWall(c, v);
      break;
    case 'night':
      nightWall(c, v);
      break;
    default:
      hedgeWall(c, v);
  }
}

// ---------------------------------------------------------------- props

function palm(c: CanvasRenderingContext2D, x: number, y: number, seed: () => number): void {
  groundShadow(c, x, y, 34, 10);
  const trunk = new Path2D();
  trunk.moveTo(x - 7, y);
  trunk.quadraticCurveTo(x - 4, y - 50, x + 10, y - 96);
  trunk.lineTo(x + 20, y - 94);
  trunk.quadraticCurveTo(x + 6, y - 50, x + 7, y);
  trunk.closePath();
  toon(c, trunk, 0xb98452, { x: x - 7, y: y - 96, w: 27, h: 96 }, { line: 2.2 });
  c.strokeStyle = hex(shade(0xb98452, -0.25));
  c.lineWidth = 1.6;
  for (let i = 1; i < 6; i++) {
    const ty = y - i * 16;
    c.beginPath();
    c.moveTo(x - 6 + i * 2, ty);
    c.lineTo(x + 8 + i * 2, ty - 2);
    c.stroke();
  }
  const top = { x: x + 15, y: y - 96 };
  for (const a of [-2.8, -2.2, -1.6, -1.0, -0.4, 0.2]) leaf(c, top.x, top.y, 46 + seed() * 10, a, seed() > 0.5 ? 0x5fae6e : 0x7fc28a, 2);
  for (const dx of [-6, 6]) flat(c, disc(top.x + dx, top.y + 6, 5.5), 0x8a5a3a, 1.6);
}

function starfish(c: CanvasRenderingContext2D, x: number, y: number, color: number): void {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 5 : 12;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else p.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.closePath();
  flat(c, p, color, 1.8);
}

function candelabra(c: CanvasRenderingContext2D, x: number, y: number): void {
  groundShadow(c, x, y, 26, 8);
  flat(c, oval(x, y - 4, 20, 7), 0xd9a441, 2.2);
  flat(c, rrect(x - 4, y - 92, 8, 88, 3), 0xe3b653, 2.2);
  const arms = new Path2D();
  arms.moveTo(x - 26, y - 92);
  arms.quadraticCurveTo(x, y - 70, x + 26, y - 92);
  c.strokeStyle = hex(INK);
  c.lineWidth = 6;
  c.stroke(arms);
  c.strokeStyle = hex(0xe3b653);
  c.lineWidth = 3.4;
  c.stroke(arms);
  for (const dx of [-26, 0, 26]) {
    glow(c, x + dx, y - 116, 22, 0xffd97a, 0.4);
    flat(c, rrect(x + dx - 4, y - 110, 8, 20, 2), 0xfffaf0, 1.8);
    flat(c, oval(x + dx, y - 116, 3.5, 6), 0xf6a93b, 1.4);
  }
}

function lanternPost(c: CanvasRenderingContext2D, x: number, y: number, color: number): void {
  glow(c, x, y - 104, 70, 0xffc86b, 0.35);
  groundShadow(c, x, y, 20, 6);
  flat(c, rrect(x - 3, y - 100, 6, 100, 2), 0x4a3d5a, 2);
  flat(c, rrect(x - 3, y - 102, 26, 5, 2), 0x4a3d5a, 1.6);
  const lantern = oval(x + 20, y - 80, 14, 17);
  flat(c, lantern, color, 2);
  c.fillStyle = hex(0xfff3c4, 0.7);
  c.fill(oval(x + 20, y - 80, 7, 10));
  c.strokeStyle = hex(INK, 0.5);
  c.lineWidth = 1.2;
  c.stroke(oval(x + 20, y - 80, 7, 17));
}

function flowerPot(c: CanvasRenderingContext2D, x: number, y: number, seed: () => number): void {
  groundShadow(c, x, y, 26, 8);
  flat(c, rrect(x - 18, y - 30, 36, 30, 6), 0xc9773e, 2.2);
  bush(c, x, y - 44, 24, seed, LEAF, [0xf7b7c6, 0xfffaf0, 0xf2b84b][Math.floor(seed() * 3)]);
}

export function paintThemeProps(c: CanvasRenderingContext2D, v: VenueDef): void {
  const rnd = seeded(77);
  const theme = themeOf(v);
  PROP_YS.forEach((y, i) => {
    if (theme === 'beach') palm(c, PROP_X - 10, y, rnd);
    else if (theme === 'ballroom') candelabra(c, PROP_X, y);
    else if (theme === 'night') lanternPost(c, PROP_X - 16, y, [0xf49ac1, 0xf2b84b, 0xb49be0][i % 3]!);
    else flowerPot(c, PROP_X, y, rnd);
  });
  if (theme === 'beach') {
    starfish(c, 40, 380, 0xf08a6c);
    starfish(c, 86, 660, 0xf2b84b);
    flat(c, oval(30, 900 - 40, 9, 6), 0xfff1e0, 1.6);
  }
}

/** Night: dim the room a little, then light it with warm pools around the lanterns. */
export function paintThemeLighting(c: CanvasRenderingContext2D, v: VenueDef, kitchenX: number): void {
  if (themeOf(v) !== 'night') return;
  c.fillStyle = hex(0x2a2c5a, 0.13);
  c.fillRect(0, WALL_H, kitchenX, v.size.height - WALL_H);
  for (const t of v.tables) glow(c, t.pos.x, t.pos.y, 150, 0xffd58a, 0.16);
  stringLights(c, kitchenX, WALL_H + 8);
}

// ---------------------------------------------------------------- dance floor

export function paintDanceFloor(c: CanvasRenderingContext2D, v: VenueDef): void {
  const r = danceFloorBounds(v);
  if (!r) return;
  const look = themeLook(v);
  const { x, y, w, h } = r;
  c.fillStyle = hex(INK, 0.18);
  c.fill(rrect(x + 3, y + 6, w, h, 14));
  const outer = rrect(x, y, w, h, 14);
  flat(c, outer, look.danceRim, 2.6);
  const pad = 8;
  const tile = 30;
  c.save();
  c.clip(rrect(x + pad, y + pad, w - pad * 2, h - pad * 2, 8));
  for (let ty = y + pad, r = 0; ty < y + h; ty += tile, r++) {
    for (let tx = x + pad, k = 0; tx < x + w; tx += tile, k++) {
      c.fillStyle = hex(look.danceTiles[(r + k) % 2]!);
      c.fillRect(tx, ty, tile, tile);
    }
  }
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fill(oval(x + w * 0.35, y + h * 0.3, w * 0.35, h * 0.16, -0.3));
  c.restore();
  c.strokeStyle = hex(INK, 0.5);
  c.lineWidth = 1.6;
  c.stroke(rrect(x + pad, y + pad, w - pad * 2, h - pad * 2, 8));
  // Little stage lights on the corners.
  for (const [cx, cy] of [
    [x + 6, y + 6],
    [x + w - 6, y + 6],
    [x + 6, y + h - 6],
    [x + w - 6, y + h - 6],
  ] as const) {
    glow(c, cx, cy, 20, 0xfff3c4, 0.5);
    flat(c, disc(cx, cy, 5), 0xfff3c4, 1.6);
  }
}
