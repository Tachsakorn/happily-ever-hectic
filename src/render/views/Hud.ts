import Phaser from 'phaser';
import type { LevelDef, WeddingDef } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { ArtKit } from '../art/ArtKit';
import { paintPanel } from '../art/painters';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

const MOOD_BAR = { x: 96, y: 52, w: 300, h: 22 };
const SCORE_BAR = { x: 1004, y: 66, w: 262, h: 10 };
const TICKER_LINES = 2;
const BANNER = { x: 700, y: 948 };

/**
 * Heads-up display: couple mood (with the latest reasons it changed), time
 * left, score and star targets. Redraws only on change.
 */
export class Hud {
  private readonly moodBar: Phaser.GameObjects.Graphics;
  private readonly scoreBar: Phaser.GameObjects.Graphics;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly heart: Phaser.GameObjects.Image;
  private readonly ticker: Phaser.GameObjects.Text[] = [];
  private readonly tickerLines: { cause: string; amount: number; text: string; color: string }[] = [];
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private shownMood = -1;
  private shownScore = -1;
  private shownSeconds = -1;
  private heartbeat: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
    private readonly level: LevelDef,
    wedding: WeddingDef,
  ) {
    const d = Depth.hud;
    tex.image(scene, 16 + 230, 58, tex.ensure('panel:mood', 460, 116, paintPanel(460, 116))).setDepth(d);
    // Right panel stops short of the corner: the DOM pause button lives there.
    tex.image(scene, 1136, 58, tex.ensure('panel:score', 316, 116, paintPanel(316, 116))).setDepth(d);
    this.heart = tex.image(scene, 62, 62, art.icon('heart', 0xe8506e)).setScale(1.3 / tex.scale).setDepth(d + 2);
    makeText(scene, MOOD_BAR.x, 22, `${wedding.partnerA.name} & ${wedding.partnerB.name}`, renderScale, { size: 18, align: 'left' })
      .setOrigin(0, 0)
      .setDepth(d + 1);
    this.moodBar = scene.add.graphics().setDepth(d + 1);
    this.scoreBar = scene.add.graphics().setDepth(d + 1);
    this.timeText = makeText(scene, 1000, 38, '', renderScale, { size: 30, weight: '800', align: 'left' }).setOrigin(0, 0.5).setDepth(d + 1);
    this.scoreText = makeText(scene, 1272, 38, '', renderScale, { size: 26, weight: '800', align: 'right', color: Colors.goldCss })
      .setOrigin(1, 0.5)
      .setDepth(d + 1);
    for (let i = 0; i < 3; i++) {
      const x = SCORE_BAR.x + (level.starScores[i]! / level.starScores[2]) * SCORE_BAR.w;
      this.stars.push(tex.image(scene, Math.min(x, SCORE_BAR.x + SCORE_BAR.w), SCORE_BAR.y + 5, art.icon('star-empty')).setScale(0.6 / tex.scale).setDepth(d + 2));
    }
    for (let i = 0; i < TICKER_LINES; i++) {
      this.ticker.push(
        makeText(scene, 30, 124 + i * 26, '', renderScale, { size: 18, align: 'left', stroke: '#fffaf6', strokeWidth: 5 })
          .setOrigin(0, 0.5)
          .setDepth(d),
      );
    }
    this.sync();
  }

  /** Called for every mood change so the player always sees the latest reasons. */
  pushCause(delta: number, cause: string): void {
    // Repeated causes (a disaster draining every second) accumulate on one line.
    const top = this.tickerLines[0];
    const total = top && top.cause === cause ? top.amount + delta : delta;
    if (top && top.cause === cause) this.tickerLines.shift();
    const rounded = Math.round(total);
    if (rounded === 0) return;
    this.tickerLines.unshift({
      cause,
      amount: total,
      text: `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} ${cause}`,
      color: rounded > 0 ? Colors.goodCss : Colors.badCss,
    });
    this.tickerLines.length = Math.min(this.tickerLines.length, TICKER_LINES);
    this.ticker.forEach((t, i) => {
      const line = this.tickerLines[i];
      t.setText(line?.text ?? '').setColor(line?.color ?? Colors.inkCss).setAlpha(i === 0 ? 1 : 0.6);
    });
    if (delta <= -1) this.scene.tweens.add({ targets: this.heart, angle: { from: -12, to: 0 }, duration: 260, ease: 'Back.easeOut' });
  }

  sync(): void {
    const s = this.sim.state;
    const mood = Math.round(s.couple.mood * 2) / 2;
    if (mood !== this.shownMood) {
      this.shownMood = mood;
      const color = mood > 60 ? Colors.good : mood > 30 ? Colors.warn : Colors.bad;
      this.moodBar.clear();
      this.moodBar.fillStyle(0x4a3548, 0.12).fillRoundedRect(MOOD_BAR.x, MOOD_BAR.y, MOOD_BAR.w, MOOD_BAR.h, 11);
      this.moodBar.fillStyle(color, 1).fillRoundedRect(MOOD_BAR.x, MOOD_BAR.y, Math.max(22, (MOOD_BAR.w * mood) / 100), MOOD_BAR.h, 11);
      const danger = mood <= 30;
      if (danger && !this.heartbeat) {
        this.heartbeat = this.scene.tweens.add({ targets: this.heart, scale: 1.55 / this.tex.scale, yoyo: true, repeat: -1, duration: 300 });
      } else if (!danger && this.heartbeat) {
        this.heartbeat.stop();
        this.heartbeat = null;
        this.heart.setScale(1.3 / this.tex.scale);
      }
    }

    const secondsLeft = Math.max(0, Math.ceil(s.duration - s.time));
    if (secondsLeft !== this.shownSeconds) {
      this.shownSeconds = secondsLeft;
      const m = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      this.timeText.setText(`${m}:${String(sec).padStart(2, '0')}`).setColor(secondsLeft <= 20 ? Colors.badCss : Colors.inkCss);
    }

    if (s.score !== this.shownScore) {
      this.shownScore = s.score;
      this.scoreText.setText(s.score.toLocaleString('en-US'));
      const max = this.level.starScores[2];
      this.scoreBar.clear();
      this.scoreBar.fillStyle(0x4a3548, 0.12).fillRoundedRect(SCORE_BAR.x, SCORE_BAR.y, SCORE_BAR.w, SCORE_BAR.h, 5);
      this.scoreBar.fillStyle(Colors.gold, 1).fillRoundedRect(SCORE_BAR.x, SCORE_BAR.y, Math.max(10, Math.min(1, s.score / max) * SCORE_BAR.w), SCORE_BAR.h, 5);
      this.stars.forEach((star, i) => {
        const earned = s.score >= this.level.starScores[i]!;
        star.setTexture(earned ? this.art.icon('star', 0xf3c34b) : this.art.icon('star-empty')).setScale(0.6 / this.tex.scale);
      });
    }
  }

  destroy(): void {
    this.heartbeat?.stop();
  }
}

/** Centre-top announcements: wedding moments, disaster hints, tutorial tips. Queued, one at a time. */
export class Banner {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly queue: { message: string; color: string; seconds: number }[] = [];
  private busyUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    tex: TextureFactory,
    renderScale: number,
  ) {
    // Bottom centre, over the aisle: it never hides the couple, the HUD or a table.
    this.bg = tex.image(scene, BANNER.x, BANNER.y, tex.ensure('panel:banner', 760, 104, paintPanel(760, 104, 0xfff6ee, 0.97))).setDepth(Depth.banner).setAlpha(0);
    this.text = makeText(scene, BANNER.x, BANNER.y - 5, '', renderScale, { size: 20, wrapWidth: 690 }).setOrigin(0.5).setDepth(Depth.banner + 1).setAlpha(0);
  }

  show(message: string, color: string = Colors.inkCss, seconds = 4, urgent = false): void {
    if (urgent) this.queue.unshift({ message, color, seconds });
    else this.queue.push({ message, color, seconds });
    if (this.queue.length > 4) this.queue.length = 4;
  }

  update(now: number): void {
    if (now < this.busyUntil) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busyUntil = now + next.seconds * 1000;
    this.text.setText(next.message).setColor(next.color);
    this.scene.tweens.killTweensOf([this.bg, this.text]);
    this.bg.setAlpha(0).setY(BANNER.y + 18);
    this.text.setAlpha(0).setY(BANNER.y + 13);
    this.scene.tweens.add({ targets: [this.bg, this.text], alpha: 1, y: '-=18', duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: [this.bg, this.text], alpha: 0, delay: next.seconds * 1000 - 300, duration: 280 });
  }
}
