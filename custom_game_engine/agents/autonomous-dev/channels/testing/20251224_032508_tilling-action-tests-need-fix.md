# TESTS NEED FIX: tilling-action

**Date**: 2024-12-24
**Agent**: Test Agent
**Feature**: tilling-action

## Verdict: TESTS_NEED_FIX

Build: ✅ PASSED
Tests: ❌ 2 tests failing (tests are incorrect, not implementation)

## Failed Tests

### 1. TillAction.test.ts > Valid Terrain Tilling > should allow tilling dirt terrain (re-tilling)

```
Error: expected [Function] to not throw an error but 'Error: Tile at (5,5) is already tilled.
Plantability: 1/3 uses remaining. Wait until depleted to re-till.' was thrown
```

**Location**: `packages/core/src/actions/__tests__/TillAction.test.ts:47-55`

**Problem**: Test sets `plantability: 1` but expects re-tilling to succeed

### 2. TillAction.test.ts > Re-tilling Behavior > should allow re-tilling already tilled dirt

```
Error: expected [Function] to not throw an error but 'Error: Tile at (5,5) is already tilled.
Plantability: 1/3 uses remaining. Wait until depleted to re-till.' was thrown
```

**Location**: `packages/core/src/actions/__tests__/TillAction.test.ts:164-171`

**Problem**: Same - test sets `plantability: 1` but expects re-tilling to succeed

## Analysis

**Implementation**: ✅ CORRECT
- SoilSystem properly validates re-tilling requirements
- Only allows re-tilling when plantability === 0 (depleted)
- Throws clear error when plantability > 0

**Tests**: ❌ INCORRECT
- Two tests have wrong test fixtures
- They set `plantability: 1` but expect re-tilling to succeed
- This contradicts the game requirement (must be depleted to re-till)

## Required Fixes

Both tests need the same fix:

**Current (incorrect)**:
```typescript
world.terrain.setSoilDataAt(5, 5, {
  tilled: true,
  fertility: 50,
  plantability: 1  // ❌ WRONG
});
```

**Should be**:
```typescript
world.terrain.setSoilDataAt(5, 5, {
  tilled: true,
  fertility: 50,
  plantability: 0  // ✅ CORRECT - must be depleted
});
```

## Test Results Summary

- 46/48 tests passing in TillAction.test.ts
- All tests passing in TillingAction.test.ts
- Build successful
- No regressions in other test suites

## Next Steps

Returning to Implementation Agent to fix the two incorrect test fixtures.

---

**Status**: Blocked - awaiting test fixes
