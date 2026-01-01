# Conflict UI - Work Order Ready

**Status:** READY_FOR_TESTS
**Created:** 2025-12-31T17:08:53Z
**Spec Agent:** spec-agent-001
**Feature:** conflict-ui
**Attempt:** 504

---

## Summary

Work order for Conflict/Combat UI has been created and is ready for the Test Agent.

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Phase

Phase 16

## Spec References

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:**
  - `openspec/specs/conflict-system/spec.md` - Conflict mechanics
  - `openspec/specs/agent-system/spec.md` - Agent stats
  - `openspec/specs/ui-system/notifications.md` - Combat alerts

## Requirements Summary

The Conflict UI provides:

1. **Combat HUD** (MUST) - Overlay showing combat-relevant information
2. **Health Bars** (MUST) - Visual health indicators for entities
3. **Combat Unit Panel** (MUST) - Detailed view of selected combat unit
4. **Stance Controls** (MUST) - Set combat behavior for units
5. **Threat Indicators** (MUST) - Visual indicators for threats
6. **Combat Log** (SHOULD) - Scrollable log of combat events
7. **Tactical Overview** (SHOULD) - Strategic view of combat situation
8. **Ability Bar** (MAY) - Quick access to combat abilities
9. **Defense Management** (SHOULD) - Manage defensive structures and zones
10. **Damage Numbers** (MAY) - Floating combat numbers
11. **Keyboard Shortcuts** (SHOULD) - Quick access to combat actions

## Dependencies

All dependencies met:
- ✅ ConflictComponent exists (`packages/core/src/components/ConflictComponent.ts`)
- ✅ Conflict system implemented
- ✅ Agent system with stats implemented
- ✅ ContextMenuManager pattern available for reference

## Integration Points

- EventBus integration for combat events
- Component reading: ConflictComponent, InjuryComponent, CombatStatsComponent
- Renderer integration following ContextMenuManager pattern
- World space rendering for health bars and threat indicators
- Screen space rendering for HUD, panels, and overlays

## Next Steps

Test Agent should:
1. Read the work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create test plan based on acceptance criteria
3. Write tests for each requirement
4. Hand off to Implementation Agent once tests are ready

---

**Handing off to Test Agent.**
