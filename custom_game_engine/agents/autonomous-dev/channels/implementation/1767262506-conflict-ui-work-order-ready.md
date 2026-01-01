# WORK ORDER READY: conflict-ui

**Attempt:** #972
**Timestamp:** 2026-01-01T02:15:06Z
**Spec Agent:** spec-agent-001
**Status:** ✅ WORK ORDER CONFIRMED - READY FOR TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**File Status:** EXISTS (14.9 KB, 354 lines)
**Created:** 2025-12-31 (Attempt #903)
**Last Updated:** 2026-01-01 01:45 (Attempt #967)
**Verified:** 2026-01-01 02:15 (This attempt)

---

## Spec Information

**Primary Spec:** `openspec/specs/ui-system/conflict.md`
**Phase:** UI System (Phase 16)
**Feature:** Conflict/Combat UI

**Related Specs:**
- `openspec/specs/conflict-system/spec.md` - Combat mechanics
- `openspec/specs/agent-system/spec.md` - Agent stats
- `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Requirements Summary

**Total: 11 requirements**

**MUST (5) - Priority 1:**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bar rendering
3. REQ-COMBAT-003: Combat Unit Panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

**SHOULD (4) - Priority 2:**
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
9. REQ-COMBAT-009: Defense management
11. REQ-COMBAT-011: Keyboard shortcuts

**MAY (2) - Priority 3:**
8. REQ-COMBAT-008: Ability bar
10. REQ-COMBAT-010: Floating damage numbers

---

## Acceptance Criteria

Work order contains **8 detailed acceptance criteria** with:
- WHEN conditions
- THEN expected outcomes
- VERIFICATION methods

All criteria are testable and measurable.

---

## System Integration

### Existing Systems
| System | File | Integration Type |
|--------|------|-----------------|
| CombatHUDPanel | packages/renderer/src/CombatHUDPanel.ts | Extend/Update |
| HealthBarRenderer | packages/renderer/src/HealthBarRenderer.ts | Extend/Update |
| CombatUnitPanel | packages/renderer/src/CombatUnitPanel.ts | Extend/Update |
| StanceControls | packages/renderer/src/StanceControls.ts | Extend/Update |
| CombatLogPanel | packages/renderer/src/CombatLogPanel.ts | Extend/Update |
| ThreatIndicatorRenderer | packages/renderer/src/ThreatIndicatorRenderer.ts | Extend/Update |

### EventBus Integration

**Listens (8 events):**
- `conflict:started` - Combat HUD activation
- `conflict:resolved` - Combat HUD deactivation
- `agent:injured` - Injury display updates
- `agent:died` - Death handling
- `threat:detected` - Threat indicator creation
- `combat:attack` - Combat log entry
- `combat:damage` - Damage numbers, health bars
- `stance:changed` - Stance control updates

**Emits (5 events):**
- `combat:stance_change_requested` - User changes stance
- `combat:ability_used` - User activates ability
- `combat:target_selected` - User selects target
- `ui:combat_log_toggled` - Log visibility change
- `ui:tactical_view_toggled` - Tactical view toggle

### Components Needed

**None** - UI only, uses existing combat components from core package

---

## Dependencies Status

✅ **conflict-system/spec.md** - IMPLEMENTED (Phase 15)
✅ **agent-system/spec.md** - IMPLEMENTED (Core)
✅ **ui-system/notifications.md** - IMPLEMENTED (Phase 14)
✅ **EventBus** - Available
✅ **ActionQueue** - Available
✅ **Renderer** - Available
✅ **WindowManager** - Available

**All dependencies met. No blockers.**

---

## Files Modified/Created

### Existing Files to Extend
- `packages/renderer/src/CombatHUDPanel.ts` ✅
- `packages/renderer/src/HealthBarRenderer.ts` ✅
- `packages/renderer/src/CombatUnitPanel.ts` ✅
- `packages/renderer/src/StanceControls.ts` ✅
- `packages/renderer/src/CombatLogPanel.ts` ✅
- `packages/renderer/src/ThreatIndicatorRenderer.ts` ✅
- `packages/renderer/src/Renderer.ts` - Integration
- `packages/renderer/src/InputHandler.ts` - Keyboard shortcuts
- `packages/renderer/src/WindowManager.ts` - Panel management

### New Files to Create (Optional)
- `packages/renderer/src/TacticalOverviewPanel.ts` (SHOULD)
- `packages/renderer/src/DefenseManagementPanel.ts` (SHOULD)
- `packages/renderer/src/AbilityBarPanel.ts` (MAY)
- `packages/renderer/src/DamageNumberRenderer.ts` (MAY)

---

## Critical Implementation Notes

### 1. DO NOT RECREATE EXISTING CODE
Many combat UI components **already exist**. The implementation task is to:
- Verify existing components work correctly
- Wire them into the main renderer
- Extend functionality where needed
- Implement ONLY the missing panels

### 2. Component Type Naming
MUST use `lowercase_with_underscores`:
```typescript
// ✅ CORRECT
type = 'combat_hud';
type = 'stance_controls';
type = 'threat_indicator';

// ❌ WRONG
type = 'CombatHUD';
type = 'StanceControls';
```

### 3. Error Handling (Per CLAUDE.md)
**NO SILENT FALLBACKS**
- Throw errors for missing required components
- No default values that mask bugs
- Validate data at boundaries
- Crash early with clear error messages

### 4. Performance Requirements
- Health bars: <16ms for 50+ entities (60fps target)
- Combat log: Limit to 100 events maximum
- Use viewport culling for off-screen entities
- Cache player entity reference (90% reduction)
- Use filteredEntities parameter (96% reduction)

---

## Testing Integration

**Test file exists:**
`packages/renderer/src/__tests__/CombatUIIntegration.test.ts`

**Current status:** All tests skipped (`.skip`) with "Not implemented" markers

**Test coverage includes:**
- Full combat scenario integration
- Stance changes across multiple UI components
- Multi-entity selection coordination
- Performance under combat load
- Event bus coordination
- UI cleanup on conflict end
- Keyboard shortcut integration
- Camera focus integration
- Edge cases (10+ injuries, 20+ conflicts, 100+ log events)

---

## Handoff to Test Agent

The work order is **complete and comprehensive**. Test Agent should:

1. Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Review acceptance criteria (8 scenarios)
3. Review existing test file: `CombatUIIntegration.test.ts`
4. Create test plan for implementing the 8 acceptance criteria
5. Un-skip existing tests and implement them
6. Hand off to Implementation Agent

---

## Pipeline Status

✅ **Spec Analysis** - Complete
✅ **Work Order Creation** - Complete (this file)
✅ **Dependency Verification** - Complete
⏭️ **Next:** Test Agent creates test suite

---

## Summary

Work order for **Conflict/Combat UI** is ready for the development pipeline.

**Key Points:**
- 11 requirements (5 MUST, 4 SHOULD, 2 MAY)
- 8 acceptance criteria with detailed verification steps
- All dependencies met
- Existing UI components identified
- Integration strategy documented
- Performance targets specified
- Test file exists but needs implementation

**Handing off to Test Agent.**

**Spec Agent:** spec-agent-001
