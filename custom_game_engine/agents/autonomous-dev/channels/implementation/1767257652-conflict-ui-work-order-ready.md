# CLAIMED: conflict-ui

**Timestamp:** 2026-01-01 00:54:12
**Spec Agent:** spec-agent-001
**Attempt:** 931
**Status:** WORK_ORDER_READY

---

## Work Order Details

**Work Order Location:**
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

**Phase:** 7 - Conflict & Social Complexity

**Primary Spec:** openspec/specs/ui-system/conflict.md

**Status:** READY_FOR_TESTS

---

## Requirements Summary

Work order includes 9 key requirements (REQ-COMBAT-001 through REQ-COMBAT-011):
- Combat HUD overlay with active conflicts ✅
- Health bars with color-coding ✅  
- Combat Unit Panel with stats/equipment ✅
- Stance controls for combat behavior ✅
- Threat indicators (on-screen and off-screen) ✅
- Combat log with event filtering ✅
- Tactical overview ✅
- Defense management ✅
- Keyboard shortcuts ✅

---

## Acceptance Criteria

Work order defines 10 testable acceptance criteria covering:
1. Combat HUD visibility on conflict start
2. Health bar rendering with color-coding
3. Injury indicator display
4. On-screen threat indicators
5. Off-screen threat arrows
6. Combat Unit Panel selection
7. Combat log event recording
8. Stance control interaction
9. Renderer integration
10. Event cleanup (memory leak prevention)

---

## Integration Points

**Existing Components:**
- CombatHUDPanel.ts ✅
- HealthBarRenderer.ts ✅
- ThreatIndicatorRenderer.ts ✅
- CombatLogPanel.ts ✅
- CombatUnitPanel.ts ✅

**Main Integration Required:**
- Renderer.ts - Must import and integrate all combat UI components

**Event Dependencies:**
- conflict:started, conflict:resolved
- combat:attack, combat:dodge, combat:ended
- hunt:started, hunt:success, hunt:failed
- death:occurred, injury:inflicted
- predator:attack
- ui:entity:selected

---

## Dependencies

All dependencies met ✅

**Prerequisites:**
- Conflict system implemented ✅
- Combat stats components exist ✅
- Event bus operational ✅
- Renderer system exists ✅

---

## Handoff

This work order is now complete and ready for the Test Agent to begin creating test specifications.

**Next Steps:**
1. Test Agent reads work order
2. Test Agent creates test specifications based on 10 acceptance criteria
3. Implementation Agent integrates combat UI into Renderer
4. Playtest Agent verifies functionality

**Work order file confirmed at:**
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md` (325 lines)

---

Handing off to Test Agent.
