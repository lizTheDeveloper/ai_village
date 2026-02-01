# Tech Debt Review - February 1, 2026

## Executive Summary

A comprehensive review of the codebase identified significant technical debt across several categories. The most impactful areas requiring attention are:

1. **Type Safety Issues** - 1,188 type assertion escape hatches
2. **Debug Output** - 1,418 console.log statements in production code
3. **Deprecated Code** - 70+ @deprecated annotations with legacy code still in use
4. **TODO/FIXME Comments** - 177 incomplete implementations tracked

---

## 1. Type Safety Issues (HIGH PRIORITY)

### Summary
| Pattern | Count | Severity |
|---------|-------|----------|
| `as any` casts | 799 | High |
| `as unknown` casts | 389 | High |
| `@ts-ignore` / `@ts-expect-error` | ~50 | Medium |

### Key Findings

The codebase violates the CLAUDE.md rule: "No Type Assertion Escape Hatches". The `as any` and `as unknown as Type` patterns bypass type checking and mask real type safety issues.

**Most affected areas:**
- `debug-compatibility.ts` - Extensive `as any` casts for component access
- `test-llm-scheduler.ts` - Mock world objects using `as any`
- Test files generally - Many use `as any` for test setup
- Component type conversions throughout behaviors

**Example problematic patterns:**
```typescript
// BAD: Found throughout codebase
const needsComp = agentCritical.components.get('needs') as any;
const world = gameLoop.world as any;
```

### Recommendations
1. Create proper type guards for component access
2. Use generic type parameters where applicable
3. Fix underlying type definitions rather than casting
4. Prioritize fixing casts in production code over test code

---

## 2. Console.log Statements (MEDIUM PRIORITY)

### Summary
**Total console.log occurrences: 1,418**

Per CLAUDE.md: "PROHIBITED: console.log('Debug:', x)"

### Key Locations
- `packages/magic/src/validate-spells.ts` - 15+ console.log statements
- `packages/renderer/src/` - Numerous debug logs
- `packages/core/src/systems/` - Debug output in system code
- `packages/llm/src/` - Request/response logging

### Recommendations
1. Remove debug console.log statements
2. Replace with proper logging system (console.error/warn for errors)
3. Add conditional debug mode for development-only logging
4. Consider structured logging for production diagnostics

---

## 3. Deprecated Code (HIGH PRIORITY)

### Summary
**70+ @deprecated annotations found**

Many deprecated behaviors still exist alongside their `*WithContext` replacements:

### Deprecated Behaviors (packages/core/src/behavior/behaviors/)
| Deprecated | Replacement |
|------------|-------------|
| `wanderBehavior` | `wanderBehaviorWithContext` |
| `gatherBehavior` | `gatherBehaviorWithContext` |
| `seekFoodBehavior` | `seekFoodBehaviorWithContext` |
| `sleepBehavior` | `seekSleepBehaviorWithContext` |
| `buildBehavior` | `buildBehaviorWithContext` |
| `craftBehavior` | `craftBehaviorWithContext` |
| `talkBehavior` | `talkBehaviorWithContext` |
| ... and 20+ more | |

### Other Deprecated APIs
- `BehaviorRegistry.register()` → `registerWithContext()`
- `PromptLogger.prettyPrint()` → `analyze()`
- `World.registerEntity()` → `addEntity()`
- `PlanetTierAdapter` sync methods → `syncAllData()`
- `CookingSkillComponent.level` → `SkillsComponent.levels.cooking`
- `ItemDefinition.isEdible` → `traits.edible`

### Recommendations
1. Complete migration to `*WithContext` behavior patterns
2. Remove deprecated behavior exports after migration
3. Update all call sites to use new APIs
4. Add deprecation timeline/removal dates

---

## 4. TODO/FIXME Comments (MEDIUM PRIORITY)

### Summary
**177 TODO/FIXME/HACK comments found**

### Categories

**Integration TODOs (Need coordination):**
- `microgenerators-server/server.ts:74` - "Submit to godCraftedQueue when integrated"
- `metrics-server.ts:9048` - "Integrate with RiddleBookMicrogenerator"
- `shared-worker/src/shared-universe-worker.ts:434` - "Apply per-connection viewport filtering"

**Feature Implementation TODOs:**
- `scripts/pixellab-daemon.ts:861` - "Each plant needs 8 growth stages generated"
- `scripts/metrics-server.ts:6371` - "Implement multipart file upload handler"
- `demo/src/main.ts:4076` - "Implement server snapshot loading"

**Validation TODOs (scripts/validate-package-runtime.ts):**
- Line 171-192: Multiple validation TODOs for sprites, animations, prompts, schemas, voxels

**Test TODOs:**
- `llm/__tests__/ExecutorDeepEval.test.ts` - Multiple test improvements needed

### Recommendations
1. Triage TODOs by priority and create GitHub issues
2. Remove stale/obsolete TODOs
3. Add issue references to remaining TODOs
4. Set quarterly TODO review cadence

---

## 5. Large Files Needing Refactoring (LOW PRIORITY)

### Files Over 2000 Lines
| File | Lines | Notes |
|------|-------|-------|
| `building-designer/src/city-generator.ts` | 4,328 | Should split into modules |
| `metrics/src/LiveEntityAPI.ts` | 4,181 | Consider service extraction |
| `magic/src/__tests__/SpellEffectAppliers.test.ts` | 4,095 | Test organization |
| `core/src/systems/AdminAngelSystem.ts` | 4,086 | System decomposition |
| `renderer/src/DevPanel.ts` | 3,333 | UI component splitting |
| `llm/src/StructuredPromptBuilder.ts` | 3,001 | Builder pattern extraction |

### Recommendations
1. Extract focused modules from large files
2. Apply single responsibility principle
3. Prioritize files with high change frequency

---

## 6. Performance Anti-Patterns (MEDIUM PRIORITY)

### Math.sqrt Usage
**328 occurrences of Math.sqrt across 158 files**

Per CLAUDE.md: "Use squared distance" to avoid sqrt in hot paths.

**Most affected files:**
- `metrics/src/analyzers/SpatialAnalyzer.ts` - 10 occurrences
- `core/src/behavior/behaviors/GatherBehavior.ts` - 10 occurrences
- `building-designer/src/city-generator.ts` - 19 occurrences
- `core/src/behavior/behaviors/FarmBehaviors.ts` - 16 occurrences

### Queries in Loops
Several test files contain queries inside loops (acceptable for tests):
- `core/src/__tests__/AnimalSystem.test.ts`
- `core/src/systems/__tests__/SteeringSystem.test.ts`

Production code appears mostly correct with queries cached before loops.

### Recommendations
1. Audit Math.sqrt usage in hot paths (system update methods)
2. Replace with squared distance comparisons where appropriate
3. Profile to identify actual performance bottlenecks

---

## 7. Error Handling Patterns (LOW PRIORITY)

### Silent Catch Blocks
No completely empty catch blocks found (good!).

### Catch Blocks with Comments
~200+ catch blocks with comments explaining error handling strategy.

### Return null/undefined
Significant use of `return null` and `return undefined` patterns - needs review for potential silent failures.

### Recommendations
1. Review `return null` patterns for silent failure risks
2. Ensure all error paths follow CLAUDE.md guidelines
3. Consider Result/Either patterns for explicit error handling

---

## 8. TypeScript Directive Suppressions

### Summary
| Directive | Count | Notes |
|-----------|-------|-------|
| `@ts-expect-error` | ~30 | Mostly in tests (acceptable) |
| `@ts-ignore` | ~5 | Should be replaced |
| `eslint-disable` | ~5 | Specific rule disables |

### Recommendations
1. Replace `@ts-ignore` with `@ts-expect-error` where tests need type violations
2. Document reasons for eslint-disable comments
3. Review if underlying type issues can be fixed

---

## Priority Ranking

### P0 - Critical (Address Immediately)
- None - no blocking issues found

### P1 - High (Address This Quarter)
1. **Type assertion cleanup** - Start with production code, not tests
2. **Deprecated behavior migration** - Complete `*WithContext` migration
3. **Console.log removal** - Remove debug output from production

### P2 - Medium (Address Next Quarter)
1. **TODO triage** - Create issues, remove stale TODOs
2. **Math.sqrt optimization** - Profile and fix hot paths
3. **Error handling review** - Audit return null patterns

### P3 - Low (Backlog)
1. **Large file refactoring** - When touching these files
2. **TypeScript directive cleanup** - Low impact

---

## Metrics for Tracking

Track these metrics monthly:
- `as any` count (target: reduce 10%/month)
- console.log count (target: < 100)
- @deprecated usages (target: 0 non-test usages)
- TODO count (target: reduce 20%/quarter)

---

## Session Notes

This review was conducted on February 1, 2026, covering the `custom_game_engine/packages` directory. The codebase shows good practices in many areas (no empty catch blocks, proper error context in handlers, documented deprecations) but has accumulated technical debt primarily in type safety and debug output.

The most impactful improvement would be establishing type-safe patterns for component access, which would eliminate most `as any` casts while improving code reliability.
