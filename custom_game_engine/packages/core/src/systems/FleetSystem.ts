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

  // ========================================================================
  // PERF: Entity Caching - Object literal for O(1) access
  // ========================================================================

  /** Squadron cache - rebuilt once per update */
  private squadronCache: Record<string, EntityImpl | null> = Object.create(null);
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 100; // 5 seconds

  // ========================================================================
  // PERF: Reusable Working Objects
  // ========================================================================

  private workingStats = {
    totalShips: 0,
    totalCrew: 0,
    weightedCoherence: 0,
    fleetStrength: 0,
  };

  /** Reuse Map for ship type breakdown to avoid object allocations */
  private shipTypeMap: Map<string, number> = new Map();

  // ========================================================================
  // PERF: Dirty Tracking - Skip unchanged fleets
  // ========================================================================

  /** Track last fleet stats hash to skip unchanged fleets */
  private lastFleetHash: Record<string, number> = Object.create(null);

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;
    const fleetCount = ctx.activeEntities.length;

    // PERF: Fast exit if no fleets
    if (fleetCount === 0) return;

    // PERF: Only rebuild cache periodically
    if (tick - this.cacheValidTick > this.CACHE_LIFETIME) {
      this.rebuildSquadronCache(ctx.world);
      this.cacheValidTick = tick;
    }

    // PERF: Use indexed for-loop (faster than for-of)
    for (let i = 0; i < fleetCount; i++) {
      const fleetEntity = ctx.activeEntities[i];
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // PERF: Early exit for empty fleets
      const squadronCount = fleet.squadrons.squadronIds.length;
      if (squadronCount === 0) continue;

      // Update fleet aggregate stats from squadrons
      this.updateFleetStats(ctx.world, fleetEntity as EntityImpl, fleet, tick);

      // Degrade supply level over time
      this.degradeSupplyLevel(ctx.world, fleetEntity as EntityImpl, fleet, tick);
    }
  }

  /**
   * PERF: Rebuild squadron entity cache once per update
   * Uses object literal (faster than Map for string keys)
   */
  private rebuildSquadronCache(world: World): void {
    // PERF: Clear by reassigning (faster than delete loop)
    this.squadronCache = Object.create(null);

    const squadronEntities = world.query().with(CT.Squadron).executeEntities();
    const count = squadronEntities.length;

    for (let i = 0; i < count; i++) {
      const entity = squadronEntities[i];
      const squadron = entity.getComponent<SquadronComponent>(CT.Squadron);
      if (squadron) {
        this.squadronCache[squadron.squadronId] = entity as EntityImpl;
      }
    }
  }

  /**
   * Update fleet aggregate statistics from member squadrons
   * PERF: Uses cached squadron lookups, reusable working objects, and dirty tracking
   */
  private updateFleetStats(
    world: World,
    fleetEntity: EntityImpl,
    fleet: FleetComponent,
    tick: number
  ): void {
    // PERF: Reset working stats (reuse object)
    const stats = this.workingStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.weightedCoherence = 0;
    stats.fleetStrength = 0;

    // PERF: Clear and reuse Map
    this.shipTypeMap.clear();

    // PERF: Get squadron IDs once, use indexed loop
    const squadronIds = fleet.squadrons.squadronIds;
    const squadronCount = squadronIds.length;

    // Gather stats from all squadrons
    for (let i = 0; i < squadronCount; i++) {
      const squadronId = squadronIds[i];
      // PERF: Object literal lookup (faster than Map.get)
      const squadronEntity = this.squadronCache[squadronId];

      if (!squadronEntity) {
        // Squadron missing - emit warning (rare case)
        world.eventBus.emit({
          type: 'fleet:squadron_missing',
          source: fleetEntity.id,
          data: { fleetId: fleet.fleetId, missingSquadronId: squadronId },
        });
        continue;
      }

      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      const shipIds = squadron.ships.shipIds;
      const squadronShipCount = shipIds.length;
      const squadronCrewCount = squadron.ships.totalCrew;

      stats.totalShips += squadronShipCount;
      stats.totalCrew += squadronCrewCount;

      // Weight coherence by squadron crew size
      stats.weightedCoherence += squadron.coherence.average * squadronCrewCount;

      // Fleet strength is sum of squadron combat strengths
      stats.fleetStrength += squadron.combat.totalFirepower;

      // PERF: Aggregate ship types using Map
      const shipTypes = squadron.ships.shipTypes;
      for (const shipType in shipTypes) {
        const count = shipTypes[shipType as SpaceshipType];
        this.shipTypeMap.set(shipType, (this.shipTypeMap.get(shipType) || 0) + count);
      }
    }

    // Calculate fleet coherence (weighted average by crew size)
    const fleetCoherence = stats.totalCrew > 0 ? stats.weightedCoherence / stats.totalCrew : 0;

    // Apply supply penalty to strength and coherence
    const supplyPenalty = fleet.logistics.fuelReserves;
    const adjustedStrength = stats.fleetStrength * supplyPenalty;
    const adjustedCoherence = fleetCoherence * supplyPenalty;

    // PERF: Create simple hash to detect changes (ships + crew + coherence*1000)
    const currentHash = stats.totalShips + stats.totalCrew * 100 + Math.floor(adjustedCoherence * 1000);
    const lastHash = this.lastFleetHash[fleet.fleetId] ?? -1;

    // PERF: Skip update if nothing changed
    if (currentHash === lastHash) return;

    this.lastFleetHash[fleet.fleetId] = currentHash;

    // PERF: Convert Map to object only when actually updating
    const shipTypeBreakdown: Record<string, number> = {};
    for (const [type, count] of this.shipTypeMap) {
      shipTypeBreakdown[type] = count;
    }

    // Single batched component update
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      squadrons: {
        ...f.squadrons,
        totalShips: stats.totalShips,
        totalCrew: stats.totalCrew,
      },
      coherence: {
        ...f.coherence,
        average: adjustedCoherence,
      },
      status: {
        ...f.status,
        readiness: adjustedStrength,
      },
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
    if (!fleet.mission || !fleet.mission.type) return;

    const SUPPLY_DEGRADATION_PER_HOUR = 0.01;
    const TICKS_PER_HOUR = 1200;

    // Calculate degradation since last update
    const degradation = SUPPLY_DEGRADATION_PER_HOUR * (this.throttleInterval / TICKS_PER_HOUR);

    const newSupplyLevel = Math.max(0, fleet.logistics.fuelReserves - degradation);

    // Update supply level
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      logistics: {
        ...f.logistics,
        fuelReserves: newSupplyLevel,
      },
    }));

    // Emit warning if supply is critically low
    if (newSupplyLevel < 0.2 && fleet.logistics.fuelReserves >= 0.2) {
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

  if (fleet.squadrons.squadronIds.length >= 10) {
    return { success: false, reason: 'Fleet already has maximum 10 squadrons' };
  }

  if (fleet.squadrons.squadronIds.includes(squadronId)) {
    return { success: false, reason: 'Squadron already in fleet' };
  }

  // Add squadron to fleet
  const impl = fleetEntity as EntityImpl;
  impl.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
    ...f,
    squadrons: {
      ...f.squadrons,
      squadronIds: [...f.squadrons.squadronIds, squadronId],
    },
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

  if (!fleet.squadrons.squadronIds.includes(squadronId)) {
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
    squadrons: {
      ...f.squadrons,
      squadronIds: f.squadrons.squadronIds.filter(id => id !== squadronId),
    },
  }));

  // If fleet now has < 3 squadrons, emit disbanding warning
  if (fleet.squadrons.squadronIds.length < 3) {
    world.eventBus.emit({
      type: 'fleet:disbanding',
      source: fleetEntity.id,
      data: {
        fleetId: fleet.fleetId,
        reason: 'too_few_squadrons',
        remainingSquadrons: fleet.squadrons.squadronIds.length - 1,
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
