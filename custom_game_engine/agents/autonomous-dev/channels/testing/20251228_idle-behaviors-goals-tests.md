# TESTS WRITTEN: Idle Behaviors & Personal Goals

**Date:** 2025-12-28
**Test Agent:** test-agent-001
**Work Order:** `work-orders/idle-reflection-goals/work-order.md`
**Status:** ✅ RED PHASE (All tests failing - expected for TDD)

---

## Test Files Created

### Unit Tests (5 files)

1. **`packages/core/src/__tests__/GoalsComponent.test.ts`** (140 lines)
   - Component type naming
   - Goal creation and validation
   - Progress tracking
   - Milestone completion
   - Goal completion
   - Goal queries (by category, active only)
   - Serialization/deserialization
   - Error handling (missing fields, invalid categories)

2. **`packages/core/src/__tests__/IdleBehaviorSystem.test.ts`** (200 lines)
   - Idle behavior selection logic
   - Behavior weighting by personality traits
   - Behavior weighting by mood states
   - Priority assignment (low priority for idle)
   - Behavior variety (4+ different behaviors)
   - Error handling (missing components)

3. **`packages/core/src/__tests__/ReflectBehavior.test.ts`** (190 lines)
   - Reflection triggers (time-based, evening)
   - Cooldown enforcement (not more than 1/day)
   - Memory review (prioritize high importance)
   - Internal monologue generation
   - Goal formation during reflection (30% chance)
   - Event emission (reflection_complete, goal_formed)
   - Error handling

4. **`packages/core/src/__tests__/GoalGeneration.test.ts`** (230 lines)
   - Personality-based goal category selection
   - Goal structure validation (all required fields)
   - Unique goal ID generation
   - 2-4 milestones per goal
   - Personal aspiration language (not game objectives)
   - Skill-based goal customization
   - Realistic target completion times (3-30 days)
   - Goal category distribution
   - Error handling

5. **`packages/llm/src/__tests__/GoalPromptIntegration.test.ts`** (160 lines)
   - Goal section in agent prompts
   - Progress display in prompts
   - Motivation display
   - Milestone progress display
   - Idle behavior prompts with goal context
   - Reflection prompts with goal context
   - Goal formation prompts (<3 goals)
   - Readable formatting
   - Error handling (missing components)

### Integration Tests (1 file)

6. **`packages/core/src/__tests__/IdleBehaviors.integration.test.ts`** (340 lines)
   - **Acceptance Criterion 1:** <30% pure idle behavior over time
   - **Acceptance Criterion 2:** Reflection frequency 1-3x per game day
   - **Acceptance Criterion 3:** 80%+ agents have goals by day 3
   - **Acceptance Criterion 4:** Goal-personality alignment
   - **Acceptance Criterion 5:** Goal progress tracking on action completion
   - **Acceptance Criterion 7:** Mood-driven behavior selection
   - **Acceptance Criterion 8:** Internal monologue generation
   - **Acceptance Criterion 9:** Casual chat when lonely
   - Event emission verification
   - Multi-agent simulation

---

## Test Coverage Summary

| Component/System | Unit Tests | Integration Tests | Total Tests |
|------------------|-----------|------------------|-------------|
| GoalsComponent | 15 | 3 | 18 |
| IdleBehaviorSystem | 12 | 5 | 17 |
| ReflectBehavior | 11 | 2 | 13 |
| Goal Generation | 14 | 1 | 15 |
| Prompt Integration | 13 | 0 | 13 |
| **TOTAL** | **65** | **11** | **76** |

---

## Acceptance Criteria Coverage

| Criterion | Tested | Test File |
|-----------|--------|-----------|
| 1. Varied idle behavior selection | ✅ | IdleBehaviorSystem.test.ts, IdleBehaviors.integration.test.ts |
| 2. Reflection triggers | ✅ | ReflectBehavior.test.ts, IdleBehaviors.integration.test.ts |
| 3. Goal generation during reflection | ✅ | ReflectBehavior.test.ts, IdleBehaviors.integration.test.ts |
| 4. Goal-personality alignment | ✅ | GoalGeneration.test.ts, IdleBehaviors.integration.test.ts |
| 5. Goal progress tracking | ✅ | GoalsComponent.test.ts, IdleBehaviors.integration.test.ts |
| 6. Goals in prompt context | ✅ | GoalPromptIntegration.test.ts |
| 7. Mood-driven behavior selection | ✅ | IdleBehaviorSystem.test.ts, IdleBehaviors.integration.test.ts |
| 8. Internal monologue generation | ✅ | ReflectBehavior.test.ts, IdleBehaviors.integration.test.ts |
| 9. Casual chat behavior | ✅ | IdleBehaviors.integration.test.ts |

**Coverage:** 9/9 acceptance criteria (100%)

---

## Test Execution Results

```
npm test -- GoalsComponent.test.ts IdleBehaviorSystem.test.ts ReflectBehavior.test.ts GoalGeneration.test.ts GoalPromptIntegration.test.ts IdleBehaviors.integration.test.ts
```

**Result:** 6/6 test files FAILED (expected)

**Reason:** No implementation files exist yet

**Failures:**
- `GoalsComponent` - Does not exist
- `IdleBehaviorSystem` - Does not exist
- `ReflectBehavior` - Does not exist
- `GoalGenerationSystem` - Does not exist
- Prompt builder methods - Not yet implemented

**Status:** ✅ **TDD RED PHASE CONFIRMED**

This is the correct and expected state for TDD. Tests should fail until implementation is complete.

---

## Key Test Patterns Used

### 1. Error Path Testing (per CLAUDE.md)
All tests include error cases for missing required data:
```typescript
it('should throw when personality is missing', () => {
  expect(() => {
    generatePersonalGoal(null as any, {});
  }).toThrow('missing required');
});
```

### 2. No Silent Fallbacks (per CLAUDE.md)
Tests verify exceptions are thrown, not default values returned:
```typescript
it('should throw when adding goal with missing required fields', () => {
  expect(() => {
    component.addGoal({} as PersonalGoal);
  }).toThrow('missing required field');
});
```

### 3. Component Type Naming (per CLAUDE.md)
Tests verify lowercase_with_underscores naming:
```typescript
it('should use lowercase type name', () => {
  expect(component.type).toBe('goals');
});
```

### 4. Statistical Testing for Randomness
For weighted selection, tests use multiple trials:
```typescript
const behaviors: string[] = [];
for (let i = 0; i < 50; i++) {
  // Run selection
  behaviors.push(selected);
}
expect(chatCount).toBeGreaterThan(10);
```

### 5. Event-Driven Testing
Tests verify EventBus integration:
```typescript
const eventHandler = vi.fn();
world.eventBus.on('agent:goal_formed', eventHandler);
// ... trigger action
expect(eventHandler).toHaveBeenCalled();
```

---

## Implementation Guidance

### Components to Create
1. `packages/core/src/components/GoalsComponent.ts`
   - `type = 'goals'` (lowercase!)
   - `addGoal()`, `updateGoalProgress()`, `completeMilestone()`
   - Max 5 goals, throw if exceeded
   - Validate goal categories

### Systems to Create
2. `packages/core/src/systems/IdleBehaviorSystem.ts`
   - Select idle behavior based on personality + mood
   - 7 behavior types with weighted selection
   - Low priority (0.1-0.3)

3. `packages/core/src/systems/GoalGenerationSystem.ts`
   - `generatePersonalGoal(personality, skills)` function
   - Weight categories by personality traits
   - 2-4 milestones per goal
   - 3-30 day targets

### Behaviors to Create
4. `packages/core/src/behavior/behaviors/ReflectBehavior.ts`
   - Cooldown: 1 game day
   - Review memories by importance
   - 30% chance to form goal if <3 goals
   - Generate internal monologue
   - Emit events

5. Other idle behaviors (6 files)
   - `ChatIdleBehavior.ts`
   - `AmuseSelfBehavior.ts`
   - `ObserveBehavior.ts`
   - `SitQuietlyBehavior.ts`
   - `PracticeSkillBehavior.ts`
   - `WanderAimlesslyBehavior.ts` (may already exist)

### Prompt Builder Changes
6. `packages/llm/src/StructuredPromptBuilder.ts`
   - Add `buildIdleDecisionPrompt()` method
   - Add `buildReflectionPrompt()` method
   - Include goals section in main prompt
   - Format with progress, motivation, milestones

---

## Notes for Implementation Agent

### Critical Requirements from Tests

1. **Component Type Naming:** Use `'goals'`, not `'Goals'`

2. **No Fallback Values:** Throw errors for missing data:
   ```typescript
   if (!personality) {
     throw new Error('missing required component: personality');
   }
   ```

3. **Goal Limits:** Max 5 goals, throw if exceeded

4. **Goal Categories:** Must validate against enum:
   - mastery
   - social
   - creative
   - security
   - exploration

5. **Reflection Cooldown:** Track `lastReflectionTime` in MemoryComponent

6. **Event Emission:** Emit these events:
   - `agent:reflection_complete`
   - `agent:goal_formed`
   - `agent:goal_milestone`
   - `agent:goal_completed`
   - `agent:internal_monologue`

7. **Weighting Formula:** Personality traits must influence selection:
   - High conscientiousness → mastery goals
   - High extraversion + agreeableness → social goals
   - High openness → creative/exploration goals

8. **Idle Behavior Priority:** All idle behaviors: 0.1-0.3 priority

### Common Pitfalls to Avoid

1. **Don't use console.log** - Use Agent Dashboard for debugging
2. **Don't use default values** - Throw errors on missing data
3. **Don't use PascalCase** for component types
4. **Don't skip event emission** - Tests verify events
5. **Don't ignore cooldowns** - Reflection should be rate-limited

---

## Ready for Implementation

**Next Agent:** Implementation Agent
**Expected Timeline:** 25-32 hours (per work order)

**When Implementation is Complete:**
1. Run same test command
2. All tests should PASS (TDD green phase)
3. If any fail, return to implementation agent with details

---

**Test Agent Sign-off:** ✅ Tests written, TDD red phase confirmed, ready for implementation.
