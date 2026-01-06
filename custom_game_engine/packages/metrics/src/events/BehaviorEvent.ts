import { MetricEvent } from './MetricEvent.js';

/**
 * Event emitted when an agent changes behavior.
 *
 * Tracks behavior transitions, agent state, and social context to enable
 * analysis of behavior patterns and novelty detection.
 *
 * @remarks
 * - Emitted by AISystem when agent behavior changes
 * - `isNovel` indicates whether this behavior transition is new for this agent
 * - `nearbyAgents` captures social influence on behavior changes
 *
 * @example
 * ```typescript
 * const behaviorChange: BehaviorEvent = {
 *   type: 'behavior:change',
 *   timestamp: Date.now(),
 *   simulationTime: 5400,
 *   tick: 1500,
 *   agentId: 'agent-007',
 *   behavior: 'gathering',
 *   previousBehavior: 'wandering',
 *   location: { x: 120, y: 180 },
 *   health: 87,
 *   energy: 65,
 *   nearbyAgents: ['agent-008', 'agent-009'],
 *   isNovel: true
 * };
 * ```
 */
export interface BehaviorEvent extends MetricEvent {
  /**
   * Event type (typically 'behavior:change')
   */
  readonly type: string;

  /**
   * ID of the agent whose behavior changed
   */
  readonly agentId: string;

  /**
   * New behavior the agent is transitioning to
   */
  readonly behavior: string;

  /**
   * Previous behavior before the transition
   */
  readonly previousBehavior: string;

  /**
   * Location of the agent when behavior changed
   */
  readonly location: {
    readonly x: number;
    readonly y: number;
  };

  /**
   * Current health level of the agent (0-100)
   */
  readonly health: number;

  /**
   * Current energy level of the agent (0-100)
   */
  readonly energy: number;

  /**
   * IDs of agents within proximity at time of behavior change
   * (empty array if no nearby agents)
   */
  readonly nearbyAgents: readonly string[];

  /**
   * Whether this behavior transition is novel (first time) for this agent
   */
  readonly isNovel: boolean;
}
