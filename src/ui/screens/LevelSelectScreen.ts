import { DomScreen } from '../Screen';
import { button, h } from '../dom';

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
}

export function starsElement(stars: number, className = 'stars'): HTMLElement {
  return h('span', { class: className, 'aria-label': `${stars} of 3 stars` }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '', text: '★' })));
}

export function coinsElement(coins: number): HTMLElement {
  return h('span', { class: 'coins' }, h('span', { class: 'coin-dot' }), String(coins));
}

/** The wedding map: pick a wedding, see stars, visit the shop. */
export class LevelSelectScreen extends DomScreen {
  private showShop = false;
  private root: HTMLElement | null = null;

  constructor(
    private vm: { levels: readonly LevelCardVM[]; coins: number; shop: readonly ShopItemVM[] },
    private readonly actions: { pick: (id: string) => void; back: () => void; buy: (id: string) => { coins: number; shop: readonly ShopItemVM[] } | null },
  ) {
    super();
  }

  protected render(): HTMLElement {
    this.root = h('div', { class: 'screen screen--scroll menu-screen' });
    this.paint();
    return this.root;
  }

  private paint(): void {
    const root = this.root;
    if (!root) return;
    this.disposer.dispose();
    root.replaceChildren(
      h(
        'div',
        { class: 'topbar' },
        button('‹ Back', this.showShop ? () => this.toggleShop(false) : this.actions.back, this.disposer, 'small-secondary'),
        coinsElement(this.vm.coins),
      ),
      h('div', { style: 'height: 64px' }),
      this.showShop ? this.shop() : this.map(),
    );
  }

  private toggleShop(show: boolean): void {
    this.showShop = show;
    this.paint();
  }

  private map(): HTMLElement {
    return h(
      'div',
      { class: 'row', style: 'flex-direction: column; gap: 22px; width: 100%' },
      h('h2', { class: 'h2', text: 'Choose a wedding' }),
      h(
        'div',
        { class: 'level-grid' },
        ...this.vm.levels.map((l) => {
          const card = h(
            'button',
            { class: `level-card${l.isFinal ? ' level-card--final' : ''}`, type: 'button', disabled: !l.unlocked },
            h('span', { class: 'level-card__num', text: l.isFinal ? 'The big day' : `Wedding ${l.number}` }),
            h('span', { class: 'level-card__name', text: l.name }),
            h('span', { class: 'level-card__couple', text: l.couple }),
            starsElement(l.stars),
            l.bestScore > 0 ? h('span', { class: 'level-card__couple', text: `Best ${l.bestScore.toLocaleString('en-US')}` }) : null,
            l.unlocked ? null : h('span', { class: 'lock', text: '🔒' }),
          );
          this.disposer.listen(card, 'click', () => {
            if (l.unlocked) this.actions.pick(l.id);
          });
          return card;
        }),
      ),
      button('Shop upgrades', () => this.toggleShop(true), this.disposer, 'secondary'),
    );
  }

  private shop(): HTMLElement {
    return h(
      'div',
      { class: 'shop' },
      h('h2', { class: 'h2', text: 'Planner upgrades' }),
      h('p', { class: 'subtitle', text: 'Earn coins by finishing weddings. Upgrades help in every reception.' }),
      ...this.vm.shop.map((item) =>
        h(
          'div',
          { class: 'card shop-item' },
          h('div', {}, h('strong', { text: item.name }), h('small', { text: item.description })),
          item.owned
            ? h('span', { class: 'chip', text: 'Owned ✓' })
            : (() => {
                const btn = button(`${item.cost} coins`, () => {
                  const next = this.actions.buy(item.id);
                  if (next) {
                    this.vm = { ...this.vm, coins: next.coins, shop: next.shop };
                    this.paint();
                  }
                }, this.disposer, 'small');
                btn.disabled = item.cost > this.vm.coins;
                return btn;
              })(),
        ),
      ),
    );
  }
}
