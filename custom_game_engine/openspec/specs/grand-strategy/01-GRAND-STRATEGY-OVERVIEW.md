# Grand Strategy Abstraction Layer - Master Architecture

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Dependencies:** Hierarchy Simulator, Multiverse, Persistence, Spaceship, Governance, Production Chain

---

## Executive Summary

The Grand Strategy Abstraction Layer enables **simulation across scales** - from watching a single agent craft a stone tool, to managing a galactic empire spanning thousands of star systems, to jumping forward millions of years to witness post-singularity civilizations building Dyson spheres.

**Core Innovation:** Named "soul agents" maintain consistent simulation even when zoomed out, enabling stories that span eras. Universe forking allows alternate timelines that can develop independently and potentially reconnect (including invasion scenarios).

**Vision:** "Stellaris (grand strategy) + RimWorld (individual colonist stories) + Factorio (complex production chains)" - made possible by AI agents managing complexity at each scale.

---

## Overview & Motivation

### Why This Layer Exists

**The Problem:** Traditional games force you to choose a scale:
- **City builders** (SimCity): Zoom from individuals to city-level, but no higher
- **Grand strategy** (Stellaris): Manage empires, but individuals are statistics
- **Colony sims** (RimWorld): Watch colonists' personal stories, but can't scale to galactic empires

**The Solution:** A **hierarchical abstraction system** that seamlessly transitions between scales:
- **Tile tier:** Individual agent placing a stone (full ECS, 20 TPS)
- **Chunk tier:** 10-100 agents building a village (full ECS, 20 TPS)
- **Region tier:** 100K-10M agents, simulated statistically (1 day/tick)
- **Planet tier:** Billions of agents, only aggregates tracked (1 month/tick)
- **Galactic tier:** Trillions across star systems (1 year/tick)

**Time is elastic:** Spend hours watching a village grow, then jump forward 10,000 years to see what civilization they built.

### The Three-Game Merger Vision

**Stellaris:** Grand strategy across galactic scale
- Manage dozens of star systems
- Diplomacy, trade, war between civilizations
- Technology trees spanning eras

**RimWorld:** Individual colonist stories
- Named characters with personalities, relationships, memories
- Emotional narratives (romances, betrayals, heroic sacrifices)
- Emergent storytelling

**Factorio:** Complex production chains
- Stone → tools → iron → machines → computers → starships
- 65+ exotic materials across 7 tiers
- Resource extraction, processing, logistics

**The Merge:** AI agents manage each layer
- **Individual agents** make personal decisions (RimWorld)
- **Settlement AI** coordinates resource gathering (Factorio automation)
- **Civilization AI** manages diplomacy and expansion (Stellaris grand strategy)
- **Player** can zoom between scales, intervene at any level

---

## Design Philosophy

### 1. Information Loss is Intentional

**Renormalization group theory** from physics: You cannot track individual atom positions in a gas, only pressure and temperature. Similarly:

**At chunk tier (village):**
```typescript
agent.position = { x: 142.5, y: 87.3 };
agent.beliefs = { wisdom_goddess: 0.75 };
agent.skills = { farming: 3, combat: 1 };
```

**At region tier (city):**
```typescript
summary.population = 4_500_000;
summary.belief.byDeity.get('wisdom_goddess').believers = 2_700_000; // 60%
summary.demographics.farmers = 0.55; // 55%
```

**You cannot recover** agent position from region summary. This is fundamental physics, not a bug.

**Exception: Soul Agents.** Named characters persist with full fidelity across scales.

### 2. Soul Agents are Sacred

**Definition:** Soul agents = named characters with full simulation history

**Conservation Law:** Soul agents NEVER lose detail when zooming out
- Position, memories, relationships preserved
- Can zoom to planet tier, soul agents remain queryable
- When zooming back in, soul agents restore with exact state

**Use Cases:**
- **Heroes:** "Kara, who discovered iron and founded the first city"
- **Villains:** "The necromancer who triggered the Great Plague"
- **Dynasties:** Track descendant lineages across millennia
- **Time travel:** Soul agent meets their own descendant 1000 years later

**Implementation:**
```typescript
interface SoulAgent {
  id: string;
  name: string;
  birthTick: bigint;
  deathTick?: bigint;

  // Full state preserved across ALL tiers
  fullState: EntitySnapshot;  // Complete ECS state

  // Current tier
  currentTier: TierLevel;
  lastFullSimulationTick: bigint;

  // Cross-tier tracking
  significantEvents: HistoricalEvent[];
  descendants: string[];  // Other soul agent IDs

  // Never summarized, always queryable
  preservedIndefinitely: true;
}
```

### 3. Time is Elastic

**Core Mechanic:** Time scaling by tier

| Tier | Time Scale | Example |
|------|-----------|---------|
| Chunk | 1 tick = 1 tick | Real-time agent movement |
| Zone | 1 tick = 1 hour | Settlement daily routines |
| Region | 1 tick = 1 day | City economic cycles |
| Planet | 1 tick = 1 month | Seasonal agriculture, trade routes |
| System | 1 tick = 1 year | Civilization rise/fall, dynasties |
| Galaxy | 1 tick = 1 decade | Species evolution, cosmic events |

**Player Experience:**
- **Slow mode:** Watch agents for hours, each minute is precious
- **Fast-forward:** Jump 100 years, check progress
- **Rewind:** Time travel to alternate timeline (via universe forking)

**Example Session:**
```
1. Watch village founding (2 hours real-time, 10 game-days)
2. Fast-forward 50 years → City established, population 10K
3. Zoom to region tier → 1 minute real-time = 1 game-year
4. Fast-forward 500 years → Empire spans 3 planets
5. Zoom to galaxy tier → Watch post-singularity development
6. Rewind to year 100 → Fork universe → Try alternate path
```

### 4. Emergence Over Engineering

**Don't hardcode outcomes.** Let patterns emerge from interactions.

**Example: Empire Formation**

**❌ BAD (hardcoded):**
```typescript
if (population > 1_000_000 && techLevel >= 5) {
  formEmpire();  // Scripted transition
}
```

**✅ GOOD (emergent):**
```typescript
// Multiple cities compete for resources
// Trade routes form naturally
// Cultural exchange happens via migration
// Dominant city emerges based on:
//   - Resource wealth
//   - Strategic position
//   - Military strength
//   - Cultural influence
// → Empire forms organically when one city dominates
```

**Result:** Every playthrough produces different empires with unique cultures.

### 5. Production Chains Scale

**From hand-crafting to mega-industry:**

**Tier 1 (Village):** Hand-crafting
```
Stone → Stone Tools → Harvest Wood → Build Shelter
```

**Tier 3 (City):** Specialized workshops
```
Iron Ore → Smelter → Iron Ingots → Blacksmith → Tools → Market
```

**Tier 5 (Planet):** Industrial production lines
```
Strip Mining → Ore Processing → Automated Smelting →
Robotic Assembly → Mass Production → Interstellar Export
```

**Tier 7 (Galaxy):** Post-scarcity mega-structures
```
Stellar Mining → Matter Replicators → Dyson Sphere Construction →
Energy Grid → Post-Singularity Computing → Reality Manipulation
```

**Key:** Same underlying resource system, different abstractions.

### 6. Stories Span Eras

**Cross-era narratives enabled by:**
- **Soul agents:** Named characters preserve across time
- **Universe forking:** Create alternate timelines
- **Time travel:** Agents can visit past/future via β-space
- **Descendants:** Family lineages tracked

**Example Story Arc:**

```
Year 0: Kara (soul agent) discovers iron
  → Becomes hero, founds Iron City

Year 500: Kara's descendant (also soul agent) rules empire
  → Develops spaceflight

Year 5000: Empire reaches galactic tier
  → Kara is mythological figure
  → Temples dedicated to "First Ironsmith"

Year 5001: Time traveler visits Year 0
  → Meets Kara before she's famous
  → Tells her about future empire
  → Kara gains motivation to pursue iron discovery

Causality loop: Time traveler causes the event they visited
```

---

## Three Domain Model

The system tracks entities across **three overlapping hierarchies:**

### 1. Spatial Domain (Physical Space)

**8-tier hierarchy:**

| Tier | Area | Population | Time Scale | Simulation |
|------|------|------------|-----------|------------|
| **Tile** | 9 m² | 0-10 | Real-time | Individual physics |
| **Chunk** | 3 km² | 10-1K | Real-time | **FULL ECS** |
| **Zone** | 10^5 km² | 1K-100K | 1 hour/tick | Demographics |
| **Region** | 10^8 km² | 100K-10M | 1 day/tick | Economy |
| **Planet** | 10^10 km² | 10M-500M | 1 month/tick | Politics |
| **System** | 1 star + planets | 100M-10B | 1 year/tick | Interstellar trade |
| **Sector** | 10-100 systems | 1B-100B | 10 years/tick | Galactic regions |
| **Galaxy** | Thousands of sectors | Trillions | 100 years/tick | Cosmic evolution |

**New Tiers (beyond Hierarchy Simulator):**
- **Planet:** Aggregate of all regions on a planet
- **System:** Star system with multiple planets, asteroid belts, space stations
- **Sector:** Group of neighboring star systems (trade network, cultural sphere)
- **Galaxy:** Top-level, thousands of sectors

**Data Structure:**

```typescript
interface SpatialTier {
  tier: TierLevel;
  id: string;

  // Physical properties
  area: number;  // km²
  position: Vector3D;  // Galactic coordinates

  // Population
  population: PopulationStats;

  // Economy
  economy: EconomicState;
  production: Map<ResourceType, number>;

  // Children (nested hierarchy)
  children: SpatialTier[];

  // Simulation mode
  mode: 'active' | 'statistical' | 'dormant';
  timeScale: number;  // Game-time per tick
}
```

### 2. Ship Domain (Mobile Entities)

**6-tier hierarchy for spaceships and fleets:**

| Tier | Entity | Count | Command | Purpose |
|------|--------|-------|---------|---------|
| **Crew** | Individual agents | 1-500 | Direct control | Personal actions |
| **Ship** | Spaceship | 1 ship | Ship AI/Captain | Transport, exploration |
| **Squadron** | Small fleet | 2-10 ships | Squadron leader | Coordinated missions |
| **Fleet** | Military/trade fleet | 10-100 ships | Admiral | War, commerce |
| **Armada** | Multi-fleet force | 100-1000 ships | Grand Admiral | Galactic conquest |
| **Navy** | Civilization's ships | 1000+ ships | Strategic command | Empire-wide defense |

**Ship Types (from `SpaceshipComponent.ts`):**
- **Worldship:** Generation ship (Stage 1, no β-space)
- **Threshold Ship:** Small crew, fragile β-navigation (Stage 2)
- **Courier Ship:** 2-person fast courier (Stage 2)
- **Brainship:** Ship-brain symbiosis (Stage 2, McCaffrey-style)
- **Story Ship:** Narrative-seeking explorer (Stage 3)
- **Gleisner Vessel:** Digital consciousness ship (Stage 3)
- **Svetz Retrieval:** Temporal archaeology (Stage 3)
- **Probability Scout:** Solo explorer mapping unobserved branches (Stage 3)
- **Timeline Merger:** Collapse compatible probability branches (Stage 3)

**β-space Navigation (Rainbow Mars mechanics):**
```typescript
interface ShipNavigation {
  can_navigate_beta_space: boolean;
  max_emotional_distance: number;  // How far ship can "jump" emotionally

  // Quantum observation
  quantum_coupling_strength: number;  // Crew coherence (0-1)
  coherence_threshold: number;        // Min coherence to navigate
  decoherence_rate: number;           // Coherence decay per tick
  observation_precision: number;      // Can measure before collapsing? (0-1)

  // Timeline contamination
  contamination_cargo: Array<{
    entity_id: string;
    source_timeline: string;  // β-branch origin
    contamination_level: number;  // Incompatibility with current branch
  }>;
}
```

**Cross-domain connection:**
- Ships exist in spatial domain (position in system/sector/galaxy)
- Ships can move between spatial tiers (travel from planet A to planet B)
- Fleets coordinate across systems

**Data Structure:**

```typescript
interface ShipTier {
  tier: ShipTierLevel;
  id: string;

  // Classification
  shipType: SpaceshipType;
  role: 'exploration' | 'combat' | 'trade' | 'colony' | 'science';

  // Crew (references Spatial domain agents)
  crew: {
    member_ids: string[];
    collective_emotional_state: EmotionalSignature;
    coherence: number;
  };

  // Position in Spatial domain
  currentLocation: {
    tier: SpatialTierLevel;
    id: string;  // e.g., 'planet:earth' or 'system:sol'
  };

  // Fleet hierarchy
  parent?: string;  // Squadron/Fleet/Armada ID
  children?: string[];  // If this is a fleet, list of ship IDs

  // Navigation
  navigation: ShipNavigation;
  missionStatus: MissionState;
}
```

### 3. Political Domain (Governance & Civilization)

**7-tier hierarchy for political structures:**

| Tier | Entity | Population | Leadership | Authority |
|------|--------|------------|-----------|-----------|
| **Village** | Settlement | 10-1K | Elder/Council | Local decisions |
| **City** | Urban center | 1K-100K | Mayor/Director | Resource allocation |
| **Province** | Region | 100K-10M | Governor | Law, taxation |
| **Nation** | Country | 10M-500M | King/President | War, diplomacy |
| **Empire** | Multi-nation | 100M-10B | Emperor | Interstellar policy |
| **Federation** | Multi-species | 10B-100B | Council | Galactic governance |
| **Galactic Council** | Galaxy-wide | Trillions | Assembly | Cosmic law |

**Governance Systems (from `GovernanceDataSystem.ts`, `CityDirectorSystem.ts`):**

**Village tier:**
```typescript
interface VillageGovernance {
  leaderAgentId?: string;  // Optional elder
  councilIds: string[];    // Village council
  decisions: 'consensus' | 'majority' | 'elder_decree';

  // Basic needs management
  resourcePriorities: ResourceType[];  // What to gather first
  buildQueue: BuildingType[];
}
```

**City tier (strategic management):**
```typescript
interface CityGovernance {
  directorAgentId?: string;  // City director (LLM-controlled)
  departments: {
    agriculture: DepartmentState;
    industry: DepartmentState;
    military: DepartmentState;
    research: DepartmentState;
  };

  // Strategic decisions
  expansionPlans: TerritoryPlan[];
  tradeAgreements: TradeRoute[];
  budgetAllocation: Record<Department, number>;
}
```

**Empire tier:**
```typescript
interface EmpireGovernance {
  rulingDynasty: DynastyInfo;
  governmentType: 'monarchy' | 'republic' | 'theocracy' | 'democracy' | 'hive_mind';

  // Interstellar governance
  memberNations: string[];  // Nation IDs
  colonizedSystems: string[];  // Star system IDs

  // Grand strategy
  foreignPolicy: {
    alliances: string[];  // Empire IDs
    rivals: string[];
    wars: WarState[];
  };

  // Technology & Culture
  techLevel: number;  // 1-10
  culturalIdentity: CulturalTraits;
}
```

**Cross-domain connections:**
- Political entities govern spatial regions (City governs Region tier)
- Ships belong to political entities (Navy → Empire)
- Trade routes connect political entities across space

**Data Structure:**

```typescript
interface PoliticalTier {
  tier: PoliticalTierLevel;
  id: string;
  name: string;

  // Territory (references Spatial domain)
  controlledRegions: string[];  // Spatial tier IDs
  capitalLocation: string;  // Spatial tier ID

  // Military (references Ship domain)
  militaryForces: {
    armies: number;  // Ground forces
    navyFleetIds: string[];  // Fleet IDs from Ship domain
  };

  // Government
  governance: GovernanceSystem;
  laws: LegalCode[];
  stability: StabilityMetrics;

  // Diplomatic relations
  relations: Map<string, DiplomaticRelation>;  // Other political entity IDs

  // Hierarchy
  parent?: string;  // Province → Nation → Empire
  vassals?: string[];  // Subordinate entities
}
```

### Domain Interaction Example

**Scenario:** Player zooms from individual agent → galactic empire

```
1. CHUNK TIER (Spatial: Village)
   Agent "Kara" (soul agent) mines iron ore
   Village: Population 50, 10 buildings

2. Zoom out → REGION TIER (Spatial: City)
   City: Population 50,000
   Kara is city's founder (preserved as soul agent)
   City produces 1000 iron/day

3. Zoom out → PLANET TIER (Spatial: Planet Earth)
   Planet: 10 million population
   Statistical summary: 50 cities, 10 nations
   Kara's city is capital of "Iron Kingdom" (Political: Nation)

4. Zoom out → SYSTEM TIER (Spatial: Sol System)
   System: Earth + Mars colony + asteroid belt mining
   Ships (Ship domain): 50 trade vessels, 10 military
   Iron Kingdom has small navy (5 ships)

5. Zoom out → GALAXY TIER (Spatial: Milky Way)
   100 civilizations
   Iron Kingdom's descendants formed "Human Empire" (Political: Empire)
   Navy: 1000 ships (Ship: Navy tier)
   Empire controls 50 star systems

6. Query soul agent Kara
   → Still exists! Full state preserved
   → Now mythological founder
   → Temples dedicated to her
```

**Data Flow:**

```
Player action: "Show me Kara's current status"
  ↓
Query Political domain: "Human Empire"
  → Trace lineage: Empire → Kingdom → City → Kara
  ↓
Query Spatial domain: "Where is Kara's statue?"
  → City capital, central plaza
  ↓
Query Ship domain: "Any ships named after Kara?"
  → Flagship "ISS Kara's Legacy" (Brainship)
  ↓
Return: Complete cross-domain report
```

---

## Integration with Hierarchy Simulator

**Existing System:** 7-tier spatial hierarchy (Tile → Gigasegment)

**Extension for Interstellar Scale:**

### Current Tiers (Ringworld-focused)

```typescript
const EXISTING_TIERS = {
  tile: { area: 9e-6 km², population: [0, 10] },
  chunk: { area: 3 km², population: [10, 1000] },        // FULL ECS
  zone: { area: 1e5 km², population: [1000, 100000] },
  region: { area: 1e8 km², population: [100000, 10000000] },
  subsection: { area: 1e10 km², population: [10000000, 500000000] },  // Planet-scale
  megasegment: { area: 1e13 km², population: [100000000, 1000000000] },  // Solar system scale
  gigasegment: { area: 1e15 km², population: [10000000000, 100000000000] },  // Galactic scale
};
```

### New Tiers (Galactic expansion)

```typescript
const NEW_TIERS = {
  planet: {
    area: 5.1e8 km²,  // Earth's surface area
    population: [1e6, 1e10],
    timeScale: 43200,  // 1 tick = 1 month (30 days)
    description: 'Single planet, aggregate of all regions'
  },

  system: {
    area: 1e18 km²,  // ~1 light-year radius
    population: [1e8, 1e12],
    timeScale: 525600,  // 1 tick = 1 year (365 days)
    description: 'Star system with multiple planets, asteroid belts'
  },

  sector: {
    area: 1e24 km²,  // ~100 light-years radius
    population: [1e12, 1e15],
    timeScale: 5256000,  // 1 tick = 10 years
    description: 'Region of 10-100 star systems, trade/cultural network'
  },

  galaxy: {
    area: 1e30 km²,  // Milky Way-scale
    population: [1e15, 1e18],
    timeScale: 525600000,  // 1 tick = 1000 years
    description: 'Entire galaxy, thousands of sectors, cosmic timescales'
  }
};
```

### Mapping to Existing Hierarchy

**Renormalization approach:** Extend existing system, don't replace

```typescript
// OLD: Gigasegment was top tier (galactic scale)
// NEW: Gigasegment → Sector (regional scale within galaxy)

const TIER_MAPPING = {
  // Keep existing tiers (1:1)
  tile: 'tile',
  chunk: 'chunk',       // FULL ECS BOUNDARY
  zone: 'zone',
  region: 'region',

  // Reinterpret high tiers
  subsection: 'planet',     // Was "planet-city", now full planet
  megasegment: 'system',    // Was "solar system scale", now star system
  gigasegment: 'sector',    // Was "galactic", now sector within galaxy

  // Add new top tier
  galaxy: 'galaxy'  // NEW: Entire galaxy
};
```

**Time Scaling Table (All Tiers):**

| Tier | Ticks/Second | Game Time/Tick | Real Time → Game Time |
|------|-------------|----------------|----------------------|
| Tile | 20 | 1 tick | 1 second = 1 second |
| Chunk | 20 | 1 tick | 1 second = 1 second |
| Zone | 20 | 1 hour | 1 second = 20 hours |
| Region | 20 | 1 day | 1 second = 20 days |
| Planet | 20 | 1 month | 1 second = 20 months |
| System | 20 | 1 year | 1 second = 20 years |
| Sector | 20 | 10 years | 1 second = 200 years |
| Galaxy | 20 | 1000 years | 1 second = 20,000 years |

**Example:** At 20 TPS (standard ECS), galaxy tier advances **~633 million years per real-time second**.

### Statistical Simulation (Inactive Tiers)

**From Hierarchy Simulator:** Inactive tiers use differential equations, not ECS

```typescript
// Population: Logistic growth
dP/dt = r * P * (1 - P/K)

// Belief spread: Word-of-mouth + temples
dB/dt = B * wordOfMouth + temples * templePower - B * decay

// Economy: Production with tech bonus
production = workers * baseRate * (1 + techLevel * 0.15)

// Technology: Research progress
dT/dt = universities * researchRate * (1 - techFriction)

// Stability: Decay with events
dS/dt = -eventSeverity + economicGrowth * 0.1
```

**Benefit:** O(1) cost per tier vs O(N) for individual agents

**Result:** Can simulate 100+ tiers simultaneously at 60 FPS

### Integration Points

**1. Zoom In (Activate Tier)**

```typescript
async function zoomIn(tierId: string, world: World) {
  // Get tier summary
  const summary = hierarchySimulator.getTierSummary(tierId);

  // Generate ECS entities matching summary
  const constraints = {
    targetPopulation: summary.population,
    beliefDistribution: summary.belief.byDeity,
    techLevel: summary.tech.level,
    namedNPCs: summary.preserved.namedNPCs,  // Soul agents
  };

  // Spawn agents
  for (let i = 0; i < constraints.targetPopulation; i++) {
    const agent = world.createEntity();
    agent.addComponent({
      type: 'agent',
      beliefs: sampleBeliefDistribution(constraints),
      skills: sampleSkillDistribution(constraints),
    });
  }

  // Restore soul agents EXACTLY
  for (const soulAgent of constraints.namedNPCs) {
    restoreSoulAgent(soulAgent.fullState, world);
  }

  // Switch tier mode
  hierarchySimulator.activateTier(tierId);
}
```

**2. Zoom Out (Summarize Tier)**

```typescript
function zoomOut(tierId: string, world: World) {
  // Summarize current ECS state
  const summary = {
    population: world.query().with('agent').count(),
    belief: aggregateBeliefs(world),
    economy: aggregateProduction(world),
    tech: computeTechLevel(world),

    // PRESERVE soul agents
    preserved: {
      namedNPCs: world.query()
        .with('soul_agent')
        .executeEntities()
        .map(e => snapshotEntity(e)),  // Full state
    },
  };

  // Store summary
  hierarchySimulator.storeSummary(tierId, summary);

  // Switch to statistical simulation
  hierarchySimulator.deactivateTier(tierId);

  // Clear ECS entities (except soul agents)
  world.query()
    .with('agent')
    .without('soul_agent')
    .executeEntities()
    .forEach(e => world.removeEntity(e.id));
}
```

**3. Cross-Tier Queries**

```typescript
// "Show me all soul agents in the empire"
const empire = politicalDomain.getEntity('empire:human');
const systems = empire.controlledSystems;  // System tier IDs

const soulAgents = [];
for (const systemId of systems) {
  const system = spatialDomain.getEntity(systemId);
  for (const planet of system.children) {
    // Query even if tier is inactive
    const souls = hierarchySimulator.querySoulAgents(planet.id);
    soulAgents.push(...souls);
  }
}

// Result: All soul agents across the empire, even in inactive tiers
```

---

## Player Experience at Each Zoom Level

### Level 1: Direct Control (Chunk Tier)

**Player as:** Individual agent or small group (RimWorld-style)

**Controls:**
- Move agent to location
- Assign tasks (gather wood, build shelter, craft items)
- Social interactions (talk to other agents, form relationships)
- Combat (dodge, attack, use abilities)

**UI:**
- Agent health/hunger/fatigue bars
- Inventory and equipment
- Skill progression
- Relationship panel

**Time Flow:** Real-time or pausable (1 second = 1 game-second)

**Example Session:**
```
Player controls "Kara" (soul agent)
→ Walk to forest
→ Chop tree (mining action)
→ Collect 10 wood
→ Return to village
→ Talk to elder, learn about iron deposits
→ Set goal: Explore mountains tomorrow
```

### Level 2: Advisory (Zone/Region Tier)

**Player as:** Village elder or city advisor

**Controls:**
- Suggest priorities to settlement AI
- Approve/reject building plans
- Manage trade agreements
- Assign named agents to leadership roles

**UI:**
- Settlement resource dashboard
- Building queue
- Population stats (total, happiness, skills)
- Trade routes map

**Time Flow:** Moderate speed (1 second = 10-100 game-seconds)

**Example Session:**
```
Player advises village council
→ Suggest: "Prioritize wood gathering for winter"
→ AI Director allocates 20 workers to forest
→ Approve building plan: New granary
→ Worker agents automatically gather resources, construct
→ Player fast-forwards, checks progress after 10 game-days
```

**AI Assistance:**
- City Director (LLM-controlled) makes day-to-day decisions
- Player sets high-level goals, AI figures out execution
- Can override specific decisions if desired

### Level 3: Strategic (Planet/System Tier)

**Player as:** Planetary governor or system administrator

**Controls:**
- Set civilization-wide policies (taxation, laws, research priorities)
- Manage diplomatic relations (alliances, trade, war)
- Allocate budget across departments (agriculture, military, research)
- Commission megaprojects (space elevator, dyson sphere)

**UI:**
- Planetary map (regions colored by control)
- Economy dashboard (GDP, trade balance, resource flows)
- Military overview (armies, fleets, readiness)
- Technology tree
- Diplomacy panel (other civilizations)

**Time Flow:** Fast (1 second = 1 game-year)

**Example Session:**
```
Player governs "Iron Kingdom" (nation on Earth)
→ Set policy: "Invest 40% of budget in spaceflight research"
→ AI allocates resources, builds rocket facilities
→ 50 years pass (50 real-seconds)
→ Technology unlocked: Orbital colony
→ Player commissions: "Build space station above Earth"
→ AI manages construction (takes 10 game-years)
→ Player fast-forwards, space station complete
→ Now controlling: Earth + orbital station (System tier)
```

**AI Assistance:**
- National AI handles daily governance
- Military AI commands fleets in battles
- Economic AI optimizes production chains
- Player makes strategic decisions, AI executes

### Level 4: Observer (Sector/Galaxy Tier)

**Player as:** Cosmic observer watching civilizations evolve

**Controls:**
- Create/destroy universes (god powers)
- Intervene with miracles (rare, expensive)
- Time travel (fork universe, rewind to checkpoint)
- Spawn/guide soul agents

**UI:**
- Galactic map (civilizations, wars, trade networks)
- Timeline slider (scrub through history)
- Civilization comparison (tech levels, populations, cultures)
- Event log (major events: wars, discoveries, extinctions)

**Time Flow:** Very fast (1 second = 1000 game-years) or scrubbing

**Example Session:**
```
Player observes Milky Way galaxy
→ 100 civilizations at various tech levels
→ Fast-forward 10,000 years (10 real-seconds)
→ Observe: Human Empire expands from 10 → 50 star systems
→ Observe: Alien species "Zyx" reaches post-singularity
→ Pause: Zyx builds Dyson sphere around their star
→ Player intervenes: Spawn soul agent "Envoy" to contact Zyx
→ Switch to Direct Control: Play as Envoy (Chunk tier)
→ First contact mission plays out in real-time
→ Zoom back out: 1000 years later, humans+Zyx form federation
```

**Emergent Storytelling:**
- Player watches long-term consequences of early decisions
- Can rewind time, fork universe to explore "what if" scenarios
- Soul agents become mythological figures in descendant civilizations

### Zoom Transitions (Seamless)

**Visual Effect:**
```
Zoom out: Chunk → Region
  1. Camera pulls back (2D → isometric → top-down)
  2. Individual agents fade, replaced by statistical overlay
  3. Buildings shrink to icons
  4. UI transitions: Agent panel → City dashboard
  5. Time scale increases smoothly (1x → 10x → 100x)

Zoom in: Region → Chunk
  1. Select region on map
  2. Camera zooms in (top-down → isometric → 2D)
  3. Generate agents matching statistical summary
  4. Buildings materialize with full geometry
  5. UI transitions: City dashboard → Agent panel
  6. Time scale decreases smoothly (100x → 10x → 1x)
```

**Performance:** Asynchronous loading
- Generate entities in background
- Show loading screen with summary stats
- Restore soul agents first (instant recognition)
- Fill in generic agents gradually

---

## Performance Targets

### Computational Budget

**Target:** 60 FPS (16.67ms per frame) with smooth zoom transitions

| Scale | Active Entities | ECS TPS | Statistical Tiers | Frame Budget |
|-------|----------------|---------|-------------------|--------------|
| **Chunk (single)** | 10-100 agents | 20 | 0 | 8ms ECS + 4ms rendering |
| **Chunk (multiple)** | 100-1000 agents | 20 | 10 regions | 10ms ECS + 4ms statistical |
| **Region (statistical)** | 0 agents (inactive) | 0 | 100 regions | 12ms statistical + 2ms rendering |
| **Galaxy (observer)** | 1000 soul agents | 1 | 10,000 tiers | 14ms statistical + 2ms UI |

**Optimization Strategies:**

**1. SimulationScheduler (Entity Culling)**
- ALWAYS: Agents, buildings (always simulate)
- PROXIMITY: Plants, animals (only when on-screen)
- PASSIVE: Resources, debris (zero per-tick cost)

Result: ~97% entity reduction (120 updated vs 4,260 total)

**2. System Throttling**
- Critical systems: Every tick (Movement, Collision)
- Economic systems: Every 100 ticks (Trade, Market)
- Governance systems: Every 1000 ticks (Policy, Diplomacy)

**3. Statistical Simulation**
- O(1) cost per inactive tier
- Differential equations for population, economy, tech
- No individual agent tracking

**4. LLM Call Budgeting**
- **Chunk tier:** 10 LLM calls/sec (agent decisions)
- **Region tier:** 1 LLM call/sec (city director)
- **Planet tier:** 0.1 LLM calls/sec (national policy)
- **Galaxy tier:** 0.01 LLM calls/sec (diplomatic events)

**Priority queue:** Crisis > Strategic decision > Routine

**5. Lazy Loading**
- Generate tier details on-demand
- Cache last N accessed tiers
- Evict least-recently-used

### Memory Budget

**Target:** <4 GB total memory usage

| Data Type | Size | Count | Total |
|-----------|------|-------|-------|
| **Active agents (Chunk)** | 2 KB/agent | 1000 | 2 MB |
| **Soul agents (galaxy-wide)** | 50 KB/agent | 1000 | 50 MB |
| **Statistical tiers** | 10 KB/tier | 10,000 | 100 MB |
| **Spatial hierarchy** | 1 KB/node | 100,000 | 100 MB |
| **Ship hierarchy** | 5 KB/ship | 10,000 | 50 MB |
| **Political hierarchy** | 20 KB/entity | 1,000 | 20 MB |
| **Terrain (compressed)** | - | - | 500 MB |
| **Assets (sprites, UI)** | - | - | 1 GB |
| **Overhead** | - | - | 200 MB |
| **TOTAL** | | | **~2 GB** |

**Headroom:** 50% safety margin for spikes

### Network Budget (Multiplayer, Future)

**Assumption:** 10 KB/s upload/download per player

**Sync strategy:**
- Active tier (Chunk): Full state sync (1 KB/tick = 20 KB/s)
- Inactive tiers: Summary deltas only (100 bytes/tier = 1 KB/s for 10 tiers)
- Soul agents: Full sync on-demand (triggered by query)

**Prediction:** Client simulates statistical tiers locally, server authority for active tier only

---

## Spec Dependencies

This is the **master architecture document** that defines the overall system. Implementers should read specs in this order:

### Core Foundation (Read First)
1. **01-GRAND-STRATEGY-OVERVIEW.md** (this document) - Overall architecture
2. **02-SPATIAL-HIERARCHY.md** - Tile → Galaxy spatial hierarchy
3. **03-TIME-SCALING.md** - Time dilation, tick rates, fast-forward mechanics

### Domain Hierarchies (Parallel reading)
4. **04-SHIP-DOMAIN.md** - Crew → Navy ship hierarchy, β-space navigation
5. **05-POLITICAL-DOMAIN.md** - Village → Galactic Council governance

### Cross-Domain Integration
6. **06-SOUL-AGENTS.md** - Named characters, preservation across scales
7. **07-CROSS-DOMAIN-QUERIES.md** - Querying across Spatial/Ship/Political domains

### Gameplay Systems
8. **08-PLAYER-EXPERIENCE.md** - UI/UX at each zoom level, controls
9. **09-PRODUCTION-CHAINS.md** - Resources from stone → exotic matter
10. **10-DIPLOMACY-WAR.md** - Inter-civilization relations, conflicts

### Advanced Features
11. **11-TIME-TRAVEL.md** - Universe forking, timeline mechanics, causality
12. **12-EMERGENT-STORYTELLING.md** - Narrative generation across eras

### Implementation Guides
13. **13-PERFORMANCE-OPTIMIZATION.md** - Culling, throttling, statistical sim
14. **14-MIGRATION-GUIDE.md** - Extending existing Hierarchy Simulator

**Reading Path:**
- **Game designers:** 1, 6, 8, 12 (vision and player experience)
- **Systems programmers:** 1, 2, 3, 13 (core architecture and performance)
- **Gameplay programmers:** 4, 5, 9, 10 (domain systems)
- **Narrative designers:** 6, 11, 12 (storytelling systems)

---

## Open Questions & Future Work

### Design Questions

**1. How granular should political tier elections be?**
- Option A: Player manually appoints all leaders (micromanagement)
- Option B: AI holds elections, player can intervene (emergent democracy)
- Option C: Leadership emerges from social networks (fully emergent)

**Recommendation:** Option B - AI-driven with player override for soul agents

**2. Should ships have persistent identity across reconstructions?**
- Ship "ISS Kara" destroyed in battle
- New ship built, same name
- Are they the "same" ship? (Ship of Theseus problem)

**Recommendation:** Track lineage, allow "reincarnation" mechanic

**3. How do multiverse invasions work?**
- Universe A forks from Universe B at Year 100
- Universe A develops faster, reaches Year 1000 while B is at Year 500
- Can A invade B in the past?

**Recommendation:** Time travel mechanics allow cross-timeline interaction (see spec 11)

### Technical Challenges

**1. Save file size explosion**
- Galaxy tier: 10,000 statistical tiers
- Soul agents: 1,000 full-state entities
- Terrain: Compressed but still large

**Mitigation:**
- Streaming saves (load tiers on-demand)
- Differential saves (only changed data)
- Compression (GZIP reduces 70-85%)

**2. LLM cost at scale**
- 10,000 cities each with LLM director = expensive
- Need tiered LLM usage

**Mitigation:**
- Cache LLM responses for similar situations
- Use smaller models for routine decisions
- Reserve powerful models for critical events

**3. Determinism across tiers**
- Statistical simulation uses RNG
- Zooming in/out may produce different results

**Mitigation:**
- Seeded RNG per tier
- Checksum validation on zoom transitions
- Accept minor divergence (it's emergent!)

### Future Enhancements

**1. Player-Created Civilizations**
- Design custom species
- Define cultural traits, government type
- Seed in galaxy, watch evolve

**2. Multiverse Tourism**
- Visit alternate timelines as observer
- "What if Rome never fell?" universe
- Compare outcomes across timelines

**3. Post-Singularity Mechanics**
- Civilization uploads to digital realm
- Dyson sphere construction
- Reality manipulation powers
- Ascension to higher dimensions

**4. Procedural Quest Generation**
- LLM generates quests based on current state
- "Retrieve artifact from extinct timeline"
- "Negotiate peace between warring empires"
- "Solve mystery of vanished soul agent"

**5. Player-vs-Player Grand Strategy**
- Multiplayer galaxy
- Each player controls a civilization
- Compete/cooperate across scales
- Shared statistical simulation

---

## Summary

The Grand Strategy Abstraction Layer enables **seamless simulation across 9 orders of magnitude**:
- Individual agents placing stones (9 m² tiles)
- Galactic empires spanning light-years (10^30 km² galaxies)

**Key Innovations:**
1. **Three domain model** (Spatial, Ship, Political) provides overlapping hierarchies
2. **Soul agents** preserve named characters across any scale
3. **Time scaling** allows jumping from hours to millennia
4. **Statistical simulation** makes galaxy-scale feasible (O(1) per tier)
5. **Emergent gameplay** from AI agents managing each layer

**Vision:** "Stellaris + RimWorld + Factorio" - grand strategy with personal stories and complex production chains, made possible by AI coordination.

**Next Steps:**
1. Extend Hierarchy Simulator with new tiers (Planet, System, Sector, Galaxy)
2. Implement Ship domain hierarchy
3. Implement Political domain hierarchy
4. Create cross-domain query system
5. Build zoom UI with smooth transitions
6. Integrate LLM-controlled directors at each tier

**The result:** A game where you can watch a single agent's life unfold, then zoom out to see the empire they founded span the stars 10,000 years later - and still query that original agent's preserved state.

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-16
**Total Lines:** ~820
**Related Specs:** 02-14 (to be written)
**Status:** Master architecture complete, implementation specs in progress
