import type { SimContext } from '../sim/SimContext';
import { GuestState, MAX_HAPPINESS, type Guest, type GuestStateId } from '../sim/state';

/**
 * Legal guest transitions. Anything not listed is a bug and throws, which
 * keeps the guest lifecycle predictable as behaviours are added.
 */
const TRANSITIONS: Readonly<Record<GuestStateId, readonly GuestStateId[]>> = {
  ARRIVING: ['WAITING_TO_BE_SEATED', 'WALKING_TO_SEAT', 'UPSET'],
  WAITING_TO_BE_SEATED: ['WALKING_TO_SEAT', 'UPSET'],
  WALKING_TO_SEAT: ['SEATED'],
  SEATED: ['READY_TO_ORDER', 'UPSET'],
  READY_TO_ORDER: ['WAITING_FOR_FOOD', 'UPSET'],
  WAITING_FOR_FOOD: ['EATING', 'UPSET'],
  EATING: ['SATISFIED', 'UPSET'],
  // SATISFIED → LEAVING is the happy goodbye once the visit is over.
  SATISFIED: ['REQUESTING', 'WANTS_TO_DANCE', 'LEAVING', 'UPSET'],
  REQUESTING: ['SATISFIED', 'UPSET'],
  WANTS_TO_DANCE: ['WALKING_TO_DANCE', 'UPSET'],
  WALKING_TO_DANCE: ['DANCING'],
  DANCING: ['RETURNING_TO_SEAT'],
  RETURNING_TO_SEAT: ['SATISFIED'],
  UPSET: ['LEAVING'],
  LEAVING: ['GONE'],
  GONE: [],
};

/** States in which a guest is waiting on the player and loses patience. */
const WAITING_STATES: ReadonlySet<GuestStateId> = new Set<GuestStateId>([
  GuestState.WAITING_TO_BE_SEATED,
  GuestState.READY_TO_ORDER,
  GuestState.WAITING_FOR_FOOD,
  GuestState.REQUESTING,
  GuestState.WANTS_TO_DANCE,
]);

/** States in which a guest is away from their seat for a dance but keeps it. */
const DANCE_STATES: ReadonlySet<GuestStateId> = new Set<GuestStateId>([
  GuestState.WALKING_TO_DANCE,
  GuestState.DANCING,
  GuestState.RETURNING_TO_SEAT,
]);

/** States in which a guest occupies a seat at a table. */
const AT_TABLE_STATES: ReadonlySet<GuestStateId> = new Set<GuestStateId>([
  GuestState.SEATED,
  GuestState.READY_TO_ORDER,
  GuestState.WAITING_FOR_FOOD,
  GuestState.EATING,
  GuestState.SATISFIED,
  GuestState.REQUESTING,
  GuestState.WANTS_TO_DANCE,
]);

export const isWaiting = (g: Guest): boolean => WAITING_STATES.has(g.state);
export const isAtTable = (g: Guest): boolean => AT_TABLE_STATES.has(g.state);
export const isDancing = (g: Guest): boolean => DANCE_STATES.has(g.state);
/** Holds a seat (including while walking to it, or away dancing). */
export const holdsSeat = (g: Guest): boolean =>
  g.seatId !== null && (isAtTable(g) || isDancing(g) || g.state === GuestState.WALKING_TO_SEAT);
export const isPresent = (g: Guest): boolean => g.state !== GuestState.GONE && g.state !== GuestState.LEAVING;

/** 0–5 hearts, the player-facing view of happiness. */
export const hearts = (g: Guest): number => Math.ceil((g.happiness / MAX_HAPPINESS) * 5 - 1e-9);

export function canTransition(from: GuestStateId, to: GuestStateId): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionGuest(ctx: SimContext, guest: Guest, to: GuestStateId, duration = 0): void {
  if (!canTransition(guest.state, to)) {
    throw new Error(`Illegal guest transition ${guest.key}: ${guest.state} -> ${to}`);
  }
  const from = guest.state;
  guest.state = to;
  guest.stateTime = 0;
  guest.stateDuration = duration;
  ctx.events.emit({ type: 'guestStateChanged', guestKey: guest.key, from, to });
}

export function findGuest(ctx: SimContext, key: string): Guest | undefined {
  return ctx.state.guests.find((g) => g.key === key);
}
