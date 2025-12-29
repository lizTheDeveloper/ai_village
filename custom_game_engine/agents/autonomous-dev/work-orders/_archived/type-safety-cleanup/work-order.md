# Work Order: Type Safety Cleanup

**Phase:** Infrastructure (Code Quality)
**Created:** 2025-12-26
**Priority:** HIGH
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

The codebase has **462 `any` type usages** and **9 spread operator bugs** in `updateComponent` calls.

These cause:
- Silent runtime errors
- Lost component state (spread operator bug)
- Hard to refactor safely
- No IDE autocompletion

### Breakdown by File

| File | `any` Count | Issue |
|------|-------------|-------|
| AISystem.ts | 50 | Component casts |
| StructuredPromptBuilder.ts | 37 | Component casts |
| MemoryFormationSystem.ts | 34 | Memory types |
| World.ts | 29 | Generic entity handling |
| ExplorationSystem.ts | 21 | Component casts |

### Spread Operator Bugs

```bash
# These 9 locations destroy class prototypes:
packages/core/src/systems/AISystem.ts:1244
packages/core/src/systems/AISystem.ts:1306
packages/core/src/systems/AISystem.ts:1479
packages/core/src/systems/AISystem.ts:1817
packages/core/src/systems/AISystem.ts:1884
packages/core/src/systems/AISystem.ts:2034
packages/core/src/systems/AISystem.ts:2820
packages/core/src/systems/SteeringSystem.ts:123
packages/core/src/systems/SteeringSystem.ts:125
```

---

## Requirements

### R1: Create safeUpdateComponent Utility

```typescript
// packages/core/src/utils/componentUtils.ts
export function safeUpdateComponent<T extends object>(
  entity: EntityImpl,
  componentType: string,
  updater: (current: T) => Partial<T>
): void {
  entity.updateComponent(componentType, (current: T) => {
    // Preserve prototype chain
    const updated = Object.create(Object.getPrototypeOf(current));
    Object.assign(updated, current);
    const changes = updater(current);
    Object.assign(updated, changes);
    return updated;
  });
}
```

### R2: Fix All Spread Operator Usages

Replace:
```typescript
entity.updateComponent('steering', (current: any) => ({ ...current, behavior: 'wander' }));
```

With:
```typescript
safeUpdateComponent(entity, 'steering', (current) => ({ behavior: 'wander' }));
```

### R3: Add Component Type Helpers

```typescript
// packages/core/src/utils/componentHelpers.ts
export function getAgentComponent(entity: Entity): AgentComponent | null {
  return entity.getComponent<AgentComponent>('agent');
}

export function getPositionComponent(entity: Entity): PositionComponent | null {
  return entity.getComponent<PositionComponent>('position');
}

// ... for all common components
```

### R4: Reduce `any` Count by 80%

Target: < 100 `any` usages (from 462)

Focus areas:
1. Replace `as any` casts with proper types
2. Use component type helpers
3. Define interfaces for untyped objects
4. Use generics instead of any

---

## Phase 1: Fix Spread Operator Bugs (Critical)

### Files to Modify

**AISystem.ts** (7 occurrences)
```typescript
// Before (line 1244)
entity.updateComponent('steering', (current: any) => ({ ...current, behavior: 'wander' }));

// After
safeUpdateComponent<SteeringComponent>(entity, 'steering', () => ({ behavior: 'wander' }));
```

**SteeringSystem.ts** (2 occurrences)
```typescript
// Before (line 123)
impl.updateComponent('velocity', (v: any) => ({ ...v, vx: newVx * scale, vy: newVy * scale }));

// After
safeUpdateComponent<VelocityComponent>(impl, 'velocity', () => ({
  vx: newVx * scale,
  vy: newVy * scale
}));
```

### Verification

```bash
# Must return 0
grep -rn "updateComponent.*{[[:space:]]*\.\.\." packages/core/src/ | wc -l
```

---

## Phase 2: Type Component Access

### Create Type Helpers

```typescript
// packages/core/src/utils/componentHelpers.ts
import type { Entity } from '../ecs/Entity';
import type { EntityImpl } from '../ecs/Entity';
import type {
  AgentComponent,
  PositionComponent,
  MovementComponent,
  VisionComponent,
  NeedsComponent,
  InventoryComponent,
  MemoryComponent,
  SteeringComponent,
  VelocityComponent,
  CircadianComponent,
  TemperatureComponent,
} from '../components';

export function getAgent(entity: Entity): AgentComponent | null {
  return (entity as EntityImpl).getComponent<AgentComponent>('agent');
}

export function getPosition(entity: Entity): PositionComponent | null {
  return (entity as EntityImpl).getComponent<PositionComponent>('position');
}

export function getMovement(entity: Entity): MovementComponent | null {
  return (entity as EntityImpl).getComponent<MovementComponent>('movement');
}

export function getVision(entity: Entity): VisionComponent | null {
  return (entity as EntityImpl).getComponent<VisionComponent>('vision');
}

export function getNeeds(entity: Entity): NeedsComponent | null {
  return (entity as EntityImpl).getComponent<NeedsComponent>('needs');
}

export function getInventory(entity: Entity): InventoryComponent | null {
  return (entity as EntityImpl).getComponent<InventoryComponent>('inventory');
}

// ... etc
```

### Usage

```typescript
// Before
const agent = impl.getComponent('agent') as any;
const needs = impl.getComponent('needs') as any;

// After
import { getAgent, getNeeds } from '../utils/componentHelpers';
const agent = getAgent(impl);
const needs = getNeeds(impl);
```

---

## Phase 3: Fix Top Offenders

### AISystem.ts (50 → 10 any)

Most `any` types are component casts. Replace with typed helpers.

### MemoryFormationSystem.ts (34 → 5 any)

Define proper memory interfaces:
```typescript
interface EpisodicMemory {
  id: string;
  type: 'observation' | 'interaction' | 'reflection';
  content: string;
  timestamp: number;
  importance: number;
  entities: string[];
}
```

### World.ts (29 → 10 any)

Generic entity handling needs proper typing for query results.

---

## Acceptance Criteria

### Criterion 1: Spread Operator Bugs Fixed
- `grep -rn "updateComponent.*{[[:space:]]*\.\.\." packages/core/src/ | wc -l` returns 0
- **Verification:** grep returns empty

### Criterion 2: safeUpdateComponent Exists
- Utility function created and exported
- Used in all component updates
- **Verification:** File exists, imports verified

### Criterion 3: `any` Count Reduced 80%
- From 462 to < 100
- `grep -rn ": any\|as any" packages/*/src/ | grep -v __tests__ | wc -l` < 100
- **Verification:** grep count

### Criterion 4: Type Helpers Exist
- componentHelpers.ts created
- Common components have typed accessors
- **Verification:** File exists

### Criterion 5: Build Passes Strict
- `npm run build` passes
- No new TypeScript errors
- **Verification:** Build log

---

## Files to Create

- `packages/core/src/utils/componentUtils.ts` - safeUpdateComponent
- `packages/core/src/utils/componentHelpers.ts` - typed accessors
- `packages/core/src/types/MemoryTypes.ts` - memory interfaces

## Files to Modify

- `packages/core/src/systems/AISystem.ts` - Fix spreads, use helpers
- `packages/core/src/systems/SteeringSystem.ts` - Fix spreads
- `packages/core/src/systems/MemoryFormationSystem.ts` - Add types
- `packages/core/src/World.ts` - Improve generics
- All files using `as any` for components

---

## Migration Strategy

1. **Create componentUtils.ts** - safeUpdateComponent utility
2. **Fix spread operator bugs** - All 9 occurrences
3. **Create componentHelpers.ts** - Typed accessors
4. **Fix AISystem.ts** - Replace `as any` with helpers
5. **Fix other high-count files** - MemoryFormationSystem, World, etc.
6. **Verify any count** - Should be < 100
7. **Run tests** - Ensure nothing broken

---

## Notes for Implementation Agent

1. **Spread fixes first** - They cause runtime bugs
2. **Use helpers consistently** - Don't mix patterns
3. **Don't force types** - If genuinely unknown, any is ok (with comment)
4. **Test component updates** - Verify state persists
5. **Check for prototype methods** - Some components have class methods

---

## Notes for Review Agent

1. **Grep for spread operators** - Must return 0
2. **Grep for any count** - Must be < 100
3. **Check helper usage** - Should be consistent
4. **Verify prototypes preserved** - Run tests

---

## Success Metrics

- ✅ 0 spread operators in updateComponent
- ✅ < 100 `any` usages (from 462)
- ✅ safeUpdateComponent utility exists
- ✅ componentHelpers.ts exists
- ✅ Build passes
- ✅ All tests pass

---

**Estimated Complexity:** MEDIUM-HIGH
**Estimated Time:** 6-8 hours
**Priority:** HIGH (prevents bugs + enables safe refactoring)
**Dependencies:** Should complete BEFORE ai-system-refactor
