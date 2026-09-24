import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src/core/sim/events';
import { makeSim, runFor, runUntil } from '../support/fixtures';

describe('secret events', () => {
  it('a secret can be tapped: the planner walks over, finds it, and it is in the result', () => {
    const { sim } = makeSim({ venueId: 'beach-deck' });
    const events: DomainEvent[] = [];
    runFor(sim, 1, events);
    sim.cheat({ type: 'spawnSecret' });
    const secret = sim.state.secrets[0]!;
    expect(secret.state).toBe('active');
    const scoreBefore = sim.state.score;

    // Tapping where it is picks it (secrets win over anything nearby).
    const target = sim.pickTarget(secret.pos);
    expect(target).toEqual({ kind: 'secret', id: secret.id });
    sim.command({ type: 'queueAction', target: target! });
    runUntil(sim, () => secret.state !== 'active', 20, events);

    expect(secret.state).toBe('found');
    expect(events.some((e) => e.type === 'secretFound' && e.defId === secret.defId)).toBe(true);
    expect(sim.state.score).toBeGreaterThan(scoreBefore);
    sim.cheat({ type: 'finish', stars: 0 });
    expect(sim.result().secretsFound).toEqual([secret.defId]);
  });

  it('an ignored secret vanishes after a while', () => {
    const { sim } = makeSim({ venueId: 'grand-ballroom' });
    const events: DomainEvent[] = [];
    runFor(sim, 1, events);
    sim.cheat({ type: 'spawnSecret' });
    const secret = sim.state.secrets[0]!;
    runFor(sim, secret.total + 1, events);
    expect(secret.state).toBe('vanished');
    expect(events.some((e) => e.type === 'secretVanished')).toBe(true);
    expect(sim.pickTarget(secret.pos)?.kind).not.toBe('secret');
  });

  it('venue-bound secrets only appear in their venue', () => {
    const { sim } = makeSim({ venueId: 'beach-deck' });
    runFor(sim, 1);
    sim.cheat({ type: 'spawnSecret' });
    // The beach can only offer the bottle or the golden bouquet (no dancing in this level, so no flash mob).
    expect(['message-bottle', 'golden-bouquet']).toContain(sim.state.secrets[0]?.defId);
  });

  it('the shooting star waits for a very happy couple at night', () => {
    const { sim } = makeSim({ venueId: 'lantern-night' });
    runFor(sim, 1);
    sim.state.couple.mood = 50;
    runFor(sim, 59);
    expect(sim.state.secrets.some((s) => s.defId === 'shooting-star')).toBe(false);
    expect(sim.state.secrets.every((s) => s.state !== 'active')).toBe(true);
    sim.state.couple.mood = 100;
    runFor(sim, 0.1);
    expect(sim.state.secrets.some((s) => s.defId === 'shooting-star')).toBe(true);
  });

  it('secrets never change how the rest of the reception plays (separate random stream)', () => {
    const play = (withSecret: boolean) => {
      const { sim } = makeSim({ venueId: 'grand-ballroom' }, { seed: 7 });
      runFor(sim, 1);
      if (withSecret) sim.cheat({ type: 'spawnSecret' });
      runFor(sim, 60);
      return sim.state.guests.map((g) => `${g.key}:${g.state}:${g.wantsItemId}`).join('|');
    };
    expect(play(true)).toBe(play(false));
  });
});
