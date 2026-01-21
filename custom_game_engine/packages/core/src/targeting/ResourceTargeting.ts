/**
 * ResourceTargeting - Find gatherable resources (wood, stone, food, etc.)
 *
 * This class provides perception-limited resource targeting for agents.
 * Agents can only target resources they can currently see or remember.
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import {  type TargetResult,
  getRememberedLocation,
  rememberLocation,
  forgetLocation,
} from '../services/TargetingAPI.js';

/**
 * Options for resource targeting
 */
export interface ResourceTargetingOptions {
  /** Filter by specific resource type (e.g., 'wood', 'stone', 'food') */
  resourceType?: string;
  /** Maximum distance to search */
  maxDistance?: number;
  /** Entity IDs to exclude from targeting */
  excludeIds?: Set<string>;
  /** Minimum amount remaining to consider */
  minAmount?: number;
}

/**
 * Resource target result
 */
export interface ResourceTarget {
  entity: Entity;
  resourceType: string;
  amount: number;
  distance: number;
  position: { x: number; y: number };
}

/**
 * ResourceTargeting Class
 *
 * Usage:
 * ```typescript
 * const targeting = new ResourceTargeting();
 * const wood = targeting.findNearest(entity, world, { resourceType: 'wood' });
 * if (wood) {
 *   movement.moveToward(entity, wood.position);
 * }
 * ```
 */
export class ResourceTargeting {
  /**
   * Find the nearest visible resource matching criteria.
   * Only searches resources the agent can currently see.
   */
  findNearest(
    entity: EntityImpl,
    world: World,
    options: ResourceTargetingOptions = {}
  ): ResourceTarget | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);

    if (!position || !vision) return null;

    const seenResources = vision.seenResources || [];
    let nearest: ResourceTarget | null = null;
    let nearestDist = Infinity;

    for (const resourceId of seenResources) {
      if (options.excludeIds?.has(resourceId)) continue;

      const resourceEntity = world.getEntity(resourceId);
      if (!resourceEntity) continue;

      const impl = resourceEntity as EntityImpl;
      const resource = impl.getComponent<ResourceComponent>(ComponentType.Resource);
      const resourcePos = impl.getComponent<PositionComponent>(ComponentType.Position);

      if (!resource || !resourcePos) continue;

      // Check harvestable
      if (!resource.harvestable) continue;

      // Check amount
      if (resource.amount <= 0) continue;
      if (options.minAmount !== undefined && resource.amount < options.minAmount) continue;

      // Check resource type
      if (options.resourceType && resource.resourceType !== options.resourceType) continue;

      // Calculate distance
      const dist = this.distance(position, resourcePos);

      // Check max distance
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      // Track nearest
      if (dist < nearestDist) {
        nearest = {
          entity: resourceEntity,
          resourceType: resource.resourceType,
          amount: resource.amount,
          distance: dist,
          position: { x: resourcePos.x, y: resourcePos.y },
        };
        nearestDist = dist;
      }
    }

    // Remember location if found
    if (nearest && options.resourceType) {
      rememberLocation(
        entity,
        `resource:${options.resourceType}`,
        nearest.position,
        world.tick
      );
    }

    return nearest;
  }

  /**
   * Find all visible resources matching criteria.
   */
  findAll(
    entity: EntityImpl,
    world: World,
    options: ResourceTargetingOptions = {}
  ): ResourceTarget[] {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);

    if (!position || !vision) return [];

    const seenResources = vision.seenResources || [];
    const results: ResourceTarget[] = [];

    for (const resourceId of seenResources) {
      if (options.excludeIds?.has(resourceId)) continue;

      const resourceEntity = world.getEntity(resourceId);
      if (!resourceEntity) continue;

      const impl = resourceEntity as EntityImpl;
      const resource = impl.getComponent<ResourceComponent>(ComponentType.Resource);
      const resourcePos = impl.getComponent<PositionComponent>(ComponentType.Position);

      if (!resource || !resourcePos) continue;
      if (!resource.harvestable || resource.amount <= 0) continue;
      if (options.resourceType && resource.resourceType !== options.resourceType) continue;
      if (options.minAmount !== undefined && resource.amount < options.minAmount) continue;

      const dist = this.distance(position, resourcePos);
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      results.push({
        entity: resourceEntity,
        resourceType: resource.resourceType,
        amount: resource.amount,
        distance: dist,
        position: { x: resourcePos.x, y: resourcePos.y },
      });
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Get a remembered resource location.
   * Returns null if no memory exists or if memory is too old.
   */
  getRemembered(
    entity: EntityImpl,
    resourceType: string,
    maxAge?: number,
    currentTick?: number
  ): { x: number; y: number; tick: number } | null {
    const remembered = getRememberedLocation(entity, `resource:${resourceType}`);

    if (!remembered) return null;

    // Check age if specified
    if (maxAge !== undefined && currentTick !== undefined) {
      if (currentTick - remembered.tick > maxAge) {
        return null;
      }
    }

    return remembered;
  }

  /**
   * Forget a remembered resource location.
   * Use this when arriving at a location and finding the resource is gone.
   */
  forgetRemembered(entity: EntityImpl, resourceType: string): void {
    forgetLocation(entity, `resource:${resourceType}`);
  }

  /**
   * Combined targeting: Find visible resource or fall back to memory.
   * Returns a TargetResult indicating how the target was found.
   */
  findTarget(
    entity: EntityImpl,
    world: World,
    options: ResourceTargetingOptions = {}
  ): TargetResult {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return { type: 'unknown' };

    // First: Try to find visible resource
    const visible = this.findNearest(entity, world, options);
    if (visible) {
      return {
        type: 'visible',
        entity: visible.entity,
        distance: visible.distance,
      };
    }

    // Second: Try remembered location
    if (options.resourceType) {
      const remembered = this.getRemembered(entity, options.resourceType);
      if (remembered) {
        const dist = this.distance(position, remembered);
        if (!options.maxDistance || dist <= options.maxDistance) {
          return {
            type: 'remembered',
            position: { x: remembered.x, y: remembered.y },
            tick: remembered.tick,
            category: `resource:${options.resourceType}`,
          };
        }
      }
    }

    // Third: No known resources
    return { type: 'unknown' };
  }

  /**
   * Calculate distance between two positions.
   * PERFORMANCE: Returns actual distance - used for display and sorting.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const resourceTargeting = new ResourceTargeting();

/**
 * Find nearest visible resource.
 */
export function findNearestResource(
  entity: Entity,
  world: World,
  options?: ResourceTargetingOptions
): ResourceTarget | null {
  return resourceTargeting.findNearest(entity as EntityImpl, world, options);
}

/**
 * Find all visible resources.
 */
export function findAllResources(
  entity: Entity,
  world: World,
  options?: ResourceTargetingOptions
): ResourceTarget[] {
  return resourceTargeting.findAll(entity as EntityImpl, world, options);
}

/**
 * Get remembered resource location.
 */
export function getRememberedResource(
  entity: Entity,
  resourceType: string,
  maxAge?: number,
  currentTick?: number
): { x: number; y: number; tick: number } | null {
  return resourceTargeting.getRemembered(entity as EntityImpl, resourceType, maxAge, currentTick);
}

/**
 * Find resource target (visible or remembered).
 */
export function findResourceTarget(
  entity: Entity,
  world: World,
  options?: ResourceTargetingOptions
): TargetResult {
  return resourceTargeting.findTarget(entity as EntityImpl, world, options);
}
