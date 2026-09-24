import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate';
import { loadContent } from '../../src/data';
import { makeSim, runFor } from '../support/fixtures';

describe('per-level disaster choreography', () => {
  it('a level trigger replaces the disaster default in that level', () => {
    // The spilled drink normally cannot happen before 30 s.
    const { sim } = makeSim({ disasterIds: ['spilled-drink'], disasterTriggers: { 'spilled-drink': { kind: 'scheduled', at: 5 } } });
    runFor(sim, 6);
    expect(sim.state.disasters.map((d) => d.defId)).toContain('spilled-drink');
  });

  it('without a level trigger the default still applies', () => {
    const { sim } = makeSim({ disasterIds: ['spilled-drink'] });
    runFor(sim, 6);
    expect(sim.state.disasters).toHaveLength(0);
  });

  it('shipped content choreography is valid', () => {
    expect(validateContent(loadContent())).toEqual([]);
  });
});

describe('disasters at the sweetheart table', () => {
  it('missing rings can be fixed by tapping the couple (their table is the same tap target)', () => {
    const { sim } = makeSim({ disasterIds: ['missing-rings'], disasterTriggers: { 'missing-rings': { kind: 'scheduled', at: 1 } } });
    runFor(sim, 1.5);
    expect(sim.state.disasters.map((d) => d.defId)).toContain('missing-rings');
    const target = sim.pickTarget(sim.context.venue.def.couplePos);
    expect(target).not.toBeNull();
    expect(sim.command({ type: 'queueAction', target: target! }).ok).toBe(true);
    runFor(sim, 8);
    expect(sim.state.stats.disastersResolved).toBe(1);
  });
});
