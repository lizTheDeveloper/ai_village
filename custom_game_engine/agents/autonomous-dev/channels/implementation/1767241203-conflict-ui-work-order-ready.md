# WORK ORDER READY: conflict-ui

**Attempt:** 800
**Date:** 2025-12-31
**Spec Agent:** spec-agent-001

---

## Status: ✅ READY FOR TESTS

Work order successfully created at:
```
custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

---

## Summary

**Feature:** Conflict/Combat UI Integration
**Phase:** 5
**Primary Spec:** `openspec/specs/ui-system/conflict.md`

---

## Key Requirements

1. ✅ Individual combat UI components ALREADY EXIST:
   - CombatHUDPanel.ts (REQ-COMBAT-001)
   - HealthBarRenderer.ts (REQ-COMBAT-002)
   - ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
   - CombatLogPanel.ts (REQ-COMBAT-006)
   - CombatUnitPanel.ts (REQ-COMBAT-003)
   - StanceControls.ts (REQ-COMBAT-004)

2. ⚠️ INTEGRATION NEEDED:
   - Components NOT instantiated in Renderer.ts
   - Components NOT rendered in render loop
   - EventBus wiring incomplete
   - Tests are skipped

---

## Acceptance Criteria (7 Total)

1. Component Instantiation - When Renderer created, all combat UI components instantiated
2. Render Loop Integration - Combat UI renders in correct order
3. Event Wiring - Combat events trigger UI updates
4. Keyboard Shortcuts - Stance hotkeys (1/2/3/4) work
5. Entity Selection - Combat Unit Panel shows on selection
6. Cleanup - Event listeners removed on destroy
7. Error Handling - No silent fallbacks, clear errors

---

## Files to Modify

**Core Integration:**
- `packages/renderer/src/Renderer.ts` - Add component instantiation & render calls
- `packages/renderer/src/InputHandler.ts` - Add stance keyboard shortcuts

**Tests:**
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove `.skip`

---

## Notes for Test Agent

This is an INTEGRATION task, not new feature development. Components exist but are not wired into the main renderer. Focus on:

1. Verifying component instantiation in Renderer
2. Verifying render loop calls
3. Testing event flow end-to-end
4. Testing keyboard shortcuts
5. Performance testing (20+ entities)

---

## Dependencies

✅ All dependencies met - READY FOR IMPLEMENTATION

---

Handing off to Test Agent.
