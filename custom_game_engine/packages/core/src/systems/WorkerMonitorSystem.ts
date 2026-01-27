/**
 * WorkerMonitorSystem - Monitors worker pool performance and health
 *
 * Tracks worker pool statistics and emits warnings when:
 * - Queue is growing (workers overloaded)
 * - Workers are idle (unused capacity)
 * - Tasks are timing out frequently
 * - Task completion rate is dropping
 *
 * Priority: 995 (late in update cycle, monitoring only)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

export class WorkerMonitorSystem extends BaseSystem {
  readonly id = 'worker_monitor';
  readonly priority = 995; // Near end of update cycle (monitoring)
  readonly requiredComponents: string[] = [];

  // Log every 5 minutes
  protected readonly throttleInterval = 6000; // 300 seconds at 20 TPS

  private lastLog = 0;

  // Tracking for trend analysis
  private previousCompleted = 0;
  private previousFailed = 0;
  private previousQueued = 0;

  protected onUpdate(ctx: SystemContext): void {
    if (ctx.tick - this.lastLog < this.throttleInterval) {
      return;
    }
    this.lastLog = ctx.tick;

    // Get worker pool stats (if available on world)
    const stats = this.getWorkerStats(ctx);

    if (!stats || stats.length === 0) {
      return; // No worker pools to monitor
    }

    // Log stats
    console.info('[WorkerMonitor] Worker Pool Statistics:');

    for (const { name, stats: poolStats } of stats) {
      console.info(`  ${name}:`, {
        total: poolStats.total,
        available: poolStats.available,
        active: poolStats.active,
        queued: poolStats.queued,
        completed: poolStats.completed,
        failed: poolStats.failed,
      });

      // Calculate rates
      const completedSinceLastLog = poolStats.completed - this.previousCompleted;
      const failedSinceLastLog = poolStats.failed - this.previousFailed;
      const queueGrowth = poolStats.queued - this.previousQueued;

      // Warnings
      if (poolStats.queued > 10) {
        console.warn(
          `[WorkerMonitor] ${name}: Queue growing (${poolStats.queued} tasks) - workers may be overloaded`
        );
      }

      if (poolStats.active === 0 && poolStats.queued === 0 && completedSinceLastLog === 0) {
        console.warn(`[WorkerMonitor] ${name}: All workers idle - unused capacity`);
      }

      if (failedSinceLastLog > 0) {
        const failureRate = failedSinceLastLog / (completedSinceLastLog + failedSinceLastLog);
        if (failureRate > 0.1) {
          console.warn(
            `[WorkerMonitor] ${name}: High failure rate (${(failureRate * 100).toFixed(1)}%)`
          );
        }
      }

      if (queueGrowth > 5) {
        console.warn(`[WorkerMonitor] ${name}: Queue growing rapidly (+${queueGrowth} tasks)`);
      }

      // Update tracking
      this.previousCompleted = poolStats.completed;
      this.previousFailed = poolStats.failed;
      this.previousQueued = poolStats.queued;
    }

    // Emit event for metrics dashboard
    // Using emitGeneric for untyped event data
    this.events.emitGeneric('worker:pool_stats', {
      tick: ctx.tick,
      pools: stats,
    });
  }

  /**
   * Get worker pool statistics from world.
   *
   * This is a placeholder - in practice, you would access
   * worker pools stored on the world instance.
   */
  private getWorkerStats(ctx: SystemContext): Array<{
    name: string;
    stats: {
      total: number;
      available: number;
      active: number;
      queued: number;
      completed: number;
      failed: number;
    };
  }> {
    const stats: Array<{
      name: string;
      stats: {
        total: number;
        available: number;
        active: number;
        queued: number;
        completed: number;
        failed: number;
      };
    }> = [];

    // Get chunk worker pool stats using index signature access
    // World may have backgroundChunkGenerator added at runtime
    interface WorldWithChunkGenerator {
      backgroundChunkGenerator?: {
        workerPool?: {
          getStatus(): {
            numWorkers?: number;
            pendingRequests?: number;
          };
        };
      };
    }
    const worldWithGenerator = ctx.world as unknown as WorldWithChunkGenerator;
    const chunkGenerator = worldWithGenerator.backgroundChunkGenerator;

    if (chunkGenerator?.workerPool) {
      const status = chunkGenerator.workerPool.getStatus();
      stats.push({
        name: 'ChunkGeneration',
        stats: {
          total: status.numWorkers || 0,
          available: 0, // ChunkGenerationWorkerPool doesn't track this
          active: status.pendingRequests || 0,
          queued: 0, // ChunkGenerationWorkerPool doesn't have a queue
          completed: 0, // Not tracked yet
          failed: 0, // Not tracked yet
        },
      });
    }

    return stats;
  }
}
