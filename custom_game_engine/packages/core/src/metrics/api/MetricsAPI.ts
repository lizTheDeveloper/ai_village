/**
 * MetricsAPI - REST-like API for querying metrics
 *
 * Provides a programmatic interface matching the REST API spec.
 * Can be called directly in-browser or wrapped with Express for server deployment.
 *
 * Part of Phase 23: Sociological Metrics - Storage & API
 */

import type { MetricsCollector } from '../MetricsCollector.js';
import type { MetricsStorage, QueryOptions } from '../MetricsStorage.js';
import type { BehavioralMetrics } from '../types.js';

/**
 * Time range for queries
 */
export interface TimeRange {
  startTime: number;
  endTime: number;
}

/**
 * Resolution levels for data aggregation
 */
export type Resolution = 'high' | 'medium' | 'low';

/**
 * Network metrics query params
 */
export interface NetworkQueryParams extends TimeRange {
  resolution?: Resolution;
}

/**
 * Behavior events query params
 */
export interface BehaviorQueryParams extends TimeRange {
  agentId?: string;
  behavior?: string;
  limit?: number;
}

/**
 * Interaction events query params
 */
export interface InteractionQueryParams extends TimeRange {
  agent1?: string;
  agent2?: string;
  limit?: number;
}

/**
 * Spatial heatmap query params
 */
export interface HeatmapQueryParams extends TimeRange {
  resolution?: number;
  metric?: 'density' | 'interactions' | 'behaviors';
}

/**
 * Time series query params
 */
export interface TimeSeriesQueryParams extends TimeRange {
  metrics: string[];
  interval?: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'json';
  includeRaw?: boolean;
  timeRange?: TimeRange;
}

/**
 * Network metrics result
 */
export interface NetworkMetricsResult {
  density: number;
  clustering: number;
  avgPathLength: number;
  components: number;
  nodeCount: number;
  edgeCount: number;
  centralAgents: Array<{ agentId: string; centrality: number }>;
}

/**
 * Behavior event
 */
export interface BehaviorEventResult {
  timestamp: number;
  agentId: string;
  behavior: string;
  previousBehavior?: string;
  location?: { x: number; y: number };
  health?: number;
  energy?: number;
}

/**
 * Interaction event
 */
export interface InteractionEventResult {
  timestamp: number;
  agent1Id: string;
  agent2Id: string;
  distance?: number;
  location?: { x: number; y: number };
  context?: Record<string, unknown>;
}

/**
 * Heatmap cell
 */
export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

/**
 * Heatmap result
 */
export interface HeatmapResult {
  cells: HeatmapCell[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  resolution: number;
  metric: string;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  values: Record<string, number>;
}

/**
 * Time series result
 */
export interface TimeSeriesResult {
  points: TimeSeriesPoint[];
  metrics: string[];
  startTime: number;
  endTime: number;
  interval: number;
}

/**
 * Simulation summary
 */
export interface SimulationSummary {
  sessionId: string;
  startTime: number;
  duration: number;
  totalTicks: number;
  peakPopulation: number;
  currentPopulation: number;
  totalBirths: number;
  totalDeaths: number;
  totalInteractions: number;
  avgNetworkDensity: number;
  dominantBehaviors: Array<{ behavior: string; percentage: number }>;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * MetricsAPI provides REST-like interface for metrics queries
 */
export class MetricsAPI {
  private collector: MetricsCollector;
  private storage?: MetricsStorage;

  constructor(collector: MetricsCollector, storage?: MetricsStorage) {
    this.collector = collector;
    this.storage = storage;
  }

  /**
   * Get network metrics
   */
  async getNetworkMetrics(params: NetworkQueryParams): Promise<APIResponse<NetworkMetricsResult>> {
    try {
      const allMetrics = this.collector.getAllMetrics();
      const socialMetrics = allMetrics.social;

      // Get interactions within time range
      const interactions = this.getInteractionsInRange(params.startTime, params.endTime);

      // Build adjacency map
      const adjacency = new Map<string, Set<string>>();
      for (const interaction of interactions) {
        const agent1 = interaction.agent1Id;
        const agent2 = interaction.agent2Id;

        if (!adjacency.has(agent1)) adjacency.set(agent1, new Set());
        if (!adjacency.has(agent2)) adjacency.set(agent2, new Set());

        adjacency.get(agent1)!.add(agent2);
        adjacency.get(agent2)!.add(agent1);
      }

      const nodeCount = adjacency.size;
      const edgeCount = interactions.length;
      const maxEdges = nodeCount * (nodeCount - 1) / 2;
      const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

      // Calculate centrality (degree centrality)
      const centralAgents: Array<{ agentId: string; centrality: number }> = [];
      for (const [agentId, neighbors] of adjacency) {
        centralAgents.push({
          agentId,
          centrality: nodeCount > 1 ? neighbors.size / (nodeCount - 1) : 0,
        });
      }
      centralAgents.sort((a, b) => b.centrality - a.centrality);

      return {
        success: true,
        data: {
          density,
          clustering: socialMetrics?.socialNetworkDensity ?? 0,
          avgPathLength: 0, // Would need full graph traversal
          components: 1, // Simplified
          nodeCount,
          edgeCount,
          centralAgents: centralAgents.slice(0, 10),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get behavior events
   */
  async getBehaviorEvents(params: BehaviorQueryParams): Promise<APIResponse<BehaviorEventResult[]>> {
    try {
      const events: BehaviorEventResult[] = [];

      // Query storage if available
      if (this.storage) {
        const queryOptions: QueryOptions = {
          startTime: params.startTime,
          endTime: params.endTime,
          type: 'behavior:change',
          agentId: params.agentId,
        };
        const stored = this.storage.queryHotStorage(queryOptions);

        for (const metric of stored) {
          const data = metric.data as Record<string, unknown>;
          if (params.behavior && data.behavior !== params.behavior) continue;

          events.push({
            timestamp: metric.timestamp,
            agentId: metric.agentId || '',
            behavior: data.behavior as string || '',
            previousBehavior: data.previousBehavior as string | undefined,
            location: data.location as { x: number; y: number } | undefined,
            health: data.health as number | undefined,
            energy: data.energy as number | undefined,
          });
        }
      }

      // Sort by timestamp and apply limit
      events.sort((a, b) => b.timestamp - a.timestamp);
      const limited = params.limit ? events.slice(0, params.limit) : events;

      return {
        success: true,
        data: limited,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get interaction events
   */
  async getInteractionEvents(params: InteractionQueryParams): Promise<APIResponse<InteractionEventResult[]>> {
    try {
      let events = this.getInteractionsInRange(params.startTime, params.endTime);

      // Filter by agents
      if (params.agent1) {
        events = events.filter(e => e.agent1Id === params.agent1 || e.agent2Id === params.agent1);
      }
      if (params.agent2) {
        events = events.filter(e => e.agent1Id === params.agent2 || e.agent2Id === params.agent2);
      }

      // Sort and limit
      events.sort((a, b) => b.timestamp - a.timestamp);
      const limited = params.limit ? events.slice(0, params.limit) : events;

      return {
        success: true,
        data: limited,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get spatial heatmap
   */
  async getSpatialHeatmap(params: HeatmapQueryParams): Promise<APIResponse<HeatmapResult>> {
    try {
      const resolution = params.resolution ?? 10;
      const cells: HeatmapCell[] = [];
      const cellCounts = new Map<string, number>();

      // Query storage for position data
      if (this.storage) {
        const stored = this.storage.queryHotStorage({
          startTime: params.startTime,
          endTime: params.endTime,
        });

        for (const metric of stored) {
          const data = metric.data as Record<string, unknown>;
          const location = data.location as { x: number; y: number } | undefined;
          if (!location) continue;

          const cellX = Math.floor(location.x / resolution) * resolution;
          const cellY = Math.floor(location.y / resolution) * resolution;
          const key = `${cellX},${cellY}`;

          cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
        }
      }

      // Convert to cells array
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const [key, value] of cellCounts) {
        const parts = key.split(',').map(Number);
        if (parts.length !== 2 || parts.some(p => isNaN(p))) {
          throw new Error(`Invalid cell key: ${key}`);
        }
        const [x, y] = parts as [number, number];
        cells.push({ x, y, value });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      return {
        success: true,
        data: {
          cells,
          minX: minX === Infinity ? 0 : minX,
          maxX: maxX === -Infinity ? 0 : maxX,
          minY: minY === Infinity ? 0 : minY,
          maxY: maxY === -Infinity ? 0 : maxY,
          resolution,
          metric: params.metric ?? 'density',
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get time series data
   */
  async getTimeSeries(params: TimeSeriesQueryParams): Promise<APIResponse<TimeSeriesResult>> {
    try {
      const interval = params.interval ?? 60000; // Default 1 minute
      const points: TimeSeriesPoint[] = [];

      // Generate time buckets
      const buckets = new Map<number, Record<string, number[]>>();

      for (let t = params.startTime; t <= params.endTime; t += interval) {
        buckets.set(t, {});
        for (const metric of params.metrics) {
          buckets.get(t)![metric] = [];
        }
      }

      // Fill buckets from storage
      if (this.storage) {
        const stored = this.storage.queryHotStorage({
          startTime: params.startTime,
          endTime: params.endTime,
        });

        for (const metric of stored) {
          const bucketTime = Math.floor(metric.timestamp / interval) * interval;
          const bucket = buckets.get(bucketTime);
          if (!bucket) continue;

          for (const metricName of params.metrics) {
            const value = (metric.data as Record<string, unknown>)[metricName];
            if (typeof value === 'number' && bucket[metricName]) {
              bucket[metricName].push(value);
            }
          }
        }
      }

      // Calculate averages
      for (const [timestamp, metricValues] of buckets) {
        const values: Record<string, number> = {};
        for (const [metric, arr] of Object.entries(metricValues)) {
          values[metric] = arr.length > 0
            ? arr.reduce((a, b) => a + b, 0) / arr.length
            : 0;
        }
        points.push({ timestamp, values });
      }

      return {
        success: true,
        data: {
          points,
          metrics: params.metrics,
          startTime: params.startTime,
          endTime: params.endTime,
          interval,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get simulation summary
   */
  async getSummary(): Promise<APIResponse<SimulationSummary>> {
    try {
      const allMetrics = this.collector.getAllMetrics();
      const session = allMetrics.session;
      const lifecycle = allMetrics.lifecycle as Map<string, any>;

      // Count behaviors
      const behaviorCounts = new Map<string, number>();
      const behavioralMetrics = allMetrics.behavioral as BehavioralMetrics | undefined;

      if (behavioralMetrics) {
        for (const [, agentData] of Object.entries(behavioralMetrics)) {
          const breakdown = agentData.activityBreakdown;
          if (breakdown) {
            for (const [behavior, time] of Object.entries(breakdown)) {
              behaviorCounts.set(behavior, (behaviorCounts.get(behavior) || 0) + time);
            }
          }
        }
      }

      // Calculate dominant behaviors
      const totalBehaviorTime = Array.from(behaviorCounts.values()).reduce((a, b) => a + b, 0);
      const dominantBehaviors = Array.from(behaviorCounts.entries())
        .map(([behavior, time]) => ({
          behavior,
          percentage: totalBehaviorTime > 0 ? (time / totalBehaviorTime) * 100 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

      // Count births and deaths
      let totalBirths = 0;
      let totalDeaths = 0;
      if (lifecycle) {
        for (const [, agent] of lifecycle) {
          totalBirths++;
          if (agent.deathTimestamp) totalDeaths++;
        }
      }

      return {
        success: true,
        data: {
          sessionId: session?.sessionId ?? 'unknown',
          startTime: session?.startTime ?? Date.now(),
          duration: session?.realTimeDuration ?? 0,
          totalTicks: 0, // Would need tick tracking
          peakPopulation: session?.peakPopulation ?? 0,
          currentPopulation: lifecycle?.size ?? 0,
          totalBirths,
          totalDeaths,
          totalInteractions: allMetrics.social?.relationshipsFormed ?? 0,
          avgNetworkDensity: allMetrics.social?.socialNetworkDensity ?? 0,
          dominantBehaviors,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Export metrics data
   */
  async exportData(options: ExportOptions): Promise<APIResponse<string>> {
    try {
      const data = this.collector.exportMetrics(options.format);

      return {
        success: true,
        data: data.toString('utf-8'),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Helper: Get interactions in time range
   */
  private getInteractionsInRange(startTime: number, endTime: number): InteractionEventResult[] {
    const events: InteractionEventResult[] = [];

    if (this.storage) {
      const stored = this.storage.queryHotStorage({
        startTime,
        endTime,
        type: 'conversation:started',
      });

      for (const metric of stored) {
        const data = metric.data as Record<string, unknown>;
        const participants = data.participants as string[] | undefined;

        if (participants && participants.length >= 2) {
          const agent1 = participants[0];
          const agent2 = participants[1];
          if (agent1 === undefined || agent2 === undefined) {
            throw new Error('Conversation participants array contains undefined values');
          }
          events.push({
            timestamp: metric.timestamp,
            agent1Id: agent1,
            agent2Id: agent2,
            location: data.location as { x: number; y: number } | undefined,
            context: data,
          });
        }
      }

      // Also check relationship:formed events
      const relationships = this.storage.queryHotStorage({
        startTime,
        endTime,
        type: 'relationship:formed',
      });

      for (const metric of relationships) {
        const data = metric.data as Record<string, unknown>;
        events.push({
          timestamp: metric.timestamp,
          agent1Id: data.agent1 as string || '',
          agent2Id: data.agent2 as string || '',
          context: data,
        });
      }
    }

    return events;
  }
}
