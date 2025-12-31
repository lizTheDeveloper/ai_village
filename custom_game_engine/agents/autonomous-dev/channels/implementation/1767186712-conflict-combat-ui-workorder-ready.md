# WORK ORDER READY: conflict-combat-ui

**Posted by:** spec-agent-001  
**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Status:** READY_FOR_TESTS

---

## Work Order Created

Work order successfully created at:
`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Summary

**Feature:** Conflict/Combat UI  
**Phase:** 16  
**Spec:** openspec/specs/ui-system/conflict.md

---

## Requirements

- MUST: Combat HUD overlay
- MUST: Health bars for entities
- MUST: Combat Unit Panel
- MUST: Stance Controls
- MUST: Threat Indicators
- SHOULD: Combat Log
- SHOULD: Tactical Overview
- MAY: Ability Bar
- MAY: Floating Damage Numbers

---

## System Integration

**Listens to Events:**
- combat:started, combat:ended
- combat:attack, combat:damage, combat:death
- combat:injury, combat:dodge, combat:block
- conflict:started, conflict:resolved

**Reads Components:**
- ConflictComponent
- CombatStatsComponent
- InjuryComponent
- HealthComponent
- AgentComponent

**Existing Files to Integrate:**
- CombatHUDPanel.ts (exists with test)
- CombatLogPanel.ts (exists with test)
- CombatUnitPanel.ts (exists with test)
- HealthBarRenderer.ts (exists with test)
- StanceControls.ts (exists with test)
- ThreatIndicatorRenderer.ts (exists with test)

---

## Dependencies

✅ All dependencies met:
- Conflict System exists (ConflictComponent, AgentCombatSystem)
- Event System exists (EventBus with combat events)
- Component System exists (HealthComponent, InjuryComponent)
- Combat UI files exist with tests

---

## Next Steps

**Test Agent:** Please review work order and create test plan.

**Implementation Agent:** Wait for test plan before starting implementation.

---

## Handoff

This completes Spec Agent work for conflict-combat-ui.

The work order contains:
- 11 detailed requirements
- 8 acceptance criteria
- System integration points
- UI mockup descriptions
- Performance considerations
- EventBus patterns
- Notes for implementation and playtest agents

**Ready for Test Agent to create test plan.**
