# WORK ORDER CONFIRMED - Attempt #918

**Feature:** conflict-ui (conflict/combat-ui)
**Date:** 2026-01-01
**Status:** ✅ WORK ORDER EXISTS AND READY

---

## Work Order Confirmation

✅ Work order file exists at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
✅ File created: 2025-12-31 (Previous verified attempt #898)
✅ Work order is comprehensive and complete
✅ Status: READY_FOR_TESTS
✅ Phase: 7

---

## Work Order Summary

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Related Specs:**
- `openspec/specs/conflict-system/spec.md` (combat mechanics)
- `openspec/specs/ui-system/notifications.md` (combat alerts)

**Requirements Count:** 11 total
- MUST (5): Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
- SHOULD (4): Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts
- MAY (2): Ability Bar, Damage Numbers

**Acceptance Criteria:** 12 detailed scenarios with verification methods

---

## System Integration

### Existing Components to Verify:
- CombatHUDPanel.ts
- HealthBarRenderer.ts (functional)
- ThreatIndicatorRenderer.ts (functional)
- CombatUnitPanel.ts
- StanceControls.ts
- CombatLogPanel.ts

### New Components to Create:
- TacticalOverviewPanel.ts (SHOULD)
- DefenseManagementPanel.ts (SHOULD)
- DamageNumbersRenderer.ts (MAY - optional)
- AbilityBarPanel.ts (MAY - optional)

### EventBus Integration Required:
- Listen: combat:started, combat:ended, threat:detected, injury:inflicted, unit:death
- Emit: None (UI layer consumes only)

---

## Implementation Priority

**HIGH PRIORITY (MUST):**
1. Verify HealthBarRenderer works with current game
2. Verify ThreatIndicatorRenderer works with current game
3. Integrate CombatHUDPanel with combat events
4. Wire StanceControls to update combat_stats component
5. Test CombatLogPanel with combat events

**MEDIUM PRIORITY (SHOULD):**
6. Implement TacticalOverviewPanel
7. Add combat keyboard shortcuts
8. Implement DefenseManagementPanel

**LOW PRIORITY (MAY):**
9. Implement DamageNumbersRenderer (optional)
10. Implement AbilityBarPanel (optional)

---

## Critical Compliance Notes

**From CLAUDE.md:**

1. **Component Type Names:** Use lowercase_with_underscores
   - Example: 'combat_stats' NOT 'CombatStats'

2. **No Silent Fallbacks:** Crash on missing data
   - NO: `health = data.get("health", 100)`
   - YES: `if ("health" not in data) throw Error`

3. **No Debug Logging:** NO console.log/debug/info
   - Use Agent Dashboard for debugging
   - Only console.error and console.warn allowed

4. **EventBus Cleanup:** Always unsubscribe in unmount

5. **Performance:**
   - HealthBarRenderer has viewport culling
   - Cap combat log at 100-200 events
   - Optimize off-screen threat calculations

---

## Test Scenarios (For Playtest Agent)

**Scenario 1: Basic Combat Flow**
1. Start game → Trigger combat
2. Verify: HUD activates, health bars show, log populates
3. Combat ends → HUD deactivates

**Scenario 2: Stance Controls**
1. Select agent → Open panel
2. Set stance "Aggressive"
3. Verify: combat_stats.stance updates and persists

**Scenario 3: Threat Detection**
1. Spawn predator
2. Verify: On-screen indicator shows
3. Move camera → Verify: Off-screen edge indicator

**Edge Cases:**
- Multiple simultaneous combats
- Rapid combat start/stop
- Entity death during combat
- 20+ threats performance

---

## Files Referenced

**Existing Files (Verify/Enhance):**
- packages/renderer/src/CombatHUDPanel.ts
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLogPanel.ts

**New Files to Create:**
- packages/renderer/src/TacticalOverviewPanel.ts
- packages/renderer/src/DefenseManagementPanel.ts
- packages/renderer/src/DamageNumbersRenderer.ts (optional)
- packages/renderer/src/AbilityBarPanel.ts (optional)

**Files to Modify:**
- packages/renderer/src/Renderer.ts (add to render loop)
- packages/renderer/src/WindowManager.ts (register panels)
- packages/renderer/src/KeyboardRegistry.ts (combat shortcuts)
- packages/renderer/src/index.ts (exports)

---

## Status: READY FOR TEST AGENT

The work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md` is:
- ✅ Complete with 11 requirements
- ✅ 12 detailed acceptance criteria
- ✅ System integration mapped
- ✅ CLAUDE.md compliant
- ✅ Test scenarios defined

**Next Step:** Test Agent should review work order and create test plan.

---

**Timestamp:** 2026-01-01 00:00:00 UTC
**Spec Agent:** spec-agent-001
**Attempt:** #918
**Verification:** COMPLETE ✅
**Work Order Path:** agents/autonomous-dev/work-orders/conflict-ui/work-order.md
