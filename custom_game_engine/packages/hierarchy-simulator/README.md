# Hierarchy Simulator

> **Renormalization Group Theory for Game Design**
> Simulate ringworld-scale civilizations with emergent behavior across 7 orders of magnitude.

## Overview

The Hierarchy Simulator implements **renormalization group (RG) theory** from physics to enable multi-scale simulation of a ringworld civilization. Instead of simulating billions of entities individually, the system uses **coarse-graining** and **scale hierarchies** to efficiently model emergent behavior at cosmic scales.

**Key Innovation**: At high tiers, you simulate *statistics about populations*, not individual agents. A gigasegment (10^15 km²) advances by *decades per tick*, tracking birth rates, tech levels, and belief densities—while a chunk (3 km²) runs full ECS simulation in real-time.

**Use Case**: Enables the ringworld game to simulate:
- Individual agent behavior (chunk tier, 10-1K population)
- City dynamics (region tier, 100K-10M population)
- Planetary civilizations (subsection tier, 10M-500M population)
- Galactic empires (gigasegment tier, 10B-100B population)

All running simultaneously at appropriate time scales.

## Package Structure

```
hierarchy-simulator/
├── src/
│   ├── abstraction/           # Tier definitions and base classes
│   │   ├── types.ts           # Core types (TierLevel, AbstractTier, ResourceFlow)
│   │   ├── AbstractTierBase.ts    # Base tier implementation (population, economy, events)
│   │   ├── AbstractGigasegment.ts # Galactic-scale tier (cultural influence, diplomacy)
│   │   ├── AbstractMegasegment.ts # Solar-system-scale tier (cultures, phenomena)
│   │   ├── AbstractPlanet.ts      # Planet-scale tier (civilizations, continents, megastructures)
│   │   ├── AbstractSystem.ts      # Star system tier (planetary colonies, dyson swarms)
│   │   ├── AbstractSector.ts      # Sector tier (interstellar trade routes, federations)
│   │   └── AbstractGalaxy.ts      # Galactic tier (spiral arms, supermassive black holes)
│   ├── renormalization/       # RG engine and time scaling
│   │   ├── RenormalizationEngine.ts  # Summarization, instantiation, statistical simulation
│   │   ├── TierConstants.ts          # Time scales, summarization rules
│   │   └── index.ts
│   ├── research/              # Emergent scientist system
│   │   ├── ScientistEmergence.ts # HARD STEPS model for tier-100 physicists
│   │   └── ResearchTypes.ts      # Papers, universities, guilds
│   ├── simulation/            # Main controller
│   │   └── SimulationController.ts  # Game loop, zoom in/out, belief tracking
│   ├── renderers/             # UI rendering (DOM-based)
│   │   └── HierarchyDOMRenderer.ts
│   ├── mock/                  # Test data generation
│   │   └── DataGenerator.ts
│   └── main.ts                # App entry point
├── package.json
└── README.md (this file)
```

## Core Concepts

### 1. Scale Hierarchy (7 Base Tiers + 4 Interstellar Tiers)

The simulator models a nested hierarchy from individual physics to galactic civilizations:

**Base Ringworld Tiers:**

| Tier | Area | Population | Children | Time Scale | Simulation Mode |
|------|------|------------|----------|------------|-----------------|
| **Tile** | 9 m² | 0-10 | - | 1:1 (real-time) | Individual physics |
| **Chunk** | 3 km² | 10-1K | 1024 tiles | 1:1 (real-time) | **FULL ECS** |
| **Zone** | 10^5 km² | 1K-100K | 100 chunks | 1 hour/tick | Demographics |
| **Region** | 10^8 km² | 100K-10M | 100 zones | 1 day/tick | Economy |
| **Subsection** | 10^10 km² | 10M-500M | 100 regions | 1 week/tick | Politics |
| **Megasegment** | 10^13 km² | 100M-1B | 100 subsections | 1 month/tick | Culture |
| **Gigasegment** | 10^15 km² | 10B-100B | 100 megasegments | 1 year/tick | Civilization |

**Interstellar Expansion Tiers (Phase 1 Extended):**

| Tier | Scale | Population | Features | Time Scale | Simulation Mode |
|------|-------|------------|----------|------------|-----------------|
| **Planet** | Entire planet | 1B-10B | Continents, civilizations, megastructures | 10 years/tick | Planetary statistics |
| **System** | Star system | 10B-100B | Planets, dyson swarms, asteroid mining | 100 years/tick | System-wide economy |
| **Sector** | 50-100 ly | 100B-1T | Trade routes, federations, wormhole network | 1000 years/tick | Interstellar politics |
| **Galaxy** | Spiral galaxy | 1T-100T | Spiral arms, core civilizations, black hole | 10000 years/tick | Galactic evolution |

**Key Insight**: At chunk tier, full ECS runs (position, behavior, skills). At planetary tier, only civilizations and continents exist. At galactic tier, individual stars become statistical noise.

### 2. Renormalization (Zoom In/Out)

**Zoom Out** (Summarization):
```typescript
// Convert detailed ECS state to statistical summary
const summary = renormalizationEngine.summarize(tier);

// What gets preserved:
summary.preserved = {
  namedNPCs: [/* famous heroes, governors */],
  majorBuildings: [/* temples, universities */],
  historicalEvents: [/* wars, golden ages */]
};

// What gets lost:
// - Individual positions
// - Personal relationships
// - Exact behaviors
// - Skill distributions
```

**Zoom In** (Instantiation):
```typescript
// Get constraints for generating entities that match statistics
const constraints = renormalizationEngine.getInstantiationConstraints(tierId);

// Constraints include:
constraints = {
  targetPopulation: 450_000_000,  // Must generate this many agents
  beliefDistribution: { 'wisdom_goddess': 135_000_000, ... },
  techLevel: 7,
  avgSkillLevel: 3.5,
  stability: 0.82,
  namedNPCs: [/* must include these specific NPCs */],
  majorBuildings: [/* must include these buildings */]
};

// Then generate ECS entities satisfying these constraints
```

### 3. Time Scaling

Higher tiers simulate *faster* (more game time per system tick):

```typescript
const TIME_SCALE = {
  chunk: 1,           // 1 tick = 1 tick (real ECS)
  zone: 60,           // 1 tick = 1 hour
  region: 1440,       // 1 tick = 1 day
  subsection: 10080,  // 1 tick = 1 week
  megasegment: 43200, // 1 tick = 1 month
  gigasegment: 525600 // 1 tick = 1 year (365 days)
};

// At 20 TPS, gigasegment advances 10,512,000 ticks/second = ~16.7 years/second
```

**Result**: While the player watches a village evolve over minutes, the broader civilization advances through centuries.

### 4. Summarization Rules (What Gets Lost)

```typescript
const SUMMARIZATION_RULES = {
  chunk: {
    sum: ['population', 'resources'],           // Totals preserved
    average: ['happiness', 'hunger'],           // Means preserved
    computed: ['productivity'],                 // Derived values
    preserved: ['named_npcs', 'buildings'],     // Specific entities
    lost: ['individual_positions', 'behaviors'] // Gone forever
  },
  gigasegment: {
    sum: ['population', 'stellar_energy'],
    average: ['cosmic_stability', 'tech_level'],
    computed: ['galactic_influence'],
    preserved: ['galactic_empires', 'deity_domains'],
    lost: ['megasegment_details', 'cultural_nuances']
  }
};
```

**Critical**: Information loss is *intentional*. You can't track individual agent positions at planetary scale—only aggregates matter.

### 5. Statistical Simulation (Inactive Tiers)

When a tier is inactive (zoomed out), it's simulated using **differential equations** instead of ECS:

```typescript
// Population: Logistic growth
dP/dt = r * P * (1 - P/K)

// Belief spread: Word-of-mouth + temples
dB/dt = B * wordOfMouth + temples * templePower - B * decay

// Economy: Production with tech bonus
production = workers * baseRate * (1 + techLevel * 0.15)
```

**Benefits**:
- O(1) cost per tier vs O(N) for individual agents
- Can simulate 100+ tiers simultaneously
- Statistically accurate for large populations

### 6. Emergent Scientist System (HARD STEPS)

Scientists don't spawn instantly—they **emerge** from conditions:

```typescript
// Tier-100 physicist requirements:
const emergenceConditions = {
  totalPopulation: 1_000_000_000_000,  // 1 trillion
  universities: 100,                    // Tier-8+ physics universities
  guilds: 30,                          // Tier-8+ physics guilds
  stabilityYears: 200,                 // 200+ years of >80% stability
  activePapers: 1000,                  // Active tier-9+ research
};

// Base probability: 0.00000001/year (100M years)
// With ideal conditions: ~0.00000025/year (~4M years)
// Expected emergence: Centuries to millennia
```

**Hard Step Progression**: Tier-N scientists require 100× tier-(N-1) scientists. You can't skip rungs.

## API

### SimulationController

Main controller for the simulation loop and tier management.

```typescript
import { SimulationController } from '@ai-village/hierarchy-simulator';

const controller = new SimulationController(5); // 5-level hierarchy
controller.start(); // Start simulation loop

// State access
const state = controller.getState();
state.rootTier;       // Top-level tier
state.tick;           // Current simulation tick
state.stats;          // Aggregated stats
state.running;        // Pause state

// Tier access
const tier = controller.getTierById('gigaseg_0');
const descendants = controller.getAllDescendants(tier);

// Speed control
controller.setSpeed(10);    // 10x speed
controller.togglePause();   // Pause/resume
controller.reset(5);        // Reset to new hierarchy
```

### Renormalization Engine

Handles zoom in/out and statistical simulation.

```typescript
import { renormalizationEngine } from '@ai-village/hierarchy-simulator';

// Zoom out: Summarize a tier
const summary = controller.zoomOut('region_0');
summary.population;          // Total population
summary.economy;             // Production/consumption
summary.belief;              // Deity tracking
summary.preserved.namedNPCs; // Famous characters

// Zoom in: Get instantiation constraints
const constraints = controller.zoomIn('region_0');
constraints.targetPopulation;     // Must generate this many
constraints.beliefDistribution;   // Deity followers distribution
constraints.namedNPCs;            // Must include these NPCs

// Get summary
const cached = controller.getTierSummary('region_0');

// Check if tier is active (full simulation)
const isActive = controller.isTierActive('region_0');

// Simulate inactive tier statistically
renormalizationEngine.simulateTier('region_0', deltaTicks);
```

### AbstractTier

Base class for all tier implementations.

```typescript
class AbstractTierBase implements AbstractTier {
  // Identity
  id: string;
  name: string;
  tier: TierLevel;
  mode: SimulationMode; // 'abstract' | 'semi-active' | 'active'

  // Population
  population: PopulationStats;

  // Economy
  economy: EconomicState;

  // Stability
  stability: StabilityMetrics;
  tech: TechProgress;

  // Research
  universities: number;
  researchGuilds: Map<string, number>;
  scientistPool: Map<number, number>; // Tier -> count

  // Methods
  update(deltaTime: number): void;
  activate(): void;   // Switch to full simulation
  deactivate(): void; // Switch to statistical
  addChild(child: AbstractTier): void;
  getTotalPopulation(): number;
}
```

### Scientist Emergence System

Calculate emergence rates for scientists.

```typescript
import { ScientistEmergenceSystem } from '@ai-village/hierarchy-simulator';

const emergenceSystem = new ScientistEmergenceSystem();

const conditions = {
  totalPopulation: 10_000_000_000,
  educatedPopulation: 0.15,
  universities: myUniversities,
  guilds: myGuilds,
  stabilityYears: 150,
  fundingYears: 120,
  activePapers: 500,
  publishedPapers: 5000,
  highestTierActive: 80
};

const rates = emergenceSystem.calculateEmergenceRates('physics', conditions);

// rates = [
//   { tier: 50, probabilityPerYear: 0.08, expectedYears: 12.5 },
//   { tier: 60, probabilityPerYear: 0.005, expectedYears: 200 },
//   { tier: 80, probabilityPerYear: 0.00001, expectedYears: 100000 },
//   ...
// ]

// Attempt emergence
const scientist = emergenceSystem.attemptEmergence(
  tier: 90,
  field: 'physics',
  probability: rates[3].probabilityPerYear,
  location: 'gigaseg_0'
);
```

## Usage Examples

### Creating a Hierarchy

```typescript
import { DataGenerator } from '@ai-village/hierarchy-simulator';

const generator = new DataGenerator();

// Generate 5-level hierarchy
const rootTier = generator.generateHierarchy(5);

// Structure:
// - 1 Gigasegment
//   - 3-5 Megasegments
//     - 2-4 Subsections (first megasegment only)
//       - 2-4 Regions (first subsection only)
//         - 2-3 Zones (first region only)
```

### Simulating Multiple Scales

```typescript
const controller = new SimulationController(5);

// Player is viewing chunk tier (full ECS)
const chunk = controller.getTierById('chunk_0_0');
chunk.mode; // 'active'

// Parent region simulated statistically
const region = controller.getTierById('region_0');
region.mode; // 'abstract'

// Get region summary
const summary = controller.getTierSummary('region_0');
summary.population;        // 4,500,000
summary.belief.totalBelievers; // 2,700,000
summary.economy.foodProduction; // 9,000,000/tick

// Player zooms out to region view
controller.zoomOut('chunk_0_0');  // Chunk becomes abstract
controller.zoomIn('region_0');    // Region becomes active

// Now generate chunk entities matching summary
const constraints = controller.zoomIn('chunk_0_0');
// Use constraints to spawn agents with correct belief distribution
```

### Tracking Belief Spread

```typescript
// Record a miracle
controller.recordMiracle('region_0', 'wisdom_goddess');

// Add a temple
controller.addTemple('region_0', 'wisdom_goddess');

// Get belief heatmap
const heatmap = controller.getBeliefHeatmap();
// Map<tierId, { density: 0.65, dominant: 'wisdom_goddess' }>

// Access detailed belief stats
const summary = controller.getTierSummary('region_0');
for (const [deityId, stats] of summary.belief.byDeity) {
  console.log(`${stats.deityName}: ${stats.believers} believers`);
  console.log(`  Temples: ${stats.temples}`);
  console.log(`  Recent miracles: ${stats.recentMiracles}`);
  console.log(`  Faith density: ${stats.faithDensity}`);
}
```

### Statistical Simulation of Inactive Tiers

```typescript
// Get all summaries
const summaries = controller.getAllTierSummaries();

for (const [tierId, summary] of summaries) {
  if (!controller.isTierActive(tierId)) {
    // This tier is simulated statistically

    // Population grows logistically
    const r = summary.birthRate - summary.deathRate;
    const K = summary.carryingCapacity;
    const dP = r * P * (1 - P/K);

    // Belief spreads via word-of-mouth and temples
    for (const [deityId, stats] of summary.belief.byDeity) {
      const growth = stats.believers * 0.0001 + stats.temples * 10;
      stats.believers += growth;
    }

    // Tech advances via research
    summary.progress.researchProgress +=
      summary.progress.universities * 0.01;

    if (summary.progress.researchProgress >= 100) {
      summary.progress.techLevel++;
    }
  }
}
```

### Research and Emergence

```typescript
import { ScientistEmergenceSystem, PaperTitleGenerator } from '@ai-village/hierarchy-simulator';

const emergence = new ScientistEmergenceSystem();
const titleGen = new PaperTitleGenerator();

// Generate paper requirements
const requirements = titleGen.generatePaperRequirements(tier: 90);
// {
//   requiredGuilds: { physics: 150, transcendent_physics: 30 },
//   requiredSpecialists: { 100: 729000, 80: 5100, 50: 8100 },
//   estimatedYears: 84604 // ~84,000 years
// }

// Check if tier has enough infrastructure
const tier = controller.getTierById('gigaseg_0');
const summary = controller.getTierSummary('gigaseg_0');

const conditions = {
  totalPopulation: summary.population,
  educatedPopulation: summary.progress.techLevel / 10,
  universities: tier.universities,
  guilds: Array.from(tier.researchGuilds.entries()).map(([field, count]) => ({
    field,
    tier: 8,
    count
  })),
  stabilityYears: 300,
  fundingYears: 250,
  activePapers: tier.activeResearch.length,
  publishedPapers: 10000,
  highestTierActive: 85
};

// Calculate emergence rates
const rates = emergence.calculateEmergenceRates('transcendent_physics', conditions);

// Attempt emergence each year
for (const rate of rates) {
  const scientist = emergence.attemptEmergence(
    rate.tier,
    'transcendent_physics',
    rate.probabilityPerYear,
    tier.id
  );

  if (scientist) {
    console.log(`Tier-${scientist.tier} physicist emerged!`);
    console.log(`Specializations: ${scientist.specializations.join(', ')}`);
    tier.scientistPool.set(scientist.tier,
      (tier.scientistPool.get(scientist.tier) || 0) + 1
    );
  }
}
```

## Theory (RG Concepts for LLMs)

### Renormalization Group Theory

In physics, **renormalization group (RG) theory** explains how physical systems behave at different scales. Key ideas:

1. **Scale Invariance**: Laws at small scales ≠ laws at large scales
   - Atomic physics (quantum) → Fluid dynamics (classical)
   - Individual neurons → Consciousness
   - Single agents → Civilizations

2. **Coarse-Graining**: Averaging over small-scale details to get large-scale behavior
   - Average molecular velocities → Temperature
   - Average agent beliefs → Cultural trends
   - Sum individual production → GDP

3. **Emergent Properties**: Large-scale behavior not present at small scales
   - Temperature doesn't exist for single atoms
   - Culture doesn't exist for single agents
   - Galactic diplomacy doesn't exist at planetary scale

4. **Fixed Points**: Stable patterns that emerge at different scales
   - Logistic growth (populations)
   - Power laws (city sizes)
   - Cultural attractors (belief convergence)

### Application to Game Design

The hierarchy simulator applies RG theory to game simulation:

**Problem**: Can't simulate 100 billion individual agents at 20 TPS.

**Solution**: Simulate different scales using different physics:
- **Microscale** (chunk): Full ECS with position, velocity, inventory
- **Mesoscale** (region): Demographics, economy, culture (differential equations)
- **Macroscale** (gigasegment): Civilization-level aggregates (statistics)

**Key Insight**: Individual agent details are *irrelevant noise* at planetary scale. Only aggregates matter. This isn't a limitation—it's physically correct. You can't predict individual atom positions in a gas, only pressure/temperature.

### Information Loss is Fundamental

When zooming out, information is *permanently lost*:

```typescript
// Chunk tier (ECS): Full detail
agent.position = { x: 145.3, y: 892.1 };
agent.beliefs = { wisdom_goddess: 0.75, war_god: 0.15 };
agent.skills = { farming: 3, combat: 1, magic: 0 };

// Region tier (statistical): Aggregates only
summary.population = 4_500_000;
summary.belief.byDeity.get('wisdom_goddess').believers = 2_700_000; // 60%
summary.demographics.workerDistribution.get('farmers') = 0.55; // 55%
```

**You cannot recover** agent position from region summary. This is RG information loss—fundamental, not a bug.

### Hard Steps (Scientist Emergence)

Inspired by condensed matter physics: **Phase transitions require threshold conditions**.

```typescript
// You can't skip tiers
Tier-N scientists require 100× Tier-(N-1) scientists

// Example: To get 1 tier-100 physicist:
1 tier-100 = 100 tier-99
100 tier-99 = 10,000 tier-98
10,000 tier-98 = 1,000,000 tier-97
...
// Total base: ~10^200 tier-1 scientists

// You must build the pyramid slowly
```

**Why**: Represents knowledge accumulation. You can't discover quantum field theory without classical mechanics first. Tier-100 insights require entire civilizations of supporting infrastructure.

## Integration with Game Mechanics

### ECS Integration (Chunk Tier)

```typescript
// When zooming into chunk tier, use constraints to spawn ECS entities
const constraints = controller.zoomIn('chunk_0');

// Spawn agents matching belief distribution
for (const [deityId, believerCount] of constraints.beliefDistribution) {
  const agentsToSpawn = Math.floor(believerCount / constraints.targetPopulation * 200);

  for (let i = 0; i < agentsToSpawn; i++) {
    const agent = world.createEntity();
    agent.addComponent({ type: 'position', x: random(), y: random() });
    agent.addComponent({
      type: 'belief',
      deity: deityId,
      faith: 0.7 + random() * 0.3
    });
    agent.addComponent({
      type: 'skills',
      levels: generateSkills(constraints.avgSkillLevel)
    });
  }
}
```

### Divinity System Integration

```typescript
// Deity gains power from tier-aggregate belief
const gigasegSummary = controller.getTierSummary('gigaseg_0');
const belief = gigasegSummary.belief.byDeity.get('wisdom_goddess');

deity.power = belief.believers / 1_000_000; // 1 power per million believers
deity.influence = belief.faithDensity;      // 0-1 based on density

// Miracles affect statistical simulation
deity.performMiracle('gigaseg_0');
controller.recordMiracle('gigaseg_0', deity.id);

// Increases belief spread rate in that tier
summary.belief.byDeity.get(deity.id).recentMiracles++;
```

### Multiverse Integration

```typescript
// Each universe fork has independent hierarchy
const mainTimeline = controller.getState().rootTier;
const branchTimeline = mainTimeline.clone();

// Simulate both at different speeds
controller.setSpeed(10);  // Main timeline 10x
branchController.setSpeed(1000); // Branch 1000x (fast-forward)

// Compare outcomes after 1000 years
const mainSummary = controller.getTierSummary(mainTimeline.id);
const branchSummary = branchController.getTierSummary(branchTimeline.id);

if (branchSummary.population.total < mainSummary.population.total * 0.5) {
  console.log('Branch timeline collapsed');
  rejectBranch(branchTimeline);
}
```

### Magic System Integration

```typescript
// High-tier magic requires high-tier scientists
const tier100Mages = tier.scientistPool.get(100) || 0;

if (tier100Mages >= 10) {
  // Unlock reality manipulation
  enableMagicParadigm('reality_manipulation');

  // Tier-10 research paper
  const paper = {
    title: 'Ontological Engineering in Post-Singularity Contexts',
    tier: 10,
    field: 'reality_manipulation',
    requiredSpecialists: { 100: 10000 },
    estimatedYears: 100000
  };
}
```

## Troubleshooting

### Population Becomes NaN/Infinity

**Symptom**: `summary.population = NaN` or `Infinity`

**Cause**: Division by zero in logistic growth when `carryingCapacity = 0`

**Fix**: Enforced in `AbstractTierBase.updateAbstract()`:
```typescript
if (this.population.carryingCapacity <= 0) {
  const scale = TIER_SCALES[this.tier];
  this.population.carryingCapacity = scale.populationRange[1];
}

if (!isFinite(this.population.total)) {
  this.population.total = scale.populationRange[0];
  this.population.growth = 0;
}
```

### Tier Simulation Too Fast/Slow

**Symptom**: Region advances too quickly, or gigasegment barely changes

**Cause**: Incorrect time scale or speed multiplier

**Fix**: Check time scales in `TierConstants.ts`:
```typescript
const timeScale = controller.getTimeScale('region'); // Should be 1440 (1 day/tick)
controller.setSpeed(10); // 10x speed = 10 days/second at region tier
```

### Scientists Never Emerge

**Symptom**: `attemptEmergence()` always returns null

**Cause**: Insufficient infrastructure or stability

**Debug**:
```typescript
const rates = emergence.calculateEmergenceRates('physics', conditions);
console.log(rates);
// [{ tier: 80, probabilityPerYear: 0.00000001, expectedYears: 100000000 }]
//  ^^^ Probability too low

// Increase infrastructure:
// - Add more universities
// - Increase stability years
// - Add research guilds
// - Increase population
```

**Expected**: Tier-100 emergence requires *millions of years* with ideal conditions. This is intentional.

### Belief Doesn't Spread

**Symptom**: `summary.belief.totalBelievers` stays at 0

**Cause**: No temples or miracles to seed belief

**Fix**:
```typescript
// Add initial temples
controller.addTemple('gigaseg_0', 'wisdom_goddess');

// Perform miracles to boost spread
controller.recordMiracle('gigaseg_0', 'wisdom_goddess');

// Check belief spread parameters in TierConstants.ts:
BELIEF_CONSTANTS.WORD_OF_MOUTH_RATE;  // 0.0001 (spread rate)
BELIEF_CONSTANTS.TEMPLE_BONUS;        // 10 believers/temple/tick
BELIEF_CONSTANTS.MIRACLE_BONUS;       // 100 believers/miracle
```

### Simulation Pauses Unexpectedly

**Symptom**: `controller.getState().running = false`

**Cause**: Manual pause or error in update loop

**Fix**:
```typescript
// Resume simulation
controller.togglePause();

// Check for errors in console
// Errors in tier.update() will stop the loop
```

### Memory Leak (Too Many Tiers)

**Symptom**: Browser slows down after hours of simulation

**Cause**: Event history or summaries not trimmed

**Fix**: Events auto-trim to 100 per tier:
```typescript
// In RenormalizationEngine.rollRandomEvents():
if (summary.preserved.historicalEvents.length > 50) {
  summary.preserved.historicalEvents.shift();
}
```

### Trade Routes Don't Form

**Symptom**: `tier.tradeRoutes.length = 0` despite imbalances

**Cause**: Auto-stabilizer only runs for tiers with children

**Fix**: Ensure hierarchy has at least 2 children:
```typescript
// In AbstractTierBase.autoFormTradeRoutes():
if (this.children.length < 2) return; // Need siblings to trade

// Generate more children:
const generator = new DataGenerator();
const hierarchy = generator.generateHierarchy(5); // Depth 5 ensures children
```

## Performance Notes

- **O(1) per tier** for statistical simulation (not O(N) per agent)
- **~100 tiers** can be simulated at 60 FPS
- **Memory**: ~10 KB per tier summary, ~100 KB per active tier
- **Bottleneck**: Full ECS at chunk tier (use SimulationScheduler to cull entities)

## Philosophy

This package demonstrates that **game simulation can learn from physics**:

1. **Scale Separation**: Different physics at different scales
2. **Emergence**: Large-scale behavior ≠ sum of parts
3. **Information Loss**: Can't recover microscopic details from macroscopic state
4. **Statistical Mechanics**: Large populations → deterministic aggregates
5. **Fixed Points**: Stable patterns emerge across scales (logistic growth, power laws)

The hierarchy simulator isn't an approximation—it's the *correct* way to simulate multi-scale systems. Just as thermodynamics doesn't track individual atoms, civilization simulators shouldn't track individual agents at cosmic scales.

---

**See Also**:
- [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md) - ECS, packages, metasystems, data flow
- [METASYSTEMS_GUIDE.md](../METASYSTEMS_GUIDE.md) - Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms
- [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md) - 212+ systems with priorities, components, locations
