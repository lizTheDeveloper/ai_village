/**
 * ChunkStateManager - Minecraft-style lazy chunk loading
 *
 * Manages chunk simulation states to optimize world processing:
 * - ACTIVE: Near agents/camera, full simulation (all systems run)
 * - LAZY: Visible but far, reduced simulation (throttled systems only)
 * - UNLOADED: Far away, frozen (event-driven only)
 *
 * This dramatically reduces processing for large worlds:
 * - Instead of simulating 10,000 chunks, only simulate ~50 active ones
 * - Lazy chunks get periodic batch updates (tick-coalesced)
 * - Unloaded chunks are completely frozen until needed
 *
 * Inspired by:
 * - Minecraft's chunk loading system (spawn chunks, lazy chunks)
 * - Factorio's chunk activation based on entity proximity
 * - Dwarf Fortress's area-based simulation management
 */

import type { EntityId } from '../types.js';

/**
 * Chunk simulation state
 */
export enum ChunkState {
  /** Fully simulated - near agents/camera */
  ACTIVE = 'active',

  /** Reduced simulation - visible but far */
  LAZY = 'lazy',

  /** Frozen - only event-driven updates */
  UNLOADED = 'unloaded',
}

/**
 * Configuration for chunk state transitions
 */
export interface ChunkStateConfig {
  /** Chunk size in world units (default: 16) */
  chunkSize: number;

  /** Distance from agent for ACTIVE state (in chunks, default: 2) */
  activeRadius: number;

  /** Distance from agent for LAZY state (in chunks, default: 4) */
  lazyRadius: number;

  /** Ticks between lazy chunk updates (default: 100 = 5 seconds) */
  lazyUpdateInterval: number;

  /** Whether to keep "spawn chunks" always active (default: true) */
  keepSpawnActive: boolean;

  /** Spawn chunk coordinates if keepSpawnActive is true */
  spawnChunkX?: number;
  spawnChunkY?: number;
}

const DEFAULT_CONFIG: ChunkStateConfig = {
  chunkSize: 16,
  activeRadius: 2,
  lazyRadius: 4,
  lazyUpdateInterval: 100,
  keepSpawnActive: true,
  spawnChunkX: 0,
  spawnChunkY: 0,
};

/**
 * Chunk coordinate key
 */
function chunkKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Get chunk coordinates from world position
 */
function worldToChunk(worldX: number, worldY: number, chunkSize: number): { cx: number; cy: number } {
  return {
    cx: Math.floor(worldX / chunkSize),
    cy: Math.floor(worldY / chunkSize),
  };
}

/**
 * Calculate chunk distance (Chebyshev distance - max of x/y)
 */
function chunkDistance(cx1: number, cy1: number, cx2: number, cy2: number): number {
  return Math.max(Math.abs(cx1 - cx2), Math.abs(cy1 - cy2));
}

/**
 * Chunk state information
 */
export interface ChunkInfo {
  x: number;
  y: number;
  state: ChunkState;
  lastUpdateTick: number;
  entityCount: number;
  forceActive: boolean;
}

/**
 * ChunkStateManager tracks and manages chunk simulation states
 */
export class ChunkStateManager {
  private config: ChunkStateConfig;
  private chunks: Map<string, ChunkInfo> = new Map();
  private entityToChunk: Map<EntityId, string> = new Map();
  private chunkToEntities: Map<string, Set<EntityId>> = new Map();
  private agentChunks: Set<string> = new Set();
  private lastFullUpdateTick = 0;

  constructor(config: Partial<ChunkStateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update chunk states based on agent positions
   */
  updateChunkStates(
    agentPositions: Array<{ x: number; y: number }>,
    currentTick: number
  ): void {
    // Clear previous agent chunks
    this.agentChunks.clear();

    // Find chunks containing agents
    for (const pos of agentPositions) {
      const { cx, cy } = worldToChunk(pos.x, pos.y, this.config.chunkSize);
      this.agentChunks.add(chunkKey(cx, cy));
    }

    // Update all known chunk states
    for (const [key, chunk] of this.chunks) {
      const newState = this.calculateChunkState(chunk.x, chunk.y, chunk.forceActive);

      if (chunk.state !== newState) {
        chunk.state = newState;
        // Reset update tick when transitioning to active
        if (newState === ChunkState.ACTIVE) {
          chunk.lastUpdateTick = currentTick;
        }
      }
    }

    this.lastFullUpdateTick = currentTick;
  }

  /**
   * Calculate what state a chunk should be in
   */
  private calculateChunkState(cx: number, cy: number, forceActive: boolean): ChunkState {
    // Force-active chunks stay active
    if (forceActive) return ChunkState.ACTIVE;

    // Spawn chunk check
    if (
      this.config.keepSpawnActive &&
      cx === this.config.spawnChunkX &&
      cy === this.config.spawnChunkY
    ) {
      return ChunkState.ACTIVE;
    }

    // Find minimum distance to any agent chunk
    let minDistance = Infinity;
    for (const agentKey of this.agentChunks) {
      const [ax, ay] = agentKey.split(',').map(Number);
      const distance = chunkDistance(cx, cy, ax, ay);
      minDistance = Math.min(minDistance, distance);
    }

    // Determine state based on distance
    if (minDistance <= this.config.activeRadius) {
      return ChunkState.ACTIVE;
    } else if (minDistance <= this.config.lazyRadius) {
      return ChunkState.LAZY;
    } else {
      return ChunkState.UNLOADED;
    }
  }

  /**
   * Register an entity's position for chunk tracking
   */
  registerEntity(entityId: EntityId, x: number, y: number): void {
    const { cx, cy } = worldToChunk(x, y, this.config.chunkSize);
    const key = chunkKey(cx, cy);

    // Remove from old chunk if exists
    const oldChunkKey = this.entityToChunk.get(entityId);
    if (oldChunkKey && oldChunkKey !== key) {
      const oldEntities = this.chunkToEntities.get(oldChunkKey);
      if (oldEntities) {
        oldEntities.delete(entityId);
        const oldChunk = this.chunks.get(oldChunkKey);
        if (oldChunk) oldChunk.entityCount = oldEntities.size;
      }
    }

    // Add to new chunk
    this.entityToChunk.set(entityId, key);

    let entities = this.chunkToEntities.get(key);
    if (!entities) {
      entities = new Set();
      this.chunkToEntities.set(key, entities);
    }
    entities.add(entityId);

    // Ensure chunk info exists
    if (!this.chunks.has(key)) {
      this.chunks.set(key, {
        x: cx,
        y: cy,
        state: ChunkState.UNLOADED, // Will be updated on next tick
        lastUpdateTick: 0,
        entityCount: 0,
        forceActive: false,
      });
    }

    const chunk = this.chunks.get(key)!;
    chunk.entityCount = entities.size;
  }

  /**
   * Unregister an entity
   */
  unregisterEntity(entityId: EntityId): void {
    const chunkKey = this.entityToChunk.get(entityId);
    if (!chunkKey) return;

    this.entityToChunk.delete(entityId);

    const entities = this.chunkToEntities.get(chunkKey);
    if (entities) {
      entities.delete(entityId);
      const chunk = this.chunks.get(chunkKey);
      if (chunk) chunk.entityCount = entities.size;
    }
  }

  /**
   * Check if an entity should be simulated this tick
   */
  shouldSimulateEntity(entityId: EntityId, currentTick: number): boolean {
    const chunkKey = this.entityToChunk.get(entityId);
    if (!chunkKey) return true; // Unknown entity, simulate

    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return true; // Unknown chunk, simulate

    switch (chunk.state) {
      case ChunkState.ACTIVE:
        return true;

      case ChunkState.LAZY:
        // Only simulate on lazy update ticks
        const ticksSinceUpdate = currentTick - chunk.lastUpdateTick;
        if (ticksSinceUpdate >= this.config.lazyUpdateInterval) {
          chunk.lastUpdateTick = currentTick;
          return true;
        }
        return false;

      case ChunkState.UNLOADED:
        return false;
    }
  }

  /**
   * Get entities in a specific chunk
   */
  getChunkEntities(cx: number, cy: number): ReadonlySet<EntityId> {
    return this.chunkToEntities.get(chunkKey(cx, cy)) ?? new Set();
  }

  /**
   * Get all active chunk keys
   */
  getActiveChunks(): string[] {
    const active: string[] = [];
    for (const [key, chunk] of this.chunks) {
      if (chunk.state === ChunkState.ACTIVE) {
        active.push(key);
      }
    }
    return active;
  }

  /**
   * Get all lazy chunk keys
   */
  getLazyChunks(): string[] {
    const lazy: string[] = [];
    for (const [key, chunk] of this.chunks) {
      if (chunk.state === ChunkState.LAZY) {
        lazy.push(key);
      }
    }
    return lazy;
  }

  /**
   * Force a chunk to stay active (e.g., for chunk loaders)
   */
  forceChunkActive(cx: number, cy: number, active: boolean): void {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);

    if (!chunk && active) {
      chunk = {
        x: cx,
        y: cy,
        state: ChunkState.ACTIVE,
        lastUpdateTick: 0,
        entityCount: 0,
        forceActive: true,
      };
      this.chunks.set(key, chunk);
    } else if (chunk) {
      chunk.forceActive = active;
      if (active) chunk.state = ChunkState.ACTIVE;
    }
  }

  /**
   * Get statistics about chunk states
   */
  getStats(): {
    totalChunks: number;
    activeChunks: number;
    lazyChunks: number;
    unloadedChunks: number;
    totalEntitiesTracked: number;
    agentChunks: number;
  } {
    let activeChunks = 0;
    let lazyChunks = 0;
    let unloadedChunks = 0;

    for (const chunk of this.chunks.values()) {
      switch (chunk.state) {
        case ChunkState.ACTIVE:
          activeChunks++;
          break;
        case ChunkState.LAZY:
          lazyChunks++;
          break;
        case ChunkState.UNLOADED:
          unloadedChunks++;
          break;
      }
    }

    return {
      totalChunks: this.chunks.size,
      activeChunks,
      lazyChunks,
      unloadedChunks,
      totalEntitiesTracked: this.entityToChunk.size,
      agentChunks: this.agentChunks.size,
    };
  }

  /**
   * Clear all chunk data (for world reset)
   */
  clear(): void {
    this.chunks.clear();
    this.entityToChunk.clear();
    this.chunkToEntities.clear();
    this.agentChunks.clear();
  }
}

// Export singleton instance (can be replaced for different worlds)
export const chunkStateManager = new ChunkStateManager();
