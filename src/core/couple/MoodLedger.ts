import type { Vec2 } from '../../content/types';
import type { EventBus } from '../sim/events';
import { clamp } from '../math/vec';
import { MAX_MOOD, type ReceptionState } from '../sim/state';

const FLUSH_INTERVAL = 1;

/**
 * The only way couple mood changes. Every change carries a cause label, so the
 * player can always see *why* the wedding got better or worse, and the
 * results screen can break the day down by cause.
 *
 * Continuous effects (a disaster draining mood every tick) are accumulated per
 * cause and reported once per second, so feedback is readable instead of a
 * flood of "-0.03" popups.
 */
export class MoodLedger {
  private readonly pending = new Map<string, { amount: number; pos: Vec2 | null }>();
  private sinceFlush = 0;

  constructor(
    private readonly state: ReceptionState,
    private readonly events: EventBus,
    /** Scales every mood loss (e.g. an upgrade that keeps the couple calmer). */
    private readonly lossMultiplier: number,
  ) {}

  get mood(): number {
    return this.state.couple.mood;
  }

  /** Immediate, visible change (a guest storms out, a moment succeeds). */
  change(delta: number, cause: string, pos: Vec2 | null = null): void {
    const applied = this.apply(delta, cause);
    if (applied !== 0) this.events.emit({ type: 'moodChanged', delta: applied, mood: this.mood, cause, pos });
  }

  /** Continuous change; reported in aggregate once per second. */
  accumulate(delta: number, cause: string, pos: Vec2 | null = null): void {
    const applied = this.apply(delta, cause);
    if (applied === 0) return;
    const entry = this.pending.get(cause);
    if (entry) entry.amount += applied;
    else this.pending.set(cause, { amount: applied, pos });
  }

  tick(dt: number): void {
    this.sinceFlush += dt;
    if (this.sinceFlush < FLUSH_INTERVAL) return;
    this.flush();
  }

  flush(): void {
    this.sinceFlush = 0;
    for (const [cause, { amount, pos }] of this.pending) {
      this.events.emit({ type: 'moodChanged', delta: amount, mood: this.mood, cause, pos });
    }
    this.pending.clear();
  }

  private apply(delta: number, cause: string): number {
    const scaled = delta < 0 ? delta * this.lossMultiplier : delta;
    const before = this.state.couple.mood;
    this.state.couple.mood = clamp(before + scaled, 0, MAX_MOOD);
    const applied = this.state.couple.mood - before;
    if (applied !== 0) this.state.moodLedger.set(cause, (this.state.moodLedger.get(cause) ?? 0) + applied);
    return applied;
  }
}
