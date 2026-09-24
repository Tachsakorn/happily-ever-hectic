import { disc, flat, hex, INK, outline, oval, shade, toon } from './canvas';

/**
 * Plants and flowers shared by the venue, the menus and the map. Everything
 * is drawn around (x, y) so callers place them without knowing their shape.
 */

export const LEAF = 0x7fb08a;
export const LEAF_DARK = 0x4f8660;
const CENTRE = 0xf2b84b;

/** Five-petal flower with an ink outline and a contrasting centre. */
export function flower(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, turn = 0, line = 1.6): void {
  const p = new Path2D();
  for (let i = 0; i < 5; i++) {
    const a = turn + (i / 5) * Math.PI * 2;
    p.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.52, r * 0.42, a, 0, Math.PI * 2);
  }
  c.fillStyle = hex(color);
  c.fill(p);
  if (line > 0) outline(c, p, line);
  flat(c, disc(x, y, r * 0.3), color === CENTRE ? shade(color, -0.3) : CENTRE, line * 0.8);
}

/** Round rose-like bloom: a toon ball with a swirl. */
export function bloom(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, line = 1.8): void {
  toon(c, disc(x, y, r), color, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, { line });
  c.beginPath();
  c.arc(x - r * 0.05, y + r * 0.05, r * 0.45, Math.PI * 0.2, Math.PI * 1.6);
  c.strokeStyle = hex(shade(color, -0.3));
  c.lineWidth = Math.max(1, line * 0.7);
  c.stroke();
}

export function leaf(c: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, color = LEAF, line = 1.6): void {
  const p = new Path2D();
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tip = { x: x + cos * len, y: y + sin * len };
  const nx = -sin * len * 0.32;
  const ny = cos * len * 0.32;
  p.moveTo(x, y);
  p.quadraticCurveTo(x + cos * len * 0.5 + nx, y + sin * len * 0.5 + ny, tip.x, tip.y);
  p.quadraticCurveTo(x + cos * len * 0.5 - nx, y + sin * len * 0.5 - ny, x, y);
  c.fillStyle = hex(color);
  c.fill(p);
  outline(c, p, line);
}

/** A cluster of blooms and leaves — table centrepieces, arch garlands, bouquets. */
export function posy(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: number, seed: () => number, line = 1.6): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + seed() * 0.5;
    leaf(c, x + Math.cos(a) * size * 0.4, y + Math.sin(a) * size * 0.3, size * 0.75, a, i % 2 ? LEAF : LEAF_DARK, line);
  }
  const tones = [color, shade(color, 0.35), shade(color, -0.12), 0xfffaf0];
  const spots: [number, number][] = [
    [-0.42, 0.1],
    [0.42, 0.08],
    [0, -0.3],
    [-0.2, 0.36],
    [0.22, 0.36],
    [0, 0.05],
  ];
  spots.forEach(([dx, dy], i) => {
    const r = size * (0.26 + seed() * 0.06);
    const tone = tones[i % tones.length]!;
    if (i % 3 === 1) flower(c, x + dx * size, y + dy * size, r * 1.15, tone, seed() * 3, line * 0.9);
    else bloom(c, x + dx * size, y + dy * size, r, tone, line);
  });
}

/** A round bush made of overlapping toon lobes. */
export function bush(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed: () => number, color = LEAF, blossoms?: number): void {
  const lobes: [number, number, number][] = [
    [-0.55, 0.15, 0.62],
    [0.55, 0.15, 0.62],
    [0, -0.25, 0.78],
    [-0.2, 0.25, 0.7],
    [0.25, 0.25, 0.66],
  ];
  const outlinePath = new Path2D();
  for (const [dx, dy, s] of lobes) outlinePath.addPath(disc(x + dx * r, y + dy * r, s * r));
  // Outline the union by stroking every lobe first, then filling on top.
  c.lineWidth = 5.2;
  c.strokeStyle = hex(INK);
  c.stroke(outlinePath);
  c.fillStyle = hex(color);
  c.fill(outlinePath);
  c.save();
  c.clip(outlinePath);
  c.fillStyle = hex(shade(color, -0.18));
  c.fill(oval(x + r * 0.6, y + r * 0.7, r * 1.1, r * 0.7, -0.3));
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fill(oval(x - r * 0.35, y - r * 0.45, r * 0.45, r * 0.25, -0.4));
  c.restore();
  if (blossoms !== undefined) {
    for (let i = 0; i < 4; i++) flower(c, x + (seed() - 0.5) * r * 1.5, y + (seed() - 0.6) * r * 0.9, r * 0.2, blossoms, seed() * 3, 1.2);
  }
}

/** A lollipop tree with a trunk; used on the map and menu hills. */
export function tree(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed: () => number, color = 0x8cc38e): void {
  const trunk = new Path2D();
  trunk.moveTo(x - r * 0.16, y);
  trunk.lineTo(x - r * 0.1, y - r * 1.1);
  trunk.lineTo(x + r * 0.1, y - r * 1.1);
  trunk.lineTo(x + r * 0.16, y);
  trunk.closePath();
  c.fillStyle = hex(INK, 0.16);
  c.fill(oval(x, y, r * 0.8, r * 0.22));
  toon(c, trunk, 0x9b6a4a, { x: x - r * 0.16, y: y - r * 1.1, w: r * 0.32, h: r * 1.1 }, { line: 2 });
  bush(c, x, y - r * 1.5, r, seed, color);
}

/** Short ink grass strokes. */
export function tuft(c: CanvasRenderingContext2D, x: number, y: number, s: number, color = LEAF_DARK): void {
  c.strokeStyle = hex(color);
  c.lineWidth = Math.max(1.2, s * 0.18);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - s * 0.5, y);
  c.quadraticCurveTo(x - s * 0.55, y - s * 0.5, x - s * 0.8, y - s * 0.9);
  c.moveTo(x, y);
  c.quadraticCurveTo(x, y - s * 0.6, x + s * 0.1, y - s * 1.2);
  c.moveTo(x + s * 0.5, y);
  c.quadraticCurveTo(x + s * 0.6, y - s * 0.5, x + s * 0.9, y - s * 0.8);
  c.stroke();
}
