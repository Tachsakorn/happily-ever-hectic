import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { TargetRef } from '../../core/sim/state';
import type { ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

const MAX_MARKERS = 8;

/** The player's planner: body, what she carries, her work progress and her queued tasks. */
export class PlannerView {
  private readonly body: Phaser.GameObjects.Image;
  private readonly held: Phaser.GameObjects.Image[];
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly markers: { dot: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private shownHands = '';
  private shownCurrentId = -1;
  private shownQueueLength = -1;
  private shownQueueHeadId = -1;
  private bob = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
    private readonly positionOf: (target: TargetRef) => Vec2 | null,
  ) {
    this.body = tex.image(scene, 0, 0, art.planner()).setOrigin(0.5, 0.95).setScale(1.12 / tex.scale);
    this.held = [0, 1].map(() => tex.image(scene, 0, 0, art.icon('plate')).setVisible(false));
    this.ring = scene.add.graphics().setDepth(Depth.bubbles);
    for (let i = 0; i < MAX_MARKERS; i++) {
      const dot = tex.image(scene, 0, 0, art.dot(Colors.blush, 15, 0xffffff)).setDepth(Depth.overlay).setVisible(false);
      const label = makeText(scene, 0, 0, '', renderScale, { size: 17, color: '#ffffff' }).setOrigin(0.5).setDepth(Depth.overlay + 1).setVisible(false);
      this.markers.push({ dot, label });
    }
  }

  get pos(): Vec2 {
    return this.sim.state.planner.pos;
  }

  sync(dtSeconds: number): void {
    const p = this.sim.state.planner;
    const walking = p.current?.phase === 'walking' && p.path.length > 0;
    this.bob = walking ? this.bob + dtSeconds * 14 : 0;
    const bobY = walking ? Math.abs(Math.sin(this.bob)) * -4 : 0;
    const { x, y } = p.pos;
    this.body
      .setPosition(x, y + bobY)
      .setDepth(Depth.actorsBase + y + 0.5)
      .setFlipX(p.facing < 0);

    const handsKey = p.hands.join(',');
    if (handsKey !== this.shownHands) {
      this.shownHands = handsKey;
      this.held.forEach((img, i) => {
        const id = p.hands[i];
        img.setVisible(!!id);
        if (id) img.setTexture(this.art.item(id)).setScale(0.9 / this.tex.scale);
      });
      // A two-handed item is carried in front, centred and bigger.
      if (this.isTwoHanded(p.hands)) this.held[0]?.setScale(1.3 / this.tex.scale);
    }
    const twoHanded = this.isTwoHanded(p.hands);
    this.held[0]?.setPosition(twoHanded ? x : x - 30, y - 40 + bobY).setDepth(Depth.actorsBase + y + 1);
    this.held[1]?.setPosition(x + 30, y - 40 + bobY).setDepth(Depth.actorsBase + y + 1);

    this.ring.clear();
    if (p.current?.phase === 'working' && p.current.workTotal > 0) {
      const t = 1 - Math.max(0, p.current.workLeft) / p.current.workTotal;
      this.ring.lineStyle(7, Colors.good, 1);
      this.ring.beginPath();
      this.ring.arc(x, y - 110, 18, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      this.ring.strokePath();
    }

    this.syncMarkers();
  }

  private syncMarkers(): void {
    const p = this.sim.state.planner;
    // Actions are only appended at the tail and consumed from the head, so these three
    // numbers change whenever the visible list does; rebuild markers only then.
    const currentId = p.current?.action.id ?? 0;
    const headId = p.queue[0]?.id ?? 0;
    if (currentId === this.shownCurrentId && p.queue.length === this.shownQueueLength && headId === this.shownQueueHeadId) return;
    this.shownCurrentId = currentId;
    this.shownQueueLength = p.queue.length;
    this.shownQueueHeadId = headId;
    const actions = [...(p.current ? [p.current.action] : []), ...p.queue];
    this.markers.forEach((m, i) => {
      const action = actions[i];
      const pos = action ? this.positionOf(action.target) : null;
      m.dot.setVisible(!!pos);
      m.label.setVisible(!!pos);
      if (!pos) return;
      const mx = pos.x + 26 + (i % 2) * 4;
      const my = pos.y - 20 - i * 3;
      m.dot.setPosition(mx, my);
      m.label.setPosition(mx, my).setText(String(i + 1));
    });
  }

  private isTwoHanded(hands: readonly string[]): boolean {
    const only = hands.length === 1 ? hands[0] : undefined;
    return only !== undefined && this.sim.context.content.items.get(only).hands === 2;
  }

  hitTest(p: Vec2): boolean {
    const { x, y } = this.sim.state.planner.pos;
    return Math.hypot(p.x - x, p.y - (y - 40)) < 46;
  }

  destroy(): void {
    this.body.destroy();
    for (const h of this.held) h.destroy();
    this.ring.destroy();
    for (const m of this.markers) {
      m.dot.destroy();
      m.label.destroy();
    }
  }
}
