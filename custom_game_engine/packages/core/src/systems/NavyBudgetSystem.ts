/**
 * NavyBudgetSystem - Manages navy annual budget cycle
 *
 * This system handles:
 * - Navy annual budget processing
 * - Budget allocation (construction, maintenance, personnel, R&D)
 * - Shipyard production (ships under construction → active)
 * - Under-funding consequences (ships degrade, morale drops)
 * - Economic tracking
 *
 * Priority: 850 (economic phase, after combat)
 *
 * Per spec (line 1038-1080):
 * - Annual budget cycle
 * - Budget allocation: construction, maintenance, personnel, R&D
 * - Under-funded maintenance = ship degradation
 * - Under-funded personnel = morale crisis/mutiny
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export interface BudgetAllocation {
  newConstruction: number; // 0-1
  maintenance: number;     // 0-1
  personnel: number;       // 0-1
  R_D: number;            // 0-1
  reserves: number;        // 0-1
}

export interface NavyBudgetReport {
  navyId: string;
  totalBudget: number;
  spent: {
    construction: number;
    maintenance: number;
    personnel: number;
    R_D: number;
  };
  shipsBuilt: number;
  shipsMaintained: number;
  crewPaid: number;
  warnings: string[];
}

// ============================================================================
// System
// ============================================================================

export class NavyBudgetSystem extends BaseSystem {
  public readonly id: SystemId = 'navy_budget' as SystemId;
  public readonly priority: number = 850;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Navy];
  public readonly activationComponents = ['navy'] as const;
  public readonly metadata = {
    category: 'economy',
    description: 'Manages navy annual budget cycle and shipyard production',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.Navy, CT.Fleet] as const,
  } as const;

  protected readonly throttleInterval = 6000; // Every 5 minutes at 20 TPS (annual cycle)

  // ========================================================================
  // State
  // ========================================================================

  private lastBudgetProcessTick: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each navy
    for (const navyEntity of ctx.activeEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Check if annual budget cycle is due
      const lastProcess = this.lastBudgetProcessTick.get(navy.navyId) || 0;
      const timeSinceLastProcess = tick - lastProcess;

      // Annual budget = every 6000 ticks (5 minutes at 20 TPS)
      if (timeSinceLastProcess >= this.throttleInterval) {
        this.processNavyBudget(ctx.world, navyEntity as EntityImpl, tick);
        this.lastBudgetProcessTick.set(navy.navyId, tick);
      }
    }
  }

  // ========================================================================
  // Budget Processing
  // ========================================================================

  /**
   * Process navy budget for a year
   *
   * Per spec (line 1042-1080):
   * - Allocate budget across categories
   * - Build new ships
   * - Maintain existing ships
   * - Pay crew
   * - Fund R&D
   */
  private processNavyBudget(world: World, navyEntity: EntityImpl, tick: number): void {
    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return;

    const budget = navy.budget;
    const warnings: string[] = [];

    // Budget allocation (from doctrine profile)
    const allocation: BudgetAllocation = {
      newConstruction: navy.doctrineProfile.offense * 0.5, // Offensive = more construction
      maintenance: navy.doctrineProfile.defense * 0.4,     // Defensive = more maintenance
      personnel: navy.doctrineProfile.logistics * 0.3,     // Logistics = crew support
      R_D: 0.1, // Fixed 10% R&D
      reserves: 0.1, // Fixed 10% reserves
    };

    // Normalize allocation to sum to 1.0
    const total = allocation.newConstruction + allocation.maintenance + allocation.personnel + allocation.R_D + allocation.reserves;
    allocation.newConstruction /= total;
    allocation.maintenance /= total;
    allocation.personnel /= total;
    allocation.R_D /= total;
    allocation.reserves /= total;

    // ========================================================================
    // 1. New Construction
    // ========================================================================

    const constructionBudget = budget * allocation.newConstruction;
    const shipsBuilt = this.processConstruction(world, navyEntity, constructionBudget);

    // ========================================================================
    // 2. Maintenance
    // ========================================================================

    const maintenanceBudget = budget * allocation.maintenance;
    const shipsMaintained = this.processMaintenance(world, navyEntity, maintenanceBudget, warnings);

    // ========================================================================
    // 3. Personnel
    // ========================================================================

    const personnelBudget = budget * allocation.personnel;
    const crewPaid = this.processPersonnel(world, navyEntity, personnelBudget, warnings);

    // ========================================================================
    // 4. R&D (placeholder - not implemented yet)
    // ========================================================================

    const rdBudget = budget * allocation.R_D;
    // TODO: Research projects (spec line 1073-1079)

    // ========================================================================
    // Update Navy Component
    // ========================================================================

    const totalSpent = constructionBudget + maintenanceBudget + personnelBudget + rdBudget;

    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      economy: {
        ...n.economy,
        budgetSpent: totalSpent,
      },
    }));

    // ========================================================================
    // Emit Budget Processed Event
    // ========================================================================

    world.eventBus.emit({
      type: 'navy:budget_processed',
      source: navyEntity.id,
      data: {
        navyId: navy.navyId,
        budget,
        spent: {
          construction: constructionBudget,
          maintenance: maintenanceBudget,
          personnel: personnelBudget,
          R_D: rdBudget,
        },
        shipsBuilt,
        shipsMaintained,
        crewPaid,
        warnings,
      },
    });

    // Budget exceeded warning
    if (totalSpent > budget) {
      world.eventBus.emit({
        type: 'navy:budget_exceeded',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          budgetSpent: totalSpent,
          budget,
          overspend: totalSpent - budget,
        },
      });
    }
  }

  // ========================================================================
  // Construction
  // ========================================================================

  /**
   * Process new ship construction
   *
   * Per spec (line 1047-1049):
   * - Allocate construction budget
   * - Build ships based on shipyard capacity
   */
  private processConstruction(
    world: World,
    navyEntity: EntityImpl,
    constructionBudget: number
  ): number {
    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return 0;

    // Ship cost (simplified - based on ship type)
    // TODO: Use proper ship costs from SpaceshipComponent configs
    const avgShipCost = 10000; // Placeholder

    const shipsAffordable = Math.floor(constructionBudget / avgShipCost);
    const shipsBuilt = Math.min(shipsAffordable, 10); // Max 10 ships per year

    if (shipsBuilt > 0) {
      // Update navy ship count
      navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
        ...n,
        totalShips: n.totalShips + shipsBuilt,
      }));

      // Emit event
      world.eventBus.emit({
        type: 'navy:ship_constructed',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          shipsBuilt,
          constructionBudget,
        },
      });
    }

    return shipsBuilt;
  }

  // ========================================================================
  // Maintenance
  // ========================================================================

  /**
   * Process ship maintenance
   *
   * Per spec (line 1051-1059):
   * - Calculate ships that can be maintained
   * - Ships that can't be maintained degrade
   */
  private processMaintenance(
    world: World,
    navyEntity: EntityImpl,
    maintenanceBudget: number,
    warnings: string[]
  ): number {
    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return 0;

    const maintenanceCostPerShip = navy.economy.maintenanceCost;
    const shipsCanMaintain = Math.floor(maintenanceBudget / maintenanceCostPerShip);

    if (shipsCanMaintain < navy.totalShips) {
      // Under-funded! Ships degrade
      const degradedShips = navy.totalShips - shipsCanMaintain;
      warnings.push(`Cannot maintain ${degradedShips} ships - hull integrity degrading`);

      // Emit maintenance crisis event
      world.eventBus.emit({
        type: 'navy:maintenance_crisis',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          totalShips: navy.totalShips,
          shipsCanMaintain,
          degradedShips,
        },
      });

      // TODO: Actually degrade ship hull integrity (requires iterating fleets)
    }

    return shipsCanMaintain;
  }

  // ========================================================================
  // Personnel
  // ========================================================================

  /**
   * Process crew salaries
   *
   * Per spec (line 1061-1070):
   * - Calculate crew that can be paid
   * - Unpaid crew = morale crisis/mutiny
   */
  private processPersonnel(
    world: World,
    navyEntity: EntityImpl,
    personnelBudget: number,
    warnings: string[]
  ): number {
    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return 0;

    const personnelCostPerCrew = 10; // Placeholder
    const crewCanPay = Math.floor(personnelBudget / personnelCostPerCrew);

    if (crewCanPay < navy.totalCrew) {
      // Morale crisis (unpaid sailors)
      const unpaidCrew = navy.totalCrew - crewCanPay;
      warnings.push(`Cannot pay ${unpaidCrew} crew - morale plummeting`);

      // Emit morale crisis event (could trigger mutiny events)
      world.eventBus.emit({
        type: 'navy:personnel_crisis',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          totalCrew: navy.totalCrew,
          crewCanPay,
          unpaidCrew,
        },
      });

      // TODO: Reduce fleet morale (requires iterating fleets)
    }

    return crewCanPay;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate ship construction cost based on ship type
 */
export function getShipCost(shipType: SpaceshipType): number {
  // Based on ship mass from SpaceshipComponent configs
  const costs: Record<SpaceshipType, number> = {
    worldship: 1000000,
    courier_ship: 1000,
    threshold_ship: 10000,
    brainship: 5000,
    story_ship: 20000,
    gleisner_vessel: 5000,
    svetz_retrieval: 8000,
    probability_scout: 500,
    timeline_merger: 50000,
  };

  return costs[shipType] || 10000;
}

/**
 * Calculate optimal budget allocation for navy based on strategic posture
 */
export function calculateBudgetAllocation(
  strategicPosture: 'defensive' | 'offensive' | 'balanced'
): BudgetAllocation {
  switch (strategicPosture) {
    case 'offensive':
      return {
        newConstruction: 0.5, // 50% on building new ships
        maintenance: 0.2,
        personnel: 0.2,
        R_D: 0.05,
        reserves: 0.05,
      };

    case 'defensive':
      return {
        newConstruction: 0.2,
        maintenance: 0.4, // 40% on keeping existing ships operational
        personnel: 0.25,
        R_D: 0.1,
        reserves: 0.05,
      };

    case 'balanced':
    default:
      return {
        newConstruction: 0.3,
        maintenance: 0.3,
        personnel: 0.25,
        R_D: 0.1,
        reserves: 0.05,
      };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: NavyBudgetSystem | null = null;

export function getNavyBudgetSystem(): NavyBudgetSystem {
  if (!systemInstance) {
    systemInstance = new NavyBudgetSystem();
  }
  return systemInstance;
}
