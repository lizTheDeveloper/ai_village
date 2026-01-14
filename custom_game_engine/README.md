# Multiverse: The End of Eternity - Game Engine

A production-ready TypeScript game engine powering Multiverse: The End of Eternity. Built with Entity-Component-System architecture, featuring 211+ systems across 19 specialized packages.

> *This project is dedicated to Tarn Adams and Dwarf Fortress. See the [project README](../README.md) for our philosophy and inspirations.*

## Overview

**Multiverse: The End of Eternity** runs on a custom TypeScript game engine designed for complex emergent gameplay. The engine features:

- **Entity-Component-System (ECS)** architecture with 211+ systems
- **19 specialized packages** covering gameplay, AI, rendering, and infrastructure
- **125+ component types** for rich entity composition
- **20 TPS fixed timestep** with performance optimization
- **Complete save/load system** with time travel support
- **LLM integration** for autonomous agents and dynamic content generation
- **Multiverse mechanics** enabling parallel universe simulation

### Scale

- **432,000+ lines of code** across 11,500+ TypeScript files
- **211+ systems** organized by priority and category
- **125+ component types** with versioning and migrations
- **19 packages** with comprehensive documentation
- **Production deployment** on Google Cloud Platform

## Quick Start

### One Command to Run Everything

```bash
./start.sh
```

This automatically:
- Checks for first-time setup
- Installs dependencies if needed
- Starts metrics server (port 8766)
- Starts PixelLab sprite daemon
- Starts orchestration dashboard (port 3030)
- Starts game dev server (port 3000-3002)
- Opens browser

### Different Modes

**Game Host** (default) - Play the game or host for others:
```bash
./start.sh gamehost
```

**Server** - Backend only for AI/autonomous agents:
```bash
./start.sh server
```

**Player** - Open browser to existing server:
```bash
./start.sh player
```

**Other Commands:**
```bash
./start.sh kill      # Stop all servers
./start.sh status    # Show running servers
```

See [CLAUDE.md](CLAUDE.md) for detailed setup and development guidelines.

## Architecture

### Entity-Component-System (ECS)

The engine uses a pure ECS architecture where:
- **Entities** are unique IDs (UUID v4)
- **Components** are pure data structures (125+ types)
- **Systems** contain all game logic (211+ systems)

Systems execute in priority order every tick (20 TPS fixed timestep). The scheduler supports throttling, entity culling, and proximity-based simulation.

### Key Documentation

- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** - ECS fundamentals, packages, metasystems, data flow
- **[SYSTEMS_CATALOG.md](SYSTEMS_CATALOG.md)** - Complete catalog of all 211+ systems with priorities and locations
- **[COMPONENTS_REFERENCE.md](COMPONENTS_REFERENCE.md)** - All 125+ component types with fields and examples
- **[METASYSTEMS_GUIDE.md](METASYSTEMS_GUIDE.md)** - Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms

### Performance & Optimization

- **[SCHEDULER_GUIDE.md](SCHEDULER_GUIDE.md)** - Game loop, system priorities, fixed timestep
- **[PERFORMANCE.md](PERFORMANCE.md)** - Optimization patterns, caching, entity culling
- **[SIMULATION_SCHEDULER.md](packages/core/src/ecs/SIMULATION_SCHEDULER.md)** - Dwarf Fortress-style entity filtering

### Development Guidelines

- **[CLAUDE.md](CLAUDE.md)** - **START HERE** - Complete development guidelines, coding standards, workflows
- **[CORRUPTION_SYSTEM.md](CORRUPTION_SYSTEM.md)** - Data preservation philosophy (conservation of game matter)
- **[DEBUG_API.md](DEBUG_API.md)** - Browser console API for debugging and testing
- **[README_TEMPLATE.md](README_TEMPLATE.md)** - Package documentation standards

## Package Index

The engine is organized into 19 specialized packages. **Always read the package README before modifying any system.**

### Core Infrastructure

#### [@ai-village/core](packages/core/README.md)
Foundation of the ECS architecture. Entity management, component registry, system execution, query builder, event bus, action queue, game loop, serialization, admin dashboard.

**Key files:** `ecs/`, `events/`, `actions/`, `loop/`, `admin/`

#### [@ai-village/world](packages/world/README.md)
Terrain generation, chunk management, biomes, temperature/rainfall simulation, resource distribution, voxel data structures.

**Key files:** `terrain/`, `chunks/`, `biomes/`, `temperature/`

#### [@ai-village/persistence](packages/persistence/README.md)
Save/load system with versioning, migrations, compression, time travel support. Foundation for multiverse mechanics.

**Key files:** `SaveLoadService.ts`, `migrations/`, `compression/`

### Gameplay Systems

#### [@ai-village/botany](packages/botany/README.md)
Plant genetics, growth simulation, reproduction, seed dispersal, 20+ plant species. Mendelian inheritance with dominant/recessive traits.

**Key files:** `PlantGrowthSystem.ts`, `genetics/`, `species/`

#### [@ai-village/environment](packages/environment/README.md)
Weather patterns, seasonal cycles, soil chemistry (NPK nutrients, pH, moisture), climate zones, precipitation.

**Key files:** `WeatherSystem.ts`, `soil/`, `climate/`

#### [@ai-village/navigation](packages/navigation/README.md)
A* pathfinding, movement execution, steering behaviors, obstacle avoidance, path caching, terrain costs.

**Key files:** `PathfindingSystem.ts`, `MovementSystem.ts`, `SteeringSystem.ts`

#### [@ai-village/reproduction](packages/reproduction/README.md)
Mating system, pregnancy, genetics inheritance, family trees, relationship tracking, trait expression.

**Key files:** `MatingSystem.ts`, `PregnancySystem.ts`, `genetics/`

#### [@ai-village/building-designer](packages/building-designer/README.md)
Voxel-based building construction, blueprints, multi-story structures, material requirements, construction progress tracking.

**Key files:** `BuildingSystem.ts`, `blueprints/`, `voxel/`

### Advanced Features

#### [@ai-village/divinity](packages/divinity/README.md)
God simulation, faith mechanics, miracles, divine interventions, temples, religious institutions, theology, avatar manifestation.

**Key files:** `DivinePresenceSystem.ts`, `miracles/`, `faith/`

#### [@ai-village/magic](packages/magic/README.md)
25+ magic paradigms (elemental, blood, nature, time, void, etc.), spell casting, mana systems, magical items, enchantments.

**Key files:** `MagicSystem.ts`, `paradigms/`, `spells/`

#### [@ai-village/hierarchy-simulator](packages/hierarchy-simulator/README.md)
Renormalization group theory for multi-scale simulation. Enables efficient simulation of macro-level phenomena from micro-level rules.

**Key files:** `RenormalizationSystem.ts`, `coarse-graining/`

### AI & LLM Integration

#### [@ai-village/llm](packages/llm/README.md)
LLM provider integration (OpenAI, Anthropic, Groq, Ollama), request scheduling, rate limiting, session management, prompt templates.

**Key files:** `LLMScheduler.ts`, `providers/`, `prompts/`

#### [@ai-village/introspection](packages/introspection/README.md)
Schema generation for LLM context, component introspection, mutation tracking, self-documentation.

**Key files:** `SchemaGenerator.ts`, `introspection/`

### Rendering & Graphics

#### [@ai-village/renderer](packages/renderer/README.md)
2D canvas rendering, camera system (pan/zoom), 40+ UI panels, sprite management, input handling, debug overlays.

**Key files:** `Renderer.ts`, `Camera.ts`, `panels/`, `sprites/`

#### [@ai-village/deterministic-sprite-generator](packages/deterministic-sprite-generator/README.md)
Procedural sprite generation with deterministic output. Generates sprites from entity components and seed values.

**Key files:** `SpriteGenerator.ts`, `algorithms/`

### Infrastructure & Metrics

#### [@ai-village/metrics](packages/metrics/README.md)
Performance tracking, system profiling, entity statistics, dashboard data collection, HTTP API for metrics queries.

**Key files:** `MetricsCollector.ts`, `server/`, `queries/`

#### [@ai-village/metrics-dashboard](packages/metrics-dashboard/README.md)
Web-based metrics visualization, real-time performance graphs, system profiling views, entity browser.

**Key files:** `Dashboard.tsx`, `charts/`, `views/`

#### [@ai-village/shared-worker](packages/shared-worker/README.md)
Web Worker infrastructure for background processing, offloading heavy computations from main thread.

**Key files:** `SharedWorker.ts`, `tasks/`

### Demo & Testing

#### [@ai-village/city-simulator](packages/city-simulator/README.md)
Headless simulation mode for testing and benchmarking. Runs game loop without rendering for performance testing.

**Key files:** `CitySimulator.ts`, `tests/`

## Systems Overview

The engine features **211+ systems** organized into these categories:

- **Time & Environment** (6 systems) - TimeSystem, WeatherSystem, SeasonSystem, etc.
- **Plants** (12 systems) - PlantGrowthSystem, GeneticsSystem, PollinationSystem, etc.
- **Animals** (8 systems) - AnimalAISystem, HungerSystem, ReproductionSystem, etc.
- **Agent Core** (15 systems) - BrainSystem, MemorySystem, DecisionSystem, etc.
- **Memory & Cognition** (18 systems) - SpatialMemorySystem, SkillSystem, LearningSystem, etc.
- **Social & Communication** (14 systems) - ConversationSystem, RelationshipSystem, etc.
- **Exploration & Navigation** (10 systems) - PathfindingSystem, MovementSystem, etc.
- **Building & Construction** (12 systems) - BuildingSystem, CraftingSystem, etc.
- **Economy & Trade** (9 systems) - TradeSystem, MarketSystem, CurrencySystem, etc.
- **Skills & Crafting** (16 systems) - SkillProgressionSystem, RecipeSystem, etc.
- **Research** (7 systems) - ResearchSystem, TechnologySystem, etc.
- **Magic** (25 systems) - MagicSystem, SpellCastingSystem, 25+ paradigm systems
- **Combat & Security** (8 systems) - CombatSystem, HealthSystem, SecuritySystem, etc.
- **Body & Reproduction** (11 systems) - PregnancySystem, GeneticsSystem, AgingSystem, etc.
- **Divinity** (32 systems) - DivinePresenceSystem, MiracleSystem, FaithSystem, etc.
- **Realms & Portals** (6 systems) - RealmSystem, PortalSystem, DimensionalTravelSystem
- **Automation & Factories** (5 systems) - AutomationSystem, FactorySystem, etc.
- **Governance & Metrics** (8 systems) - GovernanceSystem, MetricsSystem, etc.
- **Consciousness** (5 systems) - ConsciousnessSystem, QualiaMappingSystem, etc.
- **Utility** (4 systems) - AutoSaveSystem, DebugSystem, etc.

See [SYSTEMS_CATALOG.md](SYSTEMS_CATALOG.md) for complete details on every system.

## Development

### Testing

```bash
cd custom_game_engine
npm test
```

All tests must pass before committing. Never commit broken tests.

### Building

```bash
cd custom_game_engine
npm run build
```

Build must succeed without errors. TypeScript strict mode is enabled.

### Running

```bash
cd custom_game_engine
./start.sh
```

The game uses **Vite Hot Module Replacement (HMR)** - changes to TypeScript files auto-reload in 1-2 seconds. **Do not restart servers** unless absolutely necessary (config changes, npm install, crashes).

### Browser Console API

Open browser DevTools (F12) and use `window.game` for debugging:

```javascript
game.world              // Access ECS world
game.gameLoop           // Access game loop
game.renderer           // Access renderer
game.setSelectedAgent(agentId)  // Select agent in UI
game.grantSkillXP(agentId, 100) // Grant XP
```

See [DEBUG_API.md](DEBUG_API.md) for complete API reference.

### Admin Dashboard

**URL:** http://localhost:8766/admin

Access universe management, agent monitoring, LLM queue status, sprite browser, time travel interface.

## Live Deployment

**VM IP Address:** `34.32.58.93`

- **Game:** http://34.32.58.93:3000
- **Admin Dashboard:** http://34.32.58.93:8766/admin

Deployed on Google Cloud Platform (europe-west10-a) with Groq API integration.

**Note:** The metrics server (port 8766) is for internal use and not publicly exposed.

## Contributing

### Before You Start

1. Read [CLAUDE.md](CLAUDE.md) for complete development guidelines
2. Read the relevant package README before modifying any system
3. Understand the **conservation of game matter** principle - never delete entities, souls, items, or universes. Mark as corrupted and preserve for recovery.

### Code Quality

- Use `lowercase_with_underscores` for component types
- No silent fallbacks - crash on invalid data
- Use math utilities from `packages/core/src/utils/math.ts`
- No debug console.log statements (errors/warnings only)
- Cache queries before loops, use squared distance, throttle non-critical systems

### Verification Checklist

Before completing any task:

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] No browser console errors
- [ ] Changes work as expected
- [ ] No performance regression (TPS/FPS)

## Project Philosophy

This engine is built on principles inspired by Dwarf Fortress:

- **Emergent complexity** from simple rules
- **Preserve everything** - no data deletion, only corruption marking
- **Deep simulation** - every entity has rich internal state
- **Open source** - see [README.md](../README.md) for monetization philosophy

The codebase prioritizes:
- **Maintainability** over cleverness
- **Documentation** over tribal knowledge
- **Modularity** over monoliths
- **Testability** over quick hacks

---

**Questions?** See [CLAUDE.md](CLAUDE.md) for detailed guidelines, or explore the package READMEs for specific systems.
