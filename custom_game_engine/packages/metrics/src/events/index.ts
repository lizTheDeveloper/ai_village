/**
 * Metrics Event Types
 *
 * Event type definitions for the metrics system.
 * These events can be emitted by game systems to track metrics.
 */

export interface MetricsEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Agent birth event
 */
export interface AgentBirthEvent extends MetricsEvent {
  type: 'agent:birth';
  agentId: string;
  name?: string;
  useLLM?: boolean;
  generation: number;
  parents: [string, string] | null;
  initialStats: {
    health: number;
    hunger: number;
    thirst?: number;
    energy: number;
    intelligence?: number;
  };
}

/**
 * Agent death event
 */
export interface AgentDeathEvent extends MetricsEvent {
  type: 'agent:death';
  agentId: string;
  causeOfDeath: string;
  ageAtDeath: number;
  finalStats: {
    health: number;
    hunger: number;
    thirst: number;
    energy: number;
  };
}

/**
 * Resource gathered event
 */
export interface ResourceGatheredEvent extends MetricsEvent {
  type: 'resource:gathered';
  agentId: string;
  resourceType: string;
  amount: number;
  gatherTime: number;
}

/**
 * Resource consumed event
 */
export interface ResourceConsumedEvent extends MetricsEvent {
  type: 'resource:consumed';
  agentId: string;
  resourceType: string;
  amount: number;
  purpose: string;
}

/**
 * Stockpile updated event
 */
export interface StockpileUpdatedEvent extends MetricsEvent {
  type: 'stockpile:updated';
  resourceType: string;
  amount: number;
}

/**
 * Relationship formed event
 */
export interface RelationshipFormedEvent extends MetricsEvent {
  type: 'relationship:formed';
  agent1: string;
  agent2: string;
  relationshipType: string;
  strength: number;
}

/**
 * LLM call event
 */
export interface LLMCallEvent extends MetricsEvent {
  type: 'llm:call';
  agentId: string;
  model: 'haiku' | 'sonnet' | 'opus';
  tokensConsumed: number;
  latency: number;
  purpose?: string;
}

/**
 * Session started event
 */
export interface SessionStartedEvent extends MetricsEvent {
  type: 'session:started';
}

/**
 * Session ended event
 */
export interface SessionEndedEvent extends MetricsEvent {
  type: 'session:ended';
  reason: 'manual_quit' | 'extinction' | 'victory_condition' | 'crash';
}

/**
 * Population sampled event
 */
export interface PopulationSampledEvent extends MetricsEvent {
  type: 'population:sampled';
  population: number;
}

// Re-export individual event type modules
export * from './MetricEvent.js';
export * from './InteractionEvent.js';
export * from './BehaviorEvent.js';
export * from './SpatialSnapshot.js';
export * from './ResourceEvent.js';
