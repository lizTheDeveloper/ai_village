/**
 * Simple EventBus for tests and basic usage
 */
export class EventBus {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();
  private queue: Array<{ type: string; data?: any; [key: string]: any }> = [];

  /**
   * Subscribe to an event (alias for on())
   */
  subscribe(eventType: string, handler: (event: any) => void): void {
    this.on(eventType, handler);
  }

  /**
   * Subscribe to an event
   */
  on(eventType: string, handler: (data: any) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, handler: (data: any) => void): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Emit an event
   * Supports both signatures:
   * - emit(eventType: string, data: any) - legacy test format
   * - emit(event: { type: string, data?: any, ... }) - production format
   */
  emit(eventTypeOrEvent: string | { type: string; [key: string]: any }, data?: any): void {
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
