import { paintMenuBackdrop } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { h } from '../dom';
import { backdrop, petals } from '../paint';
import { logo } from './common';

/**
 * First screen. Its tap is the user gesture iOS requires before audio can
 * play, so it is not skippable decoration.
 */
export class BootScreen extends DomScreen {
  constructor(
    private readonly vm: { title: string; tagline: string },
    private readonly onStart: () => void,
  ) {
    super();
  }

  protected render(): HTMLElement {
    const el = h(
      'div',
      { class: 'screen boot-screen' },
      backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { seed: 4 }), this.disposer),
      petals(12),
      h('div', { class: 'boot__stack' }, logo(this.vm.title), h('p', { class: 'tagline', text: this.vm.tagline })),
      h('div', { class: 'tap-hint' }, h('span', { class: 'tap-hint__dot' }), 'Tap anywhere to begin'),
    );
    let started = false;
    this.disposer.listen(el, 'click', () => {
      if (started) return;
      started = true;
      this.onStart();
    });
    return el;
  }
}
