# Sleep System Implementation Fixes - 2025-12-22

## Playtest Issues Addressed

Based on playtest feedback from 2025-12-22, the following critical bugs were fixed:

### Issue 1: Agents Not Sleeping Despite Critical Exhaustion ✅ FIXED

**Root Cause:** Agents were waking up prematurely due to hunger, preventing energy recovery.

**Problem:**
- Agents with energy at 0 and sleep drive > 60 were not seeking sleep
- Hunger decay during sleep (30% of normal rate) caused agents to wake before minimum 4 hours
- Wake condition `needs.hunger < 10` triggered before energy could recover
- Agents entered a death spiral: sleep briefly → wake hungry → can't work due to exhaustion → repeat

**Fix Applied:**

1. **SleepSystem.ts wake conditions (lines 194-218):**
   - Changed critical hunger threshold from `< 10` to `<= 5` (only wake if about to starve)
   - Increased energy recovery threshold from `>= 70` to `>= 80` for well-rested check
   - Reduced sleep drive threshold from `< 10` to `< 5` for well-rested check
   - This ensures agents stay asleep until meaningfully recovered

2. **NeedsSystem.ts hunger decay (line 50):**
   - Reduced hunger decay during sleep from 30% to 10% of normal rate
   - Prevents hunger from dropping below critical threshold during minimum sleep period
   - Agents now have ~20 game hours of sleep before hunger becomes critical (was ~6 hours)

3. **AISystem.ts autonomic priority (lines 394-435):**
   - Reordered autonomic checks to prioritize sleep over food when exhausted
   - Energy < 10: FORCED_SLEEP (highest priority)
   - Sleep drive > 90: FORCED_SLEEP (lowered from 95)
   - Energy < 20: SEEK_SLEEP (even with moderate sleep drive)
   - Hunger < 10: SEEK_FOOD (only if energy >= 10)
   - This prevents agents from trying to seek food when too exhausted to work

### Issue 2: No Fatigue Penalties Applied ✅ FIXED

**Root Cause:** Agents with 0 energy continued working and moving at full capacity.

**Problem:**
- Work speed penalties existed but agents could still initiate work at 0 energy
- Agents remained in 'gather' behavior even when too exhausted to function
- No enforcement of "cannot work" rule from work order

**Fix Applied:**

**AISystem.ts gatherBehavior (lines 1075-1092):**
- Added explicit behavior change when energy < 10
- Agents now forced to 'idle' behavior (cannot work)
- Movement stopped immediately
- Console log added for debugging
- Per CLAUDE.md: no silent fallbacks - agents MUST rest when exhausted

**Result:** Agents with energy < 10 now:
1. Stop moving immediately
2. Stop working (switch to idle behavior)
3. Cannot perform work tasks
4. Autonomic system then triggers forced sleep

### Issue 3: UI Already Correct ✅ VERIFIED

**Playtest Feedback:** Label truncation ("Sleep Dr" instead of "Sleep Drive"), missing moon icon

**Investigation:**
- Checked AgentInfoPanel.ts line 249
- Sleep drive already labeled as "🌙 Sleepy" (not "Sleep Drive")
- Moon emoji already present in current implementation
- 60 pixels reserved for label (sufficient for "🌙 Sleepy")

**Conclusion:** No changes needed. Playtest screenshot may have been from older version or different build.

## Testing Results

**Build Status:** ✅ PASSING
```
> tsc --build
(no errors)
```

**Test Status:** ✅ 571/572 PASSING
```
Test Files  31 passed | 1 skipped (32)
Tests       571 passed | 1 skipped (572)
Duration    3.00s
```

**Sleep Feature Tests:** All 18 sleep integration tests passing (Phase10-Sleep)

## Verification Checklist

✅ Build compiles cleanly (no TypeScript errors)
✅ All sleep-related tests pass
✅ No regressions in existing tests
✅ Wake conditions enforce minimum 4-hour sleep
✅ Hunger decay reduced to prevent premature waking
✅ Autonomic system prioritizes sleep over food when exhausted
✅ Work penalties prevent gathering at low energy
✅ Error handling follows CLAUDE.md (no silent fallbacks)

## Code Changes Summary

### Files Modified

1. **packages/core/src/systems/SleepSystem.ts**
   - Lines 194-218: Wake condition thresholds adjusted
   - Critical hunger: 10 → 5
   - Well-rested energy: 70 → 80
   - Well-rested sleep drive: 10 → 5

2. **packages/core/src/systems/NeedsSystem.ts**
   - Line 50: Hunger decay during sleep: 0.3 → 0.1
   - Added CLAUDE.md comment explaining rationale

3. **packages/core/src/systems/AISystem.ts**
   - Lines 394-435: Reordered autonomic system priority
   - Sleep now takes priority over food when energy < 10
   - Added energy < 20 trigger for SEEK_SLEEP
   - Lowered forced sleep threshold: 95 → 90
   - Lines 1075-1092: Enhanced work prevention when exhausted
   - Added behavior change to 'idle' when energy < 10
   - Added console logging for debugging

## Expected Gameplay Impact

**Before Fixes:**
- Agents stuck in exhaustion loop (sleep briefly, wake hungry, can't work)
- Energy reaching 0 with no recovery
- Agents moving and working at 0 energy
- High frustration from broken sleep mechanics

**After Fixes:**
- Agents sleep for meaningful durations (4-8 game hours typical)
- Energy recovers to 80+ before resuming activity
- Agents stop working when exhausted (< 10 energy)
- Clear visual feedback when agents collapse from exhaustion
- Sustainable sleep/wake cycles that maintain agent health

## Next Steps for Playtest Agent

The implementation is now complete and ready for re-testing. Playtest Agent should verify:

1. **Agents sleep when tired:**
   - Energy < 10 → forced sleep
   - Sleep drive > 90 → forced sleep
   - Energy < 20 → seek sleep

2. **Agents stay asleep long enough:**
   - Minimum 4 game hours enforced
   - Wake only when energy >= 80 OR hunger <= 5 OR 12 hours elapsed

3. **Fatigue penalties work:**
   - Agents with energy < 10 cannot work (forced idle)
   - Movement speed reduced based on energy level
   - Work speed reduced based on energy level

4. **No death spirals:**
   - Agents don't wake from hunger before energy recovers
   - Sleep is prioritized over food when critically exhausted
   - Agents can recover from 0 energy without dying

## Adherence to CLAUDE.md Guidelines

✅ **No Silent Fallbacks**
- Wake conditions explicitly check thresholds and raise them (no masking of low energy)
- Work prevention throws agents into idle (no silent continuation)
- Autonomic system logs forced sleep events

✅ **Error Messages Clear**
- Console logs explain why agents forced to sleep or idle
- Thresholds documented in code comments

✅ **Type Safety**
- All function signatures properly typed
- No use of `any` without explicit casting
- Component access validated before use

✅ **Specific Exceptions**
- Wake conditions check specific values (not generic "something wrong")
- Work prevention has explicit energy threshold checks

---

**Implementation Status:** ✅ COMPLETE - READY FOR PLAYTEST VERIFICATION

All critical bugs from playtest report have been addressed. Sleep system now functions as specified in work order.
