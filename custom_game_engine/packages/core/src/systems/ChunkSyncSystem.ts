/**
 * ChunkSyncSystem - Automatic synchronization of dirty chunks to server
 *
 * Periodically flushes modified chunks from ServerBackedChunkManager to the
 * planet server. This enables multiplayer terrain sharing and persistence.
 *
 * Features:
 * - Runs every 100 ticks (5 seconds at 20 TPS)
 * - Non-blocking async flush
 * - Tracks sync statistics
 * - Only activates when using ServerBackedChunkManager
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';

// Type for ServerBackedChunkManager duck typing (avoid circular dependency)
interface ServerBackedChunkManagerLike {
  flushDirtyChunks(): Promise<number>;
  getDirtyCount(): number;
  isServerAvailable(): boolean;
  getTimeSinceFlush(): number;
}

export interface ChunkSyncStats {
  totalSyncs: number;
  totalChunksFlushed: number;
  failedSyncs: number;
  lastSyncTick: number;
  lastFlushCount: number;
}

export class ChunkSyncSystem extends BaseSystem {
  public readonly id: SystemId = 'chunk_sync';
  public readonly priority: number = 998; // Run near last, before AutoSave
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds at 20 TPS

  private stats: ChunkSyncStats = {
    totalSyncs: 0,
    totalChunksFlushed: 0,
    failedSyncs: 0,
    lastSyncTick: 0,
    lastFlushCount: 0,
  };

  private flushing: boolean = false;

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    console.log('[ChunkSyncSystem] Initialized - will sync dirty chunks every 5 seconds');
  }

  protected async onUpdate(ctx: SystemContext): Promise<void> {
    const { world } = ctx;

    // Get chunk manager from world (duck typing for optional method)
    const worldWithChunks = world as { getChunkManager?: () => unknown };
    const chunkManager = worldWithChunks.getChunkManager?.();

    // Check if it's a ServerBackedChunkManager (duck typing)
    if (!chunkManager || typeof (chunkManager as Record<string, unknown>).flushDirtyChunks !== 'function') {
      return; // Not using server-backed storage
    }

    const serverBackedManager = chunkManager as ServerBackedChunkManagerLike;

    // Skip if server is not available
    if (!serverBackedManager.isServerAvailable()) {
      return;
    }

    // Skip if already flushing
    if (this.flushing) {
      return;
    }

    // Skip if no dirty chunks
    const dirtyCount = serverBackedManager.getDirtyCount();
    if (dirtyCount === 0) {
      return;
    }

    // Perform flush
    this.flushing = true;
    this.stats.totalSyncs++;
    this.stats.lastSyncTick = world.tick;

    try {
      const flushed = await serverBackedManager.flushDirtyChunks();

      this.stats.totalChunksFlushed += flushed;
      this.stats.lastFlushCount = flushed;

      if (flushed > 0) {
        console.log(`[ChunkSyncSystem] Synced ${flushed} chunks to server`);
      }
    } catch (error) {
      this.stats.failedSyncs++;
      console.warn('[ChunkSyncSystem] Failed to sync chunks:', error);
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Get sync statistics
   */
  getStats(): Readonly<ChunkSyncStats> {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalSyncs: 0,
      totalChunksFlushed: 0,
      failedSyncs: 0,
      lastSyncTick: 0,
      lastFlushCount: 0,
    };
  }
}
