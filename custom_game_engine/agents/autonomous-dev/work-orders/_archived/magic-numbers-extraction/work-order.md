# Work Order: Magic Numbers Extraction

**Phase:** Code Quality (Maintainability)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/magic-numbers-extraction/spec.md`

---

## Requirements Summary

Extract hardcoded numeric literals into named constants:

1. Create `packages/core/src/constants/` directory
2. Create TimeConstants.ts (durations, intervals, tick rates)
3. Create SpatialConstants.ts (distances, radii)
4. Create NeedsConstants.ts (hunger/energy/health thresholds)
5. Create GameplayConstants.ts (yields, costs, multipliers)
6. Update all systems, behaviors, and actions to use constants

---

## Acceptance Criteria

### Criterion 1: Time Values Are Named
- **WHEN:** A duration like `200` ticks appears
- **THEN:** It SHALL be replaced with `TILL_DURATION_WITH_HOE`

### Criterion 2: Distance Values Are Named
- **WHEN:** A distance like `1.5` or `Math.sqrt(2)` appears
- **THEN:** It SHALL be replaced with `ADJACENT_DISTANCE` or `DIAGONAL_DISTANCE`

### Criterion 3: Threshold Values Are Named
- **WHEN:** A threshold like `0.4` for hunger appears
- **THEN:** It SHALL be replaced with `HUNGER_THRESHOLD_SEEK_FOOD`

### Criterion 4: Constants Are Organized
- **WHEN:** Looking for a constant
- **THEN:** It SHALL be in the appropriate file (Time, Spatial, Needs, Gameplay)

---

## Files to Create

- `packages/core/src/constants/TimeConstants.ts`
- `packages/core/src/constants/SpatialConstants.ts`
- `packages/core/src/constants/NeedsConstants.ts`
- `packages/core/src/constants/GameplayConstants.ts`
- `packages/core/src/constants/index.ts`

## Files to Modify

See spec.md for complete list. Estimated 30+ files across:
- `systems/*.ts`
- `behavior/behaviors/*.ts`
- `actions/*.ts`

---

## Success Definition

1. ✅ Constants directory created with 4 organized files
2. ✅ All time durations use TimeConstants
3. ✅ All distances use SpatialConstants
4. ✅ All need thresholds use NeedsConstants
5. ✅ All gameplay values use GameplayConstants
6. ✅ No unexplained numeric literals in systems/behaviors
7. ✅ Build passes: `npm run build`
8. ✅ Tests pass: `npm run test`

---

**End of Work Order**
