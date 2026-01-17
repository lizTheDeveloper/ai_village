/**
 * TypedEventEmitter - "Pit of Success" API for Event Emission
 *
 * Provides compile-time type safety for event emission and subscription management.
 * Makes it impossible to emit malformed events or forget to unsubscribe.
 *
 * ## Problems Solved:
 * 1. Forgetting type parameter on emit() → silent data corruption
 * 2. Subscription leaks → memory leaks, stale handlers
 * 3. emit vs emitImmediate confusion → wrong timing
 * 4. Scattered subscription cleanup → easy to miss
 *
 * ## Usage:
 * ```typescript
 * // In system initialization:
 * const events = new SystemEventManager(eventBus, 'my_system');
 *
 * // Type-safe emission - compile error if data shape is wrong
 * events.emit('agent:idle', { agentId: 'abc123' });
 *
 * // Type-safe subscription with auto-cleanup
 * events.on('agent:ate', (data) => {
 *   // data is typed as GameEventMap['agent:ate']
 *   console.log(data.foodType, data.hungerRestored);
 * });
 *
 * // In cleanup():
 * events.cleanup(); // Unsubscribes all automatically
 * ```
 */

import type { EventBus } from './EventBus.js';
import type { GameEventMap, EventType } from './EventMap.js';
import type { GameEvent, EventPriority, Unsubscribe } from './GameEvent.js';
import type { SystemId, EntityId } from '../types.js';

/**
 * Type-safe event emitter bound to a specific source.
 * Enforces correct data shape at compile time.
 */
export interface TypedEmitter {
  /**
   * Emit an event with type-safe data validation.
   * Event is queued for end of tick (standard behavior).
   *
   * @param type - Event type (autocompletes from GameEventMap)
   * @param data - Event data (type-checked against GameEventMap)
   * @param source - Optional override for event source
   */
  emit<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void;

  /**
   * Emit an event immediately (use sparingly).
   * Only use when event must be processed before tick continues.
   *
   * @param type - Event type
   * @param data - Event data
   * @param source - Optional override for event source
   */
  emitImmediate<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void;
}

/**
 * Type-safe event handler that receives properly typed data.
 */
export type TypedEventHandler<T extends EventType> = (
  data: Readonly<GameEventMap[T]>,
  event: Readonly<GameEvent<T>>
) => void;

/**
 * Manages event subscriptions for a system with automatic cleanup.
 *
 * Key features:
 * - Type-safe emit() that validates data at compile time
 * - Automatic subscription tracking
 * - Single cleanup() call removes all subscriptions
 * - Clear source attribution for debugging
 */
export class SystemEventManager implements TypedEmitter {
  private readonly eventBus: EventBus;
  private readonly systemId: SystemId;
  private readonly defaultSource: EntityId;
  private readonly subscriptions: Unsubscribe[] = [];
  private isCleanedUp = false;

  /**
   * Create a new event manager for a system.
   *
   * @param eventBus - The event bus to use
   * @param systemId - System ID for error messages and debugging
   * @param defaultSource - Default source for emitted events (optional)
   */
  constructor(
    eventBus: EventBus,
    systemId: SystemId,
    defaultSource?: EntityId
  ) {
    this.eventBus = eventBus;
    this.systemId = systemId;
    this.defaultSource = defaultSource ?? (systemId as EntityId);
  }

  /**
   * Emit a typed event (queued for end of tick).
   */
  emit<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void {
    if (this.isCleanedUp) {
      console.warn(
        `[${this.systemId}] Attempted to emit '${type}' after cleanup`
      );
      return;
    }

    this.eventBus.emit<T>({
      type,
      source: source ?? this.defaultSource,
      data,
    });
  }

  /**
   * Emit a typed event immediately (use sparingly).
   */
  emitImmediate<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void {
    if (this.isCleanedUp) {
      console.warn(
        `[${this.systemId}] Attempted to emitImmediate '${type}' after cleanup`
      );
      return;
    }

    this.eventBus.emitImmediate<T>({
      type,
      source: source ?? this.defaultSource,
      data,
    });
  }

  /**
   * Subscribe to a typed event with automatic cleanup tracking.
   *
   * @param type - Event type to subscribe to
   * @param handler - Handler receiving typed data
   * @param priority - Optional priority for handler execution order
   * @returns Unsubscribe function (also tracked for cleanup())
   */
  on<T extends EventType>(
    type: T,
    handler: TypedEventHandler<T>,
    priority?: EventPriority
  ): Unsubscribe {
    if (this.isCleanedUp) {
      throw new Error(
        `[${this.systemId}] Cannot subscribe to '${type}' after cleanup`
      );
    }

    const wrappedHandler = (event: GameEvent<T>) => {
      try {
        handler(event.data, event);
      } catch (error) {
        console.error(
          `[${this.systemId}] Error in handler for '${type}':`,
          error
        );
        throw error; // Re-throw to surface in tests
      }
    };

    const unsub = this.eventBus.subscribe<T>(
      type,
      wrappedHandler as any,
      priority
    );
    this.subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Subscribe to multiple event types with the same handler.
   *
   * @param types - Array of event types
   * @param handler - Handler for all events (receives union of data types)
   * @param priority - Optional priority
   */
  onAny<T extends EventType>(
    types: readonly T[],
    handler: (data: GameEventMap[T], event: GameEvent<T>) => void,
    priority?: EventPriority
  ): Unsubscribe {
    const unsubs = types.map((type) =>
      this.on(type, handler as TypedEventHandler<typeof type>, priority)
    );

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }

  /**
   * Unsubscribe from all events. Call this in system cleanup().
   * Safe to call multiple times.
   */
  cleanup(): void {
    if (this.isCleanedUp) return;

    for (const unsub of this.subscriptions) {
      try {
        unsub();
      } catch (error) {
        console.warn(
          `[${this.systemId}] Error during subscription cleanup:`,
          error
        );
      }
    }

    this.subscriptions.length = 0;
    this.isCleanedUp = true;
  }

  /**
   * Get the number of active subscriptions (for debugging).
   */
  get subscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * Check if this manager has been cleaned up.
   */
  get cleaned(): boolean {
    return this.isCleanedUp;
  }
}

/**
 * Create a typed emitter for a specific event type.
 * Useful when you only need to emit one type of event.
 *
 * @example
 * const emitIdle = createTypedEmitter(eventBus, 'agent:idle', systemId);
 * emitIdle({ agentId: 'abc123' }); // Type-safe!
 */
export function createTypedEmitter<T extends EventType>(
  eventBus: EventBus,
  eventType: T,
  defaultSource: EntityId
): (data: GameEventMap[T], source?: EntityId) => void {
  return (data: GameEventMap[T], source?: EntityId) => {
    eventBus.emit<T>({
      type: eventType,
      source: source ?? defaultSource,
      data,
    });
  };
}

/**
 * Helper to create emitters for common event patterns.
 */
export const EventEmitters = {
  /**
   * Create an emitter for agent state events.
   */
  forAgent(
    eventBus: EventBus,
    agentId: EntityId
  ): {
    idle: () => void;
    ate: (food: Omit<GameEventMap['agent:ate'], 'agentId'>) => void;
    collapsed: (reason: 'exhaustion' | 'starvation' | 'temperature') => void;
  } {
    const manager = new SystemEventManager(eventBus, 'agent_emitter', agentId);
    return {
      idle: () => manager.emit('agent:idle', { agentId }),
      ate: (food) => manager.emit('agent:ate', { agentId, ...food }),
      collapsed: (reason) => manager.emit('agent:collapsed', { agentId, reason }),
    };
  },
};
