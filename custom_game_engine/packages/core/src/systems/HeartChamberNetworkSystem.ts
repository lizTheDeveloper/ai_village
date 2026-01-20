/**
 * HeartChamberNetworkSystem - Manages fleet-wide coherence synchronization for β-space jumps
 *
 * This system handles:
 * - Heart Chamber Network creation for fleets
 * - Flagship Heart broadcasts target emotional state
 * - Ship-by-ship alignment tracking (crew meditation)
 * - Straggler detection (ships that fail to align)
 * - Fleet jump coordination (80%+ ships must align)
 *
 * Priority: 450 (after FleetCoherenceSystem at 400)
 *
 * Heart Chamber Network concept:
 * - Each ship has a Heart Chamber (the_heart_id in SpaceshipComponent.components)
 * - Flagship Heart broadcasts target emotional state
 * - All ships spend ~100-200 ticks aligning (crew meditates)
 * - 80%+ ships must align for fleet jump
 * - Ships that fail become "stragglers" and are left behind
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type { ShipCrewComponent } from '../components/ShipCrewComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Heart Chamber Network - Fleet-wide emotional synchronization
 */
export interface HeartChamberNetwork {
  fleetId: string;
  flagshipHeartId: string;  // Flagship's Heart Chamber entity
  shipHeartIds: string[];   // All ship Heart chambers

  synchronization: {
    targetEmotionalState: { primary: string; intensity: number };
    syncProgress: number;     // 0-1
    syncStartTick: number;
    syncDuration: number;     // Ticks needed
    syncStrength: number;     // Quality of flagship Heart (0-1)
  };

  // Per-ship alignment tracking
  shipAlignment: Map<string, {
    shipId: string;
    aligned: boolean;
    alignmentProgress: number;  // 0-1
    crewCoherence: number;
    stress: number;
    morale: number;
  }>;
}

/**
 * Fleet jump result
 */
export interface FleetJumpResult {
  success: boolean;           // Did 80%+ ships align?
  stragglers: string[];       // Ship IDs that failed to align
  fleetCoherence: number;     // Overall fleet coherence after sync
  alignedShips: number;
  totalShips: number;
}

// ============================================================================
// System
// ============================================================================

export class HeartChamberNetworkSystem extends BaseSystem {
  public readonly id: SystemId = 'heart_chamber_network' as SystemId;
  public readonly priority: number = 450;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = ['fleet'] as const;
  public readonly metadata = {
    category: 'combat',
    description: 'Fleet-wide coherence synchronization for β-space jumps',
    dependsOn: [],
    writesComponents: [CT.Fleet, CT.Spaceship] as const,
  } as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Active synchronization networks
   * PERF: Object literal for O(1) access
   */
  private activeNetworks: Record<string, HeartChamberNetwork> = Object.create(null);

  /**
   * PERF: Cache fleet entities
   */
  private fleetEntityCache: Record<string, EntityImpl | null> = Object.create(null);
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 100; // Rebuild cache every 5 seconds

  /**
   * PERF: Cache crew members by ship ID
   */
  private crewByShipCache: Record<string, ShipCrewComponent[]> = Object.create(null);

  /**
   * PERF: Pre-allocated working object for alignment stats
   */
  private workingAlignment = {
    aligned: 0,
    total: 0,
  };

  /**
   * PERF: Dirty tracking for networks - skip unchanged networks
   */
  private lastNetworkCoherence: Record<string, number> = Object.create(null);

  // ========================================================================
  // System Update
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Rebuild cache if stale
    const needsRebuild = tick - this.cacheValidTick > this.CACHE_LIFETIME;
    if (needsRebuild) {
      this.rebuildCache(ctx.world);
      this.cacheValidTick = tick;
    }

    // Process all active networks
    for (const fleetId in this.activeNetworks) {
      const network = this.activeNetworks[fleetId];
      if (!network) continue;

      this.updateNetworkProgress(ctx.world, network, tick);
    }
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  private rebuildCache(world: World): void {
    this.fleetEntityCache = Object.create(null);
    this.crewByShipCache = Object.create(null);

    // Cache fleets
    const fleets = world.query().with(CT.Fleet).executeEntities();
    for (const fleetEntity of fleets) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      this.fleetEntityCache[fleet.fleetId] = fleetEntity as EntityImpl;
    }

    // Cache crew by ship
    const crewEntities = world.query().with(CT.ShipCrew).executeEntities();
    for (const crewEntity of crewEntities) {
      const crew = crewEntity.getComponent<ShipCrewComponent>(CT.ShipCrew);
      if (!crew) continue;

      if (!(crew.shipId in this.crewByShipCache)) {
        this.crewByShipCache[crew.shipId] = [];
      }
      this.crewByShipCache[crew.shipId]!.push(crew);
    }
  }

  // ========================================================================
  // Public API - Initiate Fleet Sync
  // ========================================================================

  /**
   * Initiate fleet-wide synchronization for β-jump
   *
   * @param world - ECS World
   * @param fleetEntity - Fleet entity
   * @param targetEmotion - Target emotional state for all ships
   * @param duration - Ticks needed for synchronization (100-200)
   * @returns HeartChamberNetwork tracking sync progress
   */
  public initiateFleetSync(
    world: World,
    fleetEntity: EntityImpl,
    targetEmotion: { primary: string; intensity: number },
    duration: number
  ): HeartChamberNetwork {
    const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
    if (!fleet) {
      throw new Error('Entity does not have FleetComponent');
    }

    // Get flagship
    const flagshipEntity = world.getEntity(fleet.flagshipShipId);
    if (!flagshipEntity) {
      throw new Error(`Flagship ship ${fleet.flagshipShipId} not found`);
    }

    const flagship = flagshipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!flagship) {
      throw new Error('Flagship entity does not have SpaceshipComponent');
    }

    // Get flagship Heart Chamber
    const flagshipHeartId = flagship.components.the_heart_id;
    if (!flagshipHeartId) {
      throw new Error('Flagship does not have Heart Chamber');
    }

    // Collect all ship Heart chambers
    const shipHeartIds: string[] = [];
    const shipAlignment = new Map<string, {
      shipId: string;
      aligned: boolean;
      alignmentProgress: number;
      crewCoherence: number;
      stress: number;
      morale: number;
    }>();

    // Get all ships from all squadrons
    const allShipIds = this.getAllFleetShips(world, fleet);

    for (const shipId of allShipIds) {
      const shipEntity = world.getEntity(shipId);
      if (!shipEntity) continue;

      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      const heartId = ship.components.the_heart_id;
      if (heartId) {
        shipHeartIds.push(heartId);
      }

      // Initialize alignment tracking
      const crewMembers = this.getShipCrew(world, shipId);
      const crewCoherence = ship.crew.coherence;
      const avgStress = this.calculateAverageStress(crewMembers);
      const avgMorale = this.calculateAverageMorale(crewMembers);

      shipAlignment.set(shipId, {
        shipId,
        aligned: false,
        alignmentProgress: 0,
        crewCoherence,
        stress: avgStress,
        morale: avgMorale,
      });
    }

    // Calculate flagship Heart quality (affects sync strength)
    const syncStrength = flagship.crew.coherence;

    // Create network
    const network: HeartChamberNetwork = {
      fleetId: fleet.fleetId,
      flagshipHeartId,
      shipHeartIds,
      synchronization: {
        targetEmotionalState: targetEmotion,
        syncProgress: 0,
        syncStartTick: world.tick,
        syncDuration: duration,
        syncStrength,
      },
      shipAlignment,
    };

    // Store active network
    this.activeNetworks[fleet.fleetId] = network;

    // Emit event
    world.eventBus.emit({
      type: 'fleet:sync_started',
      source: fleetEntity.id,
      data: {
        fleetId: fleet.fleetId,
        targetEmotion: targetEmotion.primary,
        duration,
        totalShips: allShipIds.length,
        flagshipHeartId,
      },
    });

    return network;
  }

  // ========================================================================
  // Public API - Update Sync Progress
  // ========================================================================

  /**
   * Update synchronization progress for a network
   *
   * @param world - ECS World
   * @param network - HeartChamberNetwork
   * @param tick - Current tick
   * @returns Alignment statistics
   */
  public updateSyncProgress(
    world: World,
    network: HeartChamberNetwork,
    tick: number
  ): { aligned: number; total: number } {
    const ticksElapsed = tick - network.synchronization.syncStartTick;
    const syncProgress = Math.min(1, ticksElapsed / network.synchronization.syncDuration);

    network.synchronization.syncProgress = syncProgress;

    // PERF: Use working object instead of allocating new object
    this.workingAlignment.aligned = 0;
    this.workingAlignment.total = network.shipAlignment.size;

    // Update each ship's alignment progress
    for (const [shipId, alignment] of network.shipAlignment) {
      if (alignment.aligned) {
        this.workingAlignment.aligned++;
        continue;
      }

      // Calculate alignment chance based on ship state
      const alignmentChance = this.calculateAlignmentChance(
        alignment.crewCoherence,
        alignment.stress,
        alignment.morale,
        network.synchronization.syncStrength
      );

      // Progress increases each tick based on alignment chance
      alignment.alignmentProgress += alignmentChance * 0.01;

      // Check if ship aligned this tick
      if (alignment.alignmentProgress >= 1.0) {
        alignment.aligned = true;
        this.workingAlignment.aligned++;

        world.eventBus.emit({
          type: 'fleet:ship_aligned',
          source: shipId,
          data: {
            fleetId: network.fleetId,
            shipId,
            alignedShips: this.workingAlignment.aligned,
            totalShips: this.workingAlignment.total,
          },
        });
      }
    }

    // Emit progress event periodically
    if (ticksElapsed % 20 === 0) {
      world.eventBus.emit({
        type: 'fleet:sync_progress',
        source: network.fleetId,
        data: {
          fleetId: network.fleetId,
          progress: syncProgress,
          alignedShips: this.workingAlignment.aligned,
          totalShips: this.workingAlignment.total,
          ticksRemaining: network.synchronization.syncDuration - ticksElapsed,
        },
      });
    }

    return { aligned: this.workingAlignment.aligned, total: this.workingAlignment.total };
  }

  // ========================================================================
  // Public API - Finalize Fleet Jump
  // ========================================================================

  /**
   * Finalize fleet jump and determine stragglers
   *
   * @param world - ECS World
   * @param network - HeartChamberNetwork
   * @returns FleetJumpResult with success status and stragglers
   */
  public finalizeFleetJump(world: World, network: HeartChamberNetwork): FleetJumpResult {
    const alignedShips: string[] = [];
    const stragglers: string[] = [];

    // Categorize ships
    for (const [shipId, alignment] of network.shipAlignment) {
      if (alignment.aligned) {
        alignedShips.push(shipId);
      } else {
        stragglers.push(shipId);
      }
    }

    const totalShips = network.shipAlignment.size;
    const alignedCount = alignedShips.length;
    const alignmentRate = totalShips > 0 ? alignedCount / totalShips : 0;

    // Success if 80%+ ships aligned
    const success = alignmentRate >= 0.8;

    // Calculate fleet coherence from aligned ships
    let fleetCoherence = 0;
    if (alignedCount > 0) {
      let coherenceSum = 0;
      for (const shipId of alignedShips) {
        const alignment = network.shipAlignment.get(shipId);
        if (alignment) {
          coherenceSum += alignment.crewCoherence;
        }
      }
      fleetCoherence = coherenceSum / alignedCount;
    }

    // Emit completion event
    world.eventBus.emit({
      type: 'fleet:sync_completed',
      source: network.fleetId,
      data: {
        fleetId: network.fleetId,
        success,
        alignedShips: alignedCount,
        totalShips,
        alignmentRate,
        fleetCoherence,
      },
    });

    // Emit stragglers event if any
    if (stragglers.length > 0) {
      world.eventBus.emit({
        type: 'fleet:stragglers_detected',
        source: network.fleetId,
        data: {
          fleetId: network.fleetId,
          stragglers,
          stragglerCount: stragglers.length,
          alignmentRate,
        },
      });
    }

    // Remove network from active list
    delete this.activeNetworks[network.fleetId];

    return {
      success,
      stragglers,
      fleetCoherence,
      alignedShips: alignedCount,
      totalShips,
    };
  }

  // ========================================================================
  // Helper Functions
  // ========================================================================

  /**
   * Get all ship IDs from a fleet's squadrons
   * GC: Uses indexed loop instead of spread to avoid array allocations
   */
  private getAllFleetShips(world: World, fleet: FleetComponent): string[] {
    const allShipIds: string[] = [];

    for (const squadronId of fleet.squadrons.squadronIds) {
      const squadronEntity = world.getEntity(squadronId);
      if (!squadronEntity) continue;

      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      // GC: Push individually instead of spread to avoid intermediate array
      const shipIds = squadron.ships.shipIds;
      for (let i = 0, len = shipIds.length; i < len; i++) {
        allShipIds.push(shipIds[i]!);
      }
    }

    return allShipIds;
  }

  /**
   * Get all crew members for a ship
   * PERF: Uses cached crew data instead of querying + filtering
   */
  private getShipCrew(world: World, shipId: string): ShipCrewComponent[] {
    return this.crewByShipCache[shipId] || [];
  }

  /**
   * Calculate average stress across crew
   * PERF: Inline calculation instead of reduce()
   */
  private calculateAverageStress(crewMembers: ShipCrewComponent[]): number {
    if (crewMembers.length === 0) return 0;

    let totalStress = 0;
    for (const crew of crewMembers) {
      totalStress += crew.betaSpaceStress;
    }
    return totalStress / crewMembers.length;
  }

  /**
   * Calculate average morale across crew
   * PERF: Inline calculation instead of reduce()
   */
  private calculateAverageMorale(crewMembers: ShipCrewComponent[]): number {
    if (crewMembers.length === 0) return 0.7;

    let totalMorale = 0;
    for (const crew of crewMembers) {
      totalMorale += crew.morale;
    }
    return totalMorale / crewMembers.length;
  }

  /**
   * Calculate ship alignment chance per tick
   *
   * Factors:
   * - Crew coherence (higher = better)
   * - Stress (higher = worse)
   * - Morale (higher = better)
   * - Flagship Heart strength (higher = better)
   */
  private calculateAlignmentChance(
    crewCoherence: number,
    stress: number,
    morale: number,
    syncStrength: number
  ): number {
    // Base chance from crew coherence
    const coherenceBonus = crewCoherence;

    // Stress penalty
    const stressPenalty = stress;

    // Morale bonus
    const moraleBonus = morale;

    // Flagship Heart strength multiplier
    const heartMultiplier = syncStrength;

    // Combined chance (0-1)
    const alignmentChance =
      coherenceBonus * (1 - stressPenalty) * moraleBonus * heartMultiplier;

    return Math.max(0, Math.min(1, alignmentChance));
  }

  /**
   * Update network progress (called each tick)
   */
  private updateNetworkProgress(world: World, network: HeartChamberNetwork, tick: number): void {
    const ticksElapsed = tick - network.synchronization.syncStartTick;

    // Check if sync duration completed
    if (ticksElapsed >= network.synchronization.syncDuration) {
      // Sync time completed - finalize
      this.finalizeFleetJump(world, network);
      return;
    }

    // Update progress
    this.updateSyncProgress(world, network, tick);
  }

  /**
   * Get active network for a fleet
   */
  public getActiveNetwork(fleetId: string): HeartChamberNetwork | null {
    return this.activeNetworks[fleetId] ?? null;
  }

  /**
   * Cancel active sync (emergency abort)
   */
  public cancelSync(world: World, fleetId: string): void {
    const network = this.activeNetworks[fleetId];
    if (!network) return;

    world.eventBus.emit({
      type: 'fleet:sync_cancelled',
      source: fleetId,
      data: {
        fleetId,
        progress: network.synchronization.syncProgress,
      },
    });

    delete this.activeNetworks[fleetId];
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: HeartChamberNetworkSystem | null = null;

export function getHeartChamberNetworkSystem(): HeartChamberNetworkSystem {
  if (!systemInstance) {
    systemInstance = new HeartChamberNetworkSystem();
  }
  return systemInstance;
}
