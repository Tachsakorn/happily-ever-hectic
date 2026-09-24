import type { StationDef, TableDef, VenueDef } from '../../content/types';
import { hex, INK, roundRect, shade, softShadow, type Painter } from './painters';

/** Decor affects the look of every table — the preparation choice is visible in play. */
export interface DecorLook {
  readonly flower: number;
  readonly cloth: number;
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 17): void {
  c.font = `700 ${size}px -apple-system, "SF Pro Rounded", "Segoe UI", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(text).width + 18;
  roundRect(c, x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75);
  c.fillStyle = 'rgba(255,250,246,0.92)';
  c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = hex(INK, 0.25);
  c.stroke();
  c.fillStyle = hex(INK);
  c.fillText(text, x, y + 1);
}

function flowers(c: CanvasRenderingContext2D, x: number, y: number, color: number, r = 5): void {
  const pts: [number, number][] = [
    [0, 0],
    [-r * 1.6, r * 0.6],
    [r * 1.6, r * 0.6],
    [0, -r * 1.5],
    [-r, r * 1.8],
    [r, r * 1.8],
  ];
  for (const [dx, dy] of pts) {
    c.beginPath();
    c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    c.fillStyle = hex(dx === 0 && dy === 0 ? shade(color, -0.2) : color);
    c.fill();
  }
  c.fillStyle = hex(0x86b07c);
  c.beginPath();
  c.ellipse(x - r * 2.4, y + r * 1.4, r, r * 0.5, 0.5, 0, Math.PI * 2);
  c.ellipse(x + r * 2.4, y + r * 1.4, r, r * 0.5, -0.5, 0, Math.PI * 2);
  c.fill();
}

function paintTable(c: CanvasRenderingContext2D, t: TableDef, decor: DecorLook): void {
  for (const seat of t.seats) {
    softShadow(c, seat.pos.x, seat.pos.y + 6, 24, 9);
    roundRect(c, seat.pos.x - 20, seat.pos.y - 18, 40, 36, 10);
    c.fillStyle = hex(0xe8d2bf);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = hex(INK, 0.35);
    c.stroke();
  }
  softShadow(c, t.pos.x, t.pos.y + 10, t.radius + 6, t.radius * 0.45);
  c.beginPath();
  c.arc(t.pos.x, t.pos.y, t.radius + 8, 0, Math.PI * 2);
  c.fillStyle = hex(shade(decor.cloth, -0.06));
  c.fill();
  c.beginPath();
  c.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2);
  c.fillStyle = hex(decor.cloth);
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = hex(INK, 0.3);
  c.stroke();
  // Scalloped hem
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.beginPath();
    c.arc(t.pos.x + Math.cos(a) * (t.radius + 6), t.pos.y + Math.sin(a) * (t.radius + 6), 4, 0, Math.PI * 2);
    c.fillStyle = hex(shade(decor.cloth, -0.1));
    c.fill();
  }
  flowers(c, t.pos.x, t.pos.y - 6, decor.flower, 6);
}

function paintStation(c: CanvasRenderingContext2D, s: StationDef, v: VenueDef, decor: DecorLook): void {
  const { x, y } = s.pos;
  switch (s.kind) {
    case 'entrance': {
      c.fillStyle = hex(0xc9a27a);
      c.fillRect(20, 950, 90, 50);
      label(c, 'Entrance', 85, 915, 15);
      break;
    }
    case 'giftTable': {
      softShadow(c, x, y + 40, 70, 12);
      roundRect(c, x - 62, y - 36, 124, 72, 10);
      c.fillStyle = hex(0xfff4ea);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      c.fillStyle = hex(decor.flower, 0.35);
      c.fillRect(x - 62, y + 20, 124, 16);
      label(c, 'Gift Table', x, y + 58);
      break;
    }
    case 'djBooth': {
      softShadow(c, x, y + 38, 64, 10);
      roundRect(c, x - 56, y - 34, 112, 66, 10);
      c.fillStyle = hex(0x3c3350);
      c.fill();
      for (const dx of [-36, 36]) {
        c.beginPath();
        c.arc(x + dx, y - 2, 14, 0, Math.PI * 2);
        c.fillStyle = hex(0x5a4f73);
        c.fill();
        c.beginPath();
        c.arc(x + dx, y - 2, 6, 0, Math.PI * 2);
        c.fillStyle = hex(0x8f84b0);
        c.fill();
      }
      roundRect(c, x - 14, y - 16, 28, 26, 4);
      c.fillStyle = hex(0x7b6fd6);
      c.fill();
      label(c, 'DJ', x, y + 52);
      break;
    }
    case 'coupleTable': {
      // Floral arch behind the sweetheart table.
      c.beginPath();
      c.arc(x, y - 10, 120, Math.PI * 1.05, Math.PI * 1.95);
      c.lineWidth = 10;
      c.strokeStyle = hex(0xf7efe6);
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = hex(INK, 0.25);
      c.stroke();
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1.05 + (0.9 * i) / 10);
        flowers(c, x + Math.cos(a) * 120, y - 10 + Math.sin(a) * 120, i % 2 ? decor.flower : 0xffffff, 5);
      }
      softShadow(c, x, y + 36, 120, 12);
      roundRect(c, x - 110, y - 22, 220, 54, 10);
      c.fillStyle = hex(0xffffff);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      c.fillStyle = hex(decor.flower, 0.45);
      c.fillRect(x - 110, y + 14, 220, 14);
      flowers(c, x, y + 2, decor.flower, 6);
      break;
    }
    case 'cakeTable': {
      softShadow(c, x, y + 34, 50, 10);
      c.beginPath();
      c.arc(x, y + 6, 44, 0, Math.PI * 2);
      c.fillStyle = hex(0xfff8f0);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      label(c, 'Wedding Cake', x, y + 66);
      break;
    }
    case 'dessertTable': {
      softShadow(c, x, y + 30, 64, 10);
      roundRect(c, x - 58, y - 26, 116, 52, 10);
      c.fillStyle = hex(0xfff8f0);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      label(c, 'Cake Slices', x, y + 58);
      break;
    }
    case 'kitchenPass': {
      c.fillStyle = hex(0xe9e1d8);
      c.fillRect(1340, 300, 60, 310);
      roundRect(c, 1268, 318, 74, 274, 10);
      c.fillStyle = hex(0xd8d2cc);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      for (const slot of v.passSlots) {
        c.beginPath();
        c.ellipse(slot.x, slot.y + 4, 26, 18, 0, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fill();
      }
      label(c, 'Kitchen', 1300, 290);
      break;
    }
    case 'drinkTap': {
      softShadow(c, x, y + 30, 40, 8);
      roundRect(c, x - 34, y - 34, 68, 68, 12);
      c.fillStyle = hex(0xf4ece4);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.35);
      c.stroke();
      label(c, s.name, x - 30, y + 44, 15);
      break;
    }
    case 'bin': {
      roundRect(c, x - 22, y - 26, 44, 52, 8);
      c.fillStyle = hex(0xa9a0a8);
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = hex(INK, 0.45);
      c.stroke();
      c.fillStyle = hex(INK, 0.3);
      c.fillRect(x - 26, y - 30, 52, 8);
      label(c, 'Bin', x - 70, y, 15);
      break;
    }
  }
}

/** The static venue: floor, rug, furniture and labels. Dynamic things (people, food, cake) are sprites on top. */
export function paintVenue(v: VenueDef, decor: DecorLook): Painter {
  return (c) => {
    const { width, height } = v.size;
    c.fillStyle = hex(v.floorColor);
    c.fillRect(0, 0, width, height);
    // Soft parquet
    c.strokeStyle = hex(shade(v.floorColor, -0.05));
    c.lineWidth = 2;
    for (let y = 0; y < height; y += 50) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(width, y);
      c.stroke();
      for (let x = (y / 50) % 2 ? 0 : 60; x < width; x += 120) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 50);
        c.stroke();
      }
    }
    // Garden border
    c.fillStyle = hex(0xb9d3a8);
    c.fillRect(0, 0, width, 110);
    for (let x = 20; x < width; x += 70) flowers(c, x, 96, x % 140 ? 0xffffff : 0xf2a7b8, 5);
    // Waiting rug
    roundRect(c, 40, 410, 130, 440, 24);
    c.fillStyle = hex(0xeac2c9, 0.7);
    c.fill();
    c.setLineDash([8, 8]);
    c.lineWidth = 3;
    c.strokeStyle = hex(0xe07a95, 0.7);
    c.stroke();
    c.setLineDash([]);
    label(c, 'Waiting', 105, 392, 15);
    // Aisle runner towards the couple
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(655, 250, 60, 750);

    for (const s of v.stations) paintStation(c, s, v, decor);
    for (const t of v.tables) paintTable(c, t, decor);
  };
}
