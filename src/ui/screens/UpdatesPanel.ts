import { button, h, type Disposer } from '../dom';
import { uiIcon } from '../paint';
import { ribbon } from './common';

export interface UpdateVM {
  readonly version: string;
  readonly title: string;
  /** Already formatted for display. */
  readonly date: string;
  readonly notes: readonly string[];
  /** Newer than the last update the player opened. */
  readonly isNew: boolean;
}

function entry(u: UpdateVM): HTMLElement {
  return h(
    'article',
    { class: `update${u.isNew ? ' is-new' : ''}` },
    h(
      'header',
      { class: 'update__head' },
      h('span', { class: 'update__version', text: `v${u.version}` }),
      h('h3', { class: 'update__title display', text: u.title }),
      u.isNew ? h('span', { class: 'update__new', text: 'ใหม่' }) : null,
    ),
    h('small', { class: 'update__date', text: u.date }),
    h('ul', { class: 'update__notes' }, ...u.notes.map((note) => h('li', { text: note }))),
  );
}

/** The update log, shown as a modal panel over the title screen. */
export function updatesPanel(updates: readonly UpdateVM[], onClose: () => void, disposer: Disposer): HTMLElement {
  const close = button('', onClose, disposer, { tone: 'cream', size: 'round', icon: uiIcon('close', 0xffffff, 34), aria: 'ปิด', className: 'panel__close' });
  const latest = updates[0];
  return h(
    'div',
    { class: 'panel pop updates', lang: 'th' },
    close,
    ribbon('มีอะไรใหม่', 'gold'),
    latest ? h('p', { class: 'shop__hint', text: `เวอร์ชัน ${latest.version} · ${latest.date}` }) : null,
    h('div', { class: 'update-list', 'data-scrollable': '' }, ...updates.map(entry)),
  );
}
