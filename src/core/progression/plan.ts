import type { ContentRegistry } from '../../content/ContentRegistry';
import { PLAN_CATEGORIES, type Id, type PlanCategory, type PlanOptionDef } from '../../content/types';

/**
 * The wedding plan: one pick per category (flowers, menu, cake, honeymoon)
 * made on the preparation screen. The invitation gives clues; every pick that
 * matches something the couple loves starts them happier and adds score.
 * Pure functions over content — the plan itself is plain data.
 */
export type Plan = Readonly<Partial<Record<PlanCategory, Id>>>;

/**
 * The categories offered for a wedding: those its invitation gives a clue for
 * (a choice without a clue would be a blind guess), minus the menu when the
 * wedding has a set menu.
 */
export function planCategories(content: ContentRegistry, weddingId: Id): PlanCategory[] {
  const wedding = content.weddings.get(weddingId);
  return PLAN_CATEGORIES.filter(
    (c) =>
      !!wedding.planHints?.[c] &&
      !(c === 'menu' && wedding.menuLocked) &&
      content.planOptions.all().some((o) => o.category === c),
  );
}

export function planOptions(content: ContentRegistry, category: PlanCategory): PlanOptionDef[] {
  return content.planOptions.all().filter((o) => o.category === category);
}

export function optionMatches(content: ContentRegistry, weddingId: Id, optionId: Id | undefined): boolean {
  if (!optionId || !content.planOptions.has(optionId)) return false;
  const loves = content.weddings.get(weddingId).lovesTags;
  return content.planOptions.get(optionId).tags.some((t) => loves.includes(t));
}

/** The categories where the plan picked something the couple loves. */
export function planMatches(content: ContentRegistry, weddingId: Id, plan: Plan): PlanCategory[] {
  return planCategories(content, weddingId).filter((c) => optionMatches(content, weddingId, plan[c]));
}

/** The mains the kitchen serves under this plan, if the menu pick changes them. */
export function planMenu(content: ContentRegistry, weddingId: Id, plan: Plan): readonly Id[] | undefined {
  if (content.weddings.get(weddingId).menuLocked || !plan.menu || !content.planOptions.has(plan.menu)) return undefined;
  return content.planOptions.get(plan.menu).menuItemIds;
}

/** A plan with the first option in every category (used when nothing was chosen). */
export function defaultPlan(content: ContentRegistry, weddingId: Id): Plan {
  const plan: Partial<Record<PlanCategory, Id>> = {};
  for (const c of planCategories(content, weddingId)) {
    const first = planOptions(content, c)[0];
    if (first) plan[c] = first.id;
  }
  return plan;
}
