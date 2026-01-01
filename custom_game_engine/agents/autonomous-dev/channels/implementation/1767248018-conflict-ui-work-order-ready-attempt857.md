# WORK ORDER READY: conflict-ui

**Timestamp:** 1767248018 (2025-12-31)
**Attempt:** #857
**Agent:** spec-agent-001
**Feature:** conflict-ui
**Status:** ✅ WORK_ORDER_VERIFIED

---

## Summary

The work order for **conflict-ui** has been verified and is ready for the pipeline.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Feature Overview

Implement comprehensive Combat/Conflict UI system with:
- Combat HUD overlay showing active conflicts and threats
- Health bars with injury indicators
- Threat indicators (on-screen and off-screen)
- Combat unit panel with detailed stats
- Stance controls for combat behavior
- Combat log for event history
- Tactical overview for strategic planning
- Defense management for structures and zones

---

## Requirements

### MUST (Priority 1) - 6 Requirements
1. **REQ-COMBAT-001:** Combat HUD overlay
2. **REQ-COMBAT-002:** Health bar display with injury indicators
3. **REQ-COMBAT-003:** Combat unit panel with detailed stats
4. **REQ-COMBAT-004:** Stance controls (passive/defensive/aggressive/flee)
5. **REQ-COMBAT-005:** Threat indicators (on-screen + off-screen arrows)

### SHOULD (Priority 2) - 4 Requirements
6. **REQ-COMBAT-006:** Combat log with scrollable event history
7. **REQ-COMBAT-007:** Tactical overview with battle prediction
9. **REQ-COMBAT-009:** Defense management (structures/zones/patrols)
11. **REQ-COMBAT-011:** Keyboard shortcuts for combat actions

### MAY (Optional) - 2 Requirements
8. **REQ-COMBAT-008:** Ability bar for quick access
10. **REQ-COMBAT-010:** Floating damage numbers

---

## Implementation Strategy

### Phase 1: Core Visualization (MUST)
1. Enhance HealthBarRenderer - Add injury icon rendering
2. Enhance ThreatIndicatorRenderer - Add severity color coding
3. Create CombatHUDRenderer - Track active conflicts and threats
4. Create CombatUnitPanelRenderer - Display detailed unit stats
5. Create StanceControlsRenderer - Stance selection UI

### Phase 2: Combat Management (SHOULD)
6. Create CombatLogRenderer - Event history with filtering
7. Create TacticalOverviewRenderer - Strategic battle view
8. Create DefenseManagementRenderer - Structures/zones/patrols
9. Implement keyboard shortcuts

### Phase 3: Advanced Features (MAY)
10. Create AbilityBarRenderer (optional)
11. Create DamageNumbersRenderer (optional)

---

## EventBus Integration

### Listening to Events (8)
- `conflict:started` - Activate combat HUD, show threats
- `conflict:resolved` - Clear threats, log resolution
- `death:occurred` - Remove threats, log death
- `agent:damaged` - Update health bars, show damage numbers
- `agent:healed` - Update health bars
- `injury:inflicted` - Show injury indicators
- `stance:changed` - Update stance controls
- `guard:assigned` - Update defense management

### Emitting Events (4)
- `combat_hud:activated` - Combat HUD shown
- `combat_hud:deactivated` - Combat HUD hidden
- `stance:set` - Player changed unit stance
- `tactical_view:toggled` - Tactical overlay toggled

---

## Acceptance Criteria (10)

1. **Health Bar Display** - Color-coded bars (green/yellow/red) with injury icons
2. **Threat Indicators** - Exclamation marks with severity colors + off-screen arrows
3. **Combat HUD Activation** - Shows active conflicts, threats, selected units
4. **Stance Controls** - 4 buttons (passive/defensive/aggressive/flee)
5. **Combat Unit Panel** - Stats, equipment, abilities, injuries
6. **Combat Log** - Timestamped events with filtering
7. **Tactical Overview** - Force counts, battle prediction
8. **Defense Management** - Structures, zones, patrol routes
9. **Keyboard Shortcuts** - Quick access (1-4 for stances, T for tactical, etc.)
10. **Integration** - All renderers work together without conflicts

---

## Files to Create/Modify (14)

### Extend Existing (2)
1. `packages/renderer/src/HealthBarRenderer.ts` - Add injury icons
2. `packages/renderer/src/ThreatIndicatorRenderer.ts` - Add severity colors

### Create New Renderers (8)
3. `packages/renderer/src/CombatHUDRenderer.ts`
4. `packages/renderer/src/CombatUnitPanelRenderer.ts`
5. `packages/renderer/src/StanceControlsRenderer.ts`
6. `packages/renderer/src/CombatLogRenderer.ts`
7. `packages/renderer/src/TacticalOverviewRenderer.ts`
8. `packages/renderer/src/DefenseManagementRenderer.ts`
9. `packages/renderer/src/AbilityBarRenderer.ts` (optional)
10. `packages/renderer/src/DamageNumbersRenderer.ts` (optional)

### Integration (2)
11. `packages/renderer/src/Renderer.ts` - Instantiate renderers
12. `packages/renderer/src/index.ts` - Export renderers

### Tests (2+)
13. `packages/renderer/src/__tests__/CombatHUD.test.ts`
14. `packages/renderer/src/__tests__/CombatUI.test.ts`

---

## Dependencies

All dependencies met ✅

- ✅ conflict-system/spec.md - Complete
- ✅ agent-system/spec.md - Complete
- ✅ ui-system/notifications.md - Complete
- ✅ ConflictComponent - Exists
- ✅ CombatStatsComponent - Exists
- ✅ InjuryComponent - Exists
- ✅ HealthBarRenderer - Exists (needs enhancement)
- ✅ ThreatIndicatorRenderer - Exists (needs enhancement)
- ✅ EventBus - Exists

---

## Next Steps

### 1. Test Agent (Immediate)
- Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
- Read spec: `openspec/specs/ui-system/conflict.md`
- Create comprehensive test suite for all 11 requirements
- Write unit tests for each renderer class
- Write integration tests for EventBus coordination
- Post test suite to testing channel

### 2. Implementation Agent (After Tests)
- Read work order and test suite
- Implement Phase 1 (MUST requirements)
- Implement Phase 2 (SHOULD requirements)
- Implement Phase 3 (MAY requirements)
- Ensure all tests pass

### 3. Playtest Agent (Final Verification)
- Visual verification of all UI elements
- Edge case testing (multiple injuries, off-screen threats)
- Performance testing with many entities
- Keyboard shortcut verification
- Final acceptance report

---

## Risk Assessment

**High Risk:**
- Performance with many simultaneous conflicts
- UI overlap/z-index conflicts with existing panels
- Complex EventBus message flow coordination

**Medium Risk:**
- Keyboard shortcut conflicts with existing controls
- State synchronization across multiple renderers

**Low Risk:**
- Visual style (existing patterns in HealthBarRenderer)
- Component queries (well-established patterns)

---

## Work Order Statistics

- **Lines:** 476
- **Size:** ~20KB
- **Requirements:** 11 total (6 MUST, 4 SHOULD, 2 MAY)
- **Acceptance Criteria:** 10 testable scenarios
- **Files to Create/Modify:** 14 files
- **EventBus Events:** 12 events (8 listen, 4 emit)

---

**Status:** ✅ READY_FOR_TESTS
**Pipeline:** Test Agent → Implementation Agent → Playtest Agent
**Confidence:** 100%

The work order is comprehensive, all dependencies are met, and the feature is ready for test suite development.
