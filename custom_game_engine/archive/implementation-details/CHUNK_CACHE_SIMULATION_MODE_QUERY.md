# ChunkCache Simulation Mode Query Implementation

## Summary

Implemented the TODO at line 312 in `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/chunks/ChunkCache.ts` to query actual simulation modes from SimulationScheduler instead of using component-based assumptions.

## Changes Made

### 1. ChunkCache.ts - `recalculateChunkStats` Function

**Location**: `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/chunks/ChunkCache.ts:253-359`

**Implementation**:
- Updated the `world` parameter type to include `simulationScheduler` interface
- Added logic to query actual simulation modes using `world.simulationScheduler.isAlwaysActive(entity)`
- Implemented fallback heuristics for backward compatibility when SimulationScheduler is not available
- The function now accurately counts entities by their actual simulation mode (ALWAYS, PROXIMITY, PASSIVE)

**Key Features**:
1. **SimulationScheduler Integration**: When available, uses `isAlwaysActive()` to determine if an entity is ALWAYS mode
2. **Backward Compatibility**: Falls back to component-based heuristics when SimulationScheduler is not provided
3. **Accurate Mode Counting**: Properly handles edge cases like tamed animals (ALWAYS mode despite having 'animal' component)

### 2. Fixed Pre-existing Issues

While implementing and testing, fixed two blocking issues:

#### ComponentType.ts - Duplicate Declarations
**Location**: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/types/ComponentType.ts:264-265`
- Removed duplicate `Governor` and `PoliticalEntity` enum declarations
- These were declared twice (lines 74-75 and 264-265)

#### components/index.ts - Duplicate Exports
**Location**: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/index.ts:886-899`
- Added proper aliases for GovernorComponent exports to avoid conflicts with FactoryAIComponent
- Example: `recordDecision` → `recordGovernorDecision`, `updateApproval` → `updateGovernorApproval`

### 3. Test Suite

**Location**: `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/chunks/__tests__/ChunkCache.test.ts`

Created comprehensive test suite with 4 test cases:

1. **SimulationScheduler Query Test**: Verifies accurate simulation mode counting when SimulationScheduler is available
2. **Fallback Heuristics Test**: Ensures backward compatibility without SimulationScheduler
3. **No World Parameter Test**: Tests the optional world parameter (for backward compatibility)
4. **Essential Entities Test**: Validates special cases like tamed animals being promoted to ALWAYS mode

**Test Results**: All 4 tests pass ✓

## Technical Details

### SimulationScheduler Integration

The implementation queries `world.simulationScheduler.isAlwaysActive(entity)` for each entity in the chunk cache. This method:
- Returns `true` for ALWAYS entities (agents, buildings, tame animals, quest items)
- Returns `false` for PROXIMITY entities (wild animals, plants)
- Handles edge cases like tamed animals, active conversations, companions

### Type Safety

The world parameter type is carefully designed to be compatible with both:
- Full `World` interface (from core/ecs/World.ts)
- Minimal interface for testing (just `getEntity` and optional `simulationScheduler`)

```typescript
world?: {
  getEntity(id: string): { id: string; components: Map<string, unknown> } | undefined;
  simulationScheduler?: {
    isAlwaysActive?(entity: { id: string; components: Map<string, unknown> }): boolean;
  };
}
```

### Performance Considerations

The simulation mode query adds minimal overhead:
- Only runs when chunk cache is dirty (not every tick)
- Already iterating entities to count building types
- SimulationScheduler lookup is O(1) per entity (checks component types)

## Verification

- ✅ Tests pass: 4/4 tests in ChunkCache.test.ts
- ✅ Build succeeds: No TypeScript errors related to ChunkCache
- ✅ Backward compatible: Works with and without SimulationScheduler
- ✅ Type safe: Proper TypeScript interfaces and type guards

## Usage Example

```typescript
import { recalculateChunkStats, ChunkCache } from '@ai-village/world';
import { World } from '@ai-village/core';

// With full World instance (includes SimulationScheduler)
recalculateChunkStats(chunkCache, world);

// Will use actual simulation modes:
// chunkCache.stats.simulationModes.always    // Accurate count from scheduler
// chunkCache.stats.simulationModes.proximity // Accurate count from scheduler

// Without World (backward compatibility)
recalculateChunkStats(chunkCache);

// Will use fallback heuristics:
// chunkCache.stats.simulationModes.always    // agents + buildings
// chunkCache.stats.simulationModes.proximity // plants + animals
```

## Related Files

- **Implementation**: `packages/world/src/chunks/ChunkCache.ts`
- **Tests**: `packages/world/src/chunks/__tests__/ChunkCache.test.ts`
- **SimulationScheduler**: `packages/core/src/ecs/SimulationScheduler.ts`
- **World Interface**: `packages/core/src/ecs/World.ts`
- **Fixed Issues**:
  - `packages/core/src/types/ComponentType.ts` (duplicate enums)
  - `packages/core/src/components/index.ts` (duplicate exports)

## Documentation References

- [SCHEDULER_GUIDE.md](./custom_game_engine/SCHEDULER_GUIDE.md) - System throttling and priorities
- [SIMULATION_SCHEDULER.md](./custom_game_engine/packages/core/src/ecs/SIMULATION_SCHEDULER.md) - Entity culling
- [ARCHITECTURE_OVERVIEW.md](./custom_game_engine/ARCHITECTURE_OVERVIEW.md) - ECS architecture
