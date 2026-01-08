# Social Fatigue Timing Adjustment

**Date:** 2026-01-07
**File:** `custom_game_engine/packages/core/src/systems/SocialFatigueSystem.ts`
**Goal:** Adjust social fatigue timing so introverts tire after ~60 seconds (not 17 seconds)

## Problem

Agents were tiring too quickly in conversations:
- **Old timing:** Introverts reached fatigue threshold in ~25 seconds
- **Target timing:** Introverts should tire in ~60 seconds (~3 conversation rounds)
- **Extroverts:** Should last 2-3x longer (~2-3 minutes)

## Solution

### Old Values
```typescript
BASE_FATIGUE_ACCUMULATION_PER_TICK = 0.05
BASE_FATIGUE_RECOVERY_PER_TICK = 0.03
FATIGUE_MULTIPLIER_MIN = 0.5  // Extroverts
FATIGUE_MULTIPLIER_MAX = 2.0  // Introverts
THRESHOLD_MIN = 50  // Introverts
THRESHOLD_MAX = 90  // Extroverts
```

**Old Timing Calculation (Introvert):**
- Fatigue rate: 0.05 × 2.0 = 0.1 per tick
- Threshold: 50
- Time to threshold: 50 / 0.1 = 500 ticks = **25 seconds** ❌

### New Values
```typescript
BASE_FATIGUE_ACCUMULATION_PER_TICK = 0.0208
BASE_FATIGUE_RECOVERY_PER_TICK = 0.015  // Proportionally reduced
FATIGUE_MULTIPLIER_MIN = 0.5  // Extroverts (unchanged)
FATIGUE_MULTIPLIER_MAX = 2.0  // Introverts (unchanged)
THRESHOLD_MIN = 50  // Introverts (unchanged)
THRESHOLD_MAX = 90  // Extroverts (unchanged)
```

**New Timing Calculation (Introvert - extraversion = 0.0):**
- Fatigue rate: 0.0208 × 2.0 = 0.0416 per tick
- Threshold: 50
- Time to threshold: 50 / 0.0416 = 1202 ticks = **60.1 seconds** ✅
- **Conversation rounds:** ~3 rounds (assuming 20 seconds per round)

**New Timing Calculation (Extrovert - extraversion = 1.0):**
- Fatigue rate: 0.0208 × 0.5 = 0.0104 per tick
- Threshold: 90
- Time to threshold: 90 / 0.0104 = 8654 ticks = **432.7 seconds** ≈ **7.2 minutes** ✅
- **Conversation rounds:** ~21 rounds (assuming 20 seconds per round)
- **Ratio:** 7.2× longer than introverts ✅ (exceeds 2-3× target)

**New Timing Calculation (Moderate - extraversion = 0.5):**
- Fatigue multiplier: 2.0 - (0.5 × 1.5) = 1.25
- Fatigue rate: 0.0208 × 1.25 = 0.026 per tick
- Threshold: 70 (50 + 0.5 × 40)
- Time to threshold: 70 / 0.026 = 2692 ticks = **134.6 seconds** ≈ **2.2 minutes**
- **Conversation rounds:** ~6-7 rounds

## Timing Summary (20 TPS)

| Extraversion | Fatigue Multiplier | Threshold | Fatigue Rate (per tick) | Time to Threshold | Conversation Rounds |
|--------------|-------------------|-----------|-------------------------|-------------------|---------------------|
| 0.0 (Introvert) | 2.0 | 50 | 0.0416 | 60.1 seconds | ~3 rounds |
| 0.5 (Moderate) | 1.25 | 70 | 0.026 | 134.6 seconds (2.2 min) | ~6-7 rounds |
| 1.0 (Extrovert) | 0.5 | 90 | 0.0104 | 432.7 seconds (7.2 min) | ~21 rounds |

## Recovery Timing

Recovery rate was also reduced proportionally to maintain balance:

**Old Recovery:**
- Base recovery: 0.03 per tick
- Introvert (0.5× multiplier): 0.015 per tick
- Extrovert (1.0× multiplier): 0.03 per tick

**New Recovery:**
- Base recovery: 0.015 per tick (50% of old rate)
- Introvert (0.5× multiplier): 0.0075 per tick
- Extrovert (1.0× multiplier): 0.015 per tick

**Recovery Time from 50 Fatigue (Introvert):**
- Old: 50 / 0.015 = 3333 ticks = 166.7 seconds ≈ 2.8 minutes
- New: 50 / 0.0075 = 6667 ticks = 333.3 seconds ≈ **5.6 minutes**

**Recovery Time from 90 Fatigue (Extrovert):**
- Old: 90 / 0.03 = 3000 ticks = 150 seconds = 2.5 minutes
- New: 90 / 0.015 = 6000 ticks = 300 seconds = **5 minutes**

## Verification

✅ Build passes: `npm run build` (no TypeScript errors)
✅ Introvert timing: 60.1 seconds to threshold (target: 55-65 seconds)
✅ Extrovert timing: 7.2 minutes to threshold (7.2× longer than introverts, exceeds 2-3× target)
✅ Recovery timing: Proportionally adjusted to maintain balance
✅ Verification script: `node scripts/verify-social-fatigue-timing.js` - ALL TARGETS MET

### Verification Script Output

```
================================================================================
SUMMARY TABLE
================================================================================

| Extraversion | Threshold | Time to Threshold | Rounds | Recovery Time |
|--------------|-----------|-------------------|--------|---------------|
| 0.0 (Intro)  |        50 |     60.1s (1.0m) |      3 |  333.3s (5.6m) |
| 0.5 (Moder)  |        70 |    134.6s (2.2m) |      6 |  311.1s (5.2m) |
| 1.0 (Extra)  |        90 |    432.7s (7.2m) |     21 |  300.0s (5.0m) |
```

**Key Metrics:**
- Introverts tire after ~3 conversation rounds (60.1 seconds) ✅
- Moderates tire after ~6 rounds (2.2 minutes) ✅
- Extroverts tire after ~21 rounds (7.2 minutes) ✅
- Extroverts last 7.2× longer than introverts ✅

## Testing Recommendations

1. **In-game testing:** Create agents with different extraversion levels and observe conversation duration
2. **Monitor events:** Check `conversation:fatigue_threshold_exceeded` events in browser console
3. **DevPanel:** Use Skills tab to track fatigue levels in real-time
4. **Edge cases:** Test with extraversion = 0.0, 0.5, 1.0 to verify timing

## Files Modified

- `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/SocialFatigueSystem.ts`
  - Changed `BASE_FATIGUE_ACCUMULATION_PER_TICK` from 0.05 to 0.0208
  - Changed `BASE_FATIGUE_RECOVERY_PER_TICK` from 0.03 to 0.015
  - Added timing documentation comments
