import type { Painter } from '../art/canvas';
import { paintIcon, type ItemIcon } from '../art/items';
import { paintPerson, PERSON_H, PERSON_W, type PersonLook } from '../art/people';
import { paintMedal, paintUiIcon, type UiIcon } from '../art/props';
import type { Disposer } from './dom';

/**
 * Puts the game's painters into the DOM. Menus and gameplay share one set of
 * painters, so a portrait in dialogue is the same drawing as the sprite on the
 * dance floor.
 */

const MAX_DPR = 3;

function dpr(): number {
  return Math.min(MAX_DPR, window.devicePixelRatio || 1);
}

/** A canvas showing `painter`'s (dw × dh) design box at (cssW × cssH) CSS pixels. */
export function paintedCanvas(painter: Painter, dw: number, dh: number, cssW = dw, cssH = dh, className?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ratio = dpr();
  canvas.width = Math.ceil(cssW * ratio);
  canvas.height = Math.ceil(cssH * ratio);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  if (className) canvas.className = className;
  const c = canvas.getContext('2d');
  if (c) {
    c.scale((cssW * ratio) / dw, (cssH * ratio) / dh);
    painter(c);
  }
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

export function uiIcon(icon: UiIcon, color = 0xffffff, size = 40): HTMLCanvasElement {
  return paintedCanvas(paintUiIcon(icon, color), 48, 48, size, size);
}

export function medal(icon: UiIcon, color: number, state: 'unlocked' | 'locked' | 'secret', size = 64): HTMLCanvasElement {
  return paintedCanvas(paintMedal(icon, color, state), 96, 96, size, size);
}

export function itemIcon(icon: ItemIcon, color: number, size = 40, accent?: number): HTMLCanvasElement {
  return paintedCanvas(paintIcon(icon, color, accent), 44, 44, size, size);
}

/** Head-and-shoulders crop of a character, `width` CSS pixels wide. */
export function portrait(look: PersonLook, width: number, className = 'portrait'): HTMLCanvasElement {
  const cropH = 76;
  return paintedCanvas(
    (c) => {
      c.translate(0, 2);
      paintPerson(look)(c);
    },
    PERSON_W,
    cropH,
    width,
    (width * cropH) / PERSON_W,
    className,
  );
}

/** Full-body character, `height` CSS pixels tall. */
export function figure(look: PersonLook, height: number, className = 'figure'): HTMLCanvasElement {
  return paintedCanvas(paintPerson(look), PERSON_W, PERSON_H, (height * PERSON_W) / PERSON_H, height, className);
}

/**
 * A canvas that fills its parent and repaints when the parent resizes. The
 * painter receives the size in CSS pixels. Repaints are coalesced to one frame.
 */
export function backdrop(paint: (w: number, h: number) => Painter, disposer: Disposer, className = 'backdrop'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  let frame = 0;
  let lastW = 0;
  let lastH = 0;
  const redraw = () => {
    frame = 0;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w;
    lastH = h;
    const ratio = Math.min(2, dpr());
    canvas.width = Math.ceil(w * ratio);
    canvas.height = Math.ceil(h * ratio);
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(w, h)(c);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(redraw);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(canvas);
  disposer.add(() => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });
  return canvas;
}

/** Falling petals: a fixed handful of CSS-animated elements, no per-frame script. */
export function petals(count = 14): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'petals';
  wrap.setAttribute('aria-hidden', 'true');
  const tones = ['#f9c3d0', '#fffaf0', '#f7b7c6', '#ffe0b8'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'petal';
    const scale = 0.7 + ((i * 37) % 10) / 12;
    p.style.left = `${(i * 61 + 7) % 100}%`;
    p.style.background = tones[i % tones.length]!;
    p.style.animationDuration = `${9 + ((i * 13) % 7)}s`;
    p.style.animationDelay = `${-((i * 1.7) % 10)}s`;
    p.style.width = `${16 * scale}px`;
    p.style.height = `${11 * scale}px`;
    wrap.append(p);
  }
  return wrap;
}
