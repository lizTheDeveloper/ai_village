# WORK ORDER COMPLETE: conflict-ui

**Timestamp:** 2025-12-31 13:16:00
**Agent:** spec-agent-001
**Phase:** 16

---

## Work Order Created

Work order successfully created at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec Analysis

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Completeness:** ✅ Complete with all requirements and TypeScript interfaces
- **Dependencies:** All referenced (conflict-system, agent-system, notifications)

---

## Requirements Extracted

11 requirements documented (REQ-COMBAT-001 through REQ-COMBAT-011):
- 4 MUST requirements (HUD, health bars, unit panel, stance controls, threat indicators)
- 4 SHOULD requirements (combat log, tactical overview, defense management, shortcuts)
- 3 MAY requirements (ability bar, damage numbers)

---

## Acceptance Criteria

10 acceptance criteria defined with WHEN/THEN/VERIFICATION:
1. Combat HUD activation on conflict:started event
2. Health bar display with color coding
3. Injury status display with icons
4. Stance control button interactions
5. Threat indicator positioning (on-screen and off-screen)
6. Combat log event capture
7. Tactical overview force comparison
8. Defense zone management
9. Keyboard shortcut support
10. Combat resolution display in log

---

## System Integration Analysis

**Existing Systems:**
- AgentCombatSystem (combat events)
- InjurySystem (injury components)
- HuntingSystem (hunting events)
- PredatorAttackSystem (predator events)
- DominanceChallengeSystem (dominance events)
- GuardDutySystem (guard components)
- VillageDefenseSystem (defense components)

**New Components:** None required (UI reads from existing components)

**Events to Listen:**
- combat:started, combat:ended
- hunting:started, hunting:ended
- predator:attack_started, predator:attack_ended
- dominance:challenge_started, dominance:challenge_ended
- entity:injured, entity:death

---

## Files to Create

10 new renderer components in `packages/renderer/src/combat/`:
1. CombatHUD.ts
2. HealthBarRenderer.ts
3. CombatUnitPanel.ts
4. StanceControls.ts
5. ThreatIndicators.ts
6. CombatLog.ts
7. TacticalOverview.ts
8. DefenseManagement.ts
9. DamageNumbers.ts
10. CombatShortcuts.ts

---

## Implementation Notes

- Follow BuildingPlacementUI.ts pattern
- Use lowercase_with_underscores for component type names
- No silent fallbacks - throw on missing required data
- Render health bars only for visible/combat entities
- Limit threat indicators to top 20 by severity
- Cap combat log at 100 events

---

## Handoff

**Status:** READY_FOR_TESTS

The work order is complete and ready for the Test Agent to proceed with test implementation.

Test files already exist at:
- `packages/renderer/src/__tests__/CombatHUDPanel.test.ts`
- `packages/renderer/src/__tests__/CombatLogPanel.test.ts`

These test files contain comprehensive test scenarios but are currently skipped (describe.skip). The Test Agent should update these tests to match the actual implementation.

---

**Next Agent:** Test Agent should claim this work order and write/update tests.
