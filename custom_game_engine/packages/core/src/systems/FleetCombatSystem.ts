/**
 * FleetCombatSystem - Resolves fleet-scale combat using Lanchester's Laws
 *
 * This system handles:
 * - Fleet vs Fleet battles (Lanchester's Square Law)
 * - Squadron formation bonuses (rock-paper-scissors)
 * - Fleet coherence modifiers (+/-20% effectiveness)
 * - Ship destruction and fleet attrition
 *
 * Priority: 600 (combat phase)
 *
 * Per spec (line 680-744):
 * - dN/dt = -β * M (Fleet 1 losses from Fleet 2 firepower)
 * - dM/dt = -α * N (Fleet 2 losses from Fleet 1 firepower)
 * - High coherence = +20% offense, poor coherence = -20% offense
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SquadronComponent, SquadronFormation } from '../components/SquadronComponent.js';
import type { ArmadaComponent } from '../components/ArmadaComponent.js';
import { getFormationModifiers } from './SquadronSystem.js';

// ============================================================================
// Types
// ============================================================================

export interface FleetBattleResult {
  fleet1Remaining: number;
  fleet2Remaining: number;
  victor: string;
  shipsLost1: number;
  shipsLost2: number;
  duration: number;
}

export interface SquadronBattleResult {
  squadron1Remaining: number;
  squadron2Remaining: number;
  victor: string;
  shipsLost1: number;
  shipsLost2: number;
  formationBonus1: number;
  formationBonus2: number;
  formation1Mods?: {
    coherence: number;
    strength: number;
    speed: number;
    defense: number;
  };
  formation2Mods?: {
    coherence: number;
    strength: number;
    speed: number;
    defense: number;
  };
}

// ============================================================================
// System
// ============================================================================

export class FleetCombatSystem extends BaseSystem {
  public readonly id: SystemId = 'fleet_combat' as SystemId;
  public readonly priority: number = 600;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [] as const; // Event-driven, not tick-based
  public readonly metadata = {
    category: 'combat',
    description: 'Resolves fleet-scale combat using Lanchester\'s Laws',
    dependsOn: [],
    writesComponents: [CT.Fleet, CT.Squadron, CT.Armada] as const,
  } as const;

  protected readonly throttleInterval = 1; // Process every tick (event-driven)

  protected onUpdate(ctx: SystemContext): void {
    // This system is event-driven, not tick-based
    // Combat is initiated via events like 'fleet:battle_started'
    // For now, no automatic combat processing
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Resolve a fleet battle using Lanchester's Square Law
   *
   * Per spec (line 698-732):
   * - dN/dt = -β * M
   * - dM/dt = -α * N
   * - Coherence modifiers: high = +20%, poor = -20%
   */
  public resolveFleetBattle(
    world: World,
    fleet1Entity: EntityImpl,
    fleet2Entity: EntityImpl,
    duration: number // Ticks
  ): FleetBattleResult {
    const fleet1 = fleet1Entity.getComponent<FleetComponent>(CT.Fleet);
    const fleet2 = fleet2Entity.getComponent<FleetComponent>(CT.Fleet);

    if (!fleet1 || !fleet2) {
      throw new Error('Both entities must have Fleet components');
    }

    // Initial ship counts
    let N = fleet1.squadrons.totalShips;
    let M = fleet2.squadrons.totalShips;

    // Base firepower per ship (use fleet strength / ship count)
    const alpha = fleet1.combat.offensiveRating / fleet1.squadrons.totalShips;
    const beta = fleet2.combat.offensiveRating / fleet2.squadrons.totalShips;

    // Coherence modifiers
    const coherenceMod1 = this.getCoherenceModifier(fleet1.coherence.average);
    const coherenceMod2 = this.getCoherenceModifier(fleet2.coherence.average);

    // Effective firepower with coherence bonuses
    const alphaEffective = alpha * coherenceMod1;
    const betaEffective = beta * coherenceMod2;

    // Simulate battle over duration
    for (let tick = 0; tick < duration; tick++) {
      // Lanchester's Square Law
      const dN = -betaEffective * M;
      const dM = -alphaEffective * N;

      N += dN;
      M += dM;

      // Stop if one side destroyed
      if (N <= 0 || M <= 0) break;
    }

    // Calculate results
    const fleet1Remaining = Math.max(0, N);
    const fleet2Remaining = Math.max(0, M);
    const shipsLost1 = fleet1.squadrons.totalShips - fleet1Remaining;
    const shipsLost2 = fleet2.squadrons.totalShips - fleet2Remaining;
    const victor = fleet1Remaining > fleet2Remaining ? fleet1.fleetId : fleet2.fleetId;

    // Emit battle events
    world.eventBus.emit({
      type: 'fleet:battle_started',
      source: fleet1Entity.id,
      data: {
        fleetId1: fleet1.fleetId,
        fleetId2: fleet2.fleetId,
        initialShips1: fleet1.squadrons.totalShips,
        initialShips2: fleet2.squadrons.totalShips,
      },
    });

    world.eventBus.emit({
      type: 'fleet:battle_resolved',
      source: fleet1Entity.id,
      data: {
        fleetId1: fleet1.fleetId,
        fleetId2: fleet2.fleetId,
        victor,
        fleet1Remaining,
        fleet2Remaining,
        shipsLost1,
        shipsLost2,
        duration,
      },
    });

    // Update fleet components with losses
    fleet1Entity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      squadrons: {
        ...f.squadrons,
        totalShips: Math.floor(fleet1Remaining),
      },
      combat: {
        ...f.combat,
        combatHistory: {
          ...f.combat.combatHistory,
          battlesWon: f.combat.combatHistory.battlesWon + (victor === fleet1.fleetId ? 1 : 0),
          battlesLost: f.combat.combatHistory.battlesLost + (victor === fleet2.fleetId ? 1 : 0),
          shipsLost: f.combat.combatHistory.shipsLost + shipsLost1,
        },
      },
    }));

    fleet2Entity.updateComponent<FleetComponent>(CT.Fleet, (f) => ({
      ...f,
      squadrons: {
        ...f.squadrons,
        totalShips: Math.floor(fleet2Remaining),
      },
      combat: {
        ...f.combat,
        combatHistory: {
          ...f.combat.combatHistory,
          battlesWon: f.combat.combatHistory.battlesWon + (victor === fleet2.fleetId ? 1 : 0),
          battlesLost: f.combat.combatHistory.battlesLost + (victor === fleet1.fleetId ? 1 : 0),
          shipsLost: f.combat.combatHistory.shipsLost + shipsLost2,
        },
      },
    }));

    return {
      fleet1Remaining,
      fleet2Remaining,
      victor,
      shipsLost1,
      shipsLost2,
      duration,
    };
  }

  /**
   * Resolve a squadron tactical engagement
   *
   * Per spec (line 1171-1188):
   * - Formation bonuses apply (rock-paper-scissors)
   * - Wedge beats line_abreast: +20% firepower
   * - Sphere beats wedge: +20% defense
   * - etc.
   */
  public resolveSquadronBattle(
    world: World,
    squadron1Entity: EntityImpl,
    squadron2Entity: EntityImpl,
    duration: number // Ticks
  ): SquadronBattleResult {
    const squadron1 = squadron1Entity.getComponent<SquadronComponent>(CT.Squadron);
    const squadron2 = squadron2Entity.getComponent<SquadronComponent>(CT.Squadron);

    if (!squadron1 || !squadron2) {
      throw new Error('Both entities must have Squadron components');
    }

    // Initial ship counts
    let N = squadron1.ships.shipIds.length;
    let M = squadron2.ships.shipIds.length;

    // Base firepower (use combat strength / ship count)
    const alpha = squadron1.combat.totalFirepower / squadron1.ships.shipIds.length;
    const beta = squadron2.combat.totalFirepower / squadron2.ships.shipIds.length;

    // Formation modifiers (strength + defense)
    const formation1Mods = getFormationModifiers(squadron1.formation);
    const formation2Mods = getFormationModifiers(squadron2.formation);

    // Tactical formation advantages (rock-paper-scissors)
    const tacticalBonus1 = calculateFormationBonus(squadron1.formation, squadron2.formation);
    const tacticalBonus2 = calculateFormationBonus(squadron2.formation, squadron1.formation);

    // Total formation bonuses: base strength modifier + tactical advantage
    const formationBonus1 = formation1Mods.strengthBonus + tacticalBonus1;
    const formationBonus2 = formation2Mods.strengthBonus + tacticalBonus2;

    // Effective firepower with formation bonuses
    const alphaEffective = alpha * (1 + formationBonus1);
    const betaEffective = beta * (1 + formationBonus2);

    // Simulate battle over duration (simple Lanchester)
    for (let tick = 0; tick < duration; tick++) {
      const dN = -betaEffective * M;
      const dM = -alphaEffective * N;

      N += dN;
      M += dM;

      if (N <= 0 || M <= 0) break;
    }

    // Calculate results
    const squadron1Remaining = Math.max(0, N);
    const squadron2Remaining = Math.max(0, M);
    const shipsLost1 = squadron1.ships.shipIds.length - squadron1Remaining;
    const shipsLost2 = squadron2.ships.shipIds.length - squadron2Remaining;
    const victor = squadron1Remaining > squadron2Remaining ? squadron1.squadronId : squadron2.squadronId;

    // Emit events
    world.eventBus.emit({
      type: 'squadron:battle_started',
      source: squadron1Entity.id,
      data: {
        squadronId1: squadron1.squadronId,
        squadronId2: squadron2.squadronId,
        formation1: squadron1.formation,
        formation2: squadron2.formation,
      },
    });

    world.eventBus.emit({
      type: 'squadron:battle_resolved',
      source: squadron1Entity.id,
      data: {
        squadronId1: squadron1.squadronId,
        squadronId2: squadron2.squadronId,
        victor,
        squadron1Remaining,
        squadron2Remaining,
        shipsLost1,
        shipsLost2,
      },
    });

    return {
      squadron1Remaining,
      squadron2Remaining,
      victor,
      shipsLost1,
      shipsLost2,
      formationBonus1,
      formationBonus2,
      formation1Mods: {
        coherence: formation1Mods.coherenceBonus,
        strength: formation1Mods.strengthBonus,
        speed: formation1Mods.speedBonus,
        defense: formation1Mods.defenseBonus,
      },
      formation2Mods: {
        coherence: formation2Mods.coherenceBonus,
        strength: formation2Mods.strengthBonus,
        speed: formation2Mods.speedBonus,
        defense: formation2Mods.defenseBonus,
      },
    };
  }

  /**
   * Resolve armada campaign turn (strategic outcomes)
   *
   * Per spec (line 858-915):
   * - System-by-system battles
   * - Strength comparison with morale modifier
   * - Randomized outcomes with win chance calculation
   */
  public resolveArmadaCampaignTurn(
    world: World,
    armada1Entity: EntityImpl,
    armada2Entity: EntityImpl,
    contestedSystems: string[]
  ): { systemsConquered: string[]; systemsLost: string[]; totalLosses: number } {
    const armada1 = armada1Entity.getComponent<ArmadaComponent>(CT.Armada);
    const armada2 = armada2Entity.getComponent<ArmadaComponent>(CT.Armada);

    if (!armada1 || !armada2) {
      throw new Error('Both entities must have Armada components');
    }

    const systemsConquered: string[] = [];
    const systemsLost: string[] = [];
    let totalLosses = 0;

    // Battle for each contested system
    for (const systemId of contestedSystems) {
      const armada1Strength = armada1.strength.effectiveCombatPower * armada1.morale.average;
      const armada2Strength = armada2.strength.effectiveCombatPower * armada2.morale.average;

      // Win chance calculation
      const armada1WinChance = armada1Strength / (armada1Strength + armada2Strength);
      const roll = Math.random();

      const victor = roll < armada1WinChance ? armada1.armadaId : armada2.armadaId;

      // Losses proportional to enemy strength
      const armada1Losses = Math.floor(armada2Strength * 0.1 * roll);
      const armada2Losses = Math.floor(armada1Strength * 0.1 * (1 - roll));

      if (victor === armada1.armadaId) {
        systemsConquered.push(systemId);
      } else {
        systemsLost.push(systemId);
      }

      totalLosses += armada1Losses;

      world.eventBus.emit({
        type: 'armada:system_battle_resolved',
        source: armada1Entity.id,
        data: {
          armadaId1: armada1.armadaId,
          armadaId2: armada2.armadaId,
          systemId,
          victor,
          losses1: armada1Losses,
          losses2: armada2Losses,
        },
      });
    }

    // Update armada morale
    if (systemsConquered.length > systemsLost.length) {
      armada1Entity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
        ...a,
        morale: {
          ...a.morale,
          trend: 'rising',
          factors: {
            ...a.morale.factors,
            recentVictories: a.morale.factors.recentVictories + systemsConquered.length,
          },
        },
      }));
    } else {
      armada1Entity.updateComponent<ArmadaComponent>(CT.Armada, (a) => ({
        ...a,
        morale: {
          ...a.morale,
          trend: 'falling',
          factors: {
            ...a.morale.factors,
            recentDefeats: a.morale.factors.recentDefeats + systemsLost.length,
          },
        },
      }));
    }

    return { systemsConquered, systemsLost, totalLosses };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Calculate coherence modifier for combat effectiveness
   *
   * Per spec (line 746-748):
   * - High coherence (>= 0.7): +20% offensive rating
   * - Poor coherence (< 0.5): -20% offensive rating
   */
  private getCoherenceModifier(coherence: number): number {
    if (coherence >= 0.7) {
      return 1.2; // +20%
    } else if (coherence < 0.5) {
      return 0.8; // -20%
    } else {
      return 1.0; // No modifier
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate formation bonus for squadron combat
 *
 * Per spec (line 1163-1169):
 * - Rock-paper-scissors formation advantages
 * - Wedge beats line_abreast: +20%
 * - Sphere beats wedge: +20%
 * - Etc.
 */
export function calculateFormationBonus(
  formation1: SquadronFormation,
  formation2: SquadronFormation
): number {
  // Formation advantage matrix (spec line 1163-1169)
  // Uses actual SquadronFormation type values
  const advantages: Partial<Record<SquadronFormation, Partial<Record<SquadronFormation, number>>>> = {
    line_ahead: {
      scattered: 0.10, // Line ahead beats scattered (coordinated broadside)
      line_abreast: 0.05, // Slight advantage over wide front
    },
    line_abreast: {
      echelon: 0.10, // Wide front counters diagonal approach
    },
    wedge: {
      line_abreast: 0.20, // Focus fire pierces wide formation
      line_ahead: 0.15, // V-formation flanks line
    },
    sphere: {
      wedge: 0.20, // Defensive ball absorbs focused attack
      echelon: 0.10, // 360 defense counters flanking
    },
    echelon: {
      line_ahead: 0.15, // Diagonal flanks line
      scattered: 0.10, // Coordinated flanking beats chaos
    },
    scattered: {
      // Scattered has no advantages - pure chaos
    },
  };

  return advantages[formation1]?.[formation2] || 0;
}

/**
 * Resolve Lanchester battle between two forces
 *
 * Generic implementation for any scale (ships, squadrons, fleets)
 */
export function resolveLanchesterBattle(
  count1: number,
  count2: number,
  firepower1: number, // α
  firepower2: number, // β
  duration: number
): { remaining1: number; remaining2: number } {
  let N = count1;
  let M = count2;

  for (let tick = 0; tick < duration; tick++) {
    const dN = -firepower2 * M;
    const dM = -firepower1 * N;

    N += dN;
    M += dM;

    if (N <= 0 || M <= 0) break;
  }

  return {
    remaining1: Math.max(0, N),
    remaining2: Math.max(0, M),
  };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: FleetCombatSystem | null = null;

export function getFleetCombatSystem(): FleetCombatSystem {
  if (!systemInstance) {
    systemInstance = new FleetCombatSystem();
  }
  return systemInstance;
}
