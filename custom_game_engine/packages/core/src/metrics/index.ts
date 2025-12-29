/**
 * Metrics Module
 *
 * Comprehensive metrics collection and analysis system for gameplay data.
 */

// Re-export types
export * from './types.js';

// Core components
export { MetricsCollector } from './MetricsCollector.js';
export { MetricsStorage, type StoredMetric, type SessionData, type QueryOptions, type AggregateDataPoint, type AggregateStats, type RetentionPolicy } from './MetricsStorage.js';
export { MetricsAnalysis, type Insight, type InsightSeverity, type Anomaly, type CorrelationResult, type TrendType, type TrendData, type RecognizedPattern, type PerformanceBottleneck, type OptimizationSuggestion } from './MetricsAnalysis.js';
export { MetricsDashboard, type LiveMetrics, type ChartType, type ChartData, type AlertType, type DashboardAlert, type DashboardState } from './MetricsDashboard.js';
export { RingBuffer } from './RingBuffer.js';

// Streaming and live API
export {
  MetricsStreamClient,
  type MetricsStreamConfig,
  type ConnectionState,
  type StreamStats,
  type QueryRequest,
  type QueryResponse,
  type QueryHandler,
} from './MetricsStreamClient.js';

export {
  LiveEntityAPI,
  type PromptBuilder,
  type EntitySummary,
  type EntityDetails,
} from './LiveEntityAPI.js';

// API module
export {
  MetricsAPI,
  type Resolution,
  type NetworkQueryParams,
  type BehaviorQueryParams,
  type InteractionQueryParams,
  type HeatmapQueryParams,
  type TimeSeriesQueryParams,
  type ExportOptions,
  type NetworkMetricsResult,
  type BehaviorEventResult,
  type InteractionEventResult,
  type HeatmapCell,
  type HeatmapResult,
  type TimeSeriesPoint,
  type TimeSeriesResult,
  type SimulationSummary,
  type APIResponse,
} from './api/MetricsAPI.js';

export {
  MetricsLiveStream,
  type MetricType,
  type AlertSeverity,
  type MetricAlert,
  type SnapshotData,
  type InteractionData,
  type BehaviorData,
  type NetworkData,
  type ResourceData,
  type AgentData,
  type LiveStreamMessage,
  type SubscriptionCallback,
  type AlertThreshold,
} from './api/MetricsLiveStream.js';

// Analyzers module
export {
  NetworkAnalyzer,
  type NetworkNode,
  type NetworkEdge,
  type CentralityScores,
  type Community,
  type NetworkMetrics,
  type NetworkEvolution,
  SpatialAnalyzer,
  type Heatmap,
  type Hotspot,
  type Territory,
  type MovementTrail,
  type SegregationMetrics,
  type SpatialDistribution,
  InequalityAnalyzer,
  type LorenzPoint,
  type WealthSnapshot,
  type MobilityResult,
  type Stratum,
  type InequalitySummary,
  type ConcentrationMetrics,
  type MobilityMatrix,
  CulturalDiffusionAnalyzer,
  type AdoptionEvent,
  type Innovation,
  type DiffusionCascade,
  type AdoptionCurve,
  type InfluencerMetrics,
  type CulturalTrait,
  type DiffusionSummary,
  type TransmissionEvent,
} from './analyzers/index.js';
