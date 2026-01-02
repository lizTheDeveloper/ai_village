# CLAIMED: conflict-combat-ui

**Work Order:** agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md

**Phase:** 16
**Spec:** openspec/specs/ui-system/conflict.md
**Status:** READY_FOR_TESTS
**Dependencies:** All met 

---

## Work Order Summary

The work order for conflict/combat UI has been created and is comprehensive. It includes:

### Completed Components (Already Implemented)
-  CombatHUDPanel - Shows active conflicts and threat levels
-  CombatUnitPanel - Displays selected unit details
-  CombatLogPanel - Scrollable event log with filtering
-  Unit tests for all three panels

### Components Needing Implementation (MVP - MUST Priority)
- L HealthBarRenderer - REQ-COMBAT-002 (health bars above entities)
- L StanceControlsPanel - REQ-COMBAT-004 (stance buttons UI)
- L ThreatIndicatorRenderer - REQ-COMBAT-005 (world-space threat markers)
- L Integration of existing panels into Renderer and WindowManager
- L CombatShortcutHandler - REQ-COMBAT-011 (keyboard bindings)

### Components for Future Enhancement (SHOULD/MAY Priority)
- TacticalOverviewPanel - REQ-COMBAT-007
- DefenseManagementPanel - REQ-COMBAT-009
- AbilityBarPanel - REQ-COMBAT-008
- FloatingNumberRenderer - REQ-COMBAT-010

---

## Acceptance Criteria

The work order defines 8 detailed acceptance criteria covering:
1. Combat HUD displays active conflicts
2. Health bars show entity health
3. Combat unit panel shows selected unit details
4. Stance controls allow behavior changes
5. Threat indicators show nearby threats
6. Combat log records all events
7. Tactical overview shows battle status
8. Keyboard shortcuts work for combat actions

---

## Integration Points

- WindowManager - Window registration
- EventBus - 11 combat events consumed
- Renderer - Panel rendering
- World/ECS - Component queries (identity, combat_stats, needs, injury, conflict)
- Selection System - ui:entity:selected events
- Notification System - Combat alerts

---

## Handing off to Test Agent

The work order is complete and ready for the Test Agent to create test specifications.

Attempt: #1157
