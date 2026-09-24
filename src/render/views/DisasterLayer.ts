import Phaser from 'phaser';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { DisasterPhase, type Disaster } from '../../core/sim/state';
import type { ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth } from '../ui/text';

const PHASE_COLOR: Record<string, number> = {
  [DisasterPhase.WARNING]: Colors.warn,
  [DisasterPhase.ACTIVE]: 0xf0803c,
  [DisasterPhase.ESCALATED]: Colors.bad,
};

interface Entry {
  icon: Phaser.GameObjects.Image;
  bounce: Phaser.Tweens.Tween;
}

/**
 * Every live disaster: its icon, a pulsing ring coloured by phase, and a
 * countdown arc to the next escalation — urgency is always visible.
 */
export class DisasterLayer {
  private readonly entries = new Map<number, Entry>();
  private readonly rings: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
  ) {
    this.rings = scene.add.graphics().setDepth(Depth.disasters);
  }

  private iconPos(d: Disaster): { x: number; y: number } {
    // Station disasters float above the station; others sit where they happen.
    return d.stationId ? { x: d.pos.x, y: d.pos.y - 70 } : { x: d.pos.x, y: d.pos.y - (d.tableId ? 10 : 0) };
  }

  sync(time: number): void {
    const live = this.sim.state.disasters;
    this.rings.clear();
    for (const d of live) {
      if (d.phase === DisasterPhase.RESOLVED || d.phase === DisasterPhase.FAILED) continue;
      let e = this.entries.get(d.id);
      const pos = this.iconPos(d);
      if (!e) {
        const icon = this.tex.image(this.scene, pos.x, pos.y, this.art.disaster(d.defId)).setDepth(Depth.disasters + 1);
        const size = icon.scale;
        icon.setScale(0);
        this.scene.tweens.add({ targets: icon, scale: size, duration: 360, ease: 'Back.easeOut', easeParams: [2.2] });
        const bounce = this.scene.tweens.add({ targets: icon, y: pos.y - 10, yoyo: true, repeat: -1, duration: 320, ease: 'Sine.easeInOut' });
        e = { icon, bounce };
        this.entries.set(d.id, e);
      }
      const color = PHASE_COLOR[d.phase] ?? Colors.warn;
      const pulse = 1 + Math.sin(time / (d.phase === DisasterPhase.ESCALATED ? 70 : 140)) * 0.08;
      const r = 50 * pulse;
      this.rings.fillStyle(color, 0.16).fillCircle(pos.x, pos.y, r);
      this.rings.lineStyle(4, color, 0.9).strokeCircle(pos.x, pos.y, r);
      const t = d.phaseDuration > 0 ? Math.max(0, 1 - d.phaseTime / d.phaseDuration) : 0;
      this.rings.lineStyle(12, 0x3b2640, 1);
      this.rings.beginPath();
      this.rings.arc(pos.x, pos.y, r + 10, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      this.rings.strokePath();
      this.rings.lineStyle(7, color, 1);
      this.rings.beginPath();
      this.rings.arc(pos.x, pos.y, r + 10, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      this.rings.strokePath();
    }
    for (const [id, e] of this.entries) {
      if (!live.some((d) => d.id === id)) {
        e.bounce.stop();
        const icon = e.icon;
        this.scene.tweens.add({ targets: icon, scale: 0, alpha: 0, duration: 250, onComplete: () => icon.destroy() });
        this.entries.delete(id);
      }
    }
  }

  destroy(): void {
    for (const e of this.entries.values()) {
      e.bounce.stop();
      e.icon.destroy();
    }
    this.rings.destroy();
  }
}
