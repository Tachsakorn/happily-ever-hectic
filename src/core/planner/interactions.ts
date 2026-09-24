import { GIFT_ITEM_ID } from '../../content/contracts';
import type { Vec2 } from '../../content/types';
import { findGuest, transitionGuest } from '../guests/guestMachine';
import { scheduleNextRequest } from '../guests/GuestSystem';
import { placeOrder, takeFromPass } from '../kitchen/kitchen';
import { distance } from '../math/vec';
import type { SimContext } from '../sim/SimContext';
import { DisasterPhase, GuestState, MAX_HAPPINESS, type Disaster, type TargetRef } from '../sim/state';
import { resolveDisaster } from '../disasters/DisasterSystem';
import { serveCouple } from '../couple/CoupleSystem';
import { stationItem } from '../sim/items';

/**
 * What happens when the planner reaches a tapped target. Resolution happens on
 * arrival (not when tapped), because the world changes while she walks: the
 * dish may be gone, the guest may have left. That is the genre's core
 * contract — plan ahead, but the world keeps moving.
 */
export type Resolution = { readonly work: number; readonly perform: () => void } | { readonly skip: string };


export function handsUsed(ctx: SimContext): number {
  return ctx.state.planner.hands.reduce((n, id) => n + ctx.content.items.get(id).hands, 0);
}

function hasRoomFor(ctx: SimContext, itemId: string): boolean {
  return handsUsed(ctx) + ctx.content.items.get(itemId).hands <= ctx.tuning.hands;
}

function removeFromHands(ctx: SimContext, itemId: string): boolean {
  const i = ctx.state.planner.hands.indexOf(itemId);
  if (i === -1) return false;
  ctx.state.planner.hands.splice(i, 1);
  return true;
}

function liveDisaster(ctx: SimContext, id: number): Disaster | undefined {
  return ctx.state.disasters.find(
    (d) => d.id === id && d.phase !== DisasterPhase.RESOLVED && d.phase !== DisasterPhase.FAILED,
  );
}

function disasterAtStation(ctx: SimContext, stationId: string): Disaster | undefined {
  return ctx.state.disasters.find(
    (d) => d.stationId === stationId && d.phase !== DisasterPhase.RESOLVED && d.phase !== DisasterPhase.FAILED,
  );
}

/** Where the planner should stand for a target, or null if the target no longer exists. */
export function targetPosition(ctx: SimContext, target: TargetRef): Vec2 | null {
  switch (target.kind) {
    case 'guest': {
      const g = findGuest(ctx, target.id);
      if (!g || g.state === GuestState.GONE || g.state === GuestState.LEAVING) return null;
      return g.seatId ? ctx.venue.seat(g.seatId).seat.interactPos : g.pos;
    }
    case 'couple':
      return ctx.venue.firstStationOfKind('coupleTable').interactPos;
    case 'station':
      return ctx.venue.hasStation(target.id) ? ctx.venue.station(target.id).interactPos : null;
    case 'passSlot':
      return ctx.venue.firstStationOfKind('kitchenPass').interactPos;
    case 'gift': {
      const gift = ctx.state.gifts.find((x) => x.id === target.id && x.state === 'waiting');
      if (!gift) return null;
      const owner = findGuest(ctx, gift.guestKey);
      return owner?.seatId ? ctx.venue.seat(owner.seatId).seat.interactPos : gift.pos;
    }
    case 'disaster':
      return liveDisaster(ctx, target.id)?.interactPos ?? null;
  }
}

function resolveGuest(ctx: SimContext, key: string): Resolution {
  const g = findGuest(ctx, key);
  if (!g) return { skip: 'They left' };
  const w = ctx.tuning.work;

  if (g.state === GuestState.READY_TO_ORDER) {
    return {
      work: w.takeOrder,
      perform: () => {
        const dish = ctx.rng.pick(ctx.wedding.menuItemIds) ?? ctx.wedding.menuItemIds[0];
        if (!dish) return;
        g.wantsItemId = dish;
        placeOrder(ctx, g.key, dish);
        transitionGuest(ctx, g, GuestState.WAITING_FOR_FOOD);
        ctx.events.emit({ type: 'orderTaken', guestKey: g.key, itemId: dish, pos: g.pos });
        ctx.score.add(ctx.score.rules.orderTaken, 'Order taken', g.pos);
      },
    };
  }

  const wanted = g.wantsItemId;
  const serving = g.state === GuestState.WAITING_FOR_FOOD || g.state === GuestState.REQUESTING;
  if (serving && wanted && ctx.state.planner.hands.includes(wanted)) {
    return {
      work: w.serve,
      perform: () => {
        if (!removeFromHands(ctx, wanted)) return;
        const wasOrder = g.state === GuestState.WAITING_FOR_FOOD;
        const tip = Math.round(ctx.score.rules.maxTip * (g.happiness / MAX_HAPPINESS) * g.mods.guestTip);
        g.happiness = Math.min(MAX_HAPPINESS, g.happiness + ctx.tuning.serveHappinessBoost);
        g.wantsItemId = null;
        if (wasOrder) {
          transitionGuest(ctx, g, GuestState.EATING, g.eatSeconds);
          ctx.state.stats.guestsServed++;
          ctx.score.add(ctx.score.rules.dishServed + tip, 'Dinner served', g.pos);
        } else {
          transitionGuest(ctx, g, GuestState.SATISFIED);
          scheduleNextRequest(ctx, g);
          ctx.score.add(ctx.score.rules.requestServed + tip, 'Request served', g.pos);
        }
        ctx.mood.change(ctx.tuning.mood.guestServed, 'Happy guests', g.pos);
        ctx.events.emit({ type: 'itemServed', to: 'guest', guestKey: g.key, itemId: wanted, wasOrder, happiness: g.happiness, pos: g.pos });
      },
    };
  }
  if (serving && wanted) return { skip: `Needs ${ctx.content.items.get(wanted).name}` };
  if (g.state === GuestState.WAITING_TO_BE_SEATED || g.state === GuestState.ARRIVING) {
    return { skip: 'Drag guests to a seat' };
  }
  return { skip: 'All good here' };
}

function resolvePickup(ctx: SimContext, itemId: string, pos: Vec2): Resolution {
  if (!hasRoomFor(ctx, itemId)) return { skip: 'Hands full' };
  return {
    work: ctx.tuning.work.pickUp,
    perform: () => {
      ctx.state.planner.hands.push(itemId);
      ctx.events.emit({ type: 'itemPickedUp', itemId, pos });
    },
  };
}

function resolveStation(ctx: SimContext, stationId: string): Resolution {
  const station = ctx.venue.station(stationId);
  const disaster = disasterAtStation(ctx, stationId);
  if (disaster) return resolveDisasterWork(ctx, disaster);
  const w = ctx.tuning.work;
  const hands = ctx.state.planner.hands;

  switch (station.kind) {
    case 'coupleTable':
      return resolveCouple(ctx);
    case 'giftTable': {
      const count = hands.filter((h) => h === GIFT_ITEM_ID).length;
      if (!count) return { skip: 'No gifts in hand' };
      return {
        work: w.dropGifts,
        perform: () => {
          const carried = ctx.state.gifts.filter((g) => g.state === 'carried');
          for (const gift of carried) gift.state = 'delivered';
          ctx.state.planner.hands = hands.filter((h) => h !== GIFT_ITEM_ID);
          ctx.state.stats.giftsDelivered += carried.length;
          ctx.events.emit({ type: 'giftsDelivered', count: carried.length, pos: station.pos });
          ctx.score.add(ctx.score.rules.giftDelivered * carried.length, 'Gifts delivered', station.pos);
          ctx.mood.change(ctx.tuning.mood.giftDelivered * carried.length, 'Gifts on the gift table', station.pos);
        },
      };
    }
    case 'bin': {
      const discardable = hands.filter((h) => h !== GIFT_ITEM_ID);
      if (!discardable.length) return { skip: 'Nothing to throw away' };
      return {
        work: w.discard,
        perform: () => {
          ctx.state.planner.hands = hands.filter((h) => h === GIFT_ITEM_ID);
          ctx.events.emit({ type: 'itemDiscarded', itemIds: discardable, pos: station.pos });
        },
      };
    }
    case 'kitchenPass': {
      const slot = ctx.state.kitchen.pass.findIndex((s) => s !== null);
      if (slot === -1) return { skip: 'Nothing ready yet' };
      return resolvePassSlot(ctx, slot);
    }
    case 'cakeTable': {
      const itemId = stationItem(ctx, station);
      if (!itemId) return { skip: 'Nothing here' };
      if (ctx.state.couple.request?.itemId !== itemId) return { skip: 'Not time for the cake yet' };
      if (hands.includes(itemId)) return { skip: 'Already carrying it' };
      return resolvePickup(ctx, itemId, station.pos);
    }
    case 'drinkTap':
    case 'dessertTable': {
      const itemId = stationItem(ctx, station);
      return itemId ? resolvePickup(ctx, itemId, station.pos) : { skip: 'Nothing here' };
    }
    default:
      return { skip: 'All calm here' };
  }
}

function resolvePassSlot(ctx: SimContext, slot: number): Resolution {
  const itemId = ctx.state.kitchen.pass[slot];
  if (!itemId) return { skip: 'Already taken' };
  if (!hasRoomFor(ctx, itemId)) return { skip: 'Hands full' };
  const pos = ctx.venue.def.passSlots[slot] ?? ctx.venue.firstStationOfKind('kitchenPass').pos;
  return {
    work: ctx.tuning.work.pickUp,
    perform: () => {
      const taken = takeFromPass(ctx, slot);
      if (!taken) return;
      ctx.state.planner.hands.push(taken);
      ctx.events.emit({ type: 'itemPickedUp', itemId: taken, pos });
    },
  };
}

/**
 * Tapping the couple serves what they asked for; otherwise it fixes a problem
 * at their table (e.g. missing rings). The couple and their table are one
 * tap target, so both must be reachable from it.
 */
function resolveCouple(ctx: SimContext): Resolution {
  const request = ctx.state.couple.request;
  const canServe = !!request && ctx.state.planner.hands.includes(request.itemId);
  if (!canServe) {
    const table = ctx.venue.stationsOfKind('coupleTable')[0];
    const disaster = table ? disasterAtStation(ctx, table.id) : undefined;
    if (disaster) return resolveDisasterWork(ctx, disaster);
  }
  if (!request) return { skip: 'The couple is fine' };
  if (!ctx.state.planner.hands.includes(request.itemId)) {
    return { skip: `They want ${ctx.content.items.get(request.itemId).name}` };
  }
  return {
    work: ctx.tuning.work.serve,
    perform: () => {
      if (removeFromHands(ctx, request.itemId)) serveCouple(ctx);
    },
  };
}

function resolveDisasterWork(ctx: SimContext, d: Disaster): Resolution {
  const def = ctx.content.disasters.get(d.defId);
  return {
    work: def.workSeconds,
    perform: () => {
      if (liveDisaster(ctx, d.id)) resolveDisaster(ctx, d);
    },
  };
}

export function resolveInteraction(ctx: SimContext, target: TargetRef): Resolution {
  switch (target.kind) {
    case 'guest':
      return resolveGuest(ctx, target.id);
    case 'couple':
      return resolveCouple(ctx);
    case 'station':
      return resolveStation(ctx, target.id);
    case 'passSlot':
      return resolvePassSlot(ctx, target.index);
    case 'gift': {
      const gift = ctx.state.gifts.find((g) => g.id === target.id && g.state === 'waiting');
      if (!gift) return { skip: 'Gift already handled' };
      if (!hasRoomFor(ctx, GIFT_ITEM_ID)) return { skip: 'Hands full' };
      return {
        work: ctx.tuning.work.pickUp,
        perform: () => {
          gift.state = 'carried';
          ctx.state.planner.hands.push(GIFT_ITEM_ID);
          ctx.events.emit({ type: 'giftPickedUp', giftId: gift.id, pos: gift.pos });
        },
      };
    }
    case 'disaster': {
      const d = liveDisaster(ctx, target.id);
      return d ? resolveDisasterWork(ctx, d) : { skip: 'Already handled' };
    }
  }
}

export function isNear(a: Vec2, b: Vec2, radius: number): boolean {
  return distance(a, b) <= radius;
}
