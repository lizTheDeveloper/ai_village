# WORK ORDER READY: conflict-ui

**Timestamp:** $(date +%s)
**Attempt:** 812
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Comprehensive work order created for Conflict/Combat UI feature:

- **Phase:** 7
- **Spec:** openspec/specs/ui-system/conflict.md
- **Related Specs:**
  - openspec/specs/conflict-system/spec.md
  - openspec/specs/ui-system/notifications.md
- **Dependencies:** All met ✅

---

## Key Details

### Components Already Implemented
The following combat UI components **already exist** in the codebase:
- CombatHUDPanel.ts (REQ-COMBAT-001)
- HealthBarRenderer.ts (REQ-COMBAT-002) - **Functional**
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005) - **Functional**
- CombatLogPanel.ts (REQ-COMBAT-006)
- CombatUnitPanel.ts (REQ-COMBAT-003)
- StanceControls.ts (REQ-COMBAT-004)

### Components Still Needed
- TacticalOverviewPanel.ts (REQ-COMBAT-007)
- DefenseManagementPanel.ts (REQ-COMBAT-009)
- DamageNumbersRenderer.ts (REQ-COMBAT-010) - Optional
- AbilityBarPanel.ts (REQ-COMBAT-008) - Optional

### Integration Tasks
1. Verify existing components work with current game
2. Integrate CombatHUDPanel with EventBus (combat:started, combat:ended)
3. Wire StanceControls to update combat_stats components
4. Connect CombatLogPanel to combat events
5. Add combat keyboard shortcuts to KeyboardRegistry
6. Implement missing components (TacticalOverview, DefenseManagement)

### Acceptance Criteria (12)
1. Combat HUD Activation - HUD activates on combat:started event
2. Health Bar Display - Shows for injured/combat entities
3. Health Bar Color Coding - Green/yellow/red based on health %
4. Injury Indicators - Icons above health bars
5. Combat Unit Panel - Shows stats/equipment/stance/injuries
6. Stance Controls - Updates entity combat_stats.stance
7. Threat Indicator Rendering - Shows at threat positions
8. Off-screen Threat Indicators - Edge arrows for off-screen threats
9. Combat Log Events - Appends events with timestamps
10. Combat Log Filtering - Filters by type/entity
11. Tactical Overview - Force counts, health totals, predictions
12. Keyboard Shortcuts - 1-4 for stances, T for tactical, etc.

---

## Technical Notes

### Error Handling
- No silent fallbacks - crash on missing required components
- Use lowercase_with_underscores for component type names
- Validate entities have combat_stats, needs before rendering

### Performance Considerations
- HealthBarRenderer already optimized with viewport culling
- Combat log should cap at 100-200 events max
- ThreatIndicatorRenderer needs off-screen calculation optimization

### EventBus Integration
- Listen to: combat:started, combat:ended, threat:detected, injury:inflicted, unit:death
- Ensure cleanup on component unmount
- No silent event failures

---

## Handoff

Work order is complete with:
- ✅ Spec analysis complete
- ✅ Existing components identified
- ✅ Acceptance criteria defined (12 criteria)
- ✅ System integration points mapped
- ✅ Implementation notes provided
- ✅ Playtest scenarios documented

**Status:** READY_FOR_TESTS

Handing off to Test Agent.
