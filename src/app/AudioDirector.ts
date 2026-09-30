import type { ContentRegistry } from '../content/ContentRegistry';
import { effectsFor } from '../core/disasters/DisasterSystem';
import { isChainMilestone } from '../core/scoring/chain';
import type { DomainEvent } from '../core/sim/events';
import type { CoupleStateId } from '../content/types';
import type { ReceptionState } from '../core/sim/state';
import type { AudioService } from '../platform/audio/AudioService';

/** Each chain link rings a step higher, up to an octave. */
const CHAIN_STEP_SEMITONES = 2;
const CHAIN_MAX_SEMITONES = 12;
/** How hard the music leans in at each couple mood band. */
const MUSIC_INTENSITY: Record<CoupleStateId, number> = { blissful: 0, happy: 0, worried: 0.25, stressed: 0.65, meltdown: 1 };

/**
 * Maps gameplay events to sounds. Lives in the app layer so neither the
 * simulation nor the renderer knows audio exists.
 */
export class AudioDirector {
  private starScores: readonly number[] = [];
  private starsEarned = 0;

  constructor(
    private readonly audio: AudioService,
    private readonly content: ContentRegistry,
  ) {}

  /** Resets per-reception memory (stars already rung) and relaxes the music. */
  beginReception(starScores: readonly number[]): void {
    this.starScores = starScores;
    this.starsEarned = 0;
    this.audio.setMusicIntensity(0);
  }

  /** Leaving a reception: the menus play the calm waltz again. */
  endReception(): void {
    this.audio.setMusicIntensity(0);
  }

  handle(events: readonly DomainEvent[], state: Readonly<ReceptionState>): void {
    let disastersChanged = false;
    for (const e of events) {
      switch (e.type) {
        case 'itemPickedUp':
        case 'giftPickedUp':
          this.audio.play('pickup');
          break;
        case 'itemServed':
        case 'serviceGranted':
          this.audio.play('serve');
          break;
        case 'rescueUsed':
          this.audio.play('cheer');
          break;
        case 'orderTaken':
          this.audio.play('order');
          break;
        case 'guestSeated':
          this.audio.play(e.neighbourScore > 0.25 ? 'seatGood' : e.neighbourScore < -0.25 ? 'seatBad' : 'seat');
          break;
        case 'giftsDelivered':
          this.audio.play('gift');
          break;
        case 'dishReady':
          this.audio.play('dishReady');
          break;
        case 'guestUpset':
          this.audio.play('upset');
          break;
        case 'momentStarted':
          this.audio.play('moment');
          break;
        case 'momentCompleted':
          this.audio.play('cheer');
          break;
        case 'momentFailed':
          this.audio.play('failed');
          break;
        case 'disasterStarted':
          this.audio.play('warning');
          disastersChanged = true;
          break;
        case 'disasterPhaseChanged':
          disastersChanged = true;
          break;
        case 'disasterResolved':
          this.audio.play('fixed');
          disastersChanged = true;
          break;
        case 'disasterFailed':
          this.audio.play('failed');
          disastersChanged = true;
          break;
        case 'chainChanged':
          if (isChainMilestone(e.count)) this.audio.play('chainBig');
          else if (e.count >= 2) this.audio.play('chain', { pitch: Math.min(CHAIN_MAX_SEMITONES, (e.count - 2) * CHAIN_STEP_SEMITONES) });
          break;
        case 'guestStateChanged':
          if (e.to === 'LEAVING' && state.guests.find((g) => g.key === e.guestKey)?.happyExit) this.audio.play('guestHappy');
          break;
        case 'scoreChanged': {
          const stars = this.starScores.filter((s) => e.total >= s).length;
          if (stars > this.starsEarned) this.audio.play('starEarned');
          this.starsEarned = Math.max(this.starsEarned, stars);
          break;
        }
        case 'coupleStateChanged':
          this.audio.setMusicIntensity(MUSIC_INTENSITY[e.to]);
          break;
        case 'secretAppeared':
          this.audio.play('secret');
          break;
        case 'secretFound':
          this.audio.play('achievement');
          break;
        case 'actionSkipped':
          this.audio.play('nope');
          break;
        case 'receptionEnded':
          this.audio.play(e.outcome === 'COMPLETE' ? 'win' : 'lose');
          this.audio.setMusicDucked(false);
          this.audio.setMusicIntensity(0);
          break;
        default:
          break;
      }
    }
    if (disastersChanged) {
      const silenced = state.disasters.some((d) => effectsFor(this.content.disasters.get(d.defId), d.phase)?.silencesMusic === true);
      this.audio.setMusicDucked(silenced);
    }
  }
}
