import type { Vec2 } from '../../content/types';
import type { SimContext } from '../sim/SimContext';

/*
 * Chains: doing the same kind of job several times in a row pays a growing
 * bonus — serve three salads back to back and the third pays +2 steps. Any
 * other kind of job starts a new chain. Fetching things (picking up plates,
 * binning), seating guests and sending dancers are neutral: they neither
 * extend nor break a chain, because they are how the next link gets done.
 *
 * Chain keys: `serve:<itemId>`, `order`, `gift`, `fix`, `couple`.
 */
export function extendChain(ctx: SimContext, key: string, pos: Vec2 | null): void {
  const chain = ctx.state.chain;
  if (chain.key === key) {
    chain.count++;
    const bonus = ctx.score.rules.chainBonusPerStep * (chain.count - 1);
    ctx.state.stats.bestChain = Math.max(ctx.state.stats.bestChain, chain.count);
    ctx.score.add(bonus, 'Chain bonus', pos);
    ctx.events.emit({ type: 'chainChanged', key, count: chain.count, bonus, broken: 0, pos });
    return;
  }
  const broken = chain.count >= 2 ? chain.count : 0;
  chain.key = key;
  chain.count = 1;
  ctx.state.stats.bestChain = Math.max(ctx.state.stats.bestChain, 1);
  ctx.events.emit({ type: 'chainChanged', key, count: 1, bonus: 0, broken, pos });
}
