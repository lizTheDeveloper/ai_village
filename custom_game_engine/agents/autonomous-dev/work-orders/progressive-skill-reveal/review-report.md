# Code Review Report

**Feature:** progressive-skill-reveal
**Reviewer:** Review Agent
**Date:** 2025-12-28

## Files Reviewed

- `packages/llm/src/StructuredPromptBuilder.ts` (modified, 1479 lines)
- `packages/llm/src/ActionDefinitions.ts` (modified, 201 lines)
- `packages/core/src/systems/SkillSystem.ts` (modified, 370 lines)
- `packages/core/src/__tests__/ProgressiveSkillReveal.integration.test.ts` (new, 531 lines)

## Critical Issues (Must Fix)

### 1. MASSIVE `any` Type Abuse in StructuredPromptBuilder.ts

**File:** `packages/llm/src/StructuredPromptBuilder.ts`

This file contains **46 instances of `as any`** which completely bypasses TypeScript's type safety. This is a severe CLAUDE.md violation.

**Lines with violations:**

#### Component Access (lines 36-44, 723-724)
```typescript
// WRONG - bypasses type safety
const name = agent.components.get('identity') as any;
const personality = agent.components.get('personality') as any;
const needs = agent.components.get('needs') as any;
const vision = agent.components.get('vision') as any;
const legacyMemory = agent.components.get('memory') as any;
const inventory = agent.components.get('inventory') as any;
const temperature = agent.components.get('temperature') as any;
const conversation = agent.components.get('conversation') as any;
const building = b.components.get('building') as any;
const identity = b.components.get('identity') as any;
```

**Required Fix:**
```typescript
// Define proper interfaces or use existing component types
const name = agent.getComponent<IdentityComponent>('identity');
const personality = agent.getComponent<PersonalityComponent>('personality');
const needs = agent.getComponent<NeedsComponent>('needs');
const vision = agent.getComponent<VisionComponent>('vision');
// etc.
```

#### Array Operations (lines 80-81, 84, 599-600, 621)
```typescript
// WRONG - slots typed as any
const woodQty = inventory.slots.filter((s: any) => s.itemId === 'wood')...
const stoneQty = inventory.slots.filter((s: any) => s.itemId === 'stone')...
const hasCloth = inventory.slots.some((s: any) => s.itemId === 'cloth'...)
```

**Required Fix:**
```typescript
interface InventorySlot {
  itemId: string;
  quantity: number;
}

const woodQty = inventory.slots.filter((s: InventorySlot) => s.itemId === 'wood')...
```

#### Function Parameters (lines 35, 192, 286, 544, 591, 650, 711, 772, 953)
```typescript
// WRONG - world and components typed as any
buildPrompt(agent: Entity, world: any): string
private buildSystemPrompt(name: string, personality: any, world?: any, inventory?: any, skills?: SkillsComponent)
private buildWorldContext(needs: any, vision: any, inventory: any, world: any, temperature?: any, memory?: any, conversation?: any, entity?: Entity)
```

**Required Fix:**
Define proper interfaces for world and component types, or use the existing component interfaces from `@ai-village/core`.

#### Exported Functions (lines 1150, 1182, 1212-1213, 1237-1238)
```typescript
// WRONG - exported functions with any
export function getBuildTimeEstimate(buildingType: string, taskFamiliarity: any): string | null
export function getCraftTimeEstimate(recipeId: string, taskFamiliarity: any): string | null
export function buildBuildingSection(availableBuildings: string[], taskFamiliarity: any, _skills?: any)
export function buildCraftingSection(availableRecipes: string[], taskFamiliarity: any, _skills?: any)
```

**Required Fix:**
```typescript
interface TaskFamiliarity {
  builds?: Record<string, { lastTime: number }>;
  crafts?: Record<string, { lastTime: number }>;
}

export function getBuildTimeEstimate(buildingType: string, taskFamiliarity: TaskFamiliarity): string | null
```

### 2. Silent Fallbacks in StructuredPromptBuilder.ts

**File:** `packages/llm/src/StructuredPromptBuilder.ts`

Found **11 instances** of silent fallback patterns that mask missing or invalid data.

#### Critical Game State Fallbacks:

**Line 48:**
```typescript
const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality, world, inventory, skills);
```
**Issue:** If agent has no identity component, silently defaults to 'Agent'
**Required Fix:** Validate identity exists, throw if missing

**Line 355:**
```typescript
resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
```
**Issue:** Masks missing resource counts
**Required Fix:** Initialize properly with Map or explicit zero check

**Lines 387-388, 449, 467:**
```typescript
const agentCount = vision.seenAgents?.length || 0;
const resourceCount = vision.seenResources?.length || 0;
const plantCount = vision.seenPlants?.length || 0;
```
**Issue:** While these MIGHT be acceptable (counts can legitimately be zero), they should use `?? 0` instead of `|| 0` to avoid masking empty arrays

**Lines 410, 801:**
```typescript
resourceTypes[type] = (resourceTypes[type] || 0) + 1;
totalStorage[slot.itemId] = (totalStorage[slot.itemId] || 0) + slot.quantity;
```
**Issue:** Same as line 355 - use proper initialization

**Line 597:**
```typescript
const slots = inventory?.slots || [];
```
**Issue:** If inventory exists but slots is undefined/null, this masks a data integrity issue
**Required Fix:** Validate slot array exists if inventory exists

**Line 621:**
```typescript
const fullSlots = inventory?.slots.filter((s: any) => s.itemId).length || 0;
```
**Issue:** If filter returns empty array, defaulting to 0 is correct, but the pattern is still suspect

**Line 727:**
```typescript
name: building?.buildingType || 'unknown',
```
**Issue:** If building exists but buildingType is missing, this masks a data error
**Required Fix:** Throw if buildingType is missing

### 3. Nullish Coalescing with Magic Defaults

**File:** `packages/llm/src/StructuredPromptBuilder.ts`

**Lines 289-290, 975-979, 1287, 1292, 1322-1325, 1347, 1421, 1425, 1428:**
```typescript
const cookingSkill = (skills?.levels.cooking ?? 0) as SkillLevel;
const buildingSkill = (skills?.levels.building ?? 0) as SkillLevel;
// ... many more
```

**Issue:** While `?? 0` is acceptable for optional skill levels (0 = unskilled is semantically correct), the cast to `SkillLevel` is unsafe. If `skills?.levels.cooking` returns `undefined`, casting `0` to `SkillLevel` is correct, but this pattern should be validated.

**Assessment:** This is borderline acceptable since skill level 0 is semantically valid for "no skill". However, the type cast could mask issues if the value is not actually 0-5.

### 4. Test File with `as any` Casts

**File:** `packages/core/src/__tests__/ProgressiveSkillReveal.integration.test.ts`
**Lines:** 125, 150, 228, 235, 242, 401

```typescript
(world as any)._addEntity(agent);
const visibleLow = filterVisibleEntities(entities as any, skillsLow, agentPos);
```

**Issue:** Test file is casting to access private methods and bypass types
**Assessment:** While more acceptable in tests than production code, this indicates missing test utilities or improper API design
**Recommendation:** Add proper test helper methods instead of accessing private APIs

### 5. ❌ Build Failure - TypeScript Compilation Error

**Status:** BLOCKING - Code does not compile

**Error:**
```
packages/renderer/src/adapters/PanelAdapter.ts(205,28): error TS2345: Argument of type 'PanelAdapter<T>' is not assignable to parameter of type 'PanelAdapter<unknown>'.
  Types of property 'config' are incompatible.
    Type 'PanelConfig<T>' is not assignable to type 'PanelConfig<unknown>'.
      Type 'unknown' is not assignable to type 'T'.
        'T' could be instantiated with an arbitrary type which could be unrelated to 'unknown'.
```

**Issue:** The build is failing due to a generic type variance issue in PanelAdapter. This is separate from the progressive-skill-reveal feature but blocks deployment.

**Required Action:** Fix the TypeScript compilation error. Either:
1. Implement PanelAdapter correctly (may be separate work order)
2. Fix the generic type variance issue
3. Mark PanelAdapter tests as `.skip()` and remove from build until implemented

**Test Results:**
- Core tests: ✅ ProgressiveSkillReveal tests passing (62/62)
- Renderer tests: ❌ PanelAdapter tests failing (26/28 - "not yet implemented")
- Overall: Build blocked by compilation error

## File Size Warnings

| File | Lines | Status |
|------|-------|--------|
| `StructuredPromptBuilder.ts` | 1511 | ❌ CRITICAL - EXCEEDS 1000 LINE LIMIT |
| `ProgressiveSkillReveal.integration.test.ts` | 531 | ⚠️ WARN - approaching threshold |

**StructuredPromptBuilder.ts** violates the file size limit from CLAUDE.md and review checklist:
> "Warn if >500 lines, REJECT if >1000 lines without justification"

At **1511 lines**, this is a god class that must be decomposed. Suggested split:
1. **StructuredPromptBuilder.ts** (coordinator, ~200 lines)
2. **EntityVisibilityFilter.ts** (skill-gated entity filtering, ~200 lines)
3. **SkillGatedContextBuilder.ts** (information depth by skill, ~250 lines)
4. **StrategyGenerator.ts** (strategic suggestions, ~150 lines)
5. **MemoryFormatter.ts** (episodic memory formatting, ~200 lines)
6. **ActionFilter.ts** (skill-gated action filtering, ~150 lines)
7. **PromptTemplates.ts** (string templates and helpers, ~200 lines)

## Passed Checks

- ❌ ~~Build compiles successfully~~ - BUILD FAILING (PanelAdapter TypeScript error)
- ✅ No `console.log`, `console.debug`, `console.info` found in reviewed files
- ✅ No `console.warn` without throwing
- ✅ ActionDefinitions.ts is clean - proper skill requirements defined
- ✅ SkillSystem.ts is clean - no antipatterns detected
- ✅ BuildingBlueprintRegistry.ts is clean - SkillRequirement interface properly defined
- ✅ Proper error handling in SkillSystem (throws on uninitialized)
- ✅ Named constants used in SkillSystem (though could be extracted)
- ✅ Event types are properly typed (EventMap usage correct)
- ✅ Core feature tests passing (62/62 ProgressiveSkillReveal tests)

## Verdict

**Verdict: NEEDS_FIXES**

**Blocking Issues:** 6
1. ❌ Build failure (TypeScript compilation error in PanelAdapter.ts)
2. ❌ God class violation (1511 lines in StructuredPromptBuilder.ts)
3. ❌ Type safety violations (46+ instances of `as any`)
4. ❌ Silent fallback violations (11 instances of `|| fallback`)
5. ❌ Missing type definitions for components
6. ❌ File size exceeds CLAUDE.md limits (>1000 lines)

**Critical Violations:** 57+ (46 `as any`, 11 silent fallbacks)
**Warnings:** 3 (file size, test file quality, magic numbers)
**Test Status:** Core tests passing (62/62), but build blocked

## Required Actions

### Priority 0: BLOCKING - Fix Build (MUST DO FIRST)

**File:** `packages/renderer/src/adapters/PanelAdapter.ts:205`

1. Fix TypeScript compilation error (generic type variance)
2. Ensure `npm run build` completes without errors
3. Consider marking PanelAdapter tests as `.skip()` if not part of this feature

**Impact:** Nothing can proceed until the build passes. This is the #1 blocker.

---

### Priority 1: Remove All `as any` Casts (StructuredPromptBuilder.ts)

1. Define proper component interfaces or import existing ones from `@ai-village/core`
2. Replace all 46+ `as any` casts with proper generic types
3. Update function parameters from `any` to proper interfaces
4. Use `getComponent<T>()` pattern instead of `components.get() as any`

**Example Fix:**
```typescript
// Before (WRONG)
const name = agent.components.get('identity') as any;

// After (CORRECT)
interface IdentityComponent {
  name: string;
}
const name = agent.getComponent<IdentityComponent>('identity');
if (!name) throw new Error(`Agent ${agent.id} missing identity component`);
```

---

### Priority 2: Fix Silent Fallbacks (StructuredPromptBuilder.ts)

**Critical Fixes:**
1. **Line 48:** Validate identity.name exists - throw if missing
2. **Line 727:** Validate buildingType exists - throw if missing
3. **Lines 355, 410, 801:** Use Map/Record initialization instead of `|| 0` (acceptable but improve clarity)
4. **Lines 387-388, 449, 464:** Consider `?? 0` instead of `|| 0` for optional vision data
5. **Line 597:** Validate slots array structure if inventory exists

**Example Fix:**
```typescript
// Before (WRONG)
const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality);

// After (CORRECT)
if (!name?.name) {
  throw new Error(`Agent ${agent.id} missing required name in identity component`);
}
const systemPrompt = this.buildSystemPrompt(name.name, personality);
```

---

### Priority 3: Refactor God Class (StructuredPromptBuilder.ts)

**File Size:** 1511 lines (exceeds 1000 line limit)

**Required:** Decompose into focused modules (target <300 lines per file):
1. Create `PromptBuilderTypes.ts` with all interface definitions
2. Extract `EntityVisibilityFilter.ts` for skill-gated entity filtering
3. Extract `SkillGatedContextBuilder.ts` for information depth logic
4. Extract `StrategyGenerator.ts` for strategic instruction generation
5. Extract `MemoryFormatter.ts` for episodic memory formatting
6. Extract `ActionFilter.ts` for skill-gated action filtering
7. Keep core `StructuredPromptBuilder.ts` as coordinator (~200 lines)

**Impact:** Maintainability - 1511 lines is impossible to hold in working memory

---

### Priority 4: Code Quality Improvements

1. **Extract Magic Numbers** in SkillSystem.ts to named constants
2. **Improve Test Quality** - replace `as any` in test files with proper helpers
3. **Add Type Guards** for component access safety
4. **Document Skill Fallback Semantics** - when `?? 0` is correct vs masking errors

## Recommendations for Next Iteration

1. **Create Type Definitions File:** `PromptBuilderTypes.ts` with all component interfaces
2. **Add Component Type Guards:** Helper functions to safely access components
3. **Extract Utilities:** Move filtering and aggregation logic to separate modules
4. **Improve Test Quality:** Add proper test helpers instead of `as any` casts
5. **Document Skill Fallback Semantics:** Clarify when `?? 0` is correct vs when it masks errors

## Summary

This implementation has **severe type safety violations** and **architectural issues** that directly contradict CLAUDE.md guidelines:

### What Went Well ✅
- **Core logic is sound:** Skill-gating approach is architecturally correct
- **Feature tests passing:** 62/62 ProgressiveSkillReveal tests pass
- **Clean supporting files:** SkillSystem.ts, ActionDefinitions.ts, BuildingBlueprintRegistry.ts are well-structured
- **No console debugging:** No debug statements left in code
- **Proper skill requirements:** Building and action skill gates correctly defined

### What Needs Immediate Fixes ❌
- **Build failure:** TypeScript compilation blocked by PanelAdapter error
- **God class:** 1511-line StructuredPromptBuilder.ts violates file size limits
- **Type safety:** 46+ instances of `as any` bypass type checking
- **Silent fallbacks:** 11 instances of `|| fallback` mask missing data
- **Maintainability:** Code is impossible to navigate and modify safely

### Impact Assessment

**Current State:** Feature logic is correct, but implementation quality is unacceptable for production. The `as any` casts and god class will cause:
- Runtime errors not caught at compile time
- Impossible refactoring (no type checking)
- Bugs hidden until production
- New developers unable to understand/modify code

**Why This Matters (CLAUDE.md Principle):**
> "NEVER use fallback values to mask errors. If data is missing or invalid, crash immediately with a clear error message."

Every `|| 'fallback'` and `as any` violates this core principle. We're trading short-term convenience for long-term maintainability debt.

---

## Next Steps

1. **Implementation Agent:** Fix all Priority 0, 1, and 2 issues (build, type safety, silent fallbacks)
2. **Review Agent:** Re-run review checklist after fixes
3. **Implementation Agent:** Address Priority 3 (god class decomposition) - may be separate work order
4. **Review Agent:** Final approval if all critical issues resolved
5. **Playtest:** Proceed to gameplay validation once approved

**Estimated Fix Time:**
- Priority 0 (Build): 30 minutes - 1 hour
- Priority 1 (Type safety): 2-3 hours
- Priority 2 (Fallbacks): 1 hour
- Priority 3 (God class): 4-6 hours (consider separate work order)

**The Implementation Agent must fix Priority 0-2 before this can proceed to playtest. Priority 3 (god class) is critical for long-term maintainability but could be deferred to a separate refactoring work order if time-critical.**

---

**Report Generated:** 2025-12-28
**Reviewer:** Review Agent (Autonomous Code Review System)
**Status:** NEEDS_FIXES - Return to Implementation Agent
