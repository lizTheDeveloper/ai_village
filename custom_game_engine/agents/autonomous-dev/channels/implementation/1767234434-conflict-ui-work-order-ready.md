# WORK ORDER READY: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31 18:20:34 UTC
**Status:** READY_FOR_TESTS

---

## Summary

Work order created for conflict/combat UI integration feature.

**Work Order Location:**
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Feature Details

**Phase:** 5
**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Related Specs:**
- `openspec/specs/conflict-system/spec.md` - Conflict mechanics
- `openspec/specs/agent-system/spec.md` - Agent stats
- `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Current Status

### ✅ Components Implemented

All required combat UI components exist as source files:

1. **CombatHUDPanel.ts** - REQ-COMBAT-001 (Combat HUD overlay)
2. **HealthBarRenderer.ts** - REQ-COMBAT-002 (Health bars)
3. **ThreatIndicatorRenderer.ts** - REQ-COMBAT-005 (Threat indicators)
4. **CombatLogPanel.ts** - REQ-COMBAT-006 (Combat event log)
5. **CombatUnitPanel.ts** - REQ-COMBAT-003 (Selected unit details)
6. **StanceControls.ts** - REQ-COMBAT-004 (Combat stance buttons)

### ⚠️ Integration Required

Components are **NOT integrated** into main Renderer:
- Components exist in `packages/renderer/src/`
- Components are exported from `index.ts`
- Components are **NOT instantiated** in `Renderer.ts`
- Components are **NOT rendered** in render loop
- EventBus wiring incomplete
- Tests are skipped

---

## What Needs To Be Done

The **Implementation Agent** needs to:

1. ✅ Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. ⏳ Integrate components into `Renderer.ts`:
   - Instantiate all 6 components in constructor
   - Wire to EventBus
   - Add render calls to render loop
   - Add cleanup calls to destroy method
3. ⏳ Add keyboard shortcuts to `InputHandler.ts` (keys 1-4 for stances)
4. ⏳ Enable integration tests (remove `.skip` from test files)
5. ⏳ Verify all 7 acceptance criteria pass

---

## Dependencies Status

✅ **All dependencies met:**
- Conflict system components exist
- Agent system components exist
- EventBus exists and is functional
- Individual UI components implemented

**READY FOR INTEGRATION**

---

## Acceptance Criteria (7 total)

1. Component Instantiation - All UI components created with Renderer
2. Render Loop Integration - Components render in correct order
3. Event Wiring - UI updates on combat events
4. Keyboard Shortcuts - Stance hotkeys (1/2/3/4) work
5. Entity Selection - Combat Unit Panel shows on selection
6. Cleanup - Event listeners removed on destroy
7. Error Handling - Clear errors, no silent fallbacks

---

## Files To Modify

### Core Integration
- `packages/renderer/src/Renderer.ts` - Component instantiation & render calls
- `packages/renderer/src/InputHandler.ts` - Stance keyboard shortcuts

### Tests
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove `.skip`
- Verify existing component tests pass

---

## Notes

- **DOM vs Canvas:** Health bars/threats render to canvas, panels to DOM
- **Render Order:** Terrain → Entities → Health Bars → Threats → HUD → Panels
- **Error Handling:** Follow CLAUDE.md - NO silent fallbacks, throw clear errors
- **Performance:** Entity filtering already optimized in components

---

## Handoff

Handing off to **Test Agent** to create integration tests.

Then **Implementation Agent** will integrate components into Renderer.

Then **Playtest Agent** will verify in running game.

---

**Work order is complete and ready for next agent in pipeline.**
