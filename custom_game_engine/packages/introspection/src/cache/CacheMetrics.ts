/**
 * Cache metrics collection and reporting
 */

import type { SchedulerRenderCache } from './RenderCache.js';
import type { CacheStats } from './RenderCache.js';

export interface CacheMetricsSnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: number;

  /** Statistics per registered cache */
  caches: Array<{
    id: string;
    stats: CacheStats;
  }>;

  /** Aggregate statistics across all caches */
  aggregate: {
    totalHits: number;
    totalMisses: number;
    totalInvalidations: number;
    totalSize: number;
    overallHitRate: number;
    totalMemoryUsage: number;
  };
}

/**
 * Global cache metrics collector
 */
export class CacheMetrics {
  private static caches = new Map<string, SchedulerRenderCache<any>>();

  /**
   * Register a cache for metrics collection
   */
  static register(id: string, cache: SchedulerRenderCache<any>): void {
    this.caches.set(id, cache);
  }

  /**
   * Unregister a cache
   */
  static unregister(id: string): void {
    this.caches.delete(id);
  }

  /**
   * Get metrics snapshot for all registered caches
   */
  static getSnapshot(): CacheMetricsSnapshot {
    const cacheStats: Array<{ id: string; stats: CacheStats }> = [];
    let totalHits = 0;
    let totalMisses = 0;
    let totalInvalidations = 0;
    let totalSize = 0;
    let totalMemoryUsage = 0;

    for (const [id, cache] of this.caches.entries()) {
      const stats = cache.getStats();
      cacheStats.push({ id, stats });

      totalHits += stats.hits;
      totalMisses += stats.misses;
      totalInvalidations += stats.invalidations;
      totalSize += stats.size;
      totalMemoryUsage += stats.memoryUsage;
    }

    const total = totalHits + totalMisses;
    const overallHitRate = total > 0 ? totalHits / total : 0;

    return {
      timestamp: Date.now(),
      caches: cacheStats,
      aggregate: {
        totalHits,
        totalMisses,
        totalInvalidations,
        totalSize,
        overallHitRate,
        totalMemoryUsage,
      },
    };
  }

  /**
   * Format metrics as human-readable string
   */
  static formatSnapshot(snapshot: CacheMetricsSnapshot): string {
    const lines: string[] = [];
    lines.push('=== Render Cache Metrics ===');
    lines.push('');

    // Aggregate stats
    const agg = snapshot.aggregate;
    lines.push(`Overall Hit Rate: ${(agg.overallHitRate * 100).toFixed(1)}%`);
    lines.push(`Total Hits: ${agg.totalHits.toLocaleString()}`);
    lines.push(`Total Misses: ${agg.totalMisses.toLocaleString()}`);
    lines.push(`Total Invalidations: ${agg.totalInvalidations.toLocaleString()}`);
    lines.push(`Total Cache Size: ${agg.totalSize.toLocaleString()} entries`);
    lines.push(`Memory Usage: ${(agg.totalMemoryUsage / 1024).toFixed(1)} KB`);
    lines.push('');

    // Per-cache stats
    if (snapshot.caches.length > 0) {
      lines.push('Per-Cache Stats:');
      for (const { id, stats } of snapshot.caches) {
        lines.push(`  ${id}:`);
        lines.push(`    Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
        lines.push(`    Hits: ${stats.hits.toLocaleString()} | Misses: ${stats.misses.toLocaleString()}`);
        lines.push(`    Size: ${stats.size.toLocaleString()} | Invalidations: ${stats.invalidations.toLocaleString()}`);
        lines.push(`    Avg Lifetime: ${stats.avgCacheLifetime.toFixed(1)} ticks`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON for dashboard
   */
  static toJSON(): string {
    return JSON.stringify(this.getSnapshot(), null, 2);
  }

  /**
   * Reset all cache statistics
   */
  static resetAll(): void {
    for (const cache of this.caches.values()) {
      cache.resetStats();
    }
  }
}
