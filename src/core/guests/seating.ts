import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id, TuningDef } from '../../content/types';
import type { SimContext } from '../sim/SimContext';
import type { Guest } from '../sim/state';
import { holdsSeat } from './guestMachine';

/**
 * Seating rules. A guest's comfort at a table is the sum of their affinity
 * with each neighbour: explicit likes/dislikes (by guest or by group), plus
 * same-group familiarity, plus trait adjustments (e.g. a social butterfly
 * enjoys strangers). Affinity is directional: A may enjoy B while B hates A.
 */
export function affinity(content: ContentRegistry, tuning: TuningDef, guest: Guest, neighbour: Guest): number {
  let points = 0;
  const refs = (list: readonly string[]) => list.includes(neighbour.key) || list.includes(neighbour.groupId);
  if (refs(guest.likes)) points += tuning.seating.likePoints;
  if (refs(guest.dislikes)) points -= tuning.seating.dislikePoints;

  const traits = content.guestTypes.get(guest.typeId).traitIds.map((id) => content.traits.get(id));
  if (neighbour.groupId === guest.groupId) {
    points += tuning.seating.sameGroupPoints;
    for (const t of traits) points += t.sameGroupBonus ?? 0;
  } else {
    for (const t of traits) points += t.otherGroupBonus ?? 0;
  }
  return points;
}

export function tableNeighbours(ctx: SimContext, tableId: Id, excludeKey: string): Guest[] {
  return ctx.state.guests.filter((g) => g.tableId === tableId && g.key !== excludeKey && holdsSeat(g));
}

/** Total affinity `guest` would feel sitting at `tableId` with its current occupants. */
export function tableScore(ctx: SimContext, guest: Guest, tableId: Id): number {
  return tableNeighbours(ctx, tableId, guest.key).reduce(
    (sum, n) => sum + affinity(ctx.content, ctx.tuning, guest, n),
    0,
  );
}

/** Recomputes the continuous seating mood of everyone at a table (call whenever its occupants change). */
export function refreshTableMoods(ctx: SimContext, tableId: Id): void {
  for (const g of ctx.state.guests) {
    if (g.tableId === tableId && holdsSeat(g)) {
      g.seatingMood = tableScore(ctx, g, tableId) * ctx.tuning.seating.happinessPerPointPerSecond;
    }
  }
}

export function isSeatFree(ctx: SimContext, seatId: Id): boolean {
  return !ctx.state.guests.some((g) => g.seatId === seatId && holdsSeat(g));
}

/** Two seated guests at the same table where at least one dislikes the other. */
export function findConflicts(ctx: SimContext): { tableId: Id; a: Guest; b: Guest }[] {
  const out: { tableId: Id; a: Guest; b: Guest }[] = [];
  const seated = ctx.state.guests.filter((g) => g.tableId !== null && holdsSeat(g) && g.state !== 'WALKING_TO_SEAT');
  for (let i = 0; i < seated.length; i++) {
    for (let j = i + 1; j < seated.length; j++) {
      const a = seated[i] as Guest;
      const b = seated[j] as Guest;
      if (a.tableId !== b.tableId || a.tableId === null) continue;
      const dislikes = (x: Guest, y: Guest) => x.dislikes.includes(y.key) || x.dislikes.includes(y.groupId);
      if (dislikes(a, b) || dislikes(b, a)) out.push({ tableId: a.tableId, a, b });
    }
  }
  return out;
}
