import { BaseSystem } from '../ecs/SystemContext.js';
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
 * Uses throttleInterval for zero-overhead tick skipping (no SystemContext created).
 */
export class QueryCacheMonitorSystem extends BaseSystem {
  readonly id = 'query_cache_monitor' as const;
  readonly priority = 990; // Late utility
  readonly requiredComponents = [] as const; // No entity filtering needed

  // Use throttleInterval for efficient skip (avoids SystemContext creation)
  protected readonly throttleInterval = 6000; // Every 5 minutes (6000 ticks @ 20 TPS)

  protected onUpdate(ctx: { world: World }): void {
    const stats = ctx.world.queryCache.getStats();

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
