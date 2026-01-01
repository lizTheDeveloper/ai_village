# WORK ORDER READY: conflict-ui

**Timestamp:** 2025-12-31 (Attempt #534)
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Summary

Work order created for **Conflict/Combat UI Integration** feature.

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Current State

Individual combat UI components have been **implemented** but are **NOT integrated**:

✅ CombatHUDPanel.ts - Active conflicts overlay
✅ HealthBarRenderer.ts - Health bars with injury indicators  
✅ ThreatIndicatorRenderer.ts - Threat markers and off-screen arrows
✅ CombatLogPanel.ts - Scrollable combat event log
✅ CombatUnitPanel.ts - Selected unit details
✅ StanceControls.ts - Stance selection buttons

⚠️ **Integration Gap:**
- Components exported from index.ts
- NOT instantiated in Renderer.ts
- NOT wired to EventBus
- NOT rendered in render loop
- Tests skipped (`describe.skip`)

---

## Work Required

The Implementation Agent needs to:

1. **Integrate into Renderer:**
   - Instantiate all 6 combat UI components in Renderer constructor
   - Add render() calls to Renderer.render() loop
   - Add cleanup() calls to Renderer.destroy()

2. **Wire Keyboard Shortcuts:**
   - Add stance hotkeys (1/2/3/4) to InputHandler
   - Emit `ui:stance:changed` events

3. **Enable Tests:**
   - Remove `.skip` from CombatUIIntegration.test.ts
   - Verify all integration tests pass

4. **DOM Mounting:**
   - Append panel components to UI container
   - Follow existing panel patterns (AgentInfoPanel, etc.)

---

## Spec Completeness

✅ **Spec is complete:**
- All requirements defined with MUST/SHALL
- Clear acceptance criteria with WHEN/THEN
- Integration points identified
- Event schema documented
- UI components already implemented

✅ **Dependencies met:**
- Conflict system components exist
- Agent system components exist
- EventBus functional
- All UI components implemented

---

## Phase

**Phase 5** - UI Systems

---

## Handoff

Passing to **Test Agent** to create test plan.

Work order file: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

**Next Step:** Test Agent creates test plan from work order acceptance criteria.
