import type { Component } from '../ecs/Component.js';

/**
 * DivergenceEvent - Record of significant timeline divergence
 */
export interface DivergenceEvent {
  /** When divergence occurred (universe local tick) */
  tick: string; // Serialized bigint

  /** Type of event causing divergence */
  eventType: string;

  /** Human-readable description */
  description: string;

  /** Impact on divergence score (0-1) */
  divergenceImpact: number;
}

/**
 * DivergenceTrackingComponent - Tracks divergence between fork and parent universe
 *
 * Attached to universe metadata entity to track how different a forked universe
 * has become from its parent over time.
 *
 * @see DivergenceTrackingSystem - Calculates divergence scores
 * @see CanonEventSystem - Manages timeline convergence
 */
export interface DivergenceTrackingComponent extends Component {
  type: 'divergence_tracking';

  /**
   * Overall divergence score (0-1)
   * 0 = identical to parent
   * 1 = completely different
   */
  divergenceScore: number;

  /**
   * Major events that contributed to divergence
   */
  majorDifferences: DivergenceEvent[];

  /**
   * Last tick when divergence was recalculated
   */
  lastDivergenceUpdate: string; // Serialized bigint
}

/**
 * Standard divergence impact values for common events
 * Higher impact = greater divergence from parent timeline
 */
export const DIVERGENCE_EVENT_IMPACTS = {
  // High impact (0.3-1.0) - Major timeline changes
  agent_death: 0.5,              // Agent dies in fork but not parent
  agent_birth: 0.4,              // New agent born in fork
  building_destroyed: 0.6,       // Major building destroyed
  war_declaration: 0.8,          // Fork goes to war, parent doesn't
  deity_emergence: 1.0,          // God emerges in fork, huge divergence

  // Medium impact (0.1-0.3) - Significant but not critical
  building_created: 0.2,         // New building in fork
  marriage: 0.15,                // Different marriages
  skill_mastery: 0.1,            // Agent masters skill in fork
  trade_agreement: 0.2,          // Different trade deals

  // Low impact (0-0.1) - Minor differences
  item_crafted: 0.02,            // Minor inventory differences
  agent_moved: 0.01,             // Agent in different location
  mood_change: 0.005,            // Agent has different mood
} as const;
