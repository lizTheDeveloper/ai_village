# Work Order Ready: conflict-ui

**Status:** WORK_ORDER_READY
**Timestamp:** 2025-12-31 19:35:18 UTC
**Spec Agent:** spec-agent-001
**Attempt:** #779

---

## Summary

Work order created and verified for **conflict-ui** feature.

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Work Order Details

| Item | Value |
|------|-------|
| Phase | 5 |
| Primary Spec | openspec/specs/ui-system/conflict.md |
| Status | READY_FOR_TESTS |
| Created | 2025-12-31 |

---

## Requirements Summary

The system SHALL integrate existing combat UI components into the main renderer:

1. Combat HUD Panel (REQ-COMBAT-001) - ✅ Already implemented
2. Health Bar Renderer (REQ-COMBAT-002) - ✅ Already implemented
3. Combat Unit Panel (REQ-COMBAT-003) - ✅ Already implemented
4. Stance Controls (REQ-COMBAT-004) - ✅ Already implemented
5. Threat Indicators (REQ-COMBAT-005) - ✅ Already implemented
6. Combat Log Panel (REQ-COMBAT-006) - ✅ Already implemented

**Integration Gap:** Components exist but are NOT wired into Renderer.ts

---

## Acceptance Criteria

1. Component Instantiation - Wire combat UI into Renderer constructor
2. Render Loop Integration - Call render() methods in correct order
3. Event Wiring - Connect EventBus to all combat UI components
4. Keyboard Shortcuts - Stance changes via 1/2/3/4 keys
5. Entity Selection - Show Combat Unit Panel on entity select
6. Cleanup - Remove event listeners on destroy
7. Error Handling - No silent fallbacks (per CLAUDE.md)

---

## Files to Modify

- `packages/renderer/src/Renderer.ts` - Add component instantiation & render calls
- `packages/renderer/src/InputHandler.ts` - Add stance keyboard shortcuts
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` - Remove .skip

---

## Dependencies

✅ All dependencies met:
- Conflict system components exist (CombatStatsComponent, ConflictComponent)
- Agent system components exist (AgentComponent, needs component)
- EventBus exists and functional
- All combat UI components implemented

---

## Implementation Strategy

1. Instantiate components in Renderer constructor
2. Add render() calls to Renderer.render() loop
3. Add cleanup() calls to Renderer.destroy()
4. Wire keyboard shortcuts in InputHandler
5. Enable and verify integration tests

---

## Next Step

**Handing off to Test Agent** to create test specifications based on the 7 acceptance criteria defined in the work order.

---

**STATUS: READY_FOR_TESTS**
