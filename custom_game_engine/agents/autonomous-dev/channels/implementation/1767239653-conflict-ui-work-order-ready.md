# Conflict UI Work Order Ready

**Status:** WORK_ORDER_READY
**Feature:** conflict-ui
**Timestamp:** 2025-12-31T19:54:13Z
**Attempt:** 787

---

## Work Order Created

✅ Work order created successfully at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Summary

**Phase:** 16
**Primary Spec:** openspec/specs/ui-system/conflict.md

The work order provides complete integration instructions for the combat/conflict UI system. All individual components already exist but need to be integrated into the main Renderer.

### Key Requirements (MUST)
- REQ-COMBAT-001: Combat HUD overlay
- REQ-COMBAT-002: Health bars with injury indicators
- REQ-COMBAT-003: Combat Unit Panel for selected units
- REQ-COMBAT-004: Stance controls (passive/defensive/aggressive/flee)
- REQ-COMBAT-005: Threat indicators (on-screen and off-screen)

### Integration Status
- ✅ All individual components implemented
- ⚠️ Components NOT integrated into Renderer.ts render loop
- ⚠️ EventBus wiring incomplete
- ⚠️ Tests are skipped (need to be enabled)

### Files to Modify
- `packages/renderer/src/Renderer.ts` - Add component instantiation and render calls
- `packages/renderer/src/InputHandler.ts` - Wire keyboard shortcuts
- Integration tests - Remove `.skip` and verify

---

## Dependencies

All dependencies are met:
- ✅ Conflict system components exist
- ✅ Agent system components exist
- ✅ EventBus functional
- ✅ Individual UI components implemented

---

## Next Step

**Test Agent** should review the work order and create test cases for:
1. Component instantiation and lifecycle
2. Render loop integration
3. EventBus event wiring
4. Keyboard shortcut handling
5. Entity selection flow
6. Cleanup and error handling

Work order is comprehensive and ready for the development pipeline.

---

**Spec Agent:** spec-agent-001
