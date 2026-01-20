/**
 * SystemProfiler - Performance profiling infrastructure for system optimization
 *
 * Measures per-system execution time, CPU usage, and entity processing to identify
 * performance hotspots and optimization opportunities.
 *
 * Key Features:
 * - Per-tick metrics (execution time, CPU %, entity count)
 * - Aggregate metrics over rolling windows (avg, max, p99, stddev)
 * - Hotspot detection (slow systems, high variance, allocation spikes)
 * - Optimization recommendations
 * - Minimal overhead (<1% of tick budget)
 *
 * Usage:
 * ```typescript
 * const profiler = new SystemProfiler();
 *
 * // Wrap system execution
 * profiler.profileSystem('my_system', () => {
 *   system.update(world, entities, deltaTime);
 * }, entities.length);
 *
 * // Generate report
 * const report = profiler.getReport();
 * console.log(report.markdown);
 * ```
 */

export interface SystemMetrics {
  /** System identifier */
  systemName: string;

  /** Per-tick samples */
  samples: TickSample[];

  /** Aggregate metrics (rolling window) */
  avgExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  stdDevExecutionTimeMs: number;

  /** CPU percentage (relative to total tick time) */
  avgCpuPercent: number;
  maxCpuPercent: number;

  /** Entity processing */
  avgEntityCount: number;
  maxEntityCount: number;

  /** Throttle effectiveness (if throttled) */
  ticksProcessed: number;
  ticksSkipped: number;
  throttleEffectiveness: number; // 0-1, higher = more skips (good for non-critical systems)

  /** Consistency */
  isConsistent: boolean; // stddev < 50% of mean
}

export interface TickSample {
  tick: number;
  executionTimeMs: number;
  entityCount: number;
  timestamp: number;
}

export interface HotspotDetection {
  systemName: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  measurement: string;
  suggestion: string;
}

export interface PerformanceReport {
  /** Report generation timestamp */
  timestamp: number;

  /** Tick range covered */
  startTick: number;
  endTick: number;
  ticksCovered: number;

  /** Total metrics */
  totalTickTimeMs: number;
  avgTickTimeMs: number;
  maxTickTimeMs: number;
  targetTickTimeMs: number;
  budgetUsagePercent: number;
  actualTPS: number;

  /** Per-system metrics */
  systems: SystemMetrics[];

  /** Hotspots detected */
  hotspots: HotspotDetection[];

  /** Summary */
  summary: string;
}

/**
 * Rolling window configuration
 */
const WINDOW_SIZE = 100; // Keep last 100 ticks
const BUDGET_MS_PER_SYSTEM = 5; // Max 5ms per system (guideline from PERFORMANCE.md)
const TARGET_MS_PER_TICK = 50; // 20 TPS = 50ms per tick
const TARGET_TPS = 20;

/**
 * System profiler for performance analysis
 */
export class SystemProfiler {
  /** Per-system metrics storage */
  private metrics = new Map<string, SystemMetrics>();

  /** Total tick timing */
  private tickTimings: Array<{ tick: number; totalMs: number }> = [];

  /** Current tick (for correlation) */
  private currentTick = 0;

  /** Start tick for report range */
  private startTick = 0;

  /**
   * Start a new profiling session
   */
  startSession(startTick: number): void {
    this.metrics.clear();
    this.tickTimings = [];
    this.currentTick = startTick;
    this.startTick = startTick;
  }

  /**
   * Set current tick (called at start of each tick)
   */
  setCurrentTick(tick: number): void {
    this.currentTick = tick;
  }

  /**
   * Record total tick time
   */
  recordTickTime(tick: number, totalMs: number): void {
    this.tickTimings.push({ tick, totalMs });

    // Keep only last WINDOW_SIZE ticks
    if (this.tickTimings.length > WINDOW_SIZE) {
      this.tickTimings.shift();
    }
  }

  /**
   * Profile a system execution
   * Returns the result of the function for transparent wrapping
   */
  profileSystem<T>(
    systemName: string,
    fn: () => T,
    entityCount: number
  ): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    this.recordMetric(systemName, endTime - startTime, entityCount);
    return result;
  }

  /**
   * Record a metric sample
   */
  private recordMetric(
    systemName: string,
    executionTimeMs: number,
    entityCount: number
  ): void {
    let metrics = this.metrics.get(systemName);

    if (!metrics) {
      metrics = {
        systemName,
        samples: [],
        avgExecutionTimeMs: 0,
        maxExecutionTimeMs: 0,
        p99ExecutionTimeMs: 0,
        stdDevExecutionTimeMs: 0,
        avgCpuPercent: 0,
        maxCpuPercent: 0,
        avgEntityCount: 0,
        maxEntityCount: 0,
        ticksProcessed: 0,
        ticksSkipped: 0,
        throttleEffectiveness: 0,
        isConsistent: true,
      };
      this.metrics.set(systemName, metrics);
    }

    // Add sample
    const sample: TickSample = {
      tick: this.currentTick,
      executionTimeMs,
      entityCount,
      timestamp: Date.now(),
    };

    metrics.samples.push(sample);

    // Keep only last WINDOW_SIZE samples
    if (metrics.samples.length > WINDOW_SIZE) {
      metrics.samples.shift();
    }

    // Recompute aggregates
    this.recomputeAggregates(metrics);
  }

  /**
   * Record a throttled skip (system didn't run this tick)
   */
  recordThrottleSkip(systemName: string): void {
    const metrics = this.metrics.get(systemName);
    if (metrics) {
      metrics.ticksSkipped++;
      metrics.throttleEffectiveness =
        metrics.ticksSkipped / (metrics.ticksProcessed + metrics.ticksSkipped);
    }
  }

  /**
   * Recompute aggregate metrics from samples
   */
  private recomputeAggregates(metrics: SystemMetrics): void {
    const samples = metrics.samples;
    if (samples.length === 0) return;

    metrics.ticksProcessed = samples.length;

    // Execution time stats
    const times = samples.map((s) => s.executionTimeMs);
    metrics.avgExecutionTimeMs = times.reduce((a, b) => a + b, 0) / times.length;
    metrics.maxExecutionTimeMs = Math.max(...times);

    // P99 (99th percentile)
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    metrics.p99ExecutionTimeMs = sortedTimes[p99Index] || sortedTimes[sortedTimes.length - 1] || 0;

    // Standard deviation
    const variance =
      times.reduce((sum, t) => sum + Math.pow(t - metrics.avgExecutionTimeMs, 2), 0) /
      times.length;
    metrics.stdDevExecutionTimeMs = Math.sqrt(variance);

    // Consistency check: stddev < 50% of mean
    metrics.isConsistent = metrics.stdDevExecutionTimeMs < metrics.avgExecutionTimeMs * 0.5;

    // Entity count stats
    const entityCounts = samples.map((s) => s.entityCount);
    metrics.avgEntityCount = entityCounts.reduce((a, b) => a + b, 0) / entityCounts.length;
    metrics.maxEntityCount = Math.max(...entityCounts);

    // CPU percentage (requires tick timing data)
    if (this.tickTimings.length > 0) {
      const recentTickTimings = this.tickTimings.slice(-samples.length);
      const avgTickTime =
        recentTickTimings.reduce((sum, t) => sum + t.totalMs, 0) / recentTickTimings.length;

      if (avgTickTime > 0) {
        metrics.avgCpuPercent = (metrics.avgExecutionTimeMs / avgTickTime) * 100;
        metrics.maxCpuPercent = (metrics.maxExecutionTimeMs / avgTickTime) * 100;
      }
    }
  }

  /**
   * Generate performance report
   */
  getReport(): PerformanceReport {
    const endTick = this.currentTick;
    const ticksCovered = endTick - this.startTick;

    // Calculate total tick metrics
    const avgTickTime =
      this.tickTimings.length > 0
        ? this.tickTimings.reduce((sum, t) => sum + t.totalMs, 0) / this.tickTimings.length
        : 0;
    const maxTickTime = this.tickTimings.length > 0
      ? Math.max(...this.tickTimings.map((t) => t.totalMs))
      : 0;
    const totalTickTime = avgTickTime;
    const budgetUsage = (totalTickTime / TARGET_MS_PER_TICK) * 100;
    const actualTPS = totalTickTime > 0 ? 1000 / totalTickTime : 0;

    // Sort systems by avg execution time (descending)
    const systemsArray = Array.from(this.metrics.values()).sort(
      (a, b) => b.avgExecutionTimeMs - a.avgExecutionTimeMs
    );

    // Detect hotspots
    const hotspots = this.detectHotspots(systemsArray, avgTickTime);

    // Generate summary
    const summary = this.generateSummary(
      systemsArray,
      hotspots,
      totalTickTime,
      budgetUsage,
      actualTPS
    );

    return {
      timestamp: Date.now(),
      startTick: this.startTick,
      endTick,
      ticksCovered,
      totalTickTimeMs: totalTickTime,
      avgTickTimeMs: avgTickTime,
      maxTickTimeMs: maxTickTime,
      targetTickTimeMs: TARGET_MS_PER_TICK,
      budgetUsagePercent: budgetUsage,
      actualTPS,
      systems: systemsArray,
      hotspots,
      summary,
    };
  }

  /**
   * Detect performance hotspots
   */
  private detectHotspots(
    systems: SystemMetrics[],
    avgTickTime: number
  ): HotspotDetection[] {
    const hotspots: HotspotDetection[] = [];

    for (const system of systems) {
      // Critical: System exceeds budget significantly (>2x)
      if (system.maxExecutionTimeMs > BUDGET_MS_PER_SYSTEM * 2) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'critical',
          issue: 'Exceeds budget by >2x',
          measurement: `${system.maxExecutionTimeMs.toFixed(1)}ms max (budget: ${BUDGET_MS_PER_SYSTEM}ms)`,
          suggestion: this.generateOptimizationSuggestion(system, 'critical'),
        });
      }
      // Warning: System exceeds budget
      else if (system.maxExecutionTimeMs > BUDGET_MS_PER_SYSTEM) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'warning',
          issue: 'Exceeds recommended budget',
          measurement: `${system.maxExecutionTimeMs.toFixed(1)}ms max (budget: ${BUDGET_MS_PER_SYSTEM}ms)`,
          suggestion: this.generateOptimizationSuggestion(system, 'warning'),
        });
      }

      // Warning: High variance (inconsistent performance)
      if (!system.isConsistent && system.avgExecutionTimeMs > 1) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'warning',
          issue: 'High variance (inconsistent)',
          measurement: `stddev: ${system.stdDevExecutionTimeMs.toFixed(1)}ms (${((system.stdDevExecutionTimeMs / system.avgExecutionTimeMs) * 100).toFixed(0)}% of mean)`,
          suggestion:
            'Investigate spiky behavior. Check for: conditional expensive operations, query caching issues, or LLM call delays.',
        });
      }

      // Info: High CPU usage but within budget
      if (
        system.avgCpuPercent > 20 &&
        system.maxExecutionTimeMs <= BUDGET_MS_PER_SYSTEM
      ) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'info',
          issue: 'High CPU usage',
          measurement: `${system.avgCpuPercent.toFixed(1)}% avg CPU`,
          suggestion:
            'System is within budget but uses significant CPU. Consider throttling if not critical.',
        });
      }

      // Info: Processing many entities
      if (system.avgEntityCount > 100) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'info',
          issue: 'High entity count',
          measurement: `${system.avgEntityCount.toFixed(0)} avg entities`,
          suggestion:
            'Check requiredComponents specificity. Ensure not filtering too broadly (see PERFORMANCE.md critical section).',
        });
      }

      // Info: Unthrottled system (runs every tick with low priority)
      if (
        system.ticksSkipped === 0 &&
        system.ticksProcessed > 50 &&
        system.avgExecutionTimeMs > 0.5
      ) {
        hotspots.push({
          systemName: system.systemName,
          severity: 'info',
          issue: 'Runs every tick',
          measurement: `${system.ticksProcessed} consecutive ticks`,
          suggestion:
            'Consider adding UPDATE_INTERVAL throttling if system is not time-critical (see PERFORMANCE.md).',
        });
      }
    }

    return hotspots;
  }

  /**
   * Generate optimization suggestion based on metrics
   */
  private generateOptimizationSuggestion(
    system: SystemMetrics,
    severity: 'critical' | 'warning'
  ): string {
    const suggestions: string[] = [];

    // High execution time suggestions
    if (system.maxExecutionTimeMs > BUDGET_MS_PER_SYSTEM) {
      if (severity === 'critical') {
        suggestions.push(
          'CRITICAL: Increase throttle interval (UPDATE_INTERVAL) or optimize hot path'
        );
      } else {
        suggestions.push('Increase throttle interval or optimize query caching');
      }
    }

    // High entity count suggestions
    if (system.avgEntityCount > 100) {
      suggestions.push(
        'Add more specific requiredComponents to reduce entity count (see PERFORMANCE.md)'
      );
    }

    // High variance suggestions
    if (!system.isConsistent) {
      suggestions.push(
        'Optimize conditional branches or cache expensive operations'
      );
    }

    // Default suggestion
    if (suggestions.length === 0) {
      suggestions.push(
        'Profile with Chrome DevTools to identify bottleneck within system'
      );
    }

    return suggestions.join('. ');
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    systems: SystemMetrics[],
    hotspots: HotspotDetection[],
    totalTickTime: number,
    budgetUsage: number,
    actualTPS: number
  ): string {
    const criticalHotspots = hotspots.filter((h) => h.severity === 'critical');
    const warningHotspots = hotspots.filter((h) => h.severity === 'warning');

    const lines: string[] = [];

    if (criticalHotspots.length > 0) {
      lines.push(
        `⚠️ CRITICAL: ${criticalHotspots.length} system(s) significantly over budget`
      );
    } else if (warningHotspots.length > 0) {
      lines.push(`⚠️ ${warningHotspots.length} system(s) over recommended budget`);
    } else {
      lines.push('✅ All systems within performance budget');
    }

    if (actualTPS < TARGET_TPS * 0.9) {
      lines.push(
        `⚠️ TPS below target: ${actualTPS.toFixed(1)} (target: ${TARGET_TPS})`
      );
    } else {
      lines.push(`✅ TPS on target: ${actualTPS.toFixed(1)}`);
    }

    if (budgetUsage > 80) {
      lines.push(`⚠️ High budget usage: ${budgetUsage.toFixed(1)}%`);
    } else {
      lines.push(`✅ Budget usage: ${budgetUsage.toFixed(1)}%`);
    }

    return lines.join(' | ');
  }

  /**
   * Export report as JSON
   */
  exportJSON(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as Markdown
   */
  exportMarkdown(): string {
    const report = this.getReport();
    const lines: string[] = [];

    lines.push('# Performance Profile Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.timestamp).toISOString()}`);
    lines.push(
      `**Tick Range:** ${report.startTick} - ${report.endTick} (${report.ticksCovered} ticks)`
    );
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(report.summary);
    lines.push('');

    lines.push('## Overall Metrics');
    lines.push('');
    lines.push(`- **Total Tick Time:** ${report.totalTickTimeMs.toFixed(1)}ms`);
    lines.push(`- **Target Tick Time:** ${report.targetTickTimeMs}ms (for ${TARGET_TPS} TPS)`);
    lines.push(`- **Budget Usage:** ${report.budgetUsagePercent.toFixed(1)}%`);
    lines.push(`- **Actual TPS:** ${report.actualTPS.toFixed(1)}`);
    lines.push('');

    lines.push('## System Performance');
    lines.push('');
    lines.push(
      '| System | Avg(ms) | Max(ms) | P99(ms) | CPU% | Entities | Status |'
    );
    lines.push(
      '|--------|---------|---------|---------|------|----------|--------|'
    );

    for (const system of report.systems) {
      const status =
        system.maxExecutionTimeMs > BUDGET_MS_PER_SYSTEM * 2
          ? '❌ CRITICAL'
          : system.maxExecutionTimeMs > BUDGET_MS_PER_SYSTEM
            ? '⚠️ SLOW'
            : '✅';

      lines.push(
        `| ${system.systemName} | ${system.avgExecutionTimeMs.toFixed(1)} | ${system.maxExecutionTimeMs.toFixed(1)} | ${system.p99ExecutionTimeMs.toFixed(1)} | ${system.avgCpuPercent.toFixed(1)}% | ${system.avgEntityCount.toFixed(0)} | ${status} |`
      );
    }

    lines.push('');

    if (report.hotspots.length > 0) {
      lines.push('## Hotspots Detected');
      lines.push('');

      const critical = report.hotspots.filter((h) => h.severity === 'critical');
      const warnings = report.hotspots.filter((h) => h.severity === 'warning');
      const info = report.hotspots.filter((h) => h.severity === 'info');

      if (critical.length > 0) {
        lines.push('### 🔴 Critical Issues');
        lines.push('');
        for (const hotspot of critical) {
          lines.push(`**${hotspot.systemName}:** ${hotspot.issue}`);
          lines.push(`- **Measurement:** ${hotspot.measurement}`);
          lines.push(`- **Suggestion:** ${hotspot.suggestion}`);
          lines.push('');
        }
      }

      if (warnings.length > 0) {
        lines.push('### ⚠️ Warnings');
        lines.push('');
        for (const hotspot of warnings) {
          lines.push(`**${hotspot.systemName}:** ${hotspot.issue}`);
          lines.push(`- **Measurement:** ${hotspot.measurement}`);
          lines.push(`- **Suggestion:** ${hotspot.suggestion}`);
          lines.push('');
        }
      }

      if (info.length > 0) {
        lines.push('### ℹ️ Optimization Opportunities');
        lines.push('');
        for (const hotspot of info) {
          lines.push(`**${hotspot.systemName}:** ${hotspot.issue}`);
          lines.push(`- **Measurement:** ${hotspot.measurement}`);
          lines.push(`- **Suggestion:** ${hotspot.suggestion}`);
          lines.push('');
        }
      }
    } else {
      lines.push('## ✅ No Hotspots Detected');
      lines.push('');
      lines.push('All systems are performing within recommended limits.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('**Performance Budget:** 5ms per system (guideline from PERFORMANCE.md)');
    lines.push('**Target:** 20 TPS (50ms per tick)');

    return lines.join('\n');
  }
}
