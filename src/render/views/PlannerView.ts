import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { TargetRef } from '../../core/sim/state';
import { FEET_ORIGIN_Y, type ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Colors, Depth, makeText } from '../ui/text';

const MAX_MARKERS = 8;
const PLANNER_SCALE = 1.12;
const WALK_CADENCE = 15;
const DUST_EVERY = 0.24;
const CATCH_SECONDS = 0.24;
const CHEER_SECONDS = 0.9;

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
  private dust = 0;
  private cheerLeft = 0;
  private shownCheer = false;
  private wasWalking = false;
  private readonly react = { squash: 0 };
  /** Pending pickup origin, and per-hand flight progress from it. */
  private pickupFrom: Vec2 | null = null;
  private readonly flights: ({ from: Vec2; t: number } | null)[] = [null, null];
  private shownIds: (string | undefined)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
    private readonly positionOf: (target: TargetRef) => Vec2 | null,
    private readonly fx: Fx,
  ) {
    this.body = tex.image(scene, 0, 0, art.planner()).setOrigin(0.5, FEET_ORIGIN_Y).setScale(PLANNER_SCALE / tex.scale);
    this.held = [0, 1].map(() => tex.image(scene, 0, 0, art.icon('plate')).setVisible(false));
    this.ring = scene.add.graphics().setDepth(Depth.bubbles);
    for (let i = 0; i < MAX_MARKERS; i++) {
      const dot = tex.image(scene, 0, 0, art.dot(0xe86f8e, 15, 0x3b2640)).setDepth(Depth.overlay).setVisible(false);
      const label = makeText(scene, 0, 0, '', renderScale, { size: 18, display: true, color: '#ffffff' }).setOrigin(0.5).setDepth(Depth.overlay + 1).setVisible(false);
      this.markers.push({ dot, label });
    }
  }

  get pos(): Vec2 {
    return this.sim.state.planner.pos;
  }

  /** The next item to appear in her hands flies in from here. */
  notePickup(from: Vec2): void {
    this.pickupFrom = from;
  }

  /** A quick happy face and hop after something went well. */
  cheer(): void {
    this.cheerLeft = CHEER_SECONDS;
    this.react.squash = 0.12;
    this.scene.tweens.add({ targets: this.react, squash: 0, duration: 420, ease: 'Elastic.easeOut', easeParams: [1.2, 0.4] });
  }

  sync(dtSeconds: number): void {
    const p = this.sim.state.planner;
    const walking = p.current?.phase === 'walking' && p.path.length > 0;
    this.bob = walking ? this.bob + dtSeconds * WALK_CADENCE : 0;
    const bobY = walking ? Math.abs(Math.sin(this.bob)) * -5 : 0;
    const tilt = walking ? Math.sin(this.bob) * 4 : 0;
    const { x, y } = p.pos;
    if (this.wasWalking && !walking) {
      // Landing squash when she arrives.
      this.react.squash = 0.08;
      this.scene.tweens.add({ targets: this.react, squash: 0, duration: 260, ease: 'Quad.easeOut' });
    }
    this.wasWalking = walking;
    if (walking) {
      this.dust -= dtSeconds;
      if (this.dust <= 0) {
        this.dust = DUST_EVERY;
        this.fx.puff({ x: x - p.facing * 14, y: y + 2 }, 1);
      }
    }

    this.cheerLeft = Math.max(0, this.cheerLeft - dtSeconds);
    const cheering = this.cheerLeft > 0;
    if (cheering !== this.shownCheer) {
      this.shownCheer = cheering;
      this.body.setTexture(this.art.planner(cheering ? 'happy' : 'neutral'));
    }
    const unit = PLANNER_SCALE / this.tex.scale;
    const sq = this.react.squash;
    this.body
      .setPosition(x, y + bobY)
      .setAngle(tilt)
      .setScale(unit * (1 + sq), unit * (1 - sq))
      .setDepth(Depth.actorsBase + y + 0.5)
      .setFlipX(p.facing < 0);

    const handsKey = p.hands.join(',');
    if (handsKey !== this.shownHands) {
      this.shownHands = handsKey;
      this.held.forEach((img, i) => {
        const id = p.hands[i];
        img.setVisible(!!id);
        if (id) img.setTexture(this.art.item(id)).setScale(0.9 / this.tex.scale);
        if (id && id !== this.shownIds[i] && this.pickupFrom) this.flights[i] = { from: this.pickupFrom, t: 0 };
        if (!id) this.flights[i] = null;
      });
      this.shownIds = [...p.hands];
      this.pickupFrom = null;
      // A two-handed item is carried in front, centred and bigger.
      if (this.isTwoHanded(p.hands)) this.held[0]?.setScale(1.3 / this.tex.scale);
    }
    const twoHanded = this.isTwoHanded(p.hands);
    const hands: Vec2[] = [
      { x: twoHanded ? x : x - 30, y: y - 40 + bobY },
      { x: x + 30, y: y - 40 + bobY },
    ];
    this.held.forEach((img, i) => {
      const hand = hands[i]!;
      const flight = this.flights[i];
      if (flight) {
        flight.t = Math.min(1, flight.t + dtSeconds / CATCH_SECONDS);
        const e = 1 - Math.pow(1 - flight.t, 3);
        img.setPosition(flight.from.x + (hand.x - flight.from.x) * e, flight.from.y + (hand.y - flight.from.y) * e - Math.sin(Math.PI * e) * 50);
        if (flight.t >= 1) this.flights[i] = null;
      } else img.setPosition(hand.x, hand.y);
      img.setDepth(Depth.actorsBase + y + 1);
    });

    this.ring.clear();
    if (p.current?.phase === 'working' && p.current.workTotal > 0) {
      const t = 1 - Math.max(0, p.current.workLeft) / p.current.workTotal;
      const ry = y - 118;
      this.ring.fillStyle(0xfffaf0, 1).fillCircle(x, ry, 17);
      this.ring.lineStyle(3, 0x3b2640, 1).strokeCircle(x, ry, 17);
      this.ring.lineStyle(8, Colors.good, 1);
      this.ring.beginPath();
      this.ring.arc(x, ry, 11, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
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
