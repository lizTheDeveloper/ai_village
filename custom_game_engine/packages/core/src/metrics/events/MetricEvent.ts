/**
 * Base interface for all metric events in the simulation.
 *
 * All metric events extend this interface to provide consistent
 * temporal tracking across the system.
 *
 * @remarks
 * - `type`: Identifies the specific event type (e.g., 'interaction:proximity', 'behavior:change')
 * - `timestamp`: Real-world timestamp when the event was created (milliseconds since epoch)
 * - `simulationTime`: In-game simulation time in seconds
 * - `tick`: Game tick number when the event occurred
 *
 * @example
 * ```typescript
 * const event: MetricEvent = {
 *   type: 'custom:event',
 *   timestamp: Date.now(),
 *   simulationTime: 3600,
 *   tick: 1000
 * };
 * ```
 */
export interface MetricEvent {
  /**
   * Event type identifier (e.g., 'interaction:proximity', 'behavior:change')
   */
  readonly type: string;

  /**
   * Real-world timestamp when event was created (milliseconds since epoch)
   */
  readonly timestamp: number;

  /**
   * In-game simulation time in seconds
   */
  readonly simulationTime: number;

  /**
   * Game tick number when event occurred
   */
  readonly tick: number;
}
