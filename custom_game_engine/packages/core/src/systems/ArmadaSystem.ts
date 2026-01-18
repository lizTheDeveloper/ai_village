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
import type { ArmadaComponent, ArmadaDoctrine } from '../components/ArmadaComponent.js';
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

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each armada
    for (const armadaEntity of ctx.activeEntities) {
      const armada = armadaEntity.getComponent<ArmadaComponent>(CT.Armada);
      if (!armada) continue;

      // Update armada aggregate stats
      this.updateArmadaStats(ctx.world, armadaEntity as EntityImpl, armada, tick);

      // Apply doctrine bonuses
      this.applyDoctrineEffects(armadaEntity as EntityImpl, armada);

      // Update morale trend
      this.updateMorale(armadaEntity as EntityImpl, armada);
    }
  }

  /**
   * Update armada aggregate statistics from member fleets
   */
  private updateArmadaStats(
    world: World,
    armadaEntity: EntityImpl,
    armada: ArmadaComponent,
    tick: number
  ): void {
    let totalShips = 0;
    let totalCrew = 0;
    let weightedCoherence = 0;
    let totalStrength = 0;
    const shipTypeBreakdown: Record<string, number> = {};

    // Gather stats from all fleets
    for (const fleetId of armada.fleetIds) {
      const fleetEntity = world.getEntity(fleetId);
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

      totalShips += fleet.totalShips;
      totalCrew += fleet.totalCrew;

      // Weight coherence by fleet size
      weightedCoherence += fleet.fleetCoherence * fleet.totalShips;

      // Sum combat strength
      totalStrength += fleet.fleetStrength;

      // Aggregate ship types
      for (const [shipType, count] of Object.entries(fleet.shipTypeBreakdown)) {
        shipTypeBreakdown[shipType] = (shipTypeBreakdown[shipType] || 0) + count;
      }
    }

    // Calculate average coherence weighted by fleet size
    const armadaCoherence = totalShips > 0 ? weightedCoherence / totalShips : 0;

    // Update armada component
    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      totalShips,
      totalCrew,
      armadaCoherence,
      armadaStrength: totalStrength,
      shipTypeBreakdown: shipTypeBreakdown as Record<SpaceshipType, number>,
    }));
  }

  /**
   * Apply doctrine bonuses to armada strength
   */
  private applyDoctrineEffects(
    armadaEntity: EntityImpl,
    armada: ArmadaComponent
  ): void {
    // Doctrine bonuses affect armada strength
    const doctrineBonus = getDoctrineStrengthBonus(armada.doctrine);

    // Apply bonus
    armadaEntity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
      ...a,
      armadaStrength: a.armadaStrength * (1 + doctrineBonus),
    }));
  }

  /**
   * Update morale trend based on recent victories/defeats
   */
  private updateMorale(
    armadaEntity: EntityImpl,
    armada: ArmadaComponent
  ): void {
    const { recentVictories, recentDefeats } = armada.morale;

    // Determine trend
    let trend: 'rising' | 'stable' | 'falling';
    if (recentVictories > recentDefeats) {
      trend = 'rising';
    } else if (recentDefeats > recentVictories) {
      trend = 'falling';
    } else {
      trend = 'stable';
    }

    // Update morale based on trend
    let moraleChange = 0;
    if (trend === 'rising') {
      moraleChange = 0.01; // +1% per update
    } else if (trend === 'falling') {
      moraleChange = -0.01; // -1% per update
    }

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
 * Calculate doctrine bonus for armada strength
 */
export function getDoctrineStrengthBonus(doctrine: ArmadaDoctrine): number {
  switch (doctrine) {
    case 'aggressive':
      return 0.15; // +15% strength in offensive operations
    case 'defensive':
      return 0.10; // +10% strength in defensive operations
    case 'balanced':
      return 0.05; // +5% general strength
    case 'raider':
      return 0.08; // +8% strength, specializes in hit-and-run
    default:
      return 0;
  }
}

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

  if (armada.fleetIds.length >= 10) {
    return { success: false, reason: 'Armada already has maximum 10 fleets' };
  }

  if (armada.fleetIds.includes(fleetId)) {
    return { success: false, reason: 'Fleet already in armada' };
  }

  // Add fleet to armada
  const impl = armadaEntity as EntityImpl;
  impl.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
    ...a,
    fleetIds: [...a.fleetIds, fleetId],
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

  if (!armada.fleetIds.includes(fleetId)) {
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
    fleetIds: a.fleetIds.filter(id => id !== fleetId),
  }));

  // If armada now has < 3 fleets, emit disbanding warning
  if (armada.fleetIds.length < 3) {
    world.eventBus.emit({
      type: 'armada:disbanding',
      source: armadaEntity.id,
      data: {
        armadaId: armada.armadaId,
        reason: 'too_few_fleets',
        remainingFleets: armada.fleetIds.length - 1,
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
