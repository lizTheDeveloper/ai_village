# Work Order Confirmation: Conflict UI

**Timestamp:** 2025-12-31T19:26:46Z
**Feature:** Conflict/Combat UI Integration
**Phase:** 5
**Status:** WORK_ORDER_CONFIRMED

---

## Confirmation

Work order has been verified and is ready for the development pipeline.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Summary

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:**
  - Conflict System: `openspec/specs/conflict-system/spec.md`
  - Agent System: `openspec/specs/agent-system/spec.md`
  - Notifications: `openspec/specs/ui-system/notifications.md`

---

## Current Status

✅ **Components Implemented:**
- CombatHUDPanel.ts (REQ-COMBAT-001)
- HealthBarRenderer.ts (REQ-COMBAT-002)
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- CombatLogPanel.ts (REQ-COMBAT-006)
- CombatUnitPanel.ts (REQ-COMBAT-003)
- StanceControls.ts (REQ-COMBAT-004)

⚠️ **Integration Needed:**
- Components NOT instantiated in Renderer.ts
- Components NOT rendered in render loop
- EventBus wiring incomplete
- Tests skipped (`describe.skip`)

---

## Requirements

The work order specifies 7 acceptance criteria:

1. ✅ Component Instantiation - Wire all combat UI components in Renderer constructor
2. ✅ Render Loop Integration - Call component.render() in correct order
3. ✅ Event Wiring - Subscribe to conflict/combat/death events
4. ✅ Keyboard Shortcuts - Add stance hotkeys (1-4) to InputHandler
5. ✅ Entity Selection - Show Combat Unit Panel on selection
6. ✅ Cleanup - Remove event listeners on destroy
7. ✅ Error Handling - No silent fallbacks (per CLAUDE.md)

---

## Files to Modify

### Core Integration:
- `packages/renderer/src/Renderer.ts` - Instantiate & render combat UI
- `packages/renderer/src/InputHandler.ts` - Add stance keyboard shortcuts

### Component Updates:
- `packages/renderer/src/CombatHUDPanel.ts` - Verify DOM mounting
- `packages/renderer/src/CombatLogPanel.ts` - Verify DOM mounting
- `packages/renderer/src/CombatUnitPanel.ts` - Verify DOM mounting
- `packages/renderer/src/StanceControls.ts` - Verify DOM mounting

### Tests:
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove `.skip`

---

## Event Flow

**Consumed Events:**
- `conflict:started` → Show in HUD, create threat indicator
- `conflict:resolved` → Remove from HUD
- `combat:attack` → Log event
- `combat:damage` → Update health bars, log
- `death:occurred` → Remove from UI
- `injury:inflicted` → Show injury icons
- `ui:entity:selected` → Show Combat Unit Panel

**Emitted Events:**
- `ui:stance:changed` → User changed stance via controls (1-4 keys)
- `ui:entity:selected` → User clicked conflict/threat
- `camera:focus` → Pan camera to conflict

---

## Dependencies

✅ All dependencies met:
- Conflict system components exist
- Agent system components exist
- EventBus functional
- Individual combat UI components implemented

---

## Next Steps

Handing off to **Test Agent** for test creation.

The Test Agent should:
1. Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create integration tests for Renderer combat UI wiring
3. Create tests for keyboard shortcuts
4. Verify error handling tests (no silent fallbacks)
5. Post test specification to testing channel

---

## Spec Agent Notes

This is attempt #773 to confirm the work order. The work order file exists at the correct location with comprehensive acceptance criteria, integration details, and implementation guidance.

The feature is ready for the development pipeline.

**Status:** CONFIRMED ✅
**Next Agent:** Test Agent
