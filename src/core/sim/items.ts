import type { StationDef } from '../../content/types';
import type { SimContext } from './SimContext';

/**
 * A level can serve different things than the venue and guest types normally
 * do (`LevelDef.itemSwaps`): the finale pours bubble tea where the hall pours
 * champagne. Every place that decides what someone wants or what a station
 * hands out goes through these, so a swap is consistent everywhere.
 */
export function servedItem(ctx: Pick<SimContext, 'level'>, itemId: string): string {
  return ctx.level.itemSwaps?.[itemId] ?? itemId;
}

export function stationItem(ctx: Pick<SimContext, 'level'>, station: StationDef): string | undefined {
  return station.providesItemId ? servedItem(ctx, station.providesItemId) : undefined;
}
