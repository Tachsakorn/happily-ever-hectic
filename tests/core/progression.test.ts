import { describe, expect, it } from 'vitest';
import { applyResult, buyUpgrade, isUnlocked, receptionModifiers } from '../../src/core/progression/progression';
import { defaultPlan, optionMatches, planCategories, planMatches, planMenu } from '../../src/core/progression/plan';
import { migrate, newSave } from '../../src/core/progression/saveData';
import type { ReceptionResult } from '../../src/core/scoring/results';
import { loadContent } from '../../src/data';
import { InMemorySaveService, LocalStorageSaveService } from '../../src/platform/save/SaveService';

const content = loadContent();

const result = (levelId: string, score: number, stars: 0 | 1 | 2 | 3, outcome: 'COMPLETE' | 'FAILED' = 'COMPLETE'): ReceptionResult => ({
  levelId,
  outcome,
  score,
  stars,
  finalMood: 80,
  stats: {
    guestsSeated: 0,
    guestsServed: 0,
    guestsUpset: 0,
    guestsLeftHappy: 0,
    dances: 0,
    guestsArrived: 0,
    coursesServed: 0,
    bestChain: 0,
    giftsDelivered: 0,
    disastersResolved: 0,
    disastersFailed: 0,
    momentsCompleted: 0,
    momentsFailed: 0,
    servicesGranted: 0,
    rescuesUsed: 0,
    coupleRequestsMissed: 0,
  },
  moodBreakdown: [],
  secretsFound: [],
});

describe('progression', () => {
  it('only the first level is unlocked at the start', () => {
    const save = newSave();
    const unlocked = content.orderedLevels().filter((l) => isUnlocked(save, l));
    expect(unlocked.map((l) => l.id)).toEqual(['level-1']);
  });

  it('completing a level unlocks the next and pays coins', () => {
    const out = applyResult(content, newSave(), result('level-1', 1500, 1));
    expect(out.newlyUnlocked).toEqual(['level-2']);
    // 100 for the clear + 40 for the bonus goal "no guest storms off" (nobody was upset).
    expect(out.coinsEarned).toBe(140);
    expect(out.save.levels['level-1']).toEqual({ bestScore: 1500, stars: 1, completed: true, goals: ['maxUpset:0'] });
  });

  it('bonus goals pay once, only in a completed wedding, and are kept', () => {
    const lost = applyResult(content, newSave(), result('level-1', 0, 0, 'FAILED'));
    expect(lost.newGoals).toEqual([]);
    const r = result('level-1', 1500, 1);
    const chained = { ...r, stats: { ...r.stats, bestChain: 4, guestsUpset: 2 } };
    const first = applyResult(content, newSave(), chained);
    expect(first.newGoals).toEqual(['minChain:3']);
    const again = applyResult(content, first.save, chained);
    expect(again.newGoals).toEqual([]);
    expect(again.coinsEarned).toBe(0);
    const both = applyResult(content, first.save, r);
    expect(both.newGoals).toEqual(['maxUpset:0']);
    expect(both.save.levels['level-1']?.goals).toEqual(['minChain:3', 'maxUpset:0']);
  });

  it('a perfect plan unlocks Perfect Planner', () => {
    const plan = { decor: 'pastel-peonies', menu: 'garden-feast', cake: 'strawberry-cream', honeymoon: 'mountain-cabin' };
    const out = applyResult(content, newSave(), result('level-1', 1500, 1), new Date(2026, 8, 25, 12), plan);
    expect(out.newAchievements).toContain('perfect-planner');
    const meh = applyResult(content, newSave(), result('level-1', 1500, 1), new Date(2026, 8, 25, 12), { ...plan, cake: 'chocolate-tower' });
    expect(meh.newAchievements).not.toContain('perfect-planner');
  });

  it('replays only pay for newly earned stars and keep the best score', () => {
    const first = applyResult(content, newSave(), result('level-1', 1500, 1)).save;
    const worse = applyResult(content, first, result('level-1', 900, 1));
    expect(worse.coinsEarned).toBe(0);
    expect(worse.save.levels['level-1']?.bestScore).toBe(1500);
    const better = applyResult(content, first, result('level-1', 2400, 3));
    expect(better.coinsEarned).toBe(67);
    expect(better.newBest).toBe(true);
  });

  it('a failed wedding unlocks nothing and pays nothing', () => {
    const out = applyResult(content, newSave(), result('level-1', 300, 0, 'FAILED'));
    expect(out.coinsEarned).toBe(0);
    expect(out.newlyUnlocked).toEqual([]);
    expect(out.save.levels['level-1']?.completed).toBe(false);
  });

  it('the shop spends coins once per upgrade', () => {
    const rich = { ...newSave(), coins: 500 };
    const bought = buyUpgrade(content, rich, 'comfy-chairs');
    expect('error' in bought).toBe(false);
    if ('error' in bought) return;
    expect(bought.coins).toBe(350);
    expect(buyUpgrade(content, bought, 'comfy-chairs')).toEqual({ error: 'Already owned' });
    expect(buyUpgrade(content, newSave(), 'comfy-chairs')).toEqual({ error: 'Not enough coins' });
  });

  it('each plan pick the couple loves adds a match bonus to the reception', () => {
    expect(optionMatches(content, 'emma-noah', 'pastel-peonies')).toBe(true);
    expect(optionMatches(content, 'emma-noah', 'classic-white')).toBe(false);
    const plan = { decor: 'pastel-peonies', menu: 'garden-feast', cake: 'chocolate-tower', honeymoon: 'mountain-cabin' };
    expect(planMatches(content, 'emma-noah', plan)).toEqual(['decor', 'menu', 'honeymoon']);
    const save = { ...newSave(), upgrades: ['running-shoes'] };
    expect(receptionModifiers(content, save, 'level-1', plan)).toHaveLength(1 + 3);
    expect(receptionModifiers(content, newSave(), 'level-1', {})).toHaveLength(0);
  });

  it('the menu pick sets the mains, unless the wedding has a set menu', () => {
    expect(planMenu(content, 'emma-noah', { menu: 'from-the-sea' })).toEqual(['salmon', 'risotto']);
    expect(planCategories(content, 'our-wedding')).not.toContain('menu');
    expect(planMenu(content, 'our-wedding', { menu: 'from-the-sea' })).toBeUndefined();
  });

  it('every base wedding offers all four choices, each with exactly one right answer', () => {
    for (const w of content.weddings.all()) {
      if (w.id === 'our-wedding') continue;
      const cats = planCategories(content, w.id);
      expect(cats).toEqual(['decor', 'menu', 'cake', 'honeymoon']);
      for (const c of cats) {
        const right = content.planOptions.all().filter((o) => o.category === c && optionMatches(content, w.id, o.id));
        expect(right.map((o) => o.id), `${w.id} ${c}`).toHaveLength(1);
      }
      expect(Object.keys(defaultPlan(content, w.id))).toHaveLength(4);
    }
  });
});

describe('save data', () => {
  it('migrates garbage to a fresh save instead of crashing', () => {
    expect(migrate(null)).toEqual(newSave());
    expect(migrate('nonsense')).toEqual(newSave());
    const partial = migrate({ coins: 'lots', levels: { a: { stars: 9, bestScore: -5 } }, upgrades: [1, 'x'] });
    expect(partial.coins).toBe(0);
    expect(partial.levels.a).toEqual({ bestScore: 0, stars: 3, completed: false, goals: [] });
    expect(partial.upgrades).toEqual(['x']);
  });

  it('round-trips through a storage backend', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage;
    const a = new LocalStorageSaveService(storage);
    a.save({ ...newSave(), coins: 42 });
    expect(new LocalStorageSaveService(storage).load().coins).toBe(42);
  });

  it('survives a storage that throws', () => {
    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => undefined,
    } as unknown as Storage;
    const svc = new LocalStorageSaveService(hostile);
    expect(svc.load()).toEqual(newSave());
    svc.save({ ...newSave(), coins: 5 });
    expect(svc.load().coins).toBe(5);
  });

  it('has an in-memory implementation for tests and previews', () => {
    const svc = new InMemorySaveService();
    svc.save({ ...newSave(), coins: 1 });
    expect(svc.load().coins).toBe(1);
  });
});
