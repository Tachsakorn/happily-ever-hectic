import { describe, expect, it } from 'vitest';
import { AudioDirector } from '../../src/app/AudioDirector';
import { isChainMilestone } from '../../src/core/scoring/chain';
import type { DomainEvent } from '../../src/core/sim/events';
import { SilentAudioService, type PlayOptions, type SfxId } from '../../src/platform/audio/AudioService';
import { makeSim } from '../support/fixtures';

class RecordingAudio extends SilentAudioService {
  readonly played: { id: SfxId; pitch: number }[] = [];
  intensity = -1;
  override play(id?: SfxId, opts?: PlayOptions): void {
    if (id) this.played.push({ id, pitch: opts?.pitch ?? 0 });
  }
  override setMusicIntensity(level?: number): void {
    this.intensity = level ?? -1;
  }
}

function setup() {
  const { sim } = makeSim();
  const audio = new RecordingAudio();
  const director = new AudioDirector(audio, sim.context.content);
  director.beginReception([100, 200, 300]);
  const send = (...events: DomainEvent[]) => director.handle(events, sim.state);
  return { audio, send };
}

const chain = (count: number): DomainEvent => ({ type: 'chainChanged', key: 'order', count, bonus: 0, broken: 0, pos: null });
const score = (total: number): DomainEvent => ({ type: 'scoreChanged', delta: 10, total, reason: 'test', pos: null });

describe('chain milestones', () => {
  it('celebrates 4, 6, 8 … and nothing shorter', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 10].map(isChainMilestone)).toEqual([false, false, false, true, false, true, false, true, true]);
  });
});

describe('AudioDirector', () => {
  it('rings each chain link a step higher, with a fanfare on milestones', () => {
    const { audio, send } = setup();
    send(chain(1), chain(2), chain(3), chain(4), chain(5));
    expect(audio.played).toEqual([
      { id: 'chain', pitch: 0 },
      { id: 'chain', pitch: 2 },
      { id: 'chainBig', pitch: 0 },
      { id: 'chain', pitch: 6 },
    ]);
  });

  it('plays the star sound once per star threshold crossed', () => {
    const { audio, send } = setup();
    send(score(50), score(120), score(150), score(250), score(240), score(260));
    expect(audio.played.filter((p) => p.id === 'starEarned')).toHaveLength(2);
  });

  it('tightens the music as the couple gets stressed and relaxes it when the reception ends', () => {
    const { audio, send } = setup();
    send({ type: 'coupleStateChanged', from: 'worried', to: 'stressed' });
    const stressed = audio.intensity;
    send({ type: 'coupleStateChanged', from: 'stressed', to: 'meltdown' });
    expect(audio.intensity).toBeGreaterThan(stressed);
    expect(stressed).toBeGreaterThan(0);
    send({ type: 'receptionEnded', outcome: 'COMPLETE' });
    expect(audio.intensity).toBe(0);
  });
});
