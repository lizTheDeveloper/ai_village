/**
 * CanonEventDetector - Identifies significant moments worthy of permanent checkpoints
 *
 * Canon events are major moments that should be preserved forever in the timeline:
 * - Deaths, births, marriages
 * - First achievements (first building, first harvest, etc.)
 * - Peak moments (record highs, catastrophes)
 * - Deity emergence, major beliefs
 *
 * These checkpoints are kept even after the 90-day summarization period.
 */

import type { World } from '../ecs/World.js';

export interface CanonEvent {
  day: number;
  tick: number;
  type: CanonEventType;
  title: string;          // Short title: "Alice's Death", "First Harvest"
  description: string;    // Details for tooltip/display
  entities: string[];     // Related entity IDs
  importance: number;     // 1-10, higher = more important
}

export type CanonEventType =
  | 'death'
  | 'birth'
  | 'marriage'
  | 'first_achievement'
  | 'record_high'
  | 'catastrophe'
  | 'deity_emergence'
  | 'major_discovery'
  | 'war_event'
  | 'cultural_milestone';

export class CanonEventDetector {
  private canonEvents: CanonEvent[] = [];
  private firstAchievements = new Set<string>(); // Track "first X" events

  /** Maximum canon events to retain in memory (oldest are pruned) */
  private static readonly MAX_EVENTS = 1000;

  constructor() {}

  /**
   * Start listening to world events to detect canon moments.
   * Note: Canon events are detected via direct method calls (recordDeath, recordBirth, etc.)
   * rather than event subscriptions, to avoid requiring all event types to be defined.
   *
   * Systems should call the record* methods directly when canon events occur.
   */
  attachToWorld(_world: World): void {
    // For now, we rely on direct calls from systems
    // Future: Add event subscriptions here when event types are fully defined
  }

  /**
   * Get all detected canon events.
   */
  getCanonEvents(): ReadonlyArray<CanonEvent> {
    return this.canonEvents;
  }

  /**
   * Get canon events for a specific day.
   */
  getEventsForDay(day: number): CanonEvent[] {
    return this.canonEvents.filter(e => e.day === day);
  }

  /**
   * Check if a day has any canon events.
   */
  hasCanonEvent(day: number): boolean {
    return this.canonEvents.some(e => e.day === day);
  }

  /**
   * Clear all detected events (e.g., on world reset).
   */
  clear(): void {
    this.canonEvents = [];
    this.firstAchievements.clear();
  }

  // Public recording methods for systems to call directly

  /**
   * Add a canon event and prune if over limit.
   */
  private addEvent(event: CanonEvent): void {
    this.canonEvents.push(event);
    // Prune oldest events to prevent memory leak
    if (this.canonEvents.length > CanonEventDetector.MAX_EVENTS) {
      this.canonEvents.shift();
    }
  }

  /**
   * Record an agent death as a canon event.
   */
  recordDeath(agentId: string, agentName: string, cause: string, day: number, tick: number): void {
    this.addEvent({
      day,
      tick,
      type: 'death',
      title: `${agentName}'s Death`,
      description: `${agentName} died from ${cause}`,
      entities: [agentId],
      importance: 7,
    });
  }

  // Additional public recording methods can be added as needed
  // (use this.addEvent() to ensure bounds are enforced):
  // - recordBirth()
  // - recordMarriage()
  // - recordFirstAchievement()
  // - recordDeityEmergence()
  // - recordDiscovery()
  // etc.
}

// Singleton instance
export const canonEventDetector = new CanonEventDetector();
