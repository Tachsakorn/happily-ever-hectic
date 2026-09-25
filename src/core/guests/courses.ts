import type { Id } from '../../content/types';
import { placeOrder } from '../kitchen/kitchen';
import { servedItem } from '../sim/items';
import type { SimContext } from '../sim/SimContext';
import { GuestState, type CourseKind, type Guest } from '../sim/state';
import { transitionGuest } from './guestMachine';

/*
 * The reception meal, in order: starter → main → dessert. Which courses a
 * wedding has comes from its data (a wedding without starters or dessert just
 * skips them). How each course reaches the guest:
 *   starter  — the kitchen plates it as soon as the guest wants it; carry it over
 *   main     — the guest orders (tap them), the kitchen cooks it; carry it over
 *   dessert  — pick it up at the dessert table; carry it over
 */

export function courseList(ctx: SimContext): readonly CourseKind[] {
  const w = ctx.wedding;
  const list: CourseKind[] = [];
  if (w.appetizerItemIds?.length) list.push('appetizer');
  list.push('main');
  if (w.dessertItemId) list.push('dessert');
  return list;
}

export const hasCourseLeft = (ctx: SimContext, g: Guest): boolean => g.nextCourse < courseList(ctx).length;

/** Starts the guest's next course. Returns false when the meal is over. */
export function startNextCourse(ctx: SimContext, g: Guest): boolean {
  const course = courseList(ctx)[g.nextCourse];
  if (!course) return false;
  g.nextCourse++;
  g.course = course;
  switch (course) {
    case 'appetizer': {
      const item = servedItem(ctx, ctx.rng.pick(ctx.wedding.appetizerItemIds ?? []) as Id);
      g.wantsItemId = item;
      placeOrder(ctx, g.key, item, ctx.tuning.courses.appetizerPlateSeconds);
      transitionGuest(ctx, g, GuestState.WAITING_FOR_FOOD);
      break;
    }
    case 'main':
      transitionGuest(ctx, g, GuestState.READY_TO_ORDER);
      break;
    case 'dessert':
      g.wantsItemId = servedItem(ctx, ctx.wedding.dessertItemId as Id);
      transitionGuest(ctx, g, GuestState.WAITING_FOR_FOOD);
      break;
  }
  return true;
}

/** Seconds a guest takes to eat the course they were just served. */
export function eatSecondsFor(ctx: SimContext, g: Guest): number {
  const f = ctx.tuning.courses;
  if (g.course === 'appetizer') return g.eatSeconds * f.appetizerEatFactor;
  if (g.course === 'dessert') return g.eatSeconds * f.dessertEatFactor;
  return g.eatSeconds;
}

/** Score and ledger label for serving a course. */
export function servedCourse(ctx: SimContext, g: Guest): { points: number; label: string } {
  const r = ctx.score.rules;
  if (g.course === 'appetizer') return { points: r.appetizerServed, label: 'Starter served' };
  if (g.course === 'dessert') return { points: r.dessertServed, label: 'Dessert served' };
  return { points: r.dishServed, label: 'Dinner served' };
}
