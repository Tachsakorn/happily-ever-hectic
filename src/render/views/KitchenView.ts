import Phaser from 'phaser';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { ArtKit } from '../art/ArtKit';
import { paintPanel } from '../art/painters';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

const MAX_TICKETS = 6;
const TICKET = { w: 108, h: 54, gap: 58 };

interface Ticket {
  bg: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/**
 * The kitchen made readable: a chef, one ticket per order you took (cooking,
 * waiting for a burner, or stuck because the pass is full), and finished
 * dishes on the pass. Food only exists because you took an order — the
 * tickets make that cause and effect visible (playtest feedback, day 1).
 */
export class KitchenView {
  private readonly chef: Phaser.GameObjects.Image;
  private readonly passImages: Phaser.GameObjects.Image[];
  private readonly tickets: Ticket[] = [];
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly origin: { x: number; y: number };
  private shownPass = '';
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
  ) {
    const venue = sim.context.venue.def;
    const kitchen = venue.stations.find((s) => s.kind === 'kitchenPass');
    const kx = kitchen?.pos.x ?? 0;
    const topSlot = Math.min(...venue.passSlots.map((p) => p.y));
    this.chef = tex.image(scene, kx + 56, topSlot + 60, art.chef()).setOrigin(0.5, 0.95).setDepth(Depth.props + 2).setFlipX(true);
    this.origin = { x: kx + 56 + 30 + TICKET.w / 2, y: topSlot - 10 };

    this.passImages = venue.passSlots.map((p) => tex.image(scene, p.x, p.y, art.icon('plate')).setDepth(Depth.props + 3).setVisible(false));

    const bgKey = tex.ensure('panel:ticket', TICKET.w + 16, TICKET.h + 16, paintPanel(TICKET.w + 16, TICKET.h + 16, 0xfffdf6, 1));
    for (let i = 0; i < MAX_TICKETS; i++) {
      const y = this.origin.y + i * TICKET.gap;
      this.tickets.push({
        bg: tex.image(scene, this.origin.x, y, bgKey).setDepth(Depth.props + 4).setVisible(false),
        icon: tex.image(scene, this.origin.x - 30, y - 2, art.icon('plate')).setScale(0.85 / tex.scale).setDepth(Depth.props + 5).setVisible(false),
        label: makeText(scene, this.origin.x + 2, y - 10, '', renderScale, { size: 13, align: 'left' })
          .setOrigin(0, 0.5)
          .setDepth(Depth.props + 5)
          .setVisible(false),
      });
    }
    this.bars = scene.add.graphics().setDepth(Depth.props + 5);
  }

  sync(dt: number): void {
    const { kitchen } = this.sim.state;
    this.t += dt;
    const busy = kitchen.orders.some((o) => o.cookLeft !== null && o.cookLeft > 0);
    this.chef.setAngle(busy ? Math.sin(this.t * 14) * 4 : 0);

    const passKey = kitchen.pass.join('|');
    if (passKey !== this.shownPass) {
      this.shownPass = passKey;
      kitchen.pass.forEach((itemId, i) => {
        const img = this.passImages[i];
        if (!img) return;
        img.setVisible(!!itemId);
        if (itemId) {
          img.setTexture(this.art.item(itemId));
          this.scene.tweens.add({ targets: img, scale: { from: 1.8 / this.tex.scale, to: 1.25 / this.tex.scale }, duration: 220, ease: 'Back.easeOut' });
        }
      });
    }

    this.bars.clear();
    const passFull = !kitchen.pass.includes(null);
    this.tickets.forEach((ticket, i) => {
      const order = kitchen.orders[i];
      const visible = !!order;
      ticket.bg.setVisible(visible);
      ticket.icon.setVisible(visible);
      ticket.label.setVisible(visible);
      if (!order) return;
      ticket.icon.setTexture(this.art.item(order.itemId)).setScale(0.85 / this.tex.scale);
      const x = this.origin.x + 2;
      const y = this.origin.y + i * TICKET.gap + 10;
      if (order.cookLeft === null) {
        ticket.label.setText('Waiting').setColor('#8a7688');
        ticket.bg.setAlpha(0.75);
        return;
      }
      ticket.bg.setAlpha(1);
      const done = order.cookLeft <= 0;
      ticket.label.setText(done && passFull ? 'Pass full!' : 'Cooking').setColor(done && passFull ? Colors.badCss : Colors.inkCss);
      const progress = order.cookTotal > 0 ? 1 - order.cookLeft / order.cookTotal : 1;
      this.bars.fillStyle(0x4a3548, 0.12).fillRoundedRect(x, y - 4, 40, 9, 4);
      this.bars.fillStyle(done ? Colors.warn : 0xf08a4b, 1).fillRoundedRect(x, y - 4, Math.max(6, 40 * Math.min(1, progress)), 9, 4);
    });
  }

  destroy(): void {
    this.chef.destroy();
    for (const img of this.passImages) img.destroy();
    for (const t of this.tickets) {
      t.bg.destroy();
      t.icon.destroy();
      t.label.destroy();
    }
    this.bars.destroy();
  }
}
