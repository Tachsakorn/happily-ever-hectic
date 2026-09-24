import { describe, expect, it } from 'vitest';
import { grantCoins, isUnlocked, resetProgress, unlockAllLevels } from '../../src/core/progression/progression';
import { migrate, newSave } from '../../src/core/progression/saveData';
import { ReceptionSession } from '../../src/core/sim/ReceptionSession';
import { loadContent } from '../../src/data';

const content = loadContent();
const firstLevel = content.orderedLevels()[0]!;
const session = () => new ReceptionSession(content, firstLevel.id, null, [], 7);

describe('test tools: reception shortcuts', () => {
  it('finish ends the wedding as a success with at least the requested stars', () => {
    for (const stars of [0, 1, 2, 3] as const) {
      const s = session();
      s.cheat({ type: 'finish', stars });
      const result = s.sim.result();
      expect(result.outcome).toBe('COMPLETE');
      expect(result.stars).toBeGreaterThanOrEqual(stars);
    }
  });

  it('finish delivers the end event through the session like a real ending', () => {
    const s = session();
    s.cheat({ type: 'finish', stars: 3 });
    expect(s.advance(0.1).some((e) => e.type === 'receptionEnded' && e.outcome === 'COMPLETE')).toBe(true);
  });

  it('fail ends the wedding with no stars', () => {
    const s = session();
    s.cheat({ type: 'fail' });
    expect(s.sim.result()).toMatchObject({ outcome: 'FAILED', stars: 0 });
  });

  it('skipTime runs the simulation forward without ending it early', () => {
    const s = session();
    s.cheat({ type: 'skipTime', seconds: 30 });
    expect(s.sim.state.time).toBeCloseTo(30, 1);
    expect(s.sim.state.guests.length).toBeGreaterThan(0);
    expect(s.sim.isOver).toBe(false);
  });

  it('fillMood tops the couple up to full and says why', () => {
    const s = session();
    s.cheat({ type: 'fillMood' });
    expect(s.sim.state.couple.mood).toBe(100);
  });

  it('shortcuts do nothing once the wedding is over', () => {
    const s = session();
    s.cheat({ type: 'fail' });
    s.cheat({ type: 'finish', stars: 3 });
    expect(s.sim.result().outcome).toBe('FAILED');
  });
});

describe('test tools: progression shortcuts', () => {
  it('unlockAll opens every wedding and keeps earned stars', () => {
    const save = { ...newSave(), levels: { [firstLevel.id]: { bestScore: 900, stars: 2 as const, completed: true } } };
    const next = unlockAllLevels(content, save);
    for (const l of content.orderedLevels()) expect(isUnlocked(next, l)).toBe(true);
    expect(next.levels[firstLevel.id]).toMatchObject({ bestScore: 900, stars: 2 });
  });

  it('coins and reset', () => {
    const rich = grantCoins(newSave(), 500);
    expect(rich.coins).toBe(500);
    const withTools = { ...rich, settings: { ...rich.settings, testTools: true } };
    const fresh = resetProgress(withTools);
    expect(fresh.coins).toBe(0);
    expect(fresh.settings.testTools).toBe(true);
  });

  it('old saves without the test-tools flag load with it off', () => {
    expect(migrate({ version: 1, settings: { music: false, sfx: true } }).settings).toEqual({ music: false, sfx: true, testTools: false });
  });
});
