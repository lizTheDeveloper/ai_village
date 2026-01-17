# Grand Strategy Abstraction Layer - Spec of Specs

> **Meta-Document**: This document plans the specifications needed to implement the Grand Strategy Abstraction Layer, which enables simulation across scales from individual agents to galactic civilizations.

## Vision

A merger of **Stellaris** (grand strategy, galactic scale), **RimWorld** (individual colonist stories), and **Factorio** (complex production chains) - made possible by AI agents that can operate at any scale.

**Core Capability**: Players can zoom from watching a single agent craft a tool, to managing a galactic empire spanning thousands of star systems, to jumping forward millions of years to witness post-singularity civilizations building Dyson spheres.

**Key Innovation**: Named "soul agents" maintain consistent simulation even when zoomed out, enabling stories that span eras. Universe forking allows alternate timelines that can develop independently and potentially reconnect (including invasion scenarios).

---

## Existing Systems Inventory

### Already Implemented (from context)

#### 1. Hierarchy Simulator (`packages/hierarchy-simulator/`)
**Status**: Implemented, needs extension for interstellar scales

**What it does**:
- 7-tier spatial hierarchy: Tile → Chunk → Zone → Region → Subsection → Megasegment → Gigasegment
- Renormalization group theory for multi-scale simulation
- Time scaling: Chunk = real-time, Gigasegment = 1 year/tick
- Statistical simulation using differential equations for inactive tiers
- Zoom in/out with summarization and instantiation constraints
- Scientist emergence system (HARD STEPS model)

**Key files**:
- `src/abstraction/types.ts` - Core types (TierLevel, AbstractTier, ResourceFlow)
- `src/abstraction/AbstractTierBase.ts` - Base tier implementation
- `src/abstraction/AbstractGigasegment.ts` - Galactic-scale tier
- `src/renormalization/RenormalizationEngine.ts` - Zoom in/out mechanics
- `src/simulation/SimulationController.ts` - Game loop, tier management

**Summarization rules** (what gets lost at each tier):
- `preserved`: namedNPCs, majorBuildings, historicalEvents
- `lost`: individual_positions, behaviors, skill_distributions

#### 2. Hive Mind / Collective Intelligence (`docs/HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md`)
**Status**: Specified, partially implemented

**What it does**:
- Complex Adaptive Systems (CAS) framework
- Multi-tier intelligence hierarchy:
  - Tier 1: Worker execution (swarm/flow fields)
  - Tier 2: Squad command (tactical LLM)
  - Tier 3: Faction strategy (council of LLMs)
  - Tier 4: Inter-faction dynamics (emergent geopolitics)
- LLM agents controlling swarms of simple agents
- Consensus building, emergent leadership, knowledge crystallization
- Cross-game agent migration (Nexus concept)

#### 3. Planet System (`packages/world/src/planet/`)
**Status**: Just implemented (this session)

**What it does**:
- Multiple planets per universe
- 10 planet types with terrain parameters
- Planet-specific chunk managers and terrain generation
- `planet_location` component for entities

#### 4. Spaceship System (`packages/core/src/systems/Spaceship*`)
**Status**: Just implemented (this session)

**What it does**:
- Ship types: Worldship, Threshold, Courier, Brainship, Storyship, Gleisner, Svetz, Probability Scout, Timeline Merger
- β-space emotional navigation (Heart Chamber, coherence thresholds)
- Ship components: EmotionTheater, MemoryHall, MeditationChamber
- Construction system with shipyards
- 5-tier research tree for spaceflight

#### 5. Spaceflight Production Chain (`packages/core/src/items/SpaceflightItems.ts`, `packages/core/src/crafting/SpaceflightRecipes.ts`)
**Status**: Just implemented (this session)

**What it does**:
- 65+ exotic materials across 7 tiers
- Factorio-style production chain
- Buildings: Arcane Forge, Ley Line Extractor, Electronics Lab, Temporal Lab, Reality Forge
- Ship hull kits for each ship type

#### 6. Multiverse/Persistence System (`packages/persistence/`)
**Status**: Implemented

**What it does**:
- Universe snapshots and time travel
- Universe forking (branching timelines)
- Save/load with checksums and migrations

#### 7. Trade System (`packages/core/src/systems/TradingSystem.ts`, `TradeAgreementSystem.ts`)
**Status**: Implemented at village/city level

**What it does**:
- Local trading between agents
- Trade agreements between settlements
- Market events

#### 8. Governance System (`packages/core/src/systems/GovernanceDataSystem.ts`, `CityDirectorSystem.ts`)
**Status**: Implemented at city level

**What it does**:
- City-level strategic management
- Governance data tracking
- Laws and policies

---

## Specs to Write

### Tier 1: Core Architecture (Write First)

#### 01-GRAND-STRATEGY-OVERVIEW.md
**Purpose**: Master architecture document that ties everything together
**Contents**:
- System overview and design philosophy
- How the three domains (Spatial, Ship, Political) interact
- Integration with existing hierarchy-simulator
- Performance budget and scaling targets
- Player experience at each zoom level

**Dependencies**: None (foundational)
**Estimated size**: ~800 lines

#### 02-SOUL-AGENTS.md
**Purpose**: How named agents persist across abstraction levels
**Contents**:
- Soul Agent definition (agents that maintain identity across zooms)
- Headless simulation mode for soul agents when zoomed out
- Memory persistence and dream states during fast-forward
- Aging, death, and legacy across eras
- Soul agent "awakening" when zoomed back in
- Relationship to existing `soul` component and SoulRepositorySystem

**Dependencies**: 01-OVERVIEW
**Estimated size**: ~600 lines
**Critical for**: Everything else - this defines what persists

#### 03-TIME-SCALING.md
**Purpose**: How time acceleration works across scales
**Contents**:
- Time scale table for all tiers (real-time to decades/tick)
- Fast-forward mechanics (jumping millions of years)
- What simulates vs. what's generated on zoom-in
- Paradox handling (soul agents aging vs. player time)
- Integration with existing TIME_SCALE constants in hierarchy-simulator
- "Era snapshots" for historical record

**Dependencies**: 01-OVERVIEW, 02-SOUL-AGENTS
**Estimated size**: ~500 lines

### Tier 2: Domain Hierarchies (Can be parallel)

#### 04-SPATIAL-HIERARCHY.md
**Purpose**: Extend hierarchy-simulator for interstellar scales
**Contents**:
- Extended tier table: Chunk → Region → Planet → System → Sector → Galaxy → Universe
- Planet abstraction (population, economy, politics as statistics)
- Star system abstraction (multiple planets, asteroid belts, stations)
- Sector abstraction (multiple systems, regional powers)
- Galaxy abstraction (sectors, spiral arms, galactic core)
- Terrain generation at each scale
- What's preserved vs. lost at each level

**Dependencies**: 01-OVERVIEW, 03-TIME-SCALING
**Estimated size**: ~1000 lines

#### 05-SHIP-FLEET-HIERARCHY.md
**Purpose**: Ships to navies abstraction
**Contents**:
- Tier table: Crew → Ship → Squadron → Fleet → Armada → Navy
- Ship abstraction (crew as statistics, systems status)
- Squadron tactics and formations
- Fleet-level combat (Lanchester's Laws)
- Armada strategic operations
- Navy as political/economic entity
- β-space navigation at fleet scale (coherence averaging)
- Integration with existing SpaceshipManagementSystem

**Dependencies**: 01-OVERVIEW, 02-SOUL-AGENTS (captains persist)
**Estimated size**: ~800 lines

#### 06-POLITICAL-HIERARCHY.md
**Purpose**: Villages to federations
**Contents**:
- Tier table: Village → City → Province → Nation → Empire → Federation → Galactic Council
- Governance abstraction at each level
- Law and policy propagation
- Diplomacy systems (treaties, alliances, wars)
- Cultural identity and drift
- Revolution and collapse mechanics
- Integration with existing GovernanceDataSystem, CityDirectorSystem

**Dependencies**: 01-OVERVIEW, 04-SPATIAL (political entities map to space)
**Estimated size**: ~900 lines

#### 07-TRADE-LOGISTICS.md
**Purpose**: Trade routes to interstellar networks
**Contents**:
- Tier table: Trade Route → Shipping Lane → Trade Network → Trade Federation
- Flow-based economics (goods/tick, not individual shipments)
- Chokepoint strategic importance
- Piracy and blockades
- Currency and exchange rates across scales
- Resource scarcity and surplus propagation
- Integration with existing TradingSystem, TradeAgreementSystem

**Dependencies**: 01-OVERVIEW, 04-SPATIAL, 05-SHIP-FLEET
**Estimated size**: ~700 lines

### Tier 3: Advanced Systems

#### 08-TECHNOLOGY-ERAS.md
**Purpose**: Progression from Paleolithic to post-singularity
**Contents**:
- Era definitions with rough year ranges:
  - Paleolithic, Neolithic, Bronze, Iron, Medieval, Renaissance
  - Industrial, Atomic, Information, Fusion, Interplanetary
  - Interstellar, Transgalactic, Post-Singularity, Transcendent
- Technology trees for each era
- Era transitions (what triggers advancement)
- Clarketech tiers (1-10) for post-singularity tech
- Knowledge loss and dark ages
- "Uplifting" primitive civilizations

**Dependencies**: 01-OVERVIEW, 03-TIME-SCALING
**Estimated size**: ~1200 lines

#### 09-MEGASTRUCTURES.md
**Purpose**: Gigastructures and mega-engineering
**Contents**:
- Megastructure types:
  - Orbital: Space stations, habitats, shipyards
  - Planetary: World engines, planet crackers, terraformers
  - Stellar: Dyson swarms, stellar engines, star lifters
  - Galactic: Wormhole networks, galactic highways
  - Transcendent: Universe engines, reality anchors
- Construction requirements (resources, time, tech level)
- Production chain scaling (from Factorio-style to automated mega-industry)
- Maintenance and decay
- Strategic/military applications

**Dependencies**: 08-TECHNOLOGY-ERAS, 04-SPATIAL, 07-TRADE
**Estimated size**: ~1000 lines

#### 10-MULTIVERSE-MECHANICS.md
**Purpose**: Universe forking, inter-universe travel, invasion
**Contents**:
- Universe forking mechanics (extends existing persistence)
- Timeline divergence tracking
- Inter-universe travel methods:
  - Probability Scout ships (view alternate timelines)
  - Timeline Merger ships (collapse branches)
  - Universe gates (stable connections)
- Invasion scenarios (advanced civilization invades primitive fork)
- Timeline paradoxes and resolution
- "Canon events" that resist change
- Merge mechanics (combining divergent timelines)

**Dependencies**: 01-OVERVIEW, 02-SOUL-AGENTS, 05-SHIP-FLEET
**Estimated size**: ~900 lines

#### 11-LLM-GOVERNORS.md
**Purpose**: AI decision-making at each tier
**Contents**:
- Governor hierarchy:
  - Village: Agent council (existing)
  - City: Mayor LLM
  - Province: Governor LLM
  - Nation: Parliament/Monarch LLM
  - Empire: Emperor LLM council
  - Federation: Senate of AIs
- Decision domains at each tier
- Prompt templates for each governor type
- LLM budget allocation (can't call LLM for everything)
- Personality emergence for long-lived governors
- Integration with existing hive mind spec

**Dependencies**: 06-POLITICAL, 01-OVERVIEW
**Estimated size**: ~800 lines

### Tier 4: Integration & Gameplay

#### 12-PLAYER-EXPERIENCE.md
**Purpose**: How players interact with this system
**Contents**:
- Zoom levels and UI at each scale
- Control modes:
  - Direct: Control individual agent
  - Advisory: Influence settlement decisions
  - Strategic: Set policies for nations
  - Observer: Watch civilizations evolve
- Notifications and alerts across scales
- "Interesting events" detection
- Story hooks and narrative emergence
- Achievement/milestone system

**Dependencies**: All previous specs
**Estimated size**: ~600 lines

#### 13-PERFORMANCE-BUDGET.md
**Purpose**: How to make this actually run
**Contents**:
- Target metrics (TPS at each scale)
- Memory budget per tier
- LLM call budget and batching
- Chunk loading/unloading strategies
- Background simulation threading
- Snapshot compression for distant history
- Culling strategies for irrelevant details

**Dependencies**: All previous specs
**Estimated size**: ~500 lines

---

## Writing Order and Dependencies

```
Phase 1 (Sequential - Foundation):
  01-OVERVIEW ──► 02-SOUL-AGENTS ──► 03-TIME-SCALING

Phase 2 (Parallel - Domains):
  ┌─► 04-SPATIAL-HIERARCHY
  │
  ├─► 05-SHIP-FLEET-HIERARCHY
  │
  ├─► 06-POLITICAL-HIERARCHY
  │
  └─► 07-TRADE-LOGISTICS

Phase 3 (Parallel - Advanced):
  ┌─► 08-TECHNOLOGY-ERAS
  │
  ├─► 09-MEGASTRUCTURES
  │
  ├─► 10-MULTIVERSE-MECHANICS
  │
  └─► 11-LLM-GOVERNORS

Phase 4 (Sequential - Integration):
  12-PLAYER-EXPERIENCE ──► 13-PERFORMANCE-BUDGET
```

---

## Subagent Instructions Template

When dispatching subagents to write specs, include:

1. **Context from this document** (the relevant section)
2. **Existing systems to reference** (file paths from inventory above)
3. **Dependencies** (which other specs to assume exist)
4. **Output format** (OpenSpec markdown with sections)
5. **Estimated length** (from above)
6. **Key questions to answer** (specific to each spec)

### Standard Spec Sections

Each spec should include:
- Overview & Motivation
- Core Concepts & Terminology
- Data Structures (TypeScript interfaces)
- State Transitions & Lifecycle
- Integration Points (with existing systems)
- Statistical Simulation (differential equations where applicable)
- What's Preserved vs. Lost (at each abstraction level)
- LLM Integration (prompts, decision points)
- Performance Considerations
- Open Questions & Future Work

---

## Key Design Principles

### 1. Information Loss is Intentional
At higher tiers, you simulate statistics, not individuals. This isn't a bug - it's physically correct. You can't track individual atom positions in a gas.

### 2. Soul Agents are Sacred
Named characters with player attachment MUST persist with full fidelity. They simulate in headless mode when zoomed out.

### 3. Time is Elastic
Players can experience a village for hours, then jump forward millennia. The system must handle both gracefully.

### 4. Emergence Over Engineering
Don't hardcode outcomes. Let civilizations rise and fall through simulation.

### 5. Production Chains Scale
From hand-crafting to automated mega-industry. The same conceptual framework at every level.

### 6. Stories Span Eras
A soul agent's descendant might meet a time-traveling version of their ancestor. The system must support this.

---

## Success Criteria

The Grand Strategy Abstraction Layer is complete when:

1. [ ] Player can zoom from single agent to galaxy view seamlessly
2. [ ] Time can be accelerated to simulate millions of years
3. [ ] Soul agents maintain consistent identity across all scales
4. [ ] Civilizations can rise, fall, and be rediscovered
5. [ ] Universe forking creates playable alternate timelines
6. [ ] Inter-universe invasion scenarios are possible
7. [ ] Megastructures can be built by advanced civilizations
8. [ ] Performance remains acceptable at all scales
9. [ ] The game is actually fun at every zoom level

---

## Next Steps

1. Review this meta-spec for completeness
2. Dispatch parallel subagents for Phase 1 specs
3. Review Phase 1 outputs
4. Dispatch parallel subagents for Phase 2 specs
5. Continue through phases
6. Integration review across all specs
7. Implementation planning

---

*Document Version: 1.0*
*Created: 2026-01-16*
*Status: Planning*
