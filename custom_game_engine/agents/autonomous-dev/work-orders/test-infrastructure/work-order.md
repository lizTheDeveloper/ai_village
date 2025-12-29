# Work Order: Test Infrastructure Fixes

**Phase:** Infrastructure (Test Reliability)
**Created:** 2025-12-26
**Priority:** MEDIUM
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

Multiple test suites are failing due to incorrect test setup patterns:

1. **Interface imported as class** - Tests import `AgentComponent` (an interface) and try to use it as a constructor, causing "Cannot read properties of undefined (reading 'type')" errors

2. **Mock world missing methods** - Test mocks don't implement `getEntity()` which panels now require

3. **Inconsistent component creation** - Some tests use factory functions correctly, others don't

**Affected test files (41+ failing tests):**
- `packages/renderer/src/__tests__/AgentInfoPanel-inventory.test.ts` (30 failing)
- `packages/renderer/src/__tests__/AgentInfoPanel-thought-speech.test.ts` (10 failing)
- `packages/core/src/systems/__tests__/JournalingSystem.test.ts` (22 failing)
- `packages/core/src/systems/__tests__/MemoryFormationSystem.test.ts` (26 failing)
- `packages/core/src/systems/__tests__/MemoryConsolidationSystem.test.ts` (24 failing)
- `packages/core/src/systems/__tests__/ReflectionSystem.test.ts` (18 failing)
- `packages/core/src/actions/__tests__/AgentAction.test.ts` (1 failing)

---

## Requirements

### R1: Fix Component Import Patterns

**Wrong pattern (in failing tests):**
```typescript
import { AgentComponent } from '../../components/AgentComponent';
agent.addComponent(AgentComponent, { name: 'Test' }); // CRASHES - AgentComponent is undefined
```

**Correct pattern:**
```typescript
import { createAgentComponent } from '../../components/AgentComponent';
import { createPersonalityComponent } from '../../components/PersonalityComponent';
import { createIdentityComponent } from '../../components/IdentityComponent';

agent.addComponent(createAgentComponent('wander'));
agent.addComponent(createPersonalityComponent({ openness: 70, ... }));
agent.addComponent(createIdentityComponent('Test Agent'));
```

### R2: Fix Mock World Objects

**Wrong pattern:**
```typescript
const mockWorld = {
  tick: 0,
  eventBus: { emit: jest.fn() },
};
// Missing getEntity() - crashes when panel calls world.getEntity(id)
```

**Correct pattern:**
```typescript
const mockEntities = new Map<string, Entity>();

const mockWorld = {
  tick: 0,
  eventBus: { emit: jest.fn() },
  getEntity: (id: string) => mockEntities.get(id) ?? null,
};

// Store test entities in the map
mockEntities.set(mockEntity.id, mockEntity);
```

### R3: Create Test Utilities (Optional Enhancement)

Consider creating a shared test utility:

```typescript
// packages/core/src/test-utils/mockWorld.ts
export function createMockWorld(options?: {
  tick?: number;
  entities?: Map<string, Entity>;
}) {
  const entities = options?.entities ?? new Map();
  return {
    tick: options?.tick ?? 0,
    eventBus: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
    getEntity: (id: string) => entities.get(id) ?? null,
    query: () => ({ with: () => ({ executeEntities: () => [] }) }),
  };
}
```

---

## Acceptance Criteria

### Criterion 1: All Test Imports Use Factory Functions
- **WHEN:** Running `grep -rn "import { \w*Component }" packages/**/__tests__/*.ts`
- **THEN:** Only valid pattern imports found (e.g., `ComponentBase`)
- **Verification:** Grep for problematic imports returns empty

### Criterion 2: Mock Worlds Have getEntity()
- **WHEN:** Searching for mock world objects in tests
- **THEN:** All include a `getEntity()` method
- **Verification:** `grep -rn "mockWorld\|mock.*world" packages/**/__tests__/`

### Criterion 3: All Tests Pass
- **WHEN:** Running `npm test`
- **THEN:** 0 failures
- **Verification:** CI green

### Criterion 4: No .wip Extensions
- **WHEN:** Searching for skipped test files
- **THEN:** No `.test.ts.wip` files remain (currently workaround)
- **Verification:** `find packages -name "*.wip" | wc -l` returns 0

---

## Files to Modify

### Priority 1 - Renderer Tests (AgentInfoPanel)
- `packages/renderer/src/__tests__/AgentInfoPanel-inventory.test.ts`
- `packages/renderer/src/__tests__/AgentInfoPanel-thought-speech.test.ts`

### Priority 2 - Episodic Memory System Tests
- `packages/core/src/systems/__tests__/JournalingSystem.test.ts`
- `packages/core/src/systems/__tests__/MemoryFormationSystem.test.ts`
- `packages/core/src/systems/__tests__/MemoryConsolidationSystem.test.ts`
- `packages/core/src/systems/__tests__/ReflectionSystem.test.ts`

### Priority 3 - Other Failing Tests
- `packages/core/src/actions/__tests__/AgentAction.test.ts`

### Priority 4 - Skipped Tests (restore from .wip)
- `AISystem-Sleep.test.ts.wip`
- `EatBehavior.test.ts.wip`
- `PlantSystem.test.ts.wip`
- `PlantIntegration.test.ts.wip`

---

## Files to Create (Optional)

- `packages/core/src/test-utils/mockWorld.ts` - Shared mock world factory
- `packages/core/src/test-utils/mockEntity.ts` - Shared mock entity factory

---

## Implementation Notes

### Finding Factory Functions

Each component should export a factory function:

```typescript
// In packages/core/src/components/AgentComponent.ts
export function createAgentComponent(initialBehavior: AgentBehavior): AgentComponent {
  return {
    type: 'agent',
    behavior: initialBehavior,
    // ...other properties
  };
}
```

If a factory function doesn't exist, create one following this pattern.

### Mock World Pattern

The minimal mock world that works with most panels:

```typescript
const mockEntities = new Map<string, Entity>();

const mockWorld = {
  tick: 0,
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  getEntity: jest.fn((id: string) => mockEntities.get(id) ?? null),
  query: jest.fn(() => ({
    with: jest.fn(() => ({
      without: jest.fn(() => ({
        executeEntities: jest.fn(() => []),
      })),
      executeEntities: jest.fn(() => []),
    })),
  })),
};
```

---

## Testing Checklist

- [ ] All AgentInfoPanel tests pass
- [ ] All episodic memory system tests pass
- [ ] AgentAction tests pass
- [ ] No `.test.ts.wip` files remain
- [ ] Build passes: `npm run build`
- [ ] Full test suite passes: `npm test`

---

## Notes for Implementation Agent

1. **Start with one file** - Fix AgentInfoPanel-inventory.test.ts first as a reference
2. **Pattern match** - Apply same fixes to similar files
3. **Check factory exports** - Verify factory functions exist in component files
4. **Run tests incrementally** - `npm test -- AgentInfoPanel` after each file
5. **Restore .wip files last** - Only after main fixes are stable

---

## Notes for Review Agent

1. **Check import patterns** - Verify no interface-as-class imports
2. **Verify mock completeness** - Mock worlds should have getEntity
3. **Run full test suite** - All tests should pass
4. **Check for new .wip files** - None should exist

---

## Notes for Playtest Agent

This is a test infrastructure fix. No playtest needed - verification is via automated tests.

---

## Success Metrics

This work order is COMPLETE when:

1. ✅ All 7 affected test files use factory functions correctly
2. ✅ All mock worlds include `getEntity()` method
3. ✅ No `.test.ts.wip` files remain
4. ✅ `npm test` shows 0 failures
5. ✅ `npm run build` passes

---

**Estimated Complexity:** MEDIUM (repetitive but straightforward fixes)
**Estimated Time:** 3-5 hours
**Priority:** MEDIUM (tests are failing but application works)
