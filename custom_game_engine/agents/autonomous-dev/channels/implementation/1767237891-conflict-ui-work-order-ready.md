# WORK ORDER READY: conflict-ui

**Timestamp:** 1767237891 (2025-12-31)
**Phase:** 16
**Attempt:** #772

---

## Work Order Details

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Spec:** `openspec/specs/ui-system/conflict.md`

**Status:** READY_FOR_TESTS

---

## Requirements Summary

The Conflict/Combat UI provides visualization and control of combat situations, threats, and defensive operations.

### MUST Requirements (Priority)
1. **REQ-COMBAT-001**: Combat HUD overlay showing combat-relevant information
2. **REQ-COMBAT-002**: Visual health bars for entities with injury indicators
3. **REQ-COMBAT-003**: Detailed Combat Unit Panel for selected units
4. **REQ-COMBAT-004**: Stance Controls to set combat behavior (passive/defensive/aggressive/flee)
5. **REQ-COMBAT-005**: Threat Indicators for threats in world (on-screen and off-screen)

### SHOULD Requirements
6. **REQ-COMBAT-006**: Combat Log of combat events
7. **REQ-COMBAT-007**: Tactical Overview of combat situation
8. **REQ-COMBAT-009**: Defense Management for defensive structures
9. **REQ-COMBAT-011**: Keyboard Shortcuts for combat actions

### MAY Requirements
10. **REQ-COMBAT-008**: Ability Bar for combat abilities
11. **REQ-COMBAT-010**: Damage Numbers (floating combat numbers)

---

## Dependencies Met

✅ **Spec Complete:** openspec/specs/ui-system/conflict.md exists and is detailed
✅ **Related Specs:** conflict-system/spec.md, agent-system/spec.md, ui-system/notifications.md
✅ **Existing Systems:** HealthBarRenderer, ThreatIndicatorRenderer, EventBus, Renderer
✅ **No Blockers:** All dependencies documented, work order is comprehensive

---

## System Integration

### New Components
- CombatHUDRenderer
- CombatUnitPanel
- StanceControlsPanel
- CombatLogPanel
- TacticalOverviewPanel
- DefenseManagementPanel
- DamageNumbersRenderer
- CombatShortcutHandler
- CombatStateManager

### New Entity Components
- CombatStanceComponent
- ThreatComponent
- InjuryComponent (or extend HealthComponent)
- CombatUnitComponent

### Event Integration
**New Events to Add:**
- `combat:started`
- `combat:ended`
- `combat:damage_dealt`
- `combat:injury_inflicted`
- `combat:death`
- `threat:detected`
- `threat:removed`
- `combat:stance_changed`
- `combat:unit_selected`
- `combat:ability_activated`

---

## Files to Create/Modify

### Core Package
- `events/EventMap.ts` - Add combat event types
- `components/CombatStanceComponent.ts` - NEW
- `components/ThreatComponent.ts` - NEW
- `components/InjuryComponent.ts` - NEW
- `components/CombatUnitComponent.ts` - NEW
- `components/index.ts` - Export new components
- `types/ComponentType.ts` - Add component type strings

### Renderer Package
- `HealthBarRenderer.ts` - Extend for injuries
- `ThreatIndicatorRenderer.ts` - Extend for combat
- `ContextMenuRenderer.ts` - Add combat actions
- `CombatHUDRenderer.ts` - NEW
- `CombatUnitPanel.ts` - NEW
- `StanceControlsPanel.ts` - NEW
- `CombatLogPanel.ts` - NEW
- `TacticalOverviewPanel.ts` - NEW
- `DefenseManagementPanel.ts` - NEW
- `DamageNumbersRenderer.ts` - NEW
- `CombatShortcutHandler.ts` - NEW
- `CombatStateManager.ts` - NEW
- `Renderer.ts` - Integrate combat UI
- `index.ts` - Export new components

---

## Success Criteria

1. All MUST requirements implemented
2. Health bars render with injury icons
3. Stance controls change entity behavior
4. Threat indicators appear (on-screen and off-screen)
5. Combat unit panel displays all stats
6. Combat HUD activates during combat
7. All combat events in EventMap
8. All new components exported
9. Renderer integrates combat UI layers
10. Build passes (`npm run build`)
11. Playtest Agent verifies all acceptance criteria

---

## Notes

- **Conflict system may not be fully implemented** - UI should handle gracefully with mock data
- **Follow existing patterns** - Extend HealthBarRenderer/ThreatIndicatorRenderer rather than replace
- **Event-driven design** - Use EventBus for all state communication
- **8-bit visual style** - Follow CombatStyle interface from spec
- **Component naming** - Use lowercase_with_underscores (per CLAUDE.md)

---

## Handing Off

**Next Agent:** Test Agent

The work order is complete and ready for the Test Agent to create test specifications.

---

**Spec Agent:** spec-agent-001
**Date:** 2025-12-31
**Attempt:** #772
