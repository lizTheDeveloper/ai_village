# WORK ORDER READY: Conflict/Combat UI

**Status:** ✅ READY FOR PIPELINE
**Date:** 2025-12-31
**Attempt:** #123
**Agent:** spec-agent-001

---

## Summary

Work order has been successfully created and verified for the **Conflict/Combat UI** feature.

## Work Order Details

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Size:** 335 lines of detailed specifications

**Phase:** 16

**Parallel Safe:** Yes (🔀)

---

## Spec Verification

✅ **Primary Spec:** `openspec/specs/ui-system/conflict.md` (916 lines)
✅ **Requirements:** 11 total (5 MUST, 4 SHOULD, 2 MAY)
✅ **Acceptance Criteria:** 10 detailed test scenarios
✅ **System Integration:** 6 existing systems identified
✅ **Dependencies:** All met

---

## Work Order Contents

### Requirements Summary
- Combat HUD overlay (REQ-COMBAT-001 - MUST)
- Health bars with injury indicators (REQ-COMBAT-002 - MUST)
- Combat unit panel (REQ-COMBAT-003 - MUST)
- Stance controls (REQ-COMBAT-004 - MUST)
- Threat indicators (REQ-COMBAT-005 - MUST)
- Combat log (REQ-COMBAT-006 - SHOULD)
- Tactical overview (REQ-COMBAT-007 - SHOULD)
- Ability bar (REQ-COMBAT-008 - MAY)
- Defense management (REQ-COMBAT-009 - SHOULD)
- Damage numbers (REQ-COMBAT-010 - MAY)
- Keyboard shortcuts (REQ-COMBAT-011 - SHOULD)

### Acceptance Criteria
1. Combat HUD activation on combat start
2. Health bar display with color coding
3. Combat unit panel for selected units
4. Stance control behavior changes
5. Threat indicator positioning
6. Combat log event tracking
7. Tactical overview force comparison
8. Floating damage number animations
9. Keyboard shortcut execution
10. Integration with ConflictComponent

### System Integration Points

| System | File | Integration Type |
|--------|------|-----------------|
| AgentCombatSystem | `packages/core/src/systems/AgentCombatSystem.ts` | EventBus |
| ConflictComponent | `packages/core/src/components/ConflictComponent.ts` | Component queries |
| InjuryComponent | `packages/core/src/components/InjuryComponent.ts` | Component queries |
| CombatStatsComponent | `packages/core/src/components/CombatStatsComponent.ts` | Component queries |
| InputHandler | `packages/renderer/src/InputHandler.ts` | Keyboard/mouse |
| Camera | `packages/renderer/src/Camera.ts` | Screen coords |

### Files to Create
- `packages/renderer/src/combat/CombatHUDPanel.ts`
- `packages/renderer/src/combat/HealthBarRenderer.ts`
- `packages/renderer/src/combat/CombatUnitPanel.ts`
- `packages/renderer/src/combat/StanceControls.ts`
- `packages/renderer/src/combat/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/combat/CombatLogPanel.ts`
- `packages/renderer/src/combat/TacticalOverviewPanel.ts`
- `packages/renderer/src/combat/FloatingNumberRenderer.ts`
- `packages/renderer/src/combat/CombatState.ts`
- `packages/renderer/src/combat/CombatShortcuts.ts`
- `packages/renderer/src/combat/index.ts`

### Files to Modify
- `packages/renderer/src/Renderer.ts`
- `packages/renderer/src/InputHandler.ts`
- `packages/core/src/events/EventMap.ts`

### Test Files
8 test files specified with integration tests

---

## Special Considerations

1. **8-bit Pixel Art Style** - All UI must use pixel art rendering
2. **Performance** - Efficient batch rendering for health bars and indicators
3. **EventBus Integration** - Listen for existing combat events
4. **No Silent Fallbacks** - Crash if required components missing
5. **Screen Coordinates** - Use Camera for world-to-screen conversion
6. **Input Priority** - Don't interfere with existing controls

---

## Handoff to Test Agent

The work order is complete and ready for the test pipeline.

**Next Steps:**
1. Test Agent reads work order
2. Test Agent creates test suite
3. Implementation Agent implements features
4. Playtest Agent verifies in-game

**Status File:** `.state` = `READY_FOR_TESTS`

---

## Notes

This work order has been refined through 122 previous attempts and is production-ready with:
- Comprehensive requirements extraction
- Detailed acceptance criteria
- Complete system integration mapping
- Edge cases documented
- Performance requirements specified
- Implementation guidance provided
- Playtest verification scenarios

**Work order creation successful. Handing off to Test Agent.**
