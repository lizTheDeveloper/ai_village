/**
 * BuildingTargeting - Find buildings (storage, beds, crafting stations, etc.)
 *
 * This class provides perception-limited building targeting for agents.
 * Agents can only target buildings they can currently see or remember.
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import {
  type TargetResult,
  rememberLocation,
  getRememberedLocation,
  forgetLocation,
} from '../services/TargetingAPI.js';

/**
 * Options for building targeting
 */
export interface BuildingTargetingOptions {
  /** Filter by specific building type (e.g., 'storage', 'bed', 'crafting_station') */
  buildingType?: string;
  /** Only find completed buildings */
  completed?: boolean;
  /** Only find buildings with available capacity (for storage) */
  hasCapacity?: boolean;
  /** Maximum distance to search */
  maxDistance?: number;
  /** Entity IDs to exclude */
  excludeIds?: Set<string>;
  /** Only find buildings that provide warmth */
  providesWarmth?: boolean;
  /** Only find buildings with specific crafting type */
  craftingType?: string;
}

/**
 * Building target result
 */
export interface BuildingTarget {
  entity: Entity;
  buildingType: string;
  isComplete: boolean;
  constructionProgress: number;
  distance: number;
  position: { x: number; y: number };
  capacity?: number;
  currentItems?: number;
  providesWarmth?: boolean;
  warmthBonus?: number;
}

/**
 * BuildingTargeting Class
 *
 * Usage:
 * ```typescript
 * const targeting = new BuildingTargeting();
 *
 * // Find storage
 * const storage = targeting.findNearest(entity, world, {
 *   buildingType: 'storage',
 *   hasCapacity: true,
 * });
 *
 * // Find bed
 * const bed = targeting.findNearest(entity, world, { buildingType: 'bed' });
 *
 * // Find warm shelter
 * const shelter = targeting.findNearest(entity, world, { providesWarmth: true });
 * ```
 */
export class BuildingTargeting {
  /**
   * Find the nearest visible building matching criteria.
   */
  findNearest(
    entity: EntityImpl,
    world: World,
    options: BuildingTargetingOptions = {}
  ): BuildingTarget | null {
    const position = entity.getComponent<PositionComponent>('position');
    const vision = entity.getComponent<VisionComponent>('vision');

    if (!position || !vision) return null;

    // Buildings are typically in seenBuildings or we need to check all visible entities
    const seenBuildings = (vision as any).seenBuildings || [];
    let nearest: BuildingTarget | null = null;
    let nearestDist = Infinity;

    // Also check seenResources and seenAgents as buildings might be stored there
    const candidates = [...seenBuildings];

    // If no dedicated seenBuildings, scan all visible entities
    if (candidates.length === 0) {
      // Fall back to querying world for nearby buildings (within vision range)
      const allBuildings = world
        .query()
        .with('building')
        .with('position')
        .executeEntities();

      const visionRange = vision.range || 15;

      for (const buildingEntity of allBuildings) {
        const impl = buildingEntity as EntityImpl;
        const buildingPos = impl.getComponent<PositionComponent>('position');
        if (!buildingPos) continue;

        const dist = this.distance(position, buildingPos);
        if (dist <= visionRange) {
          candidates.push(buildingEntity.id);
        }
      }
    }

    for (const buildingId of candidates) {
      if (options.excludeIds?.has(buildingId)) continue;

      const buildingEntity = world.getEntity(buildingId);
      if (!buildingEntity) continue;

      const impl = buildingEntity as EntityImpl;
      const building = impl.getComponent('building') as any;
      const buildingPos = impl.getComponent<PositionComponent>('position');

      if (!building || !buildingPos) continue;

      // Check building type
      if (options.buildingType && building.buildingType !== options.buildingType) continue;

      // Check completion
      const isComplete = building.constructionProgress >= 1.0;
      if (options.completed && !isComplete) continue;

      // Check warmth
      if (options.providesWarmth) {
        const providesWarmth = building.warmthBonus > 0 || building.insulation > 0;
        if (!providesWarmth) continue;
      }

      // Check capacity (for storage buildings)
      if (options.hasCapacity) {
        const capacity = building.capacity || 0;
        const currentItems = building.storedItems?.length || 0;
        if (currentItems >= capacity) continue;
      }

      // Check crafting type
      if (options.craftingType) {
        const craftingTypes = building.craftingTypes || [];
        if (!craftingTypes.includes(options.craftingType)) continue;
      }

      // Calculate distance
      const dist = this.distance(position, buildingPos);

      // Check max distance
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      // Track nearest
      if (dist < nearestDist) {
        nearest = {
          entity: buildingEntity,
          buildingType: building.buildingType,
          isComplete,
          constructionProgress: building.constructionProgress || 0,
          distance: dist,
          position: { x: buildingPos.x, y: buildingPos.y },
          capacity: building.capacity,
          currentItems: building.storedItems?.length || 0,
          providesWarmth: building.warmthBonus > 0 || building.insulation > 0,
          warmthBonus: building.warmthBonus || 0,
        };
        nearestDist = dist;
      }
    }

    // Remember location if found
    if (nearest) {
      const category = options.buildingType
        ? `building:${options.buildingType}`
        : 'building:any';
      rememberLocation(entity, category, nearest.position, world.tick);
    }

    return nearest;
  }

  /**
   * Find all visible buildings matching criteria.
   */
  findAll(
    entity: EntityImpl,
    world: World,
    options: BuildingTargetingOptions = {}
  ): BuildingTarget[] {
    const position = entity.getComponent<PositionComponent>('position');
    const vision = entity.getComponent<VisionComponent>('vision');

    if (!position || !vision) return [];

    const results: BuildingTarget[] = [];
    const seenBuildings = (vision as any).seenBuildings || [];

    // Fallback: query all buildings in vision range
    const candidates = [...seenBuildings];
    if (candidates.length === 0) {
      const allBuildings = world
        .query()
        .with('building')
        .with('position')
        .executeEntities();

      const visionRange = vision.range || 15;

      for (const buildingEntity of allBuildings) {
        const impl = buildingEntity as EntityImpl;
        const buildingPos = impl.getComponent<PositionComponent>('position');
        if (!buildingPos) continue;

        const dist = this.distance(position, buildingPos);
        if (dist <= visionRange) {
          candidates.push(buildingEntity.id);
        }
      }
    }

    for (const buildingId of candidates) {
      if (options.excludeIds?.has(buildingId)) continue;

      const buildingEntity = world.getEntity(buildingId);
      if (!buildingEntity) continue;

      const impl = buildingEntity as EntityImpl;
      const building = impl.getComponent('building') as any;
      const buildingPos = impl.getComponent<PositionComponent>('position');

      if (!building || !buildingPos) continue;

      if (options.buildingType && building.buildingType !== options.buildingType) continue;

      const isComplete = building.constructionProgress >= 1.0;
      if (options.completed && !isComplete) continue;

      if (options.providesWarmth) {
        const providesWarmth = building.warmthBonus > 0 || building.insulation > 0;
        if (!providesWarmth) continue;
      }

      if (options.hasCapacity) {
        const capacity = building.capacity || 0;
        const currentItems = building.storedItems?.length || 0;
        if (currentItems >= capacity) continue;
      }

      if (options.craftingType) {
        const craftingTypes = building.craftingTypes || [];
        if (!craftingTypes.includes(options.craftingType)) continue;
      }

      const dist = this.distance(position, buildingPos);
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      results.push({
        entity: buildingEntity,
        buildingType: building.buildingType,
        isComplete,
        constructionProgress: building.constructionProgress || 0,
        distance: dist,
        position: { x: buildingPos.x, y: buildingPos.y },
        capacity: building.capacity,
        currentItems: building.storedItems?.length || 0,
        providesWarmth: building.warmthBonus > 0 || building.insulation > 0,
        warmthBonus: building.warmthBonus || 0,
      });
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Find nearest storage with available capacity.
   */
  findNearestStorage(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): BuildingTarget | null {
    return this.findNearest(entity, world, {
      buildingType: 'storage',
      completed: true,
      hasCapacity: true,
      maxDistance,
    });
  }

  /**
   * Find nearest bed.
   */
  findNearestBed(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): BuildingTarget | null {
    return this.findNearest(entity, world, {
      buildingType: 'bed',
      completed: true,
      maxDistance,
    });
  }

  /**
   * Find nearest warm shelter.
   */
  findNearestShelter(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): BuildingTarget | null {
    return this.findNearest(entity, world, {
      providesWarmth: true,
      completed: true,
      maxDistance,
    });
  }

  /**
   * Get remembered building location.
   */
  getRemembered(
    entity: EntityImpl,
    buildingType: string,
    maxAge?: number,
    currentTick?: number
  ): { x: number; y: number; tick: number } | null {
    const remembered = getRememberedLocation(entity, `building:${buildingType}`);

    if (!remembered) return null;

    if (maxAge !== undefined && currentTick !== undefined) {
      if (currentTick - remembered.tick > maxAge) {
        return null;
      }
    }

    return remembered;
  }

  /**
   * Forget remembered building location.
   */
  forgetRemembered(entity: EntityImpl, buildingType: string): void {
    forgetLocation(entity, `building:${buildingType}`);
  }

  /**
   * Combined targeting: Find visible building or fall back to memory.
   */
  findTarget(
    entity: EntityImpl,
    world: World,
    options: BuildingTargetingOptions = {}
  ): TargetResult {
    const position = entity.getComponent<PositionComponent>('position');
    if (!position) return { type: 'unknown' };

    // First: Try to find visible building
    const visible = this.findNearest(entity, world, options);
    if (visible) {
      return {
        type: 'visible',
        entity: visible.entity,
        distance: visible.distance,
      };
    }

    // Second: Try remembered location
    if (options.buildingType) {
      const remembered = this.getRemembered(entity, options.buildingType);
      if (remembered) {
        const dist = this.distance(position, remembered);
        if (!options.maxDistance || dist <= options.maxDistance) {
          return {
            type: 'remembered',
            position: { x: remembered.x, y: remembered.y },
            tick: remembered.tick,
            category: `building:${options.buildingType}`,
          };
        }
      }
    }

    return { type: 'unknown' };
  }

  /**
   * Calculate distance between two positions.
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

const buildingTargeting = new BuildingTargeting();

/**
 * Find nearest visible building.
 */
export function findNearestBuilding(
  entity: Entity,
  world: World,
  options?: BuildingTargetingOptions
): BuildingTarget | null {
  return buildingTargeting.findNearest(entity as EntityImpl, world, options);
}

/**
 * Find all visible buildings.
 */
export function findAllBuildings(
  entity: Entity,
  world: World,
  options?: BuildingTargetingOptions
): BuildingTarget[] {
  return buildingTargeting.findAll(entity as EntityImpl, world, options);
}

/**
 * Find nearest storage.
 */
export function findNearestStorageBuilding(
  entity: Entity,
  world: World,
  maxDistance?: number
): BuildingTarget | null {
  return buildingTargeting.findNearestStorage(entity as EntityImpl, world, maxDistance);
}

/**
 * Find nearest bed.
 */
export function findNearestBedBuilding(
  entity: Entity,
  world: World,
  maxDistance?: number
): BuildingTarget | null {
  return buildingTargeting.findNearestBed(entity as EntityImpl, world, maxDistance);
}

/**
 * Find nearest warm shelter.
 */
export function findNearestShelterBuilding(
  entity: Entity,
  world: World,
  maxDistance?: number
): BuildingTarget | null {
  return buildingTargeting.findNearestShelter(entity as EntityImpl, world, maxDistance);
}

/**
 * Find building target (visible or remembered).
 */
export function findBuildingTarget(
  entity: Entity,
  world: World,
  options?: BuildingTargetingOptions
): TargetResult {
  return buildingTargeting.findTarget(entity as EntityImpl, world, options);
}
