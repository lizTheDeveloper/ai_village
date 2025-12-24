# Implementation Progress: Agent Building Orchestration - LLM Motivation Fixes

**Date:** 2025-12-23 23:06
**Implementation Agent:** claude-code
**Status:** IMPLEMENTATION COMPLETE - Ready for Re-Test

---

## Summary

Fixed the critical issue where agents weren't choosing to build autonomously via LLM decision-making. Enhanced LLM prompts to make building more compelling and added extensive debug logging.

---

## Changes Made

### 1. Enhanced Building Instructions (StructuredPromptBuilder.ts:59-96)

**Problem:** Building instructions were too passive and only triggered when agents had materials AND urgent needs (cold/tired).

**Solution:** Made building instructions much more compelling with tiered urgency:

- **CRITICAL**: Cold/tired + materials → "YOU ARE COLD... You MUST build shelter NOW!"
- **STRONG**: Abundant materials (15+ wood/stone) → "Village desperately needs infrastructure... BUILD NOW!"
- **MODERATE**: Sufficient materials (10+ wood/stone) → "You have enough materials... Consider building!"
- **Improved thresholds**: Now triggers at 10 wood (previously 10) AND 15 wood (new tier)

**Key Change:**
```typescript
// BEFORE (weak suggestion)
instruction = `You have plenty of building materials (${woodQty} wood, ${stoneQty} stone). 
  The village needs infrastructure - you could build storage, shelter, or tools. 
  Building now will help everyone! What should you do?`;

// AFTER (strong directive)
instruction = `You have abundant building materials (${woodQty} wood, ${stoneQty} stone)! 
  The village desperately needs infrastructure. You should BUILD something now - 
  storage for supplies, shelter for sleeping, or tools for crafting. 
  This is your chance to help the community thrive! What will you build?`;
```

### 2. Promoted Build Action in Available Actions (StructuredPromptBuilder.ts:739-767)

**Problem:** Build action appeared at the END of the actions list (position ~8-10), making it less likely for LLM to choose.

**Solution:** Promoted build action to position 2 (right after "wander") when agent has materials:

```typescript
// Build action now inserted as SECOND action
actions.splice(1, 0, buildDesc); // Insert after wander

// With urgency-based descriptions:
'🏗️ BUILD - URGENT! Build shelter or bed to survive (you're cold AND tired)'
'🏗️ BUILD - Build campfire or tent NOW (you're freezing!)'
'🏗️ BUILD - You have lots of materials! Build storage, shelter, or tools for the village'
```

**Impact:** Build now appears early in every agent's action list when they have 5+ wood/stone.

### 3. Added Comprehensive Debug Logging

**Added logging for:**

#### LLM Prompt Builder (StructuredPromptBuilder.ts)
- When building instructions trigger: `[StructuredPromptBuilder] 🏗️ CRITICAL/STRONG/BUILDING SUGGESTION`
- Resource quantities: `wood=${woodQty}, stone=${stoneQty}`
- Build action promotion: `BUILD ACTION PROMOTED to position 2`
- Final action list: `Final available actions: [wander, BUILD, idle, ...]`

#### AISystem (AISystem.ts:207-214, 246-253)
- When LLM chooses build:
  ```
  [AISystem] 🏗️ LLM CHOSE BUILD! Agent 5e7f7111 decision: {
    thinking: "I have materials and should help the village...",
    speaking: "I'll build a storage chest",
    action: "build"
  }
  ```

#### BuildingSystem (BuildingSystem.ts:288-289)
- Explicit completion event logging:
  ```
  [BuildingSystem] 🏗️ Construction complete! tent at (10, 20)
  [BuildingSystem] 🎉 building:complete event emitted for entity 55928dbd
  ```

---

## Files Modified

```
custom_game_engine/packages/llm/src/StructuredPromptBuilder.ts
  - Lines 59-96: Enhanced building instruction urgency and tiers
  - Lines 739-767: Promoted build action to position 2
  - Lines 827-828: Updated final actions logging

custom_game_engine/packages/core/src/systems/AISystem.ts
  - Lines 207-214: Log when LLM chooses build (structured)
  - Lines 246-253: Log when LLM chooses build (legacy)

custom_game_engine/packages/core/src/systems/BuildingSystem.ts
  - Lines 288-289: Explicit building:complete event logging
```

---

## Test Results

### Build Status
✅ **BUILD PASSED** - No TypeScript errors

### Test Suite
✅ **ALL TESTS PASSED**
- Test Files: 54 passed | 2 skipped (56 total)
- Tests: 1045 passed | 47 skipped (1092 total)
- Duration: 2.61s

### Agent Building Orchestration Tests
✅ **ALL 13 TESTS PASSED**
- Criterion 1: Construction Progress Automation (3/3 ✅)
- Criterion 2: Resource Deduction (3/3 ✅)
- Criterion 3: Building Completion (5/5 ✅)
- Event Emission (2/2 ✅)

---

## Expected Behavior Changes

### Before Fixes
- Agents rarely/never chose to build
- Build action appeared at end of actions list
- No visibility into why agents didn't build

### After Fixes
- Agents with 10+ wood/stone should receive STRONG building prompts
- Agents with 15+ materials get "desperate village needs" messaging
- Build appears as 2nd action (after wander) when materials available
- Console logs will show:
  - When build instructions trigger
  - When build action is promoted
  - When LLM chooses to build
  - Full decision reasoning (thinking, speaking, action)

### Example Console Output (Expected)
```
[StructuredPromptBuilder] 🏗️ STRONG BUILDING INSTRUCTION - abundant materials (wood=25, stone=15)
[StructuredPromptBuilder] 🏗️ BUILD ACTION PROMOTED to position 2 - hasResources=true, isCold=false, isTired=false
[StructuredPromptBuilder] Final available actions: [wander, 🏗️ BUILD, idle, seek_food, gather, deposit_items]
[AISystem] 🏗️ LLM CHOSE BUILD! Agent 5cab76fe decision: {
  thinking: "The village needs storage and I have plenty of wood...",
  speaking: "I'll build a storage chest for everyone",
  action: "build"
}
[BUILD] Agent 5cab76fe attempting to build storage-chest
[BUILD] ✓ Agent 5cab76fe started building storage-chest at (10, 15)
[BuildingSystem] Construction progress: storage-chest at (10, 15) - 0.0% → 5.0%
[BuildingSystem] 🏗️ Construction complete! storage-chest at (10, 15)
[BuildingSystem] 🎉 building:complete event emitted for entity 5cab76fe
```

---

## Playtest Verification Needed

### What to Test
1. Start game with 10 agents
2. Give agents resources (50+ wood via gathering or console)
3. Observe for 5 minutes in-game time
4. Check console logs for:
   - `🏗️ BUILDING INSTRUCTION TRIGGERED` messages
   - `BUILD ACTION PROMOTED` messages
   - `LLM CHOSE BUILD` messages (this is the key!)
   - Construction progress and completion

### Success Criteria
- At least 1 agent chooses to build autonomously
- Console shows LLM build decisions
- Buildings complete successfully
- No errors during build flow

### If Still Failing
If agents STILL don't build after these fixes, the issue may be:
1. LLM model bias (qwen3:4b may prefer gathering/wandering)
2. Need to adjust LLM temperature/sampling
3. Need to further reduce competing actions (gather/deposit)
4. May need to trigger building at specific moments (e.g., after depositing resources)

---

## Definition of Done

- ✅ Build passes
- ✅ All tests pass (including agent-building-orchestration)
- ✅ Enhanced LLM prompts with urgency tiers
- ✅ Build action promoted to position 2
- ✅ Comprehensive debug logging added
- ⏳ **PENDING PLAYTEST**: Verify agents choose to build in actual gameplay

---

**Next Step:** Playtest Agent should re-run verification to confirm agents now choose to build autonomously.

