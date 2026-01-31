/**
 * EntityDemotion - Factorio-style optimization for passive objects
 *
 * Some "entities" don't need the full ECS overhead:
 * - Resources on the ground (static until gathered)
 * - Dropped items (static until picked up)
 * - Decorative objects (never change)
 * - Particles (pure rendering, no game logic)
 *
 * Instead of creating full Entity objects with components, we can store
 * these as simple data structures in spatial indexes, reducing:
 * - Memory: ~500 bytes/entity → ~40 bytes/record
 * - Query overhead: O(entities) → O(1) spatial lookup
 * - GC pressure: Fewer object allocations
 *
 * This module provides patterns for "demoting" entities to data.
 *
 * Inspired by Factorio where belt items aren't entities - they're just
 * data structures (item type + belt position).
 */

import type { EntityId } from '../types.js';

// ============================================================================
// RESOURCE DATA STORE
// ============================================================================

/**
 * Lightweight resource record - replaces full Resource entity
 */
export interface ResourceRecord {
  id: string;
  resourceType: string;
  x: number;
  y: number;
  z?: number;
  amount: number;
  quality?: number;
  /** Tick when this resource was placed/created */
  createdTick: number;
  /** Tick when this was last gathered from (for regeneration) */
  lastGatheredTick?: number;
}

/**
 * ResourceDataStore - Spatial index for demoted resource entities
 *
 * Instead of 5000 Resource entities with full ECS overhead,
 * store them as simple records in a spatial hash.
 */
export class ResourceDataStore {
  private resources: Map<string, ResourceRecord> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 16) {
    this.cellSize = cellSize;
  }

  private cellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Add a resource to the data store
   */
  add(record: ResourceRecord): void {
    this.resources.set(record.id, record);

    const key = this.cellKey(record.x, record.y);
    let cell = this.spatialIndex.get(key);
    if (!cell) {
      cell = new Set();
      this.spatialIndex.set(key, cell);
    }
    cell.add(record.id);
  }

  /**
   * Remove a resource from the data store
   */
  remove(id: string): boolean {
    const record = this.resources.get(id);
    if (!record) return false;

    const key = this.cellKey(record.x, record.y);
    const cell = this.spatialIndex.get(key);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) {
        this.spatialIndex.delete(key);
      }
    }

    this.resources.delete(id);
    return true;
  }

  /**
   * Get a resource by ID
   */
  get(id: string): ResourceRecord | undefined {
    return this.resources.get(id);
  }

  /**
   * Update a resource's amount
   */
  updateAmount(id: string, newAmount: number, gatherTick?: number): boolean {
    const record = this.resources.get(id);
    if (!record) return false;

    record.amount = newAmount;
    if (gatherTick !== undefined) {
      record.lastGatheredTick = gatherTick;
    }
    return true;
  }

  /**
   * Query resources within radius of a point
   */
  queryRadius(
    x: number,
    y: number,
    radius: number,
    resourceType?: string
  ): ResourceRecord[] {
    const results: ResourceRecord[] = [];
    const radiusSq = radius * radius;

    // Calculate cells to check
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.spatialIndex.get(`${cx},${cy}`);
        if (!cell) continue;

        for (const id of cell) {
          const record = this.resources.get(id);
          if (!record) continue;

          // Type filter
          if (resourceType && record.resourceType !== resourceType) continue;

          // Distance check
          const dx = record.x - x;
          const dy = record.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(record);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get the nearest resource of a given type
   */
  findNearest(
    x: number,
    y: number,
    maxRadius: number,
    resourceType?: string
  ): ResourceRecord | null {
    const candidates = this.queryRadius(x, y, maxRadius, resourceType);
    if (candidates.length === 0) return null;

    let nearest: ResourceRecord | null = null;
    let nearestDistSq = Infinity;

    for (const record of candidates) {
      const dx = record.x - x;
      const dy = record.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = record;
      }
    }

    return nearest;
  }

  /**
   * Iterate all resources (for batch processing)
   */
  *all(): IterableIterator<ResourceRecord> {
    yield* this.resources.values();
  }

  /**
   * Get count of resources
   */
  get size(): number {
    return this.resources.size;
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
    this.spatialIndex.clear();
  }

  /**
   * Get stats
   */
  getStats(): {
    totalResources: number;
    totalCells: number;
    avgResourcesPerCell: number;
  } {
    const totalCells = this.spatialIndex.size;
    return {
      totalResources: this.resources.size,
      totalCells,
      avgResourcesPerCell: totalCells > 0 ? this.resources.size / totalCells : 0,
    };
  }
}

// ============================================================================
// DROPPED ITEM DATA STORE
// ============================================================================

/**
 * Lightweight dropped item record
 */
export interface DroppedItemRecord {
  id: string;
  itemType: string;
  x: number;
  y: number;
  z?: number;
  quantity: number;
  droppedTick: number;
  /** Entity that dropped this item */
  droppedByEntityId?: EntityId;
  /** Tick when item despawns (optional) */
  despawnTick?: number;
}

/**
 * DroppedItemDataStore - Spatial index for dropped items
 */
export class DroppedItemDataStore {
  private items: Map<string, DroppedItemRecord> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 16) {
    this.cellSize = cellSize;
  }

  private cellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  add(record: DroppedItemRecord): void {
    this.items.set(record.id, record);

    const key = this.cellKey(record.x, record.y);
    let cell = this.spatialIndex.get(key);
    if (!cell) {
      cell = new Set();
      this.spatialIndex.set(key, cell);
    }
    cell.add(record.id);
  }

  remove(id: string): boolean {
    const record = this.items.get(id);
    if (!record) return false;

    const key = this.cellKey(record.x, record.y);
    const cell = this.spatialIndex.get(key);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) {
        this.spatialIndex.delete(key);
      }
    }

    this.items.delete(id);
    return true;
  }

  get(id: string): DroppedItemRecord | undefined {
    return this.items.get(id);
  }

  queryRadius(x: number, y: number, radius: number): DroppedItemRecord[] {
    const results: DroppedItemRecord[] = [];
    const radiusSq = radius * radius;

    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.spatialIndex.get(`${cx},${cy}`);
        if (!cell) continue;

        for (const id of cell) {
          const record = this.items.get(id);
          if (!record) continue;

          const dx = record.x - x;
          const dy = record.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(record);
          }
        }
      }
    }

    return results;
  }

  /**
   * Remove expired items (past despawnTick)
   */
  removeExpired(currentTick: number): number {
    let removed = 0;
    for (const [id, record] of this.items) {
      if (record.despawnTick !== undefined && currentTick >= record.despawnTick) {
        this.remove(id);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
    this.spatialIndex.clear();
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper to convert a resource entity to a demoted record
 */
export function demoteResourceEntity(entity: {
  id: string;
  components: Map<string, unknown>;
}): ResourceRecord | null {
  const position = entity.components.get('position') as { x: number; y: number; z?: number } | undefined;
  const resource = entity.components.get('resource') as { resourceType: string; amount: number; quality?: number } | undefined;

  if (!position || !resource) return null;

  return {
    id: entity.id,
    resourceType: resource.resourceType,
    x: position.x,
    y: position.y,
    z: position.z,
    amount: resource.amount,
    quality: resource.quality,
    createdTick: 0, // Unknown from entity
  };
}

/**
 * Helper to promote a demoted resource back to entity components
 */
export function promoteResourceRecord(record: ResourceRecord): {
  position: { type: 'position'; version: number; x: number; y: number; z?: number };
  resource: { type: 'resource'; version: number; resourceType: string; amount: number; quality?: number };
} {
  return {
    position: {
      type: 'position',
      version: 1,
      x: record.x,
      y: record.y,
      z: record.z,
    },
    resource: {
      type: 'resource',
      version: 1,
      resourceType: record.resourceType,
      amount: record.amount,
      quality: record.quality,
    },
  };
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const resourceDataStore = new ResourceDataStore();
export const droppedItemDataStore = new DroppedItemDataStore();
