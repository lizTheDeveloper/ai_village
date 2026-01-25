/**
 * Event data structure
 */
export interface GameEvent {
  type: string;
  source?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Event handler type
 */
export type EventHandler = (event: GameEvent) => void;

/**
 * Simple EventBus for tests and basic usage
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private queue: Array<GameEvent> = [];

  /**
   * Subscribe to an event (alias for on())
   * @returns Unsubscribe function
   */
  subscribe(eventType: string, handler: EventHandler): () => void {
    this.on(eventType, handler);
    return () => this.off(eventType, handler);
  }

  /**
   * Subscribe to an event
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Emit an event
   * Supports both signatures:
   * - emit(eventType: string, data: Record<string, unknown>) - legacy test format
   * - emit(event: GameEvent) - production format
   */
  emit(eventTypeOrEvent: string | GameEvent, data?: Record<string, unknown>): void {
    if (typeof eventTypeOrEvent === 'string') {
      // Legacy format: emit('event:type', { data })
      this.queue.push({ type: eventTypeOrEvent, data });
    } else {
      // Production format: emit({ type: 'event:type', data: { ... }, source: '...' })
      this.queue.push(eventTypeOrEvent);
    }
  }

  /**
   * Process all queued events (called by system after handling)
   */
  flush(): void {
    const events = [...this.queue];
    this.queue = [];

    for (const event of events) {
      const handlers = this.handlers.get(event.type);
      if (handlers) {
        for (const handler of handlers) {
          try {
            // Pass full event object to match production EventBus behavior
            handler(event);
          } catch (error) {
            console.error(`Error in event handler for ${event.type}:`, error);
          }
        }
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.queue = [];
  }
}
