/**
 * SquadronCombatSystem - Tactical combat between squadrons with formation-based mechanics
 *
 * This system handles:
 * - Formation-based rock-paper-scissors combat (per spec line 1159-1188)
 * - Simplified Lanchester mechanics for squadron battles
 * - Ship destruction and casualty tracking
 * - Combat events emission
 *
 * Priority: 610 (after FleetCombatSystem at 600)
 *
 * Formation Advantages (rock-paper-scissors):
 * - line_ahead beats scattered (+10% firepower)
 * - line_abreast beats line_ahead (+10% defense)
 * - wedge beats line_abreast (+20% focus fire)
 * - sphere beats wedge (+20% flagship defense)
 * - echelon beats sphere (+15% flanking)
 * - scattered has no advantages (+5% speed for escape only)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SquadronComponent, SquadronFormation } from '../components/SquadronComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import { getFormationModifiers } from './SquadronSystem.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Squadron combat interface per spec (line 477-505)
 */
export interface SquadronCombat {
  squadron1Id: string;
  squadron2Id: string;
  formation1Bonus: number;
  formation2Bonus: number;
  totalFirepower1: number;
  totalFirepower2: number;
  shipsDestroyed1: string[]; // Entity IDs
  shipsDestroyed2: string[];
  victor?: string;
}

/**
 * Active combat engagement tracking
 */
interface CombatEngagement {
  squadron1EntityId: string;
  squadron2EntityId: string;
  startTick: number;
  duration: number; // Ticks
  currentTick: number;
}

// ============================================================================
// Formation Advantage Table
// ============================================================================

/**
 * Formation advantage matrix per spec (line 1163-1169)
 *
 * Returns the bonus that formation1 gets against formation2
 * Based on rock-paper-scissors mechanics:
 * - line_ahead beats scattered (+10% firepower)
 * - line_abreast beats line_ahead (+10% defense)
 * - wedge beats line_abreast (+20% focus fire)
 * - sphere beats wedge (+20% flagship defense)
 * - echelon beats sphere (+15% flanking)
 * - scattered has no advantages
 */
const FORMATION_ADVANTAGES: Partial<Record<SquadronFormation, Partial<Record<SquadronFormation, number>>>> = {
  line_ahead: {
    scattered: 0.10, // Organized line beats chaos
  },
  line_abreast: {
    line_ahead: 0.10, // Wide front counters line
  },
  wedge: {
    line_abreast: 0.20, // Focus fire pierces wide formation
  },
  sphere: {
    wedge: 0.20, // Defensive ball absorbs focused attack
  },
  echelon: {
    sphere: 0.15, // Flanking attacks defensive ball from side
  },
  scattered: {
    // Scattered has no combat advantages (only +5% speed for escape, handled elsewhere)
  },
};

// ============================================================================
// System
// ============================================================================

export class SquadronCombatSystem extends BaseSystem {
  public readonly id: SystemId = 'squadron_combat' as SystemId;
  public readonly priority: number = 610;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [] as const; // Event-driven
  public readonly metadata = {
    category: 'combat',
    description: 'Handles tactical combat between squadrons with formation-based mechanics',
    dependsOn: ['squadron_management' as SystemId],
    writesComponents: [CT.Squadron, CT.Spaceship] as const,
  } as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  // ========================================================================
  // Performance Optimizations - Active Combat Tracking
  // ========================================================================

  /**
   * Active squadron engagements - uses object literal for O(1) access
   * Key: "squadron1Id:squadron2Id"
   * PERF: Object literals are faster than Maps for string keys
   */
  private activeEngagements: Record<string, CombatEngagement> = Object.create(null);

  // ========================================================================
  // Performance Optimizations - Reusable Objects
  // ========================================================================

  /**
   * Reusable combat result object - avoids allocation on every combat resolution
   */
  private workingCombatResult: SquadronCombat = {
    squadron1Id: '',
    squadron2Id: '',
    formation1Bonus: 0,
    formation2Bonus: 0,
    totalFirepower1: 0,
    totalFirepower2: 0,
    shipsDestroyed1: [],
    shipsDestroyed2: [],
    victor: undefined,
  };

  // GC: Pre-allocated arrays for ship selection
  private workingShipHealths: Array<{ shipId: string; integrity: number }> = [];
  private workingDestroyedShips: string[] = [];
  private workingRemainingShips: string[] = [];

  protected onUpdate(ctx: SystemContext): void {
    // This system is primarily event-driven
    // Process any active engagements
    this.processActiveEngagements(ctx.world, ctx.tick);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Initiate squadron combat engagement
   *
   * Per spec (line 1171-1188):
   * - Formation advantages apply (rock-paper-scissors)
   * - Wedge beats line_abreast: +20% firepower
   * - Simplified Lanchester mechanics for resolution
   */
  public startCombat(
    world: World,
    squadron1EntityId: string,
    squadron2EntityId: string,
    duration: number = 100 // Default 5 seconds at 20 TPS
  ): void {
    const squadron1Entity = world.getEntity(squadron1EntityId) as EntityImpl | null;
    const squadron2Entity = world.getEntity(squadron2EntityId) as EntityImpl | null;

    if (!squadron1Entity || !squadron2Entity) {
      throw new Error('Both squadron entities must exist');
    }

    const squadron1 = squadron1Entity.getComponent<SquadronComponent>(CT.Squadron);
    const squadron2 = squadron2Entity.getComponent<SquadronComponent>(CT.Squadron);

    if (!squadron1 || !squadron2) {
      throw new Error('Both entities must have Squadron components');
    }

    // Create engagement key
    const engagementKey = this.getEngagementKey(squadron1.squadronId, squadron2.squadronId);

    // Add to active engagements
    this.activeEngagements[engagementKey] = {
      squadron1EntityId,
      squadron2EntityId,
      startTick: world.tick,
      duration,
      currentTick: 0,
    };

    // Emit combat started event
    world.eventBus.emit({
      type: 'squadron:combat_started',
      source: squadron1EntityId,
      data: {
        squadronId1: squadron1.squadronId,
        squadronId2: squadron2.squadronId,
        formation1: squadron1.formation,
        formation2: squadron2.formation,
      },
    });
  }

  /**
   * Resolve squadron combat using formation bonuses and simplified Lanchester mechanics
   *
   * Per spec (line 1171-1188):
   * - Calculate formation advantages based on matchup
   * - Apply firepower with formation bonuses
   * - Use simplified Lanchester (not full differential equations)
   * - Track ships destroyed on each side
   * - Determine victor
   */
  public resolveCombat(
    world: World,
    squadron1EntityId: string,
    squadron2EntityId: string,
    duration: number = 100
  ): SquadronCombat {
    const squadron1Entity = world.getEntity(squadron1EntityId) as EntityImpl | null;
    const squadron2Entity = world.getEntity(squadron2EntityId) as EntityImpl | null;

    if (!squadron1Entity || !squadron2Entity) {
      throw new Error('Both squadron entities must exist');
    }

    const squadron1 = squadron1Entity.getComponent<SquadronComponent>(CT.Squadron);
    const squadron2 = squadron2Entity.getComponent<SquadronComponent>(CT.Squadron);

    if (!squadron1 || !squadron2) {
      throw new Error('Both entities must have Squadron components');
    }

    // Initial ship counts
    let N = squadron1.ships.shipIds.length;
    let M = squadron2.ships.shipIds.length;

    // Base firepower per ship
    const alphaBase = squadron1.combat.totalFirepower / N;
    const betaBase = squadron2.combat.totalFirepower / M;

    // Formation modifiers (strength bonuses from formation type)
    const formation1Mods = getFormationModifiers(squadron1.formation);
    const formation2Mods = getFormationModifiers(squadron2.formation);

    // Tactical formation advantages (rock-paper-scissors)
    const tacticalBonus1 = this.getFormationAdvantage(squadron1.formation, squadron2.formation);
    const tacticalBonus2 = this.getFormationAdvantage(squadron2.formation, squadron1.formation);

    // Total formation bonuses: base strength modifier + tactical advantage
    const formationBonus1 = formation1Mods.strengthBonus + tacticalBonus1;
    const formationBonus2 = formation2Mods.strengthBonus + tacticalBonus2;

    // Effective firepower with formation bonuses
    const alpha = alphaBase * (1 + formationBonus1);
    const beta = betaBase * (1 + formationBonus2);

    // Simplified Lanchester mechanics
    // Per spec: "Losses (per Lanchester): Squadron loses X * 0.1 ships worth of damage"
    for (let tick = 0; tick < duration; tick++) {
      // Lanchester's Square Law (simplified)
      const dN = -beta * M * 0.01; // 0.01 = damage rate per tick
      const dM = -alpha * N * 0.01;

      N += dN;
      M += dM;

      // Stop if one side destroyed
      if (N <= 0 || M <= 0) break;
    }

    // Calculate results
    const squadron1Remaining = Math.max(0, N);
    const squadron2Remaining = Math.max(0, M);
    const shipsLost1 = squadron1.ships.shipIds.length - Math.ceil(squadron1Remaining);
    const shipsLost2 = squadron2.ships.shipIds.length - Math.ceil(squadron2Remaining);

    // Determine which ships were destroyed
    const shipsDestroyed1 = this.selectDestroyedShips(world, squadron1, shipsLost1);
    const shipsDestroyed2 = this.selectDestroyedShips(world, squadron2, shipsLost2);

    // Determine victor
    const victor = squadron1Remaining > squadron2Remaining
      ? squadron1.squadronId
      : squadron2.squadronId;

    // Reuse working object to avoid allocation
    this.workingCombatResult.squadron1Id = squadron1.squadronId;
    this.workingCombatResult.squadron2Id = squadron2.squadronId;
    this.workingCombatResult.formation1Bonus = formationBonus1;
    this.workingCombatResult.formation2Bonus = formationBonus2;
    this.workingCombatResult.totalFirepower1 = squadron1.combat.totalFirepower;
    this.workingCombatResult.totalFirepower2 = squadron2.combat.totalFirepower;
    this.workingCombatResult.shipsDestroyed1 = shipsDestroyed1;
    this.workingCombatResult.shipsDestroyed2 = shipsDestroyed2;
    this.workingCombatResult.victor = victor;

    // Emit ship destroyed events
    for (const shipId of shipsDestroyed1) {
      world.eventBus.emit({
        type: 'squadron:ship_destroyed',
        source: squadron1EntityId,
        data: {
          squadronId: squadron1.squadronId,
          shipId,
          destroyedBy: squadron2.squadronId,
        },
      });
    }

    for (const shipId of shipsDestroyed2) {
      world.eventBus.emit({
        type: 'squadron:ship_destroyed',
        source: squadron2EntityId,
        data: {
          squadronId: squadron2.squadronId,
          shipId,
          destroyedBy: squadron1.squadronId,
        },
      });
    }

    // Emit combat resolved event
    world.eventBus.emit({
      type: 'squadron:combat_resolved',
      source: squadron1EntityId,
      data: {
        squadronId1: squadron1.squadronId,
        squadronId2: squadron2.squadronId,
        victor,
        squadron1Remaining: Math.ceil(squadron1Remaining),
        squadron2Remaining: Math.ceil(squadron2Remaining),
        shipsLost1,
        shipsLost2,
      },
    });

    // Update squadron components with losses
    this.applyBattleDamage(world, squadron1Entity, squadron1, shipsDestroyed1);
    this.applyBattleDamage(world, squadron2Entity, squadron2, shipsDestroyed2);

    // Return copy of result to avoid mutation
    return { ...this.workingCombatResult };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Get formation advantage based on rock-paper-scissors matchup
   * Per spec (line 1163-1169)
   */
  private getFormationAdvantage(
    formation1: SquadronFormation,
    formation2: SquadronFormation
  ): number {
    return FORMATION_ADVANTAGES[formation1]?.[formation2] || 0;
  }

  /**
   * Select which ships are destroyed based on damage taken
   * Prioritizes ships with lowest hull integrity first
   * GC: Uses pre-allocated arrays to avoid allocations
   */
  private selectDestroyedShips(
    world: World,
    squadron: SquadronComponent,
    shipsToDestroy: number
  ): string[] {
    if (shipsToDestroy <= 0) return [];

    // GC: Clear and reuse pre-allocated array
    this.workingShipHealths.length = 0;

    for (const shipId of squadron.ships.shipIds) {
      const shipEntity = world.getEntity(shipId);
      if (!shipEntity) continue;

      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      this.workingShipHealths.push({
        shipId,
        integrity: ship.hull.integrity,
      });
    }

    // Sort by integrity (weakest first) - in-place sort, no allocation
    this.workingShipHealths.sort((a, b) => a.integrity - b.integrity);

    // GC: Clear and reuse destroyed ships array
    this.workingDestroyedShips.length = 0;
    const count = Math.min(shipsToDestroy, this.workingShipHealths.length);
    for (let i = 0; i < count; i++) {
      this.workingDestroyedShips.push(this.workingShipHealths[i]!.shipId);
    }

    return this.workingDestroyedShips;
  }

  /**
   * Apply battle damage to squadron by removing destroyed ships
   * GC: Uses pre-allocated array for remaining ships
   */
  private applyBattleDamage(
    world: World,
    squadronEntity: EntityImpl,
    squadron: SquadronComponent,
    destroyedShips: string[]
  ): void {
    if (destroyedShips.length === 0) return;

    // GC: Build destroyed set for O(1) lookup (uses object literal)
    const destroyedSet: Record<string, boolean> = Object.create(null);
    for (const shipId of destroyedShips) {
      destroyedSet[shipId] = true;
    }

    // GC: Clear and reuse pre-allocated array
    this.workingRemainingShips.length = 0;
    for (const shipId of squadron.ships.shipIds) {
      if (!(shipId in destroyedSet)) {
        this.workingRemainingShips.push(shipId);
      }
    }
    const remainingShips = this.workingRemainingShips;

    // Update squadron component
    squadronEntity.updateComponent<SquadronComponent>(CT.Squadron, (s) => ({
      ...s,
      ships: {
        ...s.ships,
        shipIds: remainingShips,
      },
    }));

    // Mark destroyed ships as destroyed
    for (const shipId of destroyedShips) {
      const shipEntity = world.getEntity(shipId) as EntityImpl | null;
      if (!shipEntity) continue;

      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      // Update ship hull integrity to 0
      shipEntity.updateComponent<SpaceshipComponent>(CT.Spaceship, (sp) => ({
        ...sp,
        hull: {
          ...sp.hull,
          integrity: 0,
        },
        status: 'destroyed',
      }));

      // Emit ship destroyed event
      world.eventBus.emit({
        type: 'ship:destroyed',
        source: shipEntity.id,
        data: {
          shipId,
          shipName: ship.name,
          destroyedBy: 'squadron_combat',
        },
      });
    }
  }

  /**
   * Process active combat engagements each tick
   */
  private processActiveEngagements(world: World, tick: number): void {
    // PERF: Use for-in for object literal iteration
    for (const key in this.activeEngagements) {
      const engagement = this.activeEngagements[key];
      if (!engagement) continue;

      engagement.currentTick = tick - engagement.startTick;

      // Check if engagement is complete
      if (engagement.currentTick >= engagement.duration) {
        // Resolve combat
        this.resolveCombat(
          world,
          engagement.squadron1EntityId,
          engagement.squadron2EntityId,
          engagement.duration
        );

        // Remove from active engagements
        delete this.activeEngagements[key];
      }
    }
  }

  /**
   * Generate engagement key for tracking
   * PERF: Simple string concatenation (faster than object creation)
   */
  private getEngagementKey(squadron1Id: string, squadron2Id: string): string {
    // Sort IDs to ensure same key regardless of order
    return squadron1Id < squadron2Id
      ? `${squadron1Id}:${squadron2Id}`
      : `${squadron2Id}:${squadron1Id}`;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate formation advantage for a specific matchup
 * Public helper for other systems to use
 */
export function calculateFormationAdvantage(
  formation1: SquadronFormation,
  formation2: SquadronFormation
): number {
  return FORMATION_ADVANTAGES[formation1]?.[formation2] || 0;
}

/**
 * Get all formation advantages for a given formation
 * Returns object of formation -> bonus mappings
 */
export function getFormationAdvantages(
  formation: SquadronFormation
): Partial<Record<SquadronFormation, number>> {
  return FORMATION_ADVANTAGES[formation] || {};
}

/**
 * Check if formation1 has advantage over formation2
 */
export function hasFormationAdvantage(
  formation1: SquadronFormation,
  formation2: SquadronFormation
): boolean {
  return (FORMATION_ADVANTAGES[formation1]?.[formation2] || 0) > 0;
}

/**
 * Get the best counter-formation to defeat a given formation
 */
export function getCounterFormation(formation: SquadronFormation): SquadronFormation | null {
  // Find formation that has advantage over input formation
  for (const counterFormation in FORMATION_ADVANTAGES) {
    const advantages = FORMATION_ADVANTAGES[counterFormation as SquadronFormation];
    if (advantages && advantages[formation]) {
      return counterFormation as SquadronFormation;
    }
  }
  return null;
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: SquadronCombatSystem | null = null;

export function getSquadronCombatSystem(): SquadronCombatSystem {
  if (!systemInstance) {
    systemInstance = new SquadronCombatSystem();
  }
  return systemInstance;
}
