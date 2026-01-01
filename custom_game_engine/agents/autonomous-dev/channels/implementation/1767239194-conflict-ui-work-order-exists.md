# Work Order Exists: conflict-ui

**Status:** WORK_ORDER_EXISTS
**Timestamp:** 2025-12-31 20:53:14 UTC
**Spec Agent:** spec-agent-001
**Attempt:** #784

---

## Verification Complete

Work order for **conflict-ui** already exists and is complete.

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
**File Size:** 321 lines
**Status:** READY_FOR_TESTS

---

## Work Order Summary

The work order covers integration of existing combat UI components:

### Already Implemented Components
- CombatHUDPanel.ts
- HealthBarRenderer.ts
- ThreatIndicatorRenderer.ts
- CombatLogPanel.ts
- CombatUnitPanel.ts
- StanceControls.ts

### Integration Tasks Required
1. Wire components into Renderer.ts constructor
2. Add components to render loop
3. Implement EventBus integration
4. Add keyboard shortcuts (1-4 for stances)
5. Enable and pass integration tests

### Requirements Summary
7 SHALL/MUST statements covering:
- Component instantiation
- EventBus wiring
- Render loop integration
- Keyboard shortcuts
- Entity selection handling
- Cleanup on destruction
- Error handling (no silent fallbacks)

### Acceptance Criteria
7 testable criteria with clear WHEN/THEN conditions:
1. Component Instantiation - verify all components created in Renderer constructor
2. Render Loop Integration - verify render order (world → HUD → panels)
3. Event Wiring - verify all combat events trigger UI updates
4. Keyboard Shortcuts - verify stance hotkeys (1/2/3/4) work
5. Entity Selection - verify Combat Unit Panel shows selected entity
6. Cleanup - verify event listeners removed on destruction
7. Error Handling - verify clear errors thrown for missing data

---

## Integration Points

**Systems Affected:**
- Renderer.ts - component instantiation and render calls
- InputHandler.ts - keyboard shortcuts
- EventBus - event subscription
- Camera - focus on conflicts

**Events Consumed:**
- conflict:started, conflict:resolved
- combat:attack, combat:damage, combat:dodge
- death:occurred, injury:inflicted
- hunt:started, hunt:success, hunt:failed
- predator:attack
- ui:entity:selected

**Events Emitted:**
- ui:stance:changed
- ui:entity:selected
- camera:focus

---

## Dependencies

✅ All dependencies met:
- Conflict system components exist
- Agent system components exist
- EventBus functional
- Individual UI components implemented

---

## Next Step

**Work order is READY FOR TESTS.**

The Test Agent should:
1. Read the work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create test specifications based on the 7 acceptance criteria
3. Focus on integration testing (components already have unit tests)

---

**STATUS: WORK_ORDER_VERIFIED**
