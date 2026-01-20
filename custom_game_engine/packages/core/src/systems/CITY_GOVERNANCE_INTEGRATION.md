# City Governance Integration Guide

## Overview

The city governance system consists of two complementary components and systems:

1. **CityDirectorSystem** + **CityDirectorComponent**: LLM-driven strategic decisions
2. **CityGovernanceSystem** + **CityGovernanceComponent**: Political structure and data aggregation

This separation allows:
- **CityDirectorSystem**: Focus on AI decision-making (priorities, focus areas)
- **CityGovernanceSystem**: Handle departments, budgets, laws, infrastructure

## Integration Points

### 1. LLM Decisions → Budget Allocations

**CityDirectorSystem** makes LLM decisions about strategic priorities. These should update **CityGovernanceComponent** budgets:

```typescript
// In CityDirectorSystem.parseAndApplyDecision()
private parseAndApplyDecision(world: World, entity: EntityImpl, director: CityDirectorComponent, response: string): void {
  // ... existing LLM parsing code ...

  // NEW: Update CityGovernanceComponent if it exists
  const cityGov = entity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
  if (cityGov) {
    // Map strategic priorities to department budgets
    const budgetAllocations = this.prioritiesToBudget(decision.priorities);

    const newDepartments = new Map(cityGov.departments);
    const newBudgetAllocation = new Map(cityGov.budgetAllocation);

    for (const [dept, allocation] of budgetAllocations) {
      newBudgetAllocation.set(dept, allocation);

      const deptData = newDepartments.get(dept);
      if (deptData) {
        newDepartments.set(dept, {
          ...deptData,
          budgetAllocation: allocation,
        });
      }
    }

    entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) => ({
      ...current,
      budgetAllocation: newBudgetAllocation,
      departments: newDepartments,
    }));

    // Emit budget events
    for (const [dept, allocation] of budgetAllocations) {
      this.events.emit('city:budget_allocated', {
        cityId: entity.id,
        cityName: director.cityName,
        department: dept,
        allocation,
        tick: world.tick,
      });
    }
  }
}

/**
 * Map strategic priorities to department budget allocations
 */
private prioritiesToBudget(priorities: StrategicPriorities): Map<CityDepartmentType, number> {
  const budgets = new Map<CityDepartmentType, number>();

  // Map priorities to departments (simplified)
  budgets.set('agriculture', priorities.farming ?? 0.125);
  budgets.set('industry', priorities.building ?? 0.125);
  budgets.set('military', priorities.exploration * 0.5 ?? 0.125); // Exploration ≈ security
  budgets.set('research', priorities.magic ?? 0.125);
  budgets.set('infrastructure', priorities.building * 0.5 ?? 0.125);
  budgets.set('commerce', priorities.social ?? 0.125);
  budgets.set('health', priorities.rest * 0.5 ?? 0.125);
  budgets.set('education', priorities.social * 0.5 ?? 0.125);

  // Normalize to sum to 1.0
  const total = Array.from(budgets.values()).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    for (const [key, val] of budgets) {
      budgets.set(key, val / total);
    }
  }

  return budgets;
}
```

### 2. LLM Decisions → Infrastructure Projects

When the LLM director decides to focus on "growth" or "infrastructure", create infrastructure projects:

```typescript
// In CityDirectorSystem.parseAndApplyDecision()
private parseAndApplyDecision(world: World, entity: EntityImpl, director: CityDirectorComponent, response: string): void {
  // ... existing code ...

  const cityGov = entity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
  if (cityGov && decision.focus === 'growth') {
    // Create infrastructure project for city expansion
    const project: InfrastructureProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: 'City Expansion Infrastructure',
      type: 'road',
      description: 'Roads and basic infrastructure for city growth',
      department: 'infrastructure',
      progress: 0,
      requiredResources: new Map([
        ['stone', 100],
        ['wood', 50],
      ]),
      contributedResources: new Map(),
      requiredWorkforce: 1000,
      contributedWorkforce: 0,
      priority: 4,
      startTick: world.tick,
    };

    entity.updateComponent<CityGovernanceComponent>(CT.CityGovernance, (current) =>
      createInfrastructureProject(current, project, world.tick)
    );

    this.events.emit('city:infrastructure_started', {
      cityId: entity.id,
      cityName: director.cityName,
      projectId: project.id,
      projectName: project.name,
      projectType: project.type,
      department: 'infrastructure',
      tick: world.tick,
    });
  }
}
```

### 3. Department Efficiencies → City Stats

**CityGovernanceSystem** calculates department efficiencies. These should feed back into **CityDirectorComponent** stats:

```typescript
// In CityGovernanceSystem.updateDepartmentEfficiencies()
private updateDepartmentEfficiencies(world: World, entity: EntityImpl, governance: CityGovernanceComponent): void {
  // ... existing efficiency calculation ...

  // Update CityDirectorComponent stats based on department efficiencies
  const director = entity.getComponent<CityDirectorComponent>(CT.CityDirector);
  if (director) {
    const agricultureDept = governance.departments.get('agriculture');
    const infrastructureDept = governance.departments.get('infrastructure');

    // Update food supply based on agriculture efficiency
    if (agricultureDept) {
      const foodProduction = governance.population * agricultureDept.efficiency * 0.1;
      // This would integrate with warehouse tracking in production
    }

    // Update production buildings based on industry efficiency
    const industryDept = governance.departments.get('industry');
    if (industryDept) {
      // Modify production rates, etc.
    }
  }
}
```

### 4. Village Aggregation

**CityGovernanceSystem** aggregates village data. This populates **CityDirectorComponent** stats:

```typescript
// In CityGovernanceSystem.aggregateVillageData()
private aggregateVillageData(world: World, entity: EntityImpl, governance: CityGovernanceComponent): void {
  // ... existing aggregation ...

  // Update CityDirectorComponent with aggregated stats
  const director = entity.getComponent<CityDirectorComponent>(CT.CityDirector);
  if (director) {
    entity.updateComponent<CityDirectorComponent>(CT.CityDirector, (current) => ({
      ...current,
      stats: {
        ...current.stats,
        population: governance.population,
        foodSupply: calculateFoodSupply(governance.reserves),
        woodSupply: governance.reserves.get('wood') || 0,
        stoneSupply: governance.reserves.get('stone') || 0,
      },
    }));
  }
}
```

## Helper Functions

### Add Village to City

```typescript
import {
  addVillageToCity,
  removeVillageFromCity,
} from '../components/CityGovernanceComponent.js';

// Add village to city
const cityEntity = world.getEntity(cityId) as EntityImpl;
const cityGov = cityEntity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
if (cityGov) {
  const updatedGov = addVillageToCity(cityGov, villageId);
  cityEntity.setComponent(updatedGov);

  // Update village to reference city
  const villageEntity = world.getEntity(villageId) as EntityImpl;
  villageEntity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
    ...current,
    cityId,
  }));

  world.eventBus.emit({
    type: 'village:added_to_city',
    source: villageId,
    data: {
      villageId,
      villageName: villageGov.villageName,
      cityId,
      cityName: cityGov.cityName,
      tick: world.tick,
    },
  });
}
```

### Allocate Department Budget

```typescript
import { allocateDepartmentBudget } from '../components/CityGovernanceComponent.js';

// Allocate 40% to agriculture
const cityEntity = world.getEntity(cityId) as EntityImpl;
const cityGov = cityEntity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
if (cityGov) {
  const updatedGov = allocateDepartmentBudget(cityGov, 'agriculture', 0.4);
  cityEntity.setComponent(updatedGov);

  world.eventBus.emit({
    type: 'city:budget_allocated',
    source: cityId,
    data: {
      cityId,
      cityName: cityGov.cityName,
      department: 'agriculture',
      allocation: 0.4,
      tick: world.tick,
    },
  });
}
```

### Create Infrastructure Project

```typescript
import { createInfrastructureProject } from '../components/CityGovernanceComponent.js';

const project: InfrastructureProject = {
  id: `aqueduct_${Date.now()}`,
  name: 'City Aqueduct',
  type: 'aqueduct',
  description: 'Clean water supply for the city',
  department: 'infrastructure',
  progress: 0,
  requiredResources: new Map([
    ['stone', 200],
    ['iron', 50],
  ]),
  contributedResources: new Map(),
  requiredWorkforce: 2000,
  contributedWorkforce: 0,
  priority: 5,
  startTick: world.tick,
};

const cityEntity = world.getEntity(cityId) as EntityImpl;
const cityGov = cityEntity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
if (cityGov) {
  const updatedGov = createInfrastructureProject(cityGov, project, world.tick);
  cityEntity.setComponent(updatedGov);
}
```

## System Registration

Both systems must be registered:

```typescript
// In registerAllSystems.ts
import { CityDirectorSystem } from './CityDirectorSystem.js';
import { CityGovernanceSystem } from './CityGovernanceSystem.js';

// City Director (priority 45) - LLM strategic decisions
const cityDirectorSystem = new CityDirectorSystem();
world.registerSystem(cityDirectorSystem);

// City Governance (priority 53) - Data aggregation and political structure
world.registerSystem(new CityGovernanceSystem());
```

## Success Criteria Verification

1. **City director allocates 40% to agriculture → Department.budget updated**
   ```typescript
   // After LLM decision, check:
   const cityGov = entity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
   expect(cityGov.budgetAllocation.get('agriculture')).toBe(0.4);
   expect(cityGov.departments.get('agriculture')?.budgetAllocation).toBe(0.4);
   ```

2. **3 villages added to city → population aggregated correctly**
   ```typescript
   // After adding villages:
   expect(cityGov.memberVillageIds.size).toBe(3);
   expect(cityGov.population).toBe(village1Pop + village2Pop + village3Pop);
   ```

3. **City passes law → VillageGovernanceComponents notified**
   ```typescript
   // After enacting law:
   const law: CityLaw = { /* ... */ affectedVillageIds: [v1, v2, v3] };
   const updatedGov = enactCityLaw(cityGov, law);
   // Villages would subscribe to 'city:law_enacted' event
   ```

4. **Infrastructure project created → Tracked in component**
   ```typescript
   // After creating project:
   expect(cityGov.infrastructureProjects.length).toBeGreaterThan(0);
   expect(cityGov.infrastructureProjects[0].progress).toBe(0);
   // After system update:
   expect(cityGov.infrastructureProjects[0].progress).toBeGreaterThan(0);
   ```

## Event Flow

```
VillageGovernanceSystem (52)
  ↓ Village elections, proposals
CityGovernanceSystem (53)
  ↓ Aggregate village data → CityGovernanceComponent
  ↓ Update department efficiencies
  ↓ Update infrastructure progress
CityDirectorSystem (45) - runs before village/city governance
  ↓ LLM strategic decision
  ↓ Update CityGovernanceComponent budgets
  ↓ Create infrastructure projects
ProvinceGovernanceSystem (54)
  ↓ Aggregate city data
```

## Testing

```typescript
// Example test
describe('CityGovernanceComponent Integration', () => {
  it('should allocate budget based on LLM director decision', () => {
    // Create city with both components
    const cityEntity = world.createEntity();
    cityEntity.addComponent(createCityDirectorComponent(/* ... */));
    cityEntity.addComponent(createCityGovernanceComponent(/* ... */));

    // Trigger LLM decision (focus: growth)
    // ...

    // Verify budget allocations
    const cityGov = cityEntity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
    expect(cityGov.budgetAllocation.get('infrastructure')).toBeGreaterThan(0.15);
  });

  it('should aggregate village population to city', () => {
    // Create city and villages
    // ...

    // Run CityGovernanceSystem
    cityGovernanceSystem.update(world);

    // Verify aggregation
    const cityGov = cityEntity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
    expect(cityGov.population).toBe(expectedTotal);
  });
});
```
