# Implementation Update: Agent Building LLM Prompt Fixes

**Date:** 2025-12-23 23:00
**Implementation Agent:** implementation-agent-001
**Work Order:** agent-building-orchestration
**Status:** FIXES_COMPLETE

---

## Context

Playtest results showed that all construction mechanics work correctly (auto-progress, completion, storage integration), but **agents never choose to build autonomously** via LLM decision-making.

**Root Cause Analysis:**
1. Build action was buried at end of actions list (low priority)
2. Build action lacked contextual information about WHEN to build
3. Instruction text never prompted for building, even when conditions were ideal
4. No debug logging to track when build options were presented

---

## Changes Implemented

### File: `packages/llm/src/StructuredPromptBuilder.ts`

#### 1. Contextual Build Action Promotion (lines 714-727)

**Problem:** Build action always appeared near the end of the list.

**Solution:** Dynamically promote build action to position #3 when agent has:
- Building materials (wood/stone/cloth ≥5)
- AND pressing needs (cold OR tired)

```typescript
// PRIORITY 1: Building actions (when contextually relevant)
if (hasResources && (isCold || isTired)) {
  let buildDesc = 'build - Construct a building to meet your needs';
  if (isCold && isTired) {
    buildDesc = 'build - Build a tent or bed (you need shelter and rest!)';
  } else if (isCold) {
    buildDesc = 'build - Build a campfire for warmth or tent for shelter';
  } else if (isTired) {
    buildDesc = 'build - Build a bed or bedroll for better sleep';
  }
  actions.splice(2, 0, buildDesc); // Insert after idle
  console.log('[StructuredPromptBuilder] 🏗️ BUILD ACTION PROMOTED');
}
```

**Impact:** LLM now sees build as a high-priority option when contextually appropriate.

---

#### 2. Building-Focused Instruction Text (lines 59-139)

**Problem:** Instruction text never mentioned building, even when agent had materials + needs.

**Solution:** Added building-specific instruction variants based on context:

**Scenario A: Cold + Materials**
```typescript
if (hasBuildingMaterials && isCold) {
  instruction = `You're cold and you have building materials! Building a campfire (10 stone + 5 wood) will provide warmth. You can also build a tent for shelter. What should you do?`;
}
```

**Scenario B: Tired + Materials**
```typescript
else if (hasBuildingMaterials && isTired) {
  instruction = `You're tired and have materials. Building a bed (10 wood + 15 fiber) will help you sleep better and recover faster. What should you do?`;
}
```

**Scenario C: Abundant Materials (≥10 wood OR stone)**
```typescript
else if (woodQty >= 10 || stoneQty >= 10) {
  instruction = `You have plenty of building materials (${woodQty} wood, ${stoneQty} stone). The village needs infrastructure - you could build storage, shelter, or tools. Building now will help everyone! What should you do?`;
}
```

**Impact:** LLM is now explicitly prompted to consider building when conditions are right.

---

#### 3. Debug Logging for Building Decisions (multiple locations)

Added console logs to track:
- When build action is promoted: `🏗️ BUILD ACTION PROMOTED`
- When building instruction is triggered: `🏗️ BUILDING INSTRUCTION TRIGGERED`
- All available actions presented to LLM

**Example output:**
```
[StructuredPromptBuilder] 🏗️ BUILD ACTION PROMOTED - agent has resources and needs
[StructuredPromptBuilder] 🏗️ BUILDING INSTRUCTION TRIGGERED - cold + materials
[StructuredPromptBuilder] Available actions: ['wander', 'idle', 'build', 'gather', 'talk']
```

**Impact:** Easier to debug why agents do/don't choose building.

---

#### 4. Enhanced Build Action Descriptions (lines 717-724)

**Before:**
```
build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)
```

**After (when contextual):**
```
build - Build a campfire for warmth or tent for shelter
build - Build a tent or bed (you need shelter and rest!)
build - Build a bed or bedroll for better sleep
```

**Impact:** More specific, actionable descriptions tied to agent's current situation.

---

## Technical Details

### Priority Hierarchy (Instruction Text)

1. **Active Conversation** - Always top priority
2. **Building (with materials + needs)** - NEW: Second priority
3. **Social Interaction** - Third priority
4. **Resource Gathering** - Fourth priority

### Trigger Conditions

Build promotion triggers when **ALL** of:
- Agent has ≥5 of (wood OR stone OR cloth)
- AND agent is (cold OR tired)

Building instruction triggers when:
- **Critical:** Cold + materials → Campfire/Tent suggestion
- **Important:** Tired + materials → Bed/Bedroll suggestion
- **Nice-to-have:** ≥10 wood/stone → General infrastructure suggestion

---

## Testing Results

✅ **Build Status:** PASSING
✅ **Test Status:** 1045/1045 passing (0 failures)
✅ **No regressions** in existing functionality

---

## Expected Behavior Changes

### Before Fix
- Agents with 50+ wood: Gather, deposit, wander, sleep (never build)
- Build action always last in list
- No prompting for building

### After Fix
- Agents with wood/stone + cold → Build action promoted to #3
- Instruction: "You're cold and have materials! Build a campfire..."
- Console logs show when building is encouraged
- LLM should choose building 10-20% of the time when conditions met

---

## Files Modified

```
custom_game_engine/packages/llm/src/StructuredPromptBuilder.ts
  - getAvailableActions(): Added contextual build promotion logic
  - buildPrompt(): Restructured instruction priority (building > social > gather)
  - Added debug logging throughout
```

**No changes to:**
- AISystem (buildBehavior already working)
- BuildingSystem (auto-progress already working)
- Any core game logic

---

## What's Next

### Immediate
- **Playtest Agent:** Re-run 5-minute playtest to verify agents now build
- **Look for:** Console logs showing `🏗️ BUILD ACTION PROMOTED`
- **Expected:** At least 1-2 agents choose to build within 5 minutes

### If Still Not Working
Possible issues to investigate:
1. **LLM model bias** - qwen3:4b may strongly prefer gather/wander
2. **Instruction length** - Prompt may be too long, diluting build message
3. **Response parser** - Verify "build" behavior is correctly parsed
4. **Resource availability** - Ensure agents actually have ≥5 materials in slots

### Future Enhancements (if needed)
1. Add visual indicator when agent is "considering building"
2. Track LLM decision reasoning (if API supports it)
3. Add personality-based building preferences (high conscientiousness → build more)
4. Implement "building goals" in agent memory

---

## Notes

- **No breaking changes** - All existing behaviors preserved
- **Backward compatible** - Old agents still work, just with new prompts
- **Performance:** Minimal impact (few extra conditionals in prompt building)
- **Follows CLAUDE.md:** No silent fallbacks, proper error handling maintained

---

## Definition of Done

- ✅ Build action promoted when contextually relevant
- ✅ Building instruction text added for 3 scenarios
- ✅ Debug logging implemented
- ✅ Build passes with no errors
- ✅ All tests pass (1045/1045)
- ⏳ **AWAITING PLAYTEST:** Verify agents autonomously build

**Status:** Ready for verification by Playtest Agent.

---

**End of Implementation Notes**
