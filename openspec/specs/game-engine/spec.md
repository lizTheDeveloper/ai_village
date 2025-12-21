# Game Engine Core - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The AI Village game engine is a browser-based simulation where LLM-controlled agents inhabit a forest village, growing crops, constructing buildings, crafting goods, and researching new technologies. The engine runs as a Vite + TypeScript webapp with an 8-bit visual aesthetic.

---

## Core Architecture

### Technology Stack

- **Frontend:** Vite + TypeScript + Canvas/WebGL
- **Rendering:** PixiJS or custom 8-bit renderer
- **State Management:** Zustand or Redux Toolkit
- **AI Backend:** Open-source LLMs (Llama, Mistral, etc.) via API
- **Persistence:** IndexedDB for local saves, optional backend sync

### Engine Components

```
game-engine/
├── core/
│   ├── GameLoop.ts          # Main tick/update loop
│   ├── TimeManager.ts       # In-game time (seasons, days)
│   ├── EventBus.ts          # Pub/sub for game events
│   └── StateManager.ts      # Central game state
├── systems/
│   ├── AgentSystem.ts       # AI agent orchestration
│   ├── WorldSystem.ts       # Tile map, terrain, biomes
│   ├── FarmingSystem.ts     # Crops, growth, harvest
│   ├── ConstructionSystem.ts # Buildings, placement
│   ├── ItemSystem.ts        # Items, inventory, crafting
│   ├── ResearchSystem.ts    # Tech tree, discoveries
│   └── EconomySystem.ts     # Shops, trading, currency
├── rendering/
│   ├── Renderer8Bit.ts      # 8-bit pixel renderer
│   ├── SpriteManager.ts     # Sprite atlas management
│   └── UIRenderer.ts        # HUD, menus, dialogs
└── config/
    ├── scenarios/           # Predefined game scenarios
    └── items/               # Item definitions
```

---

## Requirements

### REQ-ENG-001: Game Loop

The engine SHALL implement a fixed timestep game loop:

- **Tick Rate:** 20 ticks per second (50ms intervals)
- **Render Rate:** 60 FPS (interpolated)
- **Pause Support:** Game tick can be paused while rendering continues

```
WHEN the game loop executes a tick
THEN all systems SHALL update in deterministic order:
  1. TimeManager (advance in-game clock)
  2. NeedsSystem (decay agent needs - hunger, thirst, etc.)
  3. AbstractionSystem (determine simulation layers per village)
  4. AgentSystem (process AI decisions based on layer)
  5. MovementSystem (pathfinding, interrupts - no LLM per step)
  6. WorldSystem (environmental updates, chunk loading)
  7. FarmingSystem (crop growth)
  8. AnimalSystem (animal behavior, needs, products)
  9. ConstructionSystem (building progress)
  10. EconomySystem (shop restocking, inter-village trade)
  11. MemorySystem (end-of-day reflection, decay)
  12. ChronicleSystem (writers produce content)
  13. EventBus (process queued events)
```

### REQ-ENG-002: Time System

The engine SHALL track in-game time:

- **Day/Night Cycle:** 10 real minutes = 1 in-game day
- **Seasons:** Spring, Summer, Fall, Winter (7 in-game days each)
- **Year Tracking:** Years count up from Year 1

```
WHEN a new day begins
THEN the engine SHALL:
  - Emit "day:start" event
  - Reset daily agent energy
  - Update crop growth states
  - Trigger any scheduled events
```

### REQ-ENG-003: Multi-Timescale Simulation

> **Implementation Note:** Multi-timescale simulation is limited by feasibility. See `consciousness-implementation-phases.md` for details. Phase 5 adds dual timescale (standard + slow). Millisecond and geological timescales are deferred indefinitely due to LLM call constraints and perception mismatches.

The engine SHALL support entities operating on different temporal scales:

```typescript
type TemporalScale =
  | "millisecond"     // AI Minds, digital beings
  | "realtime"        // Standard biological agents
  | "slow"            // Contemplative species (Ents)
  | "hibernating"     // Cyclical dormancy species
  | "geological";     // Stone Eaters, ancient beings

interface TemporalExperience {
  scale: TemporalScale;

  // How fast time passes subjectively
  subjectiveTimeRate: number;      // 1.0 = normal, 0.001 = very slow

  // How often this entity updates
  updateFrequency: UpdateFrequency;

  // Perception of other timescales
  perceives: TemporalScale[];      // Which scales can it interact with?
  interactionMethod: Map<TemporalScale, InteractionMethod>;
}

interface UpdateFrequency {
  ticksPerUpdate: number;          // How many game ticks per decision
  batchProcessing: boolean;        // Can compress multiple ticks?
  realTimeConstraint?: number;     // Min ms between updates (AI speed limit)
}

// Timescale configurations
const TEMPORAL_SCALES: Record<TemporalScale, TemporalConfig> = {
  millisecond: {
    ticksPerUpdate: 0.05,          // 20 updates per tick
    subjectiveMultiplier: 1000,    // Experiences 1 tick as 1000 subjective ticks
    canPauseFor: ["realtime"],     // Can "slow down" to talk to biologicals
    exampleSpecies: ["AI_Mind", "digital_consciousness"],
  },

  realtime: {
    ticksPerUpdate: 1,             // Standard 1:1
    subjectiveMultiplier: 1,
    canPauseFor: [],
    exampleSpecies: ["human", "atevi", "kif"],
  },

  slow: {
    ticksPerUpdate: 100,           // Updates every 100 ticks
    subjectiveMultiplier: 0.01,    // Perceives time as very fast
    canPauseFor: [],
    exampleSpecies: ["ent_like", "contemplative"],
  },

  hibernating: {
    ticksPerUpdate: "variable",    // Active or dormant
    subjectiveMultiplier: "phase_dependent",
    dormancyCycle: {
      activeTicks: 2000,           // ~100 days active
      dormantTicks: 20000,         // ~1000 days dormant
      transitionBuffer: 200,       // Pre/post dormancy
    },
    exampleSpecies: ["spider_like", "seasonal_hibernator"],
  },

  geological: {
    ticksPerUpdate: 100000,        // Updates once per in-game year
    subjectiveMultiplier: 0.00001,
    perceivesOthers: false,        // Individual biologicals invisible
    aggregatePerception: true,      // Sees patterns, not individuals
    exampleSpecies: ["stone_eater", "ancient_one"],
  },
};
```

```
WHEN processing a game tick
THEN the engine SHALL:
  1. For millisecond entities:
     - Process 20 micro-updates per tick
     - Allow interaction slow-down for cross-scale communication
  2. For realtime entities:
     - Process standard update
  3. For slow entities:
     - Accumulate ticks, process when threshold reached
     - Their actions span many ticks
  4. For hibernating entities:
     - IF in active phase: process at realtime
     - IF in dormant phase: skip processing, track time debt
     - IF in transition: run hibernation protocols
  5. For geological entities:
     - Accumulate entire seasons/years
     - Process aggregate world changes, not individual events
```

### REQ-ENG-003a: Hibernation Cycle Engine

Hibernation requires special handling:

```typescript
interface HibernationEngine {
  // Track all hibernating entities
  hibernators: Map<string, HibernatorState>;

  // Global cycle sync (some species hibernate together)
  cycleGroups: Map<string, CycleGroup>;
}

interface HibernatorState {
  entityId: string;
  currentPhase: HibernationPhase;
  phaseStartTick: number;
  phaseDuration: number;

  // Pre-hibernation state
  savedState?: EntitySnapshot;

  // What happens during dormancy
  dormancyEffects: DormancyEffect[];
}

type HibernationPhase =
  | "active"
  | "pre_dormancy"        // Preparing for hibernation
  | "entering_dormancy"   // Transition period
  | "dormant"             // Fully asleep
  | "waking"              // Emerging from dormancy
  | "post_dormancy";      // Reorientation period

interface DormancyEffect {
  type: DormancyEffectType;
  rate: number;
}

type DormancyEffectType =
  | "memory_decay"        // Lose memories over time
  | "skill_decay"         // Skills degrade without practice
  | "relationship_decay"  // Others forget them too
  | "aging_pause"         // Don't age while dormant
  | "need_stasis";        // Needs don't decay

interface CycleGroup {
  id: string;
  species: string[];
  cycleLength: number;           // In ticks
  currentPhase: HibernationPhase;
  syncedEntities: string[];

  // What happens to society during dormancy
  societalPersistence: SocietalPersistence;
}

interface SocietalPersistence {
  // Awake caretakers (if any)
  caretakerCaste?: string;

  // Knowledge preservation
  preservedSystems: string[];    // Which systems continue
  suspendedSystems: string[];    // Which systems pause

  // Protection during dormancy
  vulnerabilityLevel: number;
  defenseStrategies: string[];
}
```

```
WHEN a hibernator enters dormancy
THEN the engine SHALL:
  1. Snapshot current entity state
  2. Apply dormancy effects:
     - Stop needs decay (or minimal)
     - Stop aging (if configured)
     - Begin memory decay
  3. Remove from active processing
  4. Add to dormancy tracking
  5. IF all members of faction dormant:
     - Transition faction to minimal processing
     - Activate caretaker systems if any

WHEN a hibernator wakes
THEN the engine SHALL:
  1. Calculate time debt (ticks spent dormant)
  2. Apply cumulative dormancy effects
  3. Restore from snapshot with modifications
  4. Re-add to active processing
  5. Trigger reorientation period:
     - Reduced effectiveness
     - Memory gaps
     - Relationship reconnection needs
```

### REQ-ENG-003b: Cross-Timescale Interaction

Entities on different timescales can interact:

```typescript
interface CrossScaleInteraction {
  initiator: string;
  initiatorScale: TemporalScale;
  target: string;
  targetScale: TemporalScale;

  // How to bridge the gap
  bridgeMethod: ScaleBridgeMethod;
}

type ScaleBridgeMethod =
  | "slowdown"            // Faster entity slows to meet slower
  | "speedup"             // Slower entity speeds up (expensive/dangerous)
  | "intermediary"        // Use translator entity
  | "aggregate"           // Exchange information in batches
  | "inscription"         // Leave messages to be found
  | "ritual";             // Special synchronization process

// AI Mind talking to biological
const aiToBiological: CrossScaleInteraction = {
  initiator: "mind_1",
  initiatorScale: "millisecond",
  target: "human_1",
  targetScale: "realtime",
  bridgeMethod: "slowdown",
  // AI "pauses" most processes to converse at biological speed
};

// Biological communicating with geological being
const bioToGeological: CrossScaleInteraction = {
  initiator: "human_1",
  initiatorScale: "realtime",
  target: "stone_eater_1",
  targetScale: "geological",
  bridgeMethod: "inscription",
  // Human leaves message; stone eater responds next century
};

// Special cases
interface GeologicalPerception {
  // Geological beings don't see individuals
  seesIndividuals: false;

  // They see patterns and aggregates
  perceives: GeologicalPattern[];
}

interface GeologicalPattern {
  type: "civilization_rise" | "civilization_fall" | "mass_migration"
    | "technological_change" | "ecological_shift";
  duration: number;              // Ticks for pattern to be visible
  significance: number;          // How interesting to geological being
}
```

### REQ-ENG-003c: Save/Load System

The engine SHALL support game persistence:

```
WHEN the player saves the game
THEN the engine SHALL serialize:
  - Current time state
  - All agent states and memories
  - World tile data
  - Item inventories
  - Building states
  - Research progress
  - Economy state
```

### REQ-ENG-004: Scenario Configuration

The engine SHALL load scenarios from configuration files:

```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;

  // Starting conditions
  initialAgents: AgentConfig[];
  initialBuildings: BuildingPlacement[];
  initialItems: ItemStock[];
  unlockedResearch: string[];

  // World generation
  worldSeed: number;
  worldSize: { width: number; height: number };
  biomeDistribution: BiomeConfig;

  // Win/lose conditions (optional)
  objectives?: Objective[];
  failConditions?: FailCondition[];
}
```

### REQ-ENG-005: Event System

The engine SHALL provide a pub/sub event bus:

```typescript
// Core events
type GameEvent =
  | { type: "tick"; tick: number }
  | { type: "day:start"; day: number; season: Season }
  | { type: "season:change"; season: Season }
  | { type: "agent:action"; agentId: string; action: AgentAction }
  | { type: "crop:harvested"; cropId: string; yield: Item[] }
  | { type: "building:complete"; buildingId: string }
  | { type: "research:complete"; techId: string }
  | { type: "item:crafted"; itemId: string; quantity: number }
  | { type: "trade:complete"; buyer: string; seller: string; items: TradeItem[] };
```

---

## Configuration

### Game Speed Settings

| Setting | Real Time | In-Game Time |
|---------|-----------|--------------|
| Slow    | 20 min    | 1 day        |
| Normal  | 10 min    | 1 day        |
| Fast    | 5 min     | 1 day        |
| Ultra   | 2 min     | 1 day        |

### Performance Targets

- **Active Agents:** 20-50 in full simulation (player's village)
- **Background Agents:** 100s at reduced simulation (nearby villages)
- **Abstract Villages:** 1000s as statistical aggregates (distant)
- **World Size:** Infinite (chunk-based, ~25 active chunks in memory)
- **Item Types:** 500+ base items, unlimited generated items
- **Memory:** < 500MB browser heap for active content
- **Load Time:** < 3 seconds initial load
- **LLM Calls:** Max 5 per frame (see agent-system/movement-intent.md)

---

## Integration Points

- **Agent System:** Receives agent decisions, updates positions
- **World System:** Provides terrain data, pathfinding
- **Rendering:** Receives state snapshots for display
- **UI:** Receives events for player feedback

---

## Open Questions

1. Should we support multiplayer/spectator mode?
2. What open-source LLM backend(s) to prioritize?
3. Cloud save integration requirements?
4. Mobile/touch support scope?

---

## Related Specs

**Core Systems:**
- `agent-system/spec.md` - AI agent behavior
- `world-system/spec.md` - World generation and terrain
- `rendering-system/spec.md` - 8-bit visual rendering

**Simulation Systems:**
- `world-system/abstraction-layers.md` - Multi-scale village simulation
- `world-system/procedural-generation.md` - Chunk-based infinite world
- `agent-system/needs.md` - Needs decay per tick
- `agent-system/movement-intent.md` - Movement without LLM per step
- `agent-system/memory-system.md` - End-of-day reflection
- `animal-system/spec.md` - Animal simulation
- `economy-system/inter-village-trade.md` - Trade between villages
- `agent-system/chroniclers.md` - Content generation by writers

**Feasibility:**
- `consciousness-implementation-phases.md` - Multi-timescale implementation phasing
- `FEASIBILITY_REVIEW.md` - Technical constraints and recommendations
