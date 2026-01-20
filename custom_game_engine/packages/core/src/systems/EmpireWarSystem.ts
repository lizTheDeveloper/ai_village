/**
 * EmpireWarSystem - Imperial war resolution and peace treaty generation
 *
 * Priority: 605 (combat phase, after FleetCombatSystem)
 *
 * Handles:
 * - War score calculation (territory, battles, economic damage)
 * - War outcome determination (decisive victory, stalemate, defeat)
 * - Peace treaty generation (territorial transfers, reparations, vassalization)
 * - War exhaustion mechanics (domestic unrest, forced peace)
 *
 * Per 06-POLITICAL-HIERARCHY.md: Empires wage wars across star systems.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EmpireComponent, ImperialWar, MilitaryContribution } from '../components/EmpireComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * War score factors
 */
export interface WarScoreFactors {
  territoryOccupied: number; // 0-40 points
  battlesWon: number; // 0-30 points
  economicDamage: number; // 0-20 points
  duration: number; // 0-10 points (long wars favor defender)
}

/**
 * War outcome
 */
export type WarOutcome = 'decisive_victory' | 'marginal_victory' | 'stalemate' | 'marginal_defeat' | 'decisive_defeat';

/**
 * Peace treaty demands
 */
export interface PeaceDemands {
  territoryTransfers: string[]; // Province/nation IDs to transfer
  reparations: number; // Resource payment
  vassalization: boolean; // Convert loser to vassal
  tribute: number; // Ongoing tribute (0-1 of GDP)
}

// ============================================================================
// System
// ============================================================================

export class EmpireWarSystem extends BaseSystem {
  public readonly id: SystemId = 'empire_war' as SystemId;
  public readonly priority: number = 605;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Empire];
  public readonly activationComponents = ['empire'] as const;
  public readonly metadata = {
    category: 'combat' as const,
    description: 'Processes imperial war resolution and peace treaties',
    dependsOn: ['fleet_combat' as SystemId],
    writesComponents: [CT.Empire] as const,
  } as const;

  // Update interval: 100 ticks = 5 seconds at 20 TPS (battle resolution frequency)
  protected readonly throttleInterval = 100;

  private lastUpdateTick: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each empire
    for (const empireEntity of ctx.activeEntities) {
      const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!empire) continue;

      // Check if update is due
      const lastUpdate = this.lastUpdateTick.get(empire.empireName) || 0;
      if (tick - lastUpdate < this.throttleInterval) continue;

      this.processWarUpdate(ctx.world, empireEntity as EntityImpl, empire, tick);
      this.lastUpdateTick.set(empire.empireName, tick);
    }
  }

  // ========================================================================
  // War Update
  // ========================================================================

  private processWarUpdate(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    tick: number
  ): void {
    // Process each active war
    for (const war of empire.foreignPolicy.activeWars) {
      if (war.status !== 'active') continue;

      // Step 1: Update war duration
      war.duration = tick - war.startedTick;

      // Step 2: Calculate war score
      const warScore = this.calculateWarScore(world, empire, war, tick);

      // Step 3: Update war exhaustion
      this.updateWarExhaustion(war, tick);

      // Step 4: Check for war end conditions
      const outcome = this.determineWarOutcome(warScore, war);

      // Step 5: End war if outcome determined
      if (outcome !== null) {
        this.endWar(world, empireEntity, empire, war, outcome, warScore, tick);
      }
    }
  }

  // ========================================================================
  // War Score Calculation
  // ========================================================================

  /**
   * Calculate war score (0-100, 50 = stalemate)
   */
  private calculateWarScore(
    world: World,
    empire: EmpireComponent,
    war: ImperialWar,
    tick: number
  ): number {
    const factors = this.calculateWarScoreFactors(world, empire, war, tick);

    // Sum factors (max 100)
    const totalScore =
      factors.territoryOccupied +
      factors.battlesWon +
      factors.economicDamage +
      factors.duration;

    return Math.max(0, Math.min(100, totalScore));
  }

  /**
   * Calculate individual war score factors
   */
  private calculateWarScoreFactors(
    world: World,
    empire: EmpireComponent,
    war: ImperialWar,
    tick: number
  ): WarScoreFactors {
    // Territory occupied (0-40 points)
    const totalEnemyNations = war.defenderNationIds.length;
    const occupiedNations = this.getOccupiedNations(war);
    const territoryScore = totalEnemyNations > 0 ? (occupiedNations / totalEnemyNations) * 40 : 0;

    // Battles won (0-30 points)
    const totalBattles = war.battles.length;
    const battlesWon = war.battles.filter((b) => b.outcome === 'attacker_victory').length;
    const battleScore = totalBattles > 0 ? (battlesWon / totalBattles) * 30 : 0;

    // Economic damage (0-20 points)
    // Calculate based on casualties (rough estimate)
    const enemyCasualties = this.getEnemyCasualties(war, war.defenderNationIds);
    const economicScore = Math.min(20, (enemyCasualties / 1000000) * 20); // 1M casualties = 20 points

    // Duration (0-10 points, long wars favor defender)
    // Attacker loses points over time
    const yearsOfWar = war.duration / 6000; // ~1 year = 6000 ticks
    const durationScore = Math.max(0, 10 - yearsOfWar * 2); // Lose 2 points per year

    return {
      territoryOccupied: territoryScore,
      battlesWon: battleScore,
      economicDamage: economicScore,
      duration: durationScore,
    };
  }

  /**
   * Get number of occupied enemy nations
   */
  private getOccupiedNations(war: ImperialWar): number {
    // Count unique nations in occupation map
    const occupiedSet = new Set<string>();
    for (const [provinceId, occupyingEmpireId] of war.occupation || new Map()) {
      // Extract nation ID from province ID (format: nationId_provinceId)
      const nationId = provinceId.split('_')[0];
      if (nationId && war.defenderNationIds.includes(nationId)) {
        occupiedSet.add(nationId);
      }
    }
    return occupiedSet.size;
  }

  /**
   * Get enemy casualties
   */
  private getEnemyCasualties(war: ImperialWar, enemyNationIds: string[]): number {
    let casualties = 0;
    for (const nationId of enemyNationIds) {
      casualties += war.militaryLosses.get(nationId) || 0;
    }
    return casualties;
  }

  // ========================================================================
  // War Exhaustion
  // ========================================================================

  /**
   * Update war exhaustion (increases 1 point per 100 ticks of war)
   */
  private updateWarExhaustion(war: ImperialWar, tick: number): void {
    // Increase exhaustion every 100 ticks
    const exhaustionIncrease = war.duration / 100;

    // Store in war metadata (simplified - would need WarExhaustion component)
    // For now, calculate on-the-fly
  }

  /**
   * Calculate war exhaustion (0-100)
   */
  private calculateWarExhaustion(war: ImperialWar): number {
    const baseExhaustion = war.duration / 100; // 1 point per 100 ticks

    // Increase based on casualties
    const totalCasualties = war.totalCasualties;
    const casualtyExhaustion = totalCasualties / 100000; // 1 point per 100k casualties

    return Math.min(100, baseExhaustion + casualtyExhaustion);
  }

  // ========================================================================
  // War Outcome
  // ========================================================================

  /**
   * Determine war outcome based on war score and exhaustion
   */
  private determineWarOutcome(warScore: number, war: ImperialWar): WarOutcome | null {
    const exhaustion = this.calculateWarExhaustion(war);

    // Forced peace if both sides exhausted (>90)
    if (exhaustion > 90) {
      return 'stalemate';
    }

    // Check for decisive outcomes
    if (warScore >= 75) {
      return 'decisive_victory';
    } else if (warScore >= 55) {
      return 'marginal_victory';
    } else if (warScore >= 45) {
      // Stalemate - only end if high exhaustion
      return exhaustion > 70 ? 'stalemate' : null;
    } else if (warScore >= 25) {
      return 'marginal_defeat';
    } else {
      return 'decisive_defeat';
    }
  }

  // ========================================================================
  // War Termination
  // ========================================================================

  /**
   * End war and generate peace treaty
   */
  private endWar(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    war: ImperialWar,
    outcome: WarOutcome,
    warScore: number,
    tick: number
  ): void {
    // Generate peace demands based on outcome
    const peaceDemands = this.generatePeaceDemands(outcome, warScore, war);

    // Create peace treaty
    const peaceTreaty = {
      id: `treaty_${tick}_peace_${war.id}`,
      name: `Peace of ${war.name}`,
      type: 'peace' as const,
      signatoryNationIds: [...war.aggressorNationIds, ...war.defenderNationIds],
      terms: this.formatPeaceDemands(peaceDemands),
      signedTick: tick,
      expirationTick: tick + 6000, // 1 year peace
      status: 'active' as const,
    };

    // Update empire component
    empireEntity.updateComponent<EmpireComponent>(CT.Empire, (current) => {
      // Remove war from active wars
      const updatedWars = current.foreignPolicy.activeWars.filter((w) => w.id !== war.id);

      // Add peace treaty
      const updatedTreaties = [...current.foreignPolicy.imperialTreaties, peaceTreaty];

      // Apply peace demands
      let updatedNations = current.territory.nations;
      let updatedVassals = current.territory.vassalNationIds;

      if (peaceDemands.vassalization && outcome.includes('victory')) {
        // Add defeated empire's nations as vassals
        updatedVassals = [...updatedVassals, ...war.defenderNationIds];
        updatedNations = [...updatedNations, ...war.defenderNationIds];
      }

      if (peaceDemands.territoryTransfers.length > 0) {
        // Transfer territories
        updatedNations = [...updatedNations, ...peaceDemands.territoryTransfers];
      }

      return {
        ...current,
        territory: {
          ...current.territory,
          nations: updatedNations,
          vassalNationIds: updatedVassals,
        },
        foreignPolicy: {
          ...current.foreignPolicy,
          activeWars: updatedWars,
          imperialTreaties: updatedTreaties,
        },
      };
    });

    // Mark war as ended
    war.status = outcome.includes('victory') ? 'victory' : outcome === 'stalemate' ? 'white_peace' : 'defeat';

    // Emit events
    world.eventBus.emit({
      type: 'empire:war_ended',
      source: empireEntity.id,
      data: {
        empireId: empireEntity.id,
        empireName: empire.empireName,
        warId: war.id,
        warName: war.name,
        outcome,
        warScore,
        duration: war.duration,
        tick,
      },
    });

    world.eventBus.emit({
      type: 'empire:peace_treaty_signed',
      source: empireEntity.id,
      data: {
        empireId: empireEntity.id,
        empireName: empire.empireName,
        treatyId: peaceTreaty.id,
        treatyName: peaceTreaty.name,
        terms: peaceTreaty.terms,
        tick,
      },
    });
  }

  // ========================================================================
  // Peace Treaty Generation
  // ========================================================================

  /**
   * Generate peace demands based on war outcome
   */
  private generatePeaceDemands(outcome: WarOutcome, warScore: number, war: ImperialWar): PeaceDemands {
    switch (outcome) {
      case 'decisive_victory':
        return {
          territoryTransfers: war.defenderNationIds.slice(0, Math.ceil(war.defenderNationIds.length * 0.5)),
          reparations: 100000,
          vassalization: true,
          tribute: 0.2, // 20% GDP tribute
        };

      case 'marginal_victory':
        return {
          territoryTransfers: war.defenderNationIds.slice(0, Math.ceil(war.defenderNationIds.length * 0.2)),
          reparations: 50000,
          vassalization: false,
          tribute: 0.1, // 10% GDP tribute
        };

      case 'stalemate':
        return {
          territoryTransfers: [],
          reparations: 0,
          vassalization: false,
          tribute: 0,
        };

      case 'marginal_defeat':
        return {
          territoryTransfers: [], // We lost some territory (handled by defender's treaty)
          reparations: -25000, // We pay reparations
          vassalization: false,
          tribute: 0,
        };

      case 'decisive_defeat':
        return {
          territoryTransfers: [], // We lost significant territory
          reparations: -75000, // We pay heavy reparations
          vassalization: false, // We might become vassal (handled by defender)
          tribute: 0.1, // We pay tribute
        };

      default:
        return {
          territoryTransfers: [],
          reparations: 0,
          vassalization: false,
          tribute: 0,
        };
    }
  }

  /**
   * Format peace demands as treaty terms
   */
  private formatPeaceDemands(demands: PeaceDemands): string[] {
    const terms: string[] = [];

    if (demands.territoryTransfers.length > 0) {
      terms.push(`Territory transfer: ${demands.territoryTransfers.join(', ')}`);
    }

    if (demands.reparations !== 0) {
      const amount = Math.abs(demands.reparations);
      const direction = demands.reparations > 0 ? 'receive' : 'pay';
      terms.push(`Reparations: ${direction} ${amount} resources`);
    }

    if (demands.vassalization) {
      terms.push('Vassalization of defeated empire');
    }

    if (demands.tribute > 0) {
      terms.push(`Annual tribute: ${(demands.tribute * 100).toFixed(0)}% of GDP`);
    }

    if (terms.length === 0) {
      terms.push('Status quo ante bellum (return to pre-war borders)');
    }

    return terms;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: EmpireWarSystem | null = null;

export function getEmpireWarSystem(): EmpireWarSystem {
  if (!systemInstance) {
    systemInstance = new EmpireWarSystem();
  }
  return systemInstance;
}
