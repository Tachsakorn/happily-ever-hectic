import { paintMenuBackdrop } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { button, countUp, h } from '../dom';
import { backdrop, itemIcon, uiIcon } from '../paint';
import { coinBadge, ribbon, settingsToggles, starCanvas, type SettingsVM, type UiCue } from './common';

/** In-play overlay: just the pause button (the HUD itself is drawn in the game canvas). */
export class PlayingScreen extends DomScreen {
  constructor(private readonly onPause: () => void) {
    super();
  }

  protected render(): HTMLElement {
    const btn = button('', this.onPause, this.disposer, { tone: 'cream', size: 'round', icon: uiIcon('pause', 0xffffff, 36), aria: 'Pause', className: 'pause-btn' });
    // The wrapper ignores touches so the game canvas underneath keeps receiving them.
    return h('div', { class: 'playing-overlay' }, btn);
  }
}

export class PauseScreen extends DomScreen {
  constructor(
    private readonly vm: { settings: SettingsVM; levelName: string },
    private readonly actions: { resume: () => void; restart: () => void; quit: () => void; settings: (s: SettingsVM) => void },
  ) {
    super();
  }

  protected render(): HTMLElement {
    return h(
      'div',
      { class: 'screen pause-screen' },
      h('div', { class: 'screen__scrim' }),
      h(
        'div',
        { class: 'panel pop pause-card' },
        ribbon('Paused', 'rose'),
        h('p', { class: 'pause-card__level', text: this.vm.levelName }),
        button('Resume', this.actions.resume, this.disposer, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 36) }),
        h(
          'div',
          { class: 'pause-card__row' },
          button('Restart', this.actions.restart, this.disposer, { tone: 'cream', icon: uiIcon('replay', 0xe86f8e, 32) }),
          button('Map', this.actions.quit, this.disposer, { tone: 'cream', icon: uiIcon('map', 0xe86f8e, 32) }),
        ),
        settingsToggles(this.vm.settings, this.actions.settings, this.disposer),
      ),
    );
  }
}

export interface ResultsVM {
  readonly levelName: string;
  readonly success: boolean;
  readonly score: number;
  readonly stars: number;
  readonly newBest: boolean;
  readonly coinsEarned: number;
  readonly coins: number;
  readonly finalMood: number;
  readonly stats: readonly { label: string; value: string }[];
  readonly moodBreakdown: readonly { cause: string; amount: number }[];
  readonly unlocked: readonly string[];
  readonly hasNext: boolean;
  readonly firstStarScore: number;
}

const STAR_START_MS = 700;
const STAR_STEP_MS = 420;
const SCORE_COUNT_MS = 1100;

/** The wedding report: stars, score, and — most importantly — what made the couple happy or stressed. */
export class ResultsScreen extends DomScreen {
  constructor(
    private readonly vm: ResultsVM,
    private readonly actions: { retry: () => void; next: () => void; map: () => void; cue?: (cue: UiCue) => void },
  ) {
    super();
  }

  private heading(): { text: string; tone: 'rose' | 'gold' | 'sage' } {
    if (!this.vm.success) return { text: 'Oh no…', tone: 'rose' };
    if (this.vm.stars === 3) return { text: 'Perfect wedding!', tone: 'gold' };
    return this.vm.stars > 0 ? { text: 'Happily ever after!', tone: 'sage' } : { text: 'Almost there…', tone: 'rose' };
  }

  private subheading(): string {
    const vm = this.vm;
    if (!vm.success) return 'The couple ran out of patience. Try a different plan!';
    if (vm.stars === 0) return `The wedding survived, but it needs ${vm.firstStarScore.toLocaleString('en-US')} points for a star.`;
    return vm.levelName;
  }

  protected render(): HTMLElement {
    const vm = this.vm;
    const cue = this.actions.cue ?? (() => {});
    const heading = this.heading();
    const celebrate = vm.success && vm.stars > 0;

    const stars = [0, 1, 2].map((i) => {
      const slot = h('span', { class: `result-star result-star--${i}` }, starCanvas(false, i === 1 ? 104 : 84));
      if (i < vm.stars) {
        const on = starCanvas(true, i === 1 ? 104 : 84);
        on.classList.add('result-star__on');
        on.style.animationDelay = `${STAR_START_MS + i * STAR_STEP_MS}ms`;
        slot.append(on);
        this.disposer.timeout(() => cue('star'), STAR_START_MS + i * STAR_STEP_MS + 120);
      }
      return slot;
    });

    const score = h('div', { class: 'results__score display', text: '0' });
    this.disposer.timeout(() => countUp(score, vm.score, SCORE_COUNT_MS, this.disposer), 250);
    const afterStars = STAR_START_MS + Math.max(1, vm.stars) * STAR_STEP_MS + 200;
    if (vm.coinsEarned) this.disposer.timeout(() => cue('coin'), afterStars);
    if (celebrate) this.disposer.timeout(() => cue('cheer'), afterStars + 250);

    const breakdown = vm.moodBreakdown.slice(0, 6);
    const moodTone = vm.finalMood > 60 ? 'good' : vm.finalMood > 30 ? 'warn' : 'bad';

    const next = vm.hasNext && vm.stars > 0;
    return h(
      'div',
      { class: `screen results-screen${celebrate ? ' is-celebrating' : ''}` },
      backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { archAt: celebrate ? 0.5 : undefined, seed: 41 }), this.disposer),
      h('div', { class: 'screen__veil' }),
      celebrate ? this.confetti() : null,
      h('div', { class: 'topbar' }, h('span'), coinBadge(vm.coins)),
      h(
        'div',
        { class: 'results' },
        h(
          'div',
          { class: 'panel pop results__main' },
          ribbon(heading.text, heading.tone, 'h1'),
          h('p', { class: 'results__sub', text: this.subheading() }),
          h('div', { class: 'results__stars' }, ...stars),
          score,
          h(
            'div',
            { class: 'results__chips' },
            vm.newBest && vm.stars > 0 ? h('span', { class: 'stamp', style: `animation-delay:${afterStars}ms`, text: 'New best!' }) : null,
            vm.coinsEarned ? h('span', { class: 'chip chip--coin', style: `animation-delay:${afterStars}ms` }, itemIcon('coin', 0xf2b84b, 26), `+${vm.coinsEarned}`) : null,
            ...vm.unlocked.map((u) => h('span', { class: 'chip chip--unlock', style: `animation-delay:${afterStars + 200}ms` }, uiIcon('map', 0xe86f8e, 24), `${u} unlocked`)),
          ),
          h(
            'div',
            { class: 'results__actions' },
            button('Retry', this.actions.retry, this.disposer, { tone: 'cream', icon: uiIcon('replay', 0xe86f8e, 30) }),
            button('Map', this.actions.map, this.disposer, { tone: next ? 'cream' : 'go', icon: uiIcon('map', next ? 0xe86f8e : 0xffffff, 30) }),
            next ? button('Next', this.actions.next, this.disposer, { tone: 'go', icon: uiIcon('next', 0xffffff, 30) }) : null,
          ),
        ),
        h(
          'div',
          { class: 'results__side' },
          h(
            'div',
            { class: 'panel pop results__mood', style: 'animation-delay: 160ms' },
            h('h3', { class: 'display' }, uiIcon('heart', 0xe86f8e, 30), 'Couple mood', h('span', { class: `mood-pill mood-pill--${moodTone}`, text: `${vm.finalMood}` })),
            h(
              'ul',
              { class: 'ledger' },
              ...(breakdown.length
                ? breakdown.map((b) =>
                    h('li', { class: b.amount > 0 ? 'plus' : 'minus' }, h('span', { text: b.cause }), h('b', { text: `${b.amount > 0 ? '+' : '−'}${Math.abs(b.amount)}` })),
                  )
                : [h('li', { class: 'ledger__empty' }, h('span', { text: 'A calm day: nothing moved their mood.' }))]),
            ),
          ),
          h(
            'div',
            { class: 'panel pop results__stats', style: 'animation-delay: 240ms' },
            h('ul', { class: 'ledger ledger--stats' }, ...vm.stats.map((s) => h('li', {}, h('span', { text: s.label }), h('b', { text: s.value })))),
          ),
        ),
      ),
    );
  }

  /** A fixed set of CSS-animated paper pieces; nothing runs per frame in script. */
  private confetti(): HTMLElement {
    const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    const colors = ['#e86f8e', '#f2b84b', '#8fd0e8', '#7fb08a', '#fffaf0', '#f7b7c6'];
    for (let i = 0; i < 36; i++) {
      const bit = h('i');
      bit.style.left = `${(i * 29 + 3) % 100}%`;
      bit.style.background = colors[i % colors.length]!;
      bit.style.animationDelay = `${900 + ((i * 97) % 1400)}ms`;
      bit.style.animationDuration = `${2.8 + ((i * 13) % 20) / 10}s`;
      bit.style.setProperty('--drift', `${((i * 41) % 120) - 60}px`);
      bit.style.setProperty('--spin', `${360 + ((i * 53) % 720)}deg`);
      if (i % 3 === 0) bit.classList.add('is-round');
      wrap.append(bit);
    }
    return wrap;
  }
}
