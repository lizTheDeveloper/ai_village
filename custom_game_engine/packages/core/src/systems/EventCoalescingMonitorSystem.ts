/**
 * EventCoalescingMonitorSystem - Logs event coalescing statistics.
 *
 * Monitors EventBus coalescing effectiveness and logs statistics periodically.
 * Useful for tracking performance impact of event deduplication.
 */

import { BaseSystem } from '../ecs/SystemContext.js';
import type { SystemContext } from '../ecs/SystemContext.js';

export class EventCoalescingMonitorSystem extends BaseSystem {
  readonly id = 'event_coalescing_monitor';
  readonly priority = 998; // Run late, after most systems
  readonly requiredComponents = []; // No entity processing

  private readonly LOG_INTERVAL = 6000; // Every 5 minutes (6000 ticks @ 20 TPS)
  private lastLog = 0;

  protected onUpdate(ctx: SystemContext): void {
    // Throttle logging
    if (ctx.tick - this.lastLog < this.LOG_INTERVAL) return;
    this.lastLog = ctx.tick;

    // Get coalescing statistics from EventBus
    const stats = ctx.world.eventBus.getCoalescingStats();

    // Only log if events were processed
    if (stats.eventsIn === 0) return;

    console.info('[EventCoalescing]', {
      eventsIn: stats.eventsIn,
      eventsOut: stats.eventsOut,
      eventsSkipped: stats.eventsSkipped,
      reduction: stats.reductionPercent.toFixed(1) + '%',
    });
  }
}
