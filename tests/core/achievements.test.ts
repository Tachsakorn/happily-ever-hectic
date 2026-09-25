import { describe, expect, it } from 'vitest';
import { achievementProgress, unlockAchievements } from '../../src/core/progression/achievements';
import { applyResult } from '../../src/core/progression/progression';
import { migrate, newSave } from '../../src/core/progression/saveData';
import type { ReceptionResult } from '../../src/core/scoring/results';
import type { ReceptionStats } from '../../src/core/sim/state';
import { loadContent } from '../../src/data';

const content = loadContent();
const NOON = new Date(2026, 8, 25, 12, 0);
const ONE_AM = new Date(2026, 8, 25, 1, 30);

function result(over: Partial<ReceptionResult> = {}, stats: Partial<ReceptionStats> = {}): ReceptionResult {
  return {
    levelId: 'level-1',
    outcome: 'COMPLETE',
    score: 2200,
    stars: 3,
    finalMood: 80,
    moodBreakdown: [],
    secretsFound: [],
    stats: {
      guestsSeated: 8,
      guestsServed: 8,
      guestsUpset: 0,
      guestsLeftHappy: 4,
      dances: 0,
      guestsArrived: 8,
      coursesServed: 8,
      bestChain: 1,
      giftsDelivered: 0,
      disastersResolved: 0,
      disastersFailed: 0,
      momentsCompleted: 1,
      momentsFailed: 0,
      servicesGranted: 0,
      rescuesUsed: 0,
      ...stats,
    },
    ...over,
  };
}

describe('achievements', () => {
  it('the first finished wedding unlocks the first achievements, once', () => {
    const first = applyResult(content, newSave(), result(), NOON);
    expect(first.newAchievements).toEqual(expect.arrayContaining(['just-married', 'picture-perfect']));
    expect(first.save.achievements['just-married']).toBe(NOON.getTime());
    const again = applyResult(content, first.save, result(), NOON);
    expect(again.newAchievements).not.toContain('just-married');
    expect(again.save.lifetime.weddingsCompleted).toBe(2);
  });

  it('lifetime counters add up across receptions, even lost ones', () => {
    let save = newSave();
    for (let i = 0; i < 5; i++) save = applyResult(content, save, result({ outcome: 'FAILED', stars: 0 }, { dances: 10 }), NOON).save;
    expect(save.lifetime.dances).toBe(50);
    expect(save.lifetime.weddingsCompleted).toBe(0);
    expect(save.achievements['dance-fever']).toBeDefined();
    expect(save.achievements['just-married']).toBeUndefined();
  });

  it('finding a secret event unlocks its secret achievement', () => {
    const out = applyResult(content, newSave(), result({ secretsFound: ['golden-bouquet'] }), NOON);
    expect(out.newAchievements).toContain('golden-touch');
    expect(out.save.secretsFound).toEqual(['golden-bouquet']);
  });

  it('single-reception and time-of-day conditions use the reception that just ended', () => {
    const close = applyResult(content, newSave(), result({ finalMood: 9 }), ONE_AM);
    expect(close.newAchievements).toEqual(expect.arrayContaining(['close-call', 'night-owl']));
    const lost = applyResult(content, newSave(), result({ outcome: 'FAILED', finalMood: 0, stars: 0 }), ONE_AM);
    expect(lost.newAchievements).not.toContain('close-call');
    expect(lost.newAchievements).not.toContain('night-owl');
    // Level 1 has fewer than 12 guests, so a flawless level 1 is not "Nobody Left Behind".
    expect(close.newAchievements).not.toContain('nobody-left-behind');
    const big = applyResult(content, newSave(), result({ levelId: 'level-5' }), NOON);
    expect(big.newAchievements).toContain('nobody-left-behind');
  });

  it('owning every upgrade unlocks Fully Equipped; progress counts toward it', () => {
    const def = content.achievements.get('fully-equipped');
    const all = content.upgrades.all().map((u) => u.id);
    const partial = { ...newSave(), upgrades: all.slice(1) };
    expect(achievementProgress(content, partial, def)).toEqual({ current: all.length - 1, target: all.length });
    expect(unlockAchievements(content, partial, { now: NOON }).unlocked).not.toContain('fully-equipped');
    expect(unlockAchievements(content, { ...partial, upgrades: all }, { now: NOON }).unlocked).toContain('fully-equipped');
  });

  it('old saves without achievements load with empty ones; bad values are dropped', () => {
    const save = migrate({ coins: 10, levels: {}, achievements: { 'just-married': 123, junk: 'x' }, lifetime: { dances: 7, gifts: 3 }, secretsFound: ['golden-bouquet', 4, 'golden-bouquet'] });
    expect(save.achievements).toEqual({ 'just-married': 123 });
    expect(save.lifetime.dances).toBe(7);
    expect(save.lifetime.giftsDelivered).toBe(0);
    expect(save.secretsFound).toEqual(['golden-bouquet']);
    const old = migrate({ coins: 5, levels: {} });
    expect(old.achievements).toEqual({});
    expect(old.lifetime.weddingsCompleted).toBe(0);
  });
});
