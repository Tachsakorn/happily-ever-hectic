import { danceFloorBounds } from '../../content/danceFloor';
import type { Id, Vec2 } from '../../content/types';
import { holdsSeat, isPresent } from '../guests/guestMachine';
import { distance } from '../math/vec';
import type { SimContext } from '../sim/SimContext';
import { DisasterPhase, GuestState, type TargetRef } from '../sim/state';

/**
 * Touch hit-testing in world space, independent of sprites so it is testable
 * and identical on every renderer. Radii are generous: a hectic game played
 * with a thumb must forgive near-misses. When things overlap, the most urgent
 * kind wins (disasters, then people, then things).
 */
/** Characters are drawn standing on their position; touches land on their body, about this far above. */
const BODY_OFFSET_Y = 38;
const body = (p: Vec2): Vec2 => ({ x: p.x, y: p.y - BODY_OFFSET_Y });

const RADIUS = {
  disaster: 70,
  guest: 52,
  gift: 46,
  passSlot: 42,
  couple: 80,
} as const;

export function pickTarget(ctx: SimContext, p: Vec2): TargetRef | null {
  let best: { target: TargetRef; d: number; priority: number } | null = null;
  const consider = (target: TargetRef, pos: Vec2, radius: number, priority: number) => {
    const d = distance(p, pos);
    if (d > radius) return;
    if (!best || priority < best.priority || (priority === best.priority && d < best.d)) best = { target, d, priority };
  };

  for (const dis of ctx.state.disasters) {
    if (dis.phase === DisasterPhase.RESOLVED || dis.phase === DisasterPhase.FAILED) continue;
    // Station disasters are fixed by tapping the station itself.
    if (dis.stationId) continue;
    consider({ kind: 'disaster', id: dis.id }, dis.pos, RADIUS.disaster, 0);
  }
  for (const g of ctx.state.guests) {
    if (!isPresent(g) || g.state === GuestState.UPSET) continue;
    consider({ kind: 'guest', id: g.key }, body(g.pos), RADIUS.guest, 1);
  }
  consider({ kind: 'couple' }, ctx.venue.def.couplePos, RADIUS.couple, 1);
  for (const gift of ctx.state.gifts) {
    // Same priority as guests: gifts sit next to their owner, so the nearer one must win.
    if (gift.state === 'waiting') consider({ kind: 'gift', id: gift.id }, gift.pos, RADIUS.gift, 1);
  }
  ctx.venue.def.passSlots.forEach((pos, index) => {
    if (ctx.state.kitchen.pass[index]) consider({ kind: 'passSlot', index }, pos, RADIUS.passSlot, 2);
  });
  for (const s of ctx.venue.def.stations) {
    if (s.kind === 'entrance' || s.kind === 'coupleTable') continue;
    consider({ kind: 'station', id: s.id }, s.pos, s.hitRadius, 3);
  }
  return (best as { target: TargetRef } | null)?.target ?? null;
}

/** For seating: the nearest free seat to a point, if the point is on or near a table. */
export function pickSeat(ctx: SimContext, p: Vec2): Id | null {
  let best: { id: Id; d: number } | null = null;
  for (const table of ctx.venue.tables) {
    if (distance(p, table.pos) > table.radius + 110) continue;
    for (const seat of table.seats) {
      if (ctx.state.guests.some((g) => g.seatId === seat.id && holdsSeat(g))) continue;
      const d = distance(p, seat.pos);
      if (!best || d < best.d) best = { id: seat.id, d };
    }
  }
  return best?.id ?? null;
}

/** Forgiveness around the painted floor: a drop just past its edge still counts. */
const DANCE_FLOOR_MARGIN = 30;

/** Whether a point is on (or near) the dance floor, for dropping a dancer. */
export function isOnDanceFloor(ctx: SimContext, p: Vec2): boolean {
  const r = danceFloorBounds(ctx.venue.def);
  if (!r) return false;
  const m = DANCE_FLOOR_MARGIN;
  return p.x >= r.x - m && p.x <= r.x + r.w + m && p.y >= r.y - m && p.y <= r.y + r.h + m;
}

/** A guest under a point who can be dragged: waiting for a seat, or asking to dance. */
export function pickDraggableGuest(ctx: SimContext, p: Vec2): string | null {
  let best: { key: string; d: number } | null = null;
  for (const g of ctx.state.guests) {
    const draggable = g.state === GuestState.WAITING_TO_BE_SEATED || g.state === GuestState.ARRIVING || g.state === GuestState.WANTS_TO_DANCE;
    if (!draggable) continue;
    const d = distance(p, body(g.pos));
    if (d <= RADIUS.guest + 8 && (!best || d < best.d)) best = { key: g.key, d };
  }
  return best?.key ?? null;
}

/** The waiting guest under a point, for starting a seat drag. */
export function pickWaitingGuest(ctx: SimContext, p: Vec2): string | null {
  let best: { key: string; d: number } | null = null;
  for (const g of ctx.state.guests) {
    if (g.state !== GuestState.WAITING_TO_BE_SEATED && g.state !== GuestState.ARRIVING) continue;
    const d = distance(p, body(g.pos));
    if (d <= RADIUS.guest + 8 && (!best || d < best.d)) best = { key: g.key, d };
  }
  return best?.key ?? null;
}
