/**
 * IndexedDB Persistence Layer
 *
 * Single thread owns IndexedDB - no conflicts, no race conditions.
 * Runs in SharedWorker context only.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { UniverseDatabase, UniverseState, GameAction } from './types.js';

/**
 * Universe IndexedDB database
 */
export class UniverseDB extends Dexie {
  domains!: EntityTable<UniverseDatabase['domains'], 'name'>;
  events!: EntityTable<UniverseDatabase['events'], 'id'>;
  snapshots!: EntityTable<UniverseDatabase['snapshots'], 'id'>;

  constructor() {
    super('universe');

    this.version(1).stores({
      domains: 'name, lastUpdated',
      events: '++id, tick, type, domain',
      snapshots: 'id, timestamp',
    });
  }
}

/**
 * Persistence service for SharedWorker
 */
export class PersistenceService {
  private db: UniverseDB;

  constructor() {
    this.db = new UniverseDB();
  }

  /**
   * Load initial state from IndexedDB
   */
  async loadState(): Promise<UniverseState | null> {
    try {
      const domains = await this.db.domains.toArray();

      if (domains.length === 0) {
        return null; // No saved state
      }

      const metaDomain = domains.find((d) => d.name === '_meta');
      const worldDomain = domains.find((d) => d.name === 'world');

      if (!metaDomain || !worldDomain) {
        console.warn('[Persistence] Incomplete saved state, skipping load');
        return null;
      }

      return {
        tick: metaDomain.data.tick || 0,
        lastSaved: metaDomain.data.lastSaved || Date.now(),
        world: worldDomain.data,
        metadata: metaDomain.data.metadata || {
          version: '1.0.0',
          universeId: crypto.randomUUID(),
        },
      };
    } catch (error) {
      console.error('[Persistence] Failed to load state:', error);
      return null;
    }
  }

  /**
   * Save current state to IndexedDB
   */
  async saveState(state: UniverseState): Promise<void> {
    const now = Date.now();

    try {
      await this.db.transaction('rw', this.db.domains, async () => {
        await this.db.domains.put({
          name: 'world',
          data: state.world,
          lastUpdated: now,
        });

        await this.db.domains.put({
          name: '_meta',
          data: {
            tick: state.tick,
            lastSaved: now,
            metadata: state.metadata,
          },
          lastUpdated: now,
        });
      });
    } catch (error) {
      console.error('[Persistence] Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Log a game event
   */
  async logEvent(action: GameAction, tick: number): Promise<void> {
    try {
      await this.db.events.add({
        tick,
        type: action.type,
        domain: action.domain,
        data: action,
      });
    } catch (error) {
      console.error('[Persistence] Failed to log event:', error);
    }
  }

  /**
   * Create a snapshot for export/sharing
   */
  async createSnapshot(state: UniverseState): Promise<string> {
    const snapshotId = crypto.randomUUID();
    const compressed = await this.compressState(state);

    try {
      await this.db.snapshots.put({
        id: snapshotId,
        timestamp: Date.now(),
        data: compressed,
      });

      return snapshotId;
    } catch (error) {
      console.error('[Persistence] Failed to create snapshot:', error);
      throw error;
    }
  }

  /**
   * Load a snapshot by ID
   */
  async loadSnapshot(snapshotId: string): Promise<UniverseState | null> {
    try {
      const snapshot = await this.db.snapshots.get(snapshotId);

      if (!snapshot) {
        return null;
      }

      return this.decompressState(snapshot.data);
    } catch (error) {
      console.error('[Persistence] Failed to load snapshot:', error);
      return null;
    }
  }

  /**
   * Get recent events (for debugging/replay)
   */
  async getRecentEvents(limit: number = 100): Promise<UniverseDatabase['events'][]> {
    try {
      return await this.db.events.orderBy('tick').reverse().limit(limit).toArray();
    } catch (error) {
      console.error('[Persistence] Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clear(): Promise<void> {
    await this.db.transaction('rw', this.db.domains, this.db.events, this.db.snapshots, async () => {
      await this.db.domains.clear();
      await this.db.events.clear();
      await this.db.snapshots.clear();
    });
  }

  /**
   * Compress state for storage/transfer
   */
  private async compressState(state: UniverseState): Promise<Uint8Array> {
    const json = JSON.stringify(state);
    const encoder = new TextEncoder();
    const data = encoder.encode(json);

    // Use CompressionStream if available (modern browsers)
    // CompressionStream is a newer Web API not in all TypeScript lib versions
    if ('CompressionStream' in globalThis) {
      const blobStream = new Blob([data as BlobPart]).stream();
      const CompressionStreamConstructor = (globalThis as { CompressionStream: new (format: string) => ReadableWritablePair<Uint8Array, Uint8Array> }).CompressionStream;
      const compressedStream = blobStream.pipeThrough(new CompressionStreamConstructor('gzip'));
      const compressed = await new Response(compressedStream).arrayBuffer();
      return new Uint8Array(compressed);
    }

    // Fallback: no compression
    return data;
  }

  /**
   * Decompress state from storage/transfer
   */
  private async decompressState(data: Uint8Array): Promise<UniverseState> {
    // Use DecompressionStream if available
    // DecompressionStream is a newer Web API not in all TypeScript lib versions
    if ('DecompressionStream' in globalThis) {
      const blobStream = new Blob([data as BlobPart]).stream();
      const DecompressionStreamConstructor = (globalThis as { DecompressionStream: new (format: string) => ReadableWritablePair<Uint8Array, Uint8Array> }).DecompressionStream;
      const decompressedStream = blobStream.pipeThrough(new DecompressionStreamConstructor('gzip'));
      const decompressed = await new Response(decompressedStream).arrayBuffer();
      const decoder = new TextDecoder();
      const json = decoder.decode(decompressed);
      return JSON.parse(json);
    }

    // Fallback: assume uncompressed
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }
}
