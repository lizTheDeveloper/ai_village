/**
 * SpatialQueryService - Unified API for spatial entity queries
 *
 * This is the "pit of success" API for finding nearby entities.
 * Instead of using world.query() or injected ChunkSpatialQuery,
 * access this via world.spatialQuery.
 *
 * Usage:
 * ```typescript
 * // In behaviors via BehaviorContext
 * const nearby = ctx.getEntitiesInRadius(50, [CT.Plant]);
 *
 * // In systems via SystemContext
 * const nearby = ctx.getNearbyEntities(position, 50, [CT.Building]);
 *
 * // Direct access (less common)
 * const nearby = world.spatialQuery?.getEntitiesInRadius(x, y, 50, [CT.Plant]);
 * ```
 */

import type { Entity } from '../ecs/Entity.js';
import type { EntityId, ComponentType } from '../types.js';

/**
 * Entity with distance information from spatial queries
 */
export interface EntityWithDistance {
  entity: Entity;
  distance: number;
  distanceSquared: number;
  position: { x: number; y: number };
}

/**
 * Options for spatial queries
 */
export interface SpatialQueryOptions {
  limit?: number;
  excludeIds?: Set<EntityId>;
  filter?: (entity: Entity) => boolean;
}

/**
 * Unified spatial query service interface.
 * Implemented by ChunkSpatialQuery in @ai-village/world.
 */
export interface SpatialQueryService {
  /**
   * Find entities within radius of a position.
   * Returns entities sorted by distance (closest first).
   */
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[],
    options?: SpatialQueryOptions
  ): EntityWithDistance[];

  /**
   * Find the nearest entity matching criteria.
   */
  getNearestEntity(
    x: number,
    y: number,
    componentTypes: ComponentType[],
    options?: { maxRadius?: number; excludeIds?: Set<EntityId>; filter?: (entity: Entity) => boolean }
  ): EntityWithDistance | null;

  /**
   * Check if any entity exists in radius (early exit, fast).
   */
  hasEntityInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): boolean;

  /**
   * Count entities in radius.
   */
  countEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): number;
}
