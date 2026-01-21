/**
 * ShipyardProductionSystem - Manages shipyard ship construction queue and production
 *
 * This system handles:
 * - Construction queue management (ships being built)
 * - Production capacity allocation
 * - Resource requirement checking
 * - Budget allocation from navy construction budget
 * - Ship completion and fleet integration
 *
 * Priority: 170 (after NavyBudgetSystem at 850, before fleet operations)
 *
 * Production Capacity Model:
 * - Each shipyard has annual capacity points (e.g., 10 points/year)
 * - Ships cost different capacity points based on type:
 *   - courier_ship: 0.5 points (can build 20/year)
 *   - threshold_ship: 1.0 points (can build 10/year)
 *   - story_ship: 2.0 points (can build 5/year)
 *   - brainship: 3.0 points (can build 3/year)
 *   - capital ships: 10.0 points (can build 1/year)
 *
 * Resource Requirements (from SpaceflightItems.ts):
 * - courier_ship: hull_plating × 50, basic_circuit × 20, stellarite_plate × 10
 * - threshold_ship: reinforced_hull × 100, advanced_circuit × 50, stellarite_ingot × 50
 * - brainship: neural_interface × 10, life_support_module × 20, resonance_core × 5
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';
import { createSpaceshipComponent } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export interface ShipConstructionProject {
  projectId: string;
  shipType: SpaceshipType;
  shipName: string;
  progress: number; // 0-100%
  requiredCapacity: number; // Capacity points
  budgetAllocated: number; // Currency allocated
  budgetRequired: number; // Total cost
  resourcesRequired: Map<string, number>; // Resource ID → quantity
  resourcesAllocated: Map<string, number>; // Resource ID → quantity allocated
  estimatedCompletionTick: number; // When project will complete
  startedTick: number;
}

export interface ShipProductionCapacity {
  totalAnnualCapacity: number; // Total capacity points per year
  usedCapacity: number; // Currently allocated capacity
  remainingCapacity: number; // Available for new projects
}

// Ship construction costs (capacity points and base budget)
const SHIP_CAPACITY_COSTS: Record<SpaceshipType, number> = {
  worldship: 50.0, // Massive project
  courier_ship: 0.5,
  threshold_ship: 1.0,
  story_ship: 2.0,
  brainship: 3.0,
  gleisner_vessel: 2.5,
  svetz_retrieval: 3.5,
  probability_scout: 1.5,
  timeline_merger: 10.0,
};

// Budget costs (from NavyBudgetSystem getShipCost)
const SHIP_BUDGET_COSTS: Record<SpaceshipType, number> = {
  worldship: 10000000, // 1M mass × 10
  courier_ship: 100, // 10 mass × 10
  threshold_ship: 10000, // 1000 mass × 10
  brainship: 5000, // 500 mass × 10
  story_ship: 20000, // 2000 mass × 10
  gleisner_vessel: 5000, // 500 mass × 10
  svetz_retrieval: 8000, // 800 mass × 10
  probability_scout: 500, // 50 mass × 10
  timeline_merger: 50000, // 5000 mass × 10
};

// Resource requirements (simplified - in real game, load from spaceflight.json craftedFrom)
const SHIP_RESOURCE_REQUIREMENTS: Record<SpaceshipType, Record<string, number>> = {
  courier_ship: {
    hull_plating: 50,
    basic_circuit: 20,
    stellarite_plate: 10,
    propulsion_unit: 5,
    navigation_array: 2,
  },
  threshold_ship: {
    reinforced_hull: 100,
    advanced_circuit: 50,
    stellarite_ingot: 50,
    propulsion_unit: 15,
    navigation_array: 5,
    power_core: 10,
  },
  brainship: {
    neural_interface: 10,
    life_support_module: 20,
    resonance_core: 5,
    reinforced_hull: 80,
    advanced_circuit: 40,
    stellarite_plate: 30,
  },
  story_ship: {
    reinforced_hull: 150,
    emotion_theater_system: 5,
    memory_hall_archive: 3,
    advanced_circuit: 60,
    stellarite_ingot: 40,
    power_core: 12,
  },
  gleisner_vessel: {
    gleisner_body_frame: 15,
    quantum_processor: 25,
    advanced_circuit: 50,
    hull_plating: 60,
    stellarite_plate: 25,
  },
  svetz_retrieval: {
    svetz_retrieval_engine: 5,
    temporal_regulator: 20,
    timeline_anchor: 3,
    reinforced_hull: 100,
    advanced_circuit: 45,
  },
  probability_scout: {
    probability_drive: 3,
    observation_nullifier: 5,
    hull_plating: 30,
    basic_circuit: 15,
    stellarite_plate: 8,
  },
  timeline_merger: {
    timeline_merger_core: 2,
    coherence_crystal: 10,
    reality_thread: 15,
    reinforced_hull: 200,
    quantum_processor: 50,
    power_core: 25,
  },
  worldship: {
    worldship_hull_kit: 1,
    reinforced_hull: 500,
    life_support_module: 100,
    power_core: 50,
    advanced_circuit: 200,
    stellarite_ingot: 150,
  },
};

// ============================================================================
// System
// ============================================================================

export class ShipyardProductionSystem extends BaseSystem {
  public readonly id: SystemId = 'shipyard_production' as SystemId;
  public readonly priority: number = 170;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Navy];
  public readonly activationComponents = ['navy'] as const;
  public readonly metadata = {
    category: 'economy',
    description: 'Manages shipyard construction queue and ship production',
    dependsOn: ['navy_budget' as SystemId],
    writesComponents: [CT.Navy, CT.Spaceship] as const,
  } as const;

  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  // ========================================================================
  // State
  // ========================================================================

  // Track active construction projects per navy
  private constructionQueue: Map<string, ShipConstructionProject[]> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each navy's shipyard production
    for (const navyEntity of ctx.activeEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Process construction queue
      this.processConstructionQueue(ctx.world, navyEntity as EntityImpl, navy, tick);
    }
  }

  // ========================================================================
  // Construction Queue Processing
  // ========================================================================

  /**
   * Process all ships in construction queue
   *
   * Each tick (throttled to 100 ticks = 5s):
   * 1. Allocate budget from navy's newConstruction budget
   * 2. Check resource availability
   * 3. Increment progress based on capacity
   * 4. Complete ships at 100% progress
   * 5. Create SpaceshipComponent entities for completed ships
   */
  private processConstructionQueue(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    tick: number
  ): void {
    const navyId = navy.navyId;
    const queue = this.constructionQueue.get(navyId) || [];

    if (queue.length === 0) {
      // No ships under construction
      return;
    }

    const capacity = this.calculateProductionCapacity(navy, queue);
    const completedProjects: ShipConstructionProject[] = [];

    // Process each project in queue
    for (const project of queue) {
      if (project.progress >= 100) {
        completedProjects.push(project);
        continue;
      }

      // Check if resources are available
      const resourcesAvailable = this.checkResourceAvailability(world, navy, project);

      if (!resourcesAvailable) {
        // Delay construction - emit warning
        world.eventBus.emit({
          type: 'shipyard:construction_delayed',
          source: navyEntity.id,
          data: {
            navyId,
            projectId: project.projectId,
            shipType: project.shipType,
            shipName: project.shipName,
            reason: 'insufficient_resources',
            missingResources: this.getMissingResources(project),
          },
        });
        continue;
      }

      // Allocate budget (prorated for throttle interval)
      const budgetNeeded = project.budgetRequired - project.budgetAllocated;
      const budgetPerTick = budgetNeeded / (project.estimatedCompletionTick - tick);
      project.budgetAllocated += budgetPerTick * this.throttleInterval;

      // Increment progress based on capacity and time
      // Progress rate = capacity points / total project time
      const progressRate = (project.requiredCapacity / capacity.totalAnnualCapacity) * 100;
      const ticksPerYear = 6000; // At 20 TPS, 6000 ticks = 5 minutes = 1 year
      const progressPerTick = progressRate / ticksPerYear;
      project.progress = Math.min(100, project.progress + progressPerTick * this.throttleInterval);

      // Check for completion
      if (project.progress >= 100) {
        completedProjects.push(project);
      }
    }

    // Complete ships
    for (const completed of completedProjects) {
      this.completeShipConstruction(world, navyEntity, navy, completed, tick);
    }

    // Update queue
    this.constructionQueue.set(
      navyId,
      queue.filter((p) => !completedProjects.includes(p))
    );

    // Update navy component with underConstruction count
    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      assets: {
        ...n.assets,
        underConstruction: queue.length - completedProjects.length,
      },
    }));
  }

  // ========================================================================
  // Production Capacity
  // ========================================================================

  /**
   * Calculate shipyard production capacity
   *
   * Returns total annual capacity and current allocation
   */
  private calculateProductionCapacity(
    navy: NavyComponent,
    queue: ShipConstructionProject[]
  ): ShipProductionCapacity {
    const totalAnnualCapacity = navy.economy.shipyardCapacity;
    const usedCapacity = queue.reduce((sum, p) => sum + p.requiredCapacity, 0);
    const remainingCapacity = Math.max(0, totalAnnualCapacity - usedCapacity);

    return {
      totalAnnualCapacity,
      usedCapacity,
      remainingCapacity,
    };
  }

  /**
   * Calculate shipyard efficiency based on budget, resources, and workforce
   *
   * Efficiency affects construction speed:
   * - Budget adequacy: 40%
   * - Resource availability: 30%
   * - Workforce quality: 30%
   */
  private calculateShipyardEfficiency(
    navy: NavyComponent,
    project: ShipConstructionProject
  ): number {
    // Budget factor: How well-funded is this project?
    const budgetFactor = Math.min(1, project.budgetAllocated / project.budgetRequired);

    // Resource factor: Do we have all needed resources?
    const resourceFactor = 1.0; // Simplified for now, would check actual stockpiles

    // Workforce factor: Based on navy doctrine (officer academy and NCO training quality)
    const workforceFactor = (navy.doctrine.officerAcademyQuality + navy.doctrine.NCOTraining) / 2;

    // Weighted average
    const efficiency =
      budgetFactor * 0.4 + resourceFactor * 0.3 + workforceFactor * 0.3;

    return Math.max(0.1, Math.min(1.0, efficiency)); // Clamp to 10%-100%
  }

  // ========================================================================
  // Resource Management
  // ========================================================================

  /**
   * Check if resources are available for construction
   *
   * Queries the faction's warehouse to verify resource availability
   */
  private checkResourceAvailability(
    world: World,
    navy: NavyComponent,
    project: ShipConstructionProject
  ): boolean {
    // Look up the faction entity that owns this navy
    const factionEntity = world.getEntity(navy.factionId);
    if (!factionEntity) {
      // No faction found - assume resources are available (graceful fallback)
      return true;
    }

    // Check for warehouse on the faction entity
    const warehouse = factionEntity.getComponent('warehouse') as {
      stockpiles?: Record<string, number>;
      inventory?: Record<string, number>;
    } | undefined;

    if (!warehouse) {
      // No warehouse component - try to find a warehouse entity linked to this faction
      const warehouseEntities = world.query().with(CT.Warehouse).executeEntities();
      for (const whEntity of warehouseEntities) {
        const wh = whEntity.getComponent('warehouse') as {
          stockpiles?: Record<string, number>;
          inventory?: Record<string, number>;
          factionId?: string;
          ownerEntityId?: string;
        } | undefined;

        if (wh && (wh.factionId === navy.factionId || wh.ownerEntityId === navy.factionId)) {
          return this.verifyResourcesInWarehouse(wh, project);
        }
      }

      // No warehouse found - assume resources are available
      return true;
    }

    return this.verifyResourcesInWarehouse(warehouse, project);
  }

  /**
   * Verify a warehouse has sufficient resources for the project
   */
  private verifyResourcesInWarehouse(
    warehouse: { stockpiles?: Record<string, number>; inventory?: Record<string, number> },
    project: ShipConstructionProject
  ): boolean {
    const stockpiles = warehouse.stockpiles ?? warehouse.inventory ?? {};

    // Check each required resource
    for (const [resourceId, required] of project.resourcesRequired.entries()) {
      const allocated = project.resourcesAllocated.get(resourceId) ?? 0;
      const stillNeeded = required - allocated;

      if (stillNeeded > 0) {
        const available = stockpiles[resourceId] ?? 0;
        if (available < stillNeeded) {
          return false; // Insufficient resources
        }
      }
    }

    return true;
  }

  /**
   * Calculate resource needs for a ship type
   */
  private calculateResourceNeeds(shipType: SpaceshipType): Map<string, number> {
    const requirements = SHIP_RESOURCE_REQUIREMENTS[shipType] || {};
    return new Map(Object.entries(requirements));
  }

  /**
   * Get list of missing resources for a project
   */
  private getMissingResources(project: ShipConstructionProject): string[] {
    const missing: string[] = [];

    for (const [resourceId, required] of project.resourcesRequired.entries()) {
      const allocated = project.resourcesAllocated.get(resourceId) || 0;
      if (allocated < required) {
        missing.push(`${resourceId} (${required - allocated} needed)`);
      }
    }

    return missing;
  }

  // ========================================================================
  // Ship Completion
  // ========================================================================

  /**
   * Complete ship construction
   *
   * Creates SpaceshipComponent entity and adds to navy
   */
  private completeShipConstruction(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    project: ShipConstructionProject,
    tick: number
  ): void {
    // Create spaceship entity
    const spaceshipComponent = createSpaceshipComponent(project.shipType, project.shipName);
    const spaceshipEntity = world.createEntity() as EntityImpl;
    spaceshipEntity.addComponent(spaceshipComponent);

    // Update navy ship count
    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      assets: {
        ...n.assets,
        totalShips: n.assets.totalShips + 1,
        shipTypeBreakdown: {
          ...n.assets.shipTypeBreakdown,
          [project.shipType]: (n.assets.shipTypeBreakdown[project.shipType] || 0) + 1,
        },
      },
    }));

    // Emit construction completed event
    world.eventBus.emit({
      type: 'shipyard:construction_completed',
      source: navyEntity.id,
      data: {
        navyId: navy.navyId,
        projectId: project.projectId,
        shipId: spaceshipEntity.id,
        shipType: project.shipType,
        shipName: project.shipName,
        constructionTime: tick - project.startedTick,
        budgetSpent: project.budgetAllocated,
      },
    });
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Queue new ship for construction
   *
   * Called by navy commanders or automated budget allocation
   */
  public queueShipConstruction(
    world: World,
    navyId: string,
    shipType: SpaceshipType,
    shipName: string,
    tick: number
  ): { success: boolean; reason?: string; projectId?: string } {
    const navyEntity = world
      .query()
      .with(CT.Navy)
      .executeEntities()
      .find((e) => {
        const n = e.getComponent<NavyComponent>(CT.Navy);
        return n?.navyId === navyId;
      });

    if (!navyEntity) {
      return { success: false, reason: 'Navy not found' };
    }

    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) {
      return { success: false, reason: 'Invalid navy component' };
    }

    const queue = this.constructionQueue.get(navyId) || [];
    const capacity = this.calculateProductionCapacity(navy, queue);

    const requiredCapacity = SHIP_CAPACITY_COSTS[shipType] || 1.0;
    const budgetRequired = SHIP_BUDGET_COSTS[shipType] || 10000;

    // Check capacity
    if (capacity.remainingCapacity < requiredCapacity) {
      return {
        success: false,
        reason: `Insufficient shipyard capacity (need ${requiredCapacity}, have ${capacity.remainingCapacity})`,
      };
    }

    // Create project
    const projectId = `ship_project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const project: ShipConstructionProject = {
      projectId,
      shipType,
      shipName,
      progress: 0,
      requiredCapacity,
      budgetAllocated: 0,
      budgetRequired,
      resourcesRequired: this.calculateResourceNeeds(shipType),
      resourcesAllocated: new Map(),
      estimatedCompletionTick: tick + (6000 / capacity.totalAnnualCapacity) * requiredCapacity,
      startedTick: tick,
    };

    queue.push(project);
    this.constructionQueue.set(navyId, queue);

    // Emit construction started event
    world.eventBus.emit({
      type: 'shipyard:construction_started',
      source: navyEntity.id,
      data: {
        navyId,
        projectId,
        shipType,
        shipName,
        requiredCapacity,
        budgetRequired,
        estimatedCompletionTick: project.estimatedCompletionTick,
      },
    });

    return { success: true, projectId };
  }

  /**
   * Get construction queue for a navy
   */
  public getConstructionQueue(navyId: string): ShipConstructionProject[] {
    return this.constructionQueue.get(navyId) || [];
  }

  /**
   * Cancel ship construction
   */
  public cancelConstruction(
    world: World,
    navyId: string,
    projectId: string
  ): { success: boolean; reason?: string } {
    const queue = this.constructionQueue.get(navyId);
    if (!queue) {
      return { success: false, reason: 'No construction queue found' };
    }

    const projectIndex = queue.findIndex((p) => p.projectId === projectId);
    if (projectIndex === -1) {
      return { success: false, reason: 'Project not found' };
    }

    const project = queue[projectIndex];
    if (!project) {
      return { success: false, reason: 'Project not found in queue' };
    }

    queue.splice(projectIndex, 1);
    this.constructionQueue.set(navyId, queue);

    // Emit cancellation event
    world.eventBus.emit({
      type: 'shipyard:construction_cancelled',
      source: navyId,
      data: {
        navyId,
        projectId,
        shipType: project.shipType,
        shipName: project.shipName,
        progress: project.progress,
        budgetRefund: project.budgetAllocated * 0.5, // 50% refund
      },
    });

    return { success: true };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: ShipyardProductionSystem | null = null;

export function getShipyardProductionSystem(): ShipyardProductionSystem {
  if (!systemInstance) {
    systemInstance = new ShipyardProductionSystem();
  }
  return systemInstance;
}
