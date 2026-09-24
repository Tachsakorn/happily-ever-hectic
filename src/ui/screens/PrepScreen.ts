import type { PersonLook } from '../../art/people';
import { paintDecorTile, paintMenuBackdrop } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { button, h } from '../dom';
import { backdrop, paintedCanvas, portrait, uiIcon } from '../paint';
import { backButton, ribbon, starCanvas } from './common';

export interface DecorOptionVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly color: number;
  readonly icon?: string;
  readonly loved: boolean;
}

export interface PrepVM {
  readonly levelName: string;
  readonly couple: string;
  readonly partners: readonly [PersonLook, PersonLook];
  readonly minutes: string;
  readonly guestCount: number;
  readonly loves: readonly string[];
  readonly moments: readonly string[];
  readonly disasters: readonly string[];
  readonly upgrades: readonly string[];
  readonly decor: readonly DecorOptionVM[];
  readonly starScores: readonly number[];
}

/**
 * Wedding preparation: read the invitation, then choose the decor. Decor the
 * couple loves starts them happier and boosts the score — a small, readable
 * decision before the chaos starts.
 */
export class PrepScreen extends DomScreen {
  private selected: string;

  constructor(
    private readonly vm: PrepVM,
    private readonly actions: { start: (decorId: string) => void; back: () => void; cue?: (cue: 'pop') => void },
  ) {
    super();
    this.selected = vm.decor[0]?.id ?? '';
  }

  protected render(): HTMLElement {
    const vm = this.vm;
    const tiles = vm.decor.map((d, i) => {
      const el = h(
        'button',
        { class: `decor-tile${d.id === this.selected ? ' is-selected' : ''}`, type: 'button', 'aria-pressed': String(d.id === this.selected) },
        h('span', { class: 'decor-tile__art' }, paintedCanvas(paintDecorTile(d.icon, d.color), 120, 120, 96, 96)),
        h('strong', { class: 'decor-tile__name', text: d.name }),
        h('small', { class: 'decor-tile__desc', text: d.description }),
        d.loved ? h('span', { class: 'decor-tile__love' }, uiIcon('heart', 0xe86f8e, 22), 'They love it') : null,
        h('span', { class: 'decor-tile__check' }, uiIcon('check', 0xffffff, 26)),
      );
      el.style.animationDelay = `${160 + i * 70}ms`;
      this.disposer.listen(el, 'click', () => {
        this.selected = d.id;
        this.actions.cue?.('pop');
        for (const t of tiles) {
          const on = t.id === d.id;
          t.el.classList.toggle('is-selected', on);
          t.el.setAttribute('aria-pressed', String(on));
        }
      });
      return { id: d.id, el };
    });

    const line = (icon: Parameters<typeof uiIcon>[0], label: string, value: string) =>
      h('li', {}, uiIcon(icon, 0xe86f8e, 34), h('span', { class: 'invite__label', text: label }), h('span', { class: 'invite__value', text: value }));
    const list = (items: readonly string[], empty: string) => (items.length ? items.join(', ') : empty);

    const invitation = h(
      'section',
      { class: 'panel invite pop' },
      h('div', { class: 'invite__portraits' }, portrait(vm.partners[0], 104, 'portrait portrait--round'), portrait(vm.partners[1], 104, 'portrait portrait--round')),
      h('p', { class: 'invite__eyebrow', text: 'You are planning the wedding of' }),
      h('h2', { class: 'invite__names display', text: vm.couple }),
      h('div', { class: 'invite__rule' }),
      h(
        'ul',
        { class: 'invite__details' },
        line('clock', 'Reception', vm.minutes),
        line('guests', 'Guests', String(vm.guestCount)),
        line('heart', 'They love', list(vm.loves, 'anything pretty')),
        vm.moments.length ? line('play', 'Moments', list(vm.moments, '')) : null,
        line('warning', 'Watch out', list(vm.disasters, 'nothing, hopefully')),
        vm.upgrades.length ? line('shop', 'Your perks', list(vm.upgrades, '')) : null,
      ),
      h(
        'div',
        { class: 'invite__targets' },
        ...vm.starScores.map((s, i) => h('span', { class: 'invite__target' }, ...Array.from({ length: i + 1 }, () => starCanvas(true, 20)), h('b', { text: s.toLocaleString('en-US') }))),
      ),
    );

    return h(
      'div',
      { class: 'screen prep-screen' },
      backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { seed: 23 }), this.disposer),
      h('div', { class: 'screen__veil' }),
      h('div', { class: 'topbar' }, backButton(this.actions.back, this.disposer), ribbon(vm.levelName, 'sage', 'h1'), h('span', { class: 'topbar__spacer' })),
      h(
        'div',
        { class: 'prep' },
        invitation,
        h(
          'section',
          { class: 'panel decor pop', style: 'animation-delay: 90ms' },
          h('h3', { class: 'decor__title display', text: 'Pick the decor' }),
          h('p', { class: 'decor__hint', text: 'Decor the couple loves starts them happier and adds bonus points.' }),
          h('div', { class: 'decor-grid' }, ...tiles.map((t) => t.el)),
          button('Start!', () => this.actions.start(this.selected), this.disposer, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 38), className: 'prep__start' }),
        ),
      ),
    );
  }
}
