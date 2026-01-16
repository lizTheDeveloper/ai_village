# Agents Package - Agent Creation & Initialization

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with agent creation to understand the architecture, components, and initialization patterns.

## Overview

The **Agents Package** (`@ai-village/agents`) provides high-level agent creation functions that compose components from both the Core and Reproduction packages. This package was extracted to break the circular dependency between the World and Reproduction packages.

**What it does:**
- Creates fully-initialized wandering agents (basic AI)
- Creates LLM-controlled agents (AI decision-making via language models)
- Assembles 30+ components into functional agents
- Sets up skill-based vision profiles and behavioral priorities
- Initializes reproduction, spiritual, and combat systems
- Handles agent birth event emissions for metrics tracking

**What it replaced:**
Previously, agent creation functions lived in `packages/world/src/entity-creators/AgentEntity.ts`. These functions depended on both Core components and Reproduction components, creating a circular dependency. The Agents package now serves as the composition layer that depends on both packages without creating cycles.

**Key files:**
- `packages/agents/src/AgentEntity.ts` - Agent creation functions
- `packages/agents/src/index.ts` - Package exports

---

## Package Structure

```
packages/agents/
├── src/
│   ├── AgentEntity.ts          # createWanderingAgent, createLLMAgent
│   └── index.ts                # Package exports
├── package.json
└── README.md                   # This file
```

**Dependencies:**
- `@ai-village/core` - ECS, components, systems, world
- `@ai-village/reproduction` - Sexuality, courtship, parenting components

---

## Core Concepts

### 1. Agent Types

The package provides two agent creation functions:

#### Wandering Agent (Basic AI)
```typescript
createWanderingAgent(
  world: WorldMutator,
  x: number,
  y: number,
  speed?: number,
  options?: { believedDeity?: string }
): string  // Returns agent entity ID
```

**Characteristics:**
- Rule-based AI (no LLM calls)
- Think interval: 20 ticks (1 second at 20 TPS)
- Distributed think offsets (prevents thundering herd)
- Skill-based priorities (prefer activities they're good at)
- Random personality traits
- Starting inventory (5 wood, 3 stone, 8 berries)

#### LLM Agent (AI Decision-Making)
```typescript
createLLMAgent(
  world: WorldMutator,
  x: number,
  y: number,
  speed?: number,
  dungeonMasterPrompt?: string,
  options?: { believedDeity?: string }
): string  // Returns agent entity ID
```

**Characteristics:**
- LLM-controlled decision making
- Same component setup as wandering agents
- Optional "awakening" memory from Dungeon Master prompt
- LLM scheduler integration for rate limiting
- Higher cognitive overhead (uses LLM calls)

### 2. Component Assembly

Both agent types receive 30+ components organized into categories:

**Core Identity:**
- `position` - World coordinates
- `physics` - Non-solid (can pass through each other)
- `renderable` - Visual representation
- `appearance` - Random visual traits for sprite generation
- `tags` - 'agent', 'wanderer' or 'llm_agent'
- `identity` - Random generated name
- `personality` - Big Five personality traits (0-1 scale)
- `species` - Default: 'human'

**Behavior & Cognition:**
- `agent` - Behavior state, think interval, LLM flag, priorities
- `movement` - Speed, acceleration
- `skills` - 12+ skill levels (derived from personality)
- `needs` - Hunger, energy, health, thirst (0-1 scale)
- `goals` - Personal aspirations and progress

**Memory Systems:**
- `memory` - Legacy memory component
- `episodic_memory` - Specific events (max 1000)
- `semantic_memory` - Facts and knowledge
- `social_memory` - Relationship memories
- `spatial_memory` - Location knowledge
- `reflection` - Self-reflection and insights
- `journal` - Written records

**Perception:**
- `vision` - Skill-based vision profile (default/scout/farmer/guard/crafter)
- `steering` - Movement steering behaviors
- `velocity` - Current movement vector

**Social & Relationships:**
- `conversation` - Dialogue history (10 messages)
- `relationship` - Familiarity tracking
- `trust_network` - Trust relationships
- `belief` - Beliefs and values
- `social_gradient` - Social influence

**Survival & Resources:**
- `inventory` - 24 slots, 100 weight capacity
- `temperature` - Comfort 18-24°C, tolerance 0-35°C
- `circadian` - Sleep drive and preferred sleep time
- `gathering_stats` - Resource gathering tracking

**Combat & Conflict:**
- `combat_stats` - Combat/hunting/stealth skills (0-1 scale)
- `injury` - Injury tracking (starts empty)
- `guard_duty` - Guard assignment (starts unassigned)
- `dominance_rank` - Hierarchy position (neutral for humans)

**Spiritual & Reproduction:**
- `spiritual` - Faith and divine connection
- `sexuality` - Relationship style, seeking status (70% open to romance)
- `courtship` - Courtship paradigm ('human')
- `parenting` - Parental care style ('both_parents')

**Realm System:**
- `realm_location` - Current realm ('mortal_world')

**Exploration:**
- `exploration_state` - Exploration tracking

### 3. Skill-Based Vision Profiles

Vision range and awareness are determined by agent skills:

```typescript
function getVisionProfileFromSkills(skills: SkillsComponent):
  'default' | 'scout' | 'farmer' | 'guard' | 'crafter'
```

**Profile Selection Logic:**
- **Scout**: Highest exploration/hunting skills (sees farther)
- **Farmer**: Highest farming/gathering skills (focused nearby)
- **Guard**: Highest combat/stealth skills (broad awareness)
- **Crafter**: Highest crafting/building skills (detail-oriented)
- **Default**: No skills above level 2

**Vision Requirements:**
- Minimum score of 2 to unlock specialized profile
- Score = primary skill + (secondary skill × 0.5)

### 4. Think Offset (Thundering Herd Prevention)

Agents use staggered think timings to prevent performance spikes:

```typescript
function generateThinkOffset(entityId: string, maxOffset: number = 40): number
```

**How it works:**
- Hash entity ID to get consistent offset (0-39 ticks)
- Agent thinks at `tick % thinkInterval === thinkOffset`
- Distributes 100 agents across 40 ticks instead of all thinking at once

**Example:**
- Agent A: offset 5 → thinks at tick 5, 25, 45, 65...
- Agent B: offset 17 → thinks at tick 17, 37, 57, 77...
- Agent C: offset 33 → thinks at tick 33, 53, 73, 93...

### 5. Skill-Derived Priorities

Agent behavioral priorities are automatically derived from skills:

```typescript
const priorities = derivePrioritiesFromSkills(skillsComponent);
```

**Benefits:**
- Agents naturally prefer activities they're good at
- Farmers prioritize farming over combat
- Scouts prioritize exploration over crafting
- Creates role diversity without manual configuration

---

## API Reference

### createWanderingAgent

Creates a basic AI-controlled agent with rule-based behavior.

```typescript
import { createWanderingAgent } from '@ai-village/agents';

const agentId = createWanderingAgent(
  world,          // WorldMutator instance
  50,             // x position
  50,             // y position
  2.0,            // speed (default: 2.0)
  {
    believedDeity: 'Gaia'  // Optional deity belief
  }
);
```

**Parameters:**
- `world: WorldMutator` - World instance to add agent to
- `x: number` - Starting x coordinate
- `y: number` - Starting y coordinate
- `speed?: number` - Movement speed (default: 2.0)
- `options?.believedDeity?: string` - Initial deity to believe in

**Returns:** `string` - Entity ID of created agent

**Side Effects:**
- Adds agent entity to world
- Emits `agent:birth` event for metrics tracking

### createLLMAgent

Creates an LLM-controlled agent with AI decision-making.

```typescript
import { createLLMAgent } from '@ai-village/agents';

const agentId = createLLMAgent(
  world,
  50,
  50,
  2.0,
  "You awaken in a strange world...",  // Dungeon Master prompt
  { believedDeity: 'Chronos' }
);
```

**Parameters:**
- `world: WorldMutator` - World instance to add agent to
- `x: number` - Starting x coordinate
- `y: number` - Starting y coordinate
- `speed?: number` - Movement speed (default: 2.0)
- `dungeonMasterPrompt?: string` - Initial awakening memory
- `options?.believedDeity?: string` - Initial deity to believe in

**Returns:** `string` - Entity ID of created agent

**Side Effects:**
- Adds agent entity to world
- Creates "awakening" episodic memory if prompt provided
- Emits `agent:birth` event with `useLLM: true`

**Awakening Memory Properties:**
- Event type: 'awakening'
- Emotional valence: 0.2 (slightly positive/hopeful)
- Emotional intensity: 0.7 (quite intense)
- Surprise: 0.9 (very surprising)
- Importance: 1.0 (maximum - defines origin story)
- Consolidated: true (immediately foundational)

---

## Usage Examples

### Example 1: Create Basic Village Population

```typescript
import { createWanderingAgent } from '@ai-village/agents';
import type { World } from '@ai-village/core';

function populateVillage(world: World, centerX: number, centerY: number, count: number) {
  const agentIds: string[] = [];

  for (let i = 0; i < count; i++) {
    // Spawn in circle around center
    const angle = (i / count) * Math.PI * 2;
    const radius = 10;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    const agentId = createWanderingAgent(world, x, y, 2.0);
    agentIds.push(agentId);
  }

  return agentIds;
}

// Create 10 villagers
const villagerIds = populateVillage(world, 100, 100, 10);
```

### Example 2: Create LLM Agent with Custom Backstory

```typescript
import { createLLMAgent } from '@ai-village/agents';

const backstory = `
You are Elara, a wandering scholar who has just arrived in this mysterious land.
Your goal is to document the flora, fauna, and civilizations you encounter.
You carry a journal and have a keen interest in ancient ruins and magical phenomena.
`;

const scholarId = createLLMAgent(
  world,
  75,
  75,
  1.5,  // Slower, more cautious
  backstory
);

// The agent will have an "awakening" memory with this backstory
```

### Example 3: Create Religious Community

```typescript
import { createWanderingAgent } from '@ai-village/agents';

function createTempleFollowers(world: World, templeX: number, templeY: number, deity: string) {
  const followers: string[] = [];

  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * 3;  // Spread out
    const followerId = createWanderingAgent(
      world,
      templeX + offset,
      templeY,
      2.0,
      { believedDeity: deity }
    );
    followers.push(followerId);
  }

  return followers;
}

// Create followers of Gaia
const gaiaFollowers = createTempleFollowers(world, 50, 50, 'Gaia');
```

### Example 4: Access Agent After Creation

```typescript
import { createWanderingAgent } from '@ai-village/agents';
import type { World } from '@ai-village/core';

const agentId = createWanderingAgent(world, 50, 50);
const agent = world.getEntity(agentId);

// Access components
const identity = agent.getComponent('identity');
const skills = agent.getComponent('skills');
const personality = agent.getComponent('personality');

console.log(`Created ${identity.name}`);
console.log(`Skills:`, skills.levels);
console.log(`Personality: O=${personality.openness.toFixed(2)} C=${personality.conscientiousness.toFixed(2)}`);
```

---

## Integration

### Package Dependencies

```
@ai-village/agents
├── depends on: @ai-village/core
├── depends on: @ai-village/reproduction
└── used by: @ai-village/world (entity creation)
             @ai-village/demo (game initialization)
```

### Import Pattern (Old vs New)

**Before Extraction (DEPRECATED):**
```typescript
// DON'T USE - Old pattern from world package
import { createWanderingAgent } from '@ai-village/world';
```

**After Extraction (CORRECT):**
```typescript
// USE THIS - New pattern from agents package
import { createWanderingAgent, createLLMAgent } from '@ai-village/agents';
```

### Component Access After Creation

```typescript
import { createWanderingAgent } from '@ai-village/agents';

const agentId = createWanderingAgent(world, x, y);
const agent = world.getEntity(agentId);

// All components are accessible via type-safe getters
const position = agent.getComponent('position');
const skills = agent.getComponent('skills');
const inventory = agent.getComponent('inventory');
const episodicMemory = agent.getComponent('episodic_memory');
```

### Event Bus Integration

Both agent creation functions emit `agent:birth` events:

```typescript
// Subscribe to agent births
world.eventBus.on('agent:birth', (event) => {
  console.log(`Agent born: ${event.data.name}`);
  console.log(`Uses LLM: ${event.data.useLLM}`);
  console.log(`Initial health: ${event.data.initialStats.health}`);
});

// Create agent (triggers event)
createWanderingAgent(world, 50, 50);
```

---

## Common Pitfalls

### 1. Using Old Import Path

**Problem:**
```typescript
import { createWanderingAgent } from '@ai-village/world';  // WRONG
```

**Solution:**
```typescript
import { createWanderingAgent } from '@ai-village/agents';  // CORRECT
```

The extraction moved these functions from World to Agents package.

### 2. Modifying Agent Components Directly After Creation

**Problem:**
```typescript
const agentId = createWanderingAgent(world, 50, 50);
const agent = world.getEntity(agentId);
const skills = agent.getComponent('skills');
skills.levels.farming = 5;  // Silent mutation - won't trigger systems
```

**Solution:**
```typescript
// Use proper mutation API
const skills = agent.getComponent('skills');
const newSkills = { ...skills, levels: { ...skills.levels, farming: 5 } };
agent.updateComponent(newSkills);
```

### 3. Assuming All Agents Use LLM

**Problem:**
```typescript
// Assumes all agents are LLM-controlled
const agent = world.getEntity(agentId);
const agentComp = agent.getComponent('agent');
// agentComp.useLLM might be false!
```

**Solution:**
```typescript
const agent = world.getComponent('agent');
if (agent.useLLM) {
  // LLM-specific logic
} else {
  // Rule-based AI logic
}
```

### 4. Forgetting Speed Parameter

**Problem:**
```typescript
createWanderingAgent(world, x, y);  // Speed defaults to 2.0
// Later code assumes speed is 1.0
```

**Solution:**
```typescript
// Explicit speed for clarity
createWanderingAgent(world, x, y, 1.0);  // Slow walker
createWanderingAgent(world, x, y, 3.0);  // Fast runner
```

### 5. Not Handling Entity Lifecycle

**Problem:**
```typescript
const agentId = createWanderingAgent(world, 50, 50);
// Agent might die or be removed later
const agent = world.getEntity(agentId);  // Might throw if removed!
```

**Solution:**
```typescript
const agentId = createWanderingAgent(world, 50, 50);
const agent = world.getEntity(agentId);
if (!agent) {
  console.log('Agent no longer exists');
  return;
}
```

---

## Troubleshooting

### Agent Not Thinking/Moving

**Symptoms:** Agent created but stays idle forever, never moves or acts.

**Possible Causes:**
1. **SimulationScheduler mode:** Agent might be PASSIVE or PROXIMITY with no player nearby
2. **Think offset collision:** All agents thinking at same time (unlikely but check performance)
3. **System priority order:** AgentBrainSystem not running

**Debug Steps:**
```typescript
const agent = world.getEntity(agentId);
const agentComp = agent.getComponent('agent');
console.log('State:', agentComp.state);
console.log('Think interval:', agentComp.thinkInterval);
console.log('Think offset:', agentComp.thinkOffset);
console.log('Last think:', agentComp.lastThinkTime);

// Check simulation mode
const mode = world.simulationScheduler.getEntityMode(agentId);
console.log('Simulation mode:', mode);  // Should be ALWAYS for agents
```

### Agent Has Wrong Skills

**Symptoms:** Agent has unexpected skill levels or profile.

**Cause:** Skills are randomly generated from personality traits.

**Solution:**
```typescript
// Modify skills after creation
const agent = world.getEntity(agentId);
const skills = agent.getComponent('skills');
skills.levels.farming = 5;  // Set specific skill
agent.updateComponent(skills);

// Recalculate priorities
import { derivePrioritiesFromSkills } from '@ai-village/core';
const newPriorities = derivePrioritiesFromSkills(skills);
const agentComp = agent.getComponent('agent');
agentComp.priorities = newPriorities;
agent.updateComponent(agentComp);
```

### LLM Agent Not Making Decisions

**Symptoms:** LLM agent created but behaves like wandering agent.

**Possible Causes:**
1. **useLLM flag not set:** Check agent component
2. **LLM provider not configured:** Check LLMScheduler
3. **Rate limiting:** Agent in cooldown period

**Debug Steps:**
```typescript
const agent = world.getEntity(agentId);
const agentComp = agent.getComponent('agent');
console.log('Uses LLM:', agentComp.useLLM);  // Should be true

// Check LLM scheduler state
import { llmScheduler } from '@ai-village/llm';
const status = llmScheduler.getAgentStatus(agentId);
console.log('LLM Status:', status);
```

### Memory System Not Working

**Symptoms:** Agent not forming memories or memories disappearing.

**Possible Causes:**
1. **Episodic memory full:** Max 1000 memories, oldest get pruned
2. **Memory consolidation:** Memories might be marked for consolidation
3. **System not running:** MemoryConsolidationSystem disabled

**Debug Steps:**
```typescript
const agent = world.getEntity(agentId);
const episodic = agent.getComponent('episodic_memory');
console.log('Memory count:', episodic.memories.length);
console.log('Max memories:', episodic.maxMemories);

// Check oldest memory
if (episodic.memories.length > 0) {
  const oldest = episodic.memories[0];
  console.log('Oldest memory:', oldest.timestamp, oldest.summary);
}
```

### Agent Birth Event Not Firing

**Symptoms:** Event listeners not receiving agent:birth events.

**Possible Causes:**
1. **Listener registered after creation:** Subscribe before calling create function
2. **Event type mismatch:** Check exact event type string
3. **WorldMutator vs World:** Event bus might be on different instance

**Debug Steps:**
```typescript
// Subscribe first
world.eventBus.on('agent:birth', (event) => {
  console.log('Agent birth event:', event);
});

// Then create
const agentId = createWanderingAgent(world, 50, 50);

// Verify event bus
console.log('Event bus listeners:', world.eventBus.listenerCount('agent:birth'));
```

### Circular Dependency Errors

**Symptoms:** Import errors or "cannot access before initialization" errors.

**Cause:** Importing from wrong package creates circular dependency.

**Solution:**
```typescript
// WRONG - Creates circular dependency
import { createWanderingAgent } from '@ai-village/world';
import { SexualityComponent } from '@ai-village/reproduction';

// CORRECT - Use agents package as composition layer
import { createWanderingAgent } from '@ai-village/agents';
// Agents package handles both core and reproduction dependencies
```

---

## Architecture Notes

### Why This Package Exists

**Problem:** Before extraction, World package depended on Reproduction package for sexuality components, but Reproduction package needed World for entity creation. This created a circular dependency.

**Solution:** Extract agent creation to separate package that depends on both:
```
world → agents ← reproduction
  ↑_______________|  (circular dependency broken)
```

### Component Assembly Strategy

Both `createWanderingAgent` and `createLLMAgent` follow the same pattern:
1. Create entity with generated ID
2. Add core components (position, physics, renderable)
3. Add identity and personality (random generation)
4. Generate skills from personality
5. Derive priorities and vision profile from skills
6. Add behavior component with LLM flag
7. Add memory, perception, and social components
8. Add survival and resource components
9. Add combat and spiritual components
10. Add reproduction components (from @ai-village/reproduction)
11. Add to world
12. Emit birth event

This ensures all agents have consistent component sets and initialization.

### Performance Considerations

**Think Offset Distribution:**
- Without offsets: 100 agents × 20 ticks = 100 agents all thinking at tick 0, 20, 40...
- With offsets: 100 agents distributed across 40 ticks = ~2-3 agents thinking per tick
- Prevents thundering herd problem and smooths CPU usage

**Component Count:**
- Each agent has 30+ components
- 100 agents = 3000+ components
- SimulationScheduler filters to ~50 active agents
- Most systems only process active subset

**Memory Limits:**
- Episodic: 1000 memories max per agent
- Conversation: 10 messages max
- Inventory: 24 slots, 100 weight capacity
- These limits prevent unbounded growth

---

## Related Documentation

- **[COMPONENTS_REFERENCE.md](../../COMPONENTS_REFERENCE.md)** - All 125+ component types
- **[SYSTEMS_CATALOG.md](../../SYSTEMS_CATALOG.md)** - System priorities and execution order
- **[METASYSTEMS_GUIDE.md](../../METASYSTEMS_GUIDE.md)** - Consciousness, reproduction, divinity
- **[Core README](../core/README.md)** - ECS architecture
- **[Reproduction README](../reproduction/README.md)** - Sexuality, courtship, parenting
- **[LLM README](../llm/README.md)** - LLM scheduler and prompt builders
