import Phaser from 'phaser';
import type { ReceptionSession } from '../../core/sim/ReceptionSession';
import type { Vec2 } from '../../content/types';
import type { DomainEvent } from '../../core/sim/events';
import type { TargetRef } from '../../core/sim/state';
import type { CoupleStateId } from '../../content/types';
import { findGuest } from '../../core/guests/guestMachine';
import { ArtKit } from '../art/ArtKit';
import { TextureFactory } from '../art/TextureFactory';
import { paintVenue, type DecorLook } from '../../art/venuePainter';
import { SceneKey } from '../config';
import { ReceptionInput } from '../input/ReceptionInput';
import { PhaserHost } from '../PhaserHost';
import { Colors, Depth, makeText } from '../ui/text';
import { DisasterLayer } from '../views/DisasterLayer';
import { SecretLayer } from '../views/SecretLayer';
import { FloatingTextLayer } from '../views/FloatingTextLayer';
import { GuestView, type PreferenceLookup } from '../views/GuestView';
import { Banner, Hud } from '../views/Hud';
import { PlannerView } from '../views/PlannerView';
import { GuestCard, SeatingOverlay, TapFeedback } from '../views/SeatingViews';
import { CoupleView, PropsView } from '../views/WorldViews';
import { KitchenView } from '../views/KitchenView';
import { RescueButton } from '../views/RescueButton';
import { Fx } from '../fx/Fx';
import { servedItem, stationItem } from '../../core/sim/items';

export interface ReceptionSceneData {
  readonly session: ReceptionSession;
  readonly renderScale: number;
  readonly decor: DecorLook;
  /** Announced as the reception starts: how the wedding plan went down with the couple. */
  readonly planNote: string | null;
  /** Every domain event, for audio and anything else outside the scene. */
  readonly onEvents: (events: readonly DomainEvent[]) => void;
  /** Called once, shortly after the reception ends. */
  readonly onEnded: () => void;
}

/** Background textures are big; they are baked at a capped scale (the floor is soft anyway). */
const BACKGROUND_MAX_SCALE = 1.5;
const END_DELAY_MS = 1600;
/** A lost wedding lingers on the Bridezilla scene a little longer. */
const FAIL_DELAY_MS = 3200;
/** Worse moods announced with a warning, so a failure never comes out of nowhere. */
const STATE_WARNINGS: Partial<Record<CoupleStateId, string>> = {
  stressed: 'The couple is getting stressed! Calm things down!',
  meltdown: 'Meltdown incoming! Help the couple, fast!',
};
const STATE_RANK: Record<CoupleStateId, number> = { blissful: 0, happy: 1, worried: 2, stressed: 3, meltdown: 4 };

/**
 * Presents one reception. Owns only view objects: every rule lives in the
 * simulation, every app decision (pause, quit, results) in the app layer.
 */
export class ReceptionScene extends Phaser.Scene {
  private sceneData!: ReceptionSceneData;
  private tex!: TextureFactory;
  private art!: ArtKit;
  private guests = new Map<string, GuestView>();
  private planner!: PlannerView;
  private couple!: CoupleView;
  private props!: PropsView;
  private kitchen!: KitchenView;
  private disasters!: DisasterLayer;
  private secrets!: SecretLayer;
  private floating!: FloatingTextLayer;
  private hud!: Hud;
  private rescue!: RescueButton;
  private banner!: Banner;
  private fx!: Fx;
  private overlay!: SeatingOverlay;
  private card!: GuestCard;
  private input_!: ReceptionInput;
  private ghost: Phaser.GameObjects.Image | null = null;
  private endScheduled = false;

  constructor() {
    super(SceneKey.RECEPTION);
  }

  create(data: ReceptionSceneData): void {
    this.sceneData = data;
    this.guests = new Map();
    this.endScheduled = false;
    const { session, renderScale } = data;
    const sim = session.sim;
    const ctx = sim.context;
    PhaserHost.applyDesignCamera(this, renderScale);

    this.tex = new TextureFactory(this.textures, renderScale);
    this.art = new ArtKit(this.tex, session.content);

    const venue = ctx.venue.def;
    const bgScale = Math.min(renderScale, BACKGROUND_MAX_SCALE);
    const swaps = Object.entries(ctx.level.itemSwaps ?? {}).map(([a, b]) => `${a}>${b}`).join(',');
    const dancing = ctx.level.dancing === true;
    const bgKey = `venue:${venue.id}:${data.decor.flower}:${data.decor.cloth}:${swaps}:${dancing ? 'dance' : ''}`;
    // The venue is the biggest texture by far: keep only the current one in memory.
    for (const key of this.textures.getTextureKeys()) if (key.startsWith('venue:') && key !== bgKey) this.tex.replace(key);
    this.tex.ensure(bgKey, venue.size.width, venue.size.height, paintVenue(venue, data.decor, {
        itemColor: (id) => session.content.items.get(servedItem(ctx, id)).visual.color,
        stationLabel: (s) => {
          const served = stationItem(ctx, s);
          return served && served !== s.providesItemId ? session.content.items.get(served).name : null;
        },
        dancing,
      }), bgScale);
    this.tex.image(this, venue.size.width / 2, venue.size.height / 2, bgKey, bgScale).setDepth(0);

    this.fx = new Fx(this, this.tex);
    this.props = new PropsView(this, this.art, this.tex, sim);
    this.kitchen = new KitchenView(this, this.art, this.tex, sim, renderScale, this.fx);
    this.couple = new CoupleView(this, this.art, this.tex, sim, ctx.wedding, this.fx);
    this.planner = new PlannerView(this, this.art, this.tex, sim, renderScale, (t) => this.positionOf(t), this.fx);
    this.disasters = new DisasterLayer(this, this.art, this.tex, sim);
    this.secrets = new SecretLayer(this, this.art, this.tex, this.fx, sim);
    this.floating = new FloatingTextLayer(this, renderScale);
    this.hud = new Hud(this, this.art, this.tex, sim, renderScale, ctx.level, ctx.wedding, this.fx);
    this.banner = new Banner(this, this.tex, this.art, renderScale);
    this.rescue = new RescueButton(this, this.tex, sim, this.fx, renderScale);
    this.overlay = new SeatingOverlay(this, sim, renderScale);
    this.card = new GuestCard(this, sim, this.tex, renderScale);
    const taps = new TapFeedback(this, this.art, this.tex);
    this.input_ = new ReceptionInput(this, sim, this.overlay, this.card, taps, {
      onSelectGuest: () => undefined,
      onDragGuest: (key, p) => this.updateGhost(key, p),
      onCommandFailed: (reason, p) => this.floating.show(p, reason, Colors.inkCss, 18),
      plannerHit: (p) => this.planner.hitTest(p),
      buttonHit: (p) => {
        if (!this.rescue.hitTest(p)) return false;
        const result = sim.command({ type: 'useRescue' });
        taps.ripple(p, result.ok);
        if (!result.ok) {
          this.rescue.refuse();
          this.floating.show({ x: p.x - 40, y: p.y - 90 }, result.reason, Colors.inkCss, 18);
        }
        return true;
      },
    });

    if (data.planNote) this.banner.show(data.planNote, 'moment', 4);
    for (const tip of ctx.level.tutorialTips) this.banner.show(tip, 'info', 5);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(time: number, deltaMs: number): void {
    const { session } = this.sceneData;
    const sim = session.sim;
    const events = session.advance(Math.min(deltaMs, 100) / 1000);
    if (events.length) {
      for (const e of events) this.present(e);
      this.sceneData.onEvents(events);
    }

    const dt = deltaMs / 1000;
    this.syncGuests(session.paused ? 0 : dt);
    this.input_.validateSelection();
    this.planner.sync(dt);
    this.couple.sync(dt);
    this.props.sync(time);
    this.kitchen.sync(dt);
    this.disasters.sync(time);
    this.secrets.sync(session.paused ? 0 : dt);
    this.hud.sync(dt);
    this.rescue.sync(dt);
    // Announcements wait while paused (e.g. during the intro dialogue) so none are missed.
    if (!session.paused) this.banner.update(time);

    if (sim.isOver && !this.endScheduled) {
      this.endScheduled = true;
      this.time.delayedCall(sim.state.outcome === 'FAILED' ? FAIL_DELAY_MS : END_DELAY_MS, () => this.sceneData.onEnded());
    }
  }

  private syncGuests(dt: number): void {
    const selected = this.input_.selectedGuest;
    const state = this.sceneData.session.sim.state;
    for (const g of state.guests) {
      let view = this.guests.get(g.key);
      if (!view) {
        view = new GuestView(this, this.art, this.tex, this.fx, g, this.preferenceLookup);
        this.guests.set(g.key, view);
      }
      view.sync(g, g.key === selected, dt);
    }
    if (this.guests.size !== state.guests.length) {
      for (const [key, view] of this.guests) {
        if (!state.guests.some((g) => g.key === key)) {
          view.destroy();
          this.guests.delete(key);
        }
      }
    }
  }

  /** Resolves a like/dislike reference (a guest key or a group id) for preference bubbles. */
  private readonly preferenceLookup: PreferenceLookup = (ref) => {
    const ctx = this.sceneData.session.sim.context;
    const spec = ctx.level.guests.find((s) => s.key === ref);
    if (spec) return { kind: 'guest', look: spec };
    return ctx.content.groups.has(ref) ? { kind: 'group', color: ctx.content.groups.get(ref).visual.color } : null;
  };

  private updateGhost(guestKey: string, p: Vec2 | null): void {
    if (!p) {
      this.ghost?.destroy();
      this.ghost = null;
      return;
    }
    if (!this.ghost) {
      const g = findGuest(this.sceneData.session.sim.context, guestKey);
      if (!g) return;
      this.ghost = this.tex.image(this, p.x, p.y, this.art.guest(g)).setOrigin(0.5, 0.9).setAlpha(0.75).setDepth(Depth.overlay);
    }
    this.ghost.setPosition(p.x, p.y + 20);
  }

  private positionOf(t: TargetRef): Vec2 | null {
    const sim = this.sceneData.session.sim;
    const ctx = sim.context;
    switch (t.kind) {
      case 'guest': {
        const g = findGuest(ctx, t.id);
        return g ? { x: g.pos.x, y: g.pos.y - 50 } : null;
      }
      case 'couple':
        return ctx.venue.def.couplePos;
      case 'station':
        return ctx.venue.hasStation(t.id) ? ctx.venue.station(t.id).pos : null;
      case 'passSlot':
        return ctx.venue.def.passSlots[t.index] ?? null;
      case 'gift':
        return sim.state.gifts.find((g) => g.id === t.id)?.pos ?? null;
      case 'disaster':
        return sim.state.disasters.find((d) => d.id === t.id)?.pos ?? null;
      case 'secret':
        return sim.state.secrets.find((s) => s.id === t.id)?.pos ?? null;
    }
  }

  /** Turns domain events into readable feedback: words for what happened, juice for how it felt. */
  private present(e: DomainEvent): void {
    const ctx = this.sceneData.session.sim.context;
    const venue = ctx.venue.def;
    const moodAnchor = { x: 250, y: 150 };
    switch (e.type) {
      case 'moodChanged':
        // Ongoing drains are already shown by the disaster ring; popping them every
        // second would bury the one-off changes the player needs to notice.
        if (!e.ongoing) this.floating.mood(e.pos ?? moodAnchor, e.delta, e.cause);
        this.hud.pushCause(e.delta, e.cause);
        if (!e.ongoing && e.delta >= 3) this.fx.hearts({ x: venue.couplePos.x, y: venue.couplePos.y - 100 }, 3, 70);
        break;
      case 'scoreChanged':
        if (e.pos && Math.abs(e.delta) >= 10) {
          this.floating.score(e.pos, e.delta);
          if (e.delta > 0) this.coinsToHud(e.pos, e.delta);
        }
        break;
      case 'momentStarted': {
        const m = ctx.content.moments.get(e.momentId);
        const item = ctx.content.items.get(servedItem(ctx, m.itemId)).name;
        this.banner.show(m.announcement.replace('{item}', item), 'moment', 5, true);
        break;
      }
      case 'momentCompleted':
        this.banner.show(`${ctx.content.moments.get(e.momentId).name}! The guests cheer!`, 'good', 3, true);
        this.couple.celebrate();
        this.fx.confetti({ x: venue.couplePos.x, y: venue.couplePos.y - 40 }, 30, 190);
        break;
      case 'momentFailed':
        this.cameras.main.shake(200, 0.003);
        break;
      case 'disasterStarted': {
        const who = this.sceneData.session.sim.state.disasters.find((d) => d.id === e.disasterId)?.involvedGuestKeys[0];
        const name = (who && findGuest(ctx, who)?.name) || 'A guest';
        this.banner.show(ctx.content.disasters.get(e.defId).hint.replace('{guest}', name), 'bad', 4.5, true);
        this.fx.puff(e.pos, 4);
        break;
      }
      case 'disasterPhaseChanged':
        if (e.phase === 'ESCALATED') this.cameras.main.shake(220, 0.004);
        break;
      case 'disasterResolved':
        this.fx.sparkles(e.pos, 10, 60, 0xfff1c4);
        this.planner.cheer();
        break;
      case 'disasterFailed':
        this.fx.puff(e.pos, 5, 'steam');
        this.cameras.main.shake(260, 0.006);
        break;
      case 'chainChanged':
        if (e.count >= 2 && e.pos) {
          this.floating.show({ x: e.pos.x, y: e.pos.y - 150 }, `×${e.count} Chain!`, '#c98a22', 20 + Math.min(10, e.count * 2));
          this.fx.sparkles({ x: e.pos.x, y: e.pos.y - 120 }, 4 + Math.min(6, e.count), 40, 0xf2b84b);
        }
        break;
      case 'secretAppeared':
        this.banner.show(`✨ ${ctx.content.secretEvents.get(e.defId).appearText}`, 'secret', 4.5, true);
        break;
      case 'secretFound': {
        const def = ctx.content.secretEvents.get(e.defId);
        this.banner.show(`Secret found: ${def.name}! ${def.foundText}`, 'secret', 5, true);
        this.fx.confetti({ x: e.pos.x, y: e.pos.y - 40 }, 36, 200);
        this.fx.sparkles({ x: e.pos.x, y: e.pos.y - 40 }, 14, 90, 0xfff3c4);
        this.planner.cheer();
        break;
      }
      case 'secretVanished':
        this.fx.puff({ x: e.pos.x, y: e.pos.y - 20 }, 4);
        this.floating.show({ x: e.pos.x, y: e.pos.y - 90 }, 'It vanished…', '#8a7688', 18);
        break;
      case 'guestSeated':
        if (e.neighbourScore > 0.25) {
          this.floating.show(e.pos, '♥ Great seat!', Colors.goodCss, 20);
          this.fx.hearts({ x: e.pos.x, y: e.pos.y - 80 }, 3, 30);
        } else if (e.neighbourScore < -0.25) this.floating.show(e.pos, 'Uh oh… bad company', Colors.badCss, 20);
        break;
      case 'serviceGranted':
        for (let i = 0; i < 3; i++) this.fx.note({ x: e.from.x + (i - 1) * 26, y: e.from.y - 80 - i * 10 });
        this.fx.sparkles({ x: e.pos.x, y: e.pos.y - 70 }, 6, 40, 0xb49be0);
        this.floating.show({ x: e.pos.x, y: e.pos.y - 150 }, '♪ Their song!', '#7a5bb5', 20);
        this.guests.get(e.guestKey)?.cheer();
        break;
      case 'rescueUsed':
        this.banner.show('Pop! Champagne for everyone — the whole room perks up!', 'good', 3, true);
        for (const view of this.guests.values()) view.cheer();
        this.fx.confetti({ x: venue.size.width / 2, y: 380 }, 40, 420);
        break;
      case 'coupleStateChanged': {
        const worse = STATE_RANK[e.to] > STATE_RANK[e.from];
        const warning = STATE_WARNINGS[e.to];
        if (worse && warning) this.banner.show(warning, 'bad', 3, true);
        else if (!worse && (e.to === 'happy' || e.to === 'blissful')) {
          const pos = venue.couplePos;
          this.floating.show({ x: pos.x, y: pos.y - 150 }, e.to === 'blissful' ? 'Blissful! ♥' : 'Feeling better!', Colors.goodCss, 22);
        }
        break;
      }
      case 'orderTaken':
        this.fx.sparkles({ x: e.pos.x, y: e.pos.y - 120 }, 5, 30);
        break;
      case 'itemPickedUp':
      case 'giftPickedUp':
        this.planner.notePickup({ x: e.pos.x, y: e.pos.y - 20 });
        break;
      case 'itemServed':
        this.planner.cheer();
        this.fx.sparkles({ x: e.pos.x, y: e.pos.y - 60 }, 7, 44);
        if (e.to === 'couple') this.couple.celebrate();
        break;
      case 'giftsDelivered':
        this.planner.cheer();
        this.fx.sparkles(e.pos, 8, 50, 0xbfe3ff);
        break;
      case 'itemDiscarded':
        this.fx.puff(e.pos, 2);
        break;
      case 'actionSkipped':
        this.floating.show({ x: e.pos.x, y: e.pos.y - 110 }, e.reason, '#8a7688', 18);
        break;
      case 'coupleRequested':
        if (!e.momentId) {
          const pos = venue.couplePos;
          this.floating.show({ x: pos.x + 116, y: pos.y - 40 }, `Could we get ${ctx.content.items.get(e.itemId).name}?`, Colors.inkCss, 18);
        }
        break;
      case 'receptionEnded':
        if (e.outcome === 'COMPLETE') {
          this.banner.show('What a wedding! The reception is over.', 'good', 3, true);
          this.fx.rain(venue.size.width, 80);
          this.couple.celebrate();
        } else {
          this.couple.bridezilla();
          this.showBridezilla();
        }
        break;
      default:
        break;
    }
  }

  /** The failure title card: big, wobbling, impossible to miss. */
  private showBridezilla(): void {
    const { width, height } = this.sceneData.session.sim.context.venue.def.size;
    const title = makeText(this, width / 2, height / 2 - 40, 'BRIDEZILLA!', this.sceneData.renderScale, {
      size: 110,
      display: true,
      color: '#ffffff',
      stroke: '#b4466a',
      strokeWidth: 14,
    })
      .setOrigin(0.5)
      .setDepth(Depth.banner + 10)
      .setScale(0)
      .setAngle(-8);
    const sub = makeText(this, width / 2, height / 2 + 50, 'The couple had a meltdown…', this.sceneData.renderScale, {
      size: 34,
      weight: '800',
      stroke: '#fffaf0',
      strokeWidth: 8,
    })
      .setOrigin(0.5)
      .setDepth(Depth.banner + 10)
      .setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, angle: 4, duration: 520, ease: 'Back.easeOut', easeParams: [2.6], delay: 500 });
    this.tweens.add({ targets: title, angle: { from: 4, to: -4 }, yoyo: true, repeat: -1, duration: 260, delay: 1020 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 1000 });
    this.time.delayedCall(700, () => this.cameras.main.shake(600, 0.012));
  }

  /** A few coins arc from where points were earned to the score counter. */
  private coinsToHud(from: Vec2, points: number): void {
    const count = Math.min(5, Math.max(1, Math.round(points / 40)));
    const key = this.art.icon('coin', 0xf2b84b);
    const to = this.hud.scoreAnchor;
    for (let i = 0; i < count; i++) {
      this.fx.fly(key, { x: from.x + (i - count / 2) * 10, y: from.y - 40 }, to, {
        scale: 0.6,
        duration: 560,
        delay: i * 70,
        onArrive: i === count - 1 ? () => this.fx.sparkles(to, 5, 26, 0xfff1c4) : undefined,
      });
    }
  }

  private teardown(): void {
    this.input_?.destroy();
    for (const v of this.guests.values()) v.destroy();
    this.guests.clear();
    this.planner?.destroy();
    this.couple?.destroy();
    this.props?.destroy();
    this.kitchen?.destroy();
    this.disasters?.destroy();
    this.secrets?.destroy();
    this.overlay?.destroy();
    this.hud?.destroy();
    this.rescue?.destroy();
    this.fx?.destroy();
    this.ghost?.destroy();
    this.ghost = null;
  }
}
