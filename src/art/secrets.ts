import type { SecretIcon } from '../content/types';
import { disc, flat, hex, INK, oval, rrect, seeded, shade, toon, type Painter } from './canvas';
import { bloom } from './flora';
import { starPath } from './items';

/** Secret event pictures live in an 88×88 box, drawn around its centre. */
export const SECRET_SIZE = 88;
const C = SECRET_SIZE / 2;

function goldenBouquet(c: CanvasRenderingContext2D, color: number): void {
  const stems = new Path2D();
  stems.moveTo(C - 8, C + 2);
  stems.lineTo(C - 2, C + 30);
  stems.lineTo(C + 4, C + 30);
  stems.lineTo(C + 10, C + 2);
  stems.closePath();
  toon(c, stems, 0x7fb08a, { x: C - 8, y: C + 2, w: 18, h: 28 }, { line: 2.4 });
  flat(c, rrect(C - 9, C + 10, 20, 8, 3), 0xfffaf0, 2);
  for (const [dx, dy, r] of [
    [-14, -4, 11],
    [12, -6, 11],
    [0, -16, 12],
    [-4, 4, 10],
    [9, 5, 9],
  ] as const) {
    bloom(c, C + dx, C + dy, r, color, 2);
  }
  c.fillStyle = hex(0xffffff, 0.7);
  c.fill(disc(C - 3, C - 20, 3));
}

function shootingStar(c: CanvasRenderingContext2D, color: number): void {
  const trail = c.createLinearGradient(C - 40, C + 26, C, C);
  trail.addColorStop(0, hex(color, 0));
  trail.addColorStop(1, hex(color, 0.9));
  c.strokeStyle = trail;
  c.lineWidth = 12;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(C - 40, C + 28);
  c.lineTo(C - 4, C + 4);
  c.stroke();
  c.save();
  c.translate(C + 6, C - 4);
  c.rotate(0.2);
  toon(c, starPath(22, 10), color, { x: -22, y: -22, w: 44, h: 42 }, { line: 3 });
  c.restore();
  c.fillStyle = hex(INK);
  c.fill(disc(C + 1, C - 4, 2.2));
  c.fill(disc(C + 11, C - 4, 2.2));
}

function bottle(c: CanvasRenderingContext2D, color: number): void {
  c.save();
  c.translate(C, C + 4);
  c.rotate(-0.5);
  const glass = new Path2D();
  glass.moveTo(-5, -34);
  glass.lineTo(5, -34);
  glass.lineTo(5, -20);
  glass.quadraticCurveTo(15, -14, 15, -2);
  glass.lineTo(15, 24);
  glass.quadraticCurveTo(15, 30, 9, 30);
  glass.lineTo(-9, 30);
  glass.quadraticCurveTo(-15, 30, -15, 24);
  glass.lineTo(-15, -2);
  glass.quadraticCurveTo(-15, -14, -5, -20);
  glass.closePath();
  c.fillStyle = hex(color, 0.75);
  c.fill(glass);
  c.lineWidth = 3;
  c.strokeStyle = hex(INK);
  c.stroke(glass);
  flat(c, rrect(-6, -40, 12, 8, 2), 0xb98452, 2.2);
  // The rolled-up letter inside, tied with a ribbon.
  flat(c, rrect(-7, -6, 14, 26, 4), 0xfff4dc, 2);
  c.strokeStyle = hex(0xe86f8e);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-7, 7);
  c.lineTo(7, 7);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fill(oval(-9, 4, 2.5, 12));
  c.restore();
}

function clover(c: CanvasRenderingContext2D, color: number): void {
  c.lineWidth = 5;
  c.strokeStyle = hex(INK);
  c.beginPath();
  c.moveTo(C, C + 4);
  c.quadraticCurveTo(C + 4, C + 20, C + 12, C + 32);
  c.stroke();
  c.lineWidth = 2.6;
  c.strokeStyle = hex(shade(color, -0.2));
  c.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    c.save();
    c.translate(C + Math.cos(a) * 12, C + Math.sin(a) * 12);
    c.rotate(a + Math.PI / 2);
    const heart = new Path2D();
    heart.moveTo(0, 12);
    heart.bezierCurveTo(-16, 2, -9, -13, 0, -5);
    heart.bezierCurveTo(9, -13, 16, 2, 0, 12);
    heart.closePath();
    toon(c, heart, color, { x: -14, y: -13, w: 28, h: 25 }, { line: 2.4 });
    c.restore();
  }
  flat(c, disc(C, C, 4), shade(color, -0.15), 1.6);
}

function cat(c: CanvasRenderingContext2D, color: number): void {
  // Body and tail.
  c.lineWidth = 9;
  c.strokeStyle = hex(INK);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(C + 18, C + 26);
  c.quadraticCurveTo(C + 36, C + 20, C + 30, C);
  c.stroke();
  c.lineWidth = 5;
  c.strokeStyle = hex(color);
  c.stroke();
  toon(c, oval(C + 2, C + 20, 20, 16), color, { x: C - 18, y: C + 4, w: 40, h: 32 }, { line: 2.8 });
  flat(c, oval(C + 2, C + 24, 9, 10), 0xfffaf0, 0);
  // Head with ears.
  const head = new Path2D();
  head.moveTo(C - 18, C - 6);
  head.lineTo(C - 16, C - 30);
  head.lineTo(C - 6, C - 20);
  head.lineTo(C + 6, C - 20);
  head.lineTo(C + 16, C - 30);
  head.lineTo(C + 18, C - 6);
  head.quadraticCurveTo(C + 16, C + 8, C, C + 8);
  head.quadraticCurveTo(C - 16, C + 8, C - 18, C - 6);
  head.closePath();
  toon(c, head, color, { x: C - 18, y: C - 30, w: 36, h: 38 }, { line: 2.8 });
  flat(c, oval(C, C + 1, 9, 6), 0xfffaf0, 0);
  for (const dx of [-7, 7]) {
    c.fillStyle = hex(0xf2d46b);
    c.fill(oval(C + dx, C - 8, 4, 4.5));
    c.fillStyle = hex(INK);
    c.fill(oval(C + dx, C - 8, 1.6, 3.6));
  }
  c.fillStyle = hex(0xf49ac1);
  c.fill(disc(C, C - 1, 2));
  // The bow tie.
  const bow = new Path2D();
  bow.moveTo(C, C + 10);
  bow.lineTo(C - 11, C + 4);
  bow.lineTo(C - 11, C + 16);
  bow.closePath();
  bow.moveTo(C, C + 10);
  bow.lineTo(C + 11, C + 4);
  bow.lineTo(C + 11, C + 16);
  bow.closePath();
  flat(c, bow, 0xe86f8e, 2.2);
  flat(c, disc(C, C + 10, 3), 0xc94f72, 1.6);
}

function discoBall(c: CanvasRenderingContext2D, color: number): void {
  c.strokeStyle = hex(INK);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(C, 2);
  c.lineTo(C, C - 26);
  c.stroke();
  const ball = disc(C, C + 2, 28);
  toon(c, ball, 0xd9dde6, { x: C - 28, y: C - 26, w: 56, h: 56 }, { line: 3 });
  c.save();
  c.clip(ball);
  const rnd = seeded(9);
  for (let y = C - 26; y < C + 30; y += 9) {
    for (let x = C - 28; x < C + 30; x += 9) {
      c.fillStyle = hex(rnd() > 0.7 ? color : rnd() > 0.5 ? 0xffffff : 0xb8bfcc);
      c.fillRect(x + 1, y + 1, 7, 7);
    }
  }
  c.restore();
  c.lineWidth = 3;
  c.strokeStyle = hex(INK);
  c.stroke(ball);
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fill(oval(C - 10, C - 10, 7, 4, -0.6));
}

export function paintSecretIcon(icon: SecretIcon, color: number): Painter {
  return (c) => {
    c.lineJoin = 'round';
    switch (icon) {
      case 'golden-bouquet':
        goldenBouquet(c, color);
        break;
      case 'shooting-star':
        shootingStar(c, color);
        break;
      case 'bottle':
        bottle(c, color);
        break;
      case 'clover':
        clover(c, color);
        break;
      case 'cat':
        cat(c, color);
        break;
      case 'disco':
        discoBall(c, color);
        break;
    }
  };
}
