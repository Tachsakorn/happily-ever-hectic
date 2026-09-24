import Phaser from 'phaser';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { Secret } from '../../core/sim/state';
import type { ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Depth } from '../ui/text';

const RING_COLOR = 0xb49be0;
const GLOW_COLOR = 0xfff3c4;
/** The halo behind a secret: lilac, so gold and cream pictures still stand out. */
const HALO_COLOR = 0xe6dcff;
/** Secrets are drawn a little larger than props so they catch the eye. */
const ICON_SCALE = 1.25;
const SPARKLE_EVERY = 0.45;
const LIFT = 34;

interface Entry {
  readonly icon: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
  sparkleIn: number;
}

/**
 * Secret events on the floor: a glowing, floating picture with a ring that
 * shrinks as it is about to vanish. It must be noticeable in the chaos
 * without looking like a problem, so it glows and sparkles instead of flashing.
 */
export class SecretLayer {
  private readonly entries = new Map<number, Entry>();
  private readonly ring: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly fx: Fx,
    private readonly sim: ReceptionSimulation,
  ) {
    this.ring = scene.add.graphics().setDepth(Depth.disasters - 2);
  }

  private create(s: Secret): Entry {
    const glow = this.tex.image(this.scene, s.pos.x, s.pos.y - LIFT, this.art.dot(HALO_COLOR, 36)).setDepth(Depth.disasters - 1).setAlpha(0.7);
    const icon = this.tex.image(this.scene, s.pos.x, s.pos.y - LIFT, this.art.secret(s.defId)).setDepth(Depth.disasters);
    const size = icon.scale * ICON_SCALE;
    icon.setScale(0);
    this.scene.tweens.add({ targets: icon, scale: size, duration: 420, ease: 'Back.easeOut', easeParams: [2.4] });
    this.fx.sparkles({ x: s.pos.x, y: s.pos.y - LIFT }, 10, 70, GLOW_COLOR);
    return { icon, glow, sparkleIn: SPARKLE_EVERY };
  }

  sync(dt: number): void {
    this.t += dt;
    this.ring.clear();
    const secrets = this.sim.state.secrets;
    for (const s of secrets) {
      if (s.state !== 'active') continue;
      let e = this.entries.get(s.id);
      if (!e) {
        e = this.create(s);
        this.entries.set(s.id, e);
      }
      const y = s.pos.y - LIFT + Math.sin(this.t * 3) * 6;
      e.icon.setPosition(s.pos.x, y).setAngle(Math.sin(this.t * 2.2) * 8);
      e.glow.setPosition(s.pos.x, y).setAlpha(0.6 + Math.sin(this.t * 5) * 0.15);
      e.sparkleIn -= dt;
      if (e.sparkleIn <= 0) {
        e.sparkleIn = SPARKLE_EVERY;
        this.fx.sparkles({ x: s.pos.x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 40 }, 2, 16, GLOW_COLOR);
      }
      // Countdown ring: how long until it vanishes.
      const left = Math.max(0, s.timeLeft / s.total);
      this.ring.lineStyle(10, 0x3b2640, 0.9).beginPath();
      this.ring.arc(s.pos.x, y, 52, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2).strokePath();
      this.ring.lineStyle(6, RING_COLOR, 1).beginPath();
      this.ring.arc(s.pos.x, y, 52, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2).strokePath();
    }
    for (const [id, e] of this.entries) {
      if (secrets.some((s) => s.id === id && s.state === 'active')) continue;
      this.entries.delete(id);
      this.scene.tweens.add({
        targets: [e.icon, e.glow],
        scale: 0,
        alpha: 0,
        duration: 260,
        onComplete: () => {
          e.icon.destroy();
          e.glow.destroy();
        },
      });
    }
  }

  destroy(): void {
    for (const e of this.entries.values()) {
      e.icon.destroy();
      e.glow.destroy();
    }
    this.entries.clear();
    this.ring.destroy();
  }
}
