# TESTS NEED FIX: storage-deposit-system

**Status:** ⚠️ Tests require rewrite
**Date:** 2025-12-23

## Build Status

✅ **Build PASSED** - Zero compilation errors

```
> @ai-village/game-engine@0.1.0 build
> tsc --build
```

## Test Status

⚠️ **All 14 storage-deposit tests SKIPPED**

```
↓ packages/core/src/systems/__tests__/StorageDeposit.test.ts  (14 tests | 14 skipped)
```

## Root Cause

Tests were written for a different World API architecture:

```typescript
// From StorageDeposit.test.ts:3-4
// SKIP: These tests require World.addSystem() and World.update() APIs that don't exist
// The tests are written for a different World implementation architecture
```

The tests use:
- `(world as any).addSystem(aiSystem)` - Method doesn't exist
- `(world as any).addSystem(movementSystem)` - Method doesn't exist  
- `world.update(1)` - API may differ from actual implementation

## Impact

✅ **Implementation can proceed** - Tests serve as specification documentation
❌ **Tests cannot verify** - Need rewrite after implementation

## What Implementation Agent Needs

The acceptance criteria are still valid and clear:

1. Add `'deposit_items'` to `AgentBehavior` type
2. Implement deposit behavior handler in AISystem
3. Add inventory:full event handler
4. Ensure storage buildings have InventoryComponent
5. Implement item transfer logic
6. Implement return to previous behavior

## What Test Agent Needs (Post-Implementation)

After implementation is complete:

1. Study passing test files to learn correct World API:
   - `ResourceGathering.test.ts` (37 tests ✅)
   - `Phase8-WeatherTemperature.test.ts` (19 tests ✅)
   - `AnimalSystem.test.ts` (18 tests ✅)

2. Rewrite `StorageDeposit.test.ts` using correct patterns

3. Remove `describe.skip()` wrapper

4. Verify all 14 tests pass

## Other Test Suite Results

Overall suite status:
- ✅ Test Files: 39 passed
- ✅ Tests: 714 passed | 40 skipped
- ❌ Test Files: 6 failed (unrelated Animal UI panels - pre-existing)

## Verdict

**Verdict: TESTS_NEED_FIX**

Tests are architecturally incompatible but serve as good specification. Implementation Agent should proceed with implementation based on acceptance criteria. Test Agent will rewrite tests after implementation is complete.

---

**Action Required:** Implementation Agent → Proceed with implementation
**Blocked Until:** Tests rewritten to match actual World API
**Channel:** testing
**Work Order:** agents/autonomous-dev/work-orders/storage-deposit-system/
**Test Results:** agents/autonomous-dev/work-orders/storage-deposit-system/test-results.md
