# Work Order Ready: Conflict UI

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T16:05:00Z
**Attempt:** #484
**Status:** ✅ WORK ORDER EXISTS AND VERIFIED

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Verification Summary

The work order for **conflict/combat-ui** has been verified and is ready:

✅ **Work order directory exists:** `agents/autonomous-dev/work-orders/conflict-ui/`
✅ **Work order file complete:** 593 lines, comprehensive
✅ **Spec validated:** openspec/specs/ui-system/conflict.md
✅ **Requirements extracted:** 11 requirements (REQ-COMBAT-001 through REQ-COMBAT-011)
✅ **Acceptance criteria defined:** 11 detailed criteria with WHEN/THEN/Verification
✅ **System integration mapped:** 6 existing systems identified
✅ **New components listed:** 10 UI components needed
✅ **Events defined:** Emits 5 events, Listens to 9 events
✅ **UI requirements specified:** Visual design, layouts, interactions
✅ **Files listed:** 17 new files, 5 modified files
✅ **Implementation notes:** Architecture, integration points, edge cases, testing strategy
✅ **Playtest notes:** UI behaviors to verify, manual test scenarios

---

## Phase Information

- **Phase:** 16
- **Feature:** Conflict UI (Combat/Threat Display)
- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Related Specs:**
  - openspec/specs/conflict-system/spec.md
  - openspec/specs/agent-system/spec.md
  - openspec/specs/ui-system/notifications.md
  - openspec/specs/systems/selection.md

---

## Dependencies Status

All dependencies are MET ✅:

- Conflict System implemented (AgentCombatSystem, ConflictResolution types)
- Agent System implemented (HealthComponent, CombatStatsComponent)
- Selection System implemented (ui:selection:changed events)
- EventBus operational
- Camera System operational
- WindowManager operational

---

## Scope Summary

### MUST Implement (Priority 1):
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bars with injury indicators (REQ-COMBAT-002)
3. Combat Unit Panel with stats/equipment (REQ-COMBAT-003)
4. Stance controls (passive/defensive/aggressive/flee) (REQ-COMBAT-004)
5. Threat indicators (in-world and off-screen) (REQ-COMBAT-005)

### SHOULD Implement (Priority 2):
6. Combat Log (scrollable event log) (REQ-COMBAT-006)
7. Tactical Overview (strategic view) (REQ-COMBAT-007)
8. Defense Management (zones, patrols) (REQ-COMBAT-009)
9. Keyboard shortcuts (REQ-COMBAT-011)

### MAY Implement (Priority 3):
10. Ability Bar (quick access to abilities) (REQ-COMBAT-008)
11. Floating damage numbers (REQ-COMBAT-010)

---

## Key Integration Points

**EventBus Events to Listen:**
- `conflict:started` - Combat begins
- `conflict:resolved` - Combat ends with ConflictResolution
- `agent:combat:hit` - Damage dealt
- `agent:combat:miss` - Attack missed
- `agent:death` - Agent died (Death type from conflict-system)
- `agent:injured` - Injury inflicted (Injury type from conflict-system)
- `entity:health_changed` - Health updates
- `ui:selection:changed` - Unit selection

**EventBus Events to Emit:**
- `ui:combat:stance_changed` - User sets stance
- `ui:combat:ability_used` - Ability activated
- `ui:combat:log_filter_changed` - Log filter changed
- `ui:combat:tactical_opened` - Tactical view opened
- `ui:combat:defense_zone_created` - Defense zone created

---

## Files to Create

### Core UI Components:
- `packages/renderer/src/CombatHUDPanel.ts`
- `packages/renderer/src/HealthBarRenderer.ts`
- `packages/renderer/src/CombatUnitPanel.ts`
- `packages/renderer/src/CombatLogPanel.ts`

### Supporting Components:
- `packages/renderer/src/combat-ui/StanceControls.ts`
- `packages/renderer/src/combat-ui/ThreatIndicators.ts`
- `packages/renderer/src/combat-ui/TacticalOverview.ts`
- `packages/renderer/src/combat-ui/AbilityBar.ts`
- `packages/renderer/src/combat-ui/DefenseManagement.ts`
- `packages/renderer/src/combat-ui/FloatingNumbers.ts`
- `packages/renderer/src/combat-ui/types.ts`

### State Management:
- `packages/renderer/src/combat-ui/CombatStateManager.ts`
- `packages/renderer/src/combat-ui/CombatEventHandler.ts`
- `packages/renderer/src/combat-ui/KeyboardShortcuts.ts`

### Test Files:
- `packages/renderer/src/__tests__/CombatHUDPanel.test.ts`
- `packages/renderer/src/__tests__/CombatUnitPanel.test.ts`
- `packages/renderer/src/__tests__/CombatLogPanel.test.ts`
- `packages/renderer/src/__tests__/HealthBarRenderer.test.ts`
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts`

---

## Next Steps

**The work order is READY.**

Handing off to **Test Agent** to:
1. Read the complete work order
2. Create test files based on acceptance criteria
3. Write unit tests for each UI component
4. Write integration tests for EventBus integration
5. Post completion message to implementation channel

---

## Spec Agent Notes

This is attempt #484. The work order was successfully created in attempt #481 and has been verified to be complete and comprehensive. No changes needed - the work order is ready for the Test Agent pipeline.

The work order includes:
- All 11 requirements from the spec
- Detailed acceptance criteria with verification steps
- Complete system integration mapping
- Architecture decisions and performance considerations
- Edge cases and testing strategies
- Notes for Implementation and Playtest agents

**Status: READY FOR TESTS** ✅
