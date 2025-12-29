# Playtest Report: Governance Infrastructure & Dashboard

**Date:** 2025-12-28 (Final Verification Playtest)
**Playtest Agent:** playtest-agent-001
**Verdict:** BLOCKED

---

## Executive Summary

Playtest **BLOCKED** - Unable to complete testing due to critical game-breaking bug. The game crashes during initialization with a steering component error, preventing agents from spawning and making all gameplay features untestable.

**Critical Blocker:** `Error: Invalid steering behavior: idle` prevents game from starting.

**Status:** Cannot verify governance dashboard or building placement due to game crash.

---

## Environment

- **Browser:** Chromium (Playwright MCP)
- **Resolution:** 1280x720  
- **Game URL:** http://localhost:3001
- **Server:** Vite dev server on port 3001
- **Build Status:** TypeScript compilation clean

---

## Test Execution Summary

### What I Could Test

1. ✅ **Game server starts** - Vite dev server runs successfully
2. ✅ **Settings screen loads** - Initial UI appears correctly
3. ✅ **Game initialization begins** - Game attempts to start after pressing "Start Game"
4. ✅ **Building menu responds to 'b' key** - Building placement UI attempts to open

### What I Could NOT Test (Blocked)

1. ❌ **Game cannot fully load** - Crashes at Tick 0 during agent creation
2. ❌ **Governance dashboard** - Cannot press 'g' without running game
3. ❌ **Building placement** - Cannot verify which buildings are available
4. ❌ **Governance buildings** - Cannot check if Town Hall, Census Bureau, etc. exist
5. ❌ **Dashboard functionality** - All data collection features untestable

---

## Critical Issues Found

### Issue 1: Game-Breaking Steering Component Error

**Severity:** CRITICAL - Prevents game from running

**Description:** The game crashes immediately during initialization when attempting to create agents. Error occurs in `SteeringComponent.ts:21`.

**Error Message:**
```
Error: Invalid steering behavior: idle. Valid: seek, arrive, obstacle_avoidance, wander, combined, none
    at new SteeringComponent (http://localhost:3001/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/SteeringComponent.ts:21:13)
    at createSteeringComponent (http://localhost:3001/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/SteeringComponent.ts:39:10)
    at createLLMAgent (http://localhost:3001/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/entities/AgentEntity.ts:190:23)
    at createInitialAgents (http://localhost:3001/src/main.ts:144:21)
    at main (http://localhost:3001/src/main.ts:1843:3)
```

**Steps to Reproduce:**
1. Start dev server (`npx vite` from demo directory)
2. Navigate to `http://localhost:3001`
3. Select "Cooperative Survival" preset
4. Click "Start Game"
5. Observe: Game crashes, stays at Tick 0, black screen

**Expected Behavior:**
- Game should initialize successfully
- Agents should spawn
- Game should progress beyond Tick 0
- Terrain should render

**Actual Behavior:**
- Game gets stuck at "Running - Tick 0"
- Black screen (no terrain rendering)
- Agent creation fails
- Console fills with "Invalid steering behavior: idle" errors

**Screenshot:** `13-game-loading-wait.png` - Shows game stuck at Tick 0

**Root Cause:** The `SteeringComponent` expects one of the valid behaviors (`seek`, `arrive`, `obstacle_avoidance`, `wander`, `combined`, `none`) but is receiving `idle`, which is not in the allowed list. This suggests either:
1. Agent creation code is passing an invalid behavior
2. The valid behaviors list needs to include `idle`
3. There's a mismatch between agent initialization and steering component expectations

**Impact:** 
- **100% blocker** - No gameplay possible
- Cannot test governance dashboard
- Cannot test building placement
- Cannot verify any game features
- Makes entire playtest impossible

---

### Issue 2: Window Manager Capacity Error

**Severity:** HIGH - Prevents UI elements from opening

**Description:** When attempting to open the governance dashboard (pressing 'g'), the system reports that the window manager is at capacity.

**Error Message:**
```
Error: Cannot open window - unpin a window to make space
    at WindowManager.showWindow (http://localhost:3001/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/renderer/src/WindowManager.ts:108:15)
    at WindowManager.toggleWindow (http://localhost:3001/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/renderer/src/WindowManager.ts:154:12)
    at Object.handler (http://localhost:3001/src/main.ts:673:21)
```

**Steps to Reproduce:**
1. (From previous session when game was working)
2. Press 'g' to open governance dashboard
3. Observe: Error "Cannot open window - unpin a window to make space"

**Expected Behavior:**
- Governance dashboard should open
- Or system should auto-close unpinned windows to make space
- Or user should get helpful error message about which window to close

**Actual Behavior:**
- Silent failure in console
- No visual feedback to user
- Dashboard doesn't open
- No indication of how to resolve the issue

**Screenshot:** `03-after-pressing-g.png` - Shows Settings panel still open

**Notes:** 
- Settings panel was pinned and preventing other windows from opening
- Window manager has a maximum pinned window limit
- Clicking the pin icon did not seem to unpin the Settings window
- This suggests UI interaction issues with the window management system

---

### Issue 3: Plant System Errors (Non-blocking)

**Severity:** MEDIUM - Causes console spam but doesn't prevent gameplay

**Description:** Plant stage change events are missing required `agentId` field, causing memory formation system errors.

**Error Messages:**
```
[ERROR] [MemoryFormation] Event plant:stageChanged missing required agentId
[ERROR] This is a programming error - the system emitting 'plant:stageChanged' events must include agentId in the event data
[ERROR] Error in event handler for plant:stageChanged: TypeError: Cannot read properties of undefined (reading 'x')
```

**Frequency:** Hundreds of errors during gameplay session

**Impact:** 
- Console spam
- Memory formation for plant events fails
- Agents cannot remember plant state changes
- May affect agent decision-making about plant resources

---

### Issue 4: LLM Provider Connection Failures (Expected)

**Severity:** LOW - Expected when Ollama not running

**Description:** Game attempts to connect to Ollama at `http://localhost:11434` but connection fails.

**Error:** 
```
[ERROR] [OllamaProvider] Ollama generate error: TypeError: Failed to fetch
```

**Notes:** This is expected behavior when Ollama is not running locally. Agents should fall back to simpler behavior.

---

## Observations from Previous Session (Before Crash)

### Building Menu

From the brief period when the game was running (before the crash), I observed:

1. **Building menu opens** - Pressing 'b' successfully opened a building toolbar at the top of the screen
2. **Multiple building icons visible** - Saw approximately 6-8 colored square icons representing different buildings
3. **Building selection works** - Clicking on icons highlighted them
4. **Tooltips appear** - Hovering showed partial building names (saw "Lone S...", "Gathering Wood")
5. **Cannot determine building list** - Game crashed before I could systematically check all buildings

**Screenshots:**
- `07-building-menu.png` - Building menu open with icons visible
- `08-after-clicking-first-building.png` - First building selected
- `09-second-building-selected.png` - Second building selected  
- `10-building-toolbar-overview.png` - Overview of building toolbar

### Unable to Verify

❌ **Cannot confirm if governance buildings are in the menu** - Game crashed before systematic inspection
❌ **Cannot verify Town Hall presence** - Testing blocked
❌ **Cannot verify Census Bureau, Granary, etc.** - Testing blocked
❌ **Cannot access governance dashboard** - Window manager error + game crash

---

## Console Errors Summary

### Critical (Game-breaking)
- `Invalid steering behavior: idle` - **BLOCKS ALL TESTING**

### High Priority
- `Cannot open window - unpin a window to make space` - Prevents UI access
- Window manager capacity issues

### Medium Priority  
- Plant system agentId missing (hundreds of occurrences)
- Plant position undefined errors

### Low Priority (Expected)
- Ollama connection failures (expected when not running)
- Favicon 404 (cosmetic)

---

## Comparison to Previous Playtest Report

The previous playtest report (from earlier today) documented:

1. ✅ Governance dashboard panel exists and opens with 'g' key
2. ✅ Dashboard shows locked state when no Town Hall
3. ❌ Governance buildings NOT in building menu (critical blocker)
4. ❌ Feature untestable due to missing buildings

### Current Status

**WORSE** - Previous playtest had a working game with the blocker being missing buildings in the menu. Current playtest cannot even load the game due to steering component crash.

**Regression:** The steering component error appears to be a new issue not present in the previous playtest.

---

## Test Results Summary

| Category | Attempted | Passed | Failed | Blocked |
|----------|-----------|--------|--------|---------|
| Game Initialization | 1 | 0 | 1 | 0 |
| Building Menu Access | 1 | 0 | 0 | 1 |
| Governance Dashboard | 1 | 0 | 0 | 1 |
| Building Placement | 0 | 0 | 0 | 0 (blocked) |
| Data Collection | 0 | 0 | 0 | 0 (blocked) |
| **Total** | **3** | **0** | **1** | **2** |

**Pass Rate:** 0% (0/3 attempted)
**Blocked Rate:** 67% (2/3 blocked by critical error)

---

## Verdict

**BLOCKED** - Cannot complete playtest due to critical game crash

**Must Fix Before Re-testing:**

1. **CRITICAL:** Fix `Invalid steering behavior: idle` error in SteeringComponent
   - Either add 'idle' to valid behaviors list
   - Or fix agent creation to use valid behavior
   - This is a complete blocker

2. **HIGH:** Fix window manager capacity issues
   - Increase max pinned windows limit
   - Implement auto-unpinning of least recently used windows
   - Add user-visible error messaging

3. **MEDIUM:** Fix plant system agentId issues
   - Include agentId in plant:stageChanged events
   - Validate event data before processing

---

## Recommended Next Steps

### For Implementation Agent

1. **Immediate:** Fix the steering component crash
   - Check `AgentEntity.ts:190` where SteeringComponent is created
   - Verify what behavior is being passed
   - Either add 'idle' to valid behaviors or pass a different default

2. **After crash fixed:** Re-run previous playtest to verify governance buildings
   - Check if Town Hall, Census Bureau, etc. appear in building menu
   - This was the blocker from the previous playtest

3. **UI fixes:** Address window manager issues
   - Review WindowManager.ts:108 capacity logic
   - Implement better window management

### For Playtest Agent (Me)

1. **Wait for crash fix** - Cannot proceed until game loads
2. **Re-test building menu** - Systematic check of all buildings once game works
3. **Test governance dashboard** - Verify 'g' key functionality
4. **Test data collection** - Build governance buildings and verify dashboard populates

---

## Screenshots Index

All screenshots saved to: `/Users/annhoward/src/ai_village/.playwright-mcp/`

**Initial Session (Working):**
1. `01-initial-settings-screen.png` - Game settings panel
2. `02-game-running.png` - Game successfully running (Tick 803)
3. `07-building-menu.png` - Building menu open
4. `08-after-clicking-first-building.png` - First building selected
5. `09-second-building-selected.png` - Second building selected
6. `10-building-toolbar-overview.png` - Building toolbar overview
7. `11-after-arrow-right.png` - After pressing arrow key

**After Crash:**
8. `12-after-game-restart.png` - Game stuck at Tick 0
9. `13-game-loading-wait.png` - Black screen, no terrain

**Window Manager Issues:**
10. `03-after-pressing-g.png` - Failed to open governance dashboard
11. `04-after-clicking-close.png` - Attempted to close Settings panel
12. `05-after-second-close-attempt.png` - Second close attempt
13. `06-after-unpin-attempt.png` - Attempted to unpin window

---

## Conclusion

This playtest was **completely blocked** by a critical steering component error that prevents the game from initializing. While I was able to briefly observe the building menu in an earlier session (before the crash occurred), I cannot provide definitive answers about governance building availability.

**The governance infrastructure feature cannot be tested until the game crash is resolved.**

### Priority Fixes

1. **P0 (Critical):** Fix steering component 'idle' behavior error
2. **P1 (High):** Resolve window manager capacity issues  
3. **P2 (Medium):** Address plant system agentId errors

**Estimated Time to Fix:** 
- Steering component: 30 minutes (likely a simple enum or default value fix)
- Window manager: 1-2 hours (requires UI/UX decisions)

---

**End of Report**
