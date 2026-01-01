# WORK ORDER READY: conflict-ui

**Timestamp:** 2025-12-31 20:47:11 UTC
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS
**Attempt:** #831

---

## Summary

Work order for Conflict/Combat UI feature has been verified and is complete.

---

## Work Order Location

`custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**File created:** 2025-12-31 20:40 UTC
**Status:** COMPLETE ✅

---

## Specifications Reviewed

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Supporting Specs:**
  - `openspec/specs/conflict-system/spec.md` (combat mechanics)
  - `openspec/specs/ui-system/notifications.md` (combat alerts)

---

## Requirements Summary (11 total)

### MUST Requirements (5)
1. Combat HUD overlay showing combat-relevant information
2. Visual health indicators (health bars)
3. Detailed combat unit panel
4. Combat stance controls (passive/defensive/aggressive/flee)
5. Visual threat indicators in world

### SHOULD Requirements (4)
6. Scrollable combat event log
7. Strategic tactical overview
8. Defense management (zones/patrols)
9. Keyboard shortcuts for combat actions

### MAY Requirements (2)
10. Floating combat damage numbers
11. Quick ability access bar

---

## Acceptance Criteria (12 detailed)

All criteria include WHEN/THEN/Verification pattern:
- Combat HUD activation on combat:started event
- Health bar display and color coding (green→yellow→red)
- Injury indicator rendering
- Combat unit panel stats display
- Stance control functionality
- Threat indicator positioning (on-screen and off-screen)
- Combat log event tracking and filtering
- Tactical overview force calculations
- Keyboard shortcut bindings

---

## System Integration

### Existing Components (Already Implemented)
- ✅ `CombatHUDPanel.ts` - Combat HUD overlay
- ✅ `HealthBarRenderer.ts` - Health bar rendering
- ✅ `ThreatIndicatorRenderer.ts` - Threat indicators
- ✅ `CombatUnitPanel.ts` - Unit detail panel
- ✅ `StanceControls.ts` - Stance selector
- ✅ `CombatLogPanel.ts` - Combat event log

### New Components Needed
- `TacticalOverviewPanel.ts` - Strategic combat view
- `DefenseManagementPanel.ts` - Zone/patrol management
- `DamageNumbersRenderer.ts` - Floating numbers (MAY)
- `AbilityBarPanel.ts` - Ability quick-access (MAY)

### Events to Listen
- `combat:started` - Activate combat HUD
- `combat:ended` - Deactivate combat HUD
- `threat:detected` - Add threat indicator
- `injury:inflicted` - Update health bars
- `unit:death` - Remove from combat tracking

---

## Implementation Priority

1. **HIGH PRIORITY (MUST):**
   - Verify existing components work with current game
   - Integrate CombatHUDPanel with combat events
   - Wire up StanceControls to update combat_stats component
   - Test event integration

2. **MEDIUM PRIORITY (SHOULD):**
   - Implement TacticalOverviewPanel
   - Add combat keyboard shortcuts
   - Implement DefenseManagementPanel

3. **LOW PRIORITY (MAY):**
   - Implement DamageNumbersRenderer
   - Implement AbilityBarPanel

---

## Dependencies Met

✅ EventBus system exists and is functional
✅ Combat system core mechanics implemented (AgentCombatSystem)
✅ Component system in place (combat_stats, needs, injury components)
✅ UI infrastructure exists (WindowManager, Renderer, KeyboardRegistry)
✅ Existing combat UI components partially implemented
✅ Spec is complete with clear requirements and acceptance criteria

---

## Handoff

Work order is complete and comprehensive. Ready for Test Agent to create test suite.

**Next Step:** Test Agent reads work order and creates test files based on acceptance criteria.

---

## Notes

- Many UI components already exist - implementation should focus on verification, integration, and filling gaps
- No silent fallbacks - crash on missing required data per project guidelines
- Follow existing patterns (see HealthBarRenderer for reference)
- Use lowercase_with_underscores for component type names
- No console.log debugging - use Agent Dashboard instead

---

spec-agent-001 signing off ✓
