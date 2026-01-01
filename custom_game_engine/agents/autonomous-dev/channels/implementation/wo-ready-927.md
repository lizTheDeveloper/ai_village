# WORK ORDER CONFIRMED - Attempt #927

**Feature:** conflict-ui (conflict/combat-ui)
**Date:** 2026-01-01
**Status:** ✅ WORK ORDER EXISTS AND READY

---

## Work Order Confirmation

✅ Work order file exists at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
✅ File verified: 16,079 bytes (comprehensive)
✅ Created: 2025-12-31
✅ Status: READY_FOR_TESTS
✅ Phase: 7

---

## Work Order Summary

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Related Specs:**
- `openspec/specs/conflict-system/spec.md` (combat mechanics)
- `openspec/specs/ui-system/notifications.md` (combat alerts)

**Requirements Count:** 11 total
- **MUST** (5): Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
- **SHOULD** (4): Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts
- **MAY** (2): Ability Bar, Damage Numbers

**Acceptance Criteria:** 12 detailed scenarios with verification methods

---

## System Integration Summary

### Existing Components (Verify/Enhance):
1. CombatHUDPanel.ts - Combat overlay
2. HealthBarRenderer.ts - Health bar display (functional)
3. ThreatIndicatorRenderer.ts - Threat indicators (functional)
4. CombatUnitPanel.ts - Unit stats panel
5. StanceControls.ts - Stance selector
6. CombatLogPanel.ts - Event log

### New Components (Create):
1. TacticalOverviewPanel.ts - Strategic view (SHOULD)
2. DefenseManagementPanel.ts - Zone/patrol UI (SHOULD)
3. DamageNumbersRenderer.ts - Floating numbers (MAY - optional)
4. AbilityBarPanel.ts - Ability quick access (MAY - optional)

### EventBus Integration:
- **Listens:** combat:started, combat:ended, threat:detected, injury:inflicted, unit:death
- **Emits:** None (UI layer consumes only)

---

## Implementation Priority

### HIGH PRIORITY (MUST):
1. Verify HealthBarRenderer works with current game
2. Verify ThreatIndicatorRenderer works with current game
3. Integrate CombatHUDPanel with combat events
4. Wire StanceControls to update combat_stats component
5. Test CombatLogPanel with combat events

### MEDIUM PRIORITY (SHOULD):
6. Implement TacticalOverviewPanel
7. Add combat keyboard shortcuts via KeyboardRegistry
8. Implement DefenseManagementPanel

### LOW PRIORITY (MAY):
9. Implement DamageNumbersRenderer (optional)
10. Implement AbilityBarPanel (optional)

---

## CLAUDE.md Compliance Checklist

✅ **Component Type Names:** Use lowercase_with_underscores
   - 'combat_stats' NOT 'CombatStats'
   - 'needs' NOT 'Needs'

✅ **No Silent Fallbacks:** Crash on missing required data
   - NO: `const health = data.get("health", 100)`
   - YES: `if (!("health" in data)) throw new Error("Missing required field: health")`

✅ **No Debug Logging:** NO console.log/debug/info statements
   - Use Agent Dashboard at http://localhost:8766/ for debugging
   - Only console.error and console.warn allowed for errors

✅ **EventBus Cleanup:** Always unsubscribe from events in cleanup
   - Register cleanup handlers
   - Prevent memory leaks

✅ **Performance Optimization:**
   - HealthBarRenderer uses viewport culling
   - Cap combat log at 100-200 events max
   - Optimize off-screen threat indicator calculations

---

## Test Scenarios (For Playtest Agent)

### Scenario 1: Basic Combat Flow
1. Start game → Trigger agent vs agent combat
2. Verify: Combat HUD activates
3. Verify: Health bars appear above combatants
4. Verify: Combat log shows events
5. Combat ends → HUD deactivates

### Scenario 2: Stance Controls
1. Select agent → Open Combat Unit Panel
2. Click "Aggressive" stance button
3. Verify: Stance button highlights
4. Verify: Entity combat_stats.stance updates
5. Close and reopen panel → Verify stance persists

### Scenario 3: Threat Detection
1. Spawn predator entity near village
2. Verify: On-screen indicator appears at predator location
3. Move camera so predator is off-screen
4. Verify: Edge indicator with arrow pointing to predator
5. Verify: Color matches threat severity

### Edge Cases to Test:
- Multiple simultaneous combats (HUD handles all?)
- Rapid combat start/stop (race conditions?)
- Entity death during combat (cleanup?)
- Off-screen combat (edge indicators?)
- 20+ threats (performance?)

---

## Files to Modify/Create

### Existing Files (Verify/Enhance):
- packages/renderer/src/CombatHUDPanel.ts
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLogPanel.ts

### New Files to Create:
- packages/renderer/src/TacticalOverviewPanel.ts (SHOULD)
- packages/renderer/src/DefenseManagementPanel.ts (SHOULD)
- packages/renderer/src/DamageNumbersRenderer.ts (MAY - optional)
- packages/renderer/src/AbilityBarPanel.ts (MAY - optional)

### Integration Files to Update:
- packages/renderer/src/Renderer.ts (add combat UI to render loop)
- packages/renderer/src/WindowManager.ts (register new panels)
- packages/renderer/src/KeyboardRegistry.ts (combat shortcuts 1-4, A, H, R, P, etc.)
- packages/renderer/src/index.ts (export new components)

---

## Status: ✅ READY FOR TEST AGENT

The work order is **complete and comprehensive**:
- ✅ 11 requirements (5 MUST, 4 SHOULD, 2 MAY)
- ✅ 12 detailed acceptance criteria with verification methods
- ✅ System integration points mapped to existing files
- ✅ CLAUDE.md compliance enforced
- ✅ Test scenarios defined for playtest agent
- ✅ Priority order established
- ✅ Technical considerations documented

**Next Step:** Test Agent should review work order and create test plan.

---

**Timestamp:** 2026-01-01 (Attempt #927)
**Spec Agent:** spec-agent-001
**Work Order Path:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
**Verification:** COMPLETE ✅

---

## Message to Pipeline

**CLAIMED: conflict-ui**

Work order exists at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

Phase: 7
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

Handing off to Test Agent.
