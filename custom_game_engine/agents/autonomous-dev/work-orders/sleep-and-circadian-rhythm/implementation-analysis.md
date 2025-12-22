# Implementation Analysis: Sleep & Circadian Rhythm System

## Playtest Failures Analysis

### Issue #1: Energy Displays as 0 (CRITICAL)

**Symptom:** All agents show Energy = 0 at all times, never changes

**Evidence from Playtest:**
- Multiple screenshots show Energy: 0 across different agents (Ivy, Pine)
- Persists through 6+ game days
- Hunger also shows 0 (indicates broader needs tracking issue)

**Code Review Findings:**

1. **Initialization is CORRECT**:
   - `AgentEntity.ts:61, 141`: Agents created with `energy: 80`
   - `NeedsComponent.ts:22-23`: Component properly clamps energy to 0-100

2. **NeedsSystem Update Logic is CORRECT**:
   - Lines 46-96: Proper calculation of energy depletion based on activity
   - Lines 92-106: Component update uses proper immutable pattern

3. **Possible Root Causes**:
   - **MOST LIKELY**: Renderer timing issue - UI reads component before it's properly initialized in world
   - **ALSO POSSIBLE**: Component version/type mismatch between packages (core vs world vs renderer)
   - **LESS LIKELY**: System update order issue (NeedsSystem priority: 15, after AI: 10)

4. **Evidence AGAINST game logic bug**:
   - If energy was actually 0 in game logic, autonomic system would trigger `forced_sleep` behavior (AISystem.ts:404)
   - But playtest shows agents continue "SEEK_FOOD" behavior with Energy=0
   - This suggests display bug, NOT game logic bug

**Fix Strategy:**
1. Add debug logging to NeedsSystem to confirm actual energy values
2. Check if renderer is reading stale/cached component data
3. Verify component immutability isn't causing update propagation issues

---

### Issue #2: Sleep Drive Accumulation Too Slow (CRITICAL)

**Symptom:** Sleep drive increases ~5-10 points per day instead of expected ~48 points per day

**Expected (from work order):**
- +2 per hour awake (base rate)
- +5 per hour after preferred sleep time (night bonus)
- Should reach 60 threshold within 1-2 days

**Actual (from playtest):**
- Day 0 (13:35): Sleep Dr = 22
- Day 0 (19:39): Sleep Dr = 27 (+5 in ~6 hours)
- Day 1 (02:21): Sleep Dr = 36 (+9 in ~7 hours)
- Day 6 (03:02): Sleep Dr = 41-47 (~20 total increase over 6 days)

**Rate Analysis:**
- Expected: +2/hour = +48/day
- Observed: ~3-4/day = ~0.17/hour
- **Accumulation is ~8% of expected rate!**

**Code Review Findings:**

**SleepSystem.ts lines 49-73:**
```typescript
if (circadian.isSleeping) {
  newSleepDrive = Math.max(0, circadian.sleepDrive - 15 * hoursElapsed);
} else {
  let increment = 2 * hoursElapsed; // Base rate (+2 per hour)

  if (timeOfDay >= circadian.preferredSleepTime || timeOfDay < 5) {
    increment = 5 * hoursElapsed; // +5 per hour at night
  }

  if (needs.energy < 30) {
    increment *= 1.5; // 50% faster when tired
  }

  newSleepDrive = Math.min(100, circadian.sleepDrive + increment);
}
```

**The math is CORRECT!** So why is accumulation slow?

**ROOT CAUSE**: The `hoursElapsed` calculation must be wrong!

**SleepSystem.ts lines 28-38:**
```typescript
const timeEntities = world.query().with('time').executeEntities();
let timeOfDay = 12; // Default noon if no time entity
let hoursElapsed = 0;

if (timeEntities.length > 0) {
  const timeEntity = timeEntities[0] as EntityImpl;
  const timeComp = timeEntity.getComponent<TimeComponent>('time');
  if (timeComp) {
    timeOfDay = timeComp.timeOfDay;
    hoursElapsed = (deltaTime / timeComp.dayLength) * 24;
  }
}
```

**Analysis:**
- `deltaTime` = real seconds per frame (~0.05s at 20 TPS)
- `dayLength` = 600 seconds (10-minute game day)
- `hoursElapsed` = (0.05 / 600) * 24 = 0.002 hours per tick

At 20 TPS:
- Per second: 20 ticks × 0.002 hours = 0.04 game hours/real second
- Per minute: 0.04 × 60 = 2.4 game hours/real minute
- Per 10 minutes (1 game day): 2.4 × 10 = 24 game hours ✓ **MATH CHECKS OUT**

So the calculation is correct... BUT the playtest shows slow accumulation!

**Hypothesis:** SleepSystem might not be running every tick, or `deltaTime` is smaller than expected.

**Fix Strategy:**
1. Add logging to SleepSystem to show `hoursElapsed`, `timeOfDay`, sleep drive before/after
2. Check system execution order and frequency
3. Verify deltaTime values being passed to update()

---

### Issue #3: Sleep Behavior Never Triggers (CRITICAL)

**Symptom:** No agents ever enter sleep state despite:
- Energy = 0 (should trigger forced_sleep at energy < 10)
- Sleep drive reaching 47 (below seek_sleep threshold of 60, but agents with energy=0 should force sleep)

**Code Review:**

**AISystem.ts lines 394-421 (Autonomic System):**
```typescript
private checkAutonomicSystem(needs: NeedsComponent, circadian?: any): AgentBehavior | null {
  if (needs.hunger < 20) {
    return 'seek_food';
  }

  if (needs.energy < 10) {
    return 'forced_sleep'; // Should trigger with energy=0!
  }

  if (circadian && circadian.sleepDrive > 95) {
    return 'forced_sleep';
  }

  if (circadian && (circadian.sleepDrive > 80 || (circadian.sleepDrive > 60 && needs.energy < 30))) {
    return 'seek_sleep';
  }

  return null;
}
```

**The logic is CORRECT!** If energy < 10, autonomic system should return `'forced_sleep'`.

**So why doesn't sleep trigger?**

**Two possibilities:**
1. **Energy is NOT actually 0 in game logic** - display bug showing wrong value
2. **Autonomic system is being called but sleep behaviors fail silently**

**Checking sleep behavior handlers (AISystem.ts lines 49-50, 1329-1492):**
- `seek_sleep` and `forced_sleep` are registered ✓
- Implementation looks correct ✓

**ROOT CAUSE HYPOTHESIS**: Issue #1 (energy display bug) means energy is NOT actually 0 in game logic. Real energy might be 80-100, which wouldn't trigger sleep. Display is broken, not the sleep logic.

**Fix Strategy:**
1. Fix Issue #1 (energy tracking/display)
2. Re-test sleep triggering with corrected energy values
3. If sleep still doesn't trigger, add logging to autonomic system

---

## Summary & Implementation Plan

### Core Issues

1. **Display/Component Access Bug**: Renderer cannot read needs component properly (energy/hunger show 0)
2. **Sleep Drive Accumulation**: Either hoursElapsed is too small OR SleepSystem isn't running frequently enough
3. **Sleep Behavior**: Blocked by issues #1 and #2

### Fix Priority

**P0 (Must Fix):**
1. Debug and fix energy/needs display issue
2. Fix sleep drive accumulation rate
3. Verify sleep behaviors trigger correctly

**P1 (Should Fix):**
4. Add comprehensive debug logging
5. Verify fatigue penalties apply
6. Add sleep animations (Z's bubble)

**P2 (Nice to Have):**
7. Optimize performance (batching, reduce logging)

### Next Steps

1. Add debug logging to NeedsSystem and SleepSystem
2. Build and run demo with console open
3. Verify actual energy/sleep drive values in console vs UI
4. Fix component access pattern if UI is reading wrong data
5. Re-run playtests

