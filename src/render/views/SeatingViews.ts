import Phaser from 'phaser';
import type { Id, Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { findGuest, holdsSeat } from '../../core/guests/guestMachine';
import type { ArtKit } from '../art/ArtKit';
import { paintPanel } from '../../art/painters';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

/**
 * While a guest is being seated: how they would feel at each table (green =
 * friends there, red = someone they dislike), and the seat under the finger.
 * This is what makes seating a readable decision instead of a guess.
 */
export class SeatingOverlay {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[];
  private preview: Map<Id, number> | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
  ) {
    this.g = scene.add.graphics().setDepth(Depth.overlay - 5);
    this.labels = sim.context.venue.tables.map((t) =>
      makeText(scene, t.pos.x, t.pos.y + 4, '', renderScale, { size: 26, weight: '800', stroke: '#ffffff', strokeWidth: 6 })
        .setOrigin(0.5)
        .setDepth(Depth.overlay - 4)
        .setVisible(false),
    );
  }

  show(guestKey: string): void {
    this.preview = this.sim.seatingPreview(guestKey);
    this.draw(null);
  }

  highlight(seatId: Id | null): void {
    if (this.preview) this.draw(seatId);
  }

  hide(): void {
    this.preview = null;
    this.g.clear();
    for (const l of this.labels) l.setVisible(false);
  }

  private draw(activeSeat: Id | null): void {
    const preview = this.preview;
    if (!preview) return;
    this.g.clear();
    const guests = this.sim.state.guests;
    this.sim.context.venue.tables.forEach((t, i) => {
      const score = preview.get(t.id) ?? 0;
      const color = score > 0.25 ? Colors.good : score < -0.25 ? Colors.bad : 0xffffff;
      const free = t.seats.filter((s) => !guests.some((g) => g.seatId === s.id && holdsSeat(g)));
      this.g.lineStyle(6, color, free.length ? 0.9 : 0.3).strokeCircle(t.pos.x, t.pos.y, t.radius + 52);
      this.g.fillStyle(color, free.length ? 0.14 : 0.05).fillCircle(t.pos.x, t.pos.y, t.radius + 52);
      for (const s of free) {
        const active = s.id === activeSeat;
        this.g.lineStyle(active ? 6 : 3, active ? Colors.blush : Colors.ink, active ? 1 : 0.4).strokeCircle(s.pos.x, s.pos.y, active ? 30 : 22);
      }
      const label = this.labels[i];
      if (!label) return;
      const face = score > 0.25 ? '♥ +' + score.toFixed(1).replace('.0', '') : score < -0.25 ? '✕ ' + score.toFixed(1).replace('.0', '') : '';
      label.setText(free.length ? face : 'Full').setColor(score > 0.25 ? Colors.goodCss : score < -0.25 ? Colors.badCss : Colors.inkCss).setVisible(true);
    });
  }

  destroy(): void {
    this.g.destroy();
    for (const l of this.labels) l.destroy();
  }
}

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
    const traits = type.traitIds.map((id) => ctx.content.traits.get(id).name).join(', ');
    const nameOf = (ref: string) =>
      ctx.level.guests.find((s) => s.key === ref)?.name ?? (ctx.content.groups.has(ref) ? `all ${ctx.content.groups.get(ref).name}` : ref);
    const parts: string[] = [];
    if (traits) parts.push(traits);
    if (g.likes.length) parts.push(`Likes: ${g.likes.map(nameOf).join(', ')}`);
    if (g.dislikes.length) parts.push(`Dislikes: ${g.dislikes.map(nameOf).join(', ')}`);
    if (!g.likes.length && !g.dislikes.length) parts.push(`Happiest with other ${group.name.toLowerCase()}`);
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
