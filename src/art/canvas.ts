/**
 * Canvas helpers shared by every painter. One outline colour and weight for
 * the whole game gives the art a single hand; two-tone shading gives it volume.
 */

export type Painter = (c: CanvasRenderingContext2D) => void;

/** The game's ink: every outline, every line of text on the canvas. */
export const INK = 0x3b2640;
export const LINE = 2.6;

export const hex = (n: number, alpha = 1): string => {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
};

/** Lighten (amount > 0) or darken (amount < 0) a colour. */
export function shade(n: number, amount: number): number {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amount > 0 ? (255 - v) * amount : v * amount))));
  return (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
}

/** Path builders return Path2D so a shape can be filled, clipped and stroked independently. */
export function rrect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.arcTo(x + w, y, x + w, y + h, rr);
  p.arcTo(x + w, y + h, x, y + h, rr);
  p.arcTo(x, y + h, x, y, rr);
  p.arcTo(x, y, x + w, y, rr);
  p.closePath();
  return p;
}

export function disc(x: number, y: number, r: number): Path2D {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
}

export function oval(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

/** Legacy current-path helper kept for painters that stroke/fill the context path directly. */
export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  const rr = Math.min(r, w / 2, h / 2);
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Fills the current path with a base colour, a darker band on the lower
 * right and a soft highlight on the upper left, then outlines it. `box` is the
 * path's bounding box (canvas cannot report it), used to place the shading.
 */
export function toon(c: CanvasRenderingContext2D, path: Path2D, color: number, box: Box, opts: { line?: number; shadeAmount?: number } = {}): void {
  c.save();
  c.fillStyle = hex(color);
  c.fill(path);
  c.clip(path);
  c.fillStyle = hex(shade(color, opts.shadeAmount ?? -0.17));
  c.beginPath();
  c.ellipse(box.x + box.w * 1.02, box.y + box.h * 0.66, box.w * 0.5, box.h * 0.8, -0.25, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.ellipse(box.x + box.w * 0.3, box.y + box.h * 0.22, box.w * 0.2, box.h * 0.13, -0.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  outline(c, path, opts.line ?? LINE);
}

export function outline(c: CanvasRenderingContext2D, path: Path2D, line = LINE, color = INK): void {
  if (line <= 0) return;
  c.lineWidth = line;
  c.strokeStyle = hex(color);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke(path);
}

/** Flat fill + outline, for small details. */
export function flat(c: CanvasRenderingContext2D, path: Path2D, color: number, line = LINE): void {
  c.fillStyle = hex(color);
  c.fill(path);
  outline(c, path, line);
}

export function groundShadow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.18): void {
  c.fillStyle = hex(INK, alpha);
  c.fill(oval(x, y, rx, ry));
}

/** Deterministic pseudo-random for painted texture details (grain, petals). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FONT_DISPLAY = '"Lilita One", "Baloo 2", system-ui, sans-serif';
export const FONT_BODY = '"Baloo 2", system-ui, sans-serif';
