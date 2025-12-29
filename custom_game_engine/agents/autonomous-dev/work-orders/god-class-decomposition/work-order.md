# Work Order: God Class Decomposition

**Phase:** Architecture (Refactoring)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/god-class-decomposition/spec.md`

---

## Requirements Summary

Break up 7 "god classes" (files over 1,000 lines) into focused modules:

1. BuildingBlueprintRegistry (1,537 lines) → Registry + Validator + CostLookup + TierManager
2. StructuredPromptBuilder (1,503 lines) → Builder + ContextModules + MotivationEngine
3. MetricsCollector (1,334 lines) → Collector + Modules + Storage + Aggregation
4. Renderer (1,236 lines) → Renderer + ChunkRenderer + EntityRenderer + Camera
5. WindowManager (1,081 lines) → Manager + Positioner + DragDrop + LRU
6. LLMDecisionProcessor (1,074 lines) → Processor + Parser + Converter + Validator
7. EventMap (1,050 lines) → Split into type modules by category

---

## Acceptance Criteria

### Criterion 1: No File Over 350 Lines
- **WHEN:** Checking file sizes after refactor
- **THEN:** No source file SHALL exceed 350 lines

### Criterion 2: Single Responsibility Per Module
- **WHEN:** A new module is created
- **THEN:** It SHALL have ONE clear purpose

### Criterion 3: Removed Code Duplication
- **WHEN:** BuildingCostLookup exists
- **THEN:** LLMDecisionProcessor SHALL NOT have hardcoded BUILDING_COSTS

### Criterion 4: No Behavior Changes
- **WHEN:** Refactoring is complete
- **THEN:** All existing functionality SHALL work identically

### Criterion 5: Improved Testability
- **WHEN:** A module is extracted
- **THEN:** It SHALL be testable in isolation

---

## Priority Order

1. **BuildingCostLookup** - Removes duplicate costs from LLMDecisionProcessor
2. **BuildingBlueprintRegistry split** - Foundation for other fixes
3. **MotivationEngine extraction** - Makes prompt building testable
4. **MetricsCollector split** - Enables per-module testing
5. **EventMap split** - Easier to navigate
6. **WindowManager split** - Separate concerns
7. **Renderer split** - Already has some separation
8. **LLMDecisionProcessor split** - Lower priority

---

## Success Definition

| File | Before | After |
|------|--------|-------|
| BuildingBlueprintRegistry | 1,537 | 300 + modules |
| StructuredPromptBuilder | 1,503 | 200 + modules |
| MetricsCollector | 1,334 | 200 + modules |
| Renderer | 1,236 | 200 + modules |
| WindowManager | 1,081 | 250 + modules |
| LLMDecisionProcessor | 1,074 | 200 + modules |
| EventMap | 1,050 | 50 + type files |

1. ✅ All files under 350 lines
2. ✅ No duplicate building costs
3. ✅ Each module has clear single purpose
4. ✅ All existing functionality works
5. ✅ Build passes: `npm run build`
6. ✅ Tests pass: `npm run test`

---

**End of Work Order**
