import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { paintRescueButton } from '../../art/painters';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Depth, makeText } from '../ui/text';

/** Bottom-right corner, beside the kitchen: nothing else lives there, so a thumb can't miss. */
const POS = { x: 1318, y: 900 };
const SIZE = 116;
const HIT_RADIUS = 70;

/**
 * The rescue champagne button: shows how many bottles are left and pops when
 * one is used. It only draws and hit-tests; the scene turns a tap into the
 * `useRescue` command.
 */
export class RescueButton {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly badge: Phaser.GameObjects.Arc;
  private readonly count: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private readonly fullKey: string;
  private readonly emptyKey: string;
  private shown = -1;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    private readonly fx: Fx,
    renderScale: number,
  ) {
    this.fullKey = tex.ensure('rescue:full', SIZE, SIZE, paintRescueButton(SIZE, false));
    this.emptyKey = tex.ensure('rescue:empty', SIZE, SIZE, paintRescueButton(SIZE, true));
    const d = Depth.hud;
    this.icon = tex.image(scene, POS.x, POS.y, this.fullKey).setDepth(d);
    this.badge = scene.add.circle(POS.x + 40, POS.y - 40, 19, 0xe86f8e).setStrokeStyle(3, 0x3b2640).setDepth(d + 1);
    this.count = makeText(scene, POS.x + 40, POS.y - 41, '', renderScale, { size: 22, display: true, color: '#ffffff', stroke: '#3b2640', strokeWidth: 4 })
      .setOrigin(0.5)
      .setDepth(d + 2);
    this.label = makeText(scene, POS.x, POS.y + 66, 'Cheers!', renderScale, { size: 17, weight: '800', stroke: '#fffaf0', strokeWidth: 5 })
      .setOrigin(0.5)
      .setDepth(d + 1);
    this.sync(0);
  }

  get visible(): boolean {
    return (this.sim.context.level.rescues ?? 0) > 0;
  }

  hitTest(p: Vec2): boolean {
    return this.visible && Math.hypot(p.x - POS.x, p.y - POS.y) <= HIT_RADIUS;
  }

  sync(dt: number): void {
    const visible = this.visible;
    for (const o of [this.icon, this.badge, this.count, this.label]) o.setVisible(visible);
    if (!visible) return;
    this.t += dt;
    const left = this.sim.state.rescuesLeft;
    if (left !== this.shown) {
      const first = this.shown < 0;
      this.shown = left;
      this.icon.setTexture(left > 0 ? this.fullKey : this.emptyKey);
      this.count.setText(String(left));
      this.badge.setVisible(left > 0);
      this.count.setVisible(left > 0);
      this.label.setAlpha(left > 0 ? 1 : 0.5);
      if (!first) this.pop();
    }
    // A gentle wobble while bottles remain, so it reads as something to press.
    if (left > 0) this.icon.setAngle(Math.sin(this.t * 2.2) * 4);
  }

  /** Feedback when a bottle is opened: pop, cork, and bubbles. */
  private pop(): void {
    const base = 1 / this.tex.scale;
    this.scene.tweens.killTweensOf(this.icon);
    this.icon.setScale(base * 1.25);
    this.scene.tweens.add({ targets: this.icon, scale: base, duration: 380, ease: 'Back.easeOut' });
    this.fx.sparkles({ x: POS.x, y: POS.y - 50 }, 12, 70, 0xfff1c4);
  }

  /** A tap that could not be used (no bottles left). */
  refuse(): void {
    this.scene.tweens.add({ targets: this.icon, angle: { from: -14, to: 14 }, yoyo: true, repeat: 2, duration: 60, onComplete: () => this.icon.setAngle(0) });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.icon);
    for (const o of [this.icon, this.badge, this.count, this.label]) o.destroy();
  }
}
