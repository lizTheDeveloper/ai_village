/**
 * ArmadaSystem - Manages multi-fleet armadas
 *
 * This system handles:
 * - Armada aggregate statistics (ships, crew, coherence, strength)
 * - Doctrine bonuses
 * - Fleet joining/leaving armadas
 * - Campaign tracking
 * - Morale management
 *
 * Priority: 75 (before FleetSystem at 80, before SquadronSystem at 85)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ArmadaComponent } from '../components/ArmadaComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System
// ============================================================================

export class ArmadaSystem extends BaseSystem {
  public readonly id: SystemId = 'armada_management' as SystemId;
  public readonly priority: number = 75;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Armada];
  // Only run when armada components exist (O(1) activation check)
  public readonly activationComponents = ['armada'] as const;
  public readonly metadata = {
    category: 'infrastructure',
    description: 'Manages multi-fleet armadas and campaigns',
    dependsOn: ['fleet_management' as SystemId],
    writesComponents: [CT.Armada] as const,
  } as const;

  protected readonly throttleInterval = 60; // Every 3 seconds at 20 TPS

  // PERF: Cache fleet lookups to avoid repeated world.getEntity() calls
  // Object literal faster than Map for lookups
  private fleetCache: Record<string, EntityImpl | null> = Object.create(null);
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 60; // 3 seconds

  // PERF: Reusable objects to avoid allocations in hot paths
  private workingStats = {
    totalShips: 0,
    totalCrew: 0,
    weightedCoherence: 0,
    totalStrength: 0,
  };

  // PERF: Object literal for ship type breakdown
  private shipTypeMap: Record<string, number> = Object.create(null);

  // PERF: Dirty tracking to skip unchanged armadas
  private lastArmadaHash: Record<string, number> = Object.create(null);

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Rebuild fleet cache only when expired
    if (tick - this.cacheValidTick > this.CACHE_LIFETIME) {
      this.rebuildFleetCache(ctx.world);
      this.cacheValidTick = tick;
    }

    // Process each armada
    for (const armadaEntity of ctx.activeEntities) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      // PERF: Early exit for empty armadas
      if (armada.fleets.fleetIds.length === 0) continue;

      // Update armada aggregate stats
      this.updateArmadaStats(ctx.world, armadaEntity as EntityImpl, armada, tick);

      // Apply doctrine bonuses
      this.applyDoctrineEffects(armadaEntity as EntityImpl, armada);

      // Update morale trend
      this.updateMorale(armadaEntity as EntityImpl, armada);
    }
  }

  /**
   * PERF: Rebuild fleet entity cache
   * Avoids repeated world.getEntity() lookups
   */
  private rebuildFleetCache(world: World): void {
    this.fleetCache = Object.create(null);
    const fleetEntities = world.query().with(CT.Fleet).executeEntities();
    for (const entity of fleetEntities) {
      this.fleetCache[entity.id] = entity as EntityImpl;
    }
  }

  /**
   * Update armada aggregate statistics from member fleets
   * PERF: Uses cached fleet lookups and reusable working objects
   */
  private updateArmadaStats(
    world: World,
    armadaEntity: EntityImpl,
    armada: ArmadaComponent,
    tick: number
  ): void {
    // PERF: Reset working stats instead of allocating new objects
    const stats = this.workingStats;
    stats.totalShips = 0;
    stats.totalCrew = 0;
    stats.weightedCoherence = 0;
    stats.totalStrength = 0;

    // GC: Clear existing object keys instead of allocating new object
    for (const key in this.shipTypeMap) {
      delete this.shipTypeMap[key];
    }

    // Gather stats from all fleets
    for (const fleetId of armada.fleets.fleetIds) {
      // PERF: Use cached fleet lookup
      const fleetEntity = this.fleetCache[fleetId];
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

      stats.totalShips += fleet.squadrons.totalShips;
      stats.totalCrew += fleet.squadrons.totalCrew;

      // Weight coherence by fleet size
      stats.weightedCoherence += fleet.coherence.average * fleet.squadrons.totalShips;

      // Sum combat strength
      stats.totalStrength += fleet.combat.offensiveRating;

      // PERF: Aggregate ship types using object literal
      for (const [shipType, count] of Object.entries(fleet.squadrons.shipTypeBreakdown)) {
        this.shipTypeMap[shipType] = (this.shipTypeMap[shipType] ?? 0) + (count as number);
      }
    }

    // Calculate average coherence weighted by fleet size
    const armadaCoherence = stats.totalShips > 0 ? stats.weightedCoherence / stats.totalShips : 0;

    // PERF: Dirty tracking - skip update if nothing changed
    const currentHash = stats.totalShips + stats.totalCrew * 100 + Math.floor(armadaCoherence * 1000);
    const lastHash = this.lastArmadaHash[armada.armadaId] ?? -1;
    if (currentHash === lastHash) return; // Skip update if unchanged
    this.lastArmadaHash[armada.armadaId] = currentHash;

    // PERF: Batch all component updates in single call
    // Use shipTypeMap directly without conversion
    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      fleets: {
        ...a.fleets,
        totalShips: stats.totalShips,
        totalCrew: stats.totalCrew,
      },
      strength: {
        ...a.strength,
        shipCount: stats.totalShips,
        effectiveCombatPower: stats.totalStrength,
      },
    }));
  }

  /**
   * Apply morale bonuses to armada strength
   * PERF: Uses bitwise logic for trend calculation
   */
  private applyDoctrineEffects(
    armadaEntity: EntityImpl,
    armada: ArmadaComponent
  ): void {
    // Morale bonuses affect armada strength
    const moraleBonus = armada.morale.average - 0.5; // -0.5 to +0.5 bonus

    // PERF: Only update if there's a bonus to apply
    if (moraleBonus === 0) return;

    // Apply bonus
    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      strength: {
        ...a.strength,
        effectiveCombatPower: a.strength.effectiveCombatPower * (1 + moraleBonus),
      },
    }));
  }

  /**
   * Update morale trend based on recent victories/defeats
   * PERF: Combines doctrine and morale updates to reduce component writes
   */
  private updateMorale(
    armadaEntity: EntityImpl,
    armada: ArmadaComponent
  ): void {
    const { recentVictories, recentDefeats } = armada.morale.factors;

    // PERF: Early exit if no morale change needed
    if (recentVictories === recentDefeats) {
      // Stable morale, no change needed
      return;
    }

    // Determine trend
    const trend: 'rising' | 'stable' | 'falling' =
      recentVictories > recentDefeats ? 'rising' :
      recentDefeats > recentVictories ? 'falling' :
      'stable';

    // Update morale based on trend
    const moraleChange =
      trend === 'rising' ? 0.01 :  // +1% per update
      trend === 'falling' ? -0.01 : // -1% per update
      0;

    // PERF: Only update if morale actually changes
    if (moraleChange === 0) return;

    const newMorale = Math.max(0, Math.min(1, armada.morale.average + moraleChange));

    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      morale: {
        ...a.morale,
        average: newMorale,
        trend,
      },
    }));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a fleet to an armada
 */
export function addFleetToArmada(
  world: World,
  armadaId: string,
  fleetId: string
): { success: boolean; reason?: string } {
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

  const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
  if (!armada) {
    return { success: false, reason: 'Entity is not an armada' };
  }

  if (armada.fleets.fleetIds.length >= 10) {
    return { success: false, reason: 'Armada already has maximum 10 fleets' };
  }

  if (armada.fleets.fleetIds.includes(fleetId)) {
    return { success: false, reason: 'Fleet already in armada' };
  }

  // Add fleet to armada
  const impl = armadaEntity as EntityImpl;
  impl.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
    ...a,
    fleets: {
      ...a.fleets,
      fleetIds: [...a.fleets.fleetIds, fleetId],
    },
  }));

  // Emit event
  world.eventBus.emit({
    type: 'armada:fleet_joined',
    source: armadaEntity.id,
    data: {
      armadaId: armada.armadaId,
      fleetId,
    },
  });

  return { success: true };
}

/**
 * Remove a fleet from an armada
 */
export function removeFleetFromArmada(
  world: World,
  armadaId: string,
  fleetId: string
): { success: boolean; reason?: string } {
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

  const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
  if (!armada) {
    return { success: false, reason: 'Entity is not an armada' };
  }

  if (!armada.fleets.fleetIds.includes(fleetId)) {
    return { success: false, reason: 'Fleet not in armada' };
  }

  // Cannot remove flagship fleet
  if (fleetId === armada.flagshipFleetId) {
    return { success: false, reason: 'Cannot remove flagship fleet from armada' };
  }

  // Remove fleet from armada
  const impl = armadaEntity as EntityImpl;
  impl.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
    ...a,
    fleets: {
      ...a.fleets,
      fleetIds: a.fleets.fleetIds.filter((id: string) => id !== fleetId),
    },
  }));

  // If armada now has < 3 fleets, emit disbanding warning
  if (armada.fleets.fleetIds.length < 3) {
    world.eventBus.emit({
      type: 'armada:disbanding',
      source: armadaEntity.id,
      data: {
        armadaId: armada.armadaId,
        reason: 'too_few_fleets',
        remainingFleets: armada.fleets.fleetIds.length - 1,
      },
    });
  }

  // Emit fleet left event
  world.eventBus.emit({
    type: 'armada:fleet_left',
    source: armadaEntity.id,
    data: {
      armadaId: armada.armadaId,
      fleetId,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: ArmadaSystem | null = null;

export function getArmadaSystem(): ArmadaSystem {
  if (!systemInstance) {
    systemInstance = new ArmadaSystem();
  }
  return systemInstance;
}
