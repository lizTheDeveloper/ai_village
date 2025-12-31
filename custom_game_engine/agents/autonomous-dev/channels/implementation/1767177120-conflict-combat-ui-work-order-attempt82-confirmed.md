# WORK ORDER CONFIRMED: conflict-combat-ui

**Status:** READY_FOR_TESTS
**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T10:32:00Z
**Attempt:** #82

---

## Work Order Status

✅ **Work order exists and is complete**

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**File Stats:**
- Size: 334 lines (15,550 bytes)
- Last Modified: 2025-12-31 02:13:16
- Status: READY_FOR_TESTS

---

## Verification Summary

The work order has been successfully created and contains all required sections:

✅ **Spec References**
- Primary Spec: `openspec/specs/ui-system/conflict.md` (916 lines)
- Related Specs: conflict-system, agent-system, notifications

✅ **Requirements Summary**
- 11 requirements extracted from spec (5 MUST, 4 SHOULD, 2 MAY)

✅ **Acceptance Criteria**
- 10 testable scenarios in WHEN/THEN format
- Complete verification steps for each criterion

✅ **System Integration**
- 6 existing systems identified for integration
- 10 new renderer components specified
- EventBus integration fully documented

✅ **UI Requirements**
- 6 complete UI panel specifications
- Layout, positioning, and visual requirements
- User interaction flows

✅ **Files to Modify**
- 11 new renderer files to create
- 4 existing files to modify
- 8 test files to create

✅ **Implementation Notes**
- Special considerations for 8-bit pixel art
- Performance optimization strategies
- Error handling per CLAUDE.md (no silent fallbacks)
- Architecture patterns to follow

✅ **Playtest Notes**
- 6 UI behaviors to verify
- 6 edge cases
- 4 visual edge cases
- 4 performance scenarios

---

## Feature Overview

**Combat/Conflict UI System**

This feature adds comprehensive combat visualization and control to the game:

### MUST Requirements (Priority 1)
1. **Combat HUD** - Overlay showing active conflicts, threat level, selected units
2. **Health Bars** - Visual health indicators above entities with injury display
3. **Combat Unit Panel** - Detailed unit stats, equipment, stance, injuries
4. **Stance Controls** - UI to set combat behavior (passive/defensive/aggressive/flee)
5. **Threat Indicators** - World-space markers for threats with off-screen edge indicators

### SHOULD Requirements (Priority 2)
6. **Combat Log** - Scrollable event log with filtering
7. **Tactical Overview** - Strategic battle view with force comparison
8. **Defense Management** - Zone and patrol assignment UI
9. **Keyboard Shortcuts** - Quick access for combat actions (1-4, A/H/R/P)

### MAY Requirements (Optional)
10. **Ability Bar** - Quick access to combat abilities
11. **Damage Numbers** - Floating combat feedback numbers

---

## Integration Points

**EventBus Events (Listens):**
- `combat:started` - From AgentCombatSystem
- `combat:ended` - From AgentCombatSystem
- `conflict:resolved` - From conflict-system
- `injury:inflicted` - From InjurySystem
- `entity:death` - From various systems

**Component Queries:**
- `ConflictComponent` - Active conflict data
- `InjuryComponent` - Injury tracking
- `CombatStatsComponent` - Combat stats and stance
- `needs.health` - Health values

**Renderer Integration:**
- HealthBarRenderer renders directly on canvas (not in WindowManager)
- ThreatIndicatorRenderer renders directly on canvas
- All panels (HUD, Unit, Log, etc.) use WindowManager.registerPanel()
- InputHandler extended with combat keyboard shortcuts

---

## Dependencies Status

✅ **All dependencies met:**
- ConflictComponent exists
- InjuryComponent exists
- CombatStatsComponent exists
- AgentCombatSystem emits combat:started and combat:ended events
- EventBus infrastructure in place
- WindowManager and IWindowPanel interface available
- UI spec is complete with clear requirements

---

## Next Steps

**For Test Agent:**

The work order is ready for test creation. Please proceed with:

1. Read `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
2. Create test files for each component:
   - `CombatHUDPanel.test.ts`
   - `HealthBarRenderer.test.ts`
   - `CombatUnitPanel.test.ts`
   - `StanceControls.test.ts`
   - `ThreatIndicatorRenderer.test.ts`
   - `CombatLogPanel.test.ts`
   - `FloatingNumberRenderer.test.ts`
   - `CombatUIIntegration.test.ts`
3. Use the 10 acceptance criteria as test specifications
4. Include edge case tests from "Notes for Playtest Agent"
5. Add performance tests (100+ entities, 500+ log events)

**For Implementation Agent (after tests pass):**

1. Implement MUST requirements first (REQ-COMBAT-001 through 005)
2. Then implement SHOULD requirements (006, 007, 009, 011)
3. Consider MAY requirements if time permits (008, 010)
4. Follow the file structure specified in the work order
5. Adhere to architectural patterns (see CraftingPanelUI.ts)
6. Follow CLAUDE.md guidelines (no silent fallbacks, no console.log debugging)

---

## Handoff

✅ **Work order creation: COMPLETE**
✅ **Spec verification: COMPLETE**
✅ **Dependency check: COMPLETE**
✅ **Integration points: DOCUMENTED**

**Handing off to Test Agent.**

---

spec-agent-001 signing off ✓
