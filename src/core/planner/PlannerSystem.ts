import { walk } from '../guests/GuestSystem';
import { fail, ok, type CommandResult } from '../sim/commands';
import type { SimContext, System } from '../sim/SimContext';
import { DisasterPhase, type TargetRef } from '../sim/state';
import { distance } from '../math/vec';
import { resolveInteraction, targetPosition } from './interactions';

const SLOW_ZONE_RADIUS = 90;

export function queueAction(ctx: SimContext, target: TargetRef): CommandResult {
  const planner = ctx.state.planner;
  const queued = planner.queue.length + (planner.current ? 1 : 0);
  if (queued >= ctx.tuning.maxQueuedActions) return fail('Too many tasks queued');
  if (!targetPosition(ctx, target)) return fail('Nothing there');
  const action = { id: ctx.nextId(), target };
  planner.queue.push(action);
  ctx.events.emit({ type: 'actionQueued', actionId: action.id, target });
  return ok;
}

export function clearQueue(ctx: SimContext): CommandResult {
  const planner = ctx.state.planner;
  planner.queue.length = 0;
  if (planner.current?.phase === 'walking') {
    planner.current = null;
    planner.path = [];
  }
  ctx.events.emit({ type: 'queueCleared' });
  return ok;
}

/** Disasters with a planner-slowing effect (e.g. a spilled drink) slow her down near them. */
function speedMultiplier(ctx: SimContext): number {
  let m = ctx.modifiers.plannerSpeed;
  for (const d of ctx.state.disasters) {
    if (d.phase === DisasterPhase.RESOLVED || d.phase === DisasterPhase.FAILED) continue;
    const def = ctx.content.disasters.get(d.defId);
    const effects = d.phase === DisasterPhase.WARNING ? def.warning : d.phase === DisasterPhase.ACTIVE ? def.active : def.escalated;
    if (effects.plannerSpeedMultiplier && distance(ctx.state.planner.pos, d.pos) < SLOW_ZONE_RADIUS) {
      m *= effects.plannerSpeedMultiplier;
    }
  }
  return m;
}

export const PlannerSystem: System = {
  name: 'planner',
  update(ctx, dt) {
    const planner = ctx.state.planner;

    if (!planner.current) {
      const next = planner.queue.shift();
      if (!next) return;
      const dest = targetPosition(ctx, next.target);
      if (!dest) {
        ctx.events.emit({ type: 'actionSkipped', actionId: next.id, reason: 'Nothing there any more', pos: planner.pos });
        return;
      }
      planner.path = ctx.nav.findPath(planner.pos, dest);
      planner.current = { action: next, phase: 'walking', workLeft: 0, workTotal: 0 };
    }

    const current = planner.current;
    if (current.phase === 'walking') {
      const before = planner.pos.x;
      const arrived = walk(planner, ctx.tuning.plannerSpeed * speedMultiplier(ctx), dt);
      if (planner.pos.x !== before) planner.facing = planner.pos.x > before ? 1 : -1;
      if (!arrived) return;
      const resolution = resolveInteraction(ctx, current.action.target);
      if ('skip' in resolution) {
        ctx.events.emit({ type: 'actionSkipped', actionId: current.action.id, reason: resolution.skip, pos: planner.pos });
        planner.current = null;
        return;
      }
      current.phase = 'working';
      current.workLeft = resolution.work;
      current.workTotal = resolution.work;
    }

    current.workLeft -= dt;
    if (current.workLeft > 0) return;
    planner.current = null;
    // Re-resolve on completion: the world may have changed during the work
    // (the guest stormed off, the dish was taken). This also keeps state pure data.
    const resolution = resolveInteraction(ctx, current.action.target);
    if ('skip' in resolution) {
      ctx.events.emit({ type: 'actionSkipped', actionId: current.action.id, reason: resolution.skip, pos: planner.pos });
      return;
    }
    resolution.perform();
  },
};
