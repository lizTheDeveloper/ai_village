/**
 * BackgroundChunkGeneratorSystem - Processes background chunk generation queue
 *
 * This system processes the BackgroundChunkGenerator queue every tick to
 * generate chunks asynchronously without blocking gameplay.
 *
 * Priority: 6 (right after ChunkLoadingSystem at priority 5)
 *
 * Performance:
 * - Processes at most 1 chunk per configurable interval (default: 2 ticks = 100ms)
 * - Pauses if TPS drops below threshold (default: 18)
 * - Resumes when TPS recovers (default: 19+)
 *
 * Use cases:
 * - Pre-generate chunks during soul creation ceremony
 * - Pre-generate chunks along predicted agent paths
 * - Pre-generate chunks during camera scroll
 *
 * @example
 * ```typescript
 * // In SoulCreationSystem, before ceremony starts:
 * const generator = world.getBackgroundChunkGenerator();
 * if (generator) {
 *   generator.queueChunkGrid(
 *     spawnLocation.chunkX,
 *     spawnLocation.chunkY,
 *     3,  // 7x7 grid (radius 3)
 *     'HIGH',
 *     'soul_creation'
 *   );
 * }
 * ```
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

export class BackgroundChunkGeneratorSystem extends BaseSystem {
  readonly id = 'background_chunk_generator';
  readonly priority = 6; // Right after ChunkLoadingSystem (priority 5)
  readonly requiredComponents: string[] = []; // Event-driven, no components

  // Throttle to every 10 ticks (500ms at 20 TPS) - generator has internal throttling too
  protected readonly throttleInterval = 10;

  protected onUpdate(ctx: SystemContext): void {
    const generator = ctx.world.getBackgroundChunkGenerator();
    if (!generator) {
      // No generator available - system is disabled
      return;
    }

    // Process queue (generator handles throttling and TPS safety)
    generator.processQueue(ctx.world, ctx.world.tick);
  }
}
