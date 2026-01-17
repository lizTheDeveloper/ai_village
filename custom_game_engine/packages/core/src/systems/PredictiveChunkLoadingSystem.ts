/**
 * PredictiveChunkLoadingSystem - Predicts and pre-generates chunks ahead of moving agents
 *
 * This system analyzes agent movement patterns and queues chunks in their path
 * for background generation, preventing lag spikes when agents enter new areas.
 *
 * Priority: 7 (after BackgroundChunkGeneratorSystem at priority 6)
 *
 * Algorithm:
 * 1. For each agent with Position + Velocity:
 *    - Skip if velocity is near zero (< 0.1)
 *    - Calculate normalized movement direction
 *    - Predict chunks 1-5 steps ahead in movement direction
 *    - Also check 1 chunk to left/right of path (for turning)
 * 2. Queue ungenerated chunks with MEDIUM priority
 * 3. Deduplicate chunk requests within update
 *
 * Performance:
 * - Throttled to every 20 ticks (1 second at 20 TPS)
 * - Only processes moving agents (velocity magnitude > 0.1)
 * - Uses Set for O(1) deduplication
 * - Checks ChunkManager before queuing (skip if already generated)
 *
 * @example
 * ```typescript
 * // Agent moving east at velocity (2, 0)
 * // Current position: (100, 50) in chunk (3, 1)
 * // System predicts chunks: (4,1), (5,1), (6,1), (7,1), (8,1)
 * // Also checks lateral: (4,0), (4,2) for turning
 * ```
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import { CHUNK_SIZE } from '../types.js';

export class PredictiveChunkLoadingSystem extends BaseSystem {
  readonly id = 'predictive_chunk_loading';
  readonly priority = 7; // After BackgroundChunkGeneratorSystem (priority 6)
  readonly requiredComponents = ['position', 'velocity'] as const;

  // Throttle to every 20 ticks (1 second at 20 TPS)
  protected readonly throttleInterval = 20;

  // Prediction configuration
  private readonly PREDICTION_DISTANCE = 5; // Look 5 chunks ahead
  private readonly LATERAL_CHECK_DISTANCE = 1; // Check 1 chunk left/right
  private readonly MIN_VELOCITY_THRESHOLD = 0.1; // Ignore near-stationary agents

  protected onUpdate(ctx: SystemContext): void {
    const generator = ctx.world.getBackgroundChunkGenerator();
    if (!generator) {
      // No generator available - system is disabled
      return;
    }

    const chunkManager = ctx.world.chunkManager;
    if (!chunkManager) {
      // No chunk manager - cannot check if chunks exist
      return;
    }

    // Track queued chunks this update for deduplication
    const queuedThisUpdate = new Set<string>();

    // Process each moving agent
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const { position, velocity } = comps.require('position', 'velocity');

      this.predictChunksForAgent(
        position as PositionComponent,
        velocity as VelocityComponent,
        generator,
        chunkManager,
        queuedThisUpdate,
        ctx.tick
      );
    }

    // Emit metrics event if any chunks were queued
    if (queuedThisUpdate.size > 0) {
      ctx.emit('chunk_prediction_queued', {
        count: queuedThisUpdate.size,
        tick: ctx.tick,
      });
    }
  }

  /**
   * Predict chunks for a single agent based on movement direction.
   *
   * @param position - Agent position component
   * @param velocity - Agent velocity component
   * @param generator - Background chunk generator
   * @param chunkManager - Chunk manager for existence checks
   * @param queuedThisUpdate - Set of chunk keys queued this update (for deduplication)
   * @param tick - Current game tick (for metrics)
   */
  private predictChunksForAgent(
    position: PositionComponent,
    velocity: VelocityComponent,
    generator: any,
    chunkManager: any,
    queuedThisUpdate: Set<string>,
    tick: number
  ): void {
    const { vx, vy } = velocity;

    // Calculate velocity magnitude
    const magnitude = Math.sqrt(vx * vx + vy * vy);

    // Skip stationary or near-stationary agents
    if (magnitude < this.MIN_VELOCITY_THRESHOLD) {
      return;
    }

    // Normalize direction vector
    const dirX = vx / magnitude;
    const dirY = vy / magnitude;

    // Calculate current chunk coordinates
    const currentChunkX = position.chunkX;
    const currentChunkY = position.chunkY;

    // Predict chunks along movement direction
    for (let step = 1; step <= this.PREDICTION_DISTANCE; step++) {
      // Calculate predicted world position
      const predictedX = position.x + dirX * CHUNK_SIZE * step;
      const predictedY = position.y + dirY * CHUNK_SIZE * step;

      // Convert to chunk coordinates
      const chunkX = Math.floor(predictedX / CHUNK_SIZE);
      const chunkY = Math.floor(predictedY / CHUNK_SIZE);

      // Queue predicted chunk
      this.queueChunkIfNeeded(
        chunkX,
        chunkY,
        generator,
        chunkManager,
        queuedThisUpdate
      );

      // For first prediction step, also check lateral chunks (for turning)
      if (step === 1) {
        // Calculate perpendicular direction (rotated 90 degrees)
        const perpX = -dirY;
        const perpY = dirX;

        // Check left side
        const leftChunkX = Math.floor(
          (predictedX + perpX * CHUNK_SIZE * this.LATERAL_CHECK_DISTANCE) / CHUNK_SIZE
        );
        const leftChunkY = Math.floor(
          (predictedY + perpY * CHUNK_SIZE * this.LATERAL_CHECK_DISTANCE) / CHUNK_SIZE
        );

        this.queueChunkIfNeeded(
          leftChunkX,
          leftChunkY,
          generator,
          chunkManager,
          queuedThisUpdate
        );

        // Check right side
        const rightChunkX = Math.floor(
          (predictedX - perpX * CHUNK_SIZE * this.LATERAL_CHECK_DISTANCE) / CHUNK_SIZE
        );
        const rightChunkY = Math.floor(
          (predictedY - perpY * CHUNK_SIZE * this.LATERAL_CHECK_DISTANCE) / CHUNK_SIZE
        );

        this.queueChunkIfNeeded(
          rightChunkX,
          rightChunkY,
          generator,
          chunkManager,
          queuedThisUpdate
        );
      }
    }
  }

  /**
   * Queue a chunk if it doesn't exist and hasn't been queued this update.
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @param generator - Background chunk generator
   * @param chunkManager - Chunk manager for existence checks
   * @param queuedThisUpdate - Set of chunk keys queued this update
   */
  private queueChunkIfNeeded(
    chunkX: number,
    chunkY: number,
    generator: any,
    chunkManager: any,
    queuedThisUpdate: Set<string>
  ): void {
    const chunkKey = `${chunkX},${chunkY}`;

    // Skip if already queued this update
    if (queuedThisUpdate.has(chunkKey)) {
      return;
    }

    // Skip if chunk already exists and is generated
    if (chunkManager.hasChunk(chunkX, chunkY)) {
      const chunk = chunkManager.getChunk(chunkX, chunkY);
      if (chunk.generated) {
        return;
      }
    }

    // Queue chunk with MEDIUM priority
    generator.queueChunk({
      chunkX,
      chunkY,
      priority: 'MEDIUM',
      requestedBy: 'agent_prediction',
    });

    // Mark as queued to prevent duplicates
    queuedThisUpdate.add(chunkKey);
  }
}
