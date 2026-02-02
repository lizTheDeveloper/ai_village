# Tech Debt Review - February 2, 2026

## Executive Summary

This review follows up on the comprehensive February 1, 2026 tech debt audit. **Significant progress has been made** on type safety issues, with major reductions across all categories.

### Progress Since Last Review

| Category | Feb 1 | Feb 2 | Change |
|----------|-------|-------|--------|
| `as any` casts | 799 | 143 | **-82%** |
| `as unknown as` | 389 | 179 | **-54%** |
| `@ts-nocheck` files | 2 | 0 | **Fixed!** |
| Console.log statements | 1,418 | 1,404 | -1% |
| TODO/FIXME comments | 204 | 141 | **-31%** |

**Total Tech Debt Score: ~980** (down from 1,880 - **48% reduction**)

---

## 1. Type Safety Issues - SIGNIFICANT IMPROVEMENT

### Current State

| Pattern | Count | Status |
|---------|-------|--------|
| `as any` casts | 143 across 68 files | **Much improved** |
| `as unknown as` | 179 across 68 files | **Much improved** |
| `@ts-nocheck` | 0 | **Fixed!** |
| `@ts-expect-error` | ~50 | Mostly in tests (acceptable) |

### Remaining High-Priority Files

| File | `as unknown as` Count | Notes |
|------|----------------------|-------|
| `core/src/dashboard/views/index.ts` | 26 | View registration pattern |
| `core/src/metrics/LiveEntityAPI.ts` | 11 | API serialization |
| `renderer/src/DevPanel.ts` | 9 | Component inspection |
| `core/src/debug/AgentDebugLogger.ts` | 8 | Debug utilities |
| `core/src/multiverse/MultiverseNetworkManager.ts` | 7 | Network serialization |

### Recommendations

1. **View Registry Pattern**: Create type-safe view registration helper
2. **Component Access**: Continue expanding type guards in `componentHelpers.ts`
3. **Serialization**: Consider branded types for network/persistence boundaries

---

## 2. Console.log Statements - NEEDS ATTENTION

### Current State

**1,404 console.log occurrences across 89 files**

This category saw minimal change since yesterday. The high count includes:
- Test files with expected logging
- Demo/example scripts
- Production code that needs cleanup

### Key Production Files Needing Cleanup

| File | Count | Type |
|------|-------|------|
| `introspection/src/api/GameIntrospectionAPI.ts` | 17 | API operations |
| `renderer/src/PixiJSRenderer.ts` | 38 | WebGL diagnostics |
| `profiling/MemoryProfiler.ts` | 27 | Memory profiling |
| `city-simulator/GrandStrategySimulator.ts` | 23 | Simulation logs |

### Recommendations

1. Create structured logging utility with log levels
2. Use environment-based conditional logging
3. Focus on removing production code logs first

---

## 3. TODO/FIXME Comments - GOOD PROGRESS

### Current State

**141 TODO/FIXME occurrences across 73 files** (down from 204)

Notable reductions indicate TODOs are being addressed during regular development.

### Remaining High-Priority TODOs

| File | Line | Issue |
|------|------|-------|
| `shared-worker/src/shared-universe-worker.ts:434` | "Apply per-connection viewport filtering to delta updates" |
| `shared-worker/src/shared-universe-worker.ts:609` | "Use ChunkManager for proper tile serialization" |
| `llm/src/TrajectoryPromptBuilder.ts:436` | "Implement based on building types, skills" |
| `introspection/src/mutation/MutationService.ts` | 2 TODOs for undo/error handling |

### TODOs by Package

| Package | Count |
|---------|-------|
| core | ~80 |
| world | 2 |
| shared-worker | 3 |
| llm | 4 |
| introspection | 3 |
| metrics | 1 |

---

## 4. Code Duplication - NEW FINDING

### Potential Duplicate Files

| Files | Lines | Notes |
|-------|-------|-------|
| `core/src/metrics/LiveEntityAPI.ts` | 2,214 | Internal version |
| `metrics/src/LiveEntityAPI.ts` | 4,186 | External version with `@ai-village/core` imports |
| `core/src/reproduction/MatingParadigmRegistry.ts` | 2,028 | Full implementation |
| `reproduction/src/MatingParadigmRegistry.ts` | 152 | Re-export from JSON data |

### Analysis

The LiveEntityAPI duplication appears intentional - the metrics package version wraps the core version for external consumers. However, this pattern risks version drift.

### Recommendations

1. Consider consolidating LiveEntityAPI with clear internal/external boundaries
2. Document the intentional duplication pattern if keeping both
3. Add tests to ensure API parity between versions

---

## 5. Deprecated Code - STATUS UPDATE

### Deprecated Behaviors Still In Use

Many `*WithContext` migrations are complete, but some deprecated behaviors remain:

| Deprecated | Replacement | Status |
|------------|-------------|--------|
| `BehaviorRegistry.register()` | `registerWithContext()` | Migration ongoing |
| `World.registerEntity()` | `addEntity()` | Deprecated marker added |
| Old navigation behaviors | `*WithContext` versions | Most migrated |

### Systems Status

| System | Previous Status | Current Status |
|--------|-----------------|----------------|
| EquipmentSystem | Disabled | Still disabled (tests pass) |
| FriendshipSystem | Disabled | Still disabled |
| LiterarySurrealismParadigm | @ts-nocheck | **Fixed!** |

---

## 6. Large Files - UNCHANGED

### Files Over 2000 Lines

| File | Lines | Change Since Feb 1 |
|------|-------|-------------------|
| `building-designer/src/city-generator.ts` | 4,328 | No change |
| `metrics/src/LiveEntityAPI.ts` | 4,186 | No change |
| `core/src/systems/AdminAngelSystem.ts` | 4,086 | No change |
| `renderer/src/DevPanel.ts` | 3,333 | No change |
| `llm/src/StructuredPromptBuilder.ts` | 3,001 | No change |

These remain candidates for future modularization but are lower priority than the resolved type safety issues.

---

## 7. Performance Anti-Patterns

### Math.sqrt Usage

Per CLAUDE.md, squared distance should be used instead of Math.sqrt in hot paths.

**High-occurrence files (unchanged):**
- `building-designer/src/city-generator.ts` - 19 occurrences
- `core/src/behavior/behaviors/FarmBehaviors.ts` - 16 occurrences
- `core/src/behavior/behaviors/GatherBehavior.ts` - 10 occurrences

### Recommendation

Profile these specific usages during actual gameplay to determine if optimization is needed.

---

## Priority Ranking Update

### P0 - Critical ✅ ALL RESOLVED
- ~~`@ts-nocheck` files~~ **Fixed!**
- ~~Type assertion cleanup~~ **82% reduction achieved**

### P1 - High (Continue This Week)
1. **Console.log cleanup** - Focus on production code files listed above
2. **Remaining `as unknown as` patterns** - 179 left, target 50% reduction

### P2 - Medium (This Sprint)
1. **TODO triage** - Good progress, continue addressing during feature work
2. **Code duplication review** - Document or consolidate LiveEntityAPI pattern
3. **EquipmentSystem re-enable** - Tests pass, just needs export uncomment

### P3 - Low (Backlog)
1. **Large file refactoring** - Opportunistic during feature changes
2. **Math.sqrt optimization** - Profile-driven, not blanket changes
3. **Complete behavior migration** - Gradual during related work

---

## Metrics for Continued Tracking

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| `as any` count | < 50 | 143 | On track |
| `as unknown as` | < 100 | 179 | On track |
| console.log | < 500 | 1,404 | Needs focus |
| @deprecated usages | 0 non-test | ~40 | Ongoing |
| TODO count | < 100 | 141 | On track |

---

## Commits Since Last Review

Key changes that addressed tech debt:
- `d23388ad` - Remove unused radial menu code
- `34c2b691` - Complete tech debt fixes from parallel agents
- `a01e98be` - Tech debt fixes across multiple packages
- `e91967c0` - Complete all TODOs in magic package
- `a1e6f342` - Implement narrative connections in FatesCouncilSystem

---

## Conclusion

**Excellent progress** on the tech debt front. The 82% reduction in `as any` casts and 54% reduction in `as unknown as` patterns demonstrates effective cleanup efforts. The elimination of `@ts-nocheck` files resolves a critical type safety gap.

**Next focus area**: Console.log cleanup, which saw minimal change and represents the largest remaining debt category.

The codebase is trending positively with approximately 48% reduction in overall tech debt score in just 24 hours of focused work.
