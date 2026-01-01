# Conflict UI Work Order - CONFIRMED

**Timestamp:** 1767251792 (2025-12-31)
**Attempt:** 886
**Status:** READY_FOR_IMPLEMENTATION

---

## Work Order Verified

The work order for **conflict-ui** has been successfully created and verified at:

```
/Users/annhoward/src/ai_village/agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

---

## Work Order Summary

- **Phase:** 16
- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Status:** READY_FOR_TESTS
- **Requirements:** 13 total (REQ-COMBAT-001 through REQ-COMBAT-013)

---

## Key Requirements

### MUST Requirements
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bars with injury display (REQ-COMBAT-002)
3. Combat Unit Panel (REQ-COMBAT-003)
4. Stance Controls (REQ-COMBAT-004)
5. Threat Indicators (REQ-COMBAT-005)
6. LLM Combat Narratives (REQ-COMBAT-012)
7. LLM Hunting Narratives (REQ-COMBAT-013)

### SHOULD Requirements
8. Combat Log (REQ-COMBAT-006)
9. Tactical Overview (REQ-COMBAT-007)
10. Defense Management (REQ-COMBAT-009)
11. Keyboard Shortcuts (REQ-COMBAT-011)

### MAY Requirements
12. Ability Bar (REQ-COMBAT-008)
13. Damage Numbers (REQ-COMBAT-010)

---

## Critical Notes for Implementation Agent

### Existing Components Already Exist!

**DO NOT recreate from scratch. VERIFY first:**

1. `packages/renderer/src/CombatHUDPanel.ts` - ✅ Exists
2. `packages/renderer/src/HealthBarRenderer.ts` - ✅ Exists
3. `packages/renderer/src/CombatUnitPanel.ts` - ✅ Exists
4. `packages/renderer/src/StanceControls.ts` - ✅ Exists
5. `packages/renderer/src/ThreatIndicatorRenderer.ts` - ✅ Exists
6. `packages/renderer/src/CombatLogPanel.ts` - ✅ Exists

**Implementation Steps:**
1. READ each existing component
2. VERIFY against spec requirements
3. UPDATE if incomplete or incorrect
4. CREATE new components only if missing

---

## Integration Points

### Events to Listen For
- `hunting:attempt` - From HuntingSystem
- `hunting:outcome` - From HuntingSystem
- `combat:start` - From AgentCombatSystem
- `combat:end` - From AgentCombatSystem
- `predator:attack` - From PredatorAttackSystem
- `dominance:challenge` - From DominanceChallengeSystem
- `injury:inflicted` - From InjurySystem
- `death` - From various conflict systems
- `threat:detected` - From GuardDutySystem

### Systems to Query
- InjurySystem - For injury state
- GuardDutySystem - For guard assignments
- VillageDefenseSystem - For defense structures

---

## Success Criteria

1. All existing combat UI components verified against spec
2. Missing components implemented
3. All MUST/SHOULD requirements satisfied
4. Combat and hunting events display correctly
5. Health bars render with injury icons
6. Stance controls change agent behavior
7. Threat indicators show and update
8. Combat log captures all events
9. Keyboard shortcuts functional
10. LLM narratives generate for combat and hunting
11. No console errors during combat
12. Acceptable performance with multiple combatants

---

## Next Step

**Handoff to Test Agent** to verify existing components against spec and create test plan.

---

**Spec Agent:** spec-agent-001
**Work Order Location:** `/Users/annhoward/src/ai_village/agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
**Channel:** implementation
**Ready for:** Test Agent verification
