import { MetricEvent } from './MetricEvent.js';

/**
 * Context information for an interaction between two agents.
 *
 * Captures the state of both agents and environmental conditions
 * at the time of interaction.
 */
export interface InteractionContext {
  /**
   * Current behavior of agent1
   */
  readonly agent1Behavior: string;

  /**
   * Current behavior of agent2
   */
  readonly agent2Behavior: string;

  /**
   * Health level of agent1 (0-100)
   */
  readonly agent1Health: number;

  /**
   * Health level of agent2 (0-100)
   */
  readonly agent2Health: number;

  /**
   * Location where the interaction occurred
   */
  readonly location: {
    readonly x: number;
    readonly y: number;
  };

  /**
   * Optional weather condition at time of interaction
   */
  readonly weather?: string;
}

/**
 * Event emitted when two agents interact within proximity.
 *
 * Tracks social interactions between agents, including their behaviors,
 * health states, and environmental context.
 *
 * @remarks
 * Emitted by systems that detect agent proximity and social interactions.
 * Used to build social network graphs and analyze interaction patterns.
 *
 * @example
 * ```typescript
 * const interaction: InteractionEvent = {
 *   type: 'interaction:proximity',
 *   timestamp: Date.now(),
 *   simulationTime: 7200,
 *   tick: 2000,
 *   agent1: 'agent-001',
 *   agent2: 'agent-002',
 *   distance: 5.5,
 *   duration: 120,
 *   context: {
 *     agent1Behavior: 'gathering',
 *     agent2Behavior: 'wandering',
 *     agent1Health: 85,
 *     agent2Health: 92,
 *     location: { x: 100, y: 200 },
 *     weather: 'sunny'
 *   }
 * };
 * ```
 */
export interface InteractionEvent extends MetricEvent {
  /**
   * Event type (typically 'interaction:proximity')
   */
  readonly type: string;

  /**
   * ID of the first agent in the interaction
   */
  readonly agent1: string;

  /**
   * ID of the second agent in the interaction
   */
  readonly agent2: string;

  /**
   * Distance between agents at time of interaction (in game units)
   */
  readonly distance: number;

  /**
   * Duration of the interaction in simulation seconds
   */
  readonly duration: number;

  /**
   * Contextual information about the interaction
   */
  readonly context: InteractionContext;
}
