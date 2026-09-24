import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SceneKey } from '../config';
import { PhaserHost } from '../PhaserHost';

/**
 * Phase-1 diagnostic scene: verifies scaling, safe areas and multi-touch on
 * the real iPad (design-space corners, crisp text, a ripple under each touch).
 * Replaced by the reception scene in Phase 5.
 */
export class TouchProbeScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.TOUCH_PROBE);
  }

  create(data: { renderScale: number }): void {
    PhaserHost.applyDesignCamera(this, data.renderScale);

    this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0xfbeee6);
    this.add
      .rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH - 8, DESIGN_HEIGHT - 8)
      .setStrokeStyle(8, 0xe07a95);
    for (const [x, y] of [
      [40, 40],
      [DESIGN_WIDTH - 40, 40],
      [40, DESIGN_HEIGHT - 40],
      [DESIGN_WIDTH - 40, DESIGN_HEIGHT - 40],
    ] as const) {
      this.add.circle(x, y, 20, 0x9dbf9a);
    }

    const text = (y: number, s: string, size: number) =>
      this.add
        .text(DESIGN_WIDTH / 2, y, s, {
          fontFamily: '-apple-system, "Segoe UI", sans-serif',
          fontSize: `${size}px`,
          color: '#4a3548',
          resolution: data.renderScale,
        })
        .setOrigin(0.5);

    text(420, 'Touch test', 64);
    text(500, `render scale ${data.renderScale}×  ·  design ${DESIGN_WIDTH}×${DESIGN_HEIGHT}`, 28);
    text(560, 'Tap with one or more fingers — each touch should ripple exactly under it.', 26);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const ring = this.add.circle(p.worldX, p.worldY, 20).setStrokeStyle(6, 0xe07a95);
      this.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }
}
