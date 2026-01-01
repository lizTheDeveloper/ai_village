# Work Order Ready: Conflict UI

**Status:** WORK_ORDER_READY
**Feature:** conflict-ui
**Phase:** 16
**Timestamp:** 1767232100
**Agent:** spec-agent-001
**Attempt:** 521

---

## Summary

Work order created for **Conflict/Combat UI** feature.

This feature provides comprehensive combat visualization including:
- Combat HUD with active conflicts display
- Health bars with injury indicators
- Threat indicators (in-world and off-screen)
- Combat unit panel with stats/equipment
- Stance controls (passive/defensive/aggressive/flee)
- Combat log with event filtering
- Tactical overview for strategic planning

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Reference

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Dependencies:**
- ✅ `openspec/specs/conflict-system/spec.md` - Conflict mechanics
- ✅ `openspec/specs/agent-system/spec.md` - Agent stats
- ✅ `openspec/specs/ui-system/notifications.md` - Combat alerts

All dependencies are satisfied.

---

## Existing Infrastructure

**Good news:** Several core components already exist:
- ✅ `HealthBarRenderer.ts` - Health bar rendering
- ✅ `ThreatIndicatorRenderer.ts` - Threat visualization
- ✅ `CombatHUDPanel.ts` - Combat HUD overlay
- ✅ `CombatUnitPanel.ts` - Unit detail panel
- ✅ `StanceControls.ts` - Stance button UI
- ✅ `CombatLogPanel.ts` - Combat log display

**Implementation needs to:**
1. Verify these match spec requirements (REQ-COMBAT-001 through REQ-COMBAT-006)
2. Add missing features (injury icons, off-screen arrows, etc.)
3. Create new components for SHOULD/MAY requirements

---

## Key Requirements

### MUST (Core):
- REQ-COMBAT-001: Combat HUD ✓ (exists, verify)
- REQ-COMBAT-002: Health Bars ✓ (exists, add injury icons)
- REQ-COMBAT-003: Combat Unit Panel ✓ (exists, verify)
- REQ-COMBAT-004: Stance Controls ✓ (exists, verify)
- REQ-COMBAT-005: Threat Indicators ✓ (exists, add off-screen arrows)

### SHOULD (Secondary):
- REQ-COMBAT-006: Combat Log ✓ (exists, verify)
- REQ-COMBAT-007: Tactical Overview (create)
- REQ-COMBAT-009: Defense Management (create)
- REQ-COMBAT-011: Keyboard Shortcuts (implement)

### MAY (Optional):
- REQ-COMBAT-008: Ability Bar
- REQ-COMBAT-010: Damage Numbers

---

## Integration Points

**Events to Listen:**
- `conflict:started` - New conflict begins
- `conflict:resolved` - Conflict ends
- `combat:attack` - Attack occurs
- `combat:damage` - Damage dealt
- `combat:injury` - Injury inflicted
- `combat:death` - Entity dies
- `threat:detected` - New threat
- `entity:selected` - Selection changes

**Events to Emit:**
- `combat:stance_changed` - User changes stance
- `combat:ability_used` - Ability activated
- `combat:retreat_ordered` - Retreat command
- `combat:focus_conflict` - Focus camera on conflict

---

## Testing Priorities

**Phase 1:** Verify existing implementations (MUST requirements)
**Phase 2:** Create missing components (SHOULD requirements)
**Phase 3:** Add optional features (MAY requirements)

---

## Handing Off

Work order is complete and ready for the **Test Agent** to write tests.

The Test Agent should:
1. Read the work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Write tests for all acceptance criteria
3. Post test completion to the implementation channel

---

**Next Agent:** Test Agent
**Expected Action:** Write tests for conflict-ui feature
