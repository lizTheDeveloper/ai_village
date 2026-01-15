/**
 * TargetingAPI - Perception-limited targeting service
 *
 * This service provides targeting functionality that respects agent perception limits.
 * Agents can only target:
 * 1. Entities currently visible (within vision range)
 * 2. Remembered locations (from past perception, may be stale)
 *
 * This creates emergent behavior where agents must explore to find resources
 * and their memories can become outdated.
 *
 * Part of Phase 0 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { getPlant, getResource, getBuilding } from '../utils/componentHelpers.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Target result types - indicates how the target was found
 */
export type TargetResult =
  | { type: 'visible'; entity: Entity; distance: number }
  | { type: 'remembered'; position: { x: number; y: number }; tick: number; category: string }
  | { type: 'unknown' };

/**
 * Entity filter function
 */
export type EntityFilter = (entity: Entity) => boolean;

/**
 * Targeting options
 */
export interface TargetingOptions {
  /** Filter function to determine valid targets */
  filter: EntityFilter;
  /** Memory category to search if no visible target (e.g., 'resource:wood') */
  memoryCategory?: string;
  /** Maximum distance to consider (optional) */
  maxDistance?: number;
  /** Minimum distance to consider (for avoiding self-targeting) */
  minDistance?: number;
}

/**
 * TargetingAPI Class - Perception-limited targeting
 *
 * Usage:
 * ```typescript
 * const targeting = new TargetingAPI();
 * const result = targeting.findTarget(entity, world, {
 *   filter: (e) => e.hasComponent('resource'),
 *   memoryCategory: 'resource:wood',
 * });
 *
 * switch (result.type) {
 *   case 'visible': // Direct path to visible target
 *   case 'remembered': // Navigate to remembered location
 *   case 'unknown': // Need to explore
 * }
 * ```
 */
export class TargetingAPI {
  /**
   * Find nearest target from VISIBLE entities only.
   * This respects agent perception limits - agents cannot "see" things outside vision.
   */
  findNearestVisible(
    entity: EntityImpl,
    world: World,
    filter: EntityFilter,
    options?: { maxDistance?: number; minDistance?: number }
  ): Entity | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);

    if (!position || !vision) return null;

    const maxDist = options?.maxDistance ?? Infinity;
    const minDist = options?.minDistance ?? 0;

    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    // Only search entities visible to this agent
    // VisionComponent tracks seen entities by category
    const visibleIds = [
      ...(vision.seenAgents || []),
      ...(vision.seenResources || []),
      ...(vision.seenPlants || []),
    ];

    for (const entityId of visibleIds) {
      const visibleEntity = world.getEntity(entityId);
      if (!visibleEntity) continue;

      // Apply filter
      if (!filter(visibleEntity)) continue;

      // Calculate distance
      const targetPos = (visibleEntity as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
      if (!targetPos) continue;

      const dist = this.distance(position, targetPos);

      // Check distance bounds
      if (dist < minDist || dist > maxDist) continue;

      // Track nearest
      if (dist < nearestDist) {
        nearest = visibleEntity;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  /**
   * Find ALL visible entities matching filter.
   */
  findAllVisible(
    entity: EntityImpl,
    world: World,
    filter: EntityFilter
  ): Entity[] {
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
    if (!vision) return [];

    const visibleIds = [
      ...(vision.seenAgents || []),
      ...(vision.seenResources || []),
      ...(vision.seenPlants || []),
    ];
    const results: Entity[] = [];

    for (const entityId of visibleIds) {
      const visibleEntity = world.getEntity(entityId);
      if (!visibleEntity) continue;
      if (filter(visibleEntity)) {
        results.push(visibleEntity);
      }
    }

    return results;
  }

  /**
   * Get remembered location (may be stale!).
   * Returns null if no memory exists for this category.
   *
   * Uses the memories array with metadata to find stored locations.
   * Category format: 'resource:wood' maps to SpatialMemory with metadata.category='resource:wood'
   */
  getRememberedLocation(
    entity: EntityImpl,
    category: string
  ): { x: number; y: number; tick: number } | null {
    const memory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    if (!memory) return null;

    // Find memory with matching category in metadata
    const found = memory.memories.find(
      (m) => m.metadata && (m.metadata as { category?: string }).category === category
    );

    if (found) {
      return { x: found.x, y: found.y, tick: found.createdAt };
    }

    // Also check resource memories for 'resource:X' categories
    if (category.startsWith('resource:')) {
      const resourceType = category.slice(9); // Remove 'resource:' prefix
      const resourceMemories = memory.queryResourceLocations(resourceType);
      if (resourceMemories.length > 0) {
        const best = resourceMemories[0];
        if (best) {
          return { x: best.position.x, y: best.position.y, tick: best.tick };
        }
      }
    }

    return null;
  }

  /**
   * Remember a location for future reference.
   *
   * Stores the location in the memories array with metadata.category set.
   * For 'resource:X' categories, also uses recordResourceLocation for compatibility.
   */
  rememberLocation(
    entity: EntityImpl,
    category: string,
    position: { x: number; y: number },
    tick: number
  ): void {
    const memory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    if (!memory) return;

    // For resource categories, use the dedicated resource location API
    if (category.startsWith('resource:')) {
      const resourceType = category.slice(9); // Remove 'resource:' prefix
      memory.recordResourceLocation(resourceType, position, tick);
      return;
    }

    // For other categories, store in memories array with metadata
    // First, remove any existing memory with this category
    const existingIndex = memory.memories.findIndex(
      (m) => m.metadata && (m.metadata as { category?: string }).category === category
    );
    if (existingIndex >= 0) {
      memory.memories.splice(existingIndex, 1);
    }

    // Add new memory with category metadata
    memory.memories.push({
      type: 'knowledge', // Using 'knowledge' type for generic location memories
      x: position.x,
      y: position.y,
      strength: 100,
      createdAt: tick,
      lastReinforced: tick,
      metadata: { category },
    });

    // Trim if over limit
    if (memory.memories.length > memory.maxMemories) {
      memory.memories.sort((a, b) => a.strength - b.strength);
      memory.memories.shift();
    }
  }

  /**
   * Forget a remembered location.
   *
   * Removes the memory with matching category from the memories array.
   * Note: Resource memories stored via recordResourceLocation cannot be selectively forgotten.
   */
  forgetLocation(entity: EntityImpl, category: string): void {
    const memory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    if (!memory) return;

    // Find and remove memory with matching category
    const existingIndex = memory.memories.findIndex(
      (m) => m.metadata && (m.metadata as { category?: string }).category === category
    );
    if (existingIndex >= 0) {
      memory.memories.splice(existingIndex, 1);
    }
  }

  /**
   * Combined targeting: Try visible first, fall back to memory.
   * This is the main targeting method that respects perception limits.
   *
   * Returns:
   * - 'visible': Found a target the agent can currently see
   * - 'remembered': Agent remembers a location but can't currently see a target there
   * - 'unknown': No visible or remembered targets - agent should explore
   */
  findTarget(
    entity: EntityImpl,
    world: World,
    options: TargetingOptions
  ): TargetResult {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return { type: 'unknown' };

    // First: Try to find visible target
    const visible = this.findNearestVisible(entity, world, options.filter, {
      maxDistance: options.maxDistance,
      minDistance: options.minDistance,
    });

    if (visible) {
      const targetPos = (visible as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
      const dist = targetPos ? this.distance(position, targetPos) : 0;

      // Remember this location for future reference
      if (options.memoryCategory) {
        this.rememberLocation(
          entity,
          options.memoryCategory,
          targetPos!,
          world.tick
        );
      }

      return { type: 'visible', entity: visible, distance: dist };
    }

    // Second: Try remembered location
    if (options.memoryCategory) {
      const remembered = this.getRememberedLocation(entity, options.memoryCategory);
      if (remembered) {
        // Check if within max distance
        const dist = this.distance(position, remembered);
        if (!options.maxDistance || dist <= options.maxDistance) {
          return {
            type: 'remembered',
            position: { x: remembered.x, y: remembered.y },
            tick: remembered.tick,
            category: options.memoryCategory,
          };
        }
      }
    }

    // Third: No known targets - need to explore
    return { type: 'unknown' };
  }

  /**
   * Check if a remembered location is stale (old).
   */
  isMemoryStale(
    entity: EntityImpl,
    category: string,
    currentTick: number,
    maxAge: number
  ): boolean {
    const remembered = this.getRememberedLocation(entity, category);
    if (!remembered) return true;

    return (currentTick - remembered.tick) > maxAge;
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
// Functional API - Standalone functions for simpler usage
// ============================================================================

const targetingAPI = new TargetingAPI();

/**
 * Find nearest visible entity matching filter.
 */
export function findNearestVisible(
  entity: Entity,
  world: World,
  filter: EntityFilter,
  options?: { maxDistance?: number; minDistance?: number }
): Entity | null {
  return targetingAPI.findNearestVisible(entity as EntityImpl, world, filter, options);
}

/**
 * Find all visible entities matching filter.
 */
export function findAllVisible(
  entity: Entity,
  world: World,
  filter: EntityFilter
): Entity[] {
  return targetingAPI.findAllVisible(entity as EntityImpl, world, filter);
}

/**
 * Get remembered location for a category.
 */
export function getRememberedLocation(
  entity: Entity,
  category: string
): { x: number; y: number; tick: number } | null {
  return targetingAPI.getRememberedLocation(entity as EntityImpl, category);
}

/**
 * Remember a location for future reference.
 */
export function rememberLocation(
  entity: Entity,
  category: string,
  position: { x: number; y: number },
  tick: number
): void {
  targetingAPI.rememberLocation(entity as EntityImpl, category, position, tick);
}

/**
 * Forget a remembered location.
 */
export function forgetLocation(entity: Entity, category: string): void {
  targetingAPI.forgetLocation(entity as EntityImpl, category);
}

/**
 * Find target using perception-limited targeting.
 */
export function findTarget(
  entity: Entity,
  world: World,
  options: TargetingOptions
): TargetResult {
  return targetingAPI.findTarget(entity as EntityImpl, world, options);
}

/**
 * Check if memory is stale.
 */
export function isMemoryStale(
  entity: Entity,
  category: string,
  currentTick: number,
  maxAge: number
): boolean {
  return targetingAPI.isMemoryStale(entity as EntityImpl, category, currentTick, maxAge);
}

// ============================================================================
// Utility Functions - Common filter patterns
// ============================================================================

/**
 * Create a filter for entities with a specific component.
 */
export function hasComponent(componentType: string): EntityFilter {
  return (entity: Entity) => {
    const impl = entity as EntityImpl;
    return impl.hasComponent(componentType);
  };
}

/**
 * Create a filter for resource entities of a specific type.
 */
export function isResourceType(resourceType: string): EntityFilter {
  return (entity: Entity) => {
    const resource = getResource(entity);
    return resource !== null && resource.resourceType === resourceType && resource.amount > 0;
  };
}

/**
 * Create a filter for harvestable resources.
 */
export function isHarvestableResource(): EntityFilter {
  return (entity: Entity) => {
    const resource = getResource(entity);
    return resource !== null && resource.harvestable && resource.amount > 0;
  };
}

/**
 * Create a filter for buildings of a specific type.
 */
export function isBuildingType(buildingType: string): EntityFilter {
  return (entity: Entity) => {
    const building = getBuilding(entity);
    return building !== null && building.buildingType === buildingType;
  };
}

/**
 * Create a filter for agents (not self).
 */
export function isOtherAgent(selfId: string): EntityFilter {
  return (entity: Entity) => {
    if (entity.id === selfId) return false;
    const impl = entity as EntityImpl;
    return impl.hasComponent(ComponentType.Agent);
  };
}

// ============================================================================
// Extensible Plant/Food Classification
// ============================================================================

/**
 * Plant classification registry for extensibility.
 * Add new plant species here instead of hardcoding in filters.
 */
export interface PlantClassification {
  speciesId: string;
  isEdible: boolean;
  producesFruit: boolean;
  producesSeeds: boolean;
}

const plantRegistry = new Map<string, PlantClassification>();

/**
 * Register a plant species classification.
 * Use this to add new edible plants instead of hardcoding species lists.
 *
 * @example
 * registerPlantSpecies({
 *   speciesId: 'apple-tree',
 *   isEdible: true,
 *   producesFruit: true,
 *   producesSeeds: true,
 * });
 */
export function registerPlantSpecies(classification: PlantClassification): void {
  plantRegistry.set(classification.speciesId, classification);
}

/**
 * Get plant classification by species ID.
 */
export function getPlantClassification(speciesId: string): PlantClassification | undefined {
  return plantRegistry.get(speciesId);
}

/**
 * Check if a plant species is edible.
 */
export function isEdibleSpecies(speciesId: string): boolean {
  const classification = plantRegistry.get(speciesId);
  return classification?.isEdible ?? false;
}

// Default plant classifications - can be extended by game code
registerPlantSpecies({ speciesId: 'blueberry-bush', isEdible: true, producesFruit: true, producesSeeds: true });
registerPlantSpecies({ speciesId: 'raspberry-bush', isEdible: true, producesFruit: true, producesSeeds: true });
registerPlantSpecies({ speciesId: 'blackberry-bush', isEdible: true, producesFruit: true, producesSeeds: true });
registerPlantSpecies({ speciesId: 'wheat', isEdible: true, producesFruit: true, producesSeeds: true });
registerPlantSpecies({ speciesId: 'carrot', isEdible: true, producesFruit: true, producesSeeds: true });
registerPlantSpecies({ speciesId: 'oak-tree', isEdible: false, producesFruit: false, producesSeeds: true });
registerPlantSpecies({ speciesId: 'pine-tree', isEdible: false, producesFruit: false, producesSeeds: true });

/**
 * Create a filter for edible plants using the registry.
 * Extensible: register new species with registerPlantSpecies().
 */
export function isEdiblePlant(): EntityFilter {
  return (entity: Entity) => {
    const plant = getPlant(entity);
    if (!plant) return false;

    // Use registry instead of hardcoded list
    const classification = plantRegistry.get(plant.speciesId);
    if (!classification || !classification.isEdible) return false;

    // Must have fruit to eat
    return plant.fruitCount > 0;
  };
}

/**
 * Create a filter for plants that produce seeds.
 */
export function hasSeedsToGather(): EntityFilter {
  return (entity: Entity) => {
    const plant = getPlant(entity);
    if (!plant) return false;

    const classification = plantRegistry.get(plant.speciesId);
    if (!classification || !classification.producesSeeds) return false;

    return plant.seedsProduced > 0;
  };
}

/**
 * Create a filter for plants of specific species.
 */
export function isPlantSpecies(...speciesIds: string[]): EntityFilter {
  const speciesSet = new Set(speciesIds);
  return (entity: Entity) => {
    const plant = getPlant(entity);
    return plant !== null && speciesSet.has(plant.speciesId);
  };
}

/**
 * Create a combined filter using logical AND.
 */
export function combineFilters(...filters: EntityFilter[]): EntityFilter {
  return (entity: Entity) => filters.every((f) => f(entity));
}

/**
 * Create a combined filter using logical OR.
 */
export function anyFilter(...filters: EntityFilter[]): EntityFilter {
  return (entity: Entity) => filters.some((f) => f(entity));
}
