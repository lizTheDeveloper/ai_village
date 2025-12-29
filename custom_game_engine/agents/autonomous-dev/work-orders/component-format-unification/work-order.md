# Work Order: Component Format Unification

**Phase:** Tech Debt (Critical)
**Created:** 2025-12-28
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/component-format-unification/spec.md`

---

## Requirements Summary

Multiple components exist in TWO incompatible formats creating critical bugs:

1. **NeedsComponent** - Class (0-1 scale) vs Legacy Interface (0-100 scale)
   - Bug: Helper functions like `isHungry()` use `|| ` logic that always returns true for 0-1 values
   - Impact: HIGH - Affects all agent behavior decisions

2. **PersonalityComponent** - Class (0-1 scale) vs Legacy Interface (0-100 scale)
   - Bug: `getPersonalityDescription()` uses hardcoded thresholds (70, 30) that work for 0-100 but not 0-1
   - Impact: MEDIUM - Affects LLM prompts and agent characterization

3. **MemoryComponent** - Two DIFFERENT files with DIFFERENT purposes
   - `MemoryComponent.ts` - Spatial/location memories (interface-based)
   - `MemoryComponentClass.ts` - Episodic/semantic/procedural memories (class-based)
   - Bug: Name collision, unclear which to use
   - Impact: MEDIUM - Causes confusion, potential incorrect imports

### Key Requirements

1. The system SHALL use ONLY class-based components with 0-1 scale
2. The system SHALL NOT have `*Legacy` interfaces
3. Helper functions SHALL accept single types (not union types)
4. All component type strings SHALL use lowercase_with_underscores per CLAUDE.md
5. MemoryComponent files SHALL have distinct, clear names

---

## Acceptance Criteria

### Criterion 1: NeedsComponent Unified
- **WHEN:** NeedsComponent.ts is inspected
- **THEN:** It SHALL contain only the class-based version with 0-1 scale
- **AND:** No `NeedsComponentLegacy` interface exists
- **AND:** No `createNeedsComponent()` factory exists
- **Verification:** `grep -n "NeedsComponentLegacy\|createNeedsComponent" packages/core/src/components/NeedsComponent.ts` returns empty

### Criterion 2: Helper Functions Use Single Type
- **WHEN:** `isHungry()`, `isTired()`, `isStarving()` are inspected
- **THEN:** They SHALL accept only `NeedsComponent` (not union type)
- **AND:** Logic SHALL use 0-1 thresholds (e.g., `< 0.4`) NOT `||` dual-scale logic
- **Verification:** Functions work correctly for hunger=0.5 (should return false, not true)

### Criterion 3: PersonalityComponent Unified
- **WHEN:** PersonalityComponent.ts is inspected
- **THEN:** It SHALL contain only the class-based version with 0-1 scale
- **AND:** No `PersonalityComponentLegacy` interface exists
- **AND:** No `generateRandomPersonality()` or `createPersonalityComponent()` factories exist
- **Verification:** `grep -n "PersonalityComponentLegacy" packages/` returns empty

### Criterion 4: Personality Description Fixed
- **WHEN:** `getPersonalityDescription()` is inspected
- **THEN:** It SHALL use 0-1 thresholds (e.g., `> 0.7` instead of `> 70`)
- **Verification:** Function works correctly for openness=0.8 (should describe as "curious and adventurous")

### Criterion 5: Memory Components Clarified
- **WHEN:** Memory component files are inspected
- **THEN:** `MemoryComponent.ts` SHALL be renamed to `SpatialMemoryComponent.ts`
- **AND:** `MemoryComponentClass.ts` SHALL be renamed to `EpisodicMemoryComponent.ts` OR merged
- **OR:** The two components SHALL be merged into one unified MemoryComponent
- **Verification:** No file named `MemoryComponentClass.ts` exists

### Criterion 6: All Callers Updated
- **WHEN:** The codebase is searched for legacy usage
- **THEN:** No file SHALL import or use `createNeedsComponent`, `NeedsComponentLegacy`, `PersonalityComponentLegacy`
- **Verification:**
  - `grep -rn "createNeedsComponent" packages/` returns 0 results
  - `grep -rn "NeedsComponentLegacy" packages/` returns 0 results
  - `grep -rn "PersonalityComponentLegacy" packages/` returns 0 results

### Criterion 7: Component Types Use Correct Format
- **WHEN:** Component type strings are inspected
- **THEN:** They SHALL use lowercase_with_underscores
- **NOT:** PascalCase or camelCase
- **Examples:** `'needs'`, `'personality'`, `'spatial_memory'`, `'episodic_memory'`
- **Verification:** All component types follow naming convention per CLAUDE.md

---

## System Integration

### Existing Systems Affected

| System | File | Integration Type | Changes Needed |
|--------|------|-----------------|----------------|
| NeedsSystem | `packages/core/src/systems/NeedsSystem.ts` | Direct component access | Update to use class methods if added |
| TemperatureSystem | `packages/core/src/systems/TemperatureSystem.ts` | Reads health | Update health threshold checks to 0-1 |
| SleepSystem | `packages/core/src/systems/SleepSystem.ts` | Reads/writes energy | Update energy checks to 0-1 |
| StructuredPromptBuilder | `packages/llm/src/StructuredPromptBuilder.ts` | Uses personality | Update getPersonalityDescription usage |
| ScriptedDecisionProcessor | `packages/core/src/decision/ScriptedDecisionProcessor.ts` | Uses isHungry helpers | Will work automatically once helpers fixed |
| AgentEntity | `packages/world/src/entities/AgentEntity.ts` | Creates components | Replace factory calls with `new Component()` |

### Files With Legacy Usage (26+ files total)

**High Priority - Component Definitions:**
- `packages/core/src/components/NeedsComponent.ts`
- `packages/core/src/components/PersonalityComponent.ts`
- `packages/core/src/components/MemoryComponent.ts`
- `packages/core/src/components/MemoryComponentClass.ts`

**Medium Priority - Entity Creation:**
- `packages/world/src/entities/AgentEntity.ts`

**Medium Priority - Test Files (26 files):**
All files found by grep for `NeedsComponentLegacy|createNeedsComponent`:
- `packages/core/src/__tests__/NeedsSystem.test.ts`
- `packages/core/src/__tests__/fixtures/agentFixtures.ts`
- Multiple integration tests (BehaviorEndToEnd, SaveLoad, etc.)

**Low Priority - LLM Integration:**
- `packages/llm/src/StructuredPromptBuilder.ts`

---

## Implementation Steps

### Phase 1: NeedsComponent Migration

1. **Update NeedsComponent.ts:**
   - Keep class-based version with 0-1 scale
   - Add constructor that accepts `Partial<NeedsComponent>` for flexibility
   - Add `clone()` method
   - Remove `NeedsComponentLegacy` interface
   - Remove `createNeedsComponent()` factory
   - Fix helper functions to use single type and 0-1 thresholds

2. **Update helper functions:**
   ```typescript
   // OLD (BUGGY):
   export function isHungry(needs: NeedsComponentLegacy | NeedsComponent): boolean {
     return needs.hunger < 40 || needs.hunger < 0.4;  // BUG: Always true for 0.5
   }

   // NEW (CORRECT):
   export function isHungry(needs: NeedsComponent): boolean {
     return needs.hunger < 0.4;  // Works correctly for 0-1 scale
   }
   ```

3. **Update all callers (26+ files):**
   - Find: `createNeedsComponent(100, 80, 100, 0.42, 0.5)`
   - Replace: `new NeedsComponent({ hunger: 1.0, energy: 0.8, health: 1.0 })`
   - Note: Convert 0-100 values to 0-1 by dividing by 100

4. **Add migration helper (if needed for save games):**
   ```typescript
   export function migrateNeedsFromLegacy(legacy: any): NeedsComponent {
     const isLegacy = legacy.hunger > 1.0 || legacy.energy > 1.0;
     if (isLegacy) {
       return new NeedsComponent({
         hunger: legacy.hunger / 100,
         energy: legacy.energy / 100,
         health: legacy.health / 100,
         thirst: (legacy.thirst ?? 100) / 100,
         temperature: legacy.temperature ?? 37,
         social: 0.5,
         stimulation: 0.5,
       });
     }
     return new NeedsComponent(legacy);
   }
   ```

### Phase 2: PersonalityComponent Migration

1. **Update PersonalityComponent.ts:**
   - Keep class-based version with 0-1 scale
   - Remove `PersonalityComponentLegacy` interface
   - Remove `generateRandomPersonality()` factory
   - Remove `createPersonalityComponent()` factory
   - Update `getPersonalityDescription()` to use 0-1 thresholds

2. **Create new factory (if needed):**
   ```typescript
   export function createRandomPersonality(): PersonalityComponent {
     return new PersonalityComponent({
       openness: Math.random(),
       conscientiousness: Math.random(),
       extraversion: Math.random(),
       agreeableness: Math.random(),
       neuroticism: Math.random(),
     });
   }
   ```

3. **Fix getPersonalityDescription:**
   ```typescript
   // OLD (WRONG):
   if (personality.openness > 70) { ... }

   // NEW (CORRECT):
   if (personality.openness > 0.7) { ... }
   ```

4. **Update AgentEntity.ts:**
   - Find: `generateRandomPersonality()`
   - Replace: `createRandomPersonality()` or `new PersonalityComponent({ ... })`

### Phase 3: MemoryComponent Clarification

**Option A: Rename Both (RECOMMENDED)**

1. Rename `MemoryComponent.ts` → `SpatialMemoryComponent.ts`
   - Component type: `'spatial_memory'`
   - Purpose: Location-based memories (resource spots, agent locations, etc.)

2. Rename `MemoryComponentClass.ts` → `EpisodicMemoryComponent.ts`
   - Component type: `'episodic_memory'`
   - Purpose: Event memories (episodic, semantic, procedural)

3. Update all imports and usages

**Option B: Merge Into One**

1. Merge both into single `MemoryComponent.ts`:
   ```typescript
   export class MemoryComponent extends ComponentBase {
     type = 'memory';

     // Spatial memories (from old MemoryComponent.ts)
     spatialMemories: SpatialMemory[] = [];

     // Episodic memories (from old MemoryComponentClass.ts)
     episodicMemories: EpisodicMemory[] = [];
     semanticMemories: SemanticMemory[] = [];
     proceduralMemories: ProceduralMemory[] = [];
   }
   ```

### Phase 4: Update Tests

1. Run all tests: `npm run test`
2. Fix failures:
   - Update component creation (use `new` instead of factories)
   - Update value expectations (0-100 → 0-1)
   - Update helper function calls

---

## Files Likely Modified

### Core Components (MUST MODIFY)
- `packages/core/src/components/NeedsComponent.ts` - Remove legacy, fix helpers
- `packages/core/src/components/PersonalityComponent.ts` - Remove legacy, fix description
- `packages/core/src/components/MemoryComponent.ts` - Rename or merge
- `packages/core/src/components/MemoryComponentClass.ts` - Rename or merge

### Entity Creation (MUST MODIFY)
- `packages/world/src/entities/AgentEntity.ts` - Update to use `new Component()`

### Systems (REVIEW & UPDATE)
- `packages/core/src/systems/NeedsSystem.ts`
- `packages/core/src/systems/TemperatureSystem.ts`
- `packages/core/src/systems/SleepSystem.ts`
- `packages/llm/src/StructuredPromptBuilder.ts`
- `packages/core/src/decision/ScriptedDecisionProcessor.ts`

### Tests (26+ files - UPDATE AS NEEDED)
- `packages/core/src/__tests__/fixtures/agentFixtures.ts` - Test fixture factory
- All integration test files using legacy components
- Unit tests for NeedsComponent, PersonalityComponent

---

## Success Definition

### Build & Test
1. ✅ `npm run build` passes with no errors
2. ✅ `npm run test` passes with no failures
3. ✅ Game starts and agents behave correctly

### Code Quality
1. ✅ No `*Legacy` interfaces in component files
2. ✅ No `create*Component` factory functions for affected components
3. ✅ All helper functions accept single type (not union)
4. ✅ No `||` dual-scale logic in helper functions
5. ✅ All component types use lowercase_with_underscores

### Verification Commands
```bash
# Should return 0 results:
grep -rn "NeedsComponentLegacy" packages/
grep -rn "createNeedsComponent" packages/
grep -rn "PersonalityComponentLegacy" packages/
grep -rn "generateRandomPersonality" packages/
grep -rn "createPersonalityComponent" packages/

# Should return only the definition, not dual logic:
grep -rn "needs.hunger < 40 ||" packages/

# All component types should be lowercase:
grep -rn "type = 'Needs'" packages/  # Should be 0 results
grep -rn "type = 'Personality'" packages/  # Should be 0 results
```

---

## Notes for Implementation Agent

### Critical Bug to Fix

The current `isHungry()` implementation has a serious logic error:

```typescript
// CURRENT (WRONG):
export function isHungry(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.hunger < 40 || needs.hunger < 0.4;
}
```

**Why this is broken:**
- If hunger = 0.5 (50% full in new format):
  - `0.5 < 40` → **TRUE** (WRONG!)
  - The `||` makes it pass even though agent is NOT hungry
- This means ALL agents using 0-1 scale are ALWAYS reported as hungry

**Correct implementation:**
```typescript
export function isHungry(needs: NeedsComponent): boolean {
  return needs.hunger < 0.4;  // 40% threshold
}
```

### Scale Conversion

When updating callers from 0-100 to 0-1:

**Old (0-100):**
```typescript
createNeedsComponent(100, 80, 100, 0.42, 0.5)
// hunger=100 (full), energy=80, health=100
```

**New (0-1):**
```typescript
new NeedsComponent({
  hunger: 1.0,   // 100/100 = 1.0 (full)
  energy: 0.8,   // 80/100 = 0.8
  health: 1.0,   // 100/100 = 1.0
})
```

### Memory Component Decision

**Recommended approach:** Rename both files to clarify purpose
- Spatial memory and episodic memory serve different purposes
- Merging would create a god class
- Clear names prevent confusion

If you choose to merge, ensure the merged component has clear separation of concerns.

### Testing Strategy

1. **Unit test first:** Fix `NeedsComponent.test.ts` to verify helpers work
2. **Integration test:** Run `BehaviorEndToEnd.integration.test.ts`
3. **Manual test:** Start game, verify agents seek food when truly hungry (hunger < 0.4)

---

## Notes for Playtest Agent

After implementation, verify:

1. **Agent behavior is consistent:**
   - Agents seek food when hunger drops below 40% (0.4)
   - Agents sleep when energy drops below 30% (0.3)
   - Personality descriptions in prompts make sense

2. **No regression in LLM behavior:**
   - Check that personality traits still appear in prompts
   - Verify agent characterization is consistent

3. **UI displays correct values:**
   - If needs are shown in UI, ensure they display as percentages (multiply by 100)

---

**End of Work Order**
