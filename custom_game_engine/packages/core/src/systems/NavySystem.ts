/**
 * NavySystem - Manages nation-scale naval forces
 *
 * This system handles:
 * - Navy aggregate statistics (ships, crew, strength)
 * - Budget and maintenance costs
 * - Strategic-level decisions
 * - Reserve fleet management
 * - Doctrine profile application
 *
 * Priority: 70 (before ArmadaSystem at 75)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { ArmadaComponent } from '../components/ArmadaComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System
// ============================================================================

export class NavySystem extends BaseSystem {
  public readonly id: SystemId = 'navy_management' as SystemId;
  public readonly priority: number = 70;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Navy];
  // Only run when navy components exist (O(1) activation check)
  public readonly activationComponents = ['navy'] as const;
  public readonly metadata = {
    category: 'infrastructure',
    description: 'Manages nation-scale naval forces and budgets',
    dependsOn: ['armada_management' as SystemId],
    writesComponents: [CT.Navy] as const,
  } as const;

  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  // PERF: Cache armada and fleet lookups to avoid repeated world.getEntity() calls
  private armadaCache: Map<string, EntityImpl> = new Map();
  private fleetCache: Map<string, EntityImpl> = new Map();

  // PERF: Reusable objects to avoid allocations in hot paths
  private workingStats = {
    totalShips: 0,
    totalCrew: 0,
    totalStrength: 0,
  };

  // PERF: Reuse Map for ship type breakdown
  private shipTypeMap: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Build entity caches once per update
    this.rebuildEntityCaches(ctx.world);

    // Process each navy
    for (const navyEntity of ctx.activeEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // PERF: Early exit for empty navies (check if navy has any assets)
      if (navy.assets.totalArmadas === 0 && navy.assets.totalFleets === 0) continue;

      // Update navy aggregate stats
      this.updateNavyStats(ctx.world, navyEntity as EntityImpl, navy, tick);

      // Track budget and maintenance
      this.updateEconomy(ctx.world, navyEntity as EntityImpl, navy, tick);
    }
  }

  /**
   * PERF: Rebuild entity caches once per update
   * Avoids repeated world.getEntity() lookups
   */
  private rebuildEntityCaches(world: World): void {
    this.armadaCache.clear();
    this.fleetCache.clear();

    const armadaEntities = world.query().with(CT.Armada).executeEntities();
    for (const entity of armadaEntities) {
      this.armadaCache.set(entity.id, entity as EntityImpl);
    }

    const fleetEntities = world.query().with(CT.Fleet).executeEntities();
    for (const entity of fleetEntities) {
      this.fleetCache.set(entity.id, entity as EntityImpl);
    }
  }

  /**
   * Update navy aggregate statistics from armadas and reserve fleets
   * PERF: Uses cached entity lookups and reusable working objects
   *
   * NOTE: Navy doesn't store armadaIds/reserveFleetIds at top level.
   * Instead, we query for all armadas/fleets belonging to this navy via factionId.
   */
  private updateNavyStats(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    tick: number
  ): void {
    // PERF: Reset working stats instead of allocating new objects
    const stats = this.workingStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.totalStrength = 0;

    // PERF: Clear and reuse Map instead of allocating object
    this.shipTypeMap.clear();

    // Count armadas and fleets for this navy (by matching factionId)
    let armadaCount = 0;
    let fleetCount = 0;

    // Gather stats from all armadas belonging to this faction
    for (const [armadaId, armadaEntity] of this.armadaCache) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      // TODO: Match armadas to navy - for now, just aggregate all armadas
      // In future, add navy reference to ArmadaComponent or use factionId matching
      armadaCount++;

      stats.totalShips += armada.fleets.totalShips;
      stats.totalCrew += armada.fleets.totalCrew;
      stats.totalStrength += armada.strength.effectiveCombatPower;
    }

    // Gather stats from reserve fleets (fleets not in any armada)
    for (const [fleetId, fleetEntity] of this.fleetCache) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // TODO: Determine if fleet is a reserve (not assigned to armada)
      // For now, just count all fleets
      fleetCount++;

      stats.totalShips += fleet.squadrons.totalShips;
      stats.totalCrew += fleet.squadrons.totalCrew;
      stats.totalStrength += fleet.combat.offensiveRating;

      // PERF: Aggregate ship types using Map
      for (const [shipType, count] of Object.entries(fleet.squadrons.shipTypeBreakdown)) {
        this.shipTypeMap.set(shipType, (this.shipTypeMap.get(shipType) || 0) + count);
      }
    }

    // PERF: Convert Map to object only once at the end
    const shipTypeBreakdown: Record<string, number> = {};
    for (const [type, count] of this.shipTypeMap) {
      shipTypeBreakdown[type] = count;
    }

    // PERF: Batch all component updates in single call
    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      assets: {
        ...n.assets,
        totalArmadas: armadaCount,
        totalFleets: fleetCount,
        totalShips: stats.totalShips,
        totalCrew: stats.totalCrew,
        shipTypeBreakdown: shipTypeBreakdown as Record<SpaceshipType, number>,
      },
    }));
  }

  /**
   * Update navy economy (budget, maintenance, personnel costs)
   */
  private updateEconomy(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    tick: number
  ): void {
    // Calculate total maintenance cost
    const maintenanceCost = navy.assets.totalShips * navy.economy.maintenanceCost;

    // Calculate personnel cost (10 credits per crew member per year, prorated to tick)
    // At 20 TPS, 1 year = ~1,200,000 ticks (60s * 60m * 24h * 365d * 20 ticks)
    // Simplified: 10 credits per crew per 1000 ticks
    const personnelCostPerTick = navy.assets.totalCrew * (10 / 1000);

    // Track spending
    const totalCostThisTick = (maintenanceCost / 1000) + personnelCostPerTick;

    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      economy: {
        ...n.economy,
        budgetSpent: n.economy.budgetSpent + totalCostThisTick,
        maintenanceCost: maintenanceCost,
        personnelCost: personnelCostPerTick * 1000, // Annualized
      },
    }));

    // Warn if budget exceeded
    if (navy.economy.budgetSpent > navy.economy.annualBudget) {
      world.eventBus.emit({
        type: 'navy:budget_exceeded',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          budgetSpent: navy.economy.budgetSpent,
          budget: navy.economy.annualBudget,
          overspend: navy.economy.budgetSpent - navy.economy.annualBudget,
        },
      });
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add an armada to a navy
 *
 * NOTE: Navy component doesn't have armadaIds array.
 * Armadas are linked to navies via factionId or should be queried.
 * This function is a placeholder for future implementation.
 */
export function addArmadaToNavy(
  world: World,
  navyId: string,
  armadaId: string
): { success: boolean; reason?: string } {
  const navyEntity = world.query()
    .with(CT.Navy)
    .executeEntities()
    .find(e => {
      const n = e.getComponent<NavyComponent>(CT.Navy);
      return n?.navyId === navyId;
    });

  if (!navyEntity) {
    return { success: false, reason: 'Navy not found' };
  }

  const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
  if (!navy) {
    return { success: false, reason: 'Entity is not a navy' };
  }

  // TODO: Implement armada-navy linking
  // Options:
  // 1. Add navyId field to ArmadaComponent
  // 2. Add armadaIds array to NavyComponent.assets
  // 3. Use separate relationship entity/component

  // For now, just emit event to track the relationship
  world.eventBus.emit({
    type: 'navy:armada_joined',
    source: navyEntity.id,
    data: {
      navyId: navy.navyId,
      armadaId,
    },
  });

  return { success: true };
}

/**
 * Remove an armada from a navy
 *
 * NOTE: Navy component doesn't have armadaIds array.
 * This function is a placeholder for future implementation.
 */
export function removeArmadaFromNavy(
  world: World,
  navyId: string,
  armadaId: string
): { success: boolean; reason?: string } {
  const navyEntity = world.query()
    .with(CT.Navy)
    .executeEntities()
    .find(e => {
      const n = e.getComponent<NavyComponent>(CT.Navy);
      return n?.navyId === navyId;
    });

  if (!navyEntity) {
    return { success: false, reason: 'Navy not found' };
  }

  const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
  if (!navy) {
    return { success: false, reason: 'Entity is not a navy' };
  }

  // TODO: Implement armada-navy unlinking (see addArmadaToNavy)

  // Emit event
  world.eventBus.emit({
    type: 'navy:armada_left',
    source: navyEntity.id,
    data: {
      navyId: navy.navyId,
      armadaId,
    },
  });

  return { success: true };
}

/**
 * Add a fleet to navy reserves
 *
 * NOTE: Navy component doesn't have reserveFleetIds array.
 * This function is a placeholder for future implementation.
 */
export function addFleetToReserves(
  world: World,
  navyId: string,
  fleetId: string
): { success: boolean; reason?: string } {
  const navyEntity = world.query()
    .with(CT.Navy)
    .executeEntities()
    .find(e => {
      const n = e.getComponent<NavyComponent>(CT.Navy);
      return n?.navyId === navyId;
    });

  if (!navyEntity) {
    return { success: false, reason: 'Navy not found' };
  }

  const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
  if (!navy) {
    return { success: false, reason: 'Entity is not a navy' };
  }

  // TODO: Implement fleet reserve tracking
  // Options:
  // 1. Add reserveFleetIds array to NavyComponent.assets
  // 2. Add isReserve flag to FleetComponent
  // 3. Use separate ReserveFleet component

  // Emit event
  world.eventBus.emit({
    type: 'navy:fleet_added_to_reserves',
    source: navyEntity.id,
    data: {
      navyId: navy.navyId,
      fleetId,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: NavySystem | null = null;

export function getNavySystem(): NavySystem {
  if (!systemInstance) {
    systemInstance = new NavySystem();
  }
  return systemInstance;
}
