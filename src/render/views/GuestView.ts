import Phaser from 'phaser';
import { hearts } from '../../core/guests/guestMachine';
import type { Guest } from '../../core/sim/state';
import type { ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import { Depth } from '../ui/text';

const HEART_SIZE = 15;
const URGENT_HAPPINESS = 35;

/**
 * One guest on screen. Reads guest state every frame but only touches display
 * objects when something visible changed, keeping per-frame work tiny.
 */
export class GuestView {
  private readonly body: Phaser.GameObjects.Image;
  private readonly heartsRow: Phaser.GameObjects.Image[] = [];
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly bubbleIcon: Phaser.GameObjects.Image;
  private readonly bubbleGroup: Phaser.GameObjects.Container;
  private readonly selection: Phaser.GameObjects.Image;
  private shownHearts = -1;
  private shownWant: string | null | undefined = undefined;
  private urgentTween: Phaser.Tweens.Tween | null = null;
  private lastState: Guest['state'] | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    guest: Guest,
  ) {
    this.selection = tex.image(scene, 0, 0, art.dot(0xffffff, 34, 0xe07a95)).setAlpha(0.9).setVisible(false);
    this.body = tex.image(scene, 0, 0, art.guest(guest)).setOrigin(0.5, 0.95);
    for (let i = 0; i < 5; i++) {
      this.heartsRow.push(tex.image(scene, 0, 0, art.icon('heart', 0xe8506e)).setDisplaySize(HEART_SIZE, HEART_SIZE));
    }
    this.bubble = tex.image(scene, 0, 0, art.bubble());
    this.bubbleIcon = tex.image(scene, 0, -6, art.icon('menu'));
    this.bubbleGroup = scene.add.container(0, 0, [this.bubble, this.bubbleIcon]).setVisible(false);
    this.bubble.setPosition(0, 0);
    this.sync(guest, false);
  }

  setSelected(selected: boolean): void {
    this.selection.setVisible(selected);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  sync(g: Guest, selected: boolean): void {
    const { x, y } = g.pos;
    const depth = Depth.actorsBase + y;
    this.body.setPosition(x, y).setDepth(depth);
    this.selection.setPosition(x, y - 4).setDepth(depth - 1).setVisible(selected);

    const h = hearts(g);
    const hideHearts = g.state === 'LEAVING' || g.state === 'UPSET';
    const rowY = y - 96;
    for (let i = 0; i < 5; i++) {
      const heart = this.heartsRow[i] as Phaser.GameObjects.Image;
      heart.setPosition(x - 2 * HEART_SIZE + i * HEART_SIZE, rowY).setDepth(Depth.bubbles + y).setVisible(!hideHearts);
    }
    if (h !== this.shownHearts) {
      this.shownHearts = h;
      this.heartsRow.forEach((heart, i) =>
        heart.setTexture(i < h ? this.art.icon('heart', 0xe8506e) : this.art.icon('heart-empty')).setDisplaySize(HEART_SIZE, HEART_SIZE),
      );
    }

    const want = this.bubbleContent(g);
    if (want !== this.shownWant) {
      this.shownWant = want;
      this.bubbleGroup.setVisible(want !== null);
      if (want === 'menu') this.bubbleIcon.setTexture(this.art.icon('menu'));
      else if (want) this.bubbleIcon.setTexture(this.art.item(want));
      this.bubbleIcon.setScale(1 / this.tex.scale);
      this.bubble.setScale(1 / this.tex.scale);
    }
    this.bubbleGroup.setPosition(x, y - 138).setDepth(Depth.bubbles + y);

    const urgent = want !== null && g.happiness < URGENT_HAPPINESS;
    if (urgent && !this.urgentTween) {
      this.urgentTween = this.scene.tweens.add({ targets: this.bubbleGroup, scale: 1.18, yoyo: true, repeat: -1, duration: 260 });
    } else if (!urgent && this.urgentTween) {
      this.urgentTween.stop();
      this.urgentTween = null;
      this.bubbleGroup.setScale(1);
    }

    if (g.state !== this.lastState) {
      this.onStateChange(g);
      this.lastState = g.state;
    }
  }

  private onStateChange(g: Guest): void {
    if (g.state === 'UPSET') {
      this.body.setTint(0xff9a9a);
      this.scene.tweens.add({ targets: this.body, x: this.body.x + 5, yoyo: true, repeat: 5, duration: 50 });
    } else if (g.state === 'LEAVING') {
      this.body.setAlpha(0.75);
    } else if (g.state === 'EATING') {
      this.scene.tweens.add({ targets: this.body, scaleY: this.body.scaleY * 0.96, yoyo: true, repeat: 3, duration: 180 });
    }
  }

  private bubbleContent(g: Guest): string | null {
    switch (g.state) {
      case 'READY_TO_ORDER':
        return 'menu';
      case 'WAITING_FOR_FOOD':
      case 'REQUESTING':
        return g.wantsItemId;
      default:
        return null;
    }
  }

  destroy(): void {
    this.urgentTween?.stop();
    this.body.destroy();
    this.selection.destroy();
    for (const h of this.heartsRow) h.destroy();
    this.bubbleGroup.destroy(true);
  }
}
