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
import type { SquadronComponent } from '../components/SquadronComponent.js';
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

    const budget = navy.economy.annualBudget;
    const warnings: string[] = [];

    // Budget allocation (from doctrine and strategic posture)
    const baseAllocation = navy.economy.budgetAllocation;
    const allocation: BudgetAllocation = {
      newConstruction: baseAllocation.newConstruction,
      maintenance: baseAllocation.maintenance,
      personnel: baseAllocation.personnel,
      R_D: baseAllocation.researchAndDevelopment,
      reserves: baseAllocation.reserves,
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
    // 4. R&D (Research & Development)
    // ========================================================================

    const rdBudget = budget * allocation.R_D;
    this.processResearchAndDevelopment(world, navyEntity, rdBudget);

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

    // Calculate average ship cost based on navy's preferred ship types
    // If no preferred types, use default mix
    const preferredTypes = navy.doctrine.preferredShipTypes.length > 0
      ? navy.doctrine.preferredShipTypes
      : (['threshold_ship', 'courier_ship', 'brainship'] as SpaceshipType[]);

    const avgShipCost = preferredTypes.reduce((sum, type) => sum + getShipCost(type), 0) / preferredTypes.length;

    const shipsAffordable = Math.floor(constructionBudget / avgShipCost);
    const shipsBuilt = Math.min(shipsAffordable, navy.economy.shipyardCapacity); // Limited by shipyard capacity

    if (shipsBuilt > 0) {
      // Update navy ship count
      navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
        ...n,
        assets: {
          ...n.assets,
          totalShips: n.assets.totalShips + shipsBuilt,
        },
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

    if (shipsCanMaintain < navy.assets.totalShips) {
      // Under-funded! Ships degrade
      const degradedShips = navy.assets.totalShips - shipsCanMaintain;
      warnings.push(`Cannot maintain ${degradedShips} ships - hull integrity degrading`);

      // Emit maintenance crisis event
      world.eventBus.emit({
        type: 'navy:maintenance_crisis',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          totalShips: navy.assets.totalShips,
          shipsCanMaintain,
          degradedShips,
        },
      });

      // Degrade ship hull integrity
      this.degradeShipHulls(world, navy.navyId, degradedShips);
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

    const personnelCostPerCrew = navy.economy.personnelCost;
    const crewCanPay = Math.floor(personnelBudget / personnelCostPerCrew);

    if (crewCanPay < navy.assets.totalCrew) {
      // Morale crisis (unpaid sailors)
      const unpaidCrew = navy.assets.totalCrew - crewCanPay;
      warnings.push(`Cannot pay ${unpaidCrew} crew - morale plummeting`);

      // Emit morale crisis event (could trigger mutiny events)
      world.eventBus.emit({
        type: 'navy:personnel_crisis',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          totalCrew: navy.assets.totalCrew,
          crewCanPay,
          unpaidCrew,
        },
      });

      // Reduce fleet morale
      this.reduceFleetMorale(world, navy.navyId, unpaidCrew, navy.assets.totalCrew);
    }

    return crewCanPay;
  }

  // ========================================================================
  // Research & Development
  // ========================================================================

  /**
   * Process R&D budget allocation
   *
   * Per spec (line 1073-1079):
   * - Allocate R&D budget to research projects
   * - Advance β-space research (coherence, decoherence, observation)
   * - Progress ship type research projects
   */
  private processResearchAndDevelopment(
    world: World,
    navyEntity: EntityImpl,
    rdBudget: number
  ): void {
    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return;

    // Split R&D budget: 50% β-space research, 50% ship research
    const betaSpaceBudget = rdBudget * 0.5;
    const shipResearchBudget = rdBudget * 0.5;

    // β-space research progress (1000 budget = 0.01 progress per category)
    const betaSpaceProgress = betaSpaceBudget / 100000;

    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      technology: {
        ...n.technology,
        betaSpaceResearch: {
          coherenceThresholdReduction:
            n.technology.betaSpaceResearch.coherenceThresholdReduction + betaSpaceProgress * 0.4,
          decoherenceRateMitigation:
            n.technology.betaSpaceResearch.decoherenceRateMitigation + betaSpaceProgress * 0.3,
          observationPrecisionImprovement:
            n.technology.betaSpaceResearch.observationPrecisionImprovement + betaSpaceProgress * 0.3,
        },
      },
    }));

    // Ship research projects
    if (navy.technology.researchProjects.length > 0) {
      const budgetPerProject = shipResearchBudget / navy.technology.researchProjects.length;

      navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
        ...n,
        technology: {
          ...n.technology,
          researchProjects: n.technology.researchProjects.map((project) => {
            const progressIncrease = Math.min(budgetPerProject / project.cost, 1.0 - project.progress);
            return {
              ...project,
              progress: project.progress + progressIncrease,
            };
          }),
        },
      }));
    }

    // Emit R&D progress event
    world.eventBus.emit({
      type: 'navy:research_progress',
      source: navyEntity.id,
      data: {
        navyId: navy.navyId,
        rdBudget,
        betaSpaceProgress,
        activeProjects: navy.technology.researchProjects.length,
      },
    });
  }

  // ========================================================================
  // Fleet Effects
  // ========================================================================

  /**
   * Degrade ship hull integrity for under-maintained ships
   *
   * Finds all fleets belonging to this navy and degrades their ships
   */
  private degradeShipHulls(world: World, navyId: string, degradedShipCount: number): void {
    // Query all fleets (they don't have navy reference, so we check all)
    const fleetEntities = world.query().with(CT.Fleet).executeEntities();

    let shipsProcessed = 0;
    const degradationPerShip = 0.1; // 10% hull integrity loss

    for (const fleetEntity of fleetEntities) {
      if (shipsProcessed >= degradedShipCount) break;

      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // Query squadrons in this fleet
      const squadronEntities = world
        .query()
        .with(CT.Squadron)
        .executeEntities()
        .filter((e) => {
          const squadron = e.getComponent<SquadronComponent>(CT.Squadron);
          return squadron && fleet.squadrons.squadronIds.includes(squadron.squadronId);
        });

      for (const squadronEntity of squadronEntities) {
        if (shipsProcessed >= degradedShipCount) break;

        const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
        if (!squadron) continue;

        // Update squadron hull integrity tracking
        const currentHullIntegrity = squadron.combat.avgHullIntegrity;
        const newHullIntegrity = Math.max(0, currentHullIntegrity - degradationPerShip);

        (squadronEntity as EntityImpl).updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
          ...s,
          combat: {
            ...s.combat,
            avgHullIntegrity: newHullIntegrity,
          },
        }));

        shipsProcessed += squadron.ships.shipIds.length;
      }
    }
  }

  /**
   * Reduce fleet morale due to unpaid crew
   *
   * Finds all fleets and reduces their readiness based on unpaid crew percentage
   */
  private reduceFleetMorale(
    world: World,
    navyId: string,
    unpaidCrew: number,
    totalCrew: number
  ): void {
    const fleetEntities = world.query().with(CT.Fleet).executeEntities();

    const unpaidPercentage = unpaidCrew / totalCrew;
    const moraleReduction = unpaidPercentage * 0.5; // Up to 50% readiness loss

    for (const fleetEntity of fleetEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // Reduce fleet readiness
      (fleetEntity as EntityImpl).updateComponent<FleetComponent>(CT.Fleet, (f) => ({
        ...f,
        status: {
          ...f.status,
          readiness: Math.max(0, f.status.readiness - moraleReduction),
        },
      }));

      // Emit morale event for each affected fleet
      world.eventBus.emit({
        type: 'fleet:morale_decreased',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          navyId,
          unpaidPercentage,
          moraleReduction,
          newReadiness: Math.max(0, fleet.status.readiness - moraleReduction),
        },
      });
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate ship construction cost based on ship type
 *
 * Cost is derived from ship mass with a multiplier (1 mass unit = 10 currency)
 * Larger ships are more expensive, reflecting construction complexity
 */
export function getShipCost(shipType: SpaceshipType): number {
  // Mass-based costs from SpaceshipComponent getShipTypeConfig
  // Cost = mass * 10 (base cost per mass unit)
  const massToCostMultiplier = 10;

  const massValues: Record<SpaceshipType, number> = {
    worldship: 1000000,        // Massive generation ship
    courier_ship: 10,          // Tiny 2-person ship
    threshold_ship: 1000,      // Medium ship
    brainship: 500,            // Medium ship with ship-brain
    story_ship: 2000,          // Large narrative ship
    gleisner_vessel: 500,      // Medium digital ship
    svetz_retrieval: 800,      // Medium-large temporal ship
    probability_scout: 50,     // Small solo scout
    timeline_merger: 5000,     // Very large crew ship
  };

  const mass = massValues[shipType] || 1000;
  return mass * massToCostMultiplier;
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
