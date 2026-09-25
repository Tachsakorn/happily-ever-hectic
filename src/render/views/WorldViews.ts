import Phaser from 'phaser';
import { GIFT_ITEM_ID } from '../../content/contracts';
import type { CoupleStateId, WeddingDef } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { DisasterPhase } from '../../core/sim/state';
import type { Mood } from '../../art/people';
import { FEET_ORIGIN_Y, type ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Colors, Depth } from '../ui/text';
import { stationItem } from '../../core/sim/items';

const COUPLE_SCALE = 1.2;
/** Faces per mood band: calm couples show their signature look, stressed ones crumble. */
const BAND_MOOD: Record<CoupleStateId, Mood | 'signature'> = {
  blissful: 'signature',
  happy: 'signature',
  worried: 'neutral',
  stressed: 'sad',
  meltdown: 'angry',
};
const STEAM_EVERY = 0.6;
const COUPLE_BUBBLE_OFFSET = { x: 116, y: -104 };

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
  private steamIn = 0;
  private raging = false;

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
    const bubbleBg = tex.image(scene, 0, 0, art.bubble('downLeft')).setScale(1.25 / tex.scale);
    this.bubbleIcon = tex.image(scene, 0, -8, art.icon('menu')).setScale(1.2 / tex.scale);
    // Up and to the right of the couple, tail pointing at them: nowhere near a
    // guest's chair, so it never reads as a guest's request (playtest, day 1).
    this.bubble = scene.add
      .container(x + COUPLE_BUBBLE_OFFSET.x, y + COUPLE_BUBBLE_OFFSET.y, [bubbleBg, this.bubbleIcon])
      .setDepth(Depth.bubbles + 400)
      .setVisible(false);
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
    if (this.raging) return;
    // Nervous couples fidget; happy ones sway gently towards each other.
    const nervous = couple.state === 'stressed' || couple.state === 'meltdown';
    const sway = nervous ? Math.sin(this.t * (couple.state === 'meltdown' ? 34 : 22)) * (couple.state === 'meltdown' ? 2.6 : 1.5) : Math.sin(this.t * 2) * 1.6;
    this.a.setAngle(sway).setY(this.baseY - this.react.hopA);
    this.b.setAngle(-sway).setY(this.baseY - this.react.hopB);
    if (nervous) {
      this.steamIn -= dt;
      if (this.steamIn <= 0) {
        this.steamIn = couple.state === 'meltdown' ? STEAM_EVERY / 2 : STEAM_EVERY * 1.5;
        const { x, y } = this.sim.context.venue.def.couplePos;
        this.fx.puff({ x: x + (Math.random() - 0.5) * 70, y: y - 120 }, couple.state === 'meltdown' ? 2 : 1, 'steam');
      }
    }
    const redden = couple.state === 'meltdown' ? 0.5 + Math.sin(this.t * 8) * 0.5 : 0;
    const tint = redden > 0 ? Phaser.Display.Color.GetColor(255, Math.round(255 - redden * 90), Math.round(255 - redden * 90)) : 0xffffff;
    this.a.setTint(tint);
    this.b.setTint(tint);

    const mood = BAND_MOOD[couple.state];
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

  /**
   * The failure scene: the bride (or whoever wears the dress) grows huge, turns
   * red and stomps, steam everywhere; their partner shrinks back.
   */
  bridezilla(): void {
    this.raging = true;
    this.bubble.setVisible(false);
    this.timer.clear();
    const brideIsA = this.wedding.partnerA.visual.icon === 'dress' || this.wedding.partnerB.visual.icon !== 'dress';
    const [bride, partner] = brideIsA ? [this.a, this.b] : [this.b, this.a];
    const brideDef = brideIsA ? this.wedding.partnerA : this.wedding.partnerB;
    const partnerDef = brideIsA ? this.wedding.partnerB : this.wedding.partnerA;
    const s = COUPLE_SCALE / this.tex.scale;
    bride.setTexture(this.art.partner(brideDef, 'angry')).setTint(0xff9c9c).setDepth(Depth.bubbles + 500);
    partner.setTexture(this.art.partner(partnerDef, 'sad'));
    this.scene.tweens.add({ targets: bride, scale: s * 1.9, duration: 700, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: bride, angle: { from: -8, to: 8 }, yoyo: true, repeat: 7, duration: 90, delay: 700 });
    this.scene.tweens.add({ targets: partner, scale: s * 0.85, x: partner.x + (brideIsA ? 34 : -34), duration: 500, ease: 'Quad.easeOut' });
    const { x, y } = this.sim.context.venue.def.couplePos;
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(200 + i * 220, () => this.fx.puff({ x: bride.x + (Math.random() - 0.5) * 60, y: y - 190 }, 3, 'steam'));
    }
    this.scene.time.delayedCall(700, () => this.fx.puff({ x, y: y + 10 }, 6));
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
