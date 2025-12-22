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

**Last Updated:** 2024-12-21

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0-6 | ✅ Complete | Foundation through LLM Integration |
| Phase 7 | 🚧 In Progress | Building & Shelter |
| Phase 8 | 🔀 Ready | Temperature & Weather (can run parallel with Phase 7!) |
| Phase 9+ | 🔒 Blocked | Waiting on Phase 8 |

**Next Available Work:**
1. Phase 7 remaining tasks (Building Placement UI in progress)
2. **Phase 8 (Temperature & Weather) - CAN START NOW** 🔀
3. Phases 9-11 (Farming, Crafting, Animals) after Phase 8

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
Phase 4       Phase 5       Phase 6       Phase 7 ──────┬─────── 🚧 IN PROGRESS
Memory        Communication  LLM           Building      │
✅            ✅             ✅            🚧            │ 🔀 PARALLEL
    │              │              │              │        │
    └──────────────┴──────────────┴──────────────┘        │
                            │                             │
                            ▼                             ▼
                      Phase 8: Temperature & Weather ──────────── ⏳ READY
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
Phase 9 🔀             Phase 10 🔀            Phase 11 🔀
Farming                Crafting              Animals
🔒                     🔒                    🔒
    │                       │                       │
    └───────────────────────┼───────────────────────┘
                            │
                            ▼
                      Phase 12: Economy ────────────────────────── 🔒
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
| Memory Component | ✅ | [agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) |
| Relationship Component | ✅ | [agent-system/relationship-system.md](openspec/specs/agent-system/relationship-system.md) |
| Spatial Awareness | ✅ | [agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) |

**Implementation:** `packages/core/src/components/MemoryComponent.ts`, `packages/core/src/components/RelationshipComponent.ts`

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

### Phase 7: Building & Shelter 🚧 IN PROGRESS

**Status:** 🚧 In Progress
**Dependencies:** Phase 3, 4, 5, 6
**Parallel Work:** Tasks within this phase can be parallelized as marked

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Building Component | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |
| Building Definitions | 🚧 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Resource Gathering | 🚧 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Construction Progress | ⏳ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |
| Building Placement UI | 🚧 | [ui-system/building-placement.md](openspec/specs/ui-system/building-placement.md) | 🔀 |
| Shelter Need Satisfaction | ⏳ | [agent-system/needs.md](openspec/specs/agent-system/needs.md) | - |

**Implementation:** `packages/core/src/components/BuildingComponent.ts`, `packages/core/src/systems/BuildingSystem.ts`

**Tests:** `tests/phase7*.spec.ts`

---

### Phase 8: Temperature & Weather 🔀 CAN START

**Status:** ⏳ Ready (can run parallel with Phase 7)
**Dependencies:** BuildingComponent exists (✅), Building archetypes exist (✅)
**Parallel Work:** 🔀 Can run in parallel with remaining Phase 7 tasks

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| TemperatureComponent | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| TemperatureSystem | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| WeatherComponent | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| WeatherSystem | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| Building Heat/Insulation | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| Remove Shelter Need | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| Add Health to Needs | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |
| seek_warmth Behavior | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| seek_cooling Behavior | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | 🔀 |
| Temperature LLM Context | ⏳ | [temperature-shelter-system.md](custom_game_engine/specs/temperature-shelter-system.md) | - |

**Implementation:** `packages/core/src/systems/TemperatureSystem.ts`, `packages/core/src/systems/WeatherSystem.ts`

**Breaking Changes from Phase 7:**
- Removes `shelter` from NeedsComponent
- Removes `providesShelter` from BuildingComponent
- Adds `health` to NeedsComponent
- Adds heat/insulation properties to buildings

---

### Phase 9: Farming 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 8
**Dependencies:** Phase 8 (weather affects crops)
**Parallel Work:** 🔀 Can run parallel with Phase 10, 11

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Soil/Tile System | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Plant Lifecycle | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Seed System | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Tilling Action | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Planting Action | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Watering Action | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Harvesting Action | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Crop Hybridization | 🔒 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Farming Buildings | 🔒 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Farm Management UI | 🔒 | [ui-system/farm-management.md](openspec/specs/ui-system/farm-management.md) | 🔀 |

---

### Phase 10: Crafting & Items 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 8
**Dependencies:** Phase 8 (needs temperature for item durability)
**Parallel Work:** 🔀 Can run parallel with Phase 9, 11

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Recipe System | 🔒 | [items-system/spec.md](openspec/specs/items-system/spec.md) | - |
| Crafting Stations | 🔒 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Tool Durability | 🔒 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Quality System | 🔒 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Crafting UI | 🔒 | [ui-system/crafting.md](openspec/specs/ui-system/crafting.md) | 🔀 |
| Inventory UI | 🔒 | [ui-system/inventory.md](openspec/specs/ui-system/inventory.md) | 🔀 |

---

### Phase 11: Animals 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 8
**Dependencies:** Phase 8 (animals need temperature comfort)
**Parallel Work:** 🔀 Can run parallel with Phase 9, 10

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Animal Component | 🔒 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal AI | 🔒 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Taming System | 🔒 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Products | 🔒 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | 🔀 |
| Breeding | 🔒 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Housing | 🔒 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Animal Husbandry UI | 🔒 | [ui-system/animal-husbandry.md](openspec/specs/ui-system/animal-husbandry.md) | 🔀 |

---

### Phase 12: Economy & Trade 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 9, 10, 11
**Dependencies:** Phases 9-11 (needs goods to trade)
**Parallel Work:** None (integrates previous phases)

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Currency System | 🔒 | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Value Calculation | 🔒 | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Shop Buildings | 🔒 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Trading System | 🔒 | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Price Negotiation | 🔒 | [economy-system/spec.md](openspec/specs/economy-system/spec.md) | - |
| Economy Dashboard UI | 🔒 | [ui-system/economy-dashboard.md](openspec/specs/ui-system/economy-dashboard.md) | 🔀 |
| Trading UI | 🔒 | [ui-system/trading.md](openspec/specs/ui-system/trading.md) | 🔀 |

---

### Phase 13: Research & Discovery 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 12
**Dependencies:** Phase 12 (needs economy for research costs)
**Parallel Work:** 🔀 Can run parallel with Phase 14, 15

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Research Tree | 🔒 | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Research Buildings | 🔒 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Research Points | 🔒 | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Discovery System | 🔒 | [research-system/spec.md](openspec/specs/research-system/spec.md) | - |
| Procedural Recipes | 🔒 | [research-system/capability-evolution.md](openspec/specs/research-system/capability-evolution.md) | - |
| Research Tree UI | 🔒 | [ui-system/research-tree.md](openspec/specs/ui-system/research-tree.md) | 🔀 |

---

### Phase 14: Governance 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 12
**Dependencies:** Phase 12 (needs economy, multiple agents with relationships)
**Parallel Work:** 🔀 Can run parallel with Phase 13, 15

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Government Types | 🔒 | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | - |
| Leadership Roles | 🔒 | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | - |
| Law System | 🔒 | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | 🔀 |
| Voting/Decisions | 🔒 | [governance-system/spec.md](openspec/specs/governance-system/spec.md) | 🔀 |
| Governance UI | 🔒 | [ui-system/governance.md](openspec/specs/ui-system/governance.md) | 🔀 |

---

### Phase 15: Multi-Village 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 12
**Dependencies:** Phase 12 (needs trade routes)
**Parallel Work:** 🔀 Can run parallel with Phase 13, 14

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Abstraction Layers | 🔒 | [world-system/abstraction-layers.md](openspec/specs/world-system/abstraction-layers.md) | - |
| Village Summaries | 🔒 | [world-system/abstraction-layers.md](openspec/specs/world-system/abstraction-layers.md) | - |
| Trade Routes | 🔒 | [economy-system/inter-village-trade.md](openspec/specs/economy-system/inter-village-trade.md) | 🔀 |
| Caravans | 🔒 | [economy-system/inter-village-trade.md](openspec/specs/economy-system/inter-village-trade.md) | 🔀 |
| News Propagation | 🔒 | [agent-system/chroniclers.md](openspec/specs/agent-system/chroniclers.md) | 🔀 |
| Map UI | 🔒 | [ui-system/map.md](openspec/specs/ui-system/map.md) | 🔀 |

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
| Conflict UI | 🔒 | [ui-system/conflict.md](openspec/specs/ui-system/conflict.md) | 🔀 |

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
              │                              🔒                                    │  │
              └──────────────────────────────────┬────────────────────────────────┘  │
                                                 │                                    │
              ┌──────────────────┬───────────────┼───────────────┐                   │
              │                  │               │               │                   │
              ▼                  ▼               ▼               ▼                   │
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐                          │
    │   PHASE 9 🔀    │ │  PHASE 10 🔀  │ │  PHASE 11 🔀  │  ◄───────────────────────┘
    │    Farming      │ │   Crafting    │ │    Animals    │
    │      🔒         │ │      🔒       │ │      🔒       │
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
| Hover Info | [openspec/specs/ui-system/hover-info.md](openspec/specs/ui-system/hover-info.md) | 16 |
| Objectives | [openspec/specs/ui-system/objectives.md](openspec/specs/ui-system/objectives.md) | 16 |
| Conflict | [openspec/specs/ui-system/conflict.md](openspec/specs/ui-system/conflict.md) | 16 |

---

## Agent Instructions

### Finding Work

1. Check the **Current Status** section at the top
2. Find tasks marked ⏳ (Ready) or 🚧 (In Progress needing help)
3. Read the linked spec before starting
4. Claim work by posting to the `implementation` channel

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
