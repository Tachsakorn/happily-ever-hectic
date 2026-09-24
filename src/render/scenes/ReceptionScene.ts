import Phaser from 'phaser';
import type { ReceptionSession } from '../../core/sim/ReceptionSession';
import type { Vec2 } from '../../content/types';
import type { DomainEvent } from '../../core/sim/events';
import type { TargetRef } from '../../core/sim/state';
import { findGuest } from '../../core/guests/guestMachine';
import { ArtKit } from '../art/ArtKit';
import { TextureFactory } from '../art/TextureFactory';
import { paintVenue, type DecorLook } from '../../art/venuePainter';
import { SceneKey } from '../config';
import { ReceptionInput } from '../input/ReceptionInput';
import { PhaserHost } from '../PhaserHost';
import { Colors, Depth } from '../ui/text';
import { DisasterLayer } from '../views/DisasterLayer';
import { FloatingTextLayer } from '../views/FloatingTextLayer';
import { GuestView } from '../views/GuestView';
import { Banner, Hud } from '../views/Hud';
import { PlannerView } from '../views/PlannerView';
import { GuestCard, SeatingOverlay, TapFeedback } from '../views/SeatingViews';
import { CoupleView, PropsView } from '../views/WorldViews';
import { KitchenView } from '../views/KitchenView';
import { Fx } from '../fx/Fx';
import { servedItem, stationItem } from '../../core/sim/items';

export interface ReceptionSceneData {
  readonly session: ReceptionSession;
  readonly renderScale: number;
  readonly decor: DecorLook;
  /** Every domain event, for audio and anything else outside the scene. */
  readonly onEvents: (events: readonly DomainEvent[]) => void;
  /** Called once, shortly after the reception ends. */
  readonly onEnded: () => void;
}

/** Background textures are big; they are baked at a capped scale (the floor is soft anyway). */
const BACKGROUND_MAX_SCALE = 1.5;
const END_DELAY_MS = 1600;

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
  private floating!: FloatingTextLayer;
  private hud!: Hud;
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
    const bgKey = `venue:${venue.id}:${data.decor.flower}:${data.decor.cloth}:${swaps}`;
    // The venue is the biggest texture by far: keep only the current one in memory.
    for (const key of this.textures.getTextureKeys()) if (key.startsWith('venue:') && key !== bgKey) this.tex.replace(key);
    this.tex.ensure(bgKey, venue.size.width, venue.size.height, paintVenue(venue, data.decor, {
        itemColor: (id) => session.content.items.get(servedItem(ctx, id)).visual.color,
        stationLabel: (s) => {
          const served = stationItem(ctx, s);
          return served && served !== s.providesItemId ? session.content.items.get(served).name : null;
        },
      }), bgScale);
    this.tex.image(this, venue.size.width / 2, venue.size.height / 2, bgKey, bgScale).setDepth(0);

    this.fx = new Fx(this, this.tex);
    this.props = new PropsView(this, this.art, this.tex, sim);
    this.kitchen = new KitchenView(this, this.art, this.tex, sim, renderScale, this.fx);
    this.couple = new CoupleView(this, this.art, this.tex, sim, ctx.wedding, this.fx);
    this.planner = new PlannerView(this, this.art, this.tex, sim, renderScale, (t) => this.positionOf(t), this.fx);
    this.disasters = new DisasterLayer(this, this.art, this.tex, sim);
    this.floating = new FloatingTextLayer(this, renderScale);
    this.hud = new Hud(this, this.art, this.tex, sim, renderScale, ctx.level, ctx.wedding, this.fx);
    this.banner = new Banner(this, this.tex, this.art, renderScale);
    this.overlay = new SeatingOverlay(this, sim, renderScale);
    this.card = new GuestCard(this, sim, this.tex, renderScale);
    const taps = new TapFeedback(this, this.art, this.tex);
    this.input_ = new ReceptionInput(this, sim, this.overlay, this.card, taps, {
      onSelectGuest: () => undefined,
      onDragGuest: (key, p) => this.updateGhost(key, p),
      onCommandFailed: (reason, p) => this.floating.show(p, reason, Colors.inkCss, 18),
      plannerHit: (p) => this.planner.hitTest(p),
    });

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
    this.hud.sync(dt);
    // Announcements wait while paused (e.g. during the intro dialogue) so none are missed.
    if (!session.paused) this.banner.update(time);

    if (sim.isOver && !this.endScheduled) {
      this.endScheduled = true;
      this.time.delayedCall(END_DELAY_MS, () => this.sceneData.onEnded());
    }
  }

  private syncGuests(dt: number): void {
    const selected = this.input_.selectedGuest;
    const state = this.sceneData.session.sim.state;
    for (const g of state.guests) {
      let view = this.guests.get(g.key);
      if (!view) {
        view = new GuestView(this, this.art, this.tex, this.fx, g);
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
      case 'disasterStarted':
        this.banner.show(ctx.content.disasters.get(e.defId).hint, 'bad', 4.5, true);
        this.fx.puff(e.pos, 4);
        break;
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
      case 'guestSeated':
        if (e.neighbourScore > 0.25) {
          this.floating.show(e.pos, '♥ Great seat!', Colors.goodCss, 20);
          this.fx.hearts({ x: e.pos.x, y: e.pos.y - 80 }, 3, 30);
        } else if (e.neighbourScore < -0.25) this.floating.show(e.pos, 'Uh oh… bad company', Colors.badCss, 20);
        break;
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
          this.floating.show({ x: pos.x - 150, y: pos.y - 60 }, `Could we get ${ctx.content.items.get(e.itemId).name}?`, Colors.inkCss, 18);
        }
        break;
      case 'receptionEnded':
        if (e.outcome === 'COMPLETE') {
          this.banner.show('What a wedding! The reception is over.', 'good', 3, true);
          this.fx.rain(venue.size.width, 80);
          this.couple.celebrate();
        } else {
          this.banner.show('The couple is heartbroken… the reception is over.', 'bad', 3, true);
          this.cameras.main.shake(300, 0.005);
        }
        break;
      default:
        break;
    }
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
    this.overlay?.destroy();
    this.hud?.destroy();
    this.fx?.destroy();
    this.ghost?.destroy();
    this.ghost = null;
  }
}
