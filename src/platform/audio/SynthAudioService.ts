import type { AudioService, PlayOptions, SfxId } from './AudioService';
import { BEAT_RELAXED, BEAT_TENSE, CHORDS, DETUNED, MELODY_A, MELODY_B, SFX } from './synthRecipes';

const LOOKAHEAD = 0.6;
/** The same sound twice within this many seconds plays once (e.g. ten guests cheering in one frame). */
const REPEAT_GUARD_S = 0.03;
const DETUNE_SEMITONES = 0.35;
/** Band-passing white noise throws most of its energy away; this brings noise notes up to the level of tones. */
const NOISE_MAKEUP = 4;
const REVERB_SECONDS = 1.5;
const REVERB_SEND = 0.16;
/** Phrase order: A, A, B, A — sixteen bars before the waltz repeats. */
const PHRASES = [MELODY_A, MELODY_A, MELODY_B, MELODY_A];

/**
 * WebAudio synth. One AudioContext for the session, created lazily and
 * resumed on the first user gesture (iOS requirement). Everything goes
 * through a small bus: a touch of synthetic room reverb, then a compressor so
 * busy moments stay loud but never clip. The music scheduler is a single
 * interval that exists only while music plays.
 */
export class SynthAudioService implements AudioService {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicWanted = false;
  private ducked = false;
  private intensity = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beat = 0;
  private readonly lastPlayed = new Map<SfxId, number>();
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
      const ctx = new Ctor();
      this.ctx = ctx;
      const bus = this.buildBus(ctx);
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.9 : 0;
      this.sfxGain.connect(bus);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.targetMusicVolume();
      this.musicGain.connect(bus);
      this.noise = this.makeNoise(ctx, 1);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.updateScheduler();
  }

  play(id: SfxId, opts: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1) < REPEAT_GUARD_S) return;
    this.lastPlayed.set(id, now);
    const detune = DETUNED.has(id) ? (Math.random() * 2 - 1) * DETUNE_SEMITONES : 0;
    const ratio = Math.pow(2, ((opts.pitch ?? 0) + detune) / 12);
    for (const n of SFX[id]) {
      const type = n.type ?? 'triangle';
      const volume = n.v ?? 0.2;
      if (type === 'noise') this.noiseBurst(n.f * ratio, now + n.t, n.d, volume, n.slide ?? 0, n.q ?? 1);
      else this.tone(n.f * ratio, now + n.t, n.d, type, volume, this.sfxGain, (n.slide ?? 0) * ratio);
    }
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

  setMusicIntensity(level: number): void {
    this.intensity = Math.max(0, Math.min(1, level));
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

  /** dry + reverb → compressor → speakers. Returns the node sources connect to. */
  private buildBus(ctx: AudioContext): AudioNode {
    const input = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    comp.connect(ctx.destination);
    input.connect(comp);
    const send = ctx.createGain();
    send.gain.value = REVERB_SEND;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(ctx, REVERB_SECONDS);
    input.connect(send).connect(reverb).connect(comp);
    return input;
  }

  /** A decaying stereo noise tail: a soft, roomy reverb without loading an impulse file. */
  private makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
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
    // If the tab was asleep, skip ahead rather than playing a burst of missed beats.
    if (this.nextBeatTime < ctx.currentTime) this.nextBeatTime = ctx.currentTime + 0.05;
    while (this.nextBeatTime < ctx.currentTime + LOOKAHEAD) {
      const beatLength = BEAT_RELAXED + (BEAT_TENSE - BEAT_RELAXED) * this.intensity;
      const bar = Math.floor(this.beat / 3);
      const beatInBar = this.beat % 3;
      const chord = CHORDS[bar % CHORDS.length] ?? CHORDS[0]!;
      const melody = PHRASES[Math.floor(bar / CHORDS.length) % PHRASES.length] ?? MELODY_A;
      const at = this.nextBeatTime;
      if (beatInBar === 0) {
        this.tone((chord[0] ?? 220) / 2, at, beatLength * 0.9, 'sine', 0.35, out);
        const m = melody[(bar * 3) % melody.length] ?? melody[0]!;
        this.tone(m, at, beatLength * 1.6, 'triangle', 0.22, out);
      } else {
        for (const f of chord) this.tone(f, at, beatLength * 0.5, 'sine', 0.08, out);
        if (beatInBar === 2 && bar % 2 === 1) {
          const m = melody[(bar * 3 + 2) % melody.length] ?? melody[0]!;
          this.tone(m, at, beatLength * 0.8, 'triangle', 0.15, out);
        }
      }
      // Under stress a ticking hi-hat creeps in: the room feels the pressure.
      if (this.intensity > 0.3) {
        const v = 0.05 * this.intensity;
        this.noiseBurst(8000, at, 0.04, v, 0, 3, out);
        if (this.intensity > 0.7) this.noiseBurst(8000, at + beatLength / 2, 0.03, v * 0.6, 0, 3, out);
      }
      this.nextBeatTime += beatLength;
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

  /** Band-passed noise: whooshes (with a sweep), clinks (narrow) and sparkle (high). */
  private noiseBurst(freq: number, at: number, dur: number, volume: number, slide: number, q: number, out: AudioNode | null = this.sfxGain): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !out) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, freq), at);
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume * NOISE_MAKEUP, at + Math.min(0.03, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(gain).connect(out);
    // Start somewhere random in the buffer so bursts don't all sound identical.
    src.start(at, Math.random() * 0.5, dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}
