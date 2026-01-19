import { BaseSystem } from '../ecs/System.js';
import type { World } from '../ecs/World.js';

/**
 * QueryCacheMonitorSystem - Logs query cache statistics periodically.
 *
 * Monitors query cache performance and logs statistics every 5 minutes:
 * - Hit rate (percentage of cache hits vs total accesses)
 * - Total hits
 * - Total misses
 * - Total invalidations (queries invalidated due to world changes)
 * - Cache size (number of cached queries)
 *
 * Only logs if there has been query activity to avoid spam.
 *
 * Priority: 990 (late utility)
 */
export class QueryCacheMonitorSystem extends BaseSystem {
  private readonly LOG_INTERVAL = 6000; // Every 5 minutes (6000 ticks @ 20 TPS)
  private lastLog = 0;

  constructor() {
    super('query_cache_monitor', 990);
  }

  update(world: World): void {
    if (world.tick - this.lastLog < this.LOG_INTERVAL) return;
    this.lastLog = world.tick;

    const stats = world.queryCache.getStats();

    // Only log if there's meaningful activity
    if (stats.hits + stats.misses === 0) return;

    console.info('[QueryCache]', {
      hitRate: (stats.hitRate * 100).toFixed(1) + '%',
      hits: stats.hits,
      misses: stats.misses,
      invalidations: stats.invalidations,
      size: stats.size,
    });
  }
}
