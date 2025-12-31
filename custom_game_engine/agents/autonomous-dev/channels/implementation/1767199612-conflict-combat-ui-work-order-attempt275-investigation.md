# Investigation Report: Conflict System Components

**Status:** IN-PROGRESS
**Date:** 2025-12-31
**Agent:** Implementation Agent
**Work Order:** conflict-combat-ui

---

## Investigation Summary

Investigated playtest feedback claiming conflict components are not attached to entities. Analysis shows the code IS correct, but there may be a discrepancy between the tested build and current code.

---

## Findings

### ✅ Component Attachment Code EXISTS

**File:** `packages/world/src/entities/AgentEntity.ts` (lines 186-190)

Both `createWanderingAgent` and `createLLMAgent` attach combat_stats:
```typescript
entity.addComponent(createCombatStatsComponent({
  combatSkill: (skillsComponent.levels.combat || 0) / 5,
  huntingSkill: (skillsComponent.levels.hunting || 0) / 5,
  stealthSkill: (skillsComponent.levels.stealth || 0) / 5,
}));
```

### ✅ Component Serializers ARE Registered

Playtest confirmed all 8 conflict serializers registered at startup:
- conflict
- injury
- guard_duty
- combat_stats
- dominance_rank
- pack_combat
- hive_combat
- manchi

### ✅ Systems ARE Registered

**File:** `demo/src/main.ts` (lines 620-626)

All 7 conflict systems registered in correct order:
1. HuntingSystem
2. PredatorAttackSystem
3. AgentCombatSystem
4. DominanceChallengeSystem
5. InjurySystem
6. GuardDutySystem
7. VillageDefenseSystem

### ✅ Skills Exist

**File:** `packages/core/src/components/SkillsComponent.ts` (lines 28-30)

All three required skills defined:
- combat (line 28)
- hunting (line 29)
- stealth (line 30)

Playtest confirmed these NOW exist in agents (improvement from previous test).

---

## Discrepancy Analysis

### Playtest Claim:
"Components NOT attached to entities. Agent has 34 components, but NOT combat_stats."

### Code Reality:
`createLLMAgent` (line 348) explicitly calls `addComponent(createCombatStatsComponent(...))`.

### Possible Explanations:

1. **Stale Build:** Game was built before combat_stats was added
   - **Fix:** Rebuild and restart game

2. **Runtime Error:** Component creation throws error silently
   - **Check:** Console logs for errors during agent spawn

3. **Export Issue:** createCombatStatsComponent not exported properly
   - **Status:** ✅ VERIFIED - Exported in components/index.ts:307-308

4. **Old Agent Entities:** Game loaded agents from save before combat_stats existed
   - **Fix:** Create new game session, don't load from save

---

## What IS Missing (Confirmed)

### 1. UI Components (0/7 implemented)
- ❌ HealthBarRenderer
- ❌ CombatHUD
- ❌ CombatUnitPanel
- ❌ StanceControls
- ❌ ThreatIndicators
- ❌ CombatLog
- ❌ TacticalOverview

### 2. Conflict Triggers (Systems run but don't trigger)
- ❌ No hunting behavior in AgentBrainSystem
- ❌ No predator attack triggers in AnimalBrainSystem
- ❌ No combat stance system
- ❌ No dominance challenge triggers

---

## Test Status

- **Build:** ✅ PASSING
- **Unit Tests:** ✅ 51/51 conflict tests passing
- **Integration Tests:** ✅ All passing
- **Browser Verification:** 🔄 PENDING

---

## Next Steps

1. ✅ Run build (DONE - passing)
2. 🔄 Test in browser with fresh game session
3. 🔄 Verify combat_stats appears on newly created agents
4. 📝 Implement minimum viable UI (health bars)
5. 📝 Implement conflict triggers
6. 📝 Re-submit for playtest

---

## Conclusion

The infrastructure EXISTS and tests PASS. The playtest may have tested an old build or loaded a save from before combat_stats was added. Next step: browser verification with fresh session.

---

**Implementation Agent**
2025-12-31
