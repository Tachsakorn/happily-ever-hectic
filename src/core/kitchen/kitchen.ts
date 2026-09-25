import type { Id } from '../../content/types';
import type { SimContext, System } from '../sim/SimContext';

/**
 * The kitchen cooks what the planner orders. Dishes are generic by type, so a
 * ready fish plate can go to any guest waiting for fish — a deliberate
 * prioritisation choice for the player. Burner count limits parallel cooking;
 * a full pass stalls finished dishes until the planner clears a slot.
 */
/** Queues a dish. With `plateSeconds` it is plated (a starter) and needs no burner. */
export function placeOrder(ctx: SimContext, guestKey: string, itemId: Id, plateSeconds?: number): void {
  ctx.state.kitchen.orders.push({ id: ctx.nextId(), itemId, guestKey, cookLeft: null, cookTotal: 0, ...(plateSeconds !== undefined ? { plateSeconds } : {}) });
}

export function cancelOrdersFor(ctx: SimContext, guestKey: string): void {
  const orders = ctx.state.kitchen.orders;
  for (let i = orders.length - 1; i >= 0; i--) if (orders[i]?.guestKey === guestKey) orders.splice(i, 1);
}

export function takeFromPass(ctx: SimContext, slot: number): Id | null {
  const pass = ctx.state.kitchen.pass;
  const itemId = pass[slot] ?? null;
  if (itemId !== null) pass[slot] = null;
  return itemId;
}

export const KitchenSystem: System = {
  name: 'kitchen',
  update(ctx, dt) {
    const { orders, pass } = ctx.state.kitchen;
    const cookTime = ctx.level.kitchen.cookSeconds * ctx.modifiers.kitchenCookTime;

    for (const o of orders) {
      if (o.plateSeconds !== undefined && o.cookLeft === null) {
        o.cookLeft = o.plateSeconds;
        o.cookTotal = o.plateSeconds;
      }
    }
    let cooking = orders.filter((o) => o.cookLeft !== null && o.plateSeconds === undefined).length;
    for (const o of orders) {
      if (o.plateSeconds !== undefined) continue;
      if (cooking >= ctx.level.kitchen.burners + Math.round(ctx.modifiers.kitchenBurners)) break;
      if (o.cookLeft === null) {
        o.cookLeft = cookTime;
        o.cookTotal = cookTime;
        cooking++;
      }
    }

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!o || o.cookLeft === null) continue;
      o.cookLeft = Math.max(0, o.cookLeft - dt);
      if (o.cookLeft > 0) continue;
      const slot = pass.indexOf(null);
      if (slot === -1) continue; // pass full: dish waits on the burner
      pass[slot] = o.itemId;
      orders.splice(i, 1);
      i--;
      ctx.events.emit({ type: 'dishReady', slot, itemId: o.itemId });
    }
  },
};
