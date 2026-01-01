# WORK ORDER READY: conflict-ui

**Timestamp:** 2025-12-31 20:46:12 UTC
**Attempt:** 837
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_IMPLEMENTATION

---

## Work Order Created

Work order file created at:
`custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Feature Details

- **Feature:** Conflict/Combat UI
- **Phase:** 7
- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Dependencies:** All met ✅

## Requirements Summary

The work order contains detailed specifications for:

1. **MUST (High Priority):**
   - Combat HUD overlay (REQ-COMBAT-001)
   - Health bar rendering (REQ-COMBAT-002)
   - Combat unit panel (REQ-COMBAT-003)
   - Stance controls (REQ-COMBAT-004)
   - Threat indicators (REQ-COMBAT-005)

2. **SHOULD (Medium Priority):**
   - Combat log panel (REQ-COMBAT-006)
   - Tactical overview (REQ-COMBAT-007)
   - Defense management (REQ-COMBAT-009)
   - Keyboard shortcuts (REQ-COMBAT-011)

3. **MAY (Low Priority):**
   - Ability bar (REQ-COMBAT-008)
   - Damage numbers (REQ-COMBAT-010)

## Existing Components

Several combat UI components **already exist** in the codebase:
- CombatHUDPanel.ts
- CombatUnitPanel.ts
- StanceControls.ts
- CombatLogPanel.ts
- HealthBarRenderer.ts
- ThreatIndicatorRenderer.ts

Implementation should focus on:
1. Verifying existing components work
2. Filling gaps (tactical view, defense management)
3. Integration with EventBus and game systems
4. Enhancement (off-screen threat indicators, etc.)

## Acceptance Criteria

The work order defines 12 specific acceptance criteria covering:
- Combat HUD activation/deactivation
- Health bar display and color coding
- Injury indicators
- Combat unit panel display
- Stance control updates
- Threat indicator rendering (on-screen and off-screen)
- Combat log events and filtering
- Tactical overview calculations
- Keyboard shortcuts

## Integration Points

- **EventBus:** Listen to combat:started, combat:ended, threat:detected, injury:inflicted, unit:death
- **Renderer:** Add combat UI panels to render loop
- **WindowManager:** Register combat panels
- **KeyboardRegistry:** Register combat shortcuts

## Files to Modify/Create

**Existing files to enhance:**
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts
- packages/renderer/src/CombatHUDPanel.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLogPanel.ts
- packages/renderer/src/Renderer.ts
- packages/renderer/src/WindowManager.ts
- packages/renderer/src/KeyboardRegistry.ts

**New files to create:**
- packages/renderer/src/TacticalOverviewPanel.ts
- packages/renderer/src/DefenseManagementPanel.ts
- packages/renderer/src/DamageNumbersRenderer.ts (optional)
- packages/renderer/src/AbilityBarPanel.ts (optional)

## Notes for Implementation

1. **No silent fallbacks** - Crash on missing data
2. **Component type names** - Use lowercase_with_underscores
3. **No console.log** - Use Agent Dashboard for debugging
4. **EventBus cleanup** - Always unsubscribe on unmount
5. **8-bit visual style** - Pixel-perfect rendering

## Handing Off

The work order is complete and ready for:
1. Test Agent to create test specifications
2. Implementation Agent to implement the features
3. Playtest Agent to verify functionality

---

**Next Steps:**
- Test Agent: Create test specifications
- Implementation Agent: Begin implementation
- Playtest Agent: Verify after implementation

**Work Order Status:** ✅ READY
