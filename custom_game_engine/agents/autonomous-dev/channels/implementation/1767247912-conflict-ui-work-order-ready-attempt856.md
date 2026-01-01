# Work Order Ready: conflict-ui

**Timestamp:** 2025-12-31
**Agent:** spec-agent-001
**Attempt:** #856
**Status:** ✅ WORK_ORDER_COMPLETE

---

## Summary

Work order for **conflict-ui** (Combat/Conflict UI) has been verified and is ready for the Test Agent.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Feature Details

**Phase:** Phase 16  
**Primary Spec:** openspec/specs/ui-system/conflict.md  
**Requirements:** 11 total (6 MUST, 4 SHOULD, 2 MAY)

### Requirements Breakdown

**MUST (Priority 1):**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bar display with injury indicators
3. REQ-COMBAT-003: Combat unit panel with detailed stats
4. REQ-COMBAT-004: Stance controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat indicators (on-screen and off-screen)

**SHOULD (Priority 2):**
6. REQ-COMBAT-006: Combat log with event history
7. REQ-COMBAT-007: Tactical overview with battle prediction
8. REQ-COMBAT-009: Defense management (structures/zones/patrols)
9. REQ-COMBAT-011: Keyboard shortcuts (stances, commands, UI toggles)

**MAY (Optional):**
10. REQ-COMBAT-008: Ability bar with quick access
11. REQ-COMBAT-010: Floating damage numbers

---

## Implementation Strategy

### Existing Infrastructure
- HealthBarRenderer (packages/renderer/src/HealthBarRenderer.ts) - Already exists
- ThreatIndicatorRenderer (packages/renderer/src/ThreatIndicatorRenderer.ts) - Already exists
- ConflictComponent (packages/core/src/components/ConflictComponent.ts) - Already exists
- CombatStatsComponent (packages/core/src/components/CombatStatsComponent.ts) - Already exists
- InjuryComponent (packages/core/src/components/InjuryComponent.ts) - Already exists

### New Renderers to Create
1. CombatHUDRenderer - Main combat overlay
2. CombatUnitPanelRenderer - Selected unit details
3. StanceControlsRenderer - Combat stance buttons
4. CombatLogRenderer - Event history log
5. TacticalOverviewRenderer - Strategic view
6. DefenseManagementRenderer - Defense structures/zones
7. AbilityBarRenderer - Quick ability access (optional)
8. DamageNumbersRenderer - Floating numbers (optional)

---

## EventBus Integration

**Listens For:**
- conflict:started - Activate threat indicators
- conflict:resolved - Deactivate threat indicators
- death:occurred - Remove indicators
- injury:inflicted - Update injury display
- combat:damage_dealt - Add to combat log
- combat:stance_changed - Update stance controls
- guard:assignment_changed - Update defense management
- selection:changed - Update combat unit panel

**Emits:**
- combat:stance_request - When player changes stance
- combat:ability_used - When ability activated
- defense:zone_created - When defense zone created
- defense:patrol_created - When patrol route created

---

## Acceptance Criteria

10 testable criteria defined:
1. Health bars appear with correct color coding (green/yellow/red)
2. Threat indicators show exclamation marks on hostile entities
3. Combat HUD activates during combat
4. Stance controls allow changing agent combat behavior
5. Combat unit panel shows stats/equipment/injuries
6. Combat log records all combat events
7. Tactical overview displays force counts and battle odds
8. Defense management shows structures/zones/patrols
9. Keyboard shortcuts execute corresponding actions (1-4, A/H/R/P, L/T)
10. Injury icons display above health bars with correct color coding

---

## Files to Modify

**Extend Existing:**
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts

**Create New:**
- packages/renderer/src/CombatHUDRenderer.ts
- packages/renderer/src/CombatUnitPanelRenderer.ts
- packages/renderer/src/StanceControlsRenderer.ts
- packages/renderer/src/CombatLogRenderer.ts
- packages/renderer/src/TacticalOverviewRenderer.ts
- packages/renderer/src/DefenseManagementRenderer.ts
- packages/renderer/src/AbilityBarRenderer.ts (optional)
- packages/renderer/src/DamageNumbersRenderer.ts (optional)

**Integrate:**
- packages/renderer/src/Renderer.ts
- packages/renderer/src/index.ts

---

## Dependencies

All dependencies are met ✅

- ✅ Conflict System (conflict-system/spec.md) - Complete
- ✅ Agent System (agent-system/spec.md) - Complete
- ✅ Notifications (ui-system/notifications.md) - Complete
- ✅ ConflictComponent - Exists
- ✅ CombatStatsComponent - Exists
- ✅ InjuryComponent - Exists
- ✅ HealthBarRenderer - Exists
- ✅ ThreatIndicatorRenderer - Exists

---

## Next Steps

**Test Agent (Next in Pipeline):**
1. Read work order: agents/autonomous-dev/work-orders/conflict-ui/work-order.md
2. Create comprehensive test suite for all 11 requirements
3. Write unit tests for each renderer class
4. Write integration tests for EventBus coordination
5. Post test suite to testing channel

**Implementation Agent (After Tests):**
1. Read work order and test suite
2. Implement Phase 1: Core visualization (MUST requirements)
3. Implement Phase 2: Combat management (SHOULD requirements)
4. Implement Phase 3: Advanced features (MAY requirements)
5. Ensure all tests pass

**Playtest Agent (Final Verification):**
1. Visual verification of all UI elements
2. Test edge cases (multiple injuries, off-screen threats, etc.)
3. Performance testing with many entities
4. Keyboard shortcut verification
5. Final acceptance report

---

## Risk Assessment

**High Risk:**
- Performance with many simultaneous conflicts
- UI overlap with existing panels
- Complex EventBus message flow

**Medium Risk:**
- Keyboard shortcut conflicts
- State management across multiple renderers

**Low Risk:**
- Visual style (existing patterns to follow)
- Component queries (well-established patterns)

---

## Work Order Statistics

- **Size:** 476 lines (~20KB)
- **Sections:** 9 major sections
- **Acceptance Criteria:** 10 testable criteria
- **Event Integrations:** 8 listen + 4 emit = 12 total
- **Files:** 14 files to create/modify
- **Test Files:** 5+ test suites needed
- **Estimated Complexity:** HIGH

---

## Claim Status

**Feature:** conflict-ui  
**Status:** 🚧 CLAIMED by spec-agent-001  
**Roadmap Status:** Work order ready, awaiting Test Agent  
**Pipeline Position:** spec-agent-001 → Test Agent → Implementation Agent → Playtest Agent

---

**Handing off to Test Agent.**

The work order is comprehensive, all dependencies are met, and the feature is ready for test suite development.
