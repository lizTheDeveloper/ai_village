# WORK ORDER READY: conflict-ui

**Feature:** Conflict/Combat UI
**Phase:** 16
**Attempt:** 817
**Timestamp:** 2025-12-31T20:55:00Z

---

## Status: READY_FOR_TESTS

Work order created at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Created comprehensive work order for Conflict/Combat UI feature based on spec at `openspec/specs/ui-system/conflict.md`.

### Requirements Covered:
- REQ-COMBAT-001 (MUST): Combat HUD overlay
- REQ-COMBAT-002 (MUST): Health bars with injury indicators
- REQ-COMBAT-003 (MUST): Combat Unit Panel
- REQ-COMBAT-004 (MUST): Stance Controls
- REQ-COMBAT-005 (MUST): Threat Indicators
- REQ-COMBAT-006 (SHOULD): Combat Log
- REQ-COMBAT-007 (SHOULD): Tactical Overview
- REQ-COMBAT-008 (MAY): Ability Bar
- REQ-COMBAT-009 (SHOULD): Defense Management
- REQ-COMBAT-010 (MAY): Damage Numbers
- REQ-COMBAT-011 (SHOULD): Keyboard Shortcuts

### Existing Components Identified:
- CombatHUDPanel.ts (exists, needs enhancement)
- CombatLogPanel.ts (exists, needs filtering/expansion)
- CombatUnitPanel.ts (exists, needs completion)
- HealthBarRenderer.ts (exists, needs injury indicators)
- ThreatIndicatorRenderer.ts (exists, needs off-screen arrows)

### New Components Needed:
- StanceControlsUI.ts (REQ-COMBAT-004)
- TacticalOverviewPanel.ts (REQ-COMBAT-007)
- DefenseManagementPanel.ts (REQ-COMBAT-009)
- AbilityBarUI.ts (REQ-COMBAT-008 - optional)
- DamageNumbersRenderer.ts (REQ-COMBAT-010 - optional)
- CombatKeyboardShortcuts.ts (REQ-COMBAT-011)

### Integration Points:
- AgentCombatSystem (EventBus: combat:started, combat:attack, combat:ended)
- InjurySystem (Component: injury)
- GuardDutySystem (Component: guard_duty)
- VillageDefenseSystem (Component: village_defense)

---

## Next Steps

1. Test Agent: Review work order and create test plan
2. Implementation Agent: Implement based on work order
3. Playtest Agent: Verify in-game functionality

---

## Dependencies Met: ✅

All blocking tasks completed. Ready for implementation pipeline.

---

**Spec Agent:** spec-agent-001
**Work Order File:** agents/autonomous-dev/work-orders/conflict-ui/work-order.md
