import { INK, hex, isSoft, markSoft, seeded } from './canvas';

/**
 * The soft watercolour / picture-book finish. It is applied around the shared
 * painters rather than inside them: while a texture is painted, `stroke` is
 * swapped for a thinner, warmer, slightly bled line; once it is painted, a
 * paper grain and (for figures) a pooled-pigment rim are laid over it. The
 * painters themselves stay style-agnostic, so the menus keep the bold look.
 */

/** The warm plum that replaces near-black ink for outlines. */
const SOFT_INK = hex(0x5d3f5c);
/** Browsers report an opaque colour back as lowercase hex, so this is how the game's ink reads from `strokeStyle`. */
const INK_AS_REPORTED = `#${INK.toString(16).padStart(6, '0')}`;
const LINE_SCALE = 0.62;
const LINE_MIN = 1;
const LINE_ALPHA = 0.84;
/** A faint, wider copy of every ink line makes the edge look bled into the paper. */
const BLEED_WIDTH = 2.4;
const BLEED_ALPHA = 0.14;
const GRAIN_SIZE = 192;
const GRAIN_STRENGTH = 0.085;
const RIM_REACH = 1.5;
const RIM_ALPHA = 0.3;

export type Finish = 'figure' | 'scene';

/** Makes `c` stroke like a soft pencil. Safe to call once per context. */
export function useWatercolorBrush(c: CanvasRenderingContext2D): void {
  if (isSoft(c)) return;
  markSoft(c);
  const native = c.stroke.bind(c) as (path?: Path2D) => void;
  // The native call rejects an explicit `undefined`, so only pass a path when there is one.
  const stroke = (path?: Path2D): void => (path ? native(path) : native());
  const soften = (path?: Path2D): void => {
    const width = c.lineWidth;
    const style = c.strokeStyle;
    const alpha = c.globalAlpha;
    const isInk = style === INK_AS_REPORTED;
    if (isInk) {
      if (width >= 1.4) {
        c.globalAlpha = alpha * BLEED_ALPHA;
        c.lineWidth = width * BLEED_WIDTH;
        c.strokeStyle = SOFT_INK;
        stroke(path);
      }
      c.globalAlpha = alpha * LINE_ALPHA;
      c.strokeStyle = SOFT_INK;
    }
    c.lineWidth = Math.max(LINE_MIN, width * LINE_SCALE);
    stroke(path);
    c.lineWidth = width;
    c.strokeStyle = style;
    c.globalAlpha = alpha;
  };
  c.stroke = soften as typeof c.stroke;
}

let grainTile: HTMLCanvasElement | null = null;

/** A small, repeating speckle of pigment and paper fibre, made once. */
function paperGrain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = tile.height = GRAIN_SIZE;
  const t = tile.getContext('2d');
  if (!t) return tile;
  const rand = seeded(7);
  const img = t.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  for (let i = 0; i < GRAIN_SIZE * GRAIN_SIZE; i++) {
    const speck = rand();
    // Mostly faint; a few darker flecks like paper tooth.
    const a = (speck < 0.12 ? 0.55 + rand() * 0.45 : rand() * 0.3) * GRAIN_STRENGTH * 255;
    img.data[i * 4] = 110;
    img.data[i * 4 + 1] = 70;
    img.data[i * 4 + 2] = 100;
    img.data[i * 4 + 3] = a;
  }
  t.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

function copyOf(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  out.getContext('2d')?.drawImage(source, 0, 0);
  return out;
}

/** Darkens a thin band just inside the silhouette, where wet paint dries heaviest. */
function poolPigmentAtEdges(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, reach: number): void {
  const art = copyOf(canvas);
  const eroded = copyOf(canvas);
  const e = eroded.getContext('2d');
  if (!e) return;
  e.globalCompositeOperation = 'destination-in';
  const d = reach;
  const diag = reach * 0.7;
  for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [diag, diag], [-diag, diag], [diag, -diag], [-diag, -diag]] as const) {
    e.drawImage(art, dx, dy);
  }
  const rim = copyOf(art);
  const r = rim.getContext('2d');
  if (!r) return;
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(eroded, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = 'rgb(130,70,105)';
  r.fillRect(0, 0, rim.width, rim.height);
  ctx.save();
  ctx.globalAlpha = RIM_ALPHA;
  ctx.drawImage(rim, 0, 0);
  ctx.restore();
}

/** Lays the paper over a painted texture. `scale` is the texture's render scale. */
export function finishWatercolor(canvas: HTMLCanvasElement, scale: number, finish: Finish): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (finish === 'figure') {
    poolPigmentAtEdges(canvas, ctx, Math.max(1, Math.round(RIM_REACH * scale)));
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    // A wash of warm light from above, a little rose below; softens flat colour.
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, 'rgba(255,248,236,0.16)');
    g.addColorStop(1, 'rgba(150,80,120,0.07)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  const pattern = ctx.createPattern(paperGrain(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
