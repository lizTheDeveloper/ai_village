# Soul Agents - Cross-Scale Named Character System

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Dependencies:** 01-GRAND-STRATEGY-OVERVIEW.md, Hierarchy Simulator, SoulRepositorySystem, Persistence

---

## Overview & Motivation

### The Sacred Nature of Soul Agents

**Core Principle:** "Soul agents are sacred" - named characters with player attachment MUST persist with full fidelity across all zoom levels, time scales, and even universe forks.

**The Problem with Traditional Abstraction:**

In typical multi-scale simulations (Hierarchy Simulator, statistical tiers), individual entities are lost when zooming out:

```typescript
// Chunk tier: Individual agent detail
agent.position = { x: 142.5, y: 87.3 };
agent.memories = [/* 50 detailed memories */];
agent.skills = { farming: 3, combat: 1, magic: 0 };

// Region tier: Statistical summary
summary.population = 4_500_000;
summary.avgSkillLevel = 2.5;
// ❌ Individual agent data LOST - cannot recover position, memories
```

**This is correct** for anonymous agents (crowds, statistical populations). But for **soul agents** - named characters the player cares about - this data loss is unacceptable.

**The Solution: Soul Agent Preservation System**

Soul agents maintain **full simulation state** even when their containing tier is inactive:

```typescript
// Region tier is statistical (4.5M agents summarized)
const region = getTier('region_0');
region.mode = 'statistical'; // Not simulating individual agents

// BUT soul agents remain queryable
const kara = getSoulAgent('soul:kara');
kara.position; // { x: 142.5, y: 87.3 } - PRESERVED
kara.memories; // Full 50 memories - PRESERVED
kara.age; // 47 years old - PRESERVED

// Soul agents simulate in HEADLESS mode when zoomed out
// Key life events still occur (aging, relationships, death)
```

**Use Cases:**

1. **Cross-Era Stories:** "Kara discovered iron → 500 years later, her descendant rules the empire built on that discovery"
2. **Time Travel:** Soul agent visits past, meets their own ancestor (also a soul agent)
3. **Dynasty Tracking:** Follow a family lineage across millennia
4. **Player Attachment:** Named characters players care about never disappear into statistics
5. **Emergent Narrative:** LLM generates stories about soul agents even when player isn't watching

### Existing Soul System

The game already has a robust soul/incarnation system (`packages/core/src/components/SoulIdentityComponent.ts`, `IncarnationComponent.ts`, `SoulRepositorySystem.ts`):

**Current Features:**
- **Souls** are separate entities from bodies (agents)
- Souls have purpose, destiny, interests, archetypes
- Souls can reincarnate into new bodies after death
- Souls maintain incarnation history across lives
- Soul repository backs up all souls to disk

**What We're Adding:**
- **Soul Agent status** - marking certain souls as "always simulate with full fidelity"
- **Headless simulation** - background simulation for soul agents in inactive tiers
- **Memory persistence** - core memories preserved across zooms and time jumps
- **Life trajectory generation** - LLM-driven long-term life simulation
- **Awakening protocol** - restoring soul agent state when zooming back in

---

## Core Concepts & Terminology

### 1. Soul Agent vs Regular Soul

**Regular Soul:**
- Exists in soul repository
- Can reincarnate
- Has purpose/destiny
- Simulated normally when incarnated in active tier
- **Lost to statistics** when tier becomes inactive

**Soul Agent:**
- Everything a regular soul has, PLUS:
- **Marked for preservation** - never lost to statistics
- **Headless simulation** - continues simulating (reduced fidelity) when tier inactive
- **Cross-tier tracking** - position, memories, relationships preserved across all scales
- **Player-significant** - named character the player interacts with or cares about

**Promotion Criteria** (when does a soul become a soul agent?):

```typescript
interface SoulAgentPromotionCriteria {
  // Automatic promotion
  player_interaction: boolean;        // Player talked to, commanded, or controlled
  narrative_importance: boolean;      // Triggered major event (discovered tech, founded city, became deity)
  llm_investment: boolean;            // Generated LLM dialogue, life story, or quest

  // Manual promotion
  player_marked: boolean;             // Player explicitly marked as "important"

  // Inheritance
  descendant_of_soul_agent: boolean;  // Parent is soul agent (inheritance)
}
```

**Examples:**
- Kara (player-controlled agent) → soul agent (player interaction)
- Finn (discovered agriculture) → soul agent (narrative importance)
- Zara (LLM-generated backstory for quest) → soul agent (LLM investment)
- Elder Rowan (player appointed as village leader) → soul agent (player marked)
- Luna (daughter of Kara the soul agent) → soul agent (descendant inheritance, configurable)

### 2. Simulation Modes

Soul agents exist in three simulation modes:

**Full Simulation (Active Tier):**
- Contained in an active ECS tier (chunk/zone)
- Normal ECS systems process every tick
- Full behavior tree, pathfinding, LLM calls
- Real-time decision making
- Example: Player is zoomed into village, watching Kara craft tools

**Headless Simulation (Inactive Tier):**
- Tier is inactive (statistical mode), but soul agent still simulates
- Reduced-fidelity simulation:
  - No per-tick ECS updates
  - No pathfinding (position interpolated)
  - No physics
  - **Key life events** still occur (aging, relationships, major achievements)
  - LLM budget allocated for critical decisions only
- Example: Player zoomed to galaxy tier, Kara still ages, forms relationships, dies naturally

**Dormant (Time Jump):**
- Large time skip (100+ years)
- Life trajectory pre-generated by LLM
- Soul agent "fast-forwards" through life
- Key events determined narratively, not simulated
- Example: Player jumps 1000 years forward → LLM generates Kara's life summary (lived to 85, had 3 children, became village elder, died peacefully)

### 3. Memory Compression Hierarchy

Soul agents have a **three-tier memory system**:

**Tier 1: Active Memories (Always Available)**
- `EpisodicMemoryComponent` - full detail episodic memories
- Limit: ~1000 memories (most recent, most important)
- Used for: Real-time decisions, conversations, behavior
- Cleared when: Memory limit exceeded, but moved to Tier 2

**Tier 2: Suppressed Memories (Background Consciousness)**
- Moved from active when clarity < 0.1 or memory limit exceeded
- Limit: ~500 suppressed memories (most important preserved)
- Used for: Dreams, meditation, trauma responses, LLM context for "deep" questions
- Cleared when: Suppressed limit exceeded, but moved to Tier 3

**Tier 3: Soul Core Memories (Eternal)**
- Extracted from Tier 2 when suppressed limit exceeded
- **Never deleted** - persists across death, reincarnation, universe forks
- Only ~50-100 memories (highest importance + emotional intensity)
- Used for: Soul identity, cross-incarnation wisdom, deity emergence
- Structure:
  ```typescript
  interface CoreMemory {
    summary: string;           // Compressed version of original memory
    emotionalSignature: {      // Preserved emotional content
      valence: number;         // -1 to 1
      intensity: number;       // 0 to 1
    };
    lifeContext: string;       // Which incarnation this occurred in
    cosmicSignificance: number; // 0-1, why this matters to soul's purpose
  }
  ```

**Memory Flow:**

```
Active (1000) --decay--> Suppressed (500) --compress--> Core (100)
     ↓                        ↓                            ↓
LLM context           Dreams/meditation            Soul wisdom
Behavior tree            Resurfacing            Cross-life identity
Real-time recall      Trauma triggers           Deity emergence
```

### 4. Life Trajectory vs Simulation

**Simulation (default):**
- Soul agent experiences life tick-by-tick
- Aging system increments age
- Relationship system tracks friendships
- Memory system records events
- Behavior tree makes decisions
- Example: 100 game-days = 100 days of detailed simulation

**Life Trajectory (time jumps):**
- LLM generates probable life path
- No tick-by-tick simulation
- Key milestones determined narratively
- Example: Jump 50 years → LLM outputs: "Kara married Finn (year 5), had 2 children (year 7, 12), became village elder (year 30), discovered iron smelting (year 42), died at 85 (year 50)"

**When to use each:**

| Scenario | Mode | Reason |
|----------|------|--------|
| Player watching | Simulation | Real-time agency, player can intervene |
| Zoomed out (same tier active) | Simulation | Still running ECS, just not on-screen |
| Zoomed to higher tier (inactive) | Headless Simulation | Tier statistical, but soul agents persist |
| Time skip < 10 years | Headless Simulation | Short enough to simulate key events |
| Time skip > 10 years | Life Trajectory | Too long to simulate, LLM generates summary |
| Universe fast-forward | Life Trajectory | Burning through centuries/millennia |

---

## Data Structures

### SoulAgentComponent

**Location:** `packages/core/src/components/SoulAgentComponent.ts` (NEW)

```typescript
/**
 * Marks a soul as a "soul agent" - preserved with full fidelity across all scales.
 * This component is attached to SOUL ENTITIES, not agent entities.
 *
 * Soul agents are sacred - they never lose detail when zooming out.
 * They simulate in headless mode when their containing tier is inactive.
 */
export interface SoulAgentComponent extends Component {
  type: 'soul_agent';

  /**
   * Why this soul is a soul agent
   */
  promotionReason:
    | 'player_interaction'
    | 'narrative_importance'
    | 'llm_investment'
    | 'player_marked'
    | 'descendant_inheritance';

  /**
   * When this soul was promoted to soul agent status
   */
  promotedTick: Tick;

  /**
   * Current simulation mode for this soul agent
   */
  simulationMode: 'full' | 'headless' | 'dormant';

  /**
   * Last tick this soul agent was in full simulation
   * Used to determine how much to simulate when re-activating
   */
  lastFullSimulationTick: Tick;

  /**
   * Headless simulation state (only used when mode = 'headless')
   */
  headlessState?: HeadlessSimulationState;

  /**
   * Life trajectory (only used when mode = 'dormant')
   */
  trajectory?: LifeTrajectory;

  /**
   * Core memories (Tier 3) - never deleted, persist across lives
   * Compressed summaries of most important life experiences
   */
  coreMemories: CoreMemory[];

  /**
   * Cross-tier position tracking
   * Always know where this soul agent is, even in inactive tiers
   */
  spatialTracking: {
    currentTier: TierLevel;          // chunk, region, planet, system, etc.
    tierId: string;                  // e.g., 'chunk:0,0' or 'planet:earth'
    lastKnownPosition: Vector3D;     // Preserved position
    velocityVector?: Vector3D;       // For interpolation
  };

  /**
   * Relationships with other soul agents
   * Preserved across tiers and time
   */
  soulAgentRelationships: Map<string, SoulAgentRelation>;

  /**
   * Cross-era narrative tags
   * For story generation and quest hooks
   */
  narrativeTags: string[]; // e.g., ['ironsmith', 'founder', 'time_traveler', 'deity_candidate']

  /**
   * Player attachment level (0-10)
   * Higher = more LLM budget allocated for this soul agent
   */
  playerAttachment: number;
}

/**
 * Headless simulation state for when soul agent is in inactive tier
 */
interface HeadlessSimulationState {
  /**
   * Simplified goal state
   */
  currentGoal: {
    type: string;              // 'gather_food', 'build_shelter', 'find_mate', etc.
    priority: number;          // 0-1
    progress: number;          // 0-1
    estimatedCompletionTick: Tick;
  };

  /**
   * Key relationships being maintained
   * Only track most important (top 5-10)
   */
  activeRelationships: Array<{
    targetSoulId: string;      // Reference to other soul (agent or soul agent)
    relationshipType: string;  // 'spouse', 'child', 'friend', 'rival'
    strength: number;          // 0-1
  }>;

  /**
   * Next scheduled life event
   * Events pre-calculated to reduce LLM calls
   */
  nextLifeEvent?: {
    type: string;              // 'marriage', 'childbirth', 'discovery', 'death', etc.
    scheduledTick: Tick;
    involvedSoulIds: string[]; // Other participants
  };

  /**
   * Aging tracker
   */
  ageingState: {
    biologicalAge: number;     // Years old
    healthDecayRate: number;   // How fast aging/health
    estimatedDeathTick: Tick;  // Projected natural death (can change)
  };
}

/**
 * Life trajectory for dormant mode (time jumps)
 */
interface LifeTrajectory {
  /**
   * LLM-generated life summary
   */
  summary: string;

  /**
   * Key milestones in chronological order
   */
  milestones: Array<{
    tick: Tick;
    eventType: string;
    description: string;
    emotionalImpact: number;   // -1 to 1
    participantSoulIds: string[];
  }>;

  /**
   * Final state after trajectory completes
   */
  endState: {
    alive: boolean;
    age: number;
    position: Vector3D;
    tier: TierLevel;
    finalMemories: CoreMemory[]; // Most important memories from this period
  };

  /**
   * When this trajectory was generated
   */
  generatedTick: Tick;

  /**
   * LLM model used for generation (for debugging)
   */
  generatedByModel: string;
}

/**
 * Core memory (Tier 3) - eternal soul memory
 */
interface CoreMemory {
  id: string;

  /**
   * Compressed summary of original memory
   */
  summary: string; // Max 200 chars

  /**
   * Emotional signature (preserved across compression)
   */
  emotionalSignature: {
    valence: number;           // -1 (negative) to 1 (positive)
    intensity: number;         // 0 (neutral) to 1 (overwhelming)
    dominantEmotion?: string;  // 'joy', 'grief', 'fear', 'love', etc.
  };

  /**
   * Which incarnation this memory came from
   */
  incarnationContext: {
    incarnationIndex: number;  // 0 = first life, 1 = second, etc.
    bodyName?: string;
    bodySpecies?: string;
    tick: Tick;                // When in that life
  };

  /**
   * Why this memory is core (never forgotten)
   */
  coreReason:
    | 'purpose_fulfillment'    // Related to soul's purpose
    | 'destiny_realization'    // Related to soul's destiny
    | 'extreme_emotion'        // Overwhelming emotional intensity
    | 'life_defining'          // Changed the course of this life
    | 'cross_life_wisdom';     // Insight carried across incarnations

  /**
   * Cosmic significance (why this matters to the soul's eternal journey)
   */
  cosmicSignificance: number; // 0-1

  /**
   * Number of times this core memory has influenced decisions
   * (incremented when used in LLM context)
   */
  influenceCount: number;
}

/**
 * Relationship between two soul agents
 */
interface SoulAgentRelation {
  targetSoulAgentId: string;

  /**
   * Relationship type
   */
  type:
    | 'family'        // Parent, child, sibling
    | 'romantic'      // Spouse, lover
    | 'friendship'    // Close friend
    | 'rivalry'       // Competitor, enemy
    | 'mentor'        // Teacher/student
    | 'ancestral';    // Distant ancestor/descendant

  /**
   * Relationship strength
   */
  strength: number; // 0-1

  /**
   * When relationship began
   */
  formedTick: Tick;

  /**
   * Relationship status
   */
  status: 'active' | 'dormant' | 'ended';

  /**
   * Key shared memories (references to CoreMemory IDs)
   */
  sharedCoreMemories: string[];
}
```

### SoulAgentRegistry

**Location:** `packages/core/src/systems/SoulAgentRegistrySystem.ts` (NEW)

```typescript
/**
 * Global registry tracking all soul agents across all tiers and universes.
 * Singleton system that provides fast lookups and cross-tier queries.
 */
export class SoulAgentRegistrySystem extends BaseSystem {
  readonly id: SystemId = 'soul_agent_registry';
  readonly priority = 900; // Late priority, utility system

  /**
   * Map of soul ID → soul agent entity
   * Fast O(1) lookup
   */
  private registry: Map<string, Entity> = new Map();

  /**
   * Spatial index: tier → soul agents in that tier
   * For tier-specific queries
   */
  private spatialIndex: Map<string, Set<string>> = new Map();

  /**
   * Relationship graph: soul ID → related soul IDs
   * For relationship queries
   */
  private relationshipGraph: Map<string, Set<string>> = new Map();

  /**
   * Narrative tag index: tag → soul IDs
   * For quest/story generation
   */
  private tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Register a new soul agent
   */
  registerSoulAgent(soulEntity: Entity): void;

  /**
   * Get soul agent by ID
   */
  getSoulAgent(soulId: string): Entity | undefined;

  /**
   * Get all soul agents in a tier
   */
  getSoulAgentsInTier(tierId: string): Entity[];

  /**
   * Get all soul agents related to a soul agent
   */
  getRelatedSoulAgents(soulId: string): Entity[];

  /**
   * Get soul agents by narrative tag
   */
  getSoulAgentsByTag(tag: string): Entity[];

  /**
   * Get top N soul agents by player attachment
   */
  getTopAttachedSoulAgents(limit: number): Entity[];

  /**
   * Update soul agent's tier when they move/teleport
   */
  updateSoulAgentTier(soulId: string, newTierId: string): void;
}
```

---

## State Transitions & Lifecycle

### Soul Agent Promotion

**When a regular soul becomes a soul agent:**

```typescript
/**
 * Promote a soul to soul agent status
 * @param soulEntity - The soul entity (not agent entity)
 * @param reason - Why this soul is being promoted
 * @param world - World context
 */
function promoteSoulToAgent(
  soulEntity: Entity,
  reason: SoulAgentPromotionCriteria,
  world: World
): void {
  // Validate soul has required components
  const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
  if (!soulIdentity) {
    throw new Error('Cannot promote entity without SoulIdentity component');
  }

  // Check if already a soul agent
  if (soulEntity.hasComponent(CT.SoulAgent)) {
    return; // Already promoted
  }

  // Create soul agent component
  const soulAgentComponent: SoulAgentComponent = {
    type: 'soul_agent',
    version: 1,
    promotionReason: reason.player_interaction ? 'player_interaction'
      : reason.narrative_importance ? 'narrative_importance'
      : reason.llm_investment ? 'llm_investment'
      : reason.player_marked ? 'player_marked'
      : 'descendant_inheritance',
    promotedTick: world.tick,
    simulationMode: 'full', // Start in full mode
    lastFullSimulationTick: world.tick,
    coreMemories: [],
    spatialTracking: {
      currentTier: getCurrentTier(soulEntity, world),
      tierId: getCurrentTierId(soulEntity, world),
      lastKnownPosition: getCurrentPosition(soulEntity, world),
    },
    soulAgentRelationships: new Map(),
    narrativeTags: [],
    playerAttachment: reason.player_interaction ? 5 : 1, // Higher if player interacted
  };

  soulEntity.addComponent(soulAgentComponent);

  // Register with registry
  const registry = world.getSystem<SoulAgentRegistrySystem>('soul_agent_registry');
  registry.registerSoulAgent(soulEntity);

  // Emit event for logging/achievements
  world.events.emit('soul_agent:promoted', {
    soulId: soulEntity.id,
    soulName: soulIdentity.soulName,
    reason: soulAgentComponent.promotionReason,
    tick: world.tick,
  });
}
```

### Simulation Mode Transitions

**Full → Headless (tier becomes inactive):**

```typescript
/**
 * Transition soul agent from full to headless simulation
 * Called when tier containing soul agent becomes statistical
 */
function transitionToHeadless(
  soulAgentEntity: Entity,
  world: World
): void {
  const soulAgent = soulAgentEntity.getComponent<SoulAgentComponent>(CT.SoulAgent);
  if (!soulAgent || soulAgent.simulationMode !== 'full') {
    return;
  }

  // Capture current state for headless simulation
  const incarnation = soulAgentEntity.getComponent<IncarnationComponent>(CT.Incarnation);
  const currentBodyId = incarnation?.primaryBindingId;

  if (!currentBodyId) {
    // Soul is disembodied, no headless state needed
    soulAgent.simulationMode = 'dormant';
    return;
  }

  const body = world.getEntity(currentBodyId);
  if (!body) {
    throw new Error(`Soul agent's body ${currentBodyId} not found`);
  }

  // Extract current goal from behavior tree
  const brain = body.getComponent(CT.Brain);
  const currentGoal = extractCurrentGoal(brain);

  // Extract active relationships (top 5 by strength)
  const relationships = extractActiveRelationships(body, world);

  // Calculate aging state
  const identity = body.getComponent<IdentityComponent>(CT.Identity);
  const health = body.getComponent(CT.Health);
  const agingState = calculateAgingState(identity, health, world);

  // Create headless state
  soulAgent.headlessState = {
    currentGoal,
    activeRelationships: relationships.slice(0, 5),
    nextLifeEvent: scheduleNextLifeEvent(soulAgentEntity, world),
    ageingState: agingState,
  };

  soulAgent.simulationMode = 'headless';
  soulAgent.lastFullSimulationTick = world.tick;
}
```

**Headless → Dormant (time jump initiated):**

```typescript
/**
 * Transition soul agent from headless to dormant (life trajectory generation)
 * Called when player initiates large time skip (>10 years)
 */
async function transitionToDormant(
  soulAgentEntity: Entity,
  world: World,
  timeSkipYears: number
): Promise<void> {
  const soulAgent = soulAgentEntity.getComponent<SoulAgentComponent>(CT.SoulAgent);
  if (!soulAgent) return;

  const soulIdentity = soulAgentEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
  if (!soulIdentity) {
    throw new Error('Soul agent missing SoulIdentity');
  }

  // Generate life trajectory using LLM
  const trajectory = await generateLifeTrajectory({
    soulAgent: soulAgentEntity,
    currentState: soulAgent.headlessState,
    soulIdentity,
    coreMemories: soulAgent.coreMemories,
    timeSkipYears,
    worldContext: extractWorldContext(world),
  });

  soulAgent.trajectory = trajectory;
  soulAgent.simulationMode = 'dormant';
  soulAgent.headlessState = undefined; // Clear headless state
}
```

**Dormant → Headless (time jump completes):**

```typescript
/**
 * Apply life trajectory and transition back to headless
 * Called when time skip completes
 */
function applyTrajectoryAndResumeHeadless(
  soulAgentEntity: Entity,
  world: World
): void {
  const soulAgent = soulAgentEntity.getComponent<SoulAgentComponent>(CT.SoulAgent);
  if (!soulAgent || !soulAgent.trajectory) {
    throw new Error('Cannot apply trajectory: missing trajectory data');
  }

  const trajectory = soulAgent.trajectory;

  // Apply end state
  if (!trajectory.endState.alive) {
    // Soul agent died during trajectory
    handleSoulAgentDeath(soulAgentEntity, trajectory, world);
    return;
  }

  // Update position
  soulAgent.spatialTracking.lastKnownPosition = trajectory.endState.position;
  soulAgent.spatialTracking.currentTier = trajectory.endState.tier;

  // Age the body (if incarnated)
  const incarnation = soulAgentEntity.getComponent<IncarnationComponent>(CT.Incarnation);
  if (incarnation?.primaryBindingId) {
    const body = world.getEntity(incarnation.primaryBindingId);
    if (body) {
      const identity = body.getComponent<IdentityComponent>(CT.Identity);
      if (identity) {
        identity.age = trajectory.endState.age;
      }
    }
  }

  // Add core memories from trajectory
  soulAgent.coreMemories.push(...trajectory.endState.finalMemories);

  // Compress core memories if exceeding limit (100)
  if (soulAgent.coreMemories.length > 100) {
    compressCoreMemories(soulAgent);
  }

  // Generate new headless state for continued simulation
  soulAgent.headlessState = generateHeadlessStateFromTrajectory(trajectory, world);
  soulAgent.simulationMode = 'headless';
  soulAgent.trajectory = undefined; // Clear trajectory
}
```

**Headless → Full (tier becomes active / player zooms in):**

```typescript
/**
 * Awaken soul agent to full simulation
 * Called when tier containing soul agent becomes active
 */
function awakenSoulAgent(
  soulAgentEntity: Entity,
  world: World
): void {
  const soulAgent = soulAgentEntity.getComponent<SoulAgentComponent>(CT.SoulAgent);
  if (!soulAgent || soulAgent.simulationMode !== 'headless') {
    return;
  }

  const incarnation = soulAgentEntity.getComponent<IncarnationComponent>(CT.Incarnation);
  const bodyId = incarnation?.primaryBindingId;

  if (!bodyId) {
    // Soul is disembodied, cannot awaken to full simulation
    return;
  }

  const body = world.getEntity(bodyId);
  if (!body) {
    throw new Error(`Soul agent's body ${bodyId} not found`);
  }

  // Restore state from headless
  if (soulAgent.headlessState) {
    // Update position
    const position = body.getComponent(CT.Position);
    if (position) {
      position.x = soulAgent.spatialTracking.lastKnownPosition.x;
      position.y = soulAgent.spatialTracking.lastKnownPosition.y;
    }

    // Restore goal to behavior tree
    const brain = body.getComponent(CT.Brain);
    if (brain && soulAgent.headlessState.currentGoal) {
      restoreGoalToBehaviorTree(brain, soulAgent.headlessState.currentGoal);
    }

    // Restore relationships
    restoreRelationships(body, soulAgent.headlessState.activeRelationships, world);
  }

  soulAgent.simulationMode = 'full';
  soulAgent.lastFullSimulationTick = world.tick;
  soulAgent.headlessState = undefined;
}
```

---

## Headless Simulation Algorithm

**Goal:** Simulate soul agents in inactive tiers with **O(1) cost per soul agent**, not O(N) ECS overhead.

**Approach:** Event-driven simulation with pre-scheduled life events.

### HeadlessSimulatorSystem

```typescript
/**
 * Simulates soul agents in inactive tiers
 * Runs after tier simulation (priority ~950)
 */
export class HeadlessSimulatorSystem extends BaseSystem {
  readonly id: SystemId = 'headless_simulator';
  readonly priority = 950;
  readonly requiredComponents = []; // Queries registry, not entities

  private UPDATE_INTERVAL = 100; // Every 5 seconds (100 ticks at 20 TPS)
  private lastUpdate = 0;

  update(world: World): void {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdate = world.tick;

    const registry = world.getSystem<SoulAgentRegistrySystem>('soul_agent_registry');
    const headlessSoulAgents = registry.getAllSoulAgents().filter(
      soul => soul.getComponent<SoulAgentComponent>(CT.SoulAgent)?.simulationMode === 'headless'
    );

    for (const soul of headlessSoulAgents) {
      this.simulateHeadlessSoulAgent(soul, world);
    }
  }

  private simulateHeadlessSoulAgent(soulEntity: Entity, world: World): void {
    const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
    const headlessState = soulAgent.headlessState;

    if (!headlessState) {
      return; // No headless state to simulate
    }

    // 1. Age the soul agent
    this.simulateAging(soulEntity, headlessState, world);

    // 2. Progress current goal
    this.progressGoal(soulEntity, headlessState, world);

    // 3. Check for scheduled life events
    this.checkLifeEvents(soulEntity, headlessState, world);

    // 4. Decay/strengthen relationships
    this.updateRelationships(soulEntity, headlessState, world);
  }

  private simulateAging(
    soulEntity: Entity,
    headlessState: HeadlessSimulationState,
    world: World
  ): void {
    const ageingState = headlessState.ageingState;
    const ticksPerYear = 525600; // 365 days * 24 hours * 60 minutes (assuming 1 tick = 1 minute)

    // Age by elapsed time since last update
    const ticksElapsed = world.tick - soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!.lastFullSimulationTick;
    const yearsElapsed = ticksElapsed / ticksPerYear;

    ageingState.biologicalAge += yearsElapsed;

    // Check if natural death occurred
    if (world.tick >= ageingState.estimatedDeathTick) {
      this.triggerNaturalDeath(soulEntity, world);
    }
  }

  private progressGoal(
    soulEntity: Entity,
    headlessState: HeadlessSimulationState,
    world: World
  ): void {
    const goal = headlessState.currentGoal;
    if (!goal) return;

    // Simple linear progress based on time
    const ticksElapsed = world.tick - soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!.lastFullSimulationTick;
    const ticksRemaining = goal.estimatedCompletionTick - world.tick;

    if (ticksRemaining <= 0) {
      // Goal completed
      this.completeGoal(soulEntity, goal, world);
    } else {
      // Update progress
      const totalTicks = goal.estimatedCompletionTick - (world.tick - ticksElapsed);
      goal.progress = Math.min(1.0, 1.0 - (ticksRemaining / totalTicks));
    }
  }

  private checkLifeEvents(
    soulEntity: Entity,
    headlessState: HeadlessSimulationState,
    world: World
  ): void {
    const nextEvent = headlessState.nextLifeEvent;
    if (!nextEvent) return;

    if (world.tick >= nextEvent.scheduledTick) {
      // Trigger life event
      this.triggerLifeEvent(soulEntity, nextEvent, world);

      // Schedule next event
      headlessState.nextLifeEvent = this.scheduleNextLifeEvent(soulEntity, world);
    }
  }

  private triggerLifeEvent(
    soulEntity: Entity,
    event: HeadlessSimulationState['nextLifeEvent'],
    world: World
  ): void {
    if (!event) return;

    const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
    const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;

    // Create core memory for this event
    const coreMemory: CoreMemory = {
      id: `core_mem_${world.tick}_${Math.random().toString(36).substr(2, 9)}`,
      summary: `${event.type}: ${event.type}`, // Would be more descriptive in real impl
      emotionalSignature: {
        valence: this.getEventEmotionalValence(event.type),
        intensity: 0.7, // High intensity for life events
      },
      incarnationContext: {
        incarnationIndex: soulIdentity.incarnationHistory.length - 1,
        tick: world.tick,
      },
      coreReason: 'life_defining',
      cosmicSignificance: 0.6,
      influenceCount: 0,
    };

    soulAgent.coreMemories.push(coreMemory);

    // Emit event
    world.events.emit('soul_agent:life_event', {
      soulId: soulEntity.id,
      eventType: event.type,
      tick: world.tick,
    });
  }

  private scheduleNextLifeEvent(
    soulEntity: Entity,
    world: World
  ): HeadlessSimulationState['nextLifeEvent'] {
    // Simple random scheduling for demo
    // Real implementation would use LLM or probabilistic model
    const possibleEvents = ['marriage', 'childbirth', 'discovery', 'promotion', 'loss'];
    const randomEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)]!;
    const ticksUntilEvent = Math.floor(Math.random() * 525600 * 5); // 0-5 years

    return {
      type: randomEvent,
      scheduledTick: world.tick + ticksUntilEvent,
      involvedSoulIds: [],
    };
  }

  private triggerNaturalDeath(soulEntity: Entity, world: World): void {
    const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
    const incarnation = soulEntity.getComponent<IncarnationComponent>(CT.Incarnation)!;

    if (!incarnation.primaryBindingId) return;

    // Trigger death event (would normally go through death systems)
    world.events.emit('soul_agent:natural_death', {
      soulId: soulEntity.id,
      bodyId: incarnation.primaryBindingId,
      age: soulAgent.headlessState?.ageingState.biologicalAge ?? 0,
      tick: world.tick,
    });

    // Transition to disembodied state
    soulAgent.simulationMode = 'dormant';
    soulAgent.headlessState = undefined;
  }

  private getEventEmotionalValence(eventType: string): number {
    // Simple mapping, real impl would be more sophisticated
    const valenceMap: Record<string, number> = {
      'marriage': 0.8,
      'childbirth': 0.9,
      'discovery': 0.7,
      'promotion': 0.6,
      'loss': -0.7,
      'death': -1.0,
    };
    return valenceMap[eventType] ?? 0;
  }

  private updateRelationships(
    soulEntity: Entity,
    headlessState: HeadlessSimulationState,
    world: World
  ): void {
    // Simple relationship decay/strengthening
    for (const rel of headlessState.activeRelationships) {
      // Relationships decay over time if not maintained
      rel.strength *= 0.99; // 1% decay per update interval

      // Remove if too weak
      if (rel.strength < 0.1) {
        const index = headlessState.activeRelationships.indexOf(rel);
        headlessState.activeRelationships.splice(index, 1);
      }
    }
  }

  private completeGoal(
    soulEntity: Entity,
    goal: HeadlessSimulationState['currentGoal'],
    world: World
  ): void {
    // Create achievement memory
    const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
    const coreMemory: CoreMemory = {
      id: `core_mem_goal_${world.tick}`,
      summary: `Achieved goal: ${goal.type}`,
      emotionalSignature: {
        valence: 0.6, // Positive achievement
        intensity: 0.5,
      },
      incarnationContext: {
        incarnationIndex: 0, // Would get from soul identity
        tick: world.tick,
      },
      coreReason: 'purpose_fulfillment',
      cosmicSignificance: goal.priority,
      influenceCount: 0,
    };

    soulAgent.coreMemories.push(coreMemory);

    // Generate new goal
    // (Simple stub - real impl would use behavior tree or LLM)
  }
}
```

### Performance Analysis

**Cost per soul agent per update:**
- Aging: O(1) - simple arithmetic
- Goal progress: O(1) - progress calculation
- Life event check: O(1) - tick comparison
- Relationship update: O(R) where R = active relationships (~5-10)

**Total: O(R) ≈ O(1) for fixed relationship limit**

**Compared to full ECS simulation:**
- Full ECS: ~50+ systems × N entities = O(50N) per tick
- Headless: 1 system × M soul agents = O(M) per 100 ticks
- Speedup: ~5000x reduction (50 systems × 100 ticks / 1 system)

**Example:**
- 1000 soul agents in headless mode
- Updated every 100 ticks (5 seconds)
- Cost: 1000 × O(1) every 100 ticks = **10 operations/tick**
- vs Full ECS: 1000 × 50 systems = **50,000 operations/tick**

---

## Memory Management

### Memory Compression Pipeline

**Active → Suppressed → Core**

```typescript
/**
 * Memory consolidation system for soul agents
 * Compresses memories from active → suppressed → core
 */
export class SoulAgentMemoryConsolidationSystem extends BaseSystem {
  readonly id: SystemId = 'soul_agent_memory_consolidation';
  readonly priority = 920;

  private UPDATE_INTERVAL = 1000; // Every 50 seconds
  private lastUpdate = 0;

  update(world: World): void {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdate = world.tick;

    const registry = world.getSystem<SoulAgentRegistrySystem>('soul_agent_registry');
    const soulAgents = registry.getAllSoulAgents();

    for (const soul of soulAgents) {
      this.consolidateMemories(soul, world);
    }
  }

  private consolidateMemories(soulEntity: Entity, world: World): void {
    const incarnation = soulEntity.getComponent<IncarnationComponent>(CT.Incarnation);
    const bodyId = incarnation?.primaryBindingId;

    if (!bodyId) {
      return; // Soul not incarnated
    }

    const body = world.getEntity(bodyId);
    if (!body) return;

    const episodicMemory = body.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
    if (!episodicMemory) return;

    // Step 1: Active → Suppressed
    // Find low-clarity memories to suppress
    const toSuppress = episodicMemory.episodicMemories
      .filter(m => m.clarity < 0.1)
      .map(m => m.id);

    episodicMemory.suppressMemories(toSuppress);

    // Step 2: Suppressed → Core
    // Find high-importance suppressed memories to elevate to core
    const suppressedMemories = episodicMemory.suppressedMemories;
    const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

    const candidatesForCore = suppressedMemories.filter(m =>
      m.importance > 0.8 ||
      m.emotionalIntensity > 0.8 ||
      this.isPurposeRelated(m, soulEntity)
    );

    for (const memory of candidatesForCore) {
      const coreMemory = this.compressToCore(memory, soulEntity, world);
      soulAgent.coreMemories.push(coreMemory);
    }

    // Step 3: Compress core memories if exceeding limit
    if (soulAgent.coreMemories.length > 100) {
      this.compressCoreMemories(soulAgent);
    }
  }

  private compressToCore(
    episodicMemory: EpisodicMemory,
    soulEntity: Entity,
    world: World
  ): CoreMemory {
    const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;

    // Determine core reason
    let coreReason: CoreMemory['coreReason'] = 'extreme_emotion';
    if (this.isPurposeRelated(episodicMemory, soulEntity)) {
      coreReason = 'purpose_fulfillment';
    } else if (episodicMemory.importance > 0.9) {
      coreReason = 'life_defining';
    }

    return {
      id: `core_${episodicMemory.id}`,
      summary: this.summarizeMemory(episodicMemory),
      emotionalSignature: {
        valence: episodicMemory.emotionalValence,
        intensity: episodicMemory.emotionalIntensity,
      },
      incarnationContext: {
        incarnationIndex: soulIdentity.incarnationHistory.length - 1,
        tick: episodicMemory.timestamp,
      },
      coreReason,
      cosmicSignificance: this.calculateCosmicSignificance(episodicMemory, soulEntity),
      influenceCount: 0,
    };
  }

  private summarizeMemory(memory: EpisodicMemory): string {
    // Compress summary to max 200 chars
    if (memory.summary.length <= 200) {
      return memory.summary;
    }

    // Simple truncation (real impl would use LLM for better compression)
    return memory.summary.substring(0, 197) + '...';
  }

  private isPurposeRelated(memory: EpisodicMemory, soulEntity: Entity): boolean {
    const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
    if (!soulIdentity) return false;

    // Simple keyword matching (real impl would use LLM semantic similarity)
    const purposeKeywords = soulIdentity.purpose.toLowerCase().split(' ');
    const memoryKeywords = memory.summary.toLowerCase().split(' ');

    const overlap = purposeKeywords.filter(k => memoryKeywords.includes(k));
    return overlap.length >= 2;
  }

  private calculateCosmicSignificance(
    memory: EpisodicMemory,
    soulEntity: Entity
  ): number {
    // Weighted combination of factors
    let significance = 0;

    // Importance (40%)
    significance += memory.importance * 0.4;

    // Emotional intensity (30%)
    significance += memory.emotionalIntensity * 0.3;

    // Purpose relation (30%)
    if (this.isPurposeRelated(memory, soulEntity)) {
      significance += 0.3;
    }

    return Math.min(1.0, significance);
  }

  private compressCoreMemories(soulAgent: SoulAgentComponent): void {
    // Keep only top 100 by cosmic significance
    soulAgent.coreMemories.sort((a, b) =>
      b.cosmicSignificance - a.cosmicSignificance
    );

    soulAgent.coreMemories = soulAgent.coreMemories.slice(0, 100);
  }
}
```

### Cross-Incarnation Memory

**When soul agent dies and reincarnates:**

```typescript
/**
 * Transfer core memories to new incarnation
 * Called when soul agent reincarnates
 */
function transferCoreMemoriesToNewLife(
  soulEntity: Entity,
  newBodyEntity: Entity,
  world: World
): void {
  const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

  // Core memories persist across incarnations (in soul, not body)
  // They manifest as:
  // 1. Intuitions (vague feelings)
  // 2. Dreams (resurfacing during sleep)
  // 3. Deja vu (familiar situations)

  // Add "intuition" suppressed memories to new body
  const newBodyEpisodicMemory = newBodyEntity.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
  if (!newBodyEpisodicMemory) return;

  for (const coreMemory of soulAgent.coreMemories) {
    // Convert core memory to vague "secondhand" episodic memory
    const intuitionMemory = newBodyEpisodicMemory.formMemory({
      eventType: 'past_life:intuition',
      summary: `Vague feeling: ${coreMemory.summary.substring(0, 100)}...`,
      timestamp: world.tick,
      emotionalValence: coreMemory.emotionalSignature.valence,
      emotionalIntensity: coreMemory.emotionalSignature.intensity * 0.5, // Muted
      importance: coreMemory.cosmicSignificance * 0.3, // Low importance (vague)
      clarity: 0.2, // Very hazy
    });

    // Immediately suppress (unconscious knowledge)
    newBodyEpisodicMemory.suppressMemory(intuitionMemory.id);
  }

  // These can resurface during:
  // - Dreams (SleepSystem checks for suppressed past-life memories)
  // - Meditation (MeditationSystem resurfaces based on wisdom)
  // - Near-death experiences (DeathSystem triggers memory flood)
}
```

---

## Aging & Mortality

### Aging in Headless Mode

**Aging continues in headless mode:**

```typescript
interface AgingState {
  biologicalAge: number;     // Current age in years
  healthDecayRate: number;   // How fast health declines (0-1)
  estimatedDeathTick: Tick;  // Projected natural death (stochastic)
}

/**
 * Calculate aging state for headless simulation
 */
function calculateAgingState(
  identity: IdentityComponent,
  health: HealthComponent | undefined,
  world: World
): AgingState {
  const currentAge = identity.age;
  const species = identity.species;

  // Species-specific lifespan
  const maxLifespan = getMaxLifespan(species);

  // Health affects lifespan
  const healthFactor = health ? health.current / health.max : 0.5;

  // Stochastic death (not deterministic)
  // Probability of death increases with age
  const ageRatio = currentAge / maxLifespan;
  const baseMortalityRate = Math.pow(ageRatio, 3); // Cubic increase

  // Estimate time until death
  const yearsUntilDeath = maxLifespan - currentAge;
  const ticksPerYear = 525600; // Assuming 1 tick = 1 minute
  const estimatedDeathTick = world.tick + (yearsUntilDeath * ticksPerYear);

  return {
    biologicalAge: currentAge,
    healthDecayRate: 0.01 * (1 - healthFactor), // Worse health = faster decay
    estimatedDeathTick,
  };
}

function getMaxLifespan(species: string): number {
  const lifespans: Record<string, number> = {
    'human': 80,
    'elf': 500,
    'dwarf': 200,
    'animal': 15,
    'deity': Infinity,
  };
  return lifespans[species] ?? 80;
}
```

### Death and Legacy

**When soul agent dies:**

```typescript
/**
 * Handle soul agent death (natural or unnatural)
 */
function handleSoulAgentDeath(
  soulEntity: Entity,
  cause: string,
  world: World
): void {
  const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
  const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;
  const incarnation = soulEntity.getComponent<IncarnationComponent>(CT.Incarnation)!;

  const bodyId = incarnation.primaryBindingId;
  if (!bodyId) return;

  // 1. Complete incarnation record
  const currentIncarnation = soulIdentity.incarnationHistory[soulIdentity.incarnationHistory.length - 1];
  if (currentIncarnation) {
    currentIncarnation.deathTick = world.tick;
    currentIncarnation.causeOfDeath = cause;
    currentIncarnation.duration = world.tick - currentIncarnation.incarnationTick;
  }

  // 2. Create final core memory (death experience)
  const deathMemory: CoreMemory = {
    id: `core_death_${world.tick}`,
    summary: `Death by ${cause} at age ${soulAgent.headlessState?.ageingState.biologicalAge ?? 0}`,
    emotionalSignature: {
      valence: -0.8, // Negative
      intensity: 1.0, // Maximum intensity
      dominantEmotion: 'fear',
    },
    incarnationContext: {
      incarnationIndex: soulIdentity.incarnationHistory.length - 1,
      tick: world.tick,
    },
    coreReason: 'life_defining',
    cosmicSignificance: 0.9, // Very significant
    influenceCount: 0,
  };

  soulAgent.coreMemories.push(deathMemory);

  // 3. Create legacy record
  createLegacyRecord(soulEntity, world);

  // 4. Remove body binding
  endIncarnation(incarnation, bodyId, world.tick, cause);

  // 5. Transition to disembodied/afterlife
  soulAgent.simulationMode = 'dormant';
  soulAgent.headlessState = undefined;

  // 6. Check for reincarnation eligibility
  if (shouldReincarnate(soulEntity)) {
    scheduleReincarnation(soulEntity, world);
  }

  // 7. Emit death event
  world.events.emit('soul_agent:death', {
    soulId: soulEntity.id,
    soulName: soulIdentity.soulName,
    age: soulAgent.headlessState?.ageingState.biologicalAge ?? 0,
    cause,
    tick: world.tick,
  });
}

/**
 * Create legacy record for deceased soul agent
 * Used for historical records, descendant quests, mythology
 */
function createLegacyRecord(soulEntity: Entity, world: World): void {
  const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;
  const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

  const legacy = {
    soulId: soulEntity.id,
    soulName: soulIdentity.soulName,
    livesLived: soulIdentity.incarnationHistory.length,
    totalYearsLived: soulIdentity.incarnationHistory.reduce((sum, inc) =>
      sum + ((inc.duration ?? 0) / 525600), 0
    ),
    purposeFulfilled: soulIdentity.purposeFulfilled,
    destinyRealized: soulIdentity.destinyRealized,
    coreMemoriesCount: soulAgent.coreMemories.length,
    narrativeTags: soulAgent.narrativeTags,
    playerAttachment: soulAgent.playerAttachment,

    // Major achievements (extracted from core memories)
    majorAchievements: extractAchievements(soulAgent.coreMemories),

    // Descendants (if any)
    descendants: getDescendants(soulEntity, world),
  };

  // Store in legacy repository (new system)
  world.events.emit('soul_agent:legacy_created', legacy);
}
```

### Offspring Inheritance

**Do descendants automatically become soul agents?**

**Configurable Policy:**

```typescript
interface SoulAgentInheritancePolicy {
  inheritanceMode: 'all' | 'firstborn' | 'none' | 'random';
  inheritanceChance: number; // 0-1, for 'random' mode
}

/**
 * Check if child should inherit soul agent status from parent
 */
function shouldInheritSoulAgentStatus(
  parentSoulEntity: Entity,
  childSoulEntity: Entity,
  policy: SoulAgentInheritancePolicy
): boolean {
  switch (policy.inheritanceMode) {
    case 'all':
      return true;
    case 'firstborn':
      // Only first child inherits
      const parentSoulIdentity = parentSoulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;
      const childrenCount = getDescendants(parentSoulEntity, world).length;
      return childrenCount === 1;
    case 'none':
      return false;
    case 'random':
      return Math.random() < policy.inheritanceChance;
  }
}

/**
 * Promote child to soul agent via inheritance
 */
function inheritSoulAgentStatus(
  parentSoulEntity: Entity,
  childSoulEntity: Entity,
  world: World
): void {
  const parentSoulAgent = parentSoulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

  // Promote child
  promoteSoulToAgent(childSoulEntity, {
    descendant_inheritance: true,
    player_interaction: false,
    narrative_importance: false,
    llm_investment: false,
    player_marked: false,
  }, world);

  const childSoulAgent = childSoulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

  // Inherit partial player attachment (50% of parent's)
  childSoulAgent.playerAttachment = Math.floor(parentSoulAgent.playerAttachment * 0.5);

  // Inherit some narrative tags
  const inheritableTags = parentSoulAgent.narrativeTags.filter(tag =>
    tag.startsWith('dynasty:') || tag.startsWith('bloodline:')
  );
  childSoulAgent.narrativeTags.push(...inheritableTags);

  // Add relationship
  childSoulAgent.soulAgentRelationships.set(parentSoulEntity.id, {
    targetSoulAgentId: parentSoulEntity.id,
    type: 'family',
    strength: 1.0,
    formedTick: world.tick,
    status: 'active',
    sharedCoreMemories: [],
  });
}
```

---

## Awakening Protocol

**When player zooms back into a tier containing soul agents:**

### Full State Restoration

```typescript
/**
 * Awaken all soul agents in a tier
 * Called when tier transitions from statistical → active
 */
function awakenTierSoulAgents(tierId: string, world: World): void {
  const registry = world.getSystem<SoulAgentRegistrySystem>('soul_agent_registry');
  const soulAgents = registry.getSoulAgentsInTier(tierId);

  for (const soulAgent of soulAgents) {
    awakenSoulAgent(soulAgent, world);
  }
}

/**
 * Awaken individual soul agent (detailed implementation)
 */
function awakenSoulAgent(soulEntity: Entity, world: World): void {
  const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;

  if (soulAgent.simulationMode !== 'headless') {
    return; // Already awake or dormant
  }

  const incarnation = soulEntity.getComponent<IncarnationComponent>(CT.Incarnation)!;
  const bodyId = incarnation.primaryBindingId;

  if (!bodyId) {
    // Soul is disembodied, cannot awaken
    return;
  }

  const body = world.getEntity(bodyId);
  if (!body) {
    console.warn(`Soul agent ${soulEntity.id} has body ${bodyId} that no longer exists`);
    // Handle orphaned soul agent
    soulAgent.simulationMode = 'dormant';
    soulAgent.headlessState = undefined;
    return;
  }

  // 1. Restore position
  restorePosition(body, soulAgent, world);

  // 2. Restore behavior tree / goal
  restoreGoal(body, soulAgent, world);

  // 3. Restore relationships
  restoreRelationships(body, soulAgent, world);

  // 4. Restore inventory (if significant)
  restoreInventory(body, soulAgent, world);

  // 5. Update ECS components from headless state
  syncComponentsFromHeadless(body, soulAgent, world);

  // 6. Transition to full mode
  soulAgent.simulationMode = 'full';
  soulAgent.lastFullSimulationTick = world.tick;
  soulAgent.headlessState = undefined;

  // 7. Emit awakening event
  world.events.emit('soul_agent:awakened', {
    soulId: soulEntity.id,
    bodyId,
    tier: soulAgent.spatialTracking.currentTier,
    tick: world.tick,
  });
}

function restorePosition(
  body: Entity,
  soulAgent: SoulAgentComponent,
  world: World
): void {
  const position = body.getComponent(CT.Position);
  if (!position) {
    // Add position component if missing
    body.addComponent({
      type: 'position',
      x: soulAgent.spatialTracking.lastKnownPosition.x,
      y: soulAgent.spatialTracking.lastKnownPosition.y,
      z: soulAgent.spatialTracking.lastKnownPosition.z ?? 0,
    });
  } else {
    // Update existing position
    position.x = soulAgent.spatialTracking.lastKnownPosition.x;
    position.y = soulAgent.spatialTracking.lastKnownPosition.y;
    if (soulAgent.spatialTracking.lastKnownPosition.z !== undefined) {
      position.z = soulAgent.spatialTracking.lastKnownPosition.z;
    }
  }

  // If velocity vector available, restore momentum
  if (soulAgent.spatialTracking.velocityVector) {
    const velocity = body.getComponent(CT.Velocity);
    if (velocity) {
      velocity.dx = soulAgent.spatialTracking.velocityVector.x;
      velocity.dy = soulAgent.spatialTracking.velocityVector.y;
      if (soulAgent.spatialTracking.velocityVector.z !== undefined) {
        velocity.dz = soulAgent.spatialTracking.velocityVector.z;
      }
    }
  }
}

function restoreGoal(
  body: Entity,
  soulAgent: SoulAgentComponent,
  world: World
): void {
  const brain = body.getComponent(CT.Brain);
  if (!brain || !soulAgent.headlessState?.currentGoal) {
    return;
  }

  const goal = soulAgent.headlessState.currentGoal;

  // Convert headless goal to behavior tree goal
  // (Simplified - real impl would reconstruct full behavior tree state)
  brain.currentGoal = {
    type: goal.type,
    priority: goal.priority,
    status: goal.progress >= 1.0 ? 'completed' : 'in_progress',
  };
}

function restoreRelationships(
  body: Entity,
  soulAgent: SoulAgentComponent,
  world: World
): void {
  // Restore social relationships to body
  // (Assuming body has SocialComponent for relationships)
  const social = body.getComponent(CT.Social);
  if (!social || !soulAgent.headlessState?.activeRelationships) {
    return;
  }

  for (const headlessRel of soulAgent.headlessState.activeRelationships) {
    // Find target soul's body
    const targetSoulEntity = world.getEntity(headlessRel.targetSoulId);
    if (!targetSoulEntity) continue;

    const targetIncarnation = targetSoulEntity.getComponent<IncarnationComponent>(CT.Incarnation);
    const targetBodyId = targetIncarnation?.primaryBindingId;
    if (!targetBodyId) continue;

    // Add relationship to social component
    social.relationships.set(targetBodyId, {
      targetId: targetBodyId,
      type: headlessRel.relationshipType,
      strength: headlessRel.strength,
      lastInteraction: world.tick,
    });
  }
}

function syncComponentsFromHeadless(
  body: Entity,
  soulAgent: SoulAgentComponent,
  world: World
): void {
  // Sync age
  const identity = body.getComponent<IdentityComponent>(CT.Identity);
  if (identity && soulAgent.headlessState?.ageingState) {
    identity.age = Math.floor(soulAgent.headlessState.ageingState.biologicalAge);
  }

  // Sync health (if health has decayed)
  const health = body.getComponent(CT.Health);
  if (health && soulAgent.headlessState?.ageingState) {
    const ageRatio = identity!.age / getMaxLifespan(identity!.species);
    const healthPenalty = Math.min(0.5, ageRatio * 0.5); // Max 50% health loss from age
    health.current = Math.max(1, health.max * (1 - healthPenalty));
  }
}
```

---

## LLM Integration

### LLM Budget Allocation

**Soul agents in different modes require different LLM investment:**

```typescript
interface LLMBudgetAllocation {
  fullSimulation: {
    callsPerMinute: number;      // Max LLM calls for active soul agents
    priority: 'high' | 'normal'; // Queue priority
  };
  headlessSimulation: {
    callsPerHour: number;        // Reduced frequency for headless
    priority: 'low';
  };
  dormantGeneration: {
    callsPerTrajectory: number;  // How many LLM calls for life trajectory
    maxTrajectoryLength: number; // Max years to generate in one trajectory
  };
}

const SOUL_AGENT_LLM_BUDGET: LLMBudgetAllocation = {
  fullSimulation: {
    callsPerMinute: 2,           // 2 calls/min for decisions, dialogue
    priority: 'high',
  },
  headlessSimulation: {
    callsPerHour: 1,             // 1 call/hour for major life decisions
    priority: 'low',
  },
  dormantGeneration: {
    callsPerTrajectory: 5,       // 5 LLM calls to generate trajectory
    maxTrajectoryLength: 100,    // Max 100 years per trajectory
  },
};
```

### Life Trajectory Generation (LLM)

```typescript
/**
 * Generate life trajectory for soul agent using LLM
 * Covers time skip of N years
 */
async function generateLifeTrajectory(params: {
  soulAgent: Entity;
  currentState: HeadlessSimulationState | undefined;
  soulIdentity: SoulIdentityComponent;
  coreMemories: CoreMemory[];
  timeSkipYears: number;
  worldContext: string;
}): Promise<LifeTrajectory> {
  const {
    soulAgent,
    currentState,
    soulIdentity,
    coreMemories,
    timeSkipYears,
    worldContext,
  } = params;

  // Build LLM prompt
  const prompt = buildLifeTrajectoryPrompt({
    soulName: soulIdentity.soulName,
    soulPurpose: soulIdentity.purpose,
    soulDestiny: soulIdentity.destiny,
    currentAge: currentState?.ageingState.biologicalAge ?? 0,
    coreMemories: coreMemories.slice(0, 10), // Top 10 memories
    timeSkipYears,
    worldContext,
  });

  // Call LLM
  const llmResponse = await llmScheduler.queueRequest({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    prompt,
    maxTokens: 2000,
    temperature: 0.8, // Creative for life stories
    priority: 'normal',
  });

  // Parse LLM response into trajectory
  const trajectory = parseLifeTrajectoryResponse(llmResponse.text, params);

  return trajectory;
}

function buildLifeTrajectoryPrompt(params: {
  soulName: string;
  soulPurpose: string;
  soulDestiny?: string;
  currentAge: number;
  coreMemories: CoreMemory[];
  timeSkipYears: number;
  worldContext: string;
}): string {
  return `You are generating a life trajectory for a soul agent in a multi-era simulation.

SOUL IDENTITY:
- Name: ${params.soulName}
- Purpose: ${params.soulPurpose}
- Destiny: ${params.soulDestiny ?? 'Unknown'}
- Current Age: ${params.currentAge}

CORE MEMORIES (formative experiences):
${params.coreMemories.map(m => `- ${m.summary} (${m.coreReason})`).join('\n')}

WORLD CONTEXT:
${params.worldContext}

TASK: Generate a plausible life trajectory for the next ${params.timeSkipYears} years.

Include:
1. Major life milestones (marriage, children, career, discoveries, conflicts)
2. Emotional impact of each milestone (-1 to 1)
3. How these events relate to their soul purpose and destiny
4. Whether they survive the time skip (natural death is possible)

Format:
{
  "summary": "Brief narrative of this period (2-3 sentences)",
  "milestones": [
    {
      "year": 5,
      "event": "Married Finn after long courtship",
      "emotionalImpact": 0.8,
      "purposeRelevance": "Fulfilled need for companionship"
    },
    ...
  ],
  "finalState": {
    "alive": true/false,
    "age": ${params.currentAge + params.timeSkipYears},
    "finalThoughts": "Reflection on this period"
  }
}`;
}

function parseLifeTrajectoryResponse(
  llmResponse: string,
  params: Parameters<typeof generateLifeTrajectory>[0]
): LifeTrajectory {
  // Parse JSON from LLM response
  const data = JSON.parse(llmResponse);

  // Convert to LifeTrajectory format
  const trajectory: LifeTrajectory = {
    summary: data.summary,
    milestones: data.milestones.map((m: any) => ({
      tick: params.soulAgent.getComponent<SoulAgentComponent>(CT.SoulAgent)!.lastFullSimulationTick
        + (m.year * 525600), // Convert years to ticks
      eventType: m.event,
      description: m.purposeRelevance,
      emotionalImpact: m.emotionalImpact,
      participantSoulIds: [], // Would extract from event text
    })),
    endState: {
      alive: data.finalState.alive,
      age: data.finalState.age,
      position: params.soulAgent.getComponent<SoulAgentComponent>(CT.SoulAgent)!.spatialTracking.lastKnownPosition,
      tier: params.soulAgent.getComponent<SoulAgentComponent>(CT.SoulAgent)!.spatialTracking.currentTier,
      finalMemories: extractCoreMemoriesFromMilestones(data.milestones),
    },
    generatedTick: params.soulAgent.world.tick,
    generatedByModel: 'claude-3-5-sonnet-20241022',
  };

  return trajectory;
}
```

### Personality Consistency

**Ensuring LLM maintains soul agent personality across invocations:**

```typescript
/**
 * Build LLM context for soul agent that ensures personality consistency
 */
function buildSoulAgentLLMContext(soulEntity: Entity): string {
  const soulIdentity = soulEntity.getComponent<SoulIdentityComponent>(CT.SoulIdentity)!;
  const soulAgent = soulEntity.getComponent<SoulAgentComponent>(CT.SoulAgent)!;
  const personality = soulEntity.getComponent(CT.Personality);

  let context = `SOUL IDENTITY:
Name: ${soulIdentity.soulName}
Archetype: ${soulIdentity.archetype}
Purpose: ${soulIdentity.purpose}
Destiny: ${soulIdentity.destiny ?? 'Unknown'}
Core Interests: ${soulIdentity.coreInterests.join(', ')}
`;

  if (personality) {
    context += `\nPERSONALITY TRAITS:
Openness: ${personality.openness}
Conscientiousness: ${personality.conscientiousness}
Extraversion: ${personality.extraversion}
Agreeableness: ${personality.agreeableness}
Neuroticism: ${personality.neuroticism}
`;
  }

  // Include top core memories for context
  const topMemories = soulAgent.coreMemories
    .sort((a, b) => b.cosmicSignificance - a.cosmicSignificance)
    .slice(0, 5);

  if (topMemories.length > 0) {
    context += `\nFORMATIVE EXPERIENCES:
${topMemories.map(m => `- ${m.summary}`).join('\n')}
`;
  }

  return context;
}
```

---

## Integration Points

### Integration with Existing Soul System

**Files:** `packages/core/src/components/SoulIdentityComponent.ts`, `IncarnationComponent.ts`, `SoulRepositorySystem.ts`

**Changes Required:**

1. **Add SoulAgentComponent** (new file)
2. **Extend SoulRepositorySystem** to index soul agents separately
3. **Hook into death system** to preserve soul agent state
4. **Hook into reincarnation system** to transfer core memories

**Backward Compatibility:**
- Existing souls continue working as normal
- Soul agent is opt-in (via promotion)
- No breaking changes to existing components

### Integration with Memory System

**Files:** `packages/core/src/components/EpisodicMemoryComponent.ts`, `SpatialMemoryComponent.ts`, `MemorySystem.ts`

**Changes Required:**

1. **Add SoulAgentMemoryConsolidationSystem** (new)
2. **Extend EpisodicMemoryComponent** with core memory extraction hooks
3. **Hook into memory consolidation** to create core memories

**Data Flow:**

```
EpisodicMemoryComponent (body)
  ↓ (clarity decay)
SuppressedMemories (body)
  ↓ (importance threshold)
CoreMemories (soul agent component)
  ↓ (persist across death)
Next incarnation's SuppressedMemories
```

### Integration with Hierarchy Simulator

**Files:** `packages/hierarchy-simulator/src/renormalization/RenormalizationEngine.ts`, `TierConstants.ts`

**Changes Required:**

1. **Update summarization rules** to preserve soul agents:
   ```typescript
   const SUMMARIZATION_RULES = {
     chunk: {
       // ... existing rules
       preserved: [
         'named_npcs',          // Existing
         'buildings',           // Existing
         'soul_agents',         // NEW - always preserve
       ],
     },
   };
   ```

2. **Update instantiation constraints** to restore soul agents:
   ```typescript
   interface InstantiationConstraints {
     // ... existing fields
     soulAgents: Entity[];  // NEW - soul agents to restore
   }
   ```

3. **Hook into tier activation/deactivation**:
   ```typescript
   // When tier becomes inactive
   onTierDeactivate(tierId: string, world: World) {
     transitionSoulAgentsToHeadless(tierId, world);
   }

   // When tier becomes active
   onTierActivate(tierId: string, world: World) {
     awakenTierSoulAgents(tierId, world);
   }
   ```

### Integration with Agent System

**Files:** `packages/core/src/systems/AgentBrainSystem.ts`, `AgentCombatSystem.ts`

**Changes Required:**

1. **Check soul agent status** before promoting to soul agent:
   ```typescript
   // In AgentBrainSystem or interaction handler
   if (playerInteractedWith(agent)) {
     const soul = getSoulForBody(agent);
     if (soul && !soul.hasComponent(CT.SoulAgent)) {
       promoteSoulToAgent(soul, { player_interaction: true }, world);
     }
   }
   ```

2. **Preserve soul agent position** during movement:
   ```typescript
   // In MovementSystem or similar
   update(world: World) {
     for (const entity of this.entities) {
       // ... normal movement logic

       // Update soul agent tracking if applicable
       const soulId = getSoulIdForBody(entity.id);
       if (soulId) {
         const soul = world.getEntity(soulId);
         const soulAgent = soul?.getComponent<SoulAgentComponent>(CT.SoulAgent);
         if (soulAgent) {
           const position = entity.getComponent(CT.Position)!;
           soulAgent.spatialTracking.lastKnownPosition = {
             x: position.x,
             y: position.y,
             z: position.z,
           };
         }
       }
     }
   }
   ```

---

## Performance Considerations

### Memory Overhead

**Per soul agent:**

```typescript
// SoulAgentComponent size estimate
const soulAgentSize = {
  baseFields: 200,                    // Primitive fields, dates, strings
  coreMemories: 100 * 500,            // 100 memories × ~500 bytes each = 50 KB
  relationships: 10 * 200,            // 10 relationships × ~200 bytes = 2 KB
  headlessState: 1000,                // 1 KB for headless state
  trajectory: 5000,                   // 5 KB for trajectory (when dormant)

  total: 58400, // ~58 KB per soul agent
};
```

**With 1000 soul agents:**
- Total memory: ~58 MB (acceptable)
- Registry overhead: ~2 MB (maps, indices)
- **Total: ~60 MB** for soul agent system

**Compared to full ECS:**
- 1000 agents in full ECS: ~2 MB (2 KB per agent)
- Soul agents are **30x larger**, but cover ALL tiers (not just active)

### CPU Overhead

**Headless simulation cost:**

```
HeadlessSimulatorSystem:
  - Runs every 100 ticks (5 seconds)
  - Processes N soul agents in headless mode
  - O(1) per soul agent
  - Cost: N × 10 operations every 100 ticks = 0.1N ops/tick

Example: 1000 headless soul agents
  - Cost: 100 ops/tick
  - Compare to full ECS: 50 systems × 1000 entities = 50,000 ops/tick
  - Speedup: 500x reduction
```

**Awakening cost:**

```
Awakening 100 soul agents:
  - Position restore: O(1) × 100 = 100 ops
  - Goal restore: O(1) × 100 = 100 ops
  - Relationship restore: O(R) × 100 = 1000 ops (R = 10)
  - Component sync: O(1) × 100 = 100 ops
  - Total: ~1300 ops (one-time cost)

Amortized: 1300 ops / 100 ticks = 13 ops/tick
```

### Scalability Limits

| Soul Agents | Memory | Headless CPU | Awakening | Status |
|-------------|--------|--------------|-----------|--------|
| 50 | 3 MB | 5 ops/tick | 65 ops | ✅ Trivial |
| 100 | 6 MB | 10 ops/tick | 130 ops | ✅ Comfortable |
| 250 | 15 MB | 25 ops/tick | 325 ops | ✅ Good |
| 500 | 30 MB | 50 ops/tick | 650 ops | ⚠️ Maximum |

**Recommended maximum: 500 soul agents**
- Soul agents are *meaningful named characters* with player attachment
- 500 souls across millennia allows ~10-20 per generation with ancestry tracking
- Above 500, consider:
  - Ascending oldest soul agents to deity/ancestral spirit status
  - Archiving ancient souls to disk (load on-demand)
  - Being more selective about soul agent promotion

---

## Open Questions & Future Work

### Design Questions

**1. Should soul agents persist indefinitely?**
- **Current:** Soul agents never deleted (conservation of game matter)
- **Issue:** After 1000 years, could have 100K+ deceased soul agents
- **Options:**
  - A) Keep all (performance concern)
  - B) "Ascend" old soul agents to deity status (narrative solution)
  - C) Compress ancient soul agents into "ancestral spirits" (reduced fidelity)
  - D) Archive to disk, load on-demand (technical solution)

**Recommendation:** Option B + D - old soul agents ascend OR archive to disk

**2. How do soul agents interact with time travel?**
- Soul agent visits past, meets younger self
- Are they the same soul entity, or separate instances?
- **Current answer:** Separate universe fork = separate soul entity copy
- **Issue:** Paradoxes if entities merge

**3. Should core memories be LLM-compressed or rule-based?**
- **Current:** Rule-based compression (truncation + extraction)
- **Better:** LLM summarization (preserve meaning, not just text)
- **Cost:** 1 LLM call per memory compression = expensive

**Recommendation:** Hybrid - rule-based for most, LLM for high-importance only

### Technical Challenges

**1. Soul agent lookup performance**
- Registry uses Map (O(1) lookup by ID)
- Spatial index uses Map<tierId, Set<soulId>> (O(1) tier lookup)
- **Concern:** 10K soul agents × 10 relationships = 100K relationship edges
- **Mitigation:** Index only active relationships, lazy-load dormant

**2. Life trajectory generation at scale**
- Generating trajectory for 1 soul agent: 5 LLM calls (~$0.01)
- Generating for 1000 soul agents: 5000 LLM calls (~$10)
- **Concern:** Expensive for large time skips
- **Mitigation:**
  - Generate only for high-attachment soul agents
  - Use smaller model for low-attachment
  - Cache/reuse trajectories for similar souls

**3. Synchronization with persistence system**
- Soul agents must save/load correctly
- Core memories must serialize
- **Concern:** 58 KB per soul agent × 1000 = 58 MB in save file
- **Mitigation:** Compress core memories, differential saves

### Future Enhancements

**1. Soul Agent Dynasties**
- Track entire family trees of soul agents
- Dynastic quests ("Restore your ancestor's honor")
- Cross-generation grudges/alliances

**2. Soul Agent Mentorship**
- Experienced soul agents train younger ones
- Knowledge transfer via core memory sharing
- Master-apprentice relationship mechanics

**3. Soul Agent Ascension**
- High-wisdom soul agents become deities
- Deity emergence tied to soul agent achievements
- Player-created gods from player-created soul agents

**4. Soul Agent Dream Communication**
- Soul agents communicate via shared dreams
- Core memories surface in dreams
- Cross-incarnation guidance

**5. Soul Agent Biographies**
- Auto-generate book/biography for deceased soul agents
- LLM writes narrative from core memories
- In-game books/monuments commemorate soul agents

---

## Summary

Soul Agents are the key innovation enabling **cross-scale storytelling** in the Grand Strategy system:

**Core Principles:**
1. **Sacred preservation** - never lost to statistics
2. **Headless simulation** - continue living when zoomed out
3. **Memory hierarchy** - active → suppressed → core (eternal)
4. **Life trajectories** - LLM-driven long-term simulation
5. **Awakening protocol** - seamless restoration when zooming back in

**Performance:**
- O(1) headless simulation per soul agent
- ~60 KB memory per soul agent
- 500x cheaper than full ECS for inactive tiers
- Supports up to 500 soul agents (setting-configurable cap)

**Integration:**
- Extends existing soul system (SoulIdentity, Incarnation, SoulRepository)
- Hooks into memory consolidation
- Works with Hierarchy Simulator's tier abstraction
- Compatible with time travel/multiverse

**Result:** Player can:
- Watch Kara (soul agent) discover iron in year 0
- Zoom out 500 years → Kara's descendant rules iron empire
- Zoom back in → Query Kara's legacy, find her statue in capital
- Time travel to year 250 → Meet Kara's granddaughter (also soul agent)

**The entire lineage persists with full fidelity across all scales.**

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-16
**Total Lines:** ~1750
**Next Spec:** 03-TIME-SCALING.md
**Status:** Complete, ready for implementation
