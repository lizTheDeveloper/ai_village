# Simulation Fidelity Specification

> **Purpose**: Define how LLM agent simulation fidelity scales based on relevance, enabling large populations without linear LLM cost growth.

## Core Principle

All agents are LLM agents. There are no scripted NPCs. However, not all agents need full LLM inference every tick. Fidelity tiers determine:
1. How often an agent gets LLM decision-making
2. How detailed their prompts/context are
3. What gets recorded to memory
4. How their needs/state evolve

---

## Fidelity Tiers

### Tier 0: Full Fidelity

**When**: Agent is in active focus
- Currently in conversation with another Tier 0 agent
- Performing complex multi-step task
- Experiencing significant event (injury, discovery, conflict)
- Explicitly observed by player/camera

**Simulation**:
```typescript
interface FullFidelityConfig {
  decisionFrequency: 'every_decision_cycle';  // ~1-5 seconds game time
  contextWindow: 'full';                       // Complete recent memory + surroundings
  memoryRecording: 'detailed';                 // Full episodic memory
  needsSimulation: 'continuous';               // Tick-by-tick decay
  socialAwareness: 'full';                     // All nearby agents visible
  llmModel: 'primary';                         // Best available model
}
```

**LLM Prompt Includes**:
- Full personality and background
- Recent episodic memories (last N interactions)
- Current goals and plans
- Detailed surroundings description
- All visible agents with relationship context
- Current needs state with urgency levels

---

### Tier 1: Active Fidelity

**When**: Agent is nearby or recently relevant
- Within proximity radius of Tier 0 agent
- Interacted with Tier 0 agent in last N game-hours
- Has pending social obligation (promised to meet, owes favor)
- In same building/area as Tier 0 agent

**Simulation**:
```typescript
interface ActiveFidelityConfig {
  decisionFrequency: 'periodic';        // Every 30-60 seconds game time
  contextWindow: 'reduced';             // Key memories + immediate surroundings
  memoryRecording: 'significant';       // Only notable events
  needsSimulation: 'periodic';          // Every N ticks, batch update
  socialAwareness: 'nearby';            // Only adjacent agents
  llmModel: 'primary';                  // Same model, less frequent
}
```

**LLM Prompt Includes**:
- Core personality traits (compressed)
- Current goal only
- Immediate surroundings (simplified)
- Urgent needs only
- Key recent events

---

### Tier 2: Background Fidelity

**When**: Agent exists but isn't immediately relevant
- In the village but not near any Tier 0/1 agents
- No recent interactions with relevant agents
- Performing routine daily activities

**Simulation**:
```typescript
interface BackgroundFidelityConfig {
  decisionFrequency: 'rare';            // Every 5-15 minutes game time
  contextWindow: 'minimal';             // Current goal + critical needs
  memoryRecording: 'sparse';            // Only major events
  needsSimulation: 'statistical';       // Probabilistic batch updates
  socialAwareness: 'none';              // Only triggered by events
  llmModel: 'fast';                     // Smaller/faster model acceptable
}
```

**LLM Prompt Includes**:
- One-line personality summary
- Current routine/goal
- Any critical needs (starving, exhausted)
- Binary decision framing ("continue routine or interrupt?")

**Fallback Behavior** (between LLM calls):
- Follow current routine deterministically
- Satisfy needs via nearest valid option
- Move toward current goal location
- No new social initiations

---

### Tier 3: Statistical Fidelity

**When**: Agent is distant or hibernated
- In different region/village
- Hasn't been relevant for extended period
- World is simulating while player away

**Simulation**:
```typescript
interface StatisticalFidelityConfig {
  decisionFrequency: 'none';            // No LLM calls
  contextWindow: 'none';
  memoryRecording: 'outcomes_only';     // "Worked at farm", "Had conversation"
  needsSimulation: 'aggregate';         // Daily summary calculations
  socialAwareness: 'none';
  llmModel: 'none';
}
```

**Statistical Simulation**:
```typescript
interface DailySummary {
  // Calculated without LLM
  needsSatisfaction: {
    hunger: 'satisfied' | 'partial' | 'unmet';
    energy: 'satisfied' | 'partial' | 'unmet';
    social: 'satisfied' | 'partial' | 'unmet';
    shelter: 'satisfied' | 'partial' | 'unmet';
  };

  // Probabilistic outcomes based on skills + resources
  workCompleted: boolean;
  socialInteractions: number;           // Count only, no detail
  notableEvents: StatisticalEvent[];    // Injury, illness, discovery (rare)

  // Location at end of day
  expectedLocation: EntityId;
}
```

**Catch-Up Simulation**: When agent transitions to higher tier:
1. Generate summary of time at Tier 3
2. Single LLM call to "journal" the period
3. Key events become memories
4. Relationships adjust based on interaction counts

---

## Fidelity Component

```typescript
interface FidelityComponent extends Component {
  type: 'fidelity';

  // Current tier (0-3)
  tier: FidelityTier;

  // When tier was last evaluated
  lastEvaluation: Tick;

  // Tick when last LLM decision was made
  lastDecision: Tick;

  // Accumulated "relevance" score for tier transitions
  relevanceScore: number;

  // Reason for current tier (debugging)
  tierReason: TierReason;

  // Scheduled next decision (if not every tick)
  nextScheduledDecision: Tick | null;

  // Catch-up data when returning from Tier 3
  pendingCatchUp: CatchUpData | null;
}

type FidelityTier = 0 | 1 | 2 | 3;

type TierReason =
  | { type: 'conversation'; withAgent: EntityId }
  | { type: 'proximity'; toAgent: EntityId; distance: number }
  | { type: 'recent_interaction'; withAgent: EntityId; ticksAgo: number }
  | { type: 'significant_event'; event: string }
  | { type: 'player_focus' }
  | { type: 'routine' }
  | { type: 'distant' }
  | { type: 'hibernated' };

interface CatchUpData {
  startTick: Tick;
  dailySummaries: DailySummary[];
  pendingJournaling: boolean;
}
```

---

## Fidelity Evaluation System

```typescript
interface FidelitySystem extends System {
  id: 'fidelity';
  priority: 50;  // Early in tick, before decisions
  requiredComponents: ['agent', 'fidelity', 'position'];
}
```

### Evaluation Logic

```typescript
function evaluateFidelity(agent: Entity, world: World): FidelityTier {
  const position = agent.components.get('position') as PositionComponent;
  const fidelity = agent.components.get('fidelity') as FidelityComponent;

  // Tier 0: Active focus checks
  if (isInConversation(agent, world)) {
    return 0;  // Conversation always Tier 0
  }

  if (isExperiencingSignificantEvent(agent, world)) {
    return 0;
  }

  if (isPlayerFocused(agent, world)) {
    return 0;
  }

  // Tier 1: Proximity and recency
  const nearbyTier0 = findNearbyAgentsAtTier(world, position, 0, PROXIMITY_RADIUS);
  if (nearbyTier0.length > 0) {
    return 1;
  }

  const recentInteraction = getLastInteractionWith(agent, world, getTier0Agents(world));
  if (recentInteraction && world.tick - recentInteraction.tick < RECENCY_THRESHOLD) {
    return 1;
  }

  if (hasPendingSocialObligation(agent, world)) {
    return 1;
  }

  // Tier 2: In active world region
  if (isInActiveRegion(position, world)) {
    return 2;
  }

  // Tier 3: Everything else
  return 3;
}
```

### Tier Transition Events

```typescript
// Emitted when agent changes fidelity tier
interface FidelityChangedEvent extends GameEvent {
  type: 'fidelity_changed';
  data: {
    agentId: EntityId;
    previousTier: FidelityTier;
    newTier: FidelityTier;
    reason: TierReason;
  };
}
```

---

## Decision Scheduling

### Decision Budget

Each tick has a limited LLM decision budget:

```typescript
interface DecisionBudget {
  tier0PerTick: number;      // All Tier 0 agents get decisions (no limit)
  tier1PerTick: number;      // Max Tier 1 decisions per tick (e.g., 3)
  tier2PerTick: number;      // Max Tier 2 decisions per tick (e.g., 1)

  // If budget exceeded, decisions queue to next tick
  // Priority: Tier 0 > Tier 1 (oldest first) > Tier 2 (oldest first)
}
```

### Decision Queue

```typescript
interface DecisionScheduler {
  // Queue a decision request
  requestDecision(agentId: EntityId, priority: FidelityTier): void;

  // Get agents who should decide this tick
  getScheduledDecisions(budget: DecisionBudget): EntityId[];

  // Mark decision complete
  completeDecision(agentId: EntityId): void;
}
```

---

## Needs Simulation by Tier

| Need | Tier 0 | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|--------|
| Hunger | -0.1/tick | -0.1/tick (batched) | -1/minute | Daily calc |
| Energy | -0.05/tick | -0.05/tick (batched) | -0.5/minute | Daily calc |
| Social | Event-based | Event-based | -0.2/hour | Daily calc |
| Shelter | Continuous | Continuous | Hourly check | Daily calc |

### Batch Needs Update

```typescript
// For Tier 1-2, instead of per-tick updates:
function batchNeedsUpdate(agent: Entity, ticksElapsed: number): void {
  const needs = agent.components.get('needs') as NeedsComponent;

  needs.hunger -= HUNGER_RATE * ticksElapsed;
  needs.energy -= ENERGY_RATE * ticksElapsed;

  // Clamp and check thresholds
  if (needs.hunger < CRITICAL_THRESHOLD) {
    emitEvent('needs_critical', { agentId: agent.id, need: 'hunger' });
    // Critical needs can bump agent to higher tier
  }
}
```

---

## Memory Recording by Tier

| Memory Type | Tier 0 | Tier 1 | Tier 2 | Tier 3 |
|-------------|--------|--------|--------|--------|
| Conversations | Full transcript | Key points | "Had conversation with X" | Count only |
| Observations | Detailed | Notable only | None | None |
| Actions taken | All | Significant | Routine summary | Outcome only |
| Emotional states | Continuous | Snapshots | None | None |
| New relationships | Full context | Basic | Count only | Count only |

---

## Catch-Up Protocol

When agent transitions from Tier 3 to higher tier:

```typescript
async function performCatchUp(agent: Entity, catchUpData: CatchUpData): Promise<void> {
  // 1. Calculate time elapsed
  const daysElapsed = catchUpData.dailySummaries.length;

  // 2. Summarize statistical period
  const summary = summarizePeriod(catchUpData.dailySummaries);

  // 3. Single LLM call to generate memories
  const journalPrompt = buildCatchUpPrompt(agent, summary, daysElapsed);
  const journalResponse = await llm.complete(journalPrompt);

  // 4. Parse response into memories
  const memories = parseJournalToMemories(journalResponse);

  // 5. Add memories to agent
  const memoryComponent = agent.components.get('memory') as MemoryComponent;
  memories.forEach(m => memoryComponent.episodes.push(m));

  // 6. Clear catch-up data
  agent.components.get('fidelity').pendingCatchUp = null;
}
```

### Catch-Up Prompt Template

```
You are {agent_name}. You've been going about your daily life in the village.

Time period: {days_elapsed} days
Your routine: {current_routine}
Your personality: {personality_summary}

During this time:
- Work: {work_summary}
- Meals: {meals_summary}
- Social: Had {interaction_count} conversations
- Sleep: {sleep_summary}
- Notable: {notable_events}

Write a brief journal entry (2-3 sentences) capturing the essence of this period.
What stood out? How did you feel? Any new thoughts about your life or relationships?
```

---

## Configuration

```typescript
interface FidelityConfig {
  // Radius within which agents are "nearby" (tiles)
  proximityRadius: number;              // Default: 15

  // Ticks since interaction to remain Tier 1
  recencyThreshold: Tick;               // Default: 7200 (1 game-hour at 20 TPS)

  // How often to re-evaluate tier (ticks)
  evaluationInterval: Tick;             // Default: 100 (5 seconds)

  // Decision frequency by tier (ticks between decisions)
  decisionIntervals: {
    tier0: Tick;                        // Default: 20-100 (1-5 seconds)
    tier1: Tick;                        // Default: 600-1200 (30-60 seconds)
    tier2: Tick;                        // Default: 6000-18000 (5-15 minutes)
  };

  // LLM budget per tick
  decisionBudget: DecisionBudget;

  // Whether to use faster model for Tier 2
  useFastModelForTier2: boolean;        // Default: true
}
```

---

## Integration Points

### With Decision System

```typescript
// In AgentDecisionSystem.update():
function update(world: World, agents: Entity[]): void {
  const scheduler = world.getService<DecisionScheduler>('decisionScheduler');
  const scheduled = scheduler.getScheduledDecisions(this.budget);

  for (const agentId of scheduled) {
    const agent = world.query.get(agentId);
    const fidelity = agent.components.get('fidelity') as FidelityComponent;

    const prompt = buildPromptForTier(agent, fidelity.tier);
    const model = fidelity.tier === 2 ? 'fast' : 'primary';

    // Queue LLM request (batched)
    this.llmBatcher.queue(agentId, prompt, model);
  }
}
```

### With Memory System

```typescript
// In MemorySystem, check tier before recording:
function recordMemory(agent: Entity, event: MemorableEvent): void {
  const fidelity = agent.components.get('fidelity') as FidelityComponent;
  const recording = MEMORY_RECORDING_RULES[fidelity.tier];

  if (shouldRecord(event, recording)) {
    const detail = getDetailLevel(event, recording);
    const memory = createMemory(event, detail);
    addMemory(agent, memory);
  }
}
```

### With Needs System

```typescript
// In NeedsSystem, batch updates for lower tiers:
function update(world: World, agents: Entity[]): void {
  for (const agent of agents) {
    const fidelity = agent.components.get('fidelity') as FidelityComponent;

    if (fidelity.tier === 0) {
      updateNeedsContinuous(agent, world.deltaTime);
    } else if (fidelity.tier <= 2) {
      // Check if batch update is due
      if (isBatchUpdateDue(agent, fidelity.tier)) {
        const elapsed = getTicksSinceLastUpdate(agent);
        batchNeedsUpdate(agent, elapsed);
      }
    }
    // Tier 3 handled by statistical simulation
  }
}
```

---

## Performance Expectations

| Population | Tier 0 | Tier 1 | Tier 2 | Tier 3 | LLM Calls/Min |
|------------|--------|--------|--------|--------|---------------|
| 10 agents  | 2      | 3      | 5      | 0      | ~30-50        |
| 50 agents  | 2      | 5      | 20     | 23     | ~40-60        |
| 200 agents | 3      | 8      | 40     | 149    | ~50-80        |
| 1000 agents| 5      | 15     | 80     | 900    | ~60-100       |

Assumes:
- Tier 0: 12 decisions/minute
- Tier 1: 1-2 decisions/minute
- Tier 2: 0.1-0.2 decisions/minute
- Tier 3: 0 decisions/minute (statistical only)

---

## Future Considerations

1. **Adaptive Budgets**: Adjust decision budget based on current LLM latency/cost
2. **Importance Scoring**: Some agents more "important" than others (mayor vs farmer)
3. **Event-Driven Promotion**: Significant world events bump regional agents to higher tiers
4. **Player Attention**: Track what player is looking at for Tier 0 assignment
5. **Relationship Chains**: Friend-of-friend proximity bumps (A talks to B, B's friends become Tier 1)
