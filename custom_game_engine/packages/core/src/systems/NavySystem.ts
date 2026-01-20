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
   * Navy explicitly tracks armadaIds and reserveFleetIds in assets.
   * Only counts ships/crew from linked armadas and reserve fleets.
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

    // Gather stats from armadas explicitly linked to this navy
    for (const armadaId of navy.assets.armadaIds) {
      const armadaEntity = this.armadaCache.get(armadaId);
      if (!armadaEntity) {
        // Armada missing - emit warning event
        world.eventBus.emit({
          type: 'navy:armada_missing',
          source: navyEntity.id,
          data: {
            navyId: navy.navyId,
            missingArmadaId: armadaId,
          },
        });
        continue;
      }

      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      armadaCount++;
      stats.totalShips += armada.fleets.totalShips;
      stats.totalCrew += armada.fleets.totalCrew;
      stats.totalStrength += armada.strength.effectiveCombatPower;
    }

    // Gather stats from reserve fleets (fleets not assigned to any armada)
    for (const fleetId of navy.assets.reserveFleetIds) {
      const fleetEntity = this.fleetCache.get(fleetId);
      if (!fleetEntity) {
        // Reserve fleet missing - could have been assigned to armada or destroyed
        continue;
      }

      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

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
 * Links an armada to a navy by adding its ID to the navy's armadaIds array.
 * Prevents duplicate additions.
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

  // Verify armada exists
  const armadaEntity = world.query()
    .with(CT.Armada)
    .executeEntities()
    .find(e => {
      const a = e.getComponent<ArmadaComponent>(CT.Armada);
      return a?.armadaId === armadaId;
    });

  if (!armadaEntity) {
    return { success: false, reason: 'Armada not found' };
  }

  // Prevent duplicate additions
  if (navy.assets.armadaIds.includes(armadaId)) {
    return { success: false, reason: 'Armada already in navy' };
  }

  // Add armada to navy
  (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n: NavyComponent) => ({
    ...n,
    assets: {
      ...n.assets,
      armadaIds: [...n.assets.armadaIds, armadaId],
    },
  }));

  // Emit event
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
 * Unlinks an armada from a navy by removing its ID from the navy's armadaIds array.
 * Optionally moves the armada's fleets to navy reserves.
 */
export function removeArmadaFromNavy(
  world: World,
  navyId: string,
  armadaId: string,
  moveFleetToReserves: boolean = true
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

  // Verify armada is in navy
  if (!navy.assets.armadaIds.includes(armadaId)) {
    return { success: false, reason: 'Armada not in navy' };
  }

  // Get armada fleets if we need to move them to reserves
  let fleetsToReserve: string[] = [];
  if (moveFleetToReserves) {
    const armadaEntity = world.query()
      .with(CT.Armada)
      .executeEntities()
      .find(e => {
        const a = e.getComponent<ArmadaComponent>(CT.Armada);
        return a?.armadaId === armadaId;
      });

    if (armadaEntity) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (armada) {
        fleetsToReserve = armada.fleets.fleetIds;
      }
    }
  }

  // Remove armada from navy and add fleets to reserves
  (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n: NavyComponent) => ({
    ...n,
    assets: {
      ...n.assets,
      armadaIds: n.assets.armadaIds.filter((id: string) => id !== armadaId),
      reserveFleetIds: moveFleetToReserves
        ? [...n.assets.reserveFleetIds, ...fleetsToReserve.filter((fid: string) => !n.assets.reserveFleetIds.includes(fid))]
        : n.assets.reserveFleetIds,
    },
  }));

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
 * Adds a fleet to the navy's reserve pool by adding its ID to the reserveFleetIds array.
 * Prevents duplicate additions.
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

  // Verify fleet exists
  const fleetEntity = world.query()
    .with(CT.Fleet)
    .executeEntities()
    .find(e => {
      const f = e.getComponent<FleetComponent>(CT.Fleet);
      return f?.fleetId === fleetId;
    });

  if (!fleetEntity) {
    return { success: false, reason: 'Fleet not found' };
  }

  // Prevent duplicate additions
  if (navy.assets.reserveFleetIds.includes(fleetId)) {
    return { success: false, reason: 'Fleet already in reserves' };
  }

  // Add fleet to reserves
  (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n: NavyComponent) => ({
    ...n,
    assets: {
      ...n.assets,
      reserveFleetIds: [...n.assets.reserveFleetIds, fleetId],
    },
  }));

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
