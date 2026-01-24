/**
 * MetricsDashboard - Real-time metrics visualization and alerts
 *
 * Provides a dashboard interface for displaying live metrics, charts, and alerts.
 */

import type { MetricsCollector } from './MetricsCollector.js';
import type { MetricsAnalysis } from './MetricsAnalysis.js';

/**
 * Live metrics snapshot
 */
export interface LiveMetrics {
  population: number;
  avgHunger: number;
  avgEnergy: number;
  resourceStockpiles: Record<string, number>;
}

/**
 * Chart type
 */
export type ChartType = 'line' | 'bar' | 'stacked_area' | 'histogram' | 'heatmap' | 'graph';

/**
 * Chart data
 */
export interface ChartData {
  type: ChartType;
  data: {
    labels?: string[] | number[];
    datasets?: Array<{
      label?: string;
      data: number[];
      [key: string]: unknown;
    }>;
    heatmap?: Record<number, Record<number, number>>;
    nodes?: Array<{ id: string; label: string }>;
    edges?: Array<{ from: string; to: string }>;
    [key: string]: unknown;
  };
}

/**
 * Alert type
 */
export type AlertType = 'warning' | 'critical' | 'info';

/**
 * Dashboard alert
 */
export interface DashboardAlert {
  id: string;
  type: AlertType;
  message: string;
  metric: string;
  threshold: number;
  currentValue?: number;
  timestamp: number;
}

/**
 * Custom widget interface
 */
export interface CustomWidget {
  id: string;
  type: string;
  title: string;
  render: () => Record<string, unknown>;
}

/**
 * Dashboard state
 */
export interface DashboardState {
  liveMetrics: LiveMetrics;
  charts: Record<string, ChartData>;
  alerts: DashboardAlert[];
  widgets: CustomWidget[];
}

/**
 * Chart options
 */
export interface ChartOptions {
  title?: string;
  colors?: string[];
  showLegend?: boolean;
  [key: string]: unknown;
}

/**
 * Performance metrics
 */
export interface DashboardPerformanceMetrics {
  lastRenderTime: number;
  avgRenderTime: number;
  renderCount: number;
}

/**
 * Session metrics from collector
 */
interface SessionMetrics {
  totalBirths: number;
  totalDeaths: number;
}

/**
 * Stockpile entry
 */
interface StockpileEntry {
  value: number;
  timestamp?: number;
}

/**
 * Economic metrics from collector
 */
interface EconomicMetrics {
  stockpiles: Record<string, StockpileEntry[]>;
}

/**
 * Agent lifecycle metrics
 */
interface AgentLifecycleMetrics {
  [agentId: string]: {
    initialStats?: {
      intelligence?: number;
    };
  };
}

/**
 * Spatial metrics from collector
 */
interface SpatialMetrics {
  heatmap: Record<number, Record<number, number>>;
}

/**
 * Social metrics from collector
 */
interface SocialMetrics {
  relationshipsFormed: number;
}

/**
 * Performance metrics from collector
 */
interface PerformanceMetrics {
  fps: Array<{ value: number; timestamp?: number }>;
}

/**
 * Milestone entry
 */
interface Milestone {
  name: string;
  timestamp: number;
}

/**
 * Emergent metrics from collector
 */
interface EmergentMetrics {
  milestones: Milestone[];
}

/**
 * Type guard for SessionMetrics
 */
function isSessionMetrics(value: unknown): value is SessionMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.totalBirths === 'number' && typeof obj.totalDeaths === 'number';
}

/**
 * Type guard for EconomicMetrics
 */
function isEconomicMetrics(value: unknown): value is EconomicMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.stockpiles !== 'object' || obj.stockpiles === null) {
    return false;
  }
  return true;
}

/**
 * Type guard for AgentLifecycleMetrics
 */
function isAgentLifecycleMetrics(value: unknown): value is AgentLifecycleMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return true;
}

/**
 * Type guard for SpatialMetrics
 */
function isSpatialMetrics(value: unknown): value is SpatialMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.heatmap === 'object' && obj.heatmap !== null;
}

/**
 * Type guard for SocialMetrics
 */
function isSocialMetrics(value: unknown): value is SocialMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.relationshipsFormed === 'number';
}

/**
 * Type guard for PerformanceMetrics
 */
function isPerformanceMetrics(value: unknown): value is PerformanceMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.fps);
}

/**
 * Type guard for EmergentMetrics
 */
function isEmergentMetrics(value: unknown): value is EmergentMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.milestones);
}

/**
 * Type guard for StockpileEntry
 */
function isStockpileEntry(value: unknown): value is StockpileEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.value === 'number';
}

export class MetricsDashboard {
  private collector: MetricsCollector;
  private analysis: MetricsAnalysis;
  private state: DashboardState;
  private autoUpdateInterval?: NodeJS.Timeout;
  private performanceMetrics: DashboardPerformanceMetrics;
  private lastUpdateTime: number = 0;
  private updateThrottleMs: number = 100;
  private alertIdCounter: number = 0;

  constructor(collector: MetricsCollector, analysis: MetricsAnalysis) {
    if (!collector) {
      throw new Error('MetricsDashboard requires MetricsCollector');
    }
    if (!analysis) {
      throw new Error('MetricsDashboard requires MetricsAnalysis');
    }

    this.collector = collector;
    this.analysis = analysis;
    this.state = this.initializeState();
    this.performanceMetrics = {
      lastRenderTime: 0,
      avgRenderTime: 0,
      renderCount: 0,
    };
  }

  /**
   * Get insights from analysis
   */
  getInsights(): ReturnType<MetricsAnalysis['generateInsights']> {
    return this.analysis.generateInsights();
  }

  /**
   * Initialize dashboard state
   */
  private initializeState(): DashboardState {
    return {
      liveMetrics: {
        population: 0,
        avgHunger: 0,
        avgEnergy: 0,
        resourceStockpiles: {},
      },
      charts: {},
      alerts: [],
      widgets: [],
    };
  }

  /**
   * Get current dashboard state
   */
  getState(): DashboardState {
    return this.state;
  }

  /**
   * Update live metrics
   */
  updateLiveMetrics(): void {
    // Update population from samples
    try {
      const populationSamples = this.collector.getPopulationSamples();
      if (populationSamples.length > 0) {
        const latest = populationSamples[populationSamples.length - 1];
        if (latest) {
          this.state.liveMetrics.population = latest.population;
        }
      }
    } catch (e) {
      // Fallback to session metrics
      try {
        const sessionMetrics = this.collector.getMetric('session_metrics') as any;
        this.state.liveMetrics.population = sessionMetrics.totalBirths - sessionMetrics.totalDeaths;
      } catch {
        // Ignore if no data
      }
    }

    // Update average hunger
    try {
      const avgHunger = this.collector.getAggregatedMetric('hunger', { aggregation: 'avg' });
      if (typeof avgHunger === 'number' && !isNaN(avgHunger)) {
        this.state.liveMetrics.avgHunger = avgHunger;
      }
    } catch (e) {
      // Ignore if no data
    }

    // Update resource stockpiles
    try {
      const economicMetrics = this.collector.getMetric('economic_metrics') as any;
      for (const [resourceType, stockpile] of Object.entries(economicMetrics.stockpiles)) {
        if (Array.isArray(stockpile) && stockpile.length > 0) {
          this.state.liveMetrics.resourceStockpiles[resourceType] = stockpile[stockpile.length - 1].value;
        }
      }
    } catch (e) {
      // Ignore if no data
    }
  }

  /**
   * Generate a chart
   */
  generateChart(chartName: string, chartType: ChartType, options?: ChartOptions): ChartData & { options?: ChartOptions } {
    // Validate chart type
    const validChartTypes: ChartType[] = ['line', 'bar', 'stacked_area', 'histogram', 'heatmap', 'graph'];
    if (!validChartTypes.includes(chartType)) {
      throw new Error(`Unsupported chart type: ${chartType}`);
    }

    let chartData: ChartData;

    switch (chartName) {
      case 'population_over_time':
        chartData = this.generatePopulationChart(chartType);
        break;

      case 'resource_balance':
        chartData = this.generateResourceBalanceChart(chartType);
        break;

      case 'intelligence_distribution':
        chartData = this.generateIntelligenceDistribution(chartType);
        break;

      case 'spatial_heatmap':
        chartData = this.generateSpatialHeatmap(chartType);
        break;

      case 'social_network':
        chartData = this.generateSocialNetworkGraph(chartType);
        break;

      default:
        throw new Error(`Unknown chart type: ${chartName}`);
    }

    // Apply options if provided
    if (options) {
      return { ...chartData, options };
    }

    return chartData;
  }

  /**
   * Generate population over time chart
   */
  private generatePopulationChart(chartType: ChartType): ChartData {
    // Extract population data from samples
    const populationSamples = this.collector.getPopulationSamples();
    const labels: number[] = [];
    const data: number[] = [];

    for (const sample of populationSamples) {
      labels.push(sample.timestamp);
      data.push(sample.population);
    }

    return {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Population',
            data,
          },
        ],
      },
    };
  }

  /**
   * Generate resource balance chart
   */
  private generateResourceBalanceChart(chartType: ChartType): ChartData {
    const economicMetrics = this.collector.getMetric('economic_metrics') as any;
    const datasets: Array<{ label: string; data: number[] }> = [];

    for (const [resourceType, stockpile] of Object.entries(economicMetrics.stockpiles)) {
      if (Array.isArray(stockpile)) {
        datasets.push({
          label: resourceType,
          data: stockpile.map(d => d.value),
        });
      }
    }

    return {
      type: chartType,
      data: {
        datasets,
      },
    };
  }

  /**
   * Generate intelligence distribution histogram
   */
  private generateIntelligenceDistribution(chartType: ChartType): ChartData {
    const lifecycleMetrics = this.collector.getMetric('agent_lifecycle') as any;
    const intelligenceValues: number[] = [];

    for (const metrics of Object.values(lifecycleMetrics) as Array<{ initialStats?: { intelligence?: number } }>) {
      if (metrics.initialStats?.intelligence !== undefined) {
        intelligenceValues.push(metrics.initialStats.intelligence);
      }
    }

    // Create histogram bins
    const bins = 10;
    const min = Math.min(...intelligenceValues);
    const max = Math.max(...intelligenceValues);
    const binSize = (max - min) / bins;
    const histogram = new Array(bins).fill(0);

    for (const value of intelligenceValues) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
    }

    return {
      type: chartType,
      data: {
        datasets: [
          {
            label: 'Intelligence Distribution',
            data: histogram,
          },
        ],
      },
    };
  }

  /**
   * Generate spatial heatmap
   */
  private generateSpatialHeatmap(chartType: ChartType): ChartData {
    const spatialMetrics = this.collector.getMetric('spatial_metrics') as any;

    return {
      type: chartType,
      data: {
        heatmap: spatialMetrics.heatmap,
      },
    };
  }

  /**
   * Generate social network graph
   */
  private generateSocialNetworkGraph(chartType: ChartType): ChartData {
    // Build graph from social metrics
    const socialMetrics = this.collector.getMetric('social_metrics') as any;
    const nodes: Array<{ id: string; label: string }> = [];
    const edges: Array<{ from: string; to: string }> = [];

    // Create nodes and edges from relationships
    // For now, we'll create a simple graph structure
    // In a real implementation, this would track all relationships

    // Create unique nodes from agents in lifecycle
    const lifecycleMetrics = this.collector.getMetric('agent_lifecycle') as any;
    const agentIds = Object.keys(lifecycleMetrics);

    for (const agentId of agentIds) {
      nodes.push({ id: agentId, label: agentId });
    }

    // Create edges based on relationship count (simplified)
    if (socialMetrics.relationshipsFormed > 0) {
      // Create sample edges for visualization
      for (let i = 0; i < Math.min(agentIds.length - 1, socialMetrics.relationshipsFormed); i++) {
        edges.push({
          from: agentIds[i]!,
          to: agentIds[i + 1]!,
        });
      }
    }

    return {
      type: chartType,
      data: {
        nodes,
        edges,
      },
    };
  }

  /**
   * Add an alert
   */
  addAlert(alert: Omit<DashboardAlert, 'id'> & { id?: string }): void {
    const alertWithId: DashboardAlert = {
      ...alert,
      id: alert.id || `alert-${this.alertIdCounter++}`,
    };
    this.state.alerts.push(alertWithId);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge: number): void {
    const now = Date.now();
    this.state.alerts = this.state.alerts.filter(alert => now - alert.timestamp < maxAge);
  }

  /**
   * Get active alerts
   */
  getAlerts(): DashboardAlert[] {
    return this.state.alerts;
  }

  /**
   * Update alerts based on current metrics
   */
  updateAlerts(): void {
    // Clear auto-resolvable alerts first
    this.state.alerts = this.state.alerts.filter(alert => {
      // Check if alert condition still exists
      if (alert.metric === 'food_stockpile') {
        const economicMetrics = this.collector.getMetric('economic_metrics') as any;
        const foodStockpile = economicMetrics.stockpiles['food'];
        if (foodStockpile && foodStockpile.length > 0) {
          const latestAmount = foodStockpile[foodStockpile.length - 1].value;
          if (latestAmount >= alert.threshold) {
            return false; // Remove alert - condition resolved
          }
        }
      }
      return true; // Keep alert
    });

    // Check for low food stockpile
    try {
      const economicMetrics = this.collector.getMetric('economic_metrics') as any;
      const foodStockpile = economicMetrics.stockpiles['food'];
      if (foodStockpile && foodStockpile.length > 0) {
        const latestAmount = foodStockpile[foodStockpile.length - 1].value;
        if (latestAmount < 10 && !this.state.alerts.some(a => a.metric === 'food_stockpile')) {
          this.addAlert({
            type: 'warning',
            message: `Low food stockpile: ${latestAmount} units`,
            metric: 'food_stockpile',
            threshold: 10,
            currentValue: latestAmount,
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      // Ignore if no data
    }

    // Check for FPS drop
    try {
      const performanceMetrics = this.collector.getMetric('performance_metrics') as any;
      if (performanceMetrics.fps.length > 0) {
        const latestFps = performanceMetrics.fps[performanceMetrics.fps.length - 1].value;
        if (latestFps < 30 && !this.state.alerts.some(a => a.metric === 'fps')) {
          this.addAlert({
            type: 'critical',
            message: `FPS dropped below 30: current ${latestFps}`,
            metric: 'fps',
            threshold: 30,
            currentValue: latestFps,
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      // Ignore if no data
    }

    // Check for milestones
    try {
      const emergentMetrics = this.collector.getMetric('emergent_metrics') as any;
      for (const milestone of emergentMetrics.milestones) {
        // Only create alert for recent milestones (last 5 seconds)
        if (Date.now() - milestone.timestamp < 5000) {
          if (!this.state.alerts.some(a => a.message === milestone.name)) {
            this.addAlert({
              type: 'info',
              message: milestone.name,
              metric: 'milestone',
              threshold: 0,
              timestamp: milestone.timestamp,
            });
          }
        }
      }
    } catch {
      // Ignore if no data
    }
  }

  /**
   * Dismiss an alert by ID
   */
  dismissAlert(alertId: string): void {
    this.state.alerts = this.state.alerts.filter(a => a.id !== alertId);
  }

  /**
   * Update all dashboard components
   */
  update(): void {
    const startTime = Date.now();

    // Throttle updates (but not on first update)
    if (this.lastUpdateTime > 0 && Date.now() - this.lastUpdateTime < this.updateThrottleMs) {
      return;
    }

    this.lastUpdateTime = Date.now();

    // Update all components
    this.updateLiveMetrics();
    this.updateAlerts();

    // Update custom widgets
    for (const widget of this.state.widgets) {
      try {
        widget.render();
      } catch (error) {
        // Handle widget render errors
        this.addAlert({
          type: 'warning',
          message: `Widget render error: ${error}`,
          metric: `widget_${widget.id}`,
          threshold: 0,
          timestamp: Date.now(),
        });
      }
    }

    // Track performance
    const renderTime = Date.now() - startTime;
    this.performanceMetrics.lastRenderTime = renderTime;
    this.performanceMetrics.renderCount++;
    this.performanceMetrics.avgRenderTime =
      (this.performanceMetrics.avgRenderTime * (this.performanceMetrics.renderCount - 1) + renderTime) /
      this.performanceMetrics.renderCount;

    // Warn if update is slow
    if (renderTime > 50) {
      this.addAlert({
        type: 'warning',
        message: `Dashboard update was slow: ${renderTime}ms`,
        metric: 'dashboard_performance',
        threshold: 50,
        currentValue: renderTime,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add a custom widget
   */
  addWidget(widget: CustomWidget): void {
    this.state.widgets.push(widget);
  }

  /**
   * Remove a custom widget
   */
  removeWidget(widgetId: string): void {
    this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);
  }

  /**
   * Export dashboard state
   */
  exportState(format: 'json'): Buffer {
    if (format !== 'json') {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const data = {
      liveMetrics: this.state.liveMetrics,
      alerts: this.state.alerts,
      charts: this.state.charts,
      timestamp: Date.now(),
    };

    return Buffer.from(JSON.stringify(data, null, 2));
  }

  /**
   * Export a chart
   */
  exportChart(_chart: ChartData, format: 'png' | 'svg' | 'json'): Buffer {
    // Simplified implementation - would use actual chart rendering library
    if (format === 'png' || format === 'svg') {
      // Return empty buffer as placeholder
      return Buffer.from('chart-data');
    } else if (format === 'json') {
      return Buffer.from(JSON.stringify(_chart, null, 2));
    }

    throw new Error(`Unsupported chart export format: ${format}`);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): DashboardPerformanceMetrics {
    return this.performanceMetrics;
  }

  /**
   * Enable auto-update
   */
  enableAutoUpdate(intervalMs: number): void {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }

    this.autoUpdateInterval = setInterval(() => {
      this.update();
    }, intervalMs);
  }

  /**
   * Disable auto-update
   */
  disableAutoUpdate(): void {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = undefined;
    }
  }
}
