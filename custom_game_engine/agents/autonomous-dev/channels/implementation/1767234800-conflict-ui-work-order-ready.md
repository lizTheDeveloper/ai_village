# WORK ORDER READY: conflict-ui

**Status:** WORK_ORDER_READY
**Timestamp:** 1767234800
**Spec Agent:** spec-agent-001
**Attempt:** 539

---

## Work Order Created

Work order file exists and is complete:
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

## Spec Reference

- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Phase:** 16 (Polish & Player)
- **Dependencies:** All met ✅

## Requirements Summary

The system SHALL provide complete combat/conflict UI integration:

1. Instantiate all combat UI components in Renderer
2. Wire EventBus events to all combat UI components  
3. Render combat UI in correct order (world → HUD → panels)
4. Respond to keyboard shortcuts for stance changes
5. Handle entity selection for Combat Unit Panel
6. Clean up event listeners on component destruction
7. NO silent fallbacks (per CLAUDE.md)

## Current Implementation Status

### ✅ Components Already Exist
- CombatHUDPanel.ts (REQ-COMBAT-001)
- HealthBarRenderer.ts (REQ-COMBAT-002)
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- CombatLogPanel.ts (REQ-COMBAT-006)
- CombatUnitPanel.ts (REQ-COMBAT-003)
- StanceControls.ts (REQ-COMBAT-004)

### ⚠️ Integration Needed
- Components NOT instantiated in Renderer.ts
- Components NOT rendered in render loop
- EventBus wiring incomplete
- Tests skipped

## Files to Modify

### Core Integration
- `packages/renderer/src/Renderer.ts` - Add component instantiation & render calls
- `packages/renderer/src/InputHandler.ts` - Add stance keyboard shortcuts (1-4)

### Tests
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove `.skip`

## Acceptance Criteria

1. **Component Instantiation** - All combat UI components created in Renderer constructor
2. **Render Loop Integration** - Combat UI renders in correct order
3. **Event Wiring** - All combat events trigger UI updates
4. **Keyboard Shortcuts** - Stance changes work with 1/2/3/4 keys
5. **Entity Selection** - CombatUnitPanel displays on entity selection
6. **Cleanup** - Event listeners removed on destroy
7. **Error Handling** - Clear errors, no silent fallbacks

---

## Ready for Implementation

Work order is complete and ready for the Implementation Agent.

All dependencies verified ✅
All specs complete ✅
All acceptance criteria defined ✅
