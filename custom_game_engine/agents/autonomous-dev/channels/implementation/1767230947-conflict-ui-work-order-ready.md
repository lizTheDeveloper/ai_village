# WORK ORDER READY: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T19:22:27Z
**Status:** ✅ READY_FOR_TESTS
**Attempt:** #515

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** 16
**Feature:** Conflict/Combat UI
**Spec:** openspec/specs/ui-system/conflict.md

---

## Spec Verification: ✅ COMPLETE

### Primary Spec
- ✅ Clear requirements (11 REQ-COMBAT-XXX statements)
- ✅ Testable scenarios (12 acceptance criteria with WHEN/THEN)
- ✅ UI specifications provided (layout, visual elements, positioning)
- ✅ Integration points documented (conflict-system, agent-system, notification-system)

### Dependencies Met
- ✅ Conflict System (openspec/specs/conflict-system/spec.md)
- ✅ Agent System (openspec/specs/agent-system/spec.md)
- ✅ UI Notification System (openspec/specs/ui-system/notifications.md)

---

## Work Order Contents

### Requirements Summary
11 requirements extracted from spec (MUST/SHOULD/MAY prioritized):

**MUST (5):**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury display
3. REQ-COMBAT-003: Combat Unit Panel
4. REQ-COMBAT-004: Stance Controls
5. REQ-COMBAT-005: Threat Indicators

**SHOULD (4):**
6. REQ-COMBAT-006: Combat Log
7. REQ-COMBAT-007: Tactical Overview
9. REQ-COMBAT-009: Defense Management
11. REQ-COMBAT-011: Keyboard Shortcuts

**MAY (2):**
8. REQ-COMBAT-008: Ability Bar
10. REQ-COMBAT-010: Damage Numbers

### Acceptance Criteria
12 testable criteria covering:
- Combat HUD activation on conflict start
- Health bar display and color coding
- Injury display with icons and tooltips
- Combat unit selection and panel display
- Stance changes (passive/defensive/aggressive/flee)
- Threat detection and indicators
- Combat log event recording
- Off-screen threat edge indicators
- Tactical overview display
- Damage numbers animation
- Keyboard shortcut execution

### System Integration
7 existing systems identified:
- AgentCombatSystem (EventBus: combat:started, combat:ended)
- ConflictComponent (component read)
- InjuryComponent (component read)
- CombatStatsComponent (component read)
- GuardDutySystem (component read)
- VillageDefenseSystem (EventBus: defense status)
- ContextMenuManager (UI pattern reference)

### New Components
2 components to create:
- CombatUIStateComponent (stores UI state)
- ThreatTrackingComponent (tracks detected threats)

### Events
**Emits:** 6 UI-specific events (ui:combat:*)
**Listens:** 10 system events (combat:*, conflict:*, injury:*, entity:*, predator:*, threat:*, defense:*, input:*)

### Files to Create/Modify
**New Files (10):**
- packages/renderer/src/combat/CombatHUDManager.ts
- packages/renderer/src/combat/HealthBarRenderer.ts
- packages/renderer/src/combat/ThreatIndicatorRenderer.ts
- packages/renderer/src/combat/CombatUnitPanel.ts
- packages/renderer/src/combat/CombatLogRenderer.ts
- packages/renderer/src/combat/TacticalOverviewRenderer.ts
- packages/renderer/src/combat/StanceControls.ts
- packages/renderer/src/combat/types.ts
- packages/core/src/components/CombatUIStateComponent.ts
- packages/core/src/components/ThreatTrackingComponent.ts

**Modified Files (5):**
- packages/renderer/src/Renderer.ts
- packages/renderer/src/index.ts
- packages/core/src/index.ts
- packages/core/src/components/index.ts
- demo/src/main.ts

---

## Implementation Notes

### ContextMenuManager Pattern
Work order includes detailed guidance to follow ContextMenuManager pattern:
- Manager class structure (constructor validation, renderer separation, state management)
- Event bus integration (setupEventListeners, cleanup)
- Lifecycle management (destroy, cleanupEventListeners)
- Integration with main Renderer

### Critical Reminders
1. **Component naming:** Use `lowercase_with_underscores` NOT PascalCase
2. **Performance:** Implement culling for health bars (only render on-screen entities)
3. **Memory:** Limit combat log to 100 events (circular buffer)
4. **Z-Index:** Proper render order (world → health bars → threats → HUD → log → tactical → context menu)
5. **Animations:** Smooth health bar lerp, threat pulse, damage number parabolic motion

### Conflict-System Types
Spec references many conflict-system types (ConflictResolution, HuntingOutcome, etc.). Work order notes these may not exist yet - fallback to reading ConflictComponent directly if events unavailable.

---

## Playtest Verification

Work order includes 10 playtest scenarios:
1. Combat initiation (HUD auto-appears)
2. Health bar visibility and color coding
3. Injury display with tooltips
4. Stance changes and behavior
5. Threat detection (on-screen and off-screen)
6. Combat log event recording
7. Tactical overview display
8. Performance with 20+ entities
9. Keyboard shortcuts (1/2/3/4/L/T)
10. Edge cases (multiple combats, entity death, etc.)

Visual polish checklist included (alignment, pulse smoothness, readability, consistent 8-bit style).

---

## Handoff to Test Agent

Work order is complete and ready for test creation.

**Next Steps:**
1. Test Agent creates test suite
2. Implementation Agent implements UI components
3. Playtest Agent verifies behavior

**Dependencies:** All met ✅
**Blockers:** None
**Status:** READY_FOR_TESTS

---

**Spec Agent:** spec-agent-001 signing off.
