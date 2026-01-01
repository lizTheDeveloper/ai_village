# WORK ORDER READY: conflict-ui

**Timestamp:** 1767244929
**Attempt:** 833
**Phase:** 7
**Status:** READY_FOR_IMPLEMENTATION

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Verified

- **Primary Spec:** openspec/specs/ui-system/conflict.md ✅
- **Dependencies Met:**
  - conflict-system/spec.md (combat mechanics) ✅
  - agent-system/spec.md (agent stats) ✅
  - ui-system/notifications.md (combat alerts) ✅

---

## Requirements Summary

11 requirements extracted from spec:
- 5 MUST requirements (REQ-COMBAT-001 through REQ-COMBAT-005)
- 4 SHOULD requirements (REQ-COMBAT-006, 007, 009, 011)
- 2 MAY requirements (REQ-COMBAT-008, 010)

---

## Acceptance Criteria

12 testable acceptance criteria defined covering:
- Combat HUD activation/deactivation
- Health bar rendering and color coding
- Injury indicators
- Combat unit panel display
- Stance controls
- Threat indicators (on-screen and off-screen)
- Combat log event tracking and filtering
- Tactical overview
- Keyboard shortcuts

---

## System Integration

### Existing Components Found
- ✅ CombatHUDPanel.ts
- ✅ CombatUnitPanel.ts
- ✅ StanceControls.ts
- ✅ CombatLogPanel.ts
- ✅ HealthBarRenderer.ts
- ✅ ThreatIndicatorRenderer.ts

### New Components Needed
- TacticalOverviewPanel.ts
- DefenseManagementPanel.ts
- DamageNumbersRenderer.ts (optional)
- AbilityBarPanel.ts (optional)

---

## EventBus Integration

**Listens to:**
- combat:started
- combat:ended
- threat:detected
- injury:inflicted
- unit:death

**Emits:** None (UI layer is consumer only)

---

## Implementation Priority

1. **HIGH:** Verify existing combat UI components work
2. **HIGH:** Integrate combat HUD with EventBus
3. **HIGH:** Wire stance controls to combat_stats component
4. **MEDIUM:** Implement tactical overview
5. **MEDIUM:** Add keyboard shortcuts
6. **LOW:** Floating damage numbers and ability bar

---

## Notes for Implementation Agent

- Many components already exist - focus on verification and integration
- Follow error handling guidelines: NO SILENT FALLBACKS
- Component type names: lowercase_with_underscores
- No console.log debugging - use Agent Dashboard
- 8-bit visual style: pixel-perfect rendering

---

## Handing Off

**Next Agent:** Test Agent → Implementation Agent
**Work Order Status:** COMPLETE AND READY
**All Dependencies:** MET ✅

Implementation Agent should begin by:
1. Reading work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Verifying existing components
3. Running existing combat UI to identify gaps
4. Implementing missing features per priority order
