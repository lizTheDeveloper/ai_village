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

**Last Updated:** 2025-12-31

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0-3 | ✅ Complete | Foundation through Agent Needs |
| Phase 4 | ✅ Complete | Memory & Social (Episodic memory, spatial, relationships) |
| Phase 5-6 | ✅ Complete | Communication & LLM Integration |
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
| Phase 25 | ⏳ Ready | Sociological Metrics Visualization Dashboard |
| Phase 28 | ✅ Complete | Angel Systems (AI processor, prayer delegation, LLM integration) |
| Phase 29 | ⏳ Ready | Item System Refactor (Materials, Traits, Instances) |
| Phase 30 | ⏳ Ready | Magic System (Multi-source, Verb/Noun Composition) |
| Phase 31 | ⏳ Ready | Persistence Layer (World Serialization, Migrations) |
| Phase 32 | 🔒 Blocked | Universe Forking (Parallel World Testing) - blocked on Phase 31 |
| Phase 33 | 🔒 Blocked | LLM Effect Generation (Safe Generated Effects) - blocked on Phase 30, 32 |
| Phase 34 | 🔒 Blocked | Cross-Universe Sharing (Effect Packages, Trust) - blocked on Phase 31, 33 |
| Skill System | 🚧 In Progress | Progressive Skill Reveal - skill-gated prompt context (claimed 2025-12-28) |

**Implementation Status Notes (2025-12-31):**
- ✅ **Core gameplay loop is functional** - Agents, world, farming, crafting, animals, economy all working
- ⚠️ **Magic System** - Framework exists (MagicComponent, MagicSystem) but missing paradigm implementations, combos, skill trees
- ✅ **Divinity System** - Complete divine communication (Prayer, Meditation, Visions, LLM generation, Faith mechanics, Angel delegation)
- ⚠️ **Body System** - Basic implementation exists, missing genetics and species-specific integration
- ⏳ **Research, Governance, Multi-Village** - Specs complete, implementations not started
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
| **Animals** | ✅ | 50% | Breeding, working, generated species |
| **Crafting** | ✅ | 70% | Quality system depth |
| **Building** | ✅ | 40% | Procedural gen, upgrades |
| **Economy** | ✅ | 80% | Inter-village trade |
| **Magic** | ⚠️ | 30% | Paradigms, combos, skill trees |
| **Divinity** | ✅ | 100% | Player UI pending (angel delegation complete) |
| **Body** | ✅ | 60% | Genetics, species integration |
| **Research** | ❌ | 0% | Everything |
| **Governance** | ⚠️ | 10% | Leadership, laws, voting |
| **Skills** | ✅ | 70% | Progressive reveal in progress |

**Parallel Work Available (pick any):**

**High Priority - Ready to Start:**
- **Phase 13**: Research & Discovery ✅ COMPLETE (2025-12-31)
- **Phase 14**: Governance (Phase 12 ✅ complete!)
- **Phase 15**: Multi-Village & Inter-Village Trade (Phase 12 ✅ complete!)
- **Phase 25**: Sociological Metrics Visualization Dashboard (Phase 23-24 ✅ complete)
- **Phase 29**: Item System Refactor - Materials, Traits, Instances (⚠️ partially started)
- **Phase 30**: Magic System Enhancement - Multi-source, Paradigms, Combos (⚠️ basic framework exists)
- **Phase 31**: Persistence Layer - Migrations, Versioning (⚠️ basic serialization exists)

**Enhancement Work - Add Missing Spec Features:**
- **Farming System**: Plant properties (medicinal/magical), ecology, natural hybridization
- **Animal System**: Breeding genetics, working animals (plow/guard/hunt), generated species
- **Building System**: Procedural generation, upgrades, maintenance & decay
- **Agent System**: Cybernetics & augmentation (for sci-fi universes)
- **Magic System**: Finish paradigm implementations, combo system, skill trees
- **Divinity System**: Player god UI for manual intervention (core systems complete)

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

### Phase 16: Polish & Player 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 13, 14, 15
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
| Context Menu UI | 🔒 | [ui-system/context-menu.md](openspec/specs/ui-system/context-menu.md) | 🔀 |
| Hover Info UI | 🔒 | [ui-system/hover-info.md](openspec/specs/ui-system/hover-info.md) | 🔀 |
| Agent Roster UI | 🔒 | [ui-system/agent-roster.md](openspec/specs/ui-system/agent-roster.md) | 🔀 |
| Relationship Viewer UI | 🔒 | [ui-system/relationship-viewer.md](openspec/specs/ui-system/relationship-viewer.md) | 🔀 |
| Objectives UI | 🔒 | [ui-system/objectives.md](openspec/specs/ui-system/objectives.md) | 🔀 |
| Conflict UI | 🚧 | [ui-system/conflict.md](openspec/specs/ui-system/conflict.md) | 🔀 | WORK ORDER READY (agents/autonomous-dev/work-orders/conflict-ui/) |

---

## Future Phases (Post-MVP)

These phases extend beyond the core game:

### Phase 17: Advanced Consciousness 🔒

| Task | Spec |
|------|------|
| Pack Minds | [consciousness-implementation-phases.md](openspec/specs/consciousness-implementation-phases.md) |
| Hive Minds | [consciousness-implementation-phases.md](openspec/specs/consciousness-implementation-phases.md) |
| Species System | [agent-system/species-system.md](openspec/specs/agent-system/species-system.md) |

### Phase 18: Lifecycle & Generations 🔒

| Task | Spec |
|------|------|
| Birth/Death | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Aging | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Family Trees | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |
| Inheritance | [agent-system/lifecycle-system.md](openspec/specs/agent-system/lifecycle-system.md) |

### Phase 19: Culture & Society 🔒

| Task | Spec |
|------|------|
| Culture System | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |
| Kinship Systems | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |
| Social Norms | [agent-system/culture-system.md](openspec/specs/agent-system/culture-system.md) |

### Phase 20: Chroniclers 🔒

| Task | Spec |
|------|------|
| Written Works | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |
| History Recording | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |
| Knowledge Propagation | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) |

### Phase 21: Multi-Game (Nexus) 🔒

| Task | Spec |
|------|------|
| Nexus System | [nexus-system/spec.md](openspec/specs/nexus-system/spec.md) |
| Universe Types | [universe-system/spec.md](openspec/specs/universe-system/spec.md) |
| Cross-Game Progression | [nexus-system/spec.md](openspec/specs/nexus-system/spec.md) |

### Phase 22: Sociological Metrics - Foundation ✅ COMPLETE

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

### Phase 25: Sociological Metrics - Visualization Dashboard ⏳ READY

**Status:** ⏳ Ready (Phase 23, 24 complete)
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

### Phase 29: Item System Refactor ⏳ READY

**Status:** ⏳ Ready (no dependencies, can start immediately)
**Dependencies:** None
**Parallel Work:** 🔀 Can run parallel with Phase 30, 31
**Estimated LOC:** ~2,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *Inspired by Dwarf Fortress - where leather and iron are fundamentally the same thing, just with different properties.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| MaterialTemplate interface & registry | 🚧 In Progress | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | - |
| ItemDefinition with traits (refactor) | 🚧 In Progress | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | - |
| ItemInstance type for runtime items | 🚧 In Progress | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-1-item-system-architecture) | 🔀 |
| Trait composition (EdibleTrait, WeaponTrait, etc.) | 🚧 In Progress | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#trait-composition) | 🔀 |
| Material-based property inheritance | 🚧 In Progress | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#material-template-system) | - |
| ItemQuality system | ⏳ Ready | [Part 1](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#item-definition-vs-instance) | 🔀 |

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

### Phase 31: Persistence Layer ⏳ READY

**Status:** ⏳ Ready (no dependencies, can start immediately)
**Dependencies:** None
**Parallel Work:** 🔀 Can run parallel with Phase 29, 30
**Estimated LOC:** ~2,500
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| Schema versioning system | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-7-persistence-layer) | - |
| Migration registry | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#migration-system) | - |
| SerializedWorldState format | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#world-serialization) | - |
| World.serialize() / deserialize() | ⏳ Ready | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#world-serialization) | - |
| SaveFile format | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#save-file-format) | 🔀 |
| IndexedDB storage backend | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#storage-backends) | 🔀 |
| FileSystem storage backend | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#storage-backends) | 🔀 |
| Checksum validation | ⏳ Ready | [Part 7](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#save-file-format) | 🔀 |

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

**Key Design Decisions:**
- Every persisted type has a schema version
- Migrations are one-way (old→new), registered in MigrationRegistry
- SaveFile includes header, world state, player state, registry versions
- Multiple storage backends (IndexedDB for browser, filesystem for desktop)
- Checksums for integrity validation

---

### Phase 32: Universe Forking 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 31 (Persistence Layer)
**Dependencies:** Phase 31 (World.serialize/deserialize required)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~2,000
**Spec:** [ITEM_MAGIC_PERSISTENCE_SPEC.md](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)

> *The game world itself is the sandbox. Fork it, test effects, observe results.*

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| WorldFork interface | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#part-5-universe-forking-parallel-world-testing) | - |
| UniverseManager.fork() | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |
| UniverseManager.runFork() | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |
| InvariantChecker | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#invariant-checking) | 🔀 |
| ForkResults collection | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | 🔀 |
| WorldDiff utility | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | 🔀 |
| Fork execution in Web Worker | 🔒 Blocked | [Part 5](custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md#fork-execution) | - |

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

### Phase 28: Angel Delegation System 🚧 IN PROGRESS (~45% Complete)

**Status:** 🚧 In Progress (~45% complete - AI decision processor implemented, awaits Phase 27 integration)
**Dependencies:** Phase 27 (Divine Communication) - partially blocking
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~4,000
**Spec:** [angel-delegation-system.md](openspec/specs/divinity-system/angel-delegation-system.md)

**Current Implementation:**
- ✅ **AngelSystem framework** - Basic structure and types complete
- ✅ **AngelAIDecisionProcessor** - LLM-based decision making (~500 lines)
- ✅ **Angel personality system** - Compassion, strictness, proactiveness, wisdom
- ✅ **Prayer assignment logic** - Purpose matching, ranking, scoring
- ✅ **LLM response generation** - Angel-specific prompts with personality
- ✅ **Fallback responses** - Template-based when LLM unavailable
- ⏳ AngelSystem integration - Needs completion
- ⏳ Full prayer infrastructure - Awaits Phase 27 completion

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
