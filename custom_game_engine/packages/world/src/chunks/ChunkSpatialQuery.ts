/**
 * ChunkSpatialQuery - High-level API for spatial entity queries
 *
 * Provides chunk-based spatial indexing for fast proximity queries.
 * Integrates with SimulationScheduler to filter by simulation mode.
 *
 * Performance characteristics:
 * - Chunk filtering: O(C) where C = chunks in radius (typically 9-25)
 * - Entity filtering: O(E) where E = entities in chunks (typically 10-100)
 * - Total: O(C × E_avg) << O(N) where N = total entities (1000-4000)
 *
 * Usage:
 * ```typescript
 * const query = new ChunkSpatialQuery(world, chunkManager);
 *
 * // Find nearby agents
 * const nearbyAgents = query.getEntitiesInRadius(
 *   agent.x, agent.y, 50,
 *   [ComponentType.Agent]
 * );
 *
 * // Find nearest building
 * const nearest = query.getNearestEntity(
 *   agent.x, agent.y,
 *   [ComponentType.Building]
 * );
 * ```
 */

import type { World } from '@ai-village/core';
import type { Entity, EntityImpl } from '@ai-village/core';
import type { EntityId, ComponentType } from '@ai-village/core';
import type { PositionComponent } from '@ai-village/core';
import type { ChunkManager } from './ChunkManager.js';
import type { ChunkCache } from './ChunkCache.js';
import { worldToChunk, getChunkKey, CHUNK_SIZE } from './Chunk.js';
import { getEntitiesInChunk } from './ChunkCache.js';
import {
  chunkDistance,
  distanceSquared,
  type Position,
} from '../../../core/src/utils/distance.js';

/**
 * Entity with distance information
 */
export interface EntityWithDistance {
  /** Entity reference */
  entity: Entity;
  /** Actual distance (with sqrt) */
  distance: number;
  /** Squared distance (no sqrt) */
  distanceSquared: number;
  /** Entity position */
  position: Position;
}

/**
 * ChunkSpatialQuery - Spatial query API using chunk indexing
 */
export class ChunkSpatialQuery {
  constructor(
    private world: World,
    private chunkManager: ChunkManager,
    private chunkCaches: Map<string, ChunkCache>
  ) {}

  /**
   * Get entities within tile radius using chunk-based filtering
   *
   * Three-phase process:
   * 1. Broad phase: Filter chunks by Chebyshev distance
   * 2. Narrow phase: Get entities from relevant chunks
   * 3. Final phase: Calculate exact distances, sort by distance
   *
   * @param x - Center X in world coordinates
   * @param y - Center Y in world coordinates
   * @param radius - Search radius in tiles
   * @param componentTypes - Component types to filter (e.g., ['agent', 'building'])
   * @param options - Additional filtering options
   * @returns Array of entities with distance info, sorted by distance
   */
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[],
    options: {
      /** Maximum number of results */
      limit?: number;
      /** Exclude specific entity IDs */
      excludeIds?: Set<EntityId>;
      /** Only include entities passing this filter */
      filter?: (entity: Entity) => boolean;
    } = {}
  ): EntityWithDistance[] {
    // Phase 1: Broad phase - get chunks in radius
    const chunks = this.getChunksInRadius(x, y, radius);

    // Phase 2: Narrow phase - collect entities from chunks
    const candidateIds = new Set<EntityId>();

    for (const chunk of chunks) {
      const cache = this.chunkCaches.get(getChunkKey(chunk.chunkX, chunk.chunkY));

      // Try ChunkCache's component-based index first
      let foundInCache = false;
      if (cache) {
        for (const componentType of componentTypes) {
          const entities = getEntitiesInChunk(cache, componentType);
          if (entities.size > 0) {
            foundInCache = true;
            for (const entityId of entities) {
              candidateIds.add(entityId);
            }
          }
        }
      }

      // FALLBACK: Use World's basic chunk index if ChunkCache is empty
      // This handles the case where ChunkCache entityIndex isn't populated yet
      if (!foundInCache) {
        // Get all entities in this chunk from World's chunkIndex
        const chunkEntityIds = this.world.getEntitiesInChunk(chunk.chunkX, chunk.chunkY);

        // Filter by component type
        for (const entityId of chunkEntityIds) {
          const entity = this.world.getEntity(entityId);
          if (!entity) continue;

          // Check if entity has any of the requested component types
          for (const componentType of componentTypes) {
            if (entity.hasComponent(componentType)) {
              candidateIds.add(entityId);
              break; // Only add once even if has multiple matching components
            }
          }
        }
      }
    }

    // Phase 3: Final phase - calculate exact distances
    const results: EntityWithDistance[] = [];
    const radiusSq = radius * radius;
    const centerPos = { x, y };

    for (const entityId of candidateIds) {
      // Apply exclusion filter
      if (options.excludeIds?.has(entityId)) continue;

      // Get entity
      const entity = this.world.getEntity(entityId);
      if (!entity) continue;

      // Get position
      const position = entity.getComponent<PositionComponent>('position');
      if (!position) continue;

      // Calculate distance
      const distSq = distanceSquared(centerPos, position);

      // Check radius (using squared distance, no sqrt)
      if (distSq > radiusSq) continue;

      // Apply custom filter
      if (options.filter && !options.filter(entity)) continue;

      // Add to results
      results.push({
        entity,
        distance: Math.sqrt(distSq), // Only sqrt once
        distanceSquared: distSq,
        position: { x: position.x, y: position.y },
      });
    }

    // Sort by distance (using already-calculated squared distances)
    results.sort((a, b) => a.distanceSquared - b.distanceSquared);

    // Apply limit
    if (options.limit !== undefined && results.length > options.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get entities in chunk radius (fast, no distance calculations)
   *
   * Uses Chebyshev distance at chunk level for very fast broad-phase filtering.
   * Does NOT calculate exact distances.
   *
   * Use when you need all entities in a rectangular area.
   *
   * @param chunkX - Center chunk X coordinate
   * @param chunkY - Center chunk Y coordinate
   * @param chunkRadius - Radius in chunks (Chebyshev distance)
   * @param componentTypes - Component types to filter
   * @returns Array of entity IDs (unsorted)
   */
  getEntitiesInChunkRadius(
    chunkX: number,
    chunkY: number,
    chunkRadius: number,
    componentTypes: ComponentType[]
  ): EntityId[] {
    const entityIds: EntityId[] = [];

    // Get chunks in radius (using Chebyshev distance)
    for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const targetChunkX = chunkX + dx;
        const targetChunkY = chunkY + dy;

        const cache = this.chunkCaches.get(getChunkKey(targetChunkX, targetChunkY));
        if (!cache) continue;

        // Get entities of requested types
        for (const componentType of componentTypes) {
          const entities = getEntitiesInChunk(cache, componentType);
          entityIds.push(...entities);
        }
      }
    }

    return entityIds;
  }

  /**
   * Find nearest entity matching criteria
   *
   * Uses chunk-based broad phase, then finds nearest in relevant chunks.
   * More efficient than querying all entities globally.
   *
   * @param x - Search origin X
   * @param y - Search origin Y
   * @param componentTypes - Component types to match
   * @param options - Additional filtering options
   * @returns Nearest entity with distance, or null if none found
   */
  getNearestEntity(
    x: number,
    y: number,
    componentTypes: ComponentType[],
    options: {
      /** Maximum search radius (optional) */
      maxRadius?: number;
      /** Exclude specific entity IDs */
      excludeIds?: Set<EntityId>;
      /** Only include entities passing this filter */
      filter?: (entity: Entity) => boolean;
    } = {}
  ): EntityWithDistance | null {
    // Default to large search radius if not specified
    const searchRadius = options.maxRadius ?? 200;

    // Get all entities in radius
    const entities = this.getEntitiesInRadius(x, y, searchRadius, componentTypes, {
      excludeIds: options.excludeIds,
      filter: options.filter,
    });

    // Return first (nearest) or null
    return entities.length > 0 ? entities[0]! : null;
  }

  /**
   * Get all chunks that intersect with a radius around a position
   *
   * @param x - Center X in world coordinates
   * @param y - Center Y in world coordinates
   * @param radius - Radius in tiles
   * @returns Array of chunks intersecting the radius
   */
  private getChunksInRadius(
    x: number,
    y: number,
    radius: number
  ): Array<{ chunkX: number; chunkY: number }> {
    const chunks: Array<{ chunkX: number; chunkY: number }> = [];

    // Convert world position to chunk coordinates
    const { chunkX: centerChunkX, chunkY: centerChunkY } = worldToChunk(x, y);

    // Calculate chunk radius (how many chunks to search)
    const chunkRadius = Math.ceil(radius / CHUNK_SIZE);

    // Get chunks in rectangular area (using Chebyshev distance)
    for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const targetChunkX = centerChunkX + dx;
        const targetChunkY = centerChunkY + dy;

        // Optional: Filter chunks by actual distance
        // (Skip chunks that don't intersect the circular search area)
        // For now, include all chunks in rectangular area for simplicity

        chunks.push({
          chunkX: targetChunkX,
          chunkY: targetChunkY,
        });
      }
    }

    return chunks;
  }

  /**
   * Count entities in radius (fast, no entity allocation)
   *
   * Useful for quick checks like "are there any enemies nearby?"
   *
   * @param x - Center X
   * @param y - Center Y
   * @param radius - Radius in tiles
   * @param componentTypes - Component types to count
   * @returns Count of entities
   */
  countEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): number {
    const chunks = this.getChunksInRadius(x, y, radius);
    let count = 0;
    const radiusSq = radius * radius;
    const centerPos = { x, y };

    for (const chunk of chunks) {
      const cache = this.chunkCaches.get(getChunkKey(chunk.chunkX, chunk.chunkY));
      if (!cache) continue;

      for (const componentType of componentTypes) {
        const entities = getEntitiesInChunk(cache, componentType);

        for (const entityId of entities) {
          const entity = this.world.getEntity(entityId);
          if (!entity) continue;

          const position = entity.getComponent<PositionComponent>('position');
          if (!position) continue;

          // Check distance (using squared distance)
          if (distanceSquared(centerPos, position) <= radiusSq) {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Check if any entity exists in radius (early-exit optimization)
   *
   * Stops searching as soon as one entity is found.
   * Useful for existence checks like "is there a building nearby?"
   *
   * @param x - Center X
   * @param y - Center Y
   * @param radius - Radius in tiles
   * @param componentTypes - Component types to check
   * @returns True if at least one entity found
   */
  hasEntityInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): boolean {
    const chunks = this.getChunksInRadius(x, y, radius);
    const radiusSq = radius * radius;
    const centerPos = { x, y };

    for (const chunk of chunks) {
      const cache = this.chunkCaches.get(getChunkKey(chunk.chunkX, chunk.chunkY));
      if (!cache) continue;

      for (const componentType of componentTypes) {
        const entities = getEntitiesInChunk(cache, componentType);

        for (const entityId of entities) {
          const entity = this.world.getEntity(entityId);
          if (!entity) continue;

          const position = entity.getComponent<PositionComponent>('position');
          if (!position) continue;

          // Check distance (using squared distance)
          if (distanceSquared(centerPos, position) <= radiusSq) {
            return true; // Found one, early exit!
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a specific building type exists or is being built in a chunk (O(1) lookup)
   *
   * Uses cached chunk stats for instant lookups without scanning entities.
   * Checks both completed buildings and agents currently building that type.
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @param buildingType - Building type to check (e.g., 'campfire', 'workbench')
   * @returns True if building exists (completed or under construction)
   */
  hasBuildingInChunk(chunkX: number, chunkY: number, buildingType: string): boolean {
    const cache = this.chunkCaches.get(getChunkKey(chunkX, chunkY));
    if (!cache) return false;

    // O(1) lookup: Check completed buildings
    const completedCount = cache.stats.buildingTypes.get(buildingType) || 0;
    if (completedCount > 0) return true;

    // O(1) lookup: Check agents building this type
    const pendingCount = cache.stats.pendingBuilds.get(buildingType) || 0;
    return pendingCount > 0;
  }

  /**
   * Check if a specific building type exists or is being built near a position (O(1) per chunk)
   *
   * Checks the agent's current chunk for the building type.
   * Much faster than scanning all entities.
   *
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @param buildingType - Building type to check
   * @returns True if building exists in agent's chunk
   */
  hasBuildingNearPosition(worldX: number, worldY: number, buildingType: string): boolean {
    const { chunkX, chunkY } = worldToChunk(worldX, worldY);
    return this.hasBuildingInChunk(chunkX, chunkY, buildingType);
  }
}
