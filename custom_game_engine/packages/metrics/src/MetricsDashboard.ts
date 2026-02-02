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
  return (
    'totalBirths' in obj &&
    'totalDeaths' in obj &&
    typeof obj.totalBirths === 'number' &&
    typeof obj.totalDeaths === 'number'
  );
}

/**
 * Type guard for EconomicMetrics
 */
function isEconomicMetrics(value: unknown): value is EconomicMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('stockpiles' in value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  const stockpiles = obj.stockpiles;
  if (typeof stockpiles !== 'object' || stockpiles === null) {
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
  if (!('heatmap' in value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  const heatmap = obj.heatmap;
  return typeof heatmap === 'object' && heatmap !== null;
}

/**
 * Type guard for SocialMetrics
 */
function isSocialMetrics(value: unknown): value is SocialMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('relationshipsFormed' in value)) {
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
  if (!('fps' in value)) {
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
  if (!('milestones' in value)) {
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
  if (!('value' in value)) {
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
        const sessionMetrics = this.collector.getMetric('session_metrics');
        if (!isSessionMetrics(sessionMetrics)) {
          throw new Error('Invalid session metrics structure');
        }
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
      const economicMetrics = this.collector.getMetric('economic_metrics');
      if (!isEconomicMetrics(economicMetrics)) {
        throw new Error('Invalid economic metrics structure');
      }
      for (const [resourceType, stockpile] of Object.entries(economicMetrics.stockpiles)) {
        if (Array.isArray(stockpile) && stockpile.length > 0) {
          const lastEntry = stockpile[stockpile.length - 1];
          if (lastEntry && isStockpileEntry(lastEntry)) {
            this.state.liveMetrics.resourceStockpiles[resourceType] = lastEntry.value;
          }
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
    const economicMetrics = this.collector.getMetric('economic_metrics');
    if (!isEconomicMetrics(economicMetrics)) {
      throw new Error('Invalid economic metrics structure');
    }
    const datasets: Array<{ label: string; data: number[] }> = [];

    for (const [resourceType, stockpile] of Object.entries(economicMetrics.stockpiles)) {
      if (Array.isArray(stockpile)) {
        datasets.push({
          label: resourceType,
          data: stockpile.map(entry => {
            if (!isStockpileEntry(entry)) {
              throw new Error(`Invalid stockpile entry for ${resourceType}`);
            }
            return entry.value;
          }),
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
    const lifecycleMetrics = this.collector.getMetric('agent_lifecycle');
    if (!isAgentLifecycleMetrics(lifecycleMetrics)) {
      throw new Error('Invalid agent lifecycle metrics structure');
    }
    const intelligenceValues: number[] = [];

    for (const metrics of Object.values(lifecycleMetrics)) {
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
    const spatialMetrics = this.collector.getMetric('spatial_metrics');
    if (!isSpatialMetrics(spatialMetrics)) {
      throw new Error('Invalid spatial metrics structure');
    }

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
    const socialMetrics = this.collector.getMetric('social_metrics');
    if (!isSocialMetrics(socialMetrics)) {
      throw new Error('Invalid social metrics structure');
    }
    const nodes: Array<{ id: string; label: string }> = [];
    const edges: Array<{ from: string; to: string }> = [];

    // Create nodes and edges from relationships
    // For now, we'll create a simple graph structure
    // In a real implementation, this would track all relationships

    // Create unique nodes from agents in lifecycle
    const lifecycleMetrics = this.collector.getMetric('agent_lifecycle');
    if (!isAgentLifecycleMetrics(lifecycleMetrics)) {
      throw new Error('Invalid agent lifecycle metrics structure');
    }
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
        try {
          const economicMetrics = this.collector.getMetric('economic_metrics');
          if (!isEconomicMetrics(economicMetrics)) {
            return true; // Keep alert if we can't validate
          }
          const foodStockpile = economicMetrics.stockpiles['food'];
          if (foodStockpile && foodStockpile.length > 0) {
            const lastEntry = foodStockpile[foodStockpile.length - 1];
            if (lastEntry && isStockpileEntry(lastEntry)) {
              const latestAmount = lastEntry.value;
              if (latestAmount >= alert.threshold) {
                return false; // Remove alert - condition resolved
              }
            }
          }
        } catch {
          // Keep alert if we can't check
        }
      }
      return true; // Keep alert
    });

    // Check for low food stockpile
    try {
      const economicMetrics = this.collector.getMetric('economic_metrics');
      if (!isEconomicMetrics(economicMetrics)) {
        throw new Error('Invalid economic metrics structure');
      }
      const foodStockpile = economicMetrics.stockpiles['food'];
      if (foodStockpile && foodStockpile.length > 0) {
        const lastEntry = foodStockpile[foodStockpile.length - 1];
        if (lastEntry && isStockpileEntry(lastEntry)) {
          const latestAmount = lastEntry.value;
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
      }
    } catch {
      // Ignore if no data
    }

    // Check for FPS drop
    try {
      const performanceMetrics = this.collector.getMetric('performance_metrics');
      if (!isPerformanceMetrics(performanceMetrics)) {
        throw new Error('Invalid performance metrics structure');
      }
      if (performanceMetrics.fps.length > 0) {
        const lastFpsEntry = performanceMetrics.fps[performanceMetrics.fps.length - 1];
        if (!lastFpsEntry) {
          throw new Error('Missing FPS entry');
        }
        const latestFps = lastFpsEntry.value;
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
      const emergentMetrics = this.collector.getMetric('emergent_metrics');
      if (!isEmergentMetrics(emergentMetrics)) {
        throw new Error('Invalid emergent metrics structure');
      }
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
  exportChart(chart: ChartData, format: 'png' | 'svg' | 'json'): Buffer {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(chart, null, 2));
    } else if (format === 'svg') {
      return Buffer.from(this.generateChartSVG(chart));
    } else if (format === 'png') {
      // PNG export requires canvas library which has native dependencies
      // For server-side PNG generation, consider using the SVG and converting with a library like sharp
      throw new Error('PNG export requires a canvas library. Use SVG format or convert SVG to PNG using sharp/canvas.');
    }

    throw new Error(`Unsupported chart export format: ${format}`);
  }

  /**
   * Generate SVG markup for a chart
   */
  private generateChartSVG(chart: ChartData): string {
    const width = 800;
    const height = 400;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    switch (chart.type) {
      case 'line':
        return this.generateLineSVG(chart, width, height, padding, chartWidth, chartHeight);
      case 'bar':
        return this.generateBarSVG(chart, width, height, padding, chartWidth, chartHeight);
      case 'heatmap':
        return this.generateHeatmapSVG(chart, width, height, padding);
      case 'graph':
        return this.generateGraphSVG(chart, width, height, padding);
      default:
        // For unsupported types, return a basic SVG with data as text
        return this.generateFallbackSVG(chart, width, height);
    }
  }

  /**
   * Generate line chart SVG
   */
  private generateLineSVG(
    chart: ChartData,
    width: number,
    height: number,
    padding: number,
    chartWidth: number,
    chartHeight: number
  ): string {
    const datasets = chart.data.datasets ?? [];
    const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#9c27b0'];

    // Find data range
    let minVal = Infinity;
    let maxVal = -Infinity;
    let maxPoints = 0;

    for (const dataset of datasets) {
      for (const val of dataset.data) {
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      if (dataset.data.length > maxPoints) maxPoints = dataset.data.length;
    }

    if (minVal === Infinity) minVal = 0;
    if (maxVal === -Infinity) maxVal = 100;
    if (maxVal === minVal) maxVal = minVal + 1;

    const range = maxVal - minVal;
    const scaleY = (val: number) => padding + chartHeight - ((val - minVal) / range) * chartHeight;
    const scaleX = (idx: number) => padding + (idx / Math.max(maxPoints - 1, 1)) * chartWidth;

    let paths = '';
    let legendItems = '';

    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      if (!dataset) continue;
      const color = colors[i % colors.length];
      const points = dataset.data.map((val, idx) => `${scaleX(idx)},${scaleY(val)}`).join(' ');

      paths += `<polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/>`;

      // Add legend item
      const legendY = padding + i * 20;
      legendItems += `
        <rect x="${width - padding - 100}" y="${legendY - 10}" width="12" height="12" fill="${color}"/>
        <text x="${width - padding - 82}" y="${legendY}" fill="#333" font-size="12">${dataset.label ?? `Series ${i + 1}`}</text>
      `;
    }

    // Add axes
    const axisPath = `
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
    `;

    // Add Y-axis labels
    const yLabels = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const val = minVal + range * pct;
      const y = scaleY(val);
      return `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" fill="#666" font-size="10">${val.toFixed(1)}</text>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>text { font-family: sans-serif; }</style>
  <rect width="100%" height="100%" fill="white"/>
  ${axisPath}
  ${yLabels}
  ${paths}
  ${legendItems}
</svg>`;
  }

  /**
   * Generate bar chart SVG
   */
  private generateBarSVG(
    chart: ChartData,
    width: number,
    height: number,
    padding: number,
    chartWidth: number,
    chartHeight: number
  ): string {
    const datasets = chart.data.datasets ?? [];
    const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#9c27b0'];

    // Find data range
    let maxVal = 0;
    let maxPoints = 0;

    for (const dataset of datasets) {
      for (const val of dataset.data) {
        if (val > maxVal) maxVal = val;
      }
      if (dataset.data.length > maxPoints) maxPoints = dataset.data.length;
    }

    if (maxVal === 0) maxVal = 100;

    const barGroupWidth = chartWidth / Math.max(maxPoints, 1);
    const barWidth = barGroupWidth / (datasets.length + 1);
    const scaleY = (val: number) => (val / maxVal) * chartHeight;

    let bars = '';
    let legendItems = '';

    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      if (!dataset) continue;
      const color = colors[i % colors.length];

      for (let j = 0; j < dataset.data.length; j++) {
        const val = dataset.data[j] ?? 0;
        const barHeight = scaleY(val);
        const x = padding + j * barGroupWidth + i * barWidth + barWidth / 2;
        const y = height - padding - barHeight;

        bars += `<rect x="${x}" y="${y}" width="${barWidth * 0.9}" height="${barHeight}" fill="${color}"/>`;
      }

      // Add legend item
      const legendY = padding + i * 20;
      legendItems += `
        <rect x="${width - padding - 100}" y="${legendY - 10}" width="12" height="12" fill="${color}"/>
        <text x="${width - padding - 82}" y="${legendY}" fill="#333" font-size="12">${dataset.label ?? `Series ${i + 1}`}</text>
      `;
    }

    // Add axes
    const axisPath = `
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>text { font-family: sans-serif; }</style>
  <rect width="100%" height="100%" fill="white"/>
  ${axisPath}
  ${bars}
  ${legendItems}
</svg>`;
  }

  /**
   * Generate heatmap SVG
   */
  private generateHeatmapSVG(
    chart: ChartData,
    width: number,
    height: number,
    padding: number
  ): string {
    const heatmap = chart.data.heatmap ?? {};
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find bounds and max value
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let maxVal = 0;

    for (const [xStr, row] of Object.entries(heatmap)) {
      const x = Number(xStr);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      for (const [yStr, val] of Object.entries(row as Record<number, number>)) {
        const y = Number(yStr);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (val > maxVal) maxVal = val;
      }
    }

    if (minX === Infinity) { minX = 0; maxX = 10; }
    if (minY === Infinity) { minY = 0; maxY = 10; }
    if (maxVal === 0) maxVal = 1;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const cellWidth = chartWidth / (rangeX + 1);
    const cellHeight = chartHeight / (rangeY + 1);

    let cells = '';
    for (const [xStr, row] of Object.entries(heatmap)) {
      const x = Number(xStr);
      for (const [yStr, val] of Object.entries(row as Record<number, number>)) {
        const y = Number(yStr);
        const intensity = val / maxVal;
        const red = Math.round(255 * intensity);
        const green = Math.round(255 * (1 - intensity * 0.5));
        const blue = Math.round(255 * (1 - intensity));
        const color = `rgb(${red},${green},${blue})`;

        const cx = padding + ((x - minX) / rangeX) * chartWidth;
        const cy = padding + ((y - minY) / rangeY) * chartHeight;

        cells += `<rect x="${cx}" y="${cy}" width="${cellWidth}" height="${cellHeight}" fill="${color}"/>`;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>text { font-family: sans-serif; }</style>
  <rect width="100%" height="100%" fill="white"/>
  ${cells}
</svg>`;
  }

  /**
   * Generate network graph SVG
   */
  private generateGraphSVG(
    chart: ChartData,
    width: number,
    height: number,
    padding: number
  ): string {
    const nodes = chart.data.nodes ?? [];
    const edges = chart.data.edges ?? [];
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Simple circular layout
    const nodePositions = new Map<string, { x: number; y: number }>();
    const centerX = padding + chartWidth / 2;
    const centerY = padding + chartHeight / 2;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 30;

    for (let i = 0; i < nodes.length; i++) {
      const angle = (2 * Math.PI * i) / nodes.length;
      nodePositions.set(nodes[i]!.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    // Draw edges
    let edgePaths = '';
    for (const edge of edges) {
      const from = nodePositions.get(edge.from);
      const to = nodePositions.get(edge.to);
      if (from && to) {
        edgePaths += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#999" stroke-width="1"/>`;
      }
    }

    // Draw nodes
    let nodePaths = '';
    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (pos) {
        nodePaths += `
          <circle cx="${pos.x}" cy="${pos.y}" r="8" fill="#4285f4"/>
          <text x="${pos.x}" y="${pos.y + 20}" text-anchor="middle" fill="#333" font-size="10">${node.label ?? node.id.slice(0, 8)}</text>
        `;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>text { font-family: sans-serif; }</style>
  <rect width="100%" height="100%" fill="white"/>
  ${edgePaths}
  ${nodePaths}
</svg>`;
  }

  /**
   * Generate fallback SVG for unsupported chart types
   */
  private generateFallbackSVG(chart: ChartData, width: number, height: number): string {
    const dataJson = JSON.stringify(chart.data, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>text { font-family: monospace; font-size: 10px; }</style>
  <rect width="100%" height="100%" fill="white"/>
  <text x="20" y="30" fill="#333">Chart Type: ${chart.type}</text>
  <text x="20" y="50" fill="#666">SVG visualization not implemented for this chart type.</text>
  <text x="20" y="70" fill="#666">Data (JSON):</text>
  <text x="20" y="90" fill="#333"><tspan>${dataJson.slice(0, 500)}${dataJson.length > 500 ? '...' : ''}</tspan></text>
</svg>`;
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
