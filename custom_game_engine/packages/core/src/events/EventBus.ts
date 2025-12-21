import type {
  GameEvent,
  EventHandler,
  EventPriority,
  Unsubscribe,
} from './GameEvent.js';
import type { EventType, Tick } from '../types.js';

/**
 * Central event bus for system communication.
 */
export interface EventBus {
  /** Subscribe to one or more event types */
  subscribe(
    eventType: EventType | EventType[],
    handler: EventHandler,
    priority?: EventPriority
  ): Unsubscribe;

  /** Emit an event (queued for end of tick by default) */
  emit(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

  /** Emit immediately (use sparingly) */
  emitImmediate(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

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

  subscribe(
    eventType: EventType | EventType[],
    handler: EventHandler,
    priority: EventPriority = 'normal'
  ): Unsubscribe {
    const id = this.nextSubscriptionId++;
    const types = Array.isArray(eventType) ? eventType : [eventType];
    const typeSet = new Set(types);

    const subscription: Subscription = {
      id,
      eventTypes: typeSet,
      handler,
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
    };
  }

  emit(event: Omit<GameEvent, 'tick' | 'timestamp'>): void {
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

  emitImmediate(event: Omit<GameEvent, 'tick' | 'timestamp'>): void {
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
