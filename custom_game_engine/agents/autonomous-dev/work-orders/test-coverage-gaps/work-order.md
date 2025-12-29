# Work Order: Test Coverage Gaps

**Phase:** Testing (Quality Assurance)
**Created:** 2025-12-28
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/test-coverage-gaps/spec.md`
- **Related Guidelines:** `CLAUDE.md` (Error Handling: No Silent Fallbacks)

---

## Requirements Summary

74% of core systems (29/39) have no tests. This work order prioritizes comprehensive test coverage:

1. The test suite SHALL cover all critical systems (PlantSystem, BuildingSystem, NeedsSystem)
2. The test suite MUST include error path tests per CLAUDE.md guidelines
3. The test suite SHALL have zero skipped tests without documented reason
4. The test suite MUST eliminate all placeholder assertions (expect(true).toBe(true))
5. The test suite SHALL use real entity tests instead of heavy mocking

---

## Acceptance Criteria

### Criterion 1: Critical Systems Have Tests
- **WHEN:** PlantSystem, BuildingSystem, NeedsSystem are checked
- **THEN:** Each SHALL have dedicated test files with 20+ real assertions
- **Verification:** Run `npm test` and verify test count for each system

### Criterion 2: No Skipped Tests
- **WHEN:** Running `npm test`
- **THEN:** No tests SHALL be marked `.skip` without documented reason in test file
- **Verification:** `grep -rn "\.skip\|it\.skip\|describe\.skip" packages/core/src/**/*.test.ts` returns zero results

### Criterion 3: No Placeholder Assertions
- **WHEN:** Searching test files for placeholder assertions
- **THEN:** No `expect(true).toBe(true)` or similar SHALL exist
- **Verification:** `grep -rn "expect(true)" packages/core/src/**/*.test.ts` returns zero results

### Criterion 4: Error Paths Are Tested
- **WHEN:** A system throws on invalid input (missing component, invalid species, etc.)
- **THEN:** A test SHALL verify the throw with correct error message
- **Verification:** Each system test file has a `describe('error handling')` block

### Criterion 5: Real Entity Tests Replace Mocking
- **WHEN:** Tests need entities with components
- **THEN:** Tests SHALL create real World instances with real entities
- **Verification:** No `vi.fn().mockReturnValue([])` patterns that return empty arrays

### Criterion 6: Integration Tests Exist
- **WHEN:** A system has complex interactions with other systems
- **THEN:** An integration test SHALL verify end-to-end behavior
- **Verification:** Integration test files exist in `__tests__/` for cross-system features

---

## System Integration

### Existing Systems Requiring Tests

| System | File | Lines | Current Tests | Priority |
|--------|------|-------|---------------|----------|
| PlantSystem | `packages/core/src/systems/PlantSystem.ts` | 940 | None | **HIGHEST** |
| BuildingSystem | `packages/core/src/systems/BuildingSystem.ts` | 888 | Partial (integration) | **HIGHEST** |
| NeedsSystem | `packages/core/src/systems/NeedsSystem.ts` | ~200 | Partial (integration) | **HIGHEST** |
| MetricsCollectionSystem | `packages/core/src/systems/MetricsCollectionSystem.ts` | 764 | Partial (integration) | HIGH |
| GoalGenerationSystem | `packages/core/src/systems/GoalGenerationSystem.ts` | 620 | None | HIGH |
| TradingSystem | `packages/core/src/systems/TradingSystem.ts` | 541 | None | HIGH |
| ResearchSystem | `packages/core/src/systems/ResearchSystem.ts` | 538 | None | HIGH |
| MoodSystem | `packages/core/src/systems/MoodSystem.ts` | 532 | None | HIGH |
| TimeSystem | `packages/core/src/systems/TimeSystem.ts` | ~150 | Partial (integration) | MEDIUM |
| MovementSystem | `packages/core/src/systems/MovementSystem.ts` | ~250 | Partial (integration) | MEDIUM |

### Action Handlers Requiring Tests

| Handler | File | Current Tests | Priority |
|---------|------|---------------|----------|
| TillActionHandler | `packages/core/src/actions/TillActionHandler.ts` | **Skipped** | HIGH |
| PlantActionHandler | `packages/core/src/actions/PlantActionHandler.ts` | None | HIGH |
| CraftActionHandler | `packages/core/src/actions/CraftActionHandler.ts` | None | HIGH |
| TradeActionHandler | `packages/core/src/actions/TradeActionHandler.ts` | None | MEDIUM |
| GatherSeedsActionHandler | `packages/core/src/actions/GatherSeedsActionHandler.ts` | None | MEDIUM |

### Behaviors Requiring Tests

| Behavior | File | Current Tests | Priority |
|----------|------|---------------|----------|
| BuildBehavior | `packages/core/src/behavior/behaviors/BuildBehavior.ts` | None | HIGH |
| CraftBehavior | `packages/core/src/behavior/behaviors/CraftBehavior.ts` | None | HIGH |
| GatherBehavior | `packages/core/src/behavior/behaviors/GatherBehavior.ts` | Partial | HIGH |
| SeekFoodBehavior | `packages/core/src/behavior/behaviors/SeekFoodBehavior.ts` | None | HIGH |

### Components Used

Tests will interact with these component types:
- `plant` - PlantComponent
- `building` - BuildingComponent
- `needs` - NeedsComponent
- `position` - PositionComponent
- `resource` - ResourceComponent
- `skills` - SkillsComponent
- `agent` - AgentComponent

**IMPORTANT:** Component type strings use lowercase_with_underscores, not PascalCase.

### Events

Tests should verify these events are emitted correctly:
- **PlantSystem**: `plant_growth`, `plant_harvest`, `plant_death`
- **BuildingSystem**: `building_complete`, `building_started`, `resource_consumed`
- **NeedsSystem**: `need_satisfied`, `need_critical`, `agent_died`

---

## Files Likely Modified

### New Test Files to Create (Week 1 - Critical Systems)

```
packages/core/src/systems/__tests__/PlantSystem.test.ts
packages/core/src/systems/__tests__/BuildingSystem.test.ts
packages/core/src/systems/__tests__/NeedsSystem.test.ts
```

### Existing Test Files to Fix (Week 1)

```
packages/core/src/systems/__tests__/JournalingSystem.test.ts (un-skip tests)
packages/core/src/systems/__tests__/AgentBrainSystem.test.ts (remove heavy mocking)
packages/core/src/systems/__tests__/TillingAction.test.ts (un-skip tests)
```

### New Test Files to Create (Week 2 - Core Gameplay)

```
packages/core/src/systems/__tests__/TimeSystem.test.ts
packages/core/src/actions/__tests__/ActionQueue.test.ts
packages/core/src/actions/__tests__/PlantActionHandler.test.ts
```

### New Test Files to Create (Week 3 - Economy & Social)

```
packages/core/src/systems/__tests__/TradingSystem.test.ts
packages/core/src/systems/__tests__/CommunicationSystem.test.ts (if not exist)
packages/core/src/systems/__tests__/GoalGenerationSystem.test.ts
```

### New Test Files to Create (Week 4 - Behaviors)

```
packages/core/src/behavior/behaviors/__tests__/BuildBehavior.test.ts
packages/core/src/behavior/behaviors/__tests__/CraftBehavior.test.ts
packages/core/src/behavior/behaviors/__tests__/FarmBehaviors.test.ts
```

---

## Test Template

All new tests MUST follow this structure:

```typescript
// packages/core/src/systems/__tests__/XxxSystem.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World';
import { XxxSystem } from '../XxxSystem';
import { XxxComponent } from '../../components/XxxComponent';

describe('XxxSystem', () => {
  let world: World;
  let system: XxxSystem;

  beforeEach(() => {
    world = new World();
    system = new XxxSystem();
    world.registerSystem(system);
  });

  describe('initialization', () => {
    it('registers with correct priority', () => {
      expect(system.priority).toBe(EXPECTED_PRIORITY);
    });

    it('subscribes to required events', () => {
      // Verify event subscriptions
    });
  });

  describe('update', () => {
    it('processes entities with required components', () => {
      const entity = createEntityWithComponents(world);

      system.update(16);

      expect(entity.getComponent('xxx').value).toBe(expectedValue);
    });

    it('skips entities without required components', () => {
      const entity = createEntityWithoutComponents(world);

      // Should not throw
      system.update(16);
    });
  });

  describe('error handling', () => {
    it('throws for invalid state', () => {
      const entity = createInvalidEntity(world);

      expect(() => system.update(16)).toThrow(/expected error message/);
    });
  });

  describe('edge cases', () => {
    it('handles empty entity list', () => {
      system.update(16);
      // Should not throw
    });

    it('handles maximum values', () => {
      // Test boundary conditions
    });
  });
});
```

---

## Implementation Priority

### Week 1: Critical Systems (Days 1-5)
1. **Day 1-2:** `PlantSystem.test.ts` - Plant growth, lifecycle, harvesting (20+ tests)
2. **Day 3:** `BuildingSystem.test.ts` - Construction, resource consumption (15+ tests)
3. **Day 4:** `NeedsSystem.test.ts` - Hunger, energy, health decay (12+ tests)
4. **Day 5:** Fix `JournalingSystem.test.ts` - Un-skip all tests, fix component access

### Week 2: Core Gameplay (Days 6-10)
5. **Day 6:** `TimeSystem.test.ts` - Time progression, day/night cycle (10+ tests)
6. **Day 7:** `ActionQueue.test.ts` - Action queuing, execution (12+ tests)
7. **Day 8-9:** Un-skip `TillActionHandler.test.ts`, implement full coverage (15+ tests)
8. **Day 10:** `PlantActionHandler.test.ts` - Planting logic (10+ tests)

### Week 3: Economy & Social (Days 11-15)
9. **Day 11-12:** `TradingSystem.test.ts` - Trade mechanics, currency (18+ tests)
10. **Day 13:** `CommunicationSystem.test.ts` - If missing, create tests (12+ tests)
11. **Day 14-15:** `GoalGenerationSystem.test.ts` - Goal creation, prioritization (15+ tests)

### Week 4: Behaviors (Days 16-20)
12. **Day 16-17:** `BuildBehavior.test.ts` - Building construction behavior (12+ tests)
13. **Day 18:** `CraftBehavior.test.ts` - Crafting behavior (10+ tests)
14. **Day 19-20:** `FarmBehaviors.test.ts` - Farming behaviors (15+ tests)

### Ongoing: Error Path Tests
- After each silent-fallback-violations fix, add error handling tests

---

## Success Metrics

| Metric | Current | Target | Verification |
|--------|---------|--------|--------------|
| Systems with tests | 10 (25%) | 30 (77%) | Count test files in `systems/__tests__/` |
| Action handlers with tests | 4 (28%) | 12 (85%) | Count test files in `actions/__tests__/` |
| Behaviors with tests | 4 (13%) | 15 (48%) | Count test files in `behavior/behaviors/__tests__/` |
| Skipped tests | 12+ | 0 | `grep -rn "\.skip"` |
| Placeholder assertions | 28 | 0 | `grep -rn "expect(true)"` |
| Build passes | Varies | 100% | `npm run build` |
| All tests pass | Varies | 100% | `npm test` |

---

## Notes for Implementation Agent

### Error Handling Guidelines (from CLAUDE.md)

**NEVER use fallback values to mask errors.** Tests should verify that:
- Missing required fields raise appropriate exceptions
- Invalid data types are rejected
- Error messages are clear and actionable

Example error path test:
```typescript
describe('error handling', () => {
  it('throws when entity lacks required component', () => {
    const entity = world.createEntity();
    // Don't add NeedsComponent

    expect(() => {
      needsSystem.update([entity], 16);
    }).toThrow(/missing required 'needs' component/);
  });
});
```

### Testing Real Entities vs Mocking

**BAD** (from AgentBrainSystem.test.ts):
```typescript
function createMockWorld(): World {
  return {
    query: vi.fn().mockReturnValue({
      executeEntities: vi.fn().mockReturnValue([]),  // Always empty!
    }),
  } as unknown as World;
}
```

**GOOD** (create real entities):
```typescript
function createTestWorld(): World {
  const world = new World();
  const agent = world.createEntity();
  agent.addComponent(new AgentComponent());
  agent.addComponent(new PositionComponent(10, 10));
  agent.addComponent(new NeedsComponent());
  return world;
}
```

### Component Type Names

Always use lowercase_with_underscores:
```typescript
// GOOD
entity.hasComponent('spatial_memory')
entity.getComponent('needs')

// BAD
entity.hasComponent('SpatialMemory')  // ✗ WRONG
```

---

## Notes for Playtest Agent

### UI Behaviors to Verify

N/A - This is a testing work order, no UI changes.

### Edge Cases to Test

After implementation:
1. Run full test suite: `npm test`
2. Verify no skipped tests: `grep -rn "\.skip" packages/core/src/**/*.test.ts`
3. Check for placeholders: `grep -rn "expect(true)" packages/core/src/**/*.test.ts`
4. Run build: `npm run build` (must pass)

---

## Verification Before Completion

Before marking this work order complete:

1. **Run the build** - `npm run build` must pass
2. **Run all tests** - `npm test` must pass with 0 failures
3. **Check for skipped tests** - Must return empty:
   ```bash
   grep -rn "\.skip\|it\.skip\|describe\.skip" packages/core/src/**/*.test.ts
   ```
4. **Check for placeholders** - Must return empty:
   ```bash
   grep -rn "expect(true).toBe(true)" packages/core/src/**/*.test.ts
   ```
5. **Verify error path coverage** - Each critical system has error handling tests
6. **Check test counts** - Meet minimum thresholds:
   - PlantSystem.test.ts: 20+ tests
   - BuildingSystem.test.ts: 15+ tests
   - NeedsSystem.test.ts: 12+ tests

---

**End of Work Order**
