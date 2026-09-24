import { paintIcon } from '../../art/items';
import { button, h, type Disposer } from '../dom';
import { itemIcon, paintedCanvas, uiIcon } from '../paint';

/** Building blocks several screens share: the logo, stars, coins, settings toggles. */

export interface SettingsVM {
  readonly music: boolean;
  readonly sfx: boolean;
}

/** Sounds a screen may ask for; the app maps them onto the audio service. */
export type UiCue = 'star' | 'coin' | 'pop' | 'whoosh' | 'cheer';

/** The title, two lines, last word in rose, letters dropping in one after another. */
export function logo(title: string, idle = false): HTMLElement {
  const words = title.split(' ');
  const el = h('h1', { class: `logo${idle ? ' is-idle' : ''}`, 'aria-label': title });
  let i = 0;
  words.forEach((word, wi) => {
    if (wi === words.length - 1 && words.length > 1) el.append(h('br'));
    const w = h('span', { class: `word${wi === words.length - 1 && words.length > 1 ? ' rose' : ''}`, 'aria-hidden': 'true' });
    for (const ch of word) {
      const s = h('span', { class: 'ch', text: ch });
      s.style.animationDelay = `${120 + i * 55}ms, ${900 + i * 90}ms`;
      w.append(s);
      i++;
    }
    el.append(w, wi < words.length - 2 ? ' ' : '');
  });
  return el;
}

const STAR_ON = 0xf2b84b;
const STAR_OFF = 0xe9dccb;

export function starCanvas(on: boolean, size: number): HTMLCanvasElement {
  return paintedCanvas(paintIcon(on ? 'star' : 'star-empty', on ? STAR_ON : STAR_OFF), 44, 44, size, size, `star${on ? ' is-on' : ''}`);
}

export function starRow(stars: number, size = 26, className = 'star-row'): HTMLElement {
  return h('span', { class: className, 'aria-label': `${stars} of 3 stars` }, ...[0, 1, 2].map((i) => starCanvas(i < stars, size)));
}

export function coinBadge(coins: number): HTMLElement {
  return h('span', { class: 'badge', 'aria-label': `${coins} coins` }, itemIcon('coin', 0xf2b84b, 38), h('span', { class: 'badge__value', text: coins.toLocaleString('en-US') }));
}

export function settingsToggles(settings: SettingsVM, onChange: (next: SettingsVM) => void, disposer: Disposer): HTMLElement {
  let current = settings;
  const music = button('', () => update({ ...current, music: !current.music }), disposer, { tone: 'cream', size: 'round', icon: uiIcon('music', 0x3b2640), aria: 'Music' });
  const sfx = button('', () => update({ ...current, sfx: !current.sfx }), disposer, { tone: 'cream', size: 'round', icon: uiIcon('sound', 0x3b2640), aria: 'Sounds' });
  const paint = () => {
    music.classList.toggle('is-off', !current.music);
    sfx.classList.toggle('is-off', !current.sfx);
    music.setAttribute('aria-pressed', String(current.music));
    sfx.setAttribute('aria-pressed', String(current.sfx));
  };
  const update = (next: SettingsVM) => {
    current = next;
    paint();
    onChange(next);
  };
  paint();
  return h('div', { class: 'toggles' }, music, sfx);
}

export function backButton(onTap: () => void, disposer: Disposer): HTMLButtonElement {
  return button('', onTap, disposer, { tone: 'cream', size: 'round', icon: uiIcon('back', 0x3b2640), aria: 'Back' });
}

export function ribbon(text: string, tone: 'rose' | 'sage' | 'gold' = 'rose', tag: 'h1' | 'h2' | 'div' = 'h2'): HTMLElement {
  return h(tag, { class: `ribbon${tone === 'rose' ? '' : ` ribbon--${tone}`}`, text });
}
