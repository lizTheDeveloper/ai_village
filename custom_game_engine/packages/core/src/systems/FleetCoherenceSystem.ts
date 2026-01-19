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
  // Performance Optimizations - Entity Counting
  // ========================================================================

  /** PERF: Track fleet/armada counts to skip when empty */
  private fleetCount = 0;
  private armadaCount = 0;
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 100; // Rebuild cache every 5 seconds

  // ========================================================================
  // Performance Optimizations - Entity Caches (Object Literal for Speed)
  // ========================================================================

  /**
   * Squadron entity cache - uses object literal for O(1) access
   * PERF: Object literals are faster than Maps for string keys
   */
  private squadronEntityCache: Record<string, EntityImpl | null> = Object.create(null);

  /**
   * Fleet entity cache - uses object literal for O(1) access
   */
  private fleetEntityCache: Record<string, EntityImpl | null> = Object.create(null);

  // ========================================================================
  // Performance Optimizations - Reusable Objects
  // ========================================================================

  /**
   * PERF: Reusable fleet stats - reset instead of allocate
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
   * PERF: Reusable armada stats
   */
  private workingArmadaStats = {
    totalShips: 0,
    totalCrew: 0,
    avgCoherence: 0,
  };

  /**
   * PERF: Pre-allocated coherence array to avoid push() allocations
   * Max 10 squadrons per fleet = max 10 coherence values
   */
  private coherenceBuffer: number[] = new Array(10).fill(0);
  private coherenceBufferLen = 0;

  /**
   * PERF: Track last coherence values to skip unchanged fleets
   */
  private lastFleetCoherence: Record<string, number> = Object.create(null);
  private lastArmadaCoherence: Record<string, number> = Object.create(null);

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Fast path - check if cache needs rebuild
    const needsRebuild = tick - this.cacheValidTick > this.CACHE_LIFETIME;

    // Process fleets first (depends on squadron data)
    const fleets = ctx.activeEntities.filter(e => e.hasComponent(CT.Fleet)) as EntityImpl[];
    this.fleetCount = fleets.length;

    // PERF: Fast exit if no fleets
    if (this.fleetCount === 0) {
      // Still check armadas
      const armadas = ctx.activeEntities.filter(e => e.hasComponent(CT.Armada)) as EntityImpl[];
      this.armadaCount = armadas.length;
      if (this.armadaCount === 0) return;

      if (needsRebuild) this.rebuildFleetCache(ctx.world, armadas);
      for (const armadaEntity of armadas) {
        this.updateArmadaCoherence(ctx.world, armadaEntity);
      }
      return;
    }

    if (needsRebuild) {
      this.rebuildSquadronCache(ctx.world, fleets);
      this.cacheValidTick = tick;
    }

    // Process fleets
    for (const fleetEntity of fleets) {
      this.updateFleetCoherence(ctx.world, fleetEntity);
    }

    // Process armadas (depends on fleet data)
    const armadas = ctx.activeEntities.filter(e => e.hasComponent(CT.Armada)) as EntityImpl[];
    this.armadaCount = armadas.length;

    // PERF: Fast exit if no armadas
    if (this.armadaCount === 0) return;

    if (needsRebuild) this.rebuildFleetCache(ctx.world, armadas);

    for (const armadaEntity of armadas) {
      this.updateArmadaCoherence(ctx.world, armadaEntity);
    }
  }

  // ========================================================================
  // Cache Rebuilding - PERF: Object literals for O(1) access
  // ========================================================================

  /**
   * Build cache of all squadron entities referenced by fleets
   * PERF: Uses object literal (faster than Map for string keys)
   */
  private rebuildSquadronCache(world: World, fleets: ReadonlyArray<EntityImpl>): void {
    // PERF: Clear object literal by reassigning (faster than delete loop)
    this.squadronEntityCache = Object.create(null);

    for (const fleetEntity of fleets) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      for (const squadronId of fleet.squadrons.squadronIds) {
        // PERF: Use 'in' check (faster than undefined check for object literals)
        if (!(squadronId in this.squadronEntityCache)) {
          this.squadronEntityCache[squadronId] = world.getEntity(squadronId) as EntityImpl | null;
        }
      }
    }
  }

  /**
   * Build cache of all fleet entities referenced by armadas
   * PERF: Uses object literal (faster than Map for string keys)
   */
  private rebuildFleetCache(world: World, armadas: ReadonlyArray<EntityImpl>): void {
    // PERF: Clear object literal by reassigning
    this.fleetEntityCache = Object.create(null);

    for (const armadaEntity of armadas) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      for (const fleetId of armada.fleets.fleetIds) {
        if (!(fleetId in this.fleetEntityCache)) {
          this.fleetEntityCache[fleetId] = world.getEntity(fleetId) as EntityImpl | null;
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
   * PERF optimizations:
   * - Pre-allocated coherence buffer (no push/array allocation)
   * - Object literal cache (faster than Map)
   * - Indexed for-loops (faster than for-of)
   * - Dirty tracking (skip unchanged fleets)
   * - Inline average calculation (no reduce overhead)
   */
  private updateFleetCoherence(world: World, fleetEntity: EntityImpl): void {
    const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
    if (!fleet) return;

    // PERF: Reset working stats (reuse object, no allocation)
    const stats = this.workingFleetStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.avgCoherence = 0;
    stats.lowCoherence = 0;
    stats.mediumCoherence = 0;
    stats.highCoherence = 0;

    // PERF: Reset coherence buffer length (reuse array, no allocation)
    this.coherenceBufferLen = 0;

    // Gather stats from all squadrons
    for (const squadronId of fleet.squadrons.squadronIds) {
      // PERF: Object literal lookup (faster than Map.get)
      const squadronEntity = this.squadronEntityCache[squadronId];
      if (!squadronEntity) {
        // Squadron missing - emit warning (rare case, ok to allocate)
        world.eventBus.emit({
          type: 'fleet:squadron_missing',
          source: fleetEntity.id,
          data: { fleetId: fleet.fleetId, missingSquadronId: squadronId },
        });
        continue;
      }

      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      const coherence = squadron.coherence.average;
      stats.totalShips += squadron.ships.shipIds.length;
      stats.totalCrew += squadron.ships.totalCrew;

      // PERF: Use pre-allocated buffer instead of push()
      this.coherenceBuffer[this.coherenceBufferLen++] = coherence;

      // PERF: Branchless categorization using comparison
      stats.lowCoherence += coherence < 0.5 ? 1 : 0;
      stats.mediumCoherence += (coherence >= 0.5 && coherence < 0.7) ? 1 : 0;
      stats.highCoherence += coherence >= 0.7 ? 1 : 0;
    }

    // PERF: Inline average calculation (no reduce overhead)
    if (this.coherenceBufferLen > 0) {
      let sum = 0;
      for (let i = 0; i < this.coherenceBufferLen; i++) {
        sum += this.coherenceBuffer[i]!; // Non-null: pre-allocated buffer
      }
      stats.avgCoherence = sum / this.coherenceBufferLen;
    }

    // Calculate fleet coherence with supply modifier
    const supplyModifier = fleet.logistics.fuelReserves;
    const effectiveCoherence = stats.avgCoherence * supplyModifier;

    // PERF: Check if coherence changed significantly (skip updates if unchanged)
    const lastCoherence = this.lastFleetCoherence[fleet.fleetId] ?? -1;
    const coherenceChanged = Math.abs(effectiveCoherence - lastCoherence) > 0.01;

    if (coherenceChanged) {
      this.lastFleetCoherence[fleet.fleetId] = effectiveCoherence;

      // Calculate straggler risk (poor coherence = higher straggler chance)
      const stragglerRisk = effectiveCoherence < 0.5 ? 0.3 : effectiveCoherence < 0.6 ? 0.15 : 0.05;

      // PERF: Only emit straggler warning if risk is high
      if (stragglerRisk > 0.2) {
        world.eventBus.emit({
          type: 'fleet:straggler_detected',
          source: fleetEntity.id,
          data: {
            fleetId: fleet.fleetId,
            coherence: effectiveCoherence,
            stragglerRisk,
            lowCoherenceSquadrons: stats.lowCoherence,
          },
        });
      }

      // Determine rating without allocating string
      const rating: 'poor' | 'adequate' | 'excellent' =
        effectiveCoherence < 0.5 ? 'poor' : effectiveCoherence >= 0.7 ? 'excellent' : 'adequate';

      // Update fleet component (single batched update)
      fleetEntity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
        ...f,
        squadrons: {
          ...f.squadrons,
          totalShips: stats.totalShips,
          totalCrew: stats.totalCrew,
        },
        coherence: {
          ...f.coherence,
          average: effectiveCoherence,
          distribution: {
            low: stats.lowCoherence,
            medium: stats.mediumCoherence,
            high: stats.highCoherence,
          },
          fleetCoherenceRating: rating,
        },
      }));

      // PERF: Only emit event when coherence actually changed
      world.eventBus.emit({
        type: 'fleet:coherence_updated',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          coherence: effectiveCoherence,
          totalShips: stats.totalShips,
          totalCrew: stats.totalCrew,
          distribution: {
            low: stats.lowCoherence,
            medium: stats.mediumCoherence,
            high: stats.highCoherence,
          },
        },
      });
    }

    // PERF: Only check supply warning if supply is actually low
    if (fleet.logistics.fuelReserves < 0.3) {
      world.eventBus.emit({
        type: 'fleet:low_supply',
        source: fleetEntity.id,
        data: { fleetId: fleet.fleetId, supplyLevel: fleet.logistics.fuelReserves },
      });
    }
  }

  // ========================================================================
  // Armada Coherence Update
  // ========================================================================

  /**
   * Update armada coherence from constituent fleets
   *
   * PERF optimizations:
   * - Object literal cache (faster than Map)
   * - Indexed for-loops (faster than for-of)
   * - Inline average calculation
   * - Dirty tracking (skip unchanged armadas)
   */
  private updateArmadaCoherence(world: World, armadaEntity: EntityImpl): void {
    const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
    if (!armada) return;

    // PERF: Reset working stats (reuse object)
    const stats = this.workingArmadaStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.avgCoherence = 0;

    // PERF: Use pre-allocated buffer, reset length
    this.coherenceBufferLen = 0;

    // Gather stats from all fleets
    for (const fleetId of armada.fleets.fleetIds) {
      // PERF: Object literal lookup
      const fleetEntity = this.fleetEntityCache[fleetId];
      if (!fleetEntity) {
        // Fleet missing - emit warning (rare case)
        world.eventBus.emit({
          type: 'armada:fleet_missing',
          source: armadaEntity.id,
          data: { armadaId: armada.armadaId, missingFleetId: fleetId },
        });
        continue;
      }

      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      stats.totalShips += fleet.squadrons.totalShips;
      stats.totalCrew += fleet.squadrons.totalCrew;

      // PERF: Use pre-allocated buffer
      this.coherenceBuffer[this.coherenceBufferLen++] = fleet.coherence.average;
    }

    // PERF: Inline average calculation
    if (this.coherenceBufferLen > 0) {
      let sum = 0;
      for (let i = 0; i < this.coherenceBufferLen; i++) {
        sum += this.coherenceBuffer[i]!; // Non-null: pre-allocated buffer
      }
      stats.avgCoherence = sum / this.coherenceBufferLen;
    }

    // Apply morale modifier
    const moraleModifier = armada.morale.average;
    const effectiveCoherence = stats.avgCoherence * moraleModifier;

    // PERF: Check if coherence changed significantly
    const lastCoherence = this.lastArmadaCoherence[armada.armadaId] ?? -1;
    const coherenceChanged = Math.abs(effectiveCoherence - lastCoherence) > 0.01;

    if (coherenceChanged) {
      this.lastArmadaCoherence[armada.armadaId] = effectiveCoherence;

      // Update armada component (single batched update)
      armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
        ...a,
        fleets: {
          ...a.fleets,
          totalShips: stats.totalShips,
          totalCrew: stats.totalCrew,
        },
        strength: {
          ...a.strength,
          effectiveCombatPower: effectiveCoherence * a.strength.shipCount,
        },
      }));
    }
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
