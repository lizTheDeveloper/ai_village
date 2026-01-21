/**
 * ServerBackedChunkManager - Chunk management with server-side persistence
 *
 * Wraps ChunkManager to add server-backed storage via PlanetClient.
 * Enables shared terrain across multiple saves and multiplayer sessions.
 *
 * Features:
 * - Fetches chunks from server when not in local cache
 * - Saves modified chunks to server (debounced)
 * - Tracks dirty chunks for efficient syncing
 * - Falls back to local-only operation if server unavailable
 * - Maintains full backward compatibility with ChunkManager API
 *
 * Usage:
 * ```typescript
 * const chunkManager = new ServerBackedChunkManager(
 *   'planet:magical:abc123',
 *   planetClient,
 *   { loadRadius: 3 }
 * );
 *
 * // Use like normal ChunkManager
 * const chunk = await chunkManager.getChunkAsync(5, 10);
 *
 * // Mark chunk as modified after terrain changes
 * chunkManager.markDirty(5, 10);
 *
 * // Periodically flush to server
 * await chunkManager.flushDirtyChunks();
 * ```
 */

import type { Chunk } from './Chunk.js';
import { getChunkKey, CHUNK_SIZE } from './Chunk.js';
import { ChunkManager } from './ChunkManager.js';
import { chunkSerializer } from './ChunkSerializer.js';
import type { SerializedChunk as LocalSerializedChunk } from './types.js';

// Types for PlanetClient - defined here to avoid circular dependency with persistence package
// The actual PlanetClient is injected at runtime
export interface PlanetClient {
  getChunk(planetId: string, x: number, y: number): Promise<PlanetSerializedChunk | null>;
  saveChunk(planetId: string, chunk: PlanetSerializedChunk): Promise<void>;
  batchGetChunks(planetId: string, coords: Array<{ x: number; y: number }>): Promise<Map<string, PlanetSerializedChunk>>;
  getPlayerId(): string | null;
  isAvailable(): Promise<boolean>;
}

export interface PlanetSerializedChunk {
  x: number;
  y: number;
  tiles: unknown;
  compression: 'rle' | 'delta' | 'full';
  entityIds?: string[];
  modifiedAt: number;
  modifiedBy?: string;
  checksum: string;
}

export interface ServerBackedChunkManagerOptions {
  /** Radius of chunks to load around camera */
  loadRadius?: number;
  /** Auto-flush interval in ms (0 to disable) */
  autoFlushInterval?: number;
  /** Maximum dirty chunks before forcing flush */
  maxDirtyChunks?: number;
  /** Fallback to local-only if server unavailable */
  allowOffline?: boolean;
}

/**
 * ServerBackedChunkManager - ChunkManager with server persistence
 */
export class ServerBackedChunkManager {
  private planetId: string;
  private client: PlanetClient;
  private localManager: ChunkManager;
  private dirtyChunks: Set<string> = new Set();
  private pendingFetches: Map<string, Promise<Chunk | null>> = new Map();
  private serverAvailable: boolean = true;
  private options: Required<ServerBackedChunkManagerOptions>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private lastFlush: number = 0;

  constructor(
    planetId: string,
    client: PlanetClient,
    options: ServerBackedChunkManagerOptions = {}
  ) {
    this.planetId = planetId;
    this.client = client;
    this.options = {
      loadRadius: options.loadRadius ?? 3,
      autoFlushInterval: options.autoFlushInterval ?? 30000, // 30 seconds
      maxDirtyChunks: options.maxDirtyChunks ?? 50,
      allowOffline: options.allowOffline ?? true,
    };

    this.localManager = new ChunkManager(this.options.loadRadius);

    // Start auto-flush timer if enabled
    if (this.options.autoFlushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushDirtyChunks().catch(err => {
          console.warn('[ServerBackedChunkManager] Auto-flush failed:', err);
        });
      }, this.options.autoFlushInterval);
    }
  }

  // ============================================================
  // ASYNC CHUNK OPERATIONS (Server-Backed)
  // ============================================================

  /**
   * Get a chunk, fetching from server if not cached locally.
   */
  async getChunkAsync(chunkX: number, chunkY: number): Promise<Chunk> {
    const key = getChunkKey(chunkX, chunkY);

    // Check local cache first
    if (this.localManager.hasChunk(chunkX, chunkY)) {
      return this.localManager.getChunk(chunkX, chunkY);
    }

    // Check if already fetching
    const pendingFetch = this.pendingFetches.get(key);
    if (pendingFetch) {
      const result = await pendingFetch;
      return result ?? this.localManager.getChunk(chunkX, chunkY);
    }

    // Fetch from server
    const fetchPromise = this.fetchChunkFromServer(chunkX, chunkY);
    this.pendingFetches.set(key, fetchPromise);

    try {
      const serverChunk = await fetchPromise;
      this.pendingFetches.delete(key);

      if (serverChunk) {
        return serverChunk;
      }

      // Not on server - create new chunk locally
      return this.localManager.getChunk(chunkX, chunkY);
    } catch (error) {
      this.pendingFetches.delete(key);
      console.warn(`[ServerBackedChunkManager] Failed to fetch chunk ${key}:`, error);

      // Fallback to local creation
      return this.localManager.getChunk(chunkX, chunkY);
    }
  }

  /**
   * Fetch chunk from server and populate local cache
   */
  private async fetchChunkFromServer(chunkX: number, chunkY: number): Promise<Chunk | null> {
    if (!this.serverAvailable && !this.options.allowOffline) {
      return null;
    }

    try {
      const serialized = await this.client.getChunk(this.planetId, chunkX, chunkY);

      if (!serialized) {
        return null;
      }

      // Deserialize into local ChunkManager
      const chunk = this.localManager.getChunk(chunkX, chunkY);

      // Apply server data to chunk
      this.deserializeServerChunk(chunk, serialized);

      return chunk;
    } catch (error) {
      if (!this.options.allowOffline) {
        throw error;
      }

      // Mark server as unavailable for future requests
      this.serverAvailable = false;
      console.warn('[ServerBackedChunkManager] Server unavailable, switching to offline mode');
      return null;
    }
  }

  /**
   * Batch fetch multiple chunks from server
   */
  async batchFetchChunks(coords: Array<{ x: number; y: number }>): Promise<Map<string, Chunk>> {
    const results = new Map<string, Chunk>();

    // Separate coords into cached vs needs-fetch
    const needsFetch: Array<{ x: number; y: number }> = [];

    for (const { x, y } of coords) {
      if (this.localManager.hasChunk(x, y)) {
        results.set(getChunkKey(x, y), this.localManager.getChunk(x, y));
      } else {
        needsFetch.push({ x, y });
      }
    }

    if (needsFetch.length === 0) {
      return results;
    }

    // Batch fetch from server
    try {
      const serverChunks = await this.client.batchGetChunks(this.planetId, needsFetch);

      for (const [key, serialized] of serverChunks) {
        const parts = key.split(',');
        const x = parseInt(parts[0] ?? '0', 10);
        const y = parseInt(parts[1] ?? '0', 10);

        const chunk = this.localManager.getChunk(x, y);
        this.deserializeServerChunk(chunk, serialized);
        results.set(key, chunk);
      }

      // Create empty chunks for coords not found on server
      for (const { x, y } of needsFetch) {
        const key = getChunkKey(x, y);
        if (!results.has(key)) {
          results.set(key, this.localManager.getChunk(x, y));
        }
      }
    } catch (error) {
      console.warn('[ServerBackedChunkManager] Batch fetch failed:', error);

      // Fallback: create empty chunks locally
      for (const { x, y } of needsFetch) {
        results.set(getChunkKey(x, y), this.localManager.getChunk(x, y));
      }
    }

    return results;
  }

  // ============================================================
  // DIRTY CHUNK TRACKING
  // ============================================================

  /**
   * Mark a chunk as modified (needs sync to server)
   */
  markDirty(chunkX: number, chunkY: number): void {
    const key = getChunkKey(chunkX, chunkY);
    this.dirtyChunks.add(key);

    // Force flush if too many dirty chunks
    if (this.dirtyChunks.size >= this.options.maxDirtyChunks) {
      this.flushDirtyChunks().catch(err => {
        console.warn('[ServerBackedChunkManager] Forced flush failed:', err);
      });
    }
  }

  /**
   * Check if a chunk is dirty
   */
  isDirty(chunkX: number, chunkY: number): boolean {
    return this.dirtyChunks.has(getChunkKey(chunkX, chunkY));
  }

  /**
   * Get count of dirty chunks
   */
  getDirtyCount(): number {
    return this.dirtyChunks.size;
  }

  /**
   * Flush all dirty chunks to server
   */
  async flushDirtyChunks(): Promise<number> {
    if (this.dirtyChunks.size === 0) {
      return 0;
    }

    if (!this.serverAvailable && !this.options.allowOffline) {
      console.warn('[ServerBackedChunkManager] Server unavailable, skipping flush');
      return 0;
    }

    const chunksToFlush = Array.from(this.dirtyChunks);
    let flushed = 0;

    for (const key of chunksToFlush) {
      const parts = key.split(',');
      const x = parseInt(parts[0] ?? '0', 10);
      const y = parseInt(parts[1] ?? '0', 10);

      if (!this.localManager.hasChunk(x, y)) {
        this.dirtyChunks.delete(key);
        continue;
      }

      const chunk = this.localManager.getChunk(x, y);

      try {
        const serialized = this.serializeChunkForServer(chunk);
        await this.client.saveChunk(this.planetId, serialized);
        this.dirtyChunks.delete(key);
        flushed++;
      } catch (error) {
        console.warn(`[ServerBackedChunkManager] Failed to flush chunk ${key}:`, error);

        if (!this.options.allowOffline) {
          throw error;
        }
      }
    }

    this.lastFlush = Date.now();
    return flushed;
  }

  // ============================================================
  // SYNCHRONOUS API (Delegates to local ChunkManager)
  // ============================================================

  /**
   * Get chunk synchronously (local cache only).
   * Use getChunkAsync() to ensure server data is loaded.
   */
  getChunk(chunkX: number, chunkY: number): Chunk {
    return this.localManager.getChunk(chunkX, chunkY);
  }

  /**
   * Check if chunk is in local cache
   */
  hasChunk(chunkX: number, chunkY: number): boolean {
    return this.localManager.hasChunk(chunkX, chunkY);
  }

  /**
   * Get all loaded chunks
   */
  getLoadedChunks(): Chunk[] {
    return this.localManager.getLoadedChunks();
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.localManager.getChunkCount();
  }

  /**
   * Get chunk caches for spatial queries
   */
  getChunkCaches() {
    return this.localManager.getChunkCaches();
  }

  /**
   * Get chunk cache
   */
  getChunkCache(chunkX: number, chunkY: number) {
    return this.localManager.getChunkCache(chunkX, chunkY);
  }

  /**
   * Get or create chunk cache
   */
  getOrCreateChunkCache(chunkX: number, chunkY: number) {
    return this.localManager.getOrCreateChunkCache(chunkX, chunkY);
  }

  /**
   * Update loaded chunks based on camera position
   */
  updateLoadedChunks(cameraWorldX: number, cameraWorldY: number) {
    return this.localManager.updateLoadedChunks(cameraWorldX, cameraWorldY);
  }

  /**
   * Get chunks in a rectangular area
   */
  getChunksInArea(startX: number, startY: number, endX: number, endY: number) {
    return this.localManager.getChunksInArea(startX, startY, endX, endY);
  }

  /**
   * Link chunk neighbors (graph-based)
   */
  linkChunkNeighbors(chunk: Chunk): void {
    this.localManager.linkChunkNeighbors(chunk);
  }

  /**
   * Update cross-chunk neighbors
   */
  updateCrossChunkNeighbors(chunk: Chunk): void {
    this.localManager.updateCrossChunkNeighbors(chunk);
  }

  /**
   * Unlink chunk neighbors
   */
  unlinkChunkNeighbors(chunk: Chunk): void {
    this.localManager.unlinkChunkNeighbors(chunk);
  }

  // ============================================================
  // SERIALIZATION HELPERS
  // ============================================================

  /**
   * Serialize chunk for server storage.
   * Converts from local SerializedChunk format to PlanetSerializedChunk format.
   */
  private serializeChunkForServer(chunk: Chunk): PlanetSerializedChunk {
    // Use ChunkSerializer for compression
    const localSerialized = chunkSerializer.serializeChunk(chunk);

    // Convert to server format
    return {
      x: chunk.x,
      y: chunk.y,
      tiles: localSerialized.tiles, // Pass through as-is (JSON-serializable)
      compression: localSerialized.tiles.encoding,
      modifiedAt: Date.now(),
      modifiedBy: this.client.getPlayerId() ?? undefined,
      checksum: '', // Will be computed by server
    };
  }

  /**
   * Deserialize server data into existing chunk.
   * Converts from PlanetSerializedChunk format to local format.
   */
  private deserializeServerChunk(chunk: Chunk, serverData: PlanetSerializedChunk): void {
    // Convert server format to local format
    const localFormat: LocalSerializedChunk = {
      x: serverData.x,
      y: serverData.y,
      generated: true,
      tiles: serverData.tiles as LocalSerializedChunk['tiles'],
      entityIds: serverData.entityIds || [],
    };

    // Use ChunkSerializer to decompress and apply
    chunkSerializer.deserializeIntoChunk(chunk, localFormat);
    chunk.generated = true;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Check if server is available
   */
  isServerAvailable(): boolean {
    return this.serverAvailable;
  }

  /**
   * Try to reconnect to server
   */
  async reconnect(): Promise<boolean> {
    try {
      const available = await this.client.isAvailable();
      this.serverAvailable = available;
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Get planet ID
   */
  getPlanetId(): string {
    return this.planetId;
  }

  /**
   * Get time since last flush
   */
  getTimeSinceFlush(): number {
    return Date.now() - this.lastFlush;
  }

  /**
   * Clear local cache and dirty tracking
   */
  clear(): void {
    this.localManager.clear();
    this.dirtyChunks.clear();
    this.pendingFetches.clear();
  }

  /**
   * Dispose - flush and cleanup
   */
  async dispose(): Promise<void> {
    // Stop auto-flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    try {
      await this.flushDirtyChunks();
    } catch (error) {
      console.warn('[ServerBackedChunkManager] Final flush failed:', error);
    }

    this.clear();
  }
}
