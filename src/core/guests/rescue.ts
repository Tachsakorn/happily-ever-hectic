import { fail, ok, type CommandResult } from '../sim/commands';
import type { SimContext } from '../sim/SimContext';
import { MAX_HAPPINESS } from '../sim/state';
import { isAtTable, isWaiting } from './guestMachine';

/**
 * Rescue champagne: an emergency button with a few uses per wedding. Popping
 * a bottle cheers up every guest in the room at once (and lifts the couple a
 * little), no walking needed. Unopened bottles pay a bonus at the end, so
 * using one is a real decision rather than a free heal.
 */
export function useRescue(ctx: SimContext): CommandResult {
  const { state, tuning } = ctx;
  if (state.rescuesLeft <= 0) return fail('No champagne left');
  state.rescuesLeft--;
  state.stats.rescuesUsed++;
  for (const g of state.guests) {
    if (isWaiting(g) || isAtTable(g)) g.happiness = Math.min(MAX_HAPPINESS, g.happiness + tuning.rescue.guestHappiness);
  }
  if (tuning.rescue.mood) ctx.mood.change(tuning.rescue.mood, 'Rescue champagne', ctx.venue.def.couplePos);
  ctx.events.emit({ type: 'rescueUsed', left: state.rescuesLeft });
  return ok;
}
