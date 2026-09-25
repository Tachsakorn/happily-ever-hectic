import type { DisasterDef, DisasterEffects, DisasterOutcome } from '../../content/types';
import { makeUpset } from '../guests/guestActions';
import { findGuest, isAtTable, isWaiting } from '../guests/guestMachine';
import { distance } from '../math/vec';
import type { SimContext, System } from '../sim/SimContext';
import { DisasterPhase, type Disaster, type DisasterPhaseId } from '../sim/state';
import { pickTarget, shouldTrigger } from './disasterKinds';

const NEARBY_RADIUS = 240;

/**
 * Generic disaster lifecycle: WARNING → ACTIVE → ESCALATED → FAILED, or
 * RESOLVED at any point when the planner fixes it (earlier = better). All
 * specifics — timings, effects, outcomes — come from DisasterDef data.
 */
export function effectsFor(def: DisasterDef, phase: DisasterPhaseId): DisasterEffects | null {
  switch (phase) {
    case DisasterPhase.WARNING:
      return def.warning;
    case DisasterPhase.ACTIVE:
      return def.active;
    case DisasterPhase.ESCALATED:
      return def.escalated;
    default:
      return null;
  }
}

function phaseDuration(ctx: SimContext, def: DisasterDef, phase: DisasterPhaseId): number {
  switch (phase) {
    case DisasterPhase.WARNING:
      return def.warningSeconds * ctx.modifiers.disasterWarningTime;
    case DisasterPhase.ACTIVE:
      return def.activeSeconds;
    case DisasterPhase.ESCALATED:
      return def.escalatedSeconds;
    default:
      return 0;
  }
}

function setPhase(ctx: SimContext, d: Disaster, phase: DisasterPhaseId): void {
  const def = ctx.content.disasters.get(d.defId);
  d.phase = phase;
  d.phaseTime = 0;
  d.phaseDuration = phaseDuration(ctx, def, phase);
  ctx.events.emit({ type: 'disasterPhaseChanged', disasterId: d.id, defId: d.defId, phase, pos: d.pos });
}

function applyOutcome(ctx: SimContext, d: Disaster, outcome: DisasterOutcome, label: string): void {
  if (outcome.mood) ctx.mood.change(outcome.mood, label, d.pos);
  if (outcome.score) ctx.score.add(outcome.score, label, d.pos);
  const upset = outcome.upsetGuests ?? 'none';
  if (upset === 'none') return;
  const keys =
    upset === 'involved'
      ? d.involvedGuestKeys
      : ctx.state.guests.filter((g) => d.tableId !== null && g.tableId === d.tableId).map((g) => g.key);
  for (const key of keys) {
    const g = findGuest(ctx, key);
    if (g && (isAtTable(g) || isWaiting(g))) makeUpset(ctx, g, `${g.name} left after the ${ctx.content.disasters.get(d.defId).name.toLowerCase()}`);
  }
}

export function resolveDisaster(ctx: SimContext, d: Disaster): void {
  const def = ctx.content.disasters.get(d.defId);
  const early = d.phase === DisasterPhase.WARNING;
  d.phase = DisasterPhase.RESOLVED;
  ctx.state.stats.disastersResolved++;
  ctx.events.emit({ type: 'disasterResolved', disasterId: d.id, defId: d.defId, early, pos: d.pos });
  applyOutcome(ctx, d, early ? def.resolvedEarly : def.resolved, early ? `${def.name} prevented` : `${def.name} fixed`);
}

function failDisaster(ctx: SimContext, d: Disaster): void {
  const def = ctx.content.disasters.get(d.defId);
  d.phase = DisasterPhase.FAILED;
  ctx.state.stats.disastersFailed++;
  ctx.events.emit({ type: 'disasterFailed', disasterId: d.id, defId: d.defId, pos: d.pos });
  applyOutcome(ctx, d, def.failed, def.name);
}

/** Per-level bookkeeping of how often each disaster has fired. */
interface DisasterTracker {
  occurrences: Map<string, number>;
  cooldownUntil: Map<string, number>;
}

export function createDisasterSystem(): System {
  const tracker: DisasterTracker = { occurrences: new Map(), cooldownUntil: new Map() };

  function maybeSpawn(ctx: SimContext, dt: number): void {
    for (const defId of ctx.level.disasterIds) {
      const def = ctx.content.disasters.get(defId);
      const count = tracker.occurrences.get(defId) ?? 0;
      if (count >= def.maxOccurrences) continue;
      if (ctx.state.time < (tracker.cooldownUntil.get(defId) ?? 0)) continue;
      if (ctx.state.disasters.some((d) => d.defId === defId)) continue; // one live instance per kind
      if (!shouldTrigger(def, { ctx, def, dt })) continue;
      const spot = pickTarget(def, ctx);
      if (!spot) continue;
      const d: Disaster = {
        id: ctx.nextId(),
        defId,
        phase: DisasterPhase.WARNING,
        phaseTime: 0,
        phaseDuration: phaseDuration(ctx, def, DisasterPhase.WARNING),
        ...spot,
      };
      ctx.state.disasters.push(d);
      tracker.occurrences.set(defId, count + 1);
      tracker.cooldownUntil.set(defId, ctx.state.time + def.cooldownSeconds);
      ctx.events.emit({ type: 'disasterStarted', disasterId: d.id, defId, pos: d.pos });
      // A zero-length warning means the problem is simply there already.
      if (d.phaseDuration <= 0) setPhase(ctx, d, DisasterPhase.ACTIVE);
    }
  }

  function applyEffects(ctx: SimContext, d: Disaster, dt: number): void {
    const def = ctx.content.disasters.get(d.defId);
    const fx = effectsFor(def, d.phase);
    if (!fx) return;
    if (fx.moodPerSecond) ctx.mood.accumulate(-fx.moodPerSecond * dt, def.name, d.pos);
    if (fx.stopsKitchen) ctx.state.kitchen.stalled = true;
    const drain = fx.guestDrainMultiplier;
    if (!drain || drain === 1) return;
    const scope = fx.guestScope ?? 'all';
    for (const g of ctx.state.guests) {
      const inScope =
        scope === 'all' ||
        (scope === 'table' && d.tableId !== null && g.tableId === d.tableId) ||
        (scope === 'involved' && d.involvedGuestKeys.includes(g.key)) ||
        (scope === 'nearby' && distance(g.pos, d.pos) <= NEARBY_RADIUS);
      // Drama-prone guests take it harder; easygoing ones shrug it off.
      if (inScope) g.disasterDrain *= 1 + (drain - 1) * g.mods.disasterReaction;
    }
  }

  return {
    name: 'disasters',
    update(ctx, dt) {
      for (const g of ctx.state.guests) g.disasterDrain = 1;
      ctx.state.kitchen.stalled = false;
      maybeSpawn(ctx, dt);
      for (const d of ctx.state.disasters) {
        if (d.phase === DisasterPhase.RESOLVED || d.phase === DisasterPhase.FAILED) continue;
        d.phaseTime += dt;
        if (d.phaseTime >= d.phaseDuration) {
          if (d.phase === DisasterPhase.WARNING) setPhase(ctx, d, DisasterPhase.ACTIVE);
          else if (d.phase === DisasterPhase.ACTIVE) setPhase(ctx, d, DisasterPhase.ESCALATED);
          else {
            failDisaster(ctx, d);
            continue;
          }
        }
        applyEffects(ctx, d, dt);
      }
      // Finished disasters have already announced themselves; drop them.
      for (let i = ctx.state.disasters.length - 1; i >= 0; i--) {
        const d = ctx.state.disasters[i];
        if (d && (d.phase === DisasterPhase.RESOLVED || d.phase === DisasterPhase.FAILED)) ctx.state.disasters.splice(i, 1);
      }
    },
  };
}
