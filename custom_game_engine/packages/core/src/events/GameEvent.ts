import type { EventType, Tick, Timestamp, EntityId, SystemId } from '../types.js';

/**
 * Events are immutable messages that systems use to communicate.
 */
export interface GameEvent {
  /** Event type identifier */
  readonly type: EventType;

  /** Game tick when event was emitted */
  readonly tick: Tick;

  /** Real-world timestamp for debugging */
  readonly timestamp: Timestamp;

  /** Who emitted this event */
  readonly source: EntityId | SystemId | 'world' | 'player';

  /** Event-specific payload */
  readonly data: Readonly<Record<string, unknown>>;
}

export type EventHandler = (event: GameEvent) => void;

export type EventPriority = 'immediate' | 'high' | 'normal' | 'low' | 'deferred';

export type Unsubscribe = () => void;
