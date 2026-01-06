import { MetricEvent } from './MetricEvent.js';

/**
 * Snapshot of a single agent's spatial and behavioral state.
 */
export interface AgentSnapshot {
  /**
   * Agent's unique identifier
   */
  readonly id: string;

  /**
   * Agent's current position in the world
   */
  readonly position: {
    readonly x: number;
    readonly y: number;
  };

  /**
   * Agent's current behavior
   */
  readonly behavior: string;

  /**
   * Agent's current health level (0-100)
   */
  readonly health: number;
}

/**
 * Periodic snapshot of spatial distribution and state of all agents.
 *
 * Captures a complete picture of agent positions, behaviors, and health
 * at a specific moment in time. Used for spatial analysis, clustering
 * detection, and behavior pattern analysis.
 *
 * @remarks
 * - Emitted periodically by World or a dedicated snapshot system
 * - Can have empty `agents` array if no agents exist (e.g., at simulation start)
 * - Used to analyze spatial patterns, clustering, and emergent behaviors
 *
 * @example
 * ```typescript
 * const snapshot: SpatialSnapshot = {
 *   type: 'spatial:snapshot',
 *   timestamp: Date.now(),
 *   simulationTime: 10800,
 *   tick: 3000,
 *   agents: [
 *     {
 *       id: 'agent-001',
 *       position: { x: 100, y: 200 },
 *       behavior: 'gathering',
 *       health: 90
 *     },
 *     {
 *       id: 'agent-002',
 *       position: { x: 150, y: 250 },
 *       behavior: 'wandering',
 *       health: 85
 *     }
 *   ]
 * };
 * ```
 */
export interface SpatialSnapshot extends MetricEvent {
  /**
   * Event type (typically 'spatial:snapshot')
   */
  readonly type: string;

  /**
   * Array of agent snapshots (empty if no agents exist)
   */
  readonly agents: readonly AgentSnapshot[];
}
