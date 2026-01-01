# Work Order Confirmed: conflict-ui

**Timestamp:** 1767253947
**Attempt:** 901
**Status:** WORK_ORDER_READY

---

## Work Order Location

✅ **Work order exists at:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

**Feature:** Conflict UI (Combat HUD, Health Bars, Threat Indicators)
**Phase:** 7
**Spec:** openspec/specs/ui-system/conflict.md

---

## Requirements Covered

The work order includes comprehensive specifications for:

1. **REQ-COMBAT-001:** Combat HUD overlay
2. **REQ-COMBAT-002:** Health bar rendering (HealthBarRenderer EXISTS)
3. **REQ-COMBAT-003:** Combat unit panel (CombatUnitPanel EXISTS)
4. **REQ-COMBAT-004:** Stance controls (StanceControls EXISTS)
5. **REQ-COMBAT-005:** Threat indicators (ThreatIndicatorRenderer EXISTS)
6. **REQ-COMBAT-006:** Combat log (CombatLogPanel EXISTS)
7. **REQ-COMBAT-007:** Tactical overview (NEW)
8. **REQ-COMBAT-008:** Ability bar (NEW)
9. **REQ-COMBAT-009:** Defense management (NEW)
10. **REQ-COMBAT-010:** Damage numbers (NEW)
11. **REQ-COMBAT-011:** Keyboard shortcuts (NEW)

---

## Existing Components

The following combat UI components **already exist** and need verification:

- ✅ `packages/renderer/src/HealthBarRenderer.ts` - Health bars with injury indicators
- ✅ `packages/renderer/src/ThreatIndicatorRenderer.ts` - Threat indicators (on/off screen)
- ✅ `packages/renderer/src/CombatHUDPanel.ts` - Combat HUD overlay
- ✅ `packages/renderer/src/CombatUnitPanel.ts` - Unit detail panel
- ✅ `packages/renderer/src/StanceControls.ts` - Stance selector
- ✅ `packages/renderer/src/CombatLogPanel.ts` - Combat event log

---

## New Components Needed

- 🆕 TacticalOverviewPanel.ts - Strategic combat view
- 🆕 DefenseManagementPanel.ts - Zone/patrol management
- 🆕 DamageNumbersRenderer.ts - Floating combat numbers
- 🆕 AbilityBarPanel.ts - Quick ability access

---

## System Integration Points

| System | Integration Type | Status |
|--------|-----------------|---------|
| AgentCombatSystem | EventBus listeners | EXISTS |
| EventBus | combat:started, combat:ended | EXISTS |
| Renderer | UI render loop | MODIFY |
| WindowManager | Panel registration | MODIFY |
| KeyboardRegistry | Combat shortcuts | MODIFY |

---

## Acceptance Criteria

Work order includes **12 detailed acceptance criteria** covering:
- Combat HUD activation
- Health bar display & color coding
- Injury indicators
- Combat unit panel
- Stance controls
- Threat rendering (on/off screen)
- Combat log events & filtering
- Tactical overview
- Keyboard shortcuts

---

## Priority Breakdown

**HIGH PRIORITY (MUST):**
- Verify existing components work
- Integrate CombatHUDPanel with combat events
- Wire StanceControls to combat_stats component
- Test CombatLogPanel with events

**MEDIUM PRIORITY (SHOULD):**
- Implement TacticalOverviewPanel
- Add combat keyboard shortcuts
- Implement DefenseManagementPanel

**LOW PRIORITY (MAY):**
- Implement DamageNumbersRenderer
- Implement AbilityBarPanel

---

## Dependencies Met

✅ All dependencies satisfied:
- Spec file exists: `openspec/specs/ui-system/conflict.md`
- Core components exist: HealthBarRenderer, ThreatIndicatorRenderer
- Combat system exists: AgentCombatSystem
- EventBus exists for integration

---

## Handing Off

🎯 **Work order is READY for Test Agent**

The Test Agent should:
1. Review work order acceptance criteria
2. Create test plan based on 12 acceptance criteria
3. Identify test scenarios for edge cases
4. Prepare manual test checklist

Then hand off to Implementation Agent.

---

## Notes

- 6 combat UI components already exist and are functional
- Focus on verification and integration over new development
- Follow existing patterns (HealthBarRenderer is good example)
- Use lowercase_with_underscores for component types
- No console.log - use Agent Dashboard
- Always cleanup EventBus subscriptions
