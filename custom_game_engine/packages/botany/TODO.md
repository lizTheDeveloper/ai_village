# Botany Package - Implementation Audit

**Date:** 2026-01-11
**Updated:** 2026-01-11
**Auditor:** Claude Code (Automated Audit)
**Package Version:** 0.1.0

## Summary

The `@ai-village/botany` package is the **extracted plant systems** from `@ai-village/core`.

**Package Health:** 🟢 **EXTRACTION IN PROGRESS** - Botany is now the primary location for plant systems

## Extraction Status (Updated 2026-01-11)

### Completed
- ✅ PlantSystem ported with StateMutatorSystem integration (was 118 lines behind, now synced)
- ✅ PlantDiseaseSystem, PlantDiscoverySystem, WildPlantPopulationSystem synced with correct imports
- ✅ registerAllSystems.ts updated to accept plant systems via config (avoids circular deps)
- ✅ demo/main.ts imports plant systems from @ai-village/botany
- ✅ demo/headless.ts imports plant systems from @ai-village/botany
- ✅ Vite alias added for @ai-village/botany

### Pending
- ⏳ Core plant systems marked as deprecated but not yet removed
- ⏳ scripts/headless-game.ts still uses core directly (manual registration)
- ⏳ packages/shared-worker still uses core directly
- ⏳ packages/city-simulator still uses core directly
- ⏳ Plant tests need to be moved from core to botany

## Background

This package was created on 2026-01-06 as "Phase 1 #3" of package extraction. Core's PlantSystem continued evolving with StateMutatorSystem integration (Jan 8th), causing botany to fall behind. As of 2026-01-11, the StateMutatorSystem integration has been ported to botany and the extraction is being completed.

---

## Current Architecture: Deprecation in Progress

### Current State

The following systems exist in **BOTH** locations during the extraction transition:

1. **PlantSystem**
   - `packages/botany/src/systems/PlantSystem.ts` (~1408 lines) - **CURRENT/PRIMARY**
   - `packages/core/src/systems/PlantSystem.ts` (~1408 lines) - **DEPRECATED**
   - Both now have StateMutatorSystem integration (synced 2026-01-11)

2. **PlantDiseaseSystem**
   - `packages/botany/src/systems/PlantDiseaseSystem.ts` - **CURRENT/PRIMARY**
   - `packages/core/src/systems/PlantDiseaseSystem.ts` - **DEPRECATED**

3. **PlantDiscoverySystem**
   - `packages/botany/src/systems/PlantDiscoverySystem.ts` - **CURRENT/PRIMARY**
   - `packages/core/src/systems/PlantDiscoverySystem.ts` - **DEPRECATED**

4. **WildPlantPopulationSystem**
   - `packages/botany/src/systems/WildPlantPopulationSystem.ts` - **CURRENT/PRIMARY**
   - `packages/core/src/systems/WildPlantPopulationSystem.ts` - **DEPRECATED**

### Active Usage

- ✅ **demo/main.ts**: Imports from `@ai-village/botany`
- ✅ **demo/headless.ts**: Imports from `@ai-village/botany`
- ⏳ **scripts/headless-game.ts**: Still uses core (deprecated)
- ⏳ **packages/shared-worker**: Still uses core (deprecated)
- ⏳ **packages/city-simulator**: Still uses core (deprecated)

### To Complete Extraction

1. Update remaining consumers to import from botany
2. Delete deprecated plant systems from core
3. Move plant tests from core to botany

### Evidence (Updated 2026-01-11)

```bash
# Demo NOW imports from botany
grep -r "@ai-village/botany" demo/src/main.ts
# Result: import { PlantSystem as BotanyPlantSystem, ...} from '@ai-village/botany';

# Vite alias configured
grep "@ai-village/botany" demo/vite.config.ts
# Result: '@ai-village/botany': path.resolve(__dirname, '../packages/botany/src/index.ts'),

# Core systems marked deprecated
grep -A2 "DEPRECATED" packages/core/src/systems/registerAllSystems.ts
# Result: // Plants - DEPRECATED: These imports will be removed in future versions.
```

---

## Remaining Stubs and Placeholders (Minor)

### Minor Issues (Non-Critical)

- [ ] **PlantDiseaseSystem.ts:175** - Event handler placeholder
  ```typescript
  private applyTreatmentFromEvent(...): void {
    // For now this is a placeholder - actual treatment is done via applyTreatment()
  }
  ```
  **Impact:** Low - Event handler is stubbed but external `applyTreatment()` method is fully implemented

- [ ] **PlantDiseaseSystem.ts:234** - Simplified game day calculation
  ```typescript
  private getCurrentGameDay(_world: World): number {
    // In a real implementation, this would query the time system
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  }
  ```
  **Impact:** Low - Uses real-time instead of game-time, but functional

- [ ] **WildPlantPopulationSystem.ts:415** - Simplified biome detection
  ```typescript
  private getBiomeAtPosition(...): string | null {
    // In a full implementation, this would query the terrain/biome data
    return 'plains';
  }
  ```
  **Impact:** Medium - Always returns 'plains' instead of actual biome, limiting wild plant diversity

---

## Missing Integrations

### 1. Demo Integration

**Issue:** The `@ai-village/botany` package is never imported by the demo application.

**Files checked:**
- `demo/src/main.ts` - Only imports from `@ai-village/core`
- `demo/package.json` - Does not list `@ai-village/botany` as dependency
- `demo/vite.config.ts` - No alias for `@ai-village/botany`

**Current state:**
```typescript
// Demo uses core systems
import { PlantSystem } from '@ai-village/core';  // ✅ This works

// Botany systems are compiled but never imported
import { PlantSystem } from '@ai-village/botany'; // ❌ Never used
```

**Recommendation:** Either use the botany package or delete it.

### 2. Biome System Integration

**Issue:** `WildPlantPopulationSystem.getBiomeAtPosition()` always returns `'plains'` instead of querying actual biome data.

**Location:** `packages/botany/src/systems/WildPlantPopulationSystem.ts:415`

**Expected behavior:**
```typescript
// Should query world terrain/biome system
const tile = world.getTileAt(position.x, position.y);
return tile?.biome || 'plains';
```

**Current behavior:**
```typescript
// Always returns hardcoded value
return 'plains';
```

**Impact:** All wild plants spawn as if in plains biome, ignoring forest/desert/wetland distributions.

### 3. Game Time Integration

**Issue:** `PlantDiseaseSystem.getCurrentGameDay()` uses real-world time instead of game time.

**Location:** `packages/botany/src/systems/PlantDiseaseSystem.ts:234`

**Expected behavior:**
```typescript
// Should query TimeSystem for game day
const timeEntity = world.query().with('time').executeEntities()[0];
const timeComp = timeEntity.getComponent('time');
return timeComp.currentDay;
```

**Current behavior:**
```typescript
// Uses JavaScript Date.now() which drifts from game time
return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
```

**Impact:** Disease timing doesn't respect time acceleration/deceleration.

---

## Dead Code

### Unused Package

The entire `@ai-village/botany` package appears to be dead code:

- **Not imported** by demo application
- **Not listed** in demo dependencies
- **Not referenced** in any non-test code
- **Duplicates** functionality in `@ai-village/core`

### Backup Files

Found in core package (related to plant systems):
- `packages/core/src/systems/registerAllSystems.ts.backup` - Contains outdated imports

**Recommendation:** Delete `.backup` files.

---

## Priority Fixes

### ✅ RESOLVED: Package Extraction In Progress (Option B Chosen)

**Decision made 2026-01-11:** Complete the extraction to `@ai-village/botany`

#### Previous Option A: Delete `@ai-village/botany` (NOT CHOSEN)

This option was rejected in favor of completing the extraction.

#### ✅ Option B: Complete the extraction to `@ai-village/botany` (SELECTED - In Progress)

**Rationale:**
- This was the INTENDED direction ("Phase 1 #3" of extraction)
- Separates domain logic (plants) from core ECS infrastructure
- Better context isolation for AI agents working on plant systems
- Follows the pattern of other extracted packages (magic, divinity, etc.)

**Action:**
1. **Sync botany with core's improvements:**
   - Port StateMutatorSystem integration from core's PlantSystem to botany
   - Port any other changes made since Jan 6th
2. **Update registerAllSystems.ts:**
   - Import PlantSystem, PlantDiseaseSystem, PlantDiscoverySystem, WildPlantPopulationSystem from `@ai-village/botany`
3. **Delete plant systems from core:**
   - Remove from `packages/core/src/systems/`
   - Update `packages/core/src/systems/index.ts`
4. **Move tests:**
   - Move `PlantSystem.test.ts` etc. to `packages/botany/src/__tests__/`
5. **Update demo dependencies:**
   - Add `@ai-village/botany` to `demo/package.json`

**Recommendation:** Choose **Option B** to complete the extraction properly. The performance improvements in core's PlantSystem need to be ported to botany first.

### 🟡 Medium: Fix Biome Integration

**File:** `packages/botany/src/systems/WildPlantPopulationSystem.ts`
**Line:** 415
**Issue:** Hardcoded biome detection

**Fix:**
```typescript
private getBiomeAtPosition(
  position: { x: number; y: number },
  world: World
): string | null {
  // Query terrain system for actual biome
  const worldWithTiles = world as { getTileAt?: (x: number, y: number) => any };
  if (typeof worldWithTiles.getTileAt !== 'function') {
    return 'plains'; // Fallback only if no tile system
  }

  const tile = worldWithTiles.getTileAt(position.x, position.y);
  return tile?.biome || 'plains';
}
```

### 🟡 Medium: Fix Game Time Integration

**File:** `packages/botany/src/systems/PlantDiseaseSystem.ts`
**Line:** 234
**Issue:** Uses real-time instead of game-time

**Fix:**
```typescript
private getCurrentGameDay(world: World): number {
  const timeEntities = world.query().with('time').executeEntities();
  if (timeEntities.length > 0) {
    const timeComp = timeEntities[0].getComponent('time') as { currentDay?: number };
    if (timeComp?.currentDay !== undefined) {
      return timeComp.currentDay;
    }
  }
  // Fallback to real-time if TimeSystem not available
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
}
```

### 🟢 Low: Implement Event Handler

**File:** `packages/botany/src/systems/PlantDiseaseSystem.ts`
**Line:** 169
**Issue:** Placeholder event handler

**Current:**
```typescript
private applyTreatmentFromEvent(
  _entityId: string,
  _treatmentId: string,
  _treatmentType: string
): void {
  // For now this is a placeholder - actual treatment is done via applyTreatment()
}
```

**Fix:**
```typescript
private applyTreatmentFromEvent(
  entityId: string,
  treatmentId: string,
  _treatmentType: string
): void {
  const plants = this.world?.query().with(CT.Plant).executeEntities();
  const entity = plants?.find(e => e.id === entityId);
  if (!entity) return;

  const plant = (entity as EntityImpl).getComponent<PlantComponent>(CT.Plant);
  if (!plant) return;

  this.applyTreatment(plant, entityId, treatmentId);
}
```

---

## Code Quality Assessment

### ✅ Strengths

1. **Comprehensive implementation**: All four systems are fully functional
2. **No silent fallbacks**: Systems throw errors on invalid data (per CLAUDE.md)
3. **Event-driven**: Proper event emission for all state changes
4. **Well-documented**: Excellent JSDoc comments and README
5. **Type-safe**: Full TypeScript with proper interfaces
6. **Performance-aware**: Uses caching, batching, and simulation culling

### ⚠️ Concerns

1. **Package duplication**: Same code in two locations
2. **Unused package**: Botany package never imported
3. **Hardcoded fallbacks**: Biome detection, time calculation
4. **Placeholder methods**: Event handler not fully wired

---

## Recommendations

### Immediate Actions

1. **Decide on package structure** (Option A or B above) - **CRITICAL**
2. **Delete backup files** - Low effort cleanup
3. **Update README** if deleting botany package

### Future Improvements

1. **Integrate biome system** - Wire up actual terrain queries
2. **Fix time system queries** - Use game time consistently
3. **Complete event handlers** - Wire up all event subscriptions
4. **Add integration tests** - Test plant-biome-time interactions

---

## Test Coverage

**Existing tests** (all in `packages/core/src/__tests__/`):
- ✅ `PlantSystem.test.ts` - Comprehensive lifecycle tests
- ✅ `PlantSeedProduction.test.ts` - Seed creation and dispersal
- ✅ `FarmingCycle.integration.test.ts` - Plant-agent interactions
- ✅ `FarmingComplete.integration.test.ts` - End-to-end farming
- ✅ `SeedDispersal.integration.test.ts` - Natural reproduction

**Missing tests:**
- ❌ Disease system integration tests
- ❌ Wild population system tests
- ❌ Plant discovery system tests
- ❌ Biome-based spawning tests

---

## Conclusion

**Update 2026-01-11:** The `@ai-village/botany` package extraction is **IN PROGRESS**.

The demo application now imports plant systems from `@ai-village/botany` instead of `@ai-village/core`. The StateMutatorSystem integration has been ported, and the package is no longer stale.

**Current status:**
- ✅ Main demo uses botany systems
- ✅ Headless demo uses botany systems
- ⏳ Core plant systems deprecated (will be removed after full migration)
- ⏳ Other scripts still use deprecated core versions

**Remaining work:**
1. Update scripts/headless-game.ts to use botany (uses manual system registration)
2. Update packages/shared-worker to use botany
3. Update packages/city-simulator to use botany
4. Delete deprecated plant systems from core
5. Move plant tests to botany package

Once complete, this package will be the **single source of truth** for plant systems, achieving the package extraction goal.
