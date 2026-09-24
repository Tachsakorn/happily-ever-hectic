import Phaser from 'phaser';
import type { Mood } from '../../art/people';
import { hearts } from '../../core/guests/guestMachine';
import type { Guest } from '../../core/sim/state';
import { FEET_ORIGIN_Y, type ArtKit } from '../art/ArtKit';
import type { TextureFactory } from '../art/TextureFactory';
import type { Fx } from '../fx/Fx';
import { Depth } from '../ui/text';

const HEART_SIZE = 15;
const URGENT_HAPPINESS = 35;
const ANGRY_BELOW = 30;
const HAPPY_ABOVE = 72;
const WALK_CADENCE = 13;
const DANCE_NOTE_EVERY = 0.55;
/** Bubble sentinels that are not item ids. */
const WANT_MENU = 'menu';
const WANT_DANCE = '@dance';

/**
 * One guest on screen. Reads guest state every frame but only touches
 * textures when something visible changed; motion (walk bob, breathing, hops,
 * shakes) is a few multiplications per frame.
 */
export class GuestView {
  private readonly body: Phaser.GameObjects.Image;
  private readonly heartsRow: Phaser.GameObjects.Image[] = [];
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly bubbleIcon: Phaser.GameObjects.Image;
  private readonly bubbleGroup: Phaser.GameObjects.Container;
  private readonly selection: Phaser.GameObjects.Image;
  private readonly unit: number;
  /** Tweened reaction offsets, applied on top of the simulated position. */
  private readonly react = { hop: 0, squash: 0, shake: 0, grow: 0 };
  private readonly phase: number;
  private shownHearts = -1;
  private shownWant: string | null | undefined = undefined;
  private shownMood: Mood | null = null;
  private urgentTween: Phaser.Tweens.Tween | null = null;
  private lastState: Guest['state'] | null = null;
  private lastX = NaN;
  private lastY = NaN;
  private walk = 0;
  private t = 0;
  private steamTimer = 0;
  private noteTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly fx: Fx,
    guest: Guest,
  ) {
    this.unit = 1 / tex.scale;
    this.phase = (guest.key.length * 1.7) % (Math.PI * 2);
    this.selection = tex.image(scene, 0, 0, art.dot(0xffffff, 34, 0xe86f8e)).setAlpha(0.9).setVisible(false);
    this.body = tex.image(scene, 0, 0, art.guest(guest)).setOrigin(0.5, FEET_ORIGIN_Y);
    for (let i = 0; i < 5; i++) {
      this.heartsRow.push(tex.image(scene, 0, 0, art.icon('heart', 0xe86f8e)).setDisplaySize(HEART_SIZE, HEART_SIZE));
    }
    this.bubble = tex.image(scene, 0, 0, art.bubble());
    this.bubbleIcon = tex.image(scene, 0, -6, art.icon('menu'));
    this.bubbleGroup = scene.add.container(0, 0, [this.bubble, this.bubbleIcon]).setVisible(false);
    // Arrivals pop in at the door.
    scene.tweens.add({ targets: this.react, grow: 1, duration: 320, ease: 'Back.easeOut' });
    this.sync(guest, false, 0);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  sync(g: Guest, selected: boolean, dt: number): void {
    this.t += dt;
    const { x, y } = g.pos;
    const moving = Number.isFinite(this.lastX) && Math.hypot(x - this.lastX, y - this.lastY) > 0.15;
    const facing = moving && Math.abs(x - this.lastX) > 0.1 ? Math.sign(x - this.lastX) : 0;
    this.lastX = x;
    this.lastY = y;
    this.walk = moving ? this.walk + dt * WALK_CADENCE : 0;

    const depth = Depth.actorsBase + y;
    const bob = moving ? -Math.abs(Math.sin(this.walk)) * 5 : 0;
    const tilt = moving ? Math.sin(this.walk) * 5 : 0;
    const eating = g.state === 'EATING';
    const dancing = g.state === 'DANCING';
    const breathe = moving ? 0 : Math.sin(this.t * (eating ? 11 : 2.4) + this.phase) * (eating ? 0.035 : 0.015);
    const sq = this.react.squash;
    const grow = this.react.grow;
    // Dancing: a bouncy two-step with a sway, flipping sides on the beat.
    const beat = this.t * 7 + this.phase;
    const danceBob = dancing ? -Math.abs(Math.sin(beat)) * 12 : 0;
    const danceTilt = dancing ? Math.sin(beat / 2) * 11 : 0;
    this.body.setScale(this.unit * grow * (1 + sq), this.unit * grow * (1 - sq + breathe + (dancing ? Math.sin(beat * 2) * 0.03 : 0)));
    this.body
      .setPosition(x + this.react.shake, y + bob + danceBob - this.react.hop)
      .setAngle(tilt + danceTilt)
      .setDepth(depth);
    if (facing !== 0) this.body.setFlipX(facing < 0);
    else if (dancing) this.body.setFlipX(Math.sin(beat / 2) < 0);
    if (dancing) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) {
        this.noteTimer = DANCE_NOTE_EVERY;
        this.fx.note({ x: x + (Math.random() - 0.5) * 30, y: y - 110 });
      }
    }
    this.selection.setPosition(x, y - 4).setDepth(depth - 1).setVisible(selected);
    if (selected) this.selection.setScale(this.unit * (1 + Math.sin(this.t * 6) * 0.06));

    const mood = this.moodFor(g);
    if (mood !== this.shownMood) {
      const first = this.shownMood === null;
      this.shownMood = mood;
      this.body.setTexture(this.art.guest(g, mood));
      if (!first) this.pop(mood === 'angry' ? 0.14 : 0.1);
    }

    const h = hearts(g);
    const hideHearts = g.state === 'LEAVING' || g.state === 'UPSET';
    const rowY = y - 100 - this.react.hop;
    for (let i = 0; i < 5; i++) {
      const heart = this.heartsRow[i] as Phaser.GameObjects.Image;
      heart.setPosition(x - 2 * HEART_SIZE + i * HEART_SIZE, rowY).setDepth(Depth.bubbles + y).setVisible(!hideHearts);
    }
    if (h !== this.shownHearts) {
      const lost = this.shownHearts > h ? this.heartsRow[h] : undefined;
      this.shownHearts = h;
      this.heartsRow.forEach((heart, i) =>
        heart.setTexture(i < h ? this.art.icon('heart', 0xe86f8e) : this.art.icon('heart-empty')).setDisplaySize(HEART_SIZE, HEART_SIZE),
      );
      if (lost) this.scene.tweens.add({ targets: lost, displayWidth: HEART_SIZE * 1.8, displayHeight: HEART_SIZE * 1.8, yoyo: true, duration: 140 });
    }

    const want = this.bubbleContent(g);
    if (want !== this.shownWant) {
      this.shownWant = want;
      this.bubbleGroup.setVisible(want !== null);
      if (want === WANT_MENU) this.bubbleIcon.setTexture(this.art.icon('menu'));
      else if (want === WANT_DANCE) this.bubbleIcon.setTexture(this.art.uiIcon('music', 0xb49be0));
      else if (want) this.bubbleIcon.setTexture(this.art.item(want));
      this.bubbleIcon.setScale(this.unit * (want === WANT_DANCE ? 0.85 : 1));
      this.bubble.setScale(this.unit);
      if (want !== null) {
        this.stopUrgent();
        this.scene.tweens.killTweensOf(this.bubbleGroup);
        this.bubbleGroup.setScale(0).setAngle(0);
        this.scene.tweens.add({ targets: this.bubbleGroup, scale: 1, duration: 300, ease: 'Back.easeOut' });
      }
    }
    this.bubbleGroup.setPosition(x, y - 140 - this.react.hop).setDepth(Depth.bubbles + y);

    const urgent = want !== null && g.happiness < URGENT_HAPPINESS;
    if (urgent && !this.urgentTween) {
      this.urgentTween = this.scene.tweens.add({ targets: this.bubbleGroup, angle: { from: -9, to: 9 }, scale: 1.12, yoyo: true, repeat: -1, duration: 220, ease: 'Sine.easeInOut' });
    } else if (!urgent && this.urgentTween) {
      this.stopUrgent();
      this.bubbleGroup.setScale(1).setAngle(0);
    }

    if (g.state === 'UPSET') {
      this.steamTimer -= dt;
      if (this.steamTimer <= 0) {
        this.steamTimer = 0.7;
        this.fx.puff({ x: x + 8, y: y - 98 }, 2, 'steam');
      }
    }

    if (g.state !== this.lastState) {
      this.onStateChange(g, this.lastState);
      this.lastState = g.state;
    }
  }

  private moodFor(g: Guest): Mood {
    if (g.state === 'UPSET') return 'angry';
    if (g.state === 'LEAVING') return g.happiness < ANGRY_BELOW ? 'sad' : 'happy';
    if (g.state === 'EATING' || g.state === 'SATISFIED' || g.state === 'DANCING' || g.state === 'WANTS_TO_DANCE') return 'happy';
    if (g.happiness < ANGRY_BELOW) return 'angry';
    if (g.happiness > HAPPY_ABOVE) return 'happy';
    return 'neutral';
  }

  private pop(amount: number): void {
    this.react.squash = amount;
    this.scene.tweens.add({ targets: this.react, squash: 0, duration: 380, ease: 'Elastic.easeOut', easeParams: [1.2, 0.4] });
  }

  private hop(height = 16): void {
    this.scene.tweens.add({ targets: this.react, hop: height, yoyo: true, duration: 150, ease: 'Quad.easeOut' });
  }

  private onStateChange(g: Guest, from: Guest['state'] | null): void {
    if (from === null) return;
    switch (g.state) {
      case 'SEATED':
        this.hop(14);
        this.fx.puff({ x: g.pos.x, y: g.pos.y + 4 }, 3);
        break;
      case 'EATING':
        this.hop(10);
        break;
      case 'UPSET':
        this.scene.tweens.add({ targets: this.react, shake: { from: -6, to: 6 }, yoyo: true, repeat: 5, duration: 50, onComplete: () => (this.react.shake = 0) });
        break;
      case 'LEAVING':
        if (g.happiness >= ANGRY_BELOW) this.fx.hearts({ x: g.pos.x, y: g.pos.y - 90 }, g.happyExit ? 5 : 3, 24);
        break;
      case 'DANCING':
        this.hop(18);
        this.fx.sparkles({ x: g.pos.x, y: g.pos.y - 60 }, 6, 40, 0xb49be0);
        break;
      default:
        break;
    }
  }

  private stopUrgent(): void {
    this.urgentTween?.stop();
    this.urgentTween = null;
  }

  private bubbleContent(g: Guest): string | null {
    switch (g.state) {
      case 'READY_TO_ORDER':
        return WANT_MENU;
      case 'WANTS_TO_DANCE':
        return WANT_DANCE;
      case 'WAITING_FOR_FOOD':
      case 'REQUESTING':
        return g.wantsItemId;
      default:
        return null;
    }
  }

  destroy(): void {
    this.stopUrgent();
    this.scene.tweens.killTweensOf([this.react, this.body, this.bubbleGroup, ...this.heartsRow]);
    this.body.destroy();
    this.selection.destroy();
    for (const h of this.heartsRow) h.destroy();
    this.bubbleGroup.destroy(true);
  }
}
