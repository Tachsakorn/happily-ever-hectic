import type { DisasterDef, DisasterTarget, DisasterTrigger, Vec2 } from '../../content/types';
import { findConflicts } from '../guests/seating';
import { holdsSeat, isAtTable } from '../guests/guestMachine';
import type { SimContext } from '../sim/SimContext';
import { DisasterPhase, type Disaster } from '../sim/state';

/**
 * Trigger and target *kinds* are the extension points of the disaster system.
 * A new disaster made from existing kinds is pure data; a genuinely new
 * mechanic registers one new kind here and nothing else changes.
 */

export interface TriggerContext {
  readonly ctx: SimContext;
  readonly def: DisasterDef;
  readonly dt: number;
}

type TriggerFn<K extends DisasterTrigger['kind']> = (
  t: Extract<DisasterTrigger, { kind: K }>,
  tc: TriggerContext,
) => boolean;

const triggers: { [K in DisasterTrigger['kind']]: TriggerFn<K> } = {
  scheduled: (t, { ctx }) => ctx.state.time >= t.at,
  random: (t, { ctx, dt }) =>
    ctx.state.time >= t.from && ctx.state.time <= t.to && ctx.rng.chance(t.chancePerSecond * dt * ctx.modifiers.disasterChance),
  seatingConflict: (t, { ctx, dt }) =>
    ctx.state.time >= (t.from ?? 0) &&
    findConflicts(ctx).length > 0 &&
    ctx.rng.chance(t.chancePerSecond * dt * ctx.modifiers.disasterChance),
};

export interface TargetSpot {
  readonly pos: Vec2;
  readonly interactPos: Vec2;
  readonly stationId: string | null;
  readonly tableId: string | null;
  readonly involvedGuestKeys: readonly string[];
}

type TargetFn<K extends DisasterTarget['kind']> = (
  t: Extract<DisasterTarget, { kind: K }>,
  ctx: SimContext,
) => TargetSpot | null;

const isLive = (d: Disaster) => d.phase !== DisasterPhase.RESOLVED && d.phase !== DisasterPhase.FAILED;
const tableTaken = (ctx: SimContext, tableId: string) => ctx.state.disasters.some((d) => isLive(d) && d.tableId === tableId);

const targets: { [K in DisasterTarget['kind']]: TargetFn<K> } = {
  station: (t, ctx) => {
    const free = ctx.venue
      .stationsOfKind(t.stationKind)
      .filter((s) => !ctx.state.disasters.some((d) => isLive(d) && d.stationId === s.id));
    const s = ctx.rng.pick(free);
    return s ? { pos: s.pos, interactPos: s.interactPos, stationId: s.id, tableId: null, involvedGuestKeys: [] } : null;
  },
  conflictTable: (_t, ctx) => {
    const conflict = ctx.rng.pick(findConflicts(ctx).filter((c) => !tableTaken(ctx, c.tableId)));
    if (!conflict || !conflict.a.seatId) return null;
    const table = ctx.venue.table(conflict.tableId);
    return {
      pos: table.pos,
      interactPos: ctx.venue.seat(conflict.a.seatId).seat.interactPos,
      stationId: null,
      tableId: table.id,
      involvedGuestKeys: [conflict.a.key, conflict.b.key],
    };
  },
  occupiedTable: (_t, ctx) => {
    const tableIds = [...new Set(ctx.state.guests.filter((g) => isAtTable(g) && g.tableId).map((g) => g.tableId as string))];
    const tableId = ctx.rng.pick(tableIds.filter((id) => !tableTaken(ctx, id)));
    if (!tableId) return null;
    const table = ctx.venue.table(tableId);
    const guests = ctx.state.guests.filter((g) => g.tableId === tableId && holdsSeat(g));
    const firstSeat = guests[0]?.seatId;
    return {
      pos: table.pos,
      interactPos: firstSeat ? ctx.venue.seat(firstSeat).seat.interactPos : table.pos,
      stationId: null,
      tableId,
      involvedGuestKeys: guests.map((g) => g.key),
    };
  },
  floorSpot: (_t, ctx) => {
    const spot = ctx.rng.pick(ctx.venue.def.waypoints);
    return spot ? { pos: spot, interactPos: spot, stationId: null, tableId: null, involvedGuestKeys: [] } : null;
  },
};

/** The level's own trigger for this disaster if it choreographs one, else the disaster's default. */
export function triggerFor(def: DisasterDef, ctx: SimContext): DisasterTrigger {
  return ctx.level.disasterTriggers?.[def.id] ?? def.trigger;
}

export function shouldTrigger(def: DisasterDef, tc: TriggerContext): boolean {
  const trigger = triggerFor(def, tc.ctx);
  const fn = triggers[trigger.kind] as TriggerFn<typeof trigger.kind>;
  return fn(trigger as never, tc);
}

export function pickTarget(def: DisasterDef, ctx: SimContext): TargetSpot | null {
  const fn = targets[def.target.kind] as TargetFn<typeof def.target.kind>;
  return fn(def.target as never, ctx);
}
