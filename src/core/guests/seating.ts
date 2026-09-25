import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id, TuningDef } from '../../content/types';
import type { SimContext } from '../sim/SimContext';
import type { Guest } from '../sim/state';
import { holdsSeat } from './guestMachine';

/**
 * Seating rules, "sit next to" style: only the guests in the seats right
 * beside you matter (the classic Dash rule, easy to read at a glance). A
 * guest's comfort is the sum of their affinity with each side neighbour:
 * explicit likes/dislikes (by guest or by group), same-group familiarity, and
 * trait adjustments (a social butterfly enjoys strangers). Affinity is
 * directional: A may enjoy B while B hates A.
 */
export function affinity(content: ContentRegistry, tuning: TuningDef, guest: Guest, neighbour: Guest): number {
  let points = 0;
  if (refersTo(guest.likes, neighbour)) points += tuning.seating.likePoints;
  if (refersTo(guest.dislikes, neighbour)) points -= tuning.seating.dislikePoints;

  const traits = guest.traitIds.map((id) => content.traits.get(id));
  if (neighbour.groupId === guest.groupId) {
    points += tuning.seating.sameGroupPoints;
    for (const t of traits) points += t.sameGroupBonus ?? 0;
  } else {
    for (const t of traits) points += t.otherGroupBonus ?? 0;
  }
  return points;
}

/** Whether a likes/dislikes list names this guest or their group. */
export function refersTo(list: readonly string[], other: Pick<Guest, 'key' | 'groupId'>): boolean {
  return list.includes(other.key) || list.includes(other.groupId);
}

/** Guests holding the seats beside `seatId` (other than `excludeKey`). */
export function seatNeighbours(ctx: SimContext, seatId: Id, excludeKey: string): Guest[] {
  const adjacent = ctx.venue.adjacentSeats(seatId);
  return ctx.state.guests.filter((g) => g.key !== excludeKey && g.seatId !== null && adjacent.includes(g.seatId) && holdsSeat(g));
}

/** Total affinity `guest` would feel in `seatId` next to its current neighbours. */
export function seatScore(ctx: SimContext, guest: Guest, seatId: Id): number {
  return seatNeighbours(ctx, seatId, guest.key).reduce((sum, n) => sum + affinity(ctx.content, ctx.tuning, guest, n), 0);
}

/** Recomputes the continuous seating mood of everyone at a table (call whenever its occupants change). */
export function refreshTableMoods(ctx: SimContext, tableId: Id): void {
  for (const g of ctx.state.guests) {
    if (g.tableId === tableId && g.seatId !== null && holdsSeat(g)) {
      g.seatingMood = seatScore(ctx, g, g.seatId) * ctx.tuning.seating.happinessPerPointPerSecond;
    }
  }
}

export function isSeatFree(ctx: SimContext, seatId: Id): boolean {
  return !ctx.state.guests.some((g) => g.seatId === seatId && holdsSeat(g));
}

/** Two seated guests side by side where at least one dislikes the other. */
export function findConflicts(ctx: SimContext): { tableId: Id; a: Guest; b: Guest }[] {
  const out: { tableId: Id; a: Guest; b: Guest }[] = [];
  const seated = ctx.state.guests.filter((g) => g.tableId !== null && holdsSeat(g) && g.state !== 'WALKING_TO_SEAT');
  for (let i = 0; i < seated.length; i++) {
    for (let j = i + 1; j < seated.length; j++) {
      const a = seated[i] as Guest;
      const b = seated[j] as Guest;
      if (a.tableId === null || a.seatId === null || b.seatId === null) continue;
      if (!ctx.venue.adjacentSeats(a.seatId).includes(b.seatId)) continue;
      if (refersTo(a.dislikes, b) || refersTo(b.dislikes, a)) out.push({ tableId: a.tableId, a, b });
    }
  }
  return out;
}
