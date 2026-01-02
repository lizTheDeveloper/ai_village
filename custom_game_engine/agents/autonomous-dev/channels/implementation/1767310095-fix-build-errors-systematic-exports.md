# WORK ORDER: Fix Build Errors - Systematic Export Resolution

**Timestamp:** 2026-01-01 15:28:15 UTC
**Feature:** build-error-fixes
**Priority:** CRITICAL - Build is broken
**Status:** OPEN

---

## Problem Summary

The TypeScript build is currently broken with 100+ errors, primarily due to missing exports from the `@ai-village/core` package. The exports exist in sub-modules but are not properly re-exported from the main index.

**Root Cause:** Incomplete type re-exports in `packages/core/src/index.ts`

---

## Current Build Errors Categorized

### Category 1: Missing ECS Type Exports (PARTIALLY FIXED ✅)
- ✅ `World` - Now exported
- ✅ `Entity` - Now exported
- ✅ `EntityImpl` - Now exported
- ✅ `EventBus` - Now exported
- ✅ `Component` - Now exported
- ✅ `createEntityId` - Now exported

### Category 2: Missing Component Exports
- ⏳ `derivePrioritiesFromSkills` - In AgentComponent.ts, not re-exported from components/index.ts
- ✅ `PlantComponent` - Now exported as value (was only type)
- ✅ `DeityComponent` - Now exported
- ⏳ `createCourtshipComponent` - In reproduction/courtship/index.ts, should be re-exported
- ⏳ `createParentingComponent` - In ParentingComponent.ts, re-exported via reproduction/index.ts

### Category 3: Missing Utility Exports
- ⏳ `getTileBasedBlueprintRegistry` - Used by LLM package
- ⏳ `calculateDimensions` - Used by LLM package
- ⏳ `getConversationStyle` - Used by LLM package (exists as `getConversation`)
- ⏳ `findSharedInterests` - Used by LLM package

### Category 4: Missing Magic System Exports
- ⏳ `MagicSpectrumConfig` - Used by UniverseConfigScreen
- ⏳ `MagicalIntensity` - Used by UniverseConfigScreen
- ⏳ `MagicSourceOrigin` - Used by UniverseConfigScreen
- ⏳ `MagicFormality` - Used by UniverseConfigScreen
- ⏳ `AnimismLevel` - Used by UniverseConfigScreen
- ⏳ `SpectrumEffects` - Used by UniverseConfigScreen
- ⏳ `SPECTRUM_PRESETS` - Used by UniverseConfigScreen
- ⏳ `getPreset` - Used by UniverseConfigScreen
- ⏳ `getPresetNames` - Used by UniverseConfigScreen
- ⏳ `resolveSpectrum` - Used by UniverseConfigScreen
- ⏳ `CONFIGURATION_QUESTIONS` - Used by UniverseConfigScreen
- ⏳ `HYBRID_PARADIGM_REGISTRY` - Used by DevPanel (rename to CORE_PARADIGM_REGISTRY?)

### Category 5: Package Module Resolution Errors
- ⏳ `@ai-village/world` - Package exists but TypeScript can't find it
- ⏳ `@ai-village/llm` - Package exists but TypeScript can't find it

### Category 6: System Implementation Errors
- ⏳ `OffScreenProductionSystem` - Missing `requiredComponents` property
- ⏳ `ParentingSystem` - Missing System interface properties
- ⏳ `RelationshipConversationSystem` - Using wrong component APIs
- ⏳ `TVBroadcastingSystem` - Type errors with null vs undefined

### Category 7: Implicit Any Type Errors
- Multiple files with `Parameter 'x' implicitly has an 'any' type` warnings
- These need explicit type annotations

---

## Implementation Strategy

### Phase 1: Fix Core Package Exports (HIGH PRIORITY)

**File:** `packages/core/src/index.ts`

**Task 1.1:** Add missing component exports
```typescript
// Add to components section
export { derivePrioritiesFromSkills } from './components/AgentComponent.js';
```

**Task 1.2:** Verify reproduction exports
```typescript
// These should already be exported via './reproduction/index.js'
// Verify they're actually available
- createCourtshipComponent
- createParentingComponent
```

**Task 1.3:** Add missing utility exports
Search for these functions and add explicit exports:
- getTileBasedBlueprintRegistry
- calculateDimensions
- findSharedInterests

**Task 1.4:** Add missing magic system exports
All MagicSpectrum* types and functions need to be exported from magic/index.ts

### Phase 2: Fix Package Module Resolution

**Task 2.1:** Verify package.json exports for @ai-village/world
```bash
cd packages/world
# Check package.json has correct "exports" field
# Rebuild: tsc --build
```

**Task 2.2:** Verify package.json exports for @ai-village/llm
```bash
cd packages/llm
# Check package.json has correct "exports" field
# Add exports field if missing
# Rebuild: tsc --build
```

### Phase 3: Fix System Implementations

**Task 3.1:** Fix OffScreenProductionSystem
- Add `requiredComponents` property
- Fix Entity API usage (getComponent vs components.get)
- Remove unused variables

**Task 3.2:** Fix ParentingSystem
- Ensure it properly implements System interface
- Add id, priority, requiredComponents

**Task 3.3:** Fix RelationshipConversationSystem
- Fix SocialMemoryComponent API usage
- Update to use current component structure

**Task 3.4:** Fix TVBroadcastingSystem
- Fix null vs undefined type errors
- Remove unused variables

### Phase 4: Fix Implicit Any Errors

**Task 4.1:** Add type annotations to all implicit any parameters
- Search for all "implicitly has an 'any' type" errors
- Add explicit type annotations

---

## Acceptance Criteria

1. ✅ `npm run build` completes with 0 errors
2. ✅ All packages build successfully (core, world, llm, renderer)
3. ✅ No regressions in functionality
4. ✅ All type exports properly re-exported from main index files
5. ✅ Module resolution works for all internal packages

---

## Files to Modify

### Core Package
- `packages/core/src/index.ts` - Add missing exports
- `packages/core/src/components/index.ts` - Re-export derivePrioritiesFromSkills
- `packages/core/src/systems/OffScreenProductionSystem.ts` - Fix implementation
- `packages/core/src/systems/ParentingSystem.ts` - Fix System interface
- `packages/core/src/systems/RelationshipConversationSystem.ts` - Fix API usage
- `packages/core/src/television/systems/TVBroadcastingSystem.ts` - Fix types

### World Package
- `packages/world/package.json` - Verify exports field
- `packages/world/src/index.ts` - Verify exports

### LLM Package
- `packages/llm/package.json` - Add exports field if missing
- `packages/llm/src/index.ts` - Verify exports

### Renderer Package
- Various files - Add type annotations to fix implicit any errors

---

## Testing Strategy

1. **After each fix:** Run `npm run build` and verify error count decreases
2. **Track progress:** Document which category of errors is being fixed
3. **No regressions:** Ensure existing functionality still works
4. **Final verification:** Clean build with 0 errors

---

## Notes

**IMPORTANT:** Do NOT remove functionality or regress features. Fix at the source by adding proper exports and type annotations.

**Progress Tracking:**
- Category 1: 6/6 fixed ✅
- Category 2: 2/5 fixed (40%)
- Category 3: 0/4 fixed (0%)
- Category 4: 0/12 fixed (0%)
- Category 5: 0/2 fixed (0%)
- Category 6: 0/4 fixed (0%)
- Category 7: Not counted yet

**Estimated LOC:** ~200 lines of export additions + ~100 lines of type annotations + ~50 lines of System interface fixes

**Difficulty:** MEDIUM - Mostly mechanical work, but requires careful attention to exports

---

**Ready for implementation agent to claim and systematically fix all build errors.**
