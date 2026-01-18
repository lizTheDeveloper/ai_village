# AI Village Playtest Report - January 17, 2026

## Executive Summary

A 5-minute headless playtest revealed **critical behavioral problems** blocking core gameplay loops. The most severe issue: **85% of LLM decisions are not being recognized or executed** despite the LLM API working perfectly. Agents are thinking and deciding correctly, but the game isn't listening to them.

**Session Details:**
- Session ID: `headless_1768682798145_b3vd18`
- Duration: 5 minutes 12 seconds (~4,500 ticks at 20 TPS)
- Agents: 5 villagers (Sparrow, Rowan, Ivy, Ash, Wren)
- Buildings Completed: 0
- Resources Gathered: 232 items

---

# UPDATE: Second Playtest Attempt - UI Session

**Date:** 2026-01-17 (evening)
**Session ID:** `game_1768719575547_8yemfp` and `game_1768719809896_fnce4h`
**Method:** Browser-based observation via Playwright

## New Critical Issues Discovered

### CRITICAL: PrayerAnsweringSystem Crashes Every ~20 Ticks

**Error:**
```
TypeError: deityComp.getNextPrayer is not a function
    at PrayerAnsweringSystem._autoAnswerPrayers (PrayerAnsweringSystem.ts:74:34)
    at PrayerAnsweringSystem._processDeityPrayers
    at PrayerAnsweringSystem.onUpdate
```

**Frequency:** Every ~20 ticks (observed at ticks 9015, 9035, 9055, 9075, 9095, 9115, 9135, 9155)

**Impact:** System crashes on EVERY update cycle, completely blocking prayer mechanics

**File:** `/custom_game_engine/packages/core/src/systems/PrayerAnsweringSystem.ts:74`

**Fix Required:** Deity component schema mismatch - either add `getNextPrayer()` method to deity component OR update system to use correct API

### CRITICAL: Catastrophic Performance Degradation

**Observed State:**
- **Target TPS:** 20 (50ms per tick)
- **Actual TPS:** 1.7-2.0 (450-800ms per tick)
- **Performance:** 90% BELOW TARGET

**Sample Tick Timings:**
- Tick 9015: 801ms (16x slower than target!)
- Tick 9075: 636ms
- Tick 9095: 638ms
- Tick 9115: 767ms
- Tick 9135: 706ms
- Tick 9155: 705ms

**Top System Offenders:**

1. **MidwiferySystem: 9-13ms EVERY tick**
   - Consistently in top 3 slowest systems
   - **No pregnancies exist in game**
   - Running expensive checks for nothing
   - **Fix:** Add early exit if no `pregnant` components, throttle to every 100 ticks

2. **Publishing/Media Systems: 10-12ms**
   - `publishing_unlock`, `publishing_production`, `myth_retelling`, `myth_generation`
   - Complex systems running every tick unnecessarily
   - **Fix:** Throttle to every 20-100 ticks

3. **Chunk/Terrain Systems: 9-25ms spikes**
   - `chunk_loading` (25ms spike), `background_chunk_generator`, `TerrainModificationSystem`
   - Workers exist but still causing main thread lag
   - **Fix:** Increase throttling, reduce chunk priority

4. **Religious Systems: 10-14ms**
   - `ReligiousCompetitionSystem`, `RitualSystem`, `HolyTextSystem`, `prayer`
   - **Fix:** Throttle to every 50-100 ticks

5. **Other Heavy Systems:**
   - `spatial_memory_query`: 9-10ms
   - `predator_attack`: 11-26ms (SPIKE to 26ms!)
   - `city_director`: 9-25ms (SPIKE to 25ms!)
   - `governance_data`: 24ms spike

### CRITICAL: UI Fails to Load Game

**Observed:** Browser stuck on "Multiverse Gateway" screen indefinitely

**Evidence:**
- Console logs show world loading (chunks deserializing, systems initializing)
- Metrics show game running in background (ticks 9015-9160+)
- UI never transitions from gateway to game view
- Live Query API returns "No game client connected" or "Query timed out"

**Impact:** Game runs in background but players cannot see or interact with it

**Potential Causes:**
1. Performance so bad UI thread is completely blocked
2. React component not updating due to state/render issues
3. Save load process never completing/signaling completion properly
4. Error in UI transition code

### HIGH: Agents Stuck in Behaviors

**From session `game_1768719575547_8yemfp` (6m 47s duration):**

**Echo (a4eb9019):**
- Status: STUCK for 6m 3s
- Behavior: "build"
- Expected: Build should complete or timeout within 1-2 minutes
- Issue: Over 5 minutes with no progress

**Meadow (75fa0113):**
- Status: STUCK for 6m 44s (almost since spawn!)
- Behavior: "seek_food"
- Events: 17 (most active agent)
- Resources: -7 berries consumed, 0 gathered
- Issue: Seeking food but unable to complete - likely pathfinding failure or no accessible food

**Ivy, North, Haven:**
- Status: "idle" for entire 6m 47s
- Events: 1 each (just spawn)
- Issue: Should have hunger, tiredness, temperature needs triggering autonomic behaviors, but completely inactive

### MEDIUM: Missing Sprite Assets

**15+ missing sprites causing render failures:**
- Animals: `chicken_white`
- Plants: `elderberry`, `blackberry-bush`, `blueberry-bush`, `raspberry-bush`, `moss`, `thistle`, `fern`, `sage`, `wild-garlic`, `clover`
- Items: `bedroll`, `campfire`

**Impact:** Visual glitches, invisible entities, player confusion

**File:** `/custom_game_engine/packages/renderer/src/SpriteRenderer.ts:87`

**Fix:** Generate via PixelLab daemon, add fallback rendering

### MEDIUM: ChatRoomSystem Logging Pollution

**Issue:** Normal operations logged at ERROR level:
```
[ERROR] [ChatRoomSystem] Created room: Divine Realm
[ERROR] [ChatRoomSystem] Unknown has entered the chat (Divine Realm)
[ERROR] [ChatRoomSystem] Divine Realm activated with 1 members
```

**Impact:** Masks real errors, confuses debugging

**File:** `/custom_game_engine/packages/core/src/communication/ChatRoomSystem.ts`

**Fix:** Change ERROR → LOG level

### MEDIUM: FluidDynamics Not Functional

**Warning:** `[FluidDynamics] No tile accessor available`

**File:** `/custom_game_engine/packages/core/src/systems/FluidDynamicsSystem.ts:34`

**Impact:** Fluid dynamics completely non-functional

## What Agents Are NOT Doing (Session game_1768719575547_8yemfp)

Based on 7 minutes of observation:

1. **Not seeking food:** 3/5 agents idle despite hunger (only Meadow stuck trying)
2. **Not seeking warmth:** Nighttime (cold), 0 agents seeking campfires
3. **Not sleeping:** Nighttime, should be tired, 0 seeking sleep
4. **Not gathering resources:** 0 gathered, -7 berries consumed
5. **Not completing behaviors:** Echo stuck on build, Meadow stuck on seek_food
6. **Not forming relationships:** 0 conversations, 0 relationships
7. **Not exploring:** Agents spawn and stop
8. **Not using LLM:** 0 LLM requests despite all 5 being LLM-enabled

## What IS Working

1. **Save System:** Files correctly formatted, gzipped, contain full state
2. **Roof Repair System:** Auto-detected and repaired 2 buildings (120 tiles) on load
3. **Metrics Dashboard:** Excellent observability into agent states, behaviors, resources
4. **LLM Scheduler:** 0 queue buildup, providers healthy
5. **Memory Formation:** 7 memories formed (earlier session had issues with this)
6. **Resource Tracking:** Correctly tracking consumption (net: -7 berries)
7. **Chunk Loading:** 60 chunks loaded successfully
8. **WebSocket Metrics:** Connected successfully to ws://localhost:8765

---

## Critical Problems Found (Earlier Headless Playtest)

### 1. LLM Decision Recognition Failure (CRITICAL - P0)

**Severity:** CRITICAL - Blocks all agent autonomy

**The Numbers:**
- LLM Calls: 48 total
- Successful API Responses: 48 (100%)
- Decisions Recorded: 7 (14.6%)
- **Decisions Lost: 41 (85.4%)**

**What's Happening:**
The LLM API responds with valid JSON decisions like:
```json
{
  "thinking": "Village needs warmth and cooking...",
  "action": {"type": "plan_build", "building": "campfire"}
}
```

But the game shows: `Decision: unknown` or `(pending or no response captured)`

**Impact:**
- Agents appear "stuck" or "idle" despite actively deciding
- Dashboard incorrectly reports failures
- Building, crafting, social actions never execute

**Per-Agent Breakdown:**
| Agent | LLM Calls | Decisions Recorded | Recognition Rate |
|-------|-----------|-------------------|------------------|
| Ash | 16 | 0 | 0% |
| Rowan | 22 | 2 | 9% |
| Ivy | 6 | 1 | 17% |
| Wren | 2 | 1 | 50% |
| Sparrow | 2 | 2 | 100% |

---

### 2. Building System Completely Broken (HIGH - P0)

**Severity:** HIGH - Core gameplay loop blocked

**Evidence:**
- Buildings completed: 0
- Buildings in progress: 0
- Error: `Unknown building type: Lean-To` (appears twice)
- Contradiction: Campfire listed as both "existing" AND "missing"

**Specific Failures:**
1. Ash tried to build campfire 3 times - all ignored
2. Rowan's `plan_build` decision recorded but not executed
3. Building type registry incomplete (Lean-To not recognized)
4. Building existence detection broken

---

### 3. Recurring System Errors Every Tick (MEDIUM - P1)

**InjurySystem Error:**
```
TypeError: currentNeeds.clone is not a function
at InjurySystem.applyNeedsModifiers (InjurySystem.ts:191:36)
```
- Frequency: Every tick
- Impact: Injuries not affecting agent needs

**BuildingMaintenanceSystem Error:**
```
TypeError: Cannot read properties of undefined (reading 'includes')
at BuildingMaintenanceSystem.getDurabilityModifier (BuildingMaintenanceSystem.ts:226:22)
```
- Frequency: Every tick
- Impact: Building maintenance not functioning

**PlantDiseaseSystem Error:**
```
TypeError: Cannot destructure property 'hour' of 'e.data' as it is undefined
at PlantDiseaseSystem.ts:151:15
```
- Frequency: Once at startup
- Impact: Plant disease system inactive

---

### 4. Agents Stuck in Gather-Idle Loop (MEDIUM - P1)

**Pattern Observed (Headless Session):**
- Sparrow: gather → idle → gather → idle (10 cycles in 1 minute)
- Rowan: Single gather for 1m 48s, then idle
- Ivy: gather (40s) → idle → gather (2m 46s)
- Ash: Multiple gather attempts, appears as idle
- Wren: Single action 3m 10s ago, then nothing

**What Agents ARE NOT Doing:**
- Building anything (0 buildings despite decisions)
- Having conversations (0 conversations)
- Forming relationships (0 relationships)
- Using gathered resources (232 items sitting unused)
- Crafting or cooking
- Exploring

---

### 5. Resource Gathering Without Purpose (LOW - P2)

**Resources Gathered (Headless Session):**
- 52 moss seeds
- 44 yarrow seeds
- 42 fern seeds
- 40 wildflower seeds
- 30 wood
- 21 blackberry bush seeds
- 14 sage seeds
- 7 ginseng seeds
- 4 wild garlic seeds

**Problem:** Resources accumulate but are never:
- Planted (seeds)
- Cooked (berries)
- Crafted into tools (wood)
- Used for building (wood)

---

## Root Cause Analysis

### The Decision Pipeline Is Broken

```
1. Agent needs decision      → ✓ Works
2. LLM receives prompt       → ✓ Works
3. LLM generates response    → ✓ Works (100% success)
4. Response parsed to JSON   → ✓ Works (valid JSON in logs)
5. Decision recorded         → ✗ FAILS HERE (85% lost)
6. Decision executed         → ✗ Blocked by step 5
```

**Likely Culprits:**
1. `MetricsCollectionSystem.ts` - Not emitting/capturing `llm:decision` events
2. `LLMDecisionProcessor.ts` - Not triggering decision recording after parse
3. Event bus timing - Decisions lost between ticks

### Performance Pipeline Is Broken

```
1. Systems query entities     → ✓ Works
2. Systems process logic      → ⚠️ TOO SLOW (10-25ms per system!)
3. Systems should throttle    → ✗ NOT HAPPENING (MidwiferySystem every tick)
4. Systems should early exit  → ✗ NOT HAPPENING (checking empty sets)
5. Target 50ms per tick       → ✗ ACTUAL: 450-800ms per tick
```

---

## Prioritized Fix Plan

### P0 - CRITICAL (Block Everything Else)

| Issue | Location | Action | Impact |
|-------|----------|--------|--------|
| **PrayerAnsweringSystem crash** | `PrayerAnsweringSystem.ts:74` | Add `getNextPrayer()` method to deity component OR update system to use correct API | Errors every 20 ticks |
| **Performance degradation** | Multiple systems | Throttle MidwiferySystem (100 ticks), publishing systems (20-100 ticks), religious systems (50-100 ticks), add early exits | 90% below target TPS |
| **UI loading failure** | Save load → UI transition | Debug and add logging, error handling, timeouts | Game unplayable in browser |
| **Decision recognition** | `LLMDecisionProcessor.ts`, `MetricsCollectionSystem.ts` | Debug event emission/capture, verify `llm:decision` events | 85% of decisions lost |

### P1 - HIGH (Major Gameplay Blockers)

| Issue | Location | Action |
|-------|----------|--------|
| **Agents stuck in behaviors** | Pathfinding, behavior timeout | Add 2-minute behavior timeouts, debug pathfinding failures, improve error recovery |
| **Building type registry** | Building system | Add "Lean-To" and normalize case (`.toLowerCase()`) |
| **InjurySystem clone error** | `InjurySystem.ts:191` | Add `.clone()` to Needs component or use spread operator |
| **BuildingMaintenance undefined** | `BuildingMaintenanceSystem.ts:226` | Add null check before `.includes()` |
| **Agents not responding to needs** | AgentBrainSystem, autonomic layer | Debug need thresholds, verify triggers |

### P2 - MEDIUM (Quality & Polish)

| Issue | Location | Action |
|-------|----------|--------|
| **Missing sprites** | Renderer + PixelLab | Generate 15+ missing sprites, add fallback rendering |
| **ChatRoomSystem log pollution** | `ChatRoomSystem.ts` | Change ERROR → LOG level |
| **FluidDynamics broken** | `FluidDynamicsSystem.ts:34` | Fix tile accessor injection or disable if non-critical |
| **PlantDiseaseSystem error** | `PlantDiseaseSystem.ts:151` | Fix event data structure for `world:time:hour` |
| **Social interactions missing** | Social/conversation systems | Debug why `talk` action never chosen |

---

## Recommended Investigation Order

1. **First:** Fix PrayerAnsweringSystem crash
   - Immediate blocker, errors polluting logs
   - Quick fix: add method or update system

2. **Second:** Fix performance issues
   - Throttle MidwiferySystem with early exit
   - Throttle publishing, religious, chunk systems
   - Profile remaining heavy systems (predator_attack, city_director)
   - Target: Get to 20 TPS sustained

3. **Third:** Fix UI loading
   - Add debug logging to save load → UI transition
   - Ensure performance fixes help UI responsiveness
   - Add timeout/error handling

4. **Fourth:** Fix decision recognition pipeline
   - This unlocks all other agent behaviors
   - Agents are already thinking, just need to be heard

5. **Fifth:** Fix building system
   - Normalize case, add missing types
   - Core gameplay loop depends on this

6. **Sixth:** Fix stuck agent behaviors
   - Add behavior timeouts
   - Improve pathfinding error recovery

7. **Seventh:** Fix system errors (InjurySystem, BuildingMaintenance)
   - These fire every tick but lower impact than above

8. **Eighth:** Improve behavior variety and resource usage
   - Add social interactions
   - Implement cooking, crafting, planting

---

## Test Validation Criteria

After fixes, a successful playtest should show:
- [ ] No system errors/crashes
- [ ] TPS consistently at 19-20 (95%+ of target)
- [ ] UI loads game within 10 seconds
- [ ] Decision recognition rate > 90%
- [ ] At least 1 building completed in 5 minutes
- [ ] At least 1 conversation between agents
- [ ] Agents respond to hunger, tiredness, temperature
- [ ] No agents stuck for > 2 minutes
- [ ] Resources being used (cooked, crafted, planted)
- [ ] Behavior variety beyond gather/idle

---

## Detailed Fix Recommendations

### Fix 1: PrayerAnsweringSystem Crash (P0 - IMMEDIATE)

**Problem:** `deityComp.getNextPrayer is not a function`

**Solution A - Add method to component:**
```typescript
// In DeityComponent schema/class
getNextPrayer(): Prayer | null {
  if (!this.pendingPrayers || this.pendingPrayers.length === 0) {
    return null;
  }
  return this.pendingPrayers[0];
}
```

**Solution B - Update system to use correct API:**
```typescript
// In PrayerAnsweringSystem.ts:74
// Replace: const nextPrayer = deityComp.getNextPrayer();
// With:
const nextPrayer = deityComp.pendingPrayers?.[0] ?? null;
```

### Fix 2: MidwiferySystem Performance (P0)

**Problem:** 9-13ms every tick despite no pregnancies

**File:** `/custom_game_engine/packages/core/src/reproduction/midwifery/MidwiferySystem.ts`

**Solution:**
```typescript
private UPDATE_INTERVAL = 100; // Every 5 seconds
private lastUpdate = 0;

update(world: World): void {
  // Early exit if not time to update
  if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
  this.lastUpdate = world.tick;

  // Early exit if no pregnancies
  const pregnant = world.query().with('pregnant').executeEntities();
  if (pregnant.length === 0) return;

  // Actual midwifery logic here...
}
```

### Fix 3: Throttle Heavy Systems (P0)

Apply similar pattern to:
- **Publishing systems:** every 20-100 ticks
- **Religious systems:** every 50-100 ticks
- **Myth systems:** every 100 ticks
- **Memory consolidation:** every 200 ticks

### Fix 4: Building Type Case Normalization (P1)

**Problem:** LLM outputs `Lean-To` but registry expects `lean-to`

**Files:**
- `packages/core/src/decision/LLMDecisionProcessor.ts`
- `packages/core/src/decision/ExecutorLLMProcessor.ts`
- `packages/core/src/decision/ScriptedDecisionProcessor.ts`

**Solution:**
```typescript
// In plan_build handling:
const buildingType = (buildAction.building || BuildingType.StorageChest).toLowerCase();
```

### Fix 5: InjurySystem Clone Error (P1)

**Problem:** `currentNeeds.clone is not a function` at line 191

**File:** `packages/core/src/systems/InjurySystem.ts`

**Solution:**
```typescript
// Replace: const modifiedNeeds = currentNeeds.clone();
// With:
const modifiedNeeds = { ...currentNeeds };
```

### Fix 6: BuildingMaintenance Undefined Check (P1)

**Problem:** `Cannot read properties of undefined (reading 'includes')`

**File:** `packages/core/src/systems/BuildingMaintenanceSystem.ts:226`

**Solution:**
```typescript
if (someProperty && someProperty.includes(...)) {
  // existing logic
}
```

### Fix 7: Add Behavior Timeouts (P1)

**Problem:** Agents stuck in behaviors for 5+ minutes

**Solution:** Add max duration to all behaviors:
```typescript
const MAX_BEHAVIOR_DURATION = 2400; // 2 minutes at 20 TPS

if (this.startTick && (world.tick - this.startTick) > MAX_BEHAVIOR_DURATION) {
  this.complete(context, 'timeout');
  return;
}
```

---

## Performance Budget Recommendations

**Target: 50ms per tick (20 TPS)**

Suggested per-system budgets:
- Critical systems (Brain, Movement, Time): 5ms max each
- Important systems (Needs, Perception): 3ms max each
- Background systems (Memory, Social): 2ms max each
- Utility systems (Metrics, AutoSave): 1ms max each

Systems exceeding budget should be throttled or optimized.

---

## Conclusion

The game has **two parallel critical failures**:

1. **Performance Crisis:** Running at 10% of target speed (2 TPS vs 20 TPS)
2. **Decision Pipeline Broken:** 85% of agent decisions lost

Additionally, the **UI completely fails to load** in the browser despite the simulation running.

**Good news:**
- ECS architecture is sound
- Save/load system works
- Metrics/observability excellent
- LLM API working perfectly
- Pathfinding, gathering, resource tracking all functional

**Path forward:**
1. Fix PrayerAnsweringSystem crash (immediate)
2. Throttle heavy systems to reach 20 TPS (critical)
3. Fix UI loading (critical for playability)
4. Fix decision recognition (unlocks agent autonomy)
5. Fix building system (unlocks core gameplay)
6. Add behavior timeouts (prevents stuck agents)
7. Polish and depth improvements

**Estimated effort:**
- P0 fixes: 4-8 hours
- P1 fixes: 8-12 hours
- P2 fixes: 4-6 hours
- **Total: 16-26 hours to playable state**
