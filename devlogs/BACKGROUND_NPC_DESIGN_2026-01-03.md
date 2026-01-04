# Background NPC Simulation Design

**Date:** 2026-01-03
**Purpose:** Design low-impact simulation for off-screen city NPCs (reporters, TV actors, etc.)

---

## Problem Statement

Later in the simulation, we'll have NPC cities with specialized professions:
- **Newspaper reporters** generating news stories
- **TV actors** performing shows
- **Radio hosts** broadcasting content
- **Office workers**, **shopkeepers**, **bureaucrats**, etc.

These agents should feel "alive" even when off-screen, but we can't afford full LLM simulation for hundreds/thousands of background NPCs.

---

## Existing Infrastructure

### Agent Tier System (Already Implemented)
Located in `packages/core/src/components/AgentComponent.ts`:

```typescript
type AgentTier = 'full' | 'reduced' | 'autonomic';

AGENT_TIER_CONFIG = {
  full: {
    idleThinkDelaySec: 3,
    periodicThinkSec: 30,
    thinkOnTaskComplete: true,
    defaultScripted: false
  },
  reduced: {
    idleThinkDelaySec: null,      // Don't think on idle
    periodicThinkSec: 120,         // Think every 2 minutes
    thinkOnTaskComplete: true,
    defaultScripted: false
  },
  autonomic: {
    idleThinkDelaySec: null,
    periodicThinkSec: null,
    thinkOnTaskComplete: false,
    defaultScripted: true,         // Scripted until interacted with
    // Uses interactionTriggeredLLM flag
  }
}
```

**Interaction-triggered LLM:** Autonomic agents activate LLM when the player talks to them, then return to scripted behavior after timeout (60 seconds).

---

## Proposed Solution: Multi-Level Background Simulation

### 1. New Agent Tiers

Extend the tier system with two new levels:

```typescript
type AgentTier =
  | 'full'        // Existing: Regular LLM thinking
  | 'reduced'     // Existing: Less frequent LLM
  | 'autonomic'   // Existing: Scripted + interaction LLM
  | 'background'  // NEW: Profession simulation only
  | 'dormant';    // NEW: State preservation only

AGENT_TIER_CONFIG = {
  // ... existing tiers ...

  background: {
    idleThinkDelaySec: null,
    periodicThinkSec: null,
    thinkOnTaskComplete: false,
    defaultScripted: true,

    // Background-specific config
    professionUpdateInterval: 1440,  // Once per in-game day (1440 ticks)
    useCachedBehaviors: true,        // Use behavior templates
    activateOnRelevance: true,       // Upgrade to autonomic if relevant
  },

  dormant: {
    idleThinkDelaySec: null,
    periodicThinkSec: null,
    thinkOnTaskComplete: false,
    defaultScripted: true,

    // Dormant-specific config
    skipMovement: true,              // Don't process movement
    skipNeeds: true,                 // Freeze needs (or very slow decay)
    stateOnly: true,                 // Only maintain state, no simulation
    wakeOnDistance: 50,              // Activate if player within 50 tiles
  }
};
```

---

### 2. Profession Simulation System

**New System: `ProfessionSimulationSystem`**
**Priority:** 150 (very low, after most other systems)
**Location:** `packages/core/src/systems/ProfessionSimulationSystem.ts`

**Purpose:** Simulate profession-specific outputs for background NPCs without full agent simulation.

```typescript
interface ProfessionComponent {
  type: 'profession';
  professionType:
    | 'newspaper_reporter'
    | 'tv_actor'
    | 'radio_host'
    | 'office_worker'
    | 'shopkeeper'
    | 'bureaucrat';

  // Profession state
  currentProject?: string;           // "Writing article about village fire"
  projectProgress: number;           // 0.0 to 1.0
  completedProjects: string[];       // History of outputs

  // Cached behaviors (templates)
  behaviorCache: ProfessionBehavior[];
  lastCacheUpdate: number;           // Tick when cache was updated

  // Output generation
  outputQueue: ProfessionOutput[];   // Generated articles, shows, etc.
  lastOutputTick: number;
}

interface ProfessionBehavior {
  description: string;               // "Research local events"
  duration: number;                  // Ticks to complete
  outputType?: string;               // "news_article", "tv_episode"
}

interface ProfessionOutput {
  type: 'news_article' | 'tv_episode' | 'radio_broadcast';
  content: string;                   // Generated content (cached or LLM)
  timestamp: number;                 // When it was created
  relevance: number;                 // 0.0 to 1.0 (affects if it spreads)
}
```

**System Logic:**

```typescript
class ProfessionSimulationSystem implements System {
  priority = 150; // Very low priority

  update(world: World, tick: number) {
    // Only process background-tier agents
    const backgroundAgents = world.query()
      .with(CT.Agent)
      .with(CT.Profession)
      .executeEntities()
      .filter(e => {
        const agent = e.getComponent<AgentComponent>(CT.Agent);
        return agent.tier === 'background';
      });

    for (const entity of backgroundAgents) {
      const profession = entity.getComponent<ProfessionComponent>(CT.Profession);

      // Update profession state (very infrequent)
      if (tick - profession.lastOutputTick >= this.getUpdateInterval(profession)) {
        this.simulateProfession(entity, profession, tick);
      }
    }
  }

  private simulateProfession(
    entity: EntityImpl,
    profession: ProfessionComponent,
    tick: number
  ) {
    // Use cached behaviors (no LLM)
    const behavior = this.selectCachedBehavior(profession);

    // Advance project
    profession.projectProgress += 1 / behavior.duration;

    // Generate output when complete
    if (profession.projectProgress >= 1.0) {
      const output = this.generateProfessionOutput(
        entity,
        profession,
        behavior
      );

      profession.outputQueue.push(output);
      profession.completedProjects.push(behavior.description);
      profession.projectProgress = 0;
      profession.lastOutputTick = tick;

      // Emit event (other systems can react)
      this.eventBus.emit('profession_output', {
        entityId: entity.id,
        professionType: profession.professionType,
        output
      });
    }
  }

  private generateProfessionOutput(
    entity: EntityImpl,
    profession: ProfessionComponent,
    behavior: ProfessionBehavior
  ): ProfessionOutput {
    // Use templates with random variation (NO LLM)
    const template = this.getOutputTemplate(profession.professionType);

    // Simple string interpolation
    const content = this.fillTemplate(template, {
      agentName: entity.getComponent<NameComponent>(CT.Name).name,
      topic: behavior.description,
      date: this.getCurrentDate(),
      // ... other context
    });

    return {
      type: behavior.outputType as any,
      content,
      timestamp: Date.now(),
      relevance: this.calculateRelevance(content)
    };
  }
}
```

---

### 3. Dynamic Tier Promotion

**Background → Autonomic Upgrade:**

When a background NPC becomes relevant, upgrade them to `autonomic` tier:

```typescript
class RelevanceTrackingSystem implements System {
  update(world: World, tick: number) {
    const player = this.getPlayerEntity(world);
    const playerPos = player.getComponent<PositionComponent>(CT.Position);

    // Check background NPCs
    const backgroundAgents = this.getBackgroundAgents(world);

    for (const agent of backgroundAgents) {
      const agentComp = agent.getComponent<AgentComponent>(CT.Agent);
      const agentPos = agent.getComponent<PositionComponent>(CT.Position);

      // Promote to autonomic if player gets close
      const distance = Math.sqrt(
        (playerPos.x - agentPos.x) ** 2 +
        (playerPos.y - agentPos.y) ** 2
      );

      if (distance < 50) { // Within 50 tiles
        agentComp.tier = 'autonomic';
        this.eventBus.emit('agent_tier_promoted', {
          entityId: agent.id,
          fromTier: 'background',
          toTier: 'autonomic',
          reason: 'player_proximity'
        });
      }
    }
  }
}
```

**Autonomic → Background Downgrade:**

After player moves away, downgrade back to background:

```typescript
class TierDowngradeSystem implements System {
  update(world: World, tick: number) {
    const player = this.getPlayerEntity(world);
    const playerPos = player.getComponent<PositionComponent>(CT.Position);

    // Check autonomic NPCs that were promoted
    const autonomicAgents = this.getAutonomicAgents(world);

    for (const agent of autonomicAgents) {
      const agentComp = agent.getComponent<AgentComponent>(CT.Agent);
      const agentPos = agent.getComponent<PositionComponent>(CT.Position);

      // Only downgrade if they were promoted (not originally autonomic)
      if (!agentComp.originalTier || agentComp.originalTier === 'autonomic') {
        continue;
      }

      const distance = Math.sqrt(
        (playerPos.x - agentPos.x) ** 2 +
        (playerPos.y - agentPos.y) ** 2
      );

      // Downgrade if far away and no recent interaction
      const timeSinceInteraction = tick - (agentComp.lastInteractionTick ?? 0);
      if (distance > 100 && timeSinceInteraction > 1200) { // 60 seconds
        agentComp.tier = agentComp.originalTier;
        this.eventBus.emit('agent_tier_downgraded', {
          entityId: agent.id,
          fromTier: 'autonomic',
          toTier: agentComp.originalTier,
          reason: 'player_distance'
        });
      }
    }
  }
}
```

---

### 4. Behavior Templates & Caching

**Template System** (No LLM Required)

```typescript
// packages/core/src/profession/ProfessionTemplates.ts

const REPORTER_TEMPLATES: ProfessionBehavior[] = [
  {
    description: "Research local events",
    duration: 720, // Half a game day
    outputType: "news_article"
  },
  {
    description: "Interview village elder",
    duration: 480, // 8 game hours
    outputType: "news_article"
  },
  {
    description: "Cover market day festivities",
    duration: 600,
    outputType: "news_article"
  }
];

const TV_ACTOR_TEMPLATES: ProfessionBehavior[] = [
  {
    description: "Rehearse for drama series",
    duration: 600,
    outputType: "tv_episode"
  },
  {
    description: "Film commercial spot",
    duration: 360,
    outputType: "tv_episode"
  }
];

// Output templates
const NEWS_ARTICLE_TEMPLATES = [
  "{{agentName}} reports on {{topic}}. The event occurred on {{date}}.",
  "Breaking news from {{agentName}}: {{topic}} has occurred in the village.",
  "In today's edition, {{agentName}} covers {{topic}}."
];
```

**Optional LLM Cache Pre-generation:**

For variety, pre-generate a cache of behaviors/outputs using LLM in bulk (batch processing, off-peak):

```typescript
class ProfessionCacheGenerator {
  async generateBehaviorCache(
    professionType: string,
    count: number = 20
  ): Promise<ProfessionBehavior[]> {
    // Batch LLM request (once per game day, low priority)
    const prompt = `Generate ${count} realistic daily activities for a ${professionType}.
Format: JSON array of {description, duration, outputType}`;

    const response = await this.llmQueue.requestDecision(
      'cache_generator',
      prompt
    );

    return JSON.parse(response);
  }
}
```

---

### 5. Performance Impact Analysis

**Comparison:**

| Tier | Movement | Needs | LLM | Brain | Systems | Cost/Agent/Tick |
|------|----------|-------|-----|-------|---------|-----------------|
| `full` | ✅ | ✅ | Every 30s | ✅ | All | 100% (baseline) |
| `reduced` | ✅ | ✅ | Every 2m | ✅ | All | ~80% |
| `autonomic` | ✅ | ✅ | Only on interact | ❌ Scripted | All | ~40% |
| `background` | ✅ Slow | ❌ Frozen | Never | ❌ | Profession only | ~5% |
| `dormant` | ❌ | ❌ Frozen | Never | ❌ | None | ~1% (state only) |

**Example:** 1000 background NPCs in a city
- **Without tiers:** 1000 × 100% = 100,000% cost (simulation grinds to halt)
- **With background tier:** 1000 × 5% = 5,000% cost (50× reduction, manageable)
- **With dormant tier:** 1000 × 1% = 1,000% cost (100× reduction)

---

### 6. Integration with Existing Systems

**Modifications Needed:**

#### A. AgentBrainSystem Skip Logic
```typescript
// packages/core/src/systems/AgentBrainSystem.ts

update(world: World, tick: number) {
  const entities = this.query.executeEntities(world);

  for (const entity of entities) {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    // Skip brain processing for background/dormant tiers
    if (agent.tier === 'background' || agent.tier === 'dormant') {
      continue;
    }

    // ... existing logic for full/reduced/autonomic
  }
}
```

#### B. MovementSystem Throttling
```typescript
// packages/core/src/systems/MovementSystem.ts

update(world: World, tick: number) {
  const entities = this.query.executeEntities(world);

  for (const entity of entities) {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    // Skip movement for dormant agents
    if (agent.tier === 'dormant') {
      continue;
    }

    // Slow movement for background agents (every 10 ticks)
    if (agent.tier === 'background' && tick % 10 !== 0) {
      continue;
    }

    // ... existing movement logic
  }
}
```

#### C. NeedsSystem Freeze
```typescript
// packages/core/src/systems/NeedsSystem.ts

update(world: World, tick: number) {
  const entities = this.query.executeEntities(world);

  for (const entity of entities) {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    // Freeze needs for background/dormant
    if (agent.tier === 'background' || agent.tier === 'dormant') {
      continue; // Needs don't decay
    }

    // ... existing needs decay logic
  }
}
```

---

## Implementation Phases

### Phase 1: Core Tier Extension
- [ ] Add `'background'` and `'dormant'` to `AgentTier` type
- [ ] Update `AGENT_TIER_CONFIG` with new tier configs
- [ ] Modify AgentBrainSystem to skip background/dormant agents
- [ ] Modify MovementSystem to throttle/skip
- [ ] Modify NeedsSystem to freeze needs

### Phase 2: Profession Component & Templates
- [ ] Create `ProfessionComponent` interface
- [ ] Create profession behavior templates (reporters, actors, etc.)
- [ ] Create output templates (articles, shows)
- [ ] Implement template filling system (no LLM)

### Phase 3: Profession Simulation System
- [ ] Implement `ProfessionSimulationSystem`
- [ ] Implement project tracking (progress, outputs)
- [ ] Emit profession events (for other systems to react)
- [ ] Add profession output to world state (newspapers, TV shows)

### Phase 4: Dynamic Tier Promotion
- [ ] Implement `RelevanceTrackingSystem` (distance-based)
- [ ] Implement `TierDowngradeSystem` (return to background)
- [ ] Add `originalTier` tracking to AgentComponent
- [ ] Add promotion/demotion events

### Phase 5: Optional LLM Cache (Future)
- [ ] Implement `ProfessionCacheGenerator` for variety
- [ ] Batch generate behaviors during low-load periods
- [ ] Store cached behaviors in ProfessionComponent

---

## Example Usage

### Creating a Background Reporter

```typescript
const reporter = EntityBuilder.create()
  .withComponent(ComponentType.Name, { name: "Sarah Chen" })
  .withComponent(ComponentType.Position, { x: 1000, y: 1000 })
  .withComponent(ComponentType.Agent, {
    ...createAgentComponent('wander', 100, false, 0, undefined, 'background'),
  })
  .withComponent(ComponentType.Profession, {
    type: 'profession',
    professionType: 'newspaper_reporter',
    projectProgress: 0,
    completedProjects: [],
    behaviorCache: REPORTER_TEMPLATES,
    lastCacheUpdate: 0,
    outputQueue: [],
    lastOutputTick: 0
  })
  .build();
```

### Promoting to Autonomic on Interaction

```typescript
// In CommunicationSystem when player talks to background NPC
if (agent.tier === 'background') {
  agent.originalTier = 'background'; // Remember original tier
  agent.tier = 'autonomic';
  agent.interactionTriggeredLLM = true; // Enable LLM for conversation
  agent.lastInteractionTick = tick;

  console.log(`Promoted ${name} from background to autonomic for conversation`);
}
```

---

## Benefits

1. **Massive Performance Savings:** 50-100× reduction for background NPCs
2. **Scalable to Thousands:** Can simulate entire cities of NPCs
3. **Feels Alive:** Professions continue producing outputs (news, shows)
4. **Seamless Transitions:** Smooth upgrade to full simulation when relevant
5. **Zero LLM Cost:** Background NPCs use templates, no API calls
6. **Extends Existing System:** Builds on proven tier architecture

---

## Potential Extensions

### 1. Event-Driven Activation
Promote background NPCs when relevant events occur:
```typescript
eventBus.on('village_fire', (event) => {
  const reporters = getNearbyProfession('newspaper_reporter', event.location, 200);
  reporters.forEach(r => promoteTier(r, 'autonomic', 'relevant_event'));
});
```

### 2. Aggregate Simulation
Simulate groups of NPCs as a single entity:
```typescript
interface NPCGroupComponent {
  type: 'npc_group';
  count: number;              // 500 office workers
  professionType: string;
  aggregateOutputRate: number; // Combined output
}
```

### 3. Spatial Partitioning
Only simulate NPCs in loaded chunks:
```typescript
class ChunkLoadSystem {
  onChunkLoad(chunk: Chunk) {
    // Promote dormant → background for NPCs in loaded chunk
    const npcs = chunk.getNPCs();
    npcs.forEach(npc => {
      if (npc.tier === 'dormant') {
        npc.tier = 'background';
      }
    });
  }
}
```

---

## Open Questions

1. **Profession Variety:** Should we support custom profession types beyond the initial set?
2. **Output Persistence:** Should profession outputs (news articles, TV shows) be saved to world state permanently?
3. **Social Networks:** Should background NPCs maintain simplified relationship graphs?
4. **Memory Compression:** Should we store compressed memories for background NPCs?
5. **Chunk-Based Dormancy:** Should we automatically downgrade to dormant when chunk unloads?

---

## Conclusion

This design provides a **scalable, low-impact system for simulating thousands of background NPCs** by extending the existing tier architecture. It balances:
- **Performance:** Minimal computation for off-screen NPCs
- **Believability:** Professions continue generating outputs
- **Interactivity:** Seamless upgrade when player interacts
- **Integration:** Minimal changes to existing systems

The key insight is **separating profession simulation from full agent simulation**, allowing NPCs to "do their jobs" without requiring brain processing, movement pathfinding, or LLM calls.

---

**Next Steps:** Review this design, then implement Phase 1 (core tier extension) as a proof of concept.
