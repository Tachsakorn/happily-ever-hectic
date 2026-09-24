import { disc, flat, hex, INK, outline, oval, rrect, type Painter } from './canvas';
import { heartPath } from './items';

/**
 * Particle sprites. Each is tiny and drawn white or in its final colour so
 * one texture can be tinted for many uses.
 */

export const FX_SIZE = 28;

export function paintFxHeart(color = 0xe86f8e): Painter {
  return (c) => flat(c, heartPath(0.62, 14, 14), color, 1.8);
}

/** Four-point twinkle. */
export function paintFxSparkle(color = 0xfff1c4): Painter {
  return (c) => {
    const p = new Path2D();
    const cx = 14;
    const cy = 14;
    p.moveTo(cx, cy - 12);
    p.quadraticCurveTo(cx + 2, cy - 2, cx + 12, cy);
    p.quadraticCurveTo(cx + 2, cy + 2, cx, cy + 12);
    p.quadraticCurveTo(cx - 2, cy + 2, cx - 12, cy);
    p.quadraticCurveTo(cx - 2, cy - 2, cx, cy - 12);
    p.closePath();
    flat(c, p, color, 1.6);
  };
}

/** Paper confetti, white so it can be tinted. */
export function paintFxConfetti(): Painter {
  return (c) => flat(c, rrect(9, 6, 10, 16, 2), 0xffffff, 1.4);
}

/** A soft dust or steam puff. */
export function paintFxPuff(color = 0xfffaf0): Painter {
  return (c) => {
    const p = new Path2D();
    p.addPath(disc(10, 16, 7));
    p.addPath(disc(17, 15, 8));
    p.addPath(disc(14, 10, 7));
    c.lineWidth = 3.2;
    c.strokeStyle = hex(INK, 0.35);
    c.stroke(p);
    c.fillStyle = hex(color);
    c.fill(p);
  };
}

/** A little musical note for the DJ and happy dancers. */
export function paintFxNote(color = 0x6a4b6e): Painter {
  return (c) => {
    c.strokeStyle = hex(color);
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(16, 20);
    c.lineTo(16, 5);
    c.quadraticCurveTo(21, 8, 23, 12);
    c.stroke();
    const head = oval(12, 20, 5, 3.8, -0.4);
    c.fillStyle = hex(color);
    c.fill(head);
    outline(c, head, 1.2);
  };
}
