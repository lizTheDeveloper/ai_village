# Plant Lifecycle Fix Attempt #1: Enhanced Diagnostic Logging

**Date:** 2025-12-22
**Issue:** Zero seed production (plants reach seeding stage but produce 0 seeds)
**Status:** Diagnostic logging added, needs testing

---

## Problem Analysis

From the playtest report, plants reach the seeding stage but show:
```
[PlantSystem] plant_17: Dispersing 0 seeds in 3-tile radius
[PlantSystem] plant_17: Placed 0/0 seeds in 3-tile radius (0 remaining)
```

This indicates `plant.seedsProduced === 0` when the plant transitions to seeding.

### Code Analysis

**Plant Creation (main.ts:136-150)**:
- Plants created at `mature` stage should get `seedsProduced = Math.floor(species.seedsPerPlant * yieldAmount)`
- For Grass: `Math.floor(50 * 0.5) = 25 seeds`
- For Wildflower: `Math.floor(25 * 0.8) = 20 seeds`

**Seed Production Effect (PlantSystem.ts:648-672)**:
```typescript
case 'produce_seeds': {
  if (plant.seedsProduced === 0) {
    const seedCount = species.seedsPerPlant;
    const yieldModifier = applyGenetics(plant, 'yield');
    const calculatedSeeds = Math.floor(seedCount * yieldModifier);
    plant.seedsProduced = calculatedSeeds;
  } else {
    // Skipped if already has seeds
  }
}
```

**Stage Transitions**:
- Grass: `vegetative → mature` (triggers `produce_seeds`)
- Grass: `mature → seeding` (triggers `produce_seeds` + `drop_seeds`)
- Wildflower: `fruiting → mature` (triggers `fruit_ripens` + `produce_seeds`)
- Wildflower: `mature → seeding` (triggers `produce_seeds` + `drop_seeds`)

### Hypothesis

Plants that were **created at mature stage** should have `seedsProduced = 25` from initialization. When they transition `mature → seeding`, the `produce_seeds` effect should:
1. Check `if (plant.seedsProduced === 0)` → FALSE (should be 25)
2. Skip seed production (log "already has 25 seeds")
3. Execute `drop_seeds` effect with existing seeds

But playtest shows 0 seeds being dispersed, which means either:
1. Seeds are not being set during plant creation
2. Seeds are being reset/cleared somewhere
3. The plant object is being replaced/recreated

---

## Changes Made

### 1. Enhanced Effect Logging (PlantSystem.ts)

Added comprehensive logging to `executeTransitionEffects`:
- Log all effects being executed
- Log plant state BEFORE effects (seedsProduced, flowerCount, fruitCount)
- Log each effect as it's processed
- Log `produce_seeds` effect with EXECUTED or SKIPPED status
- Log plant state AFTER all effects

**Example output**:
```
[PlantSystem] 2dca56b3: Executing 2 transition effect(s) for mature → seeding
[PlantSystem] 2dca56b3: Plant state before effects - seedsProduced=25, flowerCount=0, fruitCount=0
[PlantSystem] 2dca56b3: Processing effect: produce_seeds
[PlantSystem] 2dca56b3: produce_seeds effect START - plant.seedsProduced=25
[PlantSystem] 2dca56b3: produce_seeds effect SKIPPED - already has 25 seeds
[PlantSystem] 2dca56b3: Processing effect: drop_seeds
[PlantSystem] 2dca56b3: Dispersing 7 seeds in 3-tile radius
[PlantSystem] 2dca56b3: All effects complete - seedsProduced=25, flowerCount=0, fruitCount=0
```

### 2. Enhanced Plant Creation Logging (main.ts:161)

Added `seedsProduced` value to plant creation log:
```
Created Grass (mature) at (5.2, -3.7) - Entity abc12345 - seedsProduced=25
```

This will confirm whether plants are created with the correct initial seed count.

### 3. Entity ID Tracking (main.ts:154)

Store entity ID on plant component for consistent logging:
```typescript
(plantComponent as any).entityId = plantEntity.id;
```

This ensures all plant logs show the same entity ID throughout the plant's lifecycle.

---

## Expected Diagnostic Output

With the enhanced logging, we should see:

### Scenario 1: Plant created at mature, transitions to seeding

```
Created Grass (mature) at (5.2, -3.7) - Entity abc12345 - seedsProduced=25
...
[PlantSystem] abc12345: grass stage mature → seeding (age=23.0d, health=91)
[PlantSystem] abc12345: Executing 2 transition effect(s) for mature → seeding
[PlantSystem] abc12345: Plant state before effects - seedsProduced=25, flowerCount=0, fruitCount=0
[PlantSystem] abc12345: Processing effect: produce_seeds
[PlantSystem] abc12345: produce_seeds effect START - plant.seedsProduced=25
[PlantSystem] abc12345: produce_seeds effect SKIPPED - already has 25 seeds
[PlantSystem] abc12345: Processing effect: drop_seeds
[PlantSystem] abc12345: disperseSeeds called - plant.seedsProduced=25, count param=undefined
[PlantSystem] abc12345: Dispersing 7 seeds in 3-tile radius
[PlantSystem] abc12345: All effects complete - seedsProduced=25, flowerCount=0, fruitCount=0
```

### Scenario 2: Plant grows from vegetative to mature to seeding

```
Created Grass (vegetative) at (2.1, 8.3) - Entity def67890 - seedsProduced=0
...
[PlantSystem] def67890: grass stage vegetative → mature (age=8.0d, health=95)
[PlantSystem] def67890: Executing 1 transition effect(s) for vegetative → mature
[PlantSystem] def67890: Plant state before effects - seedsProduced=0, flowerCount=0, fruitCount=0
[PlantSystem] def67890: Processing effect: produce_seeds
[PlantSystem] def67890: produce_seeds effect START - plant.seedsProduced=0
[PlantSystem] def67890: produce_seeds effect EXECUTED - species.seedsPerPlant=50, yieldModifier=0.50, calculated=25, plant.seedsProduced=25
[PlantSystem] def67890: All effects complete - seedsProduced=25, flowerCount=0, fruitCount=0
...
[PlantSystem] def67890: grass stage mature → seeding (age=11.0d, health=94)
[PlantSystem] def67890: Executing 2 transition effect(s) for mature → seeding
[PlantSystem] def67890: Plant state before effects - seedsProduced=25, flowerCount=0, fruitCount=0
[PlantSystem] def67890: Processing effect: produce_seeds
[PlantSystem] def67890: produce_seeds effect START - plant.seedsProduced=25
[PlantSystem] def67890: produce_seeds effect SKIPPED - already has 25 seeds
[PlantSystem] def67890: Processing effect: drop_seeds
[PlantSystem] def67890: disperseSeeds called - plant.seedsProduced=25, count param=undefined
[PlantSystem] def67890: Dispersing 7 seeds in 3-tile radius
[PlantSystem] def67890: All effects complete - seedsProduced=25, flowerCount=0, fruitCount=0
```

---

## Next Steps

**FOR PLAYTEST AGENT:**

Please run the game again with the enhanced logging and provide:

1. **Full console logs** from game start through at least one `mature → seeding` transition
2. **Focus on these key questions**:
   - Do plants created at `mature` stage show `seedsProduced=25` in creation log?
   - When plants transition `mature → seeding`, what does "Plant state before effects" show?
   - Is the `produce_seeds` effect being EXECUTED or SKIPPED?
   - What is `plant.seedsProduced` value when `disperseSeeds` is called?

3. **Look for anomalies**:
   - Does `seedsProduced` change between creation and transition?
   - Are there any errors or warnings?
   - Does the effect execution log match expected behavior?

The enhanced logging should reveal exactly where/when `seedsProduced` is being lost or set to 0.

---

## Files Modified

- `custom_game_engine/packages/core/src/systems/PlantSystem.ts` - Enhanced effect logging
- `custom_game_engine/demo/src/main.ts` - Enhanced plant creation logging + entity ID tracking

**Build status**: ✅ PASSING (no TypeScript errors)
