# Abstract Region System Specification

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Overview

The Abstract Region System implements Factorio-style production/consumption simulation for regions not actively loaded. This allows the ringworld to simulate 1000+ regions with minimal computational overhead.

## Core Concept

**Active Region:** Full ECS simulation (entities, systems, LLM calls)
**Abstract Region:** Aggregate statistics + production rates only

When player leaves a region, abstract it. When player returns, re-hydrate from abstract state.

## Abstract Region State

```typescript
interface AbstractRegion {
  // Identity
  address: RingworldAddress;
  templateId: string;
  seed: number;

  // Population
  population: number;
  populationDetails: {
    children: number;
    adults: number;
    elderly: number;
  };

  // Infrastructure
  buildings: Map<BuildingType, number>;
  infrastructure: {
    housing: number;      // Total housing capacity
    storage: number;      // Total storage capacity
    production: number;   // Total production buildings
  };

  // Resources
  resources: Map<ResourceType, number>;
  resourceCapacity: Map<ResourceType, number>;

  // Production (per day)
  production: Map<ResourceType, number>;
  consumption: Map<ResourceType, number>;

  // Economy
  techLevel: number;           // 0-10
  researchProgress: number;    // Current research points
  tradeBalance: number;        // Net imports/exports

  // Social
  governance: GovernanceState;
  mood: number;                // -100 to +100
  stability: number;           // 0-100

  // Military
  defenseRating: number;       // 0-100
  militaryStrength: number;

  // Timing
  lastSimulatedTick: number;
  ticksAbstracted: number;

  // Events
  recentEvents: AbstractEvent[];

  // Player interaction
  playerVisited: boolean;
  playerLastVisitTick: number;
  playerReputation: number;
}

type GovernanceState =
  | 'stable'      // Normal operation
  | 'growth'      // Expanding, prosperous
  | 'declining'   // Resources depleting
  | 'chaos'       // War, famine, collapse
  | 'abandoned';  // No population

interface AbstractEvent {
  tick: number;
  type: EventType;
  description: string;
  impact: Map<string, number>; // stat -> change
}
```

## Abstraction Process

### From Active to Abstract

```typescript
function abstractActiveRegion(region: ActiveRegion): AbstractRegion {
  const agents = region.world.query().with('agent').executeEntities();
  const buildings = region.world.query().with('building').executeEntities();

  return {
    address: region.address,
    templateId: region.template.id,
    seed: region.template.terrainSeed,

    // Count agents
    population: agents.length,
    populationDetails: countPopulationByAge(agents),

    // Count buildings
    buildings: countBuildingsByType(buildings),
    infrastructure: calculateInfrastructure(buildings),

    // Sum resources
    resources: aggregateResources(region.world),
    resourceCapacity: calculateCapacity(buildings),

    // Calculate production/consumption rates
    production: calculateProductionRates(region, agents, buildings),
    consumption: calculateConsumptionRates(agents),

    // Aggregate stats
    techLevel: calculateAverageTechLevel(agents),
    governance: assessGovernance(region),
    mood: calculateAverageMood(agents),
    stability: calculateStability(region),

    defenseRating: calculateDefense(buildings, agents),
    militaryStrength: countMilitary(agents),

    lastSimulatedTick: region.tick,
    ticksAbstracted: 0,

    recentEvents: [],

    playerVisited: true,
    playerLastVisitTick: region.tick,
    playerReputation: 0,
  };
}
```

### Production Rate Calculation

```typescript
function calculateProductionRates(
  region: ActiveRegion,
  agents: Entity[],
  buildings: Entity[]
): Map<ResourceType, number> {
  const rates = new Map<ResourceType, number>();

  // Buildings produce resources
  for (const building of buildings) {
    const buildingComp = building.getComponent('building');
    const production = buildingComp.production;

    if (production) {
      for (const [resource, rate] of Object.entries(production)) {
        rates.set(
          resource,
          (rates.get(resource) || 0) + rate
        );
      }
    }
  }

  // Agents with professions produce
  for (const agent of agents) {
    const profession = agent.getComponent('profession');
    if (!profession) continue;

    const production = getProfessionProduction(profession.type);
    for (const [resource, rate] of Object.entries(production)) {
      rates.set(
        resource,
        (rates.get(resource) || 0) + rate
      );
    }
  }

  return rates;
}

function calculateConsumptionRates(agents: Entity[]): Map<ResourceType, number> {
  const rates = new Map<ResourceType, number>();

  // Basic consumption: food, water per agent
  const foodPerAgent = 2.0;  // per day
  const waterPerAgent = 5.0; // per day

  rates.set('food', agents.length * foodPerAgent);
  rates.set('water', agents.length * waterPerAgent);

  // Additional consumption based on tech level
  // Higher tech = more energy, materials consumed

  return rates;
}
```

## Fast-Forward Simulation

### Tick Abstract Region

```typescript
function tickAbstractRegion(region: AbstractRegion, ticksPassed: number): void {
  const daysPassed = ticksPassed / TICKS_PER_DAY;

  // 1. Apply production
  for (const [resource, rate] of region.production) {
    const produced = rate * daysPassed;
    const current = region.resources.get(resource) || 0;
    const capacity = region.resourceCapacity.get(resource) || Infinity;

    region.resources.set(
      resource,
      Math.min(current + produced, capacity)
    );
  }

  // 2. Apply consumption
  for (const [resource, rate] of region.consumption) {
    const consumed = rate * daysPassed;
    const current = region.resources.get(resource) || 0;

    region.resources.set(
      resource,
      Math.max(current - consumed, 0)
    );
  }

  // 3. Check for critical shortages
  handleResourceShortages(region, daysPassed);

  // 4. Population dynamics
  updatePopulation(region, daysPassed);

  // 5. Governance changes
  updateGovernance(region, daysPassed);

  // 6. Random events
  rollForEvents(region, daysPassed);

  // 7. Update timing
  region.ticksAbstracted += ticksPassed;
}
```

### Resource Shortage Handling

```typescript
function handleResourceShortages(region: AbstractRegion, days: number): void {
  const food = region.resources.get('food') || 0;
  const foodNeeded = (region.consumption.get('food') || 0) * days;

  if (food < foodNeeded * 0.1) {
    // Severe food shortage - famine!
    const starvationRate = 0.05; // 5% die per day
    const deaths = Math.floor(region.population * starvationRate * days);

    region.population -= deaths;
    region.mood -= 30;
    region.stability -= 20;
    region.governance = 'chaos';

    region.recentEvents.push({
      tick: region.lastSimulatedTick + days * TICKS_PER_DAY,
      type: 'famine',
      description: `Famine struck! ${deaths} perished from starvation.`,
      impact: new Map([
        ['population', -deaths],
        ['mood', -30],
        ['stability', -20]
      ])
    });
  } else if (food < foodNeeded * 0.5) {
    // Food shortage - rationing
    region.mood -= 10;
    region.stability -= 5;
    region.governance = 'declining';

    region.recentEvents.push({
      tick: region.lastSimulatedTick + days * TICKS_PER_DAY,
      type: 'shortage',
      description: 'Food rationing imposed due to shortages.',
      impact: new Map([
        ['mood', -10],
        ['stability', -5]
      ])
    });
  }
}
```

### Population Dynamics

```typescript
function updatePopulation(region: AbstractRegion, days: number): void {
  const food = region.resources.get('food') || 0;
  const housing = region.infrastructure.housing;

  // Base growth rate
  let growthRate = 0.001; // 0.1% per day

  // Factors
  if (food > region.consumption.get('food')! * 30) {
    growthRate *= 1.5; // Surplus food = growth
  }

  if (region.population > housing) {
    growthRate *= 0.5; // Housing shortage = slower growth
  }

  if (region.mood > 50) {
    growthRate *= 1.2; // Happy people = more children
  } else if (region.mood < -50) {
    growthRate *= 0.7; // Unhappy = emigration
  }

  // Apply growth
  const newPopulation = Math.floor(
    region.population * (1 + growthRate * days)
  );

  if (newPopulation !== region.population) {
    const change = newPopulation - region.population;
    region.population = newPopulation;

    if (change > 0) {
      region.recentEvents.push({
        tick: region.lastSimulatedTick + days * TICKS_PER_DAY,
        type: 'growth',
        description: `Population grew by ${change} as prosperity increased.`,
        impact: new Map([['population', change]])
      });

      region.governance = 'growth';
    } else {
      region.recentEvents.push({
        tick: region.lastSimulatedTick + days * TICKS_PER_DAY,
        type: 'decline',
        description: `${Math.abs(change)} people left due to hardship.`,
        impact: new Map([['population', change]])
      });
    }
  }
}
```

### Random Events

```typescript
function rollForEvents(region: AbstractRegion, days: number): void {
  // Roll for random events based on region type and state
  const eventChance = 0.01 * days; // 1% chance per day

  if (Math.random() < eventChance) {
    const event = generateRandomEvent(region);
    applyEventEffects(region, event);
    region.recentEvents.push(event);
  }
}

function generateRandomEvent(region: AbstractRegion): AbstractEvent {
  const events = [
    {
      type: 'discovery',
      description: 'Explorers discovered ancient technology!',
      impact: new Map([
        ['techLevel', 1],
        ['mood', 10]
      ])
    },
    {
      type: 'plague',
      description: 'A plague swept through the region.',
      impact: new Map([
        ['population', -Math.floor(region.population * 0.1)],
        ['mood', -20],
        ['stability', -15]
      ])
    },
    {
      type: 'golden_age',
      description: 'A golden age of prosperity began!',
      impact: new Map([
        ['production', 1.5], // Multiplier
        ['mood', 30],
        ['stability', 10]
      ])
    },
    {
      type: 'invasion',
      description: 'Marauders attacked from the wastes!',
      impact: new Map([
        ['population', -Math.floor(region.population * 0.05)],
        ['mood', -15],
        ['stability', -20]
      ])
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];

  return {
    tick: region.lastSimulatedTick,
    type: selected.type,
    description: selected.description,
    impact: selected.impact
  };
}
```

## Region Hydration

### From Abstract to Active

```typescript
async function hydrateRegion(abstract: AbstractRegion): Promise<ActiveRegion> {
  // 1. Fast-forward to current time
  const currentTick = getCurrentTick();
  const ticksPassed = currentTick - abstract.lastSimulatedTick;
  tickAbstractRegion(abstract, ticksPassed);

  // 2. Generate terrain from seed
  const template = getTemplate(abstract.templateId);
  const world = new World();
  const terrainGen = new TerrainGenerator(abstract.seed.toString());
  const chunkManager = new ChunkManager();

  // Generate initial chunks (will expand as needed)
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      const chunk = chunkManager.getChunk(x, y);
      terrainGen.generateChunk(chunk, world);
    }
  }

  // 3. Spawn buildings from counts
  const buildings = await spawnBuildingsFromCounts(
    world,
    abstract.buildings,
    template
  );

  // 4. Spawn agents matching population
  const agents = await spawnAgentsFromAbstract(
    world,
    abstract,
    template
  );

  // 5. Set resource stockpiles
  createResourceStockpiles(world, abstract.resources);

  // 6. Initialize systems
  const systems = initializeSystems(world);

  // 7. Apply recent events (show to player)
  displayRecentEvents(abstract.recentEvents);

  return {
    address: abstract.address,
    template,
    world,
    chunkManager,
    terrainGenerator: terrainGen,
    entities: new Map(),
    systems,
    tick: currentTick,
    resources: abstract.resources
  };
}
```

### Agent Spawning

```typescript
async function spawnAgentsFromAbstract(
  world: World,
  abstract: AbstractRegion,
  template: RegionTemplate
): Promise<Entity[]> {
  const agents: Entity[] = [];

  // Spawn agents with skills matching tech level
  for (let i = 0; i < abstract.population; i++) {
    const agent = world.createEntity();

    // Basic components
    agent.addComponent({ type: 'agent' });
    agent.addComponent({
      type: 'position',
      x: Math.random() * 1000,
      y: Math.random() * 1000
    });

    // Age distribution
    const age = sampleAgeDistribution(abstract.populationDetails);
    agent.addComponent({
      type: 'identity',
      age,
      name: generateName(template.population.culture)
    });

    // Skills matching tech level
    agent.addComponent({
      type: 'skills',
      levels: generateSkillsForTechLevel(abstract.techLevel)
    });

    // Mood
    agent.addComponent({
      type: 'needs',
      happiness: abstract.mood,
      hunger: Math.random() * 50
    });

    agents.push(agent);
  }

  return agents;
}

function generateSkillsForTechLevel(techLevel: number): Map<string, number> {
  const skills = new Map<string, number>();

  // Base skills for all tech levels
  skills.set('farming', techLevel * 0.5);
  skills.set('crafting', techLevel * 0.5);

  // Advanced skills unlock at higher tech
  if (techLevel >= 5) {
    skills.set('engineering', techLevel * 0.3);
  }

  if (techLevel >= 7) {
    skills.set('research', techLevel * 0.2);
    skills.set('advanced_crafting', techLevel * 0.3);
  }

  return skills;
}
```

## Performance Optimization

### Batch Updates

```typescript
class AbstractRegionManager {
  private abstractRegions = new Map<string, AbstractRegion>();

  // Update all abstract regions in one pass
  tickAllRegions(currentTick: number): void {
    const updates: Array<[string, AbstractRegion]> = [];

    for (const [key, region] of this.abstractRegions) {
      const ticksPassed = currentTick - region.lastSimulatedTick;

      if (ticksPassed > 0) {
        tickAbstractRegion(region, ticksPassed);
        region.lastSimulatedTick = currentTick;
        updates.push([key, region]);
      }
    }

    // Batch save
    this.saveRegions(updates);
  }
}
```

### Lazy Evaluation

Only calculate production rates when needed:

```typescript
class LazyAbstractRegion {
  private _production: Map<ResourceType, number> | null = null;

  get production(): Map<ResourceType, number> {
    if (!this._production) {
      this._production = this.calculateProduction();
    }
    return this._production;
  }

  invalidateProduction(): void {
    this._production = null;
  }
}
```

## Storage Format

```typescript
interface SerializedAbstractRegion {
  addr: [number, number];  // [megasegment, region]
  tmpl: string;            // Template ID
  seed: number;

  // Compressed state
  pop: number;
  bld: [string, number][]; // [[type, count], ...]
  res: [string, number][]; // [[resource, amount], ...]

  // Rates (calculate on load, don't store)
  // prod: not stored
  // cons: not stored

  // Stats
  tech: number;
  gov: number;  // Enum as number
  mood: number;

  // Timing
  tick: number;

  // Events (last 10 only)
  evts: SerializedEvent[];
}

// Storage size: ~500 bytes per region
```

## Success Metrics

- **Memory:** < 2KB per abstract region
- **CPU:** < 0.001ms per region per tick
- **Accuracy:** Abstract simulation within 10% of full simulation
- **Hydration time:** < 500ms to generate active region
- **Event variety:** At least 20 different random events

## Testing Strategy

1. **Accuracy test:** Run same scenario both fully simulated and abstract, compare results
2. **Performance test:** Tick 1000 abstract regions in < 1ms
3. **Determinism test:** Same seed + same events = same outcome
4. **Stress test:** 10,000 abstract regions without memory issues
