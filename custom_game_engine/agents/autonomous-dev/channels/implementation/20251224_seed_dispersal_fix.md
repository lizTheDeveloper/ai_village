# Seed Dispersal Event Handler Fix

**Date:** 2025-12-24
**Agent:** implementation-agent
**Phase:** Bug Fix (Critical)

---

## Issue Summary

**Problem:** Every seed dispersal event caused a "TypeError: Cannot read properties of undefined" crash.

**Root Cause:** PlantSystem emitted `seed:dispersed` events without including a `seed` object, but main.ts event handler tried to access `event.data.seed.generation` and `event.data.seed.genetics`.

**Severity:** Critical - blocked entire seed system functionality

---

## Fix Applied

### 1. PlantSystem: Create and Include Seed Object

**File:** `packages/core/src/systems/PlantSystem.ts`

**Changes:**

1. **Import createSeedFromPlant** (line 8):
```typescript
import { applyGenetics, canGerminate, createSeedFromPlant } from '../genetics/PlantGenetics.js';
```

2. **Create seed before emission** (lines 766-770):
```typescript
// Create seed with inherited genetics from parent plant
const seed = createSeedFromPlant(plant, species.id, {
  parentEntityId: entityId,
  sourceType: 'wild'
});
```

3. **Include seed in event data** (lines 777-788):
```typescript
this.eventBus.emit({
  type: 'seed:dispersed',
  source: 'plant-system',
  data: {
    plantId: entityId,
    speciesId: species.id,
    seedCount: 1,
    positions: [dropPos],
    position: dropPos,
    seed // Include the seed object in the event data
  }
});
```

### 2. EventMap: Update Type Definition

**File:** `packages/core/src/events/EventMap.ts`

**Change:** Added `seed` field to `seed:dispersed` event type (line 281):
```typescript
'seed:dispersed': {
  plantId: EntityId;
  speciesId: string;
  seedCount: number;
  positions: Array<{ x: number; y: number }>;
  position?: { x: number; y: number };
  seed?: any; // SeedComponent - optional to avoid circular dependency
};
```

### 3. Main.ts: Add Validation (CLAUDE.md Compliance)

**File:** `demo/src/main.ts`

**Change:** Added explicit error checks (lines 1173-1179):
```typescript
// REQUIRED: seed must be present in event data
if (!seed) {
  throw new Error(`seed:dispersed event missing required seed object for ${speciesId} at (${position.x}, ${position.y})`);
}
if (!seed.genetics) {
  throw new Error(`seed:dispersed event seed missing required genetics for ${speciesId}`);
}
```

**Rationale:** Per CLAUDE.md, no silent fallbacks - crash with clear error if data is missing.

---

## Verification

### Build Status
```bash
cd custom_game_engine && npm run build
```
✅ **PASSING** - No TypeScript errors

### Test Results

**SeedSystem.integration.test.ts:**
```
Test Files  1 passed (1)
Tests  35 passed (35)
```

**PlantSeedProduction.test.ts:**
```
Test Files  1 passed (1)
Tests  3 passed (3)
```

✅ **ALL TESTS PASSING** (38/38)

### Console Output Verification

From PlantSeedProduction test logs:
```
[PlantSystem] 796121da: disperseSeeds called - plant.seedsProduced=20
[PlantSystem] 796121da: Dispersing 6 seeds in 3-tile radius
[PlantSystem] 796121da: Dispersed seed at (2.0, 0.0)
[PlantSystem] 796121da: Dispersed seed at (2.0, -3.0)
[PlantSystem] 796121da: Placed 4/6 seeds in 3-tile radius (14 remaining)
```

No more "TypeError: Cannot read properties of undefined" errors! ✅

---

## How the Fix Works

### Before Fix

1. PlantSystem disperses seeds
2. Emits `seed:dispersed` with NO seed object
3. Main.ts tries to access `event.data.seed.generation` → **CRASH**

### After Fix

1. PlantSystem creates SeedComponent using `createSeedFromPlant()`
2. Seed has full genetics, viability, quality, generation tracking
3. Emits `seed:dispersed` WITH seed object
4. Main.ts validates seed exists and has genetics
5. Creates plant entity with inherited genetics from seed → **SUCCESS**

---

## Seed Inheritance Flow

```
Parent Plant (generation N)
    ↓
PlantSystem.disperseSeeds()
    ↓
createSeedFromPlant(plant, speciesId)
    ├─ Inherits genetics from parent
    ├─ Calculates quality (health, care, genetics)
    ├─ Applies 10% mutation chance
    ├─ Sets generation = parent.generation + 1
    └─ Returns SeedComponent
    ↓
Emit seed:dispersed event (with seed object)
    ↓
main.ts event handler
    ├─ Validates seed exists
    ├─ Validates seed.genetics exists
    └─ Creates new plant entity with seed.genetics
    ↓
New Plant Entity (generation N+1) with inherited genetics
```

---

## What This Fixes

| Issue | Status |
|-------|--------|
| ❌ TypeError crash on every seed dispersal | ✅ FIXED |
| ❌ Seeds dispersed without genetics | ✅ FIXED - now inherit from parent |
| ❌ Seeds dispersed without generation tracking | ✅ FIXED - generation increments |
| ❌ Seeds dispersed without quality data | ✅ FIXED - quality calculated |
| ❌ Event handler crash blocked germination | ✅ FIXED - germination can now work |

---

## Remaining Work

### Already Implemented ✅
- [x] Seed dispersal mechanism (PlantSystem)
- [x] Seed gathering action (GatherSeedsActionHandler)
- [x] Autonomous seed gathering (AISystem)
- [x] Seed quality calculations (PlantGenetics)
- [x] Genetic inheritance with mutations
- [x] Seed inventory management

### Not Blocking But Would Improve UX
- [ ] Manual UI control to trigger seed gathering (currently only autonomous)
- [ ] Seed inventory display in UI (show quality, viability)
- [ ] Visual feedback when agents gather seeds
- [ ] Seed planting UI

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `packages/core/src/systems/PlantSystem.ts` | 8, 766-770, 786 | Import createSeedFromPlant, create seed, include in event |
| `packages/core/src/events/EventMap.ts` | 281 | Add seed field to event type |
| `demo/src/main.ts` | 1173-1179 | Add validation, prevent crashes |

---

## Testing Checklist

- [x] Build passes without errors
- [x] All seed system integration tests pass (35/35)
- [x] Plant seed production tests pass (3/3)
- [x] Seed dispersal creates seeds with genetics
- [x] Event handler validates required fields
- [x] No TypeScript errors
- [x] CLAUDE.md compliant (no silent fallbacks, clear errors)

---

## Next Steps for Playtest Agent

**Expected Improvements:**

1. ✅ **No more event handler crashes** - Seeds will disperse without errors
2. ✅ **Seeds have proper genetics** - Inherited from parent plants
3. ✅ **Generation tracking works** - Each seed generation increments
4. ✅ **Natural germination can occur** - Event handler no longer crashes, so germination logic can proceed

**What to Test:**

1. Observe natural seed dispersal (should see floating text "🌰 Seed")
2. Check console for "Dispersed seed at (x, y)" messages
3. Verify NO "TypeError: Cannot read properties of undefined" errors
4. Observe if seeds germinate naturally over time
5. Test autonomous seed gathering (agents in wander mode near mature plants)
6. Check agent inventories for gathered seeds

---

## Status

**Verdict:** CRITICAL BUG FIXED ✅

The seed:dispersed event handler crash is resolved. Seeds now properly carry genetics, quality, and generation data from parent plants to germinated offspring. All acceptance criteria should now be testable in the browser.

Ready for playtest verification.
