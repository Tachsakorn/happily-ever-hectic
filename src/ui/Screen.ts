import { Disposer } from './dom';

/** A DOM screen is a view of one app state. It must release everything it created on unmount. */
export interface Screen {
  mount(root: HTMLElement): void;
  unmount(): void;
}

/** Base class that handles the element + disposer bookkeeping every screen needs. */
export abstract class DomScreen implements Screen {
  protected readonly disposer = new Disposer();
  private element: HTMLElement | null = null;

  protected abstract render(): HTMLElement;

  mount(root: HTMLElement): void {
    this.element = this.render();
    root.append(this.element);
  }

  unmount(): void {
    this.disposer.dispose();
    this.element?.remove();
    this.element = null;
  }
}

/** `cut` swaps instantly (pause, in-play overlays); `curtain` wipes to the next screen. */
export type ScreenTransition = 'cut' | 'curtain';

const CURTAIN_MS = 340;

/**
 * Shows one screen at a time. A curtain transition closes a painted wipe,
 * swaps screens behind it and opens again. Requests that arrive while the
 * curtain is closing replace the pending screen, so the last request wins.
 */
export class ScreenStack {
  private current: Screen | null = null;
  private pending: Screen | null = null;
  private closing = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly curtain: HTMLElement | null = null,
  ) {}

  show(screen: Screen | null, transition: ScreenTransition = 'cut'): void {
    if (this.closing) {
      this.pending = screen;
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (transition === 'cut' || !this.curtain || reduced) {
      this.swap(screen);
      return;
    }
    const curtain = this.curtain;
    this.pending = screen;
    this.closing = true;
    curtain.classList.add('is-closed');
    setTimeout(() => {
      this.closing = false;
      this.swap(this.pending);
      this.pending = null;
      // Two frames: let the new screen lay out before the wipe opens on it.
      requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.remove('is-closed')));
    }, CURTAIN_MS);
  }

  private swap(screen: Screen | null): void {
    this.current?.unmount();
    this.current = screen;
    screen?.mount(this.root);
  }
}
