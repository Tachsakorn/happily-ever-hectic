import type { ContentRegistry } from '../content/ContentRegistry';
import { effectsFor } from '../core/disasters/DisasterSystem';
import type { DomainEvent } from '../core/sim/events';
import type { ReceptionState } from '../core/sim/state';
import type { AudioService } from '../platform/audio/AudioService';

/**
 * Maps gameplay events to sounds. Lives in the app layer so neither the
 * simulation nor the renderer knows audio exists.
 */
export class AudioDirector {
  constructor(
    private readonly audio: AudioService,
    private readonly content: ContentRegistry,
  ) {}

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
          if (e.count >= 3) this.audio.play('star');
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
