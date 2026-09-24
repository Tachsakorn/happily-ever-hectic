import Phaser from 'phaser';
import { GIFT_ITEM_ID } from '../../content/contracts';
import type { WeddingDef } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { DisasterPhase } from '../../core/sim/state';
import type { Mood } from '../../art/people';
import { FEET_ORIGIN_Y, type ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Colors, Depth } from '../ui/text';
import { stationItem } from '../../core/sim/items';

const COUPLE_SCALE = 1.2;
const COUPLE_HAPPY = 60;
const COUPLE_UPSET = 30;

/** The couple at the sweetheart table and whatever they are asking for. */
export class CoupleView {
  private readonly a: Phaser.GameObjects.Image;
  private readonly b: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Container;
  private readonly bubbleIcon: Phaser.GameObjects.Image;
  private readonly timer: Phaser.GameObjects.Graphics;
  private shownItem: string | null = null;
  private pulse: Phaser.Tweens.Tween | null = null;
  private t = 0;
  private shownMood: Mood | 'signature' | null = null;
  private readonly react = { hopA: 0, hopB: 0 };
  private readonly baseY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    private readonly wedding: WeddingDef,
    private readonly fx: Fx,
  ) {
    const { x, y } = sim.context.venue.def.couplePos;
    this.baseY = y + 8;
    this.a = tex.image(scene, x - 38, this.baseY, art.partner(wedding.partnerA)).setOrigin(0.5, FEET_ORIGIN_Y).setScale(COUPLE_SCALE / tex.scale).setDepth(Depth.actorsBase + y - 40);
    this.b = tex.image(scene, x + 38, this.baseY, art.partner(wedding.partnerB)).setOrigin(0.5, FEET_ORIGIN_Y).setScale(COUPLE_SCALE / tex.scale).setDepth(Depth.actorsBase + y - 40);
    const bubbleBg = tex.image(scene, 0, 0, art.bubble()).setScale(1.25 / tex.scale);
    this.bubbleIcon = tex.image(scene, 0, -8, art.icon('menu')).setScale(1.2 / tex.scale);
    // Beside the couple (left), clear of the HUD row above.
    this.bubble = scene.add.container(x - 150, y + 2, [bubbleBg, this.bubbleIcon]).setDepth(Depth.bubbles + 400).setVisible(false);
    this.timer = scene.add.graphics().setDepth(Depth.bubbles + 401);
  }

  /** Both jump for joy (a moment landed, a request was met). */
  celebrate(): void {
    const { x, y } = this.sim.context.venue.def.couplePos;
    this.scene.tweens.add({ targets: this.react, hopA: 18, yoyo: true, duration: 170, ease: 'Quad.easeOut', repeat: 1 });
    this.scene.tweens.add({ targets: this.react, hopB: 18, yoyo: true, duration: 170, ease: 'Quad.easeOut', repeat: 1, delay: 90 });
    this.fx.hearts({ x, y: y - 110 }, 6, 90);
  }

  sync(dt: number): void {
    const { couple } = this.sim.state;
    this.t += dt;
    // Nervous couples fidget; happy ones sway gently towards each other.
    const nervous = couple.mood < COUPLE_UPSET + 5;
    const sway = nervous ? Math.sin(this.t * 22) * 1.5 : Math.sin(this.t * 2) * 1.6;
    this.a.setAngle(sway).setY(this.baseY - this.react.hopA);
    this.b.setAngle(-sway).setY(this.baseY - this.react.hopB);

    const mood: Mood | 'signature' = couple.mood >= COUPLE_HAPPY ? 'signature' : couple.mood >= COUPLE_UPSET ? 'neutral' : 'sad';
    if (mood !== this.shownMood) {
      const first = this.shownMood === null;
      this.shownMood = mood;
      const m = mood === 'signature' ? undefined : mood;
      this.a.setTexture(this.art.partner(this.wedding.partnerA, m));
      this.b.setTexture(this.art.partner(this.wedding.partnerB, m));
      if (!first) {
        const s = COUPLE_SCALE / this.tex.scale;
        this.scene.tweens.add({ targets: [this.a, this.b], scaleX: { from: s * 1.12, to: s }, scaleY: { from: s * 0.9, to: s }, duration: 380, ease: 'Elastic.easeOut' });
      }
    }

    const req = couple.request;
    const item = req?.itemId ?? null;
    if (item !== this.shownItem) {
      this.shownItem = item;
      this.bubble.setVisible(!!item);
      if (item) this.bubbleIcon.setTexture(this.art.item(item)).setScale(1.2 / this.tex.scale);
      this.pulse?.stop();
      this.pulse = null;
      this.scene.tweens.killTweensOf(this.bubble);
      this.bubble.setScale(item ? 0 : 1);
      if (item) this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 320, ease: 'Back.easeOut' });
      if (item && req?.momentId) {
        this.pulse = this.scene.tweens.add({ targets: this.bubble, scale: 1.15, yoyo: true, repeat: -1, duration: 380, delay: 320 });
      }
    }
    this.timer.clear();
    if (req) {
      const t = Math.max(0, req.timeLeft / req.total);
      const color = t > 0.5 ? Colors.good : t > 0.25 ? Colors.warn : Colors.bad;
      const cx = this.bubble.x + 38;
      const cy = this.bubble.y - 30;
      this.timer.fillStyle(0xfffaf0, 1).fillCircle(cx, cy, 15);
      this.timer.lineStyle(2.5, 0x3b2640, 1).strokeCircle(cx, cy, 15);
      this.timer.lineStyle(7, color, 1);
      this.timer.beginPath();
      this.timer.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      this.timer.strokePath();
    }
  }

  destroy(): void {
    this.pulse?.stop();
    this.scene.tweens.killTweensOf([this.react, this.bubble, this.a, this.b]);
    this.a.destroy();
    this.b.destroy();
    this.bubble.destroy(true);
    this.timer.destroy();
  }
}

/** Drinks, desserts, the cake and gifts. (The kitchen has its own view.) */
export class PropsView {
  private readonly cake: Phaser.GameObjects.Image;
  private readonly giftImages = new Map<number, Phaser.GameObjects.Image>();
  private readonly giftBorn = new Map<number, number>();
  private readonly giftPile: Phaser.GameObjects.Image[] = [];
  private readonly cakeBase: { x: number; y: number };
  private readonly cakeStationId: string | null;
  private readonly cakeItemId: string | null;
  /** Flag set once the cake moment succeeds (from content, not hardcoded). */
  private readonly cakeServedFlag: string | null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
  ) {
    const venue = sim.context.venue.def;

    for (const s of venue.stations) {
      const provides = stationItem(sim.context, s);
      if ((s.kind === 'drinkTap' || s.kind === 'dessertTable') && provides) {
        const count = s.kind === 'dessertTable' ? 3 : 1;
        for (let i = 0; i < count; i++) {
          tex.image(scene, s.pos.x + (i - (count - 1) / 2) * 32, s.pos.y - 4, art.item(provides)).setScale(1.1 / tex.scale).setDepth(Depth.props);
        }
      }
    }
    const cakeStation = venue.stations.find((s) => s.kind === 'cakeTable');
    this.cakeStationId = cakeStation?.id ?? null;
    this.cakeItemId = cakeStation?.providesItemId ?? null;
    const cakeMoment = sim.context.content.moments.all().find((m) => m.itemId === this.cakeItemId);
    this.cakeServedFlag = cakeMoment?.setsFlags[0] ?? null;
    this.cakeBase = cakeStation ? { x: cakeStation.pos.x, y: cakeStation.pos.y - 8 } : { x: -100, y: -100 };
    this.cake = tex.image(scene, this.cakeBase.x, this.cakeBase.y, this.cakeItemId ? art.item(this.cakeItemId) : art.icon('cake')).setScale(1.9 / tex.scale).setOrigin(0.5, 0.8).setDepth(Depth.props + 1);

    const giftTable = venue.stations.find((s) => s.kind === 'giftTable');
    for (let i = 0; i < 8 && giftTable; i++) {
      const gx = giftTable.pos.x - 42 + (i % 4) * 28;
      const gy = giftTable.pos.y - 8 - Math.floor(i / 4) * 20;
      this.giftPile.push(tex.image(scene, gx, gy, art.item(GIFT_ITEM_ID)).setScale(0.75 / tex.scale).setDepth(Depth.props + 1).setVisible(false));
    }
  }

  sync(time: number): void {
    const state = this.sim.state;
    // The cake: on its table, in the planner's hands, or cut at the couple's table.
    const carried = this.cakeItemId !== null && state.planner.hands.includes(this.cakeItemId);
    const cut = this.cakeServedFlag !== null && state.flags.has(this.cakeServedFlag);
    const couple = this.sim.context.venue.def.couplePos;
    this.cake.setVisible(!carried);
    if (cut) this.cake.setPosition(couple.x, couple.y + 40).setDepth(Depth.actorsBase + couple.y + 60).setScale(1.3 / this.tex.scale);
    else this.cake.setPosition(this.cakeBase.x, this.cakeBase.y);
    const phase = state.disasters.find((d) => d.stationId !== null && d.stationId === this.cakeStationId)?.phase;
    const leaning = phase !== undefined && phase !== DisasterPhase.RESOLVED;
    const lean = phase === DisasterPhase.ESCALATED ? 16 : phase === DisasterPhase.ACTIVE ? 10 : 5;
    this.cake.setAngle(leaning && !cut ? lean + Math.sin(time / 90) * 3 : 0);

    // Gifts on tables: new ones pop in, stale ones start to pulse before they go missing.
    const lostAfter = this.sim.context.tuning.giftLostAfterSeconds;
    const seen = new Set<number>();
    for (const gift of state.gifts) {
      if (gift.state !== 'waiting') continue;
      seen.add(gift.id);
      let img = this.giftImages.get(gift.id);
      if (!img) {
        img = this.tex.image(this.scene, gift.pos.x, gift.pos.y, this.art.item(GIFT_ITEM_ID)).setDepth(Depth.bubbles - 10);
        this.giftImages.set(gift.id, img);
        this.giftBorn.set(gift.id, time);
      }
      const danger = gift.age / lostAfter;
      // New gifts drop in with a bounce; stale ones throb red before they go missing.
      const born = Math.min(1, (time - (this.giftBorn.get(gift.id) ?? 0)) / 350);
      const drop = born < 1 ? Math.sin(born * Math.PI) * -26 * (1 - born) : 0;
      const pop = born < 1 ? 0.5 + born * 0.4 : 0.9;
      img.setY(gift.pos.y + drop);
      img.setScale((danger > 0.7 ? 0.95 + Math.sin(time / 110) * 0.12 : pop) / this.tex.scale);
      img.setAngle(danger > 0.7 ? Math.sin(time / 70) * 8 : 0);
      img.setTint(danger > 0.7 ? 0xffb0b0 : 0xffffff);
    }
    for (const [id, img] of this.giftImages) {
      if (!seen.has(id)) {
        img.destroy();
        this.giftImages.delete(id);
        this.giftBorn.delete(id);
      }
    }
    this.giftPile.forEach((g, i) => {
      const show = i < state.stats.giftsDelivered;
      if (show && !g.visible) {
        const s = 0.75 / this.tex.scale;
        this.scene.tweens.add({ targets: g, scale: { from: s * 1.8, to: s }, duration: 320, ease: 'Back.easeOut', delay: i * 60 });
      }
      g.setVisible(show);
    });
  }

  destroy(): void {
    for (const img of this.giftImages.values()) img.destroy();
    for (const img of this.giftPile) img.destroy();
    this.cake.destroy();
  }
}
