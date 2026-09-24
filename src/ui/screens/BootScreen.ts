import { DomScreen } from '../Screen';
import { h } from '../dom';

/**
 * First screen. Its tap is the user gesture iOS requires before audio can
 * play, so it is not skippable decoration.
 */
export class BootScreen extends DomScreen {
  constructor(
    private readonly title: string,
    private readonly onStart: () => void,
  ) {
    super();
  }

  protected render(): HTMLElement {
    const el = h(
      'div',
      { class: 'screen boot-screen' },
      h('h1', { class: 'title', text: this.title }),
      h('p', { class: 'subtitle tap-hint', text: 'Tap anywhere to begin' }),
    );
    this.disposer.listen(el, 'click', () => this.onStart());
    return el;
  }
}
