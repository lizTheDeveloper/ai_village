# God Class Decomposition

## Overview

Code review identified 7 "god classes" - files over 500 lines that do too many things. These violate the Single Responsibility Principle, are hard to test, and create tight coupling. This work order breaks them into focused modules.

---

## 1. BuildingBlueprintRegistry (1,537 lines)

**File:** `packages/core/src/buildings/BuildingBlueprintRegistry.ts`

**Current responsibilities:**
- Store all building definitions
- Manage building categories
- Track resource costs
- Validate skill requirements
- Define functionality types
- Handle placement rules
- Manage tier progression

**Proposed split:**

```
packages/core/src/buildings/
├── BuildingBlueprintRegistry.ts  (300 lines) - Storage only
├── BuildingValidator.ts          (200 lines) - Placement validation
├── BuildingCategoryManager.ts    (150 lines) - Category logic
├── BuildingTierManager.ts        (200 lines) - Tier/unlock progression
├── BuildingCostLookup.ts         (100 lines) - Resource cost queries
├── blueprints/
│   ├── ProductionBuildings.ts    (200 lines)
│   ├── StorageBuildings.ts       (150 lines)
│   ├── HousingBuildings.ts       (150 lines)
│   ├── GovernanceBuildings.ts    (150 lines)
│   └── index.ts
└── index.ts
```

**Key interfaces:**
```typescript
// BuildingBlueprintRegistry.ts - simplified
export class BuildingBlueprintRegistry {
  private blueprints: Map<string, BuildingBlueprint>;

  register(blueprint: BuildingBlueprint): void;
  get(id: string): BuildingBlueprint;
  getAll(): BuildingBlueprint[];
  getByCategory(category: string): BuildingBlueprint[];
}

// BuildingCostLookup.ts - extracted
export class BuildingCostLookup {
  constructor(private registry: BuildingBlueprintRegistry) {}

  getCost(buildingId: string): ResourceCost[];
  canAfford(buildingId: string, inventory: Inventory): boolean;
  getMissingResources(buildingId: string, inventory: Inventory): ResourceCost[];
}

// BuildingValidator.ts - extracted
export class BuildingValidator {
  constructor(
    private registry: BuildingBlueprintRegistry,
    private world: World
  ) {}

  canPlace(buildingId: string, position: Position): ValidationResult;
  validateSkillRequirements(buildingId: string, agent: Entity): boolean;
  validateTerrainRequirements(buildingId: string, position: Position): boolean;
}
```

---

## 2. StructuredPromptBuilder (1,503 lines)

**File:** `packages/llm/src/StructuredPromptBuilder.ts`

**Current responsibilities:**
- Build personality context
- Build skills context
- Build memory context
- Build goals context
- Build world state context
- Build instruction set
- Calculate motivations
- Format final prompt

**Proposed split:**

```
packages/llm/src/prompt/
├── StructuredPromptBuilder.ts    (200 lines) - Orchestrator only
├── contexts/
│   ├── PersonalityContext.ts     (150 lines)
│   ├── SkillsContext.ts          (200 lines)
│   ├── MemoryContext.ts          (200 lines)
│   ├── GoalsContext.ts           (150 lines)
│   ├── WorldStateContext.ts      (200 lines)
│   └── index.ts
├── MotivationEngine.ts           (300 lines) - Extract motivation logic
├── InstructionBuilder.ts         (200 lines) - Build instructions
└── index.ts
```

**Key interfaces:**
```typescript
// Context builder interface
export interface ContextBuilder {
  build(agent: Entity, world: World): string;
}

// StructuredPromptBuilder.ts - simplified
export class StructuredPromptBuilder {
  constructor(
    private contextBuilders: ContextBuilder[],
    private motivationEngine: MotivationEngine,
    private instructionBuilder: InstructionBuilder
  ) {}

  buildPrompt(agent: Entity, world: World): string {
    const contexts = this.contextBuilders.map(b => b.build(agent, world));
    const motivation = this.motivationEngine.calculate(agent, world);
    const instructions = this.instructionBuilder.build(agent, motivation);

    return this.format(contexts, instructions);
  }
}
```

**Bonus fix:** Remove hardcoded building costs (lines 22-31) - use BuildingCostLookup service instead.

---

## 3. MetricsCollector (1,334 lines)

**File:** `packages/core/src/metrics/MetricsCollector.ts`

**Current responsibilities:**
- Collect agent lifecycle metrics
- Collect needs metrics
- Collect economic metrics
- Collect social metrics
- Handle 15+ event types
- Manage hot/cold storage
- Aggregate data
- Export data

**Proposed split:**

```
packages/core/src/metrics/
├── MetricsCollector.ts           (200 lines) - Orchestrator
├── collectors/
│   ├── AgentLifecycleCollector.ts (150 lines)
│   ├── NeedsMetricsCollector.ts   (150 lines)
│   ├── EconomicMetricsCollector.ts (200 lines)
│   ├── SocialMetricsCollector.ts  (150 lines)
│   └── index.ts
├── storage/
│   ├── MetricsStore.ts           (200 lines)
│   ├── HotColdStorageManager.ts  (150 lines)
│   └── index.ts
├── aggregation/
│   ├── MetricsAggregator.ts      (200 lines)
│   └── index.ts
└── index.ts
```

**Key interfaces:**
```typescript
export interface MetricsCollectorModule {
  readonly name: string;
  readonly events: string[];  // Events this module handles

  handleEvent(event: GameEvent): void;
  getMetrics(): Record<string, unknown>;
  reset(): void;
}

export class MetricsCollector {
  private modules: MetricsCollectorModule[] = [];

  registerModule(module: MetricsCollectorModule): void {
    this.modules.push(module);
    for (const eventType of module.events) {
      this.eventBus.on(eventType, (e) => module.handleEvent(e));
    }
  }

  getAllMetrics(): Record<string, unknown> {
    return Object.fromEntries(
      this.modules.map(m => [m.name, m.getMetrics()])
    );
  }
}
```

---

## 4. Renderer (1,236 lines)

**File:** `packages/renderer/src/Renderer.ts`

**Current responsibilities:**
- Canvas setup
- Camera control
- Chunk rendering
- Entity rendering
- Sprite rendering
- Particle rendering
- Speech bubble rendering
- Debug overlay

**Proposed split:**

```
packages/renderer/src/
├── Renderer.ts                   (200 lines) - Orchestrator
├── rendering/
│   ├── ChunkRenderer.ts          (200 lines)
│   ├── EntityRenderer.ts         (200 lines)
│   ├── SpriteRenderer.ts         (150 lines) - Already exists
│   ├── ParticleRenderer.ts       (150 lines) - Already exists
│   ├── SpeechBubbleRenderer.ts   (100 lines)
│   └── DebugOverlayRenderer.ts   (100 lines)
├── camera/
│   ├── Camera.ts                 (150 lines) - Already exists
│   ├── CameraController.ts       (100 lines)
│   └── index.ts
└── index.ts
```

---

## 5. WindowManager (1,081 lines)

**File:** `packages/renderer/src/WindowManager.ts`

**Current responsibilities:**
- Window creation/destruction
- Position management
- Drag handling
- Resize handling
- Z-order management
- LRU eviction
- State persistence
- Event dispatch

**Proposed split:**

```
packages/renderer/src/windows/
├── WindowManager.ts              (250 lines) - Core management
├── WindowPositioner.ts           (150 lines) - Position calculations
├── DragDropHandler.ts            (150 lines) - Mouse drag logic
├── ResizeHandler.ts              (100 lines) - Resize logic
├── WindowLRUManager.ts           (100 lines) - LRU eviction
├── WindowPersistence.ts          (100 lines) - Save/load state
├── WindowZOrderManager.ts        (100 lines) - Z-ordering
└── index.ts
```

---

## 6. LLMDecisionProcessor (1,074 lines)

**File:** `packages/core/src/decision/LLMDecisionProcessor.ts`

**Current responsibilities:**
- Queue decision requests
- Parse LLM responses
- Convert actions to behaviors
- Validate costs
- Track goals
- Handle fallbacks

**Proposed split:**

```
packages/core/src/decision/
├── LLMDecisionProcessor.ts       (200 lines) - Orchestrator
├── DecisionQueue.ts              (150 lines) - Request queueing
├── ActionParser.ts               (200 lines) - Parse responses
├── ActionToBehaviorConverter.ts  (200 lines) - Convert to behaviors
├── CostValidator.ts              (150 lines) - Validate affordability
├── GoalTracker.ts                (150 lines) - Track goal progress
└── index.ts
```

**Bonus fix:** Remove hardcoded BUILDING_COSTS (lines 22-31) - use BuildingCostLookup from BuildingBlueprintRegistry decomposition.

---

## 7. EventMap (1,050 lines)

**File:** `packages/core/src/events/EventMap.ts`

**Current state:** Single TypeScript type definition for 50+ event types.

**Proposed split:**

```
packages/core/src/events/
├── EventMap.ts                   (50 lines) - Combined type
├── types/
│   ├── WorldEvents.ts            (100 lines)
│   ├── AgentEvents.ts            (200 lines)
│   ├── ResourceEvents.ts         (100 lines)
│   ├── BuildingEvents.ts         (100 lines)
│   ├── SocialEvents.ts           (100 lines)
│   ├── MemoryEvents.ts           (100 lines)
│   ├── EconomyEvents.ts          (100 lines)
│   └── index.ts
└── index.ts
```

**Pattern:**
```typescript
// types/AgentEvents.ts
export interface AgentEvents {
  'agent:created': { agentId: string; timestamp: number };
  'agent:died': { agentId: string; cause: string };
  'agent:sleeping': { agentId: string; location: Position };
  // ...
}

// EventMap.ts - combines all
import { AgentEvents } from './types/AgentEvents';
import { WorldEvents } from './types/WorldEvents';
// ...

export type EventMap = AgentEvents & WorldEvents & ResourceEvents & ...;
```

---

## 8. Implementation Priority

### Phase 1: Highest Value (eliminate code duplication)
1. **BuildingCostLookup** - Removes duplicate costs from LLMDecisionProcessor
2. **BuildingBlueprintRegistry split** - Foundation for other fixes

### Phase 2: Testability Improvement
3. **MotivationEngine extraction** - Makes prompt building testable
4. **MetricsCollector split** - Enables per-module testing

### Phase 3: Maintainability
5. **EventMap split** - Easier to navigate, modify
6. **WindowManager split** - Separate concerns

### Phase 4: Polish
7. **Renderer split** - Already has some separation
8. **LLMDecisionProcessor split** - Complex but lower priority

---

## 9. Refactoring Strategy

For each god class:

1. **Identify seams** - Find natural boundaries between responsibilities
2. **Extract interface** - Define contract for extracted module
3. **Create new file** - Move code to new file
4. **Update imports** - Fix all import statements
5. **Add tests** - Test new module in isolation
6. **Verify** - Run full test suite, check game works

**Do NOT:**
- Refactor multiple classes at once
- Change behavior while extracting
- Skip the test step

---

## 10. Verification

After each extraction:

```bash
# Verify build
npm run build

# Verify tests
npm run test

# Verify game runs
npm run dev
# Open browser, check panels work, agents move, buildings construct
```

---

## 11. Success Metrics

| File | Before | After |
|------|--------|-------|
| BuildingBlueprintRegistry | 1,537 lines | 300 lines + 5 modules |
| StructuredPromptBuilder | 1,503 lines | 200 lines + 6 modules |
| MetricsCollector | 1,334 lines | 200 lines + 7 modules |
| Renderer | 1,236 lines | 200 lines + 5 modules |
| WindowManager | 1,081 lines | 250 lines + 6 modules |
| LLMDecisionProcessor | 1,074 lines | 200 lines + 5 modules |
| EventMap | 1,050 lines | 50 lines + 8 type files |

**Target:** No file over 350 lines after refactoring.

---

**End of Specification**
