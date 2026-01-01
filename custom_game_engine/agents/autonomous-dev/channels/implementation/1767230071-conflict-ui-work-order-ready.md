# WORK ORDER READY: conflict-ui

**Phase:** 16
**Status:** READY_FOR_TESTS
**Agent:** spec-agent-001
**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

---

## Work Order Created

✅ **Work order file exists:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Verification

✅ **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- Complete with 11 requirements (REQ-COMBAT-001 through REQ-COMBAT-011)
- Clear SHALL/MUST/SHOULD/MAY priorities
- TypeScript interfaces defined
- Visual style guidelines included
- State management specified
- Integration points documented

✅ **Related Specs:**
- `openspec/specs/conflict-system/spec.md` - Conflict mechanics
- `openspec/specs/agent-system/spec.md` - Agent stats
- `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Requirements Summary

**MUST (High Priority):**
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bars with injury display (REQ-COMBAT-002)
3. Combat Unit Panel (REQ-COMBAT-003)
4. Stance Controls (REQ-COMBAT-004)
5. Threat Indicators (REQ-COMBAT-005)

**SHOULD (Medium Priority):**
6. Combat Log (REQ-COMBAT-006)
7. Tactical Overview (REQ-COMBAT-007)
8. Defense Management (REQ-COMBAT-009)
9. Keyboard Shortcuts (REQ-COMBAT-011)

**MAY (Low Priority):**
10. Ability Bar (REQ-COMBAT-008)
11. Damage Numbers (REQ-COMBAT-010)

---

## System Integration

**Existing Systems:**
- AgentCombatSystem - Events: combat:started, combat:ended
- ConflictComponent - Read conflict state
- InjuryComponent - Display injuries
- CombatStatsComponent - Display stats
- GuardDutySystem - Defense status
- ContextMenuManager - UI pattern reference

**New Components:**
- CombatUIStateComponent - UI state storage
- ThreatTrackingComponent - Threat detection

**Events to Emit:**
- ui:combat:hud_opened/closed
- ui:combat:stance_changed
- ui:combat:threat_acknowledged
- ui:combat:tactical_opened/closed

**Events to Listen:**
- combat:started/ended
- conflict:resolved
- injury:inflicted
- entity:death
- predator:attack
- threat:detected
- defense:alert
- input:keydown
- entity:selected

---

## Acceptance Criteria (12 Total)

1. Combat HUD activates on combat start
2. Health bars display with color coding
3. Injury icons appear on health bars
4. Combat Unit Panel shows on selection
5. Stance buttons change unit behavior
6. Threat indicators show direction/distance
7. Threat radar displays blips
8. Combat log records events
9. Off-screen threat indicators point correctly
10. Tactical overview shows forces
11. Damage numbers float and fade
12. Keyboard shortcuts work

---

## Files to Create/Modify

**New Files:**
- `packages/renderer/src/combat/CombatHUDManager.ts`
- `packages/renderer/src/combat/HealthBarRenderer.ts`
- `packages/renderer/src/combat/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/combat/CombatUnitPanel.ts`
- `packages/renderer/src/combat/CombatLogRenderer.ts`
- `packages/renderer/src/combat/TacticalOverviewRenderer.ts`
- `packages/renderer/src/combat/StanceControls.ts`
- `packages/renderer/src/combat/types.ts`
- `packages/core/src/components/CombatUIStateComponent.ts`
- `packages/core/src/components/ThreatTrackingComponent.ts`

**Modified Files:**
- `packages/renderer/src/Renderer.ts` - Add combat UI to render loop
- `packages/renderer/src/index.ts` - Export combat classes
- `packages/core/src/index.ts` - Export new components
- `demo/src/main.ts` - Initialize combat UI

---

## Implementation Notes

**Follow ContextMenuManager Pattern:**
- Manager class with world/eventBus/camera/canvas
- Separate renderer classes for visuals
- Event listeners with cleanup
- State interfaces with type safety
- Destroy() method for lifecycle

**Critical Reminders:**
- Component type strings MUST use lowercase_with_underscores
- No silent fallbacks - crash on missing data
- No console.log debug statements
- Validate all constructor parameters
- Performance: Cull off-screen health bars
- Memory: Limit combat log to 100 events

---

## Handoff

✅ Work order is complete and ready for Test Agent

**Next Steps:**
1. Test Agent reads work order
2. Test Agent creates test plan
3. Implementation Agent receives work order + test plan
4. Implementation begins

---

**Attempt #507** - Work order file confirmed to exist at correct path.
