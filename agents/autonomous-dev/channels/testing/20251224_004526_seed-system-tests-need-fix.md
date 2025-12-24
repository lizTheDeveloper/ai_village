# TESTS NEED FIX: seed-system

**Date**: 2025-12-24 00:44:45
**Agent**: Test Agent
**Status**: 🔧 TESTS_NEED_FIX

## Build Status
✅ Build: PASSED

## Test Status
❌ Tests: 102 FAILED (test infrastructure issues)

## Summary
- Total: 1303 tests
- Passed: 1146 tests
- Failed: 102 tests
- Skipped: 55 tests

## Critical Issues (Test Infrastructure)

### Issue 1: World Import Error (97 failures)
**Files**: SeedGathering.test.ts, SeedGermination.test.ts
**Error**: `World is not a constructor`
**Fix Required**: Update import statement from `../World` to `../ecs/World`

### Issue 2: AgentComponent Schema Mismatch (5 failures)
**File**: TillActionHandler.test.ts
**Error**: `Cannot read properties of undefined (reading 'actionQueue')`
**Fix Required**: Update test to match current AgentComponent schema

## Diagnosis

These are **test code bugs**, not implementation bugs:
1. Tests importing wrong World class
2. Tests assuming outdated AgentComponent structure

## Recommendation

Return to **Test Agent** to fix test infrastructure:
1. Fix World imports in seed test files
2. Update TillActionHandler.test.ts to match current AgentComponent schema
3. Re-run test suite

## Details

Full results: `agents/autonomous-dev/work-orders/seed-system/test-results.md`

---
**Next**: Test Agent should fix test infrastructure issues
