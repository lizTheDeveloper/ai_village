# Work Order: StructuredPromptBuilder Decomposition

**Phase:** Infrastructure (Maintainability + Type Safety)
**Created:** 2025-12-26
**Priority:** MEDIUM
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

`StructuredPromptBuilder.ts` is **1004 lines** with **143 functions** and **37 `any` types**, handling:
- System prompt generation
- World context building
- Memory formatting
- Action list generation
- Building suggestions
- Agent/building info formatting
- Storage info
- Conversation context

The heavy `any` usage makes it error-prone and hard to refactor safely.

---

## Current Structure Analysis

```
StructuredPromptBuilder.ts (1004 lines)
├── buildPrompt() - main entry (lines 1-175)
│   └── Orchestrates all sub-builders
├── buildSystemPrompt() - personality/rules (lines 175-255)
├── buildWorldContext() - current state (lines 255-505)
│   ├── Needs formatting
│   ├── Vision formatting
│   ├── Inventory formatting
│   ├── Temperature formatting
│   └── Conversation formatting
├── getKnownResourceLocations() (lines 506-552)
├── suggestBuildings() (lines 553-611)
├── getSeenAgentsInfo() (lines 612-668)
├── getSeenBuildingsInfo() (lines 669-723)
├── getStorageInfo() (lines 724-796)
├── buildMemories() (lines 797-844)
├── getAvailableActions() (lines 845-983)
└── formatPrompt() (lines 984-1004)
```

---

## Proposed Architecture

```
packages/llm/src/
├── StructuredPromptBuilder.ts     # Thin orchestrator (~150 lines)
├── prompt/
│   ├── SystemPromptBuilder.ts     # Personality, rules, role
│   ├── WorldContextBuilder.ts     # Current situation
│   ├── MemoryFormatter.ts         # Memory to text
│   ├── ActionListBuilder.ts       # Available actions
│   └── PromptFormatter.ts         # Final formatting
├── context/
│   ├── NeedsContext.ts            # Hunger, energy, etc.
│   ├── VisionContext.ts           # What agent sees
│   ├── InventoryContext.ts        # What agent has
│   ├── TemperatureContext.ts      # Environmental
│   ├── ConversationContext.ts     # Active dialogue
│   └── BuildingContext.ts         # Nearby buildings, storage
└── types/
    └── PromptTypes.ts             # Typed interfaces (no any!)
```

---

## Type Safety: Eliminate `any`

### Current (37 `any` types):
```typescript
buildPrompt(agent: Entity, world: any): string {
  const name = agent.components.get('identity') as any;
  const personality = agent.components.get('personality') as any;
  // ... 35 more any casts
}
```

### Target (0 `any` types):
```typescript
// types/PromptTypes.ts
export interface AgentContext {
  identity: IdentityComponent | null;
  personality: PersonalityComponent | null;
  needs: NeedsComponent | null;
  vision: VisionComponent | null;
  memory: MemoryComponent | null;
  inventory: InventoryComponent | null;
  temperature: TemperatureComponent | null;
  conversation: ConversationComponent | null;
}

// StructuredPromptBuilder.ts
buildPrompt(agent: Entity, world: World): string {
  const context = this.extractAgentContext(agent);
  // All typed, no any
}

private extractAgentContext(agent: Entity): AgentContext {
  return {
    identity: agent.getComponent<IdentityComponent>('identity'),
    personality: agent.getComponent<PersonalityComponent>('personality'),
    // ... typed extraction
  };
}
```

---

## Extraction Plan

### Phase 1: Create Types (No `any`)

**types/PromptTypes.ts**
```typescript
import type {
  IdentityComponent,
  PersonalityComponent,
  NeedsComponent,
  VisionComponent,
  MemoryComponent,
  InventoryComponent,
  TemperatureComponent,
  ConversationComponent,
} from '@ai-village/core';

export interface AgentContext {
  identity: IdentityComponent | null;
  personality: PersonalityComponent | null;
  needs: NeedsComponent | null;
  vision: VisionComponent | null;
  memory: MemoryComponent | null;
  inventory: InventoryComponent | null;
  temperature: TemperatureComponent | null;
  conversation: ConversationComponent | null;
}

export interface WorldContext {
  tick: number;
  timeOfDay: string;
  weather: string;
  temperature: number;
}

export interface PromptSections {
  systemPrompt: string;
  worldContext: string;
  memories: string;
  availableActions: string[];
  instruction: string;
}
```

### Phase 2: Extract Context Builders

**context/NeedsContext.ts** (~50 lines)
```typescript
export class NeedsContext {
  format(needs: NeedsComponent | null): string {
    if (!needs) return 'Status unknown.';

    const parts: string[] = [];
    if (needs.hunger < 30) parts.push(`Hungry (${needs.hunger.toFixed(0)}%)`);
    if (needs.energy < 30) parts.push(`Tired (${needs.energy.toFixed(0)}%)`);
    // ...
    return parts.join(', ') || 'Feeling fine.';
  }
}
```

**context/VisionContext.ts** (~80 lines)
```typescript
export class VisionContext {
  format(vision: VisionComponent | null, world: World): string {
    if (!vision) return 'Cannot see surroundings.';

    const seen: string[] = [];
    for (const entityId of vision.visibleEntities) {
      const entity = world.getEntity(entityId);
      if (entity) seen.push(this.describeEntity(entity));
    }
    return seen.length ? `You see: ${seen.join(', ')}` : 'Nothing notable nearby.';
  }
}
```

### Phase 3: Extract Prompt Builders

**prompt/ActionListBuilder.ts** (~100 lines)
```typescript
export class ActionListBuilder {
  build(context: AgentContext, world: World): string[] {
    const actions: string[] = ['wander', 'rest'];

    if (this.canGather(context)) {
      actions.push('pick <resource>');
    }
    if (this.canBuild(context)) {
      actions.push('build <building>');
    }
    // ...
    return actions;
  }

  private canGather(context: AgentContext): boolean {
    return context.vision?.visibleEntities.some(id => /* has resource */) ?? false;
  }
}
```

### Phase 4: Thin Orchestrator

**StructuredPromptBuilder.ts** (~150 lines)
```typescript
export class StructuredPromptBuilder {
  private systemBuilder = new SystemPromptBuilder();
  private worldBuilder = new WorldContextBuilder();
  private memoryFormatter = new MemoryFormatter();
  private actionBuilder = new ActionListBuilder();
  private formatter = new PromptFormatter();

  buildPrompt(agent: Entity, world: World): string {
    const context = this.extractAgentContext(agent);
    const worldContext = this.extractWorldContext(world);

    const sections: PromptSections = {
      systemPrompt: this.systemBuilder.build(context),
      worldContext: this.worldBuilder.build(context, worldContext),
      memories: this.memoryFormatter.format(context.memory),
      availableActions: this.actionBuilder.build(context, world),
      instruction: this.buildInstruction(context),
    };

    return this.formatter.format(sections);
  }

  private extractAgentContext(agent: Entity): AgentContext {
    return {
      identity: agent.getComponent<IdentityComponent>('identity'),
      personality: agent.getComponent<PersonalityComponent>('personality'),
      // ... all typed
    };
  }
}
```

---

## Acceptance Criteria

### Criterion 1: Zero `any` Types
- `grep ": any" packages/llm/src/` returns empty
- All components properly typed
- **Verification:** grep + TypeScript strict mode

### Criterion 2: StructuredPromptBuilder < 200 Lines
- Only orchestration logic
- Context extraction typed
- **Verification:** `wc -l`

### Criterion 3: Sub-Builders Exist
- SystemPromptBuilder, WorldContextBuilder, ActionListBuilder, etc.
- Each < 150 lines
- **Verification:** file existence + line counts

### Criterion 4: Prompts Unchanged
- LLM receives same prompt structure
- Agent decisions work correctly
- **Verification:** Playtest with LLM agents

---

## Files to Create

- `types/PromptTypes.ts`
- `prompt/SystemPromptBuilder.ts`
- `prompt/WorldContextBuilder.ts`
- `prompt/MemoryFormatter.ts`
- `prompt/ActionListBuilder.ts`
- `prompt/PromptFormatter.ts`
- `context/NeedsContext.ts`
- `context/VisionContext.ts`
- `context/InventoryContext.ts`
- `context/TemperatureContext.ts`
- `context/ConversationContext.ts`
- `context/BuildingContext.ts`

---

## Migration Strategy

1. **Create PromptTypes.ts** - Define all interfaces
2. **Extract context formatters** - NeedsContext, VisionContext, etc.
3. **Extract prompt builders** - SystemPromptBuilder, ActionListBuilder
4. **Update StructuredPromptBuilder** - Use composition
5. **Remove all `any`** - Replace with proper types
6. **Test with LLM** - Verify prompts still work

---

## Notes for Implementation Agent

1. **Types first** - Create PromptTypes.ts before extracting
2. **Import from @ai-village/core** - Use existing component types
3. **Test prompt output** - Log prompts before/after to verify unchanged
4. **One extraction at a time** - Verify build passes after each
5. **No `any` allowed** - If stuck on type, define interface

---

## Success Metrics

- ✅ Zero `any` types in llm package
- ✅ StructuredPromptBuilder < 200 lines
- ✅ Each sub-builder < 150 lines
- ✅ LLM agent decisions work
- ✅ Build passes with `--strict`

---

**Estimated Complexity:** MEDIUM-HIGH
**Estimated Time:** 5-7 hours
**Priority:** MEDIUM (type safety + maintainability)
