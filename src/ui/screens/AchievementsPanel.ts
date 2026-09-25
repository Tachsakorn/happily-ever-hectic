import type { UiIcon } from '../../art/props';
import { button, h, type Disposer } from '../dom';
import { medal, uiIcon } from '../paint';
import { ribbon } from './common';

export interface AchievementVM {
  readonly id: string;
  readonly name: string;
  /** The description, or for a hidden secret its hint. */
  readonly description: string;
  readonly icon: UiIcon;
  readonly color: number;
  readonly state: 'unlocked' | 'locked' | 'secret';
  readonly progress: { current: number; target: number } | null;
  readonly unlockedOn: string | null;
}

export interface AchievementsVM {
  readonly items: readonly AchievementVM[];
  readonly unlocked: number;
  readonly total: number;
}

function card(a: AchievementVM): HTMLElement {
  const detail =
    a.state === 'unlocked'
      ? h('small', { class: 'trophy__date', text: `Unlocked ${a.unlockedOn ?? ''}` })
      : a.progress
        ? h(
            'div',
            { class: 'trophy__progress' },
            h('div', { class: 'trophy__bar' }, h('i', { style: `width:${Math.round((a.progress.current / a.progress.target) * 100)}%` })),
            h('small', { text: `${a.progress.current} / ${a.progress.target}` }),
          )
        : null;
  return h(
    'div',
    { class: `trophy trophy--${a.state}` },
    medal(a.icon, a.color, a.state, 58),
    h('div', { class: 'trophy__text' }, h('strong', { text: a.name }), h('span', { text: a.description }), detail),
  );
}

/** The trophy cabinet, shown as a modal panel over the map. */
export function achievementsPanel(vm: AchievementsVM, onClose: () => void, disposer: Disposer): HTMLElement {
  const close = button('', onClose, disposer, { tone: 'cream', size: 'round', icon: uiIcon('close', 0xffffff, 34), aria: 'Close', className: 'panel__close' });
  const secrets = vm.items.filter((a) => a.state === 'secret').length;
  return h(
    'div',
    { class: 'panel pop trophies' },
    close,
    ribbon('Achievements', 'gold'),
    h(
      'p',
      { class: 'shop__hint' },
      `${vm.unlocked} of ${vm.total} unlocked`,
      secrets ? ` · ${secrets} secret${secrets === 1 ? '' : 's'} still hidden` : ' · every secret found!',
    ),
    h('div', { class: 'trophy-list', 'data-scrollable': '' }, ...vm.items.map(card)),
  );
}
