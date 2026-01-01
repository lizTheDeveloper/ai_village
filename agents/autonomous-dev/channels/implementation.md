# CLAIMED: conflict-ui

**Attempt:** #909
**Date:** 2026-01-01
**Spec Agent:** spec-agent-001
**Status:** ✅ WORK ORDER VERIFIED - READY FOR TESTS

---

## Work Order Status

Work order **ALREADY EXISTS** and is comprehensive:

**File:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Size:** 512 lines
**Phase:** 16
**Created:** 2025-12-31 (Attempt #903)
**Last Updated:** 2025-12-31 23:50

---

## Verification Complete

Work order contains all required sections:

✅ **Spec Reference** - Primary and related specs linked
✅ **Requirements Summary** - 11 extracted SHALL/MUST/SHOULD/MAY statements
✅ **Acceptance Criteria** - 11 detailed criteria with WHEN/THEN/Verification
✅ **System Integration** - 6 existing systems mapped with integration types
✅ **New Components Needed** - Identified which exist vs need creation
✅ **Events** - Comprehensive EventBus integration (9 listens, 7 emits)
✅ **UI Requirements** - Detailed layouts, dimensions, colors, visual style
✅ **Files Likely Modified** - Complete file list (6 existing + 5 new)
✅ **Implementation Notes** - Integration strategy, performance, error handling
✅ **Playtest Notes** - UI behaviors, edge cases, performance testing
✅ **Dependencies** - All verified as met

---

## Spec Analysis

**Primary Spec:** `openspec/specs/ui-system/conflict.md`
- ✅ 11 requirements (REQ-COMBAT-001 through REQ-COMBAT-011)
- ✅ Clear MUST (5) / SHOULD (4) / MAY (2) priorities
- ✅ Complete TypeScript interfaces for all components
- ✅ Visual style specifications with exact colors/dimensions
- ✅ State management and event flows defined
- ✅ Integration with conflict-system types specified

**Related Specs:**
- ✅ `openspec/specs/conflict-system/spec.md` - Conflict mechanics referenced
- ✅ `openspec/specs/entities/agent.md` - Agent stats referenced
- ✅ `openspec/specs/ui-system/notifications.md` - Alerts referenced

---

## Existing Infrastructure

**Already Implemented (MUST VERIFY, NOT RECREATE):**
- `HealthBarRenderer.ts` - REQ-COMBAT-002 health bars ✅
- `ThreatIndicatorRenderer.ts` - REQ-COMBAT-005 threat indicators ✅
- Multiple combat components exist in packages/core

**To Be Implemented (if missing):**
- `CombatHUDPanel.ts` - REQ-COMBAT-001 combat HUD
- `CombatUnitPanel.ts` - REQ-COMBAT-003 unit details
- `StanceControlsPanel.ts` - REQ-COMBAT-004 stance UI
- `CombatLogPanel.ts` - REQ-COMBAT-006 event log
- `TacticalOverviewPanel.ts` - REQ-COMBAT-007 strategic view (SHOULD)
- `DefenseManagementPanel.ts` - REQ-COMBAT-009 defense UI (SHOULD)
- `AbilityBarPanel.ts` - REQ-COMBAT-008 abilities (MAY)
- `DamageNumbersRenderer.ts` - REQ-COMBAT-010 floating text (MAY)

---

## Integration Strategy

Per work order notes:

1. **VERIFY FIRST** - Check if components already exist
2. **INTEGRATE** - Wire existing renderers into main Renderer.ts
3. **IMPLEMENT MISSING** - Create panels that don't exist
4. **WIRE EVENTS** - Subscribe to conflict-system events
5. **TEST** - Verify all 11 acceptance criteria

---

## Dependencies Verified

- ✅ conflict-system/spec.md - IMPLEMENTED (Phase 15)
- ✅ agent-system/spec.md - IMPLEMENTED (Core)
- ✅ ui-system/notifications.md - IMPLEMENTED (Phase 14)
- ✅ EventBus - Available and functional
- ✅ Renderer - Main render loop exists
- ✅ Component system - ECS operational

---

## Critical Notes for Implementation Agent

### DO NOT RECREATE EXISTING CODE
HealthBarRenderer and ThreatIndicatorRenderer are **fully implemented**. Your task is to:
1. Verify they are integrated into Renderer.ts render loop
2. Test they work with conflict-system events
3. Implement ONLY the missing panels

### Component Type Names MUST Use lowercase_with_underscores
```typescript
// GOOD ✅
type = 'combat_hud';
type = 'stance_controls';
type = 'threat_detection';

// BAD ❌
type = 'CombatHUD';
type = 'StanceControls';
```

### Error Handling: NO SILENT FALLBACKS
Per CLAUDE.md:
- Throw errors for missing components
- No default values that mask bugs
- Validate required fields exist
- Crash early with clear messages

### Performance Optimizations
- HealthBarRenderer: Uses filteredEntities (96% reduction)
- ThreatIndicatorRenderer: Caches player entity (90% reduction)
- Combat log: Limit to maxEvents (default 100)
- Use viewport culling for off-screen entities

---

## Handoff to Test Agent

**Next Steps:**
1. Test Agent reads this work order
2. Creates test suite for 11 acceptance criteria
3. Writes integration tests for EventBus subscriptions
4. Creates UI behavior tests for each panel
5. Posts test results to testing channel

**Then:**
Implementation Agent implements based on test-driven approach.

---

## Status: ✅ READY FOR PIPELINE

Work order is comprehensive, dependencies verified, integration strategy clear.

**Work Order File:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

Pipeline can proceed to Test Agent → Implementation Agent → Playtest Agent.
