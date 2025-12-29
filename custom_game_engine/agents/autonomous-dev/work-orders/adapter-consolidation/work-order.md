# Work Order: Panel Adapter Consolidation

**Phase:** Code Quality (Reduce Boilerplate)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/adapter-consolidation/spec.md`

---

## Requirements Summary

Replace 14 nearly-identical adapter classes (~1,040 lines) with a single generic adapter (~150 lines):

1. Create generic `PanelAdapter<T>` class with configuration
2. Define panel configs for each panel type
3. Migrate all existing adapters to use generic
4. Delete old adapter files

---

## Acceptance Criteria

### Criterion 1: Generic Adapter Works for All Panel Types
- **WHEN:** Any panel is wrapped with PanelAdapter
- **THEN:** getId(), getTitle(), getDefaultWidth(), getDefaultHeight() SHALL work
- **AND:** isVisible(), setVisible(), render() SHALL work correctly

### Criterion 2: Configuration Handles Variations
- **WHEN:** Panels have different visibility patterns (boolean vs delegate vs conditional)
- **THEN:** The config SHALL support getVisible/setVisible overrides

### Criterion 3: Old Adapters Are Deleted
- **WHEN:** Migration is complete
- **THEN:** All 14 individual adapter files SHALL be removed
- **AND:** Only PanelAdapter.ts and index.ts SHALL remain

### Criterion 4: No Regressions
- **WHEN:** Game runs after migration
- **THEN:** All panels SHALL render correctly
- **AND:** All window operations (drag, resize, close) SHALL work

---

## Files to Modify

### Create
- `packages/renderer/src/adapters/PanelAdapter.ts` (generic)

### Delete (after migration)
- `packages/renderer/src/adapters/AgentInfoPanelAdapter.ts`
- `packages/renderer/src/adapters/AnimalInfoPanelAdapter.ts`
- `packages/renderer/src/adapters/CraftingPanelUIAdapter.ts`
- `packages/renderer/src/adapters/CraftingStationPanelAdapter.ts`
- `packages/renderer/src/adapters/EconomyPanelAdapter.ts`
- `packages/renderer/src/adapters/GovernanceDashboardPanelAdapter.ts`
- `packages/renderer/src/adapters/InventoryUIAdapter.ts`
- `packages/renderer/src/adapters/MemoryPanelAdapter.ts`
- `packages/renderer/src/adapters/PlantInfoPanelAdapter.ts`
- `packages/renderer/src/adapters/RelationshipsPanelAdapter.ts`
- `packages/renderer/src/adapters/ResourcesPanelAdapter.ts`
- `packages/renderer/src/adapters/SettingsPanelAdapter.ts`
- `packages/renderer/src/adapters/ShopPanelAdapter.ts`
- `packages/renderer/src/adapters/TileInspectorPanelAdapter.ts`

### Modify
- `packages/renderer/src/adapters/index.ts` (update exports)
- Any files importing old adapters

---

## Success Definition

1. ✅ Generic `PanelAdapter<T>` class created
2. ✅ All 14 panel configs defined
3. ✅ All old adapter files deleted
4. ✅ No imports of old adapters remain
5. ✅ All panels render correctly in game
6. ✅ Visibility toggle works for each panel
7. ✅ Build passes: `npm run build`
8. ✅ Tests pass: `npm run test`

**Lines saved:** ~890 lines (1,040 → 150)

---

**End of Work Order**
