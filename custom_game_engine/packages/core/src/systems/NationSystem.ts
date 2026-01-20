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
  Treaty,
  ResearchProject,
} from '../components/NationComponent.js';
import {
  isAtWar,
  updateLegitimacy,
  updateStability,
} from '../components/NationComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';

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
    // TODO: Listen for province events, war declarations, treaty signings
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
   * TODO: Implement detailed military management (mobilization, readiness, commanders)
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

    // TODO: Deduct maintenance from economy budget
    // TODO: Process navy operations if navyId exists
  }

  /**
   * Check and conduct elections if needed
   * TODO: Implement actual election mechanics with LLM-driven campaigns
   */
  private checkElections(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    if (!nation.leadership.nextElectionTick) return;
    if (world.tick < nation.leadership.nextElectionTick) return;

    // TODO: Conduct actual election with candidate agents
    // For now, just extend term or select from legislators

    const newLeader = nation.leadership.legislatorIds?.[0] || nation.leadership.leaderId;

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      leadership: {
        ...current.leadership,
        leaderId: newLeader,
        termStartTick: world.tick,
        nextElectionTick: current.leadership.termLength
          ? world.tick + current.leadership.termLength
          : undefined,
      },
    }));

    world.eventBus.emit({
      type: 'nation:election_completed',
      source: entity.id,
      data: {
        nationId: entity.id,
        nationName: nation.nationName,
        newLeader,
        leadershipType: nation.leadership.type,
        tick: world.tick,
      },
    });
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
   * Process active wars
   * TODO: Implement battle resolution, casualties, territory changes
   */
  private processWars(
    world: World,
    entity: EntityImpl,
    nation: NationComponent
  ): void {
    const updatedWars: WarState[] = [];

    for (const war of nation.military.activeWars) {
      if (war.status !== 'active') {
        updatedWars.push(war);
        continue;
      }

      // Update war duration
      war.duration = world.tick - war.startedTick;

      // TODO: Process battles, update casualties, determine outcomes
      // For now, just increment duration
      updatedWars.push(war);

      // Emit war progress event
      if (war.duration % 100 === 0) { // Every ~5 seconds
        world.eventBus.emit({
          type: 'nation:war_progress',
          source: entity.id,
          data: {
            nationId: entity.id,
            nationName: nation.nationName,
            warId: war.id,
            warName: war.name,
            duration: war.duration,
            casualties: war.totalCasualties,
            tick: world.tick,
          },
        });
      }
    }

    entity.updateComponent<NationComponent>(CT.Nation, (current) => ({
      ...current,
      military: {
        ...current.military,
        activeWars: updatedWars,
      },
    }));
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
    // TODO: Handle alliance obligations during wars

    // For now, just check for expired treaties
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
    const provinceComponent = provinceEntity.getComponent(CT.ProvinceGovernance) as any;
    if (!provinceComponent) continue;

    // Check if this province belongs to our nation
    if (provinceComponent.parentNationId !== nationId) continue;

    // Aggregate all city IDs from this province
    if (Array.isArray(provinceComponent.cities)) {
      for (const cityRecord of provinceComponent.cities) {
        if (cityRecord.cityId) {
          cityIds.push(cityRecord.cityId);
        }
      }
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
