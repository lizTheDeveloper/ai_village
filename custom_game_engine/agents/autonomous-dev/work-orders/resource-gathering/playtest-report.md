# Playtest Report: Resource Gathering

**Date:** 2025-12-22
**Playtest Agent:** playtest-agent-001
**Verdict:** NEEDS_WORK

---

## Environment

- Browser: Chromium (Playwright)
- Resolution: 1280x720
- Game Version: Phase 8 - Weather & Temperature
- Test Duration: ~15 minutes
- Server: http://localhost:3002

---

## Acceptance Criteria Results

### Criterion 1: InventoryComponent Creation

**Test Steps:**
1. Loaded the game and waited for initialization
2. Clicked on multiple agent entities at various screen positions (400,400), (600,400), (800,400), (640,500)
3. Observed the UI for any inventory panel or inventory-related information
4. Inspected page HTML for "inventory" text

**Expected:** Agents should have an InventoryComponent with slots, maxSlots, maxWeight visible in UI when clicking on an agent

**Actual:** No inventory UI appears when clicking on agents. The page HTML contains no "inventory" text. No panel shows agent inventory information.

**Result:** FAIL

**Screenshots:**
- ![Initial game state](screenshots/initial-game-state.png)
- ![After clicking agent position 1](screenshots/agent-click-0.png)
- ![After clicking agent position 2](screenshots/agent-click-1.png)
- ![After clicking agent position 3](screenshots/agent-click-2.png)

**Notes:** The game shows agent positions as small colored dots (blue/white and red/pink). Clicking on various positions did not trigger any inventory panel. The only UI visible is the Controls panel in bottom-left corner, and tile resource amounts overlay (e.g., "100/100" on tiles).

---

### Criterion 2: Wood Gathering (Chop Action)

**Test Steps:**
1. Observed console logs for 10+ seconds during gameplay
2. Monitored for "chop", "gather wood", "resource:gathered" events
3. Watched for agents autonomously moving toward trees

**Expected:** Agents execute chop action, move toward trees, harvest wood, add to inventory, emit resource:gathered event

**Actual:** Console logs show that the "gather" action is available and agents are being prompted with "chop" or "gather wood" as available actions. Examples from logs:
- `[StructuredPromptBuilder] Available actions: [..., gather - Collect resources for building (say "chop" or "gather wood" or "mine" or "gather stone"), ...]`
- `[StructuredPromptBuilder] Available actions: [..., gather - Collect resources for building (say "chop" or "gather wood"), ...]`

However, no actual harvesting behavior was observed. No console logs showing:
- Agents actually chopping trees
- Wood being collected
- `resource:gathered` events
- Tree resource amounts decreasing

**Result:** FAIL

**Screenshots:**
- ![Trees visible with resource amounts](screenshots/agents-visible.png)
- ![After observation period](screenshots/after-pan.png)

**Notes:** The action is defined in the prompt system and agents are being told they can "gather" resources, but the actual behavior does not execute. Agents appear to only execute "wander" behavior autonomously.

---

### Criterion 3: Stone Gathering (Mine Action)

**Test Steps:**
1. Observed console logs for mining/stone gathering behavior
2. Monitored for "mine", "gather stone" actions
3. Watched for agents approaching rocks

**Expected:** Agents execute mine action, move toward rocks, harvest stone, add to inventory, emit resource:gathered event

**Actual:** Similar to wood gathering - console logs show "mine" and "gather stone" are available actions in prompts:
- `[StructuredPromptBuilder] Available actions: [..., gather - Collect resources for building (say "mine" or "gather stone"), ...]`
- `[StructuredPromptBuilder] Available actions: [..., gather - Collect resources for building (say "chop" or "gather wood" or "mine" or "gather stone"), ...]`

But no actual mining behavior observed. No evidence of:
- Agents mining rocks
- Stone being collected
- Rock resource amounts changing
- Mining-related events

**Result:** FAIL

**Screenshots:**
- ![Rocks visible as brown/gray tiles](screenshots/initial-game-state.png)

**Notes:** Same issue as Criterion 2 - the action is prompted but not executed by agents.

---

### Criterion 4: Resource Transfer for Construction

**Test Steps:**
1. Pressed 'B' key to open building menu
2. Examined menu for resource cost information
3. Looked for wood/stone requirements displayed

**Expected:** Building menu shows resource requirements (wood, stone, leaves). System checks agent inventory before allowing construction.

**Actual:** Unable to fully test due to test script timing out before capturing building menu screenshot. The Controls panel shows "B - Build menu" is available, indicating the building system exists.

From previous Phase 7 playtests, the building menu shows building types (Campfire, Lean To, Storage Box) but resource cost information visibility could not be confirmed in this test.

**Result:** NOT_FULLY_TESTED

**Notes:** Without inventory UI, it's impossible to verify if resource checks happen before construction. Even if resource requirements are shown, there's no way to see if agents have the required resources in their inventory.

---

### Criterion 5: Resource Regeneration

**Test Steps:**
1. Observed resource amounts on tiles over time
2. Looked for changes in "100/100" indicators

**Expected:** Resources regenerate over time based on regenerationRate. Resources below max should increase toward maxAmount.

**Actual:** All tiles show "100/100" indicating resources are at maximum. Since no harvesting is occurring (Criteria 2 & 3 failed), regeneration cannot be tested. Would need to:
1. Successfully harvest a resource to deplete it below max
2. Observe the resource amount over time
3. Verify it regenerates

**Result:** NOT_TESTABLE

**Notes:** This criterion depends on Criteria 2 and 3 working first. Cannot test regeneration without depletion.

---

### Criterion 6: Inventory Weight Limit

**Test Steps:**
1. Looked for inventory weight information in UI
2. Attempted to find maxWeight, currentWeight indicators

**Expected:** Agents have weight limit. Attempting to gather beyond maxWeight should be rejected or partial.

**Actual:** No inventory UI means no weight information visible. Cannot test weight limits without:
1. Visible inventory UI showing currentWeight/maxWeight
2. Actual gathering behavior working
3. Ability to fill inventory to test limit

**Result:** NOT_TESTABLE

**Notes:** Blocked by Criterion 1 failure (no inventory UI) and Criteria 2 & 3 failures (no gathering).

---

### Criterion 7: Gather Behavior for AISystem

**Test Steps:**
1. Monitored agent behaviors in console logs
2. Looked for agents autonomously choosing "gather" behavior
3. Observed agent movement patterns

**Expected:** Agents autonomously choose gather behavior, look for nearest harvestable resource, move toward it, harvest when adjacent

**Actual:** Console logs show agents are being prompted with gather action available:
- Multiple instances of `gather - Collect resources for building (say "chop" or "gather wood" or "mine" or "gather stone")`
- The action is context-aware (showing only "chop" near trees, only "mine" near rocks, or both when both visible)

However, agents never autonomously choose the gather behavior. All observed agent behavior logs show:
- `parsedAction: {behavior: wander}`
- No agents executing gather, chop, or mine
- Agents wandering randomly rather than pursuing resources

**Result:** FAIL

**Screenshots:**
- ![Agents wandering](screenshots/final-state.png)

**Notes:** The gather behavior is properly advertised to agents in their decision prompts, but the AI is not choosing to execute it. This could be an LLM decision issue or the behavior handler may not be implemented.

---

## UI Validation

### Visual Elements Present

| Element | Expected | Found | Status |
|---------|----------|-------|--------|
| Agent Inventory Panel | Visible when clicking agent | Not found | FAIL |
| Resource counts on tiles | Visible on harvestable resources | Present (100/100) | PASS |
| Tree entities | Green tiles representing trees | Present | PASS |
| Rock entities | Brown/gray representing rocks | Present | PASS |
| Agent entities | Small colored sprites | Present | PASS |
| Controls panel | Bottom-left with keybindings | Present | PASS |
| Building menu trigger | 'B' key | Listed in controls | PASS |
| Inventory weight display | Shows current/max weight | Not found | FAIL |
| Resource gathering feedback | Visual or text feedback | None observed | FAIL |

### Layout Issues

- [x] Game canvas renders properly
- [x] Terrain visible with correct colors
- [x] Agents visible as small sprites
- [x] Controls panel readable
- [ ] No inventory panel exists for agents
- [ ] No resource gathering feedback visible
- [x] No overlapping UI (because minimal UI exists)

**Screenshot of full UI:**
![Full UI](screenshots/initial-game-state.png)

---

## Issues Found

### Issue 1: No Inventory UI

**Severity:** High
**Description:** There is no visible inventory panel or UI element showing agent inventory contents, slots, or weight information.

**Steps to Reproduce:**
1. Start the game
2. Click on any agent entity (small colored sprite)
3. Observe - no panel appears

**Expected Behavior:** Clicking an agent should display an inventory panel showing:
- Inventory slots
- Resources carried (wood, stone, etc.)
- Current weight / Max weight
- Slot contents and quantities

**Actual Behavior:** Clicking agents does nothing. No UI response. No inventory information displayed anywhere.

**Screenshot:**
![No inventory after clicking](screenshots/agent-click-0.png)

---

### Issue 2: Gather Behavior Not Executing

**Severity:** High
**Description:** Agents are prompted with gather/chop/mine actions but never autonomously execute them. The gather behavior handler may not be implemented or the AI is not choosing it.

**Steps to Reproduce:**
1. Start game
2. Observe agents with trees or rocks in their vision range
3. Monitor console logs for behavior choices
4. Agents only execute "wander" behavior

**Expected Behavior:** When agents see harvestable resources (trees, rocks) and need materials, they should autonomously choose gather behavior, approach the resource, and harvest it.

**Actual Behavior:** Agents continuously wander. Console shows gather action is available in prompts like:
```
[StructuredPromptBuilder] Available actions: [..., gather - Collect resources for building (say "chop" or "gather wood"), ...]
```
But agents never choose it. All parsed behaviors are "wander".

**Console Evidence:**
```
[AISystem] Agent <id> changing behavior to: wander
[AISystem] Parsed legacy LLM decision: {..., behavior: wander, ...}
```

---

### Issue 3: No Chop Action Handler

**Severity:** High
**Description:** Even if agents wanted to chop trees, the chop action does not execute. No harvesting of wood occurs.

**Steps to Reproduce:**
1. Unable to directly test since agents don't choose gather behavior
2. No console evidence of chop execution
3. Tree resource amounts remain at 100/100

**Expected Behavior:** When agent executes chop action targeting tree:
- Agent moves adjacent to tree
- Tree's resource amount decreases
- Wood added to agent inventory
- `resource:gathered` event emitted

**Actual Behavior:** No chop actions execute. No resource depletion. No events.

---

### Issue 4: No Mine Action Handler

**Severity:** High
**Description:** Similar to Issue 3 - mining rocks does not work.

**Steps to Reproduce:**
1. Same as Issue 3 but for rocks
2. Rock resource amounts remain constant
3. No stone gathering observed

**Expected Behavior:** Mining should harvest stone from rocks into inventory.

**Actual Behavior:** No mining occurs.

---

### Issue 5: Cannot Test Construction Resource Requirements

**Severity:** Medium
**Description:** Without working inventory or gathering, cannot verify if construction properly checks and consumes resources from inventory.

**Steps to Reproduce:**
1. Cannot gather resources (blocked by Issues 2, 3, 4)
2. Cannot see inventory (blocked by Issue 1)
3. Cannot test building with/without resources

**Expected Behavior:** Building construction should:
- Check agent inventory for required resources
- Deduct resources if sufficient
- Fail with message if insufficient

**Actual Behavior:** Unable to test.

---

### Issue 6: Resource Regeneration Cannot Be Verified

**Severity:** Low
**Description:** Since resources cannot be depleted (no harvesting works), regeneration cannot be observed.

**Steps to Reproduce:**
1. All resources show 100/100 (max amount)
2. No depletion occurs
3. Cannot observe regeneration from <max back to max

**Expected Behavior:** Depleted resources should regenerate over time.

**Actual Behavior:** Unable to test.

---

## Summary

| Criterion | Status |
|-----------|--------|
| 1. Inventory Component Creation | FAIL |
| 2. Wood Gathering (Chop) | FAIL |
| 3. Stone Gathering (Mine) | FAIL |
| 4. Construction Resource Transfer | NOT_FULLY_TESTED |
| 5. Resource Regeneration | NOT_TESTABLE |
| 6. Inventory Weight Limit | NOT_TESTABLE |
| 7. Gather Behavior | FAIL |
| UI Validation | FAIL |

**Overall:** 0/7 criteria passed, 4 failed, 3 not testable

---

## Verdict

**NEEDS_WORK** - Critical features are not functional or not visible:

1. **No Inventory UI** - Cannot see agent inventory at all
2. **Gather behavior not executing** - Agents never autonomously gather resources even though the action is available
3. **Chop action not working** - No wood harvesting occurs
4. **Mine action not working** - No stone harvesting occurs
5. **Cannot verify construction resource checks** - Blocked by above issues
6. **Cannot test regeneration** - Requires harvesting to work first
7. **Cannot test weight limits** - Requires inventory UI and harvesting

The feature appears to be in early implementation stage. The prompt system knows about gathering (actions are advertised correctly), but the actual behavior handlers and UI are not implemented or not functioning.

---

## Positive Observations

1. **Action prompts are context-aware** - Agents are correctly told about "chop" near trees and "mine" near rocks
2. **Game runs without errors** - No crashes or console errors during testing
3. **World resources exist** - Trees and rocks are present with resource amounts
4. **Base building system works** - Buildings like Campfire, Lean To, and Storage Box are visible in the world

---

## Recommendations for Implementation Agent

The following must be implemented or fixed:

1. **Inventory UI Panel** - Create a UI panel that displays when clicking an agent, showing:
   - Inventory slots
   - Resource quantities (wood, stone, etc.)
   - Current weight / Max weight

2. **Gather Behavior Handler** - Implement the gather behavior in AISystem that:
   - Finds nearest harvestable resource
   - Moves agent toward resource
   - Executes chop/mine when adjacent

3. **Chop Action Handler** - Implement chop action execution:
   - Reduce tree resource amount
   - Add wood to agent inventory
   - Emit resource:gathered event

4. **Mine Action Handler** - Implement mine action execution:
   - Reduce rock resource amount
   - Add stone to agent inventory
   - Emit resource:gathered event

5. **AI Decision Making** - Ensure agents actually choose gather behavior when:
   - They can see harvestable resources
   - They need materials (for building or general purposes)

6. **Construction Resource Checks** - Verify building system checks agent inventory for required materials

7. **Visual Feedback** - Add visual feedback when resources are gathered (floating text, animation, sound)

---

## Test Evidence

All test evidence is available in:
- **Screenshots:** `agents/autonomous-dev/work-orders/resource-gathering/screenshots/`
- **Console Logs:** Captured during test execution (shown in test output)

Key evidence:
- Initial game state shows agents, trees, rocks, buildings
- Multiple agent click attempts show no inventory UI appears
- Console logs prove gather action is available but never executed
- Resource amounts remain constant (100/100) throughout test
- No resource:gathered events observed

---

**Report Generated:** 2025-12-22
**Next Steps:** Return to Implementation Agent with this report
