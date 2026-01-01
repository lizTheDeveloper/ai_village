# Work Order Ready: conflict-ui

**Status:** WORK_ORDER_READY
**Timestamp:** 2025-12-31
**Spec Agent:** spec-agent-001
**Attempt:** #785

---

## Work Order Created

Work order for **conflict-ui** is complete and ready for the Test Agent.

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
**Phase:** 5 (UI Integration)
**Primary Spec:** [openspec/specs/ui-system/conflict.md](../../../../../openspec/specs/ui-system/conflict.md)

---

## Summary

The work order covers integration of existing combat UI components into the main Renderer.

### Components Already Implemented
- ✅ CombatHUDPanel.ts (REQ-COMBAT-001)
- ✅ HealthBarRenderer.ts (REQ-COMBAT-002)
- ✅ ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- ✅ CombatLogPanel.ts (REQ-COMBAT-006)
- ✅ CombatUnitPanel.ts (REQ-COMBAT-003)
- ✅ StanceControls.ts (REQ-COMBAT-004)

### Integration Tasks
1. Wire components into Renderer.ts constructor
2. Add components to render loop (correct order)
3. Implement EventBus event subscriptions
4. Add keyboard shortcuts for stance changes (1-4 keys)
5. Enable and pass integration tests

### Requirements (7 MUST/SHALL)
1. System SHALL instantiate all combat UI components in Renderer
2. System SHALL wire EventBus events to components
3. System SHALL render combat UI in correct order
4. System SHALL respond to keyboard shortcuts
5. System SHALL handle entity selection
6. System SHALL clean up event listeners on destruction
7. System MUST NOT use fallback values or silent errors

### Acceptance Criteria (7 testable)
1. Component Instantiation - all components created with dependencies
2. Render Loop Integration - correct render order verified
3. Event Wiring - combat events trigger UI updates
4. Keyboard Shortcuts - stance hotkeys (1/2/3/4) work
5. Entity Selection - Combat Unit Panel displays on selection
6. Cleanup - event listeners removed on destruction
7. Error Handling - clear errors for missing data

---

## Dependencies

✅ All dependencies are met:
- Conflict system components exist (CombatStatsComponent, ConflictComponent)
- Agent system components exist
- EventBus exists and is functional
- Individual UI components implemented (not yet integrated)

---

## Files Affected

### Core Integration
- `packages/renderer/src/Renderer.ts` - component instantiation and render calls
- `packages/renderer/src/InputHandler.ts` - keyboard shortcuts

### Tests
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - remove .skip

---

## Handing Off

**STATUS:** READY_FOR_TESTS

The Test Agent should:
1. Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create test specifications for 7 acceptance criteria
3. Focus on integration testing (unit tests exist)
4. Verify EventBus event flow
5. Verify render order correctness
6. Verify keyboard shortcut handling

---

**Spec Agent work complete. Test Agent may proceed.**
