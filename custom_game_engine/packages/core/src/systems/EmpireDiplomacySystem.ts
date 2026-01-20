/**
 * EmpireDiplomacySystem - Inter-empire diplomatic AI
 *
 * Priority: 202 (after EmpireSystem, before economy systems)
 *
 * Handles:
 * - Alliance formation logic
 * - Treaty negotiation
 * - War declaration conditions
 * - Opinion calculation between empires
 * - Treaty execution (defense pacts, trade agreements)
 *
 * Per 06-POLITICAL-HIERARCHY.md: Empires conduct diplomacy at grand strategic scale.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EmpireComponent, EmpireRelation } from '../components/EmpireComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Diplomatic opinion modifiers
 */
export interface OpinionModifiers {
  sharedBorder: number; // -10 (friction) or +5 (trade)
  tradeVolume: number; // 0-30 based on trade
  recentWars: number; // -50 per war in last 5 years
  culturalSimilarity: number; // 0-20
  powerDifference: number; // -20 to +20
  treaties: number; // +10 per active treaty
}

/**
 * Treaty proposal
 */
export interface TreatyProposal {
  type: 'defense_pact' | 'trade_agreement' | 'non_aggression' | 'tributary';
  proposerEmpireId: string;
  targetEmpireId: string;
  terms: string[];
  acceptanceChance: number; // 0-1
}

// ============================================================================
// System
// ============================================================================

export class EmpireDiplomacySystem extends BaseSystem {
  public readonly id: SystemId = 'empire_diplomacy' as SystemId;
  public readonly priority: number = 202;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Empire];
  public readonly activationComponents = ['empire'] as const;
  public readonly metadata = {
    category: 'economy' as const,
    description: 'Processes inter-empire diplomatic relations',
    dependsOn: ['empire' as SystemId],
    writesComponents: [CT.Empire] as const,
  } as const;

  // Update interval: 3000 ticks = 2.5 minutes at 20 TPS (quarterly diplomatic review)
  protected readonly throttleInterval = 3000;

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

      this.processDiplomaticUpdate(ctx.world, empireEntity as EntityImpl, empire, tick);
      this.lastUpdateTick.set(empire.empireName, tick);
    }
  }

  // ========================================================================
  // Diplomatic Update
  // ========================================================================

  private processDiplomaticUpdate(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    tick: number
  ): void {
    // Step 1: Update opinion scores with all known empires
    this.updateOpinionScores(world, empire, tick);

    // Step 2: Evaluate alliance opportunities
    this.evaluateAllianceFormation(world, empireEntity, empire, tick);

    // Step 3: Check war declaration conditions
    this.evaluateWarDeclaration(world, empireEntity, empire, tick);

    // Step 4: Execute active treaties
    this.executeActiveTreaties(world, empireEntity, empire, tick);
  }

  // ========================================================================
  // Opinion Calculation
  // ========================================================================

  /**
   * Update opinion scores for all diplomatic relations
   */
  private updateOpinionScores(world: World, empire: EmpireComponent, tick: number): void {
    for (const [empireId, relation] of empire.foreignPolicy.diplomaticRelations) {
      const modifiers = this.calculateOpinionModifiers(world, empire, empireId, relation);
      const newOpinion = this.calculateOpinion(modifiers);

      // Update relation
      relation.opinion = newOpinion;

      // Update relationship tier based on opinion
      if (newOpinion >= 60) {
        relation.relationship = 'allied';
      } else if (newOpinion >= 20) {
        relation.relationship = 'friendly';
      } else if (newOpinion >= -20) {
        relation.relationship = 'neutral';
      } else if (newOpinion >= -60) {
        relation.relationship = 'rival';
      } else {
        relation.relationship = 'hostile';
      }
    }
  }

  /**
   * Calculate opinion modifiers
   */
  private calculateOpinionModifiers(
    world: World,
    empire: EmpireComponent,
    otherEmpireId: string,
    relation: EmpireRelation
  ): OpinionModifiers {
    // Shared border (check if any nations are neighbors)
    const sharedBorder = this.hasSharedBorder(world, empire, otherEmpireId) ? -10 : 0;

    // Trade volume (0-30 points based on trade)
    const tradeVolume = Math.min(30, relation.interImperialTrade / 1000);

    // Recent wars (-50 per war in last 30000 ticks = ~5 years)
    const recentWars = empire.foreignPolicy.activeWars
      .filter(w => w.aggressorNationIds.includes(otherEmpireId) || w.defenderNationIds.includes(otherEmpireId))
      .filter(w => tick - w.startedTick < 30000)
      .length * -50;

    // Cultural similarity (placeholder - would need culture tracking)
    const culturalSimilarity = 10; // Default moderate similarity

    // Power difference (smaller empire fears larger, larger disdains smaller)
    const ourPower = empire.territory.totalPopulation;
    const theirPower = this.getEmpirePower(world, otherEmpireId);
    const powerRatio = ourPower / (theirPower || 1);
    const powerDifference = powerRatio > 2 ? 10 : powerRatio < 0.5 ? -10 : 0;

    // Treaties (+10 per active treaty)
    const treaties = relation.treaties.length * 10;

    return {
      sharedBorder,
      tradeVolume,
      recentWars,
      culturalSimilarity,
      powerDifference,
      treaties,
    };
  }

  /**
   * Calculate total opinion from modifiers
   */
  private calculateOpinion(modifiers: OpinionModifiers): number {
    return Math.max(
      -100,
      Math.min(
        100,
        modifiers.sharedBorder +
          modifiers.tradeVolume +
          modifiers.recentWars +
          modifiers.culturalSimilarity +
          modifiers.powerDifference +
          modifiers.treaties
      )
    );
  }

  // ========================================================================
  // Alliance Formation
  // ========================================================================

  /**
   * Evaluate opportunities for alliance formation
   */
  private evaluateAllianceFormation(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    tick: number
  ): void {
    for (const [empireId, relation] of empire.foreignPolicy.diplomaticRelations) {
      // Skip if already allied or at war
      if (relation.relationship === 'allied' || relation.relationship === 'at_war') {
        continue;
      }

      // Check conditions for alliance
      const shouldFormAlliance = this.shouldFormAlliance(world, empire, empireId, relation);

      if (shouldFormAlliance) {
        this.proposeAlliance(world, empireEntity, empire, empireId, relation, tick);
      }
    }
  }

  /**
   * Determine if alliance should be formed
   */
  private shouldFormAlliance(
    world: World,
    empire: EmpireComponent,
    otherEmpireId: string,
    relation: EmpireRelation
  ): boolean {
    // Condition 1: High positive opinion
    if (relation.opinion < 40) {
      return false;
    }

    // Condition 2: Shared threat (common enemy)
    const hasSharedThreat = this.hasSharedThreat(world, empire, otherEmpireId);

    // Condition 3: Complementary resources (trade benefits)
    const hasTradeValue = relation.interImperialTrade > 5000;

    // Condition 4: Cultural similarity
    const culturallySimilar = true; // Placeholder

    return hasSharedThreat || (hasTradeValue && culturallySimilar);
  }

  /**
   * Propose alliance (defense pact)
   */
  private proposeAlliance(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    targetEmpireId: string,
    relation: EmpireRelation,
    tick: number
  ): void {
    // Create defense pact treaty
    const treaty = {
      id: `treaty_${tick}_alliance_${empire.empireName}_${targetEmpireId}`,
      name: `${empire.empireName}-${targetEmpireId} Defense Pact`,
      type: 'military_alliance' as const,
      signatoryNationIds: [empire.empireName, targetEmpireId],
      terms: ['Mutual defense', 'Military cooperation', 'Intelligence sharing'],
      signedTick: tick,
      status: 'active' as const,
    };

    // Add to empire's treaties
    empireEntity.updateComponent<EmpireComponent>(CT.Empire, (current) => ({
      ...current,
      foreignPolicy: {
        ...current.foreignPolicy,
        imperialTreaties: [...current.foreignPolicy.imperialTreaties, treaty],
      },
    }));

    // Update relation
    relation.relationship = 'allied';
    relation.treaties.push(treaty.id);

    // Emit event
    world.eventBus.emit({
      type: 'empire:alliance_formed',
      source: empireEntity.id,
      data: {
        empireId: empireEntity.id,
        empireName: empire.empireName,
        allyEmpireId: targetEmpireId,
        allyEmpireName: targetEmpireId,
        treatyId: treaty.id,
        tick,
      },
    });
  }

  // ========================================================================
  // War Declaration
  // ========================================================================

  /**
   * Evaluate conditions for war declaration
   */
  private evaluateWarDeclaration(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    tick: number
  ): void {
    // Don't declare war if already at war
    if (empire.foreignPolicy.activeWars.length > 0) {
      return;
    }

    for (const [empireId, relation] of empire.foreignPolicy.diplomaticRelations) {
      // Skip allies and friendly relations
      if (relation.relationship === 'allied' || relation.relationship === 'friendly') {
        continue;
      }

      // Check war conditions
      const shouldDeclareWar = this.shouldDeclareWar(world, empire, empireId, relation);

      if (shouldDeclareWar) {
        // War declaration handled by GovernorDecisionExecutor
        // Just emit warning event for now
        world.eventBus.emit({
          type: 'empire:war_consideration',
          source: empireEntity.id,
          data: {
            empireId: empireEntity.id,
            empireName: empire.empireName,
            targetEmpireId: empireId,
            targetEmpireName: empireId,
            opinion: relation.opinion,
            tick,
          },
        });
      }
    }
  }

  /**
   * Determine if war should be declared
   */
  private shouldDeclareWar(
    world: World,
    empire: EmpireComponent,
    otherEmpireId: string,
    relation: EmpireRelation
  ): boolean {
    // Condition 1: Very negative opinion
    if (relation.opinion > -70) {
      return false;
    }

    // Condition 2: Military superiority (at least 1.5x power)
    const ourPower = this.getEmpireMilitaryPower(world, empire);
    const theirPower = this.getEmpirePower(world, otherEmpireId);
    if (ourPower < theirPower * 1.5) {
      return false;
    }

    // Condition 3: Border dispute or resource scarcity
    const hasBorderDispute = this.hasSharedBorder(world, empire, otherEmpireId);

    // Condition 4: No defensive alliances protecting target
    const hasProtector = this.hasDefensiveAlly(world, otherEmpireId);

    return hasBorderDispute && !hasProtector;
  }

  // ========================================================================
  // Treaty Execution
  // ========================================================================

  /**
   * Execute effects of active treaties
   */
  private executeActiveTreaties(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    tick: number
  ): void {
    for (const treaty of empire.foreignPolicy.imperialTreaties) {
      if (treaty.status !== 'active') continue;

      switch (treaty.type) {
        case 'trade':
          this.executeTradeAgreement(world, empire, treaty, tick);
          break;

        case 'military_alliance':
          this.executeDefensePact(world, empireEntity, empire, treaty, tick);
          break;

        case 'non_aggression':
          // Passive treaty - just prevents war
          break;

        case 'peace':
          // Check if peace duration expired
          if (treaty.expirationTick && tick >= treaty.expirationTick) {
            treaty.status = 'expired';
          }
          break;
      }
    }
  }

  /**
   * Execute trade agreement (establish trade routes)
   */
  private executeTradeAgreement(
    world: World,
    empire: EmpireComponent,
    treaty: any,
    tick: number
  ): void {
    // Increase trade volume between signatories
    for (const signatoryId of treaty.signatoryNationIds) {
      if (signatoryId === empire.empireName) continue;

      const relation = empire.foreignPolicy.diplomaticRelations.get(signatoryId);
      if (relation) {
        // Increase trade by 10% per quarter
        relation.interImperialTrade *= 1.1;
      }
    }
  }

  /**
   * Execute defense pact (auto-join wars when ally attacked)
   */
  private executeDefensePact(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    treaty: any,
    tick: number
  ): void {
    // Check if any ally is at war
    for (const signatoryId of treaty.signatoryNationIds) {
      if (signatoryId === empire.empireName) continue;

      // Get ally empire
      const allyEntity = this.getEmpireByName(world, signatoryId);
      if (!allyEntity) continue;

      const ally = allyEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!ally) continue;

      // Check if ally was attacked (is defender in war)
      for (const war of ally.foreignPolicy.activeWars) {
        if (war.defenderNationIds.includes(signatoryId)) {
          // Ally was attacked - we must join
          this.joinAllyWar(world, empireEntity, empire, war, signatoryId, tick);
        }
      }
    }
  }

  /**
   * Join ally's war (defense pact triggered)
   */
  private joinAllyWar(
    world: World,
    empireEntity: EntityImpl,
    empire: EmpireComponent,
    war: any,
    allyId: string,
    tick: number
  ): void {
    // Add empire to war as defender
    empireEntity.updateComponent<EmpireComponent>(CT.Empire, (current) => {
      // Clone war and add us as defender
      const updatedWar = {
        ...war,
        defenderNationIds: [...war.defenderNationIds, empire.empireName],
      };

      return {
        ...current,
        foreignPolicy: {
          ...current.foreignPolicy,
          activeWars: [...current.foreignPolicy.activeWars, updatedWar],
        },
      };
    });

    // Emit event
    world.eventBus.emit({
      type: 'empire:joined_ally_war',
      source: empireEntity.id,
      data: {
        empireId: empireEntity.id,
        empireName: empire.empireName,
        allyId,
        warId: war.id,
        tick,
      },
    });
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private hasSharedBorder(world: World, empire: EmpireComponent, otherEmpireId: string): boolean {
    // Simplified: Check if any nations are on same planet
    // Real implementation would check planetary adjacency
    return Math.random() < 0.3; // 30% chance
  }

  private hasSharedThreat(world: World, empire: EmpireComponent, otherEmpireId: string): boolean {
    // Check if both empires have a common enemy
    for (const [enemyId, relation] of empire.foreignPolicy.diplomaticRelations) {
      if (relation.relationship === 'hostile' || relation.relationship === 'at_war') {
        // Check if other empire also hates this enemy
        const otherEmpire = this.getEmpireByName(world, otherEmpireId);
        if (!otherEmpire) continue;

        const otherEmpireComp = otherEmpire.getComponent<EmpireComponent>(CT.Empire);
        if (!otherEmpireComp) continue;

        const otherRelation = otherEmpireComp.foreignPolicy.diplomaticRelations.get(enemyId);
        if (
          otherRelation &&
          (otherRelation.relationship === 'hostile' || otherRelation.relationship === 'at_war')
        ) {
          return true; // Common enemy found
        }
      }
    }
    return false;
  }

  private getEmpirePower(world: World, empireId: string): number {
    const empireEntity = this.getEmpireByName(world, empireId);
    if (!empireEntity) return 0;

    const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
    if (!empire) return 0;

    return empire.territory.totalPopulation;
  }

  private getEmpireMilitaryPower(world: World, empire: EmpireComponent): number {
    return empire.military.totalShips * 100 + empire.military.totalFleets * 1000;
  }

  private hasDefensiveAlly(world: World, empireId: string): boolean {
    const empireEntity = this.getEmpireByName(world, empireId);
    if (!empireEntity) return false;

    const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
    if (!empire) return false;

    // Check for military alliances
    return empire.foreignPolicy.imperialTreaties.some(
      (t) => t.type === 'military_alliance' && t.status === 'active'
    );
  }

  private getEmpireByName(world: World, empireName: string): EntityImpl | null {
    const empires = world.query().with(CT.Empire).executeEntities();
    for (const entity of empires) {
      const empire = entity.getComponent<EmpireComponent>(CT.Empire);
      if (empire && empire.empireName === empireName) {
        return entity as EntityImpl;
      }
    }
    return null;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: EmpireDiplomacySystem | null = null;

export function getEmpireDiplomacySystem(): EmpireDiplomacySystem {
  if (!systemInstance) {
    systemInstance = new EmpireDiplomacySystem();
  }
  return systemInstance;
}
