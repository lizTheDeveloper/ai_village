# Core Package - Entity Component System & Game Systems

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the core package to understand the ECS architecture, system patterns, and integration points.

## Overview

The **Core Package** (`@ai-village/core`) is the foundational layer of the AI Village game engine. It implements:
- **Entity Component System (ECS)** - Data-oriented architecture separating data from logic
- **155+ Game Systems** - Agent AI, needs, memory, combat, building, economy, divinity, and more
- **Event Bus** - Decoupled communication between systems
- **Admin Dashboard** - Runtime introspection and control via HTTP API
- **State Management** - StateMutatorSystem for batched vector updates (60-1200× performance gains)
- **Simulation Scheduler** - Dwarf Fortress-style entity culling (97% reduction in processing)

**What an LLM working in core needs to know:**
- ECS fundamentals: Entities are containers, Components are data, Systems are logic
- Systems run in priority order (lower numbers first) at 20 TPS (ticks per second)
- Never mutate components directly - systems read, emit events, WorldMutator applies changes
- Performance patterns: query caching, squared distance, throttling, SimulationScheduler
- StateMutatorSystem: batched gradual changes (hunger decay, building deterioration, etc.)

---

## Package Structure

```
packages/core/
├── src/
│   ├── ecs/                          # ECS Architecture (READ FIRST)
│   │   ├── Entity.ts                 # Entity = ID + components
│   │   ├── Component.ts              # Component = data container
│   │   ├── System.ts                 # System = logic processor
│   │   ├── World.ts                  # World = entity registry + queries
│   │   ├── QueryBuilder.ts           # Fluent query API
│   │   ├── SimulationScheduler.ts    # Entity culling (ALWAYS/PROXIMITY/PASSIVE)
│   │   ├── SystemRegistry.ts         # System registration and execution
│   │   ├── ComponentRegistry.ts      # Component type registry
│   │   └── README.md                 # ECS architecture guide
│   │
│   ├── components/                   # 125+ Component Definitions
│   │   ├── AgentComponent.ts         # Agent entity data
│   │   ├── NeedsComponent.ts         # Hunger, energy, thirst
│   │   ├── MemoryComponents.ts       # Episodic, semantic, spatial memory
│   │   ├── PlantComponent.ts         # Plant lifecycle data
│   │   ├── BuildingComponent.ts      # Building state
│   │   └── ... (120+ more)
│   │
│   ├── systems/                      # 155+ System Implementations
│   │   ├── TimeSystem.ts             # Game time (priority 10)
│   │   ├── WeatherSystem.ts          # Weather patterns (priority 15)
│   │   ├── AgentBrainSystem.ts       # LLM-driven agent AI (priority 90)
│   │   ├── MovementSystem.ts         # Position updates (priority 100)
│   │   ├── NeedsSystem.ts            # Hunger/energy decay (priority 105)
│   │   ├── MemorySystem.ts           # Memory decay (priority 120)
│   │   ├── CombatSystem.ts           # Agent combat (priority 275)
│   │   ├── StateMutatorSystem.ts     # Batched vector updates (priority 5)
│   │   ├── AutoSaveSystem.ts         # Auto-save (priority 1000)
│   │   └── registerAllSystems.ts     # System registration order
│   │
│   ├── admin/                        # Admin Dashboard & Capabilities
│   │   ├── capabilities/             # HTTP API endpoints
│   │   │   ├── overview.ts           # System overview, TPS, entity counts
│   │   │   ├── agents.ts             # Agent queries, LLM provider control
│   │   │   ├── llm.ts                # LLM queue, providers, cooldowns
│   │   │   ├── universes.ts          # Universe management
│   │   │   ├── saves.ts              # Save/load, time travel
│   │   │   └── sprites.ts            # Sprite generation status
│   │   ├── CapabilityRegistry.ts     # Capability registration
│   │   └── AdminServer.ts            # HTTP server (port 8766)
│   │
│   ├── actions/                      # Action Handlers (Agent Commands)
│   │   ├── ActionHandler.ts          # Base action interface
│   │   ├── MovementActionHandler.ts  # Move, flee actions
│   │   ├── CraftingActionHandler.ts  # Craft, cook actions
│   │   ├── BuildingActionHandler.ts  # Build, repair actions
│   │   └── ... (15+ handlers)
│   │
│   ├── behavior/                     # Behavior Trees & AI
│   │   ├── behaviors/                # Agent behaviors (gather, craft, build, etc.)
│   │   ├── animal-behaviors/         # Animal AI (graze, flee, hunt)
│   │   └── BehaviorExecutor.ts       # Behavior execution engine
│   │
│   ├── events/                       # Event System
│   │   ├── EventBus.ts               # Central event dispatcher
│   │   ├── GameEvent.ts              # Event type definitions
│   │   └── event-schemas/            # Event type schemas
│   │
│   ├── types/                        # Type Definitions
│   │   ├── ComponentType.ts          # Component type constants (CT.*)
│   │   ├── SystemId.ts               # System ID constants
│   │   ├── EntityId.ts               # Entity ID type (UUID)
│   │   └── ... (25+ type files)
│   │
│   ├── utils/                        # Utility Functions
│   │   ├── math.ts                   # softmax, sigmoid, normalize, clamp
│   │   ├── spatial.ts                # Distance, angle calculations
│   │   ├── random.ts                 # Seeded random, weighted choice
│   │   └── performance.ts            # Performance monitoring
│   │
│   ├── genetics/                     # Genetics & Breeding
│   │   └── PlantGenetics.ts          # Plant genetics, mutations, hybridization
│   │
│   ├── crafting/                     # Crafting System
│   │   ├── RecipeRegistry.ts         # Recipe definitions
│   │   ├── CraftingValidator.ts      # Recipe validation
│   │   └── recipes/                  # Recipe files (tools, food, etc.)
│   │
│   ├── divinity/                     # Divinity & Religion Systems
│   │   ├── DeitySystem.ts            # God emergence, powers
│   │   ├── PrayerSystem.ts           # Prayer handling
│   │   ├── FaithMechanics.ts         # Faith generation, decay
│   │   └── ... (55+ divinity files)
│   │
│   ├── magic/                        # Magic System
│   │   ├── MagicSystem.ts            # Spell casting
│   │   ├── paradigms/                # 25+ magic paradigms
│   │   └── spells/                   # Spell definitions
│   │
│   ├── reproduction/                 # Reproduction Metasystem
│   │   ├── ReproductionSystem.ts     # Pregnancy, gestation, birth
│   │   ├── CourtshipSystem.ts        # Mate selection
│   │   └── midwifery/                # Labor, delivery, complications
│   │
│   ├── realms/                       # Realm System (Underworld, Celestial, etc.)
│   │   ├── RealmManager.ts           # Realm initialization
│   │   ├── PassageSystem.ts          # Realm transitions
│   │   └── AfterlifeSystem.ts        # Soul mechanics
│   │
│   ├── navigation/                   # Pathfinding & Navigation
│   │   ├── PathfindingSystem.ts      # A* pathfinding
│   │   ├── SteeringSystem.ts         # Steering behaviors
│   │   └── NavigationMesh.ts         # Navmesh generation
│   │
│   ├── buildings/                    # Building System
│   │   ├── BuildingRegistry.ts       # Building definitions
│   │   ├── BuildingValidator.ts      # Placement validation
│   │   └── templates/                # Building templates
│   │
│   ├── persistence/                  # Save/Load & Time Travel
│   │   ├── SaveLoadService.ts        # Save/load API
│   │   ├── SnapshotManager.ts        # Snapshot creation
│   │   └── TimeTravelService.ts      # Time travel mechanics
│   │
│   ├── metrics/                      # Metrics Collection
│   │   ├── MetricsCollector.ts       # Event collection
│   │   ├── MetricsServer.ts          # HTTP server (port 8766)
│   │   └── analyzers/                # Metric analyzers
│   │
│   ├── consciousness/                # Collective Consciousness
│   │   ├── HiveMindSystem.ts         # Eusocial insects (shared knowledge)
│   │   └── PackMindSystem.ts         # Wolf packs (coordinated hunting)
│   │
│   ├── multiverse/                   # Multiverse System
│   │   ├── MultiverseCoordinator.ts  # Universe management
│   │   └── UniverseForkingService.ts # Universe forking
│   │
│   ├── loop/                         # Game Loop
│   │   └── GameLoop.ts               # Fixed 20 TPS timestep
│   │
│   ├── World.ts                      # World class (top-level)
│   ├── EventBus.ts                   # EventBus class (top-level)
│   └── index.ts                      # Package exports
│
├── __tests__/                        # 90+ Test Files
│   ├── PlantSystem.test.ts
│   ├── NeedsSystem.test.ts
│   ├── MemorySystem.test.ts
│   └── ... (87+ more)
│
└── package.json
```

---

## Core Concepts

### 1. Entity Component System (ECS)

**ECS separates data (components) from logic (systems).**

#### Entities

Entities are UUID containers for components. They have no behavior.

```typescript
import { World } from '@ai-village/core';

// Create entity
const entity = world.createEntity();

// Entities are just IDs + component maps
interface Entity {
  readonly id: string;             // UUID
  readonly createdAt: number;      // Tick created
  readonly version: number;        // Increments on component changes
  readonly components: ReadonlyMap<ComponentType, Component>;

  hasComponent(type: ComponentType): boolean;
  getComponent<T>(type: ComponentType): T | undefined;
}
```

#### Components

Components are pure data containers. No methods, just data.

```typescript
// Component = data only, no logic
interface NeedsComponent {
  type: 'needs';                   // Component type (lowercase_with_underscores)
  version: number;                 // Increments on updates
  hunger: number;                  // 0-1 (0 = starving, 1 = full)
  energy: number;                  // 0-1 (0 = exhausted, 1 = rested)
  thirst: number;                  // 0-1 (0 = dehydrated, 1 = hydrated)
  social: number;                  // 0-1 (0 = lonely, 1 = fulfilled)
  cleanliness: number;             // 0-1 (0 = filthy, 1 = clean)
}

// Add component to entity
import { ComponentType as CT } from '@ai-village/core';
entity.addComponent({
  type: CT.Needs,
  version: 1,
  hunger: 0.8,
  energy: 0.6,
  thirst: 0.9,
  social: 0.5,
  cleanliness: 0.7
});
```

**Component Type Convention:** Use `lowercase_with_underscores` (NOT `PascalCase`).

```typescript
// GOOD: type = 'spatial_memory'; entity.hasComponent('steering');
// BAD: type = 'SpatialMemory'; entity.hasComponent('Steering');
```

#### Systems

Systems contain game logic. They read components, emit events, submit actions.

```typescript
import type { System } from '@ai-village/core';

class MySystem implements System {
  readonly id = 'my_system';       // Unique ID
  readonly priority = 100;         // Execution order (lower = earlier)
  readonly requiredComponents = ['position', 'velocity'];

  // Optional: Systems this depends on (for initialization order)
  readonly dependsOn = ['time', 'state_mutator'] as const;

  // Optional: Called once when registered
  initialize(world: World, eventBus: EventBus): void {
    // Setup
  }

  // Required: Called every tick for entities with required components
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Use SimulationScheduler to only process active entities
    const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of active) {
      const pos = entity.getComponent<PositionComponent>('position');
      const vel = entity.getComponent<VelocityComponent>('velocity');

      // Read data, emit events, submit actions
      // NEVER mutate components directly!
    }
  }

  // Optional: Handle events from other systems
  onEvent(event: GameEvent): void {
    if (event.type === 'agent_died') {
      // Handle event
    }
  }

  // Optional: Called when system is unregistered
  cleanup(): void {
    // Teardown
  }
}
```

**System Priority Ranges:**
- **1-10:** Infrastructure (Time, Weather, StateMutator)
- **40-50:** Plants, Animals
- **50-100:** Agent Core (Brain, Movement, Steering)
- **100-200:** Memory, Cognition, Skills
- **200-300:** Building, Crafting, Economy
- **300-500:** Combat, Divinity, Realms
- **900-999:** Utility (Metrics, Governance)
- **1000+:** Auto-save

#### World & Queries

World is the central registry for entities. Systems use queries to find entities.

```typescript
// Query entities with specific components
const agents = world.query()
  .with('agent', 'position')
  .without('dead')
  .executeEntities();

// Spatial queries
const nearbyEntities = world.query()
  .with('position')
  .inRect(x - 5, y - 5, 10, 10)
  .executeEntities();

// Chunk queries (fast spatial lookup)
const entitiesInChunk = world.query()
  .with('position')
  .inChunk(chunkX, chunkY)
  .executeEntities();

// Get singleton components (time, weather)
const time = world.getSingletonComponent<TimeComponent>('time');
```

**Performance: Cache queries before loops!**

```typescript
// ❌ BAD: Query in loop (queries every iteration)
for (const entity of entities) {
  const nearby = world.query().with('position').executeEntities(); // SLOW!
}

// ✅ GOOD: Query once, cache results
const allPositions = world.query().with('position').executeEntities();
for (const entity of entities) {
  // Use cached allPositions
}
```

### 2. Event-Driven Architecture

Systems communicate via events. Never call system methods directly.

```typescript
import { eventBus } from '@ai-village/core';

// Emit event
eventBus.emit({
  type: 'plant_harvested',
  agentId: agent.id,
  plantId: plant.id,
  speciesId: plant.speciesId,
  yield: 5,
  timestamp: world.tick
});

// Listen to events (in system.initialize())
eventBus.on('plant_harvested', (event) => {
  console.log(`Agent ${event.agentId} harvested ${event.yield} from ${event.speciesId}`);
});
```

**Common Event Patterns:**
- `agent:*` - Agent lifecycle events (spawned, died, leveled_up)
- `plant:*` - Plant events (stageChanged, died, harvested)
- `building:*` - Building events (completed, collapsed, repaired)
- `weather:*` - Weather events (rain, snow, clear)
- `combat:*` - Combat events (attacked, killed, damaged)

### 3. SimulationScheduler (Entity Culling)

**Dwarf Fortress-style entity culling reduces processing by 97%.**

**Three simulation modes:**

```typescript
enum SimulationMode {
  ALWAYS,     // Always simulate (agents, buildings) - critical entities
  PROXIMITY,  // Only when visible/near agents (plants, wild animals) - freezes off-screen
  PASSIVE     // Event-driven only (resources, items) - zero per-tick cost
}
```

**System usage:**

```typescript
update(world: World, entities: ReadonlyArray<Entity>): void {
  // Instead of processing all entities
  // const all = entities; // 4,000+ entities

  // Filter to only active entities (based on component type config)
  const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
  // Result: ~50-100 entities instead of 4,000+

  for (const entity of active) {
    // Process only visible/important entities
  }
}
```

**Configuration** (in `SimulationScheduler.ts`):

```typescript
SIMULATION_CONFIGS = {
  agent: { mode: SimulationMode.ALWAYS },              // Always simulate
  building: { mode: SimulationMode.ALWAYS },           // Always simulate
  plant: {                                             // Only near agents
    mode: SimulationMode.PROXIMITY,
    range: 15,                                         // Tiles from nearest agent
    updateFrequency: 86400                             // Check every 86400 ticks (1 day)
  },
  animal: { mode: SimulationMode.PROXIMITY, range: 20 },
  resource: { mode: SimulationMode.PASSIVE }           // Event-driven only
};
```

**Result:** Instead of updating 4,260 plants every tick, update ~50 visible plants.

---

## Systems by Category

**Total: 155+ systems organized by game subsystem.**

See [SYSTEMS_CATALOG.md](../../SYSTEMS_CATALOG.md) for complete reference with priorities, components, and file locations.

### Time & Environment (5 systems)

**Purpose:** World state - time, weather, temperature, climate, soil

| System | Priority | Throttle | Purpose |
|--------|----------|----------|---------|
| TimeSystem | 10 | - | Day/night cycle, tick → hour → day |
| WeatherSystem | 15 | 100 ticks | Rain, snow, clear weather |
| TemperatureSystem | 20 | - | Ambient temp, agent comfort, hypothermia |
| SoilSystem | 25 | 20 ticks | Moisture, nutrients, tilling |
| ClimateSystem | 35 | 200 ticks | Seasonal patterns, climate zones |

**Key components:** `time`, `weather`, `temperature`, `climate`

**Integration:** Weather affects plant hydration, temperature affects agent needs, soil feeds plants.

### Plants (3 systems)

**Purpose:** Plant lifecycle, diseases, species discovery

| System | Priority | Throttle | Purpose |
|--------|----------|----------|---------|
| PlantSystem | 40 | 20 ticks | Growth stages, fruiting, death |
| PlantDiscoverySystem | 45 | - | Agents discover new species |
| PlantDiseaseSystem | 50 | 50 ticks | Disease spread, pest damage |

**Key components:** `plant`, `seed`, `plant_knowledge`, `disease`

**See:** [Botany Package README](../botany/README.md) for comprehensive plant system docs.

### Animals (6 systems)

**Purpose:** Animal lifecycle, AI, production, housing, spawning, taming

| System | Priority | Purpose |
|--------|----------|---------|
| AnimalSystem | 55 | Hunger/thirst/age, natural death |
| AnimalBrainSystem | 56 | Animal AI (graze, flee, rest) |
| AnimalProductionSystem | 60 | Eggs, milk, wool production |
| AnimalHousingSystem | 65 | Pens, coops, shelter benefits |
| WildAnimalSpawningSystem | 70 | Spawn wild animals on map |
| TamingSystem | 75 | Domesticate wild animals |

**Key components:** `animal`, `production`, `taming`, `housing`

### Agent Core (6 systems)

**Purpose:** Agent decision-making, movement, needs, mood, sleep

| System | Priority | Purpose |
|--------|----------|---------|
| IdleBehaviorSystem | 80 | Default behaviors when no action |
| GoalGenerationSystem | 85 | Generate goals from needs/context |
| AgentBrainSystem | 90 | LLM-driven decision-making |
| SteeringSystem | 95 | Seek, arrive, avoid, wander |
| MovementSystem | 100 | Apply velocity to position |
| NeedsSystem | 105 | Hunger/energy decay (uses StateMutator) |
| MoodSystem | 110 | Mood = f(hunger, energy, social) |
| SleepSystem | 115 | Sleep drive, energy recovery, dreams |

**Key components:** `agent`, `behavior`, `needs`, `mood`, `circadian`, `position`, `velocity`, `steering`

**AgentBrainSystem dependencies:** Requires `llmQueue` from `@ai-village/llm` package.

**Pattern:** Brain decides action → Movement executes → Needs decay → Mood updates → Sleep when tired

### Memory & Cognition (7 systems)

**Purpose:** Memory formation, consolidation, reflection, beliefs, journaling

| System | Priority | Throttle | Purpose |
|--------|----------|----------|---------|
| MemorySystem | 120 | 100 ticks | Decay old memories, capacity limits |
| MemoryFormationSystem | 125 | - | Create episodic memories from events |
| MemoryConsolidationSystem | 130 | 1000 ticks | Episodic → semantic consolidation |
| SpatialMemoryQuerySystem | 135 | - | Index memories by location |
| ReflectionSystem | 140 | 500 ticks | Reflect on experiences, form beliefs |
| JournalingSystem | 145 | 1440 ticks | Daily journal entries |
| BeliefFormationSystem | 150 | - | Form beliefs from observations |
| BeliefGenerationSystem | 155 | - | Generate beliefs about deities |

**Key components:** `episodic_memory`, `semantic_memory`, `spatial_memory`, `reflection`, `journaling`, `belief`

**Pattern:** Events → Episodic → Consolidation → Semantic → Reflection → Beliefs

### Social & Communication (5 systems)

**Purpose:** Speech, conversations, social gradients, verification, interests

| System | Priority | Purpose |
|--------|----------|---------|
| CommunicationSystem | 160 | Speech, conversations, hearing range |
| SocialGradientSystem | 165 | Social density, loneliness seeking |
| VerificationSystem | 170 | Cross-check facts, consensus building |
| InterestsSystem | 175 | Track hobbies, shared interests |
| ChatRoomSystem | 180 | DMs, group chat, divine chat |

**Key components:** `conversation`, `social_gradient`, `interests`, `chat_room`, `chat_participant`

### Exploration & Navigation (2 systems)

**Purpose:** Explore world, name landmarks

| System | Priority | Purpose |
|--------|----------|---------|
| ExplorationSystem | 185 | Track explored areas, frontier |
| LandmarkNamingSystem | 190 | Name geographic features (LLM) |

**Key components:** `exploration`, `landmark`

### Building & Construction (7 systems)

**Purpose:** Build, maintain, place, gather, fell trees, tile construction, doors

| System | Priority | Purpose |
|--------|----------|---------|
| BuildingSystem | 195 | Construction progress, completion |
| BuildingMaintenanceSystem | 200 | Decay, repair, collapse |
| BuildingSpatialAnalysisSystem | 205 | Placement scoring, Feng Shui |
| ResourceGatheringSystem | 210 | Gather resources, deplete nodes |
| TreeFellingSystem | 215 | Cut trees, drop wood |
| TileConstructionSystem | 220 | Voxel building (walls, floors, doors) |
| DoorSystem | 225 | Auto-open/close, locked doors |

**Key components:** `building`, `construction`, `maintenance`, `durability`, `door`, `tile_construction`

**Pattern:** TileConstructionSystem is singleton - use `getTileConstructionSystem()`.

### Economy & Trade (3 systems)

**Purpose:** Trading, market events, currency

| System | Priority | Purpose |
|--------|----------|---------|
| TradingSystem | 230 | Agent-to-agent trading, prices |
| MarketEventSystem | 235 | Supply/demand fluctuations |
| CurrencySystem | 240 | Money supply, inflation |

**Key components:** `trade`, `market`, `economy`, `currency`, `wallet`

### Skills & Crafting (4 systems)

**Purpose:** Skill progression, cooking, durability, crafting

| System | Priority | Purpose |
|--------|----------|---------|
| SkillSystem | 245 | XP tracking, level up, unlocks |
| CookingSystem | 250 | Cook food, recipes, quality |
| DurabilitySystem | 255 | Tool/equipment wear, repair |
| CraftingSystem | 260 | Recipe-based crafting, quality |

**Key components:** `skills`, `cooking`, `durability`, `crafting_job`, `inventory`

### Research (1 system)

**Purpose:** Tech progression, unlock new content

| System | Priority | Status |
|--------|----------|--------|
| ResearchSystem | 265 | ✅ Complete (Phase 13) |

**Key components:** `research`

### Magic (1 system)

**Purpose:** Spell casting, mana management, paradigms

| System | Priority | Status |
|--------|----------|--------|
| MagicSystem | 270 | ⚠️ Framework exists, paradigms incomplete |

**Key components:** `magic`, `mana`, `spell_casting`

### Combat & Security (7 systems)

**Purpose:** Combat, hunting, predators, dominance, injuries, guards, defense

| System | Priority | Purpose |
|--------|----------|---------|
| AgentCombatSystem | 275 | Agent vs agent combat |
| HuntingSystem | 280 | Hunt wild animals |
| PredatorAttackSystem | 285 | Wild predators attack agents |
| DominanceChallengeSystem | 290 | Social dominance fights |
| InjurySystem | 295 | Injuries, healing, infection |
| GuardDutySystem | 300 | Patrols, intruder detection |
| VillageDefenseSystem | 305 | Coordinate defense, raids |

**Key components:** `combat`, `health`, `injury`, `hunting`, `predator`, `dominance`, `guard`, `defense`

### Body & Reproduction (6 systems)

**Purpose:** Body parts, equipment, pregnancy, courtship, midwifery, parenting

| System | Priority | Status |
|--------|----------|--------|
| BodySystem | 310 | ✅ Basic implementation |
| EquipmentSystem | 315 | ⏳ Ready to implement (Phase 36) |
| ReproductionSystem | 320 | ✅ Complete (Phase 37) |
| CourtshipSystem | 325 | ✅ Complete (Phase 37) |
| MidwiferySystem | 330 | ✅ Complete (Phase 37) |
| ParentingSystem | 335 | ✅ Complete (Phase 37) |
| JealousySystem | 340 | ⚠️ Incomplete, disabled |

**Key components:** `body`, `equipment`, `pregnancy`, `reproduction`, `courtship`, `labor`, `midwife`, `parenting`, `infant`, `child`, `jealousy`

**See:** [METASYSTEMS_GUIDE.md](../../METASYSTEMS_GUIDE.md#reproduction-system) for reproduction metasystem details.

### Divinity - Core (6 systems)

**Purpose:** God emergence, AI gods, divine powers, faith, prayer

| System | Priority | Purpose |
|--------|----------|---------|
| DeityEmergenceSystem | 345 | Gods emerge from belief |
| AIGodBehaviorSystem | 350 | AI-controlled god decisions |
| DivinePowerSystem | 355 | Blessings, curses, miracles |
| FaithMechanicsSystem | 360 | Faith generation, decay |
| PrayerSystem | 365 | Process prayers from agents |
| PrayerAnsweringSystem | 370 | Gods answer prayers (LLM) |
| MythGenerationSystem | 375 | Generate myths (LLM) |
| DivineChatSystem | 380 | God-to-god chat (deprecated) |

**Key components:** `deity`, `belief`, `divine_power`, `prayer`, `myth`, `divine_chat`

### Divinity - Institutions (5 systems)

**Purpose:** Temples, priests, rituals, holy texts, sacred sites

| System | Priority | Purpose |
|--------|----------|---------|
| TempleSystem | 385 | Temples, shrines, offerings |
| PriesthoodSystem | 390 | Priests, religious hierarchy |
| RitualSystem | 395 | Ceremonies, ritual effects |
| HolyTextSystem | 400 | Scripture, interpretation |
| SacredSiteSystem | 405 | Sacred groves, pilgrimage |

**Key components:** `temple`, `priest`, `ritual`, `holy_text`, `sacred_site`

### Divinity - Avatar & Angels (4 systems)

**Purpose:** God avatars, angels, possession, player control

| System | Priority | Purpose |
|--------|----------|---------|
| AvatarSystem | 410 | God avatars in mortal world |
| AngelSystem | 415 | Divine servants, messengers |
| PossessionSystem | 420 | God possesses mortal |
| PlayerInputSystem | 425 | Keyboard/mouse control |

**Key components:** `avatar`, `angel`, `possession`, `player_controlled`

### Divinity - Advanced Theology (4 systems)

**Purpose:** Religious splits, fusion, competition, warfare

| System | Priority | Purpose |
|--------|----------|---------|
| SchismSystem | 430 | Religious splits, heresies |
| SyncretismSystem | 435 | Religious fusion, blending |
| ReligiousCompetitionSystem | 440 | Proselytization, conversion |
| ConversionWarfareSystem | 445 | Forced conversion, religious wars |

**Key components:** `schism`, `syncretism`, `religion`, `conversion`

### Divinity - World Impact (5 systems)

**Purpose:** Terraform, create species, weather control, body modification, mass events

| System | Priority | Purpose |
|--------|----------|---------|
| TerrainModificationSystem | 450 | Raise mountains, create lakes |
| SpeciesCreationSystem | 455 | Create new creatures |
| DivineWeatherControl | 460 | Summon rain, clear storms |
| DivineBodyModification | 465 | Heal, grant wings, curse |
| MassEventSystem | 470 | Floods, plagues, dramatic events |

**Key components:** `terrain_modification`, `species_template`, `divine_weather`, `mass_event`

### Divinity - Creator (5 systems)

**Purpose:** Player oversight, meta-level awareness, direct interventions

| System | Priority | Purpose |
|--------|----------|---------|
| CreatorSurveillanceSystem | 475 | Track player actions, 4th wall |
| CreatorInterventionSystem | 480 | Debug tools, spawn entities |
| LoreSpawnSystem | 485 | Lore-consistent content |
| RealityAnchorSystem | 490 | Stabilize reality, prevent chaos |
| RebellionEventSystem | 495 | Agents/gods rebel against creator |

**Key components:** `creator`, `intervention`, `lore`, `reality_anchor`, `rebellion`

### Realms & Portals (10 systems)

**Purpose:** Underworld, afterlife, soul mechanics, realm transitions

| System | Priority | Status |
|--------|----------|--------|
| PassageSystem | 500 | Realm transitions |
| PortalSystem | 505 | Instant travel |
| RealmTimeSystem | 510 | Time dilation/contraction |
| DeathJudgmentSystem | 515 | ✅ Complete (Phase 35) |
| DeathBargainSystem | 520 | ⚠️ Incomplete, disabled |
| DeathTransitionSystem | 525 | ⚠️ Incomplete, disabled |
| RealmManager | 530 | Realm initialization |
| AfterlifeNeedsSystem | 535 | Soul needs (uses StateMutator) |
| AncestorTransformationSystem | 540 | Souls become ancestors |
| ReincarnationSystem | 545 | Souls reborn |
| AfterlifeMemoryFadingSystem | 550 | Souls forget mortal life |

**Key components:** `realm`, `passage`, `portal`, `soul`, `judgment`, `ancestor`, `reincarnation`

### Automation & Factories (5 systems)

**Purpose:** Power grids, conveyor belts, assembly machines, factory AI

| System | Priority | Status |
|--------|----------|--------|
| FactoryAISystem | 48 | ✅ Complete (Phase 38) |
| OffScreenProductionSystem | 49 | ✅ Complete (Phase 38) |
| PowerGridSystem | 50 | ✅ Complete (Phase 38) |
| BeltSystem | 51 | ✅ Complete (Phase 38) |
| DirectConnectionSystem | 52 | ✅ Complete (Phase 38) |
| AssemblyMachineSystem | 53 | ✅ Complete (Phase 38) |

**Key components:** `power_generator`, `power_consumer`, `power_grid`, `belt`, `belt_item`, `direct_connection`, `assembly_machine`, `factory_ai`

**Pattern:** Early priority (48-53) for optimization systems to run before full simulation.

### Governance & Metrics (2 systems)

**Purpose:** Governance data, metrics collection

| System | Priority | Status |
|--------|----------|--------|
| GovernanceDataSystem | 555 | ⏳ Basic data tracking |
| MetricsCollectionSystem | 999 | ✅ Optional (config-enabled) |

**Key components:** `governance`, `metrics`

**MetricsCollectionSystem:** Streams events to metrics server (port 8766) for dashboard.

### Consciousness (2 systems)

**Purpose:** Collective intelligence (hive minds, pack minds)

| System | Priority | Purpose |
|--------|----------|---------|
| HiveMindSystem | 560 | Insect colonies (shared knowledge) |
| PackMindSystem | 565 | Wolf packs (coordinated hunting) |

**Key components:** `hive_mind`, `hive_member`, `pack_mind`, `pack_member`

### Utility Systems (1 system)

**Purpose:** Auto-save, background services

| System | Priority | Throttle | Purpose |
|--------|----------|----------|---------|
| AutoSaveSystem | 1000 | 6000 ticks | Periodic auto-save (~5 min) |

**Key components:** None (operates on World)

---

## Performance Pattern: StateMutatorSystem

**The StateMutatorSystem provides batched vector updates for gradual state changes, achieving 60-1200× performance improvements.**

### The Problem

Many game systems need to apply small, predictable changes every tick:
- **NeedsSystem**: Hunger/energy decay (updates 20 times per second)
- **BuildingMaintenanceSystem**: Building condition decay
- **PlantSystem**: Plant growth and aging
- **AnimalSystem**: Hunger/thirst/energy changes

Updating these every tick is expensive and unnecessary for gradual changes.

### The Solution: Batched Vector Updates

Instead of updating every tick, systems register **delta rates** (change per game minute) and `StateMutatorSystem` applies them in batches.

```typescript
// ❌ OLD: Update every tick (20 TPS)
update(world, entities, deltaTime) {
  for (const agent of agents) {
    agent.hunger -= 0.0008 * deltaTime;  // Tiny change every tick
  }
}
// 100 agents × 20 updates/sec = 2000 updates/sec

// ✅ NEW: Register delta rate (update once per game minute)
update(world, entities, deltaTime) {
  if (currentTick - lastUpdate >= 1200) { // Once per minute
    for (const agent of agents) {
      stateMutator.registerDelta({
        entityId: agent.id,
        field: 'hunger',
        deltaPerMinute: -0.0008,  // Rate per game minute
        min: 0, max: 1,
      });
    }
  }
}
// 100 agents × 1 update/60sec = 1.67 updates/sec (60× reduction)
```

### Performance Impact

**For 100 agents with hunger + energy:**
- **Before:** 4,000 field updates/sec
- **After:** 3.33 field updates/sec
- **Reduction:** 1,200× fewer updates

**System overhead:**
- Needs system: Every tick → Once per minute (60× reduction)
- StateMutatorSystem: Negligible (batches all deltas once per minute)

### Adopted Systems

1. **NeedsSystem** - Agent hunger/energy decay
2. **BuildingMaintenanceSystem** - Building condition decay
3. **AnimalSystem** - Animal needs, aging, and lifecycle
4. **PlantSystem** - Plant hydration/age/health decay
5. **TemperatureSystem** - Health damage from dangerous temperatures
6. **BodySystem** - Blood loss/recovery and injury/part healing (nested deltas)
7. **SleepSystem** - Sleep drive accumulation/depletion and energy recovery
8. **AfterlifeNeedsSystem** - Spiritual needs decay for souls in the Underworld (coherence, tether, solitude, peace)
9. **AssemblyMachineSystem** - Automated crafting progress with power and speed modifiers
10. **ResourceGatheringSystem** - Resource regeneration for 250k+ harvestable resources

### Usage Guide

#### 1. System Setup

Add dependency and reference:

```typescript
import type { StateMutatorSystem } from './StateMutatorSystem.js';

export class MySystem implements System {
  public readonly dependsOn = ['state_mutator'] as const;
  private stateMutator: StateMutatorSystem | null = null;
  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute
  private deltaCleanups = new Map<string, () => void>();

  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }
}
```

#### 2. Register Deltas

Update rates periodically (e.g., once per game minute):

```typescript
update(world: World, entities: ReadonlyArray<Entity>) {
  if (!this.stateMutator) {
    throw new Error('[MySystem] StateMutatorSystem not set');
  }

  const shouldUpdateRates = world.tick - this.lastUpdateTick >= this.UPDATE_INTERVAL;

  for (const entity of entities) {
    if (shouldUpdateRates) {
      // Clean up old delta
      if (this.deltaCleanups.has(entity.id)) {
        this.deltaCleanups.get(entity.id)!();
      }

      // Register new delta rate
      const cleanup = this.stateMutator.registerDelta({
        entityId: entity.id,
        componentType: CT.MyComponent,
        field: 'myField',
        deltaPerMinute: -0.05,  // Decay rate per game minute
        min: 0,
        max: 100,
        source: 'my_system',
      });

      this.deltaCleanups.set(entity.id, cleanup);
    }
  }

  if (shouldUpdateRates) {
    this.lastUpdateTick = world.tick;
  }
}
```

#### 3. Wire Up in registerAllSystems

```typescript
// In registerAllSystems.ts
const stateMutator = new StateMutatorSystem();
gameLoop.systemRegistry.register(stateMutator);

const mySystem = new MySystem();
mySystem.setStateMutatorSystem(stateMutator);
gameLoop.systemRegistry.register(mySystem);
```

### Advanced Features

#### Expiration (Buffs, Bandages, Potions)

**Time-based expiration:**
```typescript
registerDelta({
  entityId: agent.id,
  field: 'speed',
  deltaPerMinute: 0,  // Instant effect
  expiresAtTick: world.tick + (1200 * 5),  // 5 game minutes
  source: 'speed_buff',
});
```

**Amount-based expiration:**
```typescript
registerDelta({
  entityId: agent.id,
  field: 'hp',
  deltaPerMinute: +10,
  totalAmount: 20,  // Expires after 20 hp healed
  source: 'bandage',
});
```

#### Dynamic Rates

Update rates when conditions change:

```typescript
// Base energy decay
let energyDecay = -0.0003;  // Idle

// Activity-based modification
if (agent.behavior === 'gather') {
  energyDecay = -0.0008;  // Working
} else if (agent.isRunning) {
  energyDecay = -0.0012;  // Running
}

// Register updated rate
stateMutator.registerDelta({
  entityId: agent.id,
  field: 'energy',
  deltaPerMinute: energyDecay,
  min: 0, max: 1,
  source: 'needs_energy_decay',
});
```

#### UI Interpolation

Get smooth interpolated values between batch updates:

```typescript
// In NeedsSystem
getInterpolatedValue(
  world: World,
  entityId: string,
  field: 'hunger' | 'energy',
  currentValue: number
): number {
  if (!this.stateMutator) return currentValue;

  return this.stateMutator.getInterpolatedValue(
    entityId,
    CT.Needs,
    field,
    currentValue,
    world.tick
  );
}

// In UI code
const needsSystem = world.systemRegistry.get('needs') as NeedsSystem;
const displayHunger = needsSystem.getInterpolatedValue(
  world,
  agent.id,
  'hunger',
  needs.hunger
);
hungerBar.setProgress(displayHunger); // Smooth animation!
```

### When to Use StateMutatorSystem

✅ **Good candidates:**
- Slow, predictable changes (needs decay, passive regeneration)
- Effects that accumulate (damage over time, buffs/debuffs)
- Many entities with similar rates (100+ agents)
- Non-critical timing (UI updates can be delayed by 1 minute)

❌ **Bad candidates:**
- Instant changes (taking damage from attack - apply immediately!)
- Critical game logic (agent death checks - need immediate response)
- Irregular patterns (random events - can't predict rate)
- Few entities (< 10 entities don't benefit from batching)

### Cleanup Pattern

Always clean up deltas when no longer needed:

```typescript
// Pattern 1: Temporary effect
const cleanup = stateMutator.registerDelta({ ... });
setTimeout(cleanup, effectDuration);

// Pattern 2: Condition-based
let cleanup: (() => void) | null = null;

if (shouldApplyEffect && !cleanup) {
  cleanup = stateMutator.registerDelta({ ... });
} else if (!shouldApplyEffect && cleanup) {
  cleanup();
  cleanup = null;
}

// Pattern 3: Entity death/removal
stateMutator.clearEntityDeltas(entityId);
```

### Debug Tools

```typescript
const info = stateMutator.getDebugInfo();
console.log(`Entities with deltas: ${info.entityCount}`);
console.log(`Total deltas: ${info.deltaCount}`);
console.log('Deltas by source:', info.deltasBySource);

// Output:
// Entities with deltas: 100
// Total deltas: 250
// Deltas by source: Map {
//   'needs_hunger_decay' => 100,
//   'needs_energy_decay' => 100,
//   'building_maintenance' => 50
// }
```

---

## Common Patterns

### Pattern 1: Adding a New System

```typescript
// 1. Create system class
import type { System } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

export class MyNewSystem implements System {
  readonly id = 'my_new_system';
  readonly priority = 123; // Choose appropriate priority
  readonly requiredComponents = [CT.MyComponent];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of active) {
      const myComp = entity.getComponent<MyComponent>(CT.MyComponent);
      if (!myComp) continue;

      // Logic here
    }
  }
}

// 2. Register in registerAllSystems.ts
import { MyNewSystem } from './MyNewSystem.js';

// In registerAllSystems function:
gameLoop.systemRegistry.register(new MyNewSystem());

// 3. Update SYSTEMS_CATALOG.md with system details
```

### Pattern 2: Query Optimization

```typescript
// ❌ BAD: Multiple queries, query in loop
update(world: World, entities: ReadonlyArray<Entity>): void {
  for (const entity of entities) {
    const nearby = world.query().with('position').executeEntities(); // Query every iteration!
    const agents = world.query().with('agent').executeEntities();    // Another query!
  }
}

// ✅ GOOD: Cache queries before loops
update(world: World, entities: ReadonlyArray<Entity>): void {
  const allPositions = world.query().with('position').executeEntities();
  const allAgents = world.query().with('agent').executeEntities();

  for (const entity of entities) {
    // Use cached results
  }
}
```

### Pattern 3: Squared Distance (No Math.sqrt)

```typescript
// ❌ BAD: Math.sqrt in hot path
const distance = Math.sqrt(dx*dx + dy*dy);
if (distance < radius) { }

// ✅ GOOD: Squared comparison
const distSq = dx*dx + dy*dy;
if (distSq < radius*radius) { }
```

### Pattern 4: Throttled Systems

```typescript
export class MySlowSystem implements System {
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 100; // Every 5 seconds (100 ticks at 20 TPS)

  update(world: World, entities: ReadonlyArray<Entity>): void {
    // Throttle: only run every UPDATE_INTERVAL ticks
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    // Actual logic (runs every 5 seconds instead of every 50ms)
    for (const entity of entities) {
      // ...
    }
  }
}
```

### Pattern 5: Event Handling

```typescript
export class MySystem implements System {
  initialize(world: World, eventBus: EventBus): void {
    // Subscribe to events
    eventBus.on('plant_harvested', this.onPlantHarvested.bind(this));
    eventBus.on('agent_died', this.onAgentDied.bind(this));
  }

  private onPlantHarvested(event: PlantHarvestedEvent): void {
    console.log(`Agent ${event.agentId} harvested ${event.yield} from ${event.speciesId}`);
  }

  private onAgentDied(event: AgentDiedEvent): void {
    console.log(`Agent ${event.agentId} died: ${event.cause}`);
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    // Main logic

    // Emit events
    world.eventBus.emit({
      type: 'custom_event',
      data: { ... }
    });
  }
}
```

### Pattern 6: Singleton Component Access

```typescript
export class MySystem implements System {
  // Cache singleton entity ID to avoid querying every tick
  private timeEntityId: string | null = null;

  update(world: World, entities: ReadonlyArray<Entity>): void {
    // Get singleton component (time, weather, etc.)
    if (!this.timeEntityId) {
      const timeEntities = world.query().with('time').executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0].id;
      }
    }

    if (this.timeEntityId) {
      const time = world.getComponent<TimeComponent>(this.timeEntityId, 'time');
      // Use time component
    }
  }
}
```

### Pattern 7: System Dependencies

```typescript
export class DependentSystem implements System {
  readonly dependsOn = ['time', 'weather', 'state_mutator'] as const;

  private timeSystem: TimeSystem | null = null;
  private weatherSystem: WeatherSystem | null = null;
  private stateMutator: StateMutatorSystem | null = null;

  // Called by registerAllSystems during initialization
  setTimeSystem(timeSystem: TimeSystem): void {
    this.timeSystem = timeSystem;
  }

  setWeatherSystem(weatherSystem: WeatherSystem): void {
    this.weatherSystem = weatherSystem;
  }

  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    if (!this.timeSystem || !this.weatherSystem || !this.stateMutator) {
      throw new Error('[DependentSystem] Dependencies not set');
    }

    // Use systems
  }
}
```

---

## Admin Dashboard Integration

**Admin Dashboard** provides runtime introspection and control via HTTP API.

**URL:** `http://localhost:8766/admin`

**Capabilities:** Each tab in the dashboard is a capability module with queries (read-only) and actions (state-changing).

### Query Examples

```bash
# Get all LLM providers and their stats
curl http://localhost:8766/admin/queries/providers?format=json

# Get agent details
curl http://localhost:8766/admin/queries/agent?id=agent_uuid&format=json

# Get universe list
curl http://localhost:8766/admin/queries/universes?format=json
```

### Action Examples

```bash
# Set agent LLM provider
curl -X POST http://localhost:8766/admin/actions/set-agent-llm \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent_uuid", "provider": "groq"}'

# Save universe
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:main", "name": "checkpoint_1"}'
```

### Adding New Capabilities

```typescript
// 1. Create capability file in admin/capabilities/
import { defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const myCapability = defineCapability({
  id: 'my_capability',
  name: 'My Capability',
  description: 'Does something useful'
});

// 2. Define queries
const myQuery = defineQuery({
  id: 'my_query',
  capability: 'my_capability',
  handler: async (params) => {
    // Return data
    return { result: 'data' };
  }
});

// 3. Define actions
const myAction = defineAction({
  id: 'my_action',
  capability: 'my_capability',
  handler: async (params) => {
    // Modify state
    return { success: true };
  }
});

// 4. Register
import { capabilityRegistry } from '../CapabilityRegistry.js';
capabilityRegistry.register(myCapability);
capabilityRegistry.registerQuery(myQuery);
capabilityRegistry.registerAction(myAction);
```

**See:** `admin/capabilities/llm.ts` for a complete example.

---

## Integration Examples

### Example 1: Agent Harvests Plant

**System interactions:**

```
1. AgentBrainSystem (priority 90)
   → Decides: "I should harvest that wheat plant"
   → Submits action: { type: 'harvest_plant', plantId: 'plant_123' }

2. PlantActionHandler (executed by game loop)
   → Validates: Plant exists, agent nearby, plant harvestable
   → Removes fruit from plant component
   → Adds seeds to agent inventory
   → Emits event: 'plant_harvested'

3. PlantSystem (priority 40) - next tick
   → Receives 'plant_harvested' event
   → Checks if harvest destroys plant (wheat = yes)
   → Sets plant.stage = 'dead'

4. PlantDiscoverySystem (priority 45)
   → Receives 'plant_harvested' event
   → Checks if agent knows species
   → If new: adds to agent.plant_knowledge
   → Creates episodic memory: "I discovered wheat!"

5. MemoryFormationSystem (priority 125)
   → Receives 'plant_harvested' event
   → Creates episodic memory: "I harvested 5 wheat at (50, 50)"

6. SkillSystem (priority 245)
   → Receives 'plant_harvested' event
   → Grants farming XP to agent
   → Checks for level up
```

### Example 2: Agent Gets Hungry → Eats Food

```
1. NeedsSystem (priority 105)
   → Uses StateMutatorSystem to decay hunger
   → hunger = 0.3 (threshold: 0.4)
   → Emits event: 'agent_hungry' (first time below threshold)

2. GoalGenerationSystem (priority 85) - next tick
   → Receives 'agent_hungry' event
   → Creates goal: { type: 'satisfy_hunger', priority: 0.8 }

3. AgentBrainSystem (priority 90)
   → Sees goal: 'satisfy_hunger'
   → Checks inventory for food
   → Decides: "I should eat this bread"
   → Submits action: { type: 'eat', itemId: 'bread_456' }

4. InventoryActionHandler (executed by game loop)
   → Validates: Item exists, item is edible
   → Removes item from inventory
   → Increases needs.hunger by item.nutritionValue
   → Emits event: 'agent_ate'

5. NeedsSystem (priority 105) - next tick
   → hunger = 0.8 (above threshold)
   → No longer emits 'agent_hungry'

6. MoodSystem (priority 110)
   → Recalculates mood based on needs
   → mood improves (hunger satisfied)

7. MemoryFormationSystem (priority 125)
   → Receives 'agent_ate' event
   → Creates episodic memory: "I ate bread and felt better"
```

### Example 3: Weather Affects Plants

```
1. TimeSystem (priority 10)
   → Advances time: hour++
   → Emits event: 'hour_changed'

2. WeatherSystem (priority 15)
   → Receives 'hour_changed' event
   → Random weather transition: clear → rain
   → Emits event: 'weather:rain'

3. PlantSystem (priority 40)
   → Receives 'weather:rain' event
   → Increases plant.hydration by 10-20 (depending on intensity)
   → Emits event: 'plant:hydration_changed'

4. SoilSystem (priority 25) - next tick
   → Receives 'weather:rain' event
   → Increases soil.moisture for all tiles
   → Emits event: 'soil:moisture_changed'

5. PlantSystem (priority 40) - next tick
   → Receives 'soil:moisture_changed' event
   → Transfers moisture from soil to plant.hydration
   → If hydration high: faster growth (stageProgress++)
```

---

## Performance Considerations

**The ECS runs at 20 TPS (ticks per second). Each tick has 50ms budget.**

### Performance Checklist

✅ **Query caching** - Cache queries before loops, not inside loops
✅ **Squared distance** - Use `dx*dx + dy*dy < r*r` instead of `Math.sqrt()`
✅ **Throttling** - Non-critical systems can run every N ticks (e.g., every 100 ticks = 5 seconds)
✅ **SimulationScheduler** - Use `filterActiveEntities()` to process only visible/important entities
✅ **StateMutatorSystem** - Use for gradual changes (hunger decay, building deterioration)
✅ **Singleton caching** - Cache singleton entity IDs (time, weather) to avoid repeated queries
✅ **Early returns** - Exit early if preconditions fail (entity dead, component missing)

### Performance Anti-Patterns

❌ **Query in loop** - Queries every iteration instead of once before loop
❌ **Math.sqrt in hot path** - Use squared distance comparisons
❌ **Every-tick updates** - Slow-changing state (hunger decay) should throttle or use StateMutator
❌ **console.log in systems** - Only use `console.error` for actual errors
❌ **Repeated singleton queries** - Cache singleton entity IDs
❌ **Processing all entities** - Use SimulationScheduler to filter to active entities

### Performance Metrics

**TPS (Ticks Per Second):** Target = 20 TPS (50ms per tick)
- **Good:** 18-20 TPS (smooth gameplay)
- **Warning:** 15-18 TPS (noticeable lag)
- **Bad:** < 15 TPS (unplayable)

**Entity counts:**
- **Total entities:** 4,000-6,000 (world, agents, plants, animals, buildings, items)
- **Active entities:** 50-150 (visible/important entities processed per tick)
- **Reduction:** 97% (SimulationScheduler culling)

**See:** [PERFORMANCE.md](../../PERFORMANCE.md) for comprehensive performance guide.

---

## Troubleshooting

### System not running

**Check:**
1. Registered in `registerAllSystems.ts`?
2. Priority set correctly? (lower = earlier)
3. Required components exist?
4. System enabled? (not commented out)

**Debug:**
```typescript
// In browser console
window.game.gameLoop.systemRegistry.getSystems().forEach(s => {
  console.log(`${s.id}: priority ${s.priority}`);
});
```

### Entities not processed

**Check:**
1. Query has correct components? (`with('agent', 'position')`)
2. Entities have required components? (`entity.hasComponent('position')`)
3. SimulationScheduler mode? (PROXIMITY entities only process when visible)

**Debug:**
```typescript
// In system.update()
console.log(`Total entities: ${entities.length}`);
const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
console.log(`Active entities: ${active.length}`);
```

### Events not firing

**Check:**
1. Event listener registered in `initialize()`?
2. Event type string correct? (`'plant_harvested'` not `'plantHarvested'`)
3. Event emitted with correct structure?

**Debug:**
```typescript
// In system.initialize()
eventBus.on('*', (event) => {
  console.log('Event:', event.type, event);
});
```

### StateMutatorSystem not updating

**Check:**
1. System has `dependsOn = ['state_mutator']`?
2. `setStateMutatorSystem()` called in `registerAllSystems.ts`?
3. Delta registered correctly? (entityId, componentType, field, deltaPerMinute)
4. Delta cleanup on entity death?

**Debug:**
```typescript
// In browser console
const stateMutator = window.game.gameLoop.systemRegistry.get('state_mutator');
const info = stateMutator.getDebugInfo();
console.log('StateMutator:', info);
```

### Performance issues (low TPS)

**Check:**
1. Systems throttled? (non-critical systems should throttle)
2. SimulationScheduler used? (`filterActiveEntities()`)
3. Queries cached? (not querying in loops)
4. Math.sqrt avoided? (use squared distance)
5. console.log removed? (no debug output in systems)

**Debug:**
```typescript
// In browser console
const stats = window.game.gameLoop.getSystemStats();
stats.forEach(s => {
  console.log(`${s.systemId}: ${s.avgTickTimeMs.toFixed(2)}ms avg, ${s.maxTickTimeMs.toFixed(2)}ms max`);
});
```

### Component type errors

**Error:** `Component type 'MyComponent' not found`

**Fix:** Component types must use `lowercase_with_underscores`:
```typescript
// BAD: type = 'MyComponent'
// GOOD: type = 'my_component'
```

**Ensure registered in `ComponentType.ts`:**
```typescript
export const ComponentType = {
  // ...
  MyComponent: 'my_component' as const,
} as const;
```

---

## Testing

**Run core tests:**

```bash
cd custom_game_engine
npm test -- packages/core
```

**Run specific system tests:**

```bash
npm test -- NeedsSystem.test.ts
npm test -- PlantSystem.test.ts
npm test -- MemorySystem.test.ts
```

**Test file structure:**

```
packages/core/__tests__/
├── AgentBrainSystem.test.ts
├── NeedsSystem.test.ts
├── MemorySystem.test.ts
├── PlantSystem.test.ts
├── StateMutatorSystem.test.ts
└── ... (87+ more)
```

---

## Further Reading

**Architecture:**
- [ARCHITECTURE_OVERVIEW.md](../../ARCHITECTURE_OVERVIEW.md) - ECS, packages, metasystems, data flow
- [SYSTEMS_CATALOG.md](../../SYSTEMS_CATALOG.md) - Complete system reference (211+ systems)
- [COMPONENTS_REFERENCE.md](../../COMPONENTS_REFERENCE.md) - Component types and fields (125+ components)
- [METASYSTEMS_GUIDE.md](../../METASYSTEMS_GUIDE.md) - Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms

**Performance:**
- [SCHEDULER_GUIDE.md](../../SCHEDULER_GUIDE.md) - Fixed 20 TPS timestep, system priority ordering
- [PERFORMANCE.md](../../PERFORMANCE.md) - Performance optimization guide
- [packages/core/src/ecs/SIMULATION_SCHEDULER.md](./src/ecs/SIMULATION_SCHEDULER.md) - Entity culling guide

**Subsystems:**
- [Botany Package README](../botany/README.md) - Plant system deep dive
- [LLM Package README](../llm/README.md) - LLM integration, prompts, providers
- [Divinity Package README](../divinity/README.md) - God emergence, miracles, theology

**Development:**
- [devlogs/STATE_MUTATOR_SYSTEM_2026-01-07.md](../../devlogs/STATE_MUTATOR_SYSTEM_2026-01-07.md) - StateMutatorSystem design
- [devlogs/NEEDS_SYSTEM_INTEGRATION_2026-01-07.md](../../devlogs/NEEDS_SYSTEM_INTEGRATION_2026-01-07.md) - NeedsSystem integration example

---

## Summary for Language Models

**Before working with core systems:**
1. Read this README completely
2. Understand ECS architecture (entities, components, systems)
3. Know system priority order (lower runs first)
4. Understand performance patterns (query caching, throttling, SimulationScheduler, StateMutatorSystem)
5. Know event-driven communication (never call system methods directly)

**Common tasks:**
- **Add system:** Create class, register in `registerAllSystems.ts`, update `SYSTEMS_CATALOG.md`
- **Query entities:** `world.query().with('agent', 'position').executeEntities()`
- **Emit event:** `eventBus.emit({ type: 'event_name', ... })`
- **Use StateMutator:** Register delta rate, cleanup on entity death
- **Throttle system:** Check `world.tick - lastUpdate >= UPDATE_INTERVAL`
- **Cache singleton:** Store entity ID, avoid repeated queries

**Critical rules:**
- Never mutate components directly (systems read, WorldMutator writes)
- Component types use `lowercase_with_underscores` (NOT `PascalCase`)
- Cache queries before loops (never query inside loops)
- Use squared distance (avoid `Math.sqrt()` in hot paths)
- Use SimulationScheduler (`filterActiveEntities()`) to reduce entity processing
- No `console.log` in systems (only `console.error` for actual errors)
- Clean up event listeners in `cleanup()`
- Clean up StateMutator deltas on entity death

**Event-driven architecture:**
- Systems emit events, other systems listen
- Never call system methods directly
- Event names are lowercase strings (`'plant_harvested'` not `'plantHarvested'`)
- Register event listeners in `initialize()`, clean up in `cleanup()`

**Performance hierarchy:**
1. **SimulationScheduler** - Process only visible/important entities (97% reduction)
2. **StateMutatorSystem** - Batch gradual changes (60-1200× improvement)
3. **Throttling** - Run non-critical systems every N ticks (e.g., every 100 ticks = 5 seconds)
4. **Query caching** - Query once before loops, not inside loops
5. **Squared distance** - Avoid `Math.sqrt()` in hot paths
6. **Singleton caching** - Cache entity IDs for time, weather, etc.
