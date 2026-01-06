# Talker/Executor Split Implementation

## Overview

The LLM decision system has been split into two separate processors to implement the three-layer agent architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentBrainSystem                             │
│                                                                   │
│  Layer 1: Autonomic System (No LLM)                             │
│  ├─ Survival reflexes: seek_food, seek_sleep, flee, seek_warmth│
│  ├─ Priority-based interrupts (100 = critical, 10 = boredom)   │
│  ├─ Zero latency, pure logic                                    │
│  └─ Handles 80% of decisions without LLM                        │
│      ↓                                                           │
│  Layer 2: Talker LLM (Conversational + Goal Setting)           │
│  ├─ Fast conversations and social interactions (300ms)         │
│  ├─ Sets strategic goals and priorities                        │
│  ├─ NO action execution tools (no gather/build/navigate)       │
│  ├─ Uses personality + unconscious urges                       │
│  ├─ Personality-driven cadence                                 │
│  └─ Frequent calls (extroverts every 30s, introverts every 2m) │
│      ↓                                                           │
│  Layer 3: Executor LLM (Strategic Planning)                     │
│  ├─ Reads goals from Talker                                    │
│  ├─ Plans what to build (plan_build)                           │
│  ├─ Sets priorities for autonomic system (set_priorities)      │
│  ├─ Queues craft recipes (craft 50 cloth)                      │
│  ├─ Large-scale stockpiling (gather 500 wood, repeat)          │
│  ├─ Task-driven cadence                                        │
│  └─ Infrequent calls (only when goals change or task complete) │
│                                                                  │
│  Autonomic System executes the strategy:                        │
│  ├─ Knows building costs (tent = 5 wood + 10 cloth)            │
│  ├─ Gathers resources tactically (find nearest tree)           │
│  ├─ Constructs buildings when resources ready                  │
│  └─ Executes crafting queues                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. TalkerLLMProcessor (`/packages/core/src/decision/TalkerLLMProcessor.ts`)

**Purpose**: Handles conversational decision-making, goal-setting, and social interactions.

**Responsibilities**:
- Set personal goals (`set_personal_goal`)
- Set medium-term goals (`set_medium_term_goal`)
- Set group goals (`set_group_goal`)
- Set strategic priorities (`set_priorities`)
- Social actions (`talk`, `follow`)

**Calling Logic** (`shouldCallTalker()`):
- In active conversation → every 10 seconds
- Social depth need critical (<0.3) → every 15 seconds
- High extraversion (>0.6) → every 30 seconds
- Low extraversion (<0.4) → every 2 minutes
- Moderate extraversion → every 60 seconds

**Configuration**:
```typescript
interface TalkerProcessorConfig {
  enableTalker: boolean;              // Master toggle
  highExtraversionThreshold: number;  // 0.6 - extroverts
  lowExtraversionThreshold: number;   // 0.4 - introverts
  extrovertTalkCadenceSec: number;    // 30 seconds
  introvertTalkCadenceSec: number;    // 120 seconds
  conversationPriority: number;       // 8 (high)
}
```

### 2. ExecutorLLMProcessor (`/packages/core/src/decision/ExecutorLLMProcessor.ts`)

**Purpose**: Strategic planner that sets goals and priorities for the autonomic system to execute.

**Responsibilities**:
- **Plan builds** (`plan_build`) - autonomic handles resource gathering and construction
- **Set priorities** (`set_priorities`) - controls what autonomic system focuses on
- **Queue craft recipes** (`craft` with amount) - autonomic executes the crafting queue
- **Large-scale stockpiling** (`gather` for massive projects) - multiple agents, repeated gathering
- **Multi-step strategic plans** (action arrays) - complex sequences for autonomic to execute

**Calling Logic** (`shouldCallExecutor()`):
- Task just completed → 5 seconds later
- Idle with no plan → 10 seconds later
- Periodic thinking → every 5 minutes
- Respects agent tier configuration

**Configuration**:
```typescript
interface ExecutorProcessorConfig {
  enableExecutor: boolean;          // Master toggle
  taskCompleteCadenceSec: number;   // 5 seconds
  idleThinkDelaySec: number;        // 10 seconds
  periodicThinkSec: number;         // 300 seconds (5 minutes)
}
```

### 3. Updated DecisionProcessor (`/packages/core/src/decision/index.ts`)

**Changes**:
- Added imports for TalkerLLMProcessor and ExecutorLLMProcessor
- Constructor now accepts optional `talkerPromptBuilder` and `executorPromptBuilder`
- `process()` method calls both processors in sequence:
  1. Talker runs first (may set goals/priorities)
  2. Executor runs second (reads those goals and plans tasks)
- Backward compatible with single LLM mode

**Usage**:
```typescript
// Three-layer architecture (recommended)
const decision = new DecisionProcessor(
  llmQueue,
  null,  // old promptBuilder (deprecated)
  talkerPromptBuilder,
  executorPromptBuilder
);

// Backward compatible (single LLM)
const decision = new DecisionProcessor(llmQueue, promptBuilder);
```

## LLM Decision Queue Interface

Both processors use the same `LLMDecisionQueue` interface, but with an optional `llmType` parameter:

```typescript
interface LLMDecisionQueue {
  getDecision(entityId: string, llmType?: 'talker' | 'executor'): string | null;
  requestDecision(
    entityId: string,
    prompt: string,
    customConfig?: CustomLLMConfig,
    llmType?: 'talker' | 'executor'
  ): Promise<string>;
}
```

This allows the queue to:
- Track separate decisions for Talker and Executor per agent
- Apply different priorities/rate limits per LLM type
- Support the conversation scheduler's lazy prompt rendering

## Prompt Builder Interfaces

### TalkerPromptBuilder

```typescript
interface TalkerPromptBuilder {
  buildTalkerPrompt(entity: Entity, world: World): string;
}
```

**Should include** (environmental awareness for conversation):
- **Personality** (OCEAN traits)
- **Unconscious urges** (soul component)
- **Current needs** (hunger, energy, temperature, social, socialDepth)
- **Vision** (what they can see - agents, objects, terrain nearby)
- **Weather/temperature** (hot, cold, raining, etc.)
- **Location context** (biome, named places, "in the forest", "near the river")
- **Nearby agents** for conversation (names, basic state)
- **Current conversation state** (who they're talking to)
- **Recent memories/events** (things they witnessed)
- **Recent speech/thoughts** (conversation continuity)
- **Current activity** (what they're doing - gathering, building, wandering)

**Should NOT include** (task execution details):
- **Exact resource quantities** for crafting recipes
- **Building costs and requirements** (wood: 10, stone: 5)
- **Detailed inventory management** (slot-by-slot contents)
- **Action execution tools** (no gather/build/navigate tools)
- **Multi-step task planning** (Executor's domain)

**Key Distinction**:
- Talker knows: "I'm hungry, it's cold, I see Luna gathering berries, the forest looks beautiful today"
- Executor knows: "I need 10 wood + 5 cloth for tent, I have 3 wood, nearest tree is at (50, 30)"

### ExecutorPromptBuilder

```typescript
interface ExecutorPromptBuilder {
  buildExecutorPrompt(entity: Entity, world: World): string;
}
```

**Should include**:
- Current goals and priorities (from Talker)
- Unconscious urges (soul component)
- Available stockpiled resources (for large projects)
- Planned builds queue
- Available craft recipes
- Available building types
- Recent task completions

**Should NOT include**:
- Building costs (autonomic system handles this)
- Detailed resource gathering plans (autonomic handles this)
- Detailed conversation history (Talker's domain)
- Social interaction tools (talk is Talker's job)

**Key Understanding**:
The Executor is a **strategic planner**, not a tactical micromanager:
- Plans what to build → autonomic gathers resources and builds it
- Sets priorities → autonomic system focuses on those priorities
- Queues craft recipes → autonomic executes the crafting
- Stockpiles resources → for massive projects requiring multiple agents

## Example: Environmental Awareness in Conversation

**Talker Prompt** (environmental awareness):
```
You are Aria, a creative and extroverted villager.

Current State:
- Hunger: 30 (satisfied)
- Energy: 80 (energized)
- Temperature: 65°F (comfortable)
- Social depth need: 0.4 (moderate)

Environment:
- Location: Forest clearing near the river
- Weather: Sunny, light breeze
- You can see: Luna (gathering berries 10m away), oak tree, berry bush, river

Recent memory: You found some delicious berries earlier today

Current activity: Wandering

Nearby agents:
- Luna: gathering berries, looks focused

What do you want to talk about or do?
```

**Talker Response**:
```json
{
  "thinking": "I'm feeling social and I see Luna nearby. The weather is beautiful and I just found those berries - good conversation starter!",
  "speaking": "Luna! The berries here are amazing today! Have you tried the ones by the river?",
  "action": {
    "type": "talk",
    "target": "Luna"
  }
}
```

**Why this works**: Talker has environmental context (sees Luna, knows weather, remembers berries) enabling natural, contextual conversation.

---

**Executor Prompt** (strategic planning focus):
```
You are Aria, a creative villager.

Current Goals:
- Personal goal: "Build a cozy home"
- Priorities: building: 90, gathering: 50, social: 30

Available Buildings:
- tent, lean-to, storage-chest, campfire, workbench, forge, bed

Available Recipes:
- cloth (from plant_fiber), rope (from plant_fiber), wood_plank (from wood)

Village Stockpile:
- Wood: 45
- Stone: 20
- Plant fiber: 15

Planned Builds Queue:
(empty)

What strategic actions should you plan?
```

**Executor Response**:
```json
{
  "thinking": "My goal is to build a home. I should plan a tent first, then upgrade to better shelter. The autonomic system will handle gathering resources. I'll also queue up some cloth crafting since we'll need it for multiple buildings.",
  "action": [
    {"type": "plan_build", "building": "tent", "priority": "high", "reason": "immediate shelter"},
    {"type": "plan_build", "building": "storage-chest", "priority": "normal", "reason": "organize resources"},
    {"type": "craft", "recipe": "cloth", "amount": 20},
    {"type": "set_priorities", "priorities": {"building": 90, "gathering": 60, "social": 30}}
  ]
}
```

**Why this works**: Executor plans strategically (what to build, what to craft, what priorities), autonomic system executes tactically.

---

**Example: Large-Scale Stockpiling**
```
Goals: "Build a massive castle (requires 50,000 wood)"

Executor Response:
{
  "thinking": "This will require massive stockpiling. Multiple agents need to focus on gathering wood for weeks.",
  "action": [
    {"type": "set_priorities", "priorities": {"gathering": 95, "building": 5}},
    {"type": "gather", "target": "wood", "amount": 500}  // Stockpile, not for specific build
  ]
}
```
*(Agent gathers 500 wood, deposits it, Executor queues another 500, repeat until 50,000)*

---

**The Key Difference**:
- **Talker**: "I see Luna, it's sunny, I'm comfortable" → social, contextual awareness
- **Executor**: "Plan to build tent and storage-chest, set building priority to 90" → strategic planning
- **Autonomic**: "Tent needs 5 wood + 10 cloth, I'll gather wood first" → tactical execution

Three layers working together!

## Decision Flow

### Example: Agent wakes up hungry

```
Tick 1000:
  Autonomic: hunger = 80 → seek_food (interrupts everything)
  Agent gathers berries → hunger = 20

Tick 1200:
  Autonomic: no critical needs
  Talker: Last call was 60s ago, extraversion = 0.7 → call Talker
    Response: set_priorities(social: 80, gathering: 20)
    Talker selects "talk" behavior (social priority highest)
  Agent starts talking to nearby agent

Tick 1400:
  Autonomic: no critical needs
  Talker: In active conversation, last call was 20s ago → call Talker
    Response: speaking "I found some great berries earlier!"
  Executor: Not called (agent busy talking)

Tick 1600:
  Autonomic: no critical needs
  Talker: Conversation ended
  Executor: Task completed (talk ended), last call was never → call Executor
    Response: [gather berries, gather berries, deposit_items]
  Agent starts gathering berries (first action in queue)
```

### Example: Talker changes goals, Executor responds

```
Tick 2000:
  Talker: Periodic call (5 minutes elapsed)
    Response: set_personal_goal("Build a village"), set_priorities(building: 90, gathering: 50)
  Executor: Not called this tick (Talker already ran)

Tick 2020:
  Executor: Goals changed (priorities updated), call Executor
    Response: plan_build(tent), [gather wood, gather cloth, build tent, create_memory]
  Agent starts gathering wood (first action in queue)
```

## Backward Compatibility

The implementation is fully backward compatible:

1. **Single LLM Mode**: If only `llmQueue` and `promptBuilder` are provided (no Talker/Executor builders), the system uses the original `LLMDecisionProcessor`
2. **Existing Code**: AgentBrainSystem doesn't need changes - it already uses DecisionProcessor
3. **Optional Migration**: Projects can upgrade to split architecture incrementally

## Tool Distribution

Based on the actual action definitions in `ActionDefinitions.ts`:

### Talker Tools (Social Category)

- **`talk`** - Start/join a conversation with nearby agents
- **`follow_agent`** - Follow someone
- **`call_meeting`** - Call a meeting to discuss something
- **`attend_meeting`** - Attend an ongoing meeting
- **`help`** - Help another agent with their task

### Executor Tools (Strategic Planning + Execution)

**Priority & Building:**
- **`set_priorities`** - Set task priorities (controls autonomic system focus)
- **`plan_build`** - Plan and queue building project (autonomic auto-gathers resources)
- **`build`** - Direct construction (requires building skill level 1)

**Gathering & Resources:**
- **`gather`** - Stockpile resources for large projects (gather amount, store in chest)
- **`pick`** - Pick up a single item nearby

**Farming:**
- **`till`** - Prepare soil for planting
- **`farm`** - Work on farming tasks
- **`plant`** - Plant seeds in tilled soil

**Exploration & Knowledge:**
- **`explore`** - Systematically explore unknown areas
- **`research`** - Conduct research at research building

**Animals:**
- **`tame_animal`** - Tame a wild animal
- **`house_animal`** - Lead tamed animal to housing
- **`hunt`** - Hunt wild animal for meat
- **`butcher`** - Butcher tame animal at butchering table

**Combat:**
- **`initiate_combat`** - Challenge another agent to combat (lethal or non-lethal)

## How `talk` Integrates with Conversation Scheduler

When the Talker outputs speech, it triggers the multi-party conversation system (defined in `CONVERSATION_SCHEDULER.md`):

**Conversation Creation Logic:**
1. **Talker speaks**: Talker LLM outputs `{"speaking": "Luna! The berries here are amazing!", "action": {"type": "talk"}}`
2. **Check for listeners**: Are there any agents within 15 tiles (hearing range)?
3. **No listeners**:
   - Agent speaks to themselves (no conversation created)
   - Speech happens, but no turn management needed
   - *"If an agent speaks in the woods and there's no one around to hear it, don't create a conversation"*
4. **Listeners exist** (overlapping bubbles):
   - **Create conversation** to mediate turns
   - All nearby agents (within 15 tiles) **hear** the speech
   - Each listener's **Talker LLM gets called** with:
     - The speech they heard
     - Their distance from speaker
     - Their personality (extraversion affects response likelihood)
   - **Response likelihood**: Introverts less likely to respond if speaker is far away (near 15 tiles), extroverts more likely to respond even at distance
   - **Personality-driven responses**: Each agent decides whether to respond based on their extraversion and distance
5. **Someone responds**: Conversation continues with turn-based management
6. **No one responds**: Conversation ends (was just a monologue)

**Turn Management (When Conversation Active):**
1. **Turn-based speaking**: Token count determines speech duration (2 tokens/second)
2. **Predictive LLM calls**: Next potential speaker's Talker LLM called ~1 second before current speaker finishes
3. **All nearby Talkers get opportunity**: When someone speaks, all agents within 15 tiles get their Talker called
4. **Proximity management**: Agents who walk >15 tiles away automatically leave conversation
5. **Talker LLM locked**: While in active conversation, agent's Talker focused on conversation only

**Example 1: No Listeners (No Conversation Created)**
```
Aria (alone in forest): "These berries are amazing!" (15 tokens = 7.5 seconds)
  → Check for listeners within 15 tiles: NONE
  → No conversation created
  → Aria just speaks to herself, continues wandering
```

**Example 2: Listeners Exist (Conversation Created)**
```
Aria: "Luna! The berries here are amazing!" (20 tokens = 10 seconds)
  → Check for listeners: Luna (8 tiles away), Kai (12 tiles away)
  → CREATE CONVERSATION (to mediate turns)
  → Luna's Talker called at 9 seconds: Decides to respond
  → Kai's Talker called at 9 seconds: Decides to respond

Luna: "Really? I've been looking for good berries all day!" (24 tokens = 12 seconds)
  → All nearby Talkers called at 11 seconds
  → Kai decides to respond

Kai: "Mind if I join you? I could use some berry-picking tips!" (28 tokens = 14 seconds)
  → All nearby Talkers called at 13 seconds
  → Luna decides to respond, Aria decides to respond

(Conversation continues with turn management...)
```

**Example 3: Listeners Exist, No One Responds (Monologue)**
```
Aria: "I love these berries!" (12 tokens = 6 seconds)
  → Check for listeners: Luna (10 tiles away)
  → CREATE CONVERSATION (to mediate turns)
  → Luna's Talker called at 5 seconds: Decides NOT to respond (she's busy gathering)

(No response after 10 seconds)
  → Conversation ends
  → Aria continues wandering
```

**Example 4: Overlapping Bubbles (Personality-Driven Responses)**
```
Aria (extrovert, 0.8): "Anyone know where the best berries are?" (18 tokens = 9 seconds)
  → Check for listeners:
    - Luna (3 tiles away, extrovert 0.7): VERY LIKELY to respond (close + extroverted)
    - Kai (14 tiles away, introvert 0.3): UNLIKELY to respond (far + introverted)
    - Zara (8 tiles away, moderate 0.5): MAYBE responds (moderate distance + moderate personality)

  → CREATE CONVERSATION
  → Luna's Talker called at 8 seconds: "I found some great ones by the river!" (responds)
  → Kai's Talker called at 8 seconds: (thinks: "Too far away, I'll keep working") (no response)
  → Zara's Talker called at 8 seconds: "The forest has good patches too." (responds)

Luna: "I found some great ones by the river!" (16 tokens = 8 seconds)
  → All nearby Talkers called
  → Kai now hears from 14 tiles but still doesn't respond (introverted)

(Conversation continues between Aria, Luna, and Zara)
(Kai continues working alone, despite hearing them)
```

**Integration with Extroversion-Based Forces:**
- Extroverts (>0.6) attracted to large conversations (4+ people) with force magnitude 0.3
- Introverts (<0.4) repelled by large crowds (4+ people) but fine with 1:1 or small groups
- Creates natural social dynamics where extroverts gravitate to parties, introverts seek quieter interactions

## Next Steps

To use the split architecture:

1. **Create TalkerPromptBuilder** implementation
   - Focus on personality, social context, conversation
   - Include Talker tools only (talk, follow_agent, call_meeting, attend_meeting, help)

2. **Create ExecutorPromptBuilder** implementation
   - Focus on goals, resources, task planning
   - Full action toolset

3. **Update LLM Queue** to support `llmType` parameter
   - Track separate decisions for Talker and Executor
   - Apply appropriate priorities/rate limits

4. **Update AgentBrainSystem** constructor to pass Talker/Executor builders
   - Or keep using single LLM until ready to migrate

5. **Integrate with Conversation Scheduler** (from CONVERSATION_SCHEDULER.md)
   - Turn-based speech system
   - Extroversion-based force vectors
   - Multi-party conversation support

## Benefits

1. **Separation of Concerns**:
   - **Autonomic**: Tactical execution (zero latency, knows building costs, gathers resources)
   - **Talker**: Social/goal-setting (fast, personality-driven, environmental awareness)
   - **Executor**: Strategic planning (slow, task-driven, sets priorities and plans builds)

2. **Better Cadence**:
   - Talker calls frequently for extroverts (30s), rarely for introverts (2m)
   - Executor only calls when tasks complete or goals change
   - Autonomic runs every tick (zero LLM cost)

3. **Reduced LLM Costs**:
   - Talker prompts: smaller (environmental awareness, no building costs)
   - Executor prompts: strategic (what to build, not how to gather resources)
   - Autonomic handles all tactical decisions (free)

4. **Natural Conversation**:
   - Talker can run during tasks without interrupting
   - Enables conversation scheduler's turn-based speech

5. **Goal-Driven Behavior**:
   - Talker sets goals based on personality
   - Executor reads those goals and plans accordingly

## Summary

The Talker/Executor split successfully implements the three-layer architecture:
- **Autonomic** (reflexes, no LLM)
- **Talker** (conversation, goals, social)
- **Executor** (task planning, multi-step actions)

All core implementation is complete. The system is backward compatible and ready for integration with the conversation scheduler.
