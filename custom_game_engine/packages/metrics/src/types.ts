/**
 * Metrics System Types
 *
 * Comprehensive type definitions for the gameplay metrics and telemetry system.
 */

import type { Position as CorePosition } from '@ai-village/core';

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint<T = number> {
  timestamp: number;
  value: T;
}

/**
 * Agent statistics snapshot
 */
export interface AgentStats {
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  intelligence?: number;
}

/**
 * Cause of death categories
 */
export type CauseOfDeath =
  | 'hunger'
  | 'thirst'
  | 'hypothermia'
  | 'heatstroke'
  | 'old_age'
  | 'injury'
  | 'illness'
  | 'attacked'
  | 'accident';

/**
 * Agent lifecycle metrics - tracks full life cycle from birth to death
 */
export interface AgentLifecycleMetrics {
  // Birth
  birthTimestamp: number;
  birthGeneration: number;
  parents: [string, string] | null;
  initialStats: AgentStats;

  // Life
  lifespan?: number; // Game time alive (calculated on death)
  realTimeAlive?: number; // Real-world time

  // Death
  deathTimestamp?: number;
  causeOfDeath?: CauseOfDeath;
  ageAtDeath?: number;
  finalStats?: AgentStats;

  // Legacy
  childrenCount: number;
  descendantsCount: number;
  skillsLearned: string[];
  buildingsCreated: number;
  resourcesGathered: Record<string, number>;
}

/**
 * Needs & survival metrics
 */
export interface NeedsMetrics {
  // Time series samples
  hunger: TimeSeriesDataPoint[];
  thirst: TimeSeriesDataPoint[];
  energy: TimeSeriesDataPoint[];
  temperature: TimeSeriesDataPoint[];
  health: TimeSeriesDataPoint[];

  // Aggregate stats
  avgHunger: number;
  minHunger: number;
  hungerCrisisEvents: number;

  avgEnergy: number;
  sleepDeprivationEvents: number;

  avgTemperature: number;
  hypothermiaEvents: number;
  heatstrokeEvents: number;

  // Resource consumption
  foodConsumed: Record<string, number>;
  waterConsumed: number;
  sleepHours: number;
}

/**
 * Resource tracking data
 */
export interface ResourceMetrics {
  totalGathered: number;
  gatherRate: number;
  gathererCount: number;
  avgGatherTime: number;
}

/**
 * Economic & resource metrics
 */
export interface EconomicMetrics {
  resourcesGathered: Record<string, ResourceMetrics>;
  resourcesProduced: Record<string, ResourceMetrics>;
  resourcesConsumed: Record<string, {
    totalConsumed: number;
    consumptionRate: number;
    purposeBreakdown: Record<string, number>;
  }>;
  stockpiles: Record<string, TimeSeriesDataPoint[]>;
  totalWealth: TimeSeriesDataPoint[];
  wealthDistribution: {
    giniCoefficient: number;
    top10Percent: number;
    bottom50Percent: number;
  };
}

/**
 * Social & relationship metrics
 */
export interface SocialMetrics {
  relationshipsFormed: number;
  relationshipStrengths: {
    family: TimeSeriesDataPoint[];
    friends: TimeSeriesDataPoint[];
    acquaintances: TimeSeriesDataPoint[];
  };
  socialNetworkDensity: number;
  averageClusterSize: number;
  isolatedAgents: number;
  conversationsPerDay: number;
  avgConversationLength: number;
  communicationTopics: Record<string, number>;
  communityCohesion: number;
  factionsCount: number;
  leaderCount: number;
  conflictsPerDay: number;
  conflictTypes: Record<string, number>;
  conflictResolutionRate: number;
}

/**
 * Position in 2D space (re-exported from core types)
 */
export type Position = CorePosition;

/**
 * Per-agent spatial metrics
 */
export interface AgentSpatialMetrics {
  totalDistanceTraveled: number;
  avgMovementSpeed: number;
  pathfindingCalls: number;
  pathfindingFailures: number;
  territoryCenter: Position;
}

/**
 * Spatial & territory metrics
 */
export interface SpatialMetrics {
  // Per-agent metrics
  agents: Record<string, AgentSpatialMetrics>;

  // Global metrics
  heatmap: Record<number, Record<number, number>>;
  pathfindingFailures: number;
}

/**
 * Behavioral & activity metrics
 */
export interface BehavioralMetrics {
  [agentId: string]: {
    activityBreakdown: Record<string, number>;
    decisionsPerHour: number;
    decisionLatency: number;
    decisionChanges: number;
    tasksStarted: number;
    tasksCompleted: number;
    tasksAbandoned: number;
    taskCompletionRate: number;
    avgTaskDuration: number;
    idleTime: number;
    productiveTime: number;
    efficiencyScore: number;
  };
}

/**
 * Intelligence & LLM metrics
 */
export interface IntelligenceMetrics {
  llmCalls: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  tokensConsumed: {
    haiku: number;
    sonnet: number;
    opus: number;
    total: number;
  };
  avgTokensPerDecision: number;
  avgDecisionLatency: number;
  estimatedCost: {
    haiku: number;
    sonnet: number;
    opus: number;
    total: number;
  };
  costPerAgent: number;
  costPerGameHour: number;
  planSuccessRate: number;
  adaptabilityScore: number;
  creativityScore: number;
}

/**
 * Performance & technical metrics
 */
export interface PerformanceMetrics {
  fps: TimeSeriesDataPoint[];
  avgFps: number;
  minFps: number;
  frameDrops: number;
  totalEntities: TimeSeriesDataPoint[];
  agentCount: TimeSeriesDataPoint[];
  buildingCount: TimeSeriesDataPoint[];
  resourceCount: TimeSeriesDataPoint[];
  tickDuration: TimeSeriesDataPoint[];
  systemTiming: Record<string, number>;
  memoryUsage: TimeSeriesDataPoint[];
  peakMemory: number;
  memoryLeaks: number;
  slowestSystem: string;
  pathfindingCacheHitRate: number;
  entityPoolEfficiency: number;
}

/**
 * Detected emergent pattern
 */
export interface EmergentPattern {
  name: string;
  description: string;
  frequency: number;
  participants: number;
  firstObserved: number;
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  type: string;
  severity: number;
  timestamp: number;
  description: string;
}

/**
 * Game milestone
 */
export interface Milestone {
  name: string;
  timestamp: number;
  significance: number;
}

/**
 * Emergent phenomena metrics
 */
export interface EmergentMetrics {
  detectedPatterns: EmergentPattern[];
  anomalies: Anomaly[];
  milestones: Milestone[];
}

/**
 * Session & playthrough metrics
 */
export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  realTimeDuration: number;
  gameTimeDuration: number;
  playerInterventions: number;
  pauseCount: number;
  totalPausedTime: number;
  gameSpeed: TimeSeriesDataPoint[];
  viewportPosition: TimeSeriesDataPoint<Position>[];
  finalPopulation?: number;
  peakPopulation: number;
  totalDeaths: number;
  totalBirths: number;
  gameEndReason?: 'manual_quit' | 'extinction' | 'victory_condition' | 'crash';
}

/**
 * Time range filter
 */
export interface TimeRange {
  startTime: number;
  endTime: number;
}

/**
 * Aggregation type
 */
export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'rate' | 'most_common' | 'net';

/**
 * Aggregation options
 */
export interface AggregationOptions {
  aggregation: AggregationType;
  generation?: number;
  timestamp?: number;
  resourceType?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Export format
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Needs sample data
 */
export interface NeedsSample {
  hunger: number;
  thirst: number;
  energy: number;
  temperature: number;
  health: number;
}

/**
 * Performance sample data
 */
export interface PerformanceSample {
  fps: number;
  tickDuration: number;
  entityCount: number;
  memoryUsage: number;
}
