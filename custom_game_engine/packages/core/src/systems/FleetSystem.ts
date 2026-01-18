/**
 * FleetSystem - Manages strategic fleet groups
 *
 * This system handles:
 * - Fleet aggregate statistics (ships, crew, coherence, strength)
 * - Supply level degradation over time
 * - Squadron joining/leaving fleets
 * - Fleet mission tracking
 *
 * Priority: 80 (before SquadronSystem at 85)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System
// ============================================================================

export class FleetSystem extends BaseSystem {
  public readonly id: SystemId = 'fleet_management' as SystemId;
  public readonly priority: number = 80;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Fleet];
  // Only run when fleet components exist (O(1) activation check)
  public readonly activationComponents = ['fleet'] as const;
  public readonly metadata = {
    category: 'infrastructure',
    description: 'Manages strategic fleet groups and supply',
    dependsOn: [] as const,
    writesComponents: [CT.Fleet] as const,
  } as const;

  protected readonly throttleInterval = 40; // Every 2 seconds at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each fleet
    for (const fleetEntity of ctx.activeEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // Update fleet aggregate stats from squadrons
      this.updateFleetStats(ctx.world, fleetEntity as EntityImpl, fleet, tick);

      // Degrade supply level over time
      this.degradeSupplyLevel(ctx.world, fleetEntity as EntityImpl, fleet, tick);
    }
  }

  /**
   * Update fleet aggregate statistics from member squadrons
   */
  private updateFleetStats(
    world: World,
    fleetEntity: EntityImpl,
    fleet: FleetComponent,
    tick: number
  ): void {
    let totalShips = 0;
    let totalCrew = 0;
    let weightedCoherence = 0;
    let fleetStrength = 0;
    const shipTypeBreakdown: Record<string, number> = {};

    // Gather stats from all squadrons
    for (const squadronId of fleet.squadronIds) {
      const squadronEntity = world.query()
        .with(CT.Squadron)
        .executeEntities()
        .find(e => {
          const s = e.getComponent<SquadronComponent>(CT.Squadron);
          return s?.squadronId === squadronId;
        });

      if (!squadronEntity) {
        // Squadron missing - emit warning
        world.eventBus.emit({
          type: 'fleet:squadron_missing',
          source: fleetEntity.id,
          data: {
            fleetId: fleet.fleetId,
            missingSquadronId: squadronId,
          },
        });
        continue;
      }

      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      const squadronShipCount = squadron.shipIds.length;
      const squadronCrewCount = squadron.totalCrew;

      totalShips += squadronShipCount;
      totalCrew += squadronCrewCount;

      // Weight coherence by squadron crew size
      weightedCoherence += squadron.averageCoherence * squadronCrewCount;

      // Fleet strength is sum of squadron combat strengths
      fleetStrength += squadron.combatStrength;

      // Aggregate ship type breakdown
      for (const [shipType, count] of Object.entries(squadron.shipTypeBreakdown)) {
        shipTypeBreakdown[shipType] = (shipTypeBreakdown[shipType] || 0) + count;
      }
    }

    // Calculate fleet coherence (weighted average by crew size)
    const fleetCoherence = totalCrew > 0 ? weightedCoherence / totalCrew : 0;

    // Apply supply penalty to strength and coherence
    const supplyPenalty = fleet.supplyLevel;
    const adjustedStrength = fleetStrength * supplyPenalty;
    const adjustedCoherence = fleetCoherence * supplyPenalty;

    // Update fleet component
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      totalShips,
      totalCrew,
      fleetCoherence: adjustedCoherence,
      fleetStrength: adjustedStrength,
      shipTypeBreakdown: shipTypeBreakdown as Record<SpaceshipType, number>,
    }));
  }

  /**
   * Degrade supply level over time when fleet is deployed
   */
  private degradeSupplyLevel(
    world: World,
    fleetEntity: EntityImpl,
    fleet: FleetComponent,
    tick: number
  ): void {
    // Supply degrades by 1% per game hour (1200 ticks)
    // Only degrade if fleet has an active mission
    if (!fleet.currentMission) return;

    const SUPPLY_DEGRADATION_PER_HOUR = 0.01;
    const TICKS_PER_HOUR = 1200;

    // Calculate degradation since last update
    const degradation = SUPPLY_DEGRADATION_PER_HOUR * (this.throttleInterval / TICKS_PER_HOUR);

    const newSupplyLevel = Math.max(0, fleet.supplyLevel - degradation);

    // Update supply level
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      supplyLevel: newSupplyLevel,
    }));

    // Emit warning if supply is critically low
    if (newSupplyLevel < 0.2 && fleet.supplyLevel >= 0.2) {
      world.eventBus.emit({
        type: 'fleet:low_supply',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          supplyLevel: newSupplyLevel,
        },
      });
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a squadron to a fleet
 */
export function addSquadronToFleet(
  world: World,
  fleetId: string,
  squadronId: string
): { success: boolean; reason?: string } {
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

  const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
  if (!fleet) {
    return { success: false, reason: 'Entity is not a fleet' };
  }

  if (fleet.squadronIds.length >= 10) {
    return { success: false, reason: 'Fleet already has maximum 10 squadrons' };
  }

  if (fleet.squadronIds.includes(squadronId)) {
    return { success: false, reason: 'Squadron already in fleet' };
  }

  // Add squadron to fleet
  const impl = fleetEntity as EntityImpl;
  impl.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
    ...f,
    squadronIds: [...f.squadronIds, squadronId],
  }));

  // Emit event
  world.eventBus.emit({
    type: 'fleet:squadron_joined',
    source: fleetEntity.id,
    data: {
      fleetId: fleet.fleetId,
      squadronId,
    },
  });

  return { success: true };
}

/**
 * Remove a squadron from a fleet
 */
export function removeSquadronFromFleet(
  world: World,
  fleetId: string,
  squadronId: string
): { success: boolean; reason?: string } {
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

  const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
  if (!fleet) {
    return { success: false, reason: 'Entity is not a fleet' };
  }

  if (!fleet.squadronIds.includes(squadronId)) {
    return { success: false, reason: 'Squadron not in fleet' };
  }

  // Cannot remove flagship squadron
  if (squadronId === fleet.flagshipSquadronId) {
    return { success: false, reason: 'Cannot remove flagship squadron from fleet' };
  }

  // Remove squadron from fleet
  const impl = fleetEntity as EntityImpl;
  impl.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
    ...f,
    squadronIds: f.squadronIds.filter(id => id !== squadronId),
  }));

  // If fleet now has < 3 squadrons, emit disbanding warning
  if (fleet.squadronIds.length < 3) {
    world.eventBus.emit({
      type: 'fleet:disbanding',
      source: fleetEntity.id,
      data: {
        fleetId: fleet.fleetId,
        reason: 'too_few_squadrons',
        remainingSquadrons: fleet.squadronIds.length - 1,
      },
    });
  }

  // Emit squadron left event
  world.eventBus.emit({
    type: 'fleet:squadron_left',
    source: fleetEntity.id,
    data: {
      fleetId: fleet.fleetId,
      squadronId,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: FleetSystem | null = null;

export function getFleetSystem(): FleetSystem {
  if (!systemInstance) {
    systemInstance = new FleetSystem();
  }
  return systemInstance;
}
