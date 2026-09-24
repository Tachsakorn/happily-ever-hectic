import type { AudioService, SfxId } from './AudioService';

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slide?: number };

const N = (name: string): number => {
  const table: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 440;
  const semis = (table[m[1] ?? 'A'] ?? 0) + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

/** Tiny synthesized sound recipes: no audio files to load, nothing to license. */
const SFX: Record<SfxId, Note[]> = {
  tap: [{ f: N('A5'), t: 0, d: 0.05, type: 'triangle', v: 0.12 }],
  pickup: [
    { f: N('E5'), t: 0, d: 0.07, type: 'triangle', v: 0.18 },
    { f: N('A5'), t: 0.05, d: 0.08, type: 'triangle', v: 0.16 },
  ],
  serve: [
    { f: N('C5'), t: 0, d: 0.08, type: 'triangle' },
    { f: N('E5'), t: 0.06, d: 0.08, type: 'triangle' },
    { f: N('G5'), t: 0.12, d: 0.14, type: 'triangle' },
  ],
  order: [{ f: N('D5'), t: 0, d: 0.1, type: 'sine', v: 0.2 }, { f: N('F#5'), t: 0.07, d: 0.1, type: 'sine', v: 0.18 }],
  seat: [{ f: N('G4'), t: 0, d: 0.1, type: 'sine', v: 0.22 }],
  seatGood: [
    { f: N('G4'), t: 0, d: 0.1, type: 'sine' },
    { f: N('C5'), t: 0.08, d: 0.16, type: 'sine' },
  ],
  seatBad: [{ f: N('E4'), t: 0, d: 0.12, type: 'square', v: 0.07 }, { f: N('C4'), t: 0.1, d: 0.18, type: 'square', v: 0.07 }],
  gift: [
    { f: N('C6'), t: 0, d: 0.06, type: 'sine', v: 0.14 },
    { f: N('E6'), t: 0.05, d: 0.06, type: 'sine', v: 0.14 },
    { f: N('G6'), t: 0.1, d: 0.1, type: 'sine', v: 0.14 },
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
    { f: N('C6'), t: 0.14, d: 0.18, type: 'triangle' },
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
    { f: N('E6'), t: 0.2, d: 0.3, type: 'triangle' },
  ],
  nope: [{ f: N('C4'), t: 0, d: 0.08, type: 'square', v: 0.05 }],
  win: [
    { f: N('C5'), t: 0, d: 0.15, type: 'triangle' },
    { f: N('E5'), t: 0.15, d: 0.15, type: 'triangle' },
    { f: N('G5'), t: 0.3, d: 0.15, type: 'triangle' },
    { f: N('C6'), t: 0.45, d: 0.5, type: 'triangle' },
    { f: N('G5'), t: 0.45, d: 0.5, type: 'sine', v: 0.1 },
  ],
  lose: [
    { f: N('G4'), t: 0, d: 0.3, type: 'triangle' },
    { f: N('E4'), t: 0.3, d: 0.3, type: 'triangle' },
    { f: N('C4'), t: 0.6, d: 0.6, type: 'triangle' },
  ],
  coin: [{ f: N('B5'), t: 0, d: 0.06, type: 'square', v: 0.07 }, { f: N('E6'), t: 0.06, d: 0.16, type: 'square', v: 0.07 }],
  star: [
    { f: N('E6'), t: 0, d: 0.09, type: 'triangle', v: 0.12 },
    { f: N('B6'), t: 0.07, d: 0.22, type: 'sine', v: 0.1 },
  ],
  whoosh: [{ f: N('C5'), t: 0, d: 0.22, type: 'sine', v: 0.05, slide: 500 }],
  pop: [{ f: N('A5'), t: 0, d: 0.05, type: 'sine', v: 0.09, slide: 300 }],
};

/** A gentle waltz (3/4) over I–vi–IV–V: melody on beat one, chord on two and three. */
const CHORDS = [
  [N('C4'), N('E4'), N('G4')],
  [N('A3'), N('C4'), N('E4')],
  [N('F3'), N('A3'), N('C4')],
  [N('G3'), N('B3'), N('D4')],
];
const MELODY = ['E5', 'G5', 'C6', 'A5', 'C5', 'E5', 'F5', 'A5', 'C6', 'B4', 'D5', 'G5'].map(N);
const BEAT = 0.42;
const LOOKAHEAD = 0.6;

/**
 * WebAudio synth. One AudioContext for the session, created lazily and
 * resumed on the first user gesture (iOS requirement). The music scheduler
 * is a single interval that exists only while music plays.
 */
export class SynthAudioService implements AudioService {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicWanted = false;
  private ducked = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beat = 0;
  private readonly onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.9 : 0;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.targetMusicVolume();
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.updateScheduler();
  }

  play(id: SfxId): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    for (const n of SFX[id]) this.tone(n.f, now + n.t, n.d, n.type ?? 'triangle', n.v ?? 0.2, this.sfxGain, n.slide);
  }

  setMusicPlaying(playing: boolean): void {
    this.musicWanted = playing;
    this.updateScheduler();
  }

  setMusicDucked(ducked: boolean): void {
    if (ducked === this.ducked) return;
    this.ducked = ducked;
    this.applyMusicVolume();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.applyMusicVolume();
    this.updateScheduler();
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(enabled ? 0.9 : 0, this.ctx.currentTime, 0.02);
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
  }

  private targetMusicVolume(): number {
    return this.musicEnabled && !this.ducked ? 0.22 : 0;
  }

  private applyMusicVolume(): void {
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.targetMusicVolume(), this.ctx.currentTime, 0.08);
  }

  private updateScheduler(): void {
    const shouldRun = !!this.ctx && this.musicWanted && this.musicEnabled;
    if (shouldRun && !this.timer && this.ctx) {
      this.nextBeatTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.scheduleMusic(), 150);
    } else if (!shouldRun && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;
    while (this.nextBeatTime < ctx.currentTime + LOOKAHEAD) {
      const bar = Math.floor(this.beat / 3);
      const beatInBar = this.beat % 3;
      const chord = CHORDS[bar % CHORDS.length] ?? CHORDS[0]!;
      if (beatInBar === 0) {
        this.tone((chord[0] ?? 220) / 2, this.nextBeatTime, BEAT * 0.9, 'sine', 0.35, out);
        const m = MELODY[(bar * 3) % MELODY.length] ?? MELODY[0]!;
        this.tone(m, this.nextBeatTime, BEAT * 1.6, 'triangle', 0.22, out);
      } else {
        for (const f of chord) this.tone(f, this.nextBeatTime, BEAT * 0.5, 'sine', 0.08, out);
        if (beatInBar === 2 && bar % 2 === 1) {
          const m = MELODY[(bar * 3 + 2) % MELODY.length] ?? MELODY[0]!;
          this.tone(m, this.nextBeatTime, BEAT * 0.8, 'triangle', 0.15, out);
        }
      }
      this.nextBeatTime += BEAT;
      this.beat++;
    }
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, volume: number, out: AudioNode, slide = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
