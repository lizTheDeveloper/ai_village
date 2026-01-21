/**
 * NationSystem - Sovereign state governance
 *
 * Per 06-POLITICAL-HIERARCHY.md: Nation Tier (5M-500M population)
 * Time Scale: 1 month/tick (strategic simulation)
 *
 * This system handles:
 * - Aggregating province data into national statistics
 * - National leadership (monarchy, republic, dictatorship, etc.)
 * - Foreign policy and diplomacy
 * - National military coordination (armies and navies)
 * - Economic management (GDP, budget, taxation)
 * - Research and technology advancement
 * - National laws and policies
 * - Stability and legitimacy calculations
 * - War and peace management
 *
 * Priority: 195 (just before EmpireSystem at 200, after ProvinceGovernanceSystem at 54)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  NationComponent,
  NationProvinceRecord,
  WarState,
  Battle,
  Treaty,
  ResearchProject,
} from '../components/NationComponent.js';
import {
  isAtWar,
  updateLegitimacy,
  updateStability,
} from '../components/NationComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { ProvinceGovernanceComponent } from '../components/ProvinceGovernanceComponent.js';

// ============================================================================
// System
// ============================================================================

export class NationSystem extends BaseSystem {
  public readonly id: SystemId = 'nation';
  public readonly priority: number = 195; // Just before EmpireSystem (200)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Nation];
  // Lazy activation: Skip entire system when no nations exist in world
  public readonly activationComponents = [CT.Nation] as const;
  protected readonly throttleInterval = 1200; // Every 60 seconds (strategic, very infrequent)

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Sovereign state governance and strategic simulation',
    dependsOn: ['province_governance' as SystemId],
    writesComponents: [CT.Nation] as const,
  };

  /**
   * Initialize event listeners
   */
  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // === Province Events ===
    // Track when provinces join or leave this nation
    this.events.on('province:city_added', (data) => {
      this._onProvinceCityAdded(data);
    });

    this.events.on('province:city_rebelled', (data) => {
      this._onProvinceCityRebelled(data);
    });

    this.events.on('province:rebellion_warning', (data) => {
      this._onProvinceRebellionWarning(data);
    });

    this.events.on('province:economic_update', (data) => {
      this._onProvinceEconomicUpdate(data);
    });

    this.events.on('province:election_completed', (data) => {
      this._onProvinceElectionCompleted(data);
    });

    // === War and Conflict Events ===
    // React to war declarations from other systems
    this.events.on('nation:war_declared', (data) => {
      this._onWarDeclared(data);
    });

    this.events.on('empire:war_declared', (data) => {
      this._onEmpireWarDeclared(data);
    });

    this.events.on('nation:ally_called_to_war', (data) => {
      this._onAllyCalledToWar(data);
    });

    // === Treaty Events ===
    // React to treaty signings and expirations
    this.events.on('nation:treaty_signed', (data) => {
      this._onTreatySigned(data);
    });

    this.events.on('nation:treaty_expired', (data) => {
      this._onTreatyExpired(data);
    });

    this.events.on('empire:peace_treaty_signed', (data) => {
      this._onEmpirePeaceTreatySigned(data);
    });

    // === Diplomatic Events ===
    this.events.on('empire:alliance_formed', (data) => {
      this._onEmpireAllianceFormed(data);
    });

    // === Governor Decision Events ===
    // React to governor decisions being executed
    this.events.on('nation:policy_enacted', (data) => {
      this._onPolicyEnacted(data);
    });

    this.events.on('nation:research_prioritized', (data) => {
      this._onResearchPrioritized(data);
    });

    this.events.on('nation:tax_rate_changed', (data) => {
      this._onTaxRateChanged(data);
    });
  }

  /**
   * Update all nation entities
   */
  protected onUpdate(ctx: SystemContext): void {
    const nations = ctx.world
      .query()
      .with(CT.Nation)
      .executeEntities();

    if (nations.length === 0) {
      return; // Early exit if no nations
    }

    for (const entity of nations) {
      const impl = entity as EntityImpl;
      const nation = impl.getComponent<NationComponent>(CT.Nation);

      if (!nation) {
        continue;
      }

      // Update nation stats from provinces
      this.aggregateProvinceData(ctx.world, impl, nation);

      // Update economy
      this.updateEconomy(ctx.world, impl, nation);

      // Update military
      this.updateMilitary(ctx.world, impl, nation);

      // Check for elections (if elected government)
      if (nation.leadership.type === 'republic' || nation.leadership.type === 'democracy') {
        this.checkElections(ctx.world, impl, nation);
      }

      // Update stability and legitimacy
      this.updateStabilityAndLegitimacy(ctx.world, impl, nation);

      // Process active wars
      if (isAtWar(nation)) {
        this.processWars(ctx.world, impl, nation);
      }

      // Process research projects
      this.processResearch(ctx.world, impl, nation);

      // Process policies
      this.processPolicies(ctx.world, impl, nation);

      // Update diplomatic relations
      this.updateDiplomacy(ctx.world, impl, nation);
    }
  }

  /**
   * Aggregate data from all provinces in nation
   * TODO: Implement actual province querying once Province component exists
   */
  private aggregateProvinceData(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    let totalPopulation = 0;
    let totalGDP = 0;
    let totalMilitary = 0;
    const updatedProvinces: NationProvinceRecord[] = [];

    // TODO: Query actual provinces once Province component exists
    // For now, use province records from component
    for (const provinceRecord of nation.provinceRecords) {
      totalPopulation += provinceRecord.population;
      totalGDP += provinceRecord.gdp;
      totalMilitary += provinceRecord.militaryContribution;

      updatedProvinces.push({
        ...provinceRecord,
        lastUpdateTick: world.tick,
      });
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      population: totalPopulation,
      economy: {
        ...current.economy,
        gdp: totalGDP,
      },
      military: {
        ...current.military,
        armyStrength: totalMilitary,
      },
      provinceRecords: updatedProvinces,
      lastStrategicUpdateTick: world.tick,
    }));
  }

  /**
   * Update national economy
   * TODO: Implement detailed economic modeling (trade, tariffs, state enterprises)
   */
  private updateEconomy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // Calculate tax revenue from provinces
    const provincialTaxRevenue = nation.economy.gdp *
      (nation.economy.taxPolicy === 'low' ? 0.1 :
       nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3);

    const totalRevenue = provincialTaxRevenue +
                         nation.economy.customsDuties +
                         nation.economy.stateSectorRevenue;

    const totalExpenditure = nation.economy.militaryBudget +
                            nation.economy.infrastructureBudget +
                            nation.economy.educationBudget +
                            nation.economy.healthcareBudget +
                            nation.economy.researchBudget;

    const surplus = totalRevenue - totalExpenditure;

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      economy: {
        ...current.economy,
        annualBudget: totalRevenue,
        treasury: current.economy.treasury + surplus,
        provincialTaxes: new Map(), // TODO: Track per-province taxation
      },
    }));

    // Emit economic event if significant change
    if (Math.abs(surplus) > 10000) {
      world.eventBus.emit({
        type: 'nation:economic_update',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          totalRevenue,
          totalExpenditure,
          surplus,
          treasuryBalance: nation.economy.treasury + surplus,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Update national military
   * Handles military maintenance costs and navy budget allocation
   */
  private updateMilitary(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // Calculate maintenance costs
    const maintenanceCost = nation.military.armyStrength * 0.01;

    // Update readiness based on mobilization
    let targetReadiness = 0.5;
    if (nation.military.mobilization === 'partial') {
      targetReadiness = 0.7;
    } else if (nation.military.mobilization === 'full') {
      targetReadiness = 1.0;
    }

    const readinessDelta = (targetReadiness - nation.military.militaryReadiness) * 0.1;

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      military: {
        ...current.military,
        militaryReadiness: Math.max(0, Math.min(1, current.military.militaryReadiness + readinessDelta)),
      },
    }));

    // Allocate budget to navy if one exists
    if (nation.military.navyId) {
      this.allocateNavyBudget(world, entity, nation);
    }
  }

  /**
   * Allocate military budget to navy
   *
   * Budget allocation varies by war status:
   * - Peace: 10% of military budget to navy
   * - Tension: 25% of military budget to navy
   * - War: 40% of military budget to navy (space dominance critical)
   */
  private allocateNavyBudget(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (!nation.military.navyId) return;

    const navyEntity = world.getEntity(nation.military.navyId);
    if (!navyEntity) return;

    const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
    if (!navy) return;

    const militaryBudget = nation.economy.militaryBudget;

    // Determine navy budget share based on war status
    let navyShare = 0.3; // Default 30% of military budget
    if (nation.military.warStatus === 'peace') {
      navyShare = 0.1; // 10% during peace
    } else if (nation.military.warStatus === 'mobilizing') {
      navyShare = 0.25; // 25% during tension
    } else if (nation.military.warStatus === 'at_war') {
      navyShare = 0.4; // 40% during war (space dominance critical)
    }

    const navyBudget = militaryBudget * navyShare;

    // Update navy annual budget
    (navyEntity as EntityImpl).updateComponent<NavyComponent>(CT.Navy, (n) => ({
      ...n,
      economy: {
        ...n.economy,
        annualBudget: navyBudget,
      },
    }));

    // Emit budget allocation event
    world.eventBus.emit({
      type: 'navy:budget_allocated',
      source: navyEntity.id,
      data: {
        navyId: navy.navyId,
        totalBudget: navyBudget,
        allocation: {
          newConstruction: navyBudget * navy.economy.budgetAllocation.newConstruction,
          maintenance: navyBudget * navy.economy.budgetAllocation.maintenance,
          personnel: navyBudget * navy.economy.budgetAllocation.personnel,
          researchAndDevelopment: navyBudget * navy.economy.budgetAllocation.researchAndDevelopment,
          reserves: navyBudget * navy.economy.budgetAllocation.reserves,
        },
        tick: world.tick,
      },
    });
  }

  /**
   * Check and conduct elections if needed
   */
  private checkElections(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (!nation.leadership.nextElectionTick) return;
    if (world.tick < nation.leadership.nextElectionTick) return;

    // Conduct election with candidate scoring
    const candidates = this.gatherElectionCandidates(world, nation);
    const electionResults = this.scoreAndRankCandidates(world, candidates, nation);

    // Select winner (highest score)
    const winner = electionResults.length > 0 && electionResults[0]
      ? electionResults[0].candidateId
      : nation.leadership.leaderId ?? '';

    const previousLeader = nation.leadership.leaderId;
    const leaderChanged = winner !== previousLeader;

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      leadership: {
        ...current.leadership,
        leaderId: winner,
        termStartTick: world.tick,
        nextElectionTick: current.leadership.termLength
          ? world.tick + current.leadership.termLength
          : undefined,
      },
    }));

    this.events.emitGeneric('nation:election_completed', {
      nationId: entity.id,
      nationName: nation.nationName,
      newLeader: winner || '',
      previousLeader: previousLeader || '',
      leaderChanged,
      leadershipType: nation.leadership.type,
      candidateCount: candidates.length,
      electionResults: electionResults.slice(0, 5), // Top 5 results
      tick: world.tick,
    });
  }

  /**
   * Gather election candidates from legislators and current leader
   */
  private gatherElectionCandidates(world: World, nation: NationComponent): string[] {
    const candidates: string[] = [];

    // Add current leader as incumbent candidate
    if (nation.leadership.leaderId) {
      candidates.push(nation.leadership.leaderId);
    }

    // Add legislators as challenger candidates
    if (nation.leadership.legislatorIds) {
      for (const legislatorId of nation.leadership.legislatorIds) {
        if (!candidates.includes(legislatorId)) {
          candidates.push(legislatorId);
        }
      }
    }

    return candidates;
  }

  /**
   * Score and rank election candidates
   */
  private scoreAndRankCandidates(
    world: World,
    candidateIds: string[],
    nation: NationComponent
  ): Array<{ candidateId: string; score: number; factors: Record<string, number> }> {
    const results: Array<{ candidateId: string; score: number; factors: Record<string, number> }> = [];

    for (const candidateId of candidateIds) {
      const candidateEntity = world.getEntity(candidateId);
      if (!candidateEntity) continue;

      const factors: Record<string, number> = {};
      let totalScore = 0;

      // Factor 1: Incumbent advantage (current leader gets bonus)
      if (candidateId === nation.leadership.leaderId) {
        factors['incumbent_bonus'] = 15;
        totalScore += 15;
      }

      // Factor 2: Charisma from soul (if available)
      const soul = candidateEntity.getComponent(CT.SoulIdentity) as { charisma_level?: number } | undefined;
      if (soul && soul.charisma_level !== undefined) {
        const charismaScore = soul.charisma_level * 8; // 0-5 levels → 0-40 points
        factors['charisma'] = charismaScore;
        totalScore += charismaScore;
      }

      // Factor 3: Governor approval rating (if they govern)
      const governor = candidateEntity.getComponent(CT.Governor) as { approvalRating?: number } | undefined;
      if (governor && governor.approvalRating !== undefined) {
        const approvalScore = governor.approvalRating * 30; // 0-1 → 0-30 points
        factors['approval'] = approvalScore;
        totalScore += approvalScore;
      }

      // Factor 4: Random campaign success factor (simulates campaign quality)
      const campaignFactor = Math.random() * 20;
      factors['campaign'] = campaignFactor;
      totalScore += campaignFactor;

      // Factor 5: Economic conditions affect incumbent negatively if poor
      if (candidateId === nation.leadership.leaderId && nation.economy.treasury < 0) {
        const economicPenalty = -10;
        factors['economic_penalty'] = economicPenalty;
        totalScore += economicPenalty;
      }

      results.push({ candidateId, score: totalScore, factors });
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Update stability and legitimacy
   * TODO: Implement detailed stability factors (unrest, loyalty, etc.)
   */
  private updateStabilityAndLegitimacy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    let stabilityDelta = 0;
    let legitimacyDelta = 0;

    // Economic factors
    if (nation.economy.treasury < 0) {
      stabilityDelta -= 0.05;
      legitimacyDelta -= 0.02;
    }

    // War factors
    if (isAtWar(nation)) {
      stabilityDelta -= 0.03;
      if (nation.military.mobilization === 'full') {
        stabilityDelta -= 0.02;
      }
    }

    // Leadership presence
    if (nation.leadership.leaderId) {
      legitimacyDelta += 0.01;
    }

    // Province loyalty (average)
    if (nation.provinceRecords.length > 0) {
      const avgLoyalty = nation.provinceRecords.reduce((sum, p) =>
        sum + p.loyaltyToNation, 0) / nation.provinceRecords.length;

      stabilityDelta += (avgLoyalty - 0.5) * 0.1;
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => {
      const updated = { ...current };
      updateStability(updated, stabilityDelta);
      updateLegitimacy(updated, legitimacyDelta);
      return updated;
    });

    // Emit warning if critical
    if (nation.stability < 0.2 || nation.legitimacy < 0.2) {
      world.eventBus.emit({
        type: 'nation:stability_warning',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          stability: nation.stability,
          legitimacy: nation.legitimacy,
          unrestFactors: nation.unrestFactors,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Process active wars with battle resolution
   */
  private processWars(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    const updatedWars: WarState[] = [];
    const isAggressor = (warState: WarState) => warState.aggressorNationIds.includes(entity.id);

    for (const war of nation.military.activeWars) {
      if (war.status !== 'active') {
        updatedWars.push(war);
        continue;
      }

      // Update war duration
      war.duration = world.tick - war.startedTick;

      // Process battles every ~50 ticks (2.5 seconds)
      const battleChance = 0.02; // ~2% per tick = battles roughly every 50 ticks
      if (Math.random() < battleChance) {
        const battle = this.resolveBattle(world, entity, nation, war, isAggressor(war));

        // Add battle to war record
        war.battles.push(battle);

        // Update casualties
        const ourLosses = isAggressor(war) ? battle.attackerLosses : battle.defenderLosses;
        war.totalCasualties += ourLosses;

        // Update military losses map
        const currentLosses = war.militaryLosses.get(entity.id) || 0;
        war.militaryLosses.set(entity.id, currentLosses + ourLosses);

        // Emit battle event
        this.events.emitGeneric('nation:battle_resolved', {
          nationId: entity.id,
          nationName: nation.nationName,
          warId: war.id,
          battleId: battle.id,
          location: battle.location,
          outcome: battle.outcome,
          ourLosses,
          enemyLosses: isAggressor(war) ? battle.defenderLosses : battle.attackerLosses,
          tick: world.tick,
        });
      }

      // Check for war ending conditions
      const warEndStatus = this.checkWarEndConditions(world, war, nation, isAggressor(war));
      if (warEndStatus) {
        war.status = warEndStatus;

        this.events.emitGeneric('nation:war_ended', {
          nationId: entity.id,
          nationName: nation.nationName,
          warId: war.id,
          warName: war.name,
          endStatus: warEndStatus,
          totalCasualties: war.totalCasualties,
          totalBattles: war.battles.length,
          duration: war.duration,
          tick: world.tick,
        });
      }

      updatedWars.push(war);

      // Emit war progress event
      if (war.duration % 100 === 0) { // Every ~5 seconds
        this.events.emitGeneric('nation:war_progress', {
          nationId: entity.id,
          nationName: nation.nationName,
          warId: war.id,
          warName: war.name,
          duration: war.duration,
          casualties: war.totalCasualties,
          battleCount: war.battles.length,
          tick: world.tick,
        });
      }
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      military: {
        ...current.military,
        activeWars: updatedWars,
        // Reduce army strength based on total losses
        armyStrength: Math.max(0, current.military.armyStrength -
          updatedWars.reduce((sum, w) => sum + (w.militaryLosses.get(entity.id) || 0), 0) / 100),
      },
    }));
  }

  /**
   * Resolve a battle between warring nations
   */
  private resolveBattle(
    world: World,
    entity: EntityImpl,
    nation: NationComponent,
    war: WarState,
    isAggressor: boolean
  ): Battle {
    // Get our military strength
    const ourForces = Math.floor(nation.military.armyStrength * nation.military.militaryReadiness);

    // Estimate enemy forces (could be improved with cross-nation lookup)
    const enemyForces = ourForces * (0.7 + Math.random() * 0.6); // 70-130% of our forces

    const attackerForces = isAggressor ? ourForces : enemyForces;
    const defenderForces = isAggressor ? enemyForces : ourForces;

    // Calculate battle outcome
    // Base combat power includes forces + readiness bonus + random factor
    const attackerPower = attackerForces * (0.8 + Math.random() * 0.4);
    const defenderPower = defenderForces * (1.0 + Math.random() * 0.3); // Defender slight advantage

    let outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
    let attackerLosses: number;
    let defenderLosses: number;

    const powerRatio = attackerPower / (defenderPower || 1);

    if (powerRatio > 1.3) {
      outcome = 'attacker_victory';
      attackerLosses = Math.floor(attackerForces * (0.05 + Math.random() * 0.1));
      defenderLosses = Math.floor(defenderForces * (0.15 + Math.random() * 0.2));
    } else if (powerRatio < 0.7) {
      outcome = 'defender_victory';
      attackerLosses = Math.floor(attackerForces * (0.15 + Math.random() * 0.2));
      defenderLosses = Math.floor(defenderForces * (0.05 + Math.random() * 0.1));
    } else {
      outcome = 'stalemate';
      attackerLosses = Math.floor(attackerForces * (0.08 + Math.random() * 0.12));
      defenderLosses = Math.floor(defenderForces * (0.08 + Math.random() * 0.12));
    }

    // Generate battle location from provinces or generic
    const locations = nation.provinceRecords.map(p => p.provinceId);
    const location = locations.length > 0
      ? (locations[Math.floor(Math.random() * locations.length)] ?? 'frontier')
      : 'frontier';

    return {
      id: `battle_${entity.id}_${world.tick}`,
      location,
      tick: world.tick,
      attackerForces,
      defenderForces,
      attackerLosses,
      defenderLosses,
      outcome,
    };
  }

  /**
   * Check if war should end based on conditions
   */
  private checkWarEndConditions(
    _world: World,
    war: WarState,
    nation: NationComponent,
    _isAggressor: boolean
  ): 'truce' | 'white_peace' | 'victory' | 'defeat' | null {
    // Check for exhaustion (high casualties relative to army)
    const totalOurLosses = war.militaryLosses.get(nation.nationName) || 0;
    const exhaustionRatio = totalOurLosses / (nation.military.armyStrength || 1);

    // If we've lost 50%+ of army, we're likely to surrender
    if (exhaustionRatio > 0.5) {
      return Math.random() < 0.3 ? 'defeat' : null; // 30% chance to surrender
    }

    // Check for war weariness (long duration)
    if (war.duration > 10000 && Math.random() < 0.01) { // ~500 seconds of war, 1% chance
      return 'white_peace';
    }

    // Check for battle count threshold
    if (war.battles.length >= 20 && Math.random() < 0.05) { // After 20 battles, 5% chance of truce
      return 'truce';
    }

    return null;
  }

  /**
   * Process research projects
   * TODO: Implement actual research mechanics with tech tree
   */
  private processResearch(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (nation.researchProjects.length === 0) return;

    const updatedProjects: ResearchProject[] = [];
    let researchCompleted = false;

    for (const project of nation.researchProjects) {
      if (project.progress >= 1) {
        updatedProjects.push(project);
        continue;
      }

      // Progress based on research budget
      const progressRate = nation.economy.researchBudget * 0.0001;
      project.progress = Math.min(1, project.progress + progressRate);

      if (project.progress >= 1) {
        researchCompleted = true;
        world.eventBus.emit({
          type: 'nation:research_completed',
          source: entity.id,
          data: {
            nationId: entity.id,
            nationName: nation.nationName,
            projectId: project.id,
            projectName: project.name,
            field: project.field,
            tick: world.tick,
          },
        });
      }

      updatedProjects.push(project);
    }

    if (researchCompleted) {
      entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
        ...current,
        researchProjects: updatedProjects,
      }));
    }
  }

  /**
   * Process national policies
   * TODO: Implement policy effects on economy, military, culture
   */
  private processPolicies(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (nation.policies.length === 0) return;

    let policiesChanged = false;

    for (const policy of nation.policies) {
      if (policy.progress >= 1) continue;

      // Progress based on budget allocation
      const progressRate = policy.budgetAllocation * 0.001;
      policy.progress = Math.min(1, policy.progress + progressRate);

      if (policy.progress >= 1) {
        policiesChanged = true;
        world.eventBus.emit({
          type: 'nation:policy_completed',
          source: entity.id,
          data: {
            nationId: entity.id,
            nationName: nation.nationName,
            policyId: policy.id,
            policyName: policy.name,
            category: policy.category,
            tick: world.tick,
          },
        });
      }
    }

    if (policiesChanged) {
      entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
        ...current,
        policies: [...current.policies],
      }));
    }
  }

  /**
   * Update diplomatic relations
   * TODO: Implement opinion changes, treaty negotiations, alliance formation
   */
  private updateDiplomacy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // TODO: Process diplomatic relations with other nations
    // TODO: Update opinion values based on recent events
    // TODO: Check for treaty expirations

    // Handle alliance obligations during wars
    if (nation.military.activeWars.length > 0) {
      this.processAllianceObligations(world, entity, nation);
    }

    // Check for expired treaties
    const activeTreaties: Treaty[] = [];
    let treatiesChanged = false;

    for (const treaty of nation.foreignPolicy.treaties) {
      if (treaty.status !== 'active') {
        activeTreaties.push(treaty);
        continue;
      }

      if (treaty.expirationTick && world.tick >= treaty.expirationTick) {
        treaty.status = 'expired';
        treatiesChanged = true;
        world.eventBus.emit({
          type: 'nation:treaty_expired',
          source: entity.id,
          data: {
            nationId: entity.id,
            nationName: nation.nationName,
            treatyId: treaty.id,
            treatyName: treaty.name,
            treatyType: treaty.type,
            tick: world.tick,
          },
        });
      }

      activeTreaties.push(treaty);
    }

    if (treatiesChanged) {
      entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
        ...current,
        foreignPolicy: {
          ...current.foreignPolicy,
          treaties: activeTreaties,
        },
      }));
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle province adding a city
   */
  private _onProvinceCityAdded(data: { provinceId: string; cityId: string; cityName: string }): void {
    // Find the nation that owns this province and update its records
    // This is handled by aggregateProvinceData in the main update loop
    // No immediate action needed - just logged for debugging
  }

  /**
   * Handle province city rebellion
   */
  private _onProvinceCityRebelled(data: { provinceId: string; provinceName: string; cityId: string; tick: number }): void {
    // A city in one of our provinces has rebelled
    // This impacts province loyalty and nation stability
    // The main update loop will handle stability calculations
  }

  /**
   * Handle province rebellion warning
   */
  private _onProvinceRebellionWarning(data: { provinceId: string; provinceName: string; stability: number; factors: string[]; tick: number }): void {
    // A province is showing signs of rebellion
    // We could implement crisis response here in the future (send military, negotiate, grant autonomy)
    // For now, the stability system will handle this in the main update loop
  }

  /**
   * Handle province economic update
   */
  private _onProvinceEconomicUpdate(data: { provinceId: string; provinceName: string; taxRevenue: number; maintenanceCost: number; netRevenue: number; tick: number }): void {
    // Province economic data has changed
    // The main update loop aggregates this data in aggregateProvinceData
    // No immediate action needed
  }

  /**
   * Handle province election completed
   */
  private _onProvinceElectionCompleted(data: { provinceId: string; provinceName: string; newGovernor: string; tick: number }): void {
    // Province elected a new governor
    // This could affect national politics and stability
    // Future: Track governor loyalty, political alignment
  }

  /**
   * Handle war declaration by another nation
   */
  private _onWarDeclared(data: { nationId: string; nationName: string; targetNationId: string; targetNationName: string; warGoals: string[]; tick: number }): void {
    // Another nation has declared war (either on us or on someone else)
    // If we're the target, we should update our war status
    // If an ally is involved, we may need to respond per treaty obligations

    // Note: The declaring nation will add the war to their activeWars
    // The target nation should also add it to their activeWars via their own system logic
  }

  /**
   * Handle empire-level war declaration
   */
  private _onEmpireWarDeclared(data: { empireId: string; empireName: string; targetEmpireId: string; targetEmpireName: string; warGoals: string[]; tick: number }): void {
    // An empire-level war has been declared
    // If our nation belongs to one of these empires, we may be called to war
    // This is handled by the EmpireSystem coordinating with nations
  }

  /**
   * Handle being called to war by an ally
   */
  private _onAllyCalledToWar(data: { nationId: string; nationName: string; allyId: string; allyName: string; warId: string; treatyType: string; tick: number }): void {
    // An ally has called us to war based on a treaty obligation
    // This event is informational - the actual war joining logic is handled
    // in processAllianceObligations() which adds the war to our activeWars
  }

  /**
   * Handle treaty being signed
   */
  private _onTreatySigned(data: { nationId: string; nationName: string; treatyId: string; treatyName: string; treatyType: string; signatories: string[]; tick: number }): void {
    // A treaty has been signed
    // If we're one of the signatories, the treaty is already in our component
    // This event is for other nations to track diplomatic changes
    // Future: Update opinion values based on treaty type
  }

  /**
   * Handle treaty expiration
   */
  private _onTreatyExpired(data: { nationId: string; nationName: string; treatyId: string; treatyName: string; treatyType: string; tick: number }): void {
    // A treaty has expired
    // This event is emitted by this system in updateDiplomacy()
    // Other systems can react to treaty expirations
    // Future: Trigger renegotiation, update diplomatic stance
  }

  /**
   * Handle empire peace treaty signing
   */
  private _onEmpirePeaceTreatySigned(data: { empireId: string; empireName: string; treatyId: string; treatyName: string; terms: string[]; tick: number }): void {
    // An empire-level peace treaty has been signed
    // If our nation belongs to this empire, we may need to end wars with enemy nations
    // This is coordinated by the EmpireSystem
  }

  /**
   * Handle empire alliance formation
   */
  private _onEmpireAllianceFormed(data: { empireId: string; empireName: string; allyEmpireId: string; allyEmpireName: string; treatyId: string; tick: number }): void {
    // Two empires have formed an alliance
    // If our nation belongs to one of these empires, we may have new diplomatic relations
    // This is coordinated by the EmpireSystem
  }

  /**
   * Handle policy enactment (from governor decisions)
   */
  private _onPolicyEnacted(data: { nationId: string; nationName: string; policyName: string; category: string; tick: number }): void {
    // Policy already enacted by GovernorDecisionExecutor
    // This is notification-only - policy is already in nation component
    // Future: Trigger economic/military/cultural effects based on policy category
  }

  /**
   * Handle research prioritization (from governor decisions)
   */
  private _onResearchPrioritized(data: { nationId: string; nationName: string; field: string; priority: number; tick: number }): void {
    // Research budget already increased by GovernorDecisionExecutor
    // This is notification-only - budget is already updated
    // Future: Create research project entity, assign researchers
  }

  /**
   * Handle tax rate change (from governor decisions)
   */
  private _onTaxRateChanged(data: { nationId: string; nationName: string; oldTaxRate: number; newTaxRate: number; tick: number }): void {
    // Tax rate already changed by GovernorDecisionExecutor
    // This is notification-only - tax policy is already updated
    // Future: Calculate provincial reactions, update unrest based on tax changes
  }

  /**
   * Process alliance obligations during active wars
   * When a nation is at war, check if allies should be called to arms
   */
  private processAllianceObligations(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // For each active war this nation is involved in
    for (const war of nation.military.activeWars) {
      if (war.status !== 'active') {
        continue;
      }

      // Find allies with defense or military alliance treaties
      for (const treaty of nation.foreignPolicy.treaties) {
        if (treaty.status !== 'active') {
          continue;
        }

        // Only military alliances trigger war obligations
        if (treaty.type !== 'military_alliance') {
          continue;
        }

        // Find all signatories that are not this nation
        for (const signatoryId of treaty.signatoryNationIds) {
          if (signatoryId === entity.id) {
            continue;
          }

          // Get the ally entity
          const allyEntity = world.getEntity(signatoryId);
          if (!allyEntity) {
            continue;
          }

          const allyImpl = allyEntity as EntityImpl;
          const allyNation = allyImpl.getComponent<NationComponent>(CT.Nation);
          if (!allyNation) {
            continue;
          }

          // Check if ally is already in this war
          const allyAlreadyInWar = allyNation.military.activeWars.some(
            (w) => w.id === war.id
          );

          if (allyAlreadyInWar) {
            continue;
          }

          // Call ally to war
          world.eventBus.emit({
            type: 'nation:ally_called_to_war',
            source: entity.id,
            data: {
              nationId: entity.id,
              nationName: nation.nationName,
              allyId: allyEntity.id,
              allyName: allyNation.nationName,
              warId: war.id,
              treatyType: treaty.type,
              tick: world.tick,
            },
          });

          // Add the war to ally's active wars
          allyImpl.updateComponent<NationComponent>(CT.Nation, (current) => ({
            ...current,
            military: {
              ...current.military,
              activeWars: [...current.military.activeWars, war],
              warStatus: 'at_war',
              mobilization: 'partial', // Start with partial mobilization
            },
            foreignPolicy: {
              ...current.foreignPolicy,
              enemies: Array.from(
                new Set([
                  ...current.foreignPolicy.enemies,
                  ...war.defenderNationIds,
                  ...war.aggressorNationIds,
                ]).values()
              ).filter((id) => id !== allyEntity.id),
            },
          }));

          // Emit alliance obligation invoked event
          world.eventBus.emit({
            type: 'nation:alliance_obligation_invoked',
            source: allyEntity.id,
            data: {
              nationId: allyEntity.id,
              nationName: allyNation.nationName,
              allyId: entity.id,
              allyName: nation.nationName,
              warId: war.id,
              warName: war.name,
              treatyId: treaty.id,
              tick: world.tick,
            },
          });
        }
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get cities within a nation (aggregated from provinces)
 */
export function getNationCities(world: World, nationId: string): string[] {
  const nationEntity = world.getEntity(nationId);
  if (!nationEntity) return [];

  const nation = nationEntity.getComponent<NationComponent>(CT.Nation);
  if (!nation) return [];

  // Query all provinces that belong to this nation
  const provinces = world
    .query()
    .with(CT.ProvinceGovernance)
    .executeEntities();

  const cityIds: string[] = [];

  for (const provinceEntity of provinces) {
    const provinceComponent = provinceEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
    if (!provinceComponent) continue;

    // Check if this province belongs to our nation
    if (provinceComponent.parentNationId !== nationId) continue;

    // Aggregate all city IDs from this province
    for (const cityRecord of provinceComponent.cities) {
      cityIds.push(cityRecord.cityId);
    }
  }

  return cityIds;
}

/**
 * Calculate nation's total wealth (GDP + treasury)
 */
export function calculateNationWealth(nation: NationComponent): number {
  return nation.economy.gdp + nation.economy.treasury;
}

/**
 * Calculate nation's military power (army + navy)
 */
export function calculateNationMilitary(world: World, nation: NationComponent): number {
  let totalPower = nation.military.armyStrength;

  // Add navy strength if navyId exists
  if (nation.military.navyId) {
    const navyEntity = world.getEntity(nation.military.navyId);
    if (navyEntity) {
      const navyComponent = navyEntity.getComponent(CT.Navy) as NavyComponent | undefined;
      if (navyComponent) {
        // Calculate navy strength from assets
        // Base strength on total ships, with bonuses for tech level and readiness
        const baseNavyStrength = navyComponent.assets.totalShips * 100; // Each ship = 100 power
        const techMultiplier = 1 + (navyComponent.technology.currentTechLevel / 10); // +10% per tech level
        const deploymentFactor = navyComponent.assets.activeDeployments / Math.max(1, navyComponent.assets.totalShips); // Deployment ratio

        // Calculate final navy strength
        const navyStrength = baseNavyStrength * techMultiplier * (0.5 + deploymentFactor * 0.5);
        totalPower += navyStrength;
      }
    }
  }

  // Factor in readiness
  totalPower *= nation.military.militaryReadiness;

  return totalPower;
}

/**
 * Set a national policy
 * TODO: Implement policy validation and budget allocation
 */
export function setNationPolicy(
  world: World,
  nationId: string,
  policy: {
    name: string;
    category: 'military' | 'economic' | 'diplomatic' | 'cultural' | 'research';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    budgetAllocation: number;
  }
): { success: boolean; reason?: string } {
  const nationEntity = world.getEntity(nationId);
  if (!nationEntity) {
    return { success: false, reason: 'Nation not found' };
  }

  const impl = nationEntity as EntityImpl;
  const nation = impl.getComponent<NationComponent>(CT.Nation);
  if (!nation) {
    return { success: false, reason: 'Entity is not a nation' };
  }

  if (policy.budgetAllocation < 0 || policy.budgetAllocation > 1) {
    return { success: false, reason: 'Budget allocation must be between 0 and 1' };
  }

  impl.updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    policies: [
      ...current.policies,
      {
        id: `policy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...policy,
        progress: 0,
        startTick: world.tick,
      },
    ],
  }));

  world.eventBus.emit({
    type: 'nation:policy_enacted',
    source: nationId,
    data: {
      nationId,
      nationName: nation.nationName,
      policyName: policy.name,
      category: policy.category,
      tick: world.tick,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: NationSystem | null = null;

export function getNationSystem(): NationSystem {
  if (!systemInstance) {
    systemInstance = new NationSystem();
  }
  return systemInstance;
}
