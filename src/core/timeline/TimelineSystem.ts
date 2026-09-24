import type { LevelDef, LevelGuestSpec } from '../../content/types';
import { spawnGuest } from '../guests/guestActions';
import type { System } from '../sim/SimContext';
import { startMoment } from '../couple/CoupleSystem';

/**
 * Drives the level's script: guest arrivals and wedding moments (cake
 * cutting, toasts) at their authored times. Level files describe *when*;
 * this system only makes it happen.
 */
export function createTimelineSystem(level: LevelDef): System {
  const guests: readonly LevelGuestSpec[] = [...level.guests].sort((a, b) => a.arriveAt - b.arriveAt);
  const moments = [...level.moments].sort((a, b) => a.at - b.at);
  let nextGuest = 0;
  let nextMoment = 0;
  return {
    name: 'timeline',
    update(ctx) {
      for (let spec = guests[nextGuest]; spec && spec.arriveAt <= ctx.state.time; spec = guests[++nextGuest]) {
        spawnGuest(ctx, spec);
      }
      for (let m = moments[nextMoment]; m && m.at <= ctx.state.time; m = moments[++nextMoment]) {
        startMoment(ctx, m.momentId);
      }
    },
  };
}
