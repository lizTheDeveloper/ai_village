# WORK ORDER READY: conflict-ui

**Timestamp:** 2025-12-31 20:57:10
**Attempt:** 828
**Spec Agent:** spec-agent-001

---

## Summary

Work order for conflict/combat-ui has been created and verified.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Details

- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Phase:** 7
- **Dependencies:** All met ✅
  - conflict-system/spec.md (combat mechanics)
  - agent-system/spec.md (agent stats)
  - ui-system/notifications.md (combat alerts)

---

## Requirements

The work order includes 11 main requirements:

1. **REQ-COMBAT-001** (MUST): Combat HUD overlay
2. **REQ-COMBAT-002** (MUST): Health bars with injury indicators
3. **REQ-COMBAT-003** (MUST): Combat unit detail panel
4. **REQ-COMBAT-004** (MUST): Stance controls (passive/defensive/aggressive/flee)
5. **REQ-COMBAT-005** (MUST): Threat indicators with off-screen arrows
6. **REQ-COMBAT-006** (SHOULD): Combat log with filtering
7. **REQ-COMBAT-007** (SHOULD): Tactical overview with force summary
8. **REQ-COMBAT-008** (MAY): Ability bar for quick access
9. **REQ-COMBAT-009** (SHOULD): Defense management with zones/patrols
10. **REQ-COMBAT-010** (MAY): Floating damage numbers
11. **REQ-COMBAT-011** (SHOULD): Keyboard shortcuts

---

## Existing Components

Several combat UI components **already exist** in the codebase:

✅ `CombatHUDPanel.ts` - Combat HUD overlay
✅ `CombatUnitPanel.ts` - Unit detail panel
✅ `StanceControls.ts` - Stance selector
✅ `CombatLogPanel.ts` - Combat event log
✅ `HealthBarRenderer.ts` - Health bar rendering
✅ `ThreatIndicatorRenderer.ts` - Threat indicators

**Implementation focus:** Verify, integrate, and enhance existing components.

---

## Acceptance Criteria

The work order includes 12 detailed acceptance criteria covering:

- Combat HUD activation on combat events
- Health bar visibility and color coding
- Injury indicator rendering
- Combat unit panel stats display
- Stance control functionality
- Threat indicator positioning (on-screen and off-screen)
- Combat log event recording and filtering
- Tactical overview force calculations
- Keyboard shortcut bindings

---

## Files to Modify

**Existing files to enhance:**
- packages/renderer/src/CombatHUDPanel.ts
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLogPanel.ts

**New files to create:**
- packages/renderer/src/TacticalOverviewPanel.ts
- packages/renderer/src/DefenseManagementPanel.ts
- packages/renderer/src/DamageNumbersRenderer.ts
- packages/renderer/src/AbilityBarPanel.ts

**Integration points:**
- packages/renderer/src/Renderer.ts (add to render loop)
- packages/renderer/src/WindowManager.ts (register panels)
- packages/renderer/src/KeyboardRegistry.ts (combat shortcuts)

---

## Next Steps

This work order is now READY for the Test Agent to:

1. Review acceptance criteria
2. Design test cases
3. Create test implementation plan
4. Hand off to Implementation Agent

---

## Status

✅ Work order created
✅ Spec verified complete
✅ Dependencies checked
✅ Integration points identified
✅ Existing components catalogued

**Ready for Test Agent review.**
