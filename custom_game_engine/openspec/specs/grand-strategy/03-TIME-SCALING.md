# Time Scaling - Elastic Time Across Cosmic Scales

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Dependencies:** 01-GRAND-STRATEGY-OVERVIEW.md, 02-SOUL-AGENTS.md, Hierarchy Simulator, MultiverseCoordinator

---

## Overview & Motivation

### The Elastic Time Problem

**The Challenge:** How do you let players experience both:
- An individual agent crafting a stone tool over 30 seconds (real-time)
- A galactic civilization evolving over 10,000 years (fast-forward)
- A post-singularity entity existing across millions of years (time-jump)

...in the same session, without breaking immersion?

**The Solution:** **Elastic time** - time scales dynamically based on zoom level, player intent, and narrative needs.

**Core Principle:** "Time is not fixed. It's a resource players control to explore different scales of causality."

### Three Time Modes

**1. Real-Time (Simulation)**
- Full ECS simulation at 20 TPS
- Individual agents, physics, behavior trees
- Time scale: 1 tick = 1 game-second
- Use case: Watching agents, combat, crafting
- Example: "Watch Kara mine iron ore" (1 minute real-time = 1 minute game-time)

**2. Fast-Forward (Statistical Simulation)**
- Differential equations replace ECS for inactive tiers
- Time scale: Variable (1 hour/tick → 1000 years/tick)
- Use case: City development, empire expansion
- Example: "Fast-forward 100 years, check progress" (10 seconds real-time = 100 years game-time)

**3. Time Jump (Trajectory Generation)**
- LLM generates narrative summary
- No tick-by-tick simulation
- Time scale: Instant jump (skip N years)
- Use case: Exploring distant futures, alternate timelines
- Example: "Jump to year 10,000, see what civilization built" (instant)

---

## Complete Time Scale Table

### Full Hierarchy: Tile → Galaxy

Extending the existing hierarchy-simulator time scales to interstellar scope:

| Tier | Area | Population | Real-Time/Tick | Ticks/Day* | Simulation Mode | Example Activities |
|------|------|------------|---------------|-----------|-----------------|-------------------|
| **Tile** | 9 m² | 0-10 | 1 second | 86,400 | Individual physics | Agent places stone, picks flower |
| **Chunk** | 3 km² | 10-1K | 1 second | 86,400 | **FULL ECS** | Agents build village, craft tools |
| **Zone** | 10^5 km² | 1K-100K | 1 hour | 24 | Demographics | Village population grows, resources gathered |
| **Region** | 10^8 km² | 100K-10M | 1 day | 1 | Economy | City trade routes form, markets operate |
| **Planet** | 5×10^8 km² | 1M-500M | 1 month (30 days) | 0.033 | Politics | Nations rise/fall, technology advances |
| **System** | 10^18 km² | 100M-10B | 1 year (365 days) | 0.0027 | Interstellar | Planets colonized, asteroid mining, trade |
| **Sector** | 10^24 km² | 1B-100B | 10 years | 0.00027 | Galactic regions | Civilizations expand, wars, cultural exchange |
| **Galaxy** | 10^30 km² | Trillions | 1000 years | 0.0000027 | Cosmic evolution | Species evolution, Dyson spheres, post-singularity |

\* At 20 TPS (standard ECS tick rate)

### Time Progression Examples

**At 20 TPS (standard ECS):**

| Tier | Real-Time Second | Game-Time Elapsed |
|------|-----------------|-------------------|
| Chunk | 1 second | 20 seconds |
| Zone | 1 second | 20 hours |
| Region | 1 second | 20 days (~3 weeks) |
| Planet | 1 second | 20 months (~1.67 years) |
| System | 1 second | 20 years |
| Sector | 1 second | 200 years |
| Galaxy | 1 second | 20,000 years |

**Fast-forward at 100x speed:**
- Region: 1 real-second = 2000 days (~5.5 years)
- Planet: 1 real-second = 167 years
- System: 1 real-second = 2000 years
- Galaxy: 1 real-second = **2 million years**

### Simulation Boundaries

**Full ECS (Individual Agents):**
- Tiers: Tile, Chunk
- What's simulated: Position, velocity, behavior trees, pathfinding, combat, crafting
- Cost: O(N × S) where N = entities, S = systems (~50)

**Statistical (Differential Equations):**
- Tiers: Zone, Region, Planet, System, Sector, Galaxy
- What's simulated: Population growth, resource flow, tech advancement, belief spread
- Cost: O(1) per tier

**Hybrid (Soul Agents):**
- Soul agents use headless simulation even in statistical tiers
- Cost: O(M) where M = soul agents (~1000-10,000)

---

## Fast-Forward Mechanics

### Speed Multipliers

**Player-controlled time acceleration:**

```typescript
interface TimeSpeedConfig {
  multiplier: number;    // 1x → 1000x
  label: string;
  ticksPerRealSecond: number; // At 20 TPS base
  description: string;
}

const TIME_SPEEDS: TimeSpeedConfig[] = [
  {
    multiplier: 1,
    label: '1x (Real-time)',
    ticksPerRealSecond: 20,
    description: 'Watch individual agents in real-time',
  },
  {
    multiplier: 10,
    label: '10x (Fast)',
    ticksPerRealSecond: 200,
    description: 'Days pass in seconds',
  },
  {
    multiplier: 100,
    label: '100x (Very Fast)',
    ticksPerRealSecond: 2000,
    description: 'Months pass in seconds',
  },
  {
    multiplier: 1000,
    label: '1000x (Ultra Fast)',
    ticksPerRealSecond: 20000,
    description: 'Years pass in seconds',
  },
  {
    multiplier: 10000,
    label: '10000x (Decades/tick)',
    ticksPerRealSecond: 200000,
    description: 'Centuries pass in minutes (statistical only)',
  },
  {
    multiplier: 100000,
    label: '100000x (Centuries/tick)',
    ticksPerRealSecond: 2000000,
    description: 'Millennia pass in seconds (statistical only)',
  },
];
```

### What Simulates at Each Speed

**1x - 10x (Real-time to Fast):**
- **Full ECS:** All systems run normally
- **Rendering:** 60 FPS, smooth animations
- **LLM:** Normal budget (10 calls/sec for decisions)
- **Use case:** Watching agents, micro-management

**100x - 1000x (Very Fast to Ultra Fast):**
- **Full ECS:** Throttled systems (only critical systems every tick)
  - Movement, collision: Every tick
  - Behavior tree: Every 10 ticks
  - Memory consolidation: Every 100 ticks
- **Rendering:** 30 FPS, skip animation frames
- **LLM:** Reduced budget (1 call/sec)
- **Use case:** Overnight settlement growth, fast economy simulation

**10000x - 100000x (Decades to Centuries/tick):**
- **Full ECS:** Disabled for active tier (transition to statistical)
- **Statistical simulation:** Differential equations
- **Rendering:** 10 FPS, summary visualization (population graphs, map overlays)
- **LLM:** Minimal budget (1 call/minute, only for major events)
- **Use case:** Watching civilization rise/fall over centuries

### Speed Transition Algorithm

```typescript
/**
 * Change time speed with smooth transition
 * Handles ECS → statistical transition automatically
 */
async function setTimeSpeed(
  world: World,
  newSpeed: number
): Promise<void> {
  const currentSpeed = world.timeSpeed;

  // Speed up: Gradual acceleration
  if (newSpeed > currentSpeed) {
    const steps = Math.log10(newSpeed / currentSpeed) * 5; // 5 steps per order of magnitude
    for (let i = 0; i < steps; i++) {
      const intermediateSpeed = currentSpeed * Math.pow(newSpeed / currentSpeed, (i + 1) / steps);
      await setSpeedImmediate(world, intermediateSpeed);
      await sleep(100); // 100ms between steps
    }
  } else {
    // Slow down: Immediate (safety feature)
    await setSpeedImmediate(world, newSpeed);
  }
}

async function setSpeedImmediate(
  world: World,
  speed: number
): Promise<void> {
  world.timeSpeed = speed;

  // If speed > 1000x, transition active tier to statistical
  if (speed > 1000 && world.activeTier.mode === 'active') {
    await transitionTierToStatistical(world.activeTier.id, world);
  }

  // If speed <= 1000x, can run ECS
  if (speed <= 1000 && world.activeTier.mode === 'statistical') {
    await transitionTierToActive(world.activeTier.id, world);
  }

  // Update LLM scheduler budget
  llmScheduler.setCallBudget(calculateLLMBudget(speed));

  // Update system throttling
  updateSystemThrottles(world, speed);
}
```

### System Throttling by Speed

```typescript
interface SystemThrottle {
  systemId: string;
  updateInterval: number; // Ticks between updates
}

/**
 * Calculate throttle intervals based on time speed
 */
function updateSystemThrottles(world: World, speed: number): void {
  const throttles: SystemThrottle[] = [];

  if (speed <= 10) {
    // Real-time: All systems every tick
    // (No throttling)
  } else if (speed <= 100) {
    // Fast: Throttle non-critical systems
    throttles.push(
      { systemId: 'memory_consolidation', updateInterval: 10 },
      { systemId: 'skill_learning', updateInterval: 10 },
      { systemId: 'relationship_decay', updateInterval: 20 },
      { systemId: 'building_maintenance', updateInterval: 50 },
    );
  } else if (speed <= 1000) {
    // Very fast: Heavy throttling
    throttles.push(
      { systemId: 'memory_consolidation', updateInterval: 100 },
      { systemId: 'skill_learning', updateInterval: 50 },
      { systemId: 'relationship_decay', updateInterval: 100 },
      { systemId: 'building_maintenance', updateInterval: 200 },
      { systemId: 'agent_brain', updateInterval: 10 }, // Brain still ticks, but less often
      { systemId: 'courtship', updateInterval: 500 },
      { systemId: 'reproduction', updateInterval: 500 },
    );
  } else {
    // Ultra fast: ECS disabled, statistical mode only
    // (Systems don't run, differential equations take over)
  }

  // Apply throttles
  for (const throttle of throttles) {
    const system = world.getSystem(throttle.systemId);
    if (system && 'setThrottleInterval' in system) {
      (system as any).setThrottleInterval(throttle.updateInterval);
    }
  }
}
```

---

## Time Jump System

### When to Use Time Jumps vs Fast-Forward

| Scenario | Method | Reason |
|----------|--------|--------|
| **< 1 year** | Fast-forward | Short enough to simulate key events |
| **1-10 years** | Fast-forward (headless for soul agents) | Can simulate major milestones |
| **10-100 years** | Time jump (trajectory generation) | Too long for detailed simulation |
| **100-1000 years** | Time jump | Multiple generations, narrative summary |
| **> 1000 years** | Time jump with era snapshots | Cosmic timescales, save checkpoints |

### Time Jump Algorithm

```typescript
/**
 * Execute a time jump
 * @param world - World instance
 * @param years - Number of years to jump
 * @returns Promise resolving when jump complete
 */
async function executeTimeJump(
  world: World,
  years: number
): Promise<TimeJumpResult> {
  const startTick = world.tick;
  const ticksPerYear = 525600; // Assuming 1 tick = 1 minute game-time
  const endTick = startTick + (years * ticksPerYear);

  // 1. Snapshot current state
  const snapshot = await saveSnapshot(world, `before_jump_${startTick}`);

  // 2. Generate life trajectories for all soul agents
  const soulAgents = getAllSoulAgents(world);
  const trajectories = await Promise.all(
    soulAgents.map(soul => generateLifeTrajectory({
      soulAgent: soul,
      currentState: soul.getComponent(CT.SoulAgent)?.headlessState,
      soulIdentity: soul.getComponent(CT.SoulIdentity)!,
      coreMemories: soul.getComponent(CT.SoulAgent)!.coreMemories,
      timeSkipYears: years,
      worldContext: extractWorldContext(world),
    }))
  );

  // 3. Simulate statistical tiers (differential equations)
  const statisticalResult = await simulateStatisticalTiersForDuration(
    world,
    startTick,
    endTick
  );

  // 4. Generate major events (LLM-driven)
  const majorEvents = await generateMajorEventsForPeriod(
    world,
    startTick,
    endTick,
    {
      population: statisticalResult.finalPopulation,
      techLevel: statisticalResult.finalTechLevel,
      civilizationCount: statisticalResult.civilizations.length,
      soulAgentTrajectories: trajectories,
    }
  );

  // 5. Apply trajectories to soul agents
  for (let i = 0; i < soulAgents.length; i++) {
    applyTrajectoryAndResumeHeadless(soulAgents[i]!, trajectories[i]!, world);
  }

  // 6. Update world state
  world.tick = endTick;
  updateTiersFromStatisticalResult(world, statisticalResult);

  // 7. Create era snapshots (checkpoints every N years)
  const eraSnapshots = await createEraSnapshots(
    world,
    startTick,
    endTick,
    years,
    majorEvents
  );

  // 8. Log to historical record
  recordHistoricalPeriod(world, {
    startTick,
    endTick,
    years,
    majorEvents,
    soulAgentCount: soulAgents.length,
    populationChange: statisticalResult.finalPopulation - statisticalResult.initialPopulation,
    techAdvancement: statisticalResult.finalTechLevel - statisticalResult.initialTechLevel,
  });

  return {
    startTick,
    endTick,
    years,
    majorEvents,
    soulAgentSurvivors: soulAgents.filter(s =>
      s.getComponent(CT.SoulAgent)?.trajectory?.endState.alive
    ).length,
    eraSnapshots,
    snapshot,
  };
}

interface TimeJumpResult {
  startTick: bigint;
  endTick: bigint;
  years: number;
  majorEvents: MajorEvent[];
  soulAgentSurvivors: number;
  eraSnapshots: EraSnapshot[];
  snapshot: SnapshotInfo;
}
```

### Event Generation During Time Jumps

```typescript
/**
 * Generate major historical events during time jump
 * Uses LLM to create plausible events based on context
 */
async function generateMajorEventsForPeriod(
  world: World,
  startTick: bigint,
  endTick: bigint,
  context: {
    population: number;
    techLevel: number;
    civilizationCount: number;
    soulAgentTrajectories: LifeTrajectory[];
  }
): Promise<MajorEvent[]> {
  const years = Number(endTick - startTick) / 525600;

  // Determine event frequency based on time scale
  const eventsPerCentury = calculateEventFrequency(context);
  const totalEvents = Math.floor((years / 100) * eventsPerCentury);

  // Build LLM prompt
  const prompt = buildEventGenerationPrompt({
    years,
    totalEvents,
    startingPopulation: context.population,
    techLevel: context.techLevel,
    civilizationCount: context.civilizationCount,
    notableCharacters: context.soulAgentTrajectories
      .filter(t => t.endState.alive)
      .map(t => extractNotableAchievements(t)),
  });

  // Call LLM
  const response = await llmScheduler.queueRequest({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    prompt,
    maxTokens: 4000,
    temperature: 0.9, // High creativity for diverse events
    priority: 'normal',
  });

  // Parse events
  const events = parseEventsFromLLMResponse(response.text, startTick, endTick);

  return events;
}

function calculateEventFrequency(context: {
  population: number;
  techLevel: number;
  civilizationCount: number;
}): number {
  // More population = more events
  let frequency = Math.log10(context.population) * 2;

  // Higher tech = more events (discoveries, conflicts)
  frequency += context.techLevel * 0.5;

  // Multiple civilizations = more diplomatic events
  frequency += context.civilizationCount * 0.2;

  return Math.max(5, Math.min(50, frequency)); // 5-50 events per century
}

interface MajorEvent {
  tick: bigint;
  type: 'discovery' | 'war' | 'plague' | 'golden_age' | 'extinction' | 'contact' | 'ascension';
  title: string;
  description: string;
  involvedSoulAgents: string[]; // Soul agent IDs
  impact: {
    population: number;  // Delta
    techLevel: number;   // Delta
    stability: number;   // Delta (-1 to 1)
  };
  significance: number; // 0-1 (how important for history)
}
```

---

## Differential Equation Simulation

### Statistical Simulation for Inactive Tiers

When tiers are inactive (statistical mode) or during fast-forward/time-jumps, use differential equations instead of ECS.

### Population Dynamics

**Logistic Growth with Carrying Capacity:**

```typescript
/**
 * dP/dt = r * P * (1 - P/K)
 *
 * P = population
 * r = intrinsic growth rate
 * K = carrying capacity
 */
function updatePopulation(
  tier: AbstractTier,
  deltaTime: number // In ticks
): void {
  const P = tier.population.total;
  const K = tier.population.carryingCapacity;
  const r = tier.population.growthRate;

  // Logistic growth
  const dP = r * P * (1 - P / K) * deltaTime;

  // Apply constraints
  const newPopulation = Math.max(0, P + dP);
  tier.population.total = Math.min(K, newPopulation);

  // Track growth
  tier.population.growth = dP / deltaTime; // Growth per tick
}
```

**With age structure:**

```typescript
interface AgeStructuredPopulation {
  children: number;    // 0-18 years
  adults: number;      // 18-65 years
  elderly: number;     // 65+ years
}

/**
 * Leslie matrix population model
 * Tracks age cohorts with fertility and survival rates
 */
function updateAgeStructuredPopulation(
  tier: AbstractTier,
  deltaTime: number
): void {
  const pop = tier.population.ageStructure;

  // Fertility (births from adults)
  const fertilityRate = tier.population.birthRate;
  const births = pop.adults * fertilityRate * deltaTime;

  // Aging transitions
  const childToAdult = pop.children * (1 / (18 * 365)) * deltaTime; // 1/18 years
  const adultToElderly = pop.adults * (1 / (47 * 365)) * deltaTime; // 1/47 years

  // Mortality
  const childMortality = pop.children * tier.population.childDeathRate * deltaTime;
  const adultMortality = pop.adults * tier.population.adultDeathRate * deltaTime;
  const elderlyMortality = pop.elderly * tier.population.elderlyDeathRate * deltaTime;

  // Update cohorts
  pop.children = pop.children + births - childToAdult - childMortality;
  pop.adults = pop.adults + childToAdult - adultToElderly - adultMortality;
  pop.elderly = pop.elderly + adultToElderly - elderlyMortality;

  // Update total
  tier.population.total = pop.children + pop.adults + pop.elderly;
}
```

### Economic Flow

**Production and Consumption:**

```typescript
/**
 * dR/dt = production - consumption + trade
 *
 * R = resource stock
 * production = workers * productivity * techBonus
 * consumption = population * demand
 */
function updateEconomy(
  tier: AbstractTier,
  deltaTime: number
): void {
  const workers = tier.population.total * tier.economy.laborForceRatio;
  const techBonus = 1 + (tier.tech.level * 0.15); // +15% per tech level

  // Production
  const production = workers * tier.economy.baseProductivity * techBonus;

  // Consumption
  const consumption = tier.population.total * tier.economy.demandPerCapita;

  // Trade (from connected tiers)
  const tradeBalance = calculateTradeBalance(tier);

  // Update resource stocks
  const dR = (production - consumption + tradeBalance) * deltaTime;
  tier.economy.resourceStock += dR;

  // Prevent negative stocks
  if (tier.economy.resourceStock < 0) {
    tier.economy.resourceStock = 0;
    // Trigger famine/crisis event
    tier.stability.current -= 0.1 * Math.abs(dR);
  }
}

function calculateTradeBalance(tier: AbstractTier): number {
  let netTrade = 0;

  for (const route of tier.tradeRoutes) {
    const partner = getPartnerTier(route.partnerId);
    if (!partner) continue;

    // Import/export based on price differential
    const priceDiff = tier.economy.price - partner.economy.price;
    const tradeVolume = route.capacity * (1 / (1 + Math.abs(priceDiff)));

    if (priceDiff > 0) {
      // We import (cheaper elsewhere)
      netTrade += tradeVolume;
    } else {
      // We export (more expensive elsewhere)
      netTrade -= tradeVolume;
    }
  }

  return netTrade;
}
```

### Technology Diffusion

**Research Progress:**

```typescript
/**
 * dT/dt = (universities * researchRate - techFriction) * stabilityBonus
 *
 * T = tech progress (0-100 per level)
 * universities = number of research institutions
 * researchRate = base research speed
 * techFriction = difficulty increases with level
 * stabilityBonus = high stability = faster research
 */
function updateTechnology(
  tier: AbstractTier,
  deltaTime: number
): void {
  const universities = tier.universities;
  const researchRate = tier.tech.baseResearchRate;
  const techLevel = tier.tech.level;

  // Tech friction (harder as you advance)
  const techFriction = Math.pow(1.5, techLevel) * 0.01;

  // Stability bonus (unstable = slow research)
  const stabilityBonus = Math.max(0.1, tier.stability.current);

  // Research progress
  const dT = (universities * researchRate - techFriction) * stabilityBonus * deltaTime;
  tier.tech.researchProgress += dT;

  // Level up when progress reaches 100
  if (tier.tech.researchProgress >= 100) {
    tier.tech.level += 1;
    tier.tech.researchProgress -= 100;

    // Emit tech advancement event
    emitEvent('tech:advancement', {
      tierId: tier.id,
      newLevel: tier.tech.level,
    });
  }
}
```

**Technology Spread Between Tiers:**

```typescript
/**
 * Diffusion equation: dT/dt = D * ∇²T
 *
 * Tech spreads from high-tech to low-tech regions via trade/migration
 */
function updateTechDiffusion(
  tiers: AbstractTier[],
  deltaTime: number
): void {
  const diffusionRate = 0.01; // How fast tech spreads

  for (const tier of tiers) {
    let techInflow = 0;

    // Sum tech level difference from neighbors
    for (const neighborId of tier.neighbors) {
      const neighbor = tiers.find(t => t.id === neighborId);
      if (!neighbor) continue;

      const techDiff = neighbor.tech.level - tier.tech.level;
      if (techDiff > 0) {
        // Neighbor is more advanced, we gain tech
        techInflow += techDiff * diffusionRate;
      }
    }

    // Apply tech gain (fractional)
    tier.tech.diffusionProgress += techInflow * deltaTime;

    if (tier.tech.diffusionProgress >= 1.0) {
      tier.tech.level += 1;
      tier.tech.diffusionProgress -= 1.0;
    }
  }
}
```

### Cultural & Belief Spread

**Word-of-Mouth + Temples:**

```typescript
/**
 * dB/dt = B * wordOfMouthRate + temples * templePower - B * decayRate
 *
 * B = believers (for a specific deity)
 * wordOfMouthRate = organic spread (0.0001 default)
 * templePower = believers/temple/tick
 * decayRate = belief decay without reinforcement
 */
function updateBelief(
  tier: AbstractTier,
  deityId: string,
  deltaTime: number
): void {
  const belief = tier.belief.byDeity.get(deityId);
  if (!belief) return;

  const B = belief.believers;

  // Word of mouth (exponential growth, capped by population)
  const wordOfMouth = B * 0.0001 * (1 - B / tier.population.total);

  // Temple influence
  const templePower = belief.temples * 10; // 10 believers/temple/tick

  // Decay (without miracles/temples, belief fades)
  const decayRate = 0.00001;
  const decay = B * decayRate;

  // Net change
  const dB = (wordOfMouth + templePower - decay) * deltaTime;
  belief.believers = Math.max(0, Math.min(tier.population.total, B + dB));

  // Update faith density
  belief.faithDensity = belief.believers / tier.population.total;
}

/**
 * Miracle effects (sudden belief spike)
 */
function applyMiracle(
  tier: AbstractTier,
  deityId: string
): void {
  const belief = tier.belief.byDeity.get(deityId);
  if (!belief) return;

  // Miracle causes immediate belief spike
  const miracleBonus = 100 * tier.population.total * 0.01; // 1% of population
  belief.believers += miracleBonus;
  belief.recentMiracles += 1;

  // Increase faith density
  belief.faithDensity = belief.believers / tier.population.total;
}
```

---

## Era Snapshots & Historical Record

### Automatic Checkpoints During Time Jumps

**Why:** Time jumps skip simulation. Era snapshots preserve key moments for archaeology/time-travel.

```typescript
/**
 * Create era snapshots at regular intervals during time jump
 * @param world - World instance
 * @param startTick - Jump start
 * @param endTick - Jump end
 * @param years - Total years jumped
 * @param majorEvents - Generated events during jump
 * @returns Array of era snapshots
 */
async function createEraSnapshots(
  world: World,
  startTick: bigint,
  endTick: bigint,
  years: number,
  majorEvents: MajorEvent[]
): Promise<EraSnapshot[]> {
  const snapshots: EraSnapshot[] = [];

  // Snapshot interval based on jump duration
  const snapshotInterval = calculateSnapshotInterval(years);
  const snapshotCount = Math.floor(years / snapshotInterval);

  for (let i = 1; i <= snapshotCount; i++) {
    const snapshotYear = i * snapshotInterval;
    const snapshotTick = startTick + BigInt(snapshotYear * 525600);

    // Find events near this snapshot
    const nearbyEvents = majorEvents.filter(e =>
      Math.abs(Number(e.tick - snapshotTick)) < (snapshotInterval * 525600 / 2)
    );

    // Interpolate world state at this tick
    const worldState = interpolateWorldState(
      world,
      startTick,
      endTick,
      snapshotTick,
      majorEvents
    );

    // Create snapshot
    const snapshot: EraSnapshot = {
      tick: snapshotTick,
      year: snapshotYear,
      population: worldState.population,
      techLevel: worldState.techLevel,
      civilizations: worldState.civilizations,
      majorEventsThisEra: nearbyEvents,
      soulAgentStates: captureSoulAgentStates(world, snapshotTick),
    };

    snapshots.push(snapshot);

    // Save snapshot to disk for later time-travel
    await saveLoadService.saveSnapshot(world, `era_${snapshotYear}`, snapshot);
  }

  return snapshots;
}

function calculateSnapshotInterval(years: number): number {
  if (years <= 100) return 10;        // Snapshot every 10 years
  if (years <= 1000) return 50;       // Snapshot every 50 years
  if (years <= 10000) return 500;     // Snapshot every 500 years
  return 1000;                         // Snapshot every 1000 years
}

interface EraSnapshot {
  tick: bigint;
  year: number;
  population: number;
  techLevel: number;
  civilizations: CivilizationSummary[];
  majorEventsThisEra: MajorEvent[];
  soulAgentStates: SoulAgentSnapshot[];
}
```

### Historical Record Generation

```typescript
/**
 * Record historical period in world's timeline
 * Used for player queries like "What happened between year 500-1000?"
 */
function recordHistoricalPeriod(
  world: World,
  record: {
    startTick: bigint;
    endTick: bigint;
    years: number;
    majorEvents: MajorEvent[];
    soulAgentCount: number;
    populationChange: number;
    techAdvancement: number;
  }
): void {
  const historicalRecord: HistoricalPeriod = {
    startTick: record.startTick,
    endTick: record.endTick,
    duration: record.years,
    summary: generateHistoricalSummary(record),
    majorEvents: record.majorEvents,
    soulAgentInvolvement: record.soulAgentCount,
    populationChange: record.populationChange,
    techAdvancement: record.techAdvancement,
    significance: calculateHistoricalSignificance(record),
  };

  // Add to world's timeline
  world.timeline.periods.push(historicalRecord);

  // Emit event for UI update
  world.events.emit('timeline:period_recorded', {
    period: historicalRecord,
  });
}

function generateHistoricalSummary(record: {
  years: number;
  majorEvents: MajorEvent[];
  populationChange: number;
  techAdvancement: number;
}): string {
  const eventTypes = record.majorEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let summary = `${record.years}-year period. `;

  if (record.populationChange > 0) {
    summary += `Population grew by ${(record.populationChange / 1e6).toFixed(1)}M. `;
  } else {
    summary += `Population declined by ${Math.abs(record.populationChange / 1e6).toFixed(1)}M. `;
  }

  if (record.techAdvancement > 0) {
    summary += `Technology advanced ${record.techAdvancement} levels. `;
  }

  if (eventTypes.war) {
    summary += `${eventTypes.war} wars. `;
  }

  if (eventTypes.discovery) {
    summary += `${eventTypes.discovery} major discoveries. `;
  }

  if (eventTypes.plague) {
    summary += `${eventTypes.plague} plagues. `;
  }

  return summary.trim();
}

interface HistoricalPeriod {
  startTick: bigint;
  endTick: bigint;
  duration: number; // years
  summary: string;
  majorEvents: MajorEvent[];
  soulAgentInvolvement: number;
  populationChange: number;
  techAdvancement: number;
  significance: number; // 0-1
}
```

---

## Soul Agent Time Paradox Resolution

### The Multi-Generational Paradox

**Problem:** Soul agents age in real-time, but player can fast-forward centuries.

**Example:**
- Kara (soul agent) is 25 years old
- Player fast-forwards 500 years (10 seconds real-time)
- Kara should be dead (died at ~80), but player still cares about her story
- Her descendants exist, but are they soul agents too?

### Solutions

**1. Headless Aging (Default)**

Soul agents age during fast-forward via headless simulation:

```typescript
// During fast-forward (100x speed):
// 1 real-second = 2000 days = ~5.5 years
// Kara ages 5.5 years per real-second
// After ~15 real-seconds, Kara dies naturally at 80

const kara = getSoulAgent('soul:kara');
const headlessState = kara.getComponent(CT.SoulAgent)!.headlessState;

// Age projected
headlessState.ageingState.biologicalAge; // 25 → 30 → 40 → 80 (death)
headlessState.ageingState.estimatedDeathTick; // Tick when natural death occurs
```

**Player sees:**
- Notification: "Kara died of old age at 85 years" (during fast-forward)
- Can still query Kara's legacy, descendants, impact on world

**2. Time Jump with Trajectory**

Soul agents "fast-forward" through life via LLM trajectory:

```typescript
// Player jumps 500 years
const trajectory = await generateLifeTrajectory({
  soulAgent: kara,
  timeSkipYears: 500,
  ...
});

// Trajectory milestones:
trajectory.milestones = [
  { year: 5, event: 'Married Finn', emotionalImpact: 0.8 },
  { year: 10, event: 'Discovered iron smelting', emotionalImpact: 0.9 },
  { year: 30, event: 'Became village elder', emotionalImpact: 0.7 },
  { year: 60, event: 'Died peacefully, surrounded by family', emotionalImpact: -0.5 },
];

trajectory.endState.alive = false;
trajectory.endState.age = 85;
```

**Player sees:**
- Summary: "Kara lived to 85, discovered iron, founded dynasty"
- Can browse milestones like a historical biography
- Descendants may be promoted to soul agents (inheritance)

**3. Descendant Inheritance**

When soul agent dies, descendants can inherit soul agent status:

```typescript
// Kara dies at 85
handleSoulAgentDeath(kara, 'natural', world);

// Check descendants
const children = getDescendants(kara, world);
const firstborn = children[0];

if (shouldInheritSoulAgentStatus(kara, firstborn, inheritancePolicy)) {
  // Firstborn becomes soul agent
  inheritSoulAgentStatus(kara, firstborn, world);

  // Player notification
  console.log(`Kara's daughter Luna inherited soul agent status`);
  console.log(`Luna carries Kara's legacy forward`);
}
```

**Inheritance policies:**
- **All:** Every child becomes soul agent (dynasty tracking)
- **Firstborn:** Only first child inherits (royal lineage)
- **Random:** 50% chance per child (natural selection)
- **None:** No automatic inheritance (player must manually promote)

### Time Travel Scenarios

**Scenario 1: Visit Past Self**

```
Year 0: Player controls Kara (soul agent) as villager
Year 500: Player is at galactic tier
Player time-travels to Year 250 (via universe fork)

Question: Can player meet "Kara at age 25" again?
```

**Answer:** Yes, via universe branching.

```typescript
// Fork universe at Year 250
const forkedUniverse = await multiverseCoordinator.forkUniverse(
  'universe:main',
  'timeline:year_250'
);

// Forked universe has copy of Kara at age 25
const forkedKara = forkedUniverse.getSoulAgent('soul:kara');
forkedKara.getComponent(CT.Identity)!.age; // 25

// Original universe still has "main" Kara (now deceased)
const mainKara = mainUniverse.getSoulAgent('soul:kara');
mainKara.getComponent(CT.SoulAgent)!.coreMemories.length; // Full history
```

**No paradox:** Separate universe = separate Kara instance.

**Scenario 2: Bring Future Item to Past**

```
Year 500: Player has advanced tech (laser gun)
Player time-travels to Year 0
Question: Can player give laser gun to Kara?
```

**Answer:** Yes, but creates timeline contamination.

```typescript
interface TimelineContamination {
  sourceTimeline: string;      // 'universe:main:year_500'
  targetTimeline: string;      // 'universe:branch:year_0'
  contaminationItems: string[]; // ['laser_gun']
  contaminationLevel: number;  // How incompatible (0-1)
}

// Laser gun in Year 0 = extreme contamination
const contamination = calculateContamination('laser_gun', 'year_0');
contamination.contaminationLevel; // 0.99 (very incompatible)

// Effects:
// - Timeline becomes unstable (stability penalty)
// - High chance of timeline rejection (universe discarded)
// - Or: Timeline diverges into alternate history
```

**Resolution:** Contaminated timelines become "what-if" scenarios. Player can explore but may not merge back to main.

---

## LLM Event Generation

### Event Types & Templates

**Major event categories:**

```typescript
type EventCategory =
  | 'discovery'      // Technology, resource, location
  | 'war'            // Conflict between civilizations
  | 'plague'         // Disease, famine, natural disaster
  | 'golden_age'     // Period of prosperity
  | 'extinction'     // Species/civilization collapse
  | 'contact'        // First contact between species/civs
  | 'ascension'      // Post-singularity, deity emergence
  | 'schism'         // Religious/political split
  | 'migration'      // Mass movement of population
  | 'revolution';    // Government overthrow

interface EventTemplate {
  category: EventCategory;
  frequency: number;       // Events per 100 years (base rate)
  requirements: EventRequirements;
  impactModel: (context: WorldContext) => EventImpact;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    category: 'discovery',
    frequency: 10,
    requirements: {
      minTechLevel: 1,
      minPopulation: 1000,
    },
    impactModel: (ctx) => ({
      population: 0,
      techLevel: +1,
      stability: +0.1,
    }),
  },
  {
    category: 'war',
    frequency: 5,
    requirements: {
      minCivilizations: 2,
      minPopulation: 10000,
    },
    impactModel: (ctx) => ({
      population: -ctx.population * 0.1, // 10% casualties
      techLevel: 0,
      stability: -0.5,
    }),
  },
  // ... more templates
];
```

### LLM Prompt for Event Generation

```typescript
function buildEventGenerationPrompt(params: {
  years: number;
  totalEvents: number;
  startingPopulation: number;
  techLevel: number;
  civilizationCount: number;
  notableCharacters: Array<{ name: string; achievements: string[] }>;
}): string {
  return `You are generating a historical record for a civilization simulation.

TIME PERIOD: ${params.years} years
STARTING STATE:
- Population: ${(params.startingPopulation / 1e6).toFixed(1)}M
- Tech Level: ${params.techLevel}
- Civilizations: ${params.civilizationCount}

NOTABLE CHARACTERS:
${params.notableCharacters.map(c => `- ${c.name}: ${c.achievements.join(', ')}`).join('\n')}

TASK: Generate ${params.totalEvents} major historical events that occurred during this period.

Event Types:
- Discovery: New technology, resource, or location
- War: Conflict between civilizations/factions
- Plague: Disease, famine, natural disaster
- Golden Age: Period of prosperity and cultural flourishing
- Extinction: Collapse of civilization or species
- Contact: First contact between species or distant civilizations
- Ascension: Post-singularity development or deity emergence

Format each event as:
{
  "year": <relative year 0-${params.years}>,
  "type": "<event type>",
  "title": "<brief title>",
  "description": "<2-3 sentence description>",
  "involvedCharacters": ["<character names if relevant>"],
  "impact": {
    "population": <change in millions, can be negative>,
    "techLevel": <change in tech level>,
    "stability": <change -1 to 1>
  },
  "significance": <0-1, how important for civilization's history>
}

Events should:
1. Build on each other (later events reference earlier ones)
2. Involve notable characters when relevant
3. Be plausible given tech level and population
4. Create narrative arcs (not just random events)
5. Reflect the civilization's trajectory (growth, stagnation, collapse)

Return a JSON array of events.`;
}
```

### Event Parsing & Application

```typescript
function parseEventsFromLLMResponse(
  llmResponse: string,
  startTick: bigint,
  endTick: bigint
): MajorEvent[] {
  const data = JSON.parse(llmResponse);
  const totalYears = Number(endTick - startTick) / 525600;

  return data.map((eventData: any) => {
    const tick = startTick + BigInt(eventData.year * 525600);

    return {
      tick,
      type: eventData.type,
      title: eventData.title,
      description: eventData.description,
      involvedSoulAgents: findSoulAgentsByNames(eventData.involvedCharacters),
      impact: {
        population: eventData.impact.population * 1e6, // Convert to raw number
        techLevel: eventData.impact.techLevel,
        stability: eventData.impact.stability,
      },
      significance: eventData.significance,
    };
  });
}

/**
 * Apply event impacts to world state
 */
function applyEventImpacts(
  world: World,
  event: MajorEvent
): void {
  // Apply to all tiers
  const allTiers = hierarchySimulator.getAllTiers();

  for (const tier of allTiers) {
    // Population impact
    tier.population.total += event.impact.population;
    tier.population.total = Math.max(0, tier.population.total);

    // Tech impact
    tier.tech.level += event.impact.techLevel;
    tier.tech.level = Math.max(1, tier.tech.level);

    // Stability impact
    tier.stability.current += event.impact.stability;
    tier.stability.current = Math.max(0, Math.min(1, tier.stability.current));
  }

  // Create historical marker
  world.timeline.events.push({
    tick: event.tick,
    type: event.type,
    title: event.title,
    description: event.description,
  });
}
```

---

## Performance Considerations

### CPU Budget by Mode

**Real-Time (1x-10x):**
```
ECS Systems: 50 systems × 1000 entities = 50,000 ops/tick
Rendering: 60 FPS = 60 frames/sec
LLM: 10 calls/sec
Total: Heavy (100% CPU usage expected)
```

**Fast-Forward (100x-1000x):**
```
ECS Systems: Throttled, ~10 systems × 1000 entities = 10,000 ops/tick
Rendering: 30 FPS = 30 frames/sec
LLM: 1 call/sec
Total: Moderate (50% CPU usage)
```

**Ultra Fast-Forward (10000x+):**
```
Statistical Simulation: 100 tiers × O(1) = 100 ops/tick
Rendering: 10 FPS (chart updates)
LLM: 1 call/minute
Total: Light (10% CPU usage)
```

**Time Jump (instant):**
```
LLM: 50-100 calls for trajectory generation (5-10 seconds)
Statistical: Batch solve differential equations (1-2 seconds)
Save: Create era snapshots (1-5 seconds)
Total: 10-20 seconds for 1000-year jump
```

### Memory Budget

**Time jump memory cost:**

```typescript
// 1000-year time jump:
// - 1000 soul agents × 100 milestones = 100K milestones
// - 100K × 200 bytes = 20 MB
// - 10 era snapshots × 5 MB = 50 MB
// Total: ~70 MB for time jump data

interface MemoryBudget {
  soulAgentTrajectories: number; // 20 MB
  eraSnapshots: number;          // 50 MB
  majorEvents: number;           // 1 MB
  statisticalState: number;      // 10 MB
  total: number;                 // 81 MB
}
```

**Mitigation:**
- Compress trajectories after application
- Stream era snapshots to disk
- Garbage collect old events

### Scalability Limits

| Years Jumped | Era Snapshots | LLM Calls | Processing Time | Memory | Status |
|--------------|---------------|-----------|-----------------|--------|--------|
| 10 | 1 | 5 | 1s | 10 MB | ✅ Instant |
| 100 | 2 | 10 | 5s | 20 MB | ✅ Fast |
| 1,000 | 10 | 50 | 20s | 80 MB | ✅ Acceptable |
| 10,000 | 100 | 500 | 3min | 800 MB | ⚠️ Slow |
| 100,000 | 1000 | 5000 | 30min | 8 GB | ❌ Too heavy |

**Recommended maximum: 10,000-year jumps**
- Above 10K, split into multiple jumps or use millennium-scale snapshots

---

## Open Questions & Future Work

### Design Questions

**1. Should players see "behind the curtain" of statistical simulation?**
- **Option A:** Show differential equations, raw numbers (transparency)
- **Option B:** Hide math, present narrative summary (immersion)
- **Recommendation:** Option B, with optional debug panel for developers

**2. How to handle catastrophic events during time jumps?**
- Civilization goes extinct at year 500 of 1000-year jump
- **Option A:** Abort jump, return to extinction point
- **Option B:** Continue simulation with extinction recorded, generate post-collapse events
- **Recommendation:** Option B - let history unfold

**3. Should time scaling be continuous or discrete steps?**
- **Current:** Discrete steps (1x, 10x, 100x, 1000x)
- **Alternative:** Continuous slider (1x → 100,000x)
- **Recommendation:** Discrete steps for clarity, but allow custom speeds for advanced users

### Technical Challenges

**1. Differential equation solver stability**
- Long time steps (1000-year jumps) can cause numerical instability
- **Mitigation:** Adaptive step size, Runge-Kutta methods

**2. LLM event generation coherence**
- Events generated independently may contradict
- **Mitigation:** Multi-pass generation (generate outline → fill details → consistency check)

**3. Era snapshot compression**
- 1000 snapshots × 5 MB = 5 GB save file
- **Mitigation:** Lossy compression, reference previous snapshots (delta encoding)

### Future Enhancements

**1. Variable Time Dilation (Physics-Inspired)**
- Regions with high "activity" run slower (like gravitational time dilation)
- War zones = slow time, peaceful areas = fast time
- Player can choose which regions to "focus" on (slow down)

**2. Predictive Time Jumps**
- AI predicts outcomes before jumping
- "If you jump 100 years, here's what will probably happen"
- Player can adjust parameters to steer outcome

**3. Time Compression Artifacts**
- Fast-forward too fast = lose detail (intended)
- But: Create "glitches" (missed events, inconsistencies) as game mechanic
- Players must investigate anomalies in historical record

**4. Multiplayer Time Sync**
- Multiple players at different time scales
- Player A at 1x (village), Player B at 1000x (empire)
- Synchronization challenges: B's 1 second = A's 1000 seconds
- Solution: Relative time zones, async gameplay

---

## Summary

Time Scaling is the key innovation enabling **cosmic-scale gameplay** while preserving individual stories:

**Three Modes:**
1. **Real-Time:** Full ECS, 1x-10x speed, individual agents visible
2. **Fast-Forward:** Statistical simulation, 100x-100,000x speed, watch civilizations evolve
3. **Time Jump:** LLM trajectory generation, instant skip, explore distant futures

**Time Scale Table:**
- Chunk: 1 second/tick (real-time ECS)
- Region: 1 day/tick (city simulation)
- Planet: 1 month/tick (nation simulation)
- System: 1 year/tick (interstellar trade)
- Galaxy: 1000 years/tick (cosmic evolution)

**Performance:**
- Real-time: 50,000 ops/tick, 100% CPU
- Fast-forward: 100 ops/tick, 10% CPU (500x reduction)
- Time jump: 10-20 seconds for 1000 years

**Soul Agent Integration:**
- Headless aging during fast-forward
- LLM trajectory generation for time jumps
- Descendant inheritance preserves dynasties
- No paradoxes via universe forking

**Result:** Player can:
- Watch Kara craft a tool in real-time (1 minute)
- Fast-forward 500 years to see her empire (10 seconds)
- Jump 10,000 years to post-singularity descendants (instant)
- Travel back to year 250 via universe fork (meet Kara's grandchildren)

**The entire causal chain remains queryable across all timescales.**

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-16
**Total Lines:** ~520
**Next Spec:** 04-SPATIAL-HIERARCHY.md (expanding spatial tiers to interstellar)
**Status:** Complete, ready for implementation
