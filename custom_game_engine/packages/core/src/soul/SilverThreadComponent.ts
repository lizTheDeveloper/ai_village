/**
 * SilverThreadComponent - The soul's append-only personal timeline
 *
 * Like Bill Murray in Groundhog Day, the soul remembers every experience
 * even when the universe "resets" via save/load. The Silver Thread is
 * append-only and continues across all universe transitions.
 */

import { ComponentType } from '../types/ComponentType.js';

/**
 * How a soul entered a thread segment (universe)
 */
export type SegmentEntry =
  | { type: 'soul_created' }
  | { type: 'incarnated'; parent_souls?: string[] }
  | { type: 'universe_fork'; from_universe: string; snapshot_id: string }
  | { type: 'realm_transition'; from_realm: string };

/**
 * How a soul exited a thread segment
 */
export type SegmentExit =
  | { type: 'died' }
  | { type: 'universe_fork'; to_universe: string; snapshot_id: string }
  | { type: 'realm_transition'; to_realm: string }
  | { type: 'soul_merged'; into_soul: string };

/**
 * A segment of the soul's journey in a specific universe
 */
export interface ThreadSegment {
  // Segment ID (for reference)
  segment_id: string;

  // Universe info
  universe_id: string;
  universe_tick_start: number;
  universe_tick_end: number | null;  // null if current

  // Personal time range
  personal_tick_start: number;
  personal_tick_end: number | null;

  // How we entered this segment
  entered_via: SegmentEntry;

  // How we exited (if not current)
  exited_via?: SegmentExit;
}

/**
 * Types of significant events recorded on the silver thread
 */
export type SignificantEventType =
  | 'soul_created'
  | 'incarnated'
  | 'died'
  | 'universe_fork'
  | 'snapshot_waypoint'
  | 'lesson_learned'
  | 'plot_stage_change'
  | 'meaningful_choice'
  | 'first_time_event'
  | 'major_milestone'
  | 'wisdom_threshold';

/**
 * A significant event on the soul's timeline
 *
 * ONLY significant events are recorded - not hunger, routine actions, etc.
 */
export interface SignificantEvent {
  personal_tick: number;
  universe_id: string;
  universe_tick: number;
  type: SignificantEventType;
  details: Record<string, any>;
}

/**
 * Silver Thread Component
 *
 * The soul's append-only personal timeline. Continues across incarnations
 * and universe forks.
 */
export interface SilverThreadComponent {
  type: ComponentType.SilverThread;

  // Thread segments (one per universe visited)
  segments: ThreadSegment[];

  // Significant events (sparse, curated)
  events: SignificantEvent[];

  // Current position (always at end)
  head: {
    segment_index: number;
    personal_tick: number;
    universe_id: string;
    universe_tick: number;
  };

  // Totals
  totals: {
    personal_ticks: number;
    universes_visited: number;
    incarnations: number;
    forks_experienced: number;
  };
}

/**
 * Create a new SilverThreadComponent
 */
export function createSilverThreadComponent(params: {
  soul_id: string;
  universe_id: string;
  universe_tick: number;
  created_at: number;  // multiverse absolute tick
}): SilverThreadComponent {
  const initial_segment: ThreadSegment = {
    segment_id: `segment_${params.soul_id}_0`,
    universe_id: params.universe_id,
    universe_tick_start: params.universe_tick,
    universe_tick_end: null,
    personal_tick_start: 0,
    personal_tick_end: null,
    entered_via: { type: 'soul_created' },
  };

  const creation_event: SignificantEvent = {
    personal_tick: 0,
    universe_id: params.universe_id,
    universe_tick: params.universe_tick,
    type: 'soul_created',
    details: {
      soul_id: params.soul_id,
      created_at_absolute: params.created_at,
    },
  };

  return {
    type: ComponentType.SilverThread,
    segments: [initial_segment],
    events: [creation_event],
    head: {
      segment_index: 0,
      personal_tick: 0,
      universe_id: params.universe_id,
      universe_tick: params.universe_tick,
    },
    totals: {
      personal_ticks: 0,
      universes_visited: 1,
      incarnations: 0,
      forks_experienced: 0,
    },
  };
}

/**
 * Add a significant event to the silver thread
 */
export function addSignificantEvent(
  thread: SilverThreadComponent,
  event: {
    type: SignificantEventType;
    details: Record<string, any>;
  }
): void {
  thread.events.push({
    personal_tick: thread.head.personal_tick,
    universe_id: thread.head.universe_id,
    universe_tick: thread.head.universe_tick,
    type: event.type,
    details: event.details,
  });
}

/**
 * Increment personal tick (called each simulation tick)
 */
export function incrementPersonalTick(thread: SilverThreadComponent, universe_tick: number): void {
  thread.head.personal_tick++;
  thread.head.universe_tick = universe_tick;
  thread.totals.personal_ticks = thread.head.personal_tick;

  // Update current segment
  const current_segment = thread.segments[thread.head.segment_index];
  if (current_segment && current_segment.personal_tick_end === null) {
    current_segment.personal_tick_end = thread.head.personal_tick;
  }
}

/**
 * Close current segment and open new one (for universe fork)
 */
export function forkToNewUniverse(
  thread: SilverThreadComponent,
  params: {
    to_universe_id: string;
    to_universe_tick: number;
    snapshot_id: string;
  }
): void {
  // Close current segment
  const current_segment = thread.segments[thread.head.segment_index];
  if (current_segment) {
    current_segment.universe_tick_end = thread.head.universe_tick;
    current_segment.personal_tick_end = thread.head.personal_tick;
    current_segment.exited_via = {
      type: 'universe_fork',
      to_universe: params.to_universe_id,
      snapshot_id: params.snapshot_id,
    };
  }

  // Increment personal tick (fork transition)
  const new_personal_tick = thread.head.personal_tick + 1;

  // Create new segment
  const new_segment: ThreadSegment = {
    segment_id: `segment_${Date.now()}_${thread.segments.length}`,
    universe_id: params.to_universe_id,
    universe_tick_start: params.to_universe_tick,
    universe_tick_end: null,
    personal_tick_start: new_personal_tick,
    personal_tick_end: null,
    entered_via: {
      type: 'universe_fork',
      from_universe: thread.head.universe_id,
      snapshot_id: params.snapshot_id,
    },
  };

  thread.segments.push(new_segment);

  // Update head
  thread.head = {
    segment_index: thread.segments.length - 1,
    personal_tick: new_personal_tick,
    universe_id: params.to_universe_id,
    universe_tick: params.to_universe_tick,
  };

  // Update totals
  thread.totals.personal_ticks = new_personal_tick;
  thread.totals.universes_visited++;
  thread.totals.forks_experienced++;

  // Record fork event
  addSignificantEvent(thread, {
    type: 'universe_fork',
    details: {
      from_universe: current_segment?.universe_id,
      to_universe: params.to_universe_id,
      snapshot_id: params.snapshot_id,
    },
  });
}

/**
 * Get all events of a specific type
 */
export function getEventsByType(
  thread: SilverThreadComponent,
  type: SignificantEventType
): SignificantEvent[] {
  return thread.events.filter(e => e.type === type);
}

/**
 * Get events in a personal tick range
 */
export function getEventsInRange(
  thread: SilverThreadComponent,
  start_tick: number,
  end_tick: number
): SignificantEvent[] {
  return thread.events.filter(
    e => e.personal_tick >= start_tick && e.personal_tick <= end_tick
  );
}

/**
 * Get the current segment
 */
export function getCurrentSegment(thread: SilverThreadComponent): ThreadSegment {
  const segment = thread.segments[thread.head.segment_index];
  if (!segment) {
    throw new Error(`[SilverThread] Current segment at index ${thread.head.segment_index} not found`);
  }
  return segment;
}

/**
 * Record a snapshot waypoint
 */
export function recordSnapshotWaypoint(
  thread: SilverThreadComponent,
  snapshot_id: string
): void {
  addSignificantEvent(thread, {
    type: 'snapshot_waypoint',
    details: { snapshot_id },
  });
}
