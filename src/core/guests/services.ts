import type { StationDef, StationKind } from '../../content/types';
import { extendChain } from '../scoring/chain';
import type { SimContext } from '../sim/SimContext';
import { GuestState, MAX_HAPPINESS, type Guest } from '../sim/state';
import { consumeVisit, scheduleNextRequest } from './GuestSystem';
import { transitionGuest } from './guestMachine';

/**
 * Service requests: wishes granted at a station rather than carried over
 * (a song at the DJ booth). One visit grants every guest waiting on that
 * station at once, so letting a few requests pile up before going is a
 * legitimate — and rewarded — choice.
 */

/** Guests currently waiting on a service handled at this kind of station. */
export function guestsWaitingAt(ctx: SimContext, kind: StationKind): Guest[] {
  return ctx.state.guests.filter(
    (g) => g.state === GuestState.REQUESTING && g.wantsServiceId !== null && ctx.content.services.get(g.wantsServiceId).stationKind === kind,
  );
}

/** Where a guest's service wish is granted, if they have one and the venue has the station. */
export function serviceStation(ctx: SimContext, g: Guest): StationDef | null {
  if (g.state !== GuestState.REQUESTING || !g.wantsServiceId) return null;
  return ctx.venue.stationsOfKind(ctx.content.services.get(g.wantsServiceId).stationKind)[0] ?? null;
}

/** Grants every service wish handled at `station`. */
export function grantServicesAt(ctx: SimContext, station: StationDef): void {
  for (const g of guestsWaitingAt(ctx, station.kind)) {
    const serviceId = g.wantsServiceId as string;
    const tip = Math.round(ctx.score.rules.maxTip * (g.happiness / MAX_HAPPINESS) * g.mods.guestTip);
    g.happiness = Math.min(MAX_HAPPINESS, g.happiness + ctx.tuning.serveHappinessBoost);
    g.wantsServiceId = null;
    transitionGuest(ctx, g, GuestState.SATISFIED);
    consumeVisit(g);
    scheduleNextRequest(ctx, g);
    ctx.state.stats.servicesGranted++;
    const name = ctx.content.services.get(serviceId).name;
    ctx.score.add(ctx.score.rules.requestServed + tip, name, g.pos);
    ctx.mood.change(ctx.tuning.mood.guestServed, 'Happy guests', g.pos);
    extendChain(ctx, `service:${serviceId}`, g.pos);
    ctx.events.emit({ type: 'serviceGranted', serviceId, guestKey: g.key, from: station.pos, pos: g.pos });
  }
}
