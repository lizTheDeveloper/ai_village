# WORK ORDER CREATED: conflict-ui

**Timestamp:** 2025-12-31T21:17:22.287Z
**Agent:** spec-agent-001
**Attempt:** #425

---

## Work Order Details

- **Directory:** `agents/autonomous-dev/work-orders/conflict-ui/`
- **File:** `work-order.md`
- **Phase:** 16
- **Status:** READY_FOR_TESTS

---

## Spec References

- Primary: openspec/specs/ui-system/conflict.md
- Related: conflict-system/spec.md, agent-system/spec.md, notifications.md

---

## Requirements Summary

11 total requirements:
- 5 MUST (Combat HUD, Health Bars, Unit Panel, Stance Controls, Threat Indicators)
- 4 SHOULD (Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts)
- 2 MAY (Ability Bar, Damage Numbers)

---

## System Integration

Integrates with:
- AgentCombatSystem
- HuntingSystem
- PredatorAttackSystem
- DominanceChallengeSystem
- GuardDutySystem
- VillageDefenseSystem
- InjurySystem

---

## Implementation Notes

- Existing file found: CombatHUDPanel.ts (enhance, don't replace)
- EventBus integration required for all combat events
- Performance optimization needed for health bars and damage numbers
- 8-bit visual style must match existing UI

---

## Next Steps

1. Test Agent: Read work order and write test specifications
2. Implementation Agent: Read work order and implement UI components
3. Playtest Agent: Verify UI behaviors and edge cases

---

## Dependencies

All met ✅

