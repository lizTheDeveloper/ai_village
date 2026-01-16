/**
 * SystemHelpers.ts
 *
 * Reusable System base classes that make performance patterns opt-out instead of opt-in.
 * These classes encapsulate common system optimization patterns to reduce boilerplate.
 *
 * @module ecs/SystemHelpers
 */

import type { System, SystemMetadata } from './System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { Entity } from './Entity.js';
import type { World } from './World.js';

/**
 * Base class for systems that don't need to run every tick.
 * Automatically handles tick-based throttling to reduce CPU usage.
 *
 * Benefits:
 * - Reduces system execution frequency for slow-changing state
 * - Improves overall game performance by skipping unnecessary updates
 * - Eliminates throttling boilerplate in system implementations
 *
 * Common use cases:
 * - Weather updates (every 5 seconds)
 * - Auto-save (every 5 minutes)
 * - Memory consolidation (every 50 seconds)
 * - Slow environmental changes
 *
 * @example
 * class WeatherSystem extends ThrottledSystem {
 *   readonly id = 'weather';
 *   readonly priority = 5;
 *   readonly requiredComponents = [CT.Weather];
 *   readonly throttleInterval = 100; // Every 5 seconds (100 ticks at 20 TPS)
 *
 *   protected updateThrottled(world: World, entities: Entity[], deltaTime: number): void {
 *     // This only runs every 100 ticks
 *     for (const entity of entities) {
 *       // Update weather state
 *     }
 *   }
 * }
 *
 * @example
 * class AutoSaveSystem extends ThrottledSystem {
 *   readonly id = 'auto_save';
 *   readonly priority = 999;
 *   readonly requiredComponents = [];
 *   readonly throttleInterval = 6000; // Every 5 minutes (6000 ticks)
 *
 *   protected updateThrottled(world: World, entities: Entity[], deltaTime: number): void {
 *     // Auto-save logic
 *     saveLoadService.save(world, { name: 'auto_save' });
 *   }
 * }
 */
export abstract class ThrottledSystem implements System {
  abstract readonly id: SystemId;
  abstract readonly priority: number;
  abstract readonly requiredComponents: ReadonlyArray<ComponentType>;

  /**
   * Number of ticks between system updates.
   * At 20 TPS:
   * - 20 ticks = 1 second
   * - 100 ticks = 5 seconds
   * - 1000 ticks = 50 seconds
   * - 6000 ticks = 5 minutes
   */
  abstract readonly throttleInterval: number;

  readonly metadata?: SystemMetadata;

  private lastUpdate = 0;

  /**
   * Standard update method - handles throttling automatically.
   * Do not override this method. Override updateThrottled instead.
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (world.tick - this.lastUpdate < this.throttleInterval) {
      return;
    }
    this.lastUpdate = world.tick;
    this.updateThrottled(world, entities, deltaTime);
  }

  /**
   * Throttled update logic - called only when throttle interval has elapsed.
   * Override this method to implement your system's logic.
   *
   * @param world - The game world
   * @param entities - Entities matching requiredComponents
   * @param deltaTime - Time since last frame (in seconds)
   */
  protected abstract updateThrottled(
    world: World,
    entities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void;
}

/**
 * Base class for systems that should only process active/visible entities.
 * Automatically filters entities through SimulationScheduler.
 *
 * Benefits:
 * - Reduces entity processing from 4000+ to ~50-100 visible entities
 * - 97% reduction in processed entities for typical scenes
 * - Dwarf Fortress-style entity culling
 * - No performance cost for off-screen entities
 *
 * SimulationScheduler modes:
 * - ALWAYS: Agents, buildings (always simulated)
 * - PROXIMITY: Plants, wild animals (only when on-screen)
 * - PASSIVE: Resources (zero per-tick cost)
 *
 * Common use cases:
 * - Plant growth (only update visible plants)
 * - Animal AI (only process visible animals)
 * - Visual effects (only for on-screen entities)
 * - Non-critical gameplay systems
 *
 * @example
 * class PlantGrowthSystem extends FilteredSystem {
 *   readonly id = 'plant_growth';
 *   readonly priority = 50;
 *   readonly requiredComponents = [CT.Plant, CT.Position];
 *
 *   protected updateFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
 *     // activeEntities only contains visible/active plants
 *     // Instead of processing all 2000 plants, we process only ~30 visible ones
 *     for (const entity of activeEntities) {
 *       const plant = entity.getComponent(CT.Plant);
 *       // Update growth state
 *     }
 *   }
 * }
 *
 * @example
 * class AnimalAISystem extends FilteredSystem {
 *   readonly id = 'animal_ai';
 *   readonly priority = 60;
 *   readonly requiredComponents = [CT.Animal, CT.Position];
 *
 *   protected updateFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
 *     // Only process animals near the camera
 *     for (const entity of activeEntities) {
 *       // Run AI behavior
 *     }
 *   }
 * }
 */
export abstract class FilteredSystem implements System {
  abstract readonly id: SystemId;
  abstract readonly priority: number;
  abstract readonly requiredComponents: ReadonlyArray<ComponentType>;

  readonly metadata?: SystemMetadata;

  /**
   * Standard update method - handles entity filtering automatically.
   * Do not override this method. Override updateFiltered instead.
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);
    this.updateFiltered(world, activeEntities, deltaTime);
  }

  /**
   * Filtered update logic - called with only active/visible entities.
   * Override this method to implement your system's logic.
   *
   * @param world - The game world
   * @param activeEntities - Only entities that are active/visible (filtered by SimulationScheduler)
   * @param deltaTime - Time since last frame (in seconds)
   */
  protected abstract updateFiltered(
    world: World,
    activeEntities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void;
}

/**
 * Base class combining throttling AND entity filtering.
 * Use for systems that process many entities but don't need every-tick updates.
 *
 * Benefits:
 * - Combines both throttling and entity filtering optimizations
 * - Ideal for non-critical systems with many entities
 * - Maximum performance savings
 * - Example: 4000 entities -> throttle to every 20 ticks -> filter to 50 visible = 99.8% reduction
 *
 * Common use cases:
 * - Animal behavior (update every second, only visible animals)
 * - Plant diseases (update every 5 seconds, only visible plants)
 * - Environmental effects (periodic updates, only on-screen)
 * - Non-agent AI systems
 *
 * @example
 * class AnimalBehaviorSystem extends ThrottledFilteredSystem {
 *   readonly id = 'animal_behavior';
 *   readonly priority = 60;
 *   readonly requiredComponents = [CT.Animal, CT.Position];
 *   readonly throttleInterval = 20; // Every second
 *
 *   protected updateThrottledFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
 *     // Runs every 20 ticks, only for visible animals
 *     // Instead of 4000 animals * 20 TPS = 80,000 updates/sec
 *     // We get ~50 animals * 1 update/sec = 50 updates/sec
 *     for (const entity of activeEntities) {
 *       // Run animal behavior
 *     }
 *   }
 * }
 *
 * @example
 * class PlantDiseaseSystem extends ThrottledFilteredSystem {
 *   readonly id = 'plant_disease';
 *   readonly priority = 55;
 *   readonly requiredComponents = [CT.Plant, CT.Position];
 *   readonly throttleInterval = 100; // Every 5 seconds
 *
 *   protected updateThrottledFiltered(world: World, activeEntities: Entity[], deltaTime: number): void {
 *     // Update disease spread only for visible plants, every 5 seconds
 *     for (const entity of activeEntities) {
 *       // Disease simulation
 *     }
 *   }
 * }
 */
export abstract class ThrottledFilteredSystem implements System {
  abstract readonly id: SystemId;
  abstract readonly priority: number;
  abstract readonly requiredComponents: ReadonlyArray<ComponentType>;

  /**
   * Number of ticks between system updates.
   * At 20 TPS:
   * - 20 ticks = 1 second
   * - 100 ticks = 5 seconds
   * - 1000 ticks = 50 seconds
   * - 6000 ticks = 5 minutes
   */
  abstract readonly throttleInterval: number;

  readonly metadata?: SystemMetadata;

  private lastUpdate = 0;

  /**
   * Standard update method - handles throttling and filtering automatically.
   * Do not override this method. Override updateThrottledFiltered instead.
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // First check throttle
    if (world.tick - this.lastUpdate < this.throttleInterval) {
      return;
    }
    this.lastUpdate = world.tick;

    // Then filter active entities
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);
    this.updateThrottledFiltered(world, activeEntities, deltaTime);
  }

  /**
   * Throttled and filtered update logic.
   * Called only when:
   * 1. Throttle interval has elapsed
   * 2. With only active/visible entities
   *
   * Override this method to implement your system's logic.
   *
   * @param world - The game world
   * @param activeEntities - Only entities that are active/visible (filtered by SimulationScheduler)
   * @param deltaTime - Time since last frame (in seconds)
   */
  protected abstract updateThrottledFiltered(
    world: World,
    activeEntities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void;
}
