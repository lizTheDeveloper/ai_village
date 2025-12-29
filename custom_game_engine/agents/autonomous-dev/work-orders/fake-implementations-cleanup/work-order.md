# Work Order: Fake Implementations Cleanup

**Phase:** Code Quality (Critical)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/fake-implementations-cleanup/spec.md`

---

## Requirements Summary

Remove fake/stub implementations that lie about what the code does:

1. Fix `PlantSystem.isTileSuitable()` - currently uses fake modulo logic
2. Implement or delete `SeedGatheringSystem` - currently just returns
3. Fix hardcoded agent IDs ('system') in BuildingSystem and AnimalHousingActions
4. Fix `IngredientPanel` mock inventory data (hardcoded available: 10)
5. Fix hardcoded metrics values (gatherTime: 1000)
6. Add handlers for orphaned events (15+ event types emitted but never handled)
7. Add missing event emitters (10+ events listened for but never emitted)
8. Fix or remove 28 placeholder test assertions

---

## Acceptance Criteria

### Criterion 1: PlantSystem.isTileSuitable() Uses Real Logic
- **WHEN:** Checking if a tile is suitable for planting
- **THEN:** The system SHALL check actual terrain type, occupancy, and soil quality
- **NOT:** Return `position.x % 2 === 0`

### Criterion 2: SeedGatheringSystem Works or Is Deleted
- **WHEN:** The system exists
- **THEN:** It SHALL actually process seed gathering actions
- **OR:** The file SHALL be deleted if handled elsewhere

### Criterion 3: Real Agent IDs Are Tracked
- **WHEN:** A building is completed or animal action occurs
- **THEN:** The actual agent ID SHALL be recorded, not 'system'

### Criterion 4: IngredientPanel Shows Real Inventory
- **WHEN:** Displaying ingredient availability
- **THEN:** The panel SHALL query actual player inventory

### Criterion 5: Critical Events Are Handled
- **WHEN:** `product_ready`, `housing:dirty`, `goal:achieved` events emit
- **THEN:** Appropriate handlers SHALL process them

### Criterion 6: Missing Events Are Emitted
- **WHEN:** Agent becomes idle, week changes, first harvest occurs
- **THEN:** `agent:idle`, `time:new_week`, `harvest:first` events SHALL emit

### Criterion 7: No Placeholder Tests
- **WHEN:** Running the test suite
- **THEN:** No tests SHALL contain `expect(true).toBe(true)` or similar placeholders

---

## Files to Modify

See spec.md for complete list. Key files:
- `packages/core/src/systems/PlantSystem.ts`
- `packages/core/src/systems/SeedGatheringSystem.ts`
- `packages/core/src/systems/BuildingSystem.ts`
- `packages/core/src/systems/AgentBrainSystem.ts`
- `packages/core/src/systems/TimeSystem.ts`
- `packages/renderer/src/IngredientPanel.ts`
- Multiple test files

---

## Success Definition

1. ✅ `PlantSystem.isTileSuitable()` checks real terrain/occupancy
2. ✅ `SeedGatheringSystem` works or is deleted
3. ✅ No hardcoded 'system' agent IDs remain
4. ✅ `IngredientPanel` shows real inventory counts
5. ✅ `agent:idle` event is emitted and handled
6. ✅ `time:new_week` event is emitted
7. ✅ `product_ready` triggers collection behavior
8. ✅ No placeholder test assertions remain
9. ✅ Build passes: `npm run build`
10. ✅ Tests pass: `npm run test`

---

**End of Work Order**
