import Phaser from 'phaser';
import type { Vec2 } from '../../content/types';
import type { ReceptionSimulation } from '../../core/sim/ReceptionSimulation';
import type { GuestCard, SeatingOverlay, TapFeedback } from '../views/SeatingViews';

const DRAG_THRESHOLD = 14;

export interface InputFeedback {
  onSelectGuest(key: string | null): void;
  onDragGuest(key: string, p: Vec2 | null): void;
  onCommandFailed(reason: string, p: Vec2): void;
  plannerHit(p: Vec2): boolean;
}

/**
 * Touch → commands. Two seating gestures are supported because both feel
 * natural on iPad: drag a guest onto a seat, or tap the guest then tap the
 * seat. Every other tap queues an action at whatever was tapped.
 * Only the first finger is tracked, so a resting palm cannot trigger actions.
 */
export class ReceptionInput {
  private pointerId: number | null = null;
  private downAt: Vec2 | null = null;
  private candidate: string | null = null;
  private dragging = false;
  private selected: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: ReceptionSimulation,
    private readonly overlay: SeatingOverlay,
    private readonly card: GuestCard,
    private readonly taps: TapFeedback,
    private readonly feedback: InputFeedback,
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  get selectedGuest(): string | null {
    return this.selected;
  }

  /** A selected guest who gets seated some other way (or leaves) is no longer selectable. */
  validateSelection(): void {
    if (!this.selected) return;
    const g = this.sim.state.guests.find((x) => x.key === this.selected);
    if (!g || (g.state !== 'WAITING_TO_BE_SEATED' && g.state !== 'ARRIVING')) this.select(null);
  }

  private point(p: Phaser.Input.Pointer): Vec2 {
    return { x: p.worldX, y: p.worldY };
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || this.sim.isOver) return;
    this.pointerId = p.id;
    const pt = this.point(p);
    this.downAt = pt;
    this.candidate = this.sim.pickWaitingGuest(pt);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId || !this.downAt || !p.isDown) return;
    const pt = this.point(p);
    if (!this.dragging && this.candidate && Math.hypot(pt.x - this.downAt.x, pt.y - this.downAt.y) > DRAG_THRESHOLD) {
      this.dragging = true;
      this.select(null);
      this.overlay.show(this.candidate);
      this.card.show(this.candidate);
    }
    if (this.dragging && this.candidate) {
      this.feedback.onDragGuest(this.candidate, pt);
      this.overlay.highlight(this.sim.pickSeat(pt));
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = null;
    const pt = this.point(p);
    const candidate = this.candidate;
    const wasDragging = this.dragging;
    this.candidate = null;
    this.dragging = false;
    this.downAt = null;
    if (this.sim.isOver) return;

    if (wasDragging && candidate) {
      this.feedback.onDragGuest(candidate, null);
      this.overlay.hide();
      this.card.hide();
      this.trySeat(candidate, pt);
      return;
    }
    if (candidate) {
      // Tap on a waiting guest: select (or deselect) for tap-to-seat.
      this.select(this.selected === candidate ? null : candidate);
      this.taps.ripple(pt, true);
      return;
    }
    if (this.selected) {
      const guestKey = this.selected;
      const seat = this.sim.pickSeat(pt);
      this.select(null);
      if (seat) {
        this.trySeat(guestKey, pt);
        return;
      }
    }
    if (this.feedback.plannerHit(pt)) {
      this.sim.command({ type: 'clearQueue' });
      this.taps.ripple(pt, true);
      return;
    }
    const target = this.sim.pickTarget(pt);
    if (!target) {
      this.taps.ripple(pt, false);
      return;
    }
    const result = this.sim.command({ type: 'queueAction', target });
    this.taps.ripple(pt, result.ok);
    if (!result.ok) this.feedback.onCommandFailed(result.reason, pt);
  }

  private trySeat(guestKey: string, pt: Vec2): void {
    const seat = this.sim.pickSeat(pt);
    if (!seat) {
      this.taps.ripple(pt, false);
      return;
    }
    const result = this.sim.command({ type: 'seatGuest', guestKey, seatId: seat });
    this.taps.ripple(pt, result.ok);
    if (!result.ok) this.feedback.onCommandFailed(result.reason, pt);
  }

  private select(key: string | null): void {
    this.selected = key;
    this.feedback.onSelectGuest(key);
    if (key) {
      this.overlay.show(key);
      this.card.show(key);
    } else {
      this.overlay.hide();
      this.card.hide();
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
