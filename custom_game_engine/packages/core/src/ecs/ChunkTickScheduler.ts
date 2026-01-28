/**
 * ChunkTickScheduler - Minecraft-style chunk update budgeting
 *
 * Distributes chunk updates across frames to maintain stable performance.
 * Like Minecraft, only processes a limited number of chunks per tick,
 * prioritizing visible/active chunks.
 *
 * Usage:
 *   // In GameLoop:
 *   const chunksToUpdate = chunkTickScheduler.getChunksForTick(cameraPos);
 *   for (const chunk of chunksToUpdate) {
 *     processChunkEntities(chunk);
 *   }
 *
 * Performance: Converts O(all chunks) to O(budget) per tick
 */

/** Chunk identifier (matches world chunk keys) */
export type ChunkKey = string;

/** Chunk coordinates */
export interface ChunkCoord {
  x: number;
  z: number;
}

/** Chunk priority for update scheduling */
export interface ChunkPriority {
  key: ChunkKey;
  coord: ChunkCoord;
  priority: number;
  lastUpdateTick: number;
  entityCount: number;
  isVisible: boolean;
  distanceToCamera: number;
}

/** Configuration for ChunkTickScheduler */
export interface ChunkTickSchedulerConfig {
  /** Maximum chunks to update per tick (default: 8) */
  chunksPerTick: number;
  /** Maximum entities to process per chunk per tick (default: 100) */
  entitiesPerChunk: number;
  /** Ticks before forcing a chunk update (default: 100 = 5 seconds) */
  maxTicksWithoutUpdate: number;
  /** View distance in chunks for "visible" classification (default: 4) */
  viewDistance: number;
  /** Chunk size in world units (default: 16) */
  chunkSize: number;
}

const DEFAULT_CONFIG: ChunkTickSchedulerConfig = {
  chunksPerTick: 8,
  entitiesPerChunk: 100,
  maxTicksWithoutUpdate: 100,
  viewDistance: 4,
  chunkSize: 16,
};

/**
 * ChunkTickScheduler manages per-chunk update budgets.
 *
 * Key concepts:
 * - Chunks near camera get updated every tick
 * - Distant chunks get updated less frequently
 * - No chunk goes more than maxTicksWithoutUpdate without update
 * - Entity count affects chunk priority (busier chunks update more)
 */
export class ChunkTickScheduler {
  private config: ChunkTickSchedulerConfig;

  /** All tracked chunks */
  private chunks: Map<ChunkKey, ChunkPriority> = new Map();

  /** Current tick number */
  private currentTick = 0;

  /** Camera position for distance calculations */
  private cameraX = 0;
  private cameraZ = 0;

  /** Chunks scheduled for this tick */
  private tickQueue: ChunkPriority[] = [];

  /** Round-robin offset for fair scheduling of equal-priority chunks */
  private roundRobinOffset = 0;

  /** Statistics */
  private stats = {
    totalChunks: 0,
    visibleChunks: 0,
    updatedThisTick: 0,
    staleChunks: 0,
    averageUpdateInterval: 0,
  };

  constructor(config: Partial<ChunkTickSchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a chunk for scheduling.
   */
  registerChunk(key: ChunkKey, coord: ChunkCoord, entityCount: number = 0): void {
    const existing = this.chunks.get(key);
    if (existing) {
      existing.entityCount = entityCount;
      return;
    }

    this.chunks.set(key, {
      key,
      coord,
      priority: 0,
      lastUpdateTick: this.currentTick,
      entityCount,
      isVisible: false,
      distanceToCamera: Infinity,
    });
  }

  /**
   * Unregister a chunk (when unloaded).
   */
  unregisterChunk(key: ChunkKey): void {
    this.chunks.delete(key);
  }

  /**
   * Update chunk entity count (call when entities move between chunks).
   */
  updateChunkEntityCount(key: ChunkKey, entityCount: number): void {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.entityCount = entityCount;
    }
  }

  /**
   * Set camera position for distance-based prioritization.
   */
  setCameraPosition(x: number, z: number): void {
    this.cameraX = x;
    this.cameraZ = z;
  }

  /**
   * Get chunks that should be updated this tick.
   * Returns chunks in priority order up to chunksPerTick limit.
   */
  getChunksForTick(): readonly ChunkPriority[] {
    this.currentTick++;
    this.tickQueue.length = 0;

    // Update priorities for all chunks
    this.updateChunkPriorities();

    // Sort by priority (highest first)
    const sortedChunks = Array.from(this.chunks.values());
    sortedChunks.sort((a, b) => b.priority - a.priority);

    // Select top N chunks, respecting round-robin for ties
    const selected: ChunkPriority[] = [];
    for (let i = 0; i < sortedChunks.length && selected.length < this.config.chunksPerTick; i++) {
      const idx = (i + this.roundRobinOffset) % sortedChunks.length;
      const chunk = sortedChunks[idx];
      if (chunk) {
        selected.push(chunk);
        chunk.lastUpdateTick = this.currentTick;
      }
    }

    this.roundRobinOffset = (this.roundRobinOffset + 1) % Math.max(1, sortedChunks.length);
    this.tickQueue = selected;

    // Update stats
    this.stats.updatedThisTick = selected.length;
    this.stats.totalChunks = this.chunks.size;
    this.stats.visibleChunks = sortedChunks.filter(c => c.isVisible).length;
    this.stats.staleChunks = sortedChunks.filter(
      c => this.currentTick - c.lastUpdateTick > this.config.maxTicksWithoutUpdate
    ).length;

    return this.tickQueue;
  }

  /**
   * Get entities from a chunk, limited by budget.
   * Returns indices into the entity array to process this tick.
   */
  getEntityBudget(chunk: ChunkPriority): { start: number; count: number } {
    // For chunks with many entities, we may need to spread processing
    // across multiple ticks using a sliding window
    if (chunk.entityCount <= this.config.entitiesPerChunk) {
      return { start: 0, count: chunk.entityCount };
    }

    // Calculate which slice of entities to process this tick
    const ticksPerFullScan = Math.ceil(chunk.entityCount / this.config.entitiesPerChunk);
    const slice = this.currentTick % ticksPerFullScan;
    const start = slice * this.config.entitiesPerChunk;
    const count = Math.min(this.config.entitiesPerChunk, chunk.entityCount - start);

    return { start, count };
  }

  /**
   * Update chunk priorities based on camera distance and staleness.
   */
  private updateChunkPriorities(): void {
    const cameraChunkX = Math.floor(this.cameraX / this.config.chunkSize);
    const cameraChunkZ = Math.floor(this.cameraZ / this.config.chunkSize);

    for (const chunk of this.chunks.values()) {
      // Calculate distance to camera (in chunks)
      const dx = chunk.coord.x - cameraChunkX;
      const dz = chunk.coord.z - cameraChunkZ;
      chunk.distanceToCamera = Math.sqrt(dx * dx + dz * dz);

      // Determine visibility
      chunk.isVisible = chunk.distanceToCamera <= this.config.viewDistance;

      // Calculate priority score
      let priority = 0;

      // 1. Visibility bonus (visible chunks always get priority)
      if (chunk.isVisible) {
        priority += 1000;
      }

      // 2. Distance penalty (closer = higher priority)
      priority -= chunk.distanceToCamera * 10;

      // 3. Staleness bonus (longer since update = higher priority)
      const ticksSinceUpdate = this.currentTick - chunk.lastUpdateTick;
      priority += ticksSinceUpdate * 5;

      // 4. Force update if too stale
      if (ticksSinceUpdate >= this.config.maxTicksWithoutUpdate) {
        priority += 10000; // Guaranteed to be processed
      }

      // 5. Entity count bonus (busier chunks need more attention)
      priority += Math.min(chunk.entityCount * 2, 200);

      chunk.priority = priority;
    }
  }

  /**
   * Check if a chunk should be fully simulated this tick.
   * Convenience method for systems to check a single chunk.
   */
  shouldUpdateChunk(key: ChunkKey): boolean {
    return this.tickQueue.some(c => c.key === key);
  }

  /**
   * Get the priority info for a specific chunk.
   */
  getChunkInfo(key: ChunkKey): ChunkPriority | undefined {
    return this.chunks.get(key);
  }

  /**
   * Get all registered chunks.
   */
  getAllChunks(): readonly ChunkPriority[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Get statistics.
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.chunks.clear();
    this.tickQueue = [];
    this.currentTick = 0;
    this.roundRobinOffset = 0;
    this.cameraX = 0;
    this.cameraZ = 0;
  }

  /**
   * Convert world coordinates to chunk key.
   */
  static worldToChunkKey(x: number, z: number, chunkSize: number = 16): ChunkKey {
    const chunkX = Math.floor(x / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    return `${chunkX},${chunkZ}`;
  }

  /**
   * Parse chunk key to coordinates.
   */
  static chunkKeyToCoord(key: ChunkKey): ChunkCoord {
    const [x, z] = key.split(',').map(Number);
    return { x: x ?? 0, z: z ?? 0 };
  }
}
