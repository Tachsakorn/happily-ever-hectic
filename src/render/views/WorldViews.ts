import Phaser from 'phaser';
import { GIFT_ITEM_ID } from '../../content/contracts';
import type { WeddingDef } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import { DisasterPhase } from '../../core/sim/state';
import type { ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth } from '../ui/text';

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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    wedding: WeddingDef,
  ) {
    const { x, y } = sim.context.venue.def.couplePos;
    this.a = tex.image(scene, x - 38, y + 8, art.partner(wedding.partnerA.visual, wedding.partnerA.id)).setOrigin(0.5, 0.95).setScale(1.2 / tex.scale).setDepth(Depth.actorsBase + y - 40);
    this.b = tex.image(scene, x + 38, y + 8, art.partner(wedding.partnerB.visual, wedding.partnerB.id)).setOrigin(0.5, 0.95).setScale(1.2 / tex.scale).setDepth(Depth.actorsBase + y - 40);
    const bubbleBg = tex.image(scene, 0, 0, art.bubble()).setScale(1.25 / tex.scale);
    this.bubbleIcon = tex.image(scene, 0, -8, art.icon('menu')).setScale(1.2 / tex.scale);
    // Beside the couple (left), clear of the HUD row above.
    this.bubble = scene.add.container(x - 150, y + 2, [bubbleBg, this.bubbleIcon]).setDepth(Depth.bubbles + 400).setVisible(false);
    this.timer = scene.add.graphics().setDepth(Depth.bubbles + 401);
  }

  sync(dt: number): void {
    const { couple } = this.sim.state;
    this.t += dt;
    // Nervous couples fidget; happy ones sway gently.
    const nervous = couple.mood < 35;
    const sway = nervous ? Math.sin(this.t * 22) * 1.5 : Math.sin(this.t * 2) * 1.2;
    this.a.setAngle(sway);
    this.b.setAngle(-sway);

    const req = couple.request;
    const item = req?.itemId ?? null;
    if (item !== this.shownItem) {
      this.shownItem = item;
      this.bubble.setVisible(!!item);
      if (item) this.bubbleIcon.setTexture(this.art.item(item)).setScale(1.2 / this.tex.scale);
      this.pulse?.stop();
      this.pulse = null;
      this.bubble.setScale(1);
      if (item && req?.momentId) {
        this.pulse = this.scene.tweens.add({ targets: this.bubble, scale: 1.15, yoyo: true, repeat: -1, duration: 380 });
      }
    }
    this.timer.clear();
    if (req) {
      const t = Math.max(0, req.timeLeft / req.total);
      const color = t > 0.5 ? Colors.good : t > 0.25 ? Colors.warn : Colors.bad;
      this.timer.lineStyle(6, color, 1);
      this.timer.beginPath();
      this.timer.arc(this.bubble.x + 38, this.bubble.y - 30, 12, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      this.timer.strokePath();
    }
  }

  destroy(): void {
    this.pulse?.stop();
    this.a.destroy();
    this.b.destroy();
    this.bubble.destroy(true);
    this.timer.destroy();
  }
}

/** Food on the pass, cooking progress, drinks, desserts, the cake and gifts. */
export class PropsView {
  private readonly passImages: Phaser.GameObjects.Image[];
  private readonly cooking: Phaser.GameObjects.Graphics;
  private readonly cake: Phaser.GameObjects.Image;
  private readonly giftImages = new Map<number, Phaser.GameObjects.Image>();
  private readonly giftPile: Phaser.GameObjects.Image[] = [];
  private shownPass = '';
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
    this.passImages = venue.passSlots.map((p) => tex.image(scene, p.x, p.y, art.icon('plate')).setDepth(Depth.props).setVisible(false));
    this.cooking = scene.add.graphics().setDepth(Depth.props);

    for (const s of venue.stations) {
      if ((s.kind === 'drinkTap' || s.kind === 'dessertTable') && s.providesItemId) {
        const count = s.kind === 'dessertTable' ? 3 : 1;
        for (let i = 0; i < count; i++) {
          tex.image(scene, s.pos.x + (i - (count - 1) / 2) * 32, s.pos.y - 4, art.item(s.providesItemId)).setScale(1.1 / tex.scale).setDepth(Depth.props);
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
    const passKey = state.kitchen.pass.join('|');
    if (passKey !== this.shownPass) {
      this.shownPass = passKey;
      state.kitchen.pass.forEach((itemId, i) => {
        const img = this.passImages[i];
        if (!img) return;
        img.setVisible(!!itemId);
        if (itemId) {
          img.setTexture(this.art.item(itemId)).setScale(1.2 / this.tex.scale);
          this.scene.tweens.add({ targets: img, scale: { from: 1.8 / this.tex.scale, to: 1.2 / this.tex.scale }, duration: 220, ease: 'Back.easeOut' });
        }
      });
    }

    // Cooking progress bars next to the kitchen window.
    this.cooking.clear();
    let row = 0;
    for (const o of state.kitchen.orders) {
      if (o.cookLeft === null) continue;
      const t = o.cookTotal > 0 ? 1 - o.cookLeft / o.cookTotal : 1;
      const x = 1352;
      const y = 340 + row * 26;
      this.cooking.fillStyle(0xffffff, 0.9).fillRoundedRect(x, y, 42, 14, 6);
      this.cooking.fillStyle(t >= 1 ? Colors.warn : 0xf08a4b, 1).fillRoundedRect(x + 2, y + 2, 38 * Math.min(1, t), 10, 5);
      row++;
    }
    const queued = state.kitchen.orders.length - row;
    for (let i = 0; i < queued && i < 6; i++) this.cooking.fillStyle(Colors.ink, 0.35).fillCircle(1358 + i * 8, 340 + row * 26 + 8, 3);

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
      }
      const danger = gift.age / lostAfter;
      img.setScale((danger > 0.7 ? 0.95 + Math.sin(time / 110) * 0.12 : 0.9) / this.tex.scale);
      img.setTint(danger > 0.7 ? 0xffb0b0 : 0xffffff);
    }
    for (const [id, img] of this.giftImages) {
      if (!seen.has(id)) {
        img.destroy();
        this.giftImages.delete(id);
      }
    }
    this.giftPile.forEach((g, i) => g.setVisible(i < state.stats.giftsDelivered));
  }

  destroy(): void {
    for (const img of this.passImages) img.destroy();
    for (const img of this.giftImages.values()) img.destroy();
    for (const img of this.giftPile) img.destroy();
    this.cooking.destroy();
    this.cake.destroy();
  }
}
