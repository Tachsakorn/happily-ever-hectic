/**
 * Procedural art. Every sprite is drawn once with Canvas2D (in design units,
 * pre-scaled for the render scale) and baked into a texture, so the frame
 * loop only moves images — no per-frame vector drawing on the iPad GPU.
 */

export type Painter = (c: CanvasRenderingContext2D) => void;

export const hex = (n: number, alpha = 1): string => {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
};

export function shade(n: number, amount: number): number {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amount > 0 ? (255 - v) * amount : v * amount))));
  return (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
}

export const INK = 0x4a3548;

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fillStroke(c: CanvasRenderingContext2D, fill: number, stroke = INK, width = 2.5): void {
  c.fillStyle = hex(fill);
  c.fill();
  c.lineWidth = width;
  c.strokeStyle = hex(stroke, 0.85);
  c.stroke();
}

function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

export function softShadow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(74,53,72,0.16)';
  c.fill();
}

// ------------------------------------------------------------------ people

export interface PersonLook {
  readonly skin: number;
  readonly outfit: number;
  readonly hair: number;
  /** Small identifying accessory. */
  readonly style: 'guest' | 'grandparent' | 'party' | 'foodie' | 'kid' | 'boss' | 'dress' | 'suit' | 'planner';
  readonly ring?: number;
}

/** A chibi person, 60×84 design units, anchored bottom-centre at (30, 80). */
export function paintPerson(look: PersonLook): Painter {
  return (c) => {
    const kid = look.style === 'kid';
    const s = kid ? 0.82 : 1;
    c.save();
    c.translate(30, 80);
    c.scale(s, s);
    softShadow(c, 0, -2, 24, 7);
    if (look.ring !== undefined) {
      c.beginPath();
      c.ellipse(0, -3, 26, 8, 0, 0, Math.PI * 2);
      c.lineWidth = 4;
      c.strokeStyle = hex(look.ring);
      c.stroke();
    }

    // Body
    c.beginPath();
    if (look.style === 'dress') {
      c.moveTo(-8, -42);
      c.quadraticCurveTo(-26, -8, -24, -4);
      c.lineTo(24, -4);
      c.quadraticCurveTo(26, -8, 8, -42);
      c.closePath();
    } else {
      roundRect(c, -17, -44, 34, 40, 12);
    }
    fillStroke(c, look.outfit);
    if (look.style === 'suit' || look.style === 'boss') {
      c.beginPath();
      c.moveTo(-6, -44);
      c.lineTo(0, -30);
      c.lineTo(6, -44);
      c.fillStyle = '#fff';
      c.fill();
      c.beginPath();
      c.moveTo(-3, -36);
      c.lineTo(0, -24);
      c.lineTo(3, -36);
      c.fillStyle = look.style === 'boss' ? '#c0392b' : hex(INK);
      c.fill();
    }
    if (look.style === 'planner') {
      roundRect(c, -12, -34, 24, 22, 5);
      fillStroke(c, 0xffffff, INK, 2);
      c.fillStyle = hex(0xe07a95);
      c.fillRect(-12, -34, 24, 5);
    }
    if (look.style === 'party') {
      c.beginPath();
      c.moveTo(-10, -44);
      c.lineTo(0, -38);
      c.lineTo(10, -44);
      c.lineWidth = 4;
      c.strokeStyle = hex(0xf3d46b);
      c.stroke();
    }

    // Head
    circle(c, 0, -60, 19);
    fillStroke(c, look.skin);
    // Hair
    c.beginPath();
    if (look.style === 'grandparent') {
      c.arc(0, -64, 18, Math.PI * 1.05, Math.PI * 1.95);
      c.fillStyle = hex(0xe9e6e2);
      c.fill();
      circle(c, 0, -80, 7);
      c.fillStyle = hex(0xe9e6e2);
      c.fill();
    } else if (look.style === 'dress') {
      c.arc(0, -63, 20, Math.PI * 0.95, Math.PI * 2.05);
      c.fillStyle = hex(look.hair);
      c.fill();
      // Veil
      c.beginPath();
      c.moveTo(-14, -76);
      c.quadraticCurveTo(-30, -50, -24, -30);
      c.lineTo(-12, -44);
      c.closePath();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fill();
      circle(c, 10, -78, 4);
      c.fillStyle = hex(0xf2a7b8);
      c.fill();
    } else {
      c.arc(0, -63, 19, Math.PI * 1.02, Math.PI * 1.98);
      c.fillStyle = hex(look.hair);
      c.fill();
    }
    if (look.style === 'kid') {
      circle(c, -16, -70, 6);
      circle(c, 16, -70, 6);
      c.fillStyle = hex(look.hair);
      c.fill();
    }
    if (look.style === 'foodie') {
      roundRect(c, -13, -92, 26, 16, 7);
      fillStroke(c, 0xffffff, INK, 2);
    }
    if (look.style === 'planner') {
      // Headset
      c.beginPath();
      c.arc(0, -62, 21, Math.PI * 1.1, Math.PI * 1.9);
      c.lineWidth = 3;
      c.strokeStyle = hex(INK);
      c.stroke();
      circle(c, -19, -58, 4);
      c.fillStyle = hex(INK);
      c.fill();
    }

    // Face
    c.fillStyle = hex(INK);
    circle(c, -6, -58, 2.4);
    c.fill();
    circle(c, 6, -58, 2.4);
    c.fill();
    c.fillStyle = 'rgba(240,120,140,0.45)';
    circle(c, -10, -52, 3.5);
    c.fill();
    circle(c, 10, -52, 3.5);
    c.fill();
    c.beginPath();
    c.arc(0, -53, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    c.lineWidth = 2;
    c.strokeStyle = hex(INK);
    c.stroke();
    if (look.style === 'grandparent') {
      c.lineWidth = 1.6;
      c.strokeStyle = hex(INK);
      circle(c, -6, -58, 5);
      c.stroke();
      circle(c, 6, -58, 5);
      c.stroke();
    }
    c.restore();
  };
}

// ------------------------------------------------------------------ items

export type ItemIcon = 'plate' | 'flute' | 'glass' | 'slice' | 'cake' | 'gift' | 'menu' | 'heart' | 'heart-empty' | 'star' | 'star-empty';

/** Item icons, 44×44 design units, centred. */
export function paintIcon(icon: ItemIcon, color: number, accent = 0xe07a95): Painter {
  return (c) => {
    c.save();
    c.translate(22, 22);
    switch (icon) {
      case 'plate':
        c.beginPath();
        c.ellipse(0, 3, 19, 13, 0, 0, Math.PI * 2);
        fillStroke(c, 0xffffff);
        c.beginPath();
        c.ellipse(0, 1, 11, 7, 0, 0, Math.PI * 2);
        c.fillStyle = hex(color);
        c.fill();
        c.beginPath();
        c.ellipse(-3, -1, 4, 2, -0.4, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fill();
        break;
      case 'flute':
        c.beginPath();
        c.moveTo(-7, -18);
        c.lineTo(7, -18);
        c.lineTo(4, 4);
        c.lineTo(-4, 4);
        c.closePath();
        fillStroke(c, color);
        c.beginPath();
        c.moveTo(0, 4);
        c.lineTo(0, 15);
        c.moveTo(-7, 17);
        c.lineTo(7, 17);
        c.lineWidth = 3;
        c.strokeStyle = hex(INK, 0.85);
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)';
        circle(c, -1, -8, 1.6);
        c.fill();
        circle(c, 2, -2, 1.2);
        c.fill();
        break;
      case 'glass':
        roundRect(c, -10, -16, 20, 32, 5);
        fillStroke(c, color);
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fillRect(-6, -12, 4, 22);
        circle(c, 8, -16, 5);
        c.fillStyle = hex(0xf3d46b);
        c.fill();
        break;
      case 'slice':
        c.beginPath();
        c.moveTo(-16, 10);
        c.lineTo(16, 10);
        c.lineTo(10, -12);
        c.closePath();
        fillStroke(c, color);
        c.fillStyle = hex(accent);
        c.fillRect(-12, 1, 26, 3);
        circle(c, 10, -15, 4);
        c.fillStyle = '#d9534f';
        c.fill();
        break;
      case 'cake':
        roundRect(c, -19, 0, 38, 16, 4);
        fillStroke(c, color);
        roundRect(c, -13, -12, 26, 13, 4);
        fillStroke(c, color);
        roundRect(c, -7, -22, 14, 11, 3);
        fillStroke(c, color);
        c.fillStyle = hex(accent);
        for (const [x, y] of [
          [-12, 6],
          [0, 6],
          [12, 6],
          [-6, -6],
          [6, -6],
        ] as const) {
          circle(c, x, y, 2.2);
          c.fill();
        }
        break;
      case 'gift':
        roundRect(c, -15, -10, 30, 24, 3);
        fillStroke(c, color);
        c.fillStyle = hex(accent);
        c.fillRect(-3, -10, 6, 24);
        c.fillRect(-15, -1, 30, 5);
        c.beginPath();
        c.ellipse(-6, -14, 7, 4, -0.5, 0, Math.PI * 2);
        c.ellipse(6, -14, 7, 4, 0.5, 0, Math.PI * 2);
        c.fill();
        break;
      case 'menu':
        roundRect(c, -12, -17, 24, 34, 3);
        fillStroke(c, 0xfffaf2);
        c.fillStyle = hex(INK, 0.6);
        for (let i = 0; i < 4; i++) c.fillRect(-7, -9 + i * 6, i % 2 ? 10 : 14, 2.5);
        c.fillStyle = hex(accent);
        c.fillRect(-7, -14, 14, 3);
        break;
      case 'heart':
      case 'heart-empty':
        c.beginPath();
        c.moveTo(0, 14);
        c.bezierCurveTo(-26, -2, -12, -22, 0, -8);
        c.bezierCurveTo(12, -22, 26, -2, 0, 14);
        c.closePath();
        if (icon === 'heart') fillStroke(c, color, shade(color, -0.35), 2);
        else {
          c.fillStyle = 'rgba(74,53,72,0.12)';
          c.fill();
          c.lineWidth = 2;
          c.strokeStyle = 'rgba(74,53,72,0.35)';
          c.stroke();
        }
        break;
      case 'star':
      case 'star-empty':
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 8 : 18;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        if (icon === 'star') fillStroke(c, color, shade(color, -0.4), 2);
        else {
          c.fillStyle = 'rgba(74,53,72,0.12)';
          c.fill();
          c.lineWidth = 2;
          c.strokeStyle = 'rgba(74,53,72,0.3)';
          c.stroke();
        }
        break;
    }
    c.restore();
  };
}

/** Speech bubble, 64×64, with a tail pointing down. */
export function paintBubble(fill = 0xffffff, stroke = INK): Painter {
  return (c) => {
    roundRect(c, 4, 4, 56, 46, 16);
    c.fillStyle = hex(fill);
    c.fill();
    c.beginPath();
    c.moveTo(24, 48);
    c.lineTo(32, 60);
    c.lineTo(40, 48);
    c.closePath();
    c.fill();
    roundRect(c, 4, 4, 56, 46, 16);
    c.lineWidth = 2.5;
    c.strokeStyle = hex(stroke, 0.8);
    c.stroke();
  };
}

export function paintDot(color: number, radius: number, stroke?: number): Painter {
  return (c) => {
    circle(c, radius + 2, radius + 2, radius);
    c.fillStyle = hex(color);
    c.fill();
    if (stroke !== undefined) {
      c.lineWidth = 3;
      c.strokeStyle = hex(stroke);
      c.stroke();
    }
  };
}

// ------------------------------------------------------------------ disasters

export function paintDisasterIcon(icon: string, color: number): Painter {
  return (c) => {
    c.save();
    c.translate(40, 40);
    switch (icon) {
      case 'puddle':
        c.beginPath();
        c.ellipse(0, 6, 34, 20, 0.1, 0, Math.PI * 2);
        c.fillStyle = hex(color, 0.75);
        c.fill();
        c.beginPath();
        c.ellipse(-12, 2, 10, 5, 0, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fill();
        // tipped glass
        c.save();
        c.translate(18, -6);
        c.rotate(1.2);
        roundRect(c, -6, -10, 12, 20, 3);
        fillStroke(c, 0xf49ac1, INK, 2);
        c.restore();
        break;
      case 'argument':
        c.font = 'bold 34px -apple-system, "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = hex(color);
        c.strokeStyle = '#fff';
        c.lineWidth = 6;
        c.strokeText('#@!', 0, 0);
        c.fillText('#@!', 0, 0);
        break;
      case 'puppy':
        circle(c, 0, 6, 18);
        fillStroke(c, color);
        circle(c, 0, -14, 14);
        fillStroke(c, color);
        c.beginPath();
        c.ellipse(-13, -18, 5, 10, 0.3, 0, Math.PI * 2);
        c.ellipse(13, -18, 5, 10, -0.3, 0, Math.PI * 2);
        c.fillStyle = hex(shade(color, -0.35));
        c.fill();
        c.fillStyle = hex(INK);
        circle(c, -5, -15, 2.2);
        c.fill();
        circle(c, 5, -15, 2.2);
        c.fill();
        circle(c, 0, -9, 3);
        c.fill();
        // ring cushion
        circle(c, 0, 16, 5);
        c.lineWidth = 2.5;
        c.strokeStyle = hex(0xf3d46b);
        c.stroke();
        break;
      case 'music-off':
        c.fillStyle = hex(color);
        c.beginPath();
        c.ellipse(-8, 12, 8, 6, -0.4, 0, Math.PI * 2);
        c.fill();
        c.fillRect(-2, -18, 4, 30);
        c.fillRect(-2, -18, 16, 5);
        c.beginPath();
        c.moveTo(-22, -22);
        c.lineTo(22, 22);
        c.lineWidth = 5;
        c.strokeStyle = '#d9534f';
        c.stroke();
        break;
      default:
        circle(c, 0, 0, 24);
        fillStroke(c, color);
        c.font = 'bold 30px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#fff';
        c.fillText('!', 0, 2);
    }
    c.restore();
  };
}

/** A soft card used by HUD panels and banners. */
export function paintPanel(w: number, h: number, fill = 0xfffaf6, alpha = 0.94): Painter {
  return (c) => {
    c.shadowColor = 'rgba(74,53,72,0.22)';
    c.shadowBlur = 12;
    c.shadowOffsetY = 4;
    roundRect(c, 8, 6, w - 16, h - 16, 18);
    c.fillStyle = hex(fill, alpha);
    c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 2;
    c.strokeStyle = hex(INK, 0.12);
    c.stroke();
  };
}
