import type { Id } from '../../content/types';
import type { TargetRef } from './state';

/** Everything the player can ask the simulation to do. Input layers translate touches into these. */
export type Command =
  | { type: 'seatGuest'; guestKey: string; seatId: Id }
  | { type: 'queueAction'; target: TargetRef }
  | { type: 'clearQueue' }
  /** Send a guest who wants to dance onto the dance floor. */
  | { type: 'sendToDance'; guestKey: string }
  /** Pop a bottle of rescue champagne: every guest cheers up. */
  | { type: 'useRescue' };

export type CommandResult = { ok: true } | { ok: false; reason: string };

export const ok: CommandResult = { ok: true };
export const fail = (reason: string): CommandResult => ({ ok: false, reason });
