import type { SimContext, System } from '../sim/SimContext';
import { DisasterPhase, GuestState } from '../sim/state';
import { servedItem } from '../sim/items';
import { coupleStateFor } from './coupleState';

const STATE_HYSTERESIS = 2;

/** Moves the couple into the mood band their mood is in now, announcing any change. */
export function syncCoupleState(ctx: SimContext): void {
  const couple = ctx.state.couple;
  const next = coupleStateFor(ctx.tuning, couple.mood);
  if (next.id === couple.state) return;
  // Climbing back up needs a little margin, so a mood hovering on a boundary doesn't flicker.
  const bands = ctx.tuning.coupleStates;
  const better = bands.findIndex((b) => b.id === next.id) < bands.findIndex((b) => b.id === couple.state);
  if (better && couple.mood < next.minMood + STATE_HYSTERESIS) return;
  const from = couple.state;
  couple.state = next.id;
  ctx.events.emit({ type: 'coupleStateChanged', from, to: next.id });
}

/** Stressed couples are less patient with their requests. */
function requestPatience(ctx: SimContext, seconds: number): number {
  return seconds * coupleStateFor(ctx.tuning, ctx.state.couple.mood).requestPatience;
}

function scheduleCoupleRequest(ctx: SimContext): void {
  const [min, max] = ctx.wedding.coupleRequestIntervalSeconds;
  ctx.state.couple.nextRequestIn = ctx.rng.range(min, max);
}

/** Called when the planner hands the couple what they asked for. */
export function serveCouple(ctx: SimContext): void {
  const request = ctx.state.couple.request;
  if (!request) return;
  const pos = ctx.venue.def.couplePos;
  ctx.state.couple.request = null;
  scheduleCoupleRequest(ctx);
  ctx.events.emit({ type: 'itemServed', to: 'couple', itemId: request.itemId, wasOrder: false, happiness: 0, pos });
  if (request.momentId) {
    const moment = ctx.content.moments.get(request.momentId);
    for (const flag of moment.setsFlags) ctx.state.flags.add(flag);
    ctx.state.stats.momentsCompleted++;
    ctx.events.emit({ type: 'momentCompleted', momentId: moment.id });
    ctx.mood.change(moment.successMood, moment.name, pos);
    ctx.score.add(moment.successScore, moment.name, pos);
  } else {
    ctx.mood.change(ctx.tuning.mood.coupleRequestServed, 'Couple looked after', pos);
    ctx.score.add(ctx.score.rules.requestServed, 'Couple looked after', pos);
  }
}

/** Starts a wedding moment: it replaces any small request the couple had, because the moment matters more. */
export function startMoment(ctx: SimContext, momentId: string): void {
  const moment = ctx.content.moments.get(momentId);
  const itemId = servedItem(ctx, moment.itemId);
  ctx.state.couple.request = {
    itemId,
    momentId,
    timeLeft: moment.patienceSeconds,
    total: moment.patienceSeconds,
  };
  ctx.events.emit({ type: 'momentStarted', momentId });
  ctx.events.emit({ type: 'coupleRequested', itemId, momentId });
}

/**
 * The couple: their requests and moments, and the calm-recovery rule —
 * a reception with no active trouble slowly soothes them, so good play is
 * visibly rewarded, not just bad play punished.
 */
export function createCoupleSystem(): System {
  let initialised = false;
  return {
    name: 'couple',
    update(ctx, dt) {
      const couple = ctx.state.couple;
      if (!initialised) {
        initialised = true;
        scheduleCoupleRequest(ctx);
      }
      const pos = ctx.venue.def.couplePos;

      if (couple.request) {
        couple.request.timeLeft -= dt;
        if (couple.request.timeLeft <= 0) {
          const { itemId, momentId } = couple.request;
          couple.request = null;
          scheduleCoupleRequest(ctx);
          ctx.events.emit({ type: 'coupleRequestExpired', itemId, momentId });
          if (momentId) {
            const moment = ctx.content.moments.get(momentId);
            ctx.state.stats.momentsFailed++;
            ctx.events.emit({ type: 'momentFailed', momentId });
            ctx.mood.change(-moment.failMood, `${moment.name} missed`, pos);
          } else {
            ctx.state.stats.coupleRequestsMissed++;
            ctx.mood.change(-ctx.tuning.mood.coupleRequestExpired, 'Couple was ignored', pos);
          }
        }
      } else if (ctx.wedding.coupleRequestItemIds.length) {
        couple.nextRequestIn -= dt;
        if (couple.nextRequestIn <= 0) {
          const itemId = ctx.rng.pick(ctx.wedding.coupleRequestItemIds);
          if (itemId) {
            const patience = requestPatience(ctx, ctx.tuning.coupleRequestPatienceSeconds);
            couple.request = { itemId, momentId: null, timeLeft: patience, total: patience };
            ctx.events.emit({ type: 'coupleRequested', itemId, momentId: null });
          }
        }
      }

      const trouble =
        ctx.state.disasters.some((d) => d.phase === DisasterPhase.ACTIVE || d.phase === DisasterPhase.ESCALATED) ||
        ctx.state.guests.some((g) => g.state === GuestState.UPSET);
      if (!trouble) ctx.mood.accumulate(ctx.tuning.mood.calmRecoveryPerSecond * dt, 'Calm, happy reception', pos);
    },
  };
}
