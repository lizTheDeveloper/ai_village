/**
 * EventCoalescer - Deduplicates and coalesces events before dispatch.
 *
 * Implements four coalescing strategies:
 * 1. Deduplicate: Remove exact duplicates (agent:idle, agent:arrived)
 * 2. Last-value: Only keep final state (position_changed, health_changed)
 * 3. Accumulate: Sum field values (resource_gathered, damage_dealt)
 * 4. None: Keep all events (action_started, death, birth)
 *
 * Expected performance impact:
 * - Position-heavy workloads: 40-60% reduction
 * - Combat-heavy workloads: 20-30% reduction
 * - Overall average: 30-40% reduction
 */

import type { GameEvent } from './GameEvent.js';
import type { EventType } from './EventMap.js';

/**
 * Strategy for coalescing events of a specific type.
 */
export interface CoalescingStrategy {
  /** Strategy type */
  type: 'deduplicate' | 'last-value' | 'accumulate' | 'none';

  /** For accumulate strategy: which fields to sum */
  accumulateFields?: string[];
}

/**
 * Coalesces events using configured strategies to reduce redundant processing.
 */
export class EventCoalescer {
  private strategies = new Map<EventType, CoalescingStrategy>();

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize default coalescing strategies for common event types.
   */
  private initializeStrategies(): void {
    // Deduplication (exact duplicates) - state events where only presence matters
    this.strategies.set('agent:idle', { type: 'deduplicate' });
    this.strategies.set('agent:sleeping', { type: 'deduplicate' });
    this.strategies.set('navigation:arrived', { type: 'deduplicate' });
    this.strategies.set('agent:meditation_started', { type: 'deduplicate' });

    // Last-value (only final state matters) - state changes
    this.strategies.set('behavior:change', { type: 'last-value' });
    this.strategies.set('time:phase_changed', { type: 'last-value' });
    this.strategies.set('spatial:snapshot', { type: 'last-value' });
    this.strategies.set('need:critical', { type: 'last-value' });

    // Accumulate (sum values) - quantitative events
    this.strategies.set('agent:xp_gained', {
      type: 'accumulate',
      accumulateFields: ['xp'],
    });

    // No coalescing for critical lifecycle events
    // action_started, action_completed, death, birth, etc. use default 'none'
  }

  /**
   * Set a custom coalescing strategy for an event type.
   *
   * @param eventType - Event type to configure
   * @param strategy - Coalescing strategy
   */
  setStrategy(eventType: EventType, strategy: CoalescingStrategy): void {
    this.strategies.set(eventType, strategy);
  }

  /**
   * Get the strategy for an event type.
   *
   * @param eventType - Event type
   * @returns Strategy or default 'none'
   */
  getStrategy(eventType: EventType): CoalescingStrategy {
    return this.strategies.get(eventType) || { type: 'none' };
  }

  /**
   * Coalesce events using configured strategies.
   *
   * @param events - Events to coalesce
   * @returns Coalesced events array
   */
  coalesce(events: readonly GameEvent[]): GameEvent[] {
    if (events.length === 0) return [];

    // Group events by type
    const eventsByType = new Map<EventType, GameEvent[]>();
    for (const event of events) {
      const typeEvents = eventsByType.get(event.type) || [];
      typeEvents.push(event);
      eventsByType.set(event.type, typeEvents);
    }

    const coalesced: GameEvent[] = [];

    for (const [type, typeEvents] of eventsByType) {
      const strategy = this.getStrategy(type);

      switch (strategy.type) {
        case 'deduplicate':
          coalesced.push(...this.deduplicate(typeEvents));
          break;
        case 'last-value':
          coalesced.push(...this.lastValue(typeEvents));
          break;
        case 'accumulate':
          coalesced.push(
            ...this.accumulate(typeEvents, strategy.accumulateFields)
          );
          break;
        case 'none':
        default:
          coalesced.push(...typeEvents);
          break;
      }
    }

    return coalesced;
  }

  /**
   * Remove exact duplicate events (same type, source, and data).
   *
   * @param events - Events to deduplicate
   * @returns Deduplicated events
   */
  private deduplicate(events: GameEvent[]): GameEvent[] {
    const seen = new Map<string, GameEvent>();

    for (const event of events) {
      const key = this.createEventKey(event);
      if (!seen.has(key)) {
        seen.set(key, event);
      }
      // Else: duplicate, skip
    }

    return Array.from(seen.values());
  }

  /**
   * Keep only the last event per source (only final state matters).
   *
   * @param events - Events to coalesce
   * @returns Last event per source
   */
  private lastValue(events: GameEvent[]): GameEvent[] {
    // Group by source (entity ID)
    const bySource = new Map<string, GameEvent>();

    for (const event of events) {
      bySource.set(event.source, event); // Overwrites previous
    }

    return Array.from(bySource.values());
  }

  /**
   * Accumulate field values across events from the same source.
   *
   * @param events - Events to accumulate
   * @param fields - Fields to sum
   * @returns Accumulated events
   */
  private accumulate(
    events: GameEvent[],
    fields?: string[]
  ): GameEvent[] {
    if (!fields || fields.length === 0) {
      // No accumulation fields specified, treat as deduplicate
      return this.deduplicate(events);
    }

    // Group by source and accumulate fields
    const bySource = new Map<string, GameEvent>();

    for (const event of events) {
      const existing = bySource.get(event.source);

      if (!existing) {
        // First event for this source - deep copy to avoid mutation
        bySource.set(event.source, {
          ...event,
          data: { ...event.data },
        });
      } else {
        // Accumulate field values
        for (const field of fields) {
          if (field in event.data && field in existing.data) {
            const existingData = existing.data as Record<string, unknown>;
            const eventData = event.data as Record<string, unknown>;
            const existingValue = existingData[field];
            const eventValue = eventData[field];

            if (typeof existingValue === 'number' && typeof eventValue === 'number') {
              existingData[field] = existingValue + eventValue;
            }
          }
        }
      }
    }

    return Array.from(bySource.values());
  }

  /**
   * Create a unique key for deduplication.
   *
   * @param event - Event to create key for
   * @returns Unique key string
   */
  private createEventKey(event: GameEvent): string {
    // Create unique key: type:source:data
    return `${event.type}:${event.source}:${JSON.stringify(event.data)}`;
  }

  /**
   * Get statistics about coalescing effectiveness.
   *
   * @param before - Number of events before coalescing
   * @param after - Number of events after coalescing
   * @returns Statistics
   */
  getStats(
    before: number,
    after: number
  ): {
    eventsIn: number;
    eventsOut: number;
    eventsSkipped: number;
    reductionPercent: number;
  } {
    return {
      eventsIn: before,
      eventsOut: after,
      eventsSkipped: before - after,
      reductionPercent: before > 0 ? ((before - after) / before) * 100 : 0,
    };
  }
}
