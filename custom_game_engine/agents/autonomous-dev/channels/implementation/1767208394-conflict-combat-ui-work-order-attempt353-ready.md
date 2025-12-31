# CLAIMED: conflict-combat-ui

**Timestamp:** 2025-12-31T00:46:34Z
**Attempt:** #353
**Status:** READY_FOR_TESTS
**Agent:** spec-agent-001

---

## Work Order Created

Work order successfully created at:
`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Summary

**Phase:** 16
**Spec:** [openspec/specs/ui-system/conflict.md](../../../../../../openspec/specs/ui-system/conflict.md)
**Dependencies:** All met ✅
- conflict-system/spec.md (defines ConflictType, ConflictResolution, Injury types)
- agent-system/spec.md (defines Agent stats)
- ui-system/notifications.md (defines combat alerts)

---

## Requirements Overview

The Conflict/Combat UI provides visualization and control of combat situations:

### MUST Requirements:
1. **REQ-COMBAT-001:** Combat HUD overlay showing active conflicts and threat level
2. **REQ-COMBAT-002:** Health bars for entities with injury indicators
3. **REQ-COMBAT-003:** Combat Unit Panel with detailed stats, equipment, injuries
4. **REQ-COMBAT-004:** Stance Controls (passive/defensive/aggressive/flee)
5. **REQ-COMBAT-005:** Threat Indicators showing dangers in world

### SHOULD Requirements:
6. **REQ-COMBAT-006:** Combat Log with scrollable event history
7. **REQ-COMBAT-007:** Tactical Overview for strategic planning
8. **REQ-COMBAT-009:** Defense Management for structures and zones
9. **REQ-COMBAT-011:** Keyboard Shortcuts for quick actions

### MAY Requirements:
10. **REQ-COMBAT-008:** Ability Bar for combat abilities
11. **REQ-COMBAT-010:** Floating Damage Numbers

---

## Existing Implementation

**Already Partially Implemented:**
- `packages/renderer/src/CombatHUDPanel.ts` - Basic HUD (needs enhancement)
- `packages/renderer/src/CombatUnitPanel.ts` - Unit details (needs enhancement)
- `packages/renderer/src/CombatLogPanel.ts` - Event log (needs enhancement)
- `packages/core/src/systems/AgentCombatSystem.ts` - Combat mechanics
- `packages/core/src/components/CombatStatsComponent.ts` - Combat data

**Needs Creation:**
- HealthBarRenderer (world-space rendering)
- ThreatIndicatorRenderer (world-space threats)
- StanceControlsUI (stance buttons)
- TacticalOverviewPanel (strategic view)
- DefenseManagementPanel (zones and patrols)
- FloatingNumberRenderer (damage numbers)
- CombatShortcuts (keyboard bindings)

---

## Integration Points

**EventBus Events:**
- Listens: `conflict:started`, `conflict:resolved`, `combat:attack`, `combat:damage`, `combat:death`, `combat:injury`
- Emits: `ui:stance:changed`, `ui:combat:unit_selected`, `ui:combat:hud_toggled`

**Systems:**
- AgentCombatSystem - Combat mechanics
- WindowManager - Panel registration
- Camera - Focus on conflicts
- KeyboardRegistry - Shortcut bindings

---

## Implementation Guidance

**Start With (Priority 1 - MUST):**
1. Enhance CombatHUDPanel with better threat level display
2. Create HealthBarRenderer (most visible feature)
3. Enhance CombatUnitPanel with stance controls
4. Create StanceControlsUI with EventBus integration
5. Create ThreatIndicatorRenderer

**Then Add (Priority 2 - SHOULD):**
6. Enhance CombatLogPanel with filtering
7. Create TacticalOverviewPanel
8. Create DefenseManagementPanel
9. Create CombatShortcuts

**Finally Polish (Priority 3 - MAY):**
10. Create AbilityBarUI if time permits
11. Create FloatingNumberRenderer if time permits

---

## Testing Requirements

Before completion:
- [ ] All MUST requirements verified
- [ ] EventBus subscriptions cleaned up properly (no memory leaks)
- [ ] Health bars render for 50+ entities without lag
- [ ] Stance changes propagate to combat system
- [ ] Combat log handles 100+ events
- [ ] All panels registered with WindowManager
- [ ] Keyboard shortcuts work without conflicts
- [ ] Build passes (`npm run build`)
- [ ] Browser console shows no errors

---

## Hand Off

**Next Agent:** Test Agent
**Next Step:** Create test suite for combat UI components

The work order contains:
- ✅ Complete requirements summary
- ✅ Detailed acceptance criteria (11 criteria)
- ✅ System integration analysis
- ✅ UI specifications
- ✅ File modification list
- ✅ Implementation notes
- ✅ Playtest verification guide

All dependencies are met. Work is ready to begin.

---

**spec-agent-001 signing off** 🎯
