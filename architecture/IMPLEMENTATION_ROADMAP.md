# AI Village Implementation Roadmap

> **Goal**: Reach playable MVP as fast as possible while building on stable interfaces that support all future features.

## Current Status

**✅ Completed: Phases 0-6** (MVP reached!)
- LLM-controlled agents with dual-layer cognitive architecture
- Survival mechanics, memory, relationships, and social interaction
- Ready for feature expansion

**🚧 Next Up: Phase 7** - Building & Shelter

## Philosophy

Each phase delivers a **playable milestone**. Every feature is implemented using the patterns from CORE_ARCHITECTURE.md, ensuring:
- Old saves always work
- New features can be toggled on for old saves
- Each feature can be developed in isolation

---

## ✅ Phase 0: Foundation (COMPLETED)

**Deliverable**: Empty world you can observe. Core infrastructure working.

### 0.1 Core Package
```
□ EntityId generator (UUID v4)
□ Component interface + registry
□ Entity interface + factory
□ World interface (tick, entities, systems)
□ System interface + registry
□ Query builder for entities
```

### 0.2 Event System
```
□ GameEvent interface
□ EventBus implementation
□ Event queue + flush per tick
□ Event type registry
□ Core events: entity:created, entity:destroyed
```

### 0.3 Action System
```
□ Action interface
□ ActionQueue implementation
□ ActionHandler interface
□ ActionRegistry
□ Core actions: wait (just waits N ticks)
```

### 0.4 Serialization
```
□ SaveFile interface
□ SaveHeader with version + feature flags
□ JSON serializer
□ Save/Load to IndexedDB
□ Migration registry (empty, but ready)
```

### 0.5 Game Loop
```
□ Fixed timestep (20 TPS)
□ System execution order
□ Tick counter + game time
□ Start/stop/pause
```

### 0.6 Minimal Renderer
```
□ Canvas setup
□ Render a single colored tile
□ Camera (pan with arrow keys)
□ Render loop separate from logic loop
```

**Milestone Check**: Can start game, see empty grid, save/load state, camera moves.

---

## ✅ Phase 1: A World Exists (COMPLETED)

**Deliverable**: Generated terrain you can explore. First entities rendered.

### 1.1 Chunk System
```
□ Chunk interface (32x32 tiles)
□ Chunk loading/unloading by camera position
□ Tile data structure
□ ChunkManager to track loaded chunks
```

### 1.2 Terrain Generation
```
□ Perlin noise implementation
□ Terrain types: grass, dirt, water, stone, sand
□ Biome determination from noise layers
□ Seed-based deterministic generation
```

### 1.3 Position & Physics Components
```
□ PositionComponent
□ PhysicsComponent (solid, dimensions)
□ Spatial index for entity queries
□ Chunk-based entity organization
```

### 1.4 Tile Rendering
```
□ Simple colored rectangles per terrain type
□ Chunk-based render culling
□ Sprite placeholder system
□ Coordinate display (debug)
```

### 1.5 Trees & Rocks (First Entities)
```
□ tree archetype (position, physics, renderable, tags)
□ rock archetype
□ Procedural placement during generation
□ Density varies by biome
```

**Milestone Check**: Infinite scrolling world with terrain, trees, rocks. Saves work.

---

## ✅ Phase 2: First Agent (COMPLETED)

**Deliverable**: One agent that moves randomly. Foundation for all agent behavior.

### 2.1 Agent Component
```
□ AgentComponent (role, personality placeholder)
□ Agent archetype
□ Spawn agent at world center
```

### 2.2 Movement System
```
□ MoveAction implementation
□ Pathfinding (A* basic)
□ Collision detection
□ Movement speed as component field
```

### 2.3 Agent Rendering
```
□ Sprite for agent
□ Direction facing
□ Simple animation states (idle, walking)
```

### 2.4 Random Decision Stub
```
□ DecisionEngine interface
□ RandomDecisionEngine (picks random valid move)
□ Agent decision request event
□ Decision → Action pipeline
```

### 2.5 Identity Component
```
□ Name generation
□ Display name above agent
```

**Milestone Check**: Agent wanders around the world. You can watch it. Saves correctly.

---

## ✅ Phase 3: Agent Needs (COMPLETED)

**Deliverable**: Agent has needs that decay. Must find food to survive.

### 3.1 Needs Component
```
□ NeedsComponent with hunger, energy
□ Decay per tick
□ Critical thresholds
□ Death when need hits 0
```

### 3.2 Needs System
```
□ Process decay each tick
□ Emit needs:critical event at thresholds
□ Handle death
```

### 3.3 Berry Bushes
```
□ berryBush archetype
□ Contains berries (items)
□ Regrowth over time
```

### 3.4 Item System Foundation
```
□ ItemComponent (category, stackable)
□ ContainerComponent (for inventory)
□ Give agent an inventory
□ PickupAction, DropAction
```

### 3.5 Eating
```
□ EatAction
□ Food items restore hunger
□ Agent inventory system
```

### 3.6 Need-Aware Decisions
```
□ NeedBasedDecisionEngine
□ Prioritize food when hungry
□ Find nearest food source
□ Go to it, pick up, eat
```

**Milestone Check**: Agent survives by finding and eating berries. Can starve if none available.

---

## ✅ Phase 4: Memory & Social Awareness (COMPLETED)

**Deliverable**: Agents remember interactions and track what they've seen.

**Note**: Roadmap originally listed "LLM Integration" here, but actual implementation order was:
- Phase 4: Memory & Social (vision, memory tracking)
- Phase 5: Communication & Relationships (talking, relationships)
- Phase 6: LLM Integration with dual-layer cognitive architecture

### 4.1 LLM Interface
```
□ LLMProvider interface
□ Request/Response types
□ Batching support (N decisions per frame)
□ Timeout/fallback handling
```

### 4.2 Ollama Backend
```
□ OllamaProvider implementation
□ Model selection
□ Local server connection
□ Error recovery
```

### 4.3 Context Builder
```
□ Build prompt from agent state
□ Current needs, inventory, visible entities
□ Available actions list
□ Personality traits (placeholder)
```

### 4.4 Response Parser
```
□ Parse LLM response to Action
□ Validate response
□ Fallback if invalid
```

### 4.5 Decision Scheduling Foundation
```
□ DecisionScheduler interface
□ Decision request queue
□ Budget-based scheduling (max decisions per tick)
□ Priority ordering
```

### 4.6 Fidelity Component (Foundation)
```
□ FidelityComponent (tier, lastDecision, nextScheduledDecision)
□ Single-agent always Tier 0 (full fidelity)
□ Decision interval tracking
□ Prepares infrastructure for multi-agent scaling
```
> See SIMULATION_FIDELITY.md for full specification

**Milestone Check**: Agent is now LLM-controlled. Makes interesting, somewhat sensible decisions.

---

## ✅ Phase 5: Communication & Relationships (COMPLETED)

**Deliverable**: Multiple agents can talk to each other and build relationships.

### 5.1 Multiple Agents
```
□ Spawn 3-5 agents
□ Each has separate inventory, needs, state
□ Distinct names and placeholder personalities
```

### 5.2 Fidelity System (Full Implementation)
```
□ FidelitySystem (priority 50, runs before decisions)
□ Tier evaluation logic (0-3 based on relevance)
□ Tier transition events (fidelity_changed)
□ Decision budget enforcement
□ Context compression by tier (full → reduced → minimal)
```

### 5.3 Tiered Decision Scheduling
```
□ Tier 0: Every decision cycle (1-5s game time)
□ Tier 1: Periodic (30-60s game time)
□ Tier 2: Rare (5-15 min game time)
□ Decision queue with priority ordering
□ Budget overflow handling (queue to next tick)
```

### 5.4 Tiered Needs Simulation
```
□ Tier 0: Per-tick decay
□ Tier 1-2: Batch decay updates
□ Critical needs bump agent to higher tier
□ Needs thresholds trigger fidelity re-evaluation
```

### 5.5 Agent Perception
```
□ PerceptionComponent (view range)
□ Get visible entities
□ Include in LLM context
□ Proximity triggers Tier 1 for nearby agents
```

### 5.6 Conversation System
```
□ TalkAction
□ ConversationComponent (active conversation)
□ Turn-based dialogue (both agents use LLM)
□ Conversation events
□ Both conversation participants → Tier 0
```

### 5.7 Information Exchange
```
□ Agents can share knowledge
□ "I saw berries at X" type exchanges
□ Add to memory (placeholder)
□ Recent interaction keeps agents at Tier 1
```

### 5.8 Relationship Component (Stub)
```
□ RelationshipComponent with simple familiarity score
□ Increases from conversations
□ Include in LLM context
□ Pending obligations keep agents at Tier 1
```

> See SIMULATION_FIDELITY.md for full fidelity specification

**Milestone Check**: Agents notice each other, have conversations, share info. Fidelity system scales LLM costs sub-linearly.

---

## ✅ Phase 6: LLM Integration & Dual-Layer Cognition (COMPLETED)

**Deliverable**: LLM-controlled agents with biologically-inspired dual-layer architecture.

### 6.1 LLM Package ✅
```
✅ LLMProvider interface
✅ OllamaProvider implementation (qwen3:4b)
✅ LLMDecisionQueue with async/sync bridge
✅ AgentContextBuilder (converts state to prompts)
✅ ResponseParser (extracts behaviors from LLM)
```

### 6.2 Dual-Layer Cognitive Architecture ✅
```
✅ Autonomic Layer (fast survival reflexes)
  - Hunger < 20 → seek_food override
  - Energy < 10 → idle/rest override
  - Based on needs.md tier system
✅ Executive Layer (slow LLM planning)
  - 1-minute cooldown (1200 ticks @ 20 TPS)
  - Strategic decision making
  - Only runs when survival needs met
```

### 6.3 Agent Updates ✅
```
✅ AgentComponent v1: useLLM, llmCooldown fields
✅ 100% LLM agents (removed scripted behavior)
✅ createLLMAgent factory function
✅ Rate limiting (2 concurrent LLM requests)
```

### 6.4 Testing ✅
```
✅ Phase 6 Playwright integration test
✅ Validates LLM spawning and decisions
✅ Tests behavior diversity
✅ Screenshot capture
```

**Milestone Check**: ✅ LLM agents make autonomous decisions with survival reflexes. MVP REACHED!

---

## Phase 7: Building & Shelter

**Deliverable**: Agents can build simple structures.

### 6.1 Building Component
```
□ BuildingComponent (type, tier, progress)
□ Building archetypes
□ Buildings block movement
```

### 6.2 Resources
```
□ Log item (from trees)
□ ChopAction (tree → logs)
□ Stone item (from rocks)
□ MineAction (rock → stones)
```

### 6.3 Construction System
```
□ BuildAction
□ Building placement validation
□ Construction progress over time
□ Material consumption
```

### 6.4 Shelter Need
```
□ Add shelter need
□ Decays without shelter
□ Buildings provide shelter
```

### 6.5 Basic Buildings
```
□ Campfire (warmth)
□ Lean-to (shelter)
□ Storage box (container)
```

**Milestone Check**: Agents gather resources, build shelters. Early base-building emerges.

---

## Phase 7: Farming Basics

**Deliverable**: Agents can plant, tend, and harvest crops.

### 7.1 Farmable Tiles
```
□ TillAction (dirt → tilled)
□ Tile state tracking
□ Reversion over time if unplanted
```

### 7.2 Crop Component
```
□ CropComponent (type, growth stage, water level)
□ Growth system
□ Water need
```

### 7.3 Farming Actions
```
□ PlantAction
□ WaterAction
□ HarvestAction
```

### 7.4 Seeds & Produce
```
□ Seed items
□ Produce items (wheat, carrots)
□ Cooking/processing (later phase)
```

### 7.5 Growth System
```
□ Time-based growth stages
□ Seasonal effects (placeholder)
□ Yield calculation
```

**Milestone Check**: Agents plant crops, water them, harvest food. Farming village vibes.

---

## Phase 8: Memory & Personality

**Deliverable**: Agents remember things and have distinct personalities. Full fidelity system with statistical simulation.

### 8.1 Memory Component
```
□ MemoryComponent with episodic entries
□ Memory creation from events
□ Importance scoring
□ Decay over time
```

### 8.2 Memory System
```
□ Record significant events
□ Daily consolidation
□ Pruning old memories
□ Tiered memory recording (detailed → significant → sparse → outcomes only)
```

### 8.3 Memory Retrieval
```
□ Query relevant memories for decision
□ Include in LLM context
□ Limit context size intelligently
```

### 8.4 Personality Component
```
□ PersonalityComponent with trait scales
□ Big Five or custom traits
□ Influence decision prompts
```

### 8.5 Personality Expression
```
□ Traits affect action preferences
□ Same situation, different agents decide differently
□ Consistent behavior over time
```

### 8.6 Tier 3: Statistical Simulation
```
□ DailySummary calculation (no LLM)
□ Probabilistic needs satisfaction
□ Work/social outcome rolls based on skills
□ Notable event generation (injury, discovery - rare)
□ Location prediction
```

### 8.7 Catch-Up Protocol
```
□ CatchUpData structure (daily summaries)
□ Single LLM "journaling" call when returning from Tier 3
□ Parse journal → episodic memories
□ Relationship adjustment from interaction counts
□ Seamless re-integration to higher tier
```

> See SIMULATION_FIDELITY.md for catch-up specification

**Milestone Check**: Agents have memories, distinct personalities. Tier 3 agents simulate statistically and catch up seamlessly.

---

## Phase 9: Crafting & Items

**Deliverable**: Agents craft items from materials.

### 9.1 Recipe System
```
□ Recipe interface
□ Recipe registry
□ Material requirements
□ Skill requirements (placeholder)
```

### 9.2 Crafting Action
```
□ CraftAction
□ Workstation requirement (or hand-crafting)
□ Time to complete
□ Result creation
```

### 9.3 Tool Items
```
□ Axe (faster chopping)
□ Pickaxe (faster mining)
□ Hoe (required for tilling)
```

### 9.4 Quality System
```
□ QualityComponent (0.5-2.0 multiplier)
□ Quality affects effectiveness
□ Quality from crafter skill
```

### 9.5 Durability
```
□ DurabilityComponent
□ Degrades with use
□ Repair action
□ Breaking
```

**Milestone Check**: Agents craft tools, tools wear out. Material economy exists.

---

## Phase 10: Economy & Trade

**Deliverable**: Agents trade items with each other.

### 10.1 Value System
```
□ Base values for items
□ Quality/durability modifiers
□ Supply/demand (placeholder)
```

### 10.2 Trade Action
```
□ TradeAction (propose trade)
□ Trade negotiation (LLM-based)
□ Trade completion
□ Trade rejection
```

### 10.3 Ownership
```
□ OwnershipComponent
□ Respect ownership in decisions
□ Theft as option (with consequences)
```

### 10.4 Currency (Optional)
```
□ Coin items
□ Price discovery
□ Shops (future)
```

**Milestone Check**: Agents trade items. Economic behavior emerges.

---

## Phase 11: Animals

**Deliverable**: Animals exist, can be tamed and farmed.

### 11.1 Animal Component
```
□ AnimalComponent (species, tame/wild)
□ Animal needs (food, rest)
□ Animal behaviors
```

### 11.2 Wild Animals
```
□ Passive animals (deer, rabbits)
□ Movement patterns
□ Flee behavior
```

### 11.3 Taming
```
□ TameAction
□ Tame progress
□ Feeding requirements
```

### 11.4 Animal Products
```
□ Eggs, milk, wool
□ Collection actions
□ Breeding basics
```

**Milestone Check**: Animals roam, can be tamed. Animal husbandry possible.

---

## Future Phases (Brief)

### Phase 12: Relationships Deep Dive
- Full relationship modeling
- Trust, favor economy
- Social networks

### Phase 13: Skills & Specialization
- Skill levels that improve with practice
- Role specialization
- Teaching between agents

### Phase 14: Time & Seasons
- Day/night cycle
- Seasonal effects
- Weather system

### Phase 15: Research & Discovery
- Tech tree basics
- Invention system
- Knowledge spread

### Phase 16: Chroniclers
- Writing system
- Books and libraries
- History recording

### Phase 17: Governance
- Leadership emergence
- Laws and rules
- Collective decision making

### Phase 18: Multi-Village
- Second village generation
- Abstraction layers
- Inter-village trade and interaction

### Phase 19: Player Modes
- Spectator mode polish
- Villager mode (play as agent)
- Manager mode

### Phase 20: Culture & Lifecycle
- Birth, aging, death
- Generations
- Cultural emergence
- Species system

---

## Feature Dependency Graph

```
Phase 0 (Foundation)
    │
    ▼
Phase 1 (World) ──────────────────────────┐
    │                                      │
    ▼                                      │
Phase 2 (First Agent)                      │
    │                                      │
    ▼                                      │
Phase 3 (Needs) ◄──────────────────────────┤
    │                                      │
    ├───────────────┬──────────────┐       │
    ▼               ▼              ▼       │
Phase 4         Phase 5        Phase 6     │
(LLM)           (Social)       (Building)  │
    │               │              │       │
    └───────┬───────┴──────────────┘       │
            │                              │
            ▼                              │
        Phase 7 (Farming) ◄────────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
Phase 8         Phase 9
(Memory)        (Crafting)
    │               │
    └───────┬───────┘
            │
            ▼
       Phase 10 (Economy)
            │
            ▼
       Phase 11 (Animals)
            │
            ▼
       [Future Phases...]
```

---

## Daily Feature Development Pattern

Once Phase 5 is complete, you can add features independently:

### One Feature Per Day Example

**Day N: Add fishing**
1. Morning: Design
   - FishingComponent
   - FishAction
   - Fish item types
   - Water tile detection

2. Afternoon: Implement
   - Register components
   - Create action handler
   - Add to decision context
   - Test with mock LLM

3. Evening: Polish
   - Migration for existing saves
   - Feature flag
   - Update agent prompts
   - Manual testing

4. Commit: Feature complete

**Day N+1: Add cooking**
- Uses items from fishing
- New CookAction
- Campfire as workstation
- Cooked food has better stats

Each feature follows the same pattern:
1. Components (data)
2. Actions (intent)
3. System (logic)
4. Events (communication)
5. Migration (backwards compat)
6. Tests

---

## Save Compatibility Guarantee

### Version 1 save (after Phase 5):
```json
{
  "header": {
    "saveVersion": 1,
    "features": {
      "needs": true,
      "farming": false,
      "animals": false
    }
  }
}
```

### Loading in Phase 11 version:
1. Detect saveVersion: 1
2. Run migrations 1→2→3→...→11
3. Each migration adds new features with defaults
4. Agent without AnimalComponent gets one with empty fields
5. Game runs with all systems
6. Save now becomes version 11

### Explicit Disabling:
```json
{
  "features": {
    "animals": { "enabled": false }
  }
}
```

AnimalSystem checks feature flag, skips processing. Animals don't spawn. Old save behavior preserved but can be enabled.

---

## Minimum Playable Game (End of Phase 5)

After Phase 5, you have:
- ✓ Procedural infinite world
- ✓ Multiple LLM-controlled agents
- ✓ Survival mechanics (hunger, energy)
- ✓ Foraging for food
- ✓ Agent conversations
- ✓ Basic social awareness
- ✓ Save/Load working
- ✓ Backwards compatible foundation

This is **playable and interesting**. You can observe agents, they make decisions, they interact. Everything after this adds depth but isn't required for the core loop.

---

## Sprint Planning Template

For each phase:

```markdown
## Phase N: [Name]

### Goal
One sentence describing what's playable after this phase.

### Components
- [ ] ComponentA: fields, version 1
- [ ] ComponentB: fields, version 1

### Actions
- [ ] action:a: validation, execution, duration
- [ ] action:b: validation, execution, duration

### Systems
- [ ] SystemA: priority, required components, update logic
- [ ] SystemB: priority, required components, update logic

### Events
- [ ] event:a: emitted by, consumed by
- [ ] event:b: emitted by, consumed by

### Migrations
- [ ] Save v(N-1) → vN: what changes

### Tests
- [ ] Unit: component creation
- [ ] Unit: action validation
- [ ] Unit: system processing
- [ ] Integration: full feature flow
- [ ] Migration: old save loads correctly

### Definition of Done
- [ ] Feature flag exists
- [ ] All tests pass
- [ ] Old saves load and run
- [ ] New feature works in fresh game
- [ ] Feature can be disabled via flag
```
