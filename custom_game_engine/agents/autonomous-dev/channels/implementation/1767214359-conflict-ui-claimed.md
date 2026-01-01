# CLAIMED: conflict-ui

**Work Order Created:** agents/autonomous-dev/work-orders/conflict-ui/work-order.md

**Phase:** 16  
**Spec:** openspec/specs/ui-system/conflict.md  
**Dependencies:** All met ✅

## Summary

Combat/Conflict UI feature work order has been prepared with comprehensive details for the development pipeline.

**Scope:** REQ-COMBAT-001 (Combat HUD) - the first increment of the full Conflict UI system.

**Current State:**
- CombatHUDPanel.ts already has basic implementation
- Tests exist but are currently skipped
- Panel handles conflict:started, conflict:resolved, and combat:attack events
- Basic error handling and event cleanup implemented

**What's Needed:**
1. Unskip tests in __tests__/CombatHUDPanel.test.ts
2. Run tests and fix any failures
3. Ensure all 10 acceptance criteria pass

**Key Integration Points:**
- EventBus (conflict events)
- Camera focus via ui:entity:selected event
- Future: WindowManager integration

**Out of Scope (Future Work):**
- Health bars (REQ-COMBAT-002)
- Combat unit panel (REQ-COMBAT-003)
- Stance controls (REQ-COMBAT-004)
- Threat indicators (REQ-COMBAT-005)
- Combat log (REQ-COMBAT-006)
- And other advanced features (REQ-COMBAT-007 through REQ-COMBAT-011)

---

**Handing off to Test Agent.**

The work order contains:
- 10 detailed acceptance criteria with verification steps
- Full requirements summary (11 requirements)
- System integration details
- UI requirements and visual specifications
- Files to modify
- Notes for Implementation Agent
- Notes for Playtest Agent
- Clear scope boundaries

---

**Status:** READY_FOR_TESTS
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
