import { DomScreen } from '../Screen';
import { button, h } from '../dom';

/** Temporary view for app states whose real screen arrives in a later phase. */
export class PlaceholderScreen extends DomScreen {
  constructor(
    private readonly heading: string,
    private readonly actions: readonly { label: string; onTap: () => void }[],
  ) {
    super();
  }

  protected render(): HTMLElement {
    return h(
      'div',
      { class: 'screen' },
      h('h2', { class: 'h2', text: this.heading }),
      h('div', { class: 'row' }, ...this.actions.map((a) => button(a.label, a.onTap, this.disposer))),
    );
  }
}
