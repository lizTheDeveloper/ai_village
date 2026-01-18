/**
 * ProvinceGovernanceSystem - Regional governance for province-level territories
 *
 * Per 06-POLITICAL-HIERARCHY.md: Province Tier (50K-5M population)
 * Time Scale: 1 day/tick (statistical simulation)
 *
 * This system handles:
 * - Aggregating city data into provincial statistics
 * - Governor elections (if elected governance)
 * - Provincial policy implementation
 * - Economic management (taxation, trade balance)
 * - Military coordination
 * - Stability calculations
 *
 * Priority: 54 (after VillageGovernanceSystem at 52)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  ProvinceGovernanceComponent,
  ProvinceCityRecord,
} from '../components/ProvinceGovernanceComponent.js';
import type { TownHallComponent } from '../components/TownHallComponent.js';

// ============================================================================
// System
// ============================================================================

export class ProvinceGovernanceSystem extends BaseSystem {
  public readonly id: SystemId = 'province_governance';
  public readonly priority: number = 54; // After VillageGovernanceSystem (52)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.ProvinceGovernance];
  protected readonly throttleInterval = 400; // Every 20 seconds (statistical, infrequent)

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Regional governance for province-level territories',
    dependsOn: ['village_governance' as SystemId],
    writesComponents: [CT.ProvinceGovernance] as const,
  };

  /**
   * Initialize event listeners
   * Note: Event subscriptions for city events will be added in Phase 3
   * when city governance is fully integrated
   */
  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Future: Listen for city population changes, rebellion events
  }

  /**
   * Update all province governance entities
   */
  protected onUpdate(ctx: SystemContext): void {
    const provinces = ctx.world
      .query()
      .with(CT.ProvinceGovernance)
      .executeEntities();

    if (provinces.length === 0) {
      return; // Early exit if no provinces
    }

    for (const entity of provinces) {
      const impl = entity as EntityImpl;
      const governance = impl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);

      if (!governance) {
        continue;
      }

      // Aggregate city data
      this.aggregateCityData(ctx.world, impl, governance);

      // Check for elections (if elected governance)
      if (governance.governanceType === 'elected') {
        this.checkElections(ctx.world, impl, governance);
      }

      // Update economy
      this.updateEconomy(ctx.world, impl, governance);

      // Update stability
      this.updateStability(ctx.world, impl, governance);

      // Process policies
      this.processPolicies(ctx.world, impl, governance);
    }
  }

  /**
   * Aggregate data from all cities in province
   */
  private aggregateCityData(
    world: World,
    entity: EntityImpl,
    governance: ProvinceGovernanceComponent
  ): void {
    let totalPopulation = 0;
    let urbanPopulation = 0;
    let totalEconomicOutput = 0;
    let totalMilitaryStrength = 0;
    const updatedCities: ProvinceCityRecord[] = [];

    // Query cities with TownHall (villages/cities have TownHall)
    const cityEntities = world.query()
      .with(CT.TownHall)
      .executeEntities();

    for (const cityEntity of cityEntities) {
      const townHall = cityEntity.getComponent<TownHallComponent>(CT.TownHall);
      if (!townHall) continue;

      // Check if this city belongs to this province
      // For Phase 2, use simple approach: city is in province if it's in the cities list
      const existingCity = governance.cities.find(c => c.cityId === cityEntity.id);
      if (!existingCity) continue;

      const population = townHall.populationCount;
      totalPopulation += population;

      // Cities with >500 population are "urban"
      if (population >= 500) {
        urbanPopulation += population;
      }

      // Economic output based on population and age distribution
      const economicOutput = population * 0.1; // Simplified
      totalEconomicOutput += economicOutput;

      // Military strength (simplified)
      const militaryStrength = Math.floor(population * 0.02); // 2% can fight
      totalMilitaryStrength += militaryStrength;

      updatedCities.push({
        cityId: cityEntity.id,
        cityName: existingCity.cityName,
        population,
        economicOutput,
        militaryStrength,
        loyaltyToProvince: existingCity.loyaltyToProvince,
        lastUpdateTick: world.tick,
      });
    }

    // Update province component
    entity.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
      ...current,
      totalPopulation,
      urbanPopulation,
      ruralPopulation: totalPopulation - urbanPopulation,
      cities: updatedCities,
      economy: {
        ...current.economy,
        gdp: totalEconomicOutput,
      },
      military: {
        ...current.military,
        totalTroops: totalMilitaryStrength,
        garrisoned: Math.floor(totalMilitaryStrength * 0.7),
        deployed: Math.floor(totalMilitaryStrength * 0.2),
        militiaReserve: Math.floor(totalMilitaryStrength * 0.1),
      },
      lastStatisticalUpdateTick: world.tick,
    }));
  }

  /**
   * Check and conduct elections if needed
   */
  private checkElections(
    world: World,
    entity: EntityImpl,
    governance: ProvinceGovernanceComponent
  ): void {
    if (!governance.nextElectionTick) return;
    if (world.tick < governance.nextElectionTick) return;

    // Conduct election - select new governor from council
    const newGovernor = this.conductElection(world, governance);

    entity.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
      ...current,
      governorAgentId: newGovernor,
      lastElectionTick: world.tick,
      nextElectionTick: current.termLengthTicks
        ? world.tick + current.termLengthTicks
        : undefined,
    }));

    world.eventBus.emit({
      type: 'province:election_completed',
      source: entity.id,
      data: {
        provinceId: entity.id,
        provinceName: governance.provinceName,
        newGovernor,
        tick: world.tick,
      },
    });
  }

  /**
   * Conduct provincial election
   * Phase 2: Simple selection based on city loyalty
   * Phase 3+: LLM-driven campaign and debate
   */
  private conductElection(
    world: World,
    governance: ProvinceGovernanceComponent
  ): string | undefined {
    // If council exists, select most supported member
    if (governance.councilMemberIds.length > 0) {
      // Simple: pick first council member
      // Phase 3+: weighted by city populations, loyalty, etc.
      return governance.councilMemberIds[0];
    }

    // No council, no election
    return governance.governorAgentId;
  }

  /**
   * Update provincial economy
   */
  private updateEconomy(
    world: World,
    entity: EntityImpl,
    governance: ProvinceGovernanceComponent
  ): void {
    // Calculate tax revenue
    const taxRevenue = governance.economy.gdp * governance.economy.taxRate;

    // Military maintenance cost
    const maintenanceCost = governance.military.totalTroops * 0.01;

    // Net revenue
    const netRevenue = taxRevenue - maintenanceCost;

    entity.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
      ...current,
      economy: {
        ...current.economy,
        taxRevenue,
      },
      military: {
        ...current.military,
        monthlyMaintenance: maintenanceCost,
      },
    }));

    // Emit economic event if significant change
    if (Math.abs(netRevenue) > 100) {
      world.eventBus.emit({
        type: 'province:economic_update',
        source: entity.id,
        data: {
          provinceId: entity.id,
          provinceName: governance.provinceName,
          taxRevenue,
          maintenanceCost,
          netRevenue,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Update provincial stability
   */
  private updateStability(
    world: World,
    entity: EntityImpl,
    governance: ProvinceGovernanceComponent
  ): void {
    const unrestFactors: string[] = [];
    let stabilityModifier = 0;

    // Check for factors affecting stability
    if (governance.economy.taxRate > 0.3) {
      unrestFactors.push('high_taxation');
      stabilityModifier -= 0.05;
    }

    if (governance.totalPopulation > 0) {
      const avgLoyalty = governance.cities.reduce((sum, c) =>
        sum + c.loyaltyToProvince, 0) / governance.cities.length || 0;

      if (avgLoyalty < 0.5) {
        unrestFactors.push('low_city_loyalty');
        stabilityModifier -= 0.1;
      }
    }

    // Governor presence stabilizes
    if (governance.governorAgentId) {
      stabilityModifier += 0.02;
    }

    // Military presence stabilizes
    if (governance.military.garrisoned > governance.totalPopulation * 0.01) {
      stabilityModifier += 0.03;
    }

    // Update stability
    const newStability = Math.max(0, Math.min(1,
      governance.stability + stabilityModifier * 0.01)); // Gradual change

    entity.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
      ...current,
      stability: newStability,
      unrestFactors,
    }));

    // Emit rebellion warning if stability critical
    if (newStability < 0.2 && governance.stability >= 0.2) {
      world.eventBus.emit({
        type: 'province:rebellion_warning',
        source: entity.id,
        data: {
          provinceId: entity.id,
          provinceName: governance.provinceName,
          stability: newStability,
          factors: unrestFactors,
          tick: world.tick,
        },
      });
    }
  }

  /**
   * Process active policies
   */
  private processPolicies(
    world: World,
    entity: EntityImpl,
    governance: ProvinceGovernanceComponent
  ): void {
    if (governance.policies.length === 0) return;

    let policiesChanged = false;

    for (const policy of governance.policies) {
      if (policy.progress >= 1) continue; // Already complete

      // Progress based on budget allocation and time
      const progressRate = policy.budgetAllocation * 0.001; // 0.1% per tick per 1% budget
      policy.progress = Math.min(1, policy.progress + progressRate);

      if (policy.progress >= 1) {
        policiesChanged = true;
        world.eventBus.emit({
          type: 'province:policy_completed',
          source: entity.id,
          data: {
            provinceId: entity.id,
            provinceName: governance.provinceName,
            policy: policy.name,
            category: policy.category,
            tick: world.tick,
          },
        });
      }
    }

    if (policiesChanged) {
      entity.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
        ...current,
        policies: [...current.policies],
      }));
    }
  }

  /**
   * Handle city population change event
   */
  private handleCityPopulationChange(
    world: World,
    data: { cityId: string; newPopulation: number }
  ): void {
    // Find province containing this city
    const provinces = world.query()
      .with(CT.ProvinceGovernance)
      .executeEntities();

    for (const provinceEntity of provinces) {
      const governance = provinceEntity.getComponent<ProvinceGovernanceComponent>(
        CT.ProvinceGovernance
      );
      if (!governance) continue;

      const cityRecord = governance.cities.find(c => c.cityId === data.cityId);
      if (cityRecord) {
        // City found in this province - will be updated in next aggregation
        return;
      }
    }
  }

  /**
   * Handle city rebellion event
   */
  private handleCityRebellion(
    world: World,
    data: { cityId: string; provinceId: string }
  ): void {
    const provinceEntity = world.getEntity(data.provinceId);
    if (!provinceEntity) return;

    const impl = provinceEntity as EntityImpl;
    const governance = impl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
    if (!governance) return;

    // Find and update rebellious city
    const cityIndex = governance.cities.findIndex(c => c.cityId === data.cityId);
    if (cityIndex === -1) return;

    impl.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => {
      const newCities = [...current.cities];
      const cityRecord = newCities[cityIndex];
      if (!cityRecord) {
        return current; // City not found, return unchanged
      }
      newCities[cityIndex] = {
        cityId: cityRecord.cityId,
        cityName: cityRecord.cityName,
        population: cityRecord.population,
        economicOutput: cityRecord.economicOutput,
        militaryStrength: cityRecord.militaryStrength,
        loyaltyToProvince: 0,
        lastUpdateTick: cityRecord.lastUpdateTick,
      };

      return {
        ...current,
        cities: newCities,
        stability: Math.max(0, current.stability - 0.2),
        unrestFactors: [...current.unrestFactors, `rebellion_${data.cityId}`],
      };
    });

    world.eventBus.emit({
      type: 'province:city_rebelled',
      source: data.provinceId,
      data: {
        provinceId: data.provinceId,
        provinceName: governance.provinceName,
        cityId: data.cityId,
        tick: world.tick,
      },
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a city to a province
 */
export function addCityToProvince(
  world: World,
  provinceId: string,
  cityId: string,
  cityName: string
): { success: boolean; reason?: string } {
  const provinceEntity = world.getEntity(provinceId);
  if (!provinceEntity) {
    return { success: false, reason: 'Province not found' };
  }

  const impl = provinceEntity as EntityImpl;
  const governance = impl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
  if (!governance) {
    return { success: false, reason: 'Entity is not a province' };
  }

  if (governance.cities.some(c => c.cityId === cityId)) {
    return { success: false, reason: 'City already in province' };
  }

  impl.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
    ...current,
    cities: [
      ...current.cities,
      {
        cityId,
        cityName,
        population: 0,
        economicOutput: 0,
        militaryStrength: 0,
        loyaltyToProvince: 0.7, // Default loyalty
        lastUpdateTick: world.tick,
      },
    ],
  }));

  world.eventBus.emit({
    type: 'province:city_added',
    source: provinceId,
    data: { provinceId, cityId, cityName },
  });

  return { success: true };
}

/**
 * Set provincial policy
 */
export function setProvincialPolicy(
  world: World,
  provinceId: string,
  policy: {
    name: string;
    category: 'economic' | 'military' | 'cultural' | 'infrastructure';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    budgetAllocation: number;
  }
): { success: boolean; reason?: string } {
  const provinceEntity = world.getEntity(provinceId);
  if (!provinceEntity) {
    return { success: false, reason: 'Province not found' };
  }

  const impl = provinceEntity as EntityImpl;
  const governance = impl.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
  if (!governance) {
    return { success: false, reason: 'Entity is not a province' };
  }

  impl.updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
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

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: ProvinceGovernanceSystem | null = null;

export function getProvinceGovernanceSystem(): ProvinceGovernanceSystem {
  if (!systemInstance) {
    systemInstance = new ProvinceGovernanceSystem();
  }
  return systemInstance;
}
