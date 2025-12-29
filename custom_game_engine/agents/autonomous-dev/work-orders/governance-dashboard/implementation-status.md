# Governance Dashboard Implementation Status

## Current Status: IN PROGRESS

### Phase 1: Architecture Analysis ✅ COMPLETE

I've completed a thorough analysis of the existing codebase architecture and identified the implementation approach.

#### Key Findings:

1. **Building System**: Comprehensive BuildingSystem and BuildingComponent exist with:
   - Construction progress tracking
   - Event-driven architecture
   - Fuel management for crafting stations
   - Storage capacity management
   - Temperature/shelter systems
   - Animal housing

2. **Metrics System**: Extensive MetricsCollector already exists with:
   - 65+ event type handlers
   - Time-series data storage
   - Hot/cold storage tiers
   - Economic, social, spatial, intelligence tracking
   - Per-agent lifecycle metrics

3. **Test Requirements**: Comprehensive test file exists at:
   - `custom_game_engine/packages/core/src/buildings/__tests__/GovernanceBuildings.test.ts`
   - Tests define exact API expected for governance buildings

### Implementation Approach

The tests reveal that this feature requires significant API changes to the World class and Entity class. Specifically:

#### Required World Methods:
```typescript
// Construction methods
world.canBuildTownHall(resources)
world.buildTownHall(resources)
world.buildCensusBureau(resources)
world.buildWarehouse(resources)
world.buildWeatherStation(resources)
world.buildHealthClinic(resources)

// Data query methods
world.getTownHallData()
world.getPopulationStats()
world.getExtinctionRisk()
world.getResourceTracking()
world.getWeatherForecast()
world.getHealthStats()
world.getWarehouses()

// Helper methods
world.createAgent(options)
world.tick(deltaTime)
world.setFutureTemperature(time, temp)
world.setTemperature(temp)
```

#### Required Agent Methods:
```typescript
agent.queryTownHall(queryType, params)
agent.queryCensusBureau(queryType, params)
agent.queryWarehouse(queryType)
agent.requestFromWarehouse(resource, amount)
agent.queryWeatherStation(queryType, params)
agent.die(cause)
agent.seekTreatment(clinic)
```

#### Required Building Objects (returned from build methods):
```typescript
interface GovernanceBuilding {
  constructionTime: number
  requiredStaff: number
  currentStaff: Agent[]
  recommendedStaff: number

  // Methods
  getData(): BuildingData
  setCondition(condition: number): void
  assignStaff(agent: Agent): void
  deposit(resource: string, amount: number): void
  withdraw(resource: string, amount: number): void
  distribute(resource: string, agent: Agent, amount: number): void
  setConsumptionRate(resource: string, rate: number): void
  setReplacementRate(rate: number): void
}
```

### Challenge: Test Design vs. Architecture

The tests assume a **service-oriented** design where World and Agent have many high-level methods. However, the existing codebase uses an **ECS (Entity-Component-System)** architecture where:

1. Entities are just containers for components
2. Systems process components each frame
3. Logic lives in systems, not entities
4. Events communicate between systems

This creates a design tension. The tests expect:
```typescript
const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
const data = townHall.getData();
```

But the ECS architecture would more naturally be:
```typescript
const townHallEntity = world.createEntity();
townHallEntity.addComponent('building', { buildingType: 'town-hall', ... });
townHallEntity.addComponent('governance', { governanceType: 'population-tracking', ... });

// System processes governance buildings each frame
const governanceSystem = world.getSystem('governance');
const data = governanceSystem.getPopulationData();
```

### Proposed Solution

I see two paths forward:

#### Option A: Wrapper API (Recommended)
Create a thin wrapper layer that provides the service-oriented API the tests expect, while internally using the ECS architecture:

```typescript
// World wrapper methods delegate to systems
world.buildTownHall(resources) {
  // 1. Validate resources
  // 2. Create entity with building + governance components
  // 3. Emit building:placement:confirmed event
  // 4. Return wrapper object with getData() method
  return new TownHallWrapper(entity);
}

// Wrapper provides clean API
class TownHallWrapper {
  constructor(private entity: Entity) {}

  getData() {
    const governanceSystem = world.getSystem('governance');
    return governanceSystem.getTownHallData(this.entity);
  }

  setCondition(condition: number) {
    // Update building component health
  }
}
```

**Pros:**
- Tests pass as written
- ECS architecture remains intact
- Clean separation of concerns
- Easy to extend

**Cons:**
- Additional wrapper layer
- Slight performance overhead
- More code to maintain

#### Option B: Rewrite Tests
Rewrite tests to match the ECS architecture:

```typescript
it('should provide basic population count', () => {
  const entity = world.createEntity();
  entity.addComponent('building', { buildingType: 'town-hall', ... });
  entity.addComponent('governance', { governanceType: 'population-tracking' });

  world.createAgent({ position: { x: 0, y: 0 } });
  world.createAgent({ position: { x: 10, y: 10 } });

  const governanceSystem = world.getSystem('governance');
  const data = governanceSystem.getPopulationData();
  expect(data.population).toBe(2);
});
```

**Pros:**
- Matches existing architecture
- No wrapper overhead
- More idiomatic ECS

**Cons:**
- Requires rewriting all tests
- Less ergonomic API for end users
- May not match work order vision

### Recommendation: Option A

I recommend **Option A (Wrapper API)** because:

1. The work order describes governance buildings as **distinct entities** that agents and players interact with
2. The wrapper API is more intuitive for gameplay
3. Tests were written to specify the **intended user experience**
4. Wrappers can be implemented cleanly without breaking ECS

### Next Steps

1. ✅ **Create governance building types** in BuildingComponent
2. **Create GovernanceComponent** to store building-specific data
3. **Create GovernanceSystem** to process governance buildings
4. **Create wrapper classes** for each building type
5. **Add World wrapper methods** that delegate to systems
6. **Add Agent query methods** that find and query buildings
7. **Integrate with MetricsCollector** for data tracking
8. **Run tests** and iterate

### Questions for Review

Before proceeding with full implementation, I want to confirm:

1. **Is Option A (Wrapper API) acceptable?** Or should I rewrite tests for pure ECS?
2. **Should governance buildings be a new building type**, or extend existing types?
3. **Where should wrapper classes live?** In `buildings/` or separate `governance/` directory?

I'll proceed with Option A unless instructed otherwise.

---

**Implementation Agent**
2025-12-26
