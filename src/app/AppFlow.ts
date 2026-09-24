/**
 * Top-level game flow. This is the ONLY place that knows which app states
 * exist and which transitions are legal; screens and scenes are views of it.
 * Pure TypeScript so it can be unit tested without a browser.
 */
export const AppState = {
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  PROGRESSION: 'PROGRESSION',
  WEDDING_PREPARATION: 'WEDDING_PREPARATION',
  RECEPTION_INTRO: 'RECEPTION_INTRO',
  RECEPTION_PLAYING: 'RECEPTION_PLAYING',
  PAUSED: 'PAUSED',
  WEDDING_COMPLETE: 'WEDDING_COMPLETE',
  RESULTS: 'RESULTS',
} as const;

export type AppStateId = (typeof AppState)[keyof typeof AppState];

const TRANSITIONS: Readonly<Record<AppStateId, readonly AppStateId[]>> = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['PROGRESSION'],
  PROGRESSION: ['MAIN_MENU', 'WEDDING_PREPARATION'],
  WEDDING_PREPARATION: ['PROGRESSION', 'RECEPTION_INTRO'],
  RECEPTION_INTRO: ['RECEPTION_PLAYING'],
  RECEPTION_PLAYING: ['PAUSED', 'WEDDING_COMPLETE'],
  PAUSED: ['RECEPTION_PLAYING', 'RECEPTION_INTRO', 'PROGRESSION'],
  WEDDING_COMPLETE: ['RESULTS'],
  RESULTS: ['PROGRESSION', 'WEDDING_PREPARATION'],
};

export interface StateChange<TContext> {
  readonly from: AppStateId;
  readonly to: AppStateId;
  readonly context: Readonly<TContext>;
}

export type StateListener<TContext> = (change: StateChange<TContext>) => void;

export class AppFlow<TContext extends object> {
  private current: AppStateId = AppState.BOOT;
  private context: TContext;
  private readonly listeners = new Set<StateListener<TContext>>();
  private transitioning = false;
  private readonly pending: { to: AppStateId; patch: Partial<TContext> }[] = [];

  constructor(initialContext: TContext) {
    this.context = initialContext;
  }

  get state(): AppStateId {
    return this.current;
  }

  get ctx(): Readonly<TContext> {
    return this.context;
  }

  canTransition(to: AppStateId): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  /**
   * Throws on illegal transitions: a wrong transition is a programming error,
   * not a runtime condition. Transitions requested by a listener while others
   * are still being notified are queued, so every listener sees states in order.
   */
  transition(to: AppStateId, patch: Partial<TContext> = {}): void {
    this.pending.push({ to, patch });
    if (this.transitioning) return;
    this.transitioning = true;
    try {
      let next = this.pending.shift();
      while (next) {
        this.apply(next.to, next.patch);
        next = this.pending.shift();
      }
    } finally {
      this.transitioning = false;
      this.pending.length = 0;
    }
  }

  private apply(to: AppStateId, patch: Partial<TContext>): void {
    if (!this.canTransition(to)) {
      throw new Error(`Illegal app transition ${this.current} -> ${to}`);
    }
    const from = this.current;
    this.current = to;
    this.context = { ...this.context, ...patch };
    const change: StateChange<TContext> = { from, to, context: this.context };
    for (const listener of [...this.listeners]) listener(change);
  }

  subscribe(listener: StateListener<TContext>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
