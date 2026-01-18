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

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each navy
    for (const navyEntity of ctx.activeEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Update navy aggregate stats
      this.updateNavyStats(ctx.world, navyEntity as EntityImpl, navy, tick);

      // Track budget and maintenance
      this.updateEconomy(ctx.world, navyEntity as EntityImpl, navy, tick);
    }
  }

  /**
   * Update navy aggregate statistics from armadas and reserve fleets
   */
  private updateNavyStats(
    world: World,
    navyEntity: EntityImpl,
    navy: NavyComponent,
    tick: number
  ): void {
    let totalShips = 0;
    let totalCrew = 0;
    let totalStrength = 0;
    const shipTypeBreakdown: Record<string, number> = {};

    // Gather stats from all armadas
    for (const armadaId of navy.armadaIds) {
      const armadaEntity = world.getEntity(armadaId);
      if (!armadaEntity) {
        // Armada missing - emit warning
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

      totalShips += armada.totalShips;
      totalCrew += armada.totalCrew;
      totalStrength += armada.armadaStrength;

      // Aggregate ship types
      for (const [shipType, count] of Object.entries(armada.shipTypeBreakdown)) {
        shipTypeBreakdown[shipType] = (shipTypeBreakdown[shipType] || 0) + count;
      }
    }

    // Gather stats from reserve fleets
    for (const fleetId of navy.reserveFleetIds) {
      const fleetEntity = world.getEntity(fleetId);
      if (!fleetEntity) continue;

      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      totalShips += fleet.totalShips;
      totalCrew += fleet.totalCrew;
      totalStrength += fleet.fleetStrength;

      // Aggregate ship types
      for (const [shipType, count] of Object.entries(fleet.shipTypeBreakdown)) {
        shipTypeBreakdown[shipType] = (shipTypeBreakdown[shipType] || 0) + count;
      }
    }

    // Update navy component
    navyEntity.updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      totalShips,
      totalCrew,
      navyStrength: totalStrength,
      shipTypeBreakdown: shipTypeBreakdown as Record<SpaceshipType, number>,
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
    const maintenanceCost = navy.totalShips * navy.economy.maintenanceCost;

    // Calculate personnel cost (10 credits per crew member per year, prorated to tick)
    // At 20 TPS, 1 year = ~1,200,000 ticks (60s * 60m * 24h * 365d * 20 ticks)
    // Simplified: 10 credits per crew per 1000 ticks
    const personnelCostPerTick = navy.totalCrew * (10 / 1000);

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
    if (navy.economy.budgetSpent > navy.budget) {
      world.eventBus.emit({
        type: 'navy:budget_exceeded',
        source: navyEntity.id,
        data: {
          navyId: navy.navyId,
          budgetSpent: navy.economy.budgetSpent,
          budget: navy.budget,
          overspend: navy.economy.budgetSpent - navy.budget,
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

  if (navy.armadaIds.includes(armadaId)) {
    return { success: false, reason: 'Armada already in navy' };
  }

  // Add armada to navy
  const impl = navyEntity as EntityImpl;
  impl.updateComponent<NavyComponent>(CT.Navy, (n) => ({
    ...n,
    armadaIds: [...n.armadaIds, armadaId],
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

  if (!navy.armadaIds.includes(armadaId)) {
    return { success: false, reason: 'Armada not in navy' };
  }

  // Remove armada from navy
  const impl = navyEntity as EntityImpl;
  impl.updateComponent<NavyComponent>(CT.Navy, (n) => ({
    ...n,
    armadaIds: n.armadaIds.filter(id => id !== armadaId),
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

  if (navy.reserveFleetIds.includes(fleetId)) {
    return { success: false, reason: 'Fleet already in reserves' };
  }

  // Add fleet to reserves
  const impl = navyEntity as EntityImpl;
  impl.updateComponent<NavyComponent>(CT.Navy, (n) => ({
    ...n,
    reserveFleetIds: [...n.reserveFleetIds, fleetId],
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
