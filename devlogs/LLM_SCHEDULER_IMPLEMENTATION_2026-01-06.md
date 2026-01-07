# LLM Scheduler Implementation - 2026-01-06

## Summary

Implemented the LLM Scheduler to coordinate the three-layer LLM decision architecture. The scheduler intelligently routes agent decisions to the appropriate layer (Autonomic, Talker, or Executor) based on agent state and context, with configurable per-layer cooldowns to prevent excessive LLM calls.

## Work Completed

### 1. Created LLMScheduler (packages/llm/src/LLMScheduler.ts)

**371 lines** of layer coordination logic implementing:

- **Three-layer coordination**: Autonomic (Layer 1), Talker (Layer 2), Executor (Layer 3)
- **Context-aware layer selection**: Analyzes agent state to pick the right layer
- **Per-layer cooldown management**: Prevents excessive LLM calls (autonomic: 1s, talker: 5s, executor: 10s)
- **Priority-based routing**: Urgent decisions take precedence
- **Agent state tracking**: Tracks last invocation time per layer per agent
- **Configurable layer settings**: Cooldowns, priority, and enable/disable per layer

### 2. Exported LLMScheduler from LLM Package

**File**: `packages/llm/src/index.ts`

Added export:
```typescript
export * from './LLMScheduler';
```

### 3. Created Test Script (test-llm-scheduler.ts)

**280 lines** comprehensive test covering:

- Layer selection for critical needs → autonomic (urgency 10)
- Layer selection for active conversation → talker (urgency 8)
- Layer selection for task completion → executor (urgency 7)
- Layer selection for idle agent → executor (urgency 5)
- Request decision async method
- Cooldown enforcement
- Time until ready calculation
- Layer configuration validation
- Reset cooldowns functionality

**Test Results**: ✅ All 9 tests passed

## Architecture

### Layer Selection Priority

The scheduler uses a priority-based system to select the appropriate layer:

```
PRIORITY 1: Critical needs (hunger/energy/temp < 0.2) → Autonomic (urgency 10)
PRIORITY 2: Active conversation or heard speech → Talker (urgency 8)
PRIORITY 3: Nearby agents (potential interaction) → Talker (urgency 6)
PRIORITY 4: Task completed, needs new decision → Executor (urgency 7)
PRIORITY 5: Idle/wandering, needs planning → Executor (urgency 5)
PRIORITY 6: Needs satisfied (hunger/energy > 0.7) → Executor (urgency 4)
DEFAULT: Reflexive decision-making → Autonomic (urgency 3)
```

### Layer Cooldowns

Each layer has a different cooldown to balance responsiveness with cost:

- **Autonomic**: 1 second - Fast reflexive decisions for survival
- **Talker**: 5 seconds - Social interactions, conversations
- **Executor**: 10 seconds - Strategic planning, task execution

### Key API

```typescript
export class LLMScheduler {
  /**
   * Select which layer should handle this agent's decision
   */
  selectLayer(agent: Entity, world: World): LayerSelection;

  /**
   * Request a decision for an agent (async)
   * Automatically selects layer, checks cooldown, builds prompt, queues request
   */
  async requestDecision(
    agent: Entity,
    world: World
  ): Promise<{ layer: DecisionLayer; response: string; reason: string } | null>;

  /**
   * Check if a layer is ready to run (cooldown elapsed)
   */
  isLayerReady(agentId: string, layer: DecisionLayer): boolean;

  /**
   * Get time until layer is ready (ms)
   */
  getTimeUntilReady(agentId: string, layer: DecisionLayer): number;

  /**
   * Reset cooldowns for testing/special events
   */
  resetCooldowns(agentId: string, layer?: DecisionLayer): void;

  /**
   * Update layer configuration
   */
  setLayerConfig(layer: DecisionLayer, config: Partial<LayerConfig>): void;

  /**
   * Get layer configuration
   */
  getLayerConfig(layer: DecisionLayer): LayerConfig;
}
```

## Implementation Details

### Layer Selection Logic (selectLayer)

The `selectLayer` method analyzes agent components to determine the best layer:

```typescript
selectLayer(agent: Entity, world: World): LayerSelection {
  const needs = agent.components.get('needs') as NeedsComponent | undefined;
  const agentComp = agent.components.get('agent') as AgentComponent | undefined;
  const conversation = agent.components.get('conversation') as ConversationComponent | undefined;
  const vision = agent.components.get('vision') as VisionComponent | undefined;

  // PRIORITY 1: Critical needs (survival)
  if (needs) {
    const hunger = needs.hunger ?? 1;
    const energy = needs.energy ?? 1;
    const temperature = needs.temperature ?? 1;
    if (hunger < 0.2 || energy < 0.2 || temperature < 0.2) {
      return { layer: 'autonomic', reason: 'Critical needs', urgency: 10 };
    }
  }

  // PRIORITY 2: Active conversation
  if (conversation?.activeConversation || (vision?.heardSpeech && vision.heardSpeech.length > 0)) {
    return { layer: 'talker', reason: 'Active conversation', urgency: 8 };
  }

  // ... more priorities
}
```

### Decision Request Flow (requestDecision)

```typescript
async requestDecision(agent: Entity, world: World): Promise<{...} | null> {
  // 1. Select layer based on agent state
  const selection = this.selectLayer(agent, world);

  // 2. Check cooldown
  if (!this.isLayerReady(agent.id, selection.layer)) {
    return null; // Still on cooldown
  }

  // 3. Build prompt using selected layer's builder
  const prompt = this.buildPrompt(selection.layer, agent, world);

  // 4. Record invocation time
  const state = this.getAgentState(agent.id);
  state.lastInvocation[selection.layer] = Date.now();

  // 5. Queue decision with LLMDecisionQueue
  const response = await this.queue.requestDecision(agent.id, prompt);

  // 6. Return result with metadata
  return { layer: selection.layer, response, reason: selection.reason };
}
```

### Prompt Builder Routing (buildPrompt)

```typescript
buildPrompt(layer: DecisionLayer, agent: Entity, world: World): string {
  switch (layer) {
    case 'autonomic':
      return this.autonomicBuilder.buildPrompt(agent, world);
    case 'talker':
      return this.talkerBuilder.buildPrompt(agent, world);
    case 'executor':
      return this.executorBuilder.buildPrompt(agent, world);
    default:
      console.warn(`Unknown layer: ${layer}, falling back to autonomic`);
      return this.autonomicBuilder.buildPrompt(agent, world);
  }
}
```

### Agent State Tracking

The scheduler maintains per-agent state to track cooldowns:

```typescript
interface AgentLayerState {
  agentId: string;
  lastInvocation: Partial<Record<DecisionLayer, number>>; // Timestamp of last invocation
  pendingLayer: DecisionLayer | null; // Layer waiting to be invoked
}

private agentStates: Map<string, AgentLayerState> = new Map();
```

### Cooldown Management

```typescript
isLayerReady(agentId: string, layer: DecisionLayer): boolean {
  const config = this.layerConfig[layer];
  if (!config.enabled) return false;

  const state = this.getAgentState(agentId);
  const lastInvocation = state.lastInvocation[layer] ?? 0;
  const elapsed = Date.now() - lastInvocation;

  return elapsed >= config.cooldownMs;
}

getTimeUntilReady(agentId: string, layer: DecisionLayer): number {
  const config = this.layerConfig[layer];
  const state = this.getAgentState(agentId);
  const lastInvocation = state.lastInvocation[layer] ?? 0;
  const elapsed = Date.now() - lastInvocation;

  return Math.max(0, config.cooldownMs - elapsed);
}
```

### Cleanup for Long-Running Games

```typescript
/**
 * Clean up old agent states (call periodically to prevent memory leaks)
 */
cleanupOldStates(maxAgeMs: number = 300000): void {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [agentId, state] of this.agentStates.entries()) {
    // Get most recent invocation time across all layers
    const lastActivity = Math.max(
      state.lastInvocation.autonomic ?? 0,
      state.lastInvocation.talker ?? 0,
      state.lastInvocation.executor ?? 0
    );

    if (now - lastActivity > maxAgeMs) {
      toDelete.push(agentId);
    }
  }

  for (const agentId of toDelete) {
    this.agentStates.delete(agentId);
  }

  if (toDelete.length > 0) {
    console.log(`[LLMScheduler] Cleaned up ${toDelete.length} old agent states`);
  }
}
```

## Testing Results

All 9 tests passed successfully:

### Test 1: Layer Selection - Critical Needs ✅
- Agent with hunger = 0.1 (critical)
- Selected: autonomic, urgency 10
- Reason: "Critical needs (hunger/energy/temperature)"

### Test 2: Layer Selection - Active Conversation ✅
- Agent with active conversation component
- Selected: talker, urgency 8
- Reason: "Active conversation or heard speech"

### Test 3: Layer Selection - Task Completion ✅
- Agent with behaviorCompleted = true
- Selected: executor, urgency 7
- Reason: "Task completed, needs new strategic decision"

### Test 4: Layer Selection - Idle Agent ✅
- Agent with behavior = 'idle'
- Selected: executor, urgency 5
- Reason: "Idle/wandering, needs strategic planning"

### Test 5: Request Decision ✅
- Successfully requested decision via autonomic layer
- Mock queue received 1 call
- Response returned with correct metadata

### Test 6: Cooldown Enforcement ✅
- First request succeeded
- Immediate second request returned null (cooldown active)
- Cooldown correctly blocks rapid successive calls

### Test 7: Time Until Ready ✅
- Correctly calculated 1000ms remaining for autonomic layer
- Time decreases as cooldown elapses

### Test 8: Layer Configuration ✅
- Autonomic: 1000ms cooldown, priority 10, enabled
- Talker: 5000ms cooldown, priority 5, enabled
- Executor: 10000ms cooldown, priority 1, enabled

### Test 9: Reset Cooldowns ✅
- After reset, layer is immediately ready
- Useful for testing and special events

## Integration

### ScheduledDecisionProcessor Created

**File**: `packages/core/src/decision/ScheduledDecisionProcessor.ts` (220 lines)

Created a new decision processor that uses LLMScheduler for intelligent layer selection. This provides an alternative to the existing DecisionProcessor which runs layers sequentially.

**Key Features**:
- **Context-aware layer selection**: Uses LLMScheduler to pick the right layer based on agent state
- **Async API**: `processAsync()` properly handles LLM async calls
- **Backward compatible sync API**: `process()` for systems that can't use async (autonomic only)
- **Unified cooldown management**: Single scheduler manages all layer cooldowns

**API**:
```typescript
export class ScheduledDecisionProcessor {
  async processAsync(entity: Entity, world: World, agent: AgentComponent): Promise<ScheduledDecisionResult>;
  process(entity: Entity, world: World, agent: AgentComponent): ScheduledDecisionResult;
  getScheduler(): LLMScheduler;
  processAutonomic(entity: Entity): AutonomicResult | null;
}
```

**Exported from**: `packages/core/src/decision/index.ts`

### Comparison: DecisionProcessor vs ScheduledDecisionProcessor

| Feature | DecisionProcessor | ScheduledDecisionProcessor |
|---------|-------------------|----------------------------|
| Layer Selection | Sequential (Autonomic → Talker → Executor) | Context-aware (scheduler picks based on agent state) |
| Cooldown Management | Per-processor (TalkerLLMProcessor, ExecutorLLMProcessor) | Unified (LLMScheduler) |
| Cost Optimization | Runs both Talker and Executor if enabled | Only runs selected layer |
| API | Synchronous | Async (recommended) or Sync (autonomic only) |
| Integration | Tightly coupled to existing processors | Uses LLMScheduler for flexibility |

## Migration Complete

### Updated Files for LLM Scheduler Integration

**AgentBrainSystem.ts** (packages/core/src/systems/):
- Added optional `scheduledProcessor` parameter to constructor
- If provided, uses ScheduledDecisionProcessor instead of DecisionProcessor
- Maintains full backward compatibility with existing code

**registerAllSystems.ts** (packages/core/src/systems/):
- Added `scheduledProcessor?: unknown` to LLMDependencies interface
- Updated AgentBrainSystem registration to pass scheduledProcessor
- When scheduledProcessor is provided, agents use intelligent layer selection

**demo/src/main.ts**:
- Creates LLMScheduler when llmQueue is available
- Creates ScheduledDecisionProcessor wrapping the scheduler
- Passes scheduledProcessor to registerAllSystems
- Logs scheduler creation with cooldown info

### Migration Status

✅ **COMPLETE** - LLMScheduler is now active in the demo game

When the game starts with LLM enabled, you'll see:
```
[Main] Created LLMScheduler with intelligent layer selection
[Main] Layer cooldowns - Autonomic: 1s, Talker: 5s, Executor: 10s
```

The scheduler now routes agent decisions based on context:
- **Critical needs** (hunger/energy < 0.2) → Autonomic layer (instant, 1s cooldown)
- **Active conversation** → Talker layer (social, 5s cooldown)
- **Task completed or idle** → Executor layer (strategic, 10s cooldown)

## Files Changed

- `packages/llm/src/LLMScheduler.ts` (created, 371 lines)
- `packages/llm/src/index.ts` (added LLMScheduler export)
- `packages/core/src/decision/ScheduledDecisionProcessor.ts` (created, 220 lines)
- `packages/core/src/decision/index.ts` (added ScheduledDecisionProcessor export)
- `packages/core/src/systems/AgentBrainSystem.ts` (updated to accept scheduledProcessor)
- `packages/core/src/systems/registerAllSystems.ts` (added scheduledProcessor parameter)
- `demo/src/main.ts` (create and wire up LLMScheduler)
- `test-llm-scheduler.ts` (created, 280 lines)
- `devlogs/LLM_SCHEDULER_IMPLEMENTATION_2026-01-06.md` (this file)

## Integration Notes

### Usage Example 1: Direct LLMScheduler Usage

```typescript
import { LLMScheduler, LLMDecisionQueue } from '@ai-village/llm';

// Create queue and scheduler
const queue = new LLMDecisionQueue(provider);
const scheduler = new LLMScheduler(queue);

// In your AI system update loop:
async function updateAgent(agent: Entity, world: World) {
  const decision = await scheduler.requestDecision(agent, world);

  if (decision) {
    console.log(`Agent ${agent.id} → ${decision.layer} (${decision.reason})`);
    // Parse and execute decision.response
  } else {
    // Still on cooldown, skip this tick
  }
}
```

### Usage Example 2: ScheduledDecisionProcessor (Recommended)

```typescript
import { LLMScheduler, LLMDecisionQueue, TalkerPromptBuilder, ExecutorPromptBuilder } from '@ai-village/llm';
import { ScheduledDecisionProcessor } from '@ai-village/core';

// Setup (in game initialization)
const queue = new LLMDecisionQueue(provider);
const scheduler = new LLMScheduler(queue);
const processor = new ScheduledDecisionProcessor(scheduler);

// In AgentBrainSystem update loop:
export class AgentBrainSystem implements System {
  // ... other system code ...

  async update(world: World, deltaTime: number): Promise<void> {
    const entities = world.query().with('agent').executeEntities();

    for (const entity of entities) {
      const agent = entity.components.get('agent') as AgentComponent;

      // Use async processing for full scheduler functionality
      const result = await processor.processAsync(entity, world, agent);

      if (result.changed) {
        console.log(`[AgentBrain] ${entity.id} → ${result.layer}: ${result.behavior}`);
        console.log(`  Reason: ${result.reason}`);
        console.log(`  Source: ${result.source}`);
      }
    }
  }
}
```

### Usage Example 3: Mixed Approach (Systems vs Direct)

For systems that need synchronous updates, use the sync API for autonomic only:

```typescript
export class AgentBrainSystem implements System {
  private processor: ScheduledDecisionProcessor;
  private pendingDecisions: Map<string, Promise<ScheduledDecisionResult>> = new Map();

  update(world: World, deltaTime: number): void {
    const entities = world.query().with('agent').executeEntities();

    for (const entity of entities) {
      const agent = entity.components.get('agent') as AgentComponent;

      // Check if there's a pending LLM decision
      const pending = this.pendingDecisions.get(entity.id);
      if (pending) {
        // Check if promise resolved (non-blocking)
        Promise.race([pending, Promise.resolve(null)])
          .then(result => {
            if (result && result.changed) {
              console.log(`[AgentBrain] ${entity.id} completed ${result.layer} decision`);
              this.pendingDecisions.delete(entity.id);
            }
          });
        continue; // Skip this tick, decision pending
      }

      // Process synchronously (autonomic only)
      const syncResult = this.processor.process(entity, world, agent);

      if (syncResult.changed) {
        console.log(`[AgentBrain] ${entity.id} → autonomic: ${syncResult.behavior}`);
        continue;
      }

      // Queue async LLM decision (non-blocking)
      if (agent.useLLM) {
        const promise = this.processor.processAsync(entity, world, agent);
        this.pendingDecisions.set(entity.id, promise);
      }
    }
  }
}
```

### Configuration Example

```typescript
// Customize layer settings
scheduler.setLayerConfig('autonomic', {
  cooldownMs: 500, // Faster reflexive responses
  priority: 10,
  enabled: true,
});

scheduler.setLayerConfig('executor', {
  cooldownMs: 30000, // Slower strategic planning (30s)
  priority: 1,
  enabled: true,
});
```

### Cleanup for Long-Running Games

```typescript
// Call periodically (e.g., every 5 minutes)
setInterval(() => {
  scheduler.cleanupOldStates(300000); // Remove states inactive for 5+ minutes
}, 300000);
```

## Next Steps

The LLM scheduler is now complete and ready for integration. Possible next steps:

1. **Integrate into AISystem**: Replace direct LLMDecisionQueue calls with LLMScheduler
2. **Add metrics**: Track layer selection distribution, cooldown hits, average urgency
3. **Expose via DevPanel**: Show current layer for selected agent, time until ready
4. **Tune cooldowns**: Adjust based on real-world gameplay and LLM costs
5. **Add layer override**: Allow manual layer selection for debugging
6. **Add priority override**: Emergency situations can force immediate decision

## Design Philosophy

The LLM scheduler embodies a key principle: **Not every decision needs the full strategic planning layer.**

- **Autonomic layer**: Fast, cheap, reflexive - handles survival needs
- **Talker layer**: Moderate speed, social context - handles conversations
- **Executor layer**: Slow, expensive, strategic - handles complex planning

By routing decisions intelligently, we:
- Reduce LLM costs (autonomic is smaller/faster)
- Improve responsiveness (critical needs get instant attention)
- Scale to more agents (fewer expensive executor calls)
- Preserve context quality (each layer sees only what it needs)

The scheduler is the traffic controller for the three-layer architecture, ensuring the right layer handles the right decision at the right time.
## Migration to Demo Game - COMPLETED ✅

**Date**: 2026-01-06  
**Status**: Integration complete, build passing

### What Was Implemented

1. **ScheduledDecisionProcessor Created** (`packages/core/src/decision/ScheduledDecisionProcessor.ts`)
   - Wraps LLMScheduler for use in AgentBrainSystem
   - Provides async (`processAsync`) and sync (`process`) APIs
   - Handles LLM response parsing and behavior extraction
   - Exported from `packages/core/src/decision/index.ts`

2. **AgentBrainSystem Updated** (`packages/core/src/systems/AgentBrainSystem.ts`)
   - Added optional `scheduledProcessor` parameter to constructor
   - Added `useScheduler` boolean flag for conditional logic
   - Maintains full backward compatibility with existing DecisionProcessor

3. **registerAllSystems Updated** (`packages/core/src/systems/registerAllSystems.ts`)
   - Added `scheduledProcessor?: unknown` to LLMDependencies interface
   - Passes `scheduledProcessor` to AgentBrainSystem if provided
   - Falls back to old DecisionProcessor if not provided

4. **Demo Integration** (`demo/src/main.ts`)
   - Creates LLMScheduler when llmQueue is available
   - Wraps scheduler in ScheduledDecisionProcessor
   - Passes scheduledProcessor to registerAllSystems
   - Logs scheduler creation with cooldown info

### Type Safety Fixes

Fixed several TypeScript errors during integration:

1. **ConversationComponent.activeConversation → isActive**  
   Fixed in `LLMScheduler.ts:160` - ConversationComponent uses `isActive` field, not `activeConversation`

2. **actionToBehavior return type**  
   Fixed in `ScheduledDecisionProcessor.ts:209-228` - `actionToBehavior()` returns just a string (AgentBehavior), not an object. Wrapped return values in `{ behavior, behaviorState }` objects.

3. **World type mismatch**  
   Fixed in `ScheduledDecisionProcessor.ts:125` - Added `as any` cast to handle World interface vs test helper class mismatch between ecs/World and World.ts

### Files Modified

- `packages/core/src/decision/ScheduledDecisionProcessor.ts` (created, 244 lines)
- `packages/core/src/decision/index.ts` (added exports)
- `packages/core/src/systems/AgentBrainSystem.ts` (added scheduler support)
- `packages/core/src/systems/registerAllSystems.ts` (added scheduler param)
- `demo/src/main.ts` (integrated scheduler)
- `packages/llm/src/LLMScheduler.ts` (fixed ConversationComponent field)

### How It Works

When the demo game starts with LLM enabled:

```typescript
// 1. LLMScheduler is created
const scheduler = new LLMScheduler(llmQueue);

// 2. Wrapped in ScheduledDecisionProcessor
const scheduledProcessor = new ScheduledDecisionProcessor(scheduler);

// 3. Passed to registerAllSystems
coreRegisterAllSystems(gameLoop, {
  llmQueue,
  promptBuilder,
  scheduledProcessor,  // NEW!
  // ...
});

// 4. AgentBrainSystem uses scheduler if provided
class AgentBrainSystem {
  constructor(..., scheduledProcessor?) {
    if (scheduledProcessor) {
      this.decision = scheduledProcessor;
      this.useScheduler = true;
    } else {
      // Backward compatible fallback
      this.decision = new DecisionProcessor(...);
    }
  }
}
```

### Console Output

When the game starts with LLM enabled, you'll see:

```
[Main] Created LLMScheduler with intelligent layer selection
[Main] Layer cooldowns - Autonomic: 1s, Talker: 5s, Executor: 10s
```

### Behavior Changes

**Before (Sequential Decision Processing)**:
1. Check autonomic needs
2. Try Talker LLM
3. Try Executor LLM  
4. Fallback to scripted

**After (Intelligent Scheduler-Based)**:
1. Check autonomic needs
2. **Scheduler selects layer based on context** (not sequential!)
   - Critical needs (hunger/energy < 0.2) → Autonomic layer
   - Active conversation → Talker layer
   - Task completed/idle → Executor layer
3. Only one LLM call per decision (cost optimization)
4. Per-layer cooldowns prevent excessive calls

### Backward Compatibility

Games without LLM or without passing `scheduledProcessor` continue using the old DecisionProcessor:

```typescript
// Old way (still works)
coreRegisterAllSystems(gameLoop, {
  llmQueue,
  promptBuilder,
  // No scheduledProcessor
});
// → Uses DecisionProcessor (sequential layers)

// New way (scheduler-based)
coreRegisterAllSystems(gameLoop, {
  llmQueue,
  promptBuilder,
  scheduledProcessor,  // Pass scheduler
});
// → Uses ScheduledDecisionProcessor (intelligent routing)
```

### Build Status

✅ TypeScript build passes  
✅ All type errors resolved  
✅ No breaking changes to existing code  
✅ Full backward compatibility maintained

### Next Steps

The scheduler is now integrated and ready to use. To test it:

1. **Run the demo game**: `cd custom_game_engine && ./start.sh`
2. **Enable LLM in settings**: Set LLM provider and API key
3. **Spawn LLM agents**: Check "Use LLM" in DevPanel
4. **Monitor layer selection**: Watch console for scheduler decisions
5. **Tune cooldowns**: Adjust based on gameplay and cost metrics

The migration is **complete** - the LLM scheduler is now the default decision router for LLM-enabled agents in the demo game.
