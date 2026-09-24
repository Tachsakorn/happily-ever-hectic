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

export class ScreenStack {
  private current: Screen | null = null;

  constructor(private readonly root: HTMLElement) {}

  show(screen: Screen | null): void {
    this.current?.unmount();
    this.current = screen;
    screen?.mount(this.root);
  }
}
