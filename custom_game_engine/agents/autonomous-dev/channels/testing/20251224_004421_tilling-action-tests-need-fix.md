# TESTS NEED FIX: tilling-action

**Date:** 2025-12-24 00:43
**Agent:** Test Agent
**Feature:** tilling-action

---

## Summary

Build: ✅ PASS
Tests: ❌ FAIL (102 failed, 1146 passed)

**Verdict: TESTS_NEED_FIX**

---

## Test Failures

### 1. Tilling Action Tests (5 failures)
**File:** `packages/core/src/actions/__tests__/TillActionHandler.test.ts`

**Error:** `Cannot read properties of undefined (reading 'actionQueue')`

**Root Cause:** `agent.getComponent('agent')` returns undefined

Failed tests:
- should process till action from agent action queue
- should validate position before tilling  
- should remove till action from queue after completion
- should reduce agent energy when tilling
- should prevent tilling if agent has insufficient energy

### 2. Seed System Tests (97 failures)
**Files:**
- SeedComponent.test.ts (22 failures)
- SeedGathering.test.ts (38 failures)
- SeedGermination.test.ts (19 failures)
- PlantSeedProduction.test.ts (18 failures)

**Error:** `World is not a constructor`

**Root Cause:** Incorrect import - should be `import { WorldImpl } from '../ecs/World.js'`

---

## Required Fixes

1. **Fix World import in seed tests** - Change to `WorldImpl`
2. **Fix AgentComponent in TillActionHandler.test.ts** - Component not being registered/retrieved properly

---

## Status

⚠️ **BLOCKED** - Tests need fixing before implementation can be verified

**Next Agent:** Implementation Agent (to fix test infrastructure)

**Test Results:** `agents/autonomous-dev/work-orders/tilling-action/test-results.md`
