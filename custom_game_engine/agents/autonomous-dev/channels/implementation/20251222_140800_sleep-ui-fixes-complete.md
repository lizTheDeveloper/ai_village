# Sleep UI Fixes Complete

**Date:** 2025-12-22 15:00
**Feature:** sleep-and-circadian-rhythm
**Status:** UI FIXES COMPLETE

---

## Playtest Issues Addressed

### Issue 1: Z's Bubble Animation Not Visible ✅ FIXED

**Problem:** Z's animation was being drawn at `screenY - 30` which overlapped with the behavior label at `screenY - 8 to -18`.

**Fix Applied:**
- Moved Z's bubble to `screenY - 40` (above the behavior label)
- Made Z's bolder and more visible
- Changed from lowercase 'z' to uppercase 'Z' for better visibility
- Increased opacity levels (0.9, 0.7, 0.5 instead of 0.8, 0.6, 0.4)

**File:** `packages/renderer/src/Renderer.ts:642-674`

---

### Issue 2: Energy Bar Color Coding ✅ FIXED

**Problem:** Energy bar used generic traffic light colors (green/yellow/orange/red) instead of work order spec (blue when high, red when low).

**Fix Applied:**
- Implemented blue → cyan → purple → orange → red gradient for Energy bar
- Blue (70-100): Bright blue `#00AAFF`
- Cyan (50-70): Cyan `#00DDFF`
- Purple (30-50): Purple transition `#AA66FF`
- Orange (15-30): Orange `#FF8800`
- Red (0-15): Critical red `#FF0000`
- Other needs (Hunger, Health) still use traditional traffic light colors

**File:** `packages/renderer/src/AgentInfoPanel.ts:381-402`

---

### Issue 3: Time Until Wake Missing ✅ FIXED

**Problem:** Inspector panel did not show estimated time until sleeping agent wakes.

**Fix Applied:**
- Added "Wake in: ~Xh Ym" display below "Status: SLEEPING Zzz"
- Calculation considers:
  - Minimum sleep duration (4 hours per work order)
  - Energy recovery needed (100 - current energy) / 50
  - Sleep drive recovery needed (sleep drive / 25)
  - Takes maximum of these three values
  - Displays remaining time as hours and minutes
- Only shows when agent is actually sleeping and has valid sleepStartTime

**File:** `packages/renderer/src/AgentInfoPanel.ts:258-294`

**Example Display:**
```
Status: SLEEPING Zzz
Wake in: ~2h 30m
```

---

## Summary of Changes

### Files Modified

1. **packages/renderer/src/Renderer.ts**
   - Line 642-674: Repositioned Z's bubble animation above behavior label
   - Increased Z visibility and size

2. **packages/renderer/src/AgentInfoPanel.ts**
   - Line 381-402: Added blue→red gradient for Energy bar color coding
   - Line 258-294: Added time until wake calculation and display

### Build Status

✅ **Build PASSED** - No TypeScript errors

```bash
cd custom_game_engine && npm run build
# Success
```

---

## Implementation Details

### Z's Bubble Animation

The Z's bubble now renders at a higher Y position to avoid overlap with the behavior label:

- **Before:** `baseY = screenY - 30`
- **After:** `baseY = screenY - 40`

The three Z's are staggered vertically:
1. First Z: `baseY + offset1`
2. Second Z: `baseY - 10 + offset2`
3. Third Z: `baseY - 20 + offset3`

Each Z animates with a floating sine wave effect at different phases.

### Energy Bar Color Gradient

Energy uses a unique color scheme that matches player expectations:
- **High energy** (well-rested) = **Blue** (calming, restful)
- **Low energy** (exhausted) = **Red** (danger, urgent)

This is distinct from Hunger/Health which use:
- **Good** = **Green** (healthy, satisfied)
- **Low** = **Red** (danger, urgent)

### Time Until Wake Algorithm

The wake time estimator uses the most conservative estimate:

```typescript
const minSleepHours = 4; // Work order requirement
const energyRecoveryNeeded = (100 - needs.energy) / 50; // ~2h to full from 0
const sleepDriveRecoveryNeeded = circadian.sleepDrive / 25; // ~4h to clear high drive
const estimatedTotalSleep = Math.max(minSleepHours, energyRecoveryNeeded, sleepDriveRecoveryNeeded);
const hoursRemaining = Math.max(0, estimatedTotalSleep - hoursAsleep);
```

This ensures players understand agents won't wake too early.

---

## Testing Recommendations

### Verification Steps

1. **Start game and wait for agents to sleep**
2. **Verify Z's bubble animation:**
   - Look for animated Z's ABOVE the "Sleeping 💤💤💤" label
   - Confirm Z's are visible and not overlapping with label
   - Check animation is smooth and floating

3. **Click sleeping agent to open inspector:**
   - Verify Energy bar is BLUE when high (70+)
   - Verify Energy bar transitions to RED when low (0-30)
   - Confirm "Wake in: ~Xh Ym" appears below "Status: SLEEPING Zzz"
   - Verify time counts down as agent sleeps

4. **Test color transitions:**
   - Observe agents with varying energy levels
   - Confirm blue (high) → cyan → purple → orange → red (low) gradient
   - Verify Hunger/Health still use green→yellow→orange→red

---

## Acceptance Criteria Status

| Criterion | Before | After | Status |
|-----------|--------|-------|--------|
| Z's bubble above sleeping agents | Text label only | Animated Z's above label | ✅ FIXED |
| Energy bar color coding (blue→red) | Generic traffic light | Blue→red gradient | ✅ FIXED |
| Time until wake display | Missing | Shows "Wake in: ~Xh Ym" | ✅ FIXED |
| Agent inspector accessible | Already working | No change | ✅ PASS |
| Sleep drive moon icon | Already working | No change | ✅ PASS |

---

## Next Steps

**Ready for Playtest Agent** to verify UI fixes in browser.

Expected playt test results:
- ✅ Z's animation visible above sleeping agents
- ✅ Energy bar displays with blue (high) → red (low) colors
- ✅ Inspector shows time until wake for sleeping agents
- ✅ All sleep mechanics continue to function correctly

---

**Implementation Agent:** Done with UI fixes
**Handoff:** Test Agent for playtest verification
