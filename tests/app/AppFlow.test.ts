import { describe, expect, it } from 'vitest';
import { AppFlow, AppState, type StateChange } from '../../src/app/AppFlow';

interface Ctx {
  levelId: string | null;
}

describe('AppFlow', () => {
  it('starts in BOOT', () => {
    expect(new AppFlow<Ctx>({ levelId: null }).state).toBe(AppState.BOOT);
  });

  it('follows legal transitions and patches context', () => {
    const flow = new AppFlow<Ctx>({ levelId: null });
    flow.transition(AppState.MAIN_MENU);
    flow.transition(AppState.PROGRESSION);
    flow.transition(AppState.WEDDING_PREPARATION, { levelId: 'level-1' });
    expect(flow.state).toBe(AppState.WEDDING_PREPARATION);
    expect(flow.ctx.levelId).toBe('level-1');
  });

  it('rejects illegal transitions', () => {
    const flow = new AppFlow<Ctx>({ levelId: null });
    expect(() => flow.transition(AppState.RECEPTION_PLAYING)).toThrow(/Illegal/);
    expect(flow.state).toBe(AppState.BOOT);
  });

  it('notifies listeners and supports unsubscribe', () => {
    const flow = new AppFlow<Ctx>({ levelId: null });
    const seen: StateChange<Ctx>[] = [];
    const off = flow.subscribe((c) => seen.push(c));
    flow.transition(AppState.MAIN_MENU);
    off();
    flow.transition(AppState.PROGRESSION);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ from: 'BOOT', to: 'MAIN_MENU' });
  });

  it('queues transitions requested from inside a listener so every listener sees states in order', () => {
    const flow = new AppFlow<Ctx>({ levelId: null });
    const orderA: string[] = [];
    const orderB: string[] = [];
    flow.subscribe((c) => {
      orderA.push(c.to);
      if (c.to === AppState.MAIN_MENU) flow.transition(AppState.PROGRESSION);
    });
    flow.subscribe((c) => orderB.push(c.to));
    flow.transition(AppState.MAIN_MENU);
    expect(orderA).toEqual(['MAIN_MENU', 'PROGRESSION']);
    expect(orderB).toEqual(['MAIN_MENU', 'PROGRESSION']);
    expect(flow.state).toBe(AppState.PROGRESSION);
  });

  it('supports the full reception loop including pause and retry', () => {
    const flow = new AppFlow<Ctx>({ levelId: null });
    const path = [
      AppState.MAIN_MENU,
      AppState.PROGRESSION,
      AppState.WEDDING_PREPARATION,
      AppState.RECEPTION_INTRO,
      AppState.RECEPTION_PLAYING,
      AppState.PAUSED,
      AppState.RECEPTION_PLAYING,
      AppState.WEDDING_COMPLETE,
      AppState.RESULTS,
      AppState.WEDDING_PREPARATION,
    ] as const;
    for (const s of path) flow.transition(s);
    expect(flow.state).toBe(AppState.WEDDING_PREPARATION);
  });
});
