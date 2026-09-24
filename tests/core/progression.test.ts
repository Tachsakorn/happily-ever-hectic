import { describe, expect, it } from 'vitest';
import { applyResult, buyUpgrade, decorMatches, isUnlocked, receptionModifiers } from '../../src/core/progression/progression';
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
    giftsDelivered: 0,
    disastersResolved: 0,
    disastersFailed: 0,
    momentsCompleted: 0,
    momentsFailed: 0,
  },
  moodBreakdown: [],
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
    expect(out.coinsEarned).toBe(100);
    expect(out.save.levels['level-1']).toEqual({ bestScore: 1500, stars: 1, completed: true });
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

  it('decor the couple loves adds the match bonus to the reception', () => {
    expect(decorMatches(content, 'emma-noah', 'pastel-peonies')).toBe(true);
    expect(decorMatches(content, 'emma-noah', 'classic-white')).toBe(false);
    const save = { ...newSave(), upgrades: ['running-shoes'] };
    const mods = receptionModifiers(content, save, 'level-1', 'pastel-peonies');
    expect(mods).toHaveLength(2);
  });
});

describe('save data', () => {
  it('migrates garbage to a fresh save instead of crashing', () => {
    expect(migrate(null)).toEqual(newSave());
    expect(migrate('nonsense')).toEqual(newSave());
    const partial = migrate({ coins: 'lots', levels: { a: { stars: 9, bestScore: -5 } }, upgrades: [1, 'x'] });
    expect(partial.coins).toBe(0);
    expect(partial.levels.a).toEqual({ bestScore: 0, stars: 3, completed: false });
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
