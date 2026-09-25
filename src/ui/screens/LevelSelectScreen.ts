import { plannerLook } from '../../art/characters';
import { heartPath } from '../../art/items';
import { flat, hex, toon } from '../../art/canvas';
import { isUiIcon } from '../../art/props';
import { paintMapBackdrop, type Point } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { button, h } from '../dom';
import { backdrop, itemIcon, paintedCanvas, portrait, uiIcon } from '../paint';
import { achievementsPanel, type AchievementsVM } from './AchievementsPanel';
import { backButton, coinBadge, ribbon, starRow, type UiCue } from './common';

export { coinBadge as coinsElement, starRow as starsElement } from './common';

export interface LevelCardVM {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly couple: string;
  readonly stars: number;
  readonly bestScore: number;
  readonly unlocked: boolean;
  readonly isFinal: boolean;
}

export interface ShopItemVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly owned: boolean;
  readonly icon?: string;
}

interface MapVM {
  readonly levels: readonly LevelCardVM[];
  readonly coins: number;
  readonly shop: readonly ShopItemVM[];
  readonly achievements: AchievementsVM;
  readonly testTools?: boolean;
}

/** What a purchase changes on the map. */
export interface PurchaseVM {
  readonly coins: number;
  readonly shop: readonly ShopItemVM[];
  readonly achievements: AchievementsVM;
  /** Names of achievements the purchase unlocked. */
  readonly newAchievements: readonly string[];
}

export type MapTestAction = 'unlockAll' | 'coins' | 'reset';

/** Stops along the garden path, as fractions of the map. Shared by the painter and the DOM nodes. */
function stopFractions(n: number): Point[] {
  const ys = [0.74, 0.46, 0.7, 0.4, 0.66, 0.44, 0.72, 0.42];
  return Array.from({ length: n }, (_, i) => ({ x: n === 1 ? 0.5 : 0.1 + (0.8 * i) / (n - 1), y: ys[i % ys.length]! }));
}

function heartNode(size: number): HTMLCanvasElement {
  return paintedCanvas(
    (c) => {
      c.fillStyle = hex(0x3b2640);
      c.save();
      c.translate(0, 6);
      c.fill(heartPath(2.6, 50, 48));
      c.restore();
      toon(c, heartPath(2.6, 50, 48), 0xe86f8e, { x: 8, y: 8, w: 84, h: 80 }, { line: 3.4 });
      flat(c, heartPath(0.9, 50, 46), 0xf7b7c6, 0);
    },
    100,
    100,
    size,
    size,
    'map-node__heart',
  );
}

/** The wedding map: a garden path from wedding to wedding, with a shop at the gate. */
export class LevelSelectScreen extends DomScreen {
  private modal: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private coinSlot: HTMLElement | null = null;
  private trophyBtn: HTMLButtonElement | null = null;

  constructor(
    private vm: MapVM,
    private readonly actions: {
      pick: (id: string) => void;
      back: () => void;
      buy: (id: string) => PurchaseVM | null;
      cue?: (cue: UiCue) => void;
      test?: (action: MapTestAction) => void;
    },
  ) {
    super();
  }

  protected render(): HTMLElement {
    const levels = this.vm.levels;
    const fractions = stopFractions(levels.length);
    const reached = levels.filter((l) => l.unlocked).length;
    // The next wedding to play: first unlocked one without stars, else the last unlocked.
    const current = levels.find((l) => l.unlocked && l.stars === 0) ?? [...levels].reverse().find((l) => l.unlocked);

    const nodes = levels.map((l, i) => this.node(l, fractions[i]!, l === current, i));
    this.coinSlot = h('div', { class: 'coin-slot' }, coinBadge(this.vm.coins));
    const shopBtn = button('Shop', () => this.openShop(), this.disposer, { tone: 'gold', size: 'small', icon: uiIcon('shop', 0xe86f8e, 34) });
    this.trophyBtn = button(`${this.vm.achievements.unlocked}/${this.vm.achievements.total}`, () => this.openAchievements(), this.disposer, {
      tone: 'cream',
      size: 'small',
      icon: uiIcon('trophy', 0xf2b84b, 34),
      aria: 'Achievements',
    });

    this.root = h(
      'div',
      { class: 'screen map-screen' },
      backdrop((w, hgt) => paintMapBackdrop(w, hgt, fractions.map((f) => ({ x: f.x * w, y: f.y * hgt })), reached), this.disposer),
      h('div', { class: 'map-nodes' }, ...nodes),
      h(
        'div',
        { class: 'topbar' },
        h(
          'div',
          { class: 'group' },
          backButton(this.actions.back, this.disposer),
          this.vm.testTools ? button('', () => this.openTestTools(), this.disposer, { tone: 'cream', size: 'round', icon: uiIcon('wrench', 0x8fd0e8, 38), aria: 'Test tools' }) : null,
        ),
        ribbon('Wedding Map', 'sage', 'h1'),
        h('div', { class: 'group' }, this.trophyBtn, this.coinSlot, shopBtn),
      ),
    );
    return this.root;
  }

  private node(l: LevelCardVM, at: Point, isCurrent: boolean, index: number): HTMLElement {
    const state = !l.unlocked ? 'is-locked' : l.stars > 0 ? 'is-done' : 'is-open';
    const face = l.isFinal ? heartNode(118) : h('span', { class: 'map-node__num', text: String(l.number) });
    const btn = h(
      'button',
      {
        class: `map-node ${state}${l.isFinal ? ' is-final' : ''}${isCurrent ? ' is-current' : ''}`,
        type: 'button',
        'aria-label': `${l.isFinal ? 'The big day' : `Wedding ${l.number}`}: ${l.name}${l.unlocked ? '' : ' (locked)'}`,
      },
      face,
      l.unlocked ? null : h('span', { class: 'map-node__lock' }, uiIcon('lock', 0xffffff, 40)),
    );
    btn.style.animationDelay = `${120 + index * 70}ms`;
    this.disposer.listen(btn, 'click', () => {
      if (!l.unlocked) {
        btn.classList.remove('is-shaking');
        void btn.offsetWidth;
        btn.classList.add('is-shaking');
        return;
      }
      this.actions.cue?.('pop');
      this.openLevel(l);
    });
    return h(
      'div',
      { class: 'map-stop', style: `left:${at.x * 100}%; top:${at.y * 100}%` },
      isCurrent ? h('div', { class: 'map-pin' }, portrait(plannerLook('happy'), 58, 'map-pin__face')) : null,
      btn,
      l.unlocked ? starRow(l.stars, 24, 'star-row map-stop__stars') : null,
      h('div', { class: 'map-stop__label', text: l.isFinal ? 'The big day' : l.name }),
    );
  }

  private openModal(content: HTMLElement): void {
    this.closeModal();
    const scrim = h('div', { class: 'modal' }, content);
    this.disposer.listen(scrim, 'click', (e) => {
      if (e.target === scrim) this.closeModal();
    });
    this.modal = scrim;
    this.root?.append(scrim);
  }

  private closeModal(): void {
    this.modal?.remove();
    this.modal = null;
  }

  private openLevel(l: LevelCardVM): void {
    const close = button('', () => this.closeModal(), this.disposer, { tone: 'cream', size: 'round', icon: uiIcon('close', 0xffffff, 34), aria: 'Close', className: 'panel__close' });
    this.openModal(
      h(
        'div',
        { class: 'panel pop level-pop' },
        close,
        h('div', { class: 'level-pop__eyebrow', text: l.isFinal ? 'The big day' : `Wedding ${l.number}` }),
        ribbon(l.name, l.isFinal ? 'rose' : 'sage'),
        h('p', { class: 'level-pop__couple display', text: l.couple }),
        starRow(l.stars, 54, 'star-row level-pop__stars'),
        h('p', { class: 'level-pop__best', text: l.bestScore > 0 ? `Best score ${l.bestScore.toLocaleString('en-US')}` : 'Not played yet' }),
        button('Plan it!', () => this.actions.pick(l.id), this.disposer, { tone: 'go', size: 'big', icon: uiIcon('play', 0xffffff, 38) }),
      ),
    );
  }

  private openTestTools(): void {
    const test = this.actions.test;
    if (!test) return;
    let armed = false;
    const reset = button('Reset progress', () => {
      if (!armed) {
        armed = true;
        reset.querySelector('span')!.textContent = 'Tap again to reset';
        return;
      }
      test('reset');
    }, this.disposer, { tone: 'rose' });
    const close = button('', () => this.closeModal(), this.disposer, { tone: 'cream', size: 'round', icon: uiIcon('close', 0xffffff, 34), aria: 'Close', className: 'panel__close' });
    this.openModal(
      h(
        'div',
        { class: 'panel pop test-tools' },
        close,
        ribbon('Test tools', 'gold'),
        h('p', { class: 'shop__hint', text: 'For playtesting. Tap the title five times to hide these again.' }),
        button('Unlock every wedding', () => test('unlockAll'), this.disposer, { tone: 'go', icon: uiIcon('map', 0xe86f8e, 30) }),
        button('+500 coins', () => test('coins'), this.disposer, { tone: 'gold', icon: itemIcon('coin', 0xf2b84b, 30) }),
        reset,
      ),
    );
  }

  private refreshTrophyCount(): void {
    const label = this.trophyBtn?.querySelector('span');
    if (label) label.textContent = `${this.vm.achievements.unlocked}/${this.vm.achievements.total}`;
  }

  /** A short "Achievement unlocked" note over the map. */
  private toast(name: string): void {
    this.actions.cue?.('achievement');
    const note = h('div', { class: 'toast' }, uiIcon('trophy', 0xf2b84b, 30), h('span', { text: `Achievement unlocked: ${name}` }));
    this.root?.append(note);
    this.disposer.timeout(() => note.remove(), 2800);
  }

  private openAchievements(): void {
    this.actions.cue?.('pop');
    this.openModal(achievementsPanel(this.vm.achievements, () => this.closeModal(), this.disposer));
  }

  private openShop(): void {
    this.actions.cue?.('pop');
    const list = h('div', { class: 'shop-list', 'data-scrollable': '' });
    const paintList = () => {
      list.replaceChildren(
        ...this.vm.shop.map((item) => {
          const buy = item.owned
            ? h('span', { class: 'chip chip--owned' }, uiIcon('check', 0xffffff, 22), 'Owned')
            : button(String(item.cost), () => {
                const next = this.actions.buy(item.id);
                if (!next) return;
                this.vm = { ...this.vm, coins: next.coins, shop: next.shop, achievements: next.achievements };
                this.coinSlot?.replaceChildren(coinBadge(next.coins));
                this.refreshTrophyCount();
                for (const name of next.newAchievements) this.toast(name);
                paintList();
              }, this.disposer, { tone: 'gold', size: 'small', icon: itemIcon('coin', 0xf2b84b, 30) });
          if (buy instanceof HTMLButtonElement) buy.disabled = item.cost > this.vm.coins;
          return h(
            'div',
            { class: `shop-item${item.owned ? ' is-owned' : ''}` },
            h('div', { class: 'shop-item__icon' }, uiIcon(isUiIcon(item.icon) ? item.icon : 'heart', 0xe86f8e, 44)),
            h('div', { class: 'shop-item__text' }, h('strong', { text: item.name }), h('small', { text: item.description })),
            buy,
          );
        }),
      );
    };
    paintList();
    const close = button('', () => this.closeModal(), this.disposer, { tone: 'cream', size: 'round', icon: uiIcon('close', 0xffffff, 34), aria: 'Close', className: 'panel__close' });
    this.openModal(
      h(
        'div',
        { class: 'panel pop shop' },
        close,
        ribbon('Planner Shop', 'gold'),
        h('p', { class: 'shop__hint', text: 'Coins come from finished weddings. Upgrades help in every reception.' }),
        list,
      ),
    );
  }
}
