/**
 * Persistent player progress. Versioned: every stored blob goes through
 * migrate(), so old saves keep working as the game grows.
 */
export const SAVE_VERSION = 1;

export interface LevelProgress {
  readonly bestScore: number;
  readonly stars: 0 | 1 | 2 | 3;
  readonly completed: boolean;
  /** Keys of the bonus goals ever met here (see core/progression/goals). */
  readonly goals: readonly string[];
}

export interface Settings {
  readonly music: boolean;
  readonly sfx: boolean;
  /** Playtest shortcuts (skip, win, unlock). Hidden switch on the title screen. */
  readonly testTools: boolean;
}

/** Running totals across every reception played; they drive counting achievements. */
export interface LifetimeStats {
  readonly weddingsCompleted: number;
  readonly dances: number;
  readonly giftsDelivered: number;
  readonly disastersFixed: number;
  readonly happyGoodbyes: number;
  readonly guestsServed: number;
}

const LIFETIME_KEYS = ['weddingsCompleted', 'dances', 'giftsDelivered', 'disastersFixed', 'happyGoodbyes', 'guestsServed'] as const;

export function emptyLifetime(): LifetimeStats {
  return { weddingsCompleted: 0, dances: 0, giftsDelivered: 0, disastersFixed: 0, happyGoodbyes: 0, guestsServed: 0 };
}

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  readonly coins: number;
  readonly levels: Readonly<Record<string, LevelProgress>>;
  readonly upgrades: readonly string[];
  readonly settings: Settings;
  readonly seenEnding: boolean;
  /** Achievement id → when it was unlocked (ms since epoch). */
  readonly achievements: Readonly<Record<string, number>>;
  readonly lifetime: LifetimeStats;
  /** Secret event ids ever found. */
  readonly secretsFound: readonly string[];
}

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    levels: {},
    upgrades: [],
    settings: { music: true, sfx: true, testTools: false },
    seenEnding: false,
    achievements: {},
    lifetime: emptyLifetime(),
    secretsFound: [],
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/**
 * Turns whatever was stored into valid SaveData. Unknown or corrupted fields
 * fall back to defaults instead of crashing the game — losing a setting is
 * acceptable, a boot crash is not. Future versions add migration steps here.
 */
export function migrate(raw: unknown): SaveData {
  if (!isRecord(raw)) return newSave();
  const base = newSave();
  const levels: Record<string, LevelProgress> = {};
  if (isRecord(raw.levels)) {
    for (const [id, value] of Object.entries(raw.levels)) {
      if (!isRecord(value)) continue;
      const stars = Math.max(0, Math.min(3, Math.floor(num(value.stars, 0)))) as LevelProgress['stars'];
      const goals = Array.isArray(value.goals) ? [...new Set(value.goals.filter((g): g is string => typeof g === 'string'))] : [];
      levels[id] = { bestScore: Math.max(0, num(value.bestScore, 0)), stars, completed: bool(value.completed, false), goals };
    }
  }
  const settings = isRecord(raw.settings) ? raw.settings : {};
  // Achievements, lifetime stats and secrets arrived after version 1 shipped;
  // older saves simply start them empty.
  const achievements: Record<string, number> = {};
  if (isRecord(raw.achievements)) {
    for (const [id, at] of Object.entries(raw.achievements)) if (typeof at === 'number' && Number.isFinite(at)) achievements[id] = at;
  }
  const rawLifetime = isRecord(raw.lifetime) ? raw.lifetime : {};
  const lifetime = Object.fromEntries(LIFETIME_KEYS.map((k) => [k, Math.max(0, Math.floor(num(rawLifetime[k], 0)))])) as unknown as LifetimeStats;
  return {
    version: SAVE_VERSION,
    coins: Math.max(0, Math.floor(num(raw.coins, 0))),
    levels,
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades.filter((u): u is string => typeof u === 'string') : [],
    settings: {
      music: bool(settings.music, base.settings.music),
      sfx: bool(settings.sfx, base.settings.sfx),
      testTools: bool(settings.testTools, base.settings.testTools),
    },
    seenEnding: bool(raw.seenEnding, false),
    achievements,
    lifetime,
    secretsFound: Array.isArray(raw.secretsFound) ? [...new Set(raw.secretsFound.filter((u): u is string => typeof u === 'string'))] : [],
  };
}
