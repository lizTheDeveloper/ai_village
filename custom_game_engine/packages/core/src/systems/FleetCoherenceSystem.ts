/**
 * FleetCoherenceSystem - Manages coherence aggregation across fleet hierarchy
 *
 * This system handles:
 * - Squadron → Fleet coherence aggregation
 * - Fleet → Armada coherence aggregation
 * - Heart Chamber Network synchronization logic
 * - Straggler calculation for fleet β-jumps
 *
 * Priority: 400 (after ship systems at 85, before combat at 600)
 *
 * Coherence flows bottom-up:
 * - Ship crew coherence → Squadron average coherence
 * - Squadron coherence → Fleet coherence rating
 * - Fleet coherence → Armada coherence average
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { ArmadaComponent } from '../components/ArmadaComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System
// ============================================================================

export class FleetCoherenceSystem extends BaseSystem {
  public readonly id: SystemId = 'fleet_coherence' as SystemId;
  public readonly priority: number = 400;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = ['fleet', 'armada'] as const;
  public readonly metadata = {
    category: 'combat',
    description: 'Aggregates coherence across ship-fleet hierarchy',
    dependsOn: ['squadron_management' as SystemId],
    writesComponents: [CT.Fleet, CT.Armada] as const,
  } as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  // ========================================================================
  // Performance Optimizations - Reusable Objects
  // ========================================================================

  /**
   * Squadron entity cache - prevents repeated world.getEntity() calls
   */
  private squadronEntityCache: Map<string, EntityImpl | null> = new Map();

  /**
   * Fleet entity cache
   */
  private fleetEntityCache: Map<string, EntityImpl | null> = new Map();

  /**
   * Reusable fleet stats
   */
  private workingFleetStats = {
    totalShips: 0,
    totalCrew: 0,
    avgCoherence: 0,
    lowCoherence: 0,
    mediumCoherence: 0,
    highCoherence: 0,
  };

  /**
   * Reusable armada stats
   */
  private workingArmadaStats = {
    totalShips: 0,
    totalCrew: 0,
    avgCoherence: 0,
  };

  protected onUpdate(ctx: SystemContext): void {
    // Process fleets first (depends on squadron data)
    const fleets = ctx.world.query().with(CT.Fleet).executeEntities() as EntityImpl[];
    if (fleets.length > 0) {
      this.rebuildSquadronCache(ctx.world, fleets);
      for (const fleetEntity of fleets) {
        this.updateFleetCoherence(ctx.world, fleetEntity);
      }
    }

    // Process armadas (depends on fleet data)
    const armadas = ctx.world.query().with(CT.Armada).executeEntities() as EntityImpl[];
    if (armadas.length > 0) {
      this.rebuildFleetCache(ctx.world, armadas);
      for (const armadaEntity of armadas) {
        this.updateArmadaCoherence(ctx.world, armadaEntity);
      }
    }
  }

  // ========================================================================
  // Cache Rebuilding
  // ========================================================================

  /**
   * Build cache of all squadron entities referenced by fleets
   */
  private rebuildSquadronCache(world: World, fleets: ReadonlyArray<EntityImpl>): void {
    this.squadronEntityCache.clear();

    for (const fleetEntity of fleets) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      for (const squadronId of fleet.squadrons.squadronIds) {
        if (!this.squadronEntityCache.has(squadronId)) {
          const entity = world.getEntity(squadronId);
          this.squadronEntityCache.set(squadronId, entity as EntityImpl | null);
        }
      }
    }
  }

  /**
   * Build cache of all fleet entities referenced by armadas
   */
  private rebuildFleetCache(world: World, armadas: ReadonlyArray<EntityImpl>): void {
    this.fleetEntityCache.clear();

    for (const armadaEntity of armadas) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      for (const fleetId of armada.fleets.fleetIds) {
        if (!this.fleetEntityCache.has(fleetId)) {
          const entity = world.getEntity(fleetId);
          this.fleetEntityCache.set(fleetId, entity as EntityImpl | null);
        }
      }
    }
  }

  // ========================================================================
  // Fleet Coherence Update
  // ========================================================================

  /**
   * Update fleet coherence from constituent squadrons
   *
   * Per spec (line 621-656):
   * - Average squadron coherence
   * - Distribution: low (<0.5), medium (0.5-0.7), high (>0.7)
   * - Rating: poor, adequate, excellent
   */
  private updateFleetCoherence(world: World, fleetEntity: EntityImpl): void {
    const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
    if (!fleet) return;

    // Reset working stats
    this.workingFleetStats.squadrons.totalShips = 0;
    this.workingFleetStats.ships.totalCrew = 0;
    this.workingFleetStats.avgCoherence = 0;
    this.workingFleetStats.lowCoherence = 0;
    this.workingFleetStats.mediumCoherence = 0;
    this.workingFleetStats.highCoherence = 0;

    const coherences: number[] = [];

    // Gather stats from all squadrons
    for (const squadronId of fleet.squadrons.squadronIds) {
      const squadronEntity = this.squadronEntityCache.get(squadronId);
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

      this.workingFleetStats.squadrons.totalShips += squadron.ships.shipIds.length;
      this.workingFleetStats.ships.totalCrew += squadron.ships.totalCrew;
      coherences.push(squadron.coherence.average);

      // Categorize squadron coherence
      if (squadron.coherence.average < 0.5) {
        this.workingFleetStats.lowCoherence++;
      } else if (squadron.coherence.average < 0.7) {
        this.workingFleetStats.mediumCoherence++;
      } else {
        this.workingFleetStats.highCoherence++;
      }
    }

    // Calculate average coherence
    if (coherences.length > 0) {
      this.workingFleetStats.avgCoherence = coherences.reduce((sum, c) => sum + c, 0) / coherences.length;
    }

    // Calculate fleet coherence with supply modifier
    const supplyModifier = fleet.logistics.fuelReserves;
    const effectiveCoherence = this.workingFleetStats.avgCoherence * supplyModifier;

    // Calculate straggler risk (poor coherence = higher straggler chance)
    const stragglerRisk = effectiveCoherence < 0.5 ? 0.3 : effectiveCoherence < 0.6 ? 0.15 : 0.05;

    // Emit straggler warning if risk is high
    if (stragglerRisk > 0.2) {
      world.eventBus.emit({
        type: 'fleet:straggler_detected',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          coherence: effectiveCoherence,
          stragglerRisk,
          lowCoherenceSquadrons: this.workingFleetStats.lowCoherence,
        },
      });
    }

    // Update fleet component
    fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      totalShips: this.workingFleetStats.squadrons.totalShips,
      totalCrew: this.workingFleetStats.ships.totalCrew,
      fleetCoherence: effectiveCoherence,
    }));

    // Emit coherence update event
    world.eventBus.emit({
      type: 'fleet:coherence_updated',
      source: fleetEntity.id,
      data: {
        fleetId: fleet.fleetId,
        coherence: effectiveCoherence,
        totalShips: this.workingFleetStats.squadrons.totalShips,
        totalCrew: this.workingFleetStats.ships.totalCrew,
        distribution: {
          low: this.workingFleetStats.lowCoherence,
          medium: this.workingFleetStats.mediumCoherence,
          high: this.workingFleetStats.highCoherence,
        },
      },
    });

    // Check for low supply warning
    if (fleet.logistics.fuelReserves < 0.3) {
      world.eventBus.emit({
        type: 'fleet:low_supply',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          supplyLevel: fleet.logistics.fuelReserves,
        },
      });
    }
  }

  // ========================================================================
  // Armada Coherence Update
  // ========================================================================

  /**
   * Update armada coherence from constituent fleets
   *
   * Simpler than fleet-level: just average fleet coherences
   */
  private updateArmadaCoherence(world: World, armadaEntity: EntityImpl): void {
    const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
    if (!armada) return;

    // Reset working stats
    this.workingArmadaStats.squadrons.totalShips = 0;
    this.workingArmadaStats.ships.totalCrew = 0;
    this.workingArmadaStats.avgCoherence = 0;

    const coherences: number[] = [];

    // Gather stats from all fleets
    for (const fleetId of armada.fleets.fleetIds) {
      const fleetEntity = this.fleetEntityCache.get(fleetId);
      if (!fleetEntity) {
        // Fleet missing - emit warning
        world.eventBus.emit({
          type: 'armada:fleet_missing',
          source: armadaEntity.id,
          data: {
            armadaId: armada.armadaId,
            missingFleetId: fleetId,
          },
        });
        continue;
      }

      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      this.workingArmadaStats.squadrons.totalShips += fleet.squadrons.totalShips;
      this.workingArmadaStats.ships.totalCrew += fleet.ships.totalCrew;
      coherences.push(fleet.coherence.average);
    }

    // Calculate average coherence
    if (coherences.length > 0) {
      this.workingArmadaStats.avgCoherence = coherences.reduce((sum, c) => sum + c, 0) / coherences.length;
    }

    // Apply supply modifier
    const supplyModifier = armada.logistics.fuelReserves;
    const effectiveCoherence = this.workingArmadaStats.avgCoherence * supplyModifier;

    // Update armada component
    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      totalShips: this.workingArmadaStats.squadrons.totalShips,
      totalCrew: this.workingArmadaStats.ships.totalCrew,
      armadaCoherence: effectiveCoherence,
    }));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate Heart Chamber Network synchronization for fleet β-jump
 *
 * Per spec (line 1269-1333):
 * - Flagship Heart broadcasts target emotional state
 * - All ships align to target
 * - Success if > 80% of ships align
 */
export function synchronizeFleetHearts(
  world: World,
  fleet: FleetComponent,
  duration: number // Ticks to sync
): { success: boolean; coherence: number; alignedShips: number; totalShips: number } {
  // Get all squadrons
  const squadronEntities = world.query().with(CT.Squadron).executeEntities();
  const fleetSquadrons = squadronEntities.filter(e => {
    const s = e.getComponent<SquadronComponent>(CT.Squadron);
    return s && fleet.squadrons.squadronIds.includes(s.squadronId);
  });

  // Get all ships from squadrons
  const shipEntities: EntityImpl[] = [];
  for (const squadronEntity of fleetSquadrons) {
    const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
    if (!squadron) continue;

    for (const shipId of squadron.ships.shipIds) {
      const shipEntity = world.getEntity(shipId);
      if (shipEntity) {
        shipEntities.push(shipEntity as EntityImpl);
      }
    }
  }

  if (shipEntities.length === 0) {
    return { success: false, coherence: 0, alignedShips: 0, totalShips: 0 };
  }

  // Calculate alignment success for each ship
  let alignedShips = 0;
  const shipCoherences: number[] = [];

  for (const shipEntity of shipEntities) {
    const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!ship) continue;

    // Alignment success based on ship coherence and duration
    // High coherence ships align easier
    const alignmentChance = ship.crew.coherence * (duration / 200);
    const aligned = Math.random() < alignmentChance;

    if (aligned) {
      alignedShips++;
      shipCoherences.push(ship.crew.coherence);
    }
  }

  // Success if > 80% aligned
  const alignmentRate = alignedShips / shipEntities.length;
  const success = alignmentRate >= 0.8;

  // Calculate fleet coherence from aligned ships
  const fleetCoherence = shipCoherences.length > 0
    ? shipCoherences.reduce((sum, c) => sum + c, 0) / shipCoherences.length
    : 0;

  return {
    success,
    coherence: fleetCoherence,
    alignedShips,
    totalShips: shipEntities.length,
  };
}

/**
 * Calculate straggler ships for a fleet β-jump
 *
 * Per spec (line 1350-1377):
 * - Ships that failed alignment are left behind
 * - Straggler rate depends on fleet coherence rating
 */
export function calculateStragglers(
  fleetCoherence: number,
  totalShips: number
): { stragglerCount: number; stragglerRate: number } {
  let stragglerRate: number;

  if (fleetCoherence < 0.5) {
    stragglerRate = 0.3; // Poor: 30% straggler rate
  } else if (fleetCoherence < 0.6) {
    stragglerRate = 0.15; // Adequate: 15% straggler rate
  } else if (fleetCoherence < 0.7) {
    stragglerRate = 0.05; // Good: 5% straggler rate
  } else {
    stragglerRate = 0.01; // Excellent: 1% straggler rate
  }

  const stragglerCount = Math.floor(totalShips * stragglerRate);

  return { stragglerCount, stragglerRate };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: FleetCoherenceSystem | null = null;

export function getFleetCoherenceSystem(): FleetCoherenceSystem {
  if (!systemInstance) {
    systemInstance = new FleetCoherenceSystem();
  }
  return systemInstance;
}
