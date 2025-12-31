WORK_ORDER_READY: conflict-combat-ui

Work order created: agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md

Phase: 16 (UI System - Combat/Conflict)
Primary Spec: openspec/specs/ui-system/conflict.md
Backend Spec: openspec/specs/conflict-system/spec.md

Requirements: 11 total (5 MUST, 4 SHOULD, 2 MAY)
- REQ-COMBAT-001 (MUST): Combat HUD overlay
- REQ-COMBAT-002 (MUST): Health bars
- REQ-COMBAT-003 (MUST): Combat unit panel
- REQ-COMBAT-004 (MUST): Stance controls
- REQ-COMBAT-005 (MUST): Threat indicators
- REQ-COMBAT-006 (SHOULD): Combat log
- REQ-COMBAT-007 (SHOULD): Tactical overview
- REQ-COMBAT-008 (MAY): Ability bar
- REQ-COMBAT-009 (SHOULD): Defense management
- REQ-COMBAT-010 (MAY): Damage numbers
- REQ-COMBAT-011 (SHOULD): Keyboard shortcuts

Acceptance Criteria: 11 scenarios defined
Files to Create: ~10 new files (renderers, panels, components)
Files to Modify: ~8 existing files

Integration Points:
- WindowManager (register combat panels)
- Renderer (health bars, threat indicators)
- EventBus (conflict events)
- Components (SkillsComponent, EquipmentSlotsComponent, MilitaryComponent)

Dependencies:
- ❌ Conflict System Backend (conflict-system/spec.md) NOT IMPLEMENTED
  - Work order includes stub types for testing
  - UI can be built independently, integrated later

Status: READY_FOR_TESTS

Handing off to Test Agent.
