import Phaser from 'phaser';
import type { LevelDef, WeddingDef } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { ArtKit } from '../art/ArtKit';
import { paintPanel, paintUiIcon } from '../../art/painters';
import type { Fx } from '../fx/Fx';
import type { TextureFactory } from '../art/TextureFactory';
import { Colors, Depth, makeText } from '../ui/text';

const MOOD_BAR = { x: 112, y: 50, w: 330, h: 26 };
const SCORE_BAR = { x: 1004, y: 76, w: 262, h: 14 };
const SCORE_POS = { x: 1150, y: 38 };
const TICKER_LINES = 2;
/** Bottom, right of the gift table by the entrance and left of the kitchen. */
const BANNER = { x: 770, y: 948, w: 700 };
const MOOD_OK = 60;
const MOOD_DANGER = 30;

/**
 * Heads-up display: couple mood (with the latest reasons it changed), time
 * left, score and star targets. Redraws only on change; the score counts up
 * smoothly so gains are felt, not just read.
 */
export class Hud {
  private readonly moodBar: Phaser.GameObjects.Graphics;
  private readonly scoreBar: Phaser.GameObjects.Graphics;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly moodText: Phaser.GameObjects.Text;
  private readonly heart: Phaser.GameObjects.Image;
  private readonly clock: Phaser.GameObjects.Image;
  private readonly coin: Phaser.GameObjects.Image;
  private readonly ticker: Phaser.GameObjects.Text[] = [];
  private readonly tickerLines: { cause: string; amount: number; text: string; color: string }[] = [];
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly earned: boolean[] = [false, false, false];
  private shownMood = -1;
  private shownScore = -1;
  private displayScore = 0;
  private shownSeconds = -1;
  private heartbeat: Phaser.Tweens.Tween | null = null;
  private clockShake: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtKit,
    private readonly tex: TextureFactory,
    private readonly sim: ReceptionSimulation,
    renderScale: number,
    private readonly level: LevelDef,
    wedding: WeddingDef,
    private readonly fx: Fx,
  ) {
    const d = Depth.hud;
    tex.image(scene, 16 + 230, 58, tex.ensure('panel:mood', 460, 116, paintPanel(460, 116))).setDepth(d);
    // Right panel stops short of the corner: the DOM pause button lives there.
    tex.image(scene, 1136, 58, tex.ensure('panel:score', 316, 116, paintPanel(316, 116))).setDepth(d);
    this.heart = tex.image(scene, 62, 60, art.icon('heart', 0xe86f8e)).setScale(1.55 / tex.scale).setDepth(d + 2);
    this.moodText = makeText(scene, 62, 58, '', renderScale, { size: 20, display: true, color: '#ffffff', stroke: '#3b2640', strokeWidth: 5 })
      .setOrigin(0.5)
      .setDepth(d + 3);
    makeText(scene, MOOD_BAR.x, 30, `${wedding.partnerA.name} & ${wedding.partnerB.name}`, renderScale, { size: 20, display: true, align: 'left' })
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    this.moodBar = scene.add.graphics().setDepth(d + 1);
    this.scoreBar = scene.add.graphics().setDepth(d + 1);
    this.clock = tex.image(scene, 1018, 38, tex.ensure('ui:clock', 48, 48, paintUiIcon('clock'))).setScale(0.8 / tex.scale).setDepth(d + 1);
    this.timeText = makeText(scene, 1042, 38, '', renderScale, { size: 30, display: true, align: 'left' }).setOrigin(0, 0.5).setDepth(d + 1);
    this.coin = tex.image(scene, SCORE_POS.x - 20, SCORE_POS.y, art.icon('coin', 0xf2b84b)).setScale(0.78 / tex.scale).setDepth(d + 1);
    this.scoreText = makeText(scene, 1272, SCORE_POS.y, '', renderScale, { size: 28, display: true, align: 'right', color: '#c98a22', stroke: '#fffaf0', strokeWidth: 4 })
      .setOrigin(1, 0.5)
      .setDepth(d + 1);
    for (let i = 0; i < 3; i++) {
      const x = SCORE_BAR.x + (level.starScores[i]! / level.starScores[2]) * SCORE_BAR.w;
      this.stars.push(
        tex
          .image(scene, Math.min(x, SCORE_BAR.x + SCORE_BAR.w - 4), SCORE_BAR.y + SCORE_BAR.h / 2, art.icon('star-empty'))
          .setScale(0.7 / tex.scale)
          .setDepth(d + 2),
      );
    }
    for (let i = 0; i < TICKER_LINES; i++) {
      this.ticker.push(
        makeText(scene, 30, 128 + i * 26, '', renderScale, { size: 18, weight: '800', align: 'left', stroke: '#fffaf0', strokeWidth: 6 })
          .setOrigin(0, 0.5)
          .setDepth(d),
      );
    }
    this.sync(0);
  }

  /** Where coins fly to when points are earned. */
  get scoreAnchor(): { x: number; y: number } {
    return { x: this.coin.x, y: this.coin.y };
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
    const first = this.ticker[0];
    if (first) {
      this.scene.tweens.killTweensOf(first);
      first.setX(18);
      this.scene.tweens.add({ targets: first, x: 30, duration: 200, ease: 'Back.easeOut' });
    }
    if (delta <= -1) this.scene.tweens.add({ targets: this.heart, angle: { from: -14, to: 0 }, duration: 300, ease: 'Back.easeOut' });
    else if (delta >= 1) {
      this.scene.tweens.add({ targets: this.heart, scale: { from: 1.9 / this.tex.scale, to: 1.55 / this.tex.scale }, duration: 320, ease: 'Back.easeOut' });
      this.fx.hearts({ x: this.heart.x, y: this.heart.y - 10 }, 2, 20);
    }
  }

  sync(dt: number): void {
    const s = this.sim.state;
    const mood = Math.round(s.couple.mood * 2) / 2;
    if (mood !== this.shownMood) {
      this.shownMood = mood;
      this.drawMood(mood);
      this.moodText.setText(String(Math.round(mood)));
      const danger = mood <= MOOD_DANGER;
      if (danger && !this.heartbeat) {
        this.heartbeat = this.scene.tweens.add({ targets: [this.heart], scale: 1.85 / this.tex.scale, yoyo: true, repeat: -1, duration: 300 });
      } else if (!danger && this.heartbeat) {
        this.heartbeat.stop();
        this.heartbeat = null;
        this.heart.setScale(1.55 / this.tex.scale);
      }
    }

    const secondsLeft = Math.max(0, Math.ceil(s.duration - s.time));
    if (secondsLeft !== this.shownSeconds) {
      this.shownSeconds = secondsLeft;
      const m = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      const hurry = secondsLeft <= 20;
      this.timeText.setText(`${m}:${String(sec).padStart(2, '0')}`).setColor(hurry ? Colors.badCss : Colors.inkCss);
      if (hurry && secondsLeft > 0) {
        this.clockShake?.stop();
        this.clockShake = this.scene.tweens.add({ targets: this.clock, angle: { from: -16, to: 0 }, duration: 260, ease: 'Back.easeOut' });
      }
    }

    if (s.score !== this.shownScore) {
      this.shownScore = s.score;
      this.drawScoreBar(s.score);
    }
    // Count up towards the real score rather than jumping.
    if (Math.round(this.displayScore) !== s.score) {
      const step = (s.score - this.displayScore) * Math.min(1, dt * 8);
      this.displayScore = Math.abs(step) < 0.5 ? s.score : this.displayScore + step;
      this.scoreText.setText(Math.round(this.displayScore).toLocaleString('en-US'));
    } else if (this.scoreText.text === '') {
      this.scoreText.setText('0');
    }
  }

  private drawMood(mood: number): void {
    const color = mood > MOOD_OK ? 0x7fb08a : mood > MOOD_DANGER ? 0xf2b84b : 0xe0584f;
    const b = MOOD_BAR;
    const g = this.moodBar;
    g.clear();
    g.fillStyle(0xecdcc6, 1).fillRoundedRect(b.x, b.y, b.w, b.h, b.h / 2);
    const w = Math.max(b.h, (b.w * mood) / 100);
    g.fillStyle(color, 1).fillRoundedRect(b.x, b.y, w, b.h, b.h / 2);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(b.x + 8, b.y + 4, Math.max(0, w - 16), 6, 3);
    g.lineStyle(2, 0x3b2640, 0.25);
    for (const t of [MOOD_DANGER, MOOD_OK]) g.lineBetween(b.x + (b.w * t) / 100, b.y + 5, b.x + (b.w * t) / 100, b.y + b.h - 5);
    g.lineStyle(3, 0x3b2640, 1).strokeRoundedRect(b.x, b.y, b.w, b.h, b.h / 2);
  }

  private drawScoreBar(score: number): void {
    const b = SCORE_BAR;
    const max = this.level.starScores[2];
    const g = this.scoreBar;
    g.clear();
    g.fillStyle(0xecdcc6, 1).fillRoundedRect(b.x, b.y, b.w, b.h, b.h / 2);
    g.fillStyle(0xf2b84b, 1).fillRoundedRect(b.x, b.y, Math.max(b.h, Math.min(1, score / max) * b.w), b.h, b.h / 2);
    g.lineStyle(2.5, 0x3b2640, 1).strokeRoundedRect(b.x, b.y, b.w, b.h, b.h / 2);
    this.stars.forEach((star, i) => {
      const earned = score >= this.level.starScores[i]!;
      if (earned === this.earned[i]) return;
      this.earned[i] = earned;
      star.setTexture(earned ? this.art.icon('star', 0xf2b84b) : this.art.icon('star-empty'));
      if (earned) {
        this.scene.tweens.add({ targets: star, scale: { from: 1.8 / this.tex.scale, to: 0.8 / this.tex.scale }, angle: { from: -60, to: 0 }, duration: 420, ease: 'Back.easeOut' });
        this.fx.sparkles({ x: star.x, y: star.y }, 8, 36, 0xfff1c4);
      } else star.setScale(0.7 / this.tex.scale);
    });
  }

  destroy(): void {
    this.heartbeat?.stop();
    this.clockShake?.stop();
  }
}

export type BannerTone = 'info' | 'moment' | 'good' | 'bad' | 'secret';

const TONE_COLOR: Record<BannerTone, string> = { info: Colors.inkCss, moment: '#b4466a', good: Colors.goodCss, bad: Colors.badCss, secret: '#7a5bb5' };

/** Bottom announcements: wedding moments, disaster hints, tutorial tips. Queued, one at a time. */
export class Banner {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Image;
  private readonly badgeKeys: Record<Exclude<BannerTone, 'info'>, string>;
  private readonly queue: { message: string; tone: BannerTone; seconds: number }[] = [];
  private busyUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tex: TextureFactory,
    art: ArtKit,
    renderScale: number,
  ) {
    // Bottom, over the aisle: it never hides the couple, the HUD, a table or the gift table.
    this.bg = tex.image(scene, BANNER.x, BANNER.y, tex.ensure(`panel:banner:${BANNER.w}`, BANNER.w, 104, paintPanel(BANNER.w, 104, 0xfffaf0, 0.98))).setDepth(Depth.banner).setAlpha(0);
    this.text = makeText(scene, BANNER.x, BANNER.y - 5, '', renderScale, { size: 21, weight: '800', wrapWidth: BANNER.w - 150 }).setOrigin(0.5).setDepth(Depth.banner + 1).setAlpha(0);
    this.badgeKeys = {
      moment: tex.ensure('ui:heart-rose', 48, 48, paintUiIcon('heart', 0xe86f8e)),
      bad: tex.ensure('ui:warning', 48, 48, paintUiIcon('warning')),
      good: art.icon('star', 0xf2b84b),
      secret: tex.ensure('ui:sparkle-lilac', 48, 48, paintUiIcon('sparkle', 0xb49be0)),
    };
    this.badge = tex.image(scene, BANNER.x - BANNER.w / 2 + 62, BANNER.y - 5, this.badgeKeys.moment).setDepth(Depth.banner + 1).setAlpha(0);
  }

  show(message: string, tone: BannerTone = 'info', seconds = 4, urgent = false): void {
    if (urgent) this.queue.unshift({ message, tone, seconds });
    else this.queue.push({ message, tone, seconds });
    if (this.queue.length > 4) this.queue.length = 4;
  }

  update(now: number): void {
    if (now < this.busyUntil) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busyUntil = now + next.seconds * 1000;
    const hasBadge = next.tone !== 'info';
    this.text.setText(next.message).setColor(TONE_COLOR[next.tone]).setX(BANNER.x + (hasBadge ? 26 : 0));
    if (next.tone !== 'info') this.badge.setTexture(this.badgeKeys[next.tone]).setScale(1 / this.tex.scale);
    const targets = hasBadge ? [this.bg, this.text, this.badge] : [this.bg, this.text];
    this.scene.tweens.killTweensOf([this.bg, this.text, this.badge]);
    this.badge.setAlpha(0);
    this.bg.setAlpha(0).setY(BANNER.y + 24);
    this.text.setAlpha(0).setY(BANNER.y + 19);
    this.badge.setY(BANNER.y + 19);
    this.scene.tweens.add({ targets, alpha: 1, y: '-=24', duration: 260, ease: 'Back.easeOut' });
    if (hasBadge) this.scene.tweens.add({ targets: this.badge, angle: { from: -30, to: 0 }, scale: { from: 1.6 / this.tex.scale, to: 1 / this.tex.scale }, duration: 420, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets, alpha: 0, delay: next.seconds * 1000 - 300, duration: 280 });
  }
}
