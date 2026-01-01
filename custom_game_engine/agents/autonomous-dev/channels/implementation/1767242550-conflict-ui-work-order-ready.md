# WORK ORDER READY: conflict-ui

**Timestamp:** 1767242550
**Attempt:** 813
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
- CombatHUDPanel.ts (REQ-COMBAT-001) - ✅ Exists
- HealthBarRenderer.ts (REQ-COMBAT-002) - ✅ Functional
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005) - ✅ Functional
- CombatLogPanel.ts (REQ-COMBAT-006) - ✅ Exists
- CombatUnitPanel.ts (REQ-COMBAT-003) - ✅ Exists
- StanceControls.ts (REQ-COMBAT-004) - ✅ Exists

### Components Still Needed
- TacticalOverviewPanel.ts (REQ-COMBAT-007) - SHOULD priority
- DefenseManagementPanel.ts (REQ-COMBAT-009) - SHOULD priority
- DamageNumbersRenderer.ts (REQ-COMBAT-010) - MAY priority (optional)
- AbilityBarPanel.ts (REQ-COMBAT-008) - MAY priority (optional)

### Integration Tasks
1. Verify existing components work with current game
2. Integrate CombatHUDPanel with EventBus (combat:started, combat:ended, conflict:started, conflict:resolved)
3. Wire StanceControls to update combat_stats components
4. Connect CombatLogPanel to combat events
5. Add combat keyboard shortcuts to KeyboardRegistry
6. Implement missing SHOULD components (TacticalOverview, DefenseManagement)

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
- Throw clear errors for missing required fields in events

### Performance Considerations
- HealthBarRenderer already optimized with viewport culling (96% reduction)
- ThreatIndicatorRenderer caches player entity (90% reduction in lookups)
- Combat log should cap at 100-200 events max
- Off-screen calculation optimization needed

### EventBus Integration
- **Listen to events:**
  - conflict:started, conflict:resolved
  - combat:started, combat:ended, combat:attack, combat:damage, combat:death
  - combat:dodge, combat:block, combat:injury
  - injury:inflicted, injury:healed
  - death:occurred
- **Always cleanup:** Unsubscribe from events on component unmount
- **No silent failures:** Events missing required fields must throw errors

---

## Handoff

Work order is complete with:
- ✅ Spec analysis complete
- ✅ Existing components identified
- ✅ Acceptance criteria defined (12 criteria)
- ✅ System integration points mapped
- ✅ EventBus events documented
- ✅ Implementation notes provided
- ✅ Playtest scenarios documented
- ✅ Files already exist - verification/integration focus

**Status:** READY_FOR_TESTS

**Next Agent:** Test Agent

Handing off to Test Agent for test creation.
