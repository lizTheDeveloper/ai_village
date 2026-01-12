# Decision System

Agent decision-making architecture for autonomous behavior selection and execution.

## Overview

The decision system orchestrates agent behavior through layered processors that run in priority order. Each layer handles different aspects of decision-making, from survival reflexes to strategic planning.

**Three Decision Layers:**

1. **Autonomic** (Priority 100+): Survival reflexes that override executive decisions. Handles critical needs (hunger, sleep, temperature, health) with configurable priority thresholds.
2. **Talker** (Layer 2 LLM): Conversation, goal-setting, social interactions. Personality-driven cadence (30s for extroverts, 120s for introverts).
3. **Executor** (Layer 3 LLM): Task planning, multi-step actions, resource management. Task-driven cadence with behavior queues.

## Architecture

### DecisionProcessor

Main orchestrator that runs layers sequentially. Supports both three-layer architecture (Autonomic → Talker → Executor) and legacy single-LLM mode.

```typescript
import { DecisionProcessor } from '@ai-village/core';

// Three-layer architecture (recommended)
const processor = new DecisionProcessor(
  llmQueue,
  null,  // deprecated single LLM
  talkerPromptBuilder,
  executorPromptBuilder
);

const result = processor.process(entity, world, agent, getNearbyAgents);
if (result.changed) {
  console.log(`${result.source} changed behavior to ${result.behavior}`);
}
```

### ScheduledDecisionProcessor

Context-aware processor using LLMScheduler for intelligent layer selection. Reduces unnecessary LLM calls by selecting the right layer based on agent state.

```typescript
import { ScheduledDecisionProcessor } from '@ai-village/core';

const processor = new ScheduledDecisionProcessor(scheduler, llmQueue);

// Synchronous queue+poll pattern (recommended for game loop)
const result = processor.process(entity, world, agent);

// Or async (for tests)
const result = await processor.processAsync(entity, world, agent);
```

**Benefits:** Intelligent layer selection, unified cooldown management, cost optimization.

### Autonomic System

Fast survival reflexes with priority-based interruption.

**Priority Scale:**
- 100: Forced sleep (0% energy collapse)
- 90: Dangerously cold/hot, critical hunger (<10%)
- 85: Flee to home when injured (<30% health)
- 80: Critical hunger (<10%)
- 70: Bedtime preference (past sleep time)
- 40: Moderate hunger (<60%)
- 35: Cold (temperature discomfort)

```typescript
import { AutonomicSystem } from '@ai-village/core';

const autonomic = new AutonomicSystem();
const result = autonomic.check(entity);
if (result) {
  entity.updateComponent('agent', c => ({ ...c, behavior: result.behavior }));
}
```

### Behavior Priority

Priority configuration for all behaviors to determine interruption logic.

```typescript
import { getBehaviorPriority, canInterrupt } from '@ai-village/core';

const priority = getBehaviorPriority('seek_food', temperatureComp, needsComp);
const canChange = canInterrupt('seek_warmth', 'gather', temperatureComp, needsComp);
```

## LLM Integration

### Talker Layer

Handles conversation, goal-setting, social interactions. Personality-driven cadence based on extraversion trait.

**Actions:** `talk`, `set_personal_goal`, `set_medium_term_goal`, `set_group_goal`, `set_priorities`

### Executor Layer

Handles task planning, multi-step actions, resource management. Supports behavior queues for chaining actions.

**Actions:** `gather`, `build`, `craft`, `farm`, `till`, `plant`, `harvest`, `explore`, `navigate_to`, `deposit_items`, `plan_build`

### LLM Response Parsing

Supports both JSON and legacy text formats:

```typescript
// JSON format
{ "thinking": "...", "action": { "type": "gather", "target": "wood" }, "speaking": "..." }

// Legacy text format
gather(wood)
```

Goal-setting actions (`set_personal_goal`, etc.) and `sleep_until_queue_complete` do NOT change behavior - agent continues current task while goal is applied.

## Key Files

- `index.ts` - Public API exports
- `DecisionProcessor.ts` - Main orchestrator (sequential layers)
- `ScheduledDecisionProcessor.ts` - Context-aware orchestrator (intelligent layer selection)
- `AutonomicSystem.ts` - Survival reflexes (Layer 1)
- `TalkerLLMProcessor.ts` - Conversation & goals (Layer 2)
- `ExecutorLLMProcessor.ts` - Task planning (Layer 3)
- `BehaviorPriority.ts` - Priority configuration and interruption logic
- `ScriptedDecisionProcessor.ts` - Non-LLM fallback behaviors
- `SpellUtilityCalculator.ts` - Magic system integration
