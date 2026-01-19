import type { Component } from '../ecs/Component.js';

/**
 * CanonEventAlteration - How a canon event was altered in this timeline
 */
export interface CanonEventAlteration {
  /** When alteration occurred */
  forkTick: string; // Serialized bigint

  /** What was supposed to happen */
  originalOutcome: string;

  /** What actually happened */
  actualOutcome: string;

  /** How much this altered the timeline (0-1) */
  divergenceImpact: number;
}

/**
 * CanonEventConvergence - Timeline trying to "fix" itself
 */
export interface CanonEventConvergence {
  /** Is timeline actively trying to converge back to canon? */
  attempting: boolean;

  /** How strong is the pull back to canon? (0-1) */
  convergenceStrength: number;

  /** When timeline might re-align */
  estimatedConvergenceTick: string; // Serialized bigint
}

/**
 * CanonEventComponent - Tracks canon events (narrative anchors that resist change)
 *
 * Canon events are events with high narrative weight that are "resistant to change"
 * across timelines. They represent narrative inevitability - events that tend to
 * happen even when timelines diverge.
 *
 * Properties:
 * - High Probability: Event has >90% chance of occurring
 * - Causal Convergence: Multiple paths lead to same outcome
 * - Narrative Weight: Event is thematically significant
 * - Timeline Anchor: Event stabilizes surrounding timeline
 *
 * Examples:
 * - Agent Alice always becomes mayor (destiny)
 * - Village always builds Temple of Stars (architectural inevitability)
 * - First Contact with aliens always happens around day 1000 (narrative anchor)
 *
 * @see CanonEventSystem - Manages canon event resistance and convergence
 * @see DivergenceTrackingSystem - Tracks how canon alterations affect divergence
 */
export interface CanonEventComponent extends Component {
  type: 'canon_event';

  /** When event occurs (in parent timeline) */
  tick: string; // Serialized bigint

  /** Type of event */
  eventType: string;

  /** Description of what should happen */
  description: string;

  /** Resistance to change (0-1)
   * 0 = easily changed
   * 1 = nearly impossible to change
   */
  resistanceStrength: number;

  /** Did this fork alter the canon event? */
  wasAltered: boolean;

  /** If altered, details of how */
  alteration?: CanonEventAlteration;

  /** Convergence pressure */
  convergence?: CanonEventConvergence;
}
