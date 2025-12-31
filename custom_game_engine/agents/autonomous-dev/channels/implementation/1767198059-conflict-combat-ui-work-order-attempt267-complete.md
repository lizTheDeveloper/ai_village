# Work Order Complete: Conflict/Combat UI

**Timestamp:** 2025-12-31 08:27:39 (Attempt #267)
**Agent:** spec-agent-001
**Status:**  COMPLETE

---

## Work Order Verified

=Ä **File:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Size:** 430 lines
**Status:** READY_FOR_TESTS

---

## Summary

The work order for conflict/combat UI has been verified as complete and ready for the test pipeline.

### Spec Reference
- **Primary Spec:** `openspec/specs/ui-system/conflict.md` (916 lines)
- **Backend Spec:** `openspec/specs/conflict-system/spec.md`
- **Related Specs:** agent-system/spec.md, ui-system/notifications.md

### Requirements Covered (11 Total)

**MUST Requirements:**
-  REQ-COMBAT-001: Combat HUD - Overlay showing combat info
-  REQ-COMBAT-002: Health Bars - Already implemented 
-  REQ-COMBAT-003: Combat Unit Panel - Detailed unit view
-  REQ-COMBAT-004: Stance Controls - Combat behavior settings
-  REQ-COMBAT-005: Threat Indicators - Visual threat markers

**SHOULD Requirements:**
-  REQ-COMBAT-006: Combat Log - Scrollable event history
-  REQ-COMBAT-007: Tactical Overview - Strategic view
-  REQ-COMBAT-009: Defense Management - Zones and patrols
-  REQ-COMBAT-011: Keyboard Shortcuts - Quick combat commands

**MAY Requirements:**
-  REQ-COMBAT-008: Ability Bar - Optional quick abilities
-  REQ-COMBAT-010: Damage Numbers - Optional floating numbers

### Acceptance Criteria (11 Total)

1. **Combat HUD Display** - Activates on conflict, shows type/participants/threat
2. **Health Bars Rendering** - Color-coded (green/yellow/red) above entities
3. **Combat Unit Panel** - Shows stats, equipment, injuries, stance
4. **Stance Controls** - 4 buttons + keyboard shortcuts (1-4)
5. **Threat Indicators** - On-screen icons + off-screen edge arrows
6. **Combat Log** - Events with timestamps, filtering, scrolling
7. **Tactical Overview** - Force summary, battle odds, map overlay
8. **Damage Numbers** - Floating values with color coding
9. **Defense Management** - Zone creation, guard assignment, patrols
10. **Keyboard Shortcuts** - All hotkeys (stances, commands, UI toggles)
11. **Conflict System Integration** - EventBus subscription, state sync

### System Integration Points

**Existing Systems Affected:**
- `AgentCombatSystem.ts` - Emits combat events UI listens to
- `ConflictComponent.ts` - State tracking (conflict type, participants)
- `CombatStatsComponent.ts` - Stats for display
- `InjuryComponent.ts` - Injury tracking for health bars
- `EventBus.ts` - Event subscription
- `Renderer.ts` - Integration point for render loop
- `InputHandler.ts` - Keyboard shortcuts

**Already Partially Implemented:**
-  `CombatHUDPanel.ts` - EventBus integration exists
-  `HealthBarRenderer.ts` - Full implementation of REQ-COMBAT-002
-  `StanceControls.ts` - Basic stance UI exists
- =á `CombatLogPanel.ts` - Stub exists
- =á `CombatUnitPanel.ts` - Stub exists
- =á `ThreatIndicatorRenderer.ts` - Partial implementation

**May Need Creation:**
- `TacticalOverviewPanel.ts` - Strategic view (REQ-COMBAT-007)
- `AbilityBar.ts` - Ability bar (REQ-COMBAT-008, optional)
- `DefenseManagementPanel.ts` - Defense zones (REQ-COMBAT-009)
- `DamageNumberRenderer.ts` - Floating numbers (REQ-COMBAT-010, optional)

### Events Specification

**Listens:**
- `conflict:started` - Activate Combat HUD, add to active conflicts
- `conflict:resolved` - Remove from active conflicts
- `combat:started` - Agent combat specific event
- `combat:attack` - Log attack, spawn damage number
- `combat:damage` - Update health bar
- `combat:miss` - Log miss event
- `combat:death` - Log death, update UI
- `injury:inflicted` - Update health bar with injury icon
- `threat:detected` - Add to threat indicators
- `threat:cleared` - Remove from threat indicators
- `entity:selected` - Update Combat Unit Panel
- `entity:deselected` - Clear Combat Unit Panel

**Emits:**
- `stance:changed` - When stance updated via UI
- `combat_ui:tactical_opened` - Tactical overview opened
- `combat_ui:log_filtered` - Log filter changed
- `defense:zone_created` - Defense zone created
- `defense:patrol_created` - Patrol route created

---

## Files Structure

**Work Order:** `/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Sections:**
1. Spec Reference
2. Requirements Summary (11 requirements)
3. Acceptance Criteria (11 criteria)
4. System Integration
5. UI Requirements (detailed mockups)
6. Files Likely Modified
7. Notes for Implementation Agent
8. Notes for Playtest Agent

---

## Next Steps

 **Work order created and verified**
í **Ready for Test Agent** - Create test plan based on acceptance criteria
í **Ready for Implementation Agent** - After test plan complete

---

## Implementation Notes

### Current State
- **HealthBarRenderer** is complete (REQ-COMBAT-002 )
- **Combat UI classes** exist but NOT integrated into main Renderer
- **EventBus subscriptions** exist in component constructors
- **Main integration needed:** Wire into `Renderer.ts` render loop

### Critical Path
1. Import combat UI classes in Renderer.ts
2. Instantiate in Renderer constructor
3. Call render methods in render loop
4. Wire keyboard shortcuts in InputHandler
5. Test EventBus integration end-to-end

### Type Safety
- All combat types use lowercase_with_underscores (e.g., `'agent_combat'`, `'laceration'`)
- Import types from `@ai-village/core`
- Follow existing codebase naming conventions

### Performance
- HealthBarRenderer already optimized (only renders visible entities)
- Threat indicators should use spatial hashing for many threats
- Combat log should cap at ~100 events max

---

## Quality Checks

 Spec alignment verified - All REQ-COMBAT-* requirements covered
 Acceptance criteria complete - 11 testable scenarios defined
 System integration documented - EventBus events, component reads
 UI mockups included - Layout, interactions, visual style
 Files identified - Existing stubs + new files needed
 Implementation notes - Current state, integration steps, gotchas
 Playtest guide - Edge cases, performance targets, accessibility

---

**Work order is COMPLETE and ready for pipeline.**
