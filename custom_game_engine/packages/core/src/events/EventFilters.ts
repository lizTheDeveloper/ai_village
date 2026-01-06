/**
 * Type-safe event filtering utilities for tests and event processing
 *
 * Provides strongly-typed filter functions to replace string-based `.filter(e => e.type === 'X')` patterns.
 */

import type { GameEvent } from './GameEvent.js';
import type { EventType } from './EventMap.js';

/**
 * Type guard for checking if event matches a specific type
 *
 * @example
 * const buildingEvents = events.filter(isEventType('building:complete'));
 * // buildingEvents is now GameEvent<'building:complete'>[]
 */
export function isEventType<T extends EventType>(
  eventType: T
): (event: GameEvent) => event is GameEvent<T> {
  return (event: GameEvent): event is GameEvent<T> => event.type === eventType;
}

/**
 * Filter events by type - returns strongly typed array
 *
 * @example
 * const deaths = filterEventsByType(allEvents, 'agent:death');
 * // deaths is GameEvent<'agent:death'>[]
 */
export function filterEventsByType<T extends EventType>(
  events: readonly GameEvent[],
  eventType: T
): GameEvent<T>[] {
  return events.filter(isEventType(eventType));
}

/**
 * Filter events by multiple types
 *
 * @example
 * const sleepEvents = filterEventsByTypes(events, ['agent:sleep_start', 'agent:woke']);
 */
export function filterEventsByTypes<T extends EventType>(
  events: readonly GameEvent[],
  eventTypes: readonly T[]
): GameEvent<T>[] {
  const typeSet = new Set(eventTypes);
  return events.filter((e): e is GameEvent<T> => typeSet.has(e.type as T));
}

/**
 * Find first event of a specific type
 *
 * @example
 * const firstDeath = findEventByType(events, 'agent:death');
 */
export function findEventByType<T extends EventType>(
  events: readonly GameEvent[],
  eventType: T
): GameEvent<T> | undefined {
  return events.find(isEventType(eventType));
}

/**
 * Check if events array contains an event of specific type
 *
 * @example
 * if (hasEventType(events, 'building:complete')) {
 *   console.log('Building completed!');
 * }
 */
export function hasEventType<T extends EventType>(
  events: readonly GameEvent[],
  eventType: T
): boolean {
  return events.some(isEventType(eventType));
}

/**
 * Count events of a specific type
 *
 * @example
 * const deathCount = countEventsByType(events, 'agent:death');
 */
export function countEventsByType<T extends EventType>(
  events: readonly GameEvent[],
  eventType: T
): number {
  return events.filter(isEventType(eventType)).length;
}

// === Specific event type guards for common patterns ===

/**
 * Type guard for building events
 */
export function isBuildingEvent(event: GameEvent): event is GameEvent<'building:complete'> {
  return event.type === 'building:complete';
}

/**
 * Type guard for agent starved events
 */
export function isAgentStarvedEvent(event: GameEvent): event is GameEvent<'agent:starved'> {
  return event.type === 'agent:starved';
}

/**
 * Type guard for sleep start events
 */
export function isSleepStartEvent(event: GameEvent): event is GameEvent<'agent:sleep_start'> {
  return event.type === 'agent:sleep_start';
}

/**
 * Type guard for woke events
 */
export function isWokeEvent(event: GameEvent): event is GameEvent<'agent:woke'> {
  return event.type === 'agent:woke';
}
