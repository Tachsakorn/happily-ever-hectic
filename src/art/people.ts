import { disc, flat, groundShadow, hex, INK, LINE, outline, oval, rrect, shade, toon, type Painter } from './canvas';

export type PersonStyle = 'guest' | 'grandparent' | 'party' | 'foodie' | 'kid' | 'boss' | 'dress' | 'suit' | 'planner' | 'chef';
export type HairStyle = 'short' | 'bob' | 'long' | 'bun' | 'curly' | 'spiky' | 'pigtails' | 'side' | 'crop' | 'longSide';
export type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'cheeky';

export interface PersonLook {
  readonly skin: number;
  readonly outfit: number;
  readonly hair: number;
  readonly style: PersonStyle;
  readonly hairStyle?: HairStyle;
  readonly mood?: Mood;
  /** Shirt colour under a suit jacket. */
  readonly shirt?: number;
  readonly accessory?: 'star-clip';
}

/** Canvas size for a person, in design units. Feet sit at (PERSON_W/2, PERSON_FEET). */
export const PERSON_W = 64;
export const PERSON_H = 112;
export const PERSON_FEET = 106;

const BLUSH = 'rgba(240,110,135,0.42)';
const TROUSERS = 0x4a4258;

function defaultHair(style: PersonStyle): HairStyle {
  switch (style) {
    case 'dress':
      return 'long';
    case 'grandparent':
      return 'bun';
    case 'kid':
      return 'pigtails';
    case 'boss':
      return 'side';
    case 'party':
      return 'spiky';
    case 'planner':
      return 'bob';
    default:
      return 'short';
  }
}

function drawBackHair(c: CanvasRenderingContext2D, hair: HairStyle, color: number): void {
  if (hair === 'long' || hair === 'longSide') {
    const p = new Path2D();
    p.moveTo(-21, -74);
    p.quadraticCurveTo(-27, -44, -18, -38);
    p.lineTo(18, -38);
    p.quadraticCurveTo(27, -44, 21, -74);
    p.closePath();
    toon(c, p, color, { x: -27, y: -76, w: 54, h: 38 });
  }
  if (hair === 'pigtails') {
    for (const s of [-1, 1]) toon(c, oval(s * 23, -68, 7, 9, s * 0.4), color, { x: s * 23 - 7, y: -77, w: 14, h: 18 });
  }
  if (hair === 'bun') toon(c, disc(0, -93, 8), color, { x: -8, y: -101, w: 16, h: 16 });
}

function drawFrontHair(c: CanvasRenderingContext2D, hair: HairStyle, color: number): void {
  const p = new Path2D();
  switch (hair) {
    case 'spiky':
      p.moveTo(-21, -66);
      p.lineTo(-19, -84);
      p.lineTo(-12, -80);
      p.lineTo(-8, -93);
      p.lineTo(-1, -84);
      p.lineTo(5, -94);
      p.lineTo(9, -83);
      p.lineTo(17, -88);
      p.lineTo(21, -66);
      p.quadraticCurveTo(10, -78, -21, -66);
      break;
    case 'curly':
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + (0.9 * i) / 6);
        p.moveTo(Math.cos(a) * 19 + 7, -70 + Math.sin(a) * 19);
        p.arc(Math.cos(a) * 19, -70 + Math.sin(a) * 19, 7, 0, Math.PI * 2);
      }
      break;
    case 'crop':
      // Short sides, a little more volume on top.
      p.moveTo(-20, -68);
      p.quadraticCurveTo(-22, -88, -6, -91);
      p.quadraticCurveTo(10, -94, 19, -86);
      p.quadraticCurveTo(22, -80, 20, -68);
      p.quadraticCurveTo(14, -80, 4, -81);
      p.quadraticCurveTo(-8, -82, -20, -68);
      break;
    case 'longSide':
      // Long hair with a side-swept fringe.
      p.moveTo(-21, -48);
      p.quadraticCurveTo(-25, -92, 2, -92);
      p.quadraticCurveTo(25, -91, 21, -48);
      p.quadraticCurveTo(19, -66, 15, -74);
      p.quadraticCurveTo(2, -70, -9, -80);
      p.quadraticCurveTo(-16, -66, -21, -48);
      break;
    case 'side':
      p.moveTo(-21, -64);
      p.quadraticCurveTo(-23, -91, 2, -91);
      p.quadraticCurveTo(22, -90, 21, -66);
      p.quadraticCurveTo(8, -80, -8, -78);
      p.quadraticCurveTo(-14, -72, -21, -64);
      break;
    default: {
      // short / bob / long / bun / pigtails share a rounded cap with a soft fringe.
      const sideDrop = hair === 'bob' || hair === 'long' ? -52 : -64;
      p.moveTo(-21, sideDrop);
      p.quadraticCurveTo(-24, -92, 0, -92);
      p.quadraticCurveTo(24, -92, 21, sideDrop);
      p.quadraticCurveTo(18, -70, 14, -76);
      p.quadraticCurveTo(8, -71, 3, -78);
      p.quadraticCurveTo(-4, -71, -10, -77);
      p.quadraticCurveTo(-16, -70, -21, sideDrop);
    }
  }
  p.closePath();
  if (hair === 'curly') {
    // Overlapping curls: outline behind, fill on top, so only the outer edge shows.
    c.lineWidth = LINE * 2;
    c.strokeStyle = hex(INK);
    c.stroke(p);
    c.fillStyle = hex(color);
    c.fill(p);
    c.fillStyle = hex(shade(color, 0.18));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + (0.9 * i) / 6);
      c.fill(disc(Math.cos(a) * 19 - 2, -72 + Math.sin(a) * 19, 2.2));
    }
    return;
  }
  toon(c, p, color, { x: -24, y: -94, w: 48, h: 40 }, { shadeAmount: -0.22 });
}

function drawFace(c: CanvasRenderingContext2D, mood: Mood): void {
  const ink = hex(INK);
  c.fillStyle = BLUSH;
  c.fill(oval(-12, -61, 4, 2.8));
  c.fill(oval(12, -61, 4, 2.8));

  c.lineCap = 'round';
  c.lineWidth = 2.2;
  c.strokeStyle = ink;
  if (mood === 'happy') {
    for (const x of [-7, 7]) {
      c.beginPath();
      c.arc(x, -66, 3.4, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  } else {
    for (const x of [-7, 7]) {
      c.fillStyle = ink;
      c.fill(oval(x, -67, 2.6, 3.5));
      c.fillStyle = '#fff';
      c.fill(disc(x + 0.9, -68.4, 1.1));
    }
    if (mood === 'angry' || mood === 'sad') {
      const tilt = mood === 'angry' ? 1 : -1;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * 11, -73 - tilt * 1.5);
        c.lineTo(s * 4, -73 + tilt * 1.5);
        c.stroke();
      }
    }
  }

  const m = new Path2D();
  if (mood === 'cheeky') {
    // A playful tongue-out face.
    c.beginPath();
    c.moveTo(-5, -59);
    c.lineTo(5, -59);
    c.stroke();
    const tongue = new Path2D();
    tongue.moveTo(-3.5, -59);
    tongue.quadraticCurveTo(-3.5, -52, 0, -52);
    tongue.quadraticCurveTo(3.5, -52, 3.5, -59);
    tongue.closePath();
    c.fillStyle = '#ef7f95';
    c.fill(tongue);
    c.lineWidth = 1.6;
    c.stroke(tongue);
    return;
  }
  if (mood === 'happy') {
    m.moveTo(-5, -59);
    m.quadraticCurveTo(0, -51, 5, -59);
    m.closePath();
    c.fillStyle = ink;
    c.fill(m);
    c.fillStyle = '#ef8a9e';
    c.fill(oval(0, -55.5, 2.6, 1.6));
  } else {
    c.beginPath();
    if (mood === 'angry' || mood === 'sad') c.arc(0, -54.5, 3.6, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(0, -61, 3.6, Math.PI * 0.2, Math.PI * 0.8);
    c.stroke();
  }
}

/**
 * A chibi character: big head, small body, outlined and two-tone shaded.
 * Style decides outfit details and accessories; mood decides the face.
 */
export function paintPerson(look: PersonLook): Painter {
  return (c) => {
    const hair = look.hairStyle ?? defaultHair(look.style);
    const mood = look.mood ?? 'neutral';
    const small = look.style === 'kid';
    c.save();
    c.translate(PERSON_W / 2, PERSON_FEET);
    groundShadow(c, 0, -1, 22, 6);
    if (small) {
      c.translate(0, 0);
      c.scale(0.84, 0.84);
    }

    const outfit = look.outfit;
    const dress = look.style === 'dress';

    // Legs and shoes
    if (!dress) {
      const legs = look.style === 'chef' ? 0x3d3a44 : look.style === 'suit' ? shade(outfit, -0.3) : TROUSERS;
      for (const x of [-10, 2]) toon(c, rrect(x, -18, 8, 16, 3), legs, { x, y: -18, w: 8, h: 16 }, { line: 2.2 });
    }
    for (const x of [-6, 6]) flat(c, oval(x, -3, 6.5, 3.6), dress ? 0xf4e7ef : 0x3a2a2a, 2);

    // Veil behind everything above the waist
    if (dress) {
      const veil = new Path2D();
      veil.moveTo(-14, -86);
      veil.quadraticCurveTo(-34, -52, -26, -18);
      veil.lineTo(26, -18);
      veil.quadraticCurveTo(34, -52, 14, -86);
      veil.closePath();
      c.fillStyle = 'rgba(255,255,255,0.72)';
      c.fill(veil);
      outline(c, veil, 1.6, 0xb9a9c2);
    }

    drawBackHair(c, hair, look.hair);

    // Body
    if (dress) {
      const skirt = new Path2D();
      skirt.moveTo(-10, -34);
      skirt.quadraticCurveTo(-18, -18, -25, -4);
      skirt.quadraticCurveTo(0, 2, 25, -4);
      skirt.quadraticCurveTo(18, -18, 10, -34);
      skirt.closePath();
      toon(c, skirt, outfit, { x: -25, y: -34, w: 50, h: 36 }, { shadeAmount: -0.1 });
      toon(c, rrect(-11, -50, 22, 20, 8), outfit, { x: -11, y: -50, w: 22, h: 20 }, { shadeAmount: -0.1 });
      // Waist ribbon
      flat(c, rrect(-12, -35, 24, 4, 2), 0xf2a7b8, 1.6);
    } else {
      const torsoColor = look.style === 'chef' ? 0xffffff : outfit;
      toon(c, rrect(-15, -50, 30, 36, 12), torsoColor, { x: -15, y: -50, w: 30, h: 36 });
    }

    // Style details on the torso
    const ink = hex(INK);
    if (look.style === 'suit' || look.style === 'boss') {
      const shirt = new Path2D();
      shirt.moveTo(-6, -50);
      shirt.lineTo(0, -34);
      shirt.lineTo(6, -50);
      shirt.closePath();
      flat(c, shirt, look.shirt ?? 0xffffff, 1.6);
      if (look.style === 'suit') {
        const bow = new Path2D();
        bow.moveTo(-6, -50);
        bow.lineTo(0, -47);
        bow.lineTo(-6, -44);
        bow.closePath();
        bow.moveTo(6, -50);
        bow.lineTo(0, -47);
        bow.lineTo(6, -44);
        bow.closePath();
        flat(c, bow, 0x3b2640, 1.2);
        flat(c, disc(-9, -42, 3), 0xf2a7b8, 1.4);
      } else {
        const tie = new Path2D();
        tie.moveTo(-2.5, -48);
        tie.lineTo(2.5, -48);
        tie.lineTo(3.5, -32);
        tie.lineTo(0, -28);
        tie.lineTo(-3.5, -32);
        tie.closePath();
        flat(c, tie, 0xd24a4a, 1.4);
      }
    }
    if (look.style === 'chef') {
      for (const y of [-44, -36, -28]) {
        c.fillStyle = ink;
        c.fill(disc(-5, y, 1.4));
        c.fill(disc(5, y, 1.4));
      }
    }
    if (look.style === 'planner') {
      // Apron with a heart
      flat(c, rrect(-11, -38, 22, 22, 6), 0xfffaf2, 1.8);
      c.fillStyle = hex(0xe86f8e);
      const h = new Path2D();
      h.moveTo(0, -24);
      h.bezierCurveTo(-8, -29, -5, -35, 0, -31.5);
      h.bezierCurveTo(5, -35, 8, -29, 0, -24);
      c.fill(h);
    }
    if (look.style === 'foodie') {
      const napkin = new Path2D();
      napkin.moveTo(-9, -48);
      napkin.lineTo(9, -48);
      napkin.lineTo(0, -33);
      napkin.closePath();
      flat(c, napkin, 0xffffff, 1.6);
    }
    if (look.style === 'grandparent') {
      c.fillStyle = hex(shade(outfit, -0.35));
      for (const y of [-42, -34, -26]) c.fill(disc(0, y, 1.6));
    }
    if (look.style === 'party') {
      c.strokeStyle = hex(0xf2b84b);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-13, -44);
      c.quadraticCurveTo(0, -36, 13, -44);
      c.stroke();
    }

    // Arms and hands
    const sleeve = dress ? look.skin : look.style === 'chef' ? 0xffffff : outfit;
    for (const s of [-1, 1]) {
      const arm = rrect(s > 0 ? 12 : -21, -47, 9, 25, 4.5);
      toon(c, arm, sleeve, { x: s > 0 ? 12 : -21, y: -47, w: 9, h: 25 }, { line: 2.2 });
      flat(c, disc(s * 16.5, -21, 4.6), look.skin, 2);
    }

    // Held props
    if (dress) {
      for (const [x, y, col] of [
        [-4, -26, 0xf2a7b8],
        [4, -27, 0xffffff],
        [0, -31, 0xf7c6d2],
        [-7, -31, 0xffffff],
        [7, -31, 0xf2a7b8],
      ] as const) {
        flat(c, disc(x, y, 4.2), col, 1.4);
      }
      c.fillStyle = hex(0x8fb39a);
      c.fill(oval(0, -21, 3, 5));
    }
    if (look.style === 'planner') {
      flat(c, rrect(14, -32, 12, 16, 2), 0xc98a4a, 1.8);
      flat(c, rrect(16, -30, 8, 11, 1), 0xffffff, 1);
    }

    // Head
    toon(c, oval(0, -69, 20, 19), look.skin, { x: -20, y: -88, w: 40, h: 38 }, { shadeAmount: -0.1 });
    // Long hair covers the ears.
    if (hair !== 'long' && hair !== 'longSide' && hair !== 'bob') for (const s of [-1, 1]) flat(c, disc(s * 19.5, -67, 4), look.skin, 2);
    drawFace(c, mood);
    drawFrontHair(c, hair, look.hair);

    // Headwear and face accessories
    if (look.style === 'grandparent') {
      c.lineWidth = 1.6;
      c.strokeStyle = ink;
      c.stroke(disc(-7, -67, 5));
      c.stroke(disc(7, -67, 5));
      c.beginPath();
      c.moveTo(-2, -67);
      c.lineTo(2, -67);
      c.stroke();
    }
    if (look.style === 'dress' && look.accessory !== 'star-clip') {
      for (const x of [-9, 0, 9]) flat(c, disc(x, -90, 3.2), x === 0 ? 0xf2a7b8 : 0xffffff, 1.3);
    }
    if (look.accessory === 'star-clip') {
      c.save();
      c.translate(13, -84);
      c.rotate(0.3);
      const star = new Path2D();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.6 : 6;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      star.closePath();
      flat(c, star, 0xfff6c9, 1.6);
      c.restore();
    }
    if (look.style === 'party') {
      const hat = new Path2D();
      hat.moveTo(-7, -88);
      hat.lineTo(9, -86);
      hat.lineTo(5, -106);
      hat.closePath();
      toon(c, hat, 0x7fb08a, { x: -7, y: -106, w: 16, h: 20 }, { line: 2 });
      flat(c, disc(5, -106, 3.2), 0xf2b84b, 1.4);
    }
    if (look.style === 'chef') {
      const toque = new Path2D();
      toque.moveTo(-12, -84);
      toque.lineTo(-12, -92);
      toque.arc(-7, -96, 7, Math.PI * 0.9, Math.PI * 1.7);
      toque.arc(3, -101, 8, Math.PI * 1.1, Math.PI * 1.95);
      toque.arc(10, -95, 6, Math.PI * 1.3, Math.PI * 2.2);
      toque.lineTo(12, -84);
      toque.closePath();
      toon(c, toque, 0xffffff, { x: -14, y: -109, w: 28, h: 25 }, { line: 2 });
    }
    if (look.style === 'planner') {
      c.lineWidth = 2.4;
      c.strokeStyle = ink;
      c.beginPath();
      c.arc(0, -70, 22, Math.PI * 1.08, Math.PI * 1.92);
      c.stroke();
      flat(c, rrect(-24, -72, 6, 10, 2), 0x3b2640, 1);
      c.beginPath();
      c.moveTo(-21, -63);
      c.quadraticCurveTo(-18, -55, -8, -56);
      c.stroke();
    }
    c.restore();
  };
}
