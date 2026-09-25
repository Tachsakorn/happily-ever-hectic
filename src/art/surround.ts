import type { VenueTheme } from '../content/types';
import { disc, hex, INK, oval, seeded, shade, type Painter } from './canvas';
import { flower } from './flora';

/**
 * What lies around the venue when the screen is wider or taller than the
 * room (phones, desktop monitors): a seamless tile per theme — lawn, sand,
 * wallpaper, night sky — so the game always fills the screen instead of
 * sitting between empty bars. Everything stays inside the tile (wrapped at
 * the edges) so it repeats without seams.
 */
export const SURROUND_TILE = 160;
const T = SURROUND_TILE;

/** Draws `paint` at (x, y) and at its wrapped copies, so shapes crossing an edge repeat cleanly. */
function wrapped(c: CanvasRenderingContext2D, x: number, y: number, r: number, paint: (x: number, y: number) => void): void {
  for (const dx of [0, -T, T]) {
    for (const dy of [0, -T, T]) {
      const px = x + dx;
      const py = y + dy;
      if (px + r < 0 || px - r > T || py + r < 0 || py - r > T) continue;
      paint(px, py);
    }
  }
}

function lawn(c: CanvasRenderingContext2D): void {
  const base = 0x9ccc7c;
  c.fillStyle = hex(base);
  c.fillRect(0, 0, T, T);
  const rnd = seeded(7);
  for (let i = 0; i < 5; i++) {
    const x = rnd() * T;
    const y = rnd() * T;
    wrapped(c, x, y, 40, (px, py) => {
      c.fillStyle = hex(shade(base, 0.06), 0.8);
      c.fill(oval(px, py, 30 + rnd() * 8, 16, rnd()));
    });
  }
  c.strokeStyle = hex(shade(base, -0.2));
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * T;
    const y = rnd() * T;
    wrapped(c, x, y, 8, (px, py) => {
      c.beginPath();
      c.moveTo(px - 3, py + 3);
      c.lineTo(px - 4, py - 3);
      c.moveTo(px, py + 3);
      c.lineTo(px + 1, py - 5);
      c.moveTo(px + 3, py + 3);
      c.lineTo(px + 5, py - 2);
      c.stroke();
    });
  }
  for (const [x, y, col] of [
    [34, 42, 0xfffaf0],
    [118, 96, 0xf7b7c6],
    [70, 136, 0xfff3c4],
  ] as const) {
    wrapped(c, x, y, 8, (px, py) => flower(c, px, py, 5, col, rnd(), 1.2));
  }
}

function sand(c: CanvasRenderingContext2D): void {
  const base = 0xf1dcb2;
  c.fillStyle = hex(base);
  c.fillRect(0, 0, T, T);
  const rnd = seeded(11);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * T;
    const y = rnd() * T;
    c.fillStyle = hex(shade(base, rnd() > 0.5 ? -0.12 : 0.1), 0.8);
    c.fill(disc(x, y, 0.8 + rnd() * 1.2));
  }
  c.strokeStyle = hex(shade(base, -0.1), 0.7);
  c.lineWidth = 2;
  for (const y of [30, 110]) {
    c.beginPath();
    for (let x = 0; x <= T; x += 10) c.lineTo(x, y + Math.sin((x / T) * Math.PI * 2) * 6);
    c.stroke();
  }
  wrapped(c, 52, 70, 10, (px, py) => {
    const shell = new Path2D();
    shell.moveTo(px - 7, py + 4);
    shell.quadraticCurveTo(px, py - 10, px + 7, py + 4);
    shell.closePath();
    c.fillStyle = hex(0xf7c9b8);
    c.fill(shell);
    c.lineWidth = 1.4;
    c.strokeStyle = hex(INK, 0.6);
    c.stroke(shell);
  });
  wrapped(c, 128, 142, 6, (px, py) => {
    c.fillStyle = hex(0xfff4e6);
    c.fill(disc(px, py, 3.5));
  });
}

function wallpaper(c: CanvasRenderingContext2D): void {
  const base = 0xe7c3cc;
  c.fillStyle = hex(base);
  c.fillRect(0, 0, T, T);
  // Soft stripes and a damask-style diamond at the centre and corners.
  c.fillStyle = hex(shade(base, 0.05));
  for (let x = 0; x < T; x += 40) c.fillRect(x, 0, 16, T);
  const motif = (px: number, py: number) => {
    const d = new Path2D();
    d.moveTo(px, py - 18);
    d.lineTo(px + 12, py);
    d.lineTo(px, py + 18);
    d.lineTo(px - 12, py);
    d.closePath();
    c.fillStyle = hex(shade(base, -0.07));
    c.fill(d);
    c.fillStyle = hex(0xf6e3a8, 0.9);
    c.fill(disc(px, py, 3));
  };
  motif(T / 2, T / 2);
  wrapped(c, 0, 0, 20, motif);
}

function nightSky(c: CanvasRenderingContext2D): void {
  const base = 0x2e3152;
  c.fillStyle = hex(base);
  c.fillRect(0, 0, T, T);
  const rnd = seeded(5);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * T;
    const y = rnd() * T;
    c.fillStyle = hex(0xfffaf0, 0.35 + rnd() * 0.6);
    c.fill(disc(x, y, 0.7 + rnd() * 1.1));
  }
  wrapped(c, 110, 50, 12, (px, py) => {
    c.fillStyle = hex(0xf6d860, 0.18);
    c.fill(disc(px, py, 11));
    c.fillStyle = hex(0xf6d860, 0.9);
    c.fill(disc(px, py, 3));
  });
  wrapped(c, 36, 124, 10, (px, py) => {
    c.fillStyle = hex(0xf49ac1, 0.16);
    c.fill(disc(px, py, 9));
    c.fillStyle = hex(0xf49ac1, 0.85);
    c.fill(disc(px, py, 2.4));
  });
}

export function paintSurroundTile(theme: VenueTheme): Painter {
  switch (theme) {
    case 'beach':
      return sand;
    case 'ballroom':
      return wallpaper;
    case 'night':
      return nightSky;
    default:
      return lawn;
  }
}
