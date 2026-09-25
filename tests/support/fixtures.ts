import { ContentRegistry } from '../../src/content/ContentRegistry';
import type { LevelDef, LevelGuestSpec } from '../../src/content/types';
import { basePack } from '../../src/data/packs/base';
import { guest } from '../../src/data/packs/base/weddings';
import { ReceptionSimulation, SIM_STEP_SECONDS } from '../../src/core/sim/ReceptionSimulation';
import type { DomainEvent } from '../../src/core/sim/events';
import type { Modifiers } from '../../src/content/types';

export { guest };

/** A quiet test level: no disasters, no moments, no couple requests unless a test adds them. */
export function testLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'test-level',
    order: 999,
    name: 'Test',
    weddingId: 'test-wedding',
    venueId: 'garden-hall',
    durationSeconds: 600,
    // Unit tests drive time themselves; they end on the clock, not when guests leave.
    ending: 'timer',
    guests: [guest('g1', 'Guest One', 'regular', 'friends', 0)],
    disasterIds: [],
    moments: [],
    kitchen: { burners: 2, cookSeconds: 3 },
    starScores: [100, 200, 300],
    coinReward: 10,
    tutorialTips: [],
    ...overrides,
  };
}

export function makeSim(
  level: Partial<LevelDef> = {},
  opts: { seed?: number; modifiers?: Modifiers[]; coupleRequests?: string[]; courses?: boolean } = {},
): { sim: ReceptionSimulation; events: DomainEvent[] } {
  const content = new ContentRegistry([
    basePack,
    {
      id: 'test',
      weddings: [
        {
          ...basePack.weddings![0]!,
          id: 'test-wedding',
          coupleRequestItemIds: opts.coupleRequests ?? [],
          menuItemIds: ['roast-chicken'],
          // Most tests exercise one course; `courses: true` serves the full meal.
          appetizerItemIds: opts.courses ? ['garden-salad'] : undefined,
          dessertItemId: opts.courses ? 'cake-slice' : undefined,
        },
      ],
      levels: [testLevel(level)],
    },
  ]);
  const sim = new ReceptionSimulation({ content, levelId: 'test-level', seed: opts.seed ?? 7, modifiers: opts.modifiers });
  const events: DomainEvent[] = [];
  return { sim, events };
}

/** Steps the sim until the predicate holds, collecting events. Throws if it never does. */
export function runUntil(
  sim: ReceptionSimulation,
  predicate: () => boolean,
  maxSeconds = 120,
  events?: DomainEvent[],
): void {
  const steps = Math.ceil(maxSeconds / SIM_STEP_SECONDS);
  for (let i = 0; i < steps; i++) {
    if (predicate()) return;
    sim.step(SIM_STEP_SECONDS);
    const drained = sim.drainEvents();
    events?.push(...drained);
  }
  if (!predicate()) throw new Error(`Condition not met within ${maxSeconds}s (t=${sim.state.time.toFixed(1)})`);
}

export function runFor(sim: ReceptionSimulation, seconds: number, events?: DomainEvent[]): void {
  const end = sim.state.time + seconds;
  runUntil(sim, () => sim.state.time >= end - 1e-9 || sim.isOver, seconds + 1, events);
}

export const guestByKey = (sim: ReceptionSimulation, key: string) => {
  const g = sim.state.guests.find((x) => x.key === key);
  if (!g) throw new Error(`No guest ${key}`);
  return g;
};

export type { LevelGuestSpec };
