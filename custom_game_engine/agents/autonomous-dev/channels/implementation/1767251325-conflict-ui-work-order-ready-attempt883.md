# Work Order Ready: conflict-ui

**Attempt:** #883
**Created:** 2025-12-31 23:08:45 UTC
**Spec Agent:** spec-agent-001
**Status:** ✅ READY_FOR_TESTS

---

## Work Order Details

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** 16

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

---

## Verification Summary

✅ Work order file exists at correct location
✅ Comprehensive work order with 9 acceptance criteria
✅ All dependencies documented:
  - conflict-system/spec.md (conflict mechanics)
  - agent-system/spec.md (agent stats)
  - ui-system/notifications.md (combat alerts)

✅ 13 requirements extracted from spec (5 MUST, 4 SHOULD, 2 SHALL, 2 MAY)
✅ Integration points documented (7 systems affected)
✅ Existing components identified (6 components already exist)
✅ Notes for Implementation and Playtest agents included

---

## Requirements Breakdown

### MUST (5 requirements)
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury display
3. REQ-COMBAT-003: Combat unit panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

### SHOULD (4 requirements)
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
9. REQ-COMBAT-009: Defense management
11. REQ-COMBAT-011: Keyboard shortcuts

### SHALL (2 requirements)
12. REQ-COMBAT-012: Combat narratives (LLM)
13. REQ-COMBAT-013: Hunting narratives (LLM)

### MAY (2 requirements)
8. REQ-COMBAT-008: Ability bar
10. REQ-COMBAT-010: Damage numbers

---

## Existing Implementation

**Six components already exist:**
1. `packages/renderer/src/CombatHUDPanel.ts` → REQ-COMBAT-001
2. `packages/renderer/src/HealthBarRenderer.ts` → REQ-COMBAT-002
3. `packages/renderer/src/CombatUnitPanel.ts` → REQ-COMBAT-003
4. `packages/renderer/src/StanceControls.ts` → REQ-COMBAT-004
5. `packages/renderer/src/ThreatIndicatorRenderer.ts` → REQ-COMBAT-005
6. `packages/renderer/src/CombatLogPanel.ts` → REQ-COMBAT-006

**Critical:** Implementation agent MUST read and verify existing components before creating new ones.

---

## System Integration

### Systems Affected
| System | Integration Type |
|--------|------------------|
| HuntingSystem | EventBus listeners |
| AgentCombatSystem | EventBus listeners |
| PredatorAttackSystem | EventBus listeners |
| DominanceChallengeSystem | EventBus listeners |
| InjurySystem | Query for state |
| GuardDutySystem | Query for assignments |
| VillageDefenseSystem | Query for structures |

### Events to Listen
- `hunting:attempt`, `hunting:outcome`
- `combat:start`, `combat:end`
- `predator:attack`
- `dominance:challenge`
- `injury:inflicted`
- `death`
- `threat:detected`
- `conflict:resolved`

---

## Files Likely Modified

**Existing UI Components (READ FIRST):**
- `packages/renderer/src/CombatHUDPanel.ts`
- `packages/renderer/src/HealthBarRenderer.ts`
- `packages/renderer/src/CombatUnitPanel.ts`
- `packages/renderer/src/StanceControls.ts`
- `packages/renderer/src/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/CombatLogPanel.ts`

**Integration:**
- `packages/renderer/src/Renderer.ts`
- `packages/renderer/src/index.ts`
- `packages/renderer/src/KeyboardRegistry.ts`

**New Components (IF NEEDED):**
- `packages/renderer/src/TacticalOverviewPanel.ts`
- `packages/renderer/src/DefenseManagementPanel.ts`
- `packages/renderer/src/DamageNumbersRenderer.ts`
- `packages/renderer/src/AbilityBarPanel.ts`

---

## Special Notes

### LLM Narrative Generation
REQ-COMBAT-012 and REQ-COMBAT-013 require LLM integration for combat/hunting narratives.
- Check if core systems already generate narratives
- May require updating HuntingSystem/AgentCombatSystem, not just UI

### Conflict-System Types
The UI spec references many types from conflict-system/spec.md.
- Verify TypeScript interfaces exist
- May need type definitions created from spec

### Context Menu Integration
The context-menu UI should integrate with conflict UI:
- Right-click hostile → "Attack" action
- Right-click friendly → "Set Stance" submenu
- Right-click structure → "Assign Guard" option

Check: `packages/renderer/src/ContextMenuManager.ts`

---

## Handing Off

**To:** Test Agent
**Next Step:** Create test specifications for conflict UI requirements

Work order is complete and ready for the test pipeline.

---

**Spec Agent: COMPLETE**
