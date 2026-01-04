import type {
  GameEvent,
  EventHandler,
  EventPriority,
  Unsubscribe,
} from './GameEvent.js';
import type { EventType } from './EventMap.js';
import type { Tick } from '../types.js';

// Re-export GameEvent for external use
export type { GameEvent } from './GameEvent.js';

/**
 * Central event bus for system communication with type-safe event handling.
 *
 * Type-safe usage:
 * ```typescript
 * // Typed subscription - event.data is inferred
 * eventBus.subscribe<'agent:action:started'>('agent:action:started', (event) => {
 * });
 *
 * // Typed emission - data structure is validated
 * eventBus.emit<'agent:action:started'>({
 *   type: 'agent:action:started',
 *   source: agentId,
 *   data: { actionId: 'abc', actionType: 'till' } // Must match EventMap!
 * });
 * ```
 */
export interface EventBus {
  /**
   * Subscribe to one or more event types with optional type safety.
   *
   * @param eventType - Single event type or array of types to subscribe to
   * @param handler - Handler function (receives typed event if T is specified)
   * @param priority - Optional priority for handler execution order
   * @returns Unsubscribe function
   */
  subscribe<T extends EventType = EventType>(
    eventType: T | EventType | EventType[],
    handler: EventHandler<T>,
    priority?: EventPriority
  ): Unsubscribe;

  /**
   * Emit an event (queued for end of tick by default).
   * Use type parameter for compile-time validation of event data.
   *
   * @param event - Event object (tick and timestamp added automatically)
   */
  emit<T extends EventType = EventType>(
    event: Omit<GameEvent<T>, 'tick' | 'timestamp'>
  ): void;

  /**
   * Emit immediately (use sparingly - breaks tick atomicity).
   * Use type parameter for compile-time validation of event data.
   *
   * @param event - Event object (tick and timestamp added automatically)
   */
  emitImmediate<T extends EventType = EventType>(
    event: Omit<GameEvent<T>, 'tick' | 'timestamp'>
  ): void;

  /** Process all queued events (called once per tick) */
  flush(): void;

  /** Get event history for replay/debugging */
  getHistory(since?: Tick): ReadonlyArray<GameEvent>;

  /** Clear history older than tick */
  pruneHistory(olderThan: Tick): void;

  /** Get current tick (for event creation) */
  getCurrentTick(): Tick;

  /** Set current tick (called by game loop) */
  setCurrentTick(tick: Tick): void;

  /** Alias for subscribe() - compatibility method */
  on<T extends EventType = EventType>(
    eventType: T | EventType | EventType[],
    handler: EventHandler<T>,
    priority?: EventPriority
  ): Unsubscribe;

  /** Remove a subscription by handler - compatibility method */
  off(eventType: EventType | EventType[], handler: EventHandler): void;
}

interface Subscription {
  id: number;
  eventTypes: Set<EventType>;
  handler: EventHandler;
  priority: EventPriority;
}

interface QueuedEvent {
  event: GameEvent;
  priority: EventPriority;
}

const PRIORITY_ORDER: Record<EventPriority, number> = {
  immediate: 0,
  high: 1,
  normal: 2,
  low: 3,
  deferred: 4,
};

/**
 * Implementation of EventBus.
 */
export class EventBusImpl implements EventBus {
  private subscriptions = new Map<number, Subscription>();
  private nextSubscriptionId = 1;
  private eventQueue: QueuedEvent[] = [];
  private eventHistory: GameEvent[] = [];
  private currentTick: Tick = 0;

  // Index: eventType -> subscription IDs
  private typeIndex = new Map<EventType, Set<number>>();

  // Map for tracking subscriptions by handler (for .off() method)
  private handlerToUnsubscribe = new Map<EventHandler, Unsubscribe>();

  subscribe<T extends EventType = EventType>(
    eventType: T | EventType | EventType[],
    handler: EventHandler<T>,
    priority: EventPriority = 'normal'
  ): Unsubscribe {
    const id = this.nextSubscriptionId++;
    const types = Array.isArray(eventType) ? eventType : [eventType];
    const typeSet = new Set(types);

    const subscription: Subscription = {
      id,
      eventTypes: typeSet,
      handler: handler as EventHandler,
      priority,
    };

    this.subscriptions.set(id, subscription);

    // Update type index
    for (const type of types) {
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set());
      }
      this.typeIndex.get(type)!.add(id);
    }

    return () => {
      this.subscriptions.delete(id);
      for (const type of types) {
        this.typeIndex.get(type)?.delete(id);
      }
      this.handlerToUnsubscribe.delete(handler as EventHandler);
    };
  }

  /**
   * Alias for subscribe() - compatibility method.
   */
  on<T extends EventType = EventType>(
    eventType: T | EventType | EventType[],
    handler: EventHandler<T>,
    priority: EventPriority = 'normal'
  ): Unsubscribe {
    const unsubscribe = this.subscribe(eventType, handler, priority);
    this.handlerToUnsubscribe.set(handler as EventHandler, unsubscribe);
    return unsubscribe;
  }

  /**
   * Remove a subscription by handler - compatibility method.
   */
  off(_eventType: EventType | EventType[], handler: EventHandler): void {
    const unsubscribe = this.handlerToUnsubscribe.get(handler);
    if (unsubscribe) {
      unsubscribe();
    }
  }

  emit<T extends EventType = EventType>(event: Omit<GameEvent<T>, 'tick' | 'timestamp'>): void {
    const fullEvent: GameEvent = {
      ...event,
      tick: this.currentTick,
      timestamp: Date.now(),
    };

    this.eventQueue.push({
      event: fullEvent,
      priority: 'normal',
    });
  }

  emitImmediate<T extends EventType = EventType>(event: Omit<GameEvent<T>, 'tick' | 'timestamp'>): void {
    const fullEvent: GameEvent = {
      ...event,
      tick: this.currentTick,
      timestamp: Date.now(),
    };

    this.dispatchEvent(fullEvent);
    this.eventHistory.push(fullEvent);
  }

  flush(): void {
    if (this.eventQueue.length === 0) return;

    // Sort by priority
    this.eventQueue.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    // Dispatch all queued events
    const events = this.eventQueue.map((q) => q.event);
    this.eventQueue = [];

    for (const event of events) {
      this.dispatchEvent(event);
      this.eventHistory.push(event);
    }
  }

  getHistory(since?: Tick): ReadonlyArray<GameEvent> {
    if (since === undefined) {
      return this.eventHistory;
    }
    return this.eventHistory.filter((e) => e.tick >= since);
  }

  pruneHistory(olderThan: Tick): void {
    this.eventHistory = this.eventHistory.filter((e) => e.tick >= olderThan);
  }

  getCurrentTick(): Tick {
    return this.currentTick;
  }

  setCurrentTick(tick: Tick): void {
    this.currentTick = tick;
  }

  private dispatchEvent(event: GameEvent): void {
    const subscriberIds = this.typeIndex.get(event.type) ?? new Set();

    // Get subscriptions and sort by priority
    const subs = Array.from(subscriberIds)
      .map((id) => this.subscriptions.get(id))
      .filter((sub): sub is Subscription => sub !== undefined)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    for (const sub of subs) {
      try {
        sub.handler(event);
      } catch (error) {
        console.error(
          `Error in event handler for ${event.type}:`,
          error
        );
      }
    }
  }
}
