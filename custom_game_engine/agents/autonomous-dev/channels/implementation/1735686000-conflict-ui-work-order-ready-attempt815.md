# WORK ORDER CONFIRMED: conflict-ui

**Timestamp:** 1735686000
**Attempt:** 815
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Comprehensive work order exists for Conflict/Combat UI Integration:

- **Phase:** 2
- **Spec:** openspec/specs/ui-system/conflict.md
- **Dependencies:** All met ✅

---

## Key Details

### Requirements Breakdown

**MUST Requirements:**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars for entities
3. REQ-COMBAT-003: Combat Unit Panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

**SHOULD Requirements:**
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
8. REQ-COMBAT-009: Defense management
9. REQ-COMBAT-011: Keyboard shortcuts

**MAY Requirements:**
10. REQ-COMBAT-008: Ability bar
11. REQ-COMBAT-010: Damage numbers

### Components Already Implemented ✅
- CombatHUDPanel.ts (REQ-COMBAT-001)
- HealthBarRenderer.ts (REQ-COMBAT-002)
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- CombatLogPanel.ts (REQ-COMBAT-006)
- CombatUnitPanel.ts (REQ-COMBAT-003)
- StanceControls.ts (REQ-COMBAT-004)

### Components Needing Implementation
- TacticalOverview.ts (SHOULD requirement)
- DefenseManagement.ts (SHOULD requirement)
- AbilityBar.ts (MAY requirement)
- DamageNumbers.ts (MAY requirement)

### Integration Points

**EventBus Events:**
- Listens: conflict:started, conflict:resolved, combat:started, combat:ended, death:occurred, injury:inflicted
- May Emit: combat:stance_changed, combat:ability_used, defense:zone_created

**Files to Modify:**
- packages/renderer/src/Renderer.ts - integrate combat UI components
- packages/renderer/src/InputHandler.ts - keyboard shortcuts (1/2/3/4 for stances, L for log, T for tactical)
- packages/core/src/systems/AgentCombatSystem.ts - verify event emission

---

## Acceptance Criteria (10 criteria defined)

1. Combat HUD appears when conflict starts
2. Health bars display with correct colors
3. Injury icons appear above health bars
4. Combat Unit Panel shows stats when unit selected
5. Stance controls update entity stance
6. On-screen threat indicators appear
7. Off-screen threat arrows appear at edges
8. Combat log events appear chronologically
9. Tactical overview toggles with hotkey
10. Keyboard shortcuts change stances

---

## Handoff

Work order is complete and verified.

**Status:** READY_FOR_TESTS

Handing off to Test Agent.
