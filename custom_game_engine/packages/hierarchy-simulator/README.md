# Hierarchy Simulator - Multi-Scale Social Hierarchy System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the hierarchy simulator to understand its architecture, renormalization mechanics, and multi-scale social systems.

## Overview

The **Hierarchy Simulator Package** (`@ai-village/hierarchy-simulator`) implements a multi-scale hierarchical abstraction system for simulating massive populations across 7 tiers of scale, from individual tiles (9m²) to gigasegments (10^15 km²). It uses renormalization group theory to zoom between statistical summaries and detailed ECS simulation.

**What it does:**
- Simulates populations from hundreds to billions across 7 hierarchical tiers
- Renormalization engine for zooming in/out between statistical and detailed simulation
- Social hierarchies with leadership, roles, and status rankings
- Scientist emergence system with tier-based research infrastructure
- Economic flows and trade routes between hierarchical levels
- Time scaling (higher tiers simulate faster - decades per tick at gigasegment scale)

**Key files:**
- `src/simulation/SimulationController.ts` - Central simulation controller with zoom/renormalization
- `src/renormalization/RenormalizationEngine.ts` - Statistical summarization and instantiation
- `src/abstraction/AbstractTierBase.ts` - Base tier implementation with population/economy
- `src/research/ScientistEmergence.ts` - Statistical scientist emergence system
- `src/renormalization/TierConstants.ts` - Time scaling and simulation constants

---

## Package Structure

```
packages/hierarchy-simulator/
├── src/
│   ├── simulation/
│   │   └── SimulationController.ts         # Main controller, zoom in/out, state management
│   ├── renormalization/
│   │   ├── RenormalizationEngine.ts        # Summarize/instantiate tier data
│   │   ├── TierConstants.ts                # Time scales, emergence rates, constants
│   │   └── index.ts                        # Exports
│   ├── abstraction/
│   │   ├── types.ts                        # Tier types, addresses, events
│   │   ├── AbstractTierBase.ts             # Base tier implementation
│   │   ├── AbstractMegasegment.ts          # Megasegment-specific logic
│   │   └── AbstractGigasegment.ts          # Gigasegment-specific logic
│   ├── research/
│   │   ├── ScientistEmergence.ts           # Statistical scientist emergence
│   │   ├── ResearchTypes.ts                # Research fields, papers, universities
│   │   └── README.md                       # Research system documentation
│   ├── renderers/
│   │   └── HierarchyDOMRenderer.ts         # DOM rendering (introspection pattern)
│   ├── mock/
│   │   └── DataGenerator.ts                # Test data generation
│   └── main.ts                             # App entry point
├── package.json
└── README.md                               # This file
```

---

## Core Concepts

### 1. Hierarchical Tiers

7 levels of abstraction from microscopic to cosmic:

```typescript
type TierLevel =
  | 'tile'         // 9m² - Individual physics
  | 'chunk'        // 3km² - FULL ECS SIMULATION (10-1K population)
  | 'zone'         // 10^5 km² - Building cluster (1K-100K)
  | 'region'       // 10^8 km² - District (100K-10M)
  | 'subsection'   // 10^10 km² - Planet-city (10M-500M)
  | 'megasegment'  // 10^13 km² - Solar system (100M-1B)
  | 'gigasegment'; // 10^15 km² - Galactic (10B-100B)
```

**Universal Addressing:**

Every entity has a precise hierarchical address:

```typescript
interface UniversalAddress {
  gigasegment: number;           // 0-9999 (galactic scale)
  megasegment: number;           // 0-99 (solar system scale)
  subsection: number;            // 0-999 (planet-sized)
  region: number;                // 0-99 (district)
  zone: number;                  // 0-999 (building cluster)
  chunk: { x: number; y: number };  // 32×32 tiles
  tile: { x: number; y: number };   // 3m × 3m
}
```

### 2. Simulation Modes

Each tier can operate in 3 modes:

```typescript
type SimulationMode =
  | 'abstract'      // Statistics only (differential equations)
  | 'semi-active'   // Partial simulation (trade routes, events)
  | 'active';       // Full ECS (chunk-level only)
```

**Mode transitions:**
- **Zoom out** → Switch to abstract mode, create statistical summary
- **Zoom in** → Switch to active mode, instantiate entities from constraints
- **Time scaling** → Abstract tiers run 10x slower (timeScale = 0.1)

### 3. Renormalization

The core mechanic for multi-scale simulation:

```typescript
// ZOOM OUT: Summarize detailed simulation into statistics
const summary: TierSummary = renormalizationEngine.summarize(tier);
// Summary contains: population stats, economy, belief, stability, preserved entities

// ZOOM IN: Generate entities matching statistical constraints
const constraints: InstantiationConstraints =
  renormalizationEngine.getInstantiationConstraints(tierId);
// Constraints define: target population, belief distribution, tech level, etc.
```

**What gets preserved across zoom:**
- Named NPCs (governors, priests, heroes)
- Major buildings (temples, universities, wonders)
- Historical events (breakthroughs, disasters, wars)
- Belief stats (per deity)
- Tech progress

### 4. Time Scaling

Higher tiers simulate exponentially faster:

```typescript
const TIME_SCALE: Record<TierLevel, number> = {
  tile: 1,                    // 1 second per tick
  chunk: 1,                   // 1 second per tick
  zone: 60,                   // 1 minute per tick
  region: 3600,               // 1 hour per tick
  subsection: 86400,          // 1 day per tick
  megasegment: 525600,        // 1 year per tick
  gigasegment: 5256000        // 10 years per tick
};
```

This allows cosmic-scale simulation without performance collapse.

### 5. Social Hierarchies

Hierarchies emerge statistically from population dynamics:

**Named NPCs:**

```typescript
interface NamedNPC {
  id: string;
  name: string;
  role: 'governor' | 'high_priest' | 'hero' | 'villain' | 'scientist' | 'merchant';
  tierId: string;
  alive: boolean;
  fame: number;              // 0-100, preservation priority
  deityAllegiance?: string;
  achievements: string[];
}
```

**Emergence conditions:**
- **Governor:** Population > 100,000
- **High Priest:** Social stability > 60%
- **Scientist:** Based on emergence rates (see Research System)

### 6. Scientist Emergence

Scientists don't spawn instantly - they emerge statistically from conditions:

```typescript
interface EmergenceRate {
  tier: number;                   // Scientist tier (1-100)
  field: ResearchField;
  probabilityPerYear: number;     // 0-1 chance per year
  expectedYears: number;          // 1 / probability
}
```

**Emergence factors:**
- **Population:** More population = higher chance (diminishing returns)
- **Universities:** Tier-100 physicist needs 100+ tier-8 physics universities
- **Stability:** High-tier scientists need 200+ years sustained stability
- **Active research:** Need active papers at similar tier (80%+)

**Example:** Tier-100 physicist
- Base rate: 1 per 100 million years
- With ideal conditions: 1 per 4 million years
- Achievable in 2000-hour game where 1 hour = centuries

---

## System APIs

### SimulationController

Central controller for multi-scale simulation.

**Update interval:** requestAnimationFrame loop with speed multiplier

**Key methods:**

```typescript
class SimulationController {
  // Lifecycle
  start(): void;                    // Start simulation loop
  stop(): void;                     // Stop simulation
  togglePause(): boolean;           // Pause/resume
  setSpeed(speed: number): void;    // 0.1-1000x speed
  reset(hierarchyDepth: number): void;  // Reset to new hierarchy

  // State access
  getState(): Readonly<SimulationState>;
  getHistory(): Readonly<HistoryData>;  // For charts
  getTierById(tierId: string): AbstractTier | null;
  getAllDescendants(tier: AbstractTier): AbstractTier[];

  // Renormalization
  zoomOut(tierId: string): TierSummary | null;
  zoomIn(tierId: string): InstantiationConstraints | null;
  getTierSummary(tierId: string): TierSummary | null;
  getAllTierSummaries(): Map<string, TierSummary>;
  isTierActive(tierId: string): boolean;

  // Belief tracking
  recordMiracle(tierId: string, deityId: string): void;
  addTemple(tierId: string, deityId: string): void;
  getBeliefHeatmap(): Map<string, { density: number; dominant: string | null }>;

  // Time scaling
  getTimeScale(tierLevel: TierLevel): number;
}
```

**Creating a simulation:**

```typescript
import { SimulationController } from '@ai-village/hierarchy-simulator';

// Create 5-tier hierarchy (gigasegment → megasegment → subsection → region → zone)
const controller = new SimulationController(5);

// Start simulation
controller.start();

// Set speed to 100x
controller.setSpeed(100);

// Access state
const state = controller.getState();
console.log(`Tick: ${state.tick}, Population: ${state.stats.totalPopulation}`);
```

### RenormalizationEngine

Handles zoom in/out and statistical simulation.

**Key methods:**

```typescript
class RenormalizationEngine {
  // Tier activation
  activateTier(tierId: string): void;
  deactivateTier(tierId: string): void;
  isTierActive(tierId: string): boolean;

  // Summarization
  summarize(tier: AbstractTier): TierSummary;
  getSummary(tierId: string): TierSummary | undefined;
  getAllSummaries(): Map<string, TierSummary>;

  // Instantiation
  getInstantiationConstraints(tierId: string): InstantiationConstraints | null;

  // Statistical simulation (called for inactive tiers)
  simulateTier(tierId: string, deltaTicks: number): void;

  // Time scaling
  getTimeScale(tierLevel: TierLevel): number;

  // Belief mechanics
  recordMiracle(tierId: string, deityId: string): void;
  addTemple(tierId: string, deityId: string): void;
}
```

**Zoom out workflow:**

```typescript
// Player zooms out from a tier
const summary = controller.zoomOut('region_42');

// Summary now contains statistical representation:
console.log(`Population: ${summary.population}`);
console.log(`Birth rate: ${summary.birthRate}`);
console.log(`Dominant deity: ${summary.belief.dominantDeity}`);
console.log(`Named NPCs: ${summary.preserved.namedNPCs.length}`);

// Tier switches to abstract mode (statistical simulation)
// Time scale slows to 0.1x (10% normal speed when abstract)
```

**Zoom in workflow:**

```typescript
// Player zooms into a tier
const constraints = controller.zoomIn('region_42');

// Constraints define what to generate:
console.log(`Target population: ${constraints.targetPopulation}`);
console.log(`Tech level: ${constraints.techLevel}`);
console.log(`Stability: ${constraints.stability}`);
console.log(`Preserved NPCs: ${constraints.namedNPCs.length}`);

// Use constraints to generate ECS entities that match statistics
// Tier switches to active mode (full simulation)
```

### AbstractTier

Base class for all hierarchical tiers.

**Key properties:**

```typescript
interface AbstractTier {
  // Identity
  id: string;
  name: string;
  tier: TierLevel;
  address: Partial<UniversalAddress>;

  // Simulation
  mode: SimulationMode;
  tick: number;
  timeScale: number;

  // Population
  population: PopulationStats;

  // Economy
  economy: EconomicState;

  // Trade
  tradeRoutes: TradeRoute[];
  transportHubs: TransportHub[];

  // Research infrastructure
  universities: number;
  researchGuilds: Map<string, number>;
  scientistPool: Map<number, number>;  // Tier → count

  // Stability & tech
  stability: StabilityMetrics;
  tech: TechProgress;
  activeEvents: GameEvent[];

  // Hierarchy
  children: AbstractTier[];
}
```

**Methods:**

```typescript
class AbstractTierBase implements AbstractTier {
  update(deltaTime: number): void;
  activate(): void;        // Switch to higher simulation mode
  deactivate(): void;      // Switch to lower simulation mode
  addEvent(event: GameEvent): void;
  addChild(child: AbstractTier): void;
  getTotalPopulation(): number;  // Includes all descendants
  getAllDescendants(): AbstractTier[];
  toJSON(): any;
}
```

### ScientistEmergenceSystem

Statistical emergence of high-tier scientists.

**Key methods:**

```typescript
class ScientistEmergenceSystem {
  // Calculate emergence probabilities
  calculateEmergenceRates(
    field: ResearchField,
    conditions: EmergenceConditions
  ): EmergenceRate[];

  // Attempt to spawn a scientist
  attemptEmergence(
    tier: number,
    field: ResearchField,
    probability: number,
    location: string
  ): Scientist | null;
}
```

**Usage:**

```typescript
import { ScientistEmergenceSystem } from '@ai-village/hierarchy-simulator';

const emergence = new ScientistEmergenceSystem();

// Define conditions
const conditions: EmergenceConditions = {
  totalPopulation: 1_000_000_000_000,  // 1 trillion
  educatedPopulation: 0.3,             // 30% educated
  universities: [...],                 // 100+ physics universities
  guilds: [...],                       // 30+ physics guilds
  stabilityYears: 250,                 // 250 years stability
  fundingYears: 200,
  activePapers: 500,
  publishedPapers: 2000,
  highestTierActive: 90
};

// Calculate rates
const rates = emergence.calculateEmergenceRates('physics', conditions);

// Find tier-100 rate
const tier100Rate = rates.find(r => r.tier === 100);
console.log(`Tier-100 physicist: ${tier100Rate.expectedYears} years expected`);

// Attempt emergence (called each simulated year)
const scientist = emergence.attemptEmergence(
  100,
  'physics',
  tier100Rate.probabilityPerYear,
  'gigasegment_alpha'
);

if (scientist) {
  console.log(`A tier-${scientist.tier} ${scientist.field} scientist emerged!`);
  console.log(`Specializations: ${scientist.specializations.join(', ')}`);
}
```

---

## Usage Examples

### Example 1: Creating a Hierarchy

```typescript
import { SimulationController } from '@ai-village/hierarchy-simulator';

// Create 6-tier hierarchy (gigasegment down to chunk level)
const controller = new SimulationController(6);

// Access root tier
const state = controller.getState();
const root = state.rootTier;

console.log(`Root tier: ${root.name} (${root.tier})`);
console.log(`Population: ${root.getTotalPopulation()}`);
console.log(`Children: ${root.children.length}`);

// Navigate hierarchy
const firstChild = root.children[0];
console.log(`First child: ${firstChild.name} (${firstChild.tier})`);

// Get all tiers at once
const allTiers = root.getAllDescendants();
console.log(`Total tiers: ${allTiers.length}`);
```

### Example 2: Zoom In/Out

```typescript
// Zoom out from a region (switch to statistical simulation)
const regionTier = controller.getTierById('region_42');

if (regionTier && regionTier.mode === 'active') {
  // Zoom out
  const summary = controller.zoomOut('region_42');

  console.log(`Zoomed out from ${regionTier.name}`);
  console.log(`Population: ${summary.population}`);
  console.log(`Stability: ${summary.stability.overall}`);
  console.log(`Preserved NPCs: ${summary.preserved.namedNPCs.length}`);

  // Tier is now in abstract mode (statistical simulation)
  // Time scale reduced to 0.1x
}

// Later, zoom back in
const constraints = controller.zoomIn('region_42');

if (constraints) {
  console.log(`Zooming into region_42...`);
  console.log(`Need to generate ${constraints.targetPopulation} agents`);
  console.log(`With tech level ${constraints.techLevel}`);
  console.log(`Restore ${constraints.namedNPCs.length} named NPCs`);

  // Generate ECS entities matching constraints
  // (Integration with game engine ECS happens here)
}
```

### Example 3: Statistical Simulation

```typescript
// Get tier summary
const summary = controller.getTierSummary('megasegment_5');

// Simulate tier statistically (engine calls this automatically for inactive tiers)
const engine = controller.getRenormalizationEngine();
engine.simulateTier('megasegment_5', 1.0);  // Simulate 1 tick

// Summary updated with:
// - Population growth (logistic)
// - Economy production/consumption
// - Belief spread
// - Tech progression
// - Random events

console.log(`After 1 tick simulation:`);
console.log(`Population: ${summary.population}`);
console.log(`Tech level: ${summary.progress.techLevel}`);
console.log(`Belief density: ${summary.belief.beliefDensity}`);
```

### Example 4: Managing Social Hierarchies

```typescript
// Access tier
const tier = controller.getTierById('subsection_alpha');
const summary = controller.getTierSummary('subsection_alpha');

// Check for named NPCs (emergent leaders)
for (const npc of summary.preserved.namedNPCs) {
  console.log(`${npc.role}: ${npc.name}`);
  console.log(`  Fame: ${npc.fame}`);
  console.log(`  Achievements: ${npc.achievements.join(', ')}`);

  if (npc.role === 'high_priest') {
    console.log(`  Deity: ${npc.deityAllegiance}`);
  }
}

// Check major buildings
for (const building of summary.preserved.majorBuildings) {
  console.log(`${building.type}: ${building.name}`);
  console.log(`  Capacity: ${building.capacity}`);
  console.log(`  Operational: ${building.operational}`);

  if (building.type === 'university') {
    console.log(`  Tech level: ${building.techLevel}`);
  }
}

// Record a miracle (affects belief spread)
controller.recordMiracle('subsection_alpha', 'wisdom_goddess');

// Add a temple (boosts belief growth)
controller.addTemple('subsection_alpha', 'wisdom_goddess');
```

### Example 5: Tracking Scientist Emergence

```typescript
import { ScientistEmergenceSystem } from '@ai-village/hierarchy-simulator';

const emergence = new ScientistEmergenceSystem();

// Get tier
const tier = controller.getTierById('megasegment_tau');
const summary = controller.getTierSummary('megasegment_tau');

// Build conditions from tier state
const conditions: EmergenceConditions = {
  totalPopulation: tier.population.total,
  educatedPopulation: tier.population.distribution.researchers / tier.population.total,
  universities: summary.preserved.majorBuildings.filter(b => b.type === 'university'),
  guilds: Array.from(tier.researchGuilds.entries()).map(([field, count]) => ({
    id: `${tier.id}_guild_${field}`,
    field: field as ResearchField,
    tier: tier.tech.level,
    influence: count * 10,
    memberCount: count * 100
  })),
  stabilityYears: summary.simulatedYears,
  fundingYears: summary.simulatedYears * (tier.stability.economic / 100),
  activePapers: tier.activeResearch.length,
  publishedPapers: summary.progress.researchProgress,
  highestTierActive: tier.tech.level * 10
};

// Calculate emergence rates for physics
const rates = emergence.calculateEmergenceRates('physics', conditions);

// Check tier-80 emergence
const tier80Rate = rates.find(r => r.tier === 80);
console.log(`Tier-80 physicist: 1 in ${tier80Rate.expectedYears} years`);

// Simulate 1000 years
for (let year = 0; year < 1000; year++) {
  const scientist = emergence.attemptEmergence(
    80,
    'physics',
    tier80Rate.probabilityPerYear,
    tier.id
  );

  if (scientist) {
    console.log(`Year ${year}: Tier-${scientist.tier} ${scientist.field} scientist emerged!`);
    break;
  }
}
```

---

## Architecture & Data Flow

### System Execution Order

```
1. SimulationController.update() (every frame)
   ↓ Updates all tiers recursively
2. AbstractTier.update(deltaTime)
   ↓ Chooses mode: abstract, semi-active, or active
3a. updateAbstract() (for inactive tiers)
   ↓ Statistical simulation: population, economy, tech, events
3b. updateActive() (for active tiers)
   ↓ Full ECS integration (chunk-level)
4. RenormalizationEngine.simulateTier() (for summarized tiers)
   ↓ Differential equations: logistic growth, belief spread, tech progress
5. Event collection and history tracking
   ↓ Aggregate stats for dashboard
```

### Renormalization Flow

```
ZOOM OUT:
SimulationController.zoomOut()
  ↓ Calls renormalizationEngine.summarize(tier)
  → Extracts: population stats, economy, belief, stability
  → Preserves: named NPCs, buildings, events
  → Returns TierSummary
  ↓ Calls renormalizationEngine.deactivateTier()
  → Sets tier.mode = 'abstract'
  → Sets tier.timeScale = 0.1

ZOOM IN:
SimulationController.zoomIn()
  ↓ Calls renormalizationEngine.getInstantiationConstraints(tierId)
  → Returns: target population, belief distribution, tech level, preserved entities
  ↓ Calls renormalizationEngine.activateTier()
  → Sets tier.mode = 'active'
  → Sets tier.timeScale = 1.0
  ↓ Game engine generates ECS entities matching constraints
```

### Scientist Emergence Flow

```
Conditions → EmergenceRates
  ↓ Population modifier
  ↓ Infrastructure modifier (universities + guilds)
  ↓ Stability modifier (years at >80%)
  ↓ Research activity modifier (active papers)
  → Combined probability

Each simulated year:
  attemptEmergence(tier, field, probability)
    ↓ Roll random < probability
    ↓ If success: createScientist()
      → Assign tier, field, specializations
      → Calculate lifespan (80-200 years based on tier)
      → Assign to university
```

### Component Relationships

```
SimulationController
├── state: SimulationState
│   ├── rootTier: AbstractTier
│   │   ├── population: PopulationStats
│   │   ├── economy: EconomicState
│   │   ├── stability: StabilityMetrics
│   │   ├── tech: TechProgress
│   │   ├── universities: number
│   │   ├── scientistPool: Map<tier, count>
│   │   └── children: AbstractTier[]
│   ├── tick: number
│   ├── stats: SimulationStats
│   └── allEvents: GameEvent[]
└── renormalizationEngine: RenormalizationEngine
    ├── summaries: Map<tierId, TierSummary>
    │   ├── population, birthRate, deathRate
    │   ├── economy: production, consumption, stockpiles
    │   ├── belief: byDeity, dominantDeity, temples
    │   ├── progress: techLevel, universities
    │   └── preserved: namedNPCs, majorBuildings, events
    └── activeTiers: Set<tierId>
```

---

## Performance Considerations

**Optimization strategies:**

1. **Time scaling:** Higher tiers run 10-5,256,000x faster (chunk = 1 sec/tick, gigasegment = 10 years/tick)
2. **Mode switching:** Inactive tiers use statistical simulation (differential equations), not full ECS
3. **Lazy summarization:** Summaries generated on-demand, cached indefinitely
4. **Event pruning:** Only keep last 100 events per tier
5. **History buffer:** Charts limited to last 100 ticks (circular buffer)

**Query caching:**

```typescript
// ❌ BAD: Query children in loop
for (const tier of allTiers) {
  const children = tier.children.filter(c => c.mode === 'active'); // Every iteration
}

// ✅ GOOD: Cache query once
const allTiers = root.getAllDescendants(); // Query once, flattened
const activeTiers = allTiers.filter(t => t.mode === 'active');
for (const tier of activeTiers) {
  // Use cached data
}
```

**Statistical vs. Full Simulation:**

```typescript
// ❌ BAD: Run full ECS for all tiers (performance collapse)
for (const tier of allTiers) {
  tier.mode = 'active';  // 10,000+ tiers simulating full ECS!
}

// ✅ GOOD: Only active tier runs full ECS, rest are statistical
const currentTier = controller.getTierById(playerFocusId);
controller.zoomIn(playerFocusId);  // Only this tier active
// Other tiers: differential equations (cheap)
```

---

## Troubleshooting

### Population growing exponentially

**Check:**
1. Carrying capacity configured? (`tier.population.carryingCapacity`)
2. Logistic growth enabled? (see `AbstractTierBase.updateAbstract()`)
3. Resource constraints applied? (food shortages reduce capacity)

**Debug:**
```typescript
const tier = controller.getTierById('region_42');
console.log(`Population: ${tier.population.total}`);
console.log(`Carrying capacity: ${tier.population.carryingCapacity}`);
console.log(`Growth rate: ${tier.population.growth}`);

// Check pressure
const pressure = tier.population.total / tier.population.carryingCapacity;
console.log(`Pressure: ${pressure} (should be < 1.0)`);
```

### Scientists not emerging

**Check:**
1. Population high enough? (Tier-100 needs ~1 trillion)
2. Universities sufficient? (Tier-100 needs 100+ tier-8 universities)
3. Stability years? (Tier-100 needs 200+ years at >80%)
4. Active research at similar tier? (Need tier-90+ papers for tier-100)

**Debug:**
```typescript
const summary = controller.getTierSummary('megasegment_5');
console.log(`Population: ${summary.population}`);
console.log(`Universities: ${summary.progress.universities}`);
console.log(`Simulated years: ${summary.simulatedYears}`);
console.log(`Stability overall: ${summary.stability.overall}`);

// Calculate emergence rates
const emergence = new ScientistEmergenceSystem();
const rates = emergence.calculateEmergenceRates('physics', conditions);
const tier100 = rates.find(r => r.tier === 100);
console.log(`Tier-100 expected years: ${tier100.expectedYears}`);
```

### Tier summaries not updating

**Check:**
1. Tier deactivated? (summaries only update for inactive tiers via `simulateTier()`)
2. Engine calling `simulateTier()`? (automatic for deactivated tiers)
3. Time scale correct? (abstract tiers run at 0.1x speed)

**Debug:**
```typescript
const engine = controller.getRenormalizationEngine();
const isActive = engine.isTierActive('region_42');
console.log(`Tier active: ${isActive}`);

const summary = engine.getSummary('region_42');
console.log(`Last updated: ${summary.lastUpdated}`);
console.log(`Simulated years: ${summary.simulatedYears}`);

// Manually simulate
engine.simulateTier('region_42', 1.0);  // Force update
```

### Zoom in/out not working

**Error:** `Cannot zoom into active tier` or `Cannot zoom out of abstract tier`

**Fix:** Check current mode before zooming:

```typescript
const tier = controller.getTierById('region_42');

// Zoom out (must be active or semi-active)
if (tier.mode !== 'abstract') {
  controller.zoomOut('region_42');
}

// Zoom in (must be abstract)
if (tier.mode === 'abstract') {
  controller.zoomIn('region_42');
}
```

### NaN or Infinity in economy

**Error:** Stockpiles become NaN or Infinity

**Fix:** Validation checks in `AbstractTierBase.updateAbstract()`:

```typescript
// Check stockpiles
for (const [resource, stock] of tier.economy.stockpiles) {
  if (!isFinite(stock)) {
    console.error(`Invalid stockpile for ${resource}: ${stock}`);
    // Reset to baseline
    const baseProduction = tier.economy.production.get(resource) || 0;
    tier.economy.stockpiles.set(resource, baseProduction * 100);
  }
}

// Check carrying capacity
if (tier.population.carryingCapacity <= 0 || !isFinite(tier.population.carryingCapacity)) {
  const scale = TIER_SCALES[tier.tier];
  tier.population.carryingCapacity = scale.populationRange[1];
}
```

---

## Integration with Other Systems

### ECS Integration (Chunk-Level)

When a tier is zoomed to `chunk` level and set to `active` mode:

```typescript
// Generate ECS entities from constraints
const constraints = controller.zoomIn('chunk_32_45');

// Create agents matching constraints
for (let i = 0; i < constraints.targetPopulation; i++) {
  const agent = world.createEntity();

  // Assign belief based on distribution
  const deity = selectDeityByDistribution(constraints.beliefDistribution);
  agent.addComponent({ type: 'divine_belief', deityId: deity });

  // Assign skills based on tech level
  const skillLevel = constraints.avgSkillLevel;
  agent.addComponent({ type: 'skills', levels: { farming: skillLevel } });
}

// Restore named NPCs as special entities
for (const npc of constraints.namedNPCs) {
  const entity = createNamedNPC(npc);
  world.addEntity(entity);
}
```

### Belief System

Hierarchies track deity belief at every tier:

```typescript
// Belief spreads via differential equations at abstract tiers
summary.belief = {
  totalBelievers: 500_000_000,
  beliefDensity: 0.7,  // 70% believers
  byDeity: Map {
    'wisdom_goddess' => {
      deityId: 'wisdom_goddess',
      deityName: 'Goddess of Wisdom',
      believers: 300_000_000,
      temples: 50,
      recentMiracles: 2,
      faithDensity: 0.42
    }
  },
  dominantDeity: 'wisdom_goddess'
};

// When zooming in, constraints preserve belief distribution
constraints.beliefDistribution = Map {
  'wisdom_goddess' => 300_000_000,
  'war_god' => 200_000_000
};
```

### Research System

Research infrastructure emerges at scale:

```typescript
// Universities scale with population and tech
tier.universities = 150;  // 150 universities at megasegment

// Scientist pool follows HARD STEPS model
tier.scientistPool = Map {
  1 => 1_000_000,    // 1M tier-1 scientists
  2 => 10_000,       // Need 100x tier-1 for tier-2
  3 => 100,          // Need 100x tier-2 for tier-3
  4 => 1             // Need 100x tier-3 for tier-4
};

// Tier-N requires 100× tier-(N-1)
// Cannot skip tiers - must build research ladder
```

---

## Testing

Run tests:

```bash
npm test -- SimulationController.test.ts
npm test -- RenormalizationEngine.test.ts
npm test -- TierConstants.test.ts
```

**Key test files:**
- `src/simulation/__tests__/SimulationController.test.ts`
- `src/renormalization/__tests__/RenormalizationEngine.test.ts`
- `src/renormalization/__tests__/TierConstants.test.ts`

---

## Running the Standalone Simulator

The hierarchy simulator includes a standalone web UI for testing and visualization:

```bash
cd custom_game_engine/packages/hierarchy-simulator
npm install
npm run dev
```

Opens on **http://localhost:3031**

**Features:**
- Interactive hierarchy tree (click nodes to expand)
- Real-time population/economy graphs
- Speed controls (1x, 10x, 100x)
- Pause/resume/reset controls

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **METASYSTEMS_GUIDE.md** - Multi-scale metasystem architecture
- **src/research/README.md** - Research system deep dive
- **Renormalization Group Theory** - Physics basis for multi-scale simulation
- **Logistic Growth Model** - Population dynamics reference

---

## Summary for Language Models

**Before working with hierarchy simulator:**
1. Understand 7-tier scale ladder (tile → chunk → zone → region → subsection → megasegment → gigasegment)
2. Know renormalization mechanics (zoom out = summarize, zoom in = instantiate)
3. Understand time scaling (higher tiers = faster simulation)
4. Know scientist emergence system (statistical, condition-based)
5. Understand conservation across zoom (named NPCs, buildings, events preserved)

**Common tasks:**
- **Create hierarchy:** `new SimulationController(hierarchyDepth)`
- **Zoom out:** `controller.zoomOut(tierId)` → returns `TierSummary`
- **Zoom in:** `controller.zoomIn(tierId)` → returns `InstantiationConstraints`
- **Access tier:** `controller.getTierById(tierId)` or `tier.children[index]`
- **Check mode:** `tier.mode` → 'abstract' | 'semi-active' | 'active'
- **Simulate statistically:** `renormalizationEngine.simulateTier(tierId, deltaTicks)`
- **Track scientists:** `ScientistEmergenceSystem.calculateEmergenceRates()`

**Critical rules:**
- Only `chunk` tier supports full ECS (`mode = 'active'`)
- Higher tiers MUST use abstract or semi-active mode (performance)
- Summaries cached indefinitely - call `summarize()` to update
- Time scale varies by tier (gigasegment = 10 years/tick)
- Scientists emerge statistically - cannot spawn directly
- Tier-N scientists require 100× tier-(N-1) (hard ladder)
- Named NPCs, buildings, events preserved across zoom
- Belief tracks per-deity stats at every tier

**Event-driven architecture:**
- Listen to tier events: `'tech_breakthrough'`, `'population_boom'`, `'natural_disaster'`
- Emit events when zooming: `'tier:zoomed_out'`, `'tier:zoomed_in'`
- Statistical simulation runs differential equations (no events)
- Events pruned to last 100 per tier (prevent memory bloat)

**Multi-scale philosophy:**
- Simulate the SCALE you care about, abstract everything else
- Zoom determines detail level (not data deletion - renormalization preserves)
- Time flows faster at higher scales (cosmic perspective)
- Social hierarchies emerge from population dynamics
- Research ladder prevents instant tier-100 scientists (must build infrastructure)
