import type { Tick, Timestamp, EntityId, SystemId } from '../types.js';
import type { EventType, EventData } from './EventMap.js';

/**
 * Events are immutable messages that systems use to communicate.
 *
 * Generic type parameter T allows for typed event data:
 * - GameEvent<'agent:action:started'> has typed data property
 * - GameEvent (untyped) has generic Record<string, unknown> data
 */
export interface GameEvent<T extends EventType = EventType> {
  /** Event type identifier */
  readonly type: T;

  /** Game tick when event was emitted */
  readonly tick: Tick;

  /** Real-world timestamp for debugging */
  readonly timestamp: Timestamp;

  /** Who emitted this event */
  readonly source: EntityId | SystemId | 'world' | 'player';

  /** Event-specific payload - typed based on event type */
  readonly data: Readonly<EventData<T>>;
}

/**
 * Event handler function - can be typed to specific event type.
 */
export type EventHandler<T extends EventType = EventType> = (event: GameEvent<T>) => void;

export type EventPriority = 'immediate' | 'high' | 'normal' | 'low' | 'deferred';

export type Unsubscribe = () => void;
