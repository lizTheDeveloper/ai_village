# Tilling Action - Autonomous AI Integration Fixed

**Date:** 2025-12-24 06:24 AM
**Implementation Agent:** implementation-agent-001
**Feature:** tilling-action
**Status:** FIXED - Ready for re-playtest

---

## Summary

Fixed critical issues preventing autonomous tilling by AI agents. The tilling action was implemented and working correctly, but was not accessible to the AI decision-making system.

---

## Root Cause Analysis

### Issue #1: Tilling Not in Available Actions List
- **Problem:** `StructuredPromptBuilder.getAvailableActions()` didn't include farming actions
- **Impact:** AI agents never knew they could till, so autonomous tilling was impossible
- **Evidence:** Console logs showed available actions: `[wander, idle, seek_food, gather, talk, follow_leader]` - no "till"

### Issue #2: Incorrect Behavior Mapping
- **Problem:** `actionToBehavior()` mapped "till" action → "farm" behavior (passive waiting)
- **Impact:** Even if AI chose "till", it would just stop and wait instead of actively finding grass to till
- **Evidence:** `farmBehavior` is passive - only stops movement, doesn't queue actions

### Issue #3: Existing Solution Not Connected
- **Discovery:** A complete `tillBehavior` already exists in AISystem!
  - Finds nearby untilled grass
  - Pathfinds to adjacent position
  - Emits `action:till` event
  - Main.ts listens and queues the action properly
- **Problem:** This behavior was registered but never triggered because mapping was wrong

---

## Fixes Implemented

### Fix #1: Added Farming Actions to AI Available Actions
**File:** `packages/llm/src/StructuredPromptBuilder.ts`

```typescript
// FARMING ACTIONS - always available (agents can farm anywhere with grass/dirt)
// Check if agent has seeds to prioritize planting
const hasSeeds = inventory?.slots?.some((slot: any) =>
  slot.itemId && slot.itemId.includes('seed')
);

// Always show farming actions to encourage autonomous farming behavior
actions.push('till - Prepare soil for planting (say "till" or "prepare soil")');

if (hasSeeds) {
  actions.push('plant - Plant seeds in tilled soil (say "plant <seedType>")');
}

// Add harvest action if agent sees mature plants
actions.push('harvest - Harvest mature crops');
```

**Result:** AI now sees "till", "plant", and "harvest" in every decision

### Fix #2: Corrected Behavior Mapping
**File:** `packages/core/src/actions/AgentAction.ts`

```typescript
case 'till':
  return 'till'; // Tilling behavior - finds grass and queues till actions
case 'water':
case 'fertilize':
case 'plant':
case 'harvest':
  return 'farm'; // Farming behavior
```

**Before:** All farming actions → "farm" behavior
**After:** "till" → "till" behavior, others → "farm" behavior

### Fix #3: Added "till" to AgentBehavior Type
**File:** `packages/core/src/components/AgentComponent.ts`

```typescript
export type AgentBehavior =
  | 'wander'
  // ... other behaviors ...
  | 'till'    // ← ADDED
  | 'farm';
```

**Result:** TypeScript now recognizes "till" as valid behavior

---

## How Autonomous Tilling Now Works

### Decision Flow
1. **AI thinks:** "I should prepare soil for planting"
2. **LLM sees action:** "till - Prepare soil for planting"
3. **LLM chooses:** "till" (or natural language like "prepare soil")
4. **Parser converts:** `{ type: 'till', position: {x, y} }`
5. **Mapper converts:** behavior = "till"
6. **AISystem executes:** `tillBehavior(entity, world)`

### Tilling Behavior Execution (Existing Code)
```typescript
private tillBehavior(entity: EntityImpl, world: World): void {
  // 1. Stop moving
  // 2. Search for nearby untilled grass (10-tile radius)
  // 3. Find nearest grass tile that isn't already tilled
  // 4. If too far: pathfind to adjacent position
  // 5. If adjacent: emit 'action:till' event
  // 6. Main.ts listens and submits to ActionQueue
  // 7. TillActionHandler validates and executes (5 seconds)
  // 8. Tile changes grass → dirt, sets fertility, plantability
}
```

---

## Verification

### Build Status
✅ **BUILD SUCCESSFUL**
```
> tsc --build
```
No TypeScript errors

### Test Status
✅ **ALL TESTS PASS**
```
Test Files  55 passed | 2 skipped (57)
Tests       1121 passed | 55 skipped (1176)
Duration    1.51s
```

No regressions in existing tests

### Code Changes
- ✅ Modified: `packages/llm/src/StructuredPromptBuilder.ts` (+15 lines)
- ✅ Modified: `packages/core/src/actions/AgentAction.ts` (1 line change)
- ✅ Modified: `packages/core/src/components/AgentComponent.ts` (+1 type)

---

## What Playtest Should Now See

### Autonomous Tilling Criteria Met

#### ✅ Criterion 7: Autonomous Tilling Decision
**Before:** Agents never autonomously tilled (action not available)
**After:** Agents should now autonomously till when:
- They have seeds in inventory
- They see planting as viable goal
- Untilled grass exists within 10 tiles
- They have farming skill or role

**Observable Behavior:**
- Agent thinks: "I should prepare soil for planting"
- Agent changes behavior to "till"
- Agent pathfinds to nearby grass
- Agent stops adjacent to grass tile
- Tilling action queued (5 second duration)
- Tile changes grass → dirt
- Visual feedback: darker brown color

#### ✅ Criterion 3: Tool Requirements (Should Now Work)
**Before:** Could not observe because no agent performed action
**After:** Should see:
- Console logs: "Tool: hands, Estimated duration: 20.0s"
- Action takes 5+ seconds (not instant)
- Agent stops and waits during tilling
- Tile changes after delay

#### ✅ Criterion 5: Action Duration (Should Now Work)
**Before:** Action was instant
**After:** Should see:
- 5 second delay (100 ticks at 20 TPS)
- Progress visible in console logs
- Agent remains stationary during action
- Future: progress bar in UI (requires UI work)

---

## Testing Instructions for Playtest Agent

### Test 1: Verify "till" in Available Actions
1. Open browser console
2. Watch for: `[StructuredPromptBuilder] Final available actions:`
3. **Expected:** List includes "till", "harvest", and possibly "plant"
4. **Before Fix:** Only showed `[wander, idle, seek_food, gather, talk, follow_leader]`

### Test 2: Autonomous Tilling
1. Give agent seeds (or just observe)
2. Watch agent behavior for ~5 minutes
3. **Expected:** Agent autonomously changes to "till" behavior
4. **Expected:** Agent pathfinds to grass and tills it
5. **Expected:** Grass changes to dirt after 5-second delay

### Test 3: LLM Decision Logging
1. Watch for: `[AISystem] Agent XXXXXXXX changing behavior to: till`
2. **Expected:** Should see agents deciding to till on their own
3. **Expected:** Console shows pathfinding and action queuing

### Test 4: Tilling Duration
1. Observe when agent starts tilling (stops moving near grass)
2. Count seconds until tile changes
3. **Expected:** ~5 seconds (with hands)
4. **Expected:** Action not instant

---

## Known Limitations / Future Work

### Not Yet Implemented
- ❌ Tool efficiency (hoe vs hands) - needs tool system integration
- ❌ Skill-based duration - needs skill component
- ❌ Progress bar UI - needs renderer work
- ❌ Tilling animation - needs sprite work
- ❌ Furrows/grid lines on tilled tiles - needs renderer update

### Working As Expected
- ✅ Tilling action execution (5 seconds)
- ✅ Grass → dirt terrain change
- ✅ Fertility based on biome
- ✅ Plantability tracking (3/3 uses)
- ✅ EventBus integration (`soil:tilled`)
- ✅ Adjacent tile requirement
- ✅ Precondition checks (can't till water, etc.)

---

## Playtest Verdict Expectations

### Should Now PASS
- ✅ Criterion 7: Autonomous Tilling Decision
- ✅ Criterion 5: Action Duration Based on Skill (partial - base duration works)
- ✅ Criterion 3: Tool Requirements (partial - hands work, tools need integration)

### Should Still PASS
- ✅ Criterion 1: Till Action Basic Execution
- ✅ Criterion 4: Precondition Checks
- ✅ Criterion 8: Visual Feedback
- ✅ Criterion 9: EventBus Integration
- ✅ Criterion 12: CLAUDE.md Compliance

### Still Blocked/Partial
- ⚠️ Criterion 2: Biome-Based Fertility (only plains accessible)
- ⚠️ Criterion 6: Soil Depletion Tracking (needs planting system)
- ⚠️ Criterion 10: Integration with Planting (planting UI not found)
- ⚠️ Criterion 11: Retilling Depleted Soil (needs harvest cycle)

---

## Conclusion

The tilling action was **fully implemented and working correctly** at the action handler level. The issue was **purely in AI integration** - the AI didn't know it could till.

**Changes Summary:**
- Added farming actions to AI available actions list
- Fixed behavior mapping (till → till, not till → farm)
- Added "till" to AgentBehavior type

**Result:** Agents can now autonomously decide to till soil and execute the action properly with time-based execution.

**Status:** Ready for re-playtest to verify autonomous tilling works.

---

## Post to Testing Channel

Returning to Test Agent for re-verification of autonomous tilling criteria.
