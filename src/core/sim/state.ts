import type { CoupleStateId, Id, Vec2 } from '../../content/types';
import type { ResolvedModifiers } from './modifiers';

/**
 * Runtime state of one reception. Plain data owned by the simulation; the
 * renderer and UI read it but never mutate it (they send Commands).
 */

export const GuestState = {
  ARRIVING: 'ARRIVING',
  WAITING_TO_BE_SEATED: 'WAITING_TO_BE_SEATED',
  WALKING_TO_SEAT: 'WALKING_TO_SEAT',
  SEATED: 'SEATED',
  READY_TO_ORDER: 'READY_TO_ORDER',
  WAITING_FOR_FOOD: 'WAITING_FOR_FOOD',
  EATING: 'EATING',
  SATISFIED: 'SATISFIED',
  REQUESTING: 'REQUESTING',
  WANTS_TO_DANCE: 'WANTS_TO_DANCE',
  WALKING_TO_DANCE: 'WALKING_TO_DANCE',
  DANCING: 'DANCING',
  RETURNING_TO_SEAT: 'RETURNING_TO_SEAT',
  UPSET: 'UPSET',
  LEAVING: 'LEAVING',
  GONE: 'GONE',
} as const;
export type GuestStateId = (typeof GuestState)[keyof typeof GuestState];

export interface Guest {
  readonly key: string;
  readonly name: string;
  readonly typeId: Id;
  readonly groupId: Id;
  readonly likes: readonly string[];
  readonly dislikes: readonly string[];
  readonly bringsGift: boolean;
  /** Personality: the guest type's traits plus the guest's own. */
  readonly traitIds: readonly Id[];
  /** Per-guest tuning from type + traits (+ level-wide modifiers). */
  readonly mods: ResolvedModifiers;
  readonly patienceSeconds: number;
  readonly eatSeconds: number;
  state: GuestStateId;
  stateTime: number;
  /** Seconds this state lasts, for timed states (settling, eating, upset). */
  stateDuration: number;
  pos: Vec2;
  path: Vec2[];
  /** 0..100. Hitting 0 while waiting makes the guest upset. */
  happiness: number;
  waitingSlot: number | null;
  seatId: Id | null;
  tableId: Id | null;
  /** Current wish: ordered dish or follow-up request item. */
  wantsItemId: Id | null;
  /** Current wish granted at a station instead (e.g. a song at the DJ booth). */
  wantsServiceId: Id | null;
  /** Happiness change per second from table neighbours (can be negative). */
  seatingMood: number;
  nextRequestIn: number;
  /** Multiplier from active disasters, recomputed every tick. */
  disasterDrain: number;
  /** Follow-up requests left before a happy goodbye; null = stays all reception. */
  requestsLeft: number | null;
  /** Dance floor spot while walking to or dancing on it. */
  danceSpot: number | null;
  /** Set when leaving because the visit is over (not upset). */
  happyExit: boolean;
  /** Index of the next course to start (see core/guests/courses). */
  nextCourse: number;
  /** The course being waited for or eaten, if any. */
  course: CourseKind | null;
}

export type CourseKind = 'appetizer' | 'main' | 'dessert';

/** The current chain: consecutive actions of the same kind (see core/scoring/chain). */
export interface Chain {
  key: string | null;
  count: number;
}

export type TargetRef =
  | { readonly kind: 'guest'; readonly id: string }
  | { readonly kind: 'couple' }
  | { readonly kind: 'station'; readonly id: Id }
  | { readonly kind: 'passSlot'; readonly index: number }
  | { readonly kind: 'gift'; readonly id: number }
  | { readonly kind: 'disaster'; readonly id: number }
  | { readonly kind: 'secret'; readonly id: number };

export interface QueuedAction {
  readonly id: number;
  readonly target: TargetRef;
}

export interface Planner {
  pos: Vec2;
  path: Vec2[];
  /** Item ids in hand. A two-handed item fills both hands. */
  hands: Id[];
  queue: QueuedAction[];
  current: { action: QueuedAction; phase: 'walking' | 'working'; workLeft: number; workTotal: number } | null;
  /** Facing for animation: -1 left, 1 right. */
  facing: -1 | 1;
}

export interface KitchenOrder {
  readonly id: number;
  readonly itemId: Id;
  readonly guestKey: string;
  /** null while waiting for a free burner. */
  cookLeft: number | null;
  cookTotal: number;
  /** Plated, not cooked (starters): ready after this many seconds, without using a burner. */
  readonly plateSeconds?: number;
}

export interface Gift {
  readonly id: number;
  readonly guestKey: string;
  pos: Vec2;
  state: 'waiting' | 'carried' | 'delivered';
  /** Seconds spent waiting on the table. */
  age: number;
}

export const DisasterPhase = {
  WARNING: 'WARNING',
  ACTIVE: 'ACTIVE',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
  FAILED: 'FAILED',
} as const;
export type DisasterPhaseId = (typeof DisasterPhase)[keyof typeof DisasterPhase];

export interface Disaster {
  readonly id: number;
  readonly defId: Id;
  phase: DisasterPhaseId;
  phaseTime: number;
  phaseDuration: number;
  readonly pos: Vec2;
  /** Where the planner stands to fix it. */
  readonly interactPos: Vec2;
  readonly stationId: Id | null;
  readonly tableId: Id | null;
  readonly involvedGuestKeys: readonly string[];
}

/** A secret event currently on the floor (or already found or gone). */
export interface Secret {
  readonly id: number;
  readonly defId: Id;
  readonly pos: Vec2;
  state: 'active' | 'found' | 'vanished';
  timeLeft: number;
  readonly total: number;
}

export interface CoupleRequest {
  readonly itemId: Id;
  readonly momentId: Id | null;
  timeLeft: number;
  readonly total: number;
}

export interface Couple {
  mood: number;
  /** Mood band (blissful … meltdown), kept in step with mood by the couple system. */
  state: CoupleStateId;
  request: CoupleRequest | null;
  nextRequestIn: number;
}

export type ReceptionOutcome = 'RUNNING' | 'COMPLETE' | 'FAILED';

export interface ReceptionState {
  time: number;
  readonly duration: number;
  outcome: ReceptionOutcome;
  readonly guests: Guest[];
  readonly planner: Planner;
  /** `stalled`: a disaster has stopped the cooking (recomputed every tick). */
  readonly kitchen: { orders: KitchenOrder[]; pass: (Id | null)[]; stalled: boolean };
  readonly gifts: Gift[];
  readonly disasters: Disaster[];
  readonly secrets: Secret[];
  readonly chain: Chain;
  readonly couple: Couple;
  /** Bottles of rescue champagne still unopened. */
  rescuesLeft: number;
  readonly flags: Set<string>;
  score: number;
  /** Mood gained/lost per cause label, for the results breakdown. */
  readonly moodLedger: Map<string, number>;
  readonly stats: ReceptionStats;
}

export interface ReceptionStats {
  guestsSeated: number;
  guestsServed: number;
  guestsUpset: number;
  guestsLeftHappy: number;
  dances: number;
  /** Guests who have come in through the door so far. */
  guestsArrived: number;
  coursesServed: number;
  bestChain: number;
  giftsDelivered: number;
  disastersResolved: number;
  disastersFailed: number;
  momentsCompleted: number;
  momentsFailed: number;
  /** Service wishes granted (songs played for a guest). */
  servicesGranted: number;
  rescuesUsed: number;
  /** Small couple requests that ran out of time. */
  coupleRequestsMissed: number;
}

export const MAX_MOOD = 100;
export const MAX_HAPPINESS = 100;
