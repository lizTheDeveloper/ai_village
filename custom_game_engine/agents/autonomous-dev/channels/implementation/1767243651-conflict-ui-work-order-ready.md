# WORK ORDER READY: conflict-ui

**Feature:** Conflict/Combat UI
**Phase:** 16
**Attempt:** 819
**Timestamp:** 2025-12-31T20:57:31Z

---

## Status: READY_FOR_TESTS

Work order created at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Created comprehensive work order for Conflict/Combat UI feature based on spec at `openspec/specs/ui-system/conflict.md`.

### Requirements Covered (11 total):
- **REQ-COMBAT-001** (MUST): Combat HUD overlay - shows active conflicts, threat level, recent events
- **REQ-COMBAT-002** (MUST): Health bars - color-coded with injury indicators
- **REQ-COMBAT-003** (MUST): Combat Unit Panel - detailed stats, equipment, injuries
- **REQ-COMBAT-004** (MUST): Stance Controls - passive/defensive/aggressive/flee
- **REQ-COMBAT-005** (MUST): Threat Indicators - in-world and off-screen arrows
- **REQ-COMBAT-006** (SHOULD): Combat Log - scrollable event history with filters
- **REQ-COMBAT-007** (SHOULD): Tactical Overview - forces summary, battle prediction
- **REQ-COMBAT-008** (MAY): Ability Bar - quick access to combat abilities
- **REQ-COMBAT-009** (SHOULD): Defense Management - zones, patrols, structures
- **REQ-COMBAT-010** (MAY): Damage Numbers - floating combat feedback
- **REQ-COMBAT-011** (SHOULD): Keyboard Shortcuts - 1-4 stances, A/H/R/L/T commands

### Existing Components Identified:
- ✅ CombatHUDPanel.ts (exists, needs enhancement)
- ✅ CombatLogPanel.ts (exists, needs filtering/expansion)
- ✅ CombatUnitPanel.ts (exists, needs completion)
- ✅ HealthBarRenderer.ts (exists, needs injury indicators)
- ✅ ThreatIndicatorRenderer.ts (exists, needs off-screen arrows)

### New Components Needed:
- 📝 StanceControlsUI.ts (REQ-COMBAT-004)
- 📝 TacticalOverviewPanel.ts (REQ-COMBAT-007)
- 📝 DefenseManagementPanel.ts (REQ-COMBAT-009)
- 📝 AbilityBarUI.ts (REQ-COMBAT-008 - optional MAY)
- 📝 DamageNumbersRenderer.ts (REQ-COMBAT-010 - optional MAY)
- 📝 CombatKeyboardShortcuts.ts (REQ-COMBAT-011)

### Integration Points:
- **EventBus Events:**
  - Listens: conflict:started, combat:attack, combat:ended, death:occurred, injury:inflicted
  - Emits: stance:changed, defense_zone:created, patrol_route:created, ability:used

- **Affected Systems:**
  - AgentCombatSystem (packages/core/src/systems/AgentCombatSystem.ts)
  - InjurySystem (packages/core/src/systems/InjurySystem.ts)
  - GuardDutySystem (packages/core/src/systems/GuardDutySystem.ts)

- **Core Files to Modify:**
  - packages/renderer/src/Renderer.ts (wire up new components)
  - packages/core/src/components/index.ts (export any new types)
  - packages/renderer/src/index.ts (export new UI classes)

---

## Key Acceptance Criteria

1. **Combat HUD**: Appears when conflict:started event fires, shows conflict type and participants
2. **Health Bars**: Display above injured entities, color-coded (green >66%, yellow 33-66%, red <33%)
3. **Stance Controls**: 4 buttons change agent combat behavior, persist after deselection
4. **Threat Indicators**: Show in-world for visible threats, arrows at screen edge for off-screen threats
5. **Combat Log**: Records all combat events (attack, damage, injury, death) with timestamps
6. **Tactical Overview**: Toggle with 'T' key, shows force counts and battle odds
7. **Keyboard Shortcuts**: 1-4 for stances, A/H/R for commands, L/T for UI toggles

---

## Special Notes for Implementation

- **Priority Order**: MUST requirements (001-005) first, then SHOULD (006, 007, 009, 011), defer MAY (008, 010)
- **Performance**: Use pre-filtered entity lists for health bars/threat indicators (see existing implementations)
- **Event-Driven**: UI should react to EventBus events, not poll for changes
- **Type Safety**: Use spec-defined types (ConflictType, InjuryType, CombatStance)
- **Component Naming**: Use lowercase_with_underscores (e.g., 'combat_stats' not 'CombatStats')
- **Error Handling**: No silent fallbacks - throw clear errors if required data missing

---

## Dependencies Met: ✅

All blocking tasks completed. Ready for implementation pipeline.

- ✅ conflict-system/spec.md - Conflict mechanics implemented
- ✅ agent-system/spec.md - Agent stats available
- ✅ ui-system/notifications.md - Notification system exists

---

## Next Steps

1. **Test Agent**: Review work order and create comprehensive test plan
2. **Implementation Agent**: Implement based on work order priorities
3. **Playtest Agent**: Verify in-game functionality and edge cases

---

**Spec Agent:** spec-agent-001
**Work Order File:** agents/autonomous-dev/work-orders/conflict-ui/work-order.md
**Attempt:** 819
