import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import { Colors, Depth, makeText } from '../ui/text';

const POOL_SIZE = 24;
const MIN_GAP_Y = 26;

/**
 * Pooled floating feedback ("+5 ♥ Gifts on the gift table"). A fixed pool
 * means a chaotic moment can never allocate hundreds of text objects.
 */
export class FloatingTextLayer {
  private readonly pool: Phaser.GameObjects.Text[] = [];
  private next = 0;
  private readonly recent: { x: number; y: number; t: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    renderScale: number,
  ) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const t = makeText(scene, 0, 0, '', renderScale, { size: 22, stroke: '#ffffff', strokeWidth: 6 })
        .setOrigin(0.5)
        .setDepth(Depth.floating)
        .setVisible(false);
      this.pool.push(t);
    }
  }

  show(pos: Vec2, message: string, color: string, size = 22): void {
    const now = this.scene.time.now;
    // Nudge upwards if another popup appeared at the same place very recently.
    let y = pos.y;
    for (const r of this.recent) {
      if (now - r.t < 700 && Math.abs(r.x - pos.x) < 120 && Math.abs(r.y - y) < MIN_GAP_Y) y = r.y - MIN_GAP_Y;
    }
    this.recent.push({ x: pos.x, y, t: now });
    if (this.recent.length > 12) this.recent.shift();

    const text = this.pool[this.next] as Phaser.GameObjects.Text;
    this.next = (this.next + 1) % POOL_SIZE;
    this.scene.tweens.killTweensOf(text);
    text
      .setText(message)
      .setColor(color)
      .setFontSize(size)
      .setPosition(pos.x, y)
      .setAlpha(1)
      .setScale(0.7)
      .setVisible(true);
    this.scene.tweens.add({ targets: text, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: text,
      y: y - 46,
      alpha: 0,
      delay: 900,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => text.setVisible(false),
    });
  }

  mood(pos: Vec2, delta: number, cause: string): void {
    const rounded = Math.round(delta);
    if (rounded === 0) return;
    const sign = rounded > 0 ? '+' : '−';
    this.show(pos, `${sign}${Math.abs(rounded)} ♥ ${cause}`, rounded > 0 ? Colors.goodCss : Colors.badCss, 20);
  }

  score(pos: Vec2, delta: number): void {
    this.show({ x: pos.x, y: pos.y - 30 }, `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, delta > 0 ? Colors.goldCss : Colors.badCss, 24);
  }
}
