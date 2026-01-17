import type { World } from '@ai-village/core';
import type { ChunkManager } from './ChunkManager.js';
import type { TerrainGenerator } from '../terrain/TerrainGenerator.js';
import type { Chunk } from './Chunk.js';

/**
 * Priority levels for chunk generation
 */
export type ChunkPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Chunk generation request
 */
export interface ChunkRequest {
  /** Chunk X coordinate */
  chunkX: number;
  /** Chunk Y coordinate */
  chunkY: number;
  /** Priority level (HIGH = soul creation, MEDIUM = agent prediction, LOW = camera scroll) */
  priority: ChunkPriority;
  /** Source of request for debugging/metrics */
  requestedBy: string;
}

/**
 * Queue status information
 */
export interface QueueStatus {
  /** Number of HIGH priority requests */
  high: number;
  /** Number of MEDIUM priority requests */
  medium: number;
  /** Number of LOW priority requests */
  low: number;
  /** Total requests across all priorities */
  total: number;
}

/**
 * Background Chunk Generator Service
 *
 * Manages asynchronous chunk generation with priority queuing and performance safety.
 * Prevents game slowdown by throttling generation and monitoring TPS.
 *
 * Priority levels:
 * - HIGH: Soul creation (immediate need, blocks gameplay)
 * - MEDIUM: Agent prediction (anticipatory, improves experience)
 * - LOW: Camera scroll (opportunistic, nice-to-have)
 *
 * Performance safety:
 * - Processes 1 chunk per configurable interval (default: 2 ticks = 100ms)
 * - Pauses generation if TPS drops below threshold (default: 18)
 * - Resumes when TPS recovers to safe level (default: 19+)
 * - Tracks chunks in progress to avoid duplicate generation
 *
 * Usage:
 * ```typescript
 * // Queue single chunk
 * backgroundChunkGenerator.queueChunk({
 *   chunkX: 5,
 *   chunkY: 10,
 *   priority: 'HIGH',
 *   requestedBy: 'soul_creation'
 * });
 *
 * // Queue chunk grid (e.g., for soul creation)
 * backgroundChunkGenerator.queueChunkGrid(
 *   centerX: 10,
 *   centerY: 15,
 *   radius: 2,
 *   priority: 'HIGH',
 *   requestedBy: 'soul_creation'
 * );
 *
 * // Process queue in system update
 * backgroundChunkGenerator.processQueue(world, world.tick);
 * ```
 */
export class BackgroundChunkGenerator {
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;

  // Priority queues (HIGH processed first, then MEDIUM, then LOW)
  private highPriorityQueue: ChunkRequest[] = [];
  private mediumPriorityQueue: ChunkRequest[] = [];
  private lowPriorityQueue: ChunkRequest[] = [];

  // Track chunks currently being generated or queued to avoid duplicates
  private chunksInProgress = new Set<string>();

  // Throttling configuration
  private readonly throttleInterval: number;
  private lastProcessTick: number = -1000; // Start negative to allow immediate first generation

  // Performance safety configuration
  private readonly minTPS: number;
  private readonly resumeTPS: number;
  private isPaused: boolean = false;

  /**
   * Create a background chunk generator.
   *
   * @param chunkManager - ChunkManager instance for chunk access
   * @param terrainGenerator - TerrainGenerator instance for chunk generation
   * @param throttleInterval - Ticks between chunk generation (default: 2 = 100ms at 20 TPS)
   * @param minTPS - Pause generation if TPS drops below this (default: 18)
   * @param resumeTPS - Resume generation when TPS recovers to this (default: 19)
   */
  constructor(
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator,
    throttleInterval: number = 2,
    minTPS: number = 18,
    resumeTPS: number = 19
  ) {
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
    this.throttleInterval = throttleInterval;
    this.minTPS = minTPS;
    this.resumeTPS = resumeTPS;
  }

  /**
   * Queue a single chunk for background generation.
   *
   * Deduplicates requests - if chunk is already queued or generated, request is ignored.
   *
   * @param request - Chunk request with coordinates, priority, and source
   */
  queueChunk(request: ChunkRequest): void {
    const key = this.getChunkKey(request.chunkX, request.chunkY);

    // Skip if already queued or generated
    if (this.chunksInProgress.has(key)) {
      return;
    }

    // Skip if chunk already exists and is generated
    if (this.chunkManager.hasChunk(request.chunkX, request.chunkY)) {
      const chunk = this.chunkManager.getChunk(request.chunkX, request.chunkY);
      if (chunk.generated) {
        return;
      }
    }

    // Add to appropriate priority queue
    switch (request.priority) {
      case 'HIGH':
        this.highPriorityQueue.push(request);
        break;
      case 'MEDIUM':
        this.mediumPriorityQueue.push(request);
        break;
      case 'LOW':
        this.lowPriorityQueue.push(request);
        break;
    }

    // Mark as in progress to prevent duplicates
    this.chunksInProgress.add(key);
  }

  /**
   * Queue a grid of chunks for background generation.
   *
   * Useful for pre-generating chunks around a spawn point or predicted agent path.
   *
   * @param centerX - Center chunk X coordinate
   * @param centerY - Center chunk Y coordinate
   * @param radius - Radius in chunks (e.g., 2 = 5×5 grid)
   * @param priority - Priority level for all chunks
   * @param requestedBy - Source of request for debugging/metrics
   */
  queueChunkGrid(
    centerX: number,
    centerY: number,
    radius: number,
    priority: ChunkPriority,
    requestedBy: string
  ): void {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        this.queueChunk({
          chunkX: centerX + dx,
          chunkY: centerY + dy,
          priority,
          requestedBy,
        });
      }
    }
  }

  /**
   * Process the chunk generation queue.
   *
   * Call this from a system's update() method every tick.
   * Respects throttling interval and TPS safety limits.
   *
   * Performance:
   * - Generates at most 1 chunk per throttleInterval ticks
   * - Automatically pauses if TPS drops below minTPS
   * - Automatically resumes when TPS recovers to resumeTPS+
   *
   * @param world - World instance for chunk generation and event emission
   * @param currentTick - Current game tick for throttling
   */
  processQueue(world: World, currentTick: number): void {
    // Throttle: only process at configured interval
    if (currentTick - this.lastProcessTick < this.throttleInterval) {
      return;
    }

    // Performance safety: check TPS (if available)
    const currentTPS = this.getCurrentTPS(world);
    if (currentTPS !== null) {
      if (currentTPS < this.minTPS) {
        if (!this.isPaused) {
          console.warn(
            `[BackgroundChunkGenerator] Pausing generation - TPS below ${this.minTPS} (current: ${currentTPS.toFixed(1)})`
          );
          this.isPaused = true;
        }
        return;
      } else if (currentTPS >= this.resumeTPS && this.isPaused) {
        console.log(
          `[BackgroundChunkGenerator] Resuming generation - TPS recovered to ${currentTPS.toFixed(1)}`
        );
        this.isPaused = false;
      }
    }

    // If paused, don't process
    if (this.isPaused) {
      return;
    }

    // Get next request (HIGH → MEDIUM → LOW priority order)
    const request = this.getNextRequest();
    if (!request) {
      return; // Queue empty
    }

    // Generate chunk
    try {
      const chunk = this.chunkManager.getChunk(request.chunkX, request.chunkY);

      // Skip if already generated (race condition protection)
      if (chunk.generated) {
        this.removeFromProgress(request.chunkX, request.chunkY);
        this.lastProcessTick = currentTick;
        return;
      }

      // Generate terrain
      this.terrainGenerator.generateChunk(chunk, world);

      // Link neighbors (if ChunkManager supports it)
      if (typeof this.chunkManager.linkChunkNeighbors === 'function') {
        this.chunkManager.linkChunkNeighbors(chunk);
        this.chunkManager.updateCrossChunkNeighbors(chunk);
      }

      // Emit event for metrics/debugging
      world.eventBus.emit({
        type: 'chunk_background_generated',
        source: 'BackgroundChunkGenerator',
        data: {
          chunkX: request.chunkX,
          chunkY: request.chunkY,
          priority: request.priority,
          requestedBy: request.requestedBy,
          tick: currentTick,
        },
      });

      // Remove from progress tracking
      this.removeFromProgress(request.chunkX, request.chunkY);

      // Update last process tick
      this.lastProcessTick = currentTick;
    } catch (error) {
      console.error(
        `[BackgroundChunkGenerator] Failed to generate chunk (${request.chunkX}, ${request.chunkY}):`,
        error
      );
      // Remove from progress to allow retry
      this.removeFromProgress(request.chunkX, request.chunkY);
    }
  }

  /**
   * Get queue status across all priority levels.
   *
   * @returns Status object with counts per priority and total
   */
  getQueueStatus(): QueueStatus {
    return {
      high: this.highPriorityQueue.length,
      medium: this.mediumPriorityQueue.length,
      low: this.lowPriorityQueue.length,
      total:
        this.highPriorityQueue.length +
        this.mediumPriorityQueue.length +
        this.lowPriorityQueue.length,
    };
  }

  /**
   * Clear all queues (useful for testing or reset).
   */
  clearQueue(): void {
    this.highPriorityQueue = [];
    this.mediumPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.chunksInProgress.clear();
    this.isPaused = false;
  }

  /**
   * Get next request from priority queues.
   *
   * Priority order: HIGH → MEDIUM → LOW
   *
   * @returns Next request or null if all queues empty
   */
  private getNextRequest(): ChunkRequest | null {
    if (this.highPriorityQueue.length > 0) {
      return this.highPriorityQueue.shift()!;
    }
    if (this.mediumPriorityQueue.length > 0) {
      return this.mediumPriorityQueue.shift()!;
    }
    if (this.lowPriorityQueue.length > 0) {
      return this.lowPriorityQueue.shift()!;
    }
    return null;
  }

  /**
   * Get chunk key for deduplication.
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @returns Unique key string
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  /**
   * Remove chunk from in-progress tracking.
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   */
  private removeFromProgress(chunkX: number, chunkY: number): void {
    const key = this.getChunkKey(chunkX, chunkY);
    this.chunksInProgress.delete(key);
  }

  /**
   * Get current TPS from world (if available).
   *
   * NOTE: This is a placeholder implementation. In practice, you would:
   * 1. Access world.metricsCollector or world.performanceMonitor
   * 2. Get current TPS from performance metrics
   * 3. Return null if metrics unavailable
   *
   * Current implementation always returns null (no TPS throttling).
   *
   * @param world - World instance
   * @returns Current TPS or null if unavailable
   */
  private getCurrentTPS(world: World): number | null {
    // TODO: Implement TPS access when performance monitoring API is available
    // Example:
    // if (world.performanceMonitor) {
    //   return world.performanceMonitor.getCurrentTPS();
    // }
    return null;
  }
}

/**
 * Create a background chunk generator instance.
 *
 * @param chunkManager - ChunkManager instance
 * @param terrainGenerator - TerrainGenerator instance
 * @param throttleInterval - Ticks between chunk generation (default: 2)
 * @param minTPS - Pause generation if TPS drops below this (default: 18)
 * @param resumeTPS - Resume generation when TPS recovers to this (default: 19)
 * @returns BackgroundChunkGenerator instance
 */
export function createBackgroundChunkGenerator(
  chunkManager: ChunkManager,
  terrainGenerator: TerrainGenerator,
  throttleInterval: number = 2,
  minTPS: number = 18,
  resumeTPS: number = 19
): BackgroundChunkGenerator {
  return new BackgroundChunkGenerator(
    chunkManager,
    terrainGenerator,
    throttleInterval,
    minTPS,
    resumeTPS
  );
}
