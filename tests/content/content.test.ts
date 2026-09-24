import { describe, expect, it } from 'vitest';
import { ContentRegistry } from '../../src/content/ContentRegistry';
import { validateContent } from '../../src/content/validate';
import { basePack } from '../../src/data/packs/base';
import { loadContent } from '../../src/data';

describe('content integrity', () => {
  it('shipped content has no broken references or invariants', () => {
    expect(validateContent(loadContent())).toEqual([]);
  });

  it('base pack is valid on its own (the personal pack is optional)', () => {
    expect(validateContent(new ContentRegistry([basePack]))).toEqual([]);
  });

  it('every level is reachable through the unlock chain', () => {
    const content = loadContent();
    const levels = content.orderedLevels();
    const reachable = new Set<string>();
    for (const l of levels) {
      if (!l.unlockRequiresLevelId || reachable.has(l.unlockRequiresLevelId)) reachable.add(l.id);
    }
    expect([...reachable].sort()).toEqual(levels.map((l) => l.id).sort());
  });

  it('rejects duplicate ids across packs', () => {
    expect(() => new ContentRegistry([basePack, { id: 'dupe', items: [basePack.items![0]!] }])).toThrow(/Duplicate item/);
  });

  it('reports broken references', () => {
    const broken = new ContentRegistry([
      basePack,
      {
        id: 'broken',
        levels: [{ ...basePack.levels![0]!, id: 'bad', order: 99, weddingId: 'nope', disasterIds: ['ghost'] }],
      },
    ]);
    const errors = validateContent(broken);
    expect(errors.some((e) => e.includes('unknown wedding nope'))).toBe(true);
    expect(errors.some((e) => e.includes('unknown disaster ghost'))).toBe(true);
  });
});
