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

**Last Updated:** 2025-12-24 (Phase 27 work order created)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0-3 | ✅ Complete | Foundation through Agent Needs |
| Phase 4 | 🚧 In Progress | Memory & Social (Basic complete, Episodic Memory in progress) |
| Phase 5-6 | ✅ Complete | Communication & LLM Integration |
| Phase 7 | 🚧 In Progress | Building & Shelter |
| Phase 8 | ✅ Complete | Temperature & Weather |
| Phase 9 | 🚧 In Progress | Farming (Soil, Plant Lifecycle) |
| Phase 10 | 🚧 In Progress | Crafting (Quality System, Inventory UI) |
| Phase 11 | 🚧 In Progress | Animals (Foundation work started) |
| Phase 22 | 🚧 In Progress | Sociological Metrics (Event Schemas) |
| Phase 27 | 🚧 In Progress | Divine Communication (Work order created) |
| Phase 28 | 🔒 Blocked | Angel Systems (blocked on Phase 27) |

**Next Available Work:**
1. **Phase 4 (Episodic Memory)** - Work order ready for playtest
2. **Phase 27 (Divine Communication - Prayer/Visions)** - Work order created, ready for tests
3. Phase 7 remaining tasks (Resource Gathering, Building Placement UI, Agent Inventory Display)
4. **Phases 9-11 tasks** - Multiple work orders in progress
5. **Phase 22 (Sociological Metrics)** - Event schemas in progress, other tasks available

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
                      Phase 8: Temperature & Weather ──────────── ✅ COMPLETE
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
Phase 9 🔀             Phase 10 🔀            Phase 11 🔀
Farming                Crafting              Animals
⏳                     ⏳                    ⏳
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

### Phase 4: Memory & Social Awareness 🚧 IN PROGRESS

**Status:** 🚧 Basic complete, episodic memory enhancement in progress
**Dependencies:** Phase 3
**Parallel Work:** 🔀 Can run parallel with Phase 5, 6

| Task | Status | Spec |
|------|--------|------|
| Vision Component | ✅ | [agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) |
| Memory Component (Basic) | ✅ | [agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) |
| Episodic Memory System | 🚧 | [agent-system/memory-system.md](openspec/specs/agent-system/memory-system.md) |
| Relationship Component | ✅ | [agent-system/relationship-system.md](openspec/specs/agent-system/relationship-system.md) |
| Spatial Awareness | ✅ | [agent-system/spatial-memory.md](openspec/specs/agent-system/spatial-memory.md) |

**Work Order:** [agents/autonomous-dev/work-orders/episodic-memory-system/work-order.md](agents/autonomous-dev/work-orders/episodic-memory-system/work-order.md)

**Implementation:** `packages/core/src/components/MemoryComponent.ts`, `packages/core/src/components/RelationshipComponent.ts`

**Note:** Episodic Memory System is a major enhancement adding:
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

### Phase 7: Building & Shelter 🚧 IN PROGRESS

**Status:** 🚧 In Progress
**Dependencies:** Phase 3, 4, 5, 6
**Parallel Work:** Tasks within this phase can be parallelized as marked

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Building Component | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |
| Building Definitions | 🚧 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Resource Gathering | 🚧 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Construction Progress | ✅ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | - |

**Work Order:** [agents/autonomous-dev/work-orders/construction-progress/work-order.md](agents/autonomous-dev/work-orders/construction-progress/work-order.md)
| Building Placement UI | 🚧 | [ui-system/building-placement.md](openspec/specs/ui-system/building-placement.md) | 🔀 |
| Agent Inventory Display | 🚧 | [ui-system/agent-inventory-display.md](openspec/specs/ui-system/agent-inventory-display.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/agent-inventory-display/work-order.md](agents/autonomous-dev/work-orders/agent-inventory-display/work-order.md)
| Shelter Need Satisfaction | ✅ | Replaced by Phase 8 Temperature System | - |

**Implementation:** `packages/core/src/components/BuildingComponent.ts`, `packages/core/src/systems/BuildingSystem.ts`

**Tests:** `tests/phase7*.spec.ts`

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

### Phase 9: Farming ⏳ READY

**Status:** ⏳ Ready (Phase 8 complete)
**Dependencies:** Phase 8 ✅ (weather affects crops)
**Parallel Work:** 🔀 Can run parallel with Phase 10, 11

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Soil/Tile System | 🚧 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |

**Work Order:** [agents/autonomous-dev/work-orders/soil-tile-system/work-order.md](agents/autonomous-dev/work-orders/soil-tile-system/work-order.md)
| Plant Lifecycle | 🚧 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |

**Work Order:** [agents/autonomous-dev/work-orders/plant-lifecycle/work-order.md](agents/autonomous-dev/work-orders/plant-lifecycle/work-order.md)
| Seed System | 🚧 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/seed-system/work-order.md](agents/autonomous-dev/work-orders/seed-system/work-order.md)
| Tilling Action | 🚧 | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/tilling-action/work-order.md](agents/autonomous-dev/work-orders/tilling-action/work-order.md)
| Planting Action | ⏳ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Watering Action | ⏳ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | 🔀 |
| Harvesting Action | ⏳ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Crop Hybridization | ⏳ | [farming-system/spec.md](openspec/specs/farming-system/spec.md) | - |
| Farming Buildings | ⏳ | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |
| Farm Management UI | ⏳ | [ui-system/farm-management.md](openspec/specs/ui-system/farm-management.md) | 🔀 |

---

### Phase 10: Crafting & Items ⏳ READY

**Status:** ⏳ Ready (Phase 8 complete)
**Dependencies:** Phase 8 ✅ (needs temperature for item durability)
**Parallel Work:** 🔀 Can run parallel with Phase 9, 11

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Recipe System | ⏳ | [items-system/spec.md](openspec/specs/items-system/spec.md) | - |
| Crafting Stations | 🚧 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/crafting-stations/work-order.md](agents/autonomous-dev/work-orders/crafting-stations/work-order.md)
| Tool Durability | ⏳ | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |
| Quality System | 🚧 | [items-system/spec.md](openspec/specs/items-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/quality-system/work-order.md](agents/autonomous-dev/work-orders/quality-system/work-order.md)
| Crafting UI | 🚧 | [ui-system/crafting.md](openspec/specs/ui-system/crafting.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/crafting-ui/work-order.md](agents/autonomous-dev/work-orders/crafting-ui/work-order.md)
| Inventory UI | 🚧 | [ui-system/inventory.md](openspec/specs/ui-system/inventory.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/inventory-ui/work-order.md](agents/autonomous-dev/work-orders/inventory-ui/work-order.md)

---

### Phase 11: Animals 🚧 IN PROGRESS

**Status:** 🚧 In Progress (Foundation work started)
**Dependencies:** Phase 8 ✅ (animals need temperature comfort)
**Parallel Work:** 🔀 Can run parallel with Phase 9, 10

| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Animal System Foundation | 🚧 | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |

**Work Order:** [agents/autonomous-dev/work-orders/animal-system-foundation/work-order.md](agents/autonomous-dev/work-orders/animal-system-foundation/work-order.md)

**Foundation includes:** Animal Component, Animal AI, Taming System, Animal Products (eggs, milk), Wild animal spawning, Temperature integration

**Future tasks (after foundation):**
| Task | Status | Spec | Parallel |
|------|--------|------|----------|
| Breeding | ⏳ | [animal-system/spec.md](openspec/specs/animal-system/spec.md) | - |
| Animal Housing | 🚧 | [construction-system/spec.md](openspec/specs/construction-system/spec.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/animal-housing/work-order.md](agents/autonomous-dev/work-orders/animal-housing/work-order.md)
| Animal Husbandry UI | 🚧 | [ui-system/animal-husbandry.md](openspec/specs/ui-system/animal-husbandry.md) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/animal-husbandry-ui/work-order.md](agents/autonomous-dev/work-orders/animal-husbandry-ui/work-order.md)

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

### Phase 22: Sociological Metrics - Foundation ⏳ READY

**Status:** ⏳ Ready (foundational systems complete)
**Dependencies:** Phase 3 (Agent Needs), Phase 4 (Memory & Social), Phase 5 (Communication)
**Parallel Work:** 🔀 Can run parallel with Phase 7-11
**Estimated LOC:** ~1,500
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| MetricsCollectionSystem (ECS) | ⏳ Ready | [Section 2.1](custom_game_engine/specs/sociological-metrics-system.md#21-metricscollectionsystem-ecs-system) | - |
| Event schemas (Interaction, Behavior, Spatial, Resource) | 🚧 In Progress | [Section 2.2](custom_game_engine/specs/sociological-metrics-system.md#22-event-schemas) | 🔀 |

**Work Order:** [agents/autonomous-dev/work-orders/event-schemas/work-order.md](agents/autonomous-dev/work-orders/event-schemas/work-order.md)
| RingBuffer implementation | ⏳ Ready | [Section 3.1](custom_game_engine/specs/sociological-metrics-system.md#31-in-memory-buffers-during-simulation) | 🔀 |
| Event emitters in AISystem/World | ⏳ Ready | [Section 2.1](custom_game_engine/specs/sociological-metrics-system.md#21-metricscollectionsystem-ecs-system) | - |
| Metrics configuration | ⏳ Ready | [Section 8.1](custom_game_engine/specs/sociological-metrics-system.md#81-metrics-configuration) | 🔀 |

**Implementation:**
- `packages/core/src/systems/MetricsCollectionSystem.ts`
- `packages/core/src/metrics/events/`
- `packages/core/src/metrics/buffers/`
- `config/metrics.config.ts`

**Tests:** `packages/core/src/metrics/__tests__/`

---

### Phase 23: Sociological Metrics - Storage & API 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 22
**Dependencies:** Phase 22 (Foundation)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~1,000
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| SQLite database schema | 🔒 Blocked | [Section 3.2](custom_game_engine/specs/sociological-metrics-system.md#32-persistent-storage-sqlite) | - |
| Periodic flush mechanism | 🔒 Blocked | [Section 6.1](custom_game_engine/specs/sociological-metrics-system.md#61-optimization-strategies) | - |
| REST API endpoints | 🔒 Blocked | [Section 5.1](custom_game_engine/specs/sociological-metrics-system.md#51-rest-api) | 🔀 |
| WebSocket server for live updates | 🔒 Blocked | [Section 5.2](custom_game_engine/specs/sociological-metrics-system.md#52-websocket-api) | 🔀 |
| CSV/JSON export functionality | 🔒 Blocked | [Section 3.3](custom_game_engine/specs/sociological-metrics-system.md#33-export-formats) | 🔀 |

**Implementation:**
- `packages/core/src/metrics/storage/MetricsDatabase.ts`
- `packages/core/src/metrics/api/MetricsAPI.ts`
- `packages/core/src/metrics/api/MetricsWebSocket.ts`
- `packages/core/src/metrics/exporters/`

**Database:** `custom_game_engine/data/metrics.db`

---

### Phase 24: Sociological Metrics - Analysis Modules 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 22
**Dependencies:** Phase 22 (Foundation)
**Parallel Work:** 🔀 All analyzers can be developed in parallel
**Estimated LOC:** ~2,000
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| NetworkAnalyzer (graph metrics) | 🔒 Blocked | [Section 4.1](custom_game_engine/specs/sociological-metrics-system.md#41-networkanalyzer) | 🔀 |
| SpatialAnalyzer (territory, heatmaps) | 🔒 Blocked | [Section 4.3](custom_game_engine/specs/sociological-metrics-system.md#43-spatialanalyzer) | 🔀 |
| InequalityAnalyzer (Gini, stratification) | 🔒 Blocked | [Section 4.4](custom_game_engine/specs/sociological-metrics-system.md#44-inequalityanalyzer) | 🔀 |
| CulturalDiffusionAnalyzer | 🔒 Blocked | [Section 4.2](custom_game_engine/specs/sociological-metrics-system.md#42-culturaldiffusionanalyzer) | 🔀 |

**Implementation:**
- `packages/core/src/metrics/analyzers/NetworkAnalyzer.ts`
- `packages/core/src/metrics/analyzers/SpatialAnalyzer.ts`
- `packages/core/src/metrics/analyzers/InequalityAnalyzer.ts`
- `packages/core/src/metrics/analyzers/CulturalDiffusionAnalyzer.ts`

**Key Metrics:**
- **Network**: Density, clustering, centrality, communities, diameter
- **Spatial**: Territory formation, hotspots, heatmaps, segregation indices
- **Inequality**: Gini coefficient, wealth mobility, social stratification
- **Cultural**: Behavior diffusion cascades, adoption rates, innovation tracking

---

### Phase 25: Sociological Metrics - Visualization Dashboard 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 23, 24
**Dependencies:** Phase 23 (Storage & API), Phase 24 (Analysis)
**Parallel Work:** 🔀 All visualization components can be built in parallel
**Estimated LOC:** ~2,500
**Spec:** [sociological-metrics-system.md](custom_game_engine/specs/sociological-metrics-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| Dashboard React app setup | 🔒 Blocked | [Section 7.1, 7.2](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | - |
| Network visualization (force-directed graph) | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Behavior timeline view | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Spatial heatmap overlay | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Inequality dashboard (Lorenz curves) | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Cultural diffusion view (Sankey diagrams) | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |
| Time series explorer | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/sociological-metrics-system.md#71-dashboard-components) | 🔀 |

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

### Phase 27: Divine Communication System 🚧 IN PROGRESS

**Status:** 🚧 In Progress (Work order created 2025-12-24 by spec-agent-001, ready for tests)
**Dependencies:** Phase 3 (Agent Needs) ✅, Phase 4 (Memory & Social) ✅, Phase 5 (Communication) ✅, Phase 8 (Circadian/Sleep) ✅
**Parallel Work:** 🔀 Can run parallel with Phase 7-11, 22-26
**Estimated LOC:** ~4,000
**Spec:** [divine-communication-system.md](custom_game_engine/specs/divine-communication-system.md)

**Work Order:** [agents/autonomous-dev/work-orders/divine-communication-system/work-order.md](agents/autonomous-dev/work-orders/divine-communication-system/work-order.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| PrayerComponent & System | ⏳ | [Section 2](custom_game_engine/specs/divine-communication-system.md#2-prayer-system) | - |
| Prayer triggers and generation | ⏳ | [Section 2.2-2.3](custom_game_engine/specs/divine-communication-system.md#22-prayer-behavior) | 🔀 |
| SpiritualComponent | ⏳ | [Section 3.1](custom_game_engine/specs/divine-communication-system.md#31-spiritual-component) | 🔀 |
| MeditateAction behavior | ⏳ | [Section 3.2](custom_game_engine/specs/divine-communication-system.md#32-meditation-behavior) | - |
| Vision generation with LLM | ⏳ | [Section 4.2](custom_game_engine/specs/divine-communication-system.md#42-vision-generation) | - |
| Player vision sending UI | ⏳ | [UI Spec](custom_game_engine/specs/divine-systems-ui.md) | 🔀 |
| Sacred site discovery | ⏳ | [Section 5](custom_game_engine/specs/divine-communication-system.md#5-sacred-locations) | 🔀 |
| Faith system | ⏳ | [Section 7](custom_game_engine/specs/divine-communication-system.md#7-faith--doubt-mechanics) | - |
| Group prayer & rituals | ⏳ | [Section 6](custom_game_engine/specs/divine-communication-system.md#6-group-prayer--rituals) | 🔀 |
| Integration with Dreams | ⏳ | [Section 9.1](custom_game_engine/specs/divine-communication-system.md#91-with-circadiandreams-system) | - |

**Implementation:**
- `packages/core/src/components/PrayerComponent.ts`
- `packages/core/src/components/SpiritualComponent.ts`
- `packages/core/src/systems/PrayerSystem.ts`
- `packages/core/src/systems/VisionSystem.ts`
- `packages/core/src/systems/FaithSystem.ts`
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

### Phase 28: Angel Delegation System 🔒 BLOCKED

**Status:** 🔒 Blocked on Phase 27
**Dependencies:** Phase 27 (Divine Communication)
**Parallel Work:** Tasks within phase can be parallelized
**Estimated LOC:** ~4,000
**Spec:** [angel-delegation-system.md](custom_game_engine/specs/angel-delegation-system.md)

| Task | Status | Spec | Parallel? |
|------|--------|------|-----------|
| AngelComponent & types | 🔒 Blocked | [Section 2](custom_game_engine/specs/angel-delegation-system.md#2-angel-types--components) | - |
| Angel AI system (prayer assignment) | 🔒 Blocked | [Section 3.1](custom_game_engine/specs/angel-delegation-system.md#31-prayer-assignment) | - |
| Angel response generation (LLM) | 🔒 Blocked | [Section 3.2](custom_game_engine/specs/angel-delegation-system.md#32-prayer-response-generation) | - |
| Angel creation system | 🔒 Blocked | [Section 4.1](custom_game_engine/specs/angel-delegation-system.md#41-angel-creation) | 🔀 |
| Divine resource management | 🔒 Blocked | [Section 8](custom_game_engine/specs/angel-delegation-system.md#8-divine-resources) | - |
| Angel management UI | 🔒 Blocked | [UI Spec](custom_game_engine/specs/divine-systems-ui.md) | 🔀 |
| Angel progression & leveling | 🔒 Blocked | [Section 6.1](custom_game_engine/specs/angel-delegation-system.md#61-leveling-system) | - |
| Archangel hierarchy | 🔒 Blocked | [Section 5](custom_game_engine/specs/angel-delegation-system.md#5-angel-hierarchy) | 🔀 |
| Angel failure & corruption | 🔒 Blocked | [Section 7](custom_game_engine/specs/angel-delegation-system.md#7-angel-failure--corruption) | 🔀 |
| Outcome tracking | 🔒 Blocked | [Section 7.1](custom_game_engine/specs/angel-delegation-system.md#71-tracking-outcomes) | - |

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
| Divine Communication System | [custom_game_engine/specs/divine-communication-system.md](custom_game_engine/specs/divine-communication-system.md) | 27 |
| Angel Delegation System | [custom_game_engine/specs/angel-delegation-system.md](custom_game_engine/specs/angel-delegation-system.md) | 28 |
| Divine Systems Integration | [custom_game_engine/specs/divine-systems-integration.md](custom_game_engine/specs/divine-systems-integration.md) | 27-28 |

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
