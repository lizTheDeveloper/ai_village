/**
 * Metrics API Module
 *
 * Provides REST-like API and real-time streaming for metrics.
 */

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
} from './MetricsAPI.js';

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
} from './MetricsLiveStream.js';
