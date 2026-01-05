/**
 * Queue Metrics Collector
 *
 * Tracks queue performance metrics over time:
 * - Queue length history
 * - Request rates
 * - Wait times
 * - Success/failure rates
 * - Provider utilization
 */

export interface QueueSnapshot {
  timestamp: number;
  provider: string;
  queueLength: number;
  rateLimited: boolean;
  rateLimitWaitMs: number;
  utilizationPercent: number;
  availableSlots: number;
  maxConcurrent: number;
}

export interface RequestMetric {
  timestamp: number;
  provider: string;
  sessionId: string;
  agentId: string;
  success: boolean;
  waitMs: number;
  executionMs: number;
  error?: string;
}

export interface AggregatedMetrics {
  timeWindow: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgQueueLength: number;
  maxQueueLength: number;
  avgWaitMs: number;
  maxWaitMs: number;
  avgExecutionMs: number;
  requestsPerMinute: number;
  providerBreakdown: Record<string, {
    requests: number;
    avgQueueLength: number;
    avgWaitMs: number;
  }>;
}

export class QueueMetricsCollector {
  private snapshots: QueueSnapshot[] = [];
  private requests: RequestMetric[] = [];

  // Keep last N entries
  private maxSnapshots: number;
  private maxRequests: number;

  // Sampling interval for snapshots (default: 10 seconds)
  private snapshotInterval: number;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    maxSnapshots: number = 1000,
    maxRequests: number = 10000,
    snapshotInterval: number = 10000
  ) {
    this.maxSnapshots = maxSnapshots;
    this.maxRequests = maxRequests;
    this.snapshotInterval = snapshotInterval;
  }

  /**
   * Start automatic snapshot collection
   */
  startAutoSnapshot(getQueueStats: () => any): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }

    this.snapshotTimer = setInterval(() => {
      const stats = getQueueStats();

      // Record snapshot for each provider
      for (const [provider, stat] of Object.entries(stats)) {
        this.recordSnapshot({
          timestamp: Date.now(),
          provider,
          queueLength: (stat as any).queueLength || 0,
          rateLimited: (stat as any).rateLimited || false,
          rateLimitWaitMs: (stat as any).rateLimitWaitMs || 0,
          utilizationPercent: (stat as any).semaphoreStats?.utilization || 0,
          availableSlots: (stat as any).semaphoreStats?.available || 0,
          maxConcurrent: (stat as any).semaphoreStats?.capacity || 0,
        });
      }
    }, this.snapshotInterval);
  }

  /**
   * Stop automatic snapshot collection
   */
  stopAutoSnapshot(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  /**
   * Record a queue snapshot
   */
  recordSnapshot(snapshot: QueueSnapshot): void {
    this.snapshots.push(snapshot);

    // Trim old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  /**
   * Record a request metric
   */
  recordRequest(metric: RequestMetric): void {
    this.requests.push(metric);

    // Trim old requests
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests);
    }
  }

  /**
   * Get recent snapshots
   */
  getRecentSnapshots(minutes: number = 60): QueueSnapshot[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.snapshots.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Get recent requests
   */
  getRecentRequests(minutes: number = 60): RequestMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.requests.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Get aggregated metrics for a time window
   */
  getAggregatedMetrics(minutes: number = 60): AggregatedMetrics {
    const requests = this.getRecentRequests(minutes);
    const snapshots = this.getRecentSnapshots(minutes);

    const successfulRequests = requests.filter(r => r.success);
    const failedRequests = requests.filter(r => !r.success);

    const queueLengths = snapshots.map(s => s.queueLength);
    const waitTimes = requests.map(r => r.waitMs);
    const executionTimes = requests.map(r => r.executionMs);

    // Provider breakdown
    const providerBreakdown: Record<string, {
      requests: number;
      avgQueueLength: number;
      avgWaitMs: number;
    }> = {};

    for (const provider of new Set(requests.map(r => r.provider))) {
      const providerRequests = requests.filter(r => r.provider === provider);
      const providerSnapshots = snapshots.filter(s => s.provider === provider);

      providerBreakdown[provider] = {
        requests: providerRequests.length,
        avgQueueLength: this.avg(providerSnapshots.map(s => s.queueLength)),
        avgWaitMs: this.avg(providerRequests.map(r => r.waitMs)),
      };
    }

    return {
      timeWindow: `${minutes} minutes`,
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      avgQueueLength: this.avg(queueLengths),
      maxQueueLength: Math.max(...queueLengths, 0),
      avgWaitMs: this.avg(waitTimes),
      maxWaitMs: Math.max(...waitTimes, 0),
      avgExecutionMs: this.avg(executionTimes),
      requestsPerMinute: requests.length / minutes,
      providerBreakdown,
    };
  }

  /**
   * Get queue length over time (for graphing)
   */
  getQueueLengthHistory(provider: string, minutes: number = 60): Array<{ timestamp: number; queueLength: number }> {
    const snapshots = this.getRecentSnapshots(minutes)
      .filter(s => s.provider === provider);

    return snapshots.map(s => ({
      timestamp: s.timestamp,
      queueLength: s.queueLength,
    }));
  }

  /**
   * Get current stats
   */
  getCurrentStats() {
    const metrics5min = this.getAggregatedMetrics(5);
    const metrics60min = this.getAggregatedMetrics(60);

    return {
      last5Minutes: metrics5min,
      last60Minutes: metrics60min,
      totalSnapshots: this.snapshots.length,
      totalRequests: this.requests.length,
    };
  }

  private avg(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}
