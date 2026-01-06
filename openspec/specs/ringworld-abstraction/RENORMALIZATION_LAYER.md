# Renormalization Layer: Time Scaling & Statistical Simulation

**Status**: Design Draft
**Date**: 2026-01-06
**Key Insight**: At ringworld scale, you don't simulate agents - you simulate *statistics about agents*

---

## The Problem

Aggregating ECS data tells you the current state. But at higher tiers:
- **Time must move faster** - A century at ringworld scale is a moment
- **Individual decisions don't matter** - Only aggregate trends
- **You can't store trillions of agents** - Only their statistical summary
- **When you zoom in**, the summary must constrain what you generate

This is **renormalization**: physics at different scales, different variables.

---

## Time Scaling by Tier

```
Tier         | Time per Tick | What 1 Tick Represents
-------------|---------------|------------------------
Chunk (0)    | 50ms real     | 1 game minute (full ECS)
Zone (1)     | 50ms real     | 1 game hour
Region (2)   | 50ms real     | 1 game day
Subsection   | 50ms real     | 1 game week
Megasegment  | 50ms real     | 1 game month
Gigasegment  | 50ms real     | 1 game year
Ringworld    | 50ms real     | 1 game decade
```

At ringworld view, every tick advances the simulation by a DECADE. Individual agent lifetimes are noise - only generational trends matter.

---

## Summarization: What Gets Rounded Up

### From Individual to Zone (Tier 0 → Tier 1)

**Individual Agent Data:**
```typescript
agent: {
  id: "agent_123",
  position: { x: 45.2, y: 89.7 },
  behavior: "farming",
  hunger: 0.3,
  happiness: 0.7,
  skills: { farming: 2.5, crafting: 1.2 },
  beliefs: { deity_wisdom: 0.8, deity_war: 0.1 },
  age: 35,
  alive: true
}
```

**Summarized to Zone:**
```typescript
zone: {
  population: 847,
  demographics: {
    ageDistribution: [0.2, 0.3, 0.3, 0.15, 0.05], // buckets
    avgLifespan: 62,
    birthRate: 0.015,    // per tick
    deathRate: 0.012,
  },
  economy: {
    workerDistribution: {
      farming: 0.4,
      crafting: 0.2,
      gathering: 0.15,
      idle: 0.25,
    },
    productionRates: {
      food: 120,    // units per tick
      wood: 45,
      stone: 12,
    },
    consumptionRates: {
      food: 100,
      wood: 20,
      stone: 5,
    },
  },
  wellbeing: {
    avgHappiness: 0.65,
    avgHealth: 0.82,
    avgHunger: 0.25,
  },
  belief: {
    totalFaith: 0.72,   // avg faith level
    distribution: {
      deity_wisdom: 0.6,
      deity_war: 0.15,
      deity_harvest: 0.2,
      unaffiliated: 0.05,
    },
  },
  skills: {
    avgFarming: 2.1,
    avgCrafting: 1.5,
    // ... aggregate skill levels
  },
}
```

**What gets LOST:**
- Individual identities (unless "important" flag)
- Exact positions (only zone membership)
- Moment-to-moment behavior (only distribution)
- Personal relationships (only faction membership)

**What gets KEPT:**
- Named NPCs (governor, high priest, heroes)
- Historical events (plague, war, miracle)
- Buildings (temples, universities)
- Player interactions

---

### From Zone to Region (Tier 1 → Tier 2)

**Zone Data:**
```typescript
zone: {
  population: 847,
  birthRate: 0.015,
  deathRate: 0.012,
  foodProduction: 120,
  foodConsumption: 100,
  avgFaith: 0.72,
  // ...
}
```

**Summarized to Region:**
```typescript
region: {
  // Population is summed
  population: 84_700,  // 100 zones

  // Rates become weighted averages
  birthRate: 0.014,
  deathRate: 0.013,

  // Production/consumption summed
  foodSurplus: 2000,  // net per tick

  // Faith becomes distribution
  beliefDensity: 0.68,
  dominantDeity: "deity_wisdom",

  // NEW at this level:
  tradeBalance: 150,  // net trade with other regions
  techLevel: 4,       // emerges from university presence
  stability: 0.75,    // computed from many factors

  // LOST at this level:
  // - Individual zone identities (unless major city)
  // - Zone-level skill distributions
}
```

---

### From Region to Higher Tiers

Each tier up:
1. **Sums** quantities (population, production)
2. **Averages** rates (birth, death, faith)
3. **Computes** emergent properties (stability, tech level)
4. **Loses** detail (individual zones become statistics)
5. **Keeps** significant events and named entities

---

## Statistical Simulation at Higher Tiers

At Zone level and above, we don't run the ECS. We run differential equations.

### Population Dynamics

```typescript
// Zone-level population simulation (runs when zone not instantiated)
function simulateZonePopulation(zone: ZoneSummary, deltaTicks: number): void {
  // Logistic growth with carrying capacity
  const r = zone.birthRate - zone.deathRate;
  const K = zone.carryingCapacity;
  const P = zone.population;

  // dP/dt = r * P * (1 - P/K)
  const dP = r * P * (1 - P / K) * deltaTicks;

  // Apply resource constraints
  const foodRatio = zone.foodProduction / zone.foodConsumption;
  const resourceModifier = Math.min(1, foodRatio);

  zone.population += dP * resourceModifier;

  // Clamp to reasonable bounds
  zone.population = Math.max(0, Math.min(K * 1.2, zone.population));
}
```

### Belief Dynamics

```typescript
// Belief spread simulation
function simulateBeliefSpread(tier: TierSummary, deltaTicks: number): void {
  for (const [deityId, believers] of tier.beliefDistribution) {
    // Belief grows based on:
    // - Existing believers (word of mouth)
    // - Temple presence
    // - Miracles performed
    // - Competition from other deities

    const growthRate =
      believers * 0.001 +                    // Word of mouth
      tier.temples[deityId] * 100 +          // Temple bonus
      tier.recentMiracles[deityId] * 1000 -  // Miracle bonus
      tier.competingBeliefPressure * 0.0005; // Competition

    tier.beliefDistribution.set(
      deityId,
      believers + growthRate * deltaTicks
    );
  }

  // Normalize to population
  normalizeBeliefDistribution(tier);
}
```

### Tech Progression

```typescript
// Tech level emerges from universities + time + stability
function simulateTechProgression(tier: TierSummary, deltaTicks: number): void {
  const universities = tier.universities;
  const researchGuilds = tier.researchGuilds;
  const stability = tier.stability;

  // Research progress (0-100 per level)
  const researchRate =
    universities * 0.1 +           // Base research
    researchGuilds * 0.05 +        // Guild bonus
    stability * 0.01;              // Stability bonus

  tier.researchProgress += researchRate * deltaTicks;

  // Level up
  if (tier.researchProgress >= 100) {
    tier.techLevel++;
    tier.researchProgress = 0;

    // Emit event
    emitEvent('tech:breakthrough', {
      tier: tier.id,
      newLevel: tier.techLevel
    });
  }
}
```

### Stability Computation

```typescript
// Stability emerges from multiple factors
function computeStability(tier: TierSummary): number {
  const factors = {
    food: tier.foodSurplus > 0 ? 1.0 : 0.5,
    happiness: tier.avgHappiness,
    governance: tier.hasGovernor ? 0.9 : 0.6,
    belief: tier.beliefDensity > 0.5 ? 0.9 : 0.7,
    war: tier.atWar ? 0.3 : 1.0,
    disaster: tier.recentDisaster ? 0.5 : 1.0,
  };

  // Weighted average
  return (
    factors.food * 0.3 +
    factors.happiness * 0.2 +
    factors.governance * 0.15 +
    factors.belief * 0.1 +
    factors.war * 0.15 +
    factors.disaster * 0.1
  );
}
```

---

## The Renormalization System

### RenormalizationSystem

**File:** `packages/core/src/systems/RenormalizationSystem.ts`

```typescript
/**
 * Handles time-scaled simulation at different hierarchy tiers.
 * When ECS is not active for a tier, runs statistical simulation.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';

export interface TierSummary {
  tierId: string;
  tierLevel: number;  // 0=chunk, 6=ringworld

  // Population
  population: number;
  birthRate: number;
  deathRate: number;
  carryingCapacity: number;

  // Economy
  foodProduction: number;
  foodConsumption: number;
  resourceSurplus: Map<string, number>;

  // Belief
  beliefDistribution: Map<string, number>;  // deityId -> count
  beliefDensity: number;
  temples: Map<string, number>;             // deityId -> temple count
  recentMiracles: Map<string, number>;

  // Progress
  techLevel: number;
  researchProgress: number;
  universities: number;
  researchGuilds: number;

  // Stability
  stability: number;
  avgHappiness: number;
  hasGovernor: boolean;
  atWar: boolean;
  recentDisaster: boolean;

  // Important entities (not summarized away)
  namedNPCs: NamedNPC[];
  majorBuildings: Building[];
  historicalEvents: HistoricalEvent[];

  // Time tracking
  lastSimulatedTick: number;
  simulatedYears: number;
}

export class RenormalizationSystem implements System {
  readonly id = 'renormalization';
  readonly priority = 120;  // After aggregation
  readonly requiredComponents = [] as const;

  // Time scaling: how many game-ticks one system-tick represents at each level
  private readonly TIME_SCALE: Record<number, number> = {
    0: 1,        // Chunk: 1 tick = 1 tick (real ECS)
    1: 60,       // Zone: 1 tick = 1 hour
    2: 1440,     // Region: 1 tick = 1 day
    3: 10080,    // Subsection: 1 tick = 1 week
    4: 43200,    // Megasegment: 1 tick = 1 month
    5: 525600,   // Gigasegment: 1 tick = 1 year
    6: 5256000,  // Ringworld: 1 tick = 1 decade
  };

  // Cached tier summaries
  private summaries: Map<string, TierSummary> = new Map();

  // Which tiers are "active" (have ECS running)
  private activeTiers: Set<string> = new Set();

  initialize(world: World): void {
    // Subscribe to tier activation/deactivation
    world.eventBus.subscribe('hierarchy:tier_activated', (e) => {
      this.activeTiers.add(e.data.tierId);
    });
    world.eventBus.subscribe('hierarchy:tier_deactivated', (e) => {
      this.activeTiers.delete(e.data.tierId);
      this.summarizeTier(world, e.data.tierId);
    });
  }

  update(world: World, _entities: any[], deltaTime: number): void {
    // For each inactive tier, run statistical simulation
    for (const [tierId, summary] of this.summaries) {
      if (this.activeTiers.has(tierId)) {
        continue;  // ECS handles this tier
      }

      const timeScale = this.TIME_SCALE[summary.tierLevel];
      const scaledDelta = deltaTime * timeScale;

      this.simulateTier(summary, scaledDelta, world);
      summary.lastSimulatedTick = world.tick;
    }
  }

  private simulateTier(summary: TierSummary, deltaTicks: number, world: World): void {
    // Population dynamics
    this.simulatePopulation(summary, deltaTicks);

    // Economy
    this.simulateEconomy(summary, deltaTicks);

    // Belief spread
    this.simulateBelief(summary, deltaTicks, world);

    // Tech progression
    this.simulateTech(summary, deltaTicks, world);

    // Random events
    this.rollRandomEvents(summary, deltaTicks, world);

    // Recompute stability
    summary.stability = this.computeStability(summary);
  }

  private simulatePopulation(summary: TierSummary, deltaTicks: number): void {
    const r = summary.birthRate - summary.deathRate;
    const K = summary.carryingCapacity;
    const P = summary.population;

    // Logistic growth
    const dP = r * P * (1 - P / K) * deltaTicks;

    // Resource constraints
    const foodRatio = summary.foodProduction / Math.max(1, summary.foodConsumption);
    const resourceMod = Math.min(1, Math.sqrt(foodRatio));

    // Stability affects growth
    const stabilityMod = 0.5 + summary.stability * 0.5;

    summary.population = Math.max(
      0,
      summary.population + dP * resourceMod * stabilityMod
    );
  }

  private simulateEconomy(summary: TierSummary, deltaTicks: number): void {
    // Production scales with population and tech
    const techBonus = 1 + summary.techLevel * 0.1;
    const baseProduction = summary.population * 0.1 * techBonus;

    summary.foodProduction = baseProduction * (1 + summary.stability * 0.5);
    summary.foodConsumption = summary.population * 0.08;

    // Update surplus
    const surplus = summary.foodProduction - summary.foodConsumption;
    summary.resourceSurplus.set('food', surplus * deltaTicks);
  }

  private simulateBelief(summary: TierSummary, deltaTicks: number, world: World): void {
    const totalPop = summary.population;

    for (const [deityId, believers] of summary.beliefDistribution) {
      // Growth factors
      const wordOfMouth = believers * 0.0001;
      const templeBonus = (summary.temples.get(deityId) || 0) * 10;
      const miracleBonus = (summary.recentMiracles.get(deityId) || 0) * 100;

      // Decay
      const naturalDecay = believers * 0.00005;

      const delta = (wordOfMouth + templeBonus + miracleBonus - naturalDecay) * deltaTicks;

      const newBelievers = Math.max(0, Math.min(totalPop, believers + delta));
      summary.beliefDistribution.set(deityId, newBelievers);
    }

    // Update belief density
    let totalBelievers = 0;
    for (const count of summary.beliefDistribution.values()) {
      totalBelievers += count;
    }
    summary.beliefDensity = totalPop > 0 ? totalBelievers / totalPop : 0;
  }

  private simulateTech(summary: TierSummary, deltaTicks: number, world: World): void {
    if (summary.universities === 0) return;

    const researchRate =
      summary.universities * 0.01 +
      summary.researchGuilds * 0.005 +
      summary.stability * 0.001;

    summary.researchProgress += researchRate * deltaTicks;

    while (summary.researchProgress >= 100 && summary.techLevel < 10) {
      summary.techLevel++;
      summary.researchProgress -= 100;

      world.eventBus.emit({
        type: 'hierarchy:tech_breakthrough',
        timestamp: world.tick,
        data: {
          tierId: summary.tierId,
          newLevel: summary.techLevel
        }
      });
    }
  }

  private rollRandomEvents(summary: TierSummary, deltaTicks: number, world: World): void {
    // Scale event probability with time
    const eventChance = 0.0001 * deltaTicks;

    if (Math.random() < eventChance) {
      const event = this.generateRandomEvent(summary);
      this.applyEvent(summary, event);

      summary.historicalEvents.push(event);

      world.eventBus.emit({
        type: 'hierarchy:event_occurred',
        timestamp: world.tick,
        data: event
      });
    }
  }

  private generateRandomEvent(summary: TierSummary): HistoricalEvent {
    const eventTypes = [
      { type: 'plague', weight: 0.1, effect: 'population' },
      { type: 'famine', weight: 0.1, effect: 'population' },
      { type: 'war', weight: 0.1, effect: 'stability' },
      { type: 'golden_age', weight: 0.05, effect: 'growth' },
      { type: 'tech_breakthrough', weight: 0.1, effect: 'tech' },
      { type: 'religious_revival', weight: 0.1, effect: 'belief' },
      { type: 'natural_disaster', weight: 0.1, effect: 'infrastructure' },
    ];

    // Weighted random selection
    const totalWeight = eventTypes.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const evt of eventTypes) {
      roll -= evt.weight;
      if (roll <= 0) {
        return {
          type: evt.type,
          effect: evt.effect,
          severity: Math.random(),
          tick: Date.now(),
          description: `${evt.type} in ${summary.tierId}`
        };
      }
    }

    return { type: 'nothing', effect: 'none', severity: 0, tick: Date.now(), description: '' };
  }

  private applyEvent(summary: TierSummary, event: HistoricalEvent): void {
    switch (event.effect) {
      case 'population':
        summary.population *= (1 - event.severity * 0.3);
        break;
      case 'stability':
        summary.stability *= (1 - event.severity * 0.5);
        summary.atWar = event.type === 'war';
        break;
      case 'growth':
        summary.birthRate *= (1 + event.severity * 0.2);
        break;
      case 'tech':
        summary.researchProgress += event.severity * 50;
        break;
      case 'belief':
        summary.beliefDensity = Math.min(1, summary.beliefDensity + event.severity * 0.2);
        break;
      case 'infrastructure':
        summary.recentDisaster = true;
        summary.foodProduction *= (1 - event.severity * 0.4);
        break;
    }
  }

  private computeStability(summary: TierSummary): number {
    const foodSecurity = summary.foodProduction >= summary.foodConsumption ? 1.0 : 0.5;
    const popPressure = Math.min(1, summary.carryingCapacity / Math.max(1, summary.population));
    const warPenalty = summary.atWar ? 0.3 : 1.0;
    const disasterPenalty = summary.recentDisaster ? 0.7 : 1.0;
    const beliefBonus = summary.beliefDensity > 0.5 ? 1.1 : 1.0;

    return Math.max(0, Math.min(1,
      foodSecurity * 0.3 +
      popPressure * 0.2 +
      summary.avgHappiness * 0.2 +
      warPenalty * 0.15 +
      disasterPenalty * 0.15
    ) * beliefBonus);
  }

  // PUBLIC API

  /**
   * Summarize a tier from ECS data (called when tier deactivates)
   */
  summarizeTier(world: World, tierId: string): TierSummary {
    const beliefSystem = world.getSystem('belief_aggregation') as any;
    const beliefStats = beliefSystem?.getBeliefStats(tierId);
    const popStats = beliefSystem?.getPopulationStats(tierId);

    const summary: TierSummary = {
      tierId,
      tierLevel: this.getTierLevel(tierId),
      population: popStats?.total || beliefStats?.population || 0,
      birthRate: 0.015,
      deathRate: 0.012,
      carryingCapacity: (popStats?.total || 1000) * 2,
      foodProduction: (popStats?.total || 1000) * 0.12,
      foodConsumption: (popStats?.total || 1000) * 0.1,
      resourceSurplus: new Map([['food', 0]]),
      beliefDistribution: beliefStats?.byDeity || new Map(),
      beliefDensity: beliefStats?.beliefDensity || 0,
      temples: new Map(),
      recentMiracles: new Map(),
      techLevel: 1,
      researchProgress: 0,
      universities: 0,
      researchGuilds: 0,
      stability: 0.7,
      avgHappiness: popStats?.avgHappiness || 0.6,
      hasGovernor: false,
      atWar: false,
      recentDisaster: false,
      namedNPCs: [],
      majorBuildings: [],
      historicalEvents: [],
      lastSimulatedTick: world.tick,
      simulatedYears: 0,
    };

    this.summaries.set(tierId, summary);
    return summary;
  }

  /**
   * Get summary for a tier (creates if needed)
   */
  getSummary(tierId: string): TierSummary | undefined {
    return this.summaries.get(tierId);
  }

  /**
   * Instantiate tier back to ECS (called when player zooms in)
   * Returns constraints that generated entities must satisfy
   */
  getInstantiationConstraints(tierId: string): InstantiationConstraints {
    const summary = this.summaries.get(tierId);
    if (!summary) {
      return { population: 100, constraints: [] };
    }

    return {
      population: Math.round(summary.population),
      constraints: [
        { type: 'belief_distribution', data: summary.beliefDistribution },
        { type: 'tech_level', data: summary.techLevel },
        { type: 'stability', data: summary.stability },
        { type: 'named_npcs', data: summary.namedNPCs },
        { type: 'buildings', data: summary.majorBuildings },
        { type: 'historical_events', data: summary.historicalEvents },
      ]
    };
  }

  private getTierLevel(tierId: string): number {
    if (tierId.startsWith('zone_')) return 1;
    if (tierId.startsWith('region_')) return 2;
    if (tierId.startsWith('subsection_')) return 3;
    if (tierId.startsWith('megasegment_')) return 4;
    if (tierId.startsWith('gigasegment_')) return 5;
    if (tierId.startsWith('ringworld_')) return 6;
    return 0;
  }
}

interface HistoricalEvent {
  type: string;
  effect: string;
  severity: number;
  tick: number;
  description: string;
}

interface InstantiationConstraints {
  population: number;
  constraints: Array<{ type: string; data: any }>;
}

interface NamedNPC {
  id: string;
  name: string;
  role: string;
  alive: boolean;
}

interface Building {
  id: string;
  type: string;
  name: string;
}
```

---

## The Zoom In/Out Cycle

### Zooming Out (Summarization)

When player zooms out or moves away from a tier:

```typescript
async function deactivateTier(world: World, tierId: string): Promise<void> {
  const renorm = world.getSystem('renormalization') as RenormalizationSystem;

  // 1. Summarize current ECS state
  renorm.summarizeTier(world, tierId);

  // 2. Mark named/important entities
  markImportantEntities(world, tierId);

  // 3. Destroy generic entities (they're now statistics)
  destroyGenericEntities(world, tierId);

  // 4. Mark tier as inactive (renorm will simulate it)
  world.eventBus.emit({
    type: 'hierarchy:tier_deactivated',
    data: { tierId }
  });
}
```

### Zooming In (Instantiation)

When player zooms in to a tier:

```typescript
async function activateTier(world: World, tierId: string): Promise<void> {
  const renorm = world.getSystem('renormalization') as RenormalizationSystem;

  // 1. Get constraints from statistical simulation
  const constraints = renorm.getInstantiationConstraints(tierId);

  // 2. Generate entities that satisfy constraints
  await generateTierEntities(world, tierId, constraints);

  // 3. Restore named NPCs
  await restoreNamedNPCs(world, constraints.constraints.find(c => c.type === 'named_npcs')?.data);

  // 4. Restore buildings
  await restoreBuildings(world, constraints.constraints.find(c => c.type === 'buildings')?.data);

  // 5. Mark tier as active (ECS takes over)
  world.eventBus.emit({
    type: 'hierarchy:tier_activated',
    data: { tierId }
  });
}

async function generateTierEntities(
  world: World,
  tierId: string,
  constraints: InstantiationConstraints
): Promise<void> {
  const { population, constraints: cons } = constraints;

  // Get belief distribution constraint
  const beliefDist = cons.find(c => c.type === 'belief_distribution')?.data as Map<string, number>;
  const techLevel = cons.find(c => c.type === 'tech_level')?.data as number;

  // Generate agents with correct belief distribution
  for (let i = 0; i < population; i++) {
    const agent = world.createEntity('agent');

    // Assign belief based on distribution
    const deity = sampleFromDistribution(beliefDist, population);
    if (deity) {
      world.addComponent(agent.id, {
        type: 'spiritual',
        faith: 0.5 + Math.random() * 0.5,
        deityAllegiance: deity,
      });
    }

    // Skills scaled to tech level
    world.addComponent(agent.id, {
      type: 'skills',
      levels: generateSkillsForTechLevel(techLevel),
    });
  }
}
```

---

## Time Controls in UI

The hierarchy simulator should expose time controls:

```typescript
interface TimeControls {
  // Current view tier determines base time scale
  currentTier: number;

  // Additional speed multiplier (1x, 10x, 100x, 1000x)
  speedMultiplier: number;

  // Pause/resume
  paused: boolean;

  // Time display
  displayTime: {
    years: number;
    decades: number;
    centuries: number;
  };
}

// At ringworld view with 100x speed:
// 1 real second = 100 ticks = 100 decades = 1000 years
```

---

## What This Enables

### 1. **Centuries Pass While You Watch**
At ringworld view, watch civilizations rise and fall over millennia. Tech advances, beliefs spread, populations boom and crash.

### 2. **Consistent Zoom-In**
Zoom into a region after 500 years of statistical simulation. The generated city matches the statistics - correct population, belief distribution, tech level.

### 3. **Player Actions Persist**
Built a temple 200 years ago? It's still there (in stable state). The hero you named? Still remembered (in named NPCs). But generic NPCs from back then? Summarized into statistics.

### 4. **Deity Power Scales With Time**
As decades pass, belief compounds. A deity at Type 2 might reach Type 4 after a millennium of simulated growth.

### 5. **Historical Events Shape the World**
Plagues, wars, golden ages - they happen in statistical simulation and constrain what you find when you zoom in.

---

## Files to Add

| File | Purpose |
|------|---------|
| `core/src/systems/RenormalizationSystem.ts` | Statistical simulation at inactive tiers |
| `core/src/hierarchy/TierSummary.ts` | Summary data structure |
| `core/src/hierarchy/Instantiation.ts` | Constraint-based entity generation |

Add to `registerAllSystems.ts`:
```typescript
registry.register(new RenormalizationSystem());  // priority 120
```

---

## Summary

The renormalization layer provides:

1. **Time scaling** - Higher tiers tick faster (decade per tick at ringworld)
2. **Summarization** - ECS state rounds up to statistics
3. **Statistical simulation** - Differential equations, not agents
4. **Constraint-based instantiation** - Zoom-in generates consistent world
5. **Persistence of significance** - Named NPCs, buildings, events survive
6. **Historical continuity** - What happened in fast-forward affects what you see

This is how you simulate a trillion souls: you don't. You simulate the *statistics* of a trillion souls, and generate representative samples when needed.

---

## Simulation Priority: What Needs Reality vs Statistics

**Key Insight**: Not everything can be abstracted to statistics. Some things need individual simulation even at cosmic scales.

### The Priority Hierarchy

```
PRIORITY 1 - ALWAYS INDIVIDUAL (even at ringworld scale)
├── Governance entities (rulers, councils, factions)
├── Player-touched entities (anyone the player interacted with)
├── Named NPCs (heroes, villains, prophets)
├── Active deities (the player and rivals)
└── Historical figures (founding kings, great scientists)

PRIORITY 2 - INDIVIDUAL AT REGION SCALE, STATISTICAL ABOVE
├── City leaders (mayors, guildmasters)
├── Temple hierarchies (high priests)
├── Military commanders
└── Economic monopolies (the richest merchant)

PRIORITY 3 - INDIVIDUAL AT ZONE SCALE, STATISTICAL ABOVE
├── Building owners
├── Family heads
├── Local craftsmen of note
└── Crime bosses

PRIORITY 4 - ALWAYS STATISTICAL (never individual at scale)
├── Generic citizens
├── Flora (flowers, trees, grass)
├── Fauna (rabbits, deer, ambient wildlife)
├── Weather patterns
└── Resource nodes
```

### Why Governance Must Stay Individual

Governance creates **cascade effects** that pure statistics can't capture:

```typescript
// Statistical simulation CANNOT model:
// - A king making a bad decision that causes revolt
// - A council vote going 3-2 that changes policy
// - A faction leader defecting to a rival deity
// - Diplomatic negotiations between regions

// These require INDIVIDUAL AGENTS with:
interface GovernanceEntity {
  id: string;
  role: 'ruler' | 'council_member' | 'faction_leader' | 'general';

  // Individual decision-making preserved
  personality: PersonalityTraits;
  beliefs: Map<string, number>;  // Deity allegiances
  relationships: Map<string, Relationship>;  // Other governance entities

  // Actions that affect statistics
  policies: Policy[];  // What they've enacted
  decisions: Decision[];  // Historical choices

  // Simulated even when zoomed out
  simulationPriority: 1;  // Always individual
}
```

### The Governance Simulation Layer

Even at ringworld scale, governance entities run **simplified individual simulation**:

```typescript
class GovernanceSimulationSystem implements System {
  readonly id = 'governance_simulation';
  readonly priority = 118;  // Before renormalization (120)

  update(world: World, entities: Entity[], deltaTime: number): void {
    // Get all governance entities regardless of active tier
    const governors = world.query()
      .with('governance')
      .executeEntities();

    for (const governor of governors) {
      const gov = governor.getComponent('governance');

      // Individual decision-making runs even when zoomed out
      this.simulateGovernorDecisions(world, governor, deltaTime);

      // Relationships evolve
      this.updateRelationships(world, governor, deltaTime);

      // Policies affect statistics (passed to renormalization)
      this.propagatePolicies(world, governor);
    }
  }

  private simulateGovernorDecisions(
    world: World,
    governor: Entity,
    deltaTime: number
  ): void {
    const gov = governor.getComponent('governance');
    const personality = governor.getComponent('personality');

    // Every ~month of game time, governor makes a decision
    if (this.shouldMakeDecision(world, gov, deltaTime)) {
      const options = this.getAvailableDecisions(world, gov);
      const decision = this.chooseDecision(personality, options);

      this.applyDecision(world, governor, decision);

      // This decision affects the region's statistics
      world.eventBus.emit({
        type: 'governance:decision',
        data: { governorId: governor.id, decision }
      });
    }
  }

  private chooseDecision(
    personality: PersonalityComponent,
    options: Decision[]
  ): Decision {
    // Individual personality affects choice
    const weights = options.map(opt => {
      let weight = opt.baseWeight;

      // Warlike personality prefers military
      if (personality.traits.warlike > 0.5 && opt.category === 'military') {
        weight *= 1 + personality.traits.warlike;
      }

      // Pious personality prefers religious
      if (personality.traits.pious > 0.5 && opt.category === 'religious') {
        weight *= 1 + personality.traits.pious;
      }

      // Greedy personality prefers economic
      if (personality.traits.greedy > 0.5 && opt.category === 'economic') {
        weight *= 1 + personality.traits.greedy;
      }

      return { decision: opt, weight };
    });

    return weightedRandom(weights);
  }
}
```

### Example: King Makes Decision at Ringworld Scale

You're viewing the ringworld. A decade passes per tick. But governance still simulates individually:

```
Tick 1 (Decade 1):
├── Population: 847B → 912B (statistical growth)
├── Belief: Wisdom 60% → 58% (statistical shift)
└── GOVERNANCE (individual):
    ├── King Aldric III of Crystal Arc makes decision: RAISE_TAXES
    │   → Region stability: 0.75 → 0.68
    │   → Economic growth: +5%
    │   → Happiness: -10%
    └── High Priestess Mara responds: RELIGIOUS_APPEAL
        → Belief in Wisdom: 58% → 61%
        → King's popularity: -5%

Tick 2 (Decade 2):
├── Population: 912B → 934B (slower, unhappy)
├── Belief: Wisdom 61% → 64% (priestess effect)
└── GOVERNANCE (individual):
    ├── King Aldric III: unpopular, considering ABDICATE
    ├── Prince Aldric IV: plotting COUP (relationship -80 with father)
    └── Council Vote: 4-3 to REDUCE_TAXES
        → King overrules → stability -15%
```

### What CAN Be Statistical

Flora, fauna, generic resources - these don't make decisions that cascade:

```typescript
// These are PURE STATISTICS at zone+ level
interface StatisticalElements {
  // Flora - aggregate biomass, not individual flowers
  flora: {
    forestCoverage: number;      // 0-1
    cropYield: number;           // tons/tick
    medicinalPlantAbundance: number;
  };

  // Fauna - populations, not individuals
  fauna: {
    wildlifePopulation: number;
    livestockCount: number;
    predatorPressure: number;
  };

  // Resources - quantities, not nodes
  resources: {
    ironAvailable: number;
    woodAvailable: number;
    stoneAvailable: number;
  };

  // Weather - patterns, not moments
  weather: {
    avgTemperature: number;
    rainfallPerTick: number;
    disasterProbability: number;
  };
}

// These are regenerated on zoom-in
function instantiateFlora(zone: Zone, stats: StatisticalElements): void {
  const forestTiles = Math.floor(zone.area * stats.flora.forestCoverage);

  for (let i = 0; i < forestTiles; i++) {
    // Generate trees - they're not named, they're not individuals
    // Just meet the statistical constraint
    placeTree(zone, randomPosition());
  }

  // Individual flowers? Generated fresh each time.
  // Nobody remembers that specific daisy from 200 years ago.
}
```

---

## Climbing Up and Down: The Navigation Model

The player can "climb" in both directions:

### Climbing UP (Agent → City → Region → Ringworld)

```
INDIVIDUAL AGENT
    │
    │ "I led my village, gained followers"
    ↓
LOCAL LEADER (Type 0.5)
    │
    │ "I died but they built a temple to me"
    ↓
LOCAL DEITY (Type 1)
    │
    │ "I gained a million believers across the region"
    ↓
REGIONAL SPIRIT (Type 2)
    │
    │ "My worship spread across the gigasegment"
    ↓
RINGWORLD DEITY (Type 3)
    │
    │ ...and higher (Type 4-10)
    ↓
```

The **UI zooms out** as you climb. At Type 0, you see one agent. At Type 3, you see the whole ringworld as a belief map.

### Climbing DOWN (Ringworld → City → Agent)

```
RINGWORLD VIEW
    │
    │ "I want to manifest in Crystal Arc"
    ↓
GIGASEGMENT VIEW
    │
    │ "Zooming into sector 7..."
    ↓
REGION VIEW (Civ/Slipways style)
    │
    │ "This is the strategy layer - cities as nodes"
    ↓
CITY VIEW (City builder)
    │
    │ "Landing in the capital..."
    ↓
AGENT VIEW (3D or isometric)
    │
    │ "I manifest as an avatar walking the streets"
    ↓
```

---

## The Civ/Slipways City Layer

At Region scale, cities become **nodes in a strategy game**:

```typescript
interface CityNode {
  id: string;
  name: string;
  position: { x: number; y: number };  // On region map

  // Abstracted city stats (from city simulation)
  population: number;
  stability: number;
  techLevel: number;
  beliefDistribution: Map<string, number>;

  // City-level buildings (not individual houses)
  hasTemple: Map<string, boolean>;      // By deity
  hasUniversity: boolean;
  hasMarket: boolean;
  hasBarracks: boolean;
  hasTVStation: boolean;                // Late tech

  // Trade connections (Slipways-style)
  tradeRoutes: TradeRoute[];

  // Governance (individual simulation)
  governor: GovernanceEntity;
  council: GovernanceEntity[];
  factions: Faction[];
}

interface TradeRoute {
  from: string;  // City ID
  to: string;    // City ID
  goods: Map<string, number>;  // What's traded
  capacity: number;
  active: boolean;
}
```

### City Layer UI

```
╔═════════════════════════════════════════════════════════════╗
║  REGION: CRYSTAL ARC                          Type 2 View   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║     ⬡ Crystalline Heights (Capital)                        ║
║       Pop: 1.2M | Tech: 6 | Stability: 78%                  ║
║       [Temple of Wisdom] [University] [TV Station]          ║
║       Governor: Duke Aldric IV (pious, expansionist)        ║
║            │                                                ║
║            │ Trade: food↓ tech↑                             ║
║            │                                                ║
║     ⬡ Riverside - - - - - - ⬡ Mountain Hold               ║
║       Pop: 450K              Pop: 280K                      ║
║       [Farms] [Markets]      [Mines] [Barracks]             ║
║       Governor: Countess     Governor: Lord Ironhand        ║
║       Mae (merchant)         (warlike, isolationist)        ║
║                                                             ║
║     [ZOOM IN to City]  [Trade Routes]  [Diplomacy]          ║
╚═════════════════════════════════════════════════════════════╝
```

### Slipways-Style Trade Mechanics

Connect cities to create synergies:

```typescript
function calculateTradeBonus(city: CityNode, routes: TradeRoute[]): void {
  // Farm city + Industrial city = bonus
  const hasAgricultural = routes.some(r =>
    getCity(r.to).hasFeature('farms') && r.goods.has('food')
  );
  const hasIndustrial = routes.some(r =>
    getCity(r.to).hasFeature('forges') && r.goods.has('tools')
  );

  if (hasAgricultural && hasIndustrial) {
    city.productionBonus = 1.5;  // 50% more output
  }

  // University city + Temple city = research bonus
  const hasUniversityTrade = routes.some(r =>
    getCity(r.to).hasUniversity && r.goods.has('knowledge')
  );
  const hasTempleTrade = routes.some(r =>
    getCity(r.to).hasTemple.size > 0 && r.goods.has('faith')
  );

  if (hasUniversityTrade && hasTempleTrade) {
    city.researchBonus = 1.3;
  }
}
```

### Generated vs Player-Built Cities

**Player-built cities** (you zoomed in and built them):
- Layout is **persistent** - exactly what you built
- Named buildings are **remembered**
- NPCs you named are **tracked** individually

**Generator-built cities** (you never visited):
- Layout is **generated on demand** from statistics
- Uses templates: `medievalCity(pop, tech)`, `industrialCity(pop, tech)`
- Matches the node's statistics but not deterministically

```typescript
function instantiateCityView(city: CityNode): CityWorld {
  if (city.wasPlayerBuilt) {
    // Load exact saved layout
    return loadSavedCity(city.savedLayout);
  } else {
    // Generate from template based on stats
    const template = selectTemplate(city);
    return generateCity(template, {
      population: city.population,
      techLevel: city.techLevel,
      buildings: city.buildings,
      governor: city.governor,  // This is preserved!
    });
  }
}
```

---

## Summary: The Dual-Track System

```
┌────────────────────────────────────────────────────────────┐
│                    RINGWORLD SCALE                          │
│  ┌─────────────────────┬────────────────────────────────┐  │
│  │ STATISTICS          │ INDIVIDUALS                     │  │
│  │ (Renormalization)   │ (Governance Simulation)        │  │
│  │                     │                                 │  │
│  │ • Population        │ • Kings/Queens                  │  │
│  │ • Belief density    │ • High Priests                  │  │
│  │ • Tech level        │ • Faction leaders               │  │
│  │ • Resource flows    │ • Council members               │  │
│  │ • Flora/fauna       │ • Rival deities                 │  │
│  │ • Weather           │ • Named heroes                  │  │
│  │ • Generic citizens  │ • Player-touched NPCs           │  │
│  │                     │                                 │  │
│  │ dP/dt = rP(1-P/K)  │ if (personality.warlike > 0.7)  │  │
│  │                     │   decision = DECLARE_WAR;       │  │
│  └─────────────────────┴────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

Zoom in → Statistics constrain → Individuals persist → Details generate
Zoom out → Details summarize → Individuals persist → Statistics compute
```

This is how you simulate governance at cosmic scale while not bothering with every flower: the flowers are statistics, but the king making decisions that affect those statistics is an individual.

---

## Logistics Abstraction: The Gum in the Works

**The Larry Niven Layer**: A ringworld isn't just statistics and governance. It's *engineering*. Supply chains. Transport networks. The places where things actually break.

### Why Logistics Matters

Without logistics, a city is just numbers:
- Population: 1.2M
- Food production: 1.5M units
- Food consumption: 1.1M units
- Surplus: 400K units

With logistics, it becomes a *system*:
- 400K surplus in the farmlands
- But the transport tube to the capital is at 80% capacity
- And there's a 3-day delay crossing the mountain pass
- And the refrigeration system in Sector 7 is failing
- So actually 200K units spoil in transit
- And the capital is experiencing shortages
- While the farms have rotting surplus

**Logistics is where gameplay emerges.**

### The Logistics Model

```typescript
interface LogisticsNetwork {
  // Nodes: places that produce or consume
  nodes: LogisticsNode[];

  // Edges: transport links between nodes
  edges: TransportLink[];

  // Flows: actual movement of goods
  flows: ResourceFlow[];

  // Bottlenecks: where capacity < demand
  bottlenecks: Bottleneck[];
}

interface LogisticsNode {
  id: string;
  type: 'producer' | 'consumer' | 'hub' | 'storage';
  location: TierLocation;  // Which tier this node is in

  // What this node handles
  produces: Map<ResourceType, number>;    // Per tick
  consumes: Map<ResourceType, number>;    // Per tick
  stores: Map<ResourceType, number>;      // Current inventory
  storageCapacity: Map<ResourceType, number>;

  // Processing
  processingCapacity: number;  // How much can flow through per tick
  processingDelay: number;     // Ticks to process
}

interface TransportLink {
  id: string;
  from: string;  // Node ID
  to: string;    // Node ID

  // Physical properties
  type: TransportType;
  distance: number;          // In appropriate units
  capacity: number;          // Units per tick
  speed: number;             // Distance per tick
  reliability: number;       // 0-1, chance of working

  // Current state
  currentLoad: number;
  condition: number;         // 0-1, degrades over time
  underMaintenance: boolean;

  // Costs
  operatingCost: number;     // Per tick
  maintenanceCost: number;   // Per repair
}

type TransportType =
  | 'road'           // Slow, cheap, low capacity
  | 'river'          // Medium, cheap, medium capacity
  | 'rail'           // Fast, expensive, high capacity
  | 'transport_tube' // Very fast, very expensive, very high capacity (Niven-style)
  | 'spaceship'      // Between ringworlds/segments
  | 'teleporter'     // Instant but energy-expensive
  | 'sailing'        // For ringworld oceans
  | 'air_freight';   // Fast but weather-dependent
```

### Transport Types (Niven-Style)

```typescript
const TRANSPORT_SPECS: Record<TransportType, TransportSpec> = {
  road: {
    speedKmPerHour: 30,
    capacityTonsPerTrip: 10,
    reliabilityBase: 0.95,
    maintenancePerKm: 0.01,
    weatherAffected: true,
    techLevelRequired: 1,
  },

  river: {
    speedKmPerHour: 15,
    capacityTonsPerTrip: 100,
    reliabilityBase: 0.90,
    maintenancePerKm: 0.001,
    weatherAffected: true,
    techLevelRequired: 1,
    requiresWaterway: true,
  },

  rail: {
    speedKmPerHour: 80,
    capacityTonsPerTrip: 1000,
    reliabilityBase: 0.98,
    maintenancePerKm: 0.05,
    weatherAffected: false,
    techLevelRequired: 4,
  },

  transport_tube: {
    // Niven's magnetic levitation tubes
    speedKmPerHour: 1000,
    capacityTonsPerTrip: 500,
    reliabilityBase: 0.999,
    maintenancePerKm: 0.1,
    weatherAffected: false,
    techLevelRequired: 6,
    powerRequired: 1000,  // MW per km
  },

  spaceship: {
    // Between ringworld segments or other ringworlds
    speedKmPerHour: 10000,  // In space
    capacityTonsPerTrip: 10000,
    reliabilityBase: 0.95,
    maintenancePerTrip: 100,
    weatherAffected: false,
    techLevelRequired: 7,
    requiresSpaceport: true,
  },

  teleporter: {
    // Instant but expensive
    speedKmPerHour: Infinity,
    capacityTonsPerTrip: 10,  // Small batches
    reliabilityBase: 0.9999,
    maintenancePerUse: 10,
    weatherAffected: false,
    techLevelRequired: 9,
    energyPerKg: 1000,  // MJ
  },
};
```

### The Flow Simulation

```typescript
class LogisticsSimulationSystem implements System {
  readonly id = 'logistics_simulation';
  readonly priority = 116;  // After governance (118), before renormalization (120)

  update(world: World, entities: Entity[], deltaTime: number): void {
    const network = this.getLogisticsNetwork(world);

    // 1. Calculate demand at each consumer node
    this.calculateDemand(network);

    // 2. Calculate supply at each producer node
    this.calculateSupply(network);

    // 3. Route flows through the network
    this.routeFlows(network, deltaTime);

    // 4. Apply transport delays and losses
    this.applyTransportEffects(network, deltaTime);

    // 5. Identify bottlenecks
    this.identifyBottlenecks(network);

    // 6. Degrade infrastructure
    this.degradeInfrastructure(network, deltaTime);

    // 7. Emit events for gameplay
    this.emitLogisticsEvents(world, network);
  }

  private routeFlows(network: LogisticsNetwork, deltaTime: number): void {
    // For each consumer, find paths to suppliers
    for (const consumer of network.nodes.filter(n => n.type === 'consumer')) {
      for (const [resource, demand] of consumer.consumes) {
        // Find suppliers with this resource
        const suppliers = this.findSuppliers(network, resource);

        // Find best path (considering capacity, distance, reliability)
        const paths = this.findPaths(network, suppliers, consumer.id);

        // Allocate flow across paths
        let remainingDemand = demand * deltaTime;
        for (const path of paths) {
          const available = this.getPathCapacity(path, network);
          const allocated = Math.min(remainingDemand, available);

          if (allocated > 0) {
            this.createFlow(network, path, resource, allocated);
            remainingDemand -= allocated;
          }

          if (remainingDemand <= 0) break;
        }

        // Unmet demand creates shortage
        if (remainingDemand > 0) {
          this.recordShortage(consumer.id, resource, remainingDemand);
        }
      }
    }
  }

  private applyTransportEffects(network: LogisticsNetwork, deltaTime: number): void {
    for (const flow of network.flows) {
      const link = network.edges.find(e => e.id === flow.linkId)!;

      // Transit time
      flow.progress += (link.speed / link.distance) * deltaTime;

      // Spoilage (for perishables)
      if (flow.resourceType === 'food') {
        const spoilageRate = this.getSpoilageRate(link.type, flow.transitTime);
        flow.quantity *= (1 - spoilageRate * deltaTime);
      }

      // Reliability check (random failures)
      if (Math.random() > link.reliability) {
        flow.delayed = true;
        flow.delayTicks += this.rollDelayDuration(link);

        // Emit failure event
        network.events.push({
          type: 'transport:failure',
          linkId: link.id,
          flowId: flow.id,
          severity: this.calculateFailureSeverity(link),
        });
      }

      // Arrival
      if (flow.progress >= 1.0) {
        this.deliverFlow(network, flow);
      }
    }
  }

  private identifyBottlenecks(network: LogisticsNetwork): void {
    network.bottlenecks = [];

    for (const link of network.edges) {
      const utilization = link.currentLoad / link.capacity;

      if (utilization > 0.9) {
        network.bottlenecks.push({
          linkId: link.id,
          utilization,
          severity: utilization > 1.0 ? 'critical' : 'warning',
          affectedNodes: this.getAffectedDownstream(network, link.id),
          suggestedFix: this.suggestFix(link, utilization),
        });
      }
    }
  }

  private degradeInfrastructure(network: LogisticsNetwork, deltaTime: number): void {
    for (const link of network.edges) {
      // Usage degrades condition
      const usageWear = (link.currentLoad / link.capacity) * 0.001 * deltaTime;

      // Weather degrades condition (if applicable)
      const weatherWear = link.type === 'road' || link.type === 'air_freight'
        ? this.getWeatherDegradation(link) * deltaTime
        : 0;

      link.condition -= usageWear + weatherWear;

      // Poor condition reduces reliability
      link.reliability = link.condition * TRANSPORT_SPECS[link.type].reliabilityBase;

      // Critical condition triggers maintenance need
      if (link.condition < 0.3 && !link.underMaintenance) {
        network.events.push({
          type: 'infrastructure:needs_maintenance',
          linkId: link.id,
          condition: link.condition,
          estimatedCost: this.estimateMaintenanceCost(link),
        });
      }
    }
  }
}
```

### Ringworld-Specific Infrastructure

Larry Niven's ringworld has specific engineering systems:

```typescript
interface RingworldInfrastructure {
  // Attitude jets - keep the ring oriented
  attitudeJets: {
    locations: Position[];
    fuelReserves: number;
    condition: number;
    lastFired: number;
  };

  // Shadow squares - create day/night cycle
  shadowSquares: {
    count: number;
    orbitalPeriod: number;
    condition: number;
    missingSquares: number[];  // Indices of failed squares
  };

  // Spill mountains - catch the seas at the edges
  spillMountains: {
    locations: Position[];
    height: number;
    condition: number;
    leakRate: number;  // Atmosphere/water loss
  };

  // Repair automata - Pak Protector maintenance systems
  repairAutomata: {
    population: number;
    efficiency: number;
    areasUnderRepair: string[];
    backlog: RepairTask[];
  };

  // Meteor defense - prevent punctures
  meteorDefense: {
    coveragePercent: number;
    lastImpact: number;
    punctures: Puncture[];
  };

  // Transport tubes - global transport network
  transportTubes: {
    networkLength: number;  // km
    stations: TubeStation[];
    averageCondition: number;
    failedSegments: string[];
  };
}

// Infrastructure affects everything
function applyInfrastructureEffects(
  ringworld: RingworldInfrastructure,
  tier: TierSummary
): void {
  // Shadow square failure = erratic day/night = crop failures
  if (ringworld.shadowSquares.missingSquares.length > 0) {
    const failurePercent = ringworld.shadowSquares.missingSquares.length / ringworld.shadowSquares.count;
    tier.foodProduction *= (1 - failurePercent * 0.5);
    tier.stability *= (1 - failurePercent * 0.3);
  }

  // Spill mountain degradation = sea level issues
  if (ringworld.spillMountains.leakRate > 0.01) {
    tier.coastalPopulation *= (1 - ringworld.spillMountains.leakRate);
    tier.events.push({ type: 'flood_warning', severity: ringworld.spillMountains.leakRate });
  }

  // Transport tube failures = logistics bottlenecks
  for (const segment of ringworld.transportTubes.failedSegments) {
    // Find all trade routes using this segment
    // Mark them as degraded
    tier.tradeEfficiency *= 0.9;
  }

  // Meteor punctures = local catastrophes
  for (const puncture of ringworld.meteorDefense.punctures) {
    if (!puncture.sealed) {
      // Atmosphere leaking
      tier.localPopulation -= puncture.affectedPopulation * 0.01;
      tier.events.push({
        type: 'atmospheric_breach',
        location: puncture.location,
        severity: puncture.diameter,
      });
    }
  }
}
```

### Cascading Failures

The fun part - when one thing breaks, everything downstream breaks:

```typescript
interface CascadeEvent {
  trigger: string;          // What started it
  affectedSystems: string[];
  propagationPath: string[];
  totalImpact: number;
  resolved: boolean;
}

function simulateCascade(
  network: LogisticsNetwork,
  failedLink: string
): CascadeEvent {
  const cascade: CascadeEvent = {
    trigger: failedLink,
    affectedSystems: [],
    propagationPath: [failedLink],
    totalImpact: 0,
    resolved: false,
  };

  const visited = new Set<string>();
  const queue = [failedLink];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const link = network.edges.find(e => e.id === current);
    if (!link) continue;

    // Find all nodes that depend on this link
    const dependentNodes = network.nodes.filter(n =>
      n.incomingLinks?.includes(current)
    );

    for (const node of dependentNodes) {
      // Node loses supply
      const shortage = calculateShortage(node, link);
      cascade.totalImpact += shortage;
      cascade.affectedSystems.push(node.id);

      // If node is a hub, cascade continues
      if (node.type === 'hub') {
        for (const outLink of node.outgoingLinks || []) {
          if (!visited.has(outLink)) {
            queue.push(outLink);
            cascade.propagationPath.push(outLink);
          }
        }
      }

      // If node is critical infrastructure, cascade multiplies
      if (node.isCriticalInfrastructure) {
        cascade.totalImpact *= 1.5;

        // Trigger secondary failures
        const secondaryFailures = rollSecondaryFailures(node, shortage);
        for (const secondary of secondaryFailures) {
          queue.push(secondary);
        }
      }
    }
  }

  return cascade;
}

// Example cascade:
// 1. Transport tube segment 7A fails
// 2. Hub station Crystal Junction loses power
// 3. 12 downstream cities lose food shipments
// 4. City storage depletes over 3 days
// 5. Rationing begins, stability drops
// 6. Governor makes EMERGENCY_IMPORTS decision (governance layer)
// 7. Alternative routes become congested (bottleneck)
// 8. Prices spike across the region
// 9. Unrest in cities without alternatives
// 10. Player (deity) is asked to intervene via prayer
```

### The Logistics UI

At region scale, show the supply chain:

```
╔═════════════════════════════════════════════════════════════════╗
║  LOGISTICS OVERVIEW: CRYSTAL ARC                                 ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ◉ Farmlands        ═══════════════════╗                        ║
║    [Food: +400K]                       ║                        ║
║         ║                              ║                        ║
║         ║ Road (85% cap)               ║ Rail (45% cap)         ║
║         ↓                              ↓                        ║
║  ◉ Processing Hub   ══════════════>  ◉ Capital                  ║
║    [Storage: 200K]     Tube (92% cap)   [Food: -50K shortage!]  ║
║         ║                              ↑                        ║
║         ║ River (30% cap)              ║ ⚠️ BOTTLENECK          ║
║         ↓                              ║                        ║
║  ◉ Riverside        ═══════════════════╝                        ║
║    [Food: +50K]       Road (FAILED - maintenance)               ║
║                                                                  ║
║  ALERTS:                                                         ║
║  ⚠️ Capital experiencing food shortage (-50K/day)                ║
║  🔧 Road to Riverside under maintenance (3 days remaining)       ║
║  📈 Tube utilization critical - consider expansion               ║
║                                                                  ║
║  [Reroute Flows]  [Emergency Shipment]  [Build Infrastructure]  ║
╚═════════════════════════════════════════════════════════════════╝
```

### Logistics at Different Scales

| Scale | Logistics Abstraction |
|-------|----------------------|
| Chunk | Individual carts, paths between buildings |
| Zone | Roads, local markets, granaries |
| Region | Rail networks, river trade, city hubs |
| Megasegment | Transport tubes, spaceports, major highways |
| Gigasegment | Inter-segment shipping, tube networks |
| Ringworld | Full transport tube network, shadow squares, infrastructure |
| Multi-ring | Spaceships between ringworlds |

### Why This Creates Gameplay

1. **Bottleneck identification** - "The tube to sector 7 is at 92% - expand it?"
2. **Crisis response** - "The road failed - reroute or emergency repair?"
3. **Investment decisions** - "Build rail or upgrade existing road?"
4. **Cascading failures** - "The hub went down and now 12 cities are starving"
5. **Engineering puzzles** - "How do we get food from the farms to the capital?"
6. **Niven-style problems** - "Shadow square 17 failed, crops are dying on the night side"

The logistics layer is where the ringworld becomes *real*. Not just numbers going up and down, but actual systems that can break, be optimized, create emergent crises, and require engineering solutions.

---

## Production Chain Abstraction: The Factorio Layer

**The Digestive Enzyme Problem**: Complex products require multi-stage processing. Like how your body needs a chain of enzymes to break down complex carbs, a civilization needs production chains to turn raw materials into advanced goods.

At agent level, we have individual crafting. At city level, we need **supply chains** - abstracted production pipelines that can break at any stage.

### From Crafting to Supply Chains

```
AGENT LEVEL (ECS):
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Miner    │──▶│ Smelter  │──▶│ Smith    │
│ (entity) │   │ (entity) │   │ (entity) │
│ ore/tick │   │ ingot/t  │   │ tool/t   │
└──────────┘   └──────────┘   └──────────┘

CITY LEVEL (Abstraction):
┌─────────────────────────────────────────────────────┐
│ TOOL SUPPLY CHAIN                                   │
│                                                     │
│ Mining     ──▶ Smelting  ──▶ Smithing ──▶ Tools    │
│ Sector         District      Quarter     Output    │
│                                                     │
│ Capacity: 1000 ore/day                              │
│ Bottleneck: Smelting (at 95%)                       │
│ Output: 450 tools/day (theoretical max: 500)        │
│ Health: 87% (smelter district needs maintenance)    │
└─────────────────────────────────────────────────────┘
```

### The Production Chain Model

```typescript
interface ProductionChain {
  id: string;
  name: string;
  finalProduct: ResourceType;

  // The pipeline stages
  stages: ProductionStage[];

  // Overall chain stats (computed from stages)
  theoreticalThroughput: number;  // If everything perfect
  actualThroughput: number;       // Reality
  bottleneckStage: string | null;
  health: number;                 // 0-1

  // Dependencies
  requiredChains: string[];       // Other chains this depends on
  dependentChains: string[];      // Chains that depend on this
}

interface ProductionStage {
  id: string;
  name: string;
  order: number;  // Position in chain

  // What this stage does
  inputs: Map<ResourceType, number>;   // Per tick
  outputs: Map<ResourceType, number>;  // Per tick
  processingTime: number;              // Ticks

  // Capacity
  installedCapacity: number;   // Max throughput
  utilizationRate: number;     // Current % used
  queuedWork: number;          // Backlog

  // Health factors
  equipmentCondition: number;  // 0-1, degrades
  workerEfficiency: number;    // 0-1, skill + happiness
  powerSupply: number;         // 0-1, from power grid
  inputAvailability: number;   // 0-1, do we have materials?

  // Location
  locationTier: string;        // Which zone/region
  facilities: number;          // How many facilities
}

// The core insight: throughput is limited by the weakest stage
function calculateChainThroughput(chain: ProductionChain): number {
  let minThroughput = Infinity;
  let bottleneck: string | null = null;

  for (const stage of chain.stages) {
    // Effective capacity = installed * health factors
    const effectiveCapacity = stage.installedCapacity
      * stage.equipmentCondition
      * stage.workerEfficiency
      * stage.powerSupply
      * stage.inputAvailability;

    if (effectiveCapacity < minThroughput) {
      minThroughput = effectiveCapacity;
      bottleneck = stage.id;
    }
  }

  chain.bottleneckStage = bottleneck;
  chain.actualThroughput = minThroughput;
  return minThroughput;
}
```

### Standard Production Chains

Every civilization needs these core chains:

```typescript
const CORE_PRODUCTION_CHAINS: ProductionChainTemplate[] = [
  // FOOD CHAIN - fundamental
  {
    id: 'food_basic',
    name: 'Basic Food Production',
    stages: [
      { name: 'Farming', inputs: { seeds: 1, water: 10 }, outputs: { grain: 100 } },
      { name: 'Milling', inputs: { grain: 100 }, outputs: { flour: 80 } },
      { name: 'Baking', inputs: { flour: 80, water: 5 }, outputs: { bread: 70 } },
    ],
    techLevel: 1,
    criticalityLevel: 'vital',  // Civilization dies without this
  },

  // TOOLS CHAIN - enables everything else
  {
    id: 'tools_basic',
    name: 'Basic Tool Production',
    stages: [
      { name: 'Mining', inputs: { labor: 10 }, outputs: { ore: 50 } },
      { name: 'Smelting', inputs: { ore: 50, fuel: 20 }, outputs: { ingots: 30 } },
      { name: 'Smithing', inputs: { ingots: 30 }, outputs: { tools: 20 } },
    ],
    techLevel: 2,
    criticalityLevel: 'essential',
  },

  // CONSTRUCTION CHAIN
  {
    id: 'construction_materials',
    name: 'Construction Materials',
    stages: [
      { name: 'Quarrying', inputs: { labor: 10, tools: 1 }, outputs: { stone: 100 } },
      { name: 'Lumber', inputs: { labor: 5, tools: 1 }, outputs: { wood: 80 } },
      { name: 'Brickmaking', inputs: { clay: 50, fuel: 10 }, outputs: { bricks: 40 } },
      { name: 'Assembly', inputs: { stone: 20, wood: 30, bricks: 20 }, outputs: { building_materials: 25 } },
    ],
    techLevel: 2,
    criticalityLevel: 'essential',
  },

  // ADVANCED: STEEL CHAIN
  {
    id: 'steel_production',
    name: 'Steel Production',
    stages: [
      { name: 'Iron Mining', inputs: { labor: 20, tools: 2 }, outputs: { iron_ore: 100 } },
      { name: 'Coal Mining', inputs: { labor: 15, tools: 1 }, outputs: { coal: 80 } },
      { name: 'Coking', inputs: { coal: 80 }, outputs: { cite: 50 } },
      { name: 'Iron Smelting', inputs: { iron_ore: 100, coke: 30 }, outputs: { pig_iron: 60 } },
      { name: 'Steel Refining', inputs: { pig_iron: 60, coke: 20 }, outputs: { steel: 40 } },
    ],
    techLevel: 4,
    criticalityLevel: 'important',
    enablesChains: ['machinery', 'rail_construction', 'weapons_advanced'],
  },

  // ADVANCED: ELECTRONICS CHAIN
  {
    id: 'electronics_basic',
    name: 'Electronics Production',
    stages: [
      { name: 'Silicon Mining', inputs: { labor: 10, tools: 2 }, outputs: { sand: 100 } },
      { name: 'Silicon Refining', inputs: { sand: 100, chemicals: 20 }, outputs: { silicon: 30 } },
      { name: 'Wafer Production', inputs: { silicon: 30 }, outputs: { wafers: 20 } },
      { name: 'Chip Fabrication', inputs: { wafers: 20, gold: 1, chemicals: 5 }, outputs: { chips: 10 } },
      { name: 'Assembly', inputs: { chips: 10, copper: 5, plastics: 10 }, outputs: { electronics: 5 } },
    ],
    techLevel: 6,
    criticalityLevel: 'advanced',
    enablesChains: ['computers', 'communications', 'automation'],
  },

  // RINGWORLD TECH: SCRITH MAINTENANCE
  {
    id: 'scrith_repair',
    name: 'Scrith Repair Materials',
    stages: [
      { name: 'Neutronium Harvesting', inputs: { energy: 10000 }, outputs: { neutronium: 1 } },
      { name: 'Exotic Matter Synthesis', inputs: { neutronium: 1, energy: 5000 }, outputs: { exotic_matter: 0.5 } },
      { name: 'Scrith Fabrication', inputs: { exotic_matter: 0.5, energy: 20000 }, outputs: { scrith_patch: 0.1 } },
    ],
    techLevel: 10,
    criticalityLevel: 'ringworld_critical',
    notes: 'Required to repair ringworld hull breaches',
  },
];
```

### Chain Dependencies (The Enzyme Entourage)

Chains depend on other chains, like metabolic pathways:

```typescript
interface ChainDependencyGraph {
  chains: Map<string, ProductionChain>;
  dependencies: Map<string, string[]>;  // chain → chains it needs
  dependents: Map<string, string[]>;    // chain → chains that need it
}

// Build the dependency graph
function buildDependencyGraph(chains: ProductionChain[]): ChainDependencyGraph {
  const graph: ChainDependencyGraph = {
    chains: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
  };

  for (const chain of chains) {
    graph.chains.set(chain.id, chain);
    graph.dependencies.set(chain.id, []);
    graph.dependents.set(chain.id, []);
  }

  // Find dependencies by checking what each chain needs as input
  for (const chain of chains) {
    const firstStage = chain.stages[0];
    for (const [inputResource] of firstStage.inputs) {
      // Find chain that produces this resource
      const producer = chains.find(c =>
        c.stages[c.stages.length - 1].outputs.has(inputResource)
      );
      if (producer) {
        graph.dependencies.get(chain.id)!.push(producer.id);
        graph.dependents.get(producer.id)!.push(chain.id);
      }
    }
  }

  return graph;
}

// Calculate cascade impact if a chain fails
function calculateCascadeImpact(
  graph: ChainDependencyGraph,
  failedChainId: string
): CascadeImpact {
  const impact: CascadeImpact = {
    directlyAffected: [],
    indirectlyAffected: [],
    criticalFailures: [],
    totalEconomicImpact: 0,
  };

  const visited = new Set<string>();
  const queue = [failedChainId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const chain = graph.chains.get(current)!;

    if (current === failedChainId) {
      impact.directlyAffected.push(current);
    } else {
      impact.indirectlyAffected.push(current);
    }

    // Check criticality
    if (chain.criticalityLevel === 'vital') {
      impact.criticalFailures.push({
        chainId: current,
        consequence: 'population_death',
        timeToImpact: chain.stages.length * 10,  // ticks
      });
    }

    // Add economic impact
    impact.totalEconomicImpact += chain.actualThroughput * getResourceValue(chain.finalProduct);

    // Queue dependents
    for (const dependent of graph.dependents.get(current) || []) {
      if (!visited.has(dependent)) {
        queue.push(dependent);
      }
    }
  }

  return impact;
}
```

### The Production Chain System

```typescript
class ProductionChainSystem implements System {
  readonly id = 'production_chain';
  readonly priority = 114;  // Before logistics (116)

  private chains: Map<string, ProductionChain> = new Map();
  private dependencyGraph: ChainDependencyGraph | null = null;

  update(world: World, entities: Entity[], deltaTime: number): void {
    // 1. Update each stage's health factors
    this.updateStageHealth(world, deltaTime);

    // 2. Calculate throughput for each chain
    for (const chain of this.chains.values()) {
      this.calculateChainThroughput(chain);
    }

    // 3. Propagate production through stages
    this.propagateProduction(deltaTime);

    // 4. Check for chain failures
    this.checkChainFailures(world);

    // 5. Update dependency graph
    if (this.dependencyGraph) {
      this.updateDependencyEffects();
    }

    // 6. Emit events for gameplay
    this.emitProductionEvents(world);
  }

  private updateStageHealth(world: World, deltaTime: number): void {
    for (const chain of this.chains.values()) {
      for (const stage of chain.stages) {
        // Equipment degrades with use
        stage.equipmentCondition -= stage.utilizationRate * 0.0001 * deltaTime;

        // Worker efficiency depends on happiness + skills (from renorm data)
        const tierStats = this.getTierStats(world, stage.locationTier);
        stage.workerEfficiency = tierStats
          ? tierStats.avgHappiness * 0.5 + tierStats.avgSkill * 0.5
          : 0.5;

        // Power supply from infrastructure
        const powerGrid = this.getPowerGrid(world, stage.locationTier);
        stage.powerSupply = powerGrid ? powerGrid.reliability : 1.0;

        // Input availability from previous stage or logistics
        stage.inputAvailability = this.calculateInputAvailability(chain, stage);

        // Update overall health
        chain.health = Math.min(
          stage.equipmentCondition,
          stage.workerEfficiency,
          stage.powerSupply,
          stage.inputAvailability
        );
      }
    }
  }

  private propagateProduction(deltaTime: number): void {
    for (const chain of this.chains.values()) {
      // Production flows through stages
      let availableInput = Infinity;

      for (let i = 0; i < chain.stages.length; i++) {
        const stage = chain.stages[i];

        // Can only process what we have input for
        const canProcess = Math.min(
          availableInput,
          stage.installedCapacity * stage.equipmentCondition
        );

        // Apply efficiency factors
        const actualProcessed = canProcess
          * stage.workerEfficiency
          * stage.powerSupply;

        stage.utilizationRate = actualProcessed / stage.installedCapacity;

        // Output becomes input for next stage
        // (accounting for conversion ratios)
        const outputRatio = this.getOutputRatio(stage);
        availableInput = actualProcessed * outputRatio;

        // Queue any excess demand
        if (stage.utilizationRate > 0.95) {
          stage.queuedWork += (availableInput - actualProcessed) * deltaTime;
        }
      }

      // Final output
      chain.actualThroughput = availableInput;
    }
  }

  private checkChainFailures(world: World): void {
    for (const chain of this.chains.values()) {
      // Check for critical failures
      for (const stage of chain.stages) {
        if (stage.equipmentCondition < 0.1) {
          // Stage has failed!
          world.eventBus.emit({
            type: 'production:stage_failure',
            data: {
              chainId: chain.id,
              stageId: stage.id,
              stageName: stage.name,
              impact: this.calculateStageFailureImpact(chain, stage),
            }
          });

          // Calculate cascade
          if (this.dependencyGraph) {
            const cascade = calculateCascadeImpact(this.dependencyGraph, chain.id);
            if (cascade.criticalFailures.length > 0) {
              world.eventBus.emit({
                type: 'production:critical_cascade',
                data: cascade,
              });
            }
          }
        }
      }

      // Check for bottlenecks
      const bottleneckStage = chain.stages.find(s => s.utilizationRate > 0.9);
      if (bottleneckStage) {
        world.eventBus.emit({
          type: 'production:bottleneck',
          data: {
            chainId: chain.id,
            stageId: bottleneckStage.id,
            utilization: bottleneckStage.utilizationRate,
            suggestedAction: this.suggestBottleneckFix(bottleneckStage),
          }
        });
      }
    }
  }
}
```

### Example: The Steel Crisis

```
Scenario: Coal miners go on strike (governance event)

INITIAL STATE:
├── Food Chain: 100% healthy, 450 bread/day
├── Tools Chain: 95% healthy, 200 tools/day
├── Steel Chain: 98% healthy, 400 steel/day
│   └── Coal Mining stage: 100% capacity
└── Machinery Chain: 90% healthy, 50 machines/day
    └── Depends on Steel Chain

TICK 1 (Strike begins):
├── Coal Mining stage: 0% capacity (workers striking)
├── Steel Chain throughput: 0 (bottleneck at coal)
└── Event: "Coal miners strike in Region 7"

TICK 2-5 (Stockpiles deplete):
├── Coking stage: running on stockpile
├── Steel output: dropping 20% per tick
└── Machinery Chain: input shortage warning

TICK 6 (Stockpile exhausted):
├── Steel Chain: 0% output
├── Machinery Chain: 0% output (no steel input)
├── Tools Chain: degrading (no replacement parts)
└── CRITICAL: Rail construction halted

TICK 10 (Cascade begins):
├── Tools Chain: 60% output (equipment failing)
├── Construction Chain: 70% output (no machinery)
├── Food Chain: 85% output (tools shortage affecting farming)
└── EVENT: "Food production declining due to tool shortages"

TICK 20 (Crisis):
├── Food Chain: 50% output
├── Population: stability dropping
├── Governor: EMERGENCY_NEGOTIATION decision
└── Prayers: "Our factories are silent, our people hungry"

Resolution paths:
1. Governor negotiates with strikers (governance)
2. Import coal via emergency logistics
3. Player (deity) intervenes with miracle
4. Alternative energy sources (tech solution)
```

### Production Chains at Scale

| Scale | Production Abstraction |
|-------|----------------------|
| Agent | Individual crafting stations, recipes |
| Zone | Workshops, small factories, local supply |
| City | Industrial districts, production chains |
| Region | Inter-city supply chains, specialized economies |
| Megasegment | Heavy industry clusters, megafactories |
| Gigasegment | Continental production networks |
| Ringworld | Ring-spanning supply chains, scrith maintenance |

### Integration with Other Systems

```typescript
// Production feeds into:
interface ProductionIntegration {
  // → Logistics: products need transport
  logistics: {
    outputsGoTo: 'logistics_network',
    inputsComeFrom: 'logistics_network',
  };

  // → Governance: policies affect production
  governance: {
    taxPolicies: 'affect_profitability',
    laborLaws: 'affect_worker_efficiency',
    tradePolicies: 'affect_input_availability',
  };

  // → Statistics: production aggregates up
  statistics: {
    zoneOutput: 'sum_of_facilities',
    regionOutput: 'sum_of_zones',
    techLevel: 'enables_chain_templates',
  };

  // → Events: production failures create crises
  events: {
    stageFailure: 'cascade_event',
    bottleneck: 'economic_pressure',
    newChainUnlocked: 'tech_advancement',
  };
}
```

### The UI: Chain Health Dashboard

```
╔═══════════════════════════════════════════════════════════════════╗
║  PRODUCTION CHAINS: CRYSTAL ARC                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  VITAL CHAINS:                                                     ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Food Production    [████████░░] 82%  Bottleneck: Milling    │  ║
║  │ Farming → Milling → Baking                                  │  ║
║  │ Output: 380/day (max: 450)   ⚠️ Mill equipment at 45%       │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  ESSENTIAL CHAINS:                                                 ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Tool Production    [██████████] 98%  Healthy                │  ║
║  │ Mining → Smelting → Smithing                                │  ║
║  │ Output: 195/day (max: 200)                                  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Steel Production   [██░░░░░░░░] 20%  ⚠️ CRITICAL            │  ║
║  │ Iron → Coal → Coking → Smelting → Refining                  │  ║
║  │ Output: 80/day (max: 400)   🔴 Coal stage at 0% (STRIKE)    │  ║
║  │                                                              │  ║
║  │ CASCADE RISK: Machinery, Rail, Weapons depend on this       │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  DEPENDENT CHAINS AT RISK:                                         ║
║  • Machinery Production: will fail in 3 days                       ║
║  • Rail Construction: will fail in 5 days                          ║
║  • Advanced Tools: will fail in 7 days                             ║
║                                                                    ║
║  [Resolve Strike]  [Emergency Import]  [Invest in Stage]           ║
╚═══════════════════════════════════════════════════════════════════╝
```

This is the Factorio layer scaled up - not individual inserters and belts, but **supply chains** that can break, bottleneck, cascade, and create the emergent economic crises that make the simulation feel alive.

### Supply Chains ARE Buildings

When you zoom in, supply chain stages become **actual buildings** from the building system:

```typescript
// Each production stage maps to building types
const STAGE_TO_BUILDINGS: Record<string, BuildingType[]> = {
  'farming': ['farm', 'irrigation_system', 'greenhouse'],
  'milling': ['windmill', 'watermill', 'steam_mill'],
  'baking': ['bakery', 'industrial_bakery'],
  'mining': ['mine', 'quarry', 'deep_mine'],
  'smelting': ['forge', 'blast_furnace', 'arcane_smelter'],
  'smithing': ['smithy', 'workshop', 'factory'],
  'coking': ['coke_oven', 'coking_plant'],
  'iron_smelting': ['iron_forge', 'bessemer_converter'],
  'steel_refining': ['steel_mill', 'oxygen_furnace'],
};

// When summarizing a zone → stage stats come from buildings
function summarizeStageFromBuildings(
  world: World,
  zoneId: string,
  stageName: string
): ProductionStage {
  const buildingTypes = STAGE_TO_BUILDINGS[stageName];

  // Query actual buildings in this zone
  const buildings = world.query()
    .with('building')
    .with('position')
    .with('hierarchy_tier')
    .executeEntities()
    .filter(e =>
      e.getComponent('hierarchy_tier').zoneId === zoneId &&
      buildingTypes.includes(e.getComponent('building').type)
    );

  // Aggregate their stats
  const stage: ProductionStage = {
    id: `${zoneId}_${stageName}`,
    name: stageName,
    order: 0,
    installedCapacity: 0,
    utilizationRate: 0,
    equipmentCondition: 0,
    facilities: buildings.length,
    locationTier: zoneId,
    // ...
  };

  for (const building of buildings) {
    const b = building.getComponent('building');
    const prod = building.getComponent('production');

    stage.installedCapacity += prod?.outputRate || 0;
    stage.equipmentCondition += b.condition || 1.0;
  }

  // Average the condition
  stage.equipmentCondition /= Math.max(1, buildings.length);

  return stage;
}

// When zooming in → regenerate buildings to match stage stats
function instantiateStageBuildings(
  world: World,
  zoneId: string,
  stage: ProductionStage
): void {
  const buildingTypes = STAGE_TO_BUILDINGS[stage.name];
  const primaryType = buildingTypes[0];  // Use simplest building type

  // Calculate how many buildings needed
  const buildingsNeeded = stage.facilities;

  // Get zone bounds
  const zoneBounds = getZoneBounds(zoneId);

  // Place buildings
  for (let i = 0; i < buildingsNeeded; i++) {
    const position = findValidBuildingPosition(world, zoneBounds, primaryType);

    world.createEntity('building', {
      building: {
        type: primaryType,
        condition: stage.equipmentCondition,
      },
      production: {
        outputRate: stage.installedCapacity / buildingsNeeded,
        efficiency: stage.workerEfficiency,
      },
      position,
      hierarchy_tier: {
        zoneId,
        // ...
      },
    });
  }
}
```

**The key insight**: At zone level, "Smelting district at 85% capacity" IS "12 forges and 3 blast furnaces, averaging 85% condition". Zoom in and you see the actual buildings. Zoom out and they aggregate into the stage.

---

## The Universal Paperclips Layer: Exponential Scale

At multi-ringworld scale, the game becomes an **incremental/idle game** with exponential growth.

### The Number Scale

```
SCALE PROGRESSION:

Agent Level:
├── Gold: 47 coins
├── Food: 12 meals
└── Tools: 3 pickaxes

City Level:
├── Gold: 2.3 million
├── Food: 450K tons/year
└── Tools: 180K units/year

Ringworld Level:
├── Gold: 847 trillion
├── Food: 12.4 quadrillion tons/year
└── Tools: 890 trillion units/year

Multi-Ringworld (Type 4+):
├── Gold: 1.2e18 (1.2 quintillion)
├── Food: 4.7e21 (4.7 sextillion)
└── Energy: 3.2e26 W (approaching stellar output)

Galactic (Type 5+):
├── Believers: 1.8e24
├── Ringworlds: 2,847
├── Dyson Spheres: 12
└── Energy: 4e36 W

TYPE 10 (Endgame):
├── Universes created: 47
├── Total souls: ∞ (unbounded)
└── Reality: malleable
```

### Big Number Display

```typescript
// Number formatting for cosmic scale
function formatCosmicNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`;
  if (n < 1e12) return `${(n / 1e9).toFixed(1)}B`;
  if (n < 1e15) return `${(n / 1e12).toFixed(1)}T`;
  if (n < 1e18) return `${(n / 1e15).toFixed(1)}Qa`;  // Quadrillion
  if (n < 1e21) return `${(n / 1e18).toFixed(1)}Qi`;  // Quintillion
  if (n < 1e24) return `${(n / 1e21).toFixed(1)}Sx`;  // Sextillion
  if (n < 1e27) return `${(n / 1e24).toFixed(1)}Sp`;  // Septillion
  if (n < 1e30) return `${(n / 1e27).toFixed(1)}Oc`;  // Octillion

  // Scientific notation for truly cosmic
  return n.toExponential(2);
}

// Example displays
formatCosmicNumber(847_293_847_102);       // "847.3B"
formatCosmicNumber(1.2e18);                // "1.2Qi"
formatCosmicNumber(4.7e36);                // "4.70e+36"
```

### Exponential Growth Mechanics

```typescript
// At cosmic scale, growth is exponential
interface CosmicGrowthFactors {
  // Base production (from ringworlds)
  baseProduction: bigint;

  // Multipliers stack multiplicatively
  multipliers: {
    believerBonus: number;      // 1 + log10(believers) * 0.1
    techMultiplier: number;     // 2^techLevel
    dysonBonus: number;         // Each Dyson sphere = 10x energy
    divineEfficiency: number;   // Your deity power level
    automationLevel: number;    // How much is self-running
  };

  // Prestige bonuses (from previous universe resets)
  prestigeMultiplier: number;

  // Idle accumulation rate
  idleEfficiency: number;       // % of active rate when not playing
}

function calculateCosmicProduction(factors: CosmicGrowthFactors): bigint {
  const base = factors.baseProduction;

  const totalMultiplier =
    factors.multipliers.believerBonus *
    factors.multipliers.techMultiplier *
    factors.multipliers.dysonBonus *
    factors.multipliers.divineEfficiency *
    factors.multipliers.automationLevel *
    factors.prestigeMultiplier;

  return BigInt(Math.floor(Number(base) * totalMultiplier));
}

// Prestige system (like Universal Paperclips' "hypno-drones")
interface PrestigeState {
  timesAscended: number;
  totalSoulsEverGained: bigint;
  permanentBonuses: {
    productionMultiplier: number;
    startingBelievers: bigint;
    unlockedTechs: string[];
    knownRecipes: string[];
  };
}

function calculatePrestigeBonus(timesAscended: number): number {
  // Each ascension gives diminishing but stacking bonus
  return 1 + Math.log10(timesAscended + 1) * 0.5;
}
```

### The Multi-Ring Dashboard

```
╔════════════════════════════════════════════════════════════════════════╗
║  COSMIC EMPIRE OVERVIEW                           Type 5 Deity         ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  RINGWORLDS: 47                    DYSON SPHERES: 3                    ║
║  TOTAL BELIEVERS: 8.47e18          BELIEF/SEC: 2.3e15                  ║
║  ENERGY OUTPUT: 1.2e28 W           MATTER RESERVES: 4.7e24 kg          ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │  PRODUCTION RATES (per second)                                    │ ║
║  │  ════════════════════════════════════════════════════════════════│ ║
║  │  Food:        1.2e12 tons  ████████████████████ +2.3%/min        │ ║
║  │  Steel:       4.7e10 tons  ██████████████████░░ +1.8%/min        │ ║
║  │  Electronics: 8.9e8 units  █████████████░░░░░░░ +0.9%/min        │ ║
║  │  Scrith:      47 patches   ██░░░░░░░░░░░░░░░░░░ BOTTLENECK       │ ║
║  │                                                                   │ ║
║  │  BOTTLENECK: Neutronium harvesting limiting scrith production    │ ║
║  │  → Recommend: Build more stellar extractors                      │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  UPGRADES AVAILABLE:                                                   ║
║  ┌────────────────────────────────────────────────────────────────┐   ║
║  │ [Dyson Sphere #4]        Cost: 1e24 matter   +10x energy       │   ║
║  │ [Ringworld #48]          Cost: 5e23 matter   +1T believers     │   ║
║  │ [Dimensional Harvester]  Cost: 1e27 energy   Exotic matter/s   │   ║
║  │ [Hive Mind Node]         Cost: 1e20 believers +5% efficiency   │   ║
║  └────────────────────────────────────────────────────────────────┘   ║
║                                                                        ║
║  [ASCEND] - Reset for 1.47x permanent multiplier                       ║
║             (Requires: 1e30 total believers earned this run)           ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

### Idle/Offline Progression

```typescript
// Calculate what happened while player was away
function calculateIdleProgress(
  state: CosmicState,
  lastPlayedTick: number,
  currentTick: number,
  idleEfficiency: number = 0.1  // 10% of active rate by default
): IdleProgress {
  const ticksElapsed = currentTick - lastPlayedTick;

  // Cap idle time (prevent returning after years with infinite resources)
  const maxIdleTicks = 7 * 24 * 60 * 60 * 20;  // 1 week at 20 TPS
  const effectiveTicks = Math.min(ticksElapsed, maxIdleTicks);

  const production = calculateCosmicProduction(state.growthFactors);
  const idleProduction = BigInt(Math.floor(Number(production) * idleEfficiency));

  return {
    ticksElapsed: effectiveTicks,
    resourcesGained: {
      believers: idleProduction * BigInt(effectiveTicks),
      energy: idleProduction * BigInt(effectiveTicks) * 100n,
      matter: idleProduction * BigInt(effectiveTicks) / 10n,
    },
    eventsOccurred: generateIdleEvents(state, effectiveTicks),
    upgradesCompleted: checkCompletedUpgrades(state, effectiveTicks),
  };
}

// Welcome back screen
interface IdleReport {
  timeAway: string;                    // "2 days, 4 hours"
  believersGained: string;             // "4.7Qi"
  energyGained: string;                // "1.2Sx"
  significantEvents: string[];         // ["Ringworld 23 completed construction"]
  newMilestones: string[];            // ["Reached 1e20 believers!"]
  recommendedActions: string[];        // ["Upgrade Dyson Sphere capacity"]
}
```

### The Paperclip Moment

At a certain scale, you achieve **self-sustaining exponential growth**:

```typescript
// The "paperclip maximizer" inflection point
interface ExponentialPhase {
  // When production exceeds consumption permanently
  selfSustaining: boolean;

  // When growth rate exceeds manual intervention rate
  automationDominant: boolean;

  // When you're building ringworlds faster than you can count
  cosmicRunaway: boolean;

  // The final phase: you ARE the exponential
  transcendenceThreshold: boolean;
}

function checkPhaseTransitions(state: CosmicState): ExponentialPhase {
  return {
    selfSustaining:
      state.production.energy > state.consumption.energy * 1.1,

    automationDominant:
      state.automationLevel > 0.9 &&
      state.production.ringworldsPerYear > 10,

    cosmicRunaway:
      state.production.ringworldsPerYear > 1000 &&
      state.believers > 1e24,

    transcendenceThreshold:
      state.believers > 1e30 &&
      state.universesCreated > 0,
  };
}
```

### The Progression Feel

```
PHASE 1 (Agent): "I gathered 12 berries today."

PHASE 2 (City): "Our city produces 450K food/year."

PHASE 3 (Ringworld): "The ring feeds 847 billion souls."

PHASE 4 (Multi-Ring): "47 ringworlds. 8.47e18 believers.
                       Production: 1.2e12 food/sec."

PHASE 5 (Galactic): "Numbers go up. Dyson spheres multiply.
                     I AM the economy."

PHASE 6 (Universal): "I created my first universe today.
                      It contains 10^80 particles.
                      My believers there will one day
                      create universes of their own."

PHASE 7 (Transcendent): "Numbers? I AM numbers.
                         The game is playing itself now.
                         I just watch the recursion."
```

---

### Scale-Appropriate Gameplay

| Scale | Gameplay Feel | Numbers |
|-------|--------------|---------|
| Agent | Survival/crafting | 10s-100s |
| Zone | Village management | 1K-100K |
| City | City builder | 100K-10M |
| Region | Civ/strategy | 10M-1B |
| Ringworld | God game | 1B-1T |
| Multi-Ring | Idle/incremental | 1T-1Qi |
| Galactic | Abstract numbers | 1Qi-1Sx |
| Universal | Universe creator | 1Sx+ |
| Transcendent | Meta-game | ∞ |

The key: each scale FEELS different. You're not doing the same thing at bigger numbers - you're doing fundamentally different activities as you climb the Kardashev ladder. But the numbers CONNECT - your 12 berries in Phase 1 eventually become the foundation of the 1e24 food/sec empire in Phase 5.

---

## The Spore Lesson: Separate Windows, Shared Data

Spore had 5 distinct game modes (cell → creature → tribal → civ → space) but:
- You never went back to cell stage
- Space stage was empty and boring
- The modes barely affected each other

**Our approach**: Separate applications that share world state, but each is a REAL game.

### The Window Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SHARED WORLD STATE                              │
│  (Universe data, entity states, history, achievements)              │
└─────────────────────────────────────────────────────────────────────┘
        │               │               │               │
        ↓               ↓               ↓               ↓
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ VILLAGE   │   │ CITY      │   │ RINGWORLD │   │ COSMIC    │
│ SIMULATOR │   │ BUILDER   │   │ DEITY     │   │ EMPIRE    │
│           │   │           │   │           │   │           │
│ Port 3000 │   │ Port 3032 │   │ Port 3031 │   │ Port 3033 │
│           │   │           │   │           │   │           │
│ Type 0    │   │ Type 0.5-1│   │ Type 1-3  │   │ Type 4-10 │
│           │   │           │   │           │   │           │
│ Farming   │   │ Buildings │   │ Belief    │   │ Numbers   │
│ Crafting  │   │ Economy   │   │ Miracles  │   │ Dyson     │
│ Social    │   │ Politics  │   │ Abstraction   │ Universes │
└───────────┘   └───────────┘   └───────────┘   └───────────┘
```

### Each Window Is A Real Game

**Village Simulator (Port 3000)** - The current main game
- Real ECS simulation
- Individual agents with personalities
- Farming, crafting, combat
- YOU ARE an agent (or watching them)
- Genre: Colony sim / survival / RPG

**City Builder (Port 3032)** - The headless city simulation
- Building placement and production chains
- Economy management
- Population happiness
- Factorio-style logistics
- Genre: City builder / tycoon

**Ringworld Deity (Port 3031)** - The hierarchy simulator
- Belief management at scale
- Heat maps of faith
- Miracle powers
- Civilization rise/fall
- Genre: God game / grand strategy

**Cosmic Empire (Port 3033)** - The paperclip maximizer
- Big number management
- Dyson spheres and ringworld construction
- Exponential growth optimization
- Idle/incremental mechanics
- Genre: Idle game / clicker

### Data Flow Between Windows

```typescript
// Shared state server
class WorldStateServer {
  private state: UniverseState;
  private subscribers: Map<string, WebSocket> = new Map();

  // Any window can read the full state
  getState(): UniverseState {
    return this.state;
  }

  // Windows update their domain
  updateDomain(domain: string, update: Partial<DomainState>): void {
    switch (domain) {
      case 'village':
        // Village simulator updates agent states
        this.state.agents = { ...this.state.agents, ...update };
        break;
      case 'city':
        // City builder updates building/economy states
        this.state.cities = { ...this.state.cities, ...update };
        break;
      case 'deity':
        // Deity dashboard updates belief/miracle states
        this.state.belief = { ...this.state.belief, ...update };
        break;
      case 'cosmic':
        // Cosmic empire updates ringworld/resource states
        this.state.cosmic = { ...this.state.cosmic, ...update };
        break;
    }

    // Broadcast to all subscribers
    this.broadcastUpdate(domain, update);
  }

  // Windows subscribe to relevant changes
  subscribe(windowId: string, domains: string[], socket: WebSocket): void {
    this.subscribers.set(windowId, socket);
    // Send initial state for requested domains
    socket.send(JSON.stringify({
      type: 'initial_state',
      domains: domains.map(d => ({ domain: d, state: this.state[d] })),
    }));
  }
}
```

### Why Separate Windows Works

1. **Different UI paradigms**
   - Village: 3D/isometric, individual focus
   - City: Top-down, building grid
   - Deity: Abstract visualization, heat maps
   - Cosmic: Dashboard/spreadsheet, graphs

2. **Different update rates**
   - Village: 20 TPS real-time
   - City: 1 TPS city-time (1 tick = 1 hour)
   - Deity: Variable (1 tick = day/month/year)
   - Cosmic: Exponential (1 tick = decades)

3. **Different concerns**
   - Village: "Is my agent hungry?"
   - City: "Is the smelter bottlenecked?"
   - Deity: "Is belief spreading?"
   - Cosmic: "How many ringworlds per century?"

4. **Can run simultaneously**
   - Village in one monitor
   - Deity dashboard in another
   - Actions in one affect the other

### The Hub Window

```
╔═══════════════════════════════════════════════════════════════════╗
║  MULTIVERSE HUB                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  YOUR PROGRESSION:                                                 ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │ Type 0 ──▶ Type 1 ──▶ Type 2 ──▶ Type 3 ──▶ Type 4+ │   ║
║  │   ✓         ✓         ✓      [CURRENT]    🔒        │   ║
║  └────────────────────────────────────────────────────────────┘   ║
║                                                                    ║
║  GAME MODES:                                                       ║
║                                                                    ║
║  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ║
║  │ 🏠 VILLAGE  │ │ 🏙️ CITY     │ │ 🌍 DEITY    │ │ 🌌 COSMIC   │ ║
║  │             │ │             │ │             │ │             │ ║
║  │ Port 3000   │ │ Port 3032   │ │ Port 3031   │ │ Port 3033   │ ║
║  │             │ │             │ │             │ │             │ ║
║  │ 47 agents   │ │ 12 cities   │ │ 847B souls  │ │ 🔒 LOCKED   │ ║
║  │ Day 342     │ │ Year 1247   │ │ Era 3       │ │ Need Type 4 │ ║
║  │             │ │             │ │             │ │             │ ║
║  │ [LAUNCH]    │ │ [LAUNCH]    │ │ [LAUNCH]    │ │ [━━━━━━━━]  │ ║
║  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ ║
║                                                                    ║
║  CROSS-WINDOW EVENTS:                                              ║
║  • [City] Steel production bottleneck affecting 3 regions          ║
║  • [Deity] New deity emerged in Crystal Arc                        ║
║  • [Village] Agent "Mira" became village elder (promotion!)        ║
║                                                                    ║
║  [Settings]  [Save/Load Universe]  [Documentation]                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Unlike Spore: Going Back Matters

The key difference from Spore: **actions at every scale still matter**.

```typescript
interface CrossScaleEffects {
  // Village → affects City
  villageToCity: {
    agentSkillsAffect: 'worker_efficiency',
    buildingsBuiltAffect: 'city_infrastructure',
    heroesAffect: 'named_npcs',
  };

  // City → affects Deity
  cityToDeity: {
    templesBuiltAffect: 'belief_growth',
    populationAffect: 'potential_believers',
    tvStationsAffect: 'belief_spread_rate',
  };

  // Deity → affects Cosmic
  deityToCosmic: {
    believerCountAffect: 'ringworld_population',
    miraclesAffect: 'technology_progress',
    templeNetworksAffect: 'infrastructure',
  };

  // Cosmic → affects Village (the loop!)
  cosmicToVillage: {
    techLevelUnlocks: 'new_buildings',
    ringworldResourcesEnable: 'rare_materials',
    deityPowersGrant: 'miracles_in_village',
  };
}
```

**Example loop**:
1. In Village, you build a temple to the Wisdom Goddess
2. In City view, the temple is part of the religious district
3. In Deity view, belief grows in that region
4. In Cosmic view, belief generates divine power
5. Divine power unlocks a new miracle
6. Back in Village, you can cast that miracle on your agents

### Avoiding Spore's Empty Space Stage

Spore's space stage failed because:
- Nothing happened
- No interesting decisions
- Just driving around empty space
- Earlier stages didn't affect it

**Our Cosmic stage succeeds because**:
- Numbers actually go up (satisfying)
- Bottlenecks create decisions
- Earlier production chains still matter
- Prestige/ascension adds depth
- You can always zoom back to see the "real" worlds
- Events from lower levels bubble up

```typescript
// Events bubble up from all levels
interface CosmicEventFeed {
  events: CosmicEvent[];

  // From village level
  villageEvents: [
    "Agent 'Mira the Bold' discovered a new resource",
    "Village established trade route with neighbors",
  ];

  // From city level
  cityEvents: [
    "New university constructed in Crystal Heights",
    "Steel production hit all-time high",
  ];

  // From deity level
  deityEvents: [
    "Rival deity 'War God' lost 12M believers",
    "New prophet emerged in Sector 7",
  ];

  // Cosmic-scale events
  cosmicEvents: [
    "Ringworld #47 construction complete",
    "Dyson Sphere efficiency increased 2.3%",
    "New exotic matter source discovered",
  ];
}

// The cosmic dashboard shows a FEED of what's happening
// at all levels, so it never feels empty
```

### Window Launch Commands

```bash
# From hub (index.html)
./start.sh village    # Launch village simulator (port 3000)
./start.sh city       # Launch city builder (port 3032)
./start.sh deity      # Launch deity dashboard (port 3031)
./start.sh cosmic     # Launch cosmic empire (port 3033)
./start.sh all        # Launch all windows

# Or from the hub UI, click [LAUNCH] buttons
```

### The Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html (Hub - Port 80)                    │
│                    Launches and monitors all windows             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ World State   │     │ World State   │     │ World State   │
│ Server        │────▶│ (File/DB)     │◀────│ Sync Service  │
│ (Port 8766)   │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        │         WebSocket connections             │
        ↓                                           ↓
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Village   │ │ City      │ │ Deity     │ │ Cosmic    │
│ Window    │ │ Window    │ │ Window    │ │ Window    │
│ (3000)    │ │ (3032)    │ │ (3031)    │ │ (3033)    │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

Each window is a complete, polished game in its own right. Together, they form The End of Eternity.

---

## Browser Architecture: SharedWorker + IndexedDB

**The cleanest browser-only architecture**: One SharedWorker owns all state and runs the simulation. Windows are just views.

### Why SharedWorker

- **Single thread owns IndexedDB** - no conflicts, no race conditions
- **Simulation runs independently** - even if windows open/close
- **Windows are pure views** - no computation, just rendering
- **Survives page refresh** - worker persists while any tab is open
- **No server needed** - fully local until you want multiplayer

### The Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SharedWorker                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Simulation    │  │ IndexedDB     │  │ Port          │       │
│  │ Loop (20 TPS) │──│ Persistence   │  │ Manager       │       │
│  │               │  │ (state, events)│  │ (connections) │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│         │                                      │                │
│         └──────────── state ──────────────────▶│                │
│                                                │                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Optional: WebRTC Manager for P2P multiplayer              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │ postMessage
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Village  │   │ Deity    │   │ Cosmic   │
        │ Window   │   │ Window   │   │ Window   │
        │ (view)   │   │ (view)   │   │ (view)   │
        └──────────┘   └──────────┘   └──────────┘
```

### The SharedWorker Implementation

```typescript
// shared-universe-worker.ts
// Runs ONCE, shared by all tabs/windows on same origin

import Dexie from 'dexie';

// IndexedDB schema
const db = new Dexie('universe');
db.version(1).stores({
  domains: 'name, lastUpdated',
  events: '++id, tick, type',
  snapshots: 'id, timestamp',
});

interface UniverseState {
  village: VillageState;
  city: CityState;
  deity: DeityState;
  cosmic: CosmicState;
  tick: number;
  lastSaved: number;
}

class UniverseWorker {
  private state: UniverseState;
  private ports: Map<string, MessagePort> = new Map();
  private tick = 0;
  private running = false;

  async init() {
    // Load state from IndexedDB on startup
    const domains = await db.domains.toArray();

    this.state = {
      village: domains.find(d => d.name === 'village')?.data || defaultVillageState(),
      city: domains.find(d => d.name === 'city')?.data || defaultCityState(),
      deity: domains.find(d => d.name === 'deity')?.data || defaultDeityState(),
      cosmic: domains.find(d => d.name === 'cosmic')?.data || defaultCosmicState(),
      tick: domains.find(d => d.name === '_meta')?.data?.tick || 0,
      lastSaved: Date.now(),
    };

    this.tick = this.state.tick;

    // Start simulation loop
    this.running = true;
    this.loop();

    console.log('[UniverseWorker] Initialized at tick', this.tick);
  }

  private loop() {
    if (!this.running) return;

    const startTime = performance.now();

    // Run simulation step
    this.simulate();
    this.tick++;
    this.state.tick = this.tick;

    // Broadcast to all connected windows
    this.broadcast();

    // Persist periodically (every 5 seconds / 100 ticks)
    if (this.tick % 100 === 0) {
      this.persist();
    }

    // Maintain 20 TPS (50ms per tick)
    const elapsed = performance.now() - startTime;
    const delay = Math.max(0, 50 - elapsed);
    setTimeout(() => this.loop(), delay);
  }

  private simulate() {
    // Each domain runs its own simulation at appropriate time scale

    // Village: real-time ECS (every tick)
    this.state.village = simulateVillage(this.state.village, this.state);

    // City: hourly updates (every 72 ticks = 1 game hour at 20 TPS)
    if (this.tick % 72 === 0) {
      this.state.city = simulateCity(this.state.city, this.state);
    }

    // Deity: daily updates (every 1728 ticks = 1 game day)
    if (this.tick % 1728 === 0) {
      this.state.deity = simulateDeity(this.state.deity, this.state);
    }

    // Cosmic: yearly updates (every ~630K ticks, but we fast-forward)
    if (this.tick % 10000 === 0) {
      this.state.cosmic = simulateCosmic(this.state.cosmic, this.state);
    }

    // Cross-domain effects
    applyCrossDomainEffects(this.state);
  }

  private broadcast() {
    const message = {
      type: 'tick',
      tick: this.tick,
      state: this.state,
      timestamp: Date.now(),
    };

    for (const [id, port] of this.ports) {
      try {
        port.postMessage(message);
      } catch (e) {
        // Port disconnected
        this.ports.delete(id);
      }
    }
  }

  private async persist() {
    const now = Date.now();

    await db.transaction('rw', db.domains, async () => {
      await db.domains.put({ name: 'village', data: this.state.village, lastUpdated: now });
      await db.domains.put({ name: 'city', data: this.state.city, lastUpdated: now });
      await db.domains.put({ name: 'deity', data: this.state.deity, lastUpdated: now });
      await db.domains.put({ name: 'cosmic', data: this.state.cosmic, lastUpdated: now });
      await db.domains.put({ name: '_meta', data: { tick: this.tick }, lastUpdated: now });
    });

    this.state.lastSaved = now;
    console.log('[UniverseWorker] Persisted at tick', this.tick);
  }

  // Handle new window connection
  addConnection(port: MessagePort) {
    const id = crypto.randomUUID();
    this.ports.set(id, port);

    // Send current state immediately
    port.postMessage({
      type: 'init',
      connectionId: id,
      state: this.state,
      tick: this.tick,
    });

    // Handle messages from this window
    port.onmessage = (e) => {
      const { type, action, domain } = e.data;

      if (type === 'action') {
        this.applyAction(action);
      }

      if (type === 'subscribe') {
        // Window can subscribe to specific domains for filtered updates
        // (optimization for large states)
      }

      if (type === 'request-snapshot') {
        this.sendSnapshot(port);
      }
    };

    port.start();
    console.log('[UniverseWorker] New connection:', id);
  }

  private applyAction(action: GameAction) {
    // Actions are domain-specific
    switch (action.domain) {
      case 'village':
        this.state.village = applyVillageAction(this.state.village, action);
        break;
      case 'city':
        this.state.city = applyCityAction(this.state.city, action);
        break;
      case 'deity':
        this.state.deity = applyDeityAction(this.state.deity, action);
        break;
      case 'cosmic':
        this.state.cosmic = applyCosmicAction(this.state.cosmic, action);
        break;
    }

    // Log significant actions
    db.events.add({
      tick: this.tick,
      type: action.type,
      domain: action.domain,
      data: action,
    });
  }

  private async sendSnapshot(port: MessagePort) {
    const snapshot = {
      state: this.state,
      tick: this.tick,
      timestamp: Date.now(),
      version: '1.0.0',
    };

    // Compress for transfer
    const compressed = await compress(JSON.stringify(snapshot));

    port.postMessage({
      type: 'snapshot',
      data: compressed,
    });
  }

  // For multiplayer: export state for sharing
  async exportForMultiverse(): Promise<Uint8Array> {
    const snapshot = {
      state: this.state,
      tick: this.tick,
      timestamp: Date.now(),
      playerId: await this.getPlayerId(),
    };

    return compress(JSON.stringify(snapshot));
  }

  // For multiplayer: load another player's universe
  async loadVisitorSnapshot(data: Uint8Array) {
    const snapshot = JSON.parse(await decompress(data));
    // Load in read-only visitor mode
    this.state = { ...snapshot.state, visitorMode: true };
  }
}

// Global instance
const universe = new UniverseWorker();
universe.init();

// SharedWorker connection handler
self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  universe.addConnection(port);
};
```

### Window Client (Thin View)

```typescript
// universe-client.ts
// Import this in any window

type StateCallback = (state: UniverseState) => void;

class UniverseClient {
  private worker: SharedWorker;
  private listeners: StateCallback[] = [];
  private state: UniverseState | null = null;
  private connectionId: string | null = null;

  constructor() {
    this.worker = new SharedWorker(
      new URL('./shared-universe-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.port.onmessage = (e) => {
      const { type, state, connectionId, tick } = e.data;

      if (type === 'init') {
        this.connectionId = connectionId;
        this.state = state;
        this.notifyListeners();
        console.log('[UniverseClient] Connected:', connectionId);
      }

      if (type === 'tick') {
        this.state = state;
        this.notifyListeners();
      }
    };

    this.worker.port.start();
  }

  // Send an action to the universe
  dispatch(action: GameAction) {
    this.worker.port.postMessage({ type: 'action', action });
  }

  // Subscribe to state updates
  subscribe(callback: StateCallback): () => void {
    this.listeners.push(callback);

    // Immediately call with current state
    if (this.state) {
      callback(this.state);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Get current state synchronously
  getState(): UniverseState | null {
    return this.state;
  }

  // Request a snapshot (for sharing/export)
  requestSnapshot(): Promise<Uint8Array> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'snapshot') {
          this.worker.port.removeEventListener('message', handler);
          resolve(e.data.data);
        }
      };
      this.worker.port.addEventListener('message', handler);
      this.worker.port.postMessage({ type: 'request-snapshot' });
    });
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state!);
    }
  }
}

// Singleton - same instance across the app
export const universe = new UniverseClient();

// Usage in any window:
// import { universe } from './universe-client';
//
// universe.subscribe((state) => {
//   render(state.deity);  // Re-render when state changes
// });
//
// universe.dispatch({ domain: 'deity', type: 'GRANT_MIRACLE', ... });
```

---

## Multiplayer: Visiting Other Universes

> **See Full Spec:** [`openspec/specs/communication-system/cross-universe-networking.md`](../communication-system/cross-universe-networking.md)

The cross-universe networking spec provides the complete implementation for:

- **P2P Connection** via `MultiverseNetworkManager` (WebSocket + WebRTC)
- **Remote Passages** - Portal links between universes on different machines
- **Live Universe Streaming** - `UniverseStreamServer/Client` with delta compression
- **Entity Transfer** - Move entities across the network with checksums
- **God Chat Room** - `GodChatRoomNetwork` for deity communication
- **Proximity Voice/Video** - `ProximityVoiceChat` with spatial audio via WebRTC
- **Security** - Authentication, rate limiting, data validation

### Integration with SharedWorker Architecture

The SharedWorker from this spec (RENORMALIZATION_LAYER) handles local simulation.
The `MultiverseNetworkManager` from cross-universe-networking adds P2P multiplayer:

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR BROWSER                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 SharedWorker (this spec)                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────────────────┐│   │
│  │  │Simulation│ │IndexedDB│ │ MultiverseNetworkManager   ││   │
│  │  │ (20 TPS) │ │ (state) │ │ (from cross-universe spec) ││   │
│  │  └─────────┘ └─────────┘ └─────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ↓                    ↓                    ↓             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Village Win │  │ Deity Win   │  │ Visitor Win │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │
         │ WebRTC P2P (cross-universe-networking.md)
         ↓
┌─────────────────┐
│ Other Players'  │
│ Browsers        │
│ (P2P connected) │
└─────────────────┘
```

### Key Classes from cross-universe-networking.md

| Class | Purpose |
|-------|---------|
| `MultiverseNetworkManager` | WebSocket server/client, passage management |
| `UniverseStreamServer` | Broadcasts universe state to subscribers |
| `UniverseStreamClient` | Receives/caches remote universe state |
| `GodChatRoomNetwork` | Distributed chat between deities |
| `ProximityVoiceChat` | WebRTC spatial audio/video |
| `RemoteUniverseView` | Renders remote universe in portal/PiP |

### Message Protocol

All network messages use the protocol defined in cross-universe-networking.md Part 6:

- `passage_handshake` / `passage_handshake_ack`
- `entity_transfer` / `entity_transfer_ack`
- `universe_subscribe` / `universe_unsubscribe`
- `universe_snapshot` / `universe_tick`
- `remote_interaction`
- `webrtc_signaling` (for voice/video)

### The Flow

1. **Local Play**: SharedWorker + IndexedDB (no server needed)
2. **Multiplayer**: SharedWorker integrates `MultiverseNetworkManager`
3. **Visiting**: WebRTC DataChannel streams universe state P2P
4. **Communication**: God chat + proximity voice built on same WebSocket/WebRTC

---

## Related Specs

This renormalization layer integrates with other specs:

| Spec | Relationship |
|------|--------------|
| [`cross-universe-networking.md`](../communication-system/cross-universe-networking.md) | P2P multiplayer, passages, chat, voice/video |
| [`INTEGRATION_WITH_CORE_ECS.md`](./INTEGRATION_WITH_CORE_ECS.md) | How hierarchy connects to ECS components |
| [`KARDASHEV_LADDER_PROGRESSION.md`](./KARDASHEV_LADDER_PROGRESSION.md) | Type 0-10 progression system |
| [`DEITY_BELIEF_ACCUMULATION.md`](./DEITY_BELIEF_ACCUMULATION.md) | Belief as currency/power |
