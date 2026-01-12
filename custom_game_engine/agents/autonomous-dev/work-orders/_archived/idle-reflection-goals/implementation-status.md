# Implementation Status: Idle Behaviors & Personal Goals

**Date:** 2025-12-28
**Status:** BLOCKED - Test Architecture Mismatch

## Summary

The implementation has encountered architectural issues. The test files expect a different component architecture than what exists in the codebase. The tests were written expecting class-based components with a simplified interface, but the codebase uses a more complex interface-based ECS architecture.

## What Was Implemented

### ✅ Completed
1. **GoalsComponent** - Class-based component for tracking personal goals
   - Supports up to 5 goals
   - Goal categories (mastery, social, creative, exploration, security)
   - Progress tracking and milestones
   - Serialization support
   - **All tests passing** (17/17)

2. **Class-based Wrapper Components**
   - `NeedsComponent` (class-based version)
   - `PersonalityComponent` (class-based version)
   - `MemoryComponent` (class-based version in MemoryComponentClass.ts)
   - `ActionQueue` (class-based version in ActionQueueClass.ts)

3. **IdleBehaviorSystem** - Partial implementation
   - Behavior selection logic
   - Personality-based weighting
   - Mood-based adjustments
   - **1/11 tests passing**

### ❌ Not Implemented
1. **ReflectBehavior** - Not started
2. **Goal generation during reflection** - Not started
3. **Other idle behaviors** - Not started
   - ChatIdleBehavior
   - AmuseSelfBehavior
   - ObserveBehavior
   - SitQuietlyBehavior
   - PracticeSkillBehavior
   - WanderAimlesslyBehavior
4. **ReflectionSystem** - Not started
5. **Prompt integration** - Not started
6. **UI updates** - Not started

## Root Cause Analysis

The test files were written with assumptions about the component architecture that don't match the actual codebase:

1. **Component Access Pattern Mismatch**
   - Tests expect: `entity.getComponent('action_queue')` returns class instance
   - Reality: Component system uses a different storage/retrieval mechanism
   - The `ActionQueue` as a component doesn't persist correctly across multiple accesses

2. **System Interface Mismatch**
   - Tests expect: `system.update(world, deltaTime)`
   - Actual System interface: `update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number)`
   - Tests don't pass entities array to systems

3. **World API Mismatch**
   - Tests assume: Simple entity iteration
   - Reality: Entities stored in `(world as any).entities` Map, requires type casting

## Recommended Path Forward

### Option 1: Fix the Tests (Recommended)
The tests need to be rewritten to match the actual ECS architecture:

1. Update test setup to properly integrate with the existing ECS
2. Use the actual `System` interface with required `id` and `requiredComponents`
3. Properly handle entity component storage
4. Pass entities array to system.update()

### Option 2: Create an Adapter Layer
Create wrapper/adapter classes that bridge the test expectations with the actual ECS:

1. Create a TestWorld wrapper that provides simplified APIs
2. Create a TestActionQueue that persists properly
3. Create TestEntity wrappers

### Option 3: Redesign Architecture
Align the codebase more closely with class-based components (significant refactor).

## Test Results

### GoalsComponent.test.ts: ✅ 17/17 PASSING
All goal tracking functionality works correctly.

### IdleBehaviorSystem.test.ts: ❌ 1/11 PASSING
- ✅ Should NOT select idle behavior if agent has urgent tasks
- ❌ Component access issues in 10 other tests

### ReflectBehavior.test.ts: ❌ 0/22 NOT RUN
Missing ReflectBehavior implementation.

### IdleBehaviors.integration.test.ts: ❌ 0/13 NOT RUN
Missing supporting systems and behaviors.

## Files Created

```
packages/core/src/components/GoalsComponent.ts
packages/core/src/components/MemoryComponentClass.ts
packages/core/src/actions/ActionQueueClass.ts
packages/core/src/systems/IdleBehaviorSystem.ts
```

## Files Modified

```
packages/core/src/components/NeedsComponent.ts (added class-based export)
packages/core/src/components/PersonalityComponent.ts (added class-based export)
packages/core/src/__tests__/IdleBehaviorSystem.test.ts (updated imports)
packages/core/src/__tests__/ReflectBehavior.test.ts (updated imports)
packages/core/src/__tests__/IdleBehaviors.integration.test.ts (updated imports)
```

## Next Steps

**Decision needed:** Which option above should be pursued?

If Option 1 (Fix Tests):
1. Update all test files to use proper System interface
2. Create proper test setup with entity arrays
3. Fix component persistence issues
4. Continue implementation of behaviors

If Option 2 (Adapter Layer):
1. Create test adapters
2. Continue implementation with adapted tests

If Option 3 (Redesign):
1. Propose architectural changes
2. Get approval for refactor
3. Implement new architecture
