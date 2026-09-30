import type { SfxId } from './AudioService';

/**
 * Sound recipes for the synth: every sound is a few notes, so there are no
 * audio files to load or license. `noise` notes are filtered white noise; for
 * them `f` is the filter centre and `slide` sweeps it (whooshes, clinks, sparkle).
 */
export type Voice = OscillatorType | 'noise';
export interface Note {
  readonly f: number;
  readonly t: number;
  readonly d: number;
  readonly type?: Voice;
  readonly v?: number;
  readonly slide?: number;
  /** Filter sharpness for noise (higher = more tonal). */
  readonly q?: number;
}

export const note = (name: string): number => {
  const table: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 440;
  const semis = (table[m[1] ?? 'A'] ?? 0) + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};
const N = note;

/** A soft high shimmer laid under celebratory sounds. */
const shimmer = (t: number, d = 0.35, v = 0.05): Note => ({ f: 7000, t, d, type: 'noise', v, slide: 2500, q: 2 });

export const SFX: Record<SfxId, readonly Note[]> = {
  tap: [{ f: N('A5'), t: 0, d: 0.05, type: 'triangle', v: 0.12 }],
  pickup: [
    { f: 2400, t: 0, d: 0.05, type: 'noise', v: 0.06, q: 6 },
    { f: N('E5'), t: 0, d: 0.07, type: 'triangle', v: 0.16 },
    { f: N('A5'), t: 0.05, d: 0.08, type: 'triangle', v: 0.14 },
  ],
  serve: [
    // A plate clink, then a little rising "ta-da".
    { f: N('E7'), t: 0, d: 0.06, type: 'sine', v: 0.07 },
    { f: 5200, t: 0, d: 0.05, type: 'noise', v: 0.14, q: 12 },
    { f: N('C5'), t: 0.02, d: 0.08, type: 'triangle' },
    { f: N('E5'), t: 0.08, d: 0.08, type: 'triangle' },
    { f: N('G5'), t: 0.14, d: 0.16, type: 'triangle' },
  ],
  order: [{ f: N('D5'), t: 0, d: 0.1, type: 'sine', v: 0.2 }, { f: N('F#5'), t: 0.07, d: 0.1, type: 'sine', v: 0.18 }],
  seat: [
    { f: 300, t: 0, d: 0.08, type: 'noise', v: 0.06, q: 1.5 },
    { f: N('G4'), t: 0, d: 0.1, type: 'sine', v: 0.22 },
  ],
  seatGood: [
    { f: N('G4'), t: 0, d: 0.1, type: 'sine' },
    { f: N('C5'), t: 0.08, d: 0.12, type: 'sine' },
    { f: N('E5'), t: 0.16, d: 0.2, type: 'sine', v: 0.16 },
  ],
  seatBad: [{ f: N('E4'), t: 0, d: 0.12, type: 'square', v: 0.07 }, { f: N('C4'), t: 0.1, d: 0.18, type: 'square', v: 0.07 }],
  gift: [
    { f: N('C6'), t: 0, d: 0.06, type: 'sine', v: 0.14 },
    { f: N('E6'), t: 0.05, d: 0.06, type: 'sine', v: 0.14 },
    { f: N('G6'), t: 0.1, d: 0.12, type: 'sine', v: 0.14 },
    shimmer(0.1, 0.3, 0.04),
  ],
  dishReady: [{ f: N('B5'), t: 0, d: 0.12, type: 'sine', v: 0.16 }, { f: N('B5'), t: 0.15, d: 0.12, type: 'sine', v: 0.1 }],
  warning: [
    { f: N('A4'), t: 0, d: 0.14, type: 'square', v: 0.08 },
    { f: N('E4'), t: 0.16, d: 0.14, type: 'square', v: 0.08 },
    { f: N('A4'), t: 0.32, d: 0.14, type: 'square', v: 0.08 },
  ],
  fixed: [
    { f: N('C5'), t: 0, d: 0.08, type: 'triangle' },
    { f: N('G5'), t: 0.07, d: 0.08, type: 'triangle' },
    { f: N('C6'), t: 0.14, d: 0.22, type: 'triangle' },
    shimmer(0.14),
  ],
  failed: [{ f: N('C4'), t: 0, d: 0.35, type: 'sawtooth', v: 0.08, slide: -120 }],
  upset: [{ f: N('D4'), t: 0, d: 0.25, type: 'square', v: 0.07, slide: -80 }],
  moment: [
    { f: N('C5'), t: 0, d: 0.12, type: 'triangle' },
    { f: N('E5'), t: 0.12, d: 0.12, type: 'triangle' },
    { f: N('G5'), t: 0.24, d: 0.12, type: 'triangle' },
    { f: N('C6'), t: 0.36, d: 0.3, type: 'triangle' },
  ],
  cheer: [
    { f: N('G5'), t: 0, d: 0.1, type: 'triangle' },
    { f: N('C6'), t: 0.1, d: 0.1, type: 'triangle' },
    { f: N('E6'), t: 0.2, d: 0.34, type: 'triangle' },
    shimmer(0.2, 0.5),
  ],
  nope: [{ f: N('C4'), t: 0, d: 0.08, type: 'square', v: 0.05 }],
  win: [
    { f: N('C5'), t: 0, d: 0.15, type: 'triangle' },
    { f: N('E5'), t: 0.15, d: 0.15, type: 'triangle' },
    { f: N('G5'), t: 0.3, d: 0.15, type: 'triangle' },
    { f: N('C6'), t: 0.45, d: 0.6, type: 'triangle' },
    { f: N('E5'), t: 0.45, d: 0.6, type: 'sine', v: 0.1 },
    { f: N('G5'), t: 0.45, d: 0.6, type: 'sine', v: 0.1 },
    shimmer(0.45, 0.8, 0.06),
  ],
  lose: [
    { f: N('G4'), t: 0, d: 0.3, type: 'triangle' },
    { f: N('E4'), t: 0.3, d: 0.3, type: 'triangle' },
    { f: N('C4'), t: 0.6, d: 0.6, type: 'triangle' },
  ],
  coin: [{ f: N('B5'), t: 0, d: 0.06, type: 'square', v: 0.07 }, { f: N('E6'), t: 0.06, d: 0.18, type: 'square', v: 0.07 }],
  coinTick: [{ f: N('E6'), t: 0, d: 0.05, type: 'triangle', v: 0.07 }],
  star: [
    { f: N('E6'), t: 0, d: 0.1, type: 'triangle', v: 0.14 },
    { f: N('B6'), t: 0.07, d: 0.3, type: 'sine', v: 0.12 },
    { f: N('E5'), t: 0, d: 0.3, type: 'sine', v: 0.1 },
    shimmer(0.05, 0.45, 0.06),
  ],
  starEarned: [
    { f: N('G5'), t: 0, d: 0.08, type: 'triangle', v: 0.14 },
    { f: N('D6'), t: 0.07, d: 0.08, type: 'triangle', v: 0.14 },
    { f: N('G6'), t: 0.14, d: 0.35, type: 'sine', v: 0.14 },
    shimmer(0.12, 0.5, 0.06),
  ],
  // A bell: the chain climbs the scale through the pitch option.
  chain: [
    { f: N('E6'), t: 0, d: 0.32, type: 'sine', v: 0.14 },
    { f: N('E7'), t: 0, d: 0.16, type: 'sine', v: 0.04 },
    { f: N('B5'), t: 0.03, d: 0.2, type: 'triangle', v: 0.07 },
  ],
  chainBig: [
    { f: N('C6'), t: 0, d: 0.09, type: 'triangle', v: 0.14 },
    { f: N('E6'), t: 0.07, d: 0.09, type: 'triangle', v: 0.14 },
    { f: N('G6'), t: 0.14, d: 0.09, type: 'triangle', v: 0.14 },
    { f: N('C7'), t: 0.21, d: 0.4, type: 'sine', v: 0.13 },
    { f: N('C5'), t: 0.21, d: 0.4, type: 'triangle', v: 0.1 },
    shimmer(0.2, 0.6, 0.07),
  ],
  // A two-note "yay!" with a lift at the end.
  guestHappy: [
    { f: N('E5'), t: 0, d: 0.1, type: 'sine', v: 0.14 },
    { f: N('A5'), t: 0.09, d: 0.18, type: 'sine', v: 0.14, slide: 40 },
  ],
  whoosh: [{ f: 500, t: 0, d: 0.3, type: 'noise', v: 0.12, slide: 2600, q: 1.2 }],
  curtain: [{ f: 1800, t: 0, d: 0.4, type: 'noise', v: 0.08, slide: -1300, q: 0.9 }],
  pop: [
    { f: N('A5'), t: 0, d: 0.05, type: 'sine', v: 0.09, slide: 300 },
    { f: 1800, t: 0, d: 0.03, type: 'noise', v: 0.05, q: 4 },
  ],
  // A twinkly rising arpeggio: something magical just appeared.
  secret: [
    { f: N('E6'), t: 0, d: 0.1, type: 'sine', v: 0.09 },
    { f: N('G6'), t: 0.08, d: 0.1, type: 'sine', v: 0.09 },
    { f: N('B6'), t: 0.16, d: 0.1, type: 'sine', v: 0.09 },
    { f: N('E7'), t: 0.24, d: 0.3, type: 'sine', v: 0.08 },
    shimmer(0.2, 0.5, 0.05),
  ],
  achievement: [
    { f: N('G5'), t: 0, d: 0.1, type: 'triangle' },
    { f: N('C6'), t: 0.1, d: 0.1, type: 'triangle' },
    { f: N('E6'), t: 0.2, d: 0.1, type: 'triangle' },
    { f: N('G6'), t: 0.3, d: 0.4, type: 'triangle' },
    { f: N('C6'), t: 0.3, d: 0.4, type: 'sine', v: 0.1 },
    shimmer(0.3, 0.6),
  ],
};

/** Small, frequent sounds get a slight random detune so repeats don't sound robotic. */
export const DETUNED: ReadonlySet<SfxId> = new Set<SfxId>(['tap', 'pickup', 'serve', 'order', 'seat', 'pop', 'coinTick', 'gift', 'guestHappy']);

/** A gentle waltz (3/4) over I–vi–IV–V. Two melodies: the A tune, then an answering B tune. */
export const CHORDS = [
  [N('C4'), N('E4'), N('G4')],
  [N('A3'), N('C4'), N('E4')],
  [N('F3'), N('A3'), N('C4')],
  [N('G3'), N('B3'), N('D4')],
];
/** Per bar: the long note on beat one, then the pickup on beat three (odd bars only). */
export const MELODY_A = ['E5', 'G5', 'C6', 'A5', 'C5', 'E5', 'F5', 'A5', 'C6', 'B4', 'D5', 'G5'].map(N);
export const MELODY_B = ['G5', 'E5', 'C5', 'C6', 'A5', 'E5', 'A5', 'F5', 'A5', 'D5', 'B4', 'D5'].map(N);
/** Seconds per beat at rest, and at full tension. */
export const BEAT_RELAXED = 0.42;
export const BEAT_TENSE = 0.34;
