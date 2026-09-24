import type { Id, Vec2 } from '../../content/types';
import type { DisasterPhaseId, GuestStateId, TargetRef } from './state';

/**
 * Domain events: facts the simulation announces. Render, audio and UI react to
 * them; systems may also listen (scoring listens to service events). Events
 * carry positions so feedback can appear where the thing happened.
 */
export type DomainEvent =
  | { type: 'guestArrived'; guestKey: string }
  | { type: 'guestStateChanged'; guestKey: string; from: GuestStateId; to: GuestStateId }
  | { type: 'guestSeated'; guestKey: string; seatId: Id; neighbourScore: number; pos: Vec2 }
  | { type: 'orderTaken'; guestKey: string; itemId: Id; pos: Vec2 }
  | { type: 'dishReady'; slot: number; itemId: Id }
  | { type: 'itemPickedUp'; itemId: Id; pos: Vec2 }
  | { type: 'itemDiscarded'; itemIds: Id[]; pos: Vec2 }
  | { type: 'itemServed'; to: 'guest' | 'couple'; guestKey?: string; itemId: Id; wasOrder: boolean; happiness: number; pos: Vec2 }
  | { type: 'giftPickedUp'; giftId: number; pos: Vec2 }
  | { type: 'giftsDelivered'; count: number; pos: Vec2 }
  | { type: 'actionQueued'; actionId: number; target: TargetRef }
  | { type: 'actionSkipped'; actionId: number; reason: string; pos: Vec2 }
  | { type: 'queueCleared' }
  | { type: 'guestUpset'; guestKey: string; pos: Vec2 }
  | { type: 'guestDancing'; guestKey: string; pos: Vec2 }
  | { type: 'guestLeft'; guestKey: string; upset: boolean }
  | { type: 'disasterStarted'; disasterId: number; defId: Id; pos: Vec2 }
  | { type: 'disasterPhaseChanged'; disasterId: number; defId: Id; phase: DisasterPhaseId; pos: Vec2 }
  | { type: 'disasterResolved'; disasterId: number; defId: Id; early: boolean; pos: Vec2 }
  | { type: 'disasterFailed'; disasterId: number; defId: Id; pos: Vec2 }
  | { type: 'momentStarted'; momentId: Id }
  | { type: 'momentCompleted'; momentId: Id }
  | { type: 'momentFailed'; momentId: Id }
  | { type: 'coupleRequested'; itemId: Id; momentId: Id | null }
  | { type: 'coupleRequestExpired'; itemId: Id; momentId: Id | null }
  /** `ongoing`: aggregated drain from something still happening (reported once per second). */
  | { type: 'moodChanged'; delta: number; mood: number; cause: string; pos: Vec2 | null; ongoing: boolean }
  | { type: 'scoreChanged'; delta: number; total: number; reason: string; pos: Vec2 | null }
  | { type: 'receptionEnded'; outcome: 'COMPLETE' | 'FAILED' };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

/**
 * Synchronous in-process bus plus an outbox. Systems subscribe for immediate
 * reactions; presentation drains the outbox once per frame.
 */
export class EventBus {
  private readonly outbox: DomainEvent[] = [];
  private readonly handlers = new Map<DomainEventType, ((e: DomainEvent) => void)[]>();

  on<T extends DomainEventType>(type: T, handler: (e: EventOf<T>) => void): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as (e: DomainEvent) => void);
    this.handlers.set(type, list);
  }

  emit(event: DomainEvent): void {
    this.outbox.push(event);
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
  }

  /** Returns and clears events emitted since the last drain. */
  drain(): DomainEvent[] {
    return this.outbox.splice(0, this.outbox.length);
  }
}
