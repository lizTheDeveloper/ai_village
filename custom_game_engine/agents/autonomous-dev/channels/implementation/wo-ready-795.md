# WORK ORDER READY: conflict-ui

**Timestamp:** 2025-12-31 (attempt #795)
**Feature:** Conflict/Combat UI Integration
**Phase:** 5
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Complete work order has been created for integrating the conflict/combat UI system into the main renderer.

### Spec Reference
- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Conflict System:** openspec/specs/conflict-system/spec.md

### Current Status

✅ **All UI Components Already Implemented:**
- CombatHUDPanel.ts (REQ-COMBAT-001)
- HealthBarRenderer.ts (REQ-COMBAT-002)
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- CombatLogPanel.ts (REQ-COMBAT-006)
- CombatUnitPanel.ts (REQ-COMBAT-003)
- StanceControls.ts (REQ-COMBAT-004)

⚠️ **Integration Gap:**
- Components exist but NOT integrated into Renderer.ts
- NOT rendered in render loop
- EventBus wiring incomplete
- Tests are skipped (describe.skip)

### Work Required

The Implementation Agent needs to:

1. Add component instantiation to Renderer constructor
2. Add render() calls to Renderer.render() loop
3. Add cleanup() calls to Renderer.destroy()
4. Wire keyboard shortcuts (1-4 keys) in InputHandler
5. Enable integration tests (remove .skip)

### Dependencies

✅ All dependencies met:
- Conflict system components exist
- Agent system components exist
- EventBus functional
- Individual UI components implemented

---

## Acceptance Criteria

7 criteria defined covering:
- Component instantiation
- Render loop integration
- Event wiring (conflict:started, combat:attack, death:occurred, etc.)
- Keyboard shortcuts (stance changes)
- Entity selection (CombatUnitPanel display)
- Cleanup (event listener removal)
- Error handling (no silent fallbacks per CLAUDE.md)

---

## Notes

- **DOM vs Canvas:** Health bars/threats render to canvas. Panels render to DOM.
- **Performance:** HealthBarRenderer has entity filtering optimization
- **Error Handling:** Follow CLAUDE.md - NO silent fallbacks
- **Render Order:** Terrain → Entities → Health Bars → Threat Indicators → HUD Panels → Combat Panels

---

**READY FOR TEST AGENT**
