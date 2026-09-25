import type { PersonLook } from '../../art/people';
import { paintMenuBackdrop } from '../../art/scenery';
import { paintPlanTile, PLAN_TILE_SIZE } from '../../art/planTiles';
import type { PlanCategory } from '../../content/types';
import { DomScreen } from '../Screen';
import { button, Disposer, h, onTap } from '../dom';
import { backdrop, paintedCanvas, portrait, uiIcon } from '../paint';
import { backButton, ribbon, starCanvas } from './common';

export interface PlanOptionVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly color: number;
  readonly accent?: number;
  readonly icon?: string;
}

export interface PlanStepVM {
  readonly category: PlanCategory;
  readonly title: string;
  /** The couple's clue for this choice. */
  readonly hint: string;
  readonly options: readonly PlanOptionVM[];
}

export interface PrepVM {
  readonly levelName: string;
  readonly couple: string;
  readonly partners: readonly [PersonLook, PersonLook];
  readonly minutes: string;
  readonly guestCount: number;
  readonly moments: readonly string[];
  readonly disasters: readonly string[];
  readonly upgrades: readonly string[];
  readonly steps: readonly PlanStepVM[];
  readonly goals: readonly { text: string; done: boolean }[];
  readonly starScores: readonly number[];
}

type PlanPicks = Partial<Record<PlanCategory, string>>;

/**
 * Wedding preparation: read the invitation, then plan the wedding one choice
 * at a time (flowers, menu, cake, honeymoon). Each step shows the couple's
 * clue; picks that match what they love start them happier and add score.
 * Which picks were right is only revealed when the reception starts.
 */
export class PrepScreen extends DomScreen {
  private step = 0;
  private readonly picks: PlanPicks = {};
  private panel: HTMLElement | null = null;
  /** Listeners of the current step's tiles and buttons, released when the step changes. */
  private stepDisposer = new Disposer();

  constructor(
    private readonly vm: PrepVM,
    private readonly actions: { start: (plan: PlanPicks) => void; back: () => void; cue?: (cue: 'pop') => void },
  ) {
    super();
    this.disposer.add(() => this.stepDisposer.dispose());
    for (const st of vm.steps) {
      const first = st.options[0];
      if (first) this.picks[st.category] = first.id;
    }
  }

  protected render(): HTMLElement {
    const vm = this.vm;
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
        vm.moments.length ? line('play', 'Moments', list(vm.moments, '')) : null,
        line('warning', 'Watch out', list(vm.disasters, 'nothing, hopefully')),
        vm.upgrades.length ? line('shop', 'Your perks', list(vm.upgrades, '')) : null,
      ),
      h(
        'div',
        { class: 'invite__targets' },
        ...vm.starScores.map((sc, i) => h('span', { class: 'invite__target' }, ...Array.from({ length: i + 1 }, () => starCanvas(true, 20)), h('b', { text: sc.toLocaleString('en-US') }))),
      ),
      vm.goals.length
        ? h(
            'div',
            { class: 'invite__goals' },
            h('span', { class: 'invite__goals-title', text: 'Bonus goals' }),
            ...vm.goals.map((g) => h('span', { class: `goal-chip${g.done ? ' is-done' : ''}` }, uiIcon(g.done ? 'check' : 'star', g.done ? 0x7fb08a : 0xf2b84b, 20), g.text)),
          )
        : null,
    );

    this.panel = h('section', { class: 'panel decor pop', style: 'animation-delay: 90ms' });
    this.fillPanel();

    return h(
      'div',
      { class: 'screen prep-screen' },
      backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { seed: 23 }), this.disposer),
      h('div', { class: 'screen__veil' }),
      h('div', { class: 'topbar' }, backButton(this.actions.back, this.disposer), ribbon(vm.levelName, 'sage', 'h1'), h('span', { class: 'topbar__spacer' })),
      h('div', { class: 'prep' }, invitation, this.panel),
    );
  }

  /** (Re)builds the planning panel for the current step. */
  private fillPanel(): void {
    const panel = this.panel;
    if (!panel) return;
    this.stepDisposer.dispose();
    this.stepDisposer = new Disposer();
    const d = this.stepDisposer;
    const vm = this.vm;
    const last = this.step >= vm.steps.length - 1;
    const step = vm.steps[this.step];
    const start = () => this.actions.start({ ...this.picks });
    if (!step) {
      panel.replaceChildren(
        h('h3', { class: 'decor__title display', text: 'All set!' }),
        button('Start!', start, d, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 38), className: 'prep__start' }),
      );
      return;
    }

    const tiles = step.options.map((o, i) => {
      const selected = this.picks[step.category] === o.id;
      const el = h(
        'button',
        { class: `decor-tile${selected ? ' is-selected' : ''}`, type: 'button', 'aria-pressed': String(selected) },
        h('span', { class: 'decor-tile__art' }, paintedCanvas(paintPlanTile(o.icon, o.color, o.accent), PLAN_TILE_SIZE, PLAN_TILE_SIZE, 96, 96)),
        h('strong', { class: 'decor-tile__name', text: o.name }),
        h('small', { class: 'decor-tile__desc', text: o.description }),
        h('span', { class: 'decor-tile__check' }, uiIcon('check', 0xffffff, 26)),
      );
      el.style.animationDelay = `${60 + i * 60}ms`;
      onTap(el, () => {
        this.picks[step.category] = o.id;
        this.actions.cue?.('pop');
        for (const t of tiles) {
          const on = t.id === o.id;
          t.el.classList.toggle('is-selected', on);
          t.el.setAttribute('aria-pressed', String(on));
        }
      }, d);
      return { id: o.id, el };
    });

    const dots = h(
      'div',
      { class: 'plan-steps', 'aria-label': `Step ${this.step + 1} of ${vm.steps.length}` },
      ...vm.steps.map((_, i) => h('span', { class: `plan-steps__dot${i === this.step ? ' is-current' : i < this.step ? ' is-done' : ''}` })),
    );
    const go = (delta: number) => {
      this.step = Math.max(0, Math.min(vm.steps.length - 1, this.step + delta));
      this.fillPanel();
    };
    const children: HTMLElement[] = [dots, h('h3', { class: 'decor__title display', text: step.title })];
    if (step.hint) children.push(h('p', { class: 'plan-hint' }, uiIcon('heart', 0xe86f8e, 22), h('span', { text: step.hint })));
    children.push(
      h('div', { class: 'decor-grid' }, ...tiles.map((t) => t.el)),
      h(
        'div',
        { class: 'plan-nav' },
        this.step > 0 ? button('Back', () => go(-1), d, { tone: 'cream', size: 'small', icon: uiIcon('back', 0xe86f8e, 24) }) : null,
        last
          ? button('Start!', start, d, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 38), className: 'prep__start' })
          : button('Next', () => go(1), d, { tone: 'go', icon: uiIcon('next', 0xffffff, 30), className: 'prep__start' }),
      ),
    );
    panel.replaceChildren(...children);
  }
}
