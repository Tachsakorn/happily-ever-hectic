import { disc, flat, hex, INK, outline, oval, rrect, shade, toon, type Painter } from './canvas';

export type ItemIcon =
  | 'plate'
  | 'chicken'
  | 'fish'
  | 'risotto'
  | 'flute'
  | 'glass'
  | 'slice'
  | 'cake'
  | 'gift'
  | 'menu'
  | 'heart'
  | 'heart-empty'
  | 'star'
  | 'star-empty'
  | 'coin'
  | 'boba'
  | 'matcha'
  | 'sushi'
  | 'steak'
  | 'dragonfruit'
  | 'salad'
  | 'soup';

/** Item icons live in a 44×44 box and are drawn around its centre. */
export const ICON_SIZE = 44;

function plate(c: CanvasRenderingContext2D): void {
  c.fillStyle = hex(INK, 0.15);
  c.fill(oval(0, 9, 19, 8));
  flat(c, oval(0, 5, 20, 11.5), 0xffffff, 2.2);
  c.lineWidth = 1.2;
  c.strokeStyle = hex(0xd8cdd6);
  c.stroke(oval(0, 5, 14.5, 7.5));
}

export function heartPath(size = 1, cx = 0, cy = 0): Path2D {
  const p = new Path2D();
  p.moveTo(cx, cy + 14 * size);
  p.bezierCurveTo(cx - 24 * size, cy - 1 * size, cx - 13 * size, cy - 21 * size, cx, cy - 8 * size);
  p.bezierCurveTo(cx + 13 * size, cy - 21 * size, cx + 24 * size, cy - 1 * size, cx, cy + 14 * size);
  p.closePath();
  return p;
}

export function starPath(outer = 18, inner = 8.5): Path2D {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

export function paintIcon(icon: ItemIcon, color: number, accent = 0xe86f8e): Painter {
  return (c) => {
    c.save();
    c.translate(ICON_SIZE / 2, ICON_SIZE / 2);
    switch (icon) {
      case 'plate':
        plate(c);
        toon(c, oval(0, 2, 10, 6), color, { x: -10, y: -4, w: 20, h: 12 }, { line: 1.8 });
        break;
      case 'chicken': {
        plate(c);
        const meat = new Path2D();
        meat.moveTo(-13, 4);
        meat.bezierCurveTo(-16, -8, -2, -10, 3, -3);
        meat.bezierCurveTo(6, 1, 1, 8, -6, 8);
        meat.bezierCurveTo(-10, 8, -12, 7, -13, 4);
        meat.closePath();
        toon(c, meat, color, { x: -16, y: -10, w: 22, h: 18 }, { line: 2 });
        const bone = new Path2D();
        bone.moveTo(2, -2);
        bone.lineTo(11, -8);
        c.lineWidth = 6;
        c.strokeStyle = hex(INK);
        c.lineCap = 'round';
        c.stroke(bone);
        c.lineWidth = 3.4;
        c.strokeStyle = '#fff8ec';
        c.stroke(bone);
        flat(c, disc(12, -10, 2.8), 0xfff8ec, 1.6);
        flat(c, disc(13.5, -7, 2.6), 0xfff8ec, 1.6);
        c.fillStyle = hex(0x7fb08a);
        c.fill(oval(11, 6, 4, 2, 0.4));
        break;
      }
      case 'fish': {
        plate(c);
        const fillet = rrect(-14, -4, 24, 12, 5);
        toon(c, fillet, color, { x: -14, y: -4, w: 24, h: 12 }, { line: 2 });
        c.strokeStyle = hex(shade(color, 0.45));
        c.lineWidth = 1.4;
        for (const x of [-8, -2, 4]) {
          c.beginPath();
          c.moveTo(x, -2);
          c.quadraticCurveTo(x + 3, 2, x, 6);
          c.stroke();
        }
        const lemon = new Path2D();
        lemon.moveTo(9, 6);
        lemon.arc(9, 6, 6, Math.PI, Math.PI * 1.5);
        lemon.closePath();
        flat(c, lemon, 0xf6d860, 1.6);
        break;
      }
      case 'salad': {
        plate(c);
        // A leafy heap with tomato and egg on top.
        for (const [x, y, r, rot] of [
          [-7, 2, 7, 0.4],
          [6, 2, 7, -0.4],
          [0, -3, 7.5, 0],
          [-2, 4, 6, 0.2],
        ] as const) {
          toon(c, oval(x, y, r, r * 0.62, rot), color, { x: x - r, y: y - r, w: r * 2, h: r * 1.3 }, { line: 1.8 });
        }
        flat(c, disc(-4, -2, 2.8), 0xe0584f, 1.2);
        flat(c, disc(5, -3, 2.4), 0xe0584f, 1.2);
        flat(c, oval(1, 2, 3.2, 2.4), 0xfff7df, 1.2);
        flat(c, disc(1, 2, 1.3), 0xf2b84b, 0);
        break;
      }
      case 'soup': {
        c.fillStyle = hex(INK, 0.15);
        c.fill(oval(0, 11, 17, 5));
        const bowl = new Path2D();
        bowl.moveTo(-16, 0);
        bowl.quadraticCurveTo(-15, 14, 0, 14);
        bowl.quadraticCurveTo(15, 14, 16, 0);
        bowl.closePath();
        toon(c, bowl, 0xffffff, { x: -16, y: 0, w: 32, h: 14 }, { line: 2.2 });
        flat(c, oval(0, 0, 16, 5), color, 2.2);
        flat(c, oval(-5, -0.5, 4, 1.4), 0xfff7df, 0);
        c.fillStyle = hex(0x7fae4f);
        c.fill(disc(4, 0, 1.6));
        c.fill(disc(7, -1, 1.2));
        // Steam.
        c.strokeStyle = hex(INK, 0.35);
        c.lineWidth = 1.6;
        c.lineCap = 'round';
        for (const x of [-5, 1, 7]) {
          c.beginPath();
          c.moveTo(x, -5);
          c.quadraticCurveTo(x - 3, -9, x, -12);
          c.quadraticCurveTo(x + 3, -15, x, -18);
          c.stroke();
        }
        break;
      }
      case 'risotto': {
        plate(c);
        const mound = new Path2D();
        mound.moveTo(-13, 7);
        mound.quadraticCurveTo(-12, -8, 0, -7);
        mound.quadraticCurveTo(12, -8, 13, 7);
        mound.closePath();
        toon(c, mound, 0xf3e1ae, { x: -13, y: -8, w: 26, h: 15 }, { line: 2 });
        for (const [x, y] of [
          [-6, 1],
          [1, -2],
          [6, 3],
          [-1, 4],
          [8, -2],
        ] as const) {
          flat(c, disc(x, y, 2.2), color, 1);
        }
        break;
      }
      case 'flute': {
        const bowl = new Path2D();
        bowl.moveTo(-7, -18);
        bowl.lineTo(7, -18);
        bowl.quadraticCurveTo(7, 2, 0, 5);
        bowl.quadraticCurveTo(-7, 2, -7, -18);
        bowl.closePath();
        c.save();
        c.clip(bowl);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.fill(bowl);
        c.fillStyle = hex(color);
        c.fillRect(-8, -12, 16, 20);
        c.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [x, y, r] of [
          [-2, -6, 1.4],
          [2, -2, 1.1],
          [-1, 1, 0.9],
          [3, -9, 1],
        ] as const) {
          c.fill(disc(x, y, r));
        }
        c.restore();
        outline(c, bowl, 2);
        c.lineWidth = 2.6;
        c.strokeStyle = hex(INK);
        c.beginPath();
        c.moveTo(0, 5);
        c.lineTo(0, 15);
        c.stroke();
        flat(c, oval(0, 16, 7, 2.5), 0xffffff, 1.8);
        break;
      }
      case 'glass': {
        const cup = new Path2D();
        cup.moveTo(-10, -14);
        cup.lineTo(10, -14);
        cup.lineTo(8, 16);
        cup.lineTo(-8, 16);
        cup.closePath();
        c.save();
        c.clip(cup);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.fill(cup);
        c.fillStyle = hex(color);
        c.fillRect(-12, -8, 24, 26);
        c.fillStyle = 'rgba(255,255,255,0.45)';
        c.fillRect(-6, -8, 3, 22);
        c.restore();
        outline(c, cup, 2);
        c.lineWidth = 2.6;
        c.strokeStyle = hex(INK);
        c.beginPath();
        c.moveTo(3, -10);
        c.lineTo(9, -21);
        c.stroke();
        c.lineWidth = 1.4;
        c.strokeStyle = hex(0xe86f8e);
        c.stroke();
        const lemon = new Path2D();
        lemon.arc(-9, -14, 6, Math.PI * 0.9, Math.PI * 2.1);
        lemon.closePath();
        flat(c, lemon, 0xf6d860, 1.6);
        break;
      }
      case 'boba':
      case 'matcha': {
        // Tall cup with a domed lid and a straw; boba has pearls, matcha a cream swirl.
        const cup = new Path2D();
        cup.moveTo(-10, -10);
        cup.lineTo(10, -10);
        cup.lineTo(7, 18);
        cup.lineTo(-7, 18);
        cup.closePath();
        c.save();
        c.clip(cup);
        c.fillStyle = hex(color);
        c.fill(cup);
        if (icon === 'boba') {
          c.fillStyle = hex(0x3b2640);
          for (const [x, y] of [
            [-4, 14],
            [1, 15],
            [5, 13],
            [-2, 10],
            [3, 10],
            [-5, 9],
          ] as const) {
            c.fill(disc(x, y, 2.2));
          }
        } else {
          c.fillStyle = 'rgba(255,255,255,0.9)';
          c.fillRect(-12, -10, 24, 7);
          c.fillStyle = hex(shade(color, -0.2));
          c.fillRect(-12, 4, 24, 16);
        }
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.fillRect(-7, -8, 3, 22);
        c.restore();
        outline(c, cup, 2);
        const lid = new Path2D();
        lid.moveTo(-12, -10);
        lid.quadraticCurveTo(0, -20, 12, -10);
        lid.closePath();
        flat(c, lid, 0xffffff, 2);
        c.lineWidth = 4.6;
        c.strokeStyle = hex(INK);
        c.beginPath();
        c.moveTo(2, -14);
        c.lineTo(6, -22);
        c.stroke();
        c.lineWidth = 2.4;
        c.strokeStyle = hex(icon === 'boba' ? 0xe86f8e : 0x7fb08a);
        c.stroke();
        break;
      }
      case 'sushi': {
        plate(c);
        for (const [x, fish] of [
          [-9, 0xf08a6c],
          [9, 0xf6b6a8],
        ] as const) {
          toon(c, rrect(x - 8, -2, 16, 10, 5), 0xfffaf0, { x: x - 8, y: -2, w: 16, h: 10 }, { line: 1.8 });
          const top = rrect(x - 9, -7, 18, 8, 4);
          toon(c, top, fish, { x: x - 9, y: -7, w: 18, h: 8 }, { line: 1.8 });
          c.strokeStyle = 'rgba(255,255,255,0.8)';
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(x - 5, -5);
          c.lineTo(x - 1, -2);
          c.moveTo(x + 1, -5);
          c.lineTo(x + 5, -2);
          c.stroke();
        }
        flat(c, oval(0, 11, 4, 2.5), 0x7fb08a, 1.2);
        break;
      }
      case 'steak': {
        plate(c);
        const meat = new Path2D();
        meat.moveTo(-14, -2);
        meat.bezierCurveTo(-14, -10, 8, -12, 13, -5);
        meat.bezierCurveTo(16, 2, 6, 8, -4, 7);
        meat.bezierCurveTo(-12, 6, -14, 3, -14, -2);
        meat.closePath();
        toon(c, meat, color, { x: -14, y: -11, w: 30, h: 18 }, { line: 2 });
        c.strokeStyle = hex(shade(color, -0.45));
        c.lineWidth = 2;
        for (const x of [-7, -1, 5]) {
          c.beginPath();
          c.moveTo(x - 3, -6);
          c.lineTo(x + 3, 3);
          c.stroke();
        }
        // Little dipping bowl of jaew sauce.
        flat(c, disc(12, 9, 5), 0xfffaf0, 1.6);
        flat(c, disc(12, 9, 3), 0xc0392b, 0);
        break;
      }
      case 'dragonfruit': {
        const body = oval(0, 2, 14, 12, -0.2);
        toon(c, body, color, { x: -14, y: -10, w: 28, h: 24 }, { line: 2 });
        const cut = oval(2, 3, 9, 7.5, -0.2);
        c.fillStyle = hex(0xfffaf0);
        c.fill(cut);
        outline(c, cut, 1.6);
        c.fillStyle = hex(INK);
        for (const [x, y] of [
          [-2, 1],
          [3, -1],
          [6, 4],
          [0, 6],
          [4, 7],
          [-4, 5],
        ] as const) {
          c.fill(disc(x, y, 0.9));
        }
        // Green-tipped bracts around the skin.
        for (const a of [-2.7, -1.9, -1.1, -0.3, 2.5]) {
          const bx = Math.cos(a) * 13;
          const by = 2 + Math.sin(a) * 11;
          const nx = Math.cos(a);
          const ny = Math.sin(a);
          const bract = new Path2D();
          bract.moveTo(bx - ny * 3.5, by + nx * 3.5);
          bract.quadraticCurveTo(bx + nx * 4, by + ny * 4, bx + nx * 8 + ny * 2, by + ny * 8 - nx * 2);
          bract.lineTo(bx + ny * 3.5, by - nx * 3.5);
          bract.closePath();
          flat(c, bract, 0x9fcf7a, 1.4);
        }
        break;
      }
      case 'slice': {
        const side = new Path2D();
        side.moveTo(-16, 0);
        side.lineTo(12, -6);
        side.lineTo(12, 8);
        side.lineTo(-16, 14);
        side.closePath();
        toon(c, side, color, { x: -16, y: -6, w: 28, h: 20 }, { line: 2 });
        c.strokeStyle = hex(accent);
        c.lineWidth = 2.6;
        c.beginPath();
        c.moveTo(-15, 7);
        c.lineTo(11, 1);
        c.stroke();
        const top = new Path2D();
        top.moveTo(-16, 0);
        top.lineTo(12, -6);
        top.lineTo(16, -2);
        top.lineTo(-12, 4);
        top.closePath();
        flat(c, top, shade(color, 0.4), 1.8);
        const berry = new Path2D();
        berry.moveTo(4, -12);
        berry.quadraticCurveTo(10, -12, 8, -4);
        berry.quadraticCurveTo(4, 0, 0, -6);
        berry.quadraticCurveTo(0, -12, 4, -12);
        toon(c, berry, 0xe0474f, { x: 0, y: -12, w: 10, h: 12 }, { line: 1.6 });
        break;
      }
      case 'cake': {
        const tiers: [number, number, number][] = [
          [-19, 2, 38],
          [-14, -10, 28],
          [-9, -20, 18],
        ];
        for (const [x, y, w] of tiers) {
          toon(c, rrect(x, y, w, 13, 4), color, { x, y, w, h: 13 }, { line: 2, shadeAmount: -0.08 });
          c.fillStyle = hex(accent);
          for (let i = 0; i < w / 7; i++) c.fill(disc(x + 4 + i * 7, y + 1, 2.2));
        }
        flat(c, disc(-4, -22, 3), 0xe86f8e, 1.4);
        flat(c, disc(4, -22, 3), 0xffffff, 1.4);
        break;
      }
      case 'gift': {
        toon(c, rrect(-15, -8, 30, 23, 4), color, { x: -15, y: -8, w: 30, h: 23 }, { line: 2.2 });
        toon(c, rrect(-17, -13, 34, 8, 3), shade(color, 0.12), { x: -17, y: -13, w: 34, h: 8 }, { line: 2.2 });
        c.fillStyle = hex(accent);
        c.fillRect(-3, -12.5, 6, 27);
        outline(c, rrect(-3, -12.5, 6, 27, 0), 1.2);
        for (const s of [-1, 1]) {
          const loop = oval(s * 7, -17, 7, 4.5, s * -0.5);
          flat(c, loop, accent, 1.8);
        }
        flat(c, disc(0, -16, 3.2), shade(accent, -0.15), 1.6);
        break;
      }
      case 'menu': {
        toon(c, rrect(-12, -17, 24, 34, 4), 0xfffaf0, { x: -12, y: -17, w: 24, h: 34 }, { line: 2 });
        c.strokeStyle = hex(0xe0b048);
        c.lineWidth = 1.4;
        c.strokeRect(-8.5, -13.5, 17, 27);
        c.fillStyle = hex(INK, 0.55);
        for (let i = 0; i < 4; i++) c.fillRect(-6, -7 + i * 5, i % 2 ? 9 : 12, 2);
        flat(c, heartPath(0.25, 0, -11), accent, 0);
        break;
      }
      case 'heart':
        toon(c, heartPath(1), color, { x: -18, y: -18, w: 36, h: 32 }, { line: 2.4, shadeAmount: -0.2 });
        break;
      case 'heart-empty':
        c.fillStyle = hex(INK, 0.14);
        c.fill(heartPath(1));
        outline(c, heartPath(1), 2.2, shade(INK, 0.45));
        break;
      case 'star':
        toon(c, starPath(), color, { x: -18, y: -18, w: 36, h: 34 }, { line: 2.4, shadeAmount: -0.2 });
        break;
      case 'star-empty':
        c.fillStyle = hex(INK, 0.14);
        c.fill(starPath());
        outline(c, starPath(), 2.2, shade(INK, 0.45));
        break;
      case 'coin':
        toon(c, disc(0, 0, 16), color, { x: -16, y: -16, w: 32, h: 32 }, { line: 2.4 });
        c.lineWidth = 1.8;
        c.strokeStyle = hex(shade(color, -0.3));
        c.stroke(disc(0, 0, 10.5));
        flat(c, heartPath(0.42, 0, -1), shade(color, -0.25), 0);
        break;
    }
    c.restore();
  };
}
