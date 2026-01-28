/**
 * EventCoalescingMonitorSystem - Logs event coalescing statistics.
 *
 * Monitors EventBus coalescing effectiveness and logs statistics periodically.
 * Useful for tracking performance impact of event deduplication.
 *
 * Uses throttleInterval for zero-overhead tick skipping (no SystemContext created).
 */

import { BaseSystem } from '../ecs/SystemContext.js';
import type { SystemContext } from '../ecs/SystemContext.js';

export class EventCoalescingMonitorSystem extends BaseSystem {
  readonly id = 'event_coalescing_monitor';
  readonly priority = 998; // Run late, after most systems
  readonly requiredComponents = []; // No entity processing

  // Use throttleInterval for efficient skip (avoids SystemContext creation)
  protected readonly throttleInterval = 6000; // Every 5 minutes (6000 ticks @ 20 TPS)

  protected onUpdate(ctx: SystemContext): void {
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
