import type { ContentRegistry } from '../content/ContentRegistry';
import type { GoalDef, Id, PlanCategory } from '../content/types';
import { isUnlocked } from '../core/progression/progression';
import { planCategories, planMatches, planOptions, type Plan } from '../core/progression/plan';
import { goalKey } from '../core/progression/goals';
import type { ResultOutcome } from '../core/progression/progression';
import type { SaveData } from '../core/progression/saveData';
import type { ReceptionResult } from '../core/scoring/results';
import type { DecorLook } from '../art/venuePainter';
import { characterLook, everydayLook, plannerLook } from '../art/characters';
import type { PersonLook } from '../art/people';
import type { DialogueLine } from '../content/types';
import type { DialogueLineVM } from '../ui/screens/DialogueScreen';
import type { MainMenuVM } from '../ui/screens/MainMenuScreen';
import type { LevelCardVM, ShopItemVM } from '../ui/screens/LevelSelectScreen';
import type { PrepVM } from '../ui/screens/PrepScreen';
import type { ResultsVM } from '../ui/screens/InPlayScreens';
import type { AchievementVM } from '../ui/screens/AchievementsPanel';
import { achievementProgress } from '../core/progression/achievements';

/** Pure builders: content + save → what screens display. Screens never read content or saves directly. */

export function levelCards(content: ContentRegistry, save: SaveData): LevelCardVM[] {
  const finalId = content.info.finalLevelId;
  return content.orderedLevels().map((l, i) => {
    const w = content.weddings.get(l.weddingId);
    const p = save.levels[l.id];
    return {
      id: l.id,
      number: i + 1,
      name: l.name,
      couple: w.title,
      stars: p?.stars ?? 0,
      bestScore: p?.bestScore ?? 0,
      unlocked: isUnlocked(save, l),
      isFinal: l.id === finalId,
    };
  });
}

export function shopItems(content: ContentRegistry, save: SaveData): ShopItemVM[] {
  return content.upgrades
    .all()
    .map((u) => ({ id: u.id, name: u.name, description: u.description, cost: u.cost, owned: save.upgrades.includes(u.id), icon: u.icon }));
}

const PLAN_TITLES: Record<PlanCategory, string> = {
  decor: 'Pick the flowers',
  menu: 'Pick the menu',
  cake: 'Pick the cake',
  honeymoon: 'Pick the honeymoon',
};

/** Player-facing wording for a bonus goal. */
export function describeGoal(goal: GoalDef): string {
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  switch (goal.kind) {
    case 'maxUpset':
      return goal.count === 0 ? 'No guest storms off' : `At most ${plural(goal.count, 'guest')} storm off`;
    case 'minChain':
      return `Make a ×${goal.count} chain`;
    case 'minFinalMood':
      return `Couple’s mood ${goal.value}+ at the end`;
    case 'noDisasterFailed':
      return 'No disaster gets out of hand';
    case 'allMoments':
      return 'Nail every wedding moment';
    case 'minSongs':
      return `Play ${plural(goal.count, 'requested song')}`;
    case 'noRescue':
      return 'Win without the champagne';
    case 'minHappyGoodbyes':
      return `${plural(goal.count, 'happy goodbye')}`;
    case 'minGifts':
      return `Deliver ${plural(goal.count, 'gift')}`;
  }
}

export function prepVM(content: ContentRegistry, save: SaveData, levelId: Id): PrepVM {
  const level = content.levels.get(levelId);
  const wedding = content.weddings.get(level.weddingId);
  const mins = Math.floor(level.durationSeconds / 60);
  const secs = level.durationSeconds % 60;
  const done = save.levels[levelId]?.goals ?? [];
  return {
    levelName: level.name,
    couple: wedding.title,
    partners: [characterLook(wedding.partnerA), characterLook(wedding.partnerB)],
    // The reception ends when the guests have gone; this is only an estimate.
    minutes: `about ${mins + (secs >= 30 ? 1 : 0)} min`,
    guestCount: level.guests.length,
    moments: level.moments.map((m) => content.moments.get(m.momentId).name),
    disasters: level.disasterIds.map((d) => content.disasters.get(d).name),
    upgrades: save.upgrades.filter((u) => content.upgrades.has(u)).map((u) => content.upgrades.get(u).name),
    // The clue is the puzzle: which pick is right is only revealed once the reception starts.
    steps: planCategories(content, wedding.id).map((category) => ({
      category,
      title: PLAN_TITLES[category],
      hint: wedding.planHints?.[category] ?? '',
      options: planOptions(content, category).map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        color: o.visual.color,
        accent: o.visual.accent,
        icon: o.visual.icon,
      })),
    })),
    goals: (level.goals ?? []).map((g) => ({ text: describeGoal(g), done: done.includes(goalKey(g)) })),
    starScores: level.starScores,
  };
}

/** How the room is dressed: the flower colour of the plan's decor pick. */
export function decorLook(content: ContentRegistry, plan: Plan | null): DecorLook {
  const decorId = plan?.decor;
  const decor = decorId && content.planOptions.has(decorId) ? content.planOptions.get(decorId) : planOptions(content, 'decor')[0];
  const flower = decor?.visual.color ?? 0xf2a7b8;
  return { flower, cloth: 0xfffcf8 };
}

/** The line announced as the reception starts: how many of the couple's wishes the plan got right. */
export function planNote(content: ContentRegistry, levelId: Id, plan: Plan): string | null {
  const weddingId = content.levels.get(levelId).weddingId;
  const total = planCategories(content, weddingId).length;
  if (!total) return null;
  const right = planMatches(content, weddingId, plan).length;
  if (right === total) return `Perfect plan! Every one of the couple’s ${total} wishes came true.`;
  if (right === 0) return 'The couple hoped for something different… no wishes matched this time.';
  return `Your plan got ${right} of the couple’s ${total} wishes right!`;
}

export function nextLevelId(content: ContentRegistry, save: SaveData, levelId: Id): Id | null {
  const levels = content.orderedLevels();
  const i = levels.findIndex((l) => l.id === levelId);
  const next = levels[i + 1];
  return next && isUnlocked(save, next) ? next.id : null;
}

/** Why a wedding was lost, biggest cause first, and one tip for next time. */
function failureVM(content: ContentRegistry, result: ReceptionResult): ResultsVM['failure'] {
  if (result.outcome === 'COMPLETE') return null;
  const s = result.stats;
  const t = content.tuning.mood;
  const causes = [
    { n: s.guestsUpset, weight: t.guestUpset, text: (n: number) => `${n} guest${n === 1 ? '' : 's'} stormed off`, tip: 'Watch for red, shaking bubbles — and pop the champagne when many guests are fuming.' },
    { n: s.disastersFailed, weight: 12, text: (n: number) => `${n} disaster${n === 1 ? '' : 's'} got out of hand`, tip: 'Fix disasters while they are still warnings: it is quicker and earns a bonus.' },
    { n: s.momentsFailed, weight: 12, text: (n: number) => `${n} wedding moment${n === 1 ? '' : 's'} missed`, tip: 'Wedding moments come first: drop everything when the couple calls.' },
    { n: s.coupleRequestsMissed, weight: t.coupleRequestExpired, text: (n: number) => `The couple was ignored ${n === 1 ? 'once' : `${n} times`}`, tip: 'Keep an eye on the sweetheart table: the couple’s own requests matter most.' },
  ]
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n * b.weight - a.n * a.weight);
  const blow = result.moodBreakdown.find((b) => b.amount < 0);
  const reasons = causes.map((c) => c.text(c.n));
  if (blow) reasons.push(`Biggest blow: ${blow.cause} (−${Math.abs(blow.amount)})`);
  return {
    reasons: reasons.length ? reasons : ['Stress piled up faster than it was calmed down'],
    tip: causes[0]?.tip ?? 'Keep the couple calm: a quiet, well-run room slowly lifts their mood.',
  };
}

export function resultsVM(
  content: ContentRegistry,
  result: ReceptionResult,
  outcome: ResultOutcome,
  hasNext: boolean,
  plan: Plan | null,
): ResultsVM {
  const s = result.stats;
  const level = content.levels.get(result.levelId);
  const rescues = level.rescues ?? 0;
  const planTotal = planCategories(content, level.weddingId).length;
  const planRight = plan ? planMatches(content, level.weddingId, plan).length : 0;
  const everDone = outcome.save.levels[level.id]?.goals ?? [];
  return {
    levelName: content.levels.get(result.levelId).name,
    success: result.outcome === 'COMPLETE',
    score: result.score,
    stars: result.stars,
    newBest: outcome.newBest,
    coinsEarned: outcome.coinsEarned,
    coins: outcome.save.coins,
    finalMood: result.finalMood,
    stats: [
      { label: 'Courses served', value: String(s.coursesServed) },
      { label: 'Best chain', value: s.bestChain >= 2 ? `×${s.bestChain}` : '—' },
      { label: 'Gifts delivered', value: String(s.giftsDelivered) },
      ...(s.dances || s.servicesGranted ? [{ label: 'Dances · songs', value: `${s.dances} · ${s.servicesGranted}` }] : []),
      ...(rescues ? [{ label: 'Champagne saved', value: `${rescues - s.rescuesUsed} / ${rescues}` }] : []),

      { label: 'Disasters fixed', value: `${s.disastersResolved} / ${s.disastersResolved + s.disastersFailed}` },
      { label: 'Wedding moments', value: `${s.momentsCompleted} / ${s.momentsCompleted + s.momentsFailed}` },
      { label: 'Guests: happy · upset', value: `${s.guestsLeftHappy} · ${s.guestsUpset}` },
      ...(planTotal ? [{ label: 'Wedding plan', value: `${planRight} / ${planTotal} wishes` }] : []),
    ],
    goals: (level.goals ?? []).map((g) => {
      const key = goalKey(g);
      return { text: describeGoal(g), done: everDone.includes(key), isNew: outcome.newGoals.includes(key) };
    }),
    failure: failureVM(content, result),
    moodBreakdown: result.moodBreakdown,
    unlocked: outcome.newlyUnlocked.map((id) => content.levels.get(id).name),
    hasNext,
    firstStarScore: content.levels.get(result.levelId).starScores[0],
    achievements: outcome.newAchievements.map((id) => {
      const a = content.achievements.get(id);
      return { name: a.name, icon: a.icon, color: a.color };
    }),
  };
}

/** The couple on the title screen: the final wedding's couple (the players themselves, in a personal pack). */
export function menuVM(content: ContentRegistry, save: SaveData): MainMenuVM {
  const finalId = content.info.finalLevelId;
  const level = finalId && content.levels.has(finalId) ? content.levels.get(finalId) : content.orderedLevels()[0];
  const wedding = level ? content.weddings.get(level.weddingId) : null;
  return {
    title: content.info.title,
    tagline: content.info.tagline,
    settings: save.settings,
    testTools: save.settings.testTools,
    couple: wedding ? [characterLook(wedding.partnerA), characterLook(wedding.partnerB)] : null,
    coupleNames: wedding?.title ?? '',
  };
}

const EXTRA_OUTFITS = [0x8fd0e8, 0xb49be0, 0xf2b84b, 0x7fb08a, 0xe8a07a];

/**
 * Gives every dialogue speaker a face and a side. A speaker who is a partner
 * in any wedding looks like that character; the planner looks like the
 * planner; anyone else gets a stable everyday look.
 */
export function dialogueVM(content: ContentRegistry, lines: readonly DialogueLine[], levelId: Id | null): DialogueLineVM[] {
  const preferred = levelId ? content.weddings.get(content.levels.get(levelId).weddingId) : null;
  const weddings = preferred ? [preferred, ...content.weddings.all().filter((w) => w.id !== preferred.id)] : content.weddings.all();
  const lookFor = (speaker: string): PersonLook => {
    if (speaker === content.info.plannerName) return plannerLook('happy');
    for (const w of weddings) {
      if (w.partnerA.name === speaker) return characterLook(w.partnerA);
      if (w.partnerB.name === speaker) return characterLook(w.partnerB);
    }
    let h = 0;
    for (const ch of speaker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return everydayLook(speaker, EXTRA_OUTFITS[h % EXTRA_OUTFITS.length]!, 'happy');
  };
  const sides = new Map<string, 'left' | 'right'>();
  const looks = new Map<string, PersonLook>();
  return lines.map((line) => {
    if (!sides.has(line.speaker)) {
      sides.set(line.speaker, sides.size % 2 === 0 ? 'left' : 'right');
      looks.set(line.speaker, lookFor(line.speaker));
    }
    return { speaker: line.speaker, text: line.text, side: sides.get(line.speaker)!, look: looks.get(line.speaker) };
  });
}

/** The trophy cabinet: visible achievements first, then secrets; unlocked ones always show in full. */
export function achievementsVM(content: ContentRegistry, save: SaveData): { items: AchievementVM[]; unlocked: number; total: number } {
  const all = content.achievements.all();
  const ordered = [...all.filter((a) => !a.secret), ...all.filter((a) => a.secret)];
  const items = ordered.map((a): AchievementVM => {
    const at = save.achievements[a.id];
    const hidden = a.secret === true && at === undefined;
    return {
      id: a.id,
      name: hidden ? '???' : a.name,
      description: hidden ? (a.hint ?? 'A secret.') : a.description,
      icon: a.icon,
      color: a.color,
      state: at !== undefined ? 'unlocked' : hidden ? 'secret' : 'locked',
      progress: at === undefined && !hidden ? achievementProgress(content, save, a) : null,
      unlockedOn: at !== undefined ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
    };
  });
  return { items, unlocked: items.filter((i) => i.state === 'unlocked').length, total: items.length };
}
