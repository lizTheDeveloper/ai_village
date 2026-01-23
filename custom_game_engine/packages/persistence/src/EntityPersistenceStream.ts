/**
 * EntityPersistenceStream - Batched entity persistence to server
 *
 * Listens for entity creation events and periodically flushes
 * new/modified entities to the planet server in batches.
 * Also handles chunk save-after-generation.
 *
 * Performance: Batches saves every 5 seconds to avoid overwhelming
 * the server with individual entity POSTs.
 */

import type { PlanetClient } from './PlanetClient.js';

export interface EntitySnapshot {
  id: string;
  components: Record<string, unknown>;
  createdAt: number;
}

export interface EntityPersistenceStreamOptions {
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Max entities to batch before forcing flush (default: 50) */
  maxBatchSize?: number;
  /** Whether to persist chunks on generation (default: true) */
  persistChunks?: boolean;
}

export class EntityPersistenceStream {
  private planetId: string | null = null;
  private client: PlanetClient;
  private dirtyEntityIds: Set<string> = new Set();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private options: Required<EntityPersistenceStreamOptions>;
  private world: any = null; // Will be set via attach()
  private unsubscribe: (() => void) | null = null;
  private enabled: boolean = false;

  constructor(client: PlanetClient, options: EntityPersistenceStreamOptions = {}) {
    this.client = client;
    this.options = {
      flushInterval: options.flushInterval ?? 5000,
      maxBatchSize: options.maxBatchSize ?? 50,
      persistChunks: options.persistChunks ?? true,
    };
  }

  /**
   * Attach to a world and start listening for entity creation events.
   */
  attach(world: any, planetId: string): void {
    this.world = world;
    this.planetId = planetId;
    this.enabled = true;

    // Subscribe to entity:created events
    this.unsubscribe = world.eventBus.subscribe('entity:created', (event: any) => {
      this.onEntityCreated(event.data.entityId);
    });

    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.warn('[EntityPersistenceStream] Flush error:', err);
      });
    }, this.options.flushInterval);

    console.log(`[EntityPersistenceStream] Attached to world, planetId=${planetId}, flush every ${this.options.flushInterval}ms`);
  }

  /**
   * Detach from world and stop persisting.
   */
  detach(): void {
    this.enabled = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.world = null;
  }

  /**
   * Called when an entity is created - queue it for persistence.
   */
  private onEntityCreated(entityId: string): void {
    if (!this.enabled) return;
    this.dirtyEntityIds.add(entityId);

    // Force flush if batch is too large
    if (this.dirtyEntityIds.size >= this.options.maxBatchSize) {
      this.flush().catch(err => {
        console.warn('[EntityPersistenceStream] Forced flush error:', err);
      });
    }
  }

  /**
   * Manually mark an entity as dirty (e.g., after significant modification).
   */
  markDirty(entityId: string): void {
    if (this.enabled) {
      this.dirtyEntityIds.add(entityId);
    }
  }

  /**
   * Flush all dirty entities to the server.
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.planetId || !this.world) return;
    if (this.dirtyEntityIds.size === 0) return;

    // Snapshot the dirty set and clear it
    const entityIds = Array.from(this.dirtyEntityIds);
    this.dirtyEntityIds.clear();

    // Serialize entities
    const entities: EntitySnapshot[] = [];
    for (const id of entityIds) {
      try {
        const entity = this.world.getEntity(id);
        if (!entity) continue; // Entity may have been destroyed

        // Serialize all components to plain objects
        const components: Record<string, unknown> = {};
        for (const [type, component] of entity.components) {
          // Shallow serialize - deep serialization handled by WorldSerializer for full saves
          components[type] = this.serializeComponent(component);
        }

        entities.push({
          id,
          components,
          createdAt: entity.createdAt ?? 0,
        });
      } catch (error) {
        console.warn(`[EntityPersistenceStream] Failed to serialize entity ${id}:`, error);
      }
    }

    if (entities.length === 0) return;

    // Send batch to server
    try {
      await this.client.saveEntities(this.planetId, entities);
    } catch (error) {
      // Non-fatal - re-queue entities for next flush
      console.warn(`[EntityPersistenceStream] Failed to save ${entities.length} entities:`, error);
      for (const entity of entities) {
        this.dirtyEntityIds.add(entity.id);
      }
    }
  }

  /**
   * Notify that a chunk was generated and should be persisted.
   */
  async persistChunk(chunkX: number, chunkY: number, chunk: any): Promise<void> {
    if (!this.enabled || !this.planetId || !this.options.persistChunks) return;

    try {
      // Serialize chunk tiles to a simple format
      const serializedChunk = {
        x: chunkX,
        y: chunkY,
        tiles: chunk.tiles, // Raw tile array
        compression: 'full' as const,
        modifiedAt: Date.now(),
        modifiedBy: this.client.getPlayerId() || undefined,
        checksum: '', // Server will compute if empty
      };

      await this.client.saveChunk(this.planetId, serializedChunk);
    } catch (error) {
      console.warn(`[EntityPersistenceStream] Failed to persist chunk ${chunkX},${chunkY}:`, error);
    }
  }

  /**
   * Get count of pending entities.
   */
  get pendingCount(): number {
    return this.dirtyEntityIds.size;
  }

  /**
   * Serialize a component to a plain object (shallow).
   * Handles Maps, Sets, and other non-JSON-serializable types.
   */
  private serializeComponent(component: unknown): unknown {
    if (component === null || component === undefined) return component;
    if (typeof component !== 'object') return component;

    const obj = component as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Map) {
        result[key] = Object.fromEntries(value);
      } else if (value instanceof Set) {
        result[key] = Array.from(value);
      } else if (value instanceof Date) {
        result[key] = value.getTime();
      } else if (typeof value === 'function') {
        // Skip functions
        continue;
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
