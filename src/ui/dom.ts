/** Tiny DOM helpers. No framework: screens are few, event-driven, and never re-rendered per frame. */

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'text') el.textContent = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Collects teardown callbacks so a screen can release every listener, timer and frame it started. */
export class Disposer {
  private readonly items: (() => void)[] = [];

  add(dispose: () => void): void {
    this.items.push(dispose);
  }

  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options);
    this.add(() => target.removeEventListener(type, handler, options));
  }

  timeout(fn: () => void, ms: number): void {
    const id = setTimeout(fn, ms);
    this.add(() => clearTimeout(id));
  }

  dispose(): void {
    while (this.items.length) this.items.pop()?.();
  }
}

/** A finger may wobble this far (CSS px) and still count as a tap rather than a swipe. */
const TAP_SLOP_PX = 16;
/** After a handled tap, the browser's own late click is ignored for this long. */
const GHOST_CLICK_MS = 700;
/** If a browser sends no touchend after a finger's pointerup, the tap still fires after this. */
const TOUCHEND_FALLBACK_MS = 120;

let lastTapAt = -Infinity;
let ghostGuardInstalled = false;

/**
 * Swallows the synthetic click a browser fires after a tap we already
 * handled. Without it, a tap that opens a panel could land a second time on
 * whatever appeared under the finger (e.g. a Buy button in the shop).
 * Keyboard clicks (detail 0) always pass.
 */
function installGhostClickGuard(): void {
  if (ghostGuardInstalled) return;
  ghostGuardInstalled = true;
  const guard = (e: MouseEvent) => {
    if (e.detail !== 0 && performance.now() - lastTapAt < GHOST_CLICK_MS) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener('click', guard, true);
}

/**
 * Calls `handler` when `el` is tapped or clicked.
 *
 * It fires when the finger lifts (pointerup) instead of waiting for the
 * browser's click: iPhone Safari silently drops that click when anything on
 * the page changes during the touch (a pressed look, an entrance animation),
 * which made buttons need several taps. A drag longer than a small wobble is
 * not a tap, so scrolling a list never presses a button in it. Keyboard
 * activation still arrives as a click and still works.
 */
export function onTap(el: HTMLElement, handler: (e: Event) => void, disposer: Disposer): void {
  installGhostClickGuard();
  let down: { id: number; x: number; y: number } | null = null;
  let pendingTouch: { event: Event; timer: number } | null = null;
  const fire = (e: Event) => {
    lastTapAt = performance.now();
    handler(e);
  };
  const firePendingTouch = () => {
    const p = pendingTouch;
    if (!p) return;
    pendingTouch = null;
    clearTimeout(p.timer);
    fire(p.event);
  };
  disposer.add(() => pendingTouch && clearTimeout(pendingTouch.timer));
  disposer.listen(el, 'pointerdown', (e) => {
    if (e.button > 0) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  disposer.listen(el, 'pointercancel', () => (down = null));
  disposer.listen(el, 'pointerup', (e) => {
    const d = down;
    down = null;
    if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_SLOP_PX) return;
    if (e.pointerType !== 'touch') {
      fire(e);
      return;
    }
    // A finger's tap runs on the touchend that follows, not here. The handler
    // may remove this element (a new screen); removed before touchend, the
    // touchend would never reach the window, and the game canvas (Phaser),
    // which tracks fingers there, would think this finger is still down.
    lastTapAt = performance.now();
    pendingTouch = { event: e, timer: window.setTimeout(firePendingTouch, TOUCHEND_FALLBACK_MS) };
  });
  disposer.listen(el, 'touchend', firePendingTouch);
  // Keyboard, or a browser that sends a click without pointer events.
  disposer.listen(el, 'click', (e) => {
    if (performance.now() - lastTapAt < GHOST_CLICK_MS) return;
    handler(e);
  });
}

export type ButtonTone = 'rose' | 'go' | 'gold' | 'cream';
export type ButtonSize = 'normal' | 'big' | 'small' | 'round';

export interface ButtonOptions {
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly icon?: HTMLElement;
  /** Accessible name when the button shows only an icon. */
  readonly aria?: string;
  readonly className?: string;
}

/**
 * The game's chunky button. The pressed look is driven by pointer events so
 * it shows instantly on iPad (Safari's :active needs a touch listener anyway).
 */
export function button(label: string, onPress: () => void, disposer: Disposer, opts: ButtonOptions = {}): HTMLButtonElement {
  const classes = ['btn'];
  if (opts.tone && opts.tone !== 'rose') classes.push(`btn--${opts.tone}`);
  if (opts.size && opts.size !== 'normal') classes.push(`btn--${opts.size}`);
  if (opts.className) classes.push(opts.className);
  const el = h('button', { class: classes.join(' '), type: 'button', 'aria-label': opts.aria }, opts.icon ?? null, label ? h('span', { text: label }) : null);
  const release = () => el.classList.remove('is-pressed');
  disposer.listen(el, 'pointerdown', () => el.classList.add('is-pressed'));
  disposer.listen(el, 'pointerup', release);
  disposer.listen(el, 'pointercancel', release);
  disposer.listen(el, 'pointerleave', release);
  onTap(el, () => {
    if (!el.disabled) onPress();
  }, disposer);
  return el;
}

/** Wraps each character in a span so titles can animate letter by letter. */
export function letters(text: string, className: string, delayStepMs = 45): HTMLElement {
  const el = h('h1', { class: className, 'aria-label': text });
  let i = 0;
  for (const word of text.split(' ')) {
    const w = h('span', { class: 'word' });
    for (const ch of word) {
      const s = h('span', { text: ch, 'aria-hidden': 'true' });
      s.style.animationDelay = `${i * delayStepMs}ms`;
      w.append(s);
      i++;
    }
    el.append(w, ' ');
  }
  return el;
}

/** Counts a number up on screen over `ms`. Cancelled with the disposer. */
export function countUp(el: HTMLElement, to: number, ms: number, disposer: Disposer, format = (n: number) => n.toLocaleString('en-US')): void {
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(Math.round(to * eased));
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  disposer.add(() => cancelAnimationFrame(frame));
}
