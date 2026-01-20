/**
 * CityGovernanceSystem - Aggregates village data and manages city governance
 *
 * This system:
 * - Aggregates population/resources from member villages
 * - Updates department efficiencies based on staffing
 * - Tracks infrastructure project progress
 * - Integrates with CityDirectorSystem (which handles LLM decisions)
 * - Enforces city laws/policies on member villages
 *
 * Runs after VillageGovernanceSystem (52) and before ProvinceGovernanceSystem (54)
 * Priority: 53
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  CityGovernanceComponent,
  CityDepartmentType,
  InfrastructureProject,
} from '../components/CityGovernanceComponent.js';
import type { VillageGovernanceComponent } from '../components/VillageGovernanceComponent.js';
import type { TownHallComponent } from '../components/TownHallComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

export class CityGovernanceSystem extends BaseSystem {
  public readonly id: SystemId = 'city_governance';
  public readonly priority: number = 53; // After VillageGovernanceSystem (52), before ProvinceGovernanceSystem (54)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.CityGovernance];
  // Lazy activation: Skip entire system when no city governance exists
  public readonly activationComponents = [CT.CityGovernance] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'City-level governance and village aggregation',
    dependsOn: ['village_governance' as SystemId],
    writesComponents: [CT.CityGovernance, CT.VillageGovernance] as const,
  };

  /**
   * Initialize event listeners
   */
  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Future: Listen for village events, resource changes, etc.
  }

  /**
   * Update all city governance entities
   */
  protected onUpdate(ctx: SystemContext): void {
    const cities = ctx.world
      .query()
      .with(CT.CityGovernance)
      .executeEntities();

    if (cities.length === 0) {
      return; // Early exit if no cities
    }

    for (const entity of cities) {
      const impl = entity as EntityImpl;
      const governance = impl.getComponent<CityGovernanceComponent>(CT.CityGovernance);

      if (!governance) {
        continue;
      }

      // Aggregate data from member villages
      this.aggregateVillageData(ctx.world, impl, governance);

      // Update department efficiencies
      this.updateDepartmentEfficiencies(ctx.world, impl, governance);

      // Update infrastructure project progress
      this.updateInfrastructureProjects(ctx.world, impl, governance);

      // Update tax revenue
      this.updateTaxRevenue(ctx.world, impl, governance);
    }
  }

  /**
   * Aggregate population and resources from member villages
   */
  private aggregateVillageData(
    world: World,
    entity: EntityImpl,
    governance: CityGovernanceComponent
  ): void {
    let totalPopulation = 0;
    const totalReserves = new Map<string, number>();

    // Query all villages with governance
    const villages = world.query().with(CT.VillageGovernance).executeEntities();

    for (const villageEntity of villages) {
      const villageImpl = villageEntity as EntityImpl;
      const villageGov = villageImpl.getComponent<VillageGovernanceComponent>(CT.VillageGovernance);

      if (!villageGov) continue;

      // Check if this village is part of this city
      if (villageGov.cityId !== entity.id) continue;

      // Get village town hall for population data
      const townHall = villageImpl.getComponent<TownHallComponent>(CT.TownHall);
      if (townHall) {
        totalPopulation += townHall.populationCount;
      }

      // Get village warehouse for resource data
      const warehouse = villageImpl.getComponent<WarehouseComponent>(CT.Warehouse);
      if (warehouse && warehouse.inventory) {
        for (const [resourceType, quantity] of warehouse.inventory.entries()) {
          const current = totalReserves.get(resourceType) || 0;
          totalReserves.set(resourceType, current + quantity);
        }
      }
    }

    // Update city governance component
    entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) => ({
      ...current,
      population: totalPopulation,
      reserves: totalReserves,
      lastAggregationTick: world.tick,
    }));

    // Emit aggregation event
    this.events.emit('city:population_aggregated', {
      cityId: entity.id,
      cityName: governance.cityName,
      totalPopulation,
      villageCount: governance.memberVillageIds.size,
      tick: world.tick,
    });
  }

  /**
   * Update department efficiencies based on staffing and resources
   */
  private updateDepartmentEfficiencies(
    world: World,
    entity: EntityImpl,
    governance: CityGovernanceComponent
  ): void {
    let efficienciesChanged = false;

    const newDepartments = new Map(governance.departments);

    for (const [deptType, dept] of governance.departments) {
      // Calculate efficiency based on staffing
      // Ideal staffing: 1 per 100 population for each department
      const idealStaffing = Math.max(1, Math.floor(governance.population / 100));
      const staffingRatio = Math.min(1, dept.staffing / idealStaffing);

      // Base efficiency on staffing ratio
      let newEfficiency = 0.3 + staffingRatio * 0.7; // 30% base + 70% from staffing

      // Apply budget modifier (low budget reduces efficiency)
      const budgetModifier = dept.budgetAllocation < 0.05 ? 0.5 : 1.0;
      newEfficiency *= budgetModifier;

      // Clamp to 0-1 range
      newEfficiency = Math.max(0, Math.min(1, newEfficiency));

      // Check if efficiency changed significantly (> 5%)
      if (Math.abs(newEfficiency - dept.efficiency) > 0.05) {
        efficienciesChanged = true;

        this.events.emit('city:department_efficiency_changed', {
          cityId: entity.id,
          cityName: governance.cityName,
          department: deptType,
          oldEfficiency: dept.efficiency,
          newEfficiency,
          tick: world.tick,
        });

        newDepartments.set(deptType, {
          ...dept,
          efficiency: newEfficiency,
        });
      }
    }

    if (efficienciesChanged) {
      entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) => ({
        ...current,
        departments: newDepartments,
      }));
    }
  }

  /**
   * Update infrastructure project progress based on resources and workforce
   */
  private updateInfrastructureProjects(
    world: World,
    entity: EntityImpl,
    governance: CityGovernanceComponent
  ): void {
    if (governance.infrastructureProjects.length === 0) {
      return;
    }

    let projectsChanged = false;
    const newProjects: InfrastructureProject[] = [];

    for (const project of governance.infrastructureProjects) {
      if (project.progress >= 1) {
        // Project already complete
        newProjects.push(project);
        continue;
      }

      // Get department managing this project
      const dept = governance.departments.get(project.department);
      if (!dept) {
        newProjects.push(project);
        continue;
      }

      // Calculate progress based on:
      // 1. Department efficiency
      // 2. Resource availability
      // 3. Workforce contribution

      // Check resource availability
      let resourceProgress = 0;
      let totalResourceNeeds = 0;
      for (const [resourceType, needed] of project.requiredResources) {
        const contributed = project.contributedResources.get(resourceType) || 0;
        const available = governance.reserves.get(resourceType) || 0;
        const canContribute = Math.min(needed - contributed, available * 0.01); // 1% per tick max

        if (canContribute > 0) {
          project.contributedResources.set(resourceType, contributed + canContribute);
          resourceProgress += (contributed + canContribute) / needed;
        } else {
          resourceProgress += contributed / needed;
        }
        totalResourceNeeds++;
      }
      const resourceRatio = totalResourceNeeds > 0 ? resourceProgress / totalResourceNeeds : 1;

      // Calculate workforce progress
      const workforceRatio = project.requiredWorkforce > 0
        ? project.contributedWorkforce / project.requiredWorkforce
        : 1;

      // Overall progress is minimum of resource and workforce ratios
      const newProgress = Math.min(resourceRatio, workforceRatio);

      // Add incremental progress based on department efficiency
      const incrementalProgress = (dept.efficiency * 0.01) / governance.infrastructureProjects.length;
      const finalProgress = Math.min(1, newProgress + incrementalProgress);

      if (finalProgress !== project.progress) {
        projectsChanged = true;

        // Check if project just completed
        if (project.progress < 1 && finalProgress >= 1) {
          this.events.emit('city:infrastructure_completed', {
            cityId: entity.id,
            cityName: governance.cityName,
            projectId: project.id,
            projectName: project.name,
            projectType: project.type,
            tick: world.tick,
          });
        }

        newProjects.push({
          ...project,
          progress: finalProgress,
          estimatedCompletionTick:
            incrementalProgress > 0
              ? world.tick + Math.ceil((1 - finalProgress) / incrementalProgress)
              : undefined,
        });
      } else {
        newProjects.push(project);
      }
    }

    if (projectsChanged) {
      entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) => ({
        ...current,
        infrastructureProjects: newProjects,
      }));
    }
  }

  /**
   * Update tax revenue based on population and tax rate
   */
  private updateTaxRevenue(
    world: World,
    entity: EntityImpl,
    governance: CityGovernanceComponent
  ): void {
    // Simplified tax model: population * tax rate * economic multiplier
    const economicMultiplier = 1.0; // Future: based on commerce department efficiency
    const taxRevenue = governance.population * governance.taxRate * economicMultiplier;

    if (Math.abs(taxRevenue - governance.taxRevenue) > 0.1) {
      entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) => ({
        ...current,
        taxRevenue,
        totalBudget: taxRevenue, // Simple model: budget = tax revenue
      }));
    }
  }
}
