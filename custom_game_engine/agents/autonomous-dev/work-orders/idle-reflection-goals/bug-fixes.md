# Bug Fixes: Idle Behaviors & Personal Goals

**Date:** 2025-12-28
**Implementation Agent:** Claude (Implementation Agent)
**Status:** COMPLETE

---

## Summary

Fixed two critical bugs in the GoalGenerationSystem that were preventing proper goal progress tracking and event emission. All tests now pass with the bugs fixed.

---

## Bugs Fixed

### Bug 1: Agent ID Extraction from Events

**Location:** `packages/core/src/systems/GoalGenerationSystem.ts:58-73`

**Problem:**
The system was attempting to extract the agent ID from the `actionId` field using `actionId.split('-')[0]`, which only works for simple numeric IDs. This approach failed for UUID-based agent IDs that contain dashes.

**Root Cause:**
The implementation was parsing `actionId` instead of using the proper `event.source` field that ActionQueue sets to `action.actorId`.

**Fix:**
Changed the event handler to use `event.source` directly, which contains the agent ID set by ActionQueue:

```typescript
// BEFORE (BROKEN):
const agentId = actionId.split('-')[0]; // Only works for numeric IDs

// AFTER (FIXED):
const agentId = event.source; // Proper source from ActionQueue
```

**Impact:**
- Goal progress tracking now works for all agent ID formats (UUIDs and numeric)
- No need for workarounds in tests or production code
- Cleaner, more maintainable code

---

### Bug 2: Goal Completion Event Never Emitted

**Location:** `packages/core/src/systems/GoalGenerationSystem.ts:350-374`

**Problem:**
The `agent:goal_completed` event was never emitted because the completion check happened AFTER `updateGoalProgress()` had already set `goal.completed = true`.

**Code Flow (BEFORE):**
```typescript
const newProgress = Math.min(1.0, goal.progress + progressDelta);
goalsComp.updateGoalProgress(goal.id, newProgress); // Sets completed=true

// Check happens AFTER completed flag is already set
if (newProgress >= 1.0 && !goal.completed) { // Always false!
  this.eventBus.emit({ type: 'agent:goal_completed', ... });
}
```

**Fix:**
Check the completion condition BEFORE calling `updateGoalProgress()`:

```typescript
const newProgress = Math.min(1.0, goal.progress + progressDelta);

// Check if goal will be completed BEFORE updating progress
const willComplete = newProgress >= 1.0 && !goal.completed;

goalsComp.updateGoalProgress(goal.id, newProgress);

// Emit goal completion event if just completed
if (willComplete) {
  this.eventBus.emit({ type: 'agent:goal_completed', ... });
}
```

**Impact:**
- Goal completion events are now properly emitted
- Systems listening for `agent:goal_completed` will receive notifications
- Proper event-driven architecture maintained

---

## Test Changes

Updated integration tests to emit events with proper `source` field:

**Before:**
```typescript
eventBus.emit({
  type: 'agent:action:completed',
  source: 'test', // ❌ WRONG
  data: { actionId, actionType },
});
```

**After:**
```typescript
eventBus.emit({
  type: 'agent:action:completed',
  source: agentId, // ✅ CORRECT (matches ActionQueue behavior)
  data: { actionId, actionType },
});
```

**Files Modified:**
- `packages/core/src/systems/__tests__/GoalGenerationSystem.integration.test.ts`
  - Updated 5 test cases to use correct event source
  - Re-enabled goal completion event assertion (was commented out due to bug)

---

## Verification

### Build Status
```bash
npm run build
```
**Result:** ✅ PASS - TypeScript compilation successful

### Test Results
```bash
npm test -- GoalGenerationSystem
```
**Result:** ✅ PASS - All 9 integration tests passing

**Test Coverage:**
- ✅ Goal generation after reflection
- ✅ Goal limit enforcement (max 3 goals)
- ✅ Personality-based goal category selection
- ✅ Goal progress tracking from actions
- ✅ Milestone completion events
- ✅ Goal completion events (NOW WORKING)
- ✅ Action filtering (irrelevant actions don't progress goals)
- ✅ Multiple goal tracking
- ✅ 50% chance probability for goal formation

---

## Acceptance Criteria Impact

These bug fixes ensure the following acceptance criteria are now fully met:

### ✅ Criterion 5: Goal Progress Tracking
- **WHEN:** An agent completes an action that advances a goal
- **THEN:** The goal's progress SHALL be updated
- **STATUS:** Now works for all agent ID formats (UUIDs and numeric)

### ✅ Criterion 8: Goal Completion Events
- **WHEN:** A goal reaches 100% progress
- **THEN:** An `agent:goal_completed` event SHALL be emitted
- **STATUS:** Events are now properly emitted

---

## Remaining Work

None - all bugs documented in the test results have been fixed. The implementation is now fully functional and all tests pass.

---

## Notes for Future Development

1. **Event Source Convention:** Always use `event.source` for entity/agent IDs in event-driven systems. Don't parse IDs from string fields.

2. **State Checks Before Updates:** When emitting events based on state transitions, check the condition BEFORE updating the state to avoid race conditions.

3. **Test Fidelity:** Tests should accurately simulate production event flow. The test events should match the structure of events emitted by real systems (e.g., ActionQueue).

---

**Implementation Complete:** All tests pass, build succeeds, bugs fixed.
