/**
 * SquadronSystem - Manages tactical ship squadrons
 *
 * This system handles:
 * - Squadron aggregate statistics (crew, coherence, strength)
 * - Formation bonuses
 * - Ship joining/leaving squadrons
 * - Squadron mission tracking
 *
 * Priority: 85 (after EmotionalNavigationSystem at 150, before ship-level combat)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { SpaceshipComponent, SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System
// ============================================================================

export class SquadronSystem extends BaseSystem {
  public readonly id: SystemId = 'squadron_management' as SystemId;
  public readonly priority: number = 85;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Squadron];
  public readonly metadata = {
    category: 'infrastructure',
    description: 'Manages tactical ship squadrons and formations',
    dependsOn: ['emotional_navigation' as SystemId],
    writesComponents: [CT.Squadron] as const,
  } as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each squadron
    for (const squadronEntity of ctx.activeEntities) {
      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      // Update squadron aggregate stats
      this.updateSquadronStats(ctx.world, squadronEntity as EntityImpl, squadron, tick);

      // Check for formation bonuses
      this.applyFormationEffects(squadron);
    }
  }

  /**
   * Update squadron aggregate statistics from member ships
   */
  private updateSquadronStats(
    world: World,
    squadronEntity: EntityImpl,
    squadron: SquadronComponent,
    tick: number
  ): void {
    let totalCrew = 0;
    let weightedCoherence = 0;
    let combatStrength = 0;
    const shipTypeBreakdown: Record<string, number> = {};

    // Gather stats from all ships
    for (const shipId of squadron.shipIds) {
      const shipEntity = world.getEntity(shipId);
      if (!shipEntity) {
        // Ship missing - emit warning
        world.eventBus.emit({
          type: 'squadron:ship_missing',
          source: squadronEntity.id,
          data: {
            squadronId: squadron.squadronId,
            missingShipId: shipId,
          },
        });
        continue;
      }

      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      const crewCount = ship.crew.member_ids.length;
      totalCrew += crewCount;

      // Weight coherence by crew size
      weightedCoherence += ship.crew.coherence * crewCount;

      // Combat strength (simplified: based on hull mass and integrity)
      combatStrength += ship.hull.mass * ship.hull.integrity;

      // Track ship types
      const shipType = ship.ship_type;
      shipTypeBreakdown[shipType] = (shipTypeBreakdown[shipType] || 0) + 1;
    }

    // Calculate average coherence weighted by crew size
    const averageCoherence = totalCrew > 0 ? weightedCoherence / totalCrew : 0;

    // Update squadron component
    squadronEntity.updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
      ...s,
      totalCrew,
      averageCoherence,
      combatStrength,
      shipTypeBreakdown: shipTypeBreakdown as Record<SpaceshipType, number>,
    }));
  }

  /**
   * Apply formation bonuses to squadron
   */
  private applyFormationEffects(squadron: SquadronComponent): void {
    // Formation bonuses affect squadron coherence and combat strength
    // These are passive effects tracked in the component

    let coherenceBonus = 0;
    let strengthBonus = 0;

    switch (squadron.formation) {
      case 'wedge':
        // Wedge formation: +5% coherence, +10% strength (focus fire)
        coherenceBonus = 0.05;
        strengthBonus = 0.10;
        break;

      case 'sphere':
        // Sphere formation: +10% coherence (tight formation), -5% strength
        coherenceBonus = 0.10;
        strengthBonus = -0.05;
        break;

      case 'line':
        // Line formation: +2% coherence (organized)
        coherenceBonus = 0.02;
        break;

      case 'scattered':
        // Scattered: No bonuses, each ship independent
        break;
    }

    // Note: Bonuses would be applied during β-navigation or combat
    // For now, we just track formation in the component
    // Future systems can read squadron.formation and apply these modifiers
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate formation bonus for coherence
 */
export function getFormationCoherenceBonus(formation: SquadronComponent['formation']): number {
  switch (formation) {
    case 'wedge':
      return 0.05;
    case 'sphere':
      return 0.10;
    case 'line':
      return 0.02;
    case 'scattered':
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate formation bonus for combat strength
 */
export function getFormationStrengthBonus(formation: SquadronComponent['formation']): number {
  switch (formation) {
    case 'wedge':
      return 0.10; // Focus fire
    case 'sphere':
      return -0.05; // Defensive posture
    case 'line':
      return 0;
    case 'scattered':
      return 0;
    default:
      return 0;
  }
}

/**
 * Add a ship to a squadron
 */
export function addShipToSquadron(
  world: World,
  squadronId: string,
  shipId: string
): { success: boolean; reason?: string } {
  const squadronEntity = world.query()
    .with(CT.Squadron)
    .executeEntities()
    .find(e => {
      const s = e.getComponent<SquadronComponent>(CT.Squadron);
      return s?.squadronId === squadronId;
    });

  if (!squadronEntity) {
    return { success: false, reason: 'Squadron not found' };
  }

  const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
  if (!squadron) {
    return { success: false, reason: 'Entity is not a squadron' };
  }

  if (squadron.shipIds.length >= 10) {
    return { success: false, reason: 'Squadron already has maximum 10 ships' };
  }

  if (squadron.shipIds.includes(shipId)) {
    return { success: false, reason: 'Ship already in squadron' };
  }

  // Add ship to squadron
  const impl = squadronEntity as EntityImpl;
  impl.updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
    ...s,
    shipIds: [...s.shipIds, shipId],
  }));

  // Emit event
  world.eventBus.emit({
    type: 'squadron:ship_joined',
    source: squadronEntity.id,
    data: {
      squadronId: squadron.squadronId,
      shipId,
    },
  });

  return { success: true };
}

/**
 * Remove a ship from a squadron
 */
export function removeShipFromSquadron(
  world: World,
  squadronId: string,
  shipId: string
): { success: boolean; reason?: string } {
  const squadronEntity = world.query()
    .with(CT.Squadron)
    .executeEntities()
    .find(e => {
      const s = e.getComponent<SquadronComponent>(CT.Squadron);
      return s?.squadronId === squadronId;
    });

  if (!squadronEntity) {
    return { success: false, reason: 'Squadron not found' };
  }

  const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
  if (!squadron) {
    return { success: false, reason: 'Entity is not a squadron' };
  }

  if (!squadron.shipIds.includes(shipId)) {
    return { success: false, reason: 'Ship not in squadron' };
  }

  // Cannot remove flagship
  if (shipId === squadron.flagshipId) {
    return { success: false, reason: 'Cannot remove flagship from squadron' };
  }

  // Remove ship from squadron
  const impl = squadronEntity as EntityImpl;
  impl.updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
    ...s,
    shipIds: s.shipIds.filter(id => id !== shipId),
  }));

  // If squadron now has < 3 ships, emit disbanding warning
  if (squadron.shipIds.length < 3) {
    world.eventBus.emit({
      type: 'squadron:disbanding',
      source: squadronEntity.id,
      data: {
        squadronId: squadron.squadronId,
        reason: 'too_few_ships',
        remainingShips: squadron.shipIds.length - 1,
      },
    });
  }

  // Emit ship left event
  world.eventBus.emit({
    type: 'squadron:ship_left',
    source: squadronEntity.id,
    data: {
      squadronId: squadron.squadronId,
      shipId,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: SquadronSystem | null = null;

export function getSquadronSystem(): SquadronSystem {
  if (!systemInstance) {
    systemInstance = new SquadronSystem();
  }
  return systemInstance;
}
