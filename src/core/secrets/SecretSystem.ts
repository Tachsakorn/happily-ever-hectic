import { danceFloorCenter, venueTheme } from '../../content/venueLayout';
import type { Id, SecretEventDef, SecretRequirement, Vec2 } from '../../content/types';
import { GuestState, type Secret } from '../sim/state';
import { Rng } from '../sim/Rng';
import type { SimContext, System } from '../sim/SimContext';

/*
 * Secrets use their own random stream, derived from the reception seed. The
 * shared stream drives guests, disasters and requests; drawing from it here
 * would shift every other roll and change how existing levels play.
 */
const SECRET_SEED_SALT = 0x5ec2e7;

export interface SecretSystem extends System {
  /** Test tools: show a secret this venue can have right now, ignoring odds and conditions. */
  forceSpawn(ctx: SimContext): boolean;
}

export function liveSecret(ctx: SimContext, id: number): Secret | undefined {
  return ctx.state.secrets.find((s) => s.id === id && s.state === 'active');
}

/** Picks up a secret the planner reached: rewards, then the announcement. */
export function findSecret(ctx: SimContext, secret: Secret): void {
  const def = ctx.content.secretEvents.get(secret.defId);
  secret.state = 'found';
  ctx.score.add(def.reward.score, def.name, secret.pos);
  ctx.mood.change(def.reward.mood, def.name, secret.pos);
  ctx.events.emit({ type: 'secretFound', secretId: secret.id, defId: def.id, pos: secret.pos });
}

/** Conditions that cannot change during a reception (the venue). */
function fitsVenue(ctx: SimContext, def: SecretEventDef): boolean {
  if (def.spots === 'danceFloor' && (!ctx.level.dancing || !danceFloorCenter(ctx.venue.def))) return false;
  if (def.spots !== 'danceFloor' && def.spots.length === 0) return false;
  if (def.window[0] >= ctx.level.durationSeconds) return false;
  const theme = venueTheme(ctx.venue.def);
  return def.requires.every((r) => r.kind !== 'theme' || r.themes.includes(theme));
}

function holds(ctx: SimContext, r: SecretRequirement): boolean {
  switch (r.kind) {
    case 'theme':
      return true; // checked once, in fitsVenue
    case 'minMood':
      return ctx.state.couple.mood >= r.value;
    case 'dancersAtOnce':
      return ctx.state.guests.filter((g) => g.state === GuestState.DANCING).length >= r.count;
  }
}

export function createSecretSystem(seed: number): SecretSystem {
  const rng = new Rng((seed ^ SECRET_SEED_SALT) >>> 0);
  let armed: SecretEventDef[] | null = null;
  const shown = new Set<Id>();

  function spotFor(ctx: SimContext, def: SecretEventDef): Vec2 | null {
    if (def.spots === 'danceFloor') return danceFloorCenter(ctx.venue.def);
    return rng.pick(def.spots) ?? null;
  }

  function spawn(ctx: SimContext, def: SecretEventDef): boolean {
    const pos = spotFor(ctx, def);
    if (!pos) return false;
    const secret: Secret = { id: ctx.nextId(), defId: def.id, pos, state: 'active', timeLeft: def.staySeconds, total: def.staySeconds };
    ctx.state.secrets.push(secret);
    shown.add(def.id);
    ctx.events.emit({ type: 'secretAppeared', secretId: secret.id, defId: def.id, pos });
    return true;
  }

  return {
    name: 'secrets',
    update(ctx, dt) {
      // Armed once, on the first tick: each secret rolls its odds for this reception.
      armed ??= ctx.content.secretEvents.all().filter((def) => fitsVenue(ctx, def) && rng.chance(def.chance));

      let active = false;
      for (const s of ctx.state.secrets) {
        if (s.state !== 'active') continue;
        s.timeLeft -= dt;
        if (s.timeLeft > 0) {
          active = true;
          continue;
        }
        s.state = 'vanished';
        ctx.events.emit({ type: 'secretVanished', secretId: s.id, defId: s.defId, pos: s.pos });
      }
      // One secret at a time: a surprise should feel special, not like clutter.
      if (active) return;

      const t = ctx.state.time;
      for (const def of armed) {
        if (shown.has(def.id) || t < def.window[0] || t > def.window[1]) continue;
        if (!def.requires.every((r) => holds(ctx, r))) continue;
        if (spawn(ctx, def)) return;
      }
    },
    forceSpawn(ctx) {
      if (ctx.state.secrets.some((s) => s.state === 'active')) return false;
      const candidates = ctx.content.secretEvents.all().filter((def) => fitsVenue(ctx, def) && !shown.has(def.id));
      const def = rng.pick(candidates);
      return def ? spawn(ctx, def) : false;
    },
  };
}
