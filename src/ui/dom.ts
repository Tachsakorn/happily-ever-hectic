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
  ): void {
    target.addEventListener(type, handler);
    this.add(() => target.removeEventListener(type, handler));
  }

  timeout(fn: () => void, ms: number): void {
    const id = setTimeout(fn, ms);
    this.add(() => clearTimeout(id));
  }

  dispose(): void {
    while (this.items.length) this.items.pop()?.();
  }
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
export function button(label: string, onTap: () => void, disposer: Disposer, opts: ButtonOptions = {}): HTMLButtonElement {
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
  disposer.listen(el, 'click', () => {
    if (!el.disabled) onTap();
  });
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
