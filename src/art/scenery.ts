import { disc, flat, hex, INK, outline, oval, rrect, seeded, shade, toon, type Painter } from './canvas';
import { bloom, bush, flower, leaf, LEAF, LEAF_DARK, posy, tree, tuft } from './flora';

/**
 * Menu scenery: the garden the whole game takes place in. Painters take the
 * target size in CSS pixels so a backdrop can be repainted on resize.
 */

const SKY_TOP = 0xffcfb8;
const SKY_LOW = 0xfff0dc;
const LAWN = 0x9fcf8a;
const BULB = 0xffe7a3;
const BUNTING = [0xe86f8e, 0xf2b84b, 0x8fd0e8, 0xfffaf0, 0x7fb08a];

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Posterised glow: flat stacked rings read as painted, a smooth gradient reads as generated. */
function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, rings = 4, alpha = 0.16): void {
  for (let i = rings; i >= 1; i--) {
    c.fillStyle = hex(color, alpha);
    c.fill(disc(x, y, (r * i) / rings));
  }
}

function cloud(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const p = new Path2D();
  p.moveTo(x - s * 1.4, y + s * 0.3);
  p.bezierCurveTo(x - s * 1.6, y - s * 0.3, x - s * 0.9, y - s * 0.5, x - s * 0.6, y - s * 0.25);
  p.bezierCurveTo(x - s * 0.5, y - s * 0.95, x + s * 0.4, y - s * 0.95, x + s * 0.45, y - s * 0.3);
  p.bezierCurveTo(x + s * 0.9, y - s * 0.55, x + s * 1.5, y - s * 0.2, x + s * 1.35, y + s * 0.3);
  p.closePath();
  c.fillStyle = hex(0xfffaf0);
  c.fill(p);
  outline(c, p, 2.4);
  c.strokeStyle = hex(0xf2d7c4);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - s * 1.1, y + s * 0.18);
  c.lineTo(x + s * 1.1, y + s * 0.18);
  c.stroke();
}

function hills(c: CanvasRenderingContext2D, w: number, base: number, amp: number, color: number, rnd: () => number, bottom: number): void {
  const p = new Path2D();
  const bumps = 3 + Math.floor(rnd() * 2);
  p.moveTo(-20, bottom);
  p.lineTo(-20, base);
  let x = -20;
  const step = (w + 40) / bumps;
  for (let i = 0; i < bumps; i++) {
    const h = amp * (0.55 + rnd() * 0.6);
    p.quadraticCurveTo(x + step / 2, base - h * 2, x + step, base - rnd() * amp * 0.2);
    x += step;
  }
  p.lineTo(w + 20, bottom);
  p.closePath();
  c.fillStyle = hex(color);
  c.fill(p);
  outline(c, p, 2.4);
}

/** A catenary of bulbs from (x1,y1) to (x2,y2), sagging by `sag`. Returns sample points for bunting. */
function stringLights(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sag: number, spacing: number): Point[] {
  const at = (t: number): Point => ({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag });
  c.strokeStyle = hex(INK);
  c.lineWidth = 2.2;
  c.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const p = at(i / n);
    if (i === 0) c.moveTo(p.x, p.y);
    else c.lineTo(p.x, p.y);
  }
  c.stroke();
  const length = Math.hypot(x2 - x1, y2 - y1);
  const count = Math.max(2, Math.round(length / spacing));
  const points: Point[] = [];
  for (let i = 1; i < count; i++) {
    const p = at(i / count);
    points.push(p);
    glow(c, p.x, p.y + 10, 22, BULB, 3, 0.18);
    flat(c, rrect(p.x - 3, p.y, 6, 5, 1.5), 0x6a4b6e, 1.6);
    const bulb = oval(p.x, p.y + 11, 5.5, 7.5);
    c.fillStyle = hex(BULB);
    c.fill(bulb);
    outline(c, bulb, 1.8);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fill(oval(p.x - 1.8, p.y + 8.5, 1.6, 2.6));
  }
  return points;
}

function bunting(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sag: number, flags: number): void {
  const at = (t: number): Point => ({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag });
  c.strokeStyle = hex(INK);
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const p = at(i / 30);
    if (i === 0) c.moveTo(p.x, p.y);
    else c.lineTo(p.x, p.y);
  }
  c.stroke();
  for (let i = 0; i < flags; i++) {
    const a = at((i + 0.15) / flags);
    const b = at((i + 0.85) / flags);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const size = Math.hypot(b.x - a.x, b.y - a.y);
    const p = new Path2D();
    p.moveTo(a.x, a.y);
    p.lineTo(b.x, b.y);
    p.lineTo(mid.x, mid.y + size * 1.05);
    p.closePath();
    flat(c, p, BUNTING[i % BUNTING.length]!, 2);
  }
}

/** A white wooden arch wrapped in flowers. (x, y) is the centre of its base. */
export function paintArch(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, flowerColor: number, seed = 7): void {
  const rnd = seeded(seed);
  const post = w * 0.07;
  const r = w / 2;
  const top = y - h + r;
  const frame = new Path2D();
  frame.moveTo(x - r - post / 2, y);
  frame.lineTo(x - r - post / 2, top);
  frame.arc(x, top, r + post / 2, Math.PI, 0);
  frame.lineTo(x + r + post / 2, y);
  frame.lineTo(x + r - post / 2, y);
  frame.lineTo(x + r - post / 2, top);
  frame.arc(x, top, r - post / 2, 0, Math.PI, true);
  frame.lineTo(x - r + post / 2, y);
  frame.closePath();
  c.fillStyle = hex(INK, 0.14);
  c.fill(oval(x - r, y + 2, post * 1.6, post * 0.4));
  c.fill(oval(x + r, y + 2, post * 1.6, post * 0.4));
  toon(c, frame, 0xfffaf0, { x: x - r - post, y: y - h, w: w + post * 2, h }, { shadeAmount: -0.08 });

  // Garland climbing both posts and over the top.
  const along = (t: number): Point => {
    // t in [0,1]: left post bottom → top of arch → right post bottom
    const postLen = y - top;
    const arcLen = Math.PI * r;
    const total = postLen * 2 + arcLen;
    const d = t * total;
    if (d < postLen) return { x: x - r, y: y - d };
    if (d < postLen + arcLen) {
      const a = Math.PI + ((d - postLen) / arcLen) * Math.PI;
      return { x: x + Math.cos(a) * r, y: top + Math.sin(a) * r };
    }
    return { x: x + r, y: top + (d - postLen - arcLen) };
  };
  const tones = [flowerColor, shade(flowerColor, 0.4), 0xfffaf0, shade(flowerColor, -0.1)];
  const n = Math.round((h + w) / 11);
  for (let i = 0; i < n; i++) {
    const t = 0.04 + (i / n) * 0.92;
    const p = along(t);
    leaf(c, p.x, p.y, post * 1.2, rnd() * Math.PI * 2, rnd() > 0.5 ? LEAF : LEAF_DARK, 1.4);
  }
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (i / n) * 0.88 + (rnd() - 0.5) * 0.02;
    const p = along(t);
    const size = post * (0.55 + rnd() * 0.35) * (Math.abs(t - 0.5) < 0.22 ? 1.25 : 1);
    const tone = tones[i % tones.length]!;
    if (i % 3 === 0) flower(c, p.x + (rnd() - 0.5) * post, p.y + (rnd() - 0.5) * post, size * 1.2, tone, rnd() * 3, 1.4);
    else bloom(c, p.x + (rnd() - 0.5) * post, p.y + (rnd() - 0.5) * post, size, tone, 1.6);
  }
  posy(c, x, top - r - post * 0.2, post * 1.6, flowerColor, rnd, 1.6);
}

export interface MenuBackdropOptions {
  /** Where the flower arch stands, as a fraction of the width; omit for none. */
  readonly archAt?: number;
  readonly flowerColor?: number;
  readonly seed?: number;
}

/** Golden-hour garden: sky, hills, string lights and bunting, a lawn with flowers. */
export function paintMenuBackdrop(w: number, h: number, opts: MenuBackdropOptions = {}): Painter {
  return (c) => {
    const rnd = seeded(opts.seed ?? 11);
    const horizon = h * 0.64;

    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, hex(SKY_TOP));
    sky.addColorStop(1, hex(SKY_LOW));
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    glow(c, w * 0.8, h * 0.34, Math.min(w, h) * 0.34, 0xfff4d6, 5, 0.22);
    flat(c, disc(w * 0.8, h * 0.34, Math.min(w, h) * 0.08), 0xfff1c4, 2.4);

    cloud(c, w * 0.16, h * 0.2, Math.min(w, h) * 0.05);
    cloud(c, w * 0.6, h * 0.12, Math.min(w, h) * 0.04);
    cloud(c, w * 0.92, h * 0.5, Math.min(w, h) * 0.035);

    hills(c, w, horizon - h * 0.02, h * 0.06, 0xc3dfae, rnd, h);
    for (let i = 0; i < 6; i++) {
      const tx = (i / 6 + rnd() * 0.08) * w;
      if (Math.abs(tx / w - (opts.archAt ?? -1)) < 0.14) continue;
      tree(c, tx, horizon + h * 0.03 - rnd() * h * 0.03, h * (0.035 + rnd() * 0.02), rnd, rnd() > 0.5 ? 0x8cc38e : 0x9ccf8f);
    }
    hills(c, w, horizon + h * 0.07, h * 0.035, 0xb1d898, rnd, h);

    // Lawn with mowing stripes and grass tufts.
    const lawnTop = horizon + h * 0.08;
    c.fillStyle = hex(LAWN);
    c.fillRect(0, lawnTop, w, h - lawnTop);
    c.save();
    c.beginPath();
    c.rect(0, lawnTop, w, h - lawnTop);
    c.clip();
    c.fillStyle = hex(shade(LAWN, -0.05));
    for (let i = -4; i < 14; i += 2) {
      c.beginPath();
      c.moveTo(w * (i / 10), h);
      c.lineTo(w * ((i + 1) / 10), h);
      c.lineTo(w * 0.5 + w * ((i + 1) / 10 - 0.5) * 0.35, lawnTop);
      c.lineTo(w * 0.5 + w * (i / 10 - 0.5) * 0.35, lawnTop);
      c.closePath();
      c.fill();
    }
    c.restore();
    for (let i = 0; i < 40; i++) tuft(c, rnd() * w, lawnTop + 12 + rnd() * (h - lawnTop), 7 + rnd() * 6, shade(LAWN, -0.3));

    if (opts.archAt !== undefined) {
      const ax = w * opts.archAt;
      const aw = Math.min(w * 0.3, h * 0.46);
      // Aisle runner leading to the arch.
      const runner = new Path2D();
      runner.moveTo(ax - aw * 0.22, h * 0.86);
      runner.lineTo(ax + aw * 0.22, h * 0.86);
      runner.lineTo(ax + aw * 0.5, h + 4);
      runner.lineTo(ax - aw * 0.5, h + 4);
      runner.closePath();
      flat(c, runner, 0xfffaf0, 2.4);
      for (let i = 0; i < 8; i++) {
        const t = rnd();
        flower(c, ax + (rnd() - 0.5) * aw * (0.4 + t * 0.5), h * 0.87 + t * h * 0.12, 4 + t * 4, 0xf7b7c6, rnd() * 3, 1.1);
      }
      paintArch(c, ax, h * 0.86, aw, h * 0.66, opts.flowerColor ?? 0xe86f8e, (opts.seed ?? 11) + 3);
    }

    // Flower beds in the corners frame the menu.
    bush(c, w * 0.03, h * 0.97, h * 0.1, rnd, LEAF, 0xf7b7c6);
    bush(c, w * 0.12, h * 1.0, h * 0.075, rnd, 0x8cc38e, 0xfffaf0);
    bush(c, w * 0.97, h * 0.96, h * 0.11, rnd, LEAF, 0xf2b84b);
    bush(c, w * 0.88, h * 1.0, h * 0.07, rnd, 0x8cc38e, 0xf7b7c6);

    stringLights(c, -10, h * 0.02, w + 10, h * 0.05, h * 0.09, 62);
    // Bunting would tangle with the arch's crown, so it only hangs over open sky.
    if (opts.archAt === undefined) bunting(c, -10, h * 0.08, w + 10, h * 0.06, h * 0.14, Math.round(w / 64));
  };
}

/** Catmull-Rom through points, as a smooth Path2D. */
export function smoothPath(points: readonly Point[]): Path2D {
  const p = new Path2D();
  if (!points.length) return p;
  p.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    p.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  return p;
}

function distanceToPolyline(x: number, y: number, pts: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  return best;
}

/**
 * The wedding map: a garden with a winding path that visits every level.
 * `stops` are in pixels; `reached` is how many of them are unlocked, so the
 * path behind the player is paved and the path ahead is still dotted.
 */
export function paintMapBackdrop(w: number, h: number, stops: readonly Point[], reached: number): Painter {
  return (c) => {
    const rnd = seeded(29);
    c.fillStyle = hex(0xa6d48f);
    c.fillRect(0, 0, w, h);
    // Mottled lawn patches.
    for (let i = 0; i < 26; i++) {
      c.fillStyle = hex(i % 2 ? 0x9bcb85 : 0xb2dc9b, 0.8);
      c.fill(oval(rnd() * w, rnd() * h, 40 + rnd() * 90, 20 + rnd() * 40, rnd()));
    }

    const route: Point[] = [{ x: -40, y: stops[0]?.y ?? h / 2 }, ...stops];
    const samples: Point[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i]!;
      const b = route[i + 1]!;
      for (let k = 0; k < 10; k++) samples.push({ x: a.x + ((b.x - a.x) * k) / 10, y: a.y + ((b.y - a.y) * k) / 10 });
    }
    samples.push(route[route.length - 1]!);

    // A pond and scenery that keeps clear of the path.
    const pond = { x: w * 0.5, y: h * 0.5 };
    for (let tries = 0; tries < 40 && distanceToPolyline(pond.x, pond.y, samples) < 120; tries++) {
      pond.x = w * (0.25 + rnd() * 0.5);
      pond.y = h * (0.3 + rnd() * 0.45);
    }
    const water = oval(pond.x, pond.y, 78, 40, -0.1);
    c.fillStyle = hex(0x6fa377);
    c.fill(oval(pond.x, pond.y + 5, 86, 45, -0.1));
    toon(c, water, 0x8fd0e8, { x: pond.x - 78, y: pond.y - 40, w: 156, h: 80 }, { shadeAmount: -0.1 });
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(pond.x - 40, pond.y - 8);
    c.lineTo(pond.x - 14, pond.y - 8);
    c.moveTo(pond.x + 8, pond.y + 10);
    c.lineTo(pond.x + 30, pond.y + 10);
    c.stroke();
    flat(c, oval(pond.x + 38, pond.y - 12, 12, 6), 0x7fb08a, 1.6);
    flower(c, pond.x + 40, pond.y - 14, 5, 0xf7b7c6, 0.4, 1.2);

    const road = smoothPath(route);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = hex(INK);
    c.lineWidth = 50;
    c.stroke(road);
    c.strokeStyle = hex(0xf1d9a8);
    c.lineWidth = 44;
    c.stroke(road);
    c.strokeStyle = hex(0xe5c58c);
    c.lineWidth = 16;
    c.setLineDash([2, 26]);
    c.stroke(road);
    c.setLineDash([]);

    // The stretch not yet unlocked is overgrown: a dotted trail through grass.
    const lockedFrom = Math.max(1, Math.min(stops.length, reached));
    if (lockedFrom < stops.length) {
      const ahead = smoothPath(route.slice(lockedFrom));
      c.strokeStyle = hex(0xa6d48f);
      c.lineWidth = 40;
      c.stroke(ahead);
      c.strokeStyle = hex(0xfffaf0, 0.9);
      c.lineWidth = 7;
      c.setLineDash([1, 18]);
      c.stroke(ahead);
      c.setLineDash([]);
    }

    const placed: Point[] = [pond];
    const clear = (x: number, y: number, r: number) =>
      distanceToPolyline(x, y, samples) > r + 44 && placed.every((p) => Math.hypot(p.x - x, p.y - y) > r + 60) && y > 110;
    const items: { x: number; y: number; draw: () => void }[] = [];
    for (let i = 0; i < 90 && items.length < 16; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const kind = rnd();
      const r = kind < 0.4 ? 26 : 20;
      if (!clear(x, y, r)) continue;
      placed.push({ x, y });
      const seedDraw = seeded(i * 97 + 3);
      if (kind < 0.4) items.push({ x, y, draw: () => tree(c, x, y, r, seedDraw, seedDraw() > 0.5 ? 0x8cc38e : 0x79b67f) });
      else items.push({ x, y, draw: () => bush(c, x, y, r, seedDraw, 0x7fb08a, [0xf7b7c6, 0xfffaf0, 0xf2b84b][i % 3]) });
    }
    // Draw back to front so lower items overlap upper ones.
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      if (distanceToPolyline(x, y, samples) < 34) continue;
      if (i % 3 === 0) flower(c, x, y, 4 + rnd() * 2, [0xfffaf0, 0xf7b7c6, 0xf2b84b][i % 3]!, rnd() * 3, 1);
      else tuft(c, x, y, 6 + rnd() * 4, 0x6ea266);
    }
  };
}

/** A hand-tied bouquet in the decor's colour, for the decor picker. Drawn in a 120×120 box. */
export function paintBouquet(color: number, seed = 5): Painter {
  return (c) => {
    const rnd = seeded(seed);
    c.fillStyle = hex(INK, 0.14);
    c.fill(oval(60, 112, 26, 6));
    const wrap = new Path2D();
    wrap.moveTo(34, 62);
    wrap.lineTo(86, 62);
    wrap.lineTo(66, 110);
    wrap.lineTo(54, 110);
    wrap.closePath();
    toon(c, wrap, 0xfffaf0, { x: 34, y: 62, w: 52, h: 48 }, { shadeAmount: -0.1 });
    const bow = new Path2D();
    bow.ellipse(50, 84, 10, 6, 0.4, 0, Math.PI * 2);
    bow.ellipse(70, 84, 10, 6, -0.4, 0, Math.PI * 2);
    flat(c, bow, shade(color, -0.1), 2);
    flat(c, disc(60, 85, 4.5), shade(color, -0.25), 2);
    posy(c, 60, 46, 30, color, rnd, 2);
  };
}

function paintLantern(color: number): Painter {
  return (c) => {
    glow(c, 60, 62, 52, color, 4, 0.16);
    c.strokeStyle = hex(INK);
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(60, 4);
    c.lineTo(60, 22);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.arc(60, 28, 9, Math.PI, 0);
    c.stroke();
    flat(c, rrect(42, 28, 36, 10, 4), 0x6a4b6e, 2.4);
    const glass = rrect(40, 38, 40, 50, 8);
    toon(c, glass, shade(color, 0.35), { x: 40, y: 38, w: 40, h: 50 }, { shadeAmount: -0.12 });
    flat(c, oval(60, 66, 7, 11), 0xfff4d6, 1.8);
    flat(c, oval(60, 69, 3, 5), 0xf2b84b, 0);
    c.strokeStyle = hex(INK);
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(52, 38);
    c.lineTo(52, 88);
    c.moveTo(68, 38);
    c.lineTo(68, 88);
    c.stroke();
    flat(c, rrect(38, 86, 44, 10, 4), 0x6a4b6e, 2.4);
    const rnd = seeded(3);
    leaf(c, 36, 102, 16, Math.PI * 0.9, LEAF, 1.6);
    leaf(c, 84, 102, 16, 0.1, LEAF_DARK, 1.6);
    flower(c, 44, 104, 7, 0xf7b7c6, rnd(), 1.4);
    flower(c, 76, 104, 7, 0xfffaf0, rnd(), 1.4);
  };
}

function paintCandles(color: number): Painter {
  return (c) => {
    c.fillStyle = hex(INK, 0.14);
    c.fill(oval(60, 108, 44, 7));
    const candles: [number, number, number][] = [
      [38, 50, 12],
      [60, 36, 13],
      [82, 58, 11],
    ];
    for (const [x, top, r] of candles) {
      glow(c, x, top - 10, 20, 0xffe7a3, 3, 0.2);
      toon(c, rrect(x - r, top, r * 2, 100 - top, 5), 0xfffaf0, { x: x - r, y: top, w: r * 2, h: 100 - top }, { shadeAmount: -0.08 });
      c.strokeStyle = hex(INK);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x, top - 5);
      c.stroke();
      const flame = new Path2D();
      flame.moveTo(x, top - 22);
      flame.quadraticCurveTo(x + 7, top - 10, x, top - 5);
      flame.quadraticCurveTo(x - 7, top - 10, x, top - 22);
      flat(c, flame, 0xf2b84b, 1.8);
      flat(c, oval(x, top - 10, 2, 3.5), 0xfff4d6, 0);
    }
    for (let i = 0; i < 5; i++) bloom(c, 24 + i * 18, 100 + (i % 2) * 4, 9, i % 2 ? shade(color, -0.04) : 0xffffff, 1.8);
    leaf(c, 16, 102, 14, Math.PI, LEAF, 1.5);
    leaf(c, 104, 102, 14, 0, LEAF_DARK, 1.5);
  };
}

function paintTropical(color: number): Painter {
  return (c) => {
    const rnd = seeded(13);
    c.fillStyle = hex(INK, 0.14);
    c.fill(oval(60, 110, 30, 6));
    for (const [a, len, tone] of [
      [-2.3, 52, LEAF_DARK],
      [-0.85, 52, LEAF],
      [-1.6, 58, color],
      [-2.9, 40, LEAF],
      [-0.25, 40, LEAF_DARK],
    ] as const) {
      leaf(c, 60, 92, len, a, tone, 2);
      c.strokeStyle = hex(INK, 0.5);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(60, 92);
      c.lineTo(60 + Math.cos(a) * len * 0.85, 92 + Math.sin(a) * len * 0.85);
      c.stroke();
    }
    toon(c, rrect(42, 84, 36, 26, 8), 0xf2b84b, { x: 42, y: 84, w: 36, h: 26 }, { shadeAmount: -0.15 });
    flower(c, 44, 60, 12, 0xe86f8e, rnd(), 1.8);
    flower(c, 76, 52, 11, 0xffa35c, rnd(), 1.8);
    flower(c, 62, 40, 10, 0xfffaf0, rnd(), 1.8);
  };
}

/** Picture for a decor option. Unknown icons get the bouquet. Drawn in a 120×120 box. */
export function paintDecorTile(icon: string | undefined, color: number): Painter {
  switch (icon) {
    case 'lantern':
      return paintLantern(color);
    case 'candles':
      return paintCandles(color);
    case 'tropical':
      return paintTropical(color);
    default:
      return paintBouquet(color);
  }
}
