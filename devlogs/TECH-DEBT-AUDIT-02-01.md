# Tech Debt Audit Report
**Date:** 2026-02-01
**Scope:** `custom_game_engine/packages/`

## Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| TODO/FIXME Comments | 204 | Mixed |
| Type Assertion Violations | 258+ | CRITICAL |
| Debug console.log Statements | 582 | HIGH |
| Silent Fallback Patterns | 160+ violations | HIGH |
| Deprecated/Dead Code | 64+ items | MEDIUM |

**Total Estimated Tech Debt Items: ~1,200+**

---

## 1. TODO/FIXME Comments (204 items)

### Critical Priority (28 items) - System-Blocking

| File | Issue | Impact |
|------|-------|--------|
| `botany/src/__tests__/PlantSystem.test.ts:371,525` | Tests fail with batched updates | Blocks plant system validation |
| `core/src/__tests__/PredatorAttack.test.ts:7` | PredatorAttackSystem is a stub | Combat system incomplete |
| `core/src/__tests__/AutomatedLove.integration.test.ts:299` | Test fails - vitest caching issue | Reproduction system untested |
| `core/src/systems/EquipmentSystem.ts:30-40` | Disabled but tests pass (19/19) | Ready to re-enable |
| `core/src/systems/registerAllSystems.ts:60-73,693` | FriendshipSystem disabled | Blocking on dependency |
| `core/src/plot/FatesCouncilSystem.ts` | 9 TODOs for narrative connections | Plot system incomplete |
| `core/src/systems/__tests__/Phase9-SoilWeatherIntegration.test.ts` | 28 identical TODOs | Integration layer not designed |

### LLM Integration Blockers (Critical for AI Features)

| File | Line | Issue |
|------|------|-------|
| `building-designer/src/BuildingGeneratorService.ts` | 105,108,133 | LLM integration commented out |
| `core/src/systems/AgentCombatSystem.ts` | 700 | Narrative generation not implemented |
| `core/src/systems/AngelPhoneSystem.ts` | 414 | Angel responses via LLM incomplete |
| `core/src/systems/TimeCompressionSystem.ts` | 475,636 | Era naming placeholder only |

### By Package

| Package | TODO Count |
|---------|------------|
| core | 118 |
| renderer | 18 |
| building-designer | 3 |
| metrics | 6 |
| magic | 7 |
| multiverse | 8 |
| shared-worker | 3 |
| llm | 3 |
| introspection | 6 |
| botany | 2 |
| world | 2 |

---

## 2. Type Assertion Violations (258+ items)

**Per CLAUDE.md Rule #3: "No Type Assertion Escape Hatches"**

### CRITICAL: File-Level Type Checking Disabled

| File | Issue |
|------|-------|
| `magic/src/LiterarySurrealismParadigm.ts:21` | `// @ts-nocheck` - entire file untyped |
| `core/src/magic/LiterarySurrealismParadigm.ts:21` | Duplicate file, same issue |

### Widespread `as unknown as` Pattern (200+ instances)

**Worst Offenders:**

| File | Count | Risk |
|------|-------|------|
| `core/src/microgenerators/GodCraftedDiscoverySystem.ts` | 58 | CRITICAL - Component casts |
| `core/src/multiverse/MultiverseNetworkManager.ts` | 15+ | CRITICAL - Network serialization |
| `introspection/src/api/GameIntrospectionAPI.ts` | 4 | HIGH - Reflection bypasses |
| `core/src/metrics/LiveEntityAPI.ts` | 15+ | HIGH |
| `core/src/magic/EffectAppliers.ts` | 9+ | HIGH |

### Direct `as any` in Production (46+ instances)

| File | Lines | Issue |
|------|-------|-------|
| `world/src/planet/PlanetInitializer.ts` | 124 | artStyle cast |
| `renderer/src/PixiJSRenderer.ts` | 1001,1002,1114 | Sprite metadata attachment |
| `renderer/src/RendererFactory.ts` | 129,186,189 | Canvas access pattern |
| `shared-worker/src/game-bridge.ts` | 272,301 | Worker communication |

### Test/Benchmark Files (Acceptable)

- **@ts-expect-error in tests**: 12+ (legitimate for validation testing)
- **Benchmark files**: 40+ instances (not production code)

---

## 3. Debug Console.log Violations (582 items)

**Per CLAUDE.md: `console.log` is PROHIBITED. Only `console.error`/`console.warn` with `[System]` prefix allowed.**

### Critical Production Systems

| File | Count | Examples |
|------|-------|----------|
| `renderer/src/PixiJSRenderer.ts` | 53 | WebGL diagnostics, cleanup logs |
| `core/src/profiling/MemoryProfiler.ts` | 31 | Memory profiling output |
| `core/src/systems/GrandStrategySimulator.ts` | 23 | Strategy simulation logs |
| `introspection/src/api/GameIntrospectionAPI.ts` | 17 | API operation logs |
| `city-simulator/main.ts` | 17 | Demo logs |
| `core/src/communication/ChatRoomSystem.ts` | 11 | Message loading logs |
| `core/src/multiverse/shared-universe-worker.ts` | 10 | Worker status logs |

### Package Breakdown

| Package | Violations |
|---------|------------|
| building-designer | 100+ |
| core | 150+ |
| renderer | 80+ |
| introspection | 50+ |
| world | 30+ |
| Other packages | ~170 |

---

## 4. Silent Fallback Violations (160+ items)

**Per CLAUDE.md: "No Silent Fallbacks - Crash on Invalid Data"**

### CRITICAL: Serialization Layer

Missing data silently initializes empty structures instead of throwing:

| File | Pattern | Impact |
|------|---------|--------|
| `persistence/src/serializers/TrustNetworkSerializer.ts:30,34` | `?? []` | Lost trust relationships |
| `persistence/src/serializers/JournalSerializer.ts:21,33` | `?? []` | Lost journal entries |
| `persistence/src/serializers/EpisodicMemorySerializer.ts:35` | `?? []` | Lost episodic memories |
| `persistence/src/serializers/SkillProgressSerializer.ts:23` | `?? {}` | Lost skill progression |
| `persistence/src/serializers/ParadigmStateSerializer.ts:33` | `?? {}` | Lost magic state |

### HIGH: Math Clamping Without Validation (80+ instances)

| File | Pattern |
|------|---------|
| `environment/src/systems/SoilSystem.ts` | 9+ instances of `Math.min/max` clamping |
| `environment/src/systems/TemperatureSystem.ts` | Health silently clamped |
| `reproduction/src/midwifery/InfantComponent.ts` | Infant health clamped |
| `core/src/consciousness/PackMindSystem.ts` | Pack member health clamped |

### MEDIUM: String/Object Defaults

| File | Line | Pattern |
|------|------|---------|
| `introspection/src/schemas/IdentitySchema.ts` | 75-76 | `'Unknown'`, `'human'` defaults |
| `core/src/systems/WisdomGoddessSystem.ts` | 160 | Empty string for missing content |
| `core/src/systems/BuildingSystem.ts` | 266 | Fallback builder ID |

### Legitimate Patterns (Not Violations)

- Numeric counter defaults (`Map.get() || 0`) - ~50 instances
- UI display defaults - ~25 instances

---

## 5. Deprecated/Dead Code (64+ items)

### Systems to Re-enable

| System | Status | Action Required |
|--------|--------|-----------------|
| EquipmentSystem | Disabled but tests pass | Uncomment export in index.ts:118 |
| FriendshipSystem | Disabled | Test RelationshipConversationSystem first |
| InterestEvolutionSystem | Marked "TODO to Enable" | Review before enabling |
| VeilOfForgettingSystem | Export commented but file deleted | Remove dead export |

### Deprecated APIs (40+ functions)

**BehaviorRegistry API** - Use `WithContext` versions:
- `wanderBehavior` → `wanderBehaviorWithContext`
- `gatherBehavior` → `gatherBehaviorWithContext`
- `seekFoodBehavior` → `seekFoodBehaviorWithContext`
- All navigation behaviors
- All crafting/building behaviors

**Magic Managers** (exported for backward compatibility only):
- `SpellLearningManager` → `SkillTreeManager`
- `ManaManager` → `ManaRegenerationManager`
- `CooldownManager` → `SpellCastingManager`
- `SpellCaster` → `SpellProficiencyManager`

### Dead Imports/Exports

| File | Issue |
|------|-------|
| `core/src/systems/index.ts:184` | VeilOfForgettingSystem export (file doesn't exist) |
| `core/src/components/index.ts:228` | EquipmentSlotsComponent disabled |
| `world/src/plant-species/base-crops.ts` | BASE_CROPS disabled (WIP) |
| `metrics/src/index.ts:13,18` | Node.js fs-dependent exports commented |

### Deprecated Item Fields

| Component | Field | Replacement |
|-----------|-------|-------------|
| ItemDefinition | `isEdible` | `traits.edible` |
| ItemDefinition | `hungerRestored` | `traits.edible.hungerRestored` |
| ItemDefinition | `quality` | `traits.edible.quality` |
| ItemDefinition | `flavors` | `traits.edible.flavors` |

---

## Priority Action Items

### P0 - Critical (This Week)

1. **Fix `@ts-nocheck` files** - LiterarySurrealismParadigm.ts needs proper types
2. **Re-enable EquipmentSystem** - Tests pass, just needs export uncomment
3. **Fix Plant Test Failures** - Blocking botany system validation

### P1 - High (This Sprint)

1. **GodCraftedDiscoverySystem.ts** - 58 `as unknown as` casts need type guards
2. **Persistence Layer** - Stop silent fallbacks, throw on missing required fields
3. **Console.log Cleanup** - Remove 582 debug statements from production code
4. **MultiverseNetworkManager.ts** - Type-safe serialization

### P2 - Medium (Next Sprint)

1. **Complete Behavior Migration** - Switch all behaviors to `WithContext` versions
2. **LLM Integration TODOs** - Building generator, combat narratives, angel responses
3. **Math Clamping** - Add validation before clamping in environment systems

### P3 - Low (Backlog)

1. **Renderer Test Stubs** - 12 skipped UI test files
2. **Remove Legacy Magic Exports** - Once migration confirmed complete
3. **Clean Up Dead Imports** - VeilOfForgettingSystem, etc.

---

## Metrics & Tracking

### Technical Debt Score

| Category | Weight | Items | Score |
|----------|--------|-------|-------|
| Type Safety Violations | 3x | 258 | 774 |
| Silent Fallbacks | 2x | 160 | 320 |
| Debug Statements | 1x | 582 | 582 |
| TODOs (Critical) | 3x | 28 | 84 |
| TODOs (Other) | 0.5x | 176 | 88 |
| Deprecated Code | 0.5x | 64 | 32 |
| **Total Debt Score** | | | **1,880** |

### Suggested Sprint Allocation

- **10-15%** of sprint capacity for tech debt reduction
- Target: Reduce debt score by ~200 per sprint
- Estimated time to eliminate critical debt: 4-5 sprints

---

## Appendix: File Paths for Automated Tooling

### Files Needing Immediate Attention

```
custom_game_engine/packages/magic/src/LiterarySurrealismParadigm.ts
custom_game_engine/packages/core/src/magic/LiterarySurrealismParadigm.ts
custom_game_engine/packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts
custom_game_engine/packages/core/src/multiverse/MultiverseNetworkManager.ts
custom_game_engine/packages/core/src/systems/EquipmentSystem.ts
custom_game_engine/packages/persistence/src/serializers/*.ts
```

### Grep Patterns for CI/CD

```bash
# Type assertion violations
rg "as unknown as" --type ts -c
rg "as any[^a-zA-Z]" --type ts -c
rg "@ts-nocheck" --type ts

# Debug statements
rg "console\.log" --type ts -c

# Silent fallbacks in serializers
rg "\?\? \[\]|\?\? \{\}" packages/persistence --type ts
```
