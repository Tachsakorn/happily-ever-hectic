/**
 * Content definitions: the contract between data packs and gameplay systems.
 * Everything here is plain serialisable data — no functions, no engine types.
 * Systems interpret these; data packs only fill them in.
 */

export type Id = string;

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Colour/icon hints for the renderer. Content may describe looks, but never draws. */
export interface VisualHint {
  readonly color: number;
  readonly accent?: number;
  readonly icon?: string;
}

// ---------------------------------------------------------------- items

export type ItemKind = 'dish' | 'drink' | 'dessert' | 'cake' | 'gift';

export interface ItemDef {
  readonly id: Id;
  readonly name: string;
  readonly kind: ItemKind;
  /** 2 = the planner needs both hands (e.g. the wedding cake). */
  readonly hands: 1 | 2;
  readonly visual: VisualHint;
}

// ---------------------------------------------------------------- modifiers

/**
 * Multiplicative/additive tuning knobs shared by traits, upgrades, decor and
 * disaster effects. Every field is optional; absent means "no change".
 */
export interface Modifiers {
  readonly guestPatienceDrain?: number;
  readonly guestTip?: number;
  readonly guestEatTime?: number;
  readonly guestRequestInterval?: number;
  readonly plannerSpeed?: number;
  readonly kitchenCookTime?: number;
  readonly disasterWarningTime?: number;
  readonly disasterChance?: number;
  readonly coupleMoodDrain?: number;
  /** Additive, in mood points. */
  readonly startMood?: number;
  /** Additive fraction added to all score, e.g. 0.1 = +10%. */
  readonly scoreBonus?: number;
}

// ---------------------------------------------------------------- guests

export interface TraitDef {
  readonly id: Id;
  readonly name: string;
  /** Short player-facing description shown on the guest card. */
  readonly description: string;
  readonly modifiers: Modifiers;
  /** Seating: extra happiness per neighbour of the same group. */
  readonly sameGroupBonus?: number;
  /** Seating: happiness change per neighbour of a different group. */
  readonly otherGroupBonus?: number;
}

export interface GuestTypeDef {
  readonly id: Id;
  readonly name: string;
  /** Seconds a waiting guest takes to go from full to zero happiness. */
  readonly patienceSeconds: number;
  readonly eatSeconds: number;
  /** Seconds between follow-up requests once satisfied, [min, max]. */
  readonly requestIntervalSeconds: readonly [number, number];
  /** Items this guest type may request after dinner, with weights. */
  readonly requestPool: readonly { readonly itemId: Id; readonly weight: number; readonly requiresFlag?: string }[];
  readonly traitIds: readonly Id[];
  readonly visual: VisualHint;
}

export interface GroupDef {
  readonly id: Id;
  readonly name: string;
  readonly visual: VisualHint;
}

// ---------------------------------------------------------------- venue

export type StationKind =
  | 'entrance'
  | 'kitchenPass'
  | 'drinkTap'
  | 'dessertTable'
  | 'cakeTable'
  | 'giftTable'
  | 'coupleTable'
  | 'djBooth'
  | 'bin';

export interface StationDef {
  readonly id: Id;
  readonly kind: StationKind;
  readonly name: string;
  readonly pos: Vec2;
  /** Where the planner stands to use it. */
  readonly interactPos: Vec2;
  /** Item handed out by taps, dessert/cake tables. */
  readonly providesItemId?: Id;
  readonly hitRadius: number;
}

export interface SeatDef {
  readonly id: Id;
  readonly pos: Vec2;
  readonly interactPos: Vec2;
}

export interface TableDef {
  readonly id: Id;
  readonly pos: Vec2;
  readonly radius: number;
  readonly seats: readonly SeatDef[];
}

export type Obstacle =
  | { readonly kind: 'circle'; readonly center: Vec2; readonly radius: number }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export interface VenueDef {
  readonly id: Id;
  readonly name: string;
  readonly size: { readonly width: number; readonly height: number };
  readonly stations: readonly StationDef[];
  readonly tables: readonly TableDef[];
  readonly waitingSlots: readonly Vec2[];
  /** Where guests appear and where leaving guests walk to. */
  readonly doorPos: Vec2;
  readonly plannerStart: Vec2;
  /** Couple positions at the sweetheart table. */
  readonly couplePos: Vec2;
  /** Positions of ready dishes on the kitchen pass, one per slot. */
  readonly passSlots: readonly Vec2[];
  readonly obstacles: readonly Obstacle[];
  /** Extra navigation points (aisles) to route around obstacles. */
  readonly waypoints: readonly Vec2[];
  readonly floorColor: number;
  readonly accentColor: number;
}

// ---------------------------------------------------------------- disasters

export type DisasterTrigger =
  | { readonly kind: 'scheduled'; readonly at: number }
  | { readonly kind: 'random'; readonly from: number; readonly to: number; readonly chancePerSecond: number }
  /** Fires when two guests who dislike each other share a table. */
  | { readonly kind: 'seatingConflict'; readonly chancePerSecond: number; readonly from?: number };

export type DisasterTarget =
  | { readonly kind: 'station'; readonly stationKind: StationKind }
  | { readonly kind: 'conflictTable' }
  | { readonly kind: 'occupiedTable' }
  | { readonly kind: 'floorSpot' };

export interface DisasterEffects {
  /** Couple mood lost per second while in this phase. */
  readonly moodPerSecond: number;
  /** Multiplier on patience drain of guests in scope. */
  readonly guestDrainMultiplier?: number;
  readonly guestScope?: 'all' | 'table' | 'involved' | 'nearby';
  readonly plannerSpeedMultiplier?: number;
  /** Stops the background music while active (audio reads this from the event). */
  readonly silencesMusic?: boolean;
}

export interface DisasterOutcome {
  readonly mood: number;
  readonly score: number;
  /** Guests who become upset and leave when the disaster is not handled. */
  readonly upsetGuests?: 'none' | 'involved' | 'table';
}

export interface DisasterDef {
  readonly id: Id;
  readonly name: string;
  /** Player-facing hint shown when the disaster appears. */
  readonly hint: string;
  readonly trigger: DisasterTrigger;
  readonly target: DisasterTarget;
  readonly warningSeconds: number;
  readonly activeSeconds: number;
  readonly escalatedSeconds: number;
  readonly warning: DisasterEffects;
  readonly active: DisasterEffects;
  readonly escalated: DisasterEffects;
  readonly workSeconds: number;
  readonly resolved: DisasterOutcome;
  readonly resolvedEarly: DisasterOutcome;
  readonly failed: DisasterOutcome;
  readonly maxOccurrences: number;
  readonly cooldownSeconds: number;
  readonly visual: VisualHint;
}

// ---------------------------------------------------------------- wedding moments

export interface MomentDef {
  readonly id: Id;
  readonly name: string;
  readonly announcement: string;
  /** The couple asks the planner to bring this item. */
  readonly itemId: Id;
  readonly patienceSeconds: number;
  readonly successMood: number;
  readonly successScore: number;
  readonly failMood: number;
  /** Flags set on success, e.g. unlocking cake-slice requests. */
  readonly setsFlags: readonly string[];
}

// ---------------------------------------------------------------- weddings & levels

export interface CharacterDef {
  readonly id: Id;
  readonly name: string;
  readonly visual: VisualHint;
}

export interface WeddingDef {
  readonly id: Id;
  readonly title: string;
  readonly partnerA: CharacterDef;
  readonly partnerB: CharacterDef;
  /** Decor tags the couple loves; matching decor in preparation pays off. */
  readonly lovesTags: readonly string[];
  readonly menuItemIds: readonly Id[];
  readonly coupleRequestItemIds: readonly Id[];
  readonly coupleRequestIntervalSeconds: readonly [number, number];
}

export interface LevelGuestSpec {
  /** Unique within the level; relationships refer to guests by this key. */
  readonly key: string;
  readonly name: string;
  readonly typeId: Id;
  readonly groupId: Id;
  readonly arriveAt: number;
  readonly bringsGift: boolean;
  /** Guest keys or group ids this guest likes / dislikes as table neighbours. */
  readonly likes: readonly string[];
  readonly dislikes: readonly string[];
}

export interface LevelDef {
  readonly id: Id;
  readonly order: number;
  readonly name: string;
  readonly weddingId: Id;
  readonly venueId: Id;
  readonly durationSeconds: number;
  readonly guests: readonly LevelGuestSpec[];
  readonly disasterIds: readonly Id[];
  readonly moments: readonly { readonly momentId: Id; readonly at: number }[];
  readonly kitchen: { readonly burners: number; readonly cookSeconds: number };
  /** Score needed for 1, 2 and 3 stars. */
  readonly starScores: readonly [number, number, number];
  readonly coinReward: number;
  readonly unlockRequiresLevelId?: Id;
  readonly introDialogueId?: Id;
  readonly outroDialogueId?: Id;
  readonly tutorialTips: readonly string[];
}

// ---------------------------------------------------------------- meta

export interface DecorDef {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly visual: VisualHint;
}

export interface UpgradeDef {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly modifiers: Modifiers;
}

export interface DialogueLine {
  readonly speaker: string;
  readonly text: string;
}

export interface DialogueDef {
  readonly id: Id;
  readonly lines: readonly DialogueLine[];
}

export interface ScoringRules {
  readonly guestSeated: number;
  readonly seatingLikeBonus: number;
  readonly orderTaken: number;
  readonly dishServed: number;
  readonly requestServed: number;
  readonly maxTip: number;
  readonly giftDelivered: number;
  readonly guestLeftUpset: number;
  readonly perHappyGuestHeartAtEnd: number;
  readonly perMoodPointAtEnd: number;
}

/** Game-feel constants shared by all levels. Kept in data so balancing never touches system code. */
export interface TuningDef {
  readonly plannerSpeed: number;
  readonly guestWalkSpeed: number;
  readonly maxQueuedActions: number;
  readonly hands: number;
  readonly work: {
    readonly takeOrder: number;
    readonly serve: number;
    readonly pickUp: number;
    readonly dropGifts: number;
    readonly discard: number;
  };
  readonly settleSeconds: readonly [number, number];
  readonly upsetSeconds: number;
  /** Patience drain factor for guests still queueing outside (no free waiting spot). */
  readonly outsideDrainFactor: number;
  readonly eatingRecoveryPerSecond: number;
  /** Contented guests slowly regain happiness between requests. */
  readonly satisfiedRecoveryPerSecond: number;
  readonly serveHappinessBoost: number;
  readonly seating: {
    readonly likePoints: number;
    readonly dislikePoints: number;
    readonly sameGroupPoints: number;
    /** Happiness per second per affinity point while seated. */
    readonly happinessPerPointPerSecond: number;
  };
  readonly mood: {
    readonly start: number;
    /** Slow recovery per second while no disaster is active and nobody is upset. */
    readonly calmRecoveryPerSecond: number;
    readonly guestUpset: number;
    readonly guestServed: number;
    readonly giftDelivered: number;
    readonly giftLost: number;
    readonly coupleRequestServed: number;
    readonly coupleRequestExpired: number;
  };
  readonly giftLostAfterSeconds: number;
  readonly coupleRequestPatienceSeconds: number;
  /** Bonus when the chosen decor matches something the couple loves. */
  readonly decorMatchBonus: Modifiers;
}

export interface GameInfo {
  readonly title: string;
  readonly tagline: string;
  /** The wedding planner the player controls. */
  readonly plannerName: string;
  /** Dialogue shown after the final level is completed. */
  readonly endingDialogueId?: Id;
  readonly finalLevelId?: Id;
}

/** One data pack. Packs are merged into a registry; later packs may add but not silently replace. */
export interface ContentPack {
  readonly id: Id;
  readonly info?: GameInfo;
  readonly scoring?: ScoringRules;
  readonly tuning?: TuningDef;
  readonly items?: readonly ItemDef[];
  readonly traits?: readonly TraitDef[];
  readonly guestTypes?: readonly GuestTypeDef[];
  readonly groups?: readonly GroupDef[];
  readonly venues?: readonly VenueDef[];
  readonly disasters?: readonly DisasterDef[];
  readonly moments?: readonly MomentDef[];
  readonly weddings?: readonly WeddingDef[];
  readonly levels?: readonly LevelDef[];
  readonly decor?: readonly DecorDef[];
  readonly upgrades?: readonly UpgradeDef[];
  readonly dialogues?: readonly DialogueDef[];
}
