/**
 * Metric Event Schemas
 *
 * Type definitions for all metric events in the simulation system.
 * These events are used to track and analyze agent behaviors, interactions,
 * spatial patterns, and resource usage.
 *
 * @module metrics/events
 */

export type { MetricEvent } from './MetricEvent';
export type { InteractionEvent, InteractionContext } from './InteractionEvent';
export type { BehaviorEvent } from './BehaviorEvent';
export type { SpatialSnapshot, AgentSnapshot } from './SpatialSnapshot';
export type { ResourceEvent, ResourceAction } from './ResourceEvent';
