import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import { FX_SIZE, paintFxConfetti, paintFxHeart, paintFxNote, paintFxPuff, paintFxSparkle } from '../../art/fx';
import type { TextureFactory } from '../art/TextureFactory';
import { Depth } from '../ui/text';

const POOL_SIZE = 110;
const CONFETTI_TINTS = [0xe86f8e, 0xf2b84b, 0x8fd0e8, 0x7fb08a, 0xfffaf0, 0xb49be0];

type Kind = 'heart' | 'sparkle' | 'confetti' | 'puff' | 'steam' | 'note';

/**
 * Juice: hearts, sparkles, confetti, dust and flying items. Everything comes
 * from one fixed pool of images, so a chaotic moment can never allocate
 * without bound; when the pool is empty, extra particles are simply skipped.
 */
export class Fx {
  private readonly free: Phaser.GameObjects.Image[] = [];
  private readonly keys: Record<Kind, string>;
  private readonly unit: number;

  constructor(
    private readonly scene: Phaser.Scene,
    tex: TextureFactory,
  ) {
    this.unit = 1 / tex.scale;
    this.keys = {
      heart: tex.ensure('fx:heart', FX_SIZE, FX_SIZE, paintFxHeart()),
      sparkle: tex.ensure('fx:sparkle', FX_SIZE, FX_SIZE, paintFxSparkle()),
      confetti: tex.ensure('fx:confetti', FX_SIZE, FX_SIZE, paintFxConfetti()),
      puff: tex.ensure('fx:puff', FX_SIZE, FX_SIZE, paintFxPuff()),
      steam: tex.ensure('fx:steam', FX_SIZE, FX_SIZE, paintFxPuff(0xd8d0dc)),
      note: tex.ensure('fx:note', FX_SIZE, FX_SIZE, paintFxNote()),
    };
    for (let i = 0; i < POOL_SIZE; i++) this.free.push(scene.add.image(0, 0, this.keys.sparkle).setVisible(false).setActive(false));
  }

  private take(kind: Kind | string, x: number, y: number, depth = Depth.floating - 2): Phaser.GameObjects.Image | null {
    const img = this.free.pop();
    if (!img) return null;
    const key = kind in this.keys ? this.keys[kind as Kind] : kind;
    return img.setTexture(key).setPosition(x, y).setDepth(depth).setVisible(true).setActive(true).setAlpha(1).setAngle(0).setTint(0xffffff).setScale(this.unit);
  }

  private release = (img: Phaser.GameObjects.Image): void => {
    img.setVisible(false).setActive(false);
    this.free.push(img);
  };

  hearts(p: Vec2, count = 4, spread = 34): void {
    for (let i = 0; i < count; i++) {
      const img = this.take('heart', p.x + (Math.random() - 0.5) * spread, p.y);
      if (!img) return;
      const s = this.unit * (0.7 + Math.random() * 0.5);
      img.setScale(0);
      this.scene.tweens.add({ targets: img, scale: s, duration: 180, delay: i * 70, ease: 'Back.easeOut' });
      this.scene.tweens.add({
        targets: img,
        y: p.y - 70 - Math.random() * 40,
        x: img.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        delay: i * 70 + 200,
        duration: 900,
        ease: 'Sine.easeIn',
        onComplete: () => this.release(img),
      });
    }
  }

  sparkles(p: Vec2, count = 7, radius = 46, tint = 0xffffff): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const img = this.take('sparkle', p.x, p.y);
      if (!img) return;
      img.setTint(tint).setScale(0);
      const d = radius * (0.7 + Math.random() * 0.5);
      this.scene.tweens.add({
        targets: img,
        x: p.x + Math.cos(a) * d,
        y: p.y + Math.sin(a) * d,
        scale: { from: this.unit * 1.1, to: 0 },
        angle: 90,
        duration: 520 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => this.release(img),
      });
    }
  }

  /** A burst of paper that pops up and flutters down. */
  confetti(p: Vec2, count = 22, spread = 160): void {
    for (let i = 0; i < count; i++) {
      const img = this.take('confetti', p.x, p.y, Depth.floating - 1);
      if (!img) return;
      img.setTint(CONFETTI_TINTS[i % CONFETTI_TINTS.length]!).setAngle(Math.random() * 360);
      const tx = p.x + (Math.random() - 0.5) * spread * 2;
      const peak = p.y - 60 - Math.random() * spread * 0.8;
      this.scene.tweens.add({ targets: img, x: tx, duration: 1300, ease: 'Sine.easeOut' });
      this.scene.tweens.add({
        targets: img,
        y: peak,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () =>
          this.scene.tweens.add({
            targets: img,
            y: peak + 160 + Math.random() * 80,
            angle: img.angle + 360 + Math.random() * 360,
            alpha: 0,
            duration: 1000 + Math.random() * 500,
            ease: 'Sine.easeIn',
            onComplete: () => this.release(img),
          }),
      });
    }
  }

  /** Confetti falling across the whole venue: the end-of-wedding celebration. */
  rain(width: number, count = 70): void {
    for (let i = 0; i < count; i++) {
      const img = this.take('confetti', Math.random() * width, -20 - Math.random() * 200, Depth.banner - 5);
      if (!img) return;
      img.setTint(CONFETTI_TINTS[i % CONFETTI_TINTS.length]!).setAngle(Math.random() * 360).setScale(this.unit * (0.8 + Math.random() * 0.5));
      this.scene.tweens.add({
        targets: img,
        y: 1060,
        x: img.x + (Math.random() - 0.5) * 160,
        angle: img.angle + 540 + Math.random() * 540,
        delay: Math.random() * 900,
        duration: 2200 + Math.random() * 1200,
        ease: 'Sine.easeIn',
        onComplete: () => this.release(img),
      });
    }
  }

  puff(p: Vec2, count = 3, kind: 'puff' | 'steam' = 'puff'): void {
    for (let i = 0; i < count; i++) {
      const img = this.take(kind, p.x + (i - (count - 1) / 2) * 12, p.y, Depth.actorsBase + p.y - 1);
      if (!img) return;
      img.setScale(this.unit * 0.4);
      const rise = kind === 'steam' ? 46 : 12;
      this.scene.tweens.add({
        targets: img,
        scale: this.unit * (kind === 'steam' ? 1.1 : 0.9),
        x: img.x + (i - (count - 1) / 2) * 10,
        y: p.y - rise - Math.random() * 10,
        alpha: 0,
        duration: kind === 'steam' ? 700 : 420,
        delay: i * (kind === 'steam' ? 120 : 30),
        ease: 'Cubic.easeOut',
        onComplete: () => this.release(img),
      });
    }
  }

  note(p: Vec2): void {
    const img = this.take('note', p.x, p.y);
    if (!img) return;
    img.setScale(0);
    const drift = (Math.random() - 0.5) * 40;
    this.scene.tweens.add({ targets: img, scale: this.unit, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: img, y: p.y - 60, x: p.x + drift, angle: drift / 2, alpha: 0, delay: 150, duration: 1000, onComplete: () => this.release(img) });
  }

  /** Flies a baked texture along an arc from `from` to `to`, then calls `onArrive`. */
  fly(textureKey: string, from: Vec2, to: Vec2, opts: { scale?: number; duration?: number; delay?: number; onArrive?: () => void } = {}): void {
    const img = this.take(textureKey, from.x, from.y, Depth.floating - 1);
    if (!img) {
      opts.onArrive?.();
      return;
    }
    const scale = (opts.scale ?? 1) * this.unit;
    img.setScale(scale);
    const lift = Math.min(120, 40 + Math.hypot(to.x - from.x, to.y - from.y) * 0.25);
    const state = { t: 0 };
    this.scene.tweens.add({
      targets: state,
      t: 1,
      delay: opts.delay ?? 0,
      duration: opts.duration ?? 320,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = state.t;
        img.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * lift);
        img.setScale(scale * (1 + Math.sin(Math.PI * t) * 0.25));
      },
      onComplete: () => {
        this.release(img);
        opts.onArrive?.();
      },
    });
  }

  destroy(): void {
    this.free.length = 0;
  }
}
