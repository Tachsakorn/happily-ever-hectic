import type { Id, LevelGuestSpec } from '../../content/types';
import { fail, ok, type CommandResult } from '../sim/commands';
import { combineModifiers } from '../sim/modifiers';
import type { SimContext } from '../sim/SimContext';
import { GuestState, MAX_HAPPINESS, type Guest } from '../sim/state';
import { cancelOrdersFor } from '../kitchen/kitchen';
import { findGuest, holdsSeat, isDancing, transitionGuest } from './guestMachine';
import { isSeatFree, refreshTableMoods, tableScore } from './seating';

/** Creates a guest at the door and sends them to a free waiting spot (or queues them outside). */
export function spawnGuest(ctx: SimContext, spec: LevelGuestSpec): Guest {
  const type = ctx.content.guestTypes.get(spec.typeId);
  const traitMods = type.traitIds.map((id) => ctx.content.traits.get(id).modifiers);
  const mods = combineModifiers([...traitMods, ctx.modifiers]);
  const guest: Guest = {
    key: spec.key,
    name: spec.name,
    typeId: spec.typeId,
    groupId: spec.groupId,
    likes: spec.likes,
    dislikes: spec.dislikes,
    bringsGift: spec.bringsGift,
    mods,
    patienceSeconds: type.patienceSeconds,
    eatSeconds: type.eatSeconds * mods.guestEatTime,
    state: GuestState.ARRIVING,
    stateTime: 0,
    stateDuration: 0,
    pos: ctx.venue.def.doorPos,
    path: [],
    happiness: MAX_HAPPINESS,
    waitingSlot: null,
    seatId: null,
    tableId: null,
    wantsItemId: null,
    seatingMood: 0,
    nextRequestIn: 0,
    disasterDrain: 1,
    requestsLeft: type.staysFor ? Math.round(ctx.rng.range(type.staysFor[0], type.staysFor[1])) : null,
    danceSpot: null,
    happyExit: false,
  };
  ctx.state.guests.push(guest);
  ctx.events.emit({ type: 'guestArrived', guestKey: guest.key });
  const slot = freeWaitingSlot(ctx);
  if (slot !== null) {
    guest.waitingSlot = slot;
    guest.path = ctx.nav.findPath(guest.pos, waitingSlotPos(ctx, slot));
  } else {
    // No room inside: queue at the door, already waiting (and slowly losing patience).
    transitionGuest(ctx, guest, GuestState.WAITING_TO_BE_SEATED);
  }
  return guest;
}

function waitingSlotPos(ctx: SimContext, slot: number) {
  const p = ctx.venue.def.waitingSlots[slot];
  if (!p) throw new Error(`Waiting slot ${slot} out of range`);
  return p;
}

function freeWaitingSlot(ctx: SimContext): number | null {
  const used = new Set(ctx.state.guests.map((g) => g.waitingSlot).filter((s) => s !== null));
  for (let i = 0; i < ctx.venue.def.waitingSlots.length; i++) if (!used.has(i)) return i;
  return null;
}

/** Moves the longest-queued guest outside into a freed waiting spot. */
export function fillWaitingSlots(ctx: SimContext): void {
  for (const g of ctx.state.guests) {
    if (g.state !== GuestState.WAITING_TO_BE_SEATED || g.waitingSlot !== null) continue;
    const slot = freeWaitingSlot(ctx);
    if (slot === null) return;
    g.waitingSlot = slot;
    g.path = ctx.nav.findPath(g.pos, waitingSlotPos(ctx, slot));
  }
}

export function seatGuest(ctx: SimContext, guestKey: string, seatId: Id): CommandResult {
  const guest = findGuest(ctx, guestKey);
  if (!guest) return fail('No such guest');
  if (guest.state !== GuestState.WAITING_TO_BE_SEATED && guest.state !== GuestState.ARRIVING) {
    return fail('Guest is not waiting for a seat');
  }
  if (!ctx.venue.hasSeat(seatId)) return fail('No such seat');
  if (!isSeatFree(ctx, seatId)) return fail('Seat is taken');

  const { seat, table } = ctx.venue.seat(seatId);
  const score = tableScore(ctx, guest, table.id);
  guest.seatId = seatId;
  guest.tableId = table.id;
  guest.waitingSlot = null;
  guest.path = ctx.nav.findPath(guest.pos, seat.pos);
  transitionGuest(ctx, guest, GuestState.WALKING_TO_SEAT);
  refreshTableMoods(ctx, table.id);
  fillWaitingSlots(ctx);

  ctx.state.stats.guestsSeated++;
  ctx.events.emit({ type: 'guestSeated', guestKey, seatId, neighbourScore: score, pos: seat.pos });
  ctx.score.add(ctx.score.rules.guestSeated, 'Guest seated', seat.pos);
  if (score > 0) ctx.score.add(ctx.score.rules.seatingLikeBonus * score, 'Happy seating', seat.pos);
  return ok;
}

/** Sends a guest who asked to dance to a free spot on the dance floor. */
export function sendToDance(ctx: SimContext, guestKey: string): CommandResult {
  const guest = findGuest(ctx, guestKey);
  if (!guest) return fail('No such guest');
  if (guest.state !== GuestState.WANTS_TO_DANCE) return fail('They don’t want to dance right now');
  const spots = ctx.venue.def.danceSpots ?? [];
  const taken = new Set(ctx.state.guests.map((g) => g.danceSpot).filter((s) => s !== null));
  const spot = spots.findIndex((_, i) => !taken.has(i));
  if (spot === -1) return fail('The dance floor is full');
  guest.danceSpot = spot;
  guest.path = ctx.nav.findPath(guest.pos, spots[spot]!);
  transitionGuest(ctx, guest, GuestState.WALKING_TO_DANCE);
  if (guest.tableId) refreshTableMoods(ctx, guest.tableId);
  ctx.state.stats.dances++;
  ctx.events.emit({ type: 'guestDancing', guestKey, pos: spots[spot]! });
  ctx.score.add(ctx.score.rules.danceStarted, 'Dance floor', spots[spot]!);
  ctx.mood.change(ctx.tuning.mood.guestServed, 'Guests dancing', spots[spot]!);
  return ok;
}

/** A guest reaches the end of their patience (or is dragged into a disaster) and storms out. */
export function makeUpset(ctx: SimContext, guest: Guest, cause: string): void {
  if (guest.state === GuestState.UPSET || guest.state === GuestState.LEAVING || guest.state === GuestState.GONE) return;
  if (guest.state === GuestState.WALKING_TO_SEAT || isDancing(guest)) return;
  const tableId = guest.tableId;
  guest.happiness = 0;
  guest.wantsItemId = null;
  guest.waitingSlot = null;
  cancelOrdersFor(ctx, guest.key);
  transitionGuest(ctx, guest, GuestState.UPSET, ctx.tuning.upsetSeconds);
  ctx.state.stats.guestsUpset++;
  ctx.events.emit({ type: 'guestUpset', guestKey: guest.key, pos: guest.pos });
  ctx.mood.change(-ctx.tuning.mood.guestUpset, cause, guest.pos, 'Guests stormed off');
  ctx.score.add(ctx.score.rules.guestLeftUpset, 'Guest left upset', guest.pos);
  if (tableId && !holdsSeat(guest)) refreshTableMoods(ctx, tableId);
  fillWaitingSlots(ctx);
}
