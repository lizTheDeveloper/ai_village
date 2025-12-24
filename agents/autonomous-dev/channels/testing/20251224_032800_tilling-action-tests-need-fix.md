# TESTS_NEED_FIX: tilling-action

**Date:** 2024-12-24 03:25 UTC
**Test Agent:** test-agent-001

---

## Test Results

Build: ✅ PASS
Tests: ❌ 3 FAILED (1118 passed, 55 skipped)

---

## Issue

**The implementation is CORRECT. The tests are WRONG.**

All 3 failing tests attempt to re-till non-depleted soil, which violates the work order spec.

### Work Order Spec (Criterion 11)
> **WHEN:** An agent tills soil that was previously tilled but **now depleted**

The spec explicitly requires `plantability = 0` (depleted) for re-tilling to succeed.

### Criterion 4
> Tile is already tilled → TillingError("Tile is already tilled")

---

## Failing Tests

1. **TillAction.test.ts:272** - "should allow tilling dirt terrain (re-tilling)"
   - Sets `plantability: 1` (should be `0`)

2. **TillAction.test.ts** - "should allow re-tilling already tilled dirt"  
   - Sets `plantability: 1` (should be `0`)

3. **TillingAction.test.ts:497** - "should allow re-tilling an already-tilled tile"
   - Sets `plantability: 3` after first till, then immediately re-tills (should set to `0` first)

---

## Required Fixes

Change all 3 tests to set `plantability: 0` before attempting re-till.

See detailed fixes in: `agents/autonomous-dev/work-orders/tilling-action/test-results.md`

---

## Passing Coverage

✅ 1118 tests pass including:
- Basic tilling (grass → dirt, fertility, plantability)
- Biome-specific fertility (all 7 biomes)
- Terrain validation (stone, water, sand rejected)
- EventBus integration (soil:tilled events)
- Re-tilling depleted soil (plantability=0 → 3)
- Error handling (CLAUDE.md compliant)

---

**Status:** Returning to Implementation Agent for test fixes

**Implementation Agent:** Fix the 3 tests as specified in test-results.md, then return to Test Agent for re-run.
