import { DomScreen } from '../Screen';
import { button, h } from '../dom';

export interface DialogueLineVM {
  readonly speaker: string;
  readonly text: string;
}

/**
 * Story beats between weddings. Tap to reveal the line, tap again to advance.
 * The same screen serves intros, outros and the ending.
 */
export class DialogueScreen extends DomScreen {
  private index = 0;
  private typing: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly lines: readonly DialogueLineVM[],
    private readonly options: { onDone: () => void; doneLabel: string; variant?: 'default' | 'ending'; heading?: string },
  ) {
    super();
  }

  protected render(): HTMLElement {
    const speaker = h('div', { class: 'dialogue__speaker' });
    const text = h('div', { class: 'dialogue__text' });
    const hint = h('div', { class: 'dialogue__hint', text: 'Tap to continue' });
    const box = h('div', { class: 'card dialogue' }, speaker, text, hint);
    const ending = this.options.variant === 'ending';
    const root = h(
      'div',
      { class: `screen ${ending ? 'ending' : 'dialogue-backdrop'}` },
      ending ? this.hearts() : null,
      this.options.heading ? h('h1', { class: 'title', text: this.options.heading, style: 'margin-bottom: 180px' }) : null,
      box,
    );

    const finish = button(this.options.doneLabel, this.options.onDone, this.disposer);
    const show = () => {
      const line = this.lines[this.index];
      if (!line) {
        hint.replaceWith(finish);
        return;
      }
      speaker.textContent = line.speaker;
      this.type(text, line.text);
    };
    this.disposer.listen(root, 'click', (e) => {
      if (e.target instanceof HTMLButtonElement) return;
      if (this.typing) {
        this.stopTyping();
        text.textContent = this.lines[this.index]?.text ?? '';
        return;
      }
      if (this.index < this.lines.length - 1) {
        this.index++;
        show();
      } else if (!finish.isConnected) {
        hint.replaceWith(finish);
      }
    });
    this.disposer.add(() => this.stopTyping());
    if (this.lines.length) show();
    else queueMicrotask(() => hint.replaceWith(finish));
    return root;
  }

  private type(el: HTMLElement, full: string): void {
    this.stopTyping();
    let i = 0;
    el.textContent = '';
    this.typing = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i >= full.length) this.stopTyping();
    }, 24);
  }

  private stopTyping(): void {
    if (this.typing) clearInterval(this.typing);
    this.typing = null;
  }

  private hearts(): HTMLElement {
    const wrap = h('div', { class: 'floating-hearts' });
    for (let i = 0; i < 18; i++) {
      const size = 16 + ((i * 37) % 30);
      wrap.append(
        h('span', {
          text: '♥',
          style: `left:${(i * 53) % 100}%; font-size:${size}px; animation-duration:${6 + (i % 5)}s; animation-delay:${(i * 0.7) % 6}s`,
        }),
      );
    }
    return wrap;
  }
}
