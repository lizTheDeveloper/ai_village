# Conflict UI - Work Order Ready (Attempt #798)

**Status:** WORK ORDER CONFIRMED ✅
**Feature:** conflict-ui
**Phase:** 16
**Attempt:** #798
**Timestamp:** 2025-12-31

---

## Work Order Location

Work order exists at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

File verified: 11,160 bytes
Status: READY_FOR_TESTS

---

## Spec Verification Complete

**Primary Spec:** openspec/specs/ui-system/conflict.md ✅
- REQ-COMBAT-001: Combat HUD ✅
- REQ-COMBAT-002: Health Bars ✅
- REQ-COMBAT-003: Combat Unit Panel ✅
- REQ-COMBAT-004: Stance Controls ✅
- REQ-COMBAT-005: Threat Indicators ✅
- REQ-COMBAT-006: Combat Log ✅
- REQ-COMBAT-007: Tactical Overview (SHOULD)
- REQ-COMBAT-008: Ability Bar (MAY)
- REQ-COMBAT-009: Defense Management (SHOULD)
- REQ-COMBAT-010: Damage Numbers (MAY)
- REQ-COMBAT-011: Keyboard Shortcuts (SHOULD)

**Related Specs:**
- conflict-system/spec.md ✅ (ConflictType, ConflictResolution, Injury, Death)
- agent-system/spec.md ✅ (Agent stats, combat skills)
- ui-system/notifications.md ✅ (Combat alerts)

---

## Current Implementation Status

### ✅ Already Implemented (src files exist)

1. **HealthBarRenderer.ts** - REQ-COMBAT-002
   - Renders health bars above entities
   - Color-coded by health percentage
   - Shows injury indicators as icons
   - Performance optimized with entity filtering

2. **ThreatIndicatorRenderer.ts** - REQ-COMBAT-005
   - In-world threat markers with pulsing animation
   - Off-screen directional arrows
   - Distance indicators
   - Cached player entity for performance

3. **CombatHUDPanel.ts** - REQ-COMBAT-001
   - Shows active conflicts overlay
   - Displays threat level indicator
   - Lists recent combat events
   - Click to focus on conflicts

4. **CombatLogPanel.ts** - REQ-COMBAT-006
   - Scrollable event log (max 100 events)
   - Filters by event type
   - Color-coded entries
   - Narrative expansion

5. **CombatUnitPanel.ts** - REQ-COMBAT-003
   - Selected unit details
   - Combat stats display
   - Equipment display
   - Injury list

6. **StanceControls.ts** - REQ-COMBAT-004
   - Stance buttons (passive/defensive/aggressive/flee)
   - Visual active state
   - Emits stance change events

### ⚠️ Integration Required

While individual components exist, they need to be integrated:
- Renderer.ts - Component instantiation & render loop
- InputHandler.ts - Keyboard shortcuts (1-4 for stances)
- EventBus - Wire conflict events to UI components
- Tests - Enable skipped integration tests

---

## Work Order Contents

The work order includes:

✅ **Requirements Summary** - All 11 REQ-COMBAT requirements documented
✅ **Acceptance Criteria** - 7 testable criteria with verification steps
✅ **System Integration** - EventBus events, components, and systems mapped
✅ **UI Requirements** - Layout, positioning, interactions for all panels
✅ **Files List** - Implementation and integration targets identified
✅ **Implementation Notes** - Render order, lifecycle, performance considerations
✅ **Playtest Notes** - UI behaviors, edge cases, performance checks

---

## System Integration Points

### EventBus Events (UI Listens)
- `conflict:started` - Show conflict in HUD/threats
- `conflict:resolved` - Remove from HUD/threats
- `combat:attack` - Log event
- `combat:damage` - Update health bars, log
- `combat:dodge` - Log event
- `death:occurred` - Remove entity from UI
- `injury:inflicted` - Show injury icons
- `hunt:started`, `hunt:success`, `hunt:failed` - Log events
- `predator:attack` - Show threat indicator
- `ui:entity:selected` - Show Combat Unit Panel

### EventBus Events (UI Emits)
- `ui:stance:changed` - User changed entity stance
- `ui:entity:selected` - User clicked conflict/threat
- `camera:focus` - Pan camera to conflict location

### Components Required
- CombatStatsComponent ✅ (exists)
- InjuryComponent ✅ (exists)
- ConflictComponent ✅ (exists)
- GuardDutyComponent ✅ (exists)

---

## Dependencies Status

✅ All dependencies are met:
- Conflict system components exist
- Agent system components exist
- EventBus functional
- Individual UI components implemented
- Spec is complete with testable criteria

---

## Critical Notes for Implementation

1. **Component Type Names:** Use `lowercase_with_underscores` not PascalCase
   - Example: `combat_stats`, `injury`, `conflict` (not `CombatStats`)

2. **Error Handling:** NO silent fallbacks (per CLAUDE.md)
   - Throw clear errors if data missing
   - Example: `throw new Error('Cannot render health bar: entity missing needs component')`

3. **Performance:**
   - HealthBarRenderer filters entities before rendering
   - ThreatIndicatorRenderer caches player entity
   - Only render in-view elements

4. **Render Order:**
   ```
   Terrain → Entities → Health Bars → Threat Indicators → HUD Panels → Combat Panels
   ```

---

## Hand-off to Test Agent

✅ Work order is complete and comprehensive
✅ All spec requirements documented
✅ Integration points identified
✅ Existing implementations catalogued
✅ Test criteria defined

**Status:** READY FOR TEST AGENT

**Spec Agent:** Attempt #798 complete. Work order verified and ready for testing pipeline.
