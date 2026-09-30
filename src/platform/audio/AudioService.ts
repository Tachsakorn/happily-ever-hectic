/** Sound effects the game can play. Presentation code picks ids; the service decides how they sound. */
export type SfxId =
  | 'tap'
  | 'pickup'
  | 'serve'
  | 'order'
  | 'seat'
  | 'seatGood'
  | 'seatBad'
  | 'gift'
  | 'dishReady'
  | 'warning'
  | 'fixed'
  | 'failed'
  | 'upset'
  | 'moment'
  | 'cheer'
  | 'nope'
  | 'win'
  | 'lose'
  | 'coin'
  | 'coinTick'
  | 'star'
  | 'starEarned'
  | 'chain'
  | 'chainBig'
  | 'guestHappy'
  | 'whoosh'
  | 'curtain'
  | 'pop'
  | 'secret'
  | 'achievement';

export interface PlayOptions {
  /** Shift in semitones (e.g. a chain that climbs the scale). */
  readonly pitch?: number;
}

export interface AudioService {
  /** Must be called from a user gesture (iOS will not start audio otherwise). */
  unlock(): void;
  play(id: SfxId, opts?: PlayOptions): void;
  setMusicPlaying(playing: boolean): void;
  /** Temporarily silence music without stopping it (e.g. the DJ disaster). */
  setMusicDucked(ducked: boolean): void;
  /** 0 = relaxed, 1 = the couple is melting down: the music hurries and ticks. */
  setMusicIntensity(level: number): void;
  setMusicEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  dispose(): void;
}

export class SilentAudioService implements AudioService {
  unlock(): void {}
  play(): void {}
  setMusicPlaying(): void {}
  setMusicDucked(): void {}
  setMusicIntensity(): void {}
  setMusicEnabled(): void {}
  setSfxEnabled(): void {}
  dispose(): void {}
}
