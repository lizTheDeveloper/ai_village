# Playtest Critical Fix: Tilling Duration Discrepancy

**Date:** 2025-12-24
**Agent:** Implementation Agent
**Feature:** tilling-action
**Status:** FIXED

---

## Issue Summary

**Critical Issue from Playtest Report:**
- UI displayed: "Agent will till tile at (x, y) (5s)"
- Console logged: "Tool: hands, Estimated duration: 20.0s (efficiency: 50%)"
- **15 second discrepancy** causing user confusion

**Verdict:** NEEDS_WORK → **FIXED**

---

## Root Cause Analysis

The discrepancy was caused by **misleading console logs** in SoilSystem.ts:

1. **Actual Tilling Duration (CORRECT):**
   - `TillActionHandler.getDuration()` returns **100 ticks**
   - At 20 TPS (ticks per second): **100 ticks ÷ 20 = 5 seconds**
   - UI notification: "5s" ✅ **CORRECT**

2. **Misleading Console Logs (INCORRECT):**
   - `SoilSystem.tillTile()` logged: "Estimated duration: 20.0s"
   - This was **aspirational/informational** only
   - Showed theoretical duration IF tool efficiency was applied
   - Did NOT reflect actual action duration
   - Caused confusion: console said 20s, but action took 5s

3. **Why the Discrepancy Existed:**
   - SoilSystem had TODO comments about applying tool efficiency
   - Console logs showed "future state" durations (hoe=10s, shovel=12.5s, hands=20s)
   - But TillActionHandler had fixed duration (100 ticks = 5s)
   - Logs were not synchronized with actual implementation

---

## Fix Applied

**File Modified:** `packages/core/src/systems/SoilSystem.ts`

**Changes:**
- **Removed misleading duration logs** (lines 151-164)
- Removed references to "20s duration", "10s", "12.5s"
- Kept efficiency percentages (50%, 80%, 100%) for future use
- Added clarifying comment: "currently tilling duration is fixed at 100 ticks = 5s in TillActionHandler"
- Simplified log to: `Tool: hands, efficiency: 50%` (no duration claim)

**Before:**
```typescript
console.log(`[SoilSystem] ℹ️ MANUAL TILLING (keyboard shortcut T) - Using HANDS by default (50% efficiency, 20s duration)`);
console.log(`[SoilSystem] 🔨 Available tools: HOE (100% efficiency, 10s) > SHOVEL (80%, 12.5s) > HANDS (50%, 20s)`);

const baseDuration = 10; // seconds
const estimatedDuration = baseDuration / toolEfficiency;
console.log(`[SoilSystem] Tool: ${toolUsed}, Estimated duration: ${estimatedDuration.toFixed(1)}s (efficiency: ${(toolEfficiency * 100).toFixed(0)}%)`);
```

**After:**
```typescript
console.log(`[SoilSystem] ℹ️ MANUAL TILLING (keyboard shortcut T) - Using HANDS by default (50% efficiency)`);
console.log(`[SoilSystem] 🔨 Available tools: HOE (100% efficiency) > SHOVEL (80%) > HANDS (50%)`);

// Tool efficiency tracked for future use (currently tilling duration is fixed at 100 ticks = 5s in TillActionHandler)
// TODO: Apply tool efficiency to action duration when tool system is fully integrated
console.log(`[SoilSystem] Tool: ${toolUsed}, efficiency: ${(toolEfficiency * 100).toFixed(0)}%`);
```

---

## Verification

### Build Status
```bash
cd custom_game_engine && npm run build
```
✅ **PASSED** - TypeScript compilation successful

### Test Status
```bash
cd custom_game_engine && npm test
```
✅ **PASSED** - All tests passing:
- Test Files: 55 passed | 2 skipped (57)
- Tests: 1123 passed | 55 skipped (1178)
- Duration: 1.76s

### Expected Behavior After Fix

**Console Logs (corrected):**
```
[SoilSystem] ℹ️ MANUAL TILLING (keyboard shortcut T) - Using HANDS by default (50% efficiency)
[SoilSystem] 💡 TIP: To use agent tools, SELECT AN AGENT FIRST, then press T
[SoilSystem] 🔨 Available tools: HOE (100% efficiency) > SHOVEL (80%) > HANDS (50%)
[SoilSystem] Tool: hands, efficiency: 50%
```

**UI Notification (unchanged):**
```
Agent will till tile at (x, y) (5s)
```

**No more duration discrepancy!** ✅

---

## Impact Analysis

### What Changed
- ✅ Console logs no longer claim "20s duration"
- ✅ Actual tilling duration remains 5 seconds (100 ticks)
- ✅ UI notification remains accurate (5s)
- ✅ Tool efficiency tracking preserved for future use
- ✅ No functionality changes - only log clarity

### What Didn't Change
- ❌ Tilling action duration (still 100 ticks = 5s)
- ❌ Tool detection logic
- ❌ UI notifications
- ❌ Event emissions
- ❌ Test coverage

### Future Enhancement Path
When tool efficiency is eventually applied to action duration:
1. Update `TillActionHandler.getDuration()` to accept tool parameter
2. Calculate: `baseDuration / toolEfficiency`
3. Update UI to query handler for duration
4. Re-enable duration logging in SoilSystem

---

## Testing Checklist

- [x] Build passes with no TypeScript errors
- [x] All 1123 tests pass
- [x] Console logs no longer misleading
- [x] Actual duration still 5 seconds
- [x] Tool efficiency tracking preserved
- [x] CLAUDE.md compliance maintained

---

## Ready for Re-Test

**Status:** FIXED - Ready for Playtest Agent verification

**Expected Playtest Results:**
- ✅ UI shows: "Agent will till tile (5s)"
- ✅ Console shows: "Tool: hands, efficiency: 50%"
- ✅ Actual tilling completes in ~5 seconds
- ✅ No duration discrepancy
- ✅ User expectations aligned with reality

---

**Files Modified:**
- `custom_game_engine/packages/core/src/systems/SoilSystem.ts`

**Lines Changed:** 9 lines modified (removed misleading duration calculations)

**Risk Level:** LOW - Log-only changes, no functional impact

---

**Implementation Agent Status:** ✅ CRITICAL FIX COMPLETE - Ready for playtest re-verification
