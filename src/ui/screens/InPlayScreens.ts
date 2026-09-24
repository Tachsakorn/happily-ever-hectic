import { DomScreen } from '../Screen';
import { button, h } from '../dom';
import { settingsToggles, type SettingsVM } from './MainMenuScreen';
import { coinsElement } from './LevelSelectScreen';

/** In-play overlay: just the pause button (the HUD itself is drawn in the game canvas). */
export class PlayingScreen extends DomScreen {
  constructor(private readonly onPause: () => void) {
    super();
  }

  protected render(): HTMLElement {
    const btn = h('button', { class: 'pause-btn', type: 'button', 'aria-label': 'Pause', style: 'pointer-events:auto' }, 'II');
    this.disposer.listen(btn, 'click', this.onPause);
    // The wrapper ignores touches so the game canvas underneath keeps receiving them.
    return h('div', { style: 'position:absolute; inset:0; pointer-events:none' }, btn);
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
      { class: 'screen screen--dim' },
      h(
        'div',
        { class: 'card', style: 'display:flex; flex-direction:column; gap:16px; align-items:center; min-width: min(420px, 90vw)' },
        h('h2', { class: 'h2', text: 'Paused' }),
        h('p', { class: 'subtitle', text: this.vm.levelName }),
        button('Resume', this.actions.resume, this.disposer),
        button('Restart wedding', this.actions.restart, this.disposer, 'secondary'),
        button('Quit to map', this.actions.quit, this.disposer, 'secondary'),
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

/** The wedding report: stars, score, and — most importantly — what made the couple happy or stressed. */
export class ResultsScreen extends DomScreen {
  constructor(
    private readonly vm: ResultsVM,
    private readonly actions: { retry: () => void; next: () => void; map: () => void },
  ) {
    super();
  }

  private heading(): string {
    if (!this.vm.success) return 'Oh no…';
    return this.vm.stars > 0 ? 'Happily ever after!' : 'Almost there…';
  }

  private subheading(): string {
    const vm = this.vm;
    if (!vm.success) return 'The couple ran out of patience. Try a different plan!';
    if (vm.stars === 0) return `The wedding survived, but it needs ${vm.firstStarScore.toLocaleString('en-US')} points for a star.`;
    return vm.levelName;
  }

  protected render(): HTMLElement {
    const vm = this.vm;
    const breakdown = vm.moodBreakdown.slice(0, 7);
    return h(
      'div',
      { class: 'screen screen--scroll menu-screen' },
      h('div', { class: 'topbar' }, h('span'), coinsElement(vm.coins)),
      h('div', { style: 'height: 40px' }),
      h('h2', { class: 'title', style: 'font-size: clamp(40px, 6vw, 72px)', text: this.heading() }),
      h('p', { class: 'subtitle', text: this.subheading() }),
      h(
        'div',
        { class: 'results' },
        h('div', { class: 'results__stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < vm.stars ? 'on' : '', text: '★' }))),
        h('div', { class: 'results__score', text: vm.score.toLocaleString('en-US') }),
        vm.newBest && vm.stars > 0 ? h('p', { class: 'subtitle', text: '✨ New best score!' }) : null,
        vm.coinsEarned ? h('p', { class: 'subtitle', text: `+${vm.coinsEarned} coins` }) : null,
        vm.unlocked.length ? h('p', { class: 'subtitle', text: `Unlocked: ${vm.unlocked.join(', ')}` }) : null,
        h(
          'div',
          { class: 'results__cols' },
          h(
            'div',
            { class: 'card' },
            h('h3', { class: 'subtitle', style: 'text-align:left; margin:0 0 10px', text: `Couple's mood: ${vm.finalMood}/100` }),
            h(
              'dl',
              { class: 'kv' },
              ...breakdown.flatMap((b) => [
                h('dt', { text: b.cause }),
                h('dd', { class: b.amount > 0 ? 'plus' : 'minus', text: `${b.amount > 0 ? '+' : '−'}${Math.abs(b.amount)}` }),
              ]),
            ),
          ),
          h('div', { class: 'card' }, h('dl', { class: 'kv' }, ...vm.stats.flatMap((s) => [h('dt', { text: s.label }), h('dd', { text: s.value })]))),
        ),
        h(
          'div',
          { class: 'row' },
          button('Try again', this.actions.retry, this.disposer, 'secondary'),
          vm.hasNext && vm.stars > 0 ? button('Next wedding', this.actions.next, this.disposer) : null,
          button('Wedding map', this.actions.map, this.disposer, vm.hasNext && vm.stars > 0 ? 'secondary' : 'primary'),
        ),
      ),
    );
  }
}
