# World Simulation Abstraction Layers - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

A living world requires simulation at multiple scales. We can't run full LLM inference for every agent in every village simultaneously. Instead, we use **layer renormalization** - abstracting detail based on observation distance. Nearby villages run individual agents; distant civilizations run as statistical aggregates with key figures.

This is inspired by Dwarf Fortress's world simulation, where history unfolds across civilizations while you focus on one fortress.

---

## Simulation Layers

```typescript
type SimulationLayer =
  | "full"           // Every agent, every tick, full LLM
  | "active"         // Agents run, but reduced LLM calls
  | "background"     // Key agents only, hourly updates
  | "abstract"       // Village as aggregate, daily updates
  | "historical";    // Civilization stats, seasonal updates

interface LayerDefinition {
  layer: SimulationLayer;

  agentSimulation: {
    llmCalls: "full" | "reduced" | "leaders_only" | "none";
    tickRate: number;           // Simulation ticks per game tick
    memoryFormation: boolean;   // Do agents form memories?
    socialInteraction: boolean; // Do agents talk?
  };

  economySimulation: {
    granularity: "per_transaction" | "hourly" | "daily" | "aggregate";
    priceUpdates: boolean;
    resourceTracking: "exact" | "estimated";
  };

  eventGeneration: {
    frequency: "every_tick" | "hourly" | "daily" | "weekly";
    types: EventType[];         // What events can occur
  };
}
```

---

## Layer Definitions

### Full Simulation (Player Focus)

```typescript
const fullSimulation: LayerDefinition = {
  layer: "full",

  // Where player is actively present
  trigger: {
    playerPresent: true,
    orRecentlyVisited: "< 1 hour ago",
  },

  agentSimulation: {
    llmCalls: "full",
    tickRate: 1.0,              // Every tick
    memoryFormation: true,
    socialInteraction: true,
  },

  economySimulation: {
    granularity: "per_transaction",
    priceUpdates: true,
    resourceTracking: "exact",
  },

  eventGeneration: {
    frequency: "every_tick",
    types: ["all"],
  },

  // Typical scope
  scope: {
    villages: 1,
    agents: 20-50,
    chunks: 25,                 // Active chunk radius
  },
};
```

### Active Simulation (Nearby)

```typescript
const activeSimulation: LayerDefinition = {
  layer: "active",

  // Adjacent villages, places player might visit soon
  trigger: {
    distanceFromPlayer: "< 3 villages",
    hasTradeRoute: true,
    recentlyVisited: "< 1 day ago",
  },

  agentSimulation: {
    llmCalls: "reduced",        // Sample 20% of agents per tick
    tickRate: 0.5,              // Half speed
    memoryFormation: true,      // Still form memories
    socialInteraction: true,    // But less frequent
  },

  economySimulation: {
    granularity: "hourly",
    priceUpdates: true,
    resourceTracking: "exact",
  },

  eventGeneration: {
    frequency: "hourly",
    types: ["major", "economic", "social", "discovery"],
  },
};
```

### Background Simulation (Regional)

```typescript
const backgroundSimulation: LayerDefinition = {
  layer: "background",

  // Same region, known villages
  trigger: {
    distanceFromPlayer: "< 10 villages",
    known: true,                // Player has visited or heard of
  },

  agentSimulation: {
    llmCalls: "leaders_only",   // Only village heads, merchants
    tickRate: 0.1,              // 10% speed
    memoryFormation: false,     // Regular agents don't form memories
    socialInteraction: false,   // Abstracted
  },

  // Key figures still simulated
  keyFigures: {
    villageLeader: true,
    headMerchant: true,
    masterCraftspeople: true,
    militaryLeader: true,
  },

  economySimulation: {
    granularity: "daily",
    priceUpdates: true,
    resourceTracking: "estimated",
  },

  eventGeneration: {
    frequency: "daily",
    types: ["major", "economic", "political"],
  },
};
```

### Abstract Simulation (Continental)

```typescript
const abstractSimulation: LayerDefinition = {
  layer: "abstract",

  // Distant villages, other continents
  trigger: {
    distanceFromPlayer: "> 10 villages",
    orUnvisited: true,
  },

  agentSimulation: {
    llmCalls: "none",           // No individual simulation
    tickRate: 0,
    memoryFormation: false,
    socialInteraction: false,
  },

  // Village as statistical aggregate
  aggregateSimulation: {
    population: "grows/shrinks based on resources",
    resources: "produced/consumed by formulas",
    wealth: "accumulates based on trade",
    stability: "function of resources, leadership, threats",
    culture: "drifts slowly over time",
  },

  economySimulation: {
    granularity: "aggregate",
    priceUpdates: false,        // Use regional averages
    resourceTracking: "estimated",
  },

  eventGeneration: {
    frequency: "weekly",
    types: ["major", "catastrophic"],  // Only big events
  },
};
```

### Historical Simulation (Civilizational)

```typescript
const historicalSimulation: LayerDefinition = {
  layer: "historical",

  // Entire civilizations, deep history
  trigger: {
    scope: "civilization",
    timescale: "years_to_centuries",
  },

  // No individual simulation at all
  civilizationSimulation: {
    population: number;
    territory: Region[];
    resources: ResourceAggregate;
    technology: TechLevel;
    culture: CultureProfile;
    relations: Map<CivilizationId, Relation>;
    stability: number;
  },

  eventGeneration: {
    frequency: "seasonal",
    types: ["war", "famine", "golden_age", "collapse", "migration"],
  },
};
```

---

## Village Aggregate Model

When a village is in abstract simulation, we represent it as:

```typescript
interface VillageAggregate {
  id: string;
  name: string;
  position: WorldPosition;

  // Demographics
  population: {
    total: number;
    growth: number;             // Per season
    specialists: Map<Profession, number>;
  };

  // Economy
  economy: {
    wealth: number;
    production: Map<ResourceType, number>;  // Per day
    consumption: Map<ResourceType, number>;
    surplus: Map<ResourceType, number>;
    scarcity: Map<ResourceType, number>;
    tradePotential: number;     // How much they want to trade
  };

  // Governance
  governance: {
    type: GovernanceType;
    stability: number;          // 0-100
    leaderProfile: LeaderProfile;
    laws: Law[];
    taxRate: number;
  };

  // Military
  military: {
    strength: number;
    defensibility: number;
    activeConflicts: Conflict[];
  };

  // Culture
  culture: {
    values: Value[];
    traditions: Tradition[];
    religion?: Religion;
    reputation: Map<VillageId, number>;
  };

  // State
  currentEvents: OngoingEvent[];
  recentHistory: HistoricalEvent[];
}

type GovernanceType =
  | "council"         // Elders/elected
  | "chief"           // Single leader
  | "merchant_guild"  // Trade-focused
  | "theocracy"       // Religious
  | "commune"         // Collective
  | "anarchy";        // No central authority
```

---

## Key Figures (Heads of State)

Even in abstract simulation, key figures get special treatment:

```typescript
interface KeyFigure {
  id: string;
  role: KeyRole;
  villageId: string;

  // Simplified personality (not full agent)
  profile: {
    name: string;
    traits: Trait[];            // Ambitious, cautious, greedy, fair
    priorities: Priority[];     // Trade, military, culture, isolation
    relationships: Map<KeyFigureId, Relationship>;
  };

  // Decision making
  decisionStyle: {
    riskTolerance: number;      // 0-1
    tradeFriendliness: number;
    warlikeness: number;
    diplomaticSkill: number;
  };

  // State
  currentGoals: Goal[];
  reputation: number;
  tenure: number;               // How long in power
  succession: SuccessionRule;
}

type KeyRole =
  | "village_leader"
  | "trade_master"
  | "military_commander"
  | "high_priest"
  | "guild_master"
  | "elder_council_head";

// Key figures make decisions that affect their village
async function keyFigureDecision(
  figure: KeyFigure,
  situation: Situation
): Promise<Decision> {

  // For important decisions, can still use LLM
  if (situation.importance > 0.7) {
    return await llmDecision(figure, situation);
  }

  // Otherwise, use profile-based heuristics
  return heuristicDecision(figure, situation);
}
```

---

## Layer Transitions

```typescript
interface LayerTransition {
  // When to upgrade detail
  upgradeConditions: {
    playerApproaching: boolean;
    majorEvent: boolean;        // War, disaster, discovery
    tradeCaravanArriving: boolean;
    questRelated: boolean;
  };

  // When to downgrade detail
  downgradeConditions: {
    playerDeparted: boolean;
    timeoutReached: boolean;    // No interaction for X time
    resourcePressure: boolean;  // System needs to free resources
  };

  // Transition process
  transition: {
    // Upgrading: instantiate agents from aggregate
    upgrade: async (aggregate: VillageAggregate) => Village;

    // Downgrading: compress agents to aggregate
    downgrade: async (village: Village) => VillageAggregate;
  };
}

// Instantiate agents when upgrading
async function instantiateFromAggregate(
  aggregate: VillageAggregate
): Promise<Agent[]> {

  const agents: Agent[] = [];

  // Create leader from key figure
  const leader = await createAgentFromProfile(aggregate.governance.leaderProfile);
  agents.push(leader);

  // Generate population based on specialist counts
  for (const [profession, count] of aggregate.population.specialists) {
    for (let i = 0; i < count; i++) {
      const agent = await generateAgent({
        profession,
        villageId: aggregate.id,
        culture: aggregate.culture,
      });
      agents.push(agent);
    }
  }

  // Generate relationships based on village culture
  await generateRelationships(agents, aggregate.culture);

  return agents;
}

// Compress to aggregate when downgrading
async function compressToAggregate(
  village: Village
): Promise<VillageAggregate> {

  return {
    id: village.id,
    name: village.name,
    position: village.position,

    population: {
      total: village.agents.length,
      growth: calculateGrowthRate(village),
      specialists: countByProfession(village.agents),
    },

    economy: {
      wealth: sumWealth(village.agents),
      production: aggregateProduction(village),
      consumption: aggregateConsumption(village),
      surplus: calculateSurplus(village),
      scarcity: calculateScarcity(village),
      tradePotential: calculateTradePotential(village),
    },

    governance: {
      type: determineGovernanceType(village),
      stability: calculateStability(village),
      leaderProfile: extractLeaderProfile(village.leader),
      laws: village.laws,
      taxRate: village.taxRate,
    },

    // ... compress other aspects
  };
}
```

---

## Catch-Up Simulation

When a village upgrades from abstract to full, we need to "catch up" what happened:

```typescript
interface CatchUpSimulation {
  // Time to simulate
  period: {
    start: GameTime;
    end: GameTime;
  };

  // What to generate
  generation: {
    events: HistoricalEvent[];    // What happened
    changes: VillageChange[];     // How village changed
    births: number;
    deaths: number;
    arrivals: number;             // Immigration
    departures: number;           // Emigration
    newBuildings: Building[];
    destroyedBuildings: Building[];
  };
}

async function catchUpVillage(
  aggregate: VillageAggregate,
  timeSinceLastVisit: number
): Promise<CatchUpResult> {

  const events: HistoricalEvent[] = [];

  // Calculate expected events based on time and village state
  const expectedEvents = calculateExpectedEvents(aggregate, timeSinceLastVisit);

  // Generate specific events
  for (const eventType of expectedEvents) {
    const event = await generateHistoricalEvent(eventType, aggregate);
    events.push(event);

    // Apply event effects to aggregate
    applyEventEffects(aggregate, event);
  }

  // Population changes
  const populationChange = simulatePopulationChange(
    aggregate,
    timeSinceLastVisit
  );

  // Economic changes
  const economicChange = simulateEconomicChange(
    aggregate,
    timeSinceLastVisit
  );

  // Now instantiate with this history
  const village = await instantiateFromAggregate(aggregate);

  // Give agents memories of these events
  await distributeHistoricalMemories(village.agents, events);

  return { village, events };
}

// Agents get memories of events that happened while abstracted
async function distributeHistoricalMemories(
  agents: Agent[],
  events: HistoricalEvent[]
): Promise<void> {

  for (const event of events) {
    // Determine which agents would have witnessed/participated
    const participants = selectParticipants(agents, event);

    for (const agent of participants) {
      await createMemory(agent, {
        type: "historical_event",
        summary: event.description,
        importance: event.importance,
        emotionalValence: event.emotionalImpact,
        timestamp: event.time,
        // Mark as retrospective - formed during catch-up
        retrospective: true,
      });
    }
  }
}
```

---

## World Events at Scale

```typescript
interface WorldEvent {
  // Events that affect multiple villages
  scope: "village" | "regional" | "continental" | "global";

  types: {
    // Natural
    drought: { affectedBiomes: BiomeType[], duration: number };
    plague: { spreadRate: number, mortality: number };
    earthquake: { epicenter: Position, radius: number };

    // Political
    war: { aggressor: VillageId, defender: VillageId, allies: VillageId[] };
    alliance: { members: VillageId[], purpose: string };
    trade_agreement: { parties: VillageId[], terms: TradeTerms };

    // Cultural
    religious_movement: { origin: VillageId, spreading: boolean };
    technological_spread: { tech: Technology, fromVillage: VillageId };
    migration: { from: VillageId, to: VillageId, population: number };

    // Economic
    trade_route_established: { villages: VillageId[], goods: ResourceType[] };
    market_crash: { resource: ResourceType, priceChange: number };
    resource_discovery: { village: VillageId, resource: ResourceType };
  };
}

// Generate world events at abstract layer
async function generateWorldEvents(
  world: WorldState,
  timePeriod: number
): Promise<WorldEvent[]> {

  const events: WorldEvent[] = [];

  // Check for natural disasters (based on season, location)
  events.push(...generateNaturalEvents(world, timePeriod));

  // Check for political events (based on relations, resources)
  events.push(...generatePoliticalEvents(world, timePeriod));

  // Check for cultural events (based on culture, contact)
  events.push(...generateCulturalEvents(world, timePeriod));

  // Propagate effects
  for (const event of events) {
    await propagateEventEffects(world, event);
  }

  return events;
}
```

---

## Performance Budgets

```typescript
interface SimulationBudget {
  // Per-frame limits
  perFrame: {
    llmCalls: 5,                // Max LLM calls per frame
    agentUpdates: 50,           // Max agent tick updates
    eventChecks: 20,            // Max event evaluations
  };

  // Layer distribution
  layerBudget: {
    full: 0.60,                 // 60% of budget
    active: 0.25,               // 25% of budget
    background: 0.10,           // 10% of budget
    abstract: 0.05,             // 5% of budget
  };

  // Adaptive scaling
  adaptive: {
    reduceOnLag: true;
    prioritizePlayerArea: true;
    batchBackgroundUpdates: true;
  };
}

// Scheduler for simulation budget
class SimulationScheduler {
  private budget: SimulationBudget;
  private queue: SimulationTask[];

  async tick(): Promise<void> {
    const startTime = performance.now();
    let llmCallsUsed = 0;

    // Sort by priority
    this.queue.sort((a, b) => b.priority - a.priority);

    for (const task of this.queue) {
      // Check budget
      if (llmCallsUsed >= this.budget.perFrame.llmCalls) break;
      if (performance.now() - startTime > 16) break;  // 60fps budget

      // Execute task
      const result = await task.execute();
      llmCallsUsed += result.llmCalls;
    }

    // Carry over incomplete tasks
    this.queue = this.queue.filter(t => !t.completed);
  }
}
```

---

## Summary

| Layer | Scope | Agent Sim | LLM | Update Rate |
|-------|-------|-----------|-----|-------------|
| **Full** | Player's village | All agents | Full | Every tick |
| **Active** | Nearby villages | All agents | 20% sample | Half speed |
| **Background** | Regional | Leaders only | Leaders | Hourly |
| **Abstract** | Continental | None | None | Daily |
| **Historical** | Civilizational | None | None | Seasonal |

Key concepts:
- **Renormalization**: Detail scales with observation distance
- **Key figures**: Leaders/heads of state always get some simulation
- **Catch-up**: History generated when upgrading detail
- **Budgets**: Fixed computational limits per frame

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Full agent simulation
- `game-engine/spec.md` - Simulation budgets, tick scheduling
- `world-system/procedural-generation.md` - Chunk-based world

**Multi-Village Systems:**
- `economy-system/inter-village-trade.md` - Trade between villages
- `agent-system/chroniclers.md` - How chroniclers work across layers (key figures document)
- `progression-system/spec.md` - Complexity unlocks scope expansion

**Layer-Specific Behavior:**
- `agent-system/needs.md` - Key figures have simplified need profiles
- `agent-system/memory-system.md` - Catch-up memories when upgrading

