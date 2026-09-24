import type { ScoringRules, Vec2 } from '../../content/types';
import type { EventBus } from '../sim/events';
import type { ReceptionState } from '../sim/state';

/** The only way score changes. Positive gains are boosted by level-wide score bonuses (e.g. decor the couple loves). */
export class ScoreKeeper {
  constructor(
    private readonly state: ReceptionState,
    private readonly events: EventBus,
    readonly rules: ScoringRules,
    private readonly bonus: number,
  ) {}

  add(points: number, reason: string, pos: Vec2 | null = null): void {
    const delta = Math.round(points > 0 ? points * (1 + this.bonus) : points);
    if (delta === 0) return;
    this.state.score = Math.max(0, this.state.score + delta);
    this.events.emit({ type: 'scoreChanged', delta, total: this.state.score, reason, pos });
  }
}
