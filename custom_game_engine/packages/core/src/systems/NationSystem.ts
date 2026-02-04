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
  NationRelation,
  NationOpinionModifiers,
  TreatyNegotiation,
  ProvinceTaxRecord,
  NationalTradeState,
  StateEnterprise,
  UnrestFactor,
  NationUnrest,
} from '../components/NationComponent.js';
import {
  isAtWar,
  updateLegitimacy,
  updateStability,
} from '../components/NationComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { ProvinceGovernanceComponent } from '../components/ProvinceGovernanceComponent.js';
import { ResearchRegistry } from '../research/ResearchRegistry.js';
import type { ResearchField } from '../research/types.js';
import {
  NATIONAL_POLICIES,
  calculatePolicyEffect,
  type PolicyTarget,
} from '../data/NationalPolicies.js';
import { clamp, clamp01 } from '../utils/math.js';

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

    // === Research Events ===
    // React to agent-level research completions
    this.events.on('research:completed', (data) => {
      this._onResearchCompleted(data);
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

      // Process agent-level research completions (from ResearchSystem)
      this.processPendingResearchCompletions(ctx.world, impl, nation);

      // Process research funding and capacity
      this.processResearch(ctx.world, impl, nation);

      // Process policies
      this.processPolicies(ctx.world, impl, nation);

      // Update diplomatic relations
      this.updateDiplomacy(ctx.world, impl, nation);
    }
  }

  /**
   * Aggregate data from all provinces in nation
   * Queries actual ProvinceGovernance components to get live data
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

    // Query actual provinces that belong to this nation
    const provinces = world
      .query()
      .with(CT.ProvinceGovernance)
      .executeEntities();

    for (const provinceEntity of provinces) {
      const province = provinceEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
      if (!province || province.parentNationId !== entity.id) {
        continue; // Skip provinces not belonging to this nation
      }

      // Calculate province totals from live data
      const provincePopulation = province.cities.reduce((sum, city) => sum + city.population, 0);
      const provinceGDP = province.economy.taxRevenue * 10; // Estimate GDP from tax revenue
      const provinceMilitary = province.military?.garrisoned ?? 0;

      totalPopulation += provincePopulation;
      totalGDP += provinceGDP;
      totalMilitary += provinceMilitary;

      // Update or create province record
      const existingRecord = nation.provinceRecords.find(r => r.provinceId === provinceEntity.id);
      updatedProvinces.push({
        provinceId: provinceEntity.id,
        provinceName: province.provinceName,
        population: provincePopulation,
        gdp: provinceGDP,
        militaryContribution: provinceMilitary,
        loyaltyToNation: existingRecord?.loyaltyToNation ?? province.stability,
        lastUpdateTick: world.tick,
      });
    }

    // Fall back to stored records if no live provinces found
    if (updatedProvinces.length === 0) {
      for (const provinceRecord of nation.provinceRecords) {
        totalPopulation += provinceRecord.population;
        totalGDP += provinceRecord.gdp;
        totalMilitary += provinceRecord.militaryContribution;

        updatedProvinces.push({
          ...provinceRecord,
          lastUpdateTick: world.tick,
        });
      }
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
   * Update national economy with detailed modeling
   * Implements: trade, tariffs, state enterprises, per-province taxation
   */
  private updateEconomy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // 1. Calculate per-province taxation with detailed tracking
    const { provincialTaxRevenue, taxRecords } = this.calculateProvincialTaxes(world, entity, nation);

    // 2. Calculate trade revenue
    const tradeRevenue = this.calculateTradeRevenue(world, entity, nation);

    // 3. Calculate state enterprise revenue
    const stateEnterpriseRevenue = this.calculateStateEnterpriseRevenue(nation);

    // 4. Calculate customs duties from tariffs
    const customsDuties = this.calculateCustomsDuties(world, entity, nation);

    // 5. Get policy modifiers
    const policyMod = this.getPolicyModifier(nation, 'tax_revenue');
    const tradeMod = this.getPolicyModifier(nation, 'trade_income');
    const treasuryMod = this.getPolicyModifier(nation, 'treasury_growth');

    // Calculate total revenue with modifiers
    const totalRevenue = (provincialTaxRevenue * policyMod) +
                         (tradeRevenue * tradeMod) +
                         stateEnterpriseRevenue +
                         customsDuties;

    const totalExpenditure = nation.economy.militaryBudget +
                            nation.economy.infrastructureBudget +
                            nation.economy.educationBudget +
                            nation.economy.healthcareBudget +
                            nation.economy.researchBudget;

    const surplus = (totalRevenue - totalExpenditure) * treasuryMod;

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      economy: {
        ...current.economy,
        annualBudget: totalRevenue,
        treasury: current.economy.treasury + surplus,
        customsDuties,
        stateSectorRevenue: stateEnterpriseRevenue,
      },
      trade: this.updateTradeState(current.trade, tradeRevenue),
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
          provincialTaxRevenue,
          tradeRevenue,
          stateEnterpriseRevenue,
          customsDuties,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Calculate per-province taxation with detailed tracking
   */
  private calculateProvincialTaxes(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): { provincialTaxRevenue: number; taxRecords: ProvinceTaxRecord[] } {
    const taxRecords: ProvinceTaxRecord[] = [];
    let totalRevenue = 0;

    // Query actual provinces
    const provinces = world
      .query()
      .with(CT.ProvinceGovernance)
      .executeEntities();

    for (const provinceEntity of provinces) {
      const province = provinceEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
      if (!province || province.parentNationId !== entity.id) continue;

      // Calculate tax base
      const provincialGDP = province.economy.taxRevenue * 10;
      const taxablePopulation = province.cities.reduce((sum, c) => sum + c.population * 0.6, 0);

      // Get base rate from policy
      const baseRate = nation.economy.taxPolicy === 'low' ? 0.1 :
                       nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3;

      // Calculate compliance (affected by stability)
      const stabilityModifier = province.stability;
      const complianceRate = Math.min(1, 0.5 + stabilityModifier * 0.5);

      // Calculate revenue
      const grossRevenue = provincialGDP * baseRate;
      const evasion = grossRevenue * (1 - complianceRate);
      const netRevenue = grossRevenue * complianceRate;

      taxRecords.push({
        provinceId: provinceEntity.id,
        provinceName: province.provinceName,
        provincialGDP,
        taxablePopulation,
        effectiveTaxRate: baseRate * complianceRate,
        nationalTaxRate: baseRate,
        provincialAutonomyRate: 0.2,
        grossTaxRevenue: grossRevenue,
        exemptions: 0,
        evasion,
        netTaxRevenue: netRevenue,
        complianceRate,
        lastCollectionTick: world.tick,
      });

      totalRevenue += netRevenue;
    }

    // Fall back to province records if no live provinces
    if (taxRecords.length === 0 && nation.provinceRecords.length > 0) {
      const baseRate = nation.economy.taxPolicy === 'low' ? 0.1 :
                       nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3;

      for (const record of nation.provinceRecords) {
        const netRevenue = record.gdp * baseRate * record.loyaltyToNation;
        totalRevenue += netRevenue;
      }
    }

    return { provincialTaxRevenue: totalRevenue, taxRecords };
  }

  /**
   * Calculate trade revenue from trading partners
   */
  private calculateTradeRevenue(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): number {
    if (!nation.trade) return nation.economy.customsDuties;

    let revenue = 0;

    // Revenue from exports
    if (nation.trade.exports) {
      for (const [_resource, value] of nation.trade.exports) {
        revenue += value;
      }
    }

    // Revenue from transit trade
    revenue += nation.trade.transitTrade || 0;

    return revenue;
  }

  /**
   * Calculate state enterprise revenue
   */
  private calculateStateEnterpriseRevenue(nation: NationComponent): number {
    if (!nation.stateEnterprises || nation.stateEnterprises.length === 0) {
      return nation.economy.stateSectorRevenue;
    }

    let totalProfit = 0;
    for (const enterprise of nation.stateEnterprises) {
      // Profit = revenue - operating cost, adjusted by efficiency
      const adjustedProfit = enterprise.profit * enterprise.efficiency;
      totalProfit += Math.max(0, adjustedProfit);
    }

    return totalProfit;
  }

  /**
   * Calculate customs duties from tariffs
   */
  private calculateCustomsDuties(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): number {
    if (!nation.trade || !nation.tariffPolicy) {
      return nation.economy.customsDuties;
    }

    let duties = 0;

    // Import tariffs
    if (nation.trade.imports) {
      for (const [resource, value] of nation.trade.imports) {
        // Check for resource-specific tariff
        const resourceTariff = nation.tariffPolicy.resourceTariffs?.get(resource);
        const rate = resourceTariff?.importRate ?? nation.tariffPolicy.importTariff;
        duties += value * rate;
      }
    }

    // Transit trade fees
    duties += (nation.trade.transitTrade || 0) * 0.05;

    return duties;
  }

  /**
   * Update trade state
   */
  private updateTradeState(
    currentTrade: NationalTradeState | undefined,
    tradeRevenue: number
  ): NationalTradeState {
    if (!currentTrade) {
      return {
        exports: new Map(),
        imports: new Map(),
        tradeBalance: tradeRevenue,
        tradingPartners: new Map(),
        transitTrade: 0,
      };
    }

    return {
      ...currentTrade,
      tradeBalance: tradeRevenue - Array.from(currentTrade.imports?.values() || []).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Get policy modifier for a target
   */
  private getPolicyModifier(nation: NationComponent, target: PolicyTarget): number {
    // Check cached modifiers
    if (nation.policyModifiers?.[target]) {
      const mods = nation.policyModifiers[target];
      return mods.reduce((acc, mod) => acc * mod, 1);
    }

    // Calculate from active policies
    const activePolicies = nation.policies
      .filter(p => p.progress >= 1)
      .map(p => NATIONAL_POLICIES[p.id])
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    const { additive, multiplicative } = calculatePolicyEffect(activePolicies, target);

    return multiplicative + additive;
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
        militaryReadiness: clamp01(current.military.militaryReadiness + readinessDelta),
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
   * Update stability and legitimacy with detailed factors
   */
  private updateStabilityAndLegitimacy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    const factors: UnrestFactor[] = [];

    // === Economic Factors ===
    if (nation.economy.treasury < 0) {
      const severity = Math.min(3, Math.abs(nation.economy.treasury) / 100000);
      factors.push({
        id: 'treasury_negative',
        category: 'economic',
        name: 'Budget Deficit',
        description: `National treasury is ${nation.economy.treasury.toLocaleString()} in debt`,
        stabilityImpact: -0.1 * severity,
        legitimacyImpact: -0.05 * severity,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
        resolutionCost: Math.abs(nation.economy.treasury),
      });
    }

    if (nation.economy.taxPolicy === 'high') {
      factors.push({
        id: 'high_taxes',
        category: 'economic',
        name: 'Excessive Taxation',
        description: 'High tax rates causing popular discontent',
        stabilityImpact: -0.1,
        legitimacyImpact: -0.05,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
        resolutionPolicy: 'austerity',
      });
    }

    // === Military Factors ===
    if (isAtWar(nation)) {
      const warDuration = nation.military.activeWars.reduce(
        (max, w) => Math.max(max, w.duration), 0
      );
      const weariness = Math.min(0.3, warDuration / 50000 * 0.3);

      factors.push({
        id: 'war_weariness',
        category: 'military',
        name: 'War Weariness',
        description: `Nation has been at war for ${Math.floor(warDuration / 1200)} months`,
        stabilityImpact: -weariness,
        legitimacyImpact: -weariness * 0.5,
        startTick: nation.military.activeWars[0]?.startedTick || world.tick,
        isPermanent: false,
        canBeResolved: true,
      });

      if (nation.military.mobilization === 'full') {
        factors.push({
          id: 'full_mobilization',
          category: 'military',
          name: 'Total War Mobilization',
          description: 'Economy and society strained by full mobilization',
          stabilityImpact: -0.1,
          legitimacyImpact: 0,
          startTick: world.tick,
          isPermanent: false,
          canBeResolved: true,
        });
      }
    }

    // === Political Factors ===
    if (!nation.leadership.leaderId) {
      factors.push({
        id: 'no_leader',
        category: 'political',
        name: 'No National Leader',
        description: 'Nation lacks recognized head of state',
        stabilityImpact: -0.2,
        legitimacyImpact: -0.3,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
      });
    }

    if (nation.leadership.successionType === 'hereditary' && !nation.leadership.heirApparentId) {
      factors.push({
        id: 'no_heir',
        category: 'political',
        name: 'No Designated Heir',
        description: 'Hereditary succession at risk without clear heir',
        stabilityImpact: -0.05,
        legitimacyImpact: -0.1,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
      });
    }

    // === Province Loyalty ===
    const disloyalProvinces = nation.provinceRecords.filter(p => p.loyaltyToNation < 0.5);
    if (disloyalProvinces.length > 0) {
      factors.push({
        id: 'provincial_disloyalty',
        category: 'political',
        name: 'Provincial Unrest',
        description: `${disloyalProvinces.length} province(s) showing disloyalty`,
        stabilityImpact: -0.05 * disloyalProvinces.length,
        legitimacyImpact: -0.03 * disloyalProvinces.length,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: true,
      });
    }

    // === Positive Factors ===
    if (nation.leadership.leaderId) {
      factors.push({
        id: 'has_leader',
        category: 'political',
        name: 'Stable Leadership',
        description: 'Nation has recognized leadership',
        stabilityImpact: 0.02,
        legitimacyImpact: 0.02,
        startTick: world.tick,
        isPermanent: true,
        canBeResolved: false,
      });
    }

    if (nation.economy.treasury > nation.economy.annualBudget) {
      factors.push({
        id: 'healthy_treasury',
        category: 'economic',
        name: 'Healthy Treasury',
        description: 'Strong fiscal position',
        stabilityImpact: 0.05,
        legitimacyImpact: 0.03,
        startTick: world.tick,
        isPermanent: false,
        canBeResolved: false,
      });
    }

    // === Calculate totals ===
    const totalStability = factors.reduce((sum, f) => sum + f.stabilityImpact, 0);
    const totalLegitimacy = factors.reduce((sum, f) => sum + f.legitimacyImpact, 0);

    // Apply policy modifiers
    const stabilityMod = this.getPolicyModifier(nation, 'stability');
    const legitimacyMod = this.getPolicyModifier(nation, 'legitimacy');

    // Calculate rebellion risk
    const rebellionRisk = clamp01(
      (1 - nation.stability) * 0.3 +
      (1 - nation.legitimacy) * 0.3 +
      (disloyalProvinces.length / Math.max(1, nation.provinceRecords.length)) * 0.4
    );

    // Calculate coup risk (higher if military is mobilized and stability low)
    const coupRisk = nation.military.mobilization === 'full' && nation.stability < 0.4 ? 0.1 : 0;

    // Calculate secession risk
    const secessionRisk = disloyalProvinces.length > 0 ? 0.05 * disloyalProvinces.length : 0;

    // Create unrest state
    const unrest: NationUnrest = {
      factors,
      totalStabilityModifier: totalStability,
      totalLegitimacyModifier: totalLegitimacy,
      rebellionRisk,
      coupRisk,
      secessionRisk,
      troubledProvinces: disloyalProvinces.map(p => p.provinceId),
    };

    // Update component
    entity.updateComponent<NationComponent>(CT.Nation, (current) => {
      const updated = { ...current };
      updateStability(updated, totalStability * stabilityMod);
      updateLegitimacy(updated, totalLegitimacy * legitimacyMod);
      return {
        ...updated,
        unrest,
        unrestFactors: factors.filter(f => f.stabilityImpact < 0).map(f => f.name),
      };
    });

    // Emit warning if critical
    if (rebellionRisk > 0.5) {
      world.eventBus.emit({
        type: 'nation:rebellion_imminent',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          rebellionRisk,
          stability: nation.stability,
          legitimacy: nation.legitimacy,
          factors: factors.filter(f => f.stabilityImpact < -0.05).map(f => ({
            name: f.name,
            impact: f.stabilityImpact,
          })),
          tick: world.tick,
        },
      });
    }

    // Original warning
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
   * Process research funding and capacity
   *
   * Nation-level research works through the agent-based ResearchSystem:
   * 1. Nation allocates research budget
   * 2. Budget determines researcher capacity (funded positions)
   * 3. Agents conduct research at research buildings
   * 4. When agents complete research, nation gets credit via events
   *
   * This method handles the funding/capacity side, not the research progress.
   */
  private processResearch(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // Get research modifiers from policies
    const researchSpeedMod = this.getPolicyModifier(nation, 'research_speed');

    // Calculate research capacity from budget
    // Base: 1 researcher per 1000 budget, modified by policies
    const baseCapacity = Math.floor(nation.economy.researchBudget / 1000);
    const researchCapacity = Math.max(1, Math.floor(baseCapacity * researchSpeedMod));

    // Count research buildings (universities) in provinces
    let universitiesCount = 0;
    const provinces = world
      .query()
      .with(CT.ProvinceGovernance)
      .executeEntities();

    for (const provinceEntity of provinces) {
      const province = provinceEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
      if (!province || province.parentNationId !== entity.id) continue;

      // Count cities with research buildings (estimate based on city size)
      for (const city of province.cities) {
        if (city.population > 10000) {
          universitiesCount += 1; // Larger cities have universities
        }
      }
    }

    // Researcher population scales with capacity and universities
    const researcherPopulation = Math.min(
      nation.population * 0.01, // Max 1% of population
      researchCapacity * universitiesCount * 10 // 10 researchers per capacity per university
    );

    // Calculate tech level from completed research count
    const completedTechnologies = nation.research?.completedTechnologies || [];
    const techLevel = Math.min(10, Math.floor(completedTechnologies.length / 5) + 1);

    // Determine era from research field progression
    const registry = ResearchRegistry.getInstance();
    let highestTier = 1;
    for (const techId of completedTechnologies) {
      const research = registry.tryGet(techId);
      if (research) {
        highestTier = Math.max(highestTier, research.tier);
      }
    }

    const eraByTier: Record<number, 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'space'> = {
      1: 'ancient',
      2: 'classical',
      3: 'medieval',
      4: 'renaissance',
      5: 'industrial',
      6: 'modern',
      7: 'space',
      8: 'space',
    };
    const currentEra = eraByTier[Math.min(8, highestTier)] || 'ancient';

    // Update nation research state
    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      techLevel,
      research: {
        ...current.research,
        researchCapacity,
        universitiesCount,
        researcherPopulation,
        completedTechnologies,
        currentEra,
      },
    }));

    // Emit capacity update if significant change
    const previousCapacity = nation.research?.researchCapacity || 0;
    if (Math.abs(researchCapacity - previousCapacity) > 5) {
      world.eventBus.emit({
        type: 'nation:research_capacity_changed',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          previousCapacity,
          newCapacity: researchCapacity,
          universitiesCount,
          researcherPopulation,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Process national policies with effects
   */
  private processPolicies(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (nation.policies.length === 0) return;

    let policiesChanged = false;
    const policyModifiers: Record<string, number[]> = {};

    for (const policy of nation.policies) {
      // Progress incomplete policies
      if (policy.progress < 1) {
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

      // Apply effects from completed policies
      if (policy.progress >= 1) {
        const policyDef = NATIONAL_POLICIES[policy.id];
        if (policyDef) {
          for (const effect of policyDef.effects) {
            if (!policyModifiers[effect.target]) {
              policyModifiers[effect.target] = [];
            }

            if (effect.modifierType === 'multiplicative') {
              policyModifiers[effect.target].push(effect.value);
            } else if (effect.modifierType === 'additive') {
              // Store additive modifiers as 1 + value for unified multiplication
              policyModifiers[effect.target].push(1 + effect.value);
            } else if (effect.modifierType === 'replacement') {
              // Replacement overwrites - use as direct multiplier
              policyModifiers[effect.target] = [effect.value];
            }
          }
        }
      }
    }

    // Update component with policy modifiers cache
    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      policies: [...current.policies],
      policyModifiers,
    }));

    if (policiesChanged) {
      // Emit policy effects update
      world.eventBus.emit({
        type: 'nation:policy_effects_updated',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          activePolicies: nation.policies.filter(p => p.progress >= 1).map(p => p.name),
          modifiers: Object.keys(policyModifiers),
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Update diplomatic relations with opinion, treaties, and alliances
   */
  private updateDiplomacy(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // 1. Update opinions with all known nations
    this.updateNationOpinions(world, entity, nation);

    // 2. Process pending treaty negotiations
    this.processNegotiations(world, entity, nation);

    // 3. Evaluate alliance opportunities
    this.evaluateAllianceOpportunities(world, entity, nation);

    // 4. Handle alliance obligations during wars (existing)
    if (nation.military.activeWars.length > 0) {
      this.processAllianceObligations(world, entity, nation);
    }

    // 5. Check for expired treaties
    this.checkTreatyExpirations(world, entity, nation);

    // 6. Update diplomatic posture based on current relations
    this.updateDiplomaticPosture(world, entity, nation);
  }

  /**
   * Update opinions with all known nations
   */
  private updateNationOpinions(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    const updatedRelations = new Map(nation.foreignPolicy.diplomaticRelations);
    const opinionMod = this.getPolicyModifier(nation, 'opinion_gain');

    for (const [nationId, relation] of updatedRelations) {
      // Get other nation for calculations
      const otherEntity = world.getEntity(nationId);
      const otherNation = otherEntity?.getComponent<NationComponent>(CT.Nation);

      // Calculate opinion modifiers
      const modifiers = this.calculateNationOpinionModifiers(
        world, entity, nation, nationId, relation, otherNation
      );

      const newOpinion = this.sumOpinionModifiers(modifiers) * opinionMod;
      const previousOpinion = relation.opinion;
      const opinionChange = newOpinion - previousOpinion;

      // Gradual opinion change (don't jump instantly)
      relation.opinion = previousOpinion + Math.sign(opinionChange) * Math.min(Math.abs(opinionChange), 5);
      relation.opinion = clamp(relation.opinion, -100, 100);

      // Update relationship tier
      relation.relationship = this.opinionToRelationship(relation.opinion, relation);

      // Track significant opinion changes
      if (Math.abs(relation.opinion - previousOpinion) > 5) {
        relation.diplomaticEvents.push({
          type: relation.opinion > previousOpinion ? 'opinion_improved' : 'opinion_declined',
          description: `Opinion changed from ${Math.round(previousOpinion)} to ${Math.round(relation.opinion)}`,
          tick: world.tick,
          opinionImpact: relation.opinion - previousOpinion,
        });

        // Keep only last 10 events
        if (relation.diplomaticEvents.length > 10) {
          relation.diplomaticEvents = relation.diplomaticEvents.slice(-10);
        }
      }
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      foreignPolicy: {
        ...current.foreignPolicy,
        diplomaticRelations: updatedRelations,
      },
    }));
  }

  /**
   * Calculate opinion modifiers between nations
   */
  private calculateNationOpinionModifiers(
    world: World,
    entity: EntityImpl,
    nation: NationComponent,
    otherNationId: string,
    relation: NationRelation,
    otherNation: NationComponent | undefined
  ): NationOpinionModifiers {
    const modifiers: NationOpinionModifiers = {
      sharedBorder: 0,
      distance: 0,
      tradeVolume: 0,
      tradeBalance: 0,
      tariffDisputes: 0,
      recentWars: 0,
      warThreat: 0,
      militarySupport: 0,
      governmentSimilarity: 0,
      ideologicalAlignment: 0,
      pastTreaties: 0,
      treatyViolations: 0,
      leaderRelations: 0,
    };

    // Shared border: slight friction but trade opportunity
    // Check if provinces are adjacent (simplified - assume some friction)
    if (nation.provinceRecords.length > 0 && otherNation?.provinceRecords?.length) {
      modifiers.sharedBorder = -5; // Border friction
    }

    // Trade volume bonus
    const tradingPartner = nation.trade?.tradingPartners?.get(otherNationId);
    if (tradingPartner) {
      modifiers.tradeVolume = Math.min(20, tradingPartner.volume / 5000);
      // Trade balance impact
      modifiers.tradeBalance = tradingPartner.balance > 0 ? 5 : tradingPartner.balance < -10000 ? -5 : 0;
      // Tariff disputes
      if (tradingPartner.tariffsPaidToThem > tradingPartner.tariffsPaid * 2) {
        modifiers.tariffDisputes = -10;
      }
    }

    // Recent wars
    const recentWarCount = this.countRecentWars(nation, otherNationId, world.tick);
    modifiers.recentWars = recentWarCount * -30;

    // War threat
    if (otherNation?.military.mobilization === 'full' && relation.relationship !== 'allied') {
      modifiers.warThreat = -20;
    }

    // Government similarity
    if (otherNation) {
      modifiers.governmentSimilarity = this.calculateGovernmentSimilarity(nation, otherNation);
    }

    // Past treaties bonus
    modifiers.pastTreaties = relation.treaties.length * 5;

    // Treaty violations (check for violated treaties)
    const violatedTreaties = nation.foreignPolicy.treaties.filter(
      t => t.status === 'violated' && t.signatoryNationIds.includes(otherNationId)
    );
    modifiers.treatyViolations = violatedTreaties.length * -20;

    return modifiers;
  }

  /**
   * Sum opinion modifiers to get total opinion
   */
  private sumOpinionModifiers(modifiers: NationOpinionModifiers): number {
    return (
      modifiers.sharedBorder +
      modifiers.distance +
      modifiers.tradeVolume +
      modifiers.tradeBalance +
      modifiers.tariffDisputes +
      modifiers.recentWars +
      modifiers.warThreat +
      modifiers.militarySupport +
      modifiers.governmentSimilarity +
      modifiers.ideologicalAlignment +
      modifiers.pastTreaties +
      modifiers.treatyViolations +
      modifiers.leaderRelations
    );
  }

  /**
   * Convert opinion score to relationship tier
   */
  private opinionToRelationship(
    opinion: number,
    relation: NationRelation
  ): NationRelation['relationship'] {
    // Don't change if at war
    if (relation.relationship === 'at_war') return 'at_war';

    if (opinion >= 60) return 'allied';
    if (opinion >= 30) return 'friendly';
    if (opinion >= -30) return 'neutral';
    if (opinion >= -60) return 'rival';
    return 'hostile';
  }

  /**
   * Count recent wars with another nation
   */
  private countRecentWars(
    nation: NationComponent,
    otherNationId: string,
    currentTick: number
  ): number {
    let count = 0;
    const recentThreshold = currentTick - 100000; // ~10 "years" in game time

    for (const war of nation.military.activeWars) {
      if (war.startedTick > recentThreshold) {
        if (war.aggressorNationIds.includes(otherNationId) ||
            war.defenderNationIds.includes(otherNationId)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Calculate government similarity score
   */
  private calculateGovernmentSimilarity(
    nation: NationComponent,
    otherNation: NationComponent
  ): number {
    if (nation.leadership.type === otherNation.leadership.type) {
      return 15; // Same government type
    }

    // Similar government types
    const democraticTypes = ['democracy', 'republic'];
    const authoritarianTypes = ['dictatorship', 'monarchy'];

    const nationDem = democraticTypes.includes(nation.leadership.type);
    const otherDem = democraticTypes.includes(otherNation.leadership.type);

    if (nationDem === otherDem) {
      return 5; // Similar ideology
    }

    return -10; // Opposing ideologies
  }

  /**
   * Process pending treaty negotiations
   */
  private processNegotiations(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (!nation.pendingNegotiations || nation.pendingNegotiations.length === 0) return;

    const updatedNegotiations: TreatyNegotiation[] = [];

    for (const negotiation of nation.pendingNegotiations) {
      // Check for expiration
      if (world.tick >= negotiation.expirationTick) {
        negotiation.status = 'expired';
        world.eventBus.emit({
          type: 'nation:treaty_negotiation_expired',
          source: entity.id,
          data: {
            nationId: entity.id,
            targetNationId: negotiation.targetNationId,
            treatyType: negotiation.proposedTreaty.type,
            tick: world.tick,
          },
        });
        continue; // Don't keep expired negotiations
      }

      // Process active negotiations
      if (negotiation.status === 'proposed') {
        // Roll for acceptance based on calculated chance
        if (Math.random() < negotiation.finalAcceptanceChance * 0.01) {
          negotiation.status = 'accepted';

          // Create the treaty
          const treaty = negotiation.proposedTreaty;
          treaty.signedTick = world.tick;
          treaty.status = 'active';

          // Add treaty to this nation
          entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
            ...current,
            foreignPolicy: {
              ...current.foreignPolicy,
              treaties: [...current.foreignPolicy.treaties, treaty],
            },
          }));

          world.eventBus.emit({
            type: 'nation:treaty_accepted',
            source: entity.id,
            data: {
              nationId: entity.id,
              nationName: nation.nationName,
              targetNationId: negotiation.targetNationId,
              treatyId: treaty.id,
              treatyType: treaty.type,
              tick: world.tick,
            },
          });
        } else {
          negotiation.roundsOfNegotiation++;

          // After 3 rounds, reject
          if (negotiation.roundsOfNegotiation >= 3) {
            negotiation.status = 'rejected';
            world.eventBus.emit({
              type: 'nation:treaty_rejected',
              source: entity.id,
              data: {
                nationId: entity.id,
                targetNationId: negotiation.targetNationId,
                treatyType: negotiation.proposedTreaty.type,
                tick: world.tick,
              },
            });
            continue;
          }
        }
      }

      if (negotiation.status === 'proposed' || negotiation.status === 'counter_offered') {
        updatedNegotiations.push(negotiation);
      }
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      pendingNegotiations: updatedNegotiations,
    }));
  }

  /**
   * Evaluate and form alliances
   */
  private evaluateAllianceOpportunities(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    const allianceMod = this.getPolicyModifier(nation, 'alliance_strength');
    const treatyMod = this.getPolicyModifier(nation, 'treaty_acceptance');

    for (const [nationId, relation] of nation.foreignPolicy.diplomaticRelations) {
      // Skip if already allied, at war, or recently proposed
      if (relation.relationship === 'allied' ||
          relation.relationship === 'at_war' ||
          nation.foreignPolicy.allies.includes(nationId)) {
        continue;
      }

      // Check if already have pending negotiation
      const hasPending = nation.pendingNegotiations?.some(
        n => n.targetNationId === nationId && n.proposedTreaty.type === 'military_alliance'
      );
      if (hasPending) continue;

      // Check conditions for proposing alliance
      const shouldProposeAlliance =
        relation.opinion >= 40 * (2 - treatyMod) && // Opinion threshold adjusted by policy
        (
          this.hasSharedThreat(world, nation, nationId) ||
          relation.treaties.length >= 2
        );

      if (shouldProposeAlliance && Math.random() < 0.1) { // 10% chance per tick to propose
        this.proposeAlliance(world, entity, nation, nationId, relation, allianceMod);
      }
    }
  }

  /**
   * Check if two nations share a common threat
   */
  private hasSharedThreat(
    world: World,
    nation: NationComponent,
    otherNationId: string
  ): boolean {
    const otherEntity = world.getEntity(otherNationId);
    const otherNation = otherEntity?.getComponent<NationComponent>(CT.Nation);
    if (!otherNation) return false;

    // Check if both nations have a common enemy
    for (const enemy of nation.foreignPolicy.enemies) {
      if (otherNation.foreignPolicy.enemies.includes(enemy)) {
        return true;
      }
    }

    // Check if both nations are threatened by the same nation at war
    for (const war of nation.military.activeWars) {
      for (const attacker of war.aggressorNationIds) {
        const attackerRelation = otherNation.foreignPolicy.diplomaticRelations.get(attacker);
        if (attackerRelation?.relationship === 'hostile' || attackerRelation?.relationship === 'at_war') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Propose an alliance to another nation
   */
  private proposeAlliance(
    world: World,
    entity: EntityImpl,
    nation: NationComponent,
    targetNationId: string,
    relation: NationRelation,
    allianceMod: number
  ): void {
    // Calculate acceptance chance
    const baseChance = (relation.opinion - 40) * 0.5; // +0.5% per opinion above 40
    const sharedThreatBonus = this.hasSharedThreat(world, nation, targetNationId) ? 20 : 0;
    const treatyHistoryBonus = relation.treaties.length * 5;
    const finalChance = Math.min(90, baseChance + sharedThreatBonus + treatyHistoryBonus) * allianceMod;

    // Create treaty proposal
    const treaty: Treaty = {
      id: `treaty_${world.tick}_alliance_${nation.nationName}_${targetNationId}`,
      name: `${nation.nationName}-${relation.nationName} Alliance`,
      type: 'military_alliance',
      signatoryNationIds: [entity.id, targetNationId],
      terms: ['Mutual defense', 'Military cooperation', 'Intelligence sharing'],
      signedTick: 0, // Not signed yet
      status: 'active',
    };

    const negotiation: TreatyNegotiation = {
      id: `nego_${world.tick}_${entity.id}_${targetNationId}`,
      proposingNationId: entity.id,
      targetNationId,
      proposedTreaty: treaty,
      proposedTerms: treaty.terms,
      status: 'proposed',
      roundsOfNegotiation: 0,
      baseAcceptanceChance: baseChance,
      termModifiers: sharedThreatBonus + treatyHistoryBonus,
      urgencyModifier: nation.military.warStatus === 'at_war' ? 10 : 0,
      finalAcceptanceChance: finalChance,
      proposedTick: world.tick,
      expirationTick: world.tick + 5000, // ~4 minutes to respond
    };

    // Add to pending negotiations
    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      pendingNegotiations: [...(current.pendingNegotiations || []), negotiation],
    }));

    world.eventBus.emit({
      type: 'nation:alliance_proposed',
      source: entity.id,
      data: {
        nationId: entity.id,
        nationName: nation.nationName,
        targetNationId,
        targetNationName: relation.nationName,
        acceptanceChance: finalChance,
        tick: world.tick,
      },
    });
  }

  /**
   * Check for treaty expirations (enhanced version)
   */
  private checkTreatyExpirations(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
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

        // Remove from allies if military alliance
        if (treaty.type === 'military_alliance') {
          entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
            ...current,
            foreignPolicy: {
              ...current.foreignPolicy,
              allies: current.foreignPolicy.allies.filter(
                id => !treaty.signatoryNationIds.includes(id) || id === entity.id
              ),
            },
          }));
        }

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

  /**
   * Update diplomatic posture based on current state
   */
  private updateDiplomaticPosture(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    // Determine posture based on policies and situation
    let newPosture = nation.foreignPolicy.diplomaticPosture;

    // Check for isolationism policy
    const hasIsolationism = nation.policies.some(
      p => p.id === 'isolationism' && p.progress >= 1
    );
    const hasInterventionism = nation.policies.some(
      p => p.id === 'interventionism' && p.progress >= 1
    );
    const hasExpansionism = nation.policies.some(
      p => p.id === 'expansionism' && p.progress >= 1
    );

    if (hasIsolationism) {
      newPosture = 'isolationist';
    } else if (hasExpansionism) {
      newPosture = 'expansionist';
    } else if (hasInterventionism) {
      newPosture = 'interventionist';
    } else if (nation.military.warStatus === 'at_war') {
      // At war tends toward interventionist
      newPosture = 'interventionist';
    }

    if (newPosture !== nation.foreignPolicy.diplomaticPosture) {
      entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
        ...current,
        foreignPolicy: {
          ...current.foreignPolicy,
          diplomaticPosture: newPosture,
        },
      }));

      world.eventBus.emit({
        type: 'nation:posture_changed',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          oldPosture: nation.foreignPolicy.diplomaticPosture,
          newPosture,
          tick: world.tick,
        },
      });
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
   * Handle research completion from agent-level ResearchSystem
   *
   * When agents complete research (by publishing papers), the nation
   * gets credit for the technological advancement and can apply unlocks.
   */
  private _onResearchCompleted(data: {
    researchId: string;
    researchName: string;
    researchers: string[];
    unlocks: Array<{ type: string; id: string }>;
    tick: number;
    bibliography?: {
      paperCount: number;
      papers: Array<{ title: string; authors: string[]; citations: number }>;
    };
  }): void {
    // Find which nation(s) the researchers belong to
    // For now, credit research to all nations that have researchers in provinces
    // In a full implementation, we'd track which nation funded/employed each researcher

    const registry = ResearchRegistry.getInstance();
    const research = registry.tryGet(data.researchId);
    if (!research) return;

    // Get the world from the context (stored during update)
    // Note: This is called from event handler, so we need to access world differently
    // For now, we'll process this in the next update cycle by storing pending completions

    // Store the completion for processing in the next update
    if (!this._pendingResearchCompletions) {
      this._pendingResearchCompletions = [];
    }
    this._pendingResearchCompletions.push({
      researchId: data.researchId,
      researchName: data.researchName,
      field: research.field,
      tier: research.tier,
      unlocks: data.unlocks,
      researchers: data.researchers,
      tick: data.tick,
    });
  }

  /** Pending research completions to process in next update */
  private _pendingResearchCompletions: Array<{
    researchId: string;
    researchName: string;
    field: ResearchField;
    tier: number;
    unlocks: Array<{ type: string; id: string }>;
    researchers: string[];
    tick: number;
  }> | null = null;

  /**
   * Process pending research completions for nations
   * Called at the start of each update to apply agent research to nations
   */
  private processPendingResearchCompletions(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (!this._pendingResearchCompletions || this._pendingResearchCompletions.length === 0) {
      return;
    }

    const completedTechnologies = nation.research?.completedTechnologies || [];
    const newCompletions: string[] = [];

    for (const completion of this._pendingResearchCompletions) {
      // Check if this research is already completed by this nation
      if (completedTechnologies.includes(completion.researchId)) {
        continue;
      }

      // Check if any researchers are from this nation's provinces
      // For now, credit all nations with the research (simplified)
      // A full implementation would track researcher → nation mapping

      newCompletions.push(completion.researchId);

      // Emit nation-level unlock events for each unlock
      for (const unlock of completion.unlocks) {
        world.eventBus.emit({
          type: `nation:${unlock.type}_unlocked`,
          source: entity.id,
          data: {
            nationId: entity.id,
            nationName: nation.nationName,
            unlockType: unlock.type,
            unlockId: unlock.id,
            researchId: completion.researchId,
            researchName: completion.researchName,
            tick: world.tick,
          },
        });
      }

      // Emit nation research completed event
      world.eventBus.emit({
        type: 'nation:tech_advancement',
        source: entity.id,
        data: {
          nationId: entity.id,
          nationName: nation.nationName,
          researchId: completion.researchId,
          researchName: completion.researchName,
          field: completion.field,
          tier: completion.tier,
          unlockCount: completion.unlocks.length,
          tick: world.tick,
        },
      });
    }

    // Update nation with new completed technologies
    if (newCompletions.length > 0) {
      entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
        ...current,
        research: {
          ...current.research,
          researchCapacity: current.research?.researchCapacity || 10,
          universitiesCount: current.research?.universitiesCount || 1,
          researcherPopulation: current.research?.researcherPopulation || 100,
          completedTechnologies: [
            ...(current.research?.completedTechnologies || []),
            ...newCompletions,
          ],
          currentEra: current.research?.currentEra || 'ancient',
        },
      }));
    }

    // Clear processed completions
    this._pendingResearchCompletions = null;
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
