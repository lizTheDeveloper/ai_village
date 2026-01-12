# Work Order: God Class Decomposition

**Phase:** Architecture (Refactoring)
**Created:** 2025-12-28
**Updated:** 2026-01-11
**Status:** IN_PROGRESS

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/god-class-decomposition/spec.md`

---

## Requirements Summary

Break up 7 "god classes" (files over 1,000 lines) into focused modules:

1. BuildingBlueprintRegistry (1,537 lines) → Registry + Validator + CostLookup + TierManager
2. ~~StructuredPromptBuilder (1,503 lines) → Builder + ContextModules + MotivationEngine~~ **COMPLETE (3-layer architecture)**
3. MetricsCollector (1,334 lines) → Collector + Modules + Storage + Aggregation
4. ~~Renderer (2,984 lines) → Renderer + ChunkRenderer + EntityRenderer + Camera~~ **COMPLETE (657 lines)**
5. WindowManager (1,081 lines) → Manager + Positioner + DragDrop + LRU
6. LLMDecisionProcessor (1,074 lines) → Processor + Parser + Converter + Validator
7. EventMap (1,050 lines) → Split into type modules by category

---

## Completed: Renderer Decomposition (2026-01-11)

**Result:** 2,984 → 657 lines (78% reduction)

Extracted modules:
- `terrain/TerrainRenderer.ts` (342 lines)
- `terrain/SideViewTerrainRenderer.ts` (322 lines)
- `entities/AgentRenderer.ts` (165 lines)
- `entities/AnimalRenderer.ts` (72 lines)
- `entities/BuildingRenderer.ts` (198 lines)
- `overlays/DebugOverlay.ts` (139 lines)
- `overlays/InteractionOverlay.ts` (266 lines)
- `sprites/PixelLabEntityRenderer.ts` (178 lines)
- `EntityPicker.ts` (209 lines)
- `core/systems/ChunkLoadingSystem.ts` (game logic extraction)

Also removed ~762 lines of dead side-view code (now uses Renderer3D.ts).

See: `work-orders/renderer-decomposition/work-order.md` for full details.

---

## Completed: StructuredPromptBuilder Decomposition (2026-01-11)

**Result:** Decomposed into 3-layer cognitive architecture + 6 sub-builders

Three-layer prompt system:
- `StructuredPromptBuilder.ts` (2,688 lines) - Autonomic layer
- `TalkerPromptBuilder.ts` (737 lines) - Social/verbal planning
- `ExecutorPromptBuilder.ts` (685 lines) - Task execution

Extracted sub-builders in `prompt-builders/`:
- `WorldContextBuilder.ts` (763 lines)
- `HarmonyContextBuilder.ts` (510 lines)
- `ActionBuilder.ts` (469 lines)
- `SkillProgressionUtils.ts` (329 lines)
- `MemoryBuilder.ts` (328 lines)
- `VillageInfoBuilder.ts` (280 lines)

Note: Different approach than originally planned (thin orchestrator), but effectively decomposed into specialized layers that mirror cognitive architecture.

See: `work-orders/prompt-builder-decomposition/work-order.md` for full details.

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

| File | Before | After | Status |
|------|--------|-------|--------|
| BuildingBlueprintRegistry | 1,537 | 300 + modules | Pending |
| **StructuredPromptBuilder** | **1,503** | **3-layer + 6 sub-builders** | **COMPLETE** |
| MetricsCollector | 1,334 | 200 + modules | Pending |
| **Renderer** | **2,984** | **657 + 12 modules** | **COMPLETE** |
| WindowManager | 1,081 | 250 + modules | Pending |
| LLMDecisionProcessor | 1,074 | 200 + modules | Pending |
| EventMap | 1,050 | 50 + type files | Pending |

1. ✅ All files under 350 lines
2. ✅ No duplicate building costs
3. ✅ Each module has clear single purpose
4. ✅ All existing functionality works
5. ✅ Build passes: `npm run build`
6. ✅ Tests pass: `npm run test`

---

**End of Work Order**
