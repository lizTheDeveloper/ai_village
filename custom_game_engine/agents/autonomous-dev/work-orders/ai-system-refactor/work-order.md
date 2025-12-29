# Work Order: AISystem Decomposition (God Object Refactor)

**Phase:** Infrastructure (Critical Maintainability)
**Created:** 2025-12-26
**Priority:** HIGH
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

**AISystem.ts is a 4,081-line God Object** that handles:
- 25+ registered behaviors
- Vision processing
- Hearing processing
- Meeting detection
- Autonomic survival reflexes
- Behavior queue processing
- LLM decision integration
- Scripted fallback logic
- 26 component update calls
- 35 event emissions

### Current Pain Points

1. **"Nightmare to understand"** - Movement, gathering, and targeting logic is scattered across 800+ lines of `gatherBehavior`, interleaved with vision processing and decision making

2. **Coupling nightmare** - Understanding how an agent targets a berry bush requires reading:
   - `processVision()` (lines 950-1079) - detecting resources
   - `gatherBehavior()` (lines 2019-2560) - 540 lines of gathering logic
   - `_seekFoodBehavior()` (lines 1470-1807) - 337 lines of food seeking
   - `checkAutonomicSystem()` (lines 879-949) - priority overrides
   - Movement targeting scattered throughout

3. **Testing is nearly impossible** - To test gathering, you must mock the entire AISystem

4. **Parallel work is blocked** - Implementation agents can't work on sleep and gathering simultaneously without merge conflicts

5. **Review is ineffective** - Review agents can't thoroughly review a 4000-line file

6. **Animals can't reuse movement/targeting** - Animals need the same logic for finding food, avoiding threats, and pathfinding, but it's locked inside AISystem

---

## Critical Design Requirement: Shared Movement API

**Both Agents AND Animals need to:**
- Find and move toward targets (food, resources, threats)
- Navigate around obstacles
- Stop at targets and interact
- Handle movement interruptions

**Current Problem:** Movement targeting is buried in behavior methods like `gatherBehavior()`:
```typescript
// Scattered throughout AISystem - not reusable by AnimalSystem
impl.updateComponent<MovementComponent>('movement', (current) => ({
  ...current,
  targetX: resourcePos.x,
  targetY: resourcePos.y,
  hasTarget: true,
}));
```

**Solution:** Create a `MovementAPI` service that both systems use:

```typescript
// packages/core/src/services/MovementAPI.ts
export class MovementAPI {
  /**
   * Command entity to move toward a target position
   */
  moveToward(entity: EntityImpl, target: { x: number; y: number }): void {
    entity.updateComponent<MovementComponent>('movement', (current) => {
      const updated = Object.create(Object.getPrototypeOf(current));
      Object.assign(updated, current);
      updated.targetX = target.x;
      updated.targetY = target.y;
      updated.hasTarget = true;
      return updated;
    });
  }

  /**
   * Command entity to move toward another entity
   */
  moveTowardEntity(entity: EntityImpl, target: Entity): void {
    const pos = (target as EntityImpl).getComponent<PositionComponent>('position');
    if (!pos) throw new Error(`Target entity ${target.id} has no position`);
    this.moveToward(entity, pos);
  }

  /**
   * Check if entity has reached its target (within threshold)
   */
  hasReachedTarget(entity: EntityImpl, threshold: number = 1.0): boolean {
    const movement = entity.getComponent<MovementComponent>('movement');
    const position = entity.getComponent<PositionComponent>('position');
    if (!movement?.hasTarget || !position) return true;

    const dist = Math.sqrt(
      Math.pow(movement.targetX - position.x, 2) +
      Math.pow(movement.targetY - position.y, 2)
    );
    return dist <= threshold;
  }

  /**
   * Stop entity movement
   */
  stop(entity: EntityImpl): void {
    entity.updateComponent<MovementComponent>('movement', (current) => {
      const updated = Object.create(Object.getPrototypeOf(current));
      Object.assign(updated, current);
      updated.hasTarget = false;
      updated.targetX = 0;
      updated.targetY = 0;
      return updated;
    });
  }

  /**
   * Flee from a threat (move in opposite direction)
   */
  fleeFrom(entity: EntityImpl, threat: { x: number; y: number }, distance: number = 10): void {
    const position = entity.getComponent<PositionComponent>('position');
    if (!position) return;

    // Calculate direction away from threat
    const dx = position.x - threat.x;
    const dy = position.y - threat.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    this.moveToward(entity, {
      x: position.x + (dx / len) * distance,
      y: position.y + (dy / len) * distance,
    });
  }
}
```

**Usage in Behaviors:**
```typescript
// GatherBehavior.ts (Agent)
class GatherBehavior {
  constructor(private movement: MovementAPI, private targeting: ResourceTargeting) {}

  execute(entity: EntityImpl, world: World): void {
    const state = entity.behaviorState;

    if (!state.target) {
      state.target = this.targeting.findNearest(entity, world);
    }

    if (state.target) {
      this.movement.moveTowardEntity(entity, state.target);

      if (this.movement.hasReachedTarget(entity)) {
        this.harvest(entity, state.target, world);
      }
    }
  }
}

// GrazeBehavior.ts (Animal)
class GrazeBehavior {
  constructor(private movement: MovementAPI, private targeting: PlantTargeting) {}

  execute(entity: EntityImpl, world: World): void {
    const plant = this.targeting.findNearestEdible(entity, world);

    if (plant) {
      this.movement.moveTowardEntity(entity, plant);

      if (this.movement.hasReachedTarget(entity)) {
        this.eat(entity, plant, world);
      }
    }
  }
}
```

---

## Antipatterns Observed in Autonomous Agent Logs

From reviewing work orders, these struggles relate directly to AISystem complexity:

| Pattern | Root Cause | Example |
|---------|-----------|---------|
| Component state lost | Updates scattered across file, hard to trace | Sleep drive stuck at 17.7 |
| Features "not implemented" | Logic exists but buried in 500-line methods | Seed gathering works but not triggered |
| Playtest conditions wrong | Autonomic overrides not obvious | Warmth seeking masks all other behaviors |
| Multiple fix iterations | Hard to understand behavior interactions | Sleep system took 5+ rounds |

---

## Proposed Architecture

### Design Principles

1. **Single Responsibility** - Each class does ONE thing
2. **Composition over Inheritance** - Behaviors are pluggable, not subclasses
3. **Data-Driven** - Behaviors read from components, don't store state
4. **Observable** - All decisions emit events for debugging
5. **Testable** - Each behavior testable in isolation
6. **Perception-Limited** - Agents can ONLY act on what they can SEE or REMEMBER

### Critical: Perception-Limited Targeting

**Agents must NOT have god-like knowledge.** They can only:
- **See** entities within their vision range (VisionComponent.visibleEntities)
- **Remember** locations from past perception (MemoryComponent/SpatialMemoryComponent)

**WRONG - Omniscient targeting:**
```typescript
// BAD: Queries entire world - agent "knows" about things it can't see
const allResources = world.query().with('resource').executeEntities();
const nearest = this.findNearest(position, allResources);
```

**CORRECT - Perception-limited targeting:**
```typescript
// GOOD: Only considers visible entities + remembered locations
const vision = entity.getComponent<VisionComponent>('vision');
const memory = entity.getComponent<SpatialMemoryComponent>('spatial_memory');

// Option 1: Target something currently visible
const visibleResources = vision.visibleEntities.filter(e => e.hasComponent('resource'));
const nearest = this.findNearest(position, visibleResources);

// Option 2: Navigate to remembered location (might not be there anymore!)
if (!nearest && memory) {
  const rememberedLocation = memory.getRememberedLocation('resource:wood');
  if (rememberedLocation) {
    return { type: 'remembered', position: rememberedLocation };
  }
}

// Option 3: Explore to find resources (no known targets)
return { type: 'explore' };
```

### TargetingAPI Must Respect Perception

```typescript
// services/TargetingAPI.ts
export class TargetingAPI {
  /**
   * Find nearest target from VISIBLE entities only
   */
  findNearestVisible<T>(
    entity: EntityImpl,
    filter: (e: Entity) => boolean
  ): Entity | null {
    const vision = entity.getComponent<VisionComponent>('vision');
    if (!vision) return null;

    const candidates = vision.visibleEntities.filter(filter);
    return this.nearest(entity, candidates);
  }

  /**
   * Get remembered location (may be stale!)
   */
  getRememberedLocation(
    entity: EntityImpl,
    category: string
  ): { x: number; y: number; tick: number } | null {
    const memory = entity.getComponent<SpatialMemoryComponent>('spatial_memory');
    if (!memory) return null;

    return memory.getLocation(category);
  }

  /**
   * Combined: Try visible first, fall back to memory
   */
  findTarget(
    entity: EntityImpl,
    options: {
      filter: (e: Entity) => boolean;
      memoryCategory?: string;
    }
  ): TargetResult {
    // First: Try to find visible target
    const visible = this.findNearestVisible(entity, options.filter);
    if (visible) {
      return { type: 'visible', entity: visible };
    }

    // Second: Try remembered location
    if (options.memoryCategory) {
      const remembered = this.getRememberedLocation(entity, options.memoryCategory);
      if (remembered) {
        return { type: 'remembered', position: remembered };
      }
    }

    // Third: No known targets - need to explore
    return { type: 'unknown' };
  }
}

type TargetResult =
  | { type: 'visible'; entity: Entity }
  | { type: 'remembered'; position: { x: number; y: number; tick: number } }
  | { type: 'unknown' };
```

### Behavior Pattern: Handle All Target States

```typescript
// GatherBehavior.ts - handles perception-limited targeting
execute(entity: EntityImpl, world: World): void {
  const targetResult = this.targeting.findTarget(entity, {
    filter: (e) => this.isGatherableResource(e),
    memoryCategory: 'resource:wood',
  });

  switch (targetResult.type) {
    case 'visible':
      // Direct path to visible target
      this.movement.moveTowardEntity(entity, targetResult.entity);
      if (this.movement.hasReachedTarget(entity)) {
        this.harvest(entity, targetResult.entity, world);
      }
      break;

    case 'remembered':
      // Navigate to remembered location (might be gone!)
      this.movement.moveToward(entity, targetResult.position);
      if (this.movement.hasReachedTarget(entity)) {
        // Check if resource is actually there
        const actual = this.targeting.findNearestVisible(entity, (e) =>
          this.isGatherableResource(e)
        );
        if (actual) {
          this.harvest(entity, actual, world);
        } else {
          // Memory was stale - clear it and explore
          this.memory.forgetLocation(entity, 'resource:wood');
          this.switchTo(entity, 'explore');
        }
      }
      break;

    case 'unknown':
      // No visible or remembered resources - need to explore
      this.switchTo(entity, 'explore');
      break;
  }
}
```

### Why This Matters

1. **Emergent behavior** - Agents learn their environment through exploration
2. **Realistic limitations** - Can't act on what they don't know
3. **Memory becomes valuable** - Remembering resource locations is useful
4. **Exploration is necessary** - Agents must explore to find new resources
5. **Stale memory creates challenges** - Resource might be depleted since last visit

### Directory Structure

```
packages/core/src/
├── services/                          # SHARED SERVICES (used by Agent + Animal systems)
│   ├── index.ts
│   ├── MovementAPI.ts                 # Movement commands (moveToward, stop, flee)
│   ├── TargetingAPI.ts                # Unified targeting interface
│   └── InteractionAPI.ts              # Harvest, eat, pickup, deposit
│
├── systems/
│   ├── AgentBrainSystem.ts           # Thin orchestrator (~300 lines)
│   ├── AnimalBrainSystem.ts          # Animal AI (uses same services)
│   │
│   ├── perception/
│   │   ├── index.ts                   # Exports
│   │   ├── VisionProcessor.ts         # Extract processVision
│   │   ├── HearingProcessor.ts        # Extract processHearing
│   │   └── MeetingDetector.ts         # Extract processMeetingCalls
│   │
│   ├── decision/
│   │   ├── index.ts
│   │   ├── AutonomicSystem.ts         # Survival reflexes (hunger, sleep, warmth)
│   │   ├── BehaviorPriority.ts        # Priority calculations
│   │   ├── LLMDecisionProcessor.ts    # LLM integration
│   │   └── ScriptedDecisionProcessor.ts # Fallback logic
│   │
│   ├── behavior/
│   │   ├── index.ts
│   │   ├── BehaviorRegistry.ts        # Registration + dispatch
│   │   ├── BehaviorQueueProcessor.ts  # Queue management
│   │   ├── BaseBehavior.ts            # Interface/abstract class
│   │   │
│   │   └── behaviors/                 # Individual behaviors (~100-300 lines each)
│   │       ├── WanderBehavior.ts
│   │       ├── IdleBehavior.ts
│   │       ├── GatherBehavior.ts      # THE BIG ONE - needs sub-decomposition
│   │       ├── BuildBehavior.ts
│   │       ├── SleepBehavior.ts
│   │       ├── DepositBehavior.ts
│   │       ├── WarmthBehavior.ts
│   │       ├── TalkBehavior.ts
│   │       ├── FollowBehavior.ts
│   │       ├── MeetingBehavior.ts
│   │       ├── FarmBehavior.ts
│   │       ├── TillBehavior.ts
│   │       ├── NavigateBehavior.ts
│   │       └── ExploreBehavior.ts
│   │
│   └── targeting/                     # Targeting implementations
│       ├── index.ts
│       ├── ResourceTargeting.ts       # Find nearest wood/stone/food
│       ├── PlantTargeting.ts          # Find berry bushes, plants with seeds
│       ├── BuildingTargeting.ts       # Find storage, beds, crafting stations
│       ├── AgentTargeting.ts          # Find agents to follow/talk to
│       └── ThreatTargeting.ts         # Find predators, dangers (for animals)
```

### Shared Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHARED SERVICES                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ MovementAPI │  │ TargetingAPI│  │ InteractionAPI          │  │
│  │ - moveToward│  │ - findNearest│  │ - harvest(entity, tgt) │  │
│  │ - stop      │  │ - findAll   │  │ - eat(entity, food)    │  │
│  │ - flee      │  │ - filter    │  │ - deposit(entity, bld) │  │
│  │ - hasArrived│  │             │  │ - pickup(entity, item) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │                              │
     ┌────────┴────────┐            ┌────────┴────────┐
     │                 │            │                 │
┌────▼────┐      ┌─────▼─────┐ ┌────▼────┐      ┌─────▼─────┐
│ Agent   │      │ Agent     │ │ Animal  │      │ Animal    │
│ Gather  │      │ Sleep     │ │ Graze   │      │ Flee      │
│ Behavior│      │ Behavior  │ │ Behavior│      │ Behavior  │
└─────────┘      └───────────┘ └─────────┘      └───────────┘
```

### Key Extraction: GatherBehavior Decomposition

The 540-line `gatherBehavior` is particularly problematic. It should decompose into:

```typescript
// GatherBehavior.ts (~150 lines)
export class GatherBehavior implements IBehavior {
  constructor(
    private resourceTargeting: ResourceTargeting,
    private plantTargeting: PlantTargeting,
    private inventoryManager: InventoryManager,
  ) {}

  execute(entity: EntityImpl, world: World): void {
    const state = entity.getComponent<AgentComponent>('agent').behaviorState;

    // Delegate to sub-handlers based on what we're gathering
    if (state.targetType === 'plant') {
      this.gatherFromPlant(entity, world, state);
    } else if (state.targetType === 'resource') {
      this.gatherFromResource(entity, world, state);
    } else {
      // Find a target
      this.acquireTarget(entity, world, state);
    }
  }

  private acquireTarget(entity: EntityImpl, world: World, state: any): void {
    // Use targeting services to find nearest valid target
    const position = entity.getComponent<PositionComponent>('position');

    const plant = this.plantTargeting.findNearest(position, world, {
      hasFood: state.resourceType === 'food',
      hasSeeds: state.resourceType === 'seeds',
    });

    if (plant) {
      state.target = plant;
      state.targetType = 'plant';
      return;
    }

    const resource = this.resourceTargeting.findNearest(position, world, {
      resourceType: state.resourceType,
    });

    if (resource) {
      state.target = resource;
      state.targetType = 'resource';
      return;
    }

    // Nothing to gather - signal completion
    this.complete(entity, world);
  }
}
```

### Key Extraction: ResourceTargeting

```typescript
// targeting/ResourceTargeting.ts (~100 lines)
export class ResourceTargeting {
  findNearest(
    position: PositionComponent,
    world: World,
    options: {
      resourceType?: string;
      maxRange?: number;
      excludeIds?: Set<string>;
    }
  ): Entity | null {
    const range = options.maxRange ?? 15;

    const resources = world
      .query()
      .with('resource')
      .with('position')
      .executeEntities();

    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const resource of resources) {
      const impl = resource as EntityImpl;
      const comp = impl.getComponent<ResourceComponent>('resource');
      const pos = impl.getComponent<PositionComponent>('position');

      if (!comp.harvestable || comp.amount <= 0) continue;
      if (options.resourceType && comp.resourceType !== options.resourceType) continue;
      if (options.excludeIds?.has(resource.id)) continue;

      const dist = distance(position, pos);
      if (dist <= range && dist < nearestDist) {
        nearest = resource;
        nearestDist = dist;
      }
    }

    return nearest;
  }
}
```

---

## AgentBrainSystem (The Thin Orchestrator)

After extraction, AISystem becomes AgentBrainSystem (~300 lines):

```typescript
// AgentBrainSystem.ts
export class AgentBrainSystem implements System {
  constructor(
    private perception: PerceptionProcessor,
    private autonomic: AutonomicSystem,
    private llmProcessor: LLMDecisionProcessor,
    private scriptedProcessor: ScriptedDecisionProcessor,
    private behaviorRegistry: BehaviorRegistry,
    private queueProcessor: BehaviorQueueProcessor,
  ) {}

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const agent = impl.getComponent<AgentComponent>('agent');
      if (!agent || !this.shouldThink(agent, world.tick)) continue;

      // Phase 1: Perception (populates components)
      this.perception.process(impl, world);

      // Phase 2: Decision (determine behavior)
      const decision = this.decide(impl, world, agent);

      if (decision.changed) {
        this.applyDecision(impl, world, decision);
      }

      // Phase 3: Execution (run current behavior)
      this.behaviorRegistry.execute(agent.behavior, impl, world);
    }
  }

  private decide(entity: EntityImpl, world: World, agent: AgentComponent): Decision {
    // Layer 1: Autonomic (highest priority)
    const autonomic = this.autonomic.check(entity, world);
    if (autonomic && autonomic.priority > this.getPriority(agent.behavior)) {
      return { changed: true, behavior: autonomic.behavior, source: 'autonomic' };
    }

    // Layer 2: Behavior Queue
    if (this.queueProcessor.hasActiveQueue(agent)) {
      return this.queueProcessor.process(agent, world);
    }

    // Layer 3: LLM or Scripted
    if (agent.useLLM) {
      return this.llmProcessor.process(entity, world, agent);
    } else {
      return this.scriptedProcessor.process(entity, world, agent);
    }
  }
}
```

---

## Migration Strategy

### Phase 0: Create Shared Services (Foundation)

**Goal:** Create the shared APIs that both agents and animals will use.

**Steps:**
1. Create `services/` directory
2. Implement `MovementAPI` with `moveToward`, `stop`, `flee`, `hasReachedTarget`
3. Implement `TargetingAPI` as a facade over targeting implementations
4. Implement `InteractionAPI` for harvest/eat/deposit actions
5. Write unit tests for each service
6. Services work standalone - no changes to AISystem yet

**Risk:** LOW - New code, doesn't touch existing system

**Verification:**
- Unit tests pass for all services
- Build succeeds
- Services are importable

### Phase 1: Extract Behaviors (Safe, Incremental)

**Goal:** Move behavior methods to individual files without changing functionality.

**Steps:**
1. Create `behavior/behaviors/` directory
2. Extract ONE behavior at a time (start with simplest: `WanderBehavior`)
3. AISystem calls external class instead of internal method
4. Run tests after EACH extraction
5. Continue until all behaviors extracted

**Risk:** LOW - Pure refactoring, no logic changes

**Verification:**
- All tests still pass
- Playtest shows identical behavior
- `grep` confirms methods removed from AISystem

### Phase 2: Extract Targeting (Medium Risk)

**Goal:** Create reusable targeting services.

**Steps:**
1. Create `targeting/` directory
2. Extract resource finding logic from `gatherBehavior`
3. Extract plant finding logic
4. Update `GatherBehavior` to use targeting services
5. Other behaviors can now reuse targeting

**Risk:** MEDIUM - Changing data flow, but logic unchanged

**Verification:**
- Agents still find and gather resources
- Test targeting services in isolation
- Console logs show same targets being selected

### Phase 3: Extract Perception (Medium Risk)

**Goal:** Separate perception from decision-making.

**Steps:**
1. Create `perception/` directory
2. Extract `processVision` → `VisionProcessor`
3. Extract `processHearing` → `HearingProcessor`
4. Perception runs before decision-making
5. Results stored in components (VisionComponent exists)

**Risk:** MEDIUM - Ordering change could affect behavior

**Verification:**
- Agents still "see" nearby entities
- Vision events still fire
- No perception-related bugs

### Phase 4: Extract Decision Systems (Higher Risk)

**Goal:** Separate autonomic, LLM, and scripted decision-making.

**Steps:**
1. Create `decision/` directory
2. Extract `checkAutonomicSystem` → `AutonomicSystem`
3. Extract LLM processing → `LLMDecisionProcessor`
4. Extract scripted logic → `ScriptedDecisionProcessor`
5. AgentBrainSystem orchestrates priority

**Risk:** HIGHER - Core decision logic changing structure

**Verification:**
- Autonomic overrides still work (hunger, sleep, warmth)
- LLM agents still make decisions
- Scripted agents still function

### Phase 5: Final Cleanup

**Goal:** Rename and clean up.

**Steps:**
1. Rename `AISystem.ts` → `AgentBrainSystem.ts` (or delete if empty)
2. Update all imports
3. Remove dead code
4. Update documentation

**Risk:** LOW - Just renaming

---

## Benefits for Autonomous Agent Workflow

### For Implementation Agents

| Before | After |
|--------|-------|
| "Modify AISystem.ts (4081 lines)" | "Create GatherBehavior.ts (150 lines)" |
| Hard to understand scope | Clear file boundary |
| Merge conflicts likely | Parallel work possible |
| Tests require full system mock | Test one behavior in isolation |

### For Playtest Agents

| Before | After |
|--------|-------|
| "Feature not working" (buried in 500-line method) | "GatherBehavior.execute() not reaching line 47" |
| Hard to isolate cause | Clear module to inspect |
| Console logs from many sources | Logs prefixed by module |

### For Review Agents

| Before | After |
|--------|-------|
| Review 4000 lines | Review 150-300 lines per behavior |
| Hard to verify CLAUDE.md compliance | Each file checkable independently |
| Easy to miss issues | Focused review scope |

---

## Acceptance Criteria

### Criterion 1: Behavior Extraction Complete
- **WHEN:** Checking `packages/core/src/systems/behavior/behaviors/`
- **THEN:** Contains individual files for all 20+ behaviors
- **Verification:** `ls -la` shows ~15 behavior files, each <400 lines

### Criterion 2: Targeting Services Exist
- **WHEN:** Checking `packages/core/src/systems/targeting/`
- **THEN:** Contains ResourceTargeting, PlantTargeting, BuildingTargeting
- **Verification:** Files exist and are imported by behaviors

### Criterion 3: AgentBrainSystem is Thin
- **WHEN:** Checking `AgentBrainSystem.ts` (or remaining AISystem.ts)
- **THEN:** File is <500 lines
- **Verification:** `wc -l` shows <500

### Criterion 4: No Functional Regression
- **WHEN:** Running full test suite
- **THEN:** All existing tests pass
- **Verification:** `npm test` green

### Criterion 5: Behaviors Work
- **WHEN:** Playtesting for 10+ game hours
- **THEN:** Agents gather, build, sleep, seek warmth, deposit items
- **Verification:** Playtest report shows all behaviors functional

---

## Files to Create

### Phase 0 (Shared Services - DO THIS FIRST)
- `services/MovementAPI.ts` - Shared movement commands
- `services/TargetingAPI.ts` - Unified targeting interface
- `services/InteractionAPI.ts` - Harvest, eat, deposit actions
- `services/__tests__/MovementAPI.test.ts`
- `services/__tests__/TargetingAPI.test.ts`

### Phase 1 (Behaviors)
- `behavior/BaseBehavior.ts` - Interface
- `behavior/BehaviorRegistry.ts` - Registration
- `behavior/behaviors/WanderBehavior.ts`
- `behavior/behaviors/IdleBehavior.ts`
- `behavior/behaviors/GatherBehavior.ts`
- `behavior/behaviors/BuildBehavior.ts`
- `behavior/behaviors/SleepBehavior.ts`
- `behavior/behaviors/DepositBehavior.ts`
- `behavior/behaviors/WarmthBehavior.ts`
- ... (15+ more)

### Phase 2 (Targeting Implementations)
- `targeting/ResourceTargeting.ts`
- `targeting/PlantTargeting.ts`
- `targeting/BuildingTargeting.ts`
- `targeting/AgentTargeting.ts`
- `targeting/ThreatTargeting.ts` - For animals

### Phase 3 (Perception)
- `perception/VisionProcessor.ts`
- `perception/HearingProcessor.ts`
- `perception/MeetingDetector.ts`

### Phase 4 (Decision)
- `decision/AutonomicSystem.ts`
- `decision/LLMDecisionProcessor.ts`
- `decision/ScriptedDecisionProcessor.ts`
- `decision/BehaviorPriority.ts`

### Phase 5 (Animal Integration)
- `systems/AnimalBrainSystem.ts` - Uses shared services
- `behavior/animal-behaviors/GrazeBehavior.ts`
- `behavior/animal-behaviors/FleeBehavior.ts`
- `behavior/animal-behaviors/RestBehavior.ts`

---

## Testing Strategy

Each extracted module gets its own test file:

```
behavior/behaviors/__tests__/
├── WanderBehavior.test.ts
├── GatherBehavior.test.ts
├── BuildBehavior.test.ts
└── ...

targeting/__tests__/
├── ResourceTargeting.test.ts
├── PlantTargeting.test.ts
└── ...
```

### Test Pattern for Behaviors

```typescript
// GatherBehavior.test.ts
describe('GatherBehavior', () => {
  let behavior: GatherBehavior;
  let mockResourceTargeting: jest.Mocked<ResourceTargeting>;
  let mockEntity: EntityImpl;
  let mockWorld: World;

  beforeEach(() => {
    mockResourceTargeting = createMockResourceTargeting();
    behavior = new GatherBehavior(mockResourceTargeting, ...);
    mockEntity = createMockAgent({ behavior: 'gather' });
    mockWorld = createMockWorld();
  });

  it('should find nearest resource when no target set', () => {
    mockResourceTargeting.findNearest.mockReturnValue(mockTree);

    behavior.execute(mockEntity, mockWorld);

    expect(mockResourceTargeting.findNearest).toHaveBeenCalled();
    expect(mockEntity.behaviorState.target).toBe(mockTree);
  });

  it('should move toward target when target set', () => {
    mockEntity.behaviorState.target = mockTree;

    behavior.execute(mockEntity, mockWorld);

    expect(mockEntity.getComponent('movement').targetX).toBe(mockTree.position.x);
  });
});
```

---

## Implementation Order (For Work Order Splitting)

If this is too big for one work order, split into:

0. **ai-system-refactor-phase0-services** - Shared services (2-3 hours) ← START HERE
1. **ai-system-refactor-phase1-behaviors** - Extract behaviors (3-4 hours)
2. **ai-system-refactor-phase2-targeting** - Extract targeting (2-3 hours)
3. **ai-system-refactor-phase3-perception** - Extract perception (2-3 hours)
4. **ai-system-refactor-phase4-decisions** - Extract decisions (3-4 hours)
5. **ai-system-refactor-phase5-animals** - Animal system integration (2-3 hours)
6. **ai-system-refactor-phase6-cleanup** - Final cleanup (1-2 hours)

Each phase can be its own work order with independent verification.

**Recommended order:**
- Phase 0 first (creates foundation)
- Phase 1 next (biggest impact on maintainability)
- Phase 2 + Phase 5 can be parallel (targeting + animals both need targeting)
- Phases 3, 4, 6 after core extraction done

---

## Notes for Implementation Agent

1. **Start with WanderBehavior** - Simplest behavior, good template
2. **One extraction at a time** - Don't extract 5 behaviors in one commit
3. **Keep AISystem working** - After each extraction, verify tests pass
4. **Use composition** - Behaviors receive targeting services via constructor
5. **Don't change logic yet** - Pure extraction first, optimization later

---

## Notes for Review Agent

1. **Check file sizes** - Each behavior should be <400 lines
2. **Check coupling** - Behaviors shouldn't import each other
3. **Check targeting reuse** - Multiple behaviors should use same targeting service
4. **Check test coverage** - Each behavior needs its own test file
5. **Check CLAUDE.md** - No silent fallbacks in new code

---

## Notes for Playtest Agent

After each phase, verify:

1. **Phase 1** - All agent behaviors still work
2. **Phase 2** - Agents still find and target resources correctly
3. **Phase 3** - Agents still "see" nearby entities
4. **Phase 4** - Autonomic overrides still work (sleep when tired, etc.)
5. **Phase 5** - Full functionality maintained

---

## Success Metrics

This work order is COMPLETE when:

1. ✅ AISystem.ts (or AgentBrainSystem.ts) is <500 lines
2. ✅ 15+ behavior files exist in `behavior/behaviors/`
3. ✅ Targeting services are reusable across behaviors
4. ✅ Each behavior has its own test file
5. ✅ All existing tests pass
6. ✅ Playtest confirms no functional regression
7. ✅ Future work orders can target specific behavior files

---

**Estimated Complexity:** VERY HIGH (Major architectural refactor)
**Estimated Time:** 15-25 hours (split across phases)
**Priority:** HIGH (Blocking maintainability and future features)
**Dependencies:** Complete component-update-utility first (safer updates)
