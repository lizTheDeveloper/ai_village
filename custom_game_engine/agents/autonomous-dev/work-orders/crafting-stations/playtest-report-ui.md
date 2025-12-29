# Playtest Report: Crafting Stations (UI Testing)

**Date:** 2025-12-26
**Playtest Agent:** playtest-agent-001
**Testing Method:** UI Interaction (No Code Inspection)
**Verdict:** NEEDS_WORK

---

## Environment

- Browser: Chromium (Playwright)
- Resolution: 1280x720
- Game Version: Phase 10 (Sleep & Circadian Rhythm)
- Test Date: 2025-12-26 08:09 (in-game time)
- Testing Method: **Pure UI testing** - No code inspection, no API calls

---

## Executive Summary

The Crafting Stations feature has **critical UI/UX issues** that prevent playtesting:
- **Cannot select or place** any buildings from the menu
- **Missing buildings from UI:** Farm Shed, Market Stall, and Barn are not visible
- **No crafting station UI** is accessible (no panels, fuel gauges, or recipe lists)
- **Building menu is non-interactive** - displays buildings but does not respond to user input

**Note:** This report differs from a previous API-based test. That test examined the data structures directly. This test examines what a real player would experience in the UI.

---

## Acceptance Criteria Results

### Criterion 1: Core Tier 2 Crafting Stations

**Test Steps:**
1. Started the game and waited for initialization
2. Pressed 'B' key to open building menu
3. Visually examined all buildings displayed in the menu
4. Looked for all 4 required Tier 2 stations

**Expected:** All 4 Tier 2 stations should be visible and selectable:
- Forge (2x3, 40 Stone + 20 Iron)
- Farm Shed (3x2, 30 Wood)
- Market Stall (2x2, 25 Wood)
- Windmill (2x2, 40 Wood + 10 Stone)

**Actual:**
- ✓ **Forge** - Visible in menu (has 'F' icon)
- ✗ **Farm Shed** - **NOT VISIBLE** in the building menu
- ✗ **Market Stall** - **NOT VISIBLE** in the building menu
- ✓ **Windmill** - Visible in menu (has 'W' icon)

**Result:** FAIL (only 2 out of 4 stations are visible)

**Screenshot:**
![Building Menu](/Users/annhoward/src/ai_village/.playwright-mcp/agents/autonomous-dev/work-orders/crafting-stations/screenshots/building-menu-open.png)

**Notes:**
- The building menu shows: Workbench (W), Campfire (C), Forge (F), Windmill (W), Workshop (W)
- Resource requirements, Pro Sto, Con, Frm, Rch, Dec indicators are shown but hard to read
- Cannot verify building dimensions or costs through UI alone

---

### Criterion 2: Crafting Functionality

**Test Steps:**
1. Attempted to select Forge by pressing 'F' key
2. Tried clicking on the Forge building in the menu
3. Looked for placement cursor or visual feedback
4. Checked for any crafting-related UI panels

**Expected:**
- Should be able to select a crafting station from the menu
- Should enter placement mode with a ghost building cursor
- After placing, should see crafting UI with recipes and bonuses

**Actual:**
- Pressing 'F' does nothing (console shows `[BuildingPlacementUI] handleKeyDown returned: false`)
- Clicking on menu items does nothing (canvas-based menu, no click handlers)
- **No selection mechanism works**
- Cannot proceed to test crafting functionality

**Result:** FAIL - Cannot test, feature is not accessible

**Notes:**
The building menu displays buildings but does not respond to any user input. This blocks all downstream testing of crafting functionality, recipes, and bonuses.

---

### Criterion 3: Fuel System (for applicable stations)

**Test Steps:**
1. Attempted to place a Forge (blocked by Criterion 2 failure)
2. Searched entire game UI for fuel-related elements
3. Checked for fuel gauges, fuel icons, or fuel item indicators

**Expected:**
- Forge should display a fuel gauge when placed/selected
- Should show current fuel level (0-max)
- Should allow adding fuel (wood, coal)
- Should prevent crafting when fuel is empty

**Actual:**
- **Cannot place Forge** to access its UI
- **No fuel gauges visible** anywhere in the game
- **No fuel-related UI elements** exist
- Cannot test fuel system at all

**Result:** FAIL - Cannot test, prerequisite features not working

---

### Criterion 4: Station Categories

**Test Steps:**
1. Examined visible buildings for category indicators
2. Looked for category labels or grouping in the menu

**Expected:**
- Forge → production
- Farm Shed → farming
- Market Stall → commercial
- Windmill → production

**Actual:**
- Buildings show abbreviated indicators (Pro, Sto, Res, etc.) but unclear what they mean
- Farm Shed and Market Stall are not visible, so cannot verify their categories
- No clear category grouping or labels in UI

**Result:** FAIL - Cannot verify categories through UI

---

### Criterion 5: Tier 3+ Stations (Advanced)

**Test Steps:**
1. Examined building menu for Workshop and Barn
2. Counted all visible buildings in the menu

**Expected:**
- Workshop (3x4, 60 Wood + 30 Iron)
- Barn (4x3, 70 Wood)

**Actual:**
- ✓ **Workshop** - Visible in menu (has 'W' icon)
- ✗ **Barn** - **NOT VISIBLE** in the menu

**Result:** FAIL (1 out of 2 visible, but neither selectable)

---

### Criterion 6: Integration with Recipe System

**Test Steps:**
1. Attempted to access crafting UI
2. Looked for recipe lists or crafting menus

**Expected:**
- Clicking on a crafting station should show station-specific recipes
- Recipes should be filtered by station type

**Actual:**
- **No crafting UI accessible**
- Cannot place buildings to test recipe integration
- No recipe menus visible anywhere

**Result:** FAIL - Cannot test, feature not accessible

---

## UI Validation

### Visual Elements Status

| Element | Expected | Found | Status |
|---------|----------|-------|--------|
| Building Menu ('B' key) | Opens on left side | ✓ Yes | PASS |
| Forge in Menu | Visible | ✓ Yes | PASS |
| Windmill in Menu | Visible | ✓ Yes | PASS |
| Workshop in Menu | Visible | ✓ Yes | PASS |
| **Farm Shed in Menu** | **Visible** | **✗ No** | **FAIL** |
| **Market Stall in Menu** | **Visible** | **✗ No** | **FAIL** |
| **Barn in Menu** | **Visible** | **✗ No** | **FAIL** |
| Building Selection | Click or keyboard | **✗ No** | **FAIL** |
| Placement Cursor | Ghost building | **✗ No** | **FAIL** |
| Crafting Station Panel | Station UI | **✗ No** | **FAIL** |
| Fuel Gauge | For Forge | **✗ No** | **FAIL** |
| Recipe List | Filtered by station | **✗ No** | **FAIL** |

### Layout Issues

- [x] Building menu renders at expected location (left side)
- [x] Menu items have icons and abbreviated labels
- [ ] **Cannot interact with menu items** (critical blocker)
- [ ] **3 out of 6 buildings missing from menu**
- [ ] **No crafting UI panels implemented**
- [ ] **No interaction feedback** (hover states, selection highlights)

**Screenshots:**
- ![Initial State](/Users/annhoward/src/ai_village/.playwright-mcp/agents/autonomous-dev/work-orders/crafting-stations/screenshots/initial-game-state.png)
- ![Building Menu](/Users/annhoward/src/ai_village/.playwright-mcp/agents/autonomous-dev/work-orders/crafting-stations/screenshots/building-menu-open.png)

---

## Issues Found

### Issue 1: Building Menu Not Interactive (CRITICAL)

**Severity:** Critical - Blocks all testing
**Description:** The building menu displays buildings but does not respond to any user input. Neither keyboard shortcuts nor mouse clicks select buildings.

**Steps to Reproduce:**
1. Press 'B' to open building menu
2. Try pressing 'F' (as shown on Forge icon)
3. Nothing happens
4. Try clicking on Forge in the menu
5. Nothing happens

**Expected Behavior:**
- Pressing 'F' or clicking on Forge should select it for placement
- Cursor should change to placement mode
- Ghost building should follow mouse cursor
- Clicking on map should place building (if resources available)

**Actual Behavior:**
- No response to keyboard input (console: `handleKeyDown returned: false`)
- No response to mouse clicks on menu items
- Building menu just displays static list

**Impact:** Cannot test ANY crafting station features. This is a complete blocker.

**Console Evidence:**
```
[Main] onKeyDown callback: key="f", shiftKey=false, ctrlKey=false
[BuildingPlacementUI] handleKeyDown called: key="f", shiftKey=false
[Main] placementUI.handleKeyDown returned: false
```

---

### Issue 2: Missing Buildings from UI

**Severity:** High
**Description:** Farm Shed, Market Stall, and Barn are not visible in the building menu, even though they may exist in the data.

**Buildings Visible:**
1. Res (appears to be Residential)
2. Pro (Production) - possibly Workbench
3. Sto (Storage)
4. Con (?)
5. Frm (Farming?)
6. Rch (Research?)
7. Dec (Decoration?)

**Menu Shows:**
- Workbench (W)
- Campfire (C)
- Forge (F)
- Windmill (W)
- Workshop (W)

**Missing from Menu:**
- Farm Shed (required Tier 2)
- Market Stall (required Tier 2)
- Barn (required Tier 3)

**Expected Behavior:** All 6 test-required buildings should appear in the menu.

**Actual Behavior:** Only 3 buildings appear (Forge, Windmill, Workshop).

---

### Issue 3: No Crafting Station UI

**Severity:** High
**Description:** No UI panels exist for interacting with crafting stations.

**Expected UI Elements (from Work Order):**
- **CraftingStationPanel** showing:
  - Station name and icon
  - Fuel gauge (if applicable)
  - Bonus list ("+50% metalworking speed")
  - Recipe grid filtered to station's recipes
  - Crafting queue
  - Material requirements

**Actual:** No such panels exist or are accessible.

**Impact:** Even if buildings could be placed, there's no way to interact with them as crafting stations.

---

### Issue 4: No Fuel System Visible

**Severity:** High (for stations that require fuel)
**Description:** No fuel-related UI elements are visible anywhere in the game.

**Expected:**
- Fuel gauge on Forge UI
- Fuel items (wood, coal) visible in inventory
- Fuel consumption feedback
- "Out of fuel" warnings

**Actual:** No fuel system is visible or accessible through the UI.

---

### Issue 5: Poor Menu Readability

**Severity:** Low (UX issue)
**Description:** The building menu uses abbreviated labels (Pro, Sto, Con, etc.) that are not immediately clear to players.

**Recommendation:** Add tooltips or full building names on hover.

---

## Console Observations

During the playtest, the following logs were observed:

**Normal Operation:**
- `[BuildingPlacementUI] Rendering menu:` (repeating) - Menu is rendering
- `[BuildingSystem] Processing 4 building entities` - Buildings in world are processing

**Errors/Warnings (Unrelated):**
- `[WARNING] [BehaviorRegistry] Unknown behavior: eat` - Agent AI issue
- `[ERROR] [MemoryFormation] Event plant:stageChanged missing required agentId` - Plant system issue

**No errors specific to crafting stations** were observed, suggesting the features simply aren't implemented rather than broken.

---

## Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| Core Tier 2 Stations | FAIL | 2/4 visible |
| Crafting Functionality | FAIL | Not accessible |
| Fuel System | FAIL | Not visible/testable |
| Station Categories | FAIL | Cannot verify |
| Tier 3+ Stations | FAIL | 1/2 visible |
| Recipe Integration | FAIL | Not accessible |
| **Overall** | **0/6 PASS** | **Feature not testable** |

---

## Verdict

**NEEDS_WORK** - Critical blockers prevent any meaningful testing:

### MUST FIX (Blocking Issues):

1. **Make Building Menu Interactive** (Priority 1 - Critical)
   - Implement click handlers for building menu items
   - OR implement keyboard shortcuts (F for Forge, etc.)
   - Add visual feedback for selection (highlight, cursor change)
   - Enter placement mode when building is selected

2. **Add Missing Buildings to Menu** (Priority 1 - Critical)
   - Add Farm Shed to menu
   - Add Market Stall to menu
   - Add Barn to menu
   - Verify all 6 test buildings are visible

3. **Implement Crafting Station UI** (Priority 2 - High)
   - Create CraftingStationPanel component
   - Show panel when player clicks on placed crafting station
   - Display station name, icon, recipes, bonuses
   - Add crafting interaction buttons

4. **Implement Fuel System UI** (Priority 2 - High)
   - Add fuel gauge to Forge UI
   - Show current/max fuel levels
   - Add "Add Fuel" button
   - Show fuel consumption during crafting
   - Display "Out of Fuel" state

---

## Comparison with Previous API Test

A previous playtest report (in same directory) used JavaScript API to test data structures and found:
- ✓ All 4 Tier 2 stations exist in data (Forge, Farm Shed, Market Stall, Windmill)
- ✓ All have correct properties (size, cost, category)
- ✓ Crafting stations have recipe lists and speed bonuses
- ✗ Fuel system not implemented in data

**This UI test reveals:**
- ✗ Only 2/4 Tier 2 stations visible in UI (Forge, Windmill)
- ✗ Building selection completely non-functional
- ✗ No crafting UI implemented
- ✗ No fuel UI implemented

**Conclusion:** The data structures may be correct, but the **UI layer is not connected or implemented**. This is a critical integration gap between the data and the user interface.

---

## Testing Recommendations for Next Iteration

Once the blocking issues are fixed, test:

1. **Building Selection & Placement:**
   - Select each of 6 buildings via menu
   - Place each building on valid terrain
   - Verify footprint sizes (2x3 for Forge, 3x2 for Farm Shed, etc.)
   - Test collision detection
   - Verify construction progress

2. **Crafting Station Interaction:**
   - Click on completed Forge
   - Verify crafting panel opens
   - Check recipe list shows only metal recipes
   - Verify "+50% speed" bonus is displayed

3. **Fuel System:**
   - Check Forge fuel gauge shows 0 initially
   - Add wood, verify gauge increases
   - Add coal, verify gauge increases more
   - Start crafting, verify fuel depletes
   - Let fuel hit 0, verify crafting stops
   - Verify "low fuel" warning appears

4. **Multi-Station Testing:**
   - Place both Forge and Windmill
   - Compare recipe lists (should be different)
   - Verify each station only shows appropriate recipes

---

## Playtester Notes

This playtest was conducted as a **pure UI test** - no code inspection, no JavaScript API calls, just interacting with the game as a normal player would. The experience was frustrating because the building menu looks functional but is completely non-interactive.

The game runs smoothly with no crashes, but the crafting station features are not accessible to players in the current build. This appears to be a UI implementation gap rather than a data/logic problem.

**Recommendation:** Prioritize fixing building selection (Issue #1) before working on other features, as it blocks all downstream testing.
