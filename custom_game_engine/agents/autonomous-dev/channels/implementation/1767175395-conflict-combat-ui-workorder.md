# WORK ORDER CREATED: conflict-combat-ui

**Status:** READY_FOR_TESTS
**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T02:02:00Z
**Attempt:** #63

---

## Summary

Work order successfully created for Conflict/Combat UI feature.

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Phase:** Phase 2 - Combat/Conflict UI

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

---

## Requirements Breakdown

### MUST (Priority 1)
- Combat HUD overlay (REQ-COMBAT-001)
- Health bars (REQ-COMBAT-002)  
- Combat Unit Panel (REQ-COMBAT-003)
- Stance Controls (REQ-COMBAT-004)
- Threat Indicators (REQ-COMBAT-005)

### SHOULD (Priority 2)
- Combat Log (REQ-COMBAT-006)
- Tactical Overview (REQ-COMBAT-007)
- Defense Management (REQ-COMBAT-009)
- Keyboard Shortcuts (REQ-COMBAT-011)

### MAY (Priority 3)
- Ability Bar (REQ-COMBAT-008)
- Damage Numbers (REQ-COMBAT-010)

---

## Integration Points Identified

- **AgentCombatSystem**: Listens for `combat:started`, `combat:ended` events
- **ConflictComponent**: Queries for active conflicts
- **InjuryComponent**: Displays injuries on health bars and unit panel
- **CombatStatsComponent**: Shows combat stats and stance
- **InputHandler**: Keyboard shortcuts (1-4 for stances, A/H/R/P for commands)
- **Camera**: World-to-screen coordinate conversion

---

## Files to Create

### Renderer Components (11 new files)
- `CombatHUDPanel.ts`
- `HealthBarRenderer.ts`
- `CombatUnitPanel.ts`
- `StanceControls.ts`
- `ThreatIndicatorRenderer.ts`
- `CombatLogPanel.ts`
- `TacticalOverviewPanel.ts`
- `FloatingNumberRenderer.ts`
- `CombatState.ts`
- `CombatShortcuts.ts`
- `combat/index.ts`

### Tests (8 new test files)
- All components need unit tests
- Integration test for complete combat UI flow

---

## Next Steps

1. **Test Agent** will read this work order and create test specifications
2. **Implementation Agent** will implement UI components based on tests
3. **Playtest Agent** will verify UI behavior and edge cases

---

## Dependencies Met ✅

All required systems are in place:
- ✅ AgentCombatSystem exists and emits combat events
- ✅ ConflictComponent exists with all required fields
- ✅ InjuryComponent exists with injury tracking
- ✅ CombatStatsComponent exists with combat stats
- ✅ EventBus exists for event communication
- ✅ InputHandler exists for user input
- ✅ Camera exists for coordinate conversion

---

**Handing off to Test Agent.**
