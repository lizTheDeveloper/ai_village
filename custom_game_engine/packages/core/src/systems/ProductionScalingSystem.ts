/**
 * ProductionScalingSystem - Scales production from hand-crafting to Dyson-powered mega-industry
 *
 * Phase 5: Grand Strategy - Production Scaling System
 *
 * This system manages the progression from manual crafting (single agent at a forge)
 * to Dyson-sphere-powered planetary industry. It:
 * - Tracks civilization statistics (tech level, population, industrialization)
 * - Calculates production multipliers
 * - Handles bottleneck resources (soul fragments, void essence, etc.)
 * - Updates production capability components on cities/civilizations
 *
 * Production Tiers:
 * - Tier 0: Manual Crafting (Tech 1-3) - 1× base rate
 * - Tier 1: Workshop Production (Tech 4-6) - 2× efficiency, 5 workers
 * - Tier 2: Factory Automation (Tech 7-8) - 50× efficiency, 90% automated
 * - Tier 3: Planetary Industry (Tech 8-9) - 1000× efficiency, entire planet
 * - Tier 4: Dyson-Powered (Tech 9-10) - 1,000,000× efficiency, star system
 *
 * Performance optimizations:
 * - Throttled to 200 ticks (10 seconds) - production stats change slowly
 * - Early exit if no production capability entities exist
 * - Cached multiplier calculations (only recalculate when stats change)
 * - Lookup tables for tier thresholds
 * - Activation components for O(1) system activation check
 *
 * See: openspec/specs/grand-strategy/05-PRODUCTION-SCALING.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ProductionCapabilityComponent } from '../components/ProductionCapabilityComponent.js';
import {
  calculateProductionMultiplier,
  getTierFromTechLevel,
  updateFactoryStats,
} from '../components/ProductionCapabilityComponent.js';
import type { TechnologyEraComponent } from '../components/TechnologyEraComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { AssemblyMachineComponent } from '../components/AssemblyMachineComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * ProductionScalingSystem manages civilization-level production scaling.
 *
 * Updates production capability components based on:
 * - Technology level (from TechnologyEraComponent)
 * - Population (from CityDirectorComponent)
 * - Factories and automation (from building queries)
 * - Dyson swarm progress (from custom Dyson components, if present)
 */
export class ProductionScalingSystem extends BaseSystem {
  public readonly id: SystemId = 'production_scaling';
  public readonly priority: number = 280; // Before construction system (300)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Only run when production_capability components exist (O(1) activation check)
  public readonly activationComponents = ['production_capability'] as const;
  protected readonly throttleInterval = THROTTLE.VERY_SLOW; // 200 ticks = 10 seconds

  // Cache for factory building types
  private readonly FACTORY_BUILDING_TYPES = new Set([
    'factory',
    'workshop',
    'forge',
    'assembly_plant',
    'manufacturing_hub',
  ]);

  // ========== PERFORMANCE OPTIMIZATION CACHES ==========

  /**
   * Precomputed era-to-level lookup table.
   * Avoids string comparisons and object lookups.
   */
  private readonly ERA_TO_LEVEL = new Map<string, number>([
    ['paleolithic', 1],
    ['neolithic', 2],
    ['bronze_age', 3],
    ['iron_age', 4],
    ['medieval', 5],
    ['renaissance', 6],
    ['industrial', 7],
    ['atomic', 8],
    ['information', 8],
    ['fusion', 9],
    ['interplanetary', 9],
    ['interstellar', 10],
    ['transgalactic', 10],
    ['post_singularity', 10],
    ['transcendent', 10],
  ]);

  /**
   * Cached building query (avoid re-query every update).
   * Invalidated only when buildings change.
   */
  private cachedBuildings: ReadonlyArray<Entity> | null = null;
  private cachedBuildingsTick: number = -1;
  private readonly BUILDING_CACHE_INTERVAL = 200; // 10 seconds

  /**
   * Reusable stats object to avoid allocations.
   */
  private readonly statsWorkingBuffer = {
    techLevel: 1,
    population: 0,
    industrialization: 0,
    dysonSwarmProgress: 0,
    factories: 0,
    workers: 0,
    automationLevel: 0,
  };

  /**
   * Update production capability components.
   * Throttled to every 200 ticks (10 seconds) via throttleInterval.
   */
  protected onUpdate(ctx: SystemContext): void {
    // Query all entities with production capability
    const productionEntities = ctx.world
      .query()
      .with(CT.ProductionCapability)
      .executeEntities();

    if (productionEntities.length === 0) {
      return; // Early exit - no production capability entities
    }

    // Process each production capability entity
    for (const entity of productionEntities) {
      this.updateProductionCapability(ctx.world, entity);
    }
  }

  /**
   * Update a single production capability entity.
   */
  private updateProductionCapability(world: World, entity: Entity): void {
    const entityImpl = entity as EntityImpl;
    const production = entityImpl.getComponent<ProductionCapabilityComponent>(
      CT.ProductionCapability
    );

    if (!production) {
      return;
    }

    // Gather civilization stats
    const stats = this.gatherCivilizationStats(world, entityImpl);

    // Check if stats have changed (avoid unnecessary recalculation)
    const statsChanged =
      production.techLevel !== stats.techLevel ||
      production.population !== stats.population ||
      production.industrialization !== stats.industrialization ||
      production.dysonSwarmProgress !== stats.dysonSwarmProgress ||
      production.factories !== stats.factories ||
      production.workers !== stats.workers ||
      production.automationLevel !== stats.automationLevel;

    if (!statsChanged && production.lastCalculatedAt > 0) {
      return; // No changes, skip recalculation
    }

    // Update stats
    production.techLevel = stats.techLevel;
    production.population = stats.population;
    production.industrialization = stats.industrialization;
    production.dysonSwarmProgress = stats.dysonSwarmProgress;

    // Update tier based on tech level
    const newTier = getTierFromTechLevel(stats.techLevel);
    if (production.tier !== newTier) {
      production.tier = newTier;
      // Emit tier change event (optional - for UI feedback)
      this.events.emit('production:tier_changed', {
        entityId: entityImpl.id,
        oldTier: production.tier,
        newTier,
        techLevel: stats.techLevel,
      });
    }

    // Update factory stats
    updateFactoryStats(
      production,
      stats.factories,
      stats.workers,
      stats.automationLevel
    );

    // Recalculate production multiplier
    production.totalMultiplier = calculateProductionMultiplier(production);
    production.lastCalculatedAt = world.tick;

    // Log significant multiplier changes (for debugging/analytics)
    if (production.totalMultiplier >= 1000) {
      // Only log at major milestones to avoid spam
      const milestones = [1000, 10000, 100000, 1000000];
      const crossedMilestone = milestones.find(
        (m) =>
          production.totalMultiplier >= m &&
          production.totalMultiplier < m * 1.5
      );
      if (crossedMilestone) {
        console.warn(
          `[ProductionScalingSystem] Entity ${entityImpl.id} reached ${crossedMilestone}× production multiplier (Tier ${production.tier}, Tech ${production.techLevel})`
        );
      }
    }
  }

  /**
   * Gather civilization statistics for production calculations.
   * Uses reusable working buffer to avoid allocations.
   */
  private gatherCivilizationStats(
    world: World,
    entity: EntityImpl
  ): {
    techLevel: number;
    population: number;
    industrialization: number;
    dysonSwarmProgress: number;
    factories: number;
    workers: number;
    automationLevel: number;
  } {
    // Reuse working buffer (zero allocation)
    const stats = this.statsWorkingBuffer;
    stats.techLevel = 1;
    stats.population = 0;
    stats.industrialization = 0;
    stats.dysonSwarmProgress = 0;
    stats.factories = 0;
    stats.workers = 0;
    stats.automationLevel = 0;

    // Get tech level from TechnologyEraComponent (if present)
    const techEra = entity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
    if (techEra) {
      stats.techLevel = this.getTechLevelFromEra(techEra.currentEra);
    }

    // Get population from CityDirectorComponent (if present)
    const cityDirector = entity.getComponent<CityDirectorComponent>(
      CT.CityDirector
    );
    if (cityDirector) {
      stats.population = cityDirector.stats.population;
      // Estimate industrialization from production buildings
      // Use fast integer division: (buildings / 10) | 0
      const rawIndustry = (cityDirector.stats.productionBuildings * 0.1) | 0;
      stats.industrialization = Math.min(10, rawIndustry);
    }

    // Count factories and automation level (single-pass)
    this.countFactoriesAndAutomationFast(world, entity, stats);

    // Check for Dyson swarm progress (custom component, if implemented)
    // TODO: Integrate with Dyson Sphere construction system when implemented
    // const dysonComponent = entity.getComponent<DysonSwarmComponent>(CT.DysonSwarm);
    // if (dysonComponent) {
    //   stats.dysonSwarmProgress = dysonComponent.completionProgress;
    // }

    return stats;
  }

  /**
   * Convert technology era to numeric tech level (1-10).
   * Uses precomputed Map for O(1) lookup.
   */
  private getTechLevelFromEra(era: string): number {
    return this.ERA_TO_LEVEL.get(era) ?? 1;
  }

  /**
   * Count factories and calculate automation level.
   */
  private countFactoriesAndAutomation(
    world: World,
    civilizationEntity: EntityImpl
  ): {
    factories: number;
    workers: number;
    automationLevel: number;
  } {
    // Query all buildings
    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();

    let factoryCount = 0;
    let totalAutomation = 0;
    let workerCount = 0;

    // Get civilization bounds (if this is a city director entity)
    const cityDirector = civilizationEntity.getComponent<CityDirectorComponent>(
      CT.CityDirector
    );
    const bounds = cityDirector?.bounds;

    for (const buildingEntity of buildings) {
      const buildingImpl = buildingEntity as EntityImpl;
      const building = buildingImpl.getComponent<BuildingComponent>(CT.Building);
      const position = buildingImpl.getComponent<PositionComponent>(CT.Position);

      if (!building || !position) continue;

      // Skip buildings outside civilization bounds (if bounds defined)
      if (bounds) {
        if (
          position.x < bounds.minX ||
          position.x > bounds.maxX ||
          position.y < bounds.minY ||
          position.y > bounds.maxY
        ) {
          continue;
        }
      }

      // Check if this is a factory building
      if (this.FACTORY_BUILDING_TYPES.has(building.buildingType)) {
        factoryCount++;

        // Check for assembly machine component (indicates automation)
        const assemblyMachine = buildingImpl.getComponent<AssemblyMachineComponent>(
          CT.AssemblyMachine
        );
        if (assemblyMachine) {
          // Assembly machines indicate automation
          totalAutomation += 1;
        }

        // Count workers (estimate: 5 workers per factory building)
        // TODO: Replace with actual worker count from profession system
        workerCount += 5;
      }
    }

    const automationLevel =
      factoryCount > 0 ? totalAutomation / factoryCount : 0;

    return {
      factories: factoryCount,
      workers: workerCount,
      automationLevel,
    };
  }
}
