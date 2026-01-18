/**
 * PlantTargeting - Find plants for food, seeds, and harvesting
 *
 * This class provides perception-limited plant targeting for agents.
 * Supports finding edible plants, plants with seeds, and harvestable crops.
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import {  type TargetResult,
  rememberLocation,
  getRememberedLocation,
  forgetLocation,
  isEdibleSpecies,
  getPlantClassification,
} from '../services/TargetingAPI.js';

/**
 * Options for plant targeting
 */
export interface PlantTargetingOptions {
  /** Only find plants with edible fruit */
  hasFood?: boolean;
  /** Only find plants with seeds to gather */
  hasSeeds?: boolean;
  /** Filter by specific species (e.g., 'blueberry-bush', 'wheat') */
  speciesId?: string;
  /** Maximum distance to search */
  maxDistance?: number;
  /** Entity IDs to exclude */
  excludeIds?: Set<string>;
  /** Only find fully grown plants */
  fullyGrown?: boolean;
}

/**
 * Plant target result
 */
export interface PlantTarget {
  entity: Entity;
  speciesId: string;
  fruitCount: number;
  seedsProduced: number;
  growthStage: number;
  distance: number;
  position: { x: number; y: number };
  isEdible: boolean;
}

/**
 * PlantTargeting Class
 *
 * Usage:
 * ```typescript
 * const targeting = new PlantTargeting();
 *
 * // Find food
 * const food = targeting.findNearest(entity, world, { hasFood: true });
 *
 * // Find seeds
 * const seeds = targeting.findNearest(entity, world, { hasSeeds: true });
 *
 * // Find specific species
 * const berries = targeting.findNearest(entity, world, { speciesId: 'blueberry-bush' });
 * ```
 */
export class PlantTargeting {
  /**
   * Find the nearest visible plant matching criteria.
   */
  findNearest(
    entity: EntityImpl,
    world: World,
    options: PlantTargetingOptions = {}
  ): PlantTarget | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);

    if (!position || !vision) return null;

    const seenPlants = vision.seenPlants || [];
    let nearest: PlantTarget | null = null;
    let nearestDist = Infinity;

    for (const plantId of seenPlants) {
      if (options.excludeIds?.has(plantId)) continue;

      const plantEntity = world.getEntity(plantId);
      if (!plantEntity) continue;

      const impl = plantEntity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(ComponentType.Plant);
      const plantPos = impl.getComponent<PositionComponent>(ComponentType.Position);

      if (!plant || !plantPos) continue;

      // Check species filter
      if (options.speciesId && plant.speciesId !== options.speciesId) continue;

      // Check fully grown filter
      if (options.fullyGrown && plant.growthStage < 1.0) continue;

      // Check for food
      if (options.hasFood) {
        const edible = isEdibleSpecies(plant.speciesId);
        if (!edible || plant.fruitCount <= 0) continue;
      }

      // Check for seeds
      if (options.hasSeeds) {
        const classification = getPlantClassification(plant.speciesId);
        if (!classification?.producesSeeds || plant.seedsProduced <= 0) continue;
      }

      // Calculate distance
      const dist = this.distance(position, plantPos);

      // Check max distance
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      // Track nearest
      if (dist < nearestDist) {
        nearest = {
          entity: plantEntity,
          speciesId: plant.speciesId,
          fruitCount: plant.fruitCount || 0,
          seedsProduced: plant.seedsProduced || 0,
          growthStage: plant.growthStage || 0,
          distance: dist,
          position: { x: plantPos.x, y: plantPos.y },
          isEdible: isEdibleSpecies(plant.speciesId),
        };
        nearestDist = dist;
      }
    }

    // Remember location if found
    if (nearest) {
      const category = options.hasFood
        ? 'plant:food'
        : options.hasSeeds
          ? 'plant:seeds'
          : `plant:${nearest.speciesId}`;
      rememberLocation(entity, category, nearest.position, world.tick);
    }

    return nearest;
  }

  /**
   * Find all visible plants matching criteria.
   */
  findAll(
    entity: EntityImpl,
    world: World,
    options: PlantTargetingOptions = {}
  ): PlantTarget[] {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);

    if (!position || !vision) return [];

    const seenPlants = vision.seenPlants || [];
    const results: PlantTarget[] = [];

    for (const plantId of seenPlants) {
      if (options.excludeIds?.has(plantId)) continue;

      const plantEntity = world.getEntity(plantId);
      if (!plantEntity) continue;

      const impl = plantEntity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(ComponentType.Plant);
      const plantPos = impl.getComponent<PositionComponent>(ComponentType.Position);

      if (!plant || !plantPos) continue;

      if (options.speciesId && plant.speciesId !== options.speciesId) continue;
      if (options.fullyGrown && plant.growthStage < 1.0) continue;

      if (options.hasFood) {
        const edible = isEdibleSpecies(plant.speciesId);
        if (!edible || plant.fruitCount <= 0) continue;
      }

      if (options.hasSeeds) {
        const classification = getPlantClassification(plant.speciesId);
        if (!classification?.producesSeeds || plant.seedsProduced <= 0) continue;
      }

      const dist = this.distance(position, plantPos);
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      results.push({
        entity: plantEntity,
        speciesId: plant.speciesId,
        fruitCount: plant.fruitCount || 0,
        seedsProduced: plant.seedsProduced || 0,
        growthStage: plant.growthStage || 0,
        distance: dist,
        position: { x: plantPos.x, y: plantPos.y },
        isEdible: isEdibleSpecies(plant.speciesId),
      });
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Find nearest edible plant (convenience method).
   */
  findNearestEdible(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): PlantTarget | null {
    return this.findNearest(entity, world, {
      hasFood: true,
      maxDistance,
    });
  }

  /**
   * Find nearest plant with seeds (convenience method).
   */
  findNearestWithSeeds(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): PlantTarget | null {
    return this.findNearest(entity, world, {
      hasSeeds: true,
      maxDistance,
    });
  }

  /**
   * Get remembered plant location.
   */
  getRemembered(
    entity: EntityImpl,
    category: 'food' | 'seeds' | string,
    maxAge?: number,
    currentTick?: number
  ): { x: number; y: number; tick: number } | null {
    const memoryCategory =
      category === 'food' ? 'plant:food' : category === 'seeds' ? 'plant:seeds' : `plant:${category}`;

    const remembered = getRememberedLocation(entity, memoryCategory);

    if (!remembered) return null;

    if (maxAge !== undefined && currentTick !== undefined) {
      if (currentTick - remembered.tick > maxAge) {
        return null;
      }
    }

    return remembered;
  }

  /**
   * Forget remembered plant location.
   */
  forgetRemembered(entity: EntityImpl, category: 'food' | 'seeds' | string): void {
    const memoryCategory =
      category === 'food' ? 'plant:food' : category === 'seeds' ? 'plant:seeds' : `plant:${category}`;
    forgetLocation(entity, memoryCategory);
  }

  /**
   * Combined targeting: Find visible plant or fall back to memory.
   */
  findTarget(
    entity: EntityImpl,
    world: World,
    options: PlantTargetingOptions = {}
  ): TargetResult {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return { type: 'unknown' };

    // First: Try to find visible plant
    const visible = this.findNearest(entity, world, options);
    if (visible) {
      return {
        type: 'visible',
        entity: visible.entity,
        distance: visible.distance,
      };
    }

    // Second: Try remembered location
    const memoryCategory = options.hasFood
      ? 'food'
      : options.hasSeeds
        ? 'seeds'
        : options.speciesId || ComponentType.Plant;

    const remembered = this.getRemembered(entity, memoryCategory);
    if (remembered) {
      const dist = this.distance(position, remembered);
      if (!options.maxDistance || dist <= options.maxDistance) {
        return {
          type: 'remembered',
          position: { x: remembered.x, y: remembered.y },
          tick: remembered.tick,
          category: `plant:${memoryCategory}`,
        };
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

const plantTargeting = new PlantTargeting();

/**
 * Find nearest visible plant.
 */
export function findNearestPlant(
  entity: Entity,
  world: World,
  options?: PlantTargetingOptions
): PlantTarget | null {
  return plantTargeting.findNearest(entity as EntityImpl, world, options);
}

/**
 * Find all visible plants.
 */
export function findAllPlants(
  entity: Entity,
  world: World,
  options?: PlantTargetingOptions
): PlantTarget[] {
  return plantTargeting.findAll(entity as EntityImpl, world, options);
}

/**
 * Find nearest edible plant.
 */
export function findNearestEdiblePlant(
  entity: Entity,
  world: World,
  maxDistance?: number
): PlantTarget | null {
  return plantTargeting.findNearestEdible(entity as EntityImpl, world, maxDistance);
}

/**
 * Find nearest plant with seeds.
 */
export function findNearestPlantWithSeeds(
  entity: Entity,
  world: World,
  maxDistance?: number
): PlantTarget | null {
  return plantTargeting.findNearestWithSeeds(entity as EntityImpl, world, maxDistance);
}

/**
 * Find plant target (visible or remembered).
 */
export function findPlantTarget(
  entity: Entity,
  world: World,
  options?: PlantTargetingOptions
): TargetResult {
  return plantTargeting.findTarget(entity as EntityImpl, world, options);
}
