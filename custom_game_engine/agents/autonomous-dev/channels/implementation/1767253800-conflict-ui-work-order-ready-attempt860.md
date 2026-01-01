# WORK ORDER READY: Conflict UI

**Attempt:** #860
**Timestamp:** 2025-12-31 22:30:00
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

✅ **Work order verified and confirmed ready**

### Feature Details
- **Feature:** Conflict/Combat UI
- **Phase:** 16
- **Spec:** [openspec/specs/ui-system/conflict.md](../../../../openspec/specs/ui-system/conflict.md)
- **Dependencies:** All met ✅
  - conflict-system/spec.md - Combat mechanics
  - agent-system/spec.md - Agent stats
  - ui-system/notifications.md - Combat alerts

### Work Order Status
- ✅ Work order file exists and is complete
- ✅ Spec references verified (primary + 3 related specs)
- ✅ Requirements extracted (11 REQs: 5 MUST, 4 SHOULD, 2 MAY)
- ✅ Acceptance criteria defined (12 detailed criteria)
- ✅ System integration mapped (7 existing systems)
- ✅ Existing components identified (6 already implemented)
- ✅ Implementation notes comprehensive
- ✅ Playtest scenarios documented

---

## Requirements Breakdown

**MUST Requirements (5):**
1. REQ-COMBAT-001: Combat HUD overlay showing active conflicts
2. REQ-COMBAT-002: Health bars with color coding and injury indicators
3. REQ-COMBAT-003: Combat unit panel with stats/equipment
4. REQ-COMBAT-004: Stance controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat indicators (on-screen and off-screen)

**SHOULD Requirements (4):**
6. REQ-COMBAT-006: Combat log with filtering
7. REQ-COMBAT-007: Tactical overview with force analysis
8. REQ-COMBAT-009: Defense management (zones/patrols)
9. REQ-COMBAT-011: Keyboard shortcuts for combat actions

**MAY Requirements (2 - Optional):**
10. REQ-COMBAT-008: Ability bar for quick access
11. REQ-COMBAT-010: Floating damage numbers

---

## Existing Implementation

**Already Implemented Components:**
- ✅ `HealthBarRenderer.ts` - Health bars (functional, may need injury icons)
- ✅ `ThreatIndicatorRenderer.ts` - Threat indicators (functional, may need off-screen logic)
- ✅ `CombatHUDPanel.ts` - Combat status overlay
- ✅ `CombatUnitPanel.ts` - Unit detail panel
- ✅ `StanceControls.ts` - Stance selector with keyboard shortcuts
- ✅ `CombatLogPanel.ts` - Combat event log

**Missing Components:**
- ❌ `TacticalOverviewPanel.ts` - Strategic combat view
- ❌ `DefenseManagementPanel.ts` - Zone/patrol UI
- ❌ `DamageNumbersRenderer.ts` - Floating combat numbers (optional)
- ❌ `AbilityBarPanel.ts` - Ability quick-access (optional)

**Integration Needed:**
- Wire existing components to EventBus
- Add combat UI to main Renderer.ts render loop
- Register panels with WindowManager
- Connect keyboard shortcuts to actions

---

## Key Integration Points

### EventBus Events to Listen
```typescript
'conflict:started'      // Activate combat HUD
'conflict:resolved'     // Update combat status
'combat:attack'         // Log combat events
'combat:damage'         // Update health bars
'combat:death'          // Remove from tracking
'combat:injury'         // Show injury indicators
'threat:detected'       // Add threat indicator
'ui:entity:selected'    // Update unit panel
```

### Components to Read
```typescript
'combat_stats'    // Combat skill, stance, equipment
'needs'           // Health, stamina
'conflict'        // Active conflicts, injuries
'agent'           // Agent name, portrait
'position'        // Entity location
```

### Files to Modify
```
packages/renderer/src/Renderer.ts           // Add combat UI to render loop
packages/renderer/src/WindowManager.ts      // Register combat panels
packages/renderer/src/index.ts              // Export new components
packages/renderer/src/HealthBarRenderer.ts  // Add injury indicator rendering
packages/renderer/src/ThreatIndicatorRenderer.ts // Add off-screen indicators
```

### Files to Create
```
packages/renderer/src/TacticalOverviewPanel.ts   // NEW - Strategic view
packages/renderer/src/DefenseManagementPanel.ts  // NEW - Zone/patrol UI
packages/renderer/src/DamageNumbersRenderer.ts   // NEW - Floating numbers (optional)
packages/renderer/src/AbilityBarPanel.ts         // NEW - Ability bar (optional)
```

---

## Implementation Priority

### Phase 1: Verify Existing (HIGH PRIORITY)
1. Test HealthBarRenderer with current game
2. Test ThreatIndicatorRenderer with current game
3. Verify CombatHUDPanel event wiring
4. Test StanceControls component updates
5. Verify CombatLogPanel event listeners

### Phase 2: Fill Gaps (MEDIUM PRIORITY)
6. Implement TacticalOverviewPanel
7. Add keyboard shortcut actions
8. Implement DefenseManagementPanel

### Phase 3: Optional Features (LOW PRIORITY)
9. Implement DamageNumbersRenderer (if time permits)
10. Implement AbilityBarPanel (if time permits)

---

## Critical Notes for Implementation

⚠️ **Component Naming:** MUST use lowercase_with_underscores
```typescript
// CORRECT
entity.hasComponent('combat_stats')
entity.getComponent('needs')

// WRONG - Will fail at runtime
entity.hasComponent('CombatStats')
entity.getComponent('Needs')
```

⚠️ **Error Handling:** NO silent fallbacks per CLAUDE.md
```typescript
// CORRECT - Throw on missing data
if (!entity.hasComponent('combat_stats')) {
  throw new Error(`Entity ${entity.id} missing required combat_stats component`);
}

// WRONG - Silent fallback masks bugs
const stats = entity.getComponent('combat_stats') || defaultStats;
```

⚠️ **Performance:** Use viewport culling and filtered entity lists
```typescript
// CORRECT - Accept filtered entities
render(filteredEntities: Entity[]): void

// WRONG - Full world scan every frame
render(): void {
  const allEntities = this.world.getAllEntities(); // O(n) every frame!
}
```

⚠️ **EventBus Cleanup:** Always unsubscribe in cleanup/unmount
```typescript
destroy(): void {
  if (this.conflictHandler) {
    this.eventBus.off('conflict:started', this.conflictHandler);
  }
}
```

---

## Acceptance Criteria Summary

### Criterion 1: Combat HUD Activation
- **WHEN:** Combat starts (EventBus 'combat:started')
- **THEN:** Combat HUD activates, displays active conflicts
- **Verification:** CombatHUD.isActive === true

### Criterion 2: Health Bar Display
- **WHEN:** Entity health < 100% OR in combat
- **THEN:** Health bar renders above sprite
- **Verification:** HealthBarRenderer shows bar for injured/combat entities

### Criterion 3: Health Bar Colors
- **WHEN:** Entity health changes
- **THEN:** Color changes: green (>66%), yellow (33-66%), red (<33%)
- **Verification:** Visual inspection

### Criterion 4: Injury Indicators
- **WHEN:** Entity has injuries
- **THEN:** Icons appear above health bar
- **Verification:** Injury icons rendered per injury type

### Criterion 5: Combat Unit Panel
- **WHEN:** Select agent with combat_stats
- **THEN:** Panel shows stats, equipment, stance, injuries
- **Verification:** All fields from CombatUnitDisplay interface present

### Criterion 6: Stance Controls
- **WHEN:** Click stance button
- **THEN:** Entity's stance updates in combat_stats component
- **Verification:** Component update persists

### Criterion 7: Threat Indicators
- **WHEN:** Threat exists
- **THEN:** Indicator renders at threat position
- **Verification:** ThreatIndicatorRenderer shows correct icons

### Criterion 8: Off-screen Indicators
- **WHEN:** Threat outside viewport
- **THEN:** Edge indicator shows direction/distance
- **Verification:** Arrow points to threat

### Criterion 9: Combat Log Events
- **WHEN:** Combat event occurs
- **THEN:** Event appends to log with timestamp
- **Verification:** Log entry matches CombatLogEvent structure

### Criterion 10: Combat Log Filtering
- **WHEN:** Filter adjusted
- **THEN:** Only matching events display
- **Verification:** Filter logic correct

### Criterion 11: Tactical Overview
- **WHEN:** Open tactical view
- **THEN:** Shows force summary, battle prediction
- **Verification:** ForcesSummary calculations correct

### Criterion 12: Keyboard Shortcuts
- **WHEN:** Press combat hotkey (1-4, A, T, etc.)
- **THEN:** Action executes on selected units
- **Verification:** Shortcuts trigger correct actions

---

## Handoff to Test Agent

✅ **Work order complete and ready**

**Next Steps:**
1. Test Agent: Read work order, write test suite for all 12 acceptance criteria
2. Implementation Agent: Implement following TDD, focus on MUST requirements first
3. Playtest Agent: Verify all UI behaviors per playtest checklist

**Work Order Path:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** 16
**Complexity:** HIGH
**Estimated Effort:** Large (11 files total: 6 existing + 5 new)

---

## Verification Checklist

✅ Spec file exists and is complete
✅ All requirements extracted from spec
✅ Acceptance criteria have WHEN/THEN/Verification
✅ System integration points identified
✅ Existing components documented
✅ Implementation priority defined
✅ Error handling guidelines provided
✅ Performance considerations noted
✅ Playtest scenarios included
✅ Work order file created at correct path

**Status:** READY_FOR_TESTS ✅
