# Work Order: Pattern Consistency

**Phase:** Code Quality (Standardization)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/pattern-consistency/spec.md`

---

## Requirements Summary

Fix inconsistent patterns across the codebase:

1. Add missing `as const` to 16 component type declarations
2. Fix system priority clustering (7 systems at priority 15)
3. Fix SleepSystem priority contradiction (12 vs "after Needs at 15")
4. Fix remaining silent fallbacks in CookingSystem, PlantSystem

---

## Acceptance Criteria

### Criterion 1: All Component Types Use `as const`
- **WHEN:** A component declares `public readonly type = 'xxx'`
- **THEN:** It SHALL use `as const`: `public readonly type = 'xxx' as const`

### Criterion 2: System Priorities Are Distinct
- **WHEN:** Systems are registered
- **THEN:** No more than 2 systems SHALL share the same priority
- **AND:** Priority order SHALL match logical dependencies

### Criterion 3: SleepSystem Runs After NeedsSystem
- **WHEN:** SleepSystem priority is checked
- **THEN:** It SHALL be higher than NeedsSystem (15)
- **SUGGESTION:** Priority 16

### Criterion 4: Error Handling Is Consistent
- **WHEN:** A system encounters missing data
- **THEN:** It SHALL throw (not warn+continue or return null)

---

## Files to Modify

### Add `as const` (16 files)
- `components/VelocityComponent.ts:13`
- `components/GoalsComponent.ts:71`
- `components/SocialMemoryComponent.ts:50`
- `components/TrustNetworkComponent.ts:15`
- `components/MemoryComponentClass.ts:16`
- `components/PersonalityComponent.ts:20`
- `components/SteeringComponent.ts:30`
- `components/SocialGradientComponent.ts:28`
- `components/JournalComponent.ts:26`
- `components/BeliefComponent.ts:29`
- `components/NeedsComponent.ts:5`
- `components/SpatialMemoryComponent.ts:17`
- `components/ExplorationStateComponent.ts:23`
- `components/SemanticMemoryComponent.ts:56`
- `components/EpisodicMemoryComponent.ts:61`
- `components/ReflectionComponent.ts:28`
- `actions/ActionQueueClass.ts:13`

### Fix Priorities
- Multiple system files - see spec.md

### Fix Error Handling
- `systems/CookingSystem.ts:192-200`
- `systems/PlantSystem.ts` (entityId fallbacks)

---

## Success Definition

1. ✅ All 16 components have `as const` on type
2. ✅ ActionQueueClass has `as const`
3. ✅ Priority 15 cluster resolved (distinct priorities)
4. ✅ SleepSystem priority > NeedsSystem priority
5. ✅ CookingSystem.getRecipe() throws on error
6. ✅ PlantSystem entityId lookups throw on missing
7. ✅ Build passes: `npm run build`
8. ✅ Tests pass: `npm run test`

---

**End of Work Order**
