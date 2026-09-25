import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id, Modifiers } from '../../content/types';
import { planMenu, type Plan } from '../progression/plan';
import { FixedStepRunner } from './FixedStepRunner';
import type { Cheat } from './cheats';
import type { DomainEvent } from './events';
import { ReceptionSimulation, SIM_STEP_SECONDS } from './ReceptionSimulation';

/**
 * One playable reception: a simulation plus its clock. The scene feeds real
 * frame time in; pausing simply stops feeding it. Kept outside the renderer
 * so pause/quit/restart are app decisions, not scene internals.
 */
export class ReceptionSession {
  readonly sim: ReceptionSimulation;
  private readonly runner: FixedStepRunner;
  private readonly pending: DomainEvent[] = [];
  paused = false;

  constructor(
    readonly content: ContentRegistry,
    readonly levelId: Id,
    readonly plan: Plan,
    modifiers: readonly Modifiers[],
    seed: number,
  ) {
    const menuItemIds = planMenu(content, content.levels.get(levelId).weddingId, plan);
    this.sim = new ReceptionSimulation({ content, levelId, seed, modifiers, menuItemIds });
    this.runner = new FixedStepRunner(SIM_STEP_SECONDS, (dt) => {
      this.sim.step(dt);
      for (const e of this.sim.drainEvents()) this.pending.push(e);
    });
  }

  /** Playtest shortcut; its events are delivered with the next `advance` like any others. */
  cheat(c: Cheat): void {
    this.sim.cheat(c);
    for (const e of this.sim.drainEvents()) this.pending.push(e);
  }

  /** Advances by real elapsed seconds; returns events produced since the last call. */
  advance(elapsedSeconds: number): DomainEvent[] {
    if (!this.paused && !this.sim.isOver) this.runner.advance(elapsedSeconds);
    return this.pending.splice(0, this.pending.length);
  }
}
