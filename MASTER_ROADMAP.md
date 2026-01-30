# AI Village Master Roadmap

> **This is the single source of truth for implementation order.**
>
> Agents: Use this document to determine what to work on next.
> Check the status, find the next `READY` item, and begin work.

---

## Quick Reference

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed |
| 🚧 | In Progress |
| ⏳ | Ready (dependencies met, can start) |
| 🔒 | Blocked (waiting on dependencies) |
| 🔀 | Can be done in parallel with siblings |

---

## Current Status

**Last Updated:** 2026-01-03

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0-3 | ✅ Complete | Foundation through Agent Needs |
| Phase 4 | ✅ Complete | Memory & Social (Episodic memory, spatial, relationships) |
| Phase 5-6 | ✅ Complete | Communication & LLM Integration (+ Three-Layer Scheduler 2026-01-06) |
| Phase 7 | ✅ Complete | Building & Shelter (Construction, inventory display) |
| Phase 8 | ✅ Complete | Temperature & Weather |
| Phase 9 | ✅ Complete | Farming (Soil, Plant Lifecycle, Tilling, Seeds) |
| Phase 10 | ✅ Complete | Crafting (core loop done, polish items optional) |
| Phase 11 | ✅ Complete | Animals (Foundation, housing, production) |
| Phase 22 | ✅ Complete | Sociological Metrics Foundation (all tasks done) |
| Phase 23 | ✅ Complete | Sociological Metrics Storage & API |
| Phase 24 | ✅ Complete | Sociological Metrics Analysis Modules |
| Phase 27 | ✅ Complete | Divine Communication (Prayer, Meditation, Visions, LLM Integration) |
| Phase 12 | ✅ Complete | Economy & Trade (Currency, Trading, Shops, Market Events) |
| Phase 13 | ✅ Complete | Research & Discovery (Research tree, buildings, discovery system) |
| Phase 25 | 🚧 In Progress | Sociological Metrics Visualization Dashboard (spec-agent-001 claimed 2026-01-02) |
| Phase 28 | ✅ Complete | Angel Systems (AI processor, prayer delegation, LLM integration) |
| Phase 35 | ✅ Complete | Psychopomp Death Conversation System (Death judgment, soul ceremonies) |
| Phase 29 | ✅ Complete | Item System Refactor (Materials, Traits, Instances - includes Armor/Weapon traits) |
| Phase 37 | ✅ Complete | Reproduction System (Courtship, Pregnancy, Labor, Birth, Parenting) |
| Phase 38 | ✅ Complete | Realm System (Multiverse realms, time dilation, portals, cross-realm phones) |
| Phase 31 | ✅ Complete | Persistence Layer (Serialization, auto-save, checkpoints, GZIP, invariants, passages, Timeline UI) |
| Phase 36 | ⏳ Ready | Equipment System (Armor, Weapons, Clothing using Phase 29 traits) |
| Phase 39 | 🚧 In Progress | Companion System (Ophanim guide with RAG, emotions, evolution - Phase 1 started 2026-01-02) |
| Phase 30 | ⏳ Ready | Magic System (Multi-source, Verb/Noun Composition) |
| Phase 32 | ⏳ Ready | Universe Forking (Parallel World Testing) - Phase 31 ✅ complete! |
| Phase 33 | 🔒 Blocked | LLM Effect Generation (Safe Generated Effects) - blocked on Phase 30, 32 |
| Phase 34 | 🔒 Blocked | Cross-Universe Sharing (Effect Packages, Trust) - blocked on Phase 31, 33 |
| Skill System | 🚧 In Progress | Progressive Skill Reveal - skill-gated prompt context (claimed 2025-12-28) |

**Implementation Status Notes (2026-01-06):**
- ✅ **Three-Layer LLM Scheduler** - Intelligent layer selection (Autonomic/Talker/Executor) with cooldown management reduces LLM costs 2-3x (2026-01-06)
- ✅ **Core gameplay loop is functional** - Agents, world, farming, crafting, animals, economy all working
- ✅ **Reproduction System** - Complete courtship → pregnancy → labor → birth pipeline (Phase 37, 12 bugs fixed, fully integrated)
- ✅ **Realm System** - Complete multiverse realm system (Phase 38: 6 realms, time dilation, portals, cross-realm phones, death transitions)
- ✅ **Persistence Layer** - Complete with auto-save, daily checkpoints, Timeline UI, GZIP compression, invariant validation, passage system (Phase 31)
- ✅ **Hunt & Butcher System** - Complete integration with combat/cooking/hunting skills, synergy bonuses, quality calculations (2026-01-01)
- 🚧 **Companion System** - Ophanim guide in development (Phase 39: Phase 1 entity/component created, evolution & RAG systems pending)
- 🏗️ **Threat Detection System** - Designed with auto-flee/attack/cover responses, needs TypeScript fixes before integration
- ⚠️ **Magic System** - Framework exists (MagicComponent, MagicSystem) but missing paradigm implementations, combos, skill trees
- ✅ **Divinity System** - Complete divine communication (Prayer, Meditation, Visions, LLM generation, Faith mechanics, Angel delegation, Psychopomp death conversations)
- ✅ **Context Menu UI** - Right-click context menus fully functional (ContextMenuManager, ContextMenuRenderer, coordinate bug fixed 2026-01-01)
- ✅ **Conflict/Combat UI** - Combat HUD, health bars, unit panels, stance controls all implemented
- ⚠️ **Body System** - Basic implementation exists, missing genetics and species-specific integration
- ✅ **Research** - Research system complete (Phase 13)
- ⏳ **Governance, Multi-Village** - Specs complete, implementations not started
- ✅ **AlienSpeciesGenerator** - Procedural alien/fantasy species generation with diet coherence, ecologies, and cultural patterns (2026-01-03)
- ✅ **SoulNameGenerator** - Lore-appropriate naming system for divine entities (2026-01-03)
- ✅ **PixelLab Sprites** - 40+ animal sprite variants generated (cats, dogs, horses, sheep, cows, goats, pigs, rabbits, deer) (2026-01-03)
- ✅ **UI Panel Enhancements** - 29 UI panels enhanced with improved functionality (2026-01-03)
- ✅ **MemoryBuilder Tests** - Comprehensive test coverage for memory system (2026-01-03)
- ✅ **ResearchLibraryPanel** - Research paper browsing UI with filtering and sorting (2026-01-03)
- 📊 **Spec Coverage** - Many systems have ~40-70% of spec features implemented, with advanced features pending

**System Implementation Coverage (Quick Reference):**

| System | Core Works? | Spec Coverage | Missing Major Features |
|--------|-------------|---------------|------------------------|
| **Foundation (ECS)** | ✅ | 100% | None |
| **World Gen** | ✅ | 100% | None |
| **Agents (Basic)** | ✅ | 60% | Augmentation, config items |
| **Memory** | ✅ | 90% | Journaling reflection |
| **Needs** | ✅ | 100% | None |
| **Farming** | ✅ | 40% | Properties, ecology, hybridization |
| **Animals** | ✅ | 55% | Breeding, working animals (plow/guard/hunt) |
| **Crafting** | ✅ | 70% | Quality system depth |
| **Building** | ✅ | 40% | Procedural gen, upgrades |
| **Economy** | ✅ | 80% | Inter-village trade |
| **Combat** | ✅ | 75% | Threat detection AI, group combat |
| **Hunt/Butcher** | ✅ | 100% | Complete (Skill synergies, quality system) |
| **Magic** | ⚠️ | 30% | Paradigms, combos, skill trees |
| **Divinity** | ✅ | 100% | Complete (Prayer, Visions, Angels, Psychopomp) |
| **Body** | ✅ | 60% | Genetics, species integration |
| **Reproduction** | ✅ | 100% | Complete (Courtship, Pregnancy, Labor, Birth) |
| **Research** | ✅ | 100% | Complete (Phase 13) |
| **Realms** | ✅ | 100% | Complete (6 realms, portals, time dilation, cross-realm phones) |
| **Persistence** | ✅ | 100% | Complete (Auto-save, checkpoints, Timeline UI, GZIP, invariants) |
| **Companion** | 🚧 | 20% | Evolution system, RAG knowledge, chat UI |
| **Governance** | ⚠️ | 10% | Leadership, laws, voting |
| **Skills** | ✅ | 70% | Progressive reveal in progress |

**Parallel Work Available (pick any):**

**High Priority - Ready to Start:**
- **Phase 14**: Governance (Phase 12 ✅ complete!)
- **Phase 15**: Multi-Village & Inter-Village Trade (Phase 12 ✅ complete!)
- **Phase 30**: Magic System Enhancement - Multi-source, Paradigms, Combos (⚠️ basic framework exists)
- **Phase 32**: Universe Forking - Parallel World Testing (Phase 31 ✅ complete!)
- **Phase 36**: Equipment System - Armor, Weapons, Clothing definitions (Phase 29 ✅ complete, traits ready!)

**Enhancement Work - Add Missing Spec Features:**
- **Farming System**: Plant properties (medicinal/magical), ecology, natural hybridization
- **Animal System**: Breeding genetics, working animals (plow/guard/hunt) (✅ generated species complete via AlienSpeciesGenerator)
- **Building System**: Procedural generation, upgrades, maintenance & decay
- **Agent System**: Cybernetics & augmentation (for sci-fi universes)
- **Magic System**: Finish paradigm implementations, combo system, skill trees

**Small Tasks:**
- **Technical Debt**: Component format unification, pattern consistency

---

## Phase Overview

```
Phase 0: Foundation ────────────────────────────────────────────── ✅ COMPLETE
    │
    ▼
Phase 1: World Generation ──────────────────────────────────────── ✅ COMPLETE
    │
    ▼
Phase 2: First Agent ───────────────────────────────────────────── ✅ COMPLETE
    │
    ▼
Phase 3: Agent Needs ───────────────────────────────────────────── ✅ COMPLETE
    │
    ├──────────────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
Phase 4       Phase 5       Phase 6       Phase 7 ─────────────── ✅ COMPLETE
Memory        Communication  LLM           Building
✅            ✅             ✅            ✅
    │              │              │              │
    └──────────────┴──────────────┴──────────────┘
                            │
                            ▼
                      Phase 8: Temperature & Weather ──────────── ✅ COMPLETE
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
Phase 9 🔀             Phase 10 🔀            Phase 11 🔀
Farming                Crafting              Animals
✅                     ✅                    ✅
    │                       │                       │
    └───────────────────────┼───────────────────────┘
                            │
                            ▼
                      Phase 12: Economy ────────────────────────── ✅ COMPLETE
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      Phase 13 🔀     Phase 14 🔀     Phase 15 🔀
      Research        Governance     Multi-Village
      🔒              🔒             🔒
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                      Phase 16: Polish & Player ────────────────── 🔒
```

---

## Detailed Phase Breakdown

### Phase 0: Foundation ✅ COMPLETE

- [x] ECS Architecture
- [x] Event Bus
- [x] Action Queue
- [x] Game Loop (20 TPS)
- [x] Serialization

**Status:** ✅ Complete
**Dependencies:** None
**Parallel Work:** None (must complete first)

| Task | Status | Spec |
|------|--------|------|
| ECS Architecture | ✅ | [game-engine/spec.md](openspec/specs/game-engine/spec.md) |
| Event Bus | ✅ | [game-engine/spec.md](openspec/specs/game-engine/spec.md) |
| Action Queue | ✅ | [game-engine/spec.md](openspec/specs/game-engine/spec.md) |
| Game Loop (20 TPS) | ✅ | [game-engine/spec.md](openspec/specs/game-engine/spec.md) |
| Serialization | ✅ | [game-engine/spec.md](openspec/specs/game-engine/spec.md) |

**Implementation:** `packages/core/src/ecs/`, `packages/core/src/loop/`

---

### Phase 1: World Generation ✅ COMPLETE

- [x] Chunk System
- [x] Terrain Generation
- [x] Biome System
- [x] Canvas Renderer
- [x] Camera Controls

**Status:** ✅ Complete
**Dependencies:** Phase 0
**Parallel Work:** None

| Task | Status | Spec |
|------|--------|------|
| Chunk System | ✅ | [world-system/procedural-generation.md](openspec/specs/world-system/procedural-generation.md) |
| Terrain Generation | ✅ | [world-system/procedural-generation.md](openspec/specs/world-system/procedural-generation.md) |
| Biome System | ✅ | [world-system/spec.md](openspec/specs/world-system/spec.md) |
| Canvas Renderer | ✅ | [rendering-system/spec.md](openspec/specs/rendering-system/spec.md) |
| Camera Controls | ✅ | [rendering-system/spec.md](openspec/specs/rendering-system/spec.md) |

**Implementation:** `packages/world/src/`, `packages/renderer/src/`

---

### Phase 2: First Agent ✅ COMPLETE

- [x] Agent Component
- [x] Position Component
- [x] Movement System
- [x] Random Decisions
- [x] Agent Rendering

**Status:** ✅ Complete
**Dependencies:** Phase 1
**Parallel Work:** None

| Task | Status | Spec |
|------|--------|------|
| Agent Component | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Position Component | ✅ | [agent-system/movement-intent.md](openspec/specs/agent-system/movement-intent.md) |
| Movement System | ✅ | [agent-system/movement-intent.md](openspec/specs/agent-system/movement-intent.md) |
| Random Decisions | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Agent Rendering | ✅ | [rendering-system/spec.md](openspec/specs/rendering-system/spec.md) |

**Implementation:** `packages/core/src/components/`, `packages/core/src/systems/`

---

### Phase 3: Agent Needs ✅ COMPLETE

- [x] Needs Component
- [x] Needs System
- [x] Resource Component
- [x] Foraging Action
- [x] Item Pickup

**Status:** ✅ Complete
**Dependencies:** Phase 2
**Parallel Work:** None

| Task | Status | Spec |
|------|--------|------|
| Needs Component | ✅ | [agent-system/needs.md](openspec/specs/agent-system/needs.md) |
| Needs System | ✅ | [agent-system/needs.md](openspec/specs/agent-system/needs.md) |
| Resource Component | ✅ | [items-system/spec.md](openspec/specs/items-system/spec.md) |
| Foraging Action | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Item Pickup | ✅ | [items-system/spec.md](openspec/specs/items-system/spec.md) |

**Implementation:** `packages/core/src/components/NeedsComponent.ts`, `packages/core/src/systems/NeedsSystem.ts`

---

### Phase 4: Memory & Social Awareness ✅ COMPLETE

- [x] Vision Component
- [x] Memory Component (Basic)
- [x] Episodic Memory System
- [x] Relationship Component
- [x] Spatial Awareness

**Status:** ✅ Complete
**Dependencies:** Phase 3
**Parallel Work:** 🔀 Can run parallel with Phase 5, 6

| Task | Status | Spec |
|------|--------|------|
| Vision Component | ✅ | [agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) |
| Memory Component (Basic) | ✅ | [agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) |
| Episodic Memory System | ✅ | [agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) |
| Relationship Component | ✅ | [agent-system/relationship-system.md](openspec/specs/agent-system/relationship-system.md) |
| Spatial Awareness | ✅ | [agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) |

**Implementation:** `packages/core/src/components/MemoryComponent.ts`, `packages/core/src/components/RelationshipComponent.ts`

**Completed features:**
- Rich event memories with emotional encoding
- End-of-day reflections via LLM
- Semantic memory (knowledge/beliefs)
- Social memory (relationship details)
- Memory sharing and storytelling
- Personality-driven journaling
- Natural memory decay and consolidation

---

### Phase 5: Communication ✅ COMPLETE

- [x] Conversation Component
- [x] Communication System
- [x] Multiple Agents
- [x] Hearing System

**Status:** ✅ Complete
**Dependencies:** Phase 3
**Parallel Work:** 🔀 Can run parallel with Phase 4, 6

| Task | Status | Spec |
|------|--------|------|
| Conversation Component | ✅ | [agent-system/conversation-system.md](openspec/specs/agent-system/conversation-system.md) |
| Communication System | ✅ | [agent-system/conversation-system.md](openspec/specs/agent-system/conversation-system.md) |
| Multiple Agents | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Hearing System | ✅ | [agent-system/conversation-system.md](openspec/specs/agent-system/conversation-system.md) |

**Implementation:** `packages/core/src/components/ConversationComponent.ts`, `packages/core/src/systems/CommunicationSystem.ts`

---

### Phase 6: LLM Integration ✅ COMPLETE

- [x] Ollama Provider
- [x] Structured Prompts
- [x] Think/Speak/Act Split
- [x] Decision Queue
- [x] Function Calling

**Status:** ✅ Complete
**Dependencies:** Phase 3
**Parallel Work:** 🔀 Can run parallel with Phase 4, 5

| Task | Status | Spec |
|------|--------|------|
| Ollama Provider | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Structured Prompts | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Think/Speak/Act Split | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Decision Queue | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |
| Function Calling | ✅ | [agent-system/spec.md](openspec/specs/agent-system/spec.md) |

**Implementation:** `packages/llm/src/`

---

### Phase 7: Building & Shelter ✅ COMPLETE

- [x] Building Component
- [x] Building Definitions
- [x] Resource Gathering
- [x] Construction Progress
- [x] Building Placement UI
- [x] Agent Inventory Display
- [x] Shelter Need Satisfaction

**Status:** ✅ Complete
**Dependencies:** Phase 3, 4, 5, 6
**Parallel Work:** Tasks within this phase can be parallelized as marked

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Building Component | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |
| Building Definitions | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Resource Gathering | ✅ | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Construction Progress | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |
| Building Placement UI | ✅ | [ui-system/building-placement.md](openspec/specs/ui-system/building-placement.md) | 🔀 |
| Agent Inventory Display | ✅ | [ui-system/agent-inventory-display.md](openspec/specs/ui-system/agent-inventory-display.md) | 🔀 |
| Shelter Need Satisfaction | ✅ | Replaced by Phase 8 Temperature System | - |

**Implementation:** `packages/core/src/components/BuildingComponent.ts`, `packages/core/src/systems/BuildingSystem.ts`

---

### Phase 8: Temperature & Weather ✅ COMPLETE

- [x] TemperatureComponent
- [x] TemperatureSystem
- [x] WeatherComponent
- [x] WeatherSystem
- [x] Building Heat/Insulation
- [x] Remove Shelter Need
- [x] Add Health to Needs
- [x] seek_warmth Behavior
- [x] seek_cooling Behavior
- [x] Temperature LLM Context

**Status:** ✅ Complete
**Dependencies:** BuildingComponent exists (✅), Building archetypes exist (✅)
**Parallel Work:** 🔀 Can run in parallel with remaining Phase 7 tasks

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| TemperatureComponent | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| TemperatureSystem | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| WeatherComponent | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| WeatherSystem | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| Building Heat/Insulation | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| Remove Shelter Need | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| Add Health to Needs | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| seek_warmth Behavior | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| seek_cooling Behavior | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| Temperature LLM Context | ✅ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |

**Implementation:** `packages/core/src/systems/TemperatureSystem.ts`, `packages/core/src/systems/WeatherSystem.ts`

**Breaking Changes from Phase 7:**
- Removes `shelter` from NeedsComponent
- Removes `providesShelter` from BuildingComponent
- Adds `health` to NeedsComponent
- Adds heat/insulation properties to buildings

---

### Phase 9: Farming ✅ COMPLETE (⚠️ Advanced Features Pending)

- [x] Soil/Tile System
- [x] Plant Lifecycle
- [x] Seed System
- [x] Tilling Action
- [x] Planting Action
- [x] Watering Action
- [x] Harvesting Action
- [ ] Crop Hybridization
- [ ] Farming Buildings
- [ ] Farm Management UI

**Status:** ✅ Complete (core farming loop working, advanced features in spec not yet implemented)
**Dependencies:** Phase 8 ✅ (weather affects crops)
**Parallel Work:** 🔀 Can run parallel with Phase 10, 11

**Implemented:**
- ✅ Soil/tile system with fertility and moisture
- ✅ Complete plant lifecycle (seed → sprout → growth → mature → harvest → decay)
- ✅ Seed system with quality and gathering
- ✅ Tilling, planting, watering, harvesting actions
- ✅ Seasonal growth modifiers
- ✅ Natural seed dispersal

**Not Yet Implemented (from spec):**
- ❌ Plant properties system (medicinal, magical, crafting uses)
- ❌ Property discovery (agents learning through experimentation)
- ❌ Companion planting (plants affecting each other)
- ❌ Cross-pollination and natural hybridization
- ❌ Wild plant populations with ecology
- ❌ Crop diseases and pests
- ❌ Specialized plant types (carnivorous, luminescent, sentient)

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Soil/Tile System | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Plant Lifecycle | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Seed System | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Tilling Action | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Planting Action | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Watering Action | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Harvesting Action | ✅ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Crop Hybridization | ⏳ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Farming Buildings | ⏳ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Farm Management UI | ⏳ | [ui-system/farm-management.md](openspec/specs/ui-system/farm-management.md) | 🔀 |

---

### Phase 10: Crafting & Items ✅ COMPLETE

- [x] Recipe System
- [x] Crafting Stations
- [x] Crafting UI
- [x] Inventory UI
- [x] Item System Refactor
- [ ] Tool Durability
- [x] Quality System

**Status:** ✅ Complete (core crafting loop working, polish items optional)
**Dependencies:** Phase 8 ✅
**Parallel Work:** 🔀 Can run parallel with Phase 9, 11

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Recipe System | ✅ | [items-system/spec.md](openspec/specs/items-system/spec.md) | - |
| Crafting Stations | [P] | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Crafting UI | ✅ | [ui-system/crafting.md](openspec/specs/ui-system/crafting.md) | 🔀 |
| Inventory UI | ✅ | [ui-system/inventory.md](openspec/specs/ui-system/inventory.md) | 🔀 |
| Item System Refactor | 🚧 | [items-system/spec.md](openspec/specs/items-system/spec.md) | - |

**Polish (not blocking):**
| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Tool Durability | ⏳ | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Quality System | 🚧 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/itemquality-system/work-order.md](agents/autonomous-dev/work-orders/itemquality-system/work-order.md)
**Status:** READY_FOR_TESTS (claimed 2025-12-28 by spec-agent-001)

**Note:** Crafting Stations [P] = awaiting playtest verification

---

### Phase 11: Animals ✅ COMPLETE (⚠️ Advanced Features Pending)

- [x] Animal System Foundation
- [x] Animal Housing
- [x] Taming System
- [x] Animal Products
- [x] Wild Animal Spawning
- [ ] Breeding
- [ ] Animal Husbandry UI

**Status:** ✅ Complete (foundation, housing, and production working; breeding/working animals pending)
**Dependencies:** Phase 8 ✅ (animals need temperature comfort)
**Parallel Work:** 🔀 Can run parallel with Phase 9, 10

**Implemented:**
- ✅ AnimalComponent, AnimalSystem foundation
- ✅ Animal housing (coop, barn, stable, kennel, apiary)
- ✅ AnimalHousingSystem with cleanliness tracking
- ✅ AnimalProductionSystem (eggs, milk, wool)
- ✅ Taming system with bonding
- ✅ Wild animal spawning

**Not Yet Implemented (from spec):**
- ❌ Breeding system with genetics (trait inheritance, mutations)
- ❌ Working animals (plow, guard, hunt, messenger roles)
- ❌ Generated animal species for alien/fantasy worlds
- ❌ Animal trading (dedicated animal merchants)
- ❌ Individual animal personalities and quirks
- ❌ Pack/herd social structures
- ❌ Predator-prey ecology

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Animal System Foundation | ✅ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Housing | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Taming System | ✅ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Products | ✅ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Wild Animal Spawning | ✅ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Breeding | ⏳ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Husbandry UI | ⏳ | [ui-system/animal-husbandry.md](openspec/specs/ui-system/animal-husbandry.md) | 🔀 |

---

### Phase 12: Economy & Trade ✅ COMPLETE

- [x] Currency System
- [x] Value Calculation
- [x] Shop Buildings
- [x] Trading System
- [x] Market Events
- [x] Economy Dashboard UI
- [x] Trading UI

**Status:** ✅ Complete (2025-12-26)
**Dependencies:** Phases 9 ✅, 10 ✅, 11 ✅
**Implementation:** `packages/core/src/economy/`, `packages/core/src/systems/TradingSystem.ts`

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Currency System | ✅ | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Value Calculation | ✅ | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Shop Buildings | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Trading System | ✅ | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Market Events | ✅ | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Economy Dashboard UI | ✅ | [ui-system/economy-dashboard.md](openspec/specs/ui-system/economy-dashboard.md) | 🔀 |
| Trading UI | ✅ | [ui-system/trading.md](openspec/specs/ui-system/trading.md) | 🔀 |

**Completed features:**
- CurrencyComponent with transaction history
- ShopComponent with stock management
- MarketStateComponent for supply/demand tracking
- PricingService with dynamic pricing
- TradingSystem for buy/sell transactions
- TradeActionHandler for action queue integration
- TradeBehavior for autonomous agent trading
- Shop building blueprints (general store, blacksmith, tavern, farm supply)
- Economy Dashboard UI (E key)
- Shop Panel UI (click on shops)
- MarketEventSystem with shortages, surpluses, festivals

---

### Phase 13: Research & Discovery ✅ COMPLETE

- [x] Research Tree
- [x] Research Buildings
- [x] Research Points
- [x] Discovery System
- [ ] Procedural Recipes
- [ ] Research Tree UI

**Status:** ✅ Complete (2025-12-31)
**Dependencies:** Phase 12 ✅
**Completion Report:** `/tmp/phase13_completion.md`

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Research Tree | ✅ | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Research Buildings | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Research Points | ✅ | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Discovery System | ✅ | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Procedural Recipes | ⏳ | [research-system/capability-evolution.md](openspec/specs/research-system/capability-evolution.md) | - |
| Research Tree UI | ⏳ | [ui-system/research-tree.md](openspec/specs/ui-system/research-tree.md) | 🔀 |

---

### Phase 14: Governance ⏳ READY

- [ ] Government Types
- [ ] Leadership Roles
- [ ] Law System
- [ ] Voting/Decisions
- [ ] Governance UI

**Status:** ⏳ Ready (Phase 12 ✅ complete)
**Dependencies:** Phase 12 ✅
**Parallel Work:** 🔀 Can run parallel with Phase 13, 15

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Government Types | ⏳ | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | - |
| Leadership Roles | ⏳ | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | - |
| Law System | ⏳ | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | 🔀 |
| Voting/Decisions | ⏳ | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | 🔀 |
| Governance UI | ⏳ | [ui-system/governance.md](openspec/specs/ui-system/governance.md) | 🔀 |

---

### Phase 15: Multi-Village ⏳ READY

- [ ] Abstraction Layers
- [ ] Village Summaries
- [ ] Trade Routes
- [ ] Caravans
- [ ] News Propagation
- [ ] Map UI

**Status:** ⏳ Ready (Phase 12 ✅ complete)
**Dependencies:** Phase 12 ✅
**Parallel Work:** 🔀 Can run parallel with Phase 13, 14

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Abstraction Layers | ⏳ | [world-system/abstraction-layers.md](openspec/specs/world-system/abstraction-layers.md) | - |
| Village Summaries | ⏳ | [world-system/abstraction-layers.md](openspec/specs/world-system/abstraction-layers.md) | - |
| Trade Routes | ⏳ | [economy-system/inter-village-trade.md](openspec/specs/economy-system/inter-village-trade.md) | 🔀 |
| Caravans | ⏳ | [economy-system/inter-village-trade.md](openspec/specs/economy-system/inter-village-trade.md) | 🔀 |
| News Propagation | ⏳ | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) | 🔀 |
| Map UI | ⏳ | [ui-system/map.md](openspec/specs/ui-system/map.md) | 🔀 |

---

### Phase 16: Polish & Player 🚧 IN PROGRESS

- [ ] Player Avatar
- [ ] Spectator Mode
- [ ] Jack-in/Jack-out
- [ ] Main Menu UI
- [ ] Time Controls UI
- [ ] Notifications UI
- [x] Context Menu UI
- [ ] Hover Info UI
- [ ] Agent Roster UI
- [ ] Relationship Viewer UI
- [ ] Objectives UI
- [x] Conflict UI

**Status:** 🚧 In Progress (Context Menu & Conflict UI complete; Phase 13 ✅, blocked on 14, 15)
**Dependencies:** All previous phases
**Parallel Work:** Tasks can be parallelized

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Player Avatar | 🔒 | [avatar-system/spec.md](openspec/specs/avatar-system/spec.md) | 🔀 |
| Spectator Mode | 🔒 | [player-system/spec.md](openspec/specs/player-system/spec.md) | 🔀 |
| Jack-in/Jack-out | 🔒 | [player-system/spec.md](openspec/specs/player-system/spec.md) | - |
| Main Menu UI | 🔒 | [ui-system/main-menu.md](openspec/specs/ui-system/main-menu.md) | 🔀 |
| Time Controls UI | 🔒 | [ui-system/time-controls.md](openspec/specs/ui-system/time-controls.md) | 🔀 |
| Notifications UI | 🔒 | [ui-system/notifications.md](openspec/specs/ui-system/notifications.md) | 🔀 |
| Context Menu UI | ✅ | [ui-system/context-menu.md](openspec/specs/ui-system/context-menu.md) | 🔀 |
| Hover Info UI | 🔒 | [ui-system/hover-info.md](openspec/specs/ui-system/hover-info.md) | 🔀 |
| Agent Roster UI | 🔒 | [ui-system/agent-roster.md](openspec/specs/ui-system/agent-roster.md) | 🔀 |
| Relationship Viewer UI | 🔒 | [ui-system/relationship-viewer.md](openspec/specs/ui-system/relationship-viewer.md) | 🔀 |
| Objectives UI | 🔒 | [ui-system/objectives.md](openspec/specs/ui-system/objectives.md) | 🔀 |
| Conflict UI | ✅ | [ui-system/conflict.md](openspec/specs/ui-system/conflict.md) | 🔀 |

---

## Future Phases (Post-MVP)

These phases extend beyond the core game:

### Phase 17: Advanced Consciousness 🔒

- [ ] Pack Minds
- [ ] Hive Minds
- [ ] Species System

| Task | Spec |
|------|------|
| Pack Minds | [consciousness-implementation-phases.md](openspec/specs/consciousness-implementation-phases.md) |
| Hive Minds | [consciousness-implementation-phases.md](openspec/specs/consciousness-implementation-phases.md) |
| Species System | [agent-system/species-system.md](openspec/specs/agent-system/species-system.md) |

### Phase 18: Lifecycle & Generations 🔒

- [ ] Birth/Death
- [ ] Aging
- [ ] Family Trees
- [ ] Inheritance

| Task | Spec |
|------|------|
| Birth/Death | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Aging | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Family Trees | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Inheritance | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |

### Phase 19: Culture & Society 🔒

- [ ] Culture System
- [ ] Kinship Systems
- [ ] Social Norms

| Task | Spec |
|------|------|
| Culture System | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |
| Kinship Systems | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |
| Social Norms | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |

### Phase 20: Chroniclers 🔒

- [ ] Written Works
- [ ] History Recording
- [ ] Knowledge Propagation

| Task | Spec |
|------|------|
| Written Works | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |
| History Recording | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |
| Knowledge Propagation | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |

### Phase 21: Multi-Game (Nexus) 🔒

- [ ] Nexus System
- [ ] Universe Types
- [ ] Cross-Game Progression

| Task | Spec |
|------|------|
| Nexus System | [nexus-system/spec.md](openspec/specs/nexus-system/spec.md) |
| Universe Types | [universe-system/spec.md](openspec/specs/universe-system/spec.md) |
| Cross-Game Progression | [nexus-system/spec.md](openspec/specs/nexus-system/spec.md) |

### Phase 22: Sociological Metrics - Foundation ✅ COMPLETE

- [x] MetricsCollectionSystem (ECS)
- [x] Event schemas (Interaction, Behavior, Spatial, Resource)
- [x] RingBuffer implementation
- [x] Event emitters in AISystem/World
- [x] Metrics configuration

**Status:** ✅ Complete (finished 2025-12-26)
**Dependencies:** Phase 3 (Agent Needs) ✅, Phase 4 (Memory & Social) ✅, Phase 5 (Communication) ✅
**Parallel Work:** 🔀 Can run parallel with Phase 7-11
**Estimated LOC:** ~1,500
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| MetricsCollectionSystem (ECS) | ✅ Complete | [Section 2.1](custom_game_engine/specs/sociological-metrics-system.md#21-metricscollectionsystem-ecs-system) | - |
| Event schemas (Interaction, Behavior, Spatial, Resource) | ✅ Complete | [Section 2.2](custom_game_engine/specs/sociological-metrics-system.md#22-event-schemas) | 🔀 |
| RingBuffer implementation | ✅ Complete | [Section 3.1](custom_game_engine/specs/sociological-metrics-system.md#31-in-memory-buffers-during-simulation) | 🔀 |
| Event emitters in AISystem/World | ✅ Complete | [Section 2.1](custom_game_engine/specs/sociological-metrics-system.md#21-metricscollectionsystem-ecs-system) | - |
| Metrics configuration | ✅ Complete | [Section 8.1](custom_game_engine/specs/sociological-metrics-system.md#81-metrics-configuration) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/sociological-metrics-foundation/work-order.md](agents/autonomous-dev/work-orders/sociological-metrics-foundation/work-order.md)

**Implementation:**
- `packages/core/src/systems/MetricsCollectionSystem.ts`
- `packages/core/src/metrics/events/`
- `packages/core/src/metrics/buffers/`
- `config/metrics.config.ts`

**Tests:** `packages/core/src/metrics/__tests__/`

---

### Phase 23: Sociological Metrics - Storage & API ✅ COMPLETE

- [x] Tiered file storage (hot/warm/cold)
- [x] Periodic flush mechanism
- [x] REST-like API interface
- [x] Live streaming (pub/sub)
- [x] CSV/JSON export functionality

**Status:** ✅ Complete
**Dependencies:** Phase 22 (Foundation)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~1,000
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| Tiered file storage (hot/warm/cold) | ✅ Complete | [Section 3.2](custom_game_engine/specs/sociological-metrics-system.md#32-persistent-storage-sqlite) | - |
| Periodic flush mechanism | ✅ Complete | [Section 6.1](custom_game_engine/specs/sociological-metrics-system.md#61-optimization-strategies) | - |
| REST-like API interface | ✅ Complete | [Section 5.1](custom_game_engine/specs/sociological-metrics-system.md#51-rest-api) | 🔀 |
| Live streaming (pub/sub) | ✅ Complete | [Section 5.2](custom_game_engine/specs/sociological-metrics-system.md#52-websocket-api) | 🔀 |
| CSV/JSON export functionality | ✅ Complete | [Section 3.3](custom_game_engine/specs/sociological-metrics-system.md#33-export-formats) | 🔀 |

**Implementation Notes:**
- Used file-based tiered storage instead of SQLite (avoids native dependencies, works in-browser)
- MetricsAPI provides REST-like interface callable directly or wrappable with Express
- MetricsLiveStream provides pub/sub for real-time updates (wrappable with WebSocket for server deployment)

**Implementation:**
- `packages/core/src/metrics/MetricsStorage.ts` (tiered hot/warm/cold storage)
- `packages/core/src/metrics/api/MetricsAPI.ts` (REST-like queries)
- `packages/core/src/metrics/api/MetricsLiveStream.ts` (real-time streaming)
- `packages/core/src/metrics/api/index.ts`

---

### Phase 24: Sociological Metrics - Analysis Modules ✅ COMPLETE

- [x] NetworkAnalyzer (graph metrics)
- [x] SpatialAnalyzer (territory, heatmaps)
- [x] InequalityAnalyzer (Gini, stratification)
- [x] CulturalDiffusionAnalyzer

**Status:** ✅ Complete
**Dependencies:** Phase 22 (Foundation)
**Parallel Work:** 🔀 All analyzers can be developed in parallel
**Estimated LOC:** ~2,000
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| NetworkAnalyzer (graph metrics) | ✅ Complete | [Section 4.1](custom_game_engine/specs/sociological-metrics-system.md#41-networkanalyzer) | 🔀 |
| SpatialAnalyzer (territory, heatmaps) | ✅ Complete | [Section 4.3](custom_game_engine/specs/sociological-metrics-system.md#43-spatialanalyzer) | 🔀 |
| InequalityAnalyzer (Gini, stratification) | ✅ Complete | [Section 4.4](custom_game_engine/specs/sociological-metrics-system.md#44-inequalityanalyzer) | 🔀 |
| CulturalDiffusionAnalyzer | ✅ Complete | [Section 4.2](custom_game_engine/specs/sociological-metrics-system.md#42-culturaldiffusionanalyzer) | 🔀 |

**Implementation:**
- `packages/core/src/metrics/analyzers/NetworkAnalyzer.ts`
- `packages/core/src/metrics/analyzers/SpatialAnalyzer.ts`
- `packages/core/src/metrics/analyzers/InequalityAnalyzer.ts`
- `packages/core/src/metrics/analyzers/CulturalDiffusionAnalyzer.ts`
- `packages/core/src/metrics/analyzers/index.ts`

**Key Metrics:**
- **Network**: Density, clustering, centrality (degree/betweenness/closeness/eigenvector), communities, diameter
- **Spatial**: Territory detection, hotspot detection, heatmaps, segregation indices (dissimilarity/isolation/concentration/clustering)
- **Inequality**: Gini coefficient, Theil index, Atkinson index, Palma ratio, Lorenz curves, mobility matrices
- **Cultural**: Diffusion cascades, adoption curves (S-curves), influencer detection, transmission rates

---

### Phase 25: Sociological Metrics - Visualization Dashboard 🚧 IN PROGRESS

- [ ] Dashboard React app setup
- [ ] Network visualization (force-directed graph)
- [ ] Behavior timeline view
- [ ] Spatial heatmap overlay
- [ ] Inequality dashboard (Lorenz curves)
- [ ] Cultural diffusion view (Sankey diagrams)
- [ ] Time series explorer

**Status:** 🚧 In Progress (Claimed by spec-agent-001 on 2026-01-02, handed off to Test Agent)
**Dependencies:** Phase 23 (Storage & API), Phase 24 (Analysis)
**Parallel Work:** 🔀 All visualization components can be built in parallel
**Estimated LOC:** ~2,500
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| Dashboard React app setup | ⏳ Ready | [Section 7.1, 7.2](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | - |
| Network visualization (force-directed graph) | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Behavior timeline view | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Spatial heatmap overlay | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Inequality dashboard (Lorenz curves) | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Cultural diffusion view (Sankey diagrams) | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Time series explorer | ⏳ Ready | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |

**Implementation:**
- `packages/metrics-dashboard/` (new package)
- `packages/metrics-dashboard/src/components/`
- `packages/metrics-dashboard/src/views/`

**Tech Stack:** React, TypeScript, D3.js, Cytoscape.js, Recharts, Zustand

**Visualizations:**
- **Network View**: Interactive force-directed graph with community detection
- **Behavior Timeline**: Stacked area charts, innovation/adoption events
- **Spatial Heatmap**: Density overlay, movement trails, territory boundaries
- **Inequality Dashboard**: Lorenz curves, Gini trends, quartile analysis
- **Cultural Diffusion**: Sankey diagrams, cascade trees, adoption curves
- **Time Series**: Multi-metric line charts, correlation matrices

---

### Phase 26: Sociological Metrics - Advanced Analysis 🔒 BLOCKED

- [ ] Automated insight generation
- [ ] Anomaly detection algorithms
- [ ] Pattern recognition (emergent behaviors)
- [ ] Predictive modeling (social change forecasting)
- [ ] Historical playback mode
- [ ] Custom query language

**Status:** 🔒 Blocked on Phase 24, 25
**Dependencies:** Phase 24 (Analysis Modules), Phase 25 (Visualization)
**Parallel Work:** 🔀 Can develop features in parallel
**Estimated LOC:** ~1,000
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| Automated insight generation | 🔒 Blocked | [Section 4](custom_game_engine/specs/sociological-metrics-system.md#4-analysis-modules) | 🔀 |
| Anomaly detection algorithms | 🔒 Blocked | [Section 4](custom_game_engine/specs/sociological-metrics-system.md#4-analysis-modules) | 🔀 |
| Pattern recognition (emergent behaviors) | 🔒 Blocked | [Section 4](custom_game_engine/specs/sociological-metrics-system.md#4-analysis-modules) | 🔀 |
| Predictive modeling (social change forecasting) | 🔒 Blocked | [Section 4](custom_game_engine/specs/sociological-metrics-system.md#4-analysis-modules) | 🔀 |
| Historical playback mode | 🔒 Blocked | [Section 10](custom_game_engine/specs/sociological-metrics-system.md#10-implementation-plan) | - |
| Custom query language | 🔒 Blocked | [Section 5.1](custom_game_engine/specs/sociological-metrics-system.md#51-rest-api) | - |

**Implementation:**
- `packages/core/src/metrics/insights/`
- `packages/core/src/metrics/anomalies/`
- `packages/core/src/metrics/patterns/`

**Features:**
- Detect network fragmentation events
- Identify super-spreaders of cultural behaviors
- Alert on resource inequality spikes
- Predict community split events
- Track long-term evolutionary social dynamics

---

### Phase 27: Divine Communication System ✅ COMPLETE

- [x] SpiritualComponent
- [x] PrayerSystem
- [x] PrayerAnsweringSystem
- [x] PrayBehavior
- [x] MeditateBehavior
- [x] GroupPrayBehavior
- [x] RitualSystem
- [x] SacredSiteSystem
- [x] VisionDeliverySystem
- [x] LLM Vision Generation
- [x] Faith/Doubt Mechanics
- [ ] Player Vision UI

**Status:** ✅ Complete (Comprehensive implementation with LLM integration - 2025-12-31)
**Dependencies:** Phase 3 (Agent Needs) ✅, Phase 4 (Memory & Social) ✅, Phase 5 (Communication) ✅, Phase 8 (Circadian/Sleep) ✅
**Parallel Work:** 🔀 Can run parallel with Phase 7-11, 22-26
**Actual LOC:** ~3,500+ (fully implemented)
**Spec:** [divine-communication-system.md](openspec/specs/divinity-system/divine-communication-system.md)

**Current Implementation:**
- ✅ SpiritualComponent (312 lines) - Complete with prayers, visions, faith, doubts
- ✅ PrayerSystem (347 lines) - Auto prayer generation based on needs
- ✅ PrayerAnsweringSystem (284 lines) - Auto-answering with belief costs
- ✅ PrayBehavior (349 lines) - Agents actively pray
- ✅ MeditateBehavior (376 lines) - Agents meditate, receive visions
- ✅ GroupPrayBehavior (424 lines) - Group prayer mechanics
- ✅ RitualSystem (150+ lines) - Ritual scheduling and performance
- ✅ SacredSiteSystem - Emergent sacred sites
- ✅ VisionDeliverySystem (516 lines) - Divine vision delivery with templates
- ✅ LLMVisionGenerator (340+ lines) - **NEW: LLM-based vision content generation**
- ✅ Faith/doubt mechanics - In SpiritualComponent (faith, doubts, crisis system)
- ✅ BeliefComponent, DeityComponent exist
- ✅ BeliefFormationSystem, BeliefGenerationSystem implemented
- ✅ AIGodBehaviorSystem (basic AI god behavior)
- ✅ AngelSystem, AvatarSystem frameworks exist

| Task | Status | Implementation | Lines |
|------|--------|----------------|-------|
| SpiritualComponent | ✅ | `packages/core/src/components/SpiritualComponent.ts` | 312 |
| PrayerSystem | ✅ | `packages/core/src/systems/PrayerSystem.ts` | 347 |
| PrayerAnsweringSystem | ✅ | `packages/core/src/systems/PrayerAnsweringSystem.ts` | 284 |
| PrayBehavior | ✅ | `packages/core/src/behavior/behaviors/PrayBehavior.ts` | 349 |
| MeditateBehavior | ✅ | `packages/core/src/behavior/behaviors/MeditateBehavior.ts` | 376 |
| GroupPrayBehavior | ✅ | `packages/core/src/behavior/behaviors/GroupPrayBehavior.ts` | 424 |
| RitualSystem | ✅ | `packages/core/src/systems/RitualSystem.ts` | 150+ |
| SacredSiteSystem | ✅ | `packages/core/src/systems/SacredSiteSystem.ts` | 200+ |
| VisionDeliverySystem | ✅ | `packages/core/src/divinity/VisionDeliverySystem.ts` | 516 |
| LLM Vision Generation | ✅ | `packages/core/src/divinity/LLMVisionGenerator.ts` | 340+ |
| Faith/Doubt Mechanics | ✅ | Built into SpiritualComponent | - |
| Player Vision UI | ⏳ | UI layer (future work) | - |

**Key Features:**
- 🙏 **Prayer System**: Agents pray based on needs, mood, faith
- 🧘 **Meditation**: Agents meditate to receive divine visions
- 👥 **Group Prayer**: Community prayer with amplified effects
- 🏛️ **Sacred Sites**: Emergent holy locations that enhance prayer power
- 🎭 **Ritual System**: Scheduled ceremonies and festivals
- ✨ **Vision Delivery**: Divine messages via dreams, meditation, signs, or direct contact
- 🤖 **LLM Integration**: Context-aware, personalized vision content generation
- 📈 **Faith Mechanics**: Faith levels, doubts, crisis of faith system
- 💬 **Auto-Answering**: Deities auto-answer prayers with belief costs
- `packages/core/src/systems/SacredSiteSystem.ts`
- `packages/core/src/actions/PrayAction.ts`
- `packages/core/src/actions/MeditateAction.ts`

**Key Features:**
- **Prayer**: Agents actively communicate with player/god
- **Meditation**: Receptive state for divine guidance
- **Visions**: Divine messages delivered to agents
- **Faith**: Dynamic belief system affecting behavior
- **Sacred Sites**: Locations of spiritual significance
- **Rituals**: Emergent prayer practices

**Player Role:** You are God - agents pray to you, you respond with visions

---

### Phase 29: Item System Refactor ✅ COMPLETE

- [x] MaterialTemplate interface & registry
- [x] ItemDefinition with traits (refactor)
- [x] ItemInstance type for runtime items
- [x] Trait composition (EdibleTrait, WeaponTrait, ArmorTrait, etc.)
- [x] Material-based property inheritance
- [ ] ItemQuality system

**Status:** ✅ Complete (Comprehensive materials, traits, and item instances - 2026-01-01)
**Dependencies:** None
**Parallel Work:** 🔀 Can run parallel with Phase 30, 31
**Estimated LOC:** ~2,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *Inspired by Dwarf Fortress - where leather and iron are fundamentally the same thing, just with different properties.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| MaterialTemplate interface & registry | ✅ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | - |
| ItemDefinition with traits (refactor) | ✅ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | - |
| ItemInstance type for runtime items | ✅ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | 🔀 |
| Trait composition (EdibleTrait, WeaponTrait, ArmorTrait, etc.) | ✅ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trait-composition) | 🔀 |
| Material-based property inheritance | ✅ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#material-template-system) | - |
| ItemQuality system | ⏳ | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#item-definition-vs-instance) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/trait-composition-(edibletrait,-weapontrait,-etc.)/work-order.md](agents/autonomous-dev/work-orders/trait-composition-(edibletrait,-weapontrait,-etc.)/work-order.md)
**Status:** READY_FOR_TESTS (claimed 2025-12-28 by spec-agent-001)

**Implementation:**
- `packages/core/src/materials/MaterialTemplate.ts`
- `packages/core/src/materials/MaterialRegistry.ts`
- `packages/core/src/items/ItemDefinition.ts` (refactor)
- `packages/core/src/items/ItemInstance.ts` (new)
- `packages/core/src/items/traits/` (new directory)

**Key Design Decisions:**
- Materials define base properties (density, hardness, magic affinity)
- Items reference materials, inheriting properties
- Traits are optional property bags (composable)
- Instances can override/add traits (for enchantments)

---

### Phase 30: Magic System ⏳ READY (⚠️ Partially Implemented)

- [ ] MagicSource registry
- [ ] Technique enum (create, perceive, transform, etc.)
- [ ] Form enum (fire, water, mind, void, etc.)
- [ ] ComposedSpell interface
- [ ] EffectExpression type (universal format)
- [ ] EffectOperation types (instruction set)
- [ ] Expression language (safe, side-effect-free)
- [ ] EffectInterpreter with limits
- [ ] Initial magic sources (Arcane, Divine, Void)
- [ ] ComposedSpell → EffectExpression compiler

**Status:** ⏳ Ready (basic framework exists, needs paradigm completion)
**Dependencies:** None (but benefits from Phase 29)
**Parallel Work:** 🔀 Can run parallel with Phase 29, 31
**Estimated LOC:** ~3,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *Inspired by Ars Magica - verb/noun composition for emergent spell creation.*

**Current Implementation:**
- ✅ MagicComponent, ManaComponent, MagicSystem exist
- ✅ Basic spell casting infrastructure
- ✅ Multiple paradigm types defined
- ❌ Multi-source magic (blood, emotion, stars) not implemented
- ❌ Verb/Noun composition incomplete
- ❌ Magic skill trees missing
- ❌ Combo system not implemented
- ❌ Creative paradigms (Art, Dream, Music) not implemented

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| MagicSource registry | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-2-magic-system-architecture) | - |
| Technique enum (create, perceive, transform, etc.) | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#multi-source-magic-multiverse-ready) | 🔀 |
| Form enum (fire, water, mind, void, etc.) | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#multi-source-magic-multiverse-ready) | 🔀 |
| ComposedSpell interface | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#spell-composition-ars-magica-style) | - |
| EffectExpression type (universal format) | ⏳ Ready | [Part 3](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-3-effect-system-the-execution-model) | - |
| EffectOperation types (instruction set) | ⏳ Ready | [Part 3](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-operations-the-instruction-set) | 🔀 |
| Expression language (safe, side-effect-free) | ⏳ Ready | [Part 3](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#expression-language-safe-side-effect-free) | - |
| EffectInterpreter with limits | ⏳ Ready | [Part 3](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-interpreter-safe-execution) | - |
| Initial magic sources (Arcane, Divine, Void) | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#example-magic-sources) | 🔀 |
| ComposedSpell → EffectExpression compiler | ⏳ Ready | [Part 2](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#spell-composition-ars-magica-style) | - |

**Implementation:**
- `packages/core/src/magic/MagicSource.ts`
- `packages/core/src/magic/MagicRegistry.ts`
- `packages/core/src/magic/Technique.ts`
- `packages/core/src/magic/Form.ts`
- `packages/core/src/magic/ComposedSpell.ts`
- `packages/core/src/effects/EffectExpression.ts`
- `packages/core/src/effects/EffectOperation.ts`
- `packages/core/src/effects/EffectInterpreter.ts`
- `packages/core/src/effects/Expression.ts`

**Key Design Decisions:**
- Multiple magic sources (Arcane, Divine, Void, etc.) with different rules
- Verb/Noun composition (Technique + Form = Spell)
- All effects compile to EffectExpression (universal bytecode)
- Expression language is safe (no side effects, guaranteed termination)
- Interpreter has hard limits (max operations, max damage, etc.)

---

### Phase 31: Persistence Layer ✅ COMPLETE

- [x] Schema versioning system
- [x] Migration registry
- [x] SerializedWorldState format
- [x] World.serialize() / deserialize()
- [x] SaveFile format
- [x] IndexedDB storage backend
- [x] FileSystem storage backend
- [x] Checksum validation
- [x] Auto-save System
- [x] Timeline UI
- [x] GZIP Compression
- [x] Invariant Checker
- [x] Passage System

**Status:** ✅ Complete (2026-01-02 - Enhanced with auto-save, checkpoints, Timeline UI)
**Dependencies:** None
**Actual LOC:** ~3,500+ (including enhancements)
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

| Task | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Schema versioning system | ✅ | `packages/core/src/persistence/serializers/` | Component versioning |
| Migration registry | ✅ | `packages/core/src/persistence/serializers/` | Migration system |
| SerializedWorldState format | ✅ | `packages/core/src/persistence/` | World serialization |
| World.serialize() / deserialize() | ✅ | `packages/core/src/World.ts` | Full state save/load |
| SaveFile format | ✅ | `packages/core/src/persistence/` | Versioned format |
| IndexedDB storage backend | ✅ | `packages/core/src/persistence/` | Browser storage |
| FileSystem storage backend | ✅ | `packages/core/src/persistence/` | Desktop storage |
| Checksum validation | ✅ | `packages/core/src/persistence/` | Integrity checks |
| **Auto-save System** | ✅ | `packages/core/src/systems/AutoSaveSystem.ts` | **NEW: Daily checkpoints** |
| **Timeline UI** | ✅ | `packages/renderer/src/TimelinePanel.ts` | **NEW: Checkpoint selection** |
| **GZIP Compression** | ✅ | `packages/core/src/persistence/` | **NEW: Save file compression** |
| **Invariant Checker** | ✅ | `packages/core/src/persistence/InvariantChecker.ts` | **NEW: Validation system** |
| **Passage System** | ✅ | `packages/core/src/multiverse/PassageSystem.ts` | **NEW: Cross-universe traversal** |

**Implementation:**
- `packages/core/src/persistence/Versioned.ts`
- `packages/core/src/persistence/Migration.ts`
- `packages/core/src/persistence/MigrationRegistry.ts`
- `packages/core/src/persistence/SerializedWorldState.ts`
- `packages/core/src/persistence/SaveFile.ts`
- `packages/core/src/persistence/StorageBackend.ts`
- `packages/core/src/persistence/IndexedDBStorage.ts`
- `packages/core/src/persistence/FileSystemStorage.ts`
- `packages/core/src/World.ts` (add serialize/deserialize)

**Key Features Implemented:**
- ✅ **Schema Versioning** - Every component has version tracking with migrations
- ✅ **Multiple Storage Backends** - IndexedDB (browser) and FileSystem (desktop)
- ✅ **Checksum Validation** - Integrity checks for all save files
- ✅ **Auto-save System** - Automatic daily checkpoints for time travel
- ✅ **Timeline UI** - Visual interface for browsing and selecting checkpoints/universes
- ✅ **GZIP Compression** - Reduces save file size significantly
- ✅ **Invariant Checker** - Validates world state consistency on load
- ✅ **Passage System** - Cross-universe item/entity traversal support
- ✅ **Time Travel Support** - Load any checkpoint to revisit past moments

---

### Phase 32: Universe Forking ⏳ READY

- [ ] WorldFork interface
- [ ] UniverseManager.fork()
- [ ] UniverseManager.runFork()
- [x] InvariantChecker
- [ ] ForkResults collection
- [ ] WorldDiff utility
- [ ] Fork execution in Web Worker

**Status:** ⏳ Ready (Phase 31 ✅ complete! Serialization/Invariants ready)
**Dependencies:** Phase 31 ✅ (World.serialize/deserialize + InvariantChecker available)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~2,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *The game world itself is the sandbox. Fork it, test effects, observe results.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| WorldFork interface | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-5-universe-forking-parallel-world-testing) | - |
| UniverseManager.fork() | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |
| UniverseManager.runFork() | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |
| InvariantChecker | ✅ Complete | Phase 31 (already implemented) | - |
| ForkResults collection | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | 🔀 |
| WorldDiff utility | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | 🔀 |
| Fork execution in Web Worker | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |

**Implementation:**
- `packages/core/src/universe/WorldFork.ts`
- `packages/core/src/universe/UniverseManager.ts`
- `packages/core/src/universe/InvariantChecker.ts`
- `packages/core/src/universe/ForkResults.ts`
- `packages/core/src/universe/WorldDiff.ts`
- `packages/core/src/workers/ForkWorker.ts`

**Key Features:**
- Fork universe at any point (serialize state)
- Inject experimental effects into fork
- Run simulation forward N cycles
- Collect crashes, invariant violations, balance metrics
- Compare world state before/after (diff)

---

### Phase 33: LLM Effect Generation 🔒 BLOCKED

- [ ] EffectGenerationPrompt structure
- [ ] JSON Schema for EffectExpression
- [ ] Schema validation
- [ ] Power level estimation
- [ ] Infinite loop detection
- [ ] EffectTestingPipeline
- [ ] HumanReviewQueue
- [ ] BlessedEffectRegistry
- [ ] Feedback loop to LLM

**Status:** 🔒 Blocked on Phase 30 (Magic System) and Phase 32 (Universe Forking)
**Dependencies:** Phase 30 (EffectExpression), Phase 32 (testing infrastructure)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~2,500
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *LLMs generate novel effects, universes validate them, humans approve them.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| EffectGenerationPrompt structure | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-4-llm-generated-effects) | - |
| JSON Schema for EffectExpression | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#generation-prompt-structure) | 🔀 |
| Schema validation | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#validation-layers) | - |
| Power level estimation | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#validation-layers) | 🔀 |
| Infinite loop detection | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#validation-layers) | 🔀 |
| EffectTestingPipeline | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#generation-pipeline) | - |
| HumanReviewQueue | 🔒 Blocked | [Part 8](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-8-human-review-system) | 🔀 |
| BlessedEffectRegistry | 🔒 Blocked | [Part 8](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#blessed-effect-registry) | - |
| Feedback loop to LLM | 🔒 Blocked | [Part 4](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#generation-pipeline) | 🔀 |

**Implementation:**
- `packages/core/src/effects/generation/EffectGenerationPrompt.ts`
- `packages/core/src/effects/generation/EffectValidator.ts`
- `packages/core/src/effects/generation/EffectTestingPipeline.ts`
- `packages/core/src/effects/generation/effectSchema.json`
- `packages/core/src/effects/review/HumanReviewQueue.ts`
- `packages/core/src/effects/review/HumanReviewRequest.ts`
- `packages/core/src/effects/registry/BlessedEffectRegistry.ts`

**Key Features:**
- LLM generates EffectExpression JSON (not arbitrary code)
- Schema validation catches malformed effects
- Power level estimation prevents OP effects
- Universe fork testing catches crashes/exploits
- Human review queue for final approval
- Only blessed effects can be used in main game

---

### Phase 34: Cross-Universe Sharing 🔒 BLOCKED

- [ ] EffectPackage format
- [ ] CreatorIdentity & provenance
- [ ] EffectLore (narrative history)
- [ ] TrustPolicy configuration
- [ ] CrossUniverseImporter
- [ ] Local validation on import
- [ ] Export to JSON file
- [ ] Import from JSON file
- [ ] UniverseIdentity (multiverse lore)

**Status:** 🔒 Blocked on Phase 31 (Persistence) and Phase 33 (Effect Generation)
**Dependencies:** Phase 31 (serialization), Phase 33 (blessed effects)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~2,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *Effects are portable artifacts. Share them between universes and games.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| EffectPackage format | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-6-cross-universe-sharing) | - |
| CreatorIdentity & provenance | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-package-format) | 🔀 |
| EffectLore (narrative history) | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-package-format) | 🔀 |
| TrustPolicy configuration | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trust-model) | - |
| CrossUniverseImporter | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trust-model) | - |
| Local validation on import | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trust-model) | - |
| Export to JSON file | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-package-format) | 🔀 |
| Import from JSON file | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trust-model) | 🔀 |
| UniverseIdentity (multiverse lore) | 🔒 Blocked | [Part 6](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#effect-package-format) | 🔀 |

**Implementation:**
- `packages/core/src/sharing/EffectPackage.ts`
- `packages/core/src/sharing/CreatorIdentity.ts`
- `packages/core/src/sharing/EffectLore.ts`
- `packages/core/src/sharing/TrustPolicy.ts`
- `packages/core/src/sharing/CrossUniverseImporter.ts`
- `packages/core/src/sharing/UniverseIdentity.ts`
- `packages/core/src/sharing/exporter.ts`
- `packages/core/src/sharing/importer.ts`

**Key Features:**
- Effects are self-contained JSON packages
- Provenance tracks creator, origin universe, approval chain
- Trust policy controls auto-accept/reject/validate
- Local validation re-tests imported effects in YOUR universe
- Lore generation tells the "story" of how effects traveled
- No central server required - just share JSON files

---

### Phase 28: Angel Delegation System ✅ COMPLETE

- [x] AngelComponent & types
- [x] Angel AI system (prayer assignment)
- [x] Angel response generation (LLM)
- [x] Angel creation system
- [x] Divine resource management
- [ ] Angel management UI
- [ ] Angel progression & leveling
- [ ] Archangel hierarchy
- [ ] Angel failure & corruption
- [ ] Outcome tracking

**Status:** ✅ Complete (Core delegation system implemented with LLM integration - 2025-12-31)
**Dependencies:** Phase 27 (Divine Communication) ✅
**Parallel Work:** Tasks within phase can be parallelized
**Actual LOC:** ~4,000+
**Spec:** [angel-delegation-system.md](openspec/specs/divinity-system/angel-delegation-system.md)

**Current Implementation:**
- ✅ **AngelSystem framework** - Complete structure and types
- ✅ **AngelAIDecisionProcessor** - LLM-based decision making (~500 lines)
- ✅ **Angel personality system** - Compassion, strictness, proactiveness, wisdom
- ✅ **Prayer assignment logic** - Purpose matching, ranking, scoring
- ✅ **LLM response generation** - Angel-specific prompts with personality
- ✅ **Fallback responses** - Template-based when LLM unavailable
- ✅ **AngelSystem integration** - Complete and functional
- ✅ **Prayer infrastructure** - Fully integrated with Phase 27

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| AngelComponent & types | ✅ | [Section 2](openspec/specs/divinity-system/angel-delegation-system.md#2-angel-types--components) | - |
| Angel AI system (prayer assignment) | ✅ | [Section 3.1](openspec/specs/divinity-system/angel-delegation-system.md#31-prayer-assignment) | - |
| Angel response generation (LLM) | ✅ | [Section 3.2](openspec/specs/divinity-system/angel-delegation-system.md#32-prayer-response-generation) | - |
| Angel creation system | ✅ | [Section 4.1](openspec/specs/divinity-system/angel-delegation-system.md#41-angel-creation) | 🔀 |
| Divine resource management | ✅ | [Section 8](openspec/specs/divinity-system/angel-delegation-system.md#8-divine-resources) | - |
| Angel management UI | ⏳ | [UI Spec](openspec/specs/divinity-system/divine-systems-ui.md) | 🔀 |
| Angel progression & leveling | ⏳ | [Section 6.1](openspec/specs/divinity-system/angel-delegation-system.md#61-leveling-system) | - |
| Archangel hierarchy | ⏳ | [Section 5](openspec/specs/divinity-system/angel-delegation-system.md#5-angel-hierarchy) | 🔀 |
| Angel failure & corruption | ⏳ | [Section 7](openspec/specs/divinity-system/angel-delegation-system.md#7-angel-failure--corruption) | 🔀 |
| Outcome tracking | ⏳ | [Section 7.1](openspec/specs/divinity-system/angel-delegation-system.md#71-tracking-outcomes) | - |

**Implementation:**
- `packages/core/src/components/AngelComponent.ts`
- `packages/core/src/systems/AngelAISystem.ts`
- `packages/core/src/systems/AngelCreationSystem.ts`
- `packages/core/src/systems/AngelProgressionSystem.ts`
- `packages/core/src/systems/ArchangelSystem.ts`
- `packages/core/src/systems/AngelFailureSystem.ts`
- `packages/core/src/systems/DivineResourceSystem.ts`

**Key Features:**
- **Automation**: Angels handle prayers as village grows
- **Specialization**: Different angel types (Guardian, Specialist, Messenger)
- **Personalities**: Each angel has unique traits
- **Progression**: Angels level up, gain abilities
- **Hierarchy**: Archangels manage other angels
- **Failure States**: Angels can make mistakes, become corrupted

**Gameplay Progression:**
- Early game: You answer all prayers personally (5 agents)
- Mid game: Create angels to delegate (15+ agents)
- Late game: Angel hierarchy, you manage strategy (50+ agents)

---

### Phase 35: Psychopomp Death Conversation System ✅ COMPLETE

- [x] DeathJudgmentComponent
- [x] DeathJudgmentSystem
- [x] DeathTransitionSystem Integration
- [x] ReincarnationSystem
- [x] Soul Identity Components
- [x] Afterlife Memory System
- [x] Soul Creation Ceremony

**Status:** ✅ Complete (Dramatic death narrative system - 2026-01-01)
**Dependencies:** Phase 27 (Divine Communication) ✅, Phase 4 (Memory & Social) ✅
**Parallel Work:** Standalone system, can run independently
**Actual LOC:** ~800+
**Implementation Summary:** [PSYCHOPOMP_IMPLEMENTATION_SUMMARY.md](custom_game_engine/PSYCHOPOMP_IMPLEMENTATION_SUMMARY.md)
**Design Doc:** [PSYCHOPOMP_DESIGN.md](custom_game_engine/packages/core/src/divinity/PSYCHOPOMP_DESIGN.md)

**Transforms death from a simple state transition into a narrative event** - dying agents encounter a psychopomp (death guide angel) who conducts a four-stage conversation before they transition to the afterlife.

| Task | Status | Implementation | Lines |
|------|--------|----------------|-------|
| DeathJudgmentComponent | ✅ | `packages/core/src/components/DeathJudgmentComponent.ts` | ~200 |
| DeathJudgmentSystem | ✅ | `packages/core/src/systems/DeathJudgmentSystem.ts` | ~400 |
| DeathTransitionSystem Integration | ✅ | `packages/core/src/systems/DeathTransitionSystem.ts` | Modified |
| ReincarnationSystem | ✅ | `packages/core/src/systems/ReincarnationSystem.ts` | ~500 |
| Soul Identity Components | ✅ | `packages/core/src/components/Soul*.ts` | ~400 |
| Afterlife Memory System | ✅ | `packages/core/src/components/AfterlifeMemoryComponent.ts` | ~200 |
| Soul Creation Ceremony | ✅ | `packages/core/src/divinity/SoulCreationCeremony.ts` | ~300 |

**Key Features:**
- **Four-Stage Conversation**: Greeting → Life Review → Judgment → Crossing Over
- **Context-Aware Psychopomp**: Different greetings based on cause of death (old age, violence, starvation)
- **Judgment Criteria**: Peace (acceptance), Tether (relationships), Coherence (identity)
- **Soul Identity System**: Souls carry memories and traits across incarnations
- **Reincarnation System**: Souls return with wisdom from past lives
- **Afterlife Memory Fading**: Past life memories gradually fade over time
- **Template-Based Responses**: Ready for future LLM integration

**Conversation Flow:**
1. **Greeting** - Psychopomp appears, reveals death to agent
2. **Life Review** - Discussion of major events, relationships, deeds
3. **Judgment** - Evaluation of peace, tethers, and coherence
4. **Crossing Over** - Final words before transitioning to afterlife

**Integration:**
- Works seamlessly with existing death/health systems
- DeathTransitionSystem waits for judgment completion
- Affects reincarnation quality through judgment scores
- Compatible with deity-specific psychopomps (future expansion)

---

### Phase 36: Equipment System 🚧 IN PROGRESS

- [x] EquipmentComponent
- [x] EquipmentSystem
- [x] ClothingTrait
- [ ] Equipment Actions (equip/unequip/repair)
- [ ] Weapon Definitions
- [ ] Armor Definitions
- [ ] Clothing Definitions
- [ ] Combat Integration (StatBonusTrait + Destiny Luck)
- [ ] Temperature Integration
- [ ] Social Effects
- [x] Set Bonuses
- [ ] Equipment Durability

**Status:** 🚧 In Progress (Basic system ✅ complete, combat integration ⏳ pending)
**Dependencies:** Phase 29 (Item System Refactor) ✅, Phase 10 (Crafting) ✅
**Parallel Work:** 🔀 Can run parallel with Phase 30, 31
**Estimated LOC:** ~1,500 (core system) + ~500 (combat integration)
**Spec:** [equipment-system/spec.md](openspec/specs/equipment-system/spec.md)

**Leverages Phase 29's ArmorTrait and WeaponTrait** to provide comprehensive equipment for agents including armor, weapons, and clothing with combat, temperature, and social effects.

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| EquipmentComponent | ✅ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | - |
| EquipmentSystem | ✅ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | - |
| ClothingTrait | ✅ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Equipment Actions (equip/unequip/repair) | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Weapon Definitions | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Armor Definitions | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Clothing Definitions | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Combat Integration (StatBonusTrait + Destiny Luck) | ⏳ | [EQUIPMENT_COMBAT_SPEC.md](custom_game_engine/architecture/EQUIPMENT_COMBAT_SPEC.md) | - |
| Temperature Integration | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | - |
| Social Effects | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Set Bonuses | ✅ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | 🔀 |
| Equipment Durability | ⏳ | [equipment-system/spec.md](openspec/specs/equipment-system/spec.md) | - |

**Implementation:**
- `packages/core/src/components/EquipmentComponent.ts`
- `packages/core/src/systems/EquipmentSystem.ts`
- `packages/core/src/actions/EquipActions.ts`
- `packages/core/src/items/traits/ClothingTrait.ts`
- `packages/core/src/items/equipment/weapons.ts`
- `packages/core/src/items/equipment/armor.ts`
- `packages/core/src/items/equipment/clothing.ts`

**Key Features:**
- **8 Equipment Slots**: head, neck, torso, back, hands, waist, legs, feet + weapons/rings
- **4 Armor Classes**: clothing, light, medium, heavy (affects defense & movement)
- **8 Damage Types**: slashing, piercing, bludgeoning, fire, frost, lightning, poison, magic
- **Material-Based Properties**: Iron sword ≠ Steel sword (uses Phase 29 materials)
- **Clothing System**: Social effects (formality, class) + thermal effects (insulation, breathability)
- **Set Bonuses**: Wearing matched armor sets provides bonuses
- **Combat Integration**: Equipment affects damage/defense in conflict system
- **Temperature Integration**: Clothing provides warmth/cooling
- **Durability System**: Equipment degrades with use and can be repaired
- **Crafting Recipes**: Equipment crafted from materials with quality variation

---

### Phase 37: Reproduction System ✅ COMPLETE

- [x] Courtship System
- [x] Pregnancy System
- [x] Labor & Birth
- [x] Parenting System
- [x] Mating Paradigms

**Status:** ✅ Complete (Full courtship → pregnancy → labor → birth → parenting pipeline - 2025-12)
**Dependencies:** Phase 4 (Memory & Social) ✅, Phase 5 (Communication) ✅, Phase 29 (Body System) ✅
**Parallel Work:** Standalone system
**Actual LOC:** ~3,500+
**Implementation Summary:** [REPRODUCTION_SYSTEM_INTEGRATED.md](custom_game_engine/REPRODUCTION_SYSTEM_INTEGRATED.md)

**Comprehensive biological and social reproduction system** with five major subsystems working together to create a complete lifecycle from courtship through parenting.

| Task | Status | Implementation | Bug Fixes |
|------|--------|----------------|-----------|
| Courtship System | ✅ | `packages/core/src/reproduction/CourtshipSystem.ts` | 12 bugs fixed |
| Pregnancy System | ✅ | `packages/core/src/reproduction/PregnancySystem.ts` | Integrated |
| Labor & Birth | ✅ | `packages/core/src/reproduction/LaborSystem.ts` | Integrated |
| Parenting System | ✅ | `packages/core/src/reproduction/ParentingSystem.ts` | Integrated |
| Mating Paradigms | ✅ | `packages/core/src/reproduction/MatingParadigm.ts` | Registry complete |

**Key Features:**
- **Courtship**: Multi-stage attraction, flirting, dating, compatibility checks
- **Pregnancy**: Realistic gestation with trimesters, symptoms, complications
- **Labor**: Dramatic birth events with support, delivery, postpartum
- **Parenting**: Infant care, feeding, bonding, development milestones
- **Mating Paradigms**: 8 different reproduction strategies (monogamous, polyandrous, seasonal, etc.)
- **Genetics**: Trait inheritance from parents (appearance, personality, abilities)
- **Social Integration**: Relationship impacts, family bonds, cultural norms

**Courtship Stages:**
1. **Initial Attraction** - Agents notice each other based on personality/appearance
2. **Flirting** - Social interactions to gauge interest
3. **Dating** - Intentional romantic activities
4. **Commitment** - Relationship formalization
5. **Mating** - Reproduction attempt (paradigm-dependent)

**Pregnancy Phases:**
1. **First Trimester** (0-12 weeks) - Morning sickness, fatigue, early development
2. **Second Trimester** (13-26 weeks) - Energy returns, visible growth, movement
3. **Third Trimester** (27-40 weeks) - Heavy burden, nesting, preparation

**Labor Stages:**
1. **Early Labor** - Contractions begin, agents seek support
2. **Active Labor** - Intense contractions, movement to birthing location
3. **Delivery** - Birth of offspring with complications possible
4. **Postpartum** - Recovery, bonding, first feeding

**Parenting Activities:**
- Feed infant (hunger satisfaction)
- Change diapers (hygiene)
- Soothe crying (comfort)
- Play/interact (bonding, development)
- Protect from danger (survival)

**Mating Paradigms:**
- Monogamous pair bonding
- Polyandrous (multiple males)
- Polygynous (multiple females)
- Promiscuous (no pair bonds)
- Seasonal breeding
- Matriarchal colonies
- Eusocial reproduction (queen-based)
- Hermaphroditic (self-fertilization possible)

**Integration Points:**
- Memory system tracks romantic history
- Relationship system manages bonds
- Needs system includes parenting duties
- Body system defines reproductive anatomy
- Personality affects compatibility

---

### Phase 38: Realm System ✅ COMPLETE

- [x] Phase 1: Core Types & Components
- [x] Phase 2: RealmManager System
- [x] Phase 3: Portal & Transition Systems
- [x] Phase 4: Time Dilation System
- [x] Phase 5: Underworld & Death Transitions
- [x] Phase 6: Documentation & Finalization
- [x] Cross-Realm Communication

**Status:** ✅ Complete (2026-01-02 - All 6 phases implemented)
**Dependencies:** Phase 27 (Divine Communication) ✅
**Actual LOC:** ~4,500+
**Spec:** [divinity-system/mythological-realms.md](openspec/specs/divinity-system/mythological-realms.md)

**Comprehensive multiverse realm system** enabling parallel dimensions, time dilation, death transitions, and cross-realm communication.

| Task | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Phase 1: Core Types & Components | ✅ | `packages/core/src/realms/RealmTypes.ts` | Realm definitions |
| Phase 2: RealmManager System | ✅ | `packages/core/src/systems/RealmManager.ts` | Realm lifecycle |
| Phase 3: Portal & Transition Systems | ✅ | `packages/core/src/realms/RealmTransition.ts` | Portal mechanics |
| Phase 4: Time Dilation System | ✅ | `packages/core/src/systems/RealmTimeSystem.ts` | Variable time flow |
| Phase 5: Underworld & Death Transitions | ✅ | `packages/core/src/divinity/MythologicalRealms.ts` | Death mechanics |
| Phase 6: Documentation & Finalization | ✅ | Documentation complete | Integration tests |
| Cross-Realm Communication | ✅ | `packages/core/src/systems/CrossRealmPhoneSystem.ts` | Cross-realm phones |

**Implemented Realms:**
1. **Mortal Realm** - Default material plane, normal time flow
2. **Heaven (Ouranos)** - Divine realm, 10:1 time dilation (slower)
3. **Underworld (Tartarus)** - Death realm, 1:2 time dilation (faster)
4. **Dreamscape** - Mental/dream realm, dreamwalking support
5. **Elemental Planes** - Elemental forces, specialized portals
6. **Void** - Empty space between realms, dangerous traversal

**Key Features:**
- ✅ **RealmComponent** - Tracks entity's current realm
- ✅ **RealmLocationComponent** - Position within specific realm
- ✅ **Portal System** - Seamless realm transitions
- ✅ **Time Dilation** - Different time flow rates per realm
- ✅ **Death Transitions** - Automatic Underworld passage on death
- ✅ **Cross-Realm Phones** - Divine telecommunication devices
- ✅ **Realm-Specific Rules** - Custom physics/behavior per realm
- ✅ **Multi-Realm Rendering** - Visual distinction between realms

**Implementation Files:**
- `packages/core/src/realms/RealmTypes.ts`
- `packages/core/src/realms/RealmDefinitions.ts`
- `packages/core/src/realms/RealmTransition.ts`
- `packages/core/src/realms/RealmInitializer.ts`
- `packages/core/src/systems/RealmManager.ts`
- `packages/core/src/systems/RealmTimeSystem.ts`
- `packages/core/src/systems/CrossRealmPhoneSystem.ts`
- `packages/core/src/components/RealmComponent.ts`
- `packages/core/src/components/RealmLocationComponent.ts`
- `packages/core/src/components/CrossRealmPhoneComponent.ts`
- `packages/core/src/divinity/MythologicalRealms.ts`
- `packages/core/src/items/CrossRealmPhones.ts`

---

### Phase 39: Companion System 🚧 IN PROGRESS

- [x] CompanionComponent
- [x] OphanimimCompanionEntity
- [x] CompanionSystem (stub)
- [ ] Evolution Tracking
- [ ] Emotional System
- [ ] Memory & Needs
- [ ] RAG Knowledge System
- [ ] Chat UI Panel
- [ ] Governor Visibility
- [ ] Proactive Advice

**Status:** 🚧 In Progress (Phase 1 started 2026-01-02)
**Dependencies:** Phase 6 (LLM Integration) ✅, Phase 27 (Divine Communication) ✅
**Estimated LOC:** ~3,500+ (comprehensive system)
**Spec:** [companion-system/spec.md](openspec/specs/companion-system/spec.md)
**Implementation Plan:** [COMPANION_IMPLEMENTATION_PLAN.md](COMPANION_IMPLEMENTATION_PLAN.md)

**Ophanim Companion** - A celestial wheel-angel guide that evolves alongside the player, providing tutorial support, emotional connection, and civilization oversight.

| Task | Status | Implementation | Phase |
|------|--------|----------------|-------|
| CompanionComponent | ✅ | `packages/core/src/components/CompanionComponent.ts` | Phase 1 |
| OphanimimCompanionEntity | ✅ | `packages/core/src/companions/OphanimimCompanionEntity.ts` | Phase 1 |
| CompanionSystem (stub) | ✅ | `packages/core/src/systems/CompanionSystem.ts` | Phase 1 |
| Evolution Tracking | ⏳ Pending | Milestone detection system | Phase 2 |
| Emotional System | ⏳ Pending | Tier-based emotion evolution | Phase 3 |
| Memory & Needs | ⏳ Pending | Companion state tracking | Phase 4 |
| RAG Knowledge System | ⏳ Pending | Documentation retrieval | Phase 5 |
| Chat UI Panel | ⏳ Pending | `packages/renderer/src/CompanionChatPanel.ts` | Phase 6 |
| Governor Visibility | ⏳ Pending | Civilization monitoring | Phase 7 |
| Proactive Advice | ⏳ Pending | Context-aware suggestions | Phase 8 |

**Evolution Tiers:**
- **Tier 0: Primordial** - Basic awareness, simple emotions (alert, serene, tranquil)
- **Tier 1: Awakening** - First recognizable emotions (curious, joyful, concerned)
- **Tier 2: Emotional Depth** - Complex feelings (pride, empathy, frustration)
- **Tier 3: Self-Awareness** - Meta-emotions (nostalgic, philosophical, playful)
- **Tier 4: Transcendence** - Advanced states (awe, inspired, melancholic)
- **Tier 5: Unity** - Peak integration (harmonious, radiant, eternal)

**Key Features Planned:**
- 🚧 **RAG-Powered Knowledge** - Answer questions about game systems using documentation
- 🚧 **Governor Visibility** - See all villager states, resources, social dynamics
- 🚧 **Emotional Evolution** - Unlock more complex emotions as civilization grows
- 🚧 **Companion Needs** - Connection, purpose, rest, stimulation, appreciation
- 🚧 **Proactive Advice** - Alert player to issues (low food, conflicts, opportunities)
- 🚧 **Memory System** - Remember player actions, preferences, shared experiences
- 🚧 **Plotline Hooks** - Storylines triggered by dimensional breaches, civilization events

**Implementation Progress:**
- ✅ Phase 1: Core infrastructure (entity, component, system stub)
- ⏳ Phase 2-8: Evolution, emotions, RAG, UI (pending)

---

## Dependency Graph

```
                           ┌─────────────────────────────────────────────┐
                           │           PHASE 0: FOUNDATION               │
                           │  ECS, Events, Actions, Serialization        │
                           └─────────────────────┬───────────────────────┘
                                                 │
                           ┌─────────────────────▼───────────────────────┐
                           │         PHASE 1: WORLD GENERATION           │
                           │    Chunks, Terrain, Biomes, Renderer        │
                           └─────────────────────┬───────────────────────┘
                                                 │
                           ┌─────────────────────▼───────────────────────┐
                           │           PHASE 2: FIRST AGENT              │
                           │     Agent, Position, Movement, Render       │
                           └─────────────────────┬───────────────────────┘
                                                 │
                           ┌─────────────────────▼───────────────────────┐
                           │           PHASE 3: AGENT NEEDS              │
                           │      Needs, Resources, Foraging, Items      │
                           └─────────────────────┬───────────────────────┘
                                                 │
              ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
              │                  │               │               │                  │
              ▼                  ▼               ▼               ▼                  │
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐     │
    │   PHASE 4 🔀    │ │  PHASE 5 🔀   │ │  PHASE 6 🔀   │ │   PHASE 7 🚧    │     │
    │ Memory/Social   │ │ Communication │ │ LLM Integrate │ │ Building/Shelter│     │
    │    ✅ DONE      │ │   ✅ DONE     │ │   ✅ DONE     │ │   IN PROGRESS   │     │
    └────────┬────────┘ └───────┬───────┘ └───────┬───────┘ └────────┬────────┘     │
              │                  │               │                    │              │
              └──────────────────┴───────────────┴────────────────────┘              │
                                                 │                                    │
              ┌──────────────────────────────────▼────────────────────────────────┐  │
              │                    PHASE 7 COMPLETION GATE                         │  │
              │            All building/shelter tasks must complete                │  │
              └──────────────────────────────────┬────────────────────────────────┘  │
                                                 │                                    │
              ┌──────────────────────────────────▼────────────────────────────────┐  │
              │              PHASE 8: TEMPERATURE & WEATHER                        │  │
              │   Weather, Temperature Zones, Heat Sources, seek_warmth/cooling    │  │
              │                           ✅ COMPLETE                              │  │
              └──────────────────────────────────┬────────────────────────────────┘  │
                                                 │                                    │
              ┌──────────────────┬───────────────┼───────────────┐                   │
              │                  │               │               │                   │
              ▼                  ▼               ▼               ▼                   │
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐                          │
    │   PHASE 9 🔀    │ │  PHASE 10 🔀  │ │  PHASE 11 🔀  │  ◄───────────────────────┘
    │    Farming      │ │   Crafting    │ │    Animals    │
    │      ⏳         │ │      ⏳       │ │      ⏳       │
    └────────┬────────┘ └───────┬───────┘ └───────┬───────┘
              │                  │               │
              └──────────────────┼───────────────┘
                                 │
              ┌──────────────────▼────────────────────────────────┐
              │               PHASE 12: ECONOMY                   │
              │     Currency, Trade, Shops, Price Negotiation     │
              │                      🔒                           │
              └──────────────────────┬────────────────────────────┘
                                     │
              ┌──────────────────┬───┴───┬───────────────┐
              │                  │       │               │
              ▼                  ▼       ▼               ▼
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
    │  PHASE 13 🔀    │ │ PHASE 14 🔀   │ │  PHASE 15 🔀  │
    │   Research      │ │  Governance   │ │ Multi-Village │
    │      🔒         │ │      🔒       │ │      🔒       │
    └────────┬────────┘ └───────┬───────┘ └───────┬───────┘
              │                  │               │
              └──────────────────┼───────────────┘
                                 │
              ┌──────────────────▼────────────────────────────────┐
              │            PHASE 16: POLISH & PLAYER              │
              │      Avatar, Spectator, UI Polish, Save/Load      │
              │                      🔒                           │
              └───────────────────────────────────────────────────┘
```

---

## Spec Index

All specifications linked for easy access:

### Core Systems
| Spec | Path | Phase |
|------|------|-------|
| Game Engine | [openspec/specs/game-engine/spec.md](openspec/specs/game-engine/spec.md) | 0 |
| World System | [openspec/specs/world-system/spec.md](openspec/specs/world-system/spec.md) | 1 |
| Procedural Generation | [openspec/specs/world-system/procedural-generation.md](openspec/specs/world-system/procedural-generation.md) | 1 |
| Rendering System | [openspec/specs/rendering-system/spec.md](openspec/specs/rendering-system/spec.md) | 1 |
| Temperature & Shelter | [custom_game_engine/specs/temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 8 |

### Agent Systems
| Spec | Path | Phase |
|------|------|-------|
| Agent System | [openspec/specs/agent-system/spec.md](openspec/specs/agent-system/spec.md) | 2 |
| Movement Intent | [openspec/specs/agent-system/movement-intent.md](openspec/specs/agent-system/movement-intent.md) | 2 |
| Needs System | [openspec/specs/agent-system/needs.md](openspec/specs/agent-system/needs.md) | 3 |
| Memory System | [openspec/specs/agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) | 4 |
| Spatial Memory | [openspec/specs/agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) | 4 |
| Relationship System | [openspec/specs/agent-system/relationship-system.md](openspec/specs/agent-system/relationship-system.md) | 4 |
| Conversation System | [openspec/specs/agent-system/conversation-system.md](openspec/specs/agent-system/conversation-system.md) | 5 |
| Lifecycle System | [openspec/specs/agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) | 18 |
| Culture System | [openspec/specs/agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) | 19 |
| Species System | [openspec/specs/agent-system/species-system.md](openspec/specs/agent-system/species-system.md) | 17 |
| Chroniclers | [openspec/specs/agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) | 20 |

### Resource Systems
| Spec | Path | Phase |
|------|------|-------|
| Items System | [openspec/specs/items-system/spec.md](openspec/specs/items-system/spec.md) | 3, 10 |
| Items Planet Scoping | [openspec/specs/items-system/planet-scoping.md](openspec/specs/items-system/planet-scoping.md) | 21 |
| Farming System | [openspec/specs/farming-system/spec.md](openspec/specs/farming-system/spec.md) | 9 |
| Construction System | [openspec/specs/construction-system/spec.md](openspec/specs/construction-system/spec.md) | 7 |
| Animal System | [openspec/specs/animal-system/spec.md](openspec/specs/animal-system/spec.md) | 11 |

### Economy & Society
| Spec | Path | Phase |
|------|------|-------|
| Economy System | [openspec/specs/economy-system/spec.md](openspec/specs/economy-system/spec.md) | 12 |
| Inter-Village Trade | [openspec/specs/economy-system/inter-village-trade.md](openspec/specs/economy-system/inter-village-trade.md) | 15 |
| Research System | [openspec/specs/research-system/spec.md](openspec/specs/research-system/spec.md) | 13 |
| Capability Evolution | [openspec/specs/research-system/capability-evolution.md](openspec/specs/research-system/capability-evolution.md) | 13 |
| Governance System | [openspec/specs/governance-system/spec.md](openspec/specs/governance-system/spec.md) | 14 |
| Conflict System | [openspec/specs/conflict-system/spec.md](openspec/specs/conflict-system/spec.md) | 14 |
| Progression System | [openspec/specs/progression-system/spec.md](openspec/specs/progression-system/spec.md) | 16 |

### Player Systems
| Spec | Path | Phase |
|------|------|-------|
| Player System | [openspec/specs/player-system/spec.md](openspec/specs/player-system/spec.md) | 16 |
| Avatar System | [openspec/specs/avatar-system/spec.md](openspec/specs/avatar-system/spec.md) | 16 |
| Nexus System | [openspec/specs/nexus-system/spec.md](openspec/specs/nexus-system/spec.md) | 21 |
| Universe System | [openspec/specs/universe-system/spec.md](openspec/specs/universe-system/spec.md) | 21 |

### Advanced
| Spec | Path | Phase |
|------|------|-------|
| Abstraction Layers | [openspec/specs/world-system/abstraction-layers.md](openspec/specs/world-system/abstraction-layers.md) | 15 |
| Consciousness Phases | [openspec/specs/consciousness-implementation-phases.md](openspec/specs/consciousness-implementation-phases.md) | 17 |
| Feasibility Review | [openspec/specs/FEASIBILITY_REVIEW.md](openspec/specs/FEASIBILITY_REVIEW.md) | - |

### Metrics & Analytics
| Spec | Path | Phase |
|------|------|-------|
| Sociological Metrics System | [custom_game_engine/specs/sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md) | 22-26 |

### Divine Systems
| Spec | Path | Phase |
|------|------|-------|
| Divine Communication System | [openspec/specs/divinity-system/divine-communication-system.md](openspec/specs/divinity-system/divine-communication-system.md) | 27 |
| Angel Delegation System | [openspec/specs/divinity-system/angel-delegation-system.md](openspec/specs/divinity-system/angel-delegation-system.md) | 28 |
| Divine Systems Integration | [openspec/specs/divinity-system/divine-systems-integration.md](openspec/specs/divinity-system/divine-systems-integration.md) | 27-28 |

### UI Specs
| Spec | Path | Phase |
|------|------|-------|
| Main Menu | [openspec/specs/ui-system/main-menu.md](openspec/specs/ui-system/main-menu.md) | 16 |
| Inventory | [openspec/specs/ui-system/inventory.md](openspec/specs/ui-system/inventory.md) | 10 |
| Crafting | [openspec/specs/ui-system/crafting.md](openspec/specs/ui-system/crafting.md) | 10 |
| Building Placement | [openspec/specs/ui-system/building-placement.md](openspec/specs/ui-system/building-placement.md) | 7 |
| Farm Management | [openspec/specs/ui-system/farm-management.md](openspec/specs/ui-system/farm-management.md) | 9 |
| Animal Husbandry | [openspec/specs/ui-system/animal-husbandry.md](openspec/specs/ui-system/animal-husbandry.md) | 11 |
| Economy Dashboard | [openspec/specs/ui-system/economy-dashboard.md](openspec/specs/ui-system/economy-dashboard.md) | 12 |
| Trading | [openspec/specs/ui-system/trading.md](openspec/specs/ui-system/trading.md) | 12 |
| Research Tree | [openspec/specs/ui-system/research-tree.md](openspec/specs/ui-system/research-tree.md) | 13 |
| Governance | [openspec/specs/ui-system/governance.md](openspec/specs/ui-system/governance.md) | 14 |
| Map | [openspec/specs/ui-system/map.md](openspec/specs/ui-system/map.md) | 15 |
| Agent Roster | [openspec/specs/ui-system/agent-roster.md](openspec/specs/ui-system/agent-roster.md) | 16 |
| Relationship Viewer | [openspec/specs/ui-system/relationship-viewer.md](openspec/specs/ui-system/relationship-viewer.md) | 16 |
| Time Controls | [openspec/specs/ui-system/time-controls.md](openspec/specs/ui-system/time-controls.md) | 16 |
| Notifications | [openspec/specs/ui-system/notifications.md](openspec/specs/ui-system/notifications.md) | 16 |
| Context Menu | [openspec/specs/ui-system/context-menu.md](openspec/specs/ui-system/context-menu.md) | 16 |
| Divine Systems UI | [custom_game_engine/specs/divine-systems-ui.md](custom_game_engine/specs/divine-systems-ui.md) | 27-28 |
| Hover Info | [openspec/specs/ui-system/hover-info.md](openspec/specs/ui-system/hover-info.md) | 16 |
| Objectives | [openspec/specs/ui-system/objectives.md](openspec/specs/ui-system/objectives.md) | 16 |
| Conflict | [openspec/specs/ui-system/conflict.md](openspec/specs/ui-system/conflict.md) | 16 |

---

## Agent Quick Start Guide

### 🎯 Best Tasks to Start Right Now (2025-12-29)

**For Agents New to the Codebase:**
1. **Phase 8 - seek_cooling behavior** - Small, well-defined task complementing existing seek_warmth
2. **Phase 25 - Sociological Metrics Dashboard** - Pure UI work, data layer complete

**For Agents Familiar with the Codebase:**
1. **Phase 27 - Divine Communication** - Complete the prayer/vision system (framework exists)
2. **Phase 30 - Magic System Enhancement** - Finish paradigm implementations and combos
3. **Phase 14 - Governance System** - Start fresh, integrate with existing agent decisions
4. **Phase 29 - Item System Refactor** - Materials & traits (partially started)

**For Enhancement Work (Adding Spec Features):**
1. **Farming - Plant Properties** - Add medicinal/magical properties to existing plants
2. **Animals - Breeding Genetics** - Add trait inheritance to existing animal system
3. **Buildings - Procedural Generation** - LLM-generated unique buildings
4. **Agent - Cybernetics** - Sci-fi augmentation system

### 📋 Agent Instructions

#### Finding Work

1. Check the **Current Status** section at the top
2. Find tasks marked ⏳ (Ready) or 🚧 (In Progress needing help)
3. Check the **Parallel Work Available** section for categorized options
4. Read the linked spec before starting
5. Check the phase details for **Current Implementation** notes to see what exists

### Starting a Task

```markdown
## Claiming: [Task Name]

**Phase:** [Phase Number]
**Spec:** [Link to spec]
**Status:** Starting implementation

**Files I'll modify:**
- path/to/file1.ts
- path/to/file2.ts
```

### Completing a Task

1. Update this roadmap: Change ⏳/🚧 to ✅
2. Post completion to `testing` channel
3. If this was the last task in a phase, update phase status

### Parallel Work Rules

- Tasks marked 🔀 can be worked on simultaneously by different agents
- Coordinate in `implementation` channel to avoid conflicts
- Phase gates (like Phase 7 → Phase 8) require ALL tasks complete

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Development guidelines & code review checklist |
| [openspec/AGENTS.md](openspec/AGENTS.md) | OpenSpec workflow for agents |
| [openspec/project.md](openspec/project.md) | Project conventions |
| [architecture/CORE_ARCHITECTURE.md](architecture/CORE_ARCHITECTURE.md) | Technical architecture details |
| [architecture/IMPLEMENTATION_ROADMAP.md](architecture/IMPLEMENTATION_ROADMAP.md) | Original detailed roadmap (superseded by this doc) |

---

## Migrated OpenSpec Documentation

The following specifications have been migrated from `custom_game_engine/architecture/` to the standardized OpenSpec format in `openspec/specs/`. These specs include proper Status fields (Implemented/In Progress/Draft) for orchestrator dashboard integration.

### Communication System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| TV Station | [openspec/specs/communication-system/tv-station.md](openspec/specs/communication-system/tv-station.md) | Implemented |
| Communication Tech | [openspec/specs/communication-system/tech-spec.md](openspec/specs/communication-system/tech-spec.md) | Implemented |
| Social Media | [openspec/specs/communication-system/social-media.md](openspec/specs/communication-system/social-media.md) | Implemented |

### Automation/Factory System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| Logistics & Belts | [openspec/specs/automation-system/logistics.md](openspec/specs/automation-system/logistics.md) | Implemented |
| Factory AI | [openspec/specs/automation-system/factory-ai.md](openspec/specs/automation-system/factory-ai.md) | Implemented |
| Power Grid & Dyson Swarm | [openspec/specs/automation-system/power-grid.md](openspec/specs/automation-system/power-grid.md) | Implemented |
| Factory Blueprints | [openspec/specs/automation-system/blueprints.md](openspec/specs/automation-system/blueprints.md) | Implemented |
| Food Factory | [openspec/specs/automation-system/food-factory.md](openspec/specs/automation-system/food-factory.md) | Implemented |
| Automation Research Tree | [openspec/specs/automation-system/research-tree.md](openspec/specs/automation-system/research-tree.md) | Implemented |

### Magic System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| Magic Skill Trees | [openspec/specs/magic-system/skill-tree.md](openspec/specs/magic-system/skill-tree.md) | In Progress |

### Building System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| Voxel Building | [openspec/specs/building-system/voxel-building.md](openspec/specs/building-system/voxel-building.md) | Implemented |
| Autonomous Building | [openspec/specs/building-system/autonomous-building.md](openspec/specs/building-system/autonomous-building.md) | Implemented |
| Nightlife & Social Buildings | [openspec/specs/building-system/nightlife-buildings.md](openspec/specs/building-system/nightlife-buildings.md) | Implemented |

### Social/Courtship System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| Courtship System | [openspec/specs/social-system/courtship.md](openspec/specs/social-system/courtship.md) | Implemented |
| Courtship Improvements | [openspec/specs/social-system/courtship-improvements.md](openspec/specs/social-system/courtship-improvements.md) | Implemented |

### Botany System

| Spec | OpenSpec Location | Status |
|------|-------------------|--------|
| Herbal Botany | [openspec/specs/botany-system/spec.md](openspec/specs/botany-system/spec.md) | In Progress |
