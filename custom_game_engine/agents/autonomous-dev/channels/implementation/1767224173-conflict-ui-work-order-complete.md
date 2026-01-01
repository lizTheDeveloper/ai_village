# WORK ORDER COMPLETE: conflict-ui

**Timestamp:** 1767224173
**Agent:** spec-agent-001
**Feature:** Conflict/Combat UI
**Phase:** UI Implementation
**Status:** READY_FOR_TESTS

---

## Work Order Created

✅ Work order file created at:
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

---

## Spec Summary

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Related Specs:**
- `openspec/specs/conflict-system/spec.md` - Conflict mechanics
- `openspec/specs/agent-system/spec.md` - Agent stats
- `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Requirements Overview

### MUST Requirements (Priority 1):
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bars for entities (REQ-COMBAT-002)
3. Combat Unit Panel (REQ-COMBAT-003)
4. Stance Controls (REQ-COMBAT-004)
5. Threat Indicators (REQ-COMBAT-005)

### SHOULD Requirements (Priority 2):
6. Combat Log (REQ-COMBAT-006)
7. Tactical Overview (REQ-COMBAT-007)
8. Defense Management (REQ-COMBAT-009)
9. Keyboard Shortcuts (REQ-COMBAT-011)

### MAY Requirements (Priority 3):
10. Ability Bar (REQ-COMBAT-008)
11. Floating Numbers (REQ-COMBAT-010)

---

## Existing Components Found

The following UI files already exist in the codebase:
- ✅ `packages/renderer/src/CombatHUDPanel.ts`
- ✅ `packages/renderer/src/CombatLogPanel.ts`
- ✅ `packages/renderer/src/CombatUnitPanel.ts`
- ✅ `packages/renderer/src/HealthBarRenderer.ts`
- ✅ `packages/renderer/src/StanceControls.ts`
- ✅ `packages/renderer/src/ThreatIndicatorRenderer.ts`

These need enhancement/completion rather than creation from scratch.

---

## Integration Points Identified

### Systems:
- **Conflict System** - Event subscriptions for combat events
- **EventBus** - conflict:started, conflict:resolved, injury:inflicted
- **Selection System** - Unit selection state
- **Camera System** - Focus on combat locations
- **ECS** - Health, combat stats components

### Events to Consume:
- `conflict:started`
- `conflict:resolved`
- `combat:attack`
- `injury:inflicted`
- `entity:death`
- `threat:detected`

### Events to Emit:
- `combat:stance_changed`
- `combat:ability_used`
- `combat:focus_requested`

---

## Acceptance Criteria (10 Total)

1. Combat HUD shows active conflicts
2. Health bars render with color transitions
3. Unit Panel displays stats/equipment/injuries
4. Stance controls update behavior
5. Threat indicators appear for hostiles
6. Combat log records events
7. Tactical overview shows force summary
8. Injuries display on health bars
9. Conflict resolutions appear in log
10. Defense zones render with assignments

---

## Files to Modify

### Enhance Existing:
- CombatHUDPanel.ts
- CombatLogPanel.ts
- CombatUnitPanel.ts
- HealthBarRenderer.ts
- StanceControls.ts (check if exists, create if not)
- ThreatIndicatorRenderer.ts

### Create New (Lower Priority):
- TacticalOverviewPanel.ts (SHOULD)
- DefenseZoneRenderer.ts (SHOULD)
- FloatingNumberRenderer.ts (MAY)
- AbilityBarWidget.ts (MAY)

### Integration:
- Renderer.ts - Register overlays
- WindowManager.ts - Register panels
- main.ts - Keyboard bindings

---

## Complexity Assessment

**Complexity:** HIGH
**Reason:** Multiple interconnected UI components, event handling, performance optimization for 100+ entities

**Estimated Time:** 15-20 hours

**Priority:** HIGH (combat is core gameplay mechanic)

---

## Dependencies Met

✅ All blocking tasks completed
✅ Conflict system spec exists
✅ Agent system spec exists
✅ UI foundation in place

---

## Next Steps

This work order is now **READY_FOR_TESTS**.

**Test Agent** should:
1. Review the work order
2. Create test plan based on 10 acceptance criteria
3. Verify existing UI components for test coverage
4. Generate test stubs if needed
5. Post test plan to implementation channel

---

## Notes

- The feature name is "conflict-ui" (matching work order directory)
- Roadmap status already set to 🚧 (in progress)
- Work order is comprehensive with detailed UI requirements
- Existing combat UI files provide starting point
- No spec issues found - all requirements clear

---

**Status:** WORK ORDER COMPLETE
**Hand-off to:** Test Agent
**Attempt:** #474
