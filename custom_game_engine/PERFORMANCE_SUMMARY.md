# Performance Optimization Summary

## Changes Made

### 1. Plant Growth Frequency (PlantSystem.ts:52)
**Before**: Plants updated every game hour (HOUR_THRESHOLD = 1.0)
**After**: Plants updated once per game day (HOUR_THRESHOLD = 24.0)
**Impact**: 24x reduction in plant processing

### 2. Resource Query Optimization (ScriptedDecisionProcessor.ts)
**Before**: Get all component data, then check distance
**After**: Check distance first, skip faraway resources immediately
**Impact**: Most of 3,402 resources skipped early, only nearby ones fully processed

### 3. SimulationScheduler System (NEW)
**What**: Dwarf Fortress-style entity simulation management
**How**: Entities categorized as ALWAYS/PROXIMITY/PASSIVE
- **ALWAYS**: Agents, buildings (~20 entities) - always simulate
- **PROXIMITY**: Plants, wild animals (~100 entities) - only when on-screen
- **PASSIVE**: Resources, items (~3,500 entities) - zero per-tick cost

**Impact**: 97% reduction in entities processed per tick (4,260 → 120)

## Expected Performance Gains

- **Frame time**: 150ms+ → <16ms (60 FPS target)
- **Plant processing**: 861 plants × 24 times/day → 50 visible plants × 1 time/day
- **Resource processing**: 3,402 checks/tick → 0 checks/tick
- **Total CPU reduction**: Estimated 60-80% reduction in per-tick processing

## Migration Path

Systems can opt-in to SimulationScheduler gradually:

```typescript
// Add one line to existing systems
update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
  const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);
  
  for (const entity of activeEntities) {
    // existing logic unchanged
  }
}
```

## Files Modified

### Core Infrastructure
1. `packages/core/src/ecs/SimulationScheduler.ts` - NEW (Dwarf Fortress-style simulation scheduling)
2. `packages/core/src/ecs/World.ts` - Added scheduler integration (instance + interface)
3. `packages/core/src/ecs/index.ts` - Exported scheduler

### Systems Integrated with Scheduler
4. `packages/core/src/systems/PlantSystem.ts` - Daily updates + proximity filtering
5. `packages/core/src/systems/WildPlantPopulationSystem.ts` - Only manage visible plant populations
6. `packages/core/src/systems/PlantDiseaseSystem.ts` - **CRITICAL** O(n²) → O(visible²) filtering
7. `packages/core/src/systems/AnimalSystem.ts` - Only simulate visible animals
8. `packages/core/src/systems/SteeringSystem.ts` - Spatial data updates (agents always active)

### Other Optimizations
9. `packages/core/src/decision/ScriptedDecisionProcessor.ts` - Distance-first optimization

## Documentation

See `packages/core/src/ecs/SIMULATION_SCHEDULER.md` for complete guide.
