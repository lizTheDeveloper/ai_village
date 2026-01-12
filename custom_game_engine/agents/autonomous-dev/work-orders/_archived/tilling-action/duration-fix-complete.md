# Duration Discrepancy Fix: COMPLETE

**Date:** 2025-12-24
**Issue:** UI showing "5s" while console showing "20s" for tilling duration
**Status:** ✅ FIXED

---

## Problem

The playtest report (playtest-report.md) identified a critical discrepancy:
- **Console Log**: "Tool: hands, Estimated duration: 20.0s (efficiency: 50%)"
- **UI Notification**: "Agent will till tile at (-78, 108) (5s)"

This 15-second difference created user confusion about action timing.

---

## Root Cause

The UI code in `demo/src/main.ts` was **manually duplicating** the duration calculation logic from `TillActionHandler.getDuration()`. This DRY (Don't Repeat Yourself) violation meant:

1. Two separate places calculated duration
2. If one was updated without the other, mismatches occurred
3. No single source of truth for action duration

---

## Solution

**Eliminated code duplication** by calling `TillActionHandler.getDuration()` directly from the UI code.

### Changes Made

#### 1. Added `getHandler()` method to ActionQueue

**File:** `packages/core/src/actions/ActionQueue.ts`

```typescript
/**
 * Get the handler for a specific action type.
 * Useful for accessing handler methods like getDuration() from UI code.
 */
getHandler(actionType: string) {
  return this.registry.get(actionType);
}
```

#### 2. Updated main.ts to use handler directly

**File:** `demo/src/main.ts` (lines 720-736)

Now calls `getDuration()` directly instead of duplicating logic.

**Benefits:**
- ✅ Single source of truth: `TillActionHandler.getDuration()`
- ✅ UI and console always show same duration
- ✅ Easier maintenance: update logic in one place
- ✅ Reduced code duplication (~30 lines removed)

---

## Verification

### Build Status
```bash
$ cd custom_game_engine && npm run build
✅ SUCCESS - TypeScript compilation passed
```

### Test Status
```bash
$ cd custom_game_engine && npm test
✅ Test Files: 55 passed | 2 skipped (57)
✅ Tests: 1123 passed | 55 skipped (1178)
```

---

## Expected Behavior After Fix

1. **UI notification will show:** "Agent will till tile at (x, y) (20s)"
2. **Console log will show:** "Duration from handler: 400 ticks = 20s"
3. **Both values match exactly** (no more 5s vs 20s discrepancy)

---

## Files Modified

| File | Change | LOC |
|------|--------|-----|
| `packages/core/src/actions/ActionQueue.ts` | Added `getHandler()` method | +7 |
| `demo/src/main.ts` | Replaced manual calculation with handler call | -30, +15 |

**Net change:** ~15 lines removed (code simplification)

---

## Status

✅ **COMPLETE** - Ready for playtest verification

The critical duration discrepancy bug is now fixed. The UI will always display the same duration as the actual action execution.
