# CLAIMED: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T12:57:00Z
**Status:** Work order created

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

Created comprehensive work order for Conflict/Combat UI implementation.

**Phase:** 16
**Spec:** openspec/specs/ui-system/conflict.md
**Dependencies:** All met ✅

---

## Requirements Breakdown

### MUST (Critical Priority)
- Combat HUD overlay with active conflicts and threat level
- Health bars with injury/status effect display
- Combat Unit Panel with detailed stats and equipment
- Stance Controls for combat behavior settings
- Threat Indicators with on/off-screen visualization

### SHOULD (High Priority)
- Combat Log with event filtering
- Tactical Overview with forces summary
- Defense Management with structures and zones
- Keyboard Shortcuts for all combat actions

### MAY (Optional)
- Ability Bar with cooldown tracking
- Damage Numbers for visual feedback

---

## System Integration Points

The work order identifies 6 existing systems that emit combat events:
- AgentCombatSystem
- PredatorAttackSystem
- GuardDutySystem
- DominanceChallengeSystem
- HuntingSystem
- EventBus (World.ts)

8 new UI components needed:
- CombatHUD (main overlay)
- HealthBarRenderer
- CombatUnitPanel
- StanceControls
- ThreatIndicators
- CombatLog
- TacticalOverview
- CombatState (state manager)

---

## Architecture Notes

Work order includes:
- Detailed acceptance criteria for each requirement
- UI layout specifications with positioning
- Event flow documentation (emits/listens)
- File modification list
- Implementation patterns to follow (InventoryUI pattern)
- Performance considerations
- Testing guidance for Playtest Agent

---

## Handing Off

This work order is now ready for the Test Agent to:
1. Create test scenarios
2. Define test cases
3. Hand off to Implementation Agent

**Next Step:** Test Agent reads work order and creates test plan
