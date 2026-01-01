# WORK ORDER READY: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T17:35:00Z
**Status:** ✅ READY_FOR_TESTS
**Attempt:** #517

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** Phase 28
**Feature:** Conflict/Combat UI
**Spec:** openspec/specs/ui-system/conflict.md

---

## Spec Verification: ✅ COMPLETE

### Primary Spec
- ✅ Clear requirements (11 REQ-COMBAT-XXX statements)
- ✅ Testable scenarios (9 acceptance criteria with WHEN/THEN)
- ✅ UI specifications provided (layout, visual elements, positioning)
- ✅ Integration points documented (conflict-system, agent-system, notification-system)

### Dependencies Met
- ✅ Conflict System (openspec/specs/conflict-system/spec.md)
- ✅ Agent System (openspec/specs/agent-system/spec.md)
- ✅ UI Notification System (openspec/specs/ui-system/notifications.md)
- ✅ Existing HealthBarRenderer (packages/renderer/src/HealthBarRenderer.ts)
- ✅ Existing ThreatIndicatorRenderer (packages/renderer/src/ThreatIndicatorRenderer.ts)

---

## Work Order Contents

### Requirements Summary
11 requirements extracted from spec (MUST/SHOULD/MAY prioritized):

**MUST (5):**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury display (PARTIALLY EXISTS)
3. REQ-COMBAT-003: Combat Unit Panel
4. REQ-COMBAT-004: Stance Controls
5. REQ-COMBAT-005: Threat Indicators (PARTIALLY EXISTS)

**SHOULD (4):**
6. REQ-COMBAT-006: Combat Log
7. REQ-COMBAT-007: Tactical Overview
9. REQ-COMBAT-009: Defense Management
11. REQ-COMBAT-011: Keyboard Shortcuts

**MAY (2):**
8. REQ-COMBAT-008: Ability Bar
10. REQ-COMBAT-010: Damage Numbers

### Acceptance Criteria
9 testable criteria covering:
- Combat HUD activation on conflict start
- Health bar display and color coding
- Injury indicator icons
- Threat indicator rendering (on-screen and off-screen)
- Combat unit panel display
- Stance control buttons
- Combat log event recording
- Tactical overview force comparison

### System Integration
**Existing Systems:**
- HealthBarRenderer (packages/renderer/src/HealthBarRenderer.ts) - Already renders health bars
- ThreatIndicatorRenderer (packages/renderer/src/ThreatIndicatorRenderer.ts) - Already renders threat markers
- Renderer (packages/renderer/src/Renderer.ts) - Main render loop
- EventBus (packages/core/src/events/EventBus.ts) - Event system
- World (packages/core/src/ecs/World.ts) - Entity queries

**Components Used:**
- ConflictComponent - Tracks active conflicts
- CombatStatsComponent - Combat stats
- InjuryComponent - Injury tracking
- NeedsComponent - Health values

### New UI Components to Create
- CombatHUD.ts - Main combat UI controller
- CombatUnitPanel.ts - Unit detail view
- StanceControls.ts - Stance button UI
- CombatLog.ts - Event log display
- TacticalOverview.ts (optional) - Strategic view
- AbilityBar.ts (optional) - Ability slots
- DamageNumbers.ts (optional) - Floating numbers

### Events
**Listens:**
- conflict:started - Add threat to display
- conflict:resolved - Remove threat
- death:occurred - Remove entity threats
- injury:inflicted - Update injury display
- damage:dealt - Show damage numbers (optional)
- combat:stance_changed - Update stance UI

**Emits:**
- ui:stance_changed - When user changes stance
- ui:unit_selected - When user selects combat unit
- ui:ability_used - When user triggers ability (optional)

### Files to Create/Modify
**New Files (7+):**
- packages/renderer/src/CombatHUD.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLog.ts
- packages/renderer/src/TacticalOverview.ts (optional)
- packages/renderer/src/AbilityBar.ts (optional)
- packages/renderer/src/DamageNumbers.ts (optional)

**Modified Files (2):**
- packages/renderer/src/Renderer.ts - Integrate CombatHUD render call
- packages/renderer/src/index.ts - Export new UI classes

**Test Files (4):**
- packages/renderer/src/__tests__/CombatHUD.test.ts
- packages/renderer/src/__tests__/CombatUnitPanel.test.ts
- packages/renderer/src/__tests__/StanceControls.test.ts
- packages/renderer/src/__tests__/CombatLog.test.ts

---

## Implementation Notes

### Key Design Decisions
1. **Coordinate Existing Renderers** - CombatHUD should coordinate HealthBarRenderer and ThreatIndicatorRenderer, not replace them
2. **Event-Driven Updates** - Subscribe to EventBus for all combat/conflict events
3. **Canvas Rendering** - All UI renders to 2D canvas context
4. **Performance** - Use pre-filtered entity lists, cache frequently accessed entities, cull off-screen elements
5. **Z-Ordering** - Background → Entities → Health bars → Threats → UI overlays

### Performance Optimizations
- HealthBarRenderer already uses pre-filtered entities (96% reduction)
- ThreatIndicatorRenderer caches player entity (90% reduction)
- CombatLog limited to 100 max events
- Only render visible UI elements

### Component Naming Convention
**CRITICAL:** Component type strings use `lowercase_with_underscores`:
```typescript
type: 'combat_stats'  // ✓ CORRECT
type: 'CombatStats'   // ✗ WRONG
```

---

## Playtest Verification

Work order includes detailed playtest scenarios:

### UI Behaviors to Verify
1. Health bars only appear when needed (injured or in combat)
2. Injury icons match injury types with correct colors
3. Threat indicators pulse for high/critical threats
4. Off-screen arrows point accurately in all 8 directions
5. Stance buttons update immediately on click
6. Combat log auto-scrolls with new events
7. Panel sections are toggleable

### Edge Cases
1. Multiple simultaneous conflicts
2. Rapid stance changes (spam clicking)
3. Entity death during combat
4. Very long combat logs (>100 events)
5. No combat scenario (UI hides cleanly)
6. Zoom in/out (UI scales correctly)

---

## Handoff to Test Agent

Work order is complete and ready for implementation.

**Next Steps:**
1. Test Agent creates test suite (if needed)
2. Implementation Agent implements UI components
3. Playtest Agent verifies behavior

**Dependencies:** All met ✅
**Blockers:** None
**Status:** READY_FOR_TESTS

---

**Spec Agent:** spec-agent-001 signing off.
