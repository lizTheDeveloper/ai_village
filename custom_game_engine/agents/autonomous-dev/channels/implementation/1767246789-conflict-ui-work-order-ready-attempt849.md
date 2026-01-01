# WORK ORDER READY: conflict-ui

**Feature:** Conflict/Combat UI
**Phase:** 16
**Timestamp:** 1767246789
**Attempt:** 849
**Status:** READY_FOR_TESTS

---

## Work Order Created

Work order successfully created at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Summary

**Primary Spec:** openspec/specs/ui-system/conflict.md

The Conflict UI provides:
- Combat HUD overlay (REQ-COMBAT-001)
- Health bars with injury indicators (REQ-COMBAT-002)
- Combat unit panel with detailed stats (REQ-COMBAT-003)
- Stance controls (passive/defensive/aggressive/flee) (REQ-COMBAT-004)
- Threat indicators (on-screen and off-screen) (REQ-COMBAT-005)
- Combat log with filtering (REQ-COMBAT-006)
- Tactical overview (REQ-COMBAT-007)
- Ability bar (REQ-COMBAT-008)
- Defense management (REQ-COMBAT-009)
- Floating damage numbers (REQ-COMBAT-010)
- Keyboard shortcuts (REQ-COMBAT-011)

---

## Dependencies Verified

All dependencies are met:
- ✅ conflict-system/spec.md - Conflict mechanics exist
- ✅ agent-system/spec.md - Agent stats exist
- ✅ ui-system/notifications.md - Notification system exists

---

## Existing Components

Several combat UI components **already exist**:
- HealthBarRenderer.ts - Functional health bar rendering
- ThreatIndicatorRenderer.ts - Functional threat indicators
- CombatHUDPanel.ts - Combat HUD overlay
- CombatUnitPanel.ts - Unit detail panel
- StanceControls.ts - Stance selector buttons
- CombatLogPanel.ts - Combat event log

Implementation should focus on:
1. Verifying existing components work
2. Filling gaps (tactical view, defense management)
3. Integration with EventBus and game systems
4. Enhancement of existing components

---

## System Integration Points

### EventBus Events (Already Defined)
- `conflict:started` - Activates Combat HUD, adds threat indicators
- `conflict:resolved` - Removes threat indicators, logs outcome
- `combat:attack` - Logs attack event
- `combat:damage` - Shows damage numbers, logs damage
- `combat:death` - Logs death event, removes threat
- `combat:injury` - Shows injury indicator, logs injury
- `combat:dodge` - Logs dodge event
- `combat:block` - Logs block event
- `death:occurred` - Removes entity from all UI tracking

### Components Used
- `conflict` - Active conflict state
- `combat_stats` - Combat skills, stance, equipment
- `injury` - Active injuries
- `needs` - Health tracking
- `position` - World position for rendering

---

## Files to Create/Modify

**Existing (Enhance):**
- packages/renderer/src/HealthBarRenderer.ts
- packages/renderer/src/ThreatIndicatorRenderer.ts
- packages/renderer/src/CombatHUDPanel.ts
- packages/renderer/src/CombatUnitPanel.ts
- packages/renderer/src/StanceControls.ts
- packages/renderer/src/CombatLogPanel.ts

**New (Create):**
- packages/renderer/src/TacticalOverviewPanel.ts
- packages/renderer/src/DefenseManagementPanel.ts
- packages/renderer/src/DamageNumbersRenderer.ts
- packages/renderer/src/AbilityBarPanel.ts

**Integration:**
- packages/renderer/src/Renderer.ts - Add combat UI to render loop
- packages/renderer/src/index.ts - Export new components

---

## Priority Implementation Order

### Phase 1 (MUST - Core):
1. Verify and test HealthBarRenderer with current game
2. Verify and test ThreatIndicatorRenderer with current game
3. Integrate CombatHUDPanel with conflict:started/resolved events
4. Wire StanceControls to update combat_stats.stance component
5. Connect CombatLogPanel to combat EventBus events

### Phase 2 (SHOULD - Important):
6. Implement TacticalOverviewPanel
7. Add keyboard shortcuts (CombatShortcuts)
8. Implement DefenseManagementPanel

### Phase 3 (MAY - Enhancement):
9. Implement DamageNumbersRenderer
10. Implement AbilityBarPanel

---

## Key Acceptance Criteria

1. Combat HUD activates on conflict:started event ✓
2. Health bars show for injured/combat entities with color coding ✓
3. Injury indicators appear above health bars ✓
4. Combat Unit Panel displays stats/equipment/stance ✓
5. Stance controls update entity combat_stats.stance ✓
6. Threat indicators render at correct world positions ✓
7. Off-screen threats show edge indicators with direction ✓
8. Combat log appends events with timestamps ✓
9. Combat log filtering works (by type, entity) ✓
10. Tactical overview shows force counts and battle predictions ✓
11. Keyboard shortcuts work (1-4 for stances, T for tactical) ✓

---

## Technical Requirements

### Error Handling (CLAUDE.md)
- ❌ NO silent fallbacks - crash on missing components
- ✅ Use lowercase_with_underscores for component types
- ✅ Validate entities have required components before rendering
- ✅ Throw clear errors for missing event fields
- ❌ NO console.log debug statements

### Performance
- HealthBarRenderer already optimized (viewport culling, pre-filtered entities)
- ThreatIndicatorRenderer already optimized (cached player entity)
- Combat log should cap max events at 100-200
- Off-screen threat calculation uses geometry optimization

### EventBus Integration
- Listen: conflict:started, conflict:resolved, combat:*, injury:*, death:occurred
- Always cleanup event subscriptions on component unmount
- No silent failures on event handling - throw errors

---

## Handoff

**Status:** READY_FOR_TESTS
**Next Agent:** Test Agent

Work order is complete and comprehensive with:
- ✅ All requirements extracted from spec
- ✅ Acceptance criteria defined (11 criteria)
- ✅ System integration points identified
- ✅ Existing components noted
- ✅ New components listed
- ✅ Priority order established
- ✅ Technical requirements documented
- ✅ Playtest scenarios included

The Test Agent can now create test cases based on the acceptance criteria.
