import type { PersonLook } from '../../art/people';
import { paintMenuBackdrop } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { button, h } from '../dom';
import { backdrop, figure, petals, uiIcon } from '../paint';
import { logo, settingsToggles, type SettingsVM } from './common';

export type { SettingsVM } from './common';
export { settingsToggles } from './common';

export interface MainMenuVM {
  readonly title: string;
  readonly tagline: string;
  readonly settings: SettingsVM;
  /** The couple standing under the arch; the heart of the title screen. */
  readonly couple: readonly [PersonLook, PersonLook] | null;
  readonly coupleNames: string;
}

export class MainMenuScreen extends DomScreen {
  constructor(
    private readonly vm: MainMenuVM,
    private readonly actions: { play: () => void; settings: (s: SettingsVM) => void },
  ) {
    super();
  }

  protected render(): HTMLElement {
    const vm = this.vm;
    const couple = vm.couple
      ? h(
          'div',
          { class: 'menu__couple', 'aria-label': vm.coupleNames },
          h('div', { class: 'menu__person menu__person--a' }, figure(vm.couple[0], 360)),
          h('div', { class: 'menu__person menu__person--b' }, figure(vm.couple[1], 360)),
          h('span', { class: 'menu__love' }),
          h('span', { class: 'menu__love menu__love--late' }),
        )
      : null;
    return h(
      'div',
      { class: 'screen menu-screen' },
      backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { archAt: 0.7, seed: 11 }), this.disposer),
      petals(10),
      couple,
      h(
        'div',
        { class: 'menu__column' },
        logo(vm.title, true),
        h('p', { class: 'tagline', text: vm.tagline }),
        button('Play', this.actions.play, this.disposer, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 40), className: 'menu__play' }),
        settingsToggles(vm.settings, this.actions.settings, this.disposer),
      ),
    );
  }
}
