# Multiverse: The End of Eternity - Architecture Overview

> **Last Updated:** 2026-01-06
> **Purpose:** Master architecture document for understanding the game engine structure

---

## 📚 Overview Documentation Set

This is part of a comprehensive documentation set located in `./custom_game_engine/`:

- **[./ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - This file (master architecture)
- **[./SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)** - Complete reference of all 212+ systems
- **[./COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** - All 125+ component specifications
- **[./METASYSTEMS_GUIDE.md](./METASYSTEMS_GUIDE.md)** - Deep dives into major metasystems
- **[./packages/renderer/README.md](./packages/renderer/README.md)** - Renderer architecture and visual systems

For implementation status and roadmap, see:
- **[../MASTER_ROADMAP.md](../MASTER_ROADMAP.md)** - Project roadmap and phase tracking

---

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Package Structure](#package-structure)
3. [Metasystems](#metasystems)
4. [System Categories](#system-categories)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)

---

## Core Architecture

### Entity-Component-System (ECS)

The game engine uses a pure ECS architecture:

- **Entities**: Unique IDs with component collections (125+ component types)
- **Components**: Pure data structures (no logic)
- **Systems**: Logic processors that operate on entities with specific components (212+ systems)
- **World**: Container for all entities, components, and tiles
- **EventBus**: Decoupled communication between systems
- **ActionQueue**: Intent-based agent behavior system

**Key Files:**
- `packages/core/src/ecs/` - Core ECS implementation
- `packages/core/src/loop/GameLoop.ts` - Main game loop (20 TPS fixed timestep)
- `packages/core/src/events/EventBus.ts` - Event system
- `packages/core/src/actions/` - Action queue

### Game Loop

**Fixed Timestep:** 20 ticks per second (TPS)
- 1 tick = 50ms = 1 in-game minute
- 1 hour = 60 ticks = 3 seconds real time
- 1 day = 1440 ticks = 72 seconds real time

**Loop Order:**
1. Process input/events
2. Run systems (in registration order)
3. Process action queue
4. Emit events
5. Render (if needed)
6. Sleep to maintain 20 TPS

**Performance Critical:**
- Systems run EVERY tick (avoid heavy computation)
- Use throttling for non-critical systems
- Cache queries, avoid `world.query()` in loops
- Use squared distance (avoid `Math.sqrt()`)

---

## Package Structure

```
custom_game_engine/
├── packages/
│   ├── core/          # Game logic (ECS, systems, components)
│   ├── renderer/      # UI, canvas rendering, sprites
│   ├── world/         # Terrain generation, chunks, biomes
│   ├── llm/           # AI integration, prompt building, LLM queue
│   └── ...
├── demo/              # Main entry point, Vite dev server
├── scripts/           # Development tools, metrics server
└── architecture/      # Detailed specs for major features
```

### Core Package Structure

```
packages/core/src/
├── ecs/               # Entity-Component-System foundation
├── loop/              # Game loop, timing
├── events/            # Event bus
├── actions/           # Action queue
├── systems/           # 212+ gameplay systems
├── components/        # 125+ component types
├── factories/         # Entity creation helpers
├── consciousness/     # Hive minds, pack minds
├── divinity/          # Gods, angels, prayer, myths
├── reproduction/      # Mating, courtship, pregnancy, birth
├── multiverse/        # Multiple universes, network sync
├── magic/             # Spell systems, paradigms
├── realms/            # Underworld, celestial, dream realms
├── persistence/       # Save/load, migrations
├── metrics/           # Performance tracking, analytics
├── communication/     # Chat, DMs, group messaging
├── conversation/      # Deep conversation, quality metrics
├── behavior/          # AI behaviors (animals, agents)
├── decision/          # Agent decision-making
├── perception/        # Vision, hearing, meetings
├── memory/            # Episodic, semantic, spatial memory
├── knowledge/         # Affordances, LLM reasoning
├── skills/            # Skill system, progression
├── crafting/          # Recipe system, crafting jobs
├── economy/           # Trading, currency, market
├── buildings/         # Construction, blueprints
├── species/           # Species definitions
├── genetics/          # Genetic traits, inheritance
├── items/             # Item registry, definitions, quality
├── materials/         # Material templates
├── research/          # Discovery, research tree
├── navigation/        # Pathfinding, zones, map knowledge
├── targeting/         # Domain-specific targeting
├── governance/        # Leadership, laws, voting
├── help/              # Self-documenting wiki
└── utils/             # Shared utilities
```

---

## Metasystems

Metasystems are high-level features composed of multiple systems, components, and subsystems.

### 1. Consciousness Systems

**Purpose:** Collective intelligence beyond individual agents

**Components:**
- `HiveMindSystem` - Eusocial insect colonies
- `PackMindSystem` - Coordinated group behavior (wolves, etc.)

**Status:** ✅ Implemented
**Location:** `packages/core/src/consciousness/`

---

### 2. Divinity System

**Purpose:** Gods, religion, faith, divine interaction

**Major Subsystems:**
- **Belief & Faith:** Belief generation, allocation, decay
- **Deities:** Identity, domains, personality, emergence
- **Divine Powers:** Prayer, blessings, curses, visions
- **Pantheon:** Multi-deity relationships, politics, conflicts
- **Angels:** Divine servants, delegation, orders
- **Avatar:** God manifestation in mortal world
- **Religion:** Temples, priests, rituals, holy texts
- **Myths:** Story generation, mutation, cultural transmission
- **Divine Chat:** Real-time god conversations
- **Psychopomp:** Death judgment, soul ceremonies

**Status:** ✅ Complete (Phase 27-28, 35)
**Location:** `packages/core/src/divinity/`
**Systems:** 30+ divinity-related systems

---

### 3. Reproduction System

**Purpose:** Species propagation, courtship, birth, parenting

**Subsystems:**
- **Mating Paradigms:** 12+ paradigms (human, kemmer, hive, quantum, etc.)
- **Courtship:** State machine, compatibility checks, displays
- **Pregnancy:** Gestation, health effects, timing
- **Labor & Birth:** Midwifery, delivery, complications
- **Parenting:** Child care, bonding, skill teaching

**Status:** ✅ Complete (Phase 37)
**Location:** `packages/core/src/reproduction/`
**Components:** Sexuality, ReproductiveMorph, Pregnancy, Labor, Parenting, Courtship

---

### 4. Multiverse System

**Purpose:** Multiple parallel universes with independent time scales

**Features:**
- Universe forking, branching
- Cross-universe trade agreements
- Hilbert-time causal ordering
- Network synchronization
- Remote universe viewing

**Status:** ⏳ Partially implemented (Phase 32-34 pending)
**Location:** `packages/core/src/multiverse/`
**Components:** MultiverseCoordinator, NetworkProtocol

---

### 5. Magic System

**Purpose:** Multi-source spell casting, paradigms, combos

**Features:**
- Paradigm spectrum (core, animist, whimsical, null, dimensional, hybrid)
- Verb/noun composition
- Skill trees
- Universe magic configuration

**Status:** ⚠️ Framework exists, paradigms incomplete (Phase 30)
**Location:** `packages/core/src/magic/`

---

### 6. Realm System

**Purpose:** Mythological pocket dimensions

**Realms:**
- **Underworld:** Death realm, afterlife processing
- **Celestial:** Divine realm, heavens
- **Dream:** Consciousness realm, dreams

**Features:**
- Time flow variations
- Access restrictions
- Realm laws (physics modifications)
- Transitions, portals, passages

**Status:** ✅ Implemented
**Location:** `packages/core/src/realms/`

---

### 7. Research & Discovery

**Purpose:** Knowledge progression, tech tree

**Features:**
- Research projects
- Discovery events
- Unlock system
- Observation-driven learning

**Status:** ✅ Complete (Phase 13)
**Location:** `packages/core/src/research/`

---

### 8. Persistence System

**Purpose:** Save/load with forward migrations

**Features:**
- World serialization
- Component versioning
- Migration system
- Checksum validation
- Multiple storage backends (IndexedDB, Memory)

**Status:** ⏳ Basic implementation, migrations pending (Phase 31)
**Location:** `packages/core/src/persistence/`

---

## System Categories

Systems organized by functional domain:

### Time & Environment (6 systems)
- TimeSystem, WeatherSystem, TemperatureSystem
- SoilSystem, RealmTimeSystem, ClimateSystem

### Plants (3 systems)
- PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem

### Animals (6 systems)
- AnimalSystem, AnimalProductionSystem, AnimalHousingSystem
- WildAnimalSpawningSystem, TamingSystem, AnimalBrainSystem

### Agent Core (8 systems)
- AgentBrainSystem (LLM-driven decisions)
- MovementSystem, NeedsSystem, MoodSystem
- SleepSystem, SteeringSystem, CircadianSystem
- IdleBehaviorSystem, GoalGenerationSystem

### Memory & Cognition (7 systems)
- MemorySystem, MemoryFormationSystem, MemoryConsolidationSystem
- SpatialMemoryQuerySystem, ReflectionSystem, JournalingSystem
- BeliefFormationSystem, BeliefGenerationSystem

### Social & Communication (4+ systems)
- CommunicationSystem, SocialGradientSystem
- VerificationSystem, InterestsSystem
- ChatRoomSystem (DMs, group chat, divine chat)

### Building & Construction (9+ systems)
- BuildingSystem, BuildingMaintenanceSystem, BuildingSpatialAnalysisSystem
- ResourceGatheringSystem, TreeFellingSystem, TileConstructionSystem
- DoorSystem, PowerGridSystem, BeltSystem, AssemblyMachineSystem

### Economy & Trade (3 systems)
- TradingSystem, MarketEventSystem, CurrencySystem

### Skills & Crafting (4 systems)
- SkillSystem, CookingSystem, DurabilitySystem, CraftingSystem

### Combat & Security (7 systems)
- AgentCombatSystem, HuntingSystem, PredatorAttackSystem
- DominanceChallengeSystem, InjurySystem
- GuardDutySystem, VillageDefenseSystem

### Divinity (30+ systems)
See [Divinity Metasystem](#2-divinity-system) above

### Reproduction (5 systems)
- ReproductionSystem, CourtshipSystem, MidwiferySystem
- ParentingSystem, JealousySystem

### Realms & Portals (9 systems)
- PassageSystem, PortalSystem, RealmManager
- DeathJudgmentSystem, DeathBargainSystem, DeathTransitionSystem
- AfterlifeNeedsSystem, AncestorTransformationSystem, ReincarnationSystem

### Governance (1 system)
- GovernanceDataSystem

### Automation & Factories (6 systems)
- PowerGridSystem, BeltSystem, DirectConnectionSystem
- AssemblyMachineSystem, FactoryAISystem, OffScreenProductionSystem

### Metrics (1 system)
- MetricsCollectionSystem (optional, streaming to dashboard)

### Auto-Save (1 system)
- AutoSaveSystem (optional)

---

## Data Flow

### Agent Decision Flow

```
Agent needs evaluation
    ↓
Autonomic check (critical needs: hunger, thirst, sleep)
    ↓ (if not critical)
LLM Decision (via AgentBrainSystem)
    ↓
Behavior selection (from prompt)
    ↓
Action creation
    ↓
Action queue
    ↓
Behavior execution (MovementSystem, other systems)
    ↓
Memory formation (MemoryFormationSystem)
    ↓
Event emission (EventBus)
```

### Event Flow

```
System emits event
    ↓
EventBus broadcasts
    ↓
Other systems listen
    ↓
React to event
    ↓
Potentially emit new events
```

**Example:** Plant harvested
1. PlantSystem emits `plant_harvested` event
2. MemoryFormationSystem listens, creates episodic memory
3. SkillSystem listens, grants farming XP
4. MetricsCollectionSystem listens, records harvest

### Memory Flow

```
Agent experiences event
    ↓
MemoryFormationSystem creates episodic memory
    ↓
MemoryConsolidationSystem promotes to semantic (over time)
    ↓
SpatialMemoryQuerySystem indexes by location
    ↓
Agent recalls in future decisions (via LLM context)
```

---

## Integration Points

### LLM Integration

**Package:** `@ai-village/llm`

**Key Components:**
- `LLMQueue` - Manages LLM requests, batching, retries
- `PromptBuilder` - Constructs agent prompts from world state
- `BehaviorParser` - Parses LLM responses to behaviors

**Systems Using LLM:**
- AgentBrainSystem (agent decisions)
- LandmarkNamingSystem (landmark names)
- MythGenerationSystem (myth creation)
- PrayerAnsweringSystem (divine responses)
- DivineChatSystem (god conversations)
- RiddleGenerator (death god riddles)

**Configuration:**
- Default: MLX server on macOS (http://localhost:8080)
- Fallback: Ollama (http://localhost:11434)
- Model: qwen3:1.7b / Qwen3-4B-Instruct-4bit

### Metrics Dashboard Integration

**Package:** `packages/core/src/metrics/`

**Flow:**
```
Game (browser) → WebSocket → Metrics Server (scripts/metrics-server.ts)
                                    ↓
                            Store in RingBuffer
                                    ↓
                            HTTP Dashboard (curl queries)
```

**Dashboard Endpoints:**
- `/dashboard?session=latest` - Main dashboard
- `/dashboard/agents?session=<id>` - Agent list
- `/dashboard/agent?id=<uuid>` - Detailed agent info
- `/dashboard/timeline?session=<id>` - Event timeline
- `/dashboard/resources?session=<id>` - Resource flow

**Metrics Collected:**
- Agent behavior, LLM calls, conversations
- Resource gathering/consumption
- Building construction
- Combat events
- Reproduction events
- Divine interactions

### Renderer Integration

**Package:** `@ai-village/renderer`

**Key Components:**
- `GameRenderer` - Main canvas rendering
- `Camera` - Viewport control, zoom
- `SpriteRegistry` - Sprite management
- `SpriteService` - On-demand sprite generation (PixelLab API)
- `ContextMenuManager` - Right-click menus
- `CombatHUD` - Combat UI

**Rendering Flow:**
```
World state → GameRenderer → Canvas context
                ↓
        Sprites (LPC, PixelLab)
                ↓
        UI Overlays (health bars, context menus, HUD)
```

**📖 See [Renderer Documentation](packages/renderer/README.md)** for complete rendering architecture, visual systems, and data flow details.

### World Generation Integration

**Package:** `@ai-village/world`

**Key Components:**
- `TerrainGenerator` - Procedural terrain (noise-based)
- `ChunkManager` - Chunk loading/unloading
- `BiomeSystem` - Biome classification

**Integration with Core:**
- Core defines `ITile`, `IChunk`, `IChunkManager` interfaces
- World package implements these interfaces
- Core systems query tiles via `world.getTile(x, y)`

---

## Next Steps

For detailed information on specific systems:

1. **[SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)** - Complete system reference
2. **[COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** - Component specifications
3. **[METASYSTEMS_GUIDE.md](./METASYSTEMS_GUIDE.md)** - Deep dives into metasystems
4. **[MASTER_ROADMAP.md](../MASTER_ROADMAP.md)** - Implementation status and phases

For specific feature documentation, see `architecture/` directory for detailed specs.
