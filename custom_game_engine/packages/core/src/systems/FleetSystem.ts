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

  // PERF: Cache squadron lookups to avoid repeated queries
  private squadronCache: Map<string, EntityImpl> = new Map();

  // PERF: Reusable objects to avoid allocations in hot paths
  private workingStats = {
    totalShips: 0,
    totalCrew: 0,
    weightedCoherence: 0,
    fleetStrength: 0,
  };

  // PERF: Reuse Map for ship type breakdown to avoid object allocations
  private shipTypeMap: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Build squadron cache once per update instead of querying per fleet
    this.rebuildSquadronCache(ctx.world);

    // Process each fleet
    for (const fleetEntity of ctx.activeEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // PERF: Early exit for empty fleets
      if (fleet.squadronIds.length === 0) continue;

      // Update fleet aggregate stats from squadrons
      this.updateFleetStats(ctx.world, fleetEntity as EntityImpl, fleet, tick);

      // Degrade supply level over time
      this.degradeSupplyLevel(ctx.world, fleetEntity as EntityImpl, fleet, tick);
    }
  }

  /**
   * PERF: Rebuild squadron entity cache once per update
   * Avoids O(n*m) query complexity (n fleets * m squadrons)
   */
  private rebuildSquadronCache(world: World): void {
    this.squadronCache.clear();
    const squadronEntities = world.query().with(CT.Squadron).executeEntities();
    for (const entity of squadronEntities) {
      const squadron = entity.getComponent<SquadronComponent>(CT.Squadron);
      if (squadron) {
        this.squadronCache.set(squadron.squadronId, entity as EntityImpl);
      }
    }
  }

  /**
   * Update fleet aggregate statistics from member squadrons
   * PERF: Uses cached squadron lookups and reusable working objects
   */
  private updateFleetStats(
    world: World,
    fleetEntity: EntityImpl,
    fleet: FleetComponent,
    tick: number
  ): void {
    // PERF: Reset working stats instead of allocating new objects
    const stats = this.workingStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.weightedCoherence = 0;
    stats.fleetStrength = 0;

    // PERF: Clear and reuse Map instead of allocating object
    this.shipTypeMap.clear();

    // Gather stats from all squadrons
    for (const squadronId of fleet.squadronIds) {
      // PERF: Use cached squadron lookup instead of query
      const squadronEntity = this.squadronCache.get(squadronId);

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

      stats.totalShips += squadronShipCount;
      stats.totalCrew += squadronCrewCount;

      // Weight coherence by squadron crew size
      stats.weightedCoherence += squadron.averageCoherence * squadronCrewCount;

      // Fleet strength is sum of squadron combat strengths
      stats.fleetStrength += squadron.combatStrength;

      // PERF: Aggregate ship types using Map (faster than object literal)
      for (const [shipType, count] of Object.entries(squadron.shipTypeBreakdown)) {
        this.shipTypeMap.set(shipType, (this.shipTypeMap.get(shipType) || 0) + count);
      }
    }

    // Calculate fleet coherence (weighted average by crew size)
    const fleetCoherence = stats.totalCrew > 0 ? stats.weightedCoherence / stats.totalCrew : 0;

    // Apply supply penalty to strength and coherence
    const supplyPenalty = fleet.supplyLevel;
    const adjustedStrength = stats.fleetStrength * supplyPenalty;
    const adjustedCoherence = fleetCoherence * supplyPenalty;

    // PERF: Convert Map to object only once at the end
    const shipTypeBreakdown: Record<string, number> = {};
    for (const [type, count] of this.shipTypeMap) {
      shipTypeBreakdown[type] = count;
    }

    // PERF: Batch all component updates in single call
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      totalShips: stats.totalShips,
      totalCrew: stats.totalCrew,
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
