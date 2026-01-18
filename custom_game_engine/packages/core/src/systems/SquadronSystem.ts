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
  // Only run when squadron components exist (O(1) activation check)
  public readonly activationComponents = ['squadron'] as const;
  public readonly metadata = {
    category: 'infrastructure',
    description: 'Manages tactical ship squadrons and formations',
    dependsOn: ['emotional_navigation' as SystemId],
    writesComponents: [CT.Squadron] as const,
  } as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  // ========================================================================
  // Performance Optimizations - Reusable Objects
  // ========================================================================

  /**
   * Ship entity cache - prevents repeated world.getEntity() calls
   * Rebuilt each update cycle with only the ships we need
   */
  private shipEntityCache: Map<string, EntityImpl | null> = new Map();

  /**
   * Reusable stats object - avoids allocation on every squadron update
   * Reset before each use
   */
  private workingStats = {
    totalCrew: 0,
    weightedCoherence: 0,
    combatStrength: 0,
  };

  /**
   * Reusable ship type map - avoids creating new Record<> every update
   * Cleared and reused instead of creating new object
   */
  private shipTypeMap: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Performance: Pre-cache all ship entities needed this tick
    // This prevents O(n) world.getEntity() calls inside the squadron loop
    this.rebuildShipCache(ctx.world, ctx.activeEntities);

    // Process each squadron
    for (const squadronEntity of ctx.activeEntities) {
      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      // Performance: Early exit for empty squadrons
      if (squadron.shipIds.length === 0) continue;

      // Update squadron aggregate stats
      this.updateSquadronStats(ctx.world, squadronEntity as EntityImpl, squadron, tick);

      // Check for formation bonuses (pure computation, no DOM or allocations)
      this.applyFormationEffects(squadron);
    }
  }

  /**
   * Build cache of all ship entities referenced by active squadrons
   * This prevents repeated world.getEntity() lookups in the hot path
   */
  private rebuildShipCache(world: World, squadrons: ReadonlyArray<EntityImpl>): void {
    this.shipEntityCache.clear();

    // Collect all unique ship IDs from all squadrons
    for (const squadronEntity of squadrons) {
      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      for (const shipId of squadron.shipIds) {
        // Only lookup each ship once, even if it appears in multiple squadrons
        if (!this.shipEntityCache.has(shipId)) {
          const entity = world.getEntity(shipId);
          this.shipEntityCache.set(shipId, entity as EntityImpl | null);
        }
      }
    }
  }

  /**
   * Reset reusable stats object to zero
   * Performance: Avoids object allocation in hot path
   */
  private resetWorkingStats(): void {
    this.workingStats.totalCrew = 0;
    this.workingStats.weightedCoherence = 0;
    this.workingStats.combatStrength = 0;
  }

  /**
   * Update squadron aggregate statistics from member ships
   * Performance optimizations:
   * - Uses cached ship entities (no repeated world.getEntity())
   * - Reuses workingStats object (no allocation)
   * - Reuses shipTypeMap (no Record<> creation)
   * - Single component update at end (batched write)
   */
  private updateSquadronStats(
    world: World,
    squadronEntity: EntityImpl,
    squadron: SquadronComponent,
    tick: number
  ): void {
    // Performance: Reset reusable objects instead of allocating new ones
    this.resetWorkingStats();
    this.shipTypeMap.clear();

    // Gather stats from all ships using cached entities
    for (const shipId of squadron.shipIds) {
      // Performance: Use cached entity lookup instead of world.getEntity()
      const shipEntity = this.shipEntityCache.get(shipId);
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
      this.workingStats.totalCrew += crewCount;

      // Weight coherence by crew size
      this.workingStats.weightedCoherence += ship.crew.coherence * crewCount;

      // Combat strength (simplified: based on hull mass and integrity)
      this.workingStats.combatStrength += ship.hull.mass * ship.hull.integrity;

      // Track ship types - Performance: Use Map for O(1) lookups
      const shipType = ship.ship_type;
      this.shipTypeMap.set(shipType, (this.shipTypeMap.get(shipType) || 0) + 1);
    }

    // Calculate average coherence weighted by crew size
    const averageCoherence = this.workingStats.totalCrew > 0
      ? this.workingStats.weightedCoherence / this.workingStats.totalCrew
      : 0;

    // Convert Map to Record for component storage
    const shipTypeBreakdown: Record<string, number> = {};
    for (const [type, count] of this.shipTypeMap) {
      shipTypeBreakdown[type] = count;
    }

    // Performance: Single batched component update (not multiple writes)
    squadronEntity.updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
      ...s,
      totalCrew: this.workingStats.totalCrew,
      averageCoherence,
      combatStrength: this.workingStats.combatStrength,
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
 * Performance: Query done once before loop, array mutated efficiently
 */
export function addShipToSquadron(
  world: World,
  squadronId: string,
  shipId: string
): { success: boolean; reason?: string } {
  // Performance: Cache query results before processing
  const squadronEntities = world.query()
    .with(CT.Squadron)
    .executeEntities();

  const squadronEntity = squadronEntities.find(e => {
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

  // Performance: Early returns for validation
  if (squadron.shipIds.length >= 10) {
    return { success: false, reason: 'Squadron already has maximum 10 ships' };
  }

  if (squadron.shipIds.includes(shipId)) {
    return { success: false, reason: 'Ship already in squadron' };
  }

  // Add ship to squadron
  const impl = squadronEntity as EntityImpl;
  // Performance: Create new array once (spread is ok here - not in hot loop)
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
 * Performance: Query done once before loop
 */
export function removeShipFromSquadron(
  world: World,
  squadronId: string,
  shipId: string
): { success: boolean; reason?: string } {
  // Performance: Cache query results before processing
  const squadronEntities = world.query()
    .with(CT.Squadron)
    .executeEntities();

  const squadronEntity = squadronEntities.find(e => {
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

  // Performance: Early returns for validation
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
