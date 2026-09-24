import type { Vec2, VenueDef, VenueTheme } from './types';

/** A venue's theme; venues that do not say are gardens. */
export function venueTheme(v: VenueDef): VenueTheme {
  return v.theme ?? 'garden';
}

export interface FloorRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/* Dancers stand on their spots; the floor reaches further up because bodies are drawn above the feet. */
const PAD_X = 50;
const PAD_TOP = 74;
const PAD_BOTTOM = 26;

/**
 * The dance floor's rectangle in world space, derived from the venue's dance
 * spots. The painter, the drop test and the drag highlight all use this, so
 * what the player sees is exactly where a dancer can be dropped.
 */
export function danceFloorBounds(v: VenueDef): FloorRect | null {
  const spots = v.danceSpots ?? [];
  if (!spots.length) return null;
  const xs = spots.map((s) => s.x);
  const ys = spots.map((s) => s.y);
  const x = Math.min(...xs) - PAD_X;
  const y = Math.min(...ys) - PAD_TOP;
  return { x, y, w: Math.max(...xs) + PAD_X - x, h: Math.max(...ys) + PAD_BOTTOM - y };
}

/** The middle of the dance floor, or null when the venue has none. */
export function danceFloorCenter(v: VenueDef): Vec2 | null {
  const r = danceFloorBounds(v);
  return r ? { x: r.x + r.w / 2, y: r.y + r.h * 0.6 } : null;
}
