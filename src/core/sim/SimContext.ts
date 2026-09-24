import type { ContentRegistry } from '../../content/ContentRegistry';
import type { LevelDef, TuningDef, WeddingDef } from '../../content/types';
import type { MoodLedger } from '../couple/MoodLedger';
import type { NavGraph } from '../nav/NavGraph';
import type { ScoreKeeper } from '../scoring/ScoreKeeper';
import type { EventBus } from './events';
import type { ResolvedModifiers } from './modifiers';
import type { Rng } from './Rng';
import type { ReceptionState } from './state';
import type { VenueIndex } from './VenueIndex';

/**
 * What every system receives. Deliberately small: state, static lookups, and
 * the three services through which all side effects flow (events, mood, score).
 * Systems never hold references to each other.
 */
export interface SimContext {
  readonly state: ReceptionState;
  readonly content: ContentRegistry;
  readonly tuning: TuningDef;
  readonly level: LevelDef;
  readonly wedding: WeddingDef;
  readonly venue: VenueIndex;
  readonly nav: NavGraph;
  readonly rng: Rng;
  readonly events: EventBus;
  readonly mood: MoodLedger;
  readonly score: ScoreKeeper;
  /** Level-wide modifiers from upgrades and decor. */
  readonly modifiers: ResolvedModifiers;
  nextId(): number;
}

/** A system advances one aspect of the reception by one fixed step. */
export interface System {
  readonly name: string;
  update(ctx: SimContext, dt: number): void;
}
