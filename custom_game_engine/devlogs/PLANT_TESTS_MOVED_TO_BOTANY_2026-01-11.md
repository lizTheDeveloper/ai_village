# Plant Tests Moved to Botany Package - 2026-01-11

## Summary

Successfully moved plant-related test files from `@ai-village/core` to `@ai-village/botany` package, organizing tests alongside their implementations.

## Test Files Moved

### From `packages/core/src/__tests__/` to `packages/botany/src/__tests__/`:

1. **PlantSystem.test.ts** (780 lines)
   - 32 test cases (30 passing, 2 skipped)
   - Tests plant lifecycle, health, damage, weather effects, stage transitions, validation

2. **PlantSeedProduction.test.ts** (210 lines)
   - 3 test cases (currently failing - were already broken in core)
   - Tests seed production during plant stage transitions
   - Note: These tests need fixing but failing state is consistent with core

## Changes Made

### 1. Created Test Directory
```bash
mkdir -p packages/botany/src/__tests__/
```

### 2. Updated Package Configuration

**packages/botany/package.json:**
- Added test scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

### 3. Created Vitest Configuration

**packages/botany/vitest.config.ts:**
- Configured test environment (jsdom)
- Set up path aliases:
  - `@ai-village/core` → `../core/src`
  - `@ai-village/botany` → `./src`
- Removed dependency on root vitest.setup.ts (not needed for botany)

### 4. Updated Test Imports

Changed from relative imports to package imports:

**Before (in core):**
```typescript
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { PlantSystem } from '../systems/PlantSystem.js';
import { StateMutatorSystem } from '../systems/StateMutatorSystem.js';
import { PlantComponent } from '../components/PlantComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import type { PlantSpecies } from '../types/PlantSpecies.js';
import { ComponentType } from '../types/ComponentType.js';
```

**After (in botany):**
```typescript
import {
  WorldImpl,
  EventBusImpl,
  StateMutatorSystem,
  PlantComponent,
  createPositionComponent,
  ComponentType,
  type PlantSpecies,
} from '@ai-village/core';
import { PlantSystem } from '../systems/PlantSystem.js';
```

## Test Results

### Botany Package Tests
```
Test Files  1 failed | 1 passed (2)
Tests       3 failed | 30 passed | 2 skipped (35)
```

**PlantSystem.test.ts:**
- ✅ 32/32 tests running (30 pass, 2 skipped)
- Tests are healthy and working correctly

**PlantSeedProduction.test.ts:**
- ❌ 3/3 tests failing (same failures as in core package)
- Plant stage transitions not occurring in test environment
- These tests were already broken before migration

### Core Package Tests (Before Migration)
```
PlantSystem.test.ts:           32 tests (30 pass, 2 skipped)
PlantSeedProduction.test.ts:   3 tests (3 failing)
```

**Verification:** Tests behave identically in both packages, confirming successful migration.

## Architecture Notes

### PlantSystem Location
- **Core Package:** `packages/core/src/systems/PlantSystem.ts` (1408 lines)
  - Original implementation with relative imports
  - Still exists for backward compatibility

- **Botany Package:** `packages/botany/src/systems/PlantSystem.ts` (1422 lines)
  - Refactored implementation using `@ai-village/core` imports
  - Proper package architecture
  - This is the version being tested

### Component Location
- **PlantComponent:** Still in `@ai-village/core`
  - Core ECS component, used across multiple systems
  - Correctly imported by botany tests via `@ai-village/core`

## Next Steps

1. **Fix PlantSeedProduction tests:**
   - Investigate why stage transitions don't occur in test environment
   - May need to adjust timing or trigger mechanisms
   - Consider mocking or updating test setup

2. **Consider moving PlantComponent:**
   - Evaluate if PlantComponent should move to botany package
   - Check dependencies across other systems
   - May need to stay in core if used by non-botany systems

3. **Remove old test files from core:**
   - After verification period, delete or archive:
     - `packages/core/src/__tests__/PlantSystem.test.ts`
     - `packages/core/src/__tests__/PlantSeedProduction.test.ts`
   - Per "Conservation of Game Matter" principle, consider archiving rather than deleting

## Files Modified

### Created:
- `/packages/botany/src/__tests__/PlantSystem.test.ts`
- `/packages/botany/src/__tests__/PlantSeedProduction.test.ts`
- `/packages/botany/vitest.config.ts`

### Modified:
- `/packages/botany/package.json` - Added test scripts

### To Be Archived:
- `/packages/core/src/__tests__/PlantSystem.test.ts` (original location)
- `/packages/core/src/__tests__/PlantSeedProduction.test.ts` (original location)

## Conclusion

Plant-related tests have been successfully migrated to the botany package where they belong architecturally. The tests run with identical behavior to the core package, confirming a successful migration. The failing PlantSeedProduction tests are a pre-existing issue that needs addressing separately.
