# WORK ORDER VERIFIED - Attempt #898

**Feature:** conflict-ui (conflict/combat-ui)
**Date:** 2025-12-31
**Status:** ✅ WORK ORDER EXISTS AND VERIFIED

---

## Work Order Confirmation

✅ Work order file exists at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
✅ File size: 16,079 bytes
✅ Last modified: 2025-12-31 21:38
✅ Status: READY_FOR_TESTS
✅ Phase: 7

---

## Contents Summary

**Spec:** `openspec/specs/ui-system/conflict.md`
**Related Specs:**
- `openspec/specs/conflict-system/spec.md` (combat mechanics)
- `openspec/specs/ui-system/notifications.md` (combat alerts)

**Requirements:** 11 total (REQ-COMBAT-001 through REQ-COMBAT-011)
- MUST: 5 requirements
- SHOULD: 4 requirements
- MAY: 2 requirements

**Acceptance Criteria:** 12 detailed test scenarios

**Existing Components Identified:**
- CombatHUDPanel.ts
- HealthBarRenderer.ts
- ThreatIndicatorRenderer.ts
- CombatUnitPanel.ts
- StanceControls.ts
- CombatLogPanel.ts

**New Components Needed:**
- TacticalOverviewPanel.ts
- DefenseManagementPanel.ts
- DamageNumbersRenderer.ts (optional)
- AbilityBarPanel.ts (optional)

---

## System Integration Points

### EventBus Events to Listen For:
- combat:started - Activate combat HUD
- combat:ended - Deactivate combat HUD
- threat:detected - Add threat indicator
- injury:inflicted - Update health bars
- unit:death - Remove from combat tracking

### Systems to Integrate With:
- AgentCombatSystem - Combat mechanics
- HealthBarRenderer - Already exists, may need enhancement
- ThreatIndicatorRenderer - Already exists, may need off-screen logic
- EventBus - Combat event listeners
- Renderer - Add to render loop
- WindowManager - Register panels
- KeyboardRegistry - Combat shortcuts

---

## Priority Implementation Order

### HIGH PRIORITY (MUST):
1. Verify HealthBarRenderer works with current game
2. Verify ThreatIndicatorRenderer works with current game
3. Integrate CombatHUDPanel with combat events
4. Wire up StanceControls to update combat_stats component
5. Test CombatLogPanel with combat events

### MEDIUM PRIORITY (SHOULD):
6. Implement TacticalOverviewPanel
7. Add combat keyboard shortcuts
8. Implement DefenseManagementPanel

### LOW PRIORITY (MAY):
9. Implement DamageNumbersRenderer
10. Implement AbilityBarPanel

---

## Critical Development Notes

**Component Type Names:**
- Use lowercase_with_underscores (e.g., 'combat_stats', NOT 'CombatStats')

**Error Handling:**
- NO silent fallbacks - crash on missing required data
- Validate entity has required components before rendering
- Throw clear errors for missing combat_stats, needs, etc.

**No Debug Logging:**
- NO console.log, console.debug, or console.info
- Use Agent Dashboard for debugging
- Only console.error and console.warn allowed

**EventBus Cleanup:**
- Always unsubscribe from events in component cleanup/unmount

**Performance:**
- HealthBarRenderer already has viewport culling
- Cap combat log at 100-200 events max
- Optimize off-screen threat calculations

---

## Files Referenced in Work Order

**Existing (Verify):**
- `packages/renderer/src/CombatHUDPanel.ts`
- `packages/renderer/src/HealthBarRenderer.ts`
- `packages/renderer/src/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/CombatUnitPanel.ts`
- `packages/renderer/src/StanceControls.ts`
- `packages/renderer/src/CombatLogPanel.ts`
- `packages/core/src/components/CombatStatsComponent.ts`

**To Create:**
- `packages/renderer/src/TacticalOverviewPanel.ts`
- `packages/renderer/src/DefenseManagementPanel.ts`
- `packages/renderer/src/DamageNumbersRenderer.ts` (optional)
- `packages/renderer/src/AbilityBarPanel.ts` (optional)

**To Modify:**
- `packages/renderer/src/Renderer.ts` - Add combat UI to render loop
- `packages/renderer/src/WindowManager.ts` - Register new panels
- `packages/renderer/src/KeyboardRegistry.ts` - Add combat shortcuts
- `packages/renderer/src/index.ts` - Export new components

---

## Test Scenarios for Playtest Agent

**Scenario 1: Basic Combat Flow**
1. Start game with agents
2. Trigger agent vs agent combat
3. Verify Combat HUD activates
4. Verify Health bars appear
5. Verify Combat log shows events
6. Verify Combat ends, HUD deactivates

**Scenario 2: Stance Controls**
1. Select agent
2. Open Combat Unit Panel
3. Set stance to "Aggressive"
4. Verify combat_stats.stance updates
5. Close and reopen - stance persists

**Scenario 3: Threat Detection**
1. Spawn predator near village
2. Verify threat indicator appears
3. Move camera so predator off-screen
4. Verify edge indicator shows

**Edge Cases:**
- Multiple simultaneous combats
- Rapid combat start/stop
- Entity death during combat
- Off-screen combat
- Empty combat log
- Selecting non-combat entity
- 20+ threats performance

---

## Status: READY FOR TEST AGENT

The work order is complete and comprehensive. The Test Agent should:

1. Read the work order thoroughly
2. Verify existing components against spec requirements
3. Write tests for new components
4. Test EventBus event integration
5. Verify keyboard shortcut registration
6. Ensure CLAUDE.md compliance
7. Performance test with multiple combatants

Then hand off to Implementation Agent for development.

---

**Timestamp:** 2025-12-31 23:44:00 UTC
**Spec Agent:** spec-agent-001
**Attempt:** #898
**Verification:** COMPLETE ✅
