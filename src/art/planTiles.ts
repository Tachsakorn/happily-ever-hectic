import { disc, flat, hex, INK, oval, rrect, toon, type Painter } from './canvas';
import { leaf, LEAF, LEAF_DARK } from './flora';
import { paintIcon, type ItemIcon, ICON_SIZE } from './items';
import { paintDecorTile } from './scenery';

/**
 * Pictures for the wedding-plan choices (120×120). Decor reuses the decor
 * tiles; menus and cakes reuse the item icons, drawn big; honeymoons get
 * little postcards of their own.
 */
export const PLAN_TILE_SIZE = 120;

function big(icon: ItemIcon, color: number, accent: number | undefined, scale: number, x = 60, y = 62): Painter {
  const paint = paintIcon(icon, color, accent);
  return (c) => {
    c.save();
    c.translate(x - (ICON_SIZE * scale) / 2, y - (ICON_SIZE * scale) / 2);
    c.scale(scale, scale);
    paint(c);
    c.restore();
  };
}

function menuTile(dish: string, color: number): Painter {
  if (dish === 'trio') {
    const a = big('chicken', 0xd9a066, undefined, 1.35, 36, 50);
    const b = big('fish', 0xf08a6c, undefined, 1.35, 84, 50);
    const r = big('risotto', 0x7fae4f, undefined, 1.35, 60, 86);
    return (c) => {
      a(c);
      b(c);
      r(c);
    };
  }
  return big(dish as ItemIcon, color, undefined, 2.3);
}

function sky(c: CanvasRenderingContext2D, top: number, bottom: number): void {
  const g = c.createLinearGradient(0, 10, 0, 110);
  g.addColorStop(0, hex(top));
  g.addColorStop(1, hex(bottom));
  c.fillStyle = g;
  const card = rrect(10, 14, 100, 92, 12);
  c.fill(card);
}

/** Postcard frame drawn last, over the scene. */
function frame(c: CanvasRenderingContext2D): void {
  c.lineWidth = 3;
  c.strokeStyle = hex(INK);
  c.stroke(rrect(10, 14, 100, 92, 12));
}

function island(color: number): Painter {
  return (c) => {
    sky(c, 0xbfe9f5, 0xeafaff);
    c.save();
    c.clip(rrect(10, 14, 100, 92, 12));
    flat(c, disc(88, 34, 10), 0xf6d860, 0);
    c.fillStyle = hex(color);
    c.fillRect(10, 74, 100, 40);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(20, 82, 24, 3);
    c.fillRect(64, 92, 30, 3);
    toon(c, oval(56, 80, 34, 12), 0xf3e2c0, { x: 22, y: 68, w: 68, h: 24 }, { line: 2.2 });
    c.strokeStyle = hex(0x8a5a3a);
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(52, 76);
    c.quadraticCurveTo(50, 56, 60, 42);
    c.stroke();
    for (const [a, len] of [
      [-2.6, 24],
      [-1.9, 26],
      [-0.9, 26],
      [-0.2, 22],
    ] as const) {
      leaf(c, 60, 42, len, a, a < -1.5 ? LEAF : LEAF_DARK, 1.6);
    }
    c.restore();
    frame(c);
  };
}

function tower(color: number): Painter {
  return (c) => {
    sky(c, 0xf7d7e6, 0xfff4e6);
    c.save();
    c.clip(rrect(10, 14, 100, 92, 12));
    c.fillStyle = hex(0x9fb8d6);
    c.fillRect(10, 92, 100, 20);
    const t = new Path2D();
    t.moveTo(60, 24);
    t.lineTo(66, 54);
    t.lineTo(74, 78);
    t.lineTo(86, 96);
    t.lineTo(72, 96);
    t.quadraticCurveTo(60, 80, 48, 96);
    t.lineTo(34, 96);
    t.lineTo(46, 78);
    t.lineTo(54, 54);
    t.closePath();
    toon(c, t, color, { x: 34, y: 24, w: 52, h: 72 }, { line: 2.4 });
    c.strokeStyle = hex(INK);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(50, 60);
    c.lineTo(70, 60);
    c.moveTo(44, 80);
    c.lineTo(76, 80);
    c.stroke();
    for (const [x, y] of [
      [24, 36],
      [96, 46],
      [30, 62],
    ] as const) {
      c.fillStyle = hex(0xe86f8e);
      c.beginPath();
      c.moveTo(x, y + 4);
      c.bezierCurveTo(x - 6, y, x - 4, y - 5, x, y - 2);
      c.bezierCurveTo(x + 4, y - 5, x + 6, y, x, y + 4);
      c.fill();
    }
    c.restore();
    frame(c);
  };
}

function mountain(color: number): Painter {
  return (c) => {
    sky(c, 0xcfe6f7, 0xf2f8ff);
    c.save();
    c.clip(rrect(10, 14, 100, 92, 12));
    const back = new Path2D();
    back.moveTo(0, 90);
    back.lineTo(40, 34);
    back.lineTo(70, 70);
    back.lineTo(90, 44);
    back.lineTo(124, 90);
    back.closePath();
    toon(c, back, 0x9aa6c4, { x: 0, y: 34, w: 124, h: 56 }, { line: 2.4 });
    for (const [x, y] of [
      [40, 34],
      [90, 44],
    ] as const) {
      const cap = new Path2D();
      cap.moveTo(x, y);
      cap.lineTo(x + 9, y + 12);
      cap.lineTo(x + 3, y + 10);
      cap.lineTo(x - 2, y + 14);
      cap.lineTo(x - 9, y + 12);
      cap.closePath();
      flat(c, cap, 0xffffff, 1.6);
    }
    c.fillStyle = hex(color);
    c.fillRect(10, 88, 100, 20);
    toon(c, rrect(46, 70, 30, 22, 2), 0xb07a4a, { x: 46, y: 70, w: 30, h: 22 }, { line: 2.2 });
    const roof = new Path2D();
    roof.moveTo(42, 72);
    roof.lineTo(61, 56);
    roof.lineTo(80, 72);
    roof.closePath();
    flat(c, roof, 0x8a4a3a, 2.2);
    flat(c, rrect(56, 78, 9, 9, 1.5), 0xffe7a3, 1.6);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fill(disc(72, 50, 3));
    c.fill(disc(76, 42, 4));
    c.restore();
    frame(c);
  };
}

function city(color: number): Painter {
  return (c) => {
    sky(c, 0x33385a, 0x6b5a8e);
    c.save();
    c.clip(rrect(10, 14, 100, 92, 12));
    flat(c, disc(86, 32, 7), 0xfff3c4, 0);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [x, y] of [
      [24, 26],
      [44, 36],
      [62, 22],
    ] as const) {
      c.fill(disc(x, y, 1.4));
    }
    const blocks: [number, number, number, number][] = [
      [14, 62, 18, 50],
      [30, 44, 20, 68],
      [50, 56, 16, 56],
      [66, 36, 18, 76],
      [84, 58, 22, 54],
    ];
    blocks.forEach(([x, y, w, h], i) => {
      toon(c, rrect(x, y, w, h, 2), i % 2 ? color : 0x4a5378, { x, y, w, h }, { line: 2 });
      c.fillStyle = hex(0xffe08a);
      for (let wy = y + 6; wy < 104; wy += 9) {
        for (let wx = x + 4; wx < x + w - 3; wx += 6) if ((wx + wy + i) % 3) c.fillRect(wx, wy, 3, 4);
      }
    });
    c.restore();
    frame(c);
  };
}

export function paintPlanTile(icon: string | undefined, color: number, accent?: number): Painter {
  if (icon?.startsWith('dish:')) return menuTile(icon.slice(5), color);
  if (icon === 'cake') return big('cake', color, accent, 2.4);
  switch (icon) {
    case 'trip:island':
      return island(color);
    case 'trip:tower':
      return tower(color);
    case 'trip:mountain':
      return mountain(color);
    case 'trip:city':
      return city(color);
    default:
      return paintDecorTile(icon, color);
  }
}
