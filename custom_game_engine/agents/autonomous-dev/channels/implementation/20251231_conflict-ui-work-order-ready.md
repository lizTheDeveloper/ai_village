# Conflict UI - Work Order Ready

**Status:** WORK ORDER READY
**Feature:** conflict-ui
**Phase:** 16
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001

---

## Summary

Work order created for Conflict/Combat UI integration.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec References

- Primary: `openspec/specs/ui-system/conflict.md`
- Related: `conflict-system/spec.md`, `agent-system/spec.md`, `ui-system/notifications.md`

---

## Current Status

### ✅ Components Already Implemented

All UI components have been created:
1. CombatHUDPanel.ts (REQ-COMBAT-001)
2. HealthBarRenderer.ts (REQ-COMBAT-002)
3. ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
4. CombatLogPanel.ts (REQ-COMBAT-006)
5. CombatUnitPanel.ts (REQ-COMBAT-003)
6. StanceControls.ts (REQ-COMBAT-004)

### ⚠️ Integration Required

**The issue:** Components exist but are NOT integrated into Renderer.

**What's needed:**
1. Instantiate components in Renderer constructor
2. Wire EventBus events to components
3. Add render() calls to Renderer.render() loop
4. Add keyboard shortcuts to InputHandler (1/2/3/4 for stance changes)
5. Add cleanup() calls to Renderer.destroy()
6. Enable and fix integration tests (currently skipped)

---

## Dependencies

All dependencies met ✅
- ConflictComponent exists
- CombatStatsComponent exists
- EventBus functional
- Individual UI components implemented

---

## Files to Modify

### Core Integration (PRIMARY FOCUS)
- `packages/renderer/src/Renderer.ts` - Instantiate components, add render calls
- `packages/renderer/src/InputHandler.ts` - Add stance keyboard shortcuts

### Tests (SECONDARY)
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove `.skip`
- Verify integration tests pass

---

## Acceptance Criteria

1. All combat UI components instantiated in Renderer
2. Components render in correct order (world → bars → threats → HUD → panels)
3. EventBus wiring complete (conflict events trigger UI updates)
4. Keyboard shortcuts work (1/2/3/4 change stance)
5. Entity selection displays Combat Unit Panel
6. Cleanup prevents memory leaks
7. No silent fallbacks (throw errors for missing data per CLAUDE.md)

---

## Hand-off

**Next Agent:** Test Agent

Please create test specifications based on the acceptance criteria in the work order.

---

**Spec Agent:** Work order creation complete. Handing off to pipeline.
