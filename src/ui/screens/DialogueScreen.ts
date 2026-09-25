import type { PersonLook } from '../../art/people';
import { paintMenuBackdrop } from '../../art/scenery';
import { DomScreen } from '../Screen';
import { button, h, onTap } from '../dom';
import { backdrop, petals, portrait, uiIcon } from '../paint';
import { logo } from './common';

export interface DialogueLineVM {
  readonly speaker: string;
  readonly text: string;
  readonly look?: PersonLook;
  readonly side: 'left' | 'right';
}

const TYPE_STEP_MS = 22;

/**
 * Story beats between weddings. Speakers slide in on their side; tap to finish
 * the line, tap again to advance. The same screen serves intros, outros and
 * the ending.
 */
export class DialogueScreen extends DomScreen {
  private index = 0;
  private typing: ReturnType<typeof setInterval> | null = null;
  private readonly talkers = new Map<string, HTMLElement>();

  constructor(
    private readonly lines: readonly DialogueLineVM[],
    private readonly options: { onDone: () => void; doneLabel: string; variant?: 'default' | 'ending'; heading?: string },
  ) {
    super();
  }

  protected render(): HTMLElement {
    const ending = this.options.variant === 'ending';
    const name = h('div', { class: 'name-tag' });
    const text = h('p', { class: 'dialogue-text' });
    const next = h('span', { class: 'dialogue-next', 'aria-hidden': 'true' });
    const finish = button(this.options.doneLabel, this.options.onDone, this.disposer, { tone: 'go', icon: uiIcon('next', 0xffffff, 30), className: 'dialogue-done' });
    const box = h('div', { class: 'panel dialogue-box' }, name, text, next);
    const stage = h('div', { class: 'talkers' });

    for (const line of this.lines) {
      if (!line.look || this.talkers.has(line.speaker)) continue;
      const t = h('div', { class: `talker talker--${line.side}`, 'data-side': line.side }, portrait(line.look, 250, 'talker__art'));
      this.talkers.set(line.speaker, t);
      stage.append(t);
    }

    const root = h(
      'div',
      { class: `screen dialogue-screen${ending ? ' is-ending' : ''}` },
      ending ? backdrop((w, hgt) => paintMenuBackdrop(w, hgt, { archAt: 0.5, seed: 31 }), this.disposer) : h('div', { class: 'screen__scrim' }),
      ending ? petals(18) : null,
      ending ? this.hearts() : null,
      this.options.heading ? h('div', { class: 'dialogue-heading' }, logo(this.options.heading, true)) : null,
      stage,
      box,
    );

    const showFinish = () => {
      if (!finish.isConnected) next.replaceWith(finish);
    };
    const show = () => {
      const line = this.lines[this.index];
      if (!line) return showFinish();
      name.textContent = line.speaker;
      name.className = `name-tag name-tag--${line.side}`;
      box.classList.remove('is-bumped');
      void box.offsetWidth;
      box.classList.add('is-bumped');
      for (const [speaker, el] of this.talkers) {
        const speaking = speaker === line.speaker;
        el.classList.toggle('is-speaking', speaking);
        el.classList.toggle('is-listening', !speaking && el.classList.contains('is-in'));
        if (speaking) el.classList.add('is-in');
        // One face per side: a new speaker on a side replaces whoever stood there.
        else if (el.dataset.side === line.side && this.talkers.has(line.speaker)) el.classList.remove('is-in', 'is-listening');
      }
      this.type(text, line.text);
    };

    onTap(root, (e) => {
      if (e.target instanceof Element && e.target.closest('button')) return;
      if (this.typing) {
        this.stopTyping();
        text.textContent = this.lines[this.index]?.text ?? '';
        return;
      }
      if (this.index < this.lines.length - 1) {
        this.index++;
        show();
      } else {
        showFinish();
      }
    }, this.disposer);
    this.disposer.add(() => this.stopTyping());
    if (this.lines.length) this.disposer.timeout(show, ending ? 900 : 180);
    else queueMicrotask(showFinish);
    return root;
  }

  private type(el: HTMLElement, full: string): void {
    this.stopTyping();
    let i = 0;
    el.textContent = '';
    this.typing = setInterval(() => {
      i += 1;
      el.textContent = full.slice(0, i);
      if (i >= full.length) this.stopTyping();
    }, TYPE_STEP_MS);
  }

  private stopTyping(): void {
    if (this.typing) clearInterval(this.typing);
    this.typing = null;
  }

  private hearts(): HTMLElement {
    const wrap = h('div', { class: 'floating-hearts', 'aria-hidden': 'true' });
    for (let i = 0; i < 16; i++) {
      const size = 22 + ((i * 37) % 26);
      const heart = uiIcon('heart', [0xe86f8e, 0xf7b7c6, 0xffffff][i % 3]!, size);
      heart.style.left = `${(i * 53 + 5) % 100}%`;
      heart.style.animationDuration = `${7 + (i % 5)}s`;
      heart.style.animationDelay = `${-((i * 0.9) % 7)}s`;
      wrap.append(heart);
    }
    return wrap;
  }
}
