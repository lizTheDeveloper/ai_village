# WORK ORDER READY: conflict-ui

**Status:** READY_FOR_TESTS
**Timestamp:** 1767247054 (2025-12-31)
**Spec Agent:** spec-agent-001
**Attempt:** #850

---

## Work Order Created

✅ Work order file created at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

**Feature:** Conflict/Combat UI
**Phase:** 16
**Spec:** openspec/specs/ui-system/conflict.md

### Requirements
- 11 total requirements (6 MUST, 4 SHOULD, 2 MAY)
- Combat HUD overlay (REQ-COMBAT-001)
- Health bars (REQ-COMBAT-002)
- Combat unit panel (REQ-COMBAT-003)
- Stance controls (REQ-COMBAT-004)
- Threat indicators (REQ-COMBAT-005)
- Combat log (REQ-COMBAT-006)
- Tactical overview (REQ-COMBAT-007)
- Ability bar (REQ-COMBAT-008)
- Defense management (REQ-COMBAT-009)
- Damage numbers (REQ-COMBAT-010)
- Keyboard shortcuts (REQ-COMBAT-011)

### Acceptance Criteria
- 10 detailed criteria defined
- All testable with WHEN/THEN/Verification structure
- Covers health bars, threats, HUD, stances, panels, log, tactical, defense, shortcuts, injuries

### System Integration
- **Existing renderers to extend:**
  - HealthBarRenderer.ts
  - ThreatIndicatorRenderer.ts
- **New renderers to create:**
  - CombatHUDRenderer.ts
  - CombatUnitPanelRenderer.ts
  - StanceControlsRenderer.ts
  - CombatLogRenderer.ts
  - TacticalOverviewRenderer.ts
  - DefenseManagementRenderer.ts
  - AbilityBarRenderer.ts (MAY)
  - DamageNumbersRenderer.ts (MAY)

### Events
- **Listens:** conflict:started, conflict:resolved, death:occurred, injury:inflicted, combat:damage_dealt, combat:stance_changed, guard:assignment_changed, selection:changed
- **Emits:** combat:stance_request, combat:ability_used, defense:zone_created, defense:patrol_created

---

## Dependencies

All dependencies met ✅

- ✅ Agent System spec complete
- ✅ Notifications spec complete
- ✅ HealthBarRenderer exists
- ✅ ThreatIndicatorRenderer exists

---

## Handoff to Test Agent

The work order is complete and ready for test development.

**Next Agent:** Test Agent (test-agent-001)

**Test Agent Tasks:**
1. Review work order acceptance criteria
2. Write comprehensive test suite for all REQ-COMBAT-* requirements
3. Create test files in packages/renderer/src/__tests__/
4. Verify test coverage for all 10 acceptance criteria

**Implementation Notes:**
- This is primarily a RENDERER feature (not core components)
- Extend existing HealthBarRenderer and ThreatIndicatorRenderer
- Follow event-driven update pattern (no polling)
- Maintain 8-bit visual style
- Use lowercase_with_underscores for component types
- NO silent fallbacks (throw errors for missing data)

---

## Verification

✅ Work order file exists at correct path
✅ All 11 requirements extracted from spec
✅ All 10 acceptance criteria defined with verification
✅ System integration points identified
✅ Files to modify/create listed
✅ Implementation notes provided
✅ Playtest checklist included
✅ Dependencies verified as met

---

## Status Update

Updated MASTER_ROADMAP.md status: 🚧 WORK ORDER READY

**Pipeline Status:** WORK_ORDER_COMPLETE → READY_FOR_TESTS
