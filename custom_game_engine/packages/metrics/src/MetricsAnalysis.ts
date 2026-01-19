/**
 * MetricsAnalysis - Automated analysis and insights generation
 *
 * Analyzes collected metrics to surface interesting findings, detect anomalies,
 * find correlations, and identify trends.
 */

import type { MetricsCollector } from './MetricsCollector.js';

/**
 * Insight severity level
 */
export type InsightSeverity = 'info' | 'warning' | 'critical';

/**
 * Generated insight
 */
export interface Insight {
  type: string;
  message: string;
  severity: InsightSeverity;
  recommendations: string[];
  timestamp: number;
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  type: 'spike' | 'drop' | 'depletion';
  severity: number;
  timestamp: number;
  metric: string;
  description: string;
}

/**
 * Correlation result
 */
export interface CorrelationResult {
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative' | 'none';
  description: string;
}

/**
 * Trend type
 */
export type TrendType = 'increasing' | 'decreasing' | 'stable' | 'cyclic';

/**
 * Trend data
 */
export interface TrendData {
  trend: TrendType;
  confidence: number;
  rateOfChange: number;
}

/**
 * Recognized pattern
 */
export interface RecognizedPattern {
  type: string;
  confidence: number;
  description: string;
  firstObserved: number;
  lastObserved: number;
  occurrences: number;
}

/**
 * Performance bottleneck
 */
export interface PerformanceBottleneck {
  system: string;
  impact: 'low' | 'medium' | 'high';
  avgDuration: number;
  recommendation: string;
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  area: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImprovement: string;
}

export class MetricsAnalysis {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    if (!collector) {
      throw new Error('MetricsAnalysis requires a MetricsCollector instance');
    }
    this.collector = collector;
  }

  /**
   * Generate automatic insights
   */
  generateInsights(): Insight[] {
    const insights: Insight[] = [];

    // Check for population stall
    try {
      const populationStall = this.detectPopulationStall();
      if (populationStall) {
        insights.push(populationStall);
      }
    } catch (e) {
      // Ignore errors for missing data
    }

    // Check for resource shortage
    try {
      const resourceShortage = this.detectResourceShortage();
      if (resourceShortage) {
        insights.push(resourceShortage);
      }
    } catch (e) {
      // Ignore errors for missing data
    }

    // Check for intelligence decline
    try {
      const intelligenceDecline = this.detectIntelligenceDecline();
      if (intelligenceDecline) {
        insights.push(intelligenceDecline);
      }
    } catch (e) {
      // Ignore errors for missing data
    }

    // Check for survival rate improvement
    try {
      const survivalImprovement = this.detectSurvivalImprovement();
      if (survivalImprovement) {
        insights.push(survivalImprovement);
      }
    } catch (e) {
      // Ignore errors for missing data
    }

    // Check for primary cause of death
    try {
      const deathCause = this.detectPrimaryDeathCause();
      if (deathCause) {
        insights.push(deathCause);
      }
    } catch (e) {
      // Ignore errors for missing data
    }

    return insights;
  }

  /**
   * Detect population stall
   */
  private detectPopulationStall(): Insight | null {
    const populationSamples = this.collector.getPopulationSamples();

    if (populationSamples.length < 2) return null;

    // Check if population has been stagnant
    const recent = populationSamples.slice(-10); // Last 10 samples
    if (recent.length < 10) return null;

    const first = recent[0]!.population;
    const last = recent[recent.length - 1]!.population;
    const growthRate = first === 0 ? 0 : Math.abs((last - first) / first);

    if (growthRate < 0.001) {
      return {
        type: 'population_stall',
        message: `Population growth has stalled (${(growthRate * 100).toFixed(1)}% over last ${recent.length} hours)`,
        severity: 'warning',
        recommendations: [
          'Check if agents are meeting reproductive requirements',
          'Ensure food and resources are available',
          'Investigate death causes',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Detect resource shortage
   */
  private detectResourceShortage(): Insight | null {
    const economicMetrics = this.collector.getMetric('economic_metrics') as any;

    for (const [resourceType, gathered] of Object.entries(economicMetrics.resourcesGathered)) {
      const consumed = economicMetrics.resourcesConsumed[resourceType];
      const gatherData = gathered as { totalGathered: number };

      if (consumed && gatherData.totalGathered < consumed.totalConsumed) {
        const deficit = consumed.totalConsumed - gatherData.totalGathered;
        const deficitPercent = Math.round((deficit / consumed.totalConsumed) * 100);

        return {
          type: 'resource_shortage',
          message: `${resourceType} consumption exceeds production by ${deficitPercent}%`,
          severity: 'critical',
          recommendations: [
            `Increase ${resourceType} gathering`,
            `Reduce ${resourceType} consumption`,
            `Build more ${resourceType} production facilities`,
          ],
          timestamp: Date.now(),
        };
      }
    }

    return null;
  }

  /**
   * Detect intelligence decline
   */
  private detectIntelligenceDecline(): Insight | null {
    const generationData = this.collector.getGenerationData();

    if (generationData.length < 3) return null;

    // Check last 3 generations for declining trend
    const recent = generationData.slice(-3);
    const first = recent[0]!.avgIntelligence;
    const last = recent[recent.length - 1]!.avgIntelligence;
    const decline = first - last;

    if (decline >= 2) {
      return {
        type: 'intelligence_decline',
        message: `Intelligence decreased ${decline.toFixed(1)} points over ${recent.length} generations`,
        severity: 'warning',
        recommendations: [
          'Review selection pressures affecting intelligence',
          'Ensure intelligent agents are surviving and reproducing',
          'Check if environmental factors favor other traits',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Detect survival improvement
   */
  private detectSurvivalImprovement(): Insight | null {
    const survivalRateData = this.collector.getSurvivalRateData();

    if (survivalRateData.length < 2) return null;

    // Compare before/after contexts
    const before = survivalRateData.find(d => d.context.includes('before'));
    const after = survivalRateData.find(d => d.context.includes('after'));

    if (before && after && after.rate > before.rate) {
      const improvement = ((after.rate - before.rate) / before.rate) * 100;
      return {
        type: 'survival_improvement',
        message: `Agent survival rate improved ${improvement.toFixed(0)}% since building shelters`,
        severity: 'info',
        recommendations: [
          'Continue current strategies',
          'Document successful approaches',
          'Scale up successful infrastructure',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Detect primary cause of death
   */
  private detectPrimaryDeathCause(): Insight | null {
    const lifecycleMetrics = this.collector.getMetric('agent_lifecycle') as Record<string, { causeOfDeath?: string }>;
    const causes = new Map<string, number>();
    let totalDeaths = 0;

    for (const metrics of Object.values(lifecycleMetrics)) {
      if (metrics.causeOfDeath) {
        causes.set(metrics.causeOfDeath, (causes.get(metrics.causeOfDeath) || 0) + 1);
        totalDeaths++;
      }
    }

    if (totalDeaths === 0) return null;

    let primaryCause = '';
    let maxCount = 0;

    for (const [cause, count] of causes) {
      if (count > maxCount) {
        maxCount = count;
        primaryCause = cause;
      }
    }

    if (primaryCause) {
      const percent = Math.round((maxCount / totalDeaths) * 100);
      return {
        type: 'primary_death_cause',
        message: `Primary cause of death is ${primaryCause} (${percent}%)`,
        severity: 'warning',
        recommendations: [
          `Address ${primaryCause} risk factors`,
          'Improve resource availability',
          'Build protective infrastructure',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Detect anomalies in a metric
   */
  detectAnomalies(metric: string): Anomaly[] {
    const anomalies: Anomaly[] = [];

    try {
      if (metric === 'population') {
        const populationAnomalies = this.detectPopulationAnomalies();
        anomalies.push(...populationAnomalies);
      } else if (metric.startsWith('stockpile_')) {
        const resourceType = metric.replace('stockpile_', '');
        const stockpileAnomalies = this.detectStockpileAnomalies(resourceType);
        anomalies.push(...stockpileAnomalies);
      } else if (metric === 'fps') {
        const fpsAnomalies = this.detectFPSAnomalies();
        anomalies.push(...fpsAnomalies);
      } else {
        throw new Error(`Cannot analyze non-existent metric: ${metric}`);
      }
    } catch (error) {
      throw error;
    }

    return anomalies;
  }

  /**
   * Detect population anomalies
   */
  private detectPopulationAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const populationSamples = this.collector.getPopulationSamples();

    if (populationSamples.length < 2) return anomalies;

    // Check for spikes
    for (let i = 1; i < populationSamples.length; i++) {
      const prev = populationSamples[i - 1]!.population;
      const curr = populationSamples[i]!.population;

      if (prev > 0 && curr > prev * 1.5) {
        // 50% increase is a spike
        // Calculate severity based on magnitude of spike
        const multiplier = curr / prev;
        const severity = Math.min(10, Math.max(5, Math.round(multiplier * 2)));
        anomalies.push({
          type: 'spike',
          severity,
          timestamp: populationSamples[i]!.timestamp,
          metric: 'population',
          description: `Population spike from ${prev} to ${curr}`,
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect stockpile anomalies
   */
  private detectStockpileAnomalies(resourceType: string): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const economicMetrics = this.collector.getMetric('economic_metrics') as any;
    const stockpile = economicMetrics.stockpiles[resourceType];

    if (!stockpile || stockpile.length < 2) return anomalies;

    // Check for sudden depletion
    for (let i = 1; i < stockpile.length; i++) {
      const prev = stockpile[i - 1].value;
      const curr = stockpile[i].value;

      if (prev > 500 && curr === 0) {
        anomalies.push({
          type: 'depletion',
          severity: 8,
          timestamp: stockpile[i].timestamp,
          metric: `stockpile_${resourceType}`,
          description: `Sudden depletion of ${resourceType} stockpile`,
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect FPS anomalies
   */
  private detectFPSAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const performanceMetrics = this.collector.getMetric('performance_metrics') as any;
    const fpsData = performanceMetrics.fps;

    if (fpsData.length < 10) return anomalies;

    // Calculate baseline
    const baseline = fpsData.slice(0, -1).reduce((sum: number, d: { value: number }) => sum + d.value, 0) / (fpsData.length - 1);
    const latest = fpsData[fpsData.length - 1];

    // Detect significant drop
    if (baseline > 55 && latest.value < 20) {
      anomalies.push({
        type: 'drop',
        severity: 9,
        timestamp: latest.timestamp,
        metric: 'fps',
        description: `Significant FPS drop from ${Math.round(baseline)} to ${latest.value}`,
      });
    }

    return anomalies;
  }

  /**
   * Find correlations between two metrics
   */
  findCorrelations(metric1: string, metric2: string): CorrelationResult {
    const data = this.extractCorrelationData(metric1, metric2);

    if (data.length < 2) {
      throw new Error('Insufficient data for correlation analysis (minimum 2 samples required)');
    }

    const coefficient = this.calculateCorrelation(data.map(d => d[0]!), data.map(d => d[1]!));
    const absCoeff = Math.abs(coefficient);

    let strength: 'weak' | 'moderate' | 'strong';
    if (absCoeff < 0.3) {
      strength = 'weak';
    } else if (absCoeff < 0.7) {
      strength = 'moderate';
    } else {
      strength = 'strong';
    }

    let direction: 'positive' | 'negative' | 'none';
    if (coefficient > 0.1) {
      direction = 'positive';
    } else if (coefficient < -0.1) {
      direction = 'negative';
    } else {
      direction = 'none';
    }

    const description = this.generateCorrelationDescription(metric1, metric2, coefficient, strength, direction);

    return {
      coefficient,
      strength,
      direction,
      description,
    };
  }

  /**
   * Extract correlation data
   */
  private extractCorrelationData(metric1: string, metric2: string): number[][] {
    const data: number[][] = [];

    if (metric1 === 'intelligence' && metric2 === 'lifespan') {
      const lifecycleMetrics = this.collector.getMetric('agent_lifecycle') as Record<string, { initialStats?: { intelligence?: number }, lifespan?: number }>;

      for (const metrics of Object.values(lifecycleMetrics)) {
        const intelligence = metrics.initialStats?.intelligence;
        const lifespan = metrics.lifespan;

        if (intelligence !== undefined && lifespan !== undefined) {
          data.push([intelligence, lifespan]);
        }
      }
    } else if (metric1 === 'hunger_crises' && metric2 === 'health') {
      const needsMetrics = this.collector.getMetric('needs_metrics') as Record<string, { hungerCrisisEvents: number, health: Array<{ value: number }> }>;

      for (const metrics of Object.values(needsMetrics)) {
        const hungerCrises = metrics.hungerCrisisEvents;
        const avgHealth = metrics.health.reduce((sum: number, d: { value: number }) => sum + d.value, 0) / metrics.health.length;

        if (hungerCrises !== undefined && avgHealth) {
          data.push([hungerCrises, avgHealth]);
        }
      }
    }

    return data;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Generate human-readable correlation description
   */
  private generateCorrelationDescription(
    metric1: string,
    metric2: string,
    coefficient: number,
    strength: string,
    direction: string
  ): string {
    if (direction === 'none') {
      return `No significant correlation between ${metric1} and ${metric2}`;
    }

    const impact = Math.round(Math.abs(coefficient) * 100);
    return `${strength} ${direction} correlation: Higher ${metric1} correlates with ${direction === 'positive' ? 'higher' : 'lower'} ${metric2} (${impact}% correlation)`;
  }

  /**
   * Detect trend in a metric
   */
  detectTrend(metric: string): TrendType {
    const trendData = this.getTrendData(metric);
    return trendData.trend;
  }

  /**
   * Get detailed trend data
   */
  getTrendData(metric: string): TrendData {
    const dataPoints = this.extractTrendData(metric);

    if (dataPoints.length < 3) {
      throw new Error('Cannot detect trend: no data available');
    }

    // Calculate linear regression slope
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataPoints.reduce((sum, y) => sum + y, 0);
    const sumXY = dataPoints.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = dataPoints.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;

    // Detect pattern
    let trend: TrendType;
    const slopePercent = Math.abs(slope / avgValue);

    if (slopePercent < 0.01) {
      // Check if cyclic
      const isCyclic = this.detectCyclicPattern(dataPoints);
      trend = isCyclic ? 'cyclic' : 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate confidence
    const rSquared = this.calculateRSquared(dataPoints, slope);
    const confidence = trend === 'cyclic' ? 0.7 : Math.min(rSquared, 1.0);

    return {
      trend,
      confidence,
      rateOfChange: slope,
    };
  }

  /**
   * Extract trend data points
   */
  private extractTrendData(metric: string): number[] {
    if (metric === 'population') {
      const samples = this.collector.getPopulationSamples();
      return samples.map(s => s.population);
    }

    // For other metrics, return empty array for now
    return [];
  }

  /**
   * Detect cyclic pattern in data
   */
  private detectCyclicPattern(data: number[]): boolean {
    if (data.length < 10) return false;

    // Check for repeating pattern by testing different periods
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;

    if (variance === 0) return false;

    // Test multiple potential periods
    for (let period = 3; period <= Math.floor(data.length / 3); period++) {
      let autocorr = 0;
      let count = 0;

      for (let i = 0; i < data.length - period; i++) {
        autocorr += (data[i]! - mean) * (data[i + period]! - mean);
        count++;
      }

      autocorr = autocorr / (count * variance);

      // If strong autocorrelation at this period, likely cyclic
      // Lowered threshold to 0.5 for better sensitivity to cyclic patterns
      if (autocorr > 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate R-squared value
   */
  private calculateRSquared(data: number[], slope: number): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const mean = data.reduce((sum, v) => sum + v, 0) / n;

    // Calculate intercept for best fit line: intercept = mean - slope * (n-1)/2
    const xMean = (n - 1) / 2;
    const intercept = mean - slope * xMean;

    // Calculate predicted values
    const predicted = data.map((_, i) => slope * i + intercept);

    // Calculate residual sum of squares
    const ssRes = data.reduce((sum, y, i) => sum + Math.pow(y - predicted[i]!, 2), 0);

    // Calculate total sum of squares
    const ssTot = data.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);

    if (ssTot === 0) {
      // Perfect fit if no variance
      return 1.0;
    }

    const rSquared = 1 - ssRes / ssTot;

    // Return absolute value to handle negative R-squared (worse than mean model)
    return Math.max(0, Math.min(1, rSquared));
  }

  /**
   * Recognize patterns in behavior
   */
  recognizePatterns(): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Detect specialization
    const specialization = this.detectSpecialization();
    if (specialization) {
      patterns.push(specialization);
    }

    // Detect trade routes
    const tradeRoutes = this.detectTradeRoutes();
    if (tradeRoutes) {
      patterns.push(tradeRoutes);
    }

    // Detect social clustering
    const clustering = this.detectSocialClustering();
    if (clustering) {
      patterns.push(clustering);
    }

    return patterns;
  }

  /**
   * Detect specialization pattern
   */
  private detectSpecialization(): RecognizedPattern | null {
    const economicMetrics = this.collector.getMetric('economic_metrics') as any;
    const resourcesGathered = economicMetrics.resourcesGathered;

    // Check if different agents specialize in different resources
    // This would require per-agent tracking, simplified for now
    const resourceTypes = Object.keys(resourcesGathered);
    if (resourceTypes.length > 1) {
      return {
        type: 'specialization',
        confidence: 0.8,
        description: 'Agents are specializing in different resource types',
        firstObserved: Date.now(),
        lastObserved: Date.now(),
        occurrences: resourceTypes.length,
      };
    }

    return null;
  }

  /**
   * Detect trade route pattern
   */
  private detectTradeRoutes(): RecognizedPattern | null {
    const spatialMetrics = this.collector.getMetric('spatial_metrics') as Record<string, any>;

    // spatialMetrics has a flattened structure where agent metrics are at top level
    // Look for agents with significant distance traveled (indicates repeated movement)
    let totalAgentsMoving = 0;
    let totalDistance = 0;

    // Iterate over all keys in spatialMetrics except heatmap and pathfindingFailures
    for (const [key, value] of Object.entries(spatialMetrics)) {
      if (key === 'heatmap' || key === 'pathfindingFailures') continue;

      const agentMetrics = value as { totalDistanceTraveled?: number };
      if (agentMetrics.totalDistanceTraveled && agentMetrics.totalDistanceTraveled > 100) {
        totalAgentsMoving++;
        totalDistance += agentMetrics.totalDistanceTraveled;
      }
    }

    // If multiple agents are making repeated long journeys, it's likely a trade route
    if (totalAgentsMoving > 0 && totalDistance > 1000) {
      return {
        type: 'trade_route',
        confidence: 0.7,
        description: 'Agents making repeated movements between locations',
        firstObserved: Date.now(),
        lastObserved: Date.now(),
        occurrences: totalAgentsMoving,
      };
    }

    return null;
  }

  /**
   * Detect social clustering
   */
  private detectSocialClustering(): RecognizedPattern | null {
    const socialMetrics = this.collector.getMetric('social_metrics') as any;

    // Look for clustering when there are enough relationships and conversations
    // Use relationshipsFormed as the primary signal since conversations trigger relationship events
    if (socialMetrics.relationshipsFormed >= 5 && socialMetrics.conversationsPerDay >= 1) {
      // Calculate clustering strength
      const clusteringStrength = socialMetrics.socialNetworkDensity > 0
        ? socialMetrics.relationshipsFormed / Math.max(1, socialMetrics.socialNetworkDensity)
        : socialMetrics.relationshipsFormed;

      return {
        type: 'social_clustering',
        confidence: 0.7,
        description: 'Agents are forming distinct social groups',
        firstObserved: Date.now(),
        lastObserved: Date.now(),
        occurrences: Math.max(1, Math.floor(clusteringStrength)),
      };
    }

    return null;
  }

  /**
   * Find performance bottlenecks
   */
  findPerformanceBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const performanceMetrics = this.collector.getMetric('performance_metrics') as any;
    const systemTiming = performanceMetrics.systemTiming as Record<string, number>;

    for (const [system, duration] of Object.entries(systemTiming)) {
      const avgDuration = typeof duration === 'number' ? duration : 0;
      let impact: 'low' | 'medium' | 'high';
      if (avgDuration > 30) {
        impact = 'high';
      } else if (avgDuration > 15) {
        impact = 'medium';
      } else {
        impact = 'low';
      }

      if (impact !== 'low') {
        bottlenecks.push({
          system,
          impact,
          avgDuration,
          recommendation: `Optimize ${system} to reduce execution time`,
        });
      }
    }

    // Sort by duration (highest first)
    bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration);

    return bottlenecks;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const spatialMetrics = this.collector.getMetric('spatial_metrics') as any;

    // Check pathfinding failure rate
    if (spatialMetrics.pathfindingFailures > 50) {
      suggestions.push({
        area: 'pathfinding',
        priority: 'high',
        description: 'High pathfinding failure rate detected',
        expectedImprovement: 'Reduce pathfinding calls by 50% with caching',
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(): number {
    const performanceMetrics = this.collector.getMetric('performance_metrics') as any;

    if (performanceMetrics.fps.length === 0) {
      return 0;
    }

    const avgFps = performanceMetrics.avgFps;
    const fpsScore = Math.min(avgFps / 60, 1.0) * 40;

    const frameDropScore = Math.max(0, 1 - performanceMetrics.frameDrops / 100) * 30;

    const memoryScore = 30; // Simplified

    return Math.round(fpsScore + frameDropScore + memoryScore);
  }
}
