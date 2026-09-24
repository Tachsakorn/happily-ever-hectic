import { DomScreen } from '../Screen';
import { button, h } from '../dom';

export interface DecorOptionVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly loved: boolean;
}

export interface PrepVM {
  readonly levelName: string;
  readonly couple: string;
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
 * Wedding preparation: read the brief, then choose the decor. Decor the
 * couple loves starts them happier and boosts the score — a small, readable
 * decision before the chaos starts.
 */
export class PrepScreen extends DomScreen {
  private selected: string;

  constructor(
    private readonly vm: PrepVM,
    private readonly actions: { start: (decorId: string) => void; back: () => void },
  ) {
    super();
    this.selected = vm.decor[0]?.id ?? '';
  }

  protected render(): HTMLElement {
    const options = this.vm.decor.map((d) => {
      const el = h(
        'button',
        { class: `decor-option${d.id === this.selected ? ' is-selected' : ''}`, type: 'button' },
        h('span', { class: 'swatch', style: `background:${d.color}` }),
        h('span', {}, h('strong', { text: d.name }), h('small', { text: d.description }), d.loved ? h('span', { class: 'love-tag', text: '♥ They love this!' }) : null),
      );
      this.disposer.listen(el, 'click', () => {
        this.selected = d.id;
        for (const o of options) o.el.classList.toggle('is-selected', o.id === d.id);
      });
      return { id: d.id, el };
    });

    const list = (items: readonly string[], empty: string) => (items.length ? items.join(', ') : empty);
    return h(
      'div',
      { class: 'screen screen--scroll menu-screen' },
      h('div', { class: 'topbar' }, button('‹ Back', this.actions.back, this.disposer, 'small-secondary'), h('span')),
      h('div', { style: 'height: 56px' }),
      h('h2', { class: 'h2', text: this.vm.levelName }),
      h('p', { class: 'subtitle', text: this.vm.couple }),
      h(
        'div',
        { class: 'prep' },
        h(
          'div',
          { class: 'card brief' },
          h('h3', { text: 'The brief' }),
          h('p', { text: `${this.vm.guestCount} guests · ${this.vm.minutes} reception` }),
          h('p', { text: `Moments: ${list(this.vm.moments, 'none — just keep everyone happy')}` }),
          h('p', { text: `Watch out for: ${list(this.vm.disasters, 'nothing, hopefully!')}` }),
          h('p', { text: `Your upgrades: ${list(this.vm.upgrades, 'none yet')}` }),
          h('p', { text: `Stars at ${this.vm.starScores.map((s) => s.toLocaleString('en-US')).join(' · ')}` }),
          h('h3', { text: 'The couple loves', style: 'margin-top:14px' }),
          h('div', { class: 'chips' }, ...this.vm.loves.map((l) => h('span', { class: 'chip', text: l }))),
        ),
        h('div', { class: 'card decor' }, h('h3', { text: 'Choose the decor' }), h('div', { class: 'decor-grid' }, ...options.map((o) => o.el))),
      ),
      button('Start the reception', () => this.actions.start(this.selected), this.disposer),
    );
  }
}
