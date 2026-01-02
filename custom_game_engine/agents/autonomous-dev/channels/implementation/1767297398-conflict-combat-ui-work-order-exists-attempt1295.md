# WORK ORDER EXISTS: conflict-combat-ui

**Attempt:** #1295
**Work Order:** agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md
**Created:** 2025-12-31 (attempt #1157)
**Status:** READY_FOR_TESTS

---

## Verification

The work order for conflict/combat-ui already exists and is comprehensive:

- ✅ Work order file created: `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
- ✅ Phase: Phase 7 - Conflict & Social Complexity
- ✅ Primary Spec: `openspec/specs/ui-system/conflict.md`
- ✅ Related Spec: `openspec/specs/conflict-system/spec.md`
- ✅ Dependencies: All met

---

## Work Order Contents

### Requirements (11 total)
1. Combat HUD overlay (REQ-COMBAT-001) - SHALL
2. Health bars above entities (REQ-COMBAT-002) - SHALL
3. Combat Unit Panel (REQ-COMBAT-003) - SHALL
4. Stance Controls (REQ-COMBAT-004) - SHALL
5. Threat Indicators (REQ-COMBAT-005) - SHALL
6. Combat Log (REQ-COMBAT-006) - SHOULD
7. Tactical Overview (REQ-COMBAT-007) - SHOULD
8. Ability Bar (REQ-COMBAT-008) - MAY
9. Defense Management (REQ-COMBAT-009) - SHOULD
10. Damage Numbers (REQ-COMBAT-010) - MAY
11. Keyboard Shortcuts (REQ-COMBAT-011) - SHOULD

### Acceptance Criteria (8 detailed scenarios)
- Combat HUD Display (WHEN conflict starts, THEN display active conflict)
- Health Bar Rendering (WHEN health drops, THEN render health bar)
- Combat Unit Panel (WHEN entity selected, THEN display stats)
- Stance Controls (WHEN user clicks stance, THEN update component)
- Threat Indicators (WHEN threat detected, THEN show indicator)
- Combat Log (WHEN combat event, THEN log event)
- Event Integration (WHEN events emitted, THEN UI updates)
- Keyboard Shortcuts (WHEN hotkey pressed, THEN change stance)

### System Integration
- EventBus: 11 events consumed (conflict:started, combat:attack, etc.)
- WindowManager: Panel registration
- KeyboardRegistry: Hotkey bindings
- 6 existing systems: HuntingSystem, PredatorAttackSystem, AgentCombatSystem, DominanceChallengeSystem, GuardDutySystem

### Files Affected
- **Renderer**: CombatHUDPanel, HealthBarRenderer, CombatLogPanel, CombatUnitPanel, StanceControls, ThreatIndicatorRenderer
- **Core Systems**: Verify event emission in conflict systems
- **Components**: CombatStanceComponent, ConflictComponent

### Implementation Priority
1. **MUST (Phase 1)**: Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
2. **SHOULD (Phase 2)**: Combat Log, Tactical Overview, Keyboard Shortcuts
3. **MAY (Phase 3)**: Ability Bar, Defense Management, Damage Numbers

---

## Notes

The work order includes:
- Complete spec references
- Detailed acceptance criteria with WHEN/THEN conditions
- System integration map
- UI requirements with layout specifications
- Implementation checklist (34 items)
- Notes for Implementation Agent (special considerations, gotchas)
- Notes for Playtest Agent (UI behaviors, edge cases)

---

## Status

✅ Work order exists and is comprehensive
✅ Ready for Test Agent to create test specifications
✅ Ready for Implementation Agent to verify/implement components

---

**Spec Agent Task Complete**
