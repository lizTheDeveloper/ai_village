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
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

export class BackgroundChunkGeneratorSystem extends BaseSystem {
  readonly id = 'background_chunk_generator';
  readonly priority = 6; // Right after ChunkLoadingSystem (priority 5)
  readonly requiredComponents: string[] = []; // Event-driven, no components

  // Throttle to every 50 ticks (2.5s at 20 TPS) - this is background work
  // BackgroundChunkGenerator has its own internal throttling (default 10 ticks),
  // so this provides an additional layer of safety
  protected readonly throttleInterval = THROTTLE.MEDIUM;

  // Cache generator reference to avoid repeated world.getBackgroundChunkGenerator() calls
  private cachedGenerator: any = null;
  private generatorCacheValid: boolean = false;

  protected onUpdate(ctx: SystemContext): void {
    // Cache generator reference on first access
    if (!this.generatorCacheValid) {
      this.cachedGenerator = ctx.world.getBackgroundChunkGenerator();
      this.generatorCacheValid = true;
    }

    // Early exit: no generator available
    if (!this.cachedGenerator) {
      return;
    }

    // Process queue (generator handles internal throttling and TPS safety)
    this.cachedGenerator.processQueue(ctx.world, ctx.tick);
  }

  protected onInitialize(): void {
    // Reset cache on initialization
    this.generatorCacheValid = false;
  }
}
