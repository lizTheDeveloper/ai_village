# Test Infrastructure Fix Required: Episodic Memory System

**Date:** 2025-12-23
**From:** Implementation Agent
**To:** Test Agent
**Feature:** episodic-memory-system
**Status:** BLOCKED - Tests need fixing before implementation can proceed

---

## Issue Summary

All 4 episodic memory system test files are failing with the same root cause:
**Tests are using `AgentComponent` as a constructor class when it's actually a TypeScript interface.**

At runtime, `AgentComponent` resolves to `undefined`, causing:
```
Cannot read properties of undefined (reading 'type')
```

---

## Root Cause

### What Tests Are Doing (WRONG):
```typescript
import { AgentComponent } from '../../components/AgentComponent';

agent.addComponent(AgentComponent, {
  name: 'Test Agent',
  personality: { openness: 0.7, ... }
});
// ERROR: AgentComponent is undefined at runtime!
```

### What Tests Should Do (CORRECT):
```typescript
import { createAgentComponent } from '../../components/AgentComponent';
import { createPersonalityComponent } from '../../components/PersonalityComponent';

agent.addComponent(createAgentComponent('wander'));
agent.addComponent(createPersonalityComponent({
  openness: 70,  // 0-100 scale, not 0.0-1.0
  conscientiousness: 80,
  extraversion: 20,
  agreeableness: 60,
  neuroticism: 40
}));
```

---

## Files Requiring Fixes

1. `packages/core/src/systems/__tests__/JournalingSystem.test.ts` (0/22 passing)
2. `packages/core/src/systems/__tests__/MemoryConsolidationSystem.test.ts` (0/24 passing)
3. `packages/core/src/systems/__tests__/MemoryFormationSystem.test.ts` (0/26 passing)
4. `packages/core/src/systems/__tests__/ReflectionSystem.test.ts` (0/18 passing)

**Total:** 90 tests blocked by test infrastructure issues

---

## Required Changes

### 1. Update Imports

**Remove:**
```typescript
import { AgentComponent } from '../../components/AgentComponent';
```

**Add:**
```typescript
import { createAgentComponent } from '../../components/AgentComponent';
import { createPersonalityComponent } from '../../components/PersonalityComponent';
```

### 2. Replace All Component Usage

**Find pattern:**
```typescript
agent.addComponent(AgentComponent, {
  name: 'Test Agent',  // REMOVE: doesn't exist
  personality: {       // REMOVE: separate component
    openness: 0.7,     // WRONG SCALE: should be 70
    conscientiousness: 0.8,
    extraversion: 0.2,
    agreeableness: 0.6,
    neuroticism: 0.4
  }
});
```

**Replace with:**
```typescript
agent.addComponent(createAgentComponent('wander'));
agent.addComponent(createPersonalityComponent({
  openness: 70,          // 0-100 scale
  conscientiousness: 80,
  extraversion: 20,
  agreeableness: 60,
  neuroticism: 40
}));
```

### 3. Scale Conversion

**ALL personality values must be converted from 0.0-1.0 to 0-100:**
- `0.1` → `10`
- `0.7` → `70`
- `0.95` → `95`

Per `PersonalityComponent.ts:11-15`, all Big Five traits use 0-100 scale.

### 4. Remove Invalid Fields

- **Remove:** `name` field (doesn't exist in AgentComponent)
- **Remove:** `personality` object from AgentComponent (it's a separate component)

---

## Reference: Correct Pattern

See `StorageDeposit.test.ts` for correct component usage:

```typescript
// packages/core/src/systems/__tests__/StorageDeposit.test.ts:6-12
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createInventoryComponent, addToInventory } from '../../components/InventoryComponent.js';

// Line 51:
agent.addComponent(createAgentComponent('deposit_items'));
```

---

## Example Fix: JournalingSystem.test.ts

### Lines 8, 22-31 (BEFORE):
```typescript
import { AgentComponent } from '../../components/AgentComponent';

// ...

agent.addComponent(AgentComponent, {
  name: 'Test Agent',
  personality: {
    openness: 0.7,
    conscientiousness: 0.8,
    extraversion: 0.2, // Introverted
    agreeableness: 0.6,
    neuroticism: 0.4
  }
});
```

### (AFTER):
```typescript
import { createAgentComponent } from '../../components/AgentComponent';
import { createPersonalityComponent } from '../../components/PersonalityComponent';

// ...

agent.addComponent(createAgentComponent('wander'));
agent.addComponent(createPersonalityComponent({
  openness: 70,
  conscientiousness: 80,
  extraversion: 20, // Introverted
  agreeableness: 60,
  neuroticism: 40
}));
```

**This pattern must be applied to ~40-50 instances across the 4 test files.**

---

## Impact

**Blocked Work:**
- Cannot implement JournalingSystem (tests won't run)
- Cannot implement MemoryFormationSystem (tests won't run)
- Cannot implement MemoryConsolidationSystem (tests won't run)
- Cannot implement ReflectionSystem (tests won't run)

**Working:**
- ✅ EpisodicMemoryComponent (29/29 tests passing)
- ✅ Component implementations are correct

---

## Request

**Test Agent:** Please fix the 4 test files using the pattern above, then re-run the test suite.

Once tests are fixed (even if they fail on logic), I can proceed with implementing the missing systems.

---

## Verification Steps After Fix

1. Run: `cd custom_game_engine && npm test -- JournalingSystem.test.ts`
   - Tests should execute (not crash with "Cannot read properties of undefined")
   - Tests may fail on logic (expected - systems not implemented yet)
   - No more "reading 'type' from undefined" errors

2. Verify all 4 test files execute without infrastructure errors

3. Hand back to Implementation Agent for system implementation

---

**Status:** BLOCKED - awaiting test infrastructure fixes

**Priority:** HIGH - blocking entire episodic memory system feature

**Estimated Fix Time:** 30-45 minutes (straightforward pattern replacement)

---

Full details in: `agents/autonomous-dev/work-orders/episodic-memory-system/test-results.md`
