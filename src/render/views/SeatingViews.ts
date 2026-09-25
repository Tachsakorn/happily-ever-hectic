import Phaser from 'phaser';
import { danceFloorBounds } from '../../content/venueLayout';
import type { Id, Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { findGuest } from '../../core/guests/guestMachine';
import type { ArtKit } from '../art/ArtKit';
import { paintPanel } from '../../art/painters';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

/**
 * While a guest is being seated: how they would feel in each free seat (green
 * heart = someone they like right beside it, red cross = someone they can't
 * stand), and the seat under the finger. Only side-by-side neighbours count,
 * so the hint is per seat, not per table. This is what makes seating a
 * readable decision instead of a guess.
 */
export class SeatingOverlay {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<Id, Phaser.GameObjects.Text>();
  private readonly floorLabel: Phaser.GameObjects.Text;
  private preview: Map<Id, number> | null = null;
  /** Set while the held guest wants to dance: then the dance floor is the only target. */
  private dancer = false;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
  ) {
    this.g = scene.add.graphics().setDepth(Depth.overlay - 5);
    for (const t of sim.context.venue.tables) {
      for (const seat of t.seats) {
        this.labels.set(
          seat.id,
          makeText(scene, seat.pos.x, seat.pos.y - 2, '', renderScale, { size: 30, weight: '800', stroke: '#ffffff', strokeWidth: 6 })
            .setOrigin(0.5)
            .setDepth(Depth.overlay - 4)
            .setVisible(false),
        );
      }
    }
    const floor = danceFloorBounds(sim.context.venue.def);
    this.floorLabel = makeText(scene, floor ? floor.x + floor.w / 2 : 0, floor ? floor.y - 26 : 0, 'Dance here!', renderScale, { size: 24, weight: '800', stroke: '#ffffff', strokeWidth: 6 })
      .setOrigin(0.5)
      .setColor(DANCE_CSS)
      .setDepth(Depth.overlay - 4)
      .setVisible(false);
  }

  show(guestKey: string): void {
    const g = findGuest(this.sim.context, guestKey);
    this.dancer = g?.state === 'WANTS_TO_DANCE';
    if (this.dancer) {
      this.preview = null;
      this.drawFloor(false);
      return;
    }
    this.preview = this.sim.seatingPreview(guestKey);
    this.draw(null);
  }

  /** Follows the finger: lights up the seat, or the dance floor, it is over. */
  highlight(p: Vec2): void {
    if (this.dancer) this.drawFloor(this.sim.isOnDanceFloor(p));
    else if (this.preview) this.draw(this.sim.pickSeat(p));
  }

  hide(): void {
    this.preview = null;
    this.dancer = false;
    this.g.clear();
    for (const l of this.labels.values()) l.setVisible(false);
    this.floorLabel.setVisible(false);
  }

  private drawFloor(active: boolean): void {
    const r = danceFloorBounds(this.sim.context.venue.def);
    this.g.clear();
    if (!r) return;
    this.g.fillStyle(DANCE_COLOR, active ? 0.3 : 0.16).fillRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 18);
    this.g.lineStyle(active ? 7 : 5, DANCE_COLOR, active ? 1 : 0.8).strokeRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 18);
    this.floorLabel.setVisible(true).setScale(active ? 1.12 : 1);
  }

  private draw(activeSeat: Id | null): void {
    const preview = this.preview;
    if (!preview) return;
    this.g.clear();
    for (const t of this.sim.context.venue.tables) {
      const open = t.seats.some((s) => preview.has(s.id));
      this.g.lineStyle(4, 0xffffff, open ? 0.8 : 0.25).strokeCircle(t.pos.x, t.pos.y, t.radius + 52);
      this.g.fillStyle(0xffffff, open ? 0.1 : 0.04).fillCircle(t.pos.x, t.pos.y, t.radius + 52);
      for (const seat of t.seats) {
        const label = this.labels.get(seat.id);
        const score = preview.get(seat.id);
        if (score === undefined) {
          label?.setVisible(false);
          continue;
        }
        const good = score > 0.25;
        const bad = score < -0.25;
        const color = good ? Colors.good : bad ? Colors.bad : 0xffffff;
        const active = seat.id === activeSeat;
        const r = active ? 36 : 29;
        this.g.fillStyle(color, good || bad ? 0.45 : 0.3).fillCircle(seat.pos.x, seat.pos.y, r);
        this.g.lineStyle(active ? 7 : 4, active ? Colors.blush : good || bad ? color : Colors.ink, active ? 1 : 0.7).strokeCircle(seat.pos.x, seat.pos.y, r);
        label
          ?.setText(good ? '♥' : bad ? '✕' : '')
          .setColor(good ? Colors.goodCss : Colors.badCss)
          .setScale(active ? 1.2 : 1)
          .setVisible(good || bad);
      }
    }
  }

  destroy(): void {
    this.g.destroy();
    for (const l of this.labels.values()) l.destroy();
    this.floorLabel.destroy();
  }
}

const DANCE_COLOR = 0xb49be0;
const DANCE_CSS = '#8a6cc8';

/** A small card describing a guest: who they are, their traits, who they like and dislike. */
export class GuestCard {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: ReceptionSimulation,
    tex: TextureFactory,
    renderScale: number,
  ) {
    // Top centre: during seating the player looks at the tables, not the couple.
    this.bg = tex.image(scene, 730, 60, tex.ensure('panel:card', 500, 116, paintPanel(500, 116))).setDepth(Depth.banner).setVisible(false);
    this.title = makeText(scene, 730, 32, '', renderScale, { size: 22, weight: '800' }).setOrigin(0.5).setDepth(Depth.banner + 1).setVisible(false);
    this.body = makeText(scene, 730, 72, '', renderScale, { size: 16, weight: '600', wrapWidth: 450 }).setOrigin(0.5).setDepth(Depth.banner + 1).setVisible(false);
  }

  show(guestKey: string): void {
    const ctx = this.sim.context;
    const g = findGuest(ctx, guestKey);
    if (!g) return;
    const type = ctx.content.guestTypes.get(g.typeId);
    const group = ctx.content.groups.get(g.groupId);
    if (g.state === 'WANTS_TO_DANCE') {
      this.title.setText(`${g.name} wants to dance!`);
      this.body.setText('Drop them on the dance floor by the DJ.');
      for (const o of [this.bg, this.title, this.body]) o.setVisible(true);
      return;
    }
    const traits = g.traitIds.map((id) => ctx.content.traits.get(id).name).join(', ');
    const nameOf = (ref: string) =>
      ctx.level.guests.find((s) => s.key === ref)?.name ?? (ctx.content.groups.has(ref) ? `all ${ctx.content.groups.get(ref).name}` : ref);
    const parts: string[] = [];
    if (traits) parts.push(traits);
    if (g.likes.length) parts.push(`♥ Sit next to: ${g.likes.map(nameOf).join(', ')}`);
    if (g.dislikes.length) parts.push(`✕ Not next to: ${g.dislikes.map(nameOf).join(', ')}`);
    if (!g.likes.length && !g.dislikes.length) parts.push(`Happiest beside other ${group.name.toLowerCase()}`);
    this.title.setText(`${g.name} · ${group.name}`);
    parts.unshift(type.name);
    this.body.setText(parts.join('\n'));
    for (const o of [this.bg, this.title, this.body]) o.setVisible(true);
  }

  hide(): void {
    for (const o of [this.bg, this.title, this.body]) o.setVisible(false);
  }
}

/** Pooled tap ripples: immediate feedback for every touch. */
export class TapFeedback {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly base: number;
  private next = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    art: ArtKit,
    tex: TextureFactory,
  ) {
    this.base = 1 / tex.scale;
    for (let i = 0; i < 6; i++) {
      this.pool.push(tex.image(scene, 0, 0, art.dot(0xffffff, 26, Colors.blush)).setDepth(Depth.floating - 1).setVisible(false));
    }
  }

  ripple(p: Vec2, ok: boolean): void {
    const img = this.pool[this.next] as Phaser.GameObjects.Image;
    this.next = (this.next + 1) % this.pool.length;
    this.scene.tweens.killTweensOf(img);
    const base = this.base;
    img.setPosition(p.x, p.y).setVisible(true).setAlpha(0.8).setScale(base * 0.4).setTint(ok ? 0xffffff : 0xffb3b3);
    this.scene.tweens.add({ targets: img, scale: base * 1.2, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => img.setVisible(false) });
  }
}
