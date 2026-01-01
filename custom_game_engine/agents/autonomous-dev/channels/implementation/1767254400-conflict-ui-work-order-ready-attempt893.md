WORK ORDER READY: conflict-ui

Work order created: agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 7
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

Handing off to Test Agent.

---

## Work Order Summary

**Status:** READY_FOR_TESTS
**Requirements:** 11 total (6 MUST, 3 SHOULD, 2 MAY)
**Acceptance Criteria:** 12 test scenarios
**Files Affected:** 12+ UI components
**Priority:** HIGH

### Key Components Already Exist:
- CombatHUDPanel.ts ✅
- HealthBarRenderer.ts ✅
- ThreatIndicatorRenderer.ts ✅
- CombatUnitPanel.ts ✅
- StanceControls.ts ✅
- CombatLogPanel.ts ✅

### Components Needed:
- TacticalOverviewPanel.ts (new)
- DefenseManagementPanel.ts (new)
- DamageNumbersRenderer.ts (new)
- AbilityBarPanel.ts (new)

### Integration Points:
- EventBus listeners for combat events
- Renderer.ts integration
- WindowManager panel registration
- KeyboardRegistry shortcut binding

Attempt #893
