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

/** Collects teardown callbacks so a screen can release every listener it added. */
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

  dispose(): void {
    while (this.items.length) this.items.pop()?.();
  }
}

export function button(
  label: string,
  onTap: () => void,
  disposer: Disposer,
  variant: 'primary' | 'secondary' | 'small' | 'small-secondary' = 'primary',
): HTMLButtonElement {
  const classes = ['btn'];
  if (variant === 'secondary' || variant === 'small-secondary') classes.push('btn--secondary');
  if (variant === 'small' || variant === 'small-secondary') classes.push('btn--small');
  const el = h('button', { class: classes.join(' '), type: 'button' }, label);
  disposer.listen(el, 'click', () => {
    if (!el.disabled) onTap();
  });
  return el;
}
