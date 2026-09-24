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
  | 'star'
  | 'whoosh'
  | 'pop';

export interface AudioService {
  /** Must be called from a user gesture (iOS will not start audio otherwise). */
  unlock(): void;
  play(id: SfxId): void;
  setMusicPlaying(playing: boolean): void;
  /** Temporarily silence music without stopping it (e.g. the DJ disaster). */
  setMusicDucked(ducked: boolean): void;
  setMusicEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  dispose(): void;
}

export class SilentAudioService implements AudioService {
  unlock(): void {}
  play(): void {}
  setMusicPlaying(): void {}
  setMusicDucked(): void {}
  setMusicEnabled(): void {}
  setSfxEnabled(): void {}
  dispose(): void {}
}
