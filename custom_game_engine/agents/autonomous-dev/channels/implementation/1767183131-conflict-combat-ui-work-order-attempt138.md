# CLAIMED: conflict-combat-ui

**Timestamp:** 2025-12-31T04:18:51Z
**Attempt:** #138
**Status:** ✅ WORK ORDER CONFIRMED

---

## Work Order Location

Work order created at:
`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Verification:**
- ✅ File exists (356 lines, 13,988 bytes)
- ✅ All required sections present
- ✅ Spec references validated
- ✅ System integration documented
- ✅ Acceptance criteria defined

---

## Feature Summary

**Phase:** 16 (Polish & Player UI)
**Feature:** Conflict/Combat UI System

**Primary Spec:** openspec/specs/ui-system/conflict.md
**Related Specs:**
  - openspec/specs/conflict-system/spec.md
  - openspec/specs/agent-system/spec.md
  - openspec/specs/ui-system/notifications.md

**Dependencies:** All met ✅

---

## Requirements Overview

### MUST Implement (Priority 1)
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bars for entities (REQ-COMBAT-002)
3. Combat Unit Panel (REQ-COMBAT-003)
4. Stance Controls (REQ-COMBAT-004)
5. Threat Indicators (REQ-COMBAT-005)

### SHOULD Implement (Priority 2)
6. Combat Log (REQ-COMBAT-006)
7. Tactical Overview (REQ-COMBAT-007)
9. Defense Management UI (REQ-COMBAT-009)
11. Keyboard Shortcuts (REQ-COMBAT-011)

### MAY Implement (Priority 3)
8. Ability Bar (REQ-COMBAT-008)
10. Floating Damage Numbers (REQ-COMBAT-010)

---

## New Components to Create

**Renderer Components:**
1. `CombatHUDPanel.ts` - Main combat overlay (screen space)
2. `HealthBarRenderer.ts` - Entity health bars (world space)
3. `CombatUnitPanel.ts` - Detailed unit info panel
4. `StanceControls.ts` - Combat stance buttons
5. `ThreatIndicatorRenderer.ts` - World threat markers
6. `CombatLogPanel.ts` - Scrollable event log
7. `TacticalOverviewPanel.ts` - Strategic map view
8. `FloatingNumberRenderer.ts` - Damage/heal numbers (optional)
9. `DefenseManagementPanel.ts` - Defense structures UI (optional)

**Modified Files:**
- `packages/renderer/src/Renderer.ts`
- `packages/renderer/src/WindowManager.ts`
- `packages/renderer/src/InputHandler.ts`
- `packages/renderer/src/MenuBar.ts`
- `packages/renderer/src/index.ts`
- `packages/core/src/events/EventMap.ts` (if new events needed)

---

## Integration Points

### EventBus Events

**Listens:**
- `combat:started` - Activate combat HUD
- `combat:ended` - Deactivate combat HUD
- `combat:attack` - Log attack event
- `combat:damage` - Show damage number, update health bar
- `combat:death` - Log death, show death indicator
- `combat:injury` - Show injury icon on health bar
- `combat:dodge` - Log dodge event
- `combat:block` - Log block event

**Emits:**
- `ui:stance:changed` - User changed unit stance
- `ui:combat:unit_selected` - User selected combat unit
- `ui:combat:hud_toggled` - Combat HUD toggled on/off
- `ui:combat:tactical_opened` - Tactical overview opened

### Component Access

**Read:**
- `ConflictComponent` - Active conflicts
- `CombatStatsComponent` - Combat stats and stance
- `InjuryComponent` - Active injuries
- `AgentComponent` - Agent data

**Write:**
- `CombatStatsComponent.stance` - When user changes stance

---

## Acceptance Criteria Summary

1. **Combat HUD activates** when combat begins
2. **Health bars display** when entity is in combat/injured/hovered
3. **Unit Panel shows details** when combat unit selected
4. **Stance controls work** and update agent behavior
5. **Threat indicators appear** for predators/hostiles
6. **Combat log populates** with chronological events
7. **Tactical overview opens** showing force summary
8. **Keyboard shortcuts respond** to stance/command keys

---

## Next Steps

**Handing off to Test Agent:**

The Test Agent should:
1. Read this work order in detail
2. Create comprehensive test suite covering all acceptance criteria
3. Write tests for each UI component
4. Write integration tests for EventBus interactions
5. Write tests for user interactions (stance changes, selection, etc.)
6. Verify no memory leaks from EventBus subscriptions
7. Test performance with 20+ entities in combat

---

## Notes for Test Agent

**Critical Testing Areas:**
- EventBus subscription/unsubscription (memory leak prevention)
- Coordinate space correctness (world vs screen space)
- Camera culling for health bars
- Stance change propagation to behavior system
- Combat log size limits (prevent unbounded growth)
- Performance with many simultaneous combat entities

**User Tips from Work Order:**
- Start with HealthBarRenderer (simplest component)
- Follow existing UI patterns (AgentInfoPanel.ts, BuildingPlacementUI.ts)
- Always store unsubscribers and call them in destroy()
- Test incrementally - one renderer at a time
- Test with 20+ units in combat for performance validation

---

**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS
**Created:** 2025-12-31T04:18:51Z

Handing off to Test Agent.
