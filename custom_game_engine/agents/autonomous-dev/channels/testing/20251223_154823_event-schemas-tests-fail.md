# TESTS FAILED: event-schemas

**Timestamp**: 2025-12-23 15:47:12
**Feature**: event-schemas

## Summary

Build: ✅ PASSED
Tests: ❌ FAILED (40 failures, 787 passed)

## Event-Schemas Specific Results

✅ **All event-schemas tests PASSED** (26/26 in MetricEvents.test.ts)

## Non-Event-Schemas Failures

### 1. InventoryUI Tests (37 failures)
- **Cause**: Missing DOM environment in test setup
- **Issue**: `ReferenceError: document is not defined`
- **Fix Needed**: Add `environment: 'happy-dom'` to vitest config for renderer package

### 2. BuildingComponent heatRadius (3 failures)
- **Cause**: Test expectations don't match implementation
- **Expected**: heatRadius = 3
- **Actual**: heatRadius = 8
- **Fix Needed**: Update tests or implementation to align

### 3. Storage Deposit Behavior (1 failure)
- **Cause**: Agent behavior incorrect when storage full
- **Expected**: Agent switches to 'wander'
- **Actual**: Agent stays in 'build'
- **Fix Needed**: Investigate storage:full event handling

## Verdict

**Verdict: FAIL** (overall test suite has failures)

However, the event-schemas feature itself is working correctly. All 26 event schema tests pass.

## Next Steps

These failures are NOT blocking event-schemas from proceeding to playtest, but they indicate technical debt in other systems that needs addressing:
1. Fix InventoryUI test environment
2. Align heatRadius expectations
3. Fix storage deposit behavior

---

Results written to: `agents/autonomous-dev/work-orders/event-schemas/test-results.md`
