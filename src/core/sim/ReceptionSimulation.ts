import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id, Modifiers, Vec2 } from '../../content/types';
import { MoodLedger } from '../couple/MoodLedger';
import { createCoupleSystem } from '../couple/CoupleSystem';
import { createDisasterSystem } from '../disasters/DisasterSystem';
import { GiftSystem } from '../gifts/GiftSystem';
import { seatGuest } from '../guests/guestActions';
import { GuestSystem } from '../guests/GuestSystem';
import { tableScore } from '../guests/seating';
import { findGuest } from '../guests/guestMachine';
import { pickSeat, pickTarget, pickWaitingGuest } from '../input/picking';
import { KitchenSystem } from '../kitchen/kitchen';
import { NavGraph } from '../nav/NavGraph';
import { clearQueue, PlannerSystem, queueAction } from '../planner/PlannerSystem';
import { buildResult, endBonus, type ReceptionResult } from '../scoring/results';
import { ScoreKeeper } from '../scoring/ScoreKeeper';
import { createTimelineSystem } from '../timeline/TimelineSystem';
import { CHEAT_CAUSE, type Cheat } from './cheats';
import { fail, type Command, type CommandResult } from './commands';
import { EventBus, type DomainEvent } from './events';
import { combineModifiers } from './modifiers';
import { Rng } from './Rng';
import type { SimContext, System } from './SimContext';
import type { ReceptionState, TargetRef } from './state';
import { VenueIndex } from './VenueIndex';

export interface ReceptionSetup {
  readonly content: ContentRegistry;
  readonly levelId: Id;
  readonly seed: number;
  /** Upgrades, decor bonuses, etc. Combined into one level-wide modifier set. */
  readonly modifiers?: readonly Modifiers[];
}

/** Fixed simulation step. 60 Hz keeps walking smooth; the renderer interpolates nothing heavier than positions. */
export const SIM_STEP_SECONDS = 1 / 60;

/**
 * One wedding reception. Composes the systems, owns the state, and exposes
 * the narrow surface the presentation layer needs: send commands, step time,
 * read state, drain events. It contains no gameplay rules itself.
 */
export class ReceptionSimulation {
  private readonly ctx: SimContext;
  private readonly systems: readonly System[];

  constructor(setup: ReceptionSetup) {
    const { content } = setup;
    const level = content.levels.get(setup.levelId);
    const wedding = content.weddings.get(level.weddingId);
    const venueDef = content.venues.get(level.venueId);
    const venue = new VenueIndex(venueDef);
    const modifiers = combineModifiers(setup.modifiers ?? []);
    const tuning = content.tuning;

    const state: ReceptionState = {
      time: 0,
      duration: level.durationSeconds,
      outcome: 'RUNNING',
      guests: [],
      planner: { pos: venueDef.plannerStart, path: [], hands: [], queue: [], current: null, facing: 1 },
      kitchen: { orders: [], pass: venueDef.passSlots.map(() => null) },
      gifts: [],
      disasters: [],
      couple: { mood: Math.min(100, tuning.mood.start + modifiers.startMood), request: null, nextRequestIn: 0 },
      flags: new Set(),
      score: 0,
      moodLedger: new Map(),
      stats: {
        guestsSeated: 0,
        guestsServed: 0,
        guestsUpset: 0,
        giftsDelivered: 0,
        disastersResolved: 0,
        disastersFailed: 0,
        momentsCompleted: 0,
        momentsFailed: 0,
      },
    };

    const navPoints: Vec2[] = [
      ...venueDef.waypoints,
      ...venueDef.waitingSlots,
      venueDef.doorPos,
      ...venueDef.stations.map((s) => s.interactPos),
      ...venueDef.tables.flatMap((t) => t.seats.flatMap((s) => [s.interactPos, s.pos])),
    ];
    const events = new EventBus();
    let idCounter = 0;
    this.ctx = {
      state,
      content,
      tuning,
      level,
      wedding,
      venue,
      nav: new NavGraph(venueDef.obstacles, navPoints),
      rng: new Rng(setup.seed),
      events,
      mood: new MoodLedger(state, events, modifiers.coupleMoodDrain),
      score: new ScoreKeeper(state, events, content.scoring, modifiers.scoreBonus),
      modifiers,
      nextId: () => ++idCounter,
    };

    // Order matters: the timeline spawns, disasters set this tick's drain
    // multipliers before guests consume them, the planner acts before guests
    // update so a dish served this tick stops the drain immediately.
    this.systems = [
      createTimelineSystem(level),
      createDisasterSystem(),
      PlannerSystem,
      GuestSystem,
      KitchenSystem,
      GiftSystem,
      createCoupleSystem(),
    ];
  }

  get state(): Readonly<ReceptionState> {
    return this.ctx.state;
  }

  get context(): Readonly<SimContext> {
    return this.ctx;
  }

  get isOver(): boolean {
    return this.ctx.state.outcome !== 'RUNNING';
  }

  command(cmd: Command): CommandResult {
    if (this.isOver) return fail('The reception is over');
    switch (cmd.type) {
      case 'seatGuest':
        return seatGuest(this.ctx, cmd.guestKey, cmd.seatId);
      case 'queueAction':
        return queueAction(this.ctx, cmd.target);
      case 'clearQueue':
        return clearQueue(this.ctx);
    }
  }

  step(dt: number): void {
    const { state, mood } = this.ctx;
    if (state.outcome !== 'RUNNING') return;
    state.time += dt;
    for (const system of this.systems) system.update(this.ctx, dt);
    mood.tick(dt);

    if (state.couple.mood <= 0) this.end('FAILED');
    else if (state.time >= state.duration) this.end('COMPLETE');
  }

  private end(outcome: 'COMPLETE' | 'FAILED', minScore = 0): void {
    const { state, mood, score, events, content } = this.ctx;
    mood.flush();
    if (outcome === 'COMPLETE') {
      const rules = content.scoring;
      score.add(endBonus(state, rules.perHappyGuestHeartAtEnd, rules.perMoodPointAtEnd), 'Wedding day bonus');
      if (state.score < minScore) {
        const delta = minScore - state.score;
        state.score = minScore;
        events.emit({ type: 'scoreChanged', delta, total: state.score, reason: CHEAT_CAUSE, pos: null });
      }
    }
    state.outcome = outcome;
    events.emit({ type: 'receptionEnded', outcome });
  }

  /** Playtest shortcuts; see `cheats.ts`. Ignored once the reception is over. */
  cheat(c: Cheat): void {
    if (this.isOver) return;
    const { state, mood, level } = this.ctx;
    switch (c.type) {
      case 'finish':
        this.end('COMPLETE', c.stars > 0 ? level.starScores[c.stars - 1] : 0);
        break;
      case 'fail':
        this.end('FAILED');
        break;
      case 'skipTime': {
        const steps = Math.round(Math.max(0, Math.min(c.seconds, state.duration - state.time)) / SIM_STEP_SECONDS);
        for (let i = 0; i < steps && !this.isOver; i++) this.step(SIM_STEP_SECONDS);
        break;
      }
      case 'fillMood':
        mood.change(100 - state.couple.mood, CHEAT_CAUSE);
        break;
    }
  }

  drainEvents(): DomainEvent[] {
    return this.ctx.events.drain();
  }

  result(): ReceptionResult {
    return buildResult(this.ctx.state, this.ctx.level);
  }

  // ---- queries for the input layer (pure reads) ----

  pickTarget(p: Vec2): TargetRef | null {
    return pickTarget(this.ctx, p);
  }

  pickSeat(p: Vec2): Id | null {
    return pickSeat(this.ctx, p);
  }

  pickWaitingGuest(p: Vec2): string | null {
    return pickWaitingGuest(this.ctx, p);
  }

  /** How a waiting guest would feel at each table right now (for the seating hint overlay). */
  seatingPreview(guestKey: string): Map<Id, number> {
    const out = new Map<Id, number>();
    const guest = findGuest(this.ctx, guestKey);
    if (!guest) return out;
    for (const t of this.ctx.venue.tables) out.set(t.id, tableScore(this.ctx, guest, t.id));
    return out;
  }
}
