import { disc, flat, FONT_DISPLAY, hex, INK, LINE, outline, oval, rrect, shade, toon, type Painter } from './canvas';
import { heartPath } from './items';

/** Speech bubble, 64×64, tail pointing down at the speaker. */
export function paintBubble(fill = 0xffffff): Painter {
  return (c) => {
    const p = new Path2D();
    const x = 5;
    const y = 4;
    const w = 54;
    const h = 44;
    const r = 16;
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.lineTo(40, y + h);
    p.lineTo(32, 60);
    p.lineTo(26, y + h);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    c.fillStyle = hex(INK, 0.16);
    c.save();
    c.translate(0, 3);
    c.fill(p);
    c.restore();
    c.fillStyle = hex(fill);
    c.fill(p);
    outline(c, p, LINE);
  };
}

export function paintDot(color: number, radius: number, stroke?: number): Painter {
  return (c) => {
    const p = disc(radius + 2, radius + 2, radius);
    c.fillStyle = hex(color);
    c.fill(p);
    if (stroke !== undefined) outline(c, p, 3, stroke);
  };
}

/**
 * A game UI plaque: cream paper, ink outline, a stitched inner border and a
 * solid drop edge underneath — the same language as the DOM panels.
 */
export function paintPanel(w: number, h: number, fill = 0xfffaf0, alpha = 1): Painter {
  return (c) => {
    const pad = 6;
    const r = Math.min(22, h / 3);
    c.fillStyle = hex(INK, 0.22);
    c.fill(rrect(pad, pad + 5, w - pad * 2, h - pad * 2 - 4, r));
    const body = rrect(pad, pad, w - pad * 2, h - pad * 2 - 5, r);
    c.fillStyle = hex(fill, alpha);
    c.fill(body);
    outline(c, body, 3);
    c.setLineDash([5, 5]);
    c.lineWidth = 1.6;
    c.strokeStyle = hex(shade(fill, -0.22));
    c.stroke(rrect(pad + 7, pad + 7, w - pad * 2 - 14, h - pad * 2 - 19, Math.max(4, r - 6)));
    c.setLineDash([]);
  };
}

/** Disaster markers, 80×80, readable at a glance. */
export function paintDisasterIcon(icon: string, color: number): Painter {
  return (c) => {
    c.save();
    c.translate(40, 40);
    switch (icon) {
      case 'puddle': {
        const puddle = new Path2D();
        puddle.moveTo(-30, 8);
        puddle.bezierCurveTo(-34, -6, -14, -12, -4, -8);
        puddle.bezierCurveTo(8, -16, 32, -8, 30, 6);
        puddle.bezierCurveTo(34, 18, 6, 22, -6, 18);
        puddle.bezierCurveTo(-20, 22, -28, 16, -30, 8);
        puddle.closePath();
        c.fillStyle = hex(color, 0.85);
        c.fill(puddle);
        outline(c, puddle, 2.2, shade(color, -0.4));
        c.fillStyle = 'rgba(255,255,255,0.7)';
        c.fill(oval(-10, 0, 8, 3, -0.2));
        c.save();
        c.translate(16, -8);
        c.rotate(1.3);
        toon(c, rrect(-6, -11, 12, 22, 3), 0xf49ac1, { x: -6, y: -11, w: 12, h: 22 }, { line: 2 });
        c.restore();
        break;
      }
      case 'argument': {
        const cloud = new Path2D();
        for (const [x, y, r] of [
          [-14, 0, 14],
          [0, -8, 16],
          [14, 0, 14],
          [0, 8, 14],
        ] as const) {
          cloud.moveTo(x + r, y);
          cloud.arc(x, y, r, 0, Math.PI * 2);
        }
        c.lineWidth = LINE * 2;
        c.strokeStyle = hex(INK);
        c.stroke(cloud);
        c.fillStyle = hex(0x6d6478);
        c.fill(cloud);
        const bolt = new Path2D();
        bolt.moveTo(2, 4);
        bolt.lineTo(-6, 20);
        bolt.lineTo(1, 18);
        bolt.lineTo(-3, 32);
        bolt.lineTo(10, 12);
        bolt.lineTo(3, 14);
        bolt.lineTo(8, 4);
        bolt.closePath();
        flat(c, bolt, 0xf6d860, 2);
        c.font = `26px "Lilita One", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#fff';
        c.fillText('#@!', 0, -2);
        break;
      }
      case 'puppy': {
        toon(c, oval(0, 10, 18, 14), color, { x: -18, y: -4, w: 36, h: 28 }, { line: 2.4 });
        toon(c, disc(0, -12, 15), color, { x: -15, y: -27, w: 30, h: 30 }, { line: 2.4 });
        for (const s of [-1, 1]) flat(c, oval(s * 14, -14, 5.5, 11, s * 0.35), shade(color, -0.35), 2);
        flat(c, oval(0, -5, 8, 6), shade(color, 0.35), 1.8);
        c.fillStyle = hex(INK);
        c.fill(disc(-5, -14, 2.4));
        c.fill(disc(5, -14, 2.4));
        c.fill(oval(0, -8, 3, 2.2));
        flat(c, rrect(-1.5, -4, 3, 6, 1.5), 0xef8a9e, 0);
        c.lineWidth = 2.4;
        c.strokeStyle = hex(0xf2b84b);
        c.stroke(disc(0, 20, 5));
        break;
      }
      case 'music-off': {
        toon(c, disc(0, 0, 24), 0xfffaf0, { x: -24, y: -24, w: 48, h: 48 }, { line: 2.6 });
        c.fillStyle = hex(color);
        c.fill(oval(-7, 9, 7, 5.5, -0.4));
        c.fillRect(-1.5, -14, 4, 23);
        c.fillRect(-1.5, -14, 13, 5);
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.strokeStyle = hex(0xd9534f);
        c.beginPath();
        c.moveTo(-16, -16);
        c.lineTo(16, 16);
        c.stroke();
        break;
      }
      case 'rings': {
        toon(c, disc(0, 0, 25), 0xfffaf0, { x: -25, y: -25, w: 50, h: 50 }, { line: 2.6 });
        for (const [dx, tone] of [
          [-7, 0xf2b84b],
          [7, 0xe6e2de],
        ] as const) {
          c.lineWidth = 8;
          c.strokeStyle = hex(INK);
          c.beginPath();
          c.arc(dx, 3, 9, 0, Math.PI * 2);
          c.stroke();
          c.lineWidth = 4.5;
          c.strokeStyle = hex(tone);
          c.stroke();
        }
        const gem = new Path2D();
        gem.moveTo(-7, -12);
        gem.lineTo(-2, -7);
        gem.lineTo(-7, -2);
        gem.lineTo(-12, -7);
        gem.closePath();
        flat(c, gem, 0x8fd0e8, 1.8);
        c.fillStyle = hex(INK);
        c.font = `20px ${FONT_DISPLAY}`;
        c.textAlign = 'center';
        c.fillText('?', 17, -10);
        break;
      }
      case 'gifts-fallen': {
        const boxes: [number, number, number, number, number][] = [
          [-14, 8, 22, 18, -0.35],
          [12, 10, 20, 16, 0.4],
          [0, -12, 18, 16, -0.15],
        ];
        boxes.forEach(([x, y, w, h, rot], i) => {
          c.save();
          c.translate(x, y);
          c.rotate(rot);
          toon(c, rrect(-w / 2, -h / 2, w, h, 3), i === 1 ? 0xf7b7c6 : color, { x: -w / 2, y: -h / 2, w, h }, { line: 2.4 });
          c.fillStyle = hex(0xe86f8e);
          c.fillRect(-2, -h / 2, 4, h);
          c.restore();
        });
        c.strokeStyle = hex(INK);
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-24, -16);
        c.quadraticCurveTo(-20, -22, -14, -24);
        c.moveTo(22, -12);
        c.quadraticCurveTo(24, -18, 20, -24);
        c.stroke();
        break;
      }
      case 'camera': {
        const body = rrect(-24, -12, 48, 32, 7);
        toon(c, body, color, { x: -24, y: -12, w: 48, h: 32 }, { line: 2.6 });
        flat(c, rrect(-10, -19, 20, 9, 3), shade(color, -0.2), 2.2);
        flat(c, disc(0, 4, 11), 0xfffaf0, 2.4);
        flat(c, disc(0, 4, 6), 0x8fd0e8, 2);
        flat(c, disc(15, -5, 3.5), 0xf2b84b, 1.6);
        c.strokeStyle = hex(0xf2b84b);
        c.lineWidth = 3;
        c.beginPath();
        for (const a of [-2.2, -1.6, -1.0]) {
          c.moveTo(18 + Math.cos(a) * 12, -14 + Math.sin(a) * 12);
          c.lineTo(18 + Math.cos(a) * 19, -14 + Math.sin(a) * 19);
        }
        c.stroke();
        break;
      }
      default: {
        const tri = new Path2D();
        tri.moveTo(0, -26);
        tri.lineTo(26, 20);
        tri.lineTo(-26, 20);
        tri.closePath();
        toon(c, tri, 0xf6c24a, { x: -26, y: -26, w: 52, h: 46 }, { line: 2.8 });
        c.fillStyle = hex(INK);
        c.fill(rrect(-3, -12, 6, 18, 3));
        c.fill(disc(0, 12, 3.4));
      }
    }
    c.restore();
  };
}

export const UI_ICONS = ['music', 'sound', 'pause', 'back', 'lock', 'shop', 'chair', 'shoe', 'chef', 'walkie', 'violin', 'clock', 'heart', 'play', 'replay', 'map', 'close', 'check', 'warning', 'guests', 'next', 'wrench'] as const;
export type UiIcon = (typeof UI_ICONS)[number];

export function isUiIcon(name: string | undefined): name is UiIcon {
  return name !== undefined && (UI_ICONS as readonly string[]).includes(name);
}

/** Small interface icons (48×48) for DOM buttons, drawn in the same hand as the game. */
export function paintUiIcon(icon: UiIcon, color = 0xffffff): Painter {
  return (c) => {
    c.save();
    c.translate(24, 24);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const ink = hex(INK);
    switch (icon) {
      case 'music': {
        c.fillStyle = hex(color);
        c.strokeStyle = ink;
        c.lineWidth = 2.4;
        const p = new Path2D();
        p.moveTo(-6, 10);
        p.lineTo(-6, -12);
        p.lineTo(12, -16);
        p.lineTo(12, 6);
        flat(c, oval(-10, 11, 6, 4.5, -0.3), color, 2.4);
        flat(c, oval(8, 7, 6, 4.5, -0.3), color, 2.4);
        c.lineWidth = 3.4;
        c.stroke(p);
        break;
      }
      case 'sound': {
        const spk = new Path2D();
        spk.moveTo(-14, -6);
        spk.lineTo(-6, -6);
        spk.lineTo(3, -14);
        spk.lineTo(3, 14);
        spk.lineTo(-6, 6);
        spk.lineTo(-14, 6);
        spk.closePath();
        flat(c, spk, color, 2.4);
        c.strokeStyle = hex(color);
        c.lineWidth = 3;
        c.beginPath();
        c.arc(4, 0, 9, -0.8, 0.8);
        c.stroke();
        c.beginPath();
        c.arc(4, 0, 15, -0.8, 0.8);
        c.stroke();
        break;
      }
      case 'pause':
        flat(c, rrect(-11, -13, 8, 26, 3), color, 2.4);
        flat(c, rrect(3, -13, 8, 26, 3), color, 2.4);
        break;
      case 'play': {
        const tri = new Path2D();
        tri.moveTo(-8, -13);
        tri.lineTo(13, 0);
        tri.lineTo(-8, 13);
        tri.closePath();
        flat(c, tri, color, 2.4);
        break;
      }
      case 'back': {
        const arrow = new Path2D();
        arrow.moveTo(4, -13);
        arrow.lineTo(-9, 0);
        arrow.lineTo(4, 13);
        c.lineWidth = 9;
        c.strokeStyle = ink;
        c.stroke(arrow);
        c.lineWidth = 4.5;
        c.strokeStyle = hex(color);
        c.stroke(arrow);
        break;
      }
      case 'replay': {
        c.lineWidth = 8;
        c.strokeStyle = ink;
        c.beginPath();
        c.arc(0, 1, 11, -2.6, 1.9);
        c.stroke();
        c.lineWidth = 4;
        c.strokeStyle = hex(color);
        c.stroke();
        const head = new Path2D();
        head.moveTo(-15, -12);
        head.lineTo(-4, -12);
        head.lineTo(-11, -2);
        head.closePath();
        flat(c, head, color, 2);
        break;
      }
      case 'lock':
        c.lineWidth = 6;
        c.strokeStyle = ink;
        c.beginPath();
        c.arc(0, -4, 8, Math.PI, 0);
        c.stroke();
        c.lineWidth = 3;
        c.strokeStyle = hex(0xd8cdd6);
        c.stroke();
        toon(c, rrect(-12, -4, 24, 19, 4), 0xf2b84b, { x: -12, y: -4, w: 24, h: 19 }, { line: 2.4 });
        c.fillStyle = ink;
        c.fill(disc(0, 4, 2.6));
        break;
      case 'shop':
        toon(c, rrect(-13, -6, 26, 20, 4), color, { x: -13, y: -6, w: 26, h: 20 }, { line: 2.4 });
        c.lineWidth = 2.6;
        c.strokeStyle = ink;
        c.beginPath();
        c.arc(0, -6, 7, Math.PI, 0);
        c.stroke();
        flat(c, heartPath(0.3, 0, 4), 0xe86f8e, 0);
        break;
      case 'chair':
        toon(c, rrect(-11, -16, 22, 18, 6), color, { x: -11, y: -16, w: 22, h: 18 }, { line: 2.4 });
        toon(c, rrect(-13, 0, 26, 7, 3), shade(color, -0.1), { x: -13, y: 0, w: 26, h: 7 }, { line: 2.4 });
        c.lineWidth = 3;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(-10, 7);
        c.lineTo(-11, 16);
        c.moveTo(10, 7);
        c.lineTo(11, 16);
        c.stroke();
        break;
      case 'shoe': {
        const shoe = new Path2D();
        shoe.moveTo(-15, 8);
        shoe.lineTo(-13, -8);
        shoe.lineTo(-4, -8);
        shoe.quadraticCurveTo(-2, 0, 8, 1);
        shoe.quadraticCurveTo(16, 3, 15, 9);
        shoe.closePath();
        toon(c, shoe, color, { x: -15, y: -8, w: 31, h: 17 }, { line: 2.4 });
        c.strokeStyle = hex(0xffffff);
        c.lineWidth = 2;
        for (const x of [-10, -5, 0]) {
          c.beginPath();
          c.moveTo(x - 3, -12 + 8);
          c.lineTo(x + 3, -8 + 8);
          c.stroke();
        }
        c.strokeStyle = hex(0xf2b84b);
        c.lineWidth = 2.4;
        for (const y of [-12, -6, 0]) {
          c.beginPath();
          c.moveTo(-22, y + 4);
          c.lineTo(-17, y + 4);
          c.stroke();
        }
        break;
      }
      case 'chef': {
        const toque = new Path2D();
        toque.moveTo(-10, 12);
        toque.lineTo(-10, 2);
        toque.arc(-7, -3, 7, Math.PI * 0.8, Math.PI * 1.7);
        toque.arc(2, -9, 9, Math.PI * 1.1, Math.PI * 1.95);
        toque.arc(9, -2, 6, Math.PI * 1.3, Math.PI * 2.3);
        toque.lineTo(10, 12);
        toque.closePath();
        toon(c, toque, 0xffffff, { x: -14, y: -18, w: 28, h: 30 }, { line: 2.4 });
        c.lineWidth = 1.8;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(-10, 6);
        c.lineTo(10, 6);
        c.stroke();
        break;
      }
      case 'walkie':
        toon(c, rrect(-9, -9, 18, 25, 4), 0x4a4258, { x: -9, y: -9, w: 18, h: 25 }, { line: 2.4 });
        flat(c, rrect(-5, -5, 10, 8, 2), 0x8fd0e8, 1.6);
        c.lineWidth = 3;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(5, -9);
        c.lineTo(5, -19);
        c.stroke();
        c.fillStyle = hex(0xe86f8e);
        c.fill(disc(0, 9, 2.4));
        break;
      case 'violin': {
        c.save();
        c.rotate(-0.6);
        const body = new Path2D();
        body.moveTo(0, -12);
        body.bezierCurveTo(9, -12, 9, -3, 5, -1);
        body.bezierCurveTo(10, 3, 10, 14, 0, 14);
        body.bezierCurveTo(-10, 14, -10, 3, -5, -1);
        body.bezierCurveTo(-9, -3, -9, -12, 0, -12);
        body.closePath();
        toon(c, body, 0xc9773e, { x: -10, y: -12, w: 20, h: 26 }, { line: 2.4 });
        c.lineWidth = 3;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(0, -12);
        c.lineTo(0, -22);
        c.stroke();
        c.restore();
        break;
      }
      case 'clock':
        toon(c, disc(0, 0, 16), 0xfffaf0, { x: -16, y: -16, w: 32, h: 32 }, { line: 2.6 });
        c.lineWidth = 2.6;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -10);
        c.moveTo(0, 0);
        c.lineTo(7, 3);
        c.stroke();
        break;
      case 'heart':
        toon(c, heartPath(0.9, 0, 1), color, { x: -16, y: -16, w: 32, h: 30 }, { line: 2.4 });
        break;
      case 'map': {
        const m = new Path2D();
        m.moveTo(-15, -11);
        m.lineTo(-5, -15);
        m.lineTo(5, -11);
        m.lineTo(15, -15);
        m.lineTo(15, 11);
        m.lineTo(5, 15);
        m.lineTo(-5, 11);
        m.lineTo(-15, 15);
        m.closePath();
        toon(c, m, 0xfff1d6, { x: -15, y: -15, w: 30, h: 30 }, { line: 2.4 });
        c.setLineDash([3, 3]);
        c.strokeStyle = hex(0xe86f8e);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-10, 8);
        c.quadraticCurveTo(-2, -8, 9, -6);
        c.stroke();
        c.setLineDash([]);
        break;
      }
      case 'close':
      case 'check': {
        const mark = new Path2D();
        if (icon === 'close') {
          mark.moveTo(-10, -10);
          mark.lineTo(10, 10);
          mark.moveTo(10, -10);
          mark.lineTo(-10, 10);
        } else {
          mark.moveTo(-12, 1);
          mark.lineTo(-4, 10);
          mark.lineTo(13, -10);
        }
        c.lineWidth = 10;
        c.strokeStyle = ink;
        c.stroke(mark);
        c.lineWidth = 5;
        c.strokeStyle = hex(color);
        c.stroke(mark);
        break;
      }
      case 'next': {
        const arrow = new Path2D();
        arrow.moveTo(-4, -13);
        arrow.lineTo(9, 0);
        arrow.lineTo(-4, 13);
        c.lineWidth = 9;
        c.strokeStyle = ink;
        c.stroke(arrow);
        c.lineWidth = 4.5;
        c.strokeStyle = hex(color);
        c.stroke(arrow);
        break;
      }
      case 'warning': {
        const tri = new Path2D();
        tri.moveTo(0, -16);
        tri.lineTo(17, 14);
        tri.lineTo(-17, 14);
        tri.closePath();
        toon(c, tri, 0xf2b84b, { x: -17, y: -16, w: 34, h: 30 }, { line: 2.6 });
        c.lineWidth = 3.4;
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(0, -5);
        c.lineTo(0, 4);
        c.stroke();
        c.fillStyle = ink;
        c.fill(disc(0, 9.5, 2));
        break;
      }
      case 'wrench': {
        c.save();
        c.rotate(-Math.PI / 4);
        const w = new Path2D();
        w.moveTo(-4, -4);
        w.lineTo(-4, 16);
        w.arcTo(-4, 20, 0, 20, 4);
        w.arcTo(4, 20, 4, 16, 4);
        w.lineTo(4, -4);
        w.arc(0, -10, 10, Math.PI * 0.3, Math.PI * 0.7, true);
        w.closePath();
        toon(c, w, color, { x: -10, y: -20, w: 20, h: 40 }, { line: 2.4 });
        flat(c, rrect(-3.5, -22, 7, 10, 2), 0xfffaf0, 0);
        c.restore();
        break;
      }
      case 'guests':
        toon(c, disc(8, -6, 7), 0xf6d7bf, { x: 1, y: -13, w: 14, h: 14 }, { line: 2.2 });
        toon(c, rrect(-1, 3, 18, 12, 6), 0x8fd0e8, { x: -1, y: 3, w: 18, h: 12 }, { line: 2.2 });
        toon(c, disc(-6, -4, 8), 0xeac3a2, { x: -14, y: -12, w: 16, h: 16 }, { line: 2.2 });
        toon(c, rrect(-17, 5, 22, 12, 6), color, { x: -17, y: 5, w: 22, h: 12 }, { line: 2.2 });
        break;
    }
    c.restore();
  };
}
