import { MetricEvent } from './MetricEvent.js';

/**
 * Type of resource action being performed.
 */
export type ResourceAction = 'consume' | 'gather' | 'share';

/**
 * Event emitted when an agent performs a resource-related action.
 *
 * Tracks resource consumption, gathering, and sharing behaviors to enable
 * analysis of resource flow, cooperation, and economic patterns.
 *
 * @remarks
 * - Emitted by NeedsSystem (consume), ResourceGatheringSystem (gather), or sharing systems
 * - `recipientId` is only required for 'share' actions (optional for others)
 * - Used to track resource distribution, cooperation patterns, and agent sustainability
 *
 * @example
 * ```typescript
 * // Consumption
 * const consumeEvent: ResourceEvent = {
 *   type: 'resource:consume',
 *   timestamp: Date.now(),
 *   simulationTime: 4500,
 *   tick: 1250,
 *   agentId: 'agent-hungry',
 *   action: 'consume',
 *   resourceType: 'berries',
 *   amount: 10,
 *   location: { x: 75, y: 125 }
 * };
 *
 * // Gathering
 * const gatherEvent: ResourceEvent = {
 *   type: 'resource:gather',
 *   timestamp: Date.now(),
 *   simulationTime: 6000,
 *   tick: 1700,
 *   agentId: 'agent-gatherer',
 *   action: 'gather',
 *   resourceType: 'wood',
 *   amount: 5,
 *   location: { x: 200, y: 150 }
 * };
 *
 * // Sharing
 * const shareEvent: ResourceEvent = {
 *   type: 'resource:share',
 *   timestamp: Date.now(),
 *   simulationTime: 7200,
 *   tick: 2000,
 *   agentId: 'agent-sharer',
 *   action: 'share',
 *   resourceType: 'berries',
 *   amount: 3,
 *   location: { x: 100, y: 100 },
 *   recipientId: 'agent-receiver'
 * };
 * ```
 */
export interface ResourceEvent extends MetricEvent {
  /**
   * Event type (e.g., 'resource:consume', 'resource:gather', 'resource:share')
   */
  readonly type: string;

  /**
   * ID of the agent performing the action
   */
  readonly agentId: string;

  /**
   * Type of resource action being performed
   */
  readonly action: ResourceAction;

  /**
   * Type of resource involved (e.g., 'berries', 'wood', 'seeds', 'water')
   */
  readonly resourceType: string;

  /**
   * Amount of resource involved in the action
   */
  readonly amount: number;

  /**
   * Location where the action occurred
   */
  readonly location: {
    readonly x: number;
    readonly y: number;
  };

  /**
   * ID of the recipient agent (for 'share' actions)
   * Optional - only applicable when action is 'share'
   */
  readonly recipientId?: string;
}
