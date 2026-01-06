# Autonomic vs. LLM Behavior Analysis

## Architecture Overview

### Two-Layer Decision System

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentBrainSystem                             │
│                                                                   │
│  Layer 1: Autonomic System (Fast Reflexes)                      │
│  ├─ Priority 100: Critical survival (collapse, forced_sleep)    │
│  ├─ Priority 85-90: Danger (flee_to_home, low energy, cold)     │
│  ├─ Priority 70-80: Important (bedtime, critical hunger)        │
│  ├─ Priority 30-50: Moderate (hunger, high sleep drive)         │
│  └─ Priority 10: Low (boredom → wander)                         │
│      ↓                                                           │
│  Layer 2: Behavior Queue (Multi-step plans)                     │
│      ↓                                                           │
│  Layer 3: LLM Decision Processor (Complex decisions)            │
│  ├─ Checks llmCooldown (250ms minimum between requests)         │
│  ├─ Smart calling (task complete, idle, periodic)               │
│  ├─ Rate limiting (real-time ms tracking)                       │
│  └─ Individual prompts per agent (NO batching)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Autonomic System (No LLM)

**File:** `packages/core/src/decision/AutonomicSystem.ts`

**Purpose:** Fast survival reflexes that override LLM decisions

**Priority Scale:**
- **100+**: Critical survival (collapse, forced_sleep)
- **80-99**: Danger (dangerously cold/hot, critical hunger, flee_to_home)
- **50-79**: Important (bedtime)
- **20-49**: Moderate (hunger, high sleep drive)
- **10**: Low (boredom → wander/explore)

**Triggers:**
- Energy <= 0 → `forced_sleep` (priority 100)
- Energy < 0.15 → `seek_sleep` (priority 85)
- Sleep drive > 85 → `forced_sleep` (priority 100)
- Temperature dangerously_cold → `seek_warmth` (priority 90)
- Health < 0.3 AND has home → `flee_to_home` (priority 85)
- Bedtime AND sleep drive >= 50 → `seek_sleep` (priority 70)
- Hunger < 0.1 → `seek_food` (priority 80)
- Hunger < 0.6 → `seek_food` (priority 40)
- Idle 100+ ticks → `wander` (priority 10)
- Wander 200+ ticks → `explore` (priority 15)

**Key Features:**
- Zero LLM calls
- Pure logic based on component state (needs, circadian, temperature)
- Can interrupt any lower-priority behavior
- Critical behaviors (`forced_sleep`, `flee_danger`) cannot be interrupted

## LLM Decision Processor

**File:** `packages/core/src/decision/LLMDecisionProcessor.ts`

**Purpose:** Complex decision making using language models

**Rate Limiting:**
- `llmRequestCooldownMs`: 250ms minimum between LLM requests (wall-clock time)
- `llmCooldown`: 1200 ticks (1 minute at 20 TPS) after each LLM decision
- Checks `Date.now() - lastLLMRequestTime >= llmRequestCooldownMs` before calling

**Smart Calling Strategy:**
Calls LLM only when:
1. **Task completion**: Agent finished current behavior (`behaviorCompleted = true`)
2. **Idle**: Agent in idle/wander/rest with no active work
3. **Periodic**: Based on agent tier config (e.g., every 300 seconds)

**Agent Tiers:**
- **Full tier**: Always uses LLM (periodic + idle + task complete)
- **Autonomic tier**: Only uses LLM when triggered by player interaction (60 second timeout)

**Current Implementation:**
- **One prompt per agent** (line 490: `promptBuilder.buildPrompt(entity, world)`)
- **Individual LLM calls** (line 569: `requestDecision(entity.id, prompt, ...)`)
- **No batching** of multiple agents into one prompt

## LLM Queue Interface

```typescript
interface LLMDecisionQueue {
  getDecision(entityId: string): string | null;
  requestDecision(entityId: string, prompt: string, customConfig?: CustomLLMConfig): Promise<string>;
}
```

**Current Flow:**
1. Agent thinks → checks `shouldCallLLM()`
2. If yes → build prompt for THIS agent
3. Enqueue: `llmDecisionQueue.requestDecision(entity.id, prompt)`
4. Wait for LLM response
5. Next tick: check `llmDecisionQueue.getDecision(entity.id)`
6. Parse response → apply behavior

## Rate Limit Analysis

### Cerebras/Groq Rate Limits
- **1000 requests/minute** = 16.6 requests/second
- This is **high enough** for individual agent prompts
- No need to batch multiple agents into one prompt

### Performance Considerations

**Why NOT batch multiple agents into one prompt:**

1. **LLM Performance Degradation**
   - Combining 10 agents into one prompt confuses the model
   - Model can't track individual agent state properly
   - Responses become inconsistent and low-quality

2. **Rate Limit Doesn't Help**
   - Providers count per "generation", not per HTTP request
   - Batching 10 agents into one prompt = still 1 request, but 10× worse quality

3. **Complexity Explosion**
   - Prompt becomes massive (10 agents × context = huge)
   - Parsing responses becomes error-prone
   - Debugging individual agent decisions becomes impossible

**Better Approach: Queue-Based Scheduling**

Instead of batching agents into one prompt, use a **priority queue**:
- Queue all agents needing LLM decisions
- Sort by priority (combat > building > idle)
- Send one prompt at a time (or parallel if API supports)
- Respect rate limit (max 16.6 requests/second)
- Use lazy prompt rendering (build prompts at send time, not enqueue time)

## Scheduling Requirements (Revised)

Based on feedback that rate limits are "high enough" and batching degrades performance:

### What LLM Scheduler SHOULD Do:

1. **Priority Queue**
   - Sort agents by urgency (combat, danger, task completion, idle)
   - Process high-priority agents first

2. **Rate Limit Respect**
   - Track requests/minute (1000/min = 16.6/sec)
   - Don't exceed provider limits
   - Wait if at limit (don't throttle)

3. **Lazy Prompt Rendering**
   - Store `promptBuilder` function at enqueue time
   - Build prompt at send time (when credits available)
   - Ensures agent state is fresh (not stale from 1.5 seconds ago)

4. **Fair Capacity Distribution**
   - If multiple games running: divide 1000/min equally
   - Each game gets fair share of LLM credits

5. **Individual Prompts**
   - **One agent = one prompt** (current design)
   - **NO batching** of multiple agents into one LLM call
   - Keeps LLM performance high

### What LLM Scheduler SHOULD NOT Do:

1. ❌ **Batch multiple agents into one prompt**
   - Degrades LLM performance
   - Doesn't help rate limits (providers count per generation)

2. ❌ **Send stale prompts**
   - Don't build prompts at enqueue time
   - Build at send time for fresh state

## Current Gaps

### 1. No Global Queue
Currently, each agent independently checks `shouldCallLLM()` and calls `requestDecision()`. There's no central queue coordinating requests.

**Problem:**
- 100 agents × think at same time = 100 simultaneous LLM requests
- Can overwhelm rate limits
- No priority ordering (urgent agents wait same as idle agents)

### 2. No Lazy Prompt Rendering
Prompts are built immediately when `shouldCallLLM()` returns true (line 490).

**Problem:**
- If request queued for 1.5 seconds waiting for credits, prompt reflects state from 1.5s ago
- Agent may have moved, eaten, or changed state
- LLM gets stale data

### 3. No Multi-Game Capacity Sharing
If running multiple game instances, each independently hammers the LLM API.

**Problem:**
- No fair distribution of 1000/min across games
- One game can starve others

### 4. Prompt Doesn't Encourage Multi-Step Plans
**CRITICAL ISSUE:** The current prompt template (`StructuredPromptBuilder.ts:2128-2144`) only asks for a SINGLE action:

```json
{
  "speaking": "what you say out loud",
  "action": {
    "type": "action_name",
    "target": "optional target"
  }
}
```

**But the system SUPPORTS multi-step plans!** (`LLMDecisionProcessor.ts:848-856`):
```typescript
// Check if action is a plan array (multi-step)
if (Array.isArray(action) && action.length > 0) {
  // Multi-step plan - convert to behavior queue
  behaviorQueue = this.convertPlanToQueue(action as ParsedAction[], speaking);
}
```

**Problem:**
- Agents should take **multiple actions per turn** (like Dwarf Fortress)
- One LLM call should generate a full turn's worth of queued behaviors
- Example: "Walk to tree → chop tree → carry wood → deposit at stockpile" = ONE turn
- Currently: Agents only get ONE action per LLM call, need 4 separate LLM calls for the above

**This undermines the ENTIRE reason for individual agent prompts:**
- If we batch 10 agents into one prompt, LLM can't generate good multi-step plans for each
- But if we keep individual prompts AND only get 1 action per call, we're wasting LLM credits
- **We need: individual prompts that generate multi-step plans**

**Solution:**
Update response format to support action arrays:
```json
{
  "speaking": "I'm going to gather wood and build a campfire",
  "action": [
    {"type": "gather", "target": "wood", "amount": 20},
    {"type": "navigate", "target": "home"},
    {"type": "build", "building": "campfire"}
  ]
}
```

OR allow both single action and array:
```json
// Single action (simple case)
{"speaking": "", "action": {"type": "wander"}}

// Multi-step plan (complex case)
{"speaking": "Time to build!", "action": [
  {"type": "gather", "target": "wood", "amount": 20},
  {"type": "gather", "target": "stone", "amount": 10},
  {"type": "build", "building": "campfire"}
]}
```

## Proposed LLM Scheduler Design

```typescript
class LLMRequestScheduler {
  private queue: PriorityQueue<LLMRequest>;
  private availableCredits: number = 1000; // requests/minute
  private lastWindowStart: number = Date.now();

  /**
   * Enqueue an LLM request with lazy prompt builder.
   */
  enqueue(request: {
    agentId: string;
    universeId: string;
    promptBuilder: (agent: Agent, world: World) => string;  // ✅ LAZY!
    priority: number;
    onComplete: (response: string) => void;
  }): void {
    this.queue.push(request);
  }

  /**
   * Process queue - send requests respecting rate limits.
   */
  private async processQueue(): void {
    // Refresh credits if window elapsed
    if (Date.now() - this.lastWindowStart >= 60000) {
      this.availableCredits = 1000;
      this.lastWindowStart = Date.now();
    }

    // Send requests up to credit limit
    while (this.availableCredits > 0 && !this.queue.isEmpty()) {
      const request = this.queue.pop(); // Highest priority first

      // ✅ BUILD PROMPT NOW (not at enqueue time)
      const agent = world.getEntity(request.agentId);
      if (!agent) continue; // Agent deleted since enqueue

      const prompt = request.promptBuilder(agent, world); // FRESH state!

      // Send to LLM
      const response = await llmProvider.generate(prompt);
      this.availableCredits--;

      // Deliver response
      request.onComplete(response);
    }
  }
}
```

## Key Insights

1. **Autonomic handles survival, LLM handles strategy**
   - Autonomic: "I'm hungry, eat now" (fast, no LLM)
   - LLM: "Should I build a farm or explore for berries?" (slow, complex)

2. **Priority system prevents critical delays**
   - Autonomic can interrupt LLM decisions if survival needs arise
   - Combat/danger behaviors get processed before idle behaviors

3. **Rate limits are sufficient for individual prompts**
   - 1000/min = 16.6/sec = plenty for most games
   - No need to batch agents (degrades quality)

4. **Lazy rendering prevents stale state**
   - Build prompts when credits available, not when agent first thinks
   - Agent state is fresh (not 1.5 seconds old)

5. **Current gaps:**
   - No global queue (agents independently request)
   - No lazy prompt rendering (prompts built immediately)
   - No multi-game capacity sharing

## Next Steps

1. Implement `LLMRequestScheduler` in `@ai-village/llm` package
2. Replace direct `requestDecision()` calls with `scheduler.enqueue()`
3. Use lazy prompt builders (functions, not strings)
4. Add priority calculation based on agent state (combat > idle)
5. Add metrics tracking (queue size, wait times, credit usage)
