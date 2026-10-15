import { describe, expect, it } from 'vitest';
import { updatesVM } from '../../src/app/viewModels';
import { migrate, newSave } from '../../src/core/progression/saveData';
import { CHANGELOG, type ChangelogEntry } from '../../src/data/changelog';
import packageJson from '../../package.json?raw';

const log: ChangelogEntry[] = [
  { version: '3', date: '2026-03-01', title: 'C', notes: ['c'] },
  { version: '2', date: '2026-02-01', title: 'B', notes: ['b'] },
  { version: '1', date: '2026-01-01', title: 'A', notes: ['a'] },
];

describe('update log data', () => {
  it('has unique versions, valid dates, notes, and is newest first', () => {
    expect(new Set(CHANGELOG.map((e) => e.version)).size).toBe(CHANGELOG.length);
    for (const e of CHANGELOG) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.notes.length).toBeGreaterThan(0);
    }
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('newest entry matches the package version, so the two cannot drift', () => {
    const pkg = JSON.parse(packageJson) as { version: string };
    expect(`${CHANGELOG[0]!.version}.0`).toBe(pkg.version);
  });
});

describe('updatesVM', () => {
  it('flags only the newest entry for a player who never opened the log', () => {
    const flags = updatesVM(newSave(), log).map((u) => u.isNew);
    expect(flags).toEqual([true, false, false]);
  });

  it('flags everything newer than the last version read', () => {
    const flags = updatesVM({ ...newSave(), lastSeenUpdate: '1' }, log).map((u) => u.isNew);
    expect(flags).toEqual([true, true, false]);
  });

  it('flags nothing once the newest has been read', () => {
    expect(updatesVM({ ...newSave(), lastSeenUpdate: '3' }, log).some((u) => u.isNew)).toBe(false);
  });

  it('treats an unknown remembered version like never opened', () => {
    expect(updatesVM({ ...newSave(), lastSeenUpdate: 'from-the-future' }, log).map((u) => u.isNew)).toEqual([true, false, false]);
  });

  it('formats the date without shifting the day', () => {
    expect(updatesVM(newSave(), log)[0]!.date).toBe('Mar 1, 2026');
  });
});

describe('save: lastSeenUpdate', () => {
  it('defaults to null for old saves', () => {
    expect(migrate({ coins: 5 }).lastSeenUpdate).toBeNull();
  });

  it('keeps a stored version and ignores junk', () => {
    expect(migrate({ lastSeenUpdate: '0.5' }).lastSeenUpdate).toBe('0.5');
    expect(migrate({ lastSeenUpdate: 7 }).lastSeenUpdate).toBeNull();
  });
});
