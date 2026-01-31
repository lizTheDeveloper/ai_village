# Performance Acceleration Guide

This guide documents all the performance optimization patterns available in the engine,
organized by their expected impact and implementation complexity.

## Quick Reference

| Optimization | Impact | Complexity | Auto-Enabled |
|--------------|--------|------------|--------------|
| SimulationScheduler (entity culling) | 97% entity reduction | Low | ✅ Yes |
| System Throttling | 50-90% fewer updates | Low | ✅ Yes |
| Stagger Offsets | Eliminates tick spikes | Low | ⚠️ Partial |
| Incremental Spatial Grid | 95% fewer grid updates | Medium | ✅ Yes |
| Query Caching | 60-80% fewer queries | Low | ✅ Yes |
| Movement Intention | 90% fewer brain updates | Medium | ❌ Manual |
| Chunk State Management | 95% fewer chunks processed | Medium | ❌ Manual |
| Entity Demotion | 10x memory reduction | High | ❌ Manual |
| WASM SIMD | 2-4x for math-heavy ops | High | ⚠️ Optional |
| Web Workers | 2-4x for CPU-heavy ops | High | ⚠️ Optional |

## Tier 1: Automatic Optimizations (Already Active)

### 1.1 SimulationScheduler

**Location:** `ecs/SimulationScheduler.ts`

Dwarf Fortress-style entity culling that reduces processed entities by 97%:

```typescript
// In your system, use FilteredSystem or call manually:
const activeEntities = world.simulationScheduler.filterActiveEntities(entities, tick);
```

Three modes:
- **ALWAYS**: Agents, buildings (~20 entities)
- **PROXIMITY**: Plants, animals when on-screen (~100 entities)
- **PASSIVE**: Resources, items (0 per-tick cost)

### 1.2 System Throttling

**Location:** `ecs/SystemHelpers.ts`, `ecs/SystemThrottleConfig.ts`

Systems don't need to run every tick:

```typescript
import { THROTTLE } from './SystemThrottleConfig.js';

class MySystem extends BaseSystem {
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds
}
```

### 1.3 Stagger Offsets (NEW)

**Location:** `ecs/SystemThrottleConfig.ts`

Spread heavy systems across different ticks to avoid "tick spikes":

```typescript
import { THROTTLE, STAGGER } from './SystemThrottleConfig.js';

class WeatherSystem extends BaseSystem {
  protected readonly throttleInterval = THROTTLE.SLOW;
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_A; // tick 0, 100, 200...
}

class MetricsSystem extends BaseSystem {
  protected readonly throttleInterval = THROTTLE.SLOW;
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_B; // tick 25, 125, 225...
}
```

### 1.4 Incremental Spatial Grid (NEW)

**Location:** `ecs/SimulationScheduler.ts`

The spatial grid now uses incremental updates instead of full rebuilds:

- First tick: Full build (O(n) - happens once)
- Subsequent ticks: Only update moved entities (O(changed))

This is automatic but requires DirtyTracker integration for position changes.

### 1.5 Query Caching

**Location:** `loop/GameLoop.ts`

Entity queries are cached per tick and only invalidated when archetypes change.

## Tier 2: Semi-Automatic Optimizations

### 2.1 requiredComponents Optimization

**Best Practice:** Always specify ALL components you filter for:

```typescript
// BAD: Iterates all positioned entities
class BadSystem {
  requiredComponents = ['position'];
  update(world, entities) {
    for (const e of entities) {
      if (!e.hasComponent('agent')) continue; // Filtering inside loop!
    }
  }
}

// GOOD: Only iterates agents with positions
class GoodSystem {
  requiredComponents = ['position', 'agent'];
  update(world, entities) {
    for (const e of entities) {
      // Already filtered!
    }
  }
}
```

### 2.2 activationComponents

**Best Practice:** Add activationComponents for O(1) system skip:

```typescript
class MySystem extends BaseSystem {
  requiredComponents = ['my_special_component'];
  activationComponents = ['my_special_component']; // O(1) check if component exists

  // System is skipped entirely if no entities have my_special_component
}
```

## Tier 3: Manual Optimizations

### 3.1 Movement Intention System (NEW)

**Location:** `components/MovementIntentionComponent.ts`, `systems/MovementIntentionSystem.ts`

Store movement INTENTION instead of updating position every tick:

```typescript
import { createMovementIntention, interpolatePosition } from '@ai-village/core';

// When agent decides to move:
const intention = createMovementIntention(
  destX, destY, currentTick, speed, currentX, currentY
);
world.addComponent(entityId, 'movement_intention', intention);

// Renderer can interpolate smooth movement:
const pos = interpolatePosition(intention, renderTick, startX, startY);
```

Benefits:
- Brain only runs every 0.5s, but movement looks smooth
- 90% fewer position updates

### 3.2 Chunk State Management (NEW)

**Location:** `ecs/ChunkStateManager.ts`

Minecraft-style lazy chunk loading:

```typescript
import { ChunkStateManager, ChunkState } from '@ai-village/core';

const chunkManager = new ChunkStateManager({
  chunkSize: 16,
  activeRadius: 2,   // Full simulation
  lazyRadius: 4,     // Reduced simulation
});

// Update each tick:
chunkManager.updateChunkStates(agentPositions, currentTick);

// Check if entity should simulate:
if (chunkManager.shouldSimulateEntity(entityId, currentTick)) {
  // Process entity
}
```

### 3.3 Entity Demotion (NEW)

**Location:** `ecs/EntityDemotion.ts`

Convert passive objects from full entities to lightweight data:

```typescript
import { resourceDataStore, ResourceRecord } from '@ai-village/core';

// Instead of creating a Resource entity:
const record: ResourceRecord = {
  id: generateId(),
  resourceType: 'wood',
  x: 100, y: 50,
  amount: 10,
  createdTick: currentTick,
};

resourceDataStore.add(record);

// Query resources near an agent:
const nearby = resourceDataStore.queryRadius(agentX, agentY, 50, 'wood');
```

Benefits:
- ~500 bytes/entity → ~40 bytes/record
- O(1) spatial lookup instead of ECS query overhead

## Tier 4: Hardware Acceleration

### 4.1 WASM SIMD

**Location:** `wasm/SIMDOpsWASM.ts`

Use WASM SIMD for math-heavy operations (2-4x speedup for large arrays):

```typescript
import { SIMDOpsWASM, checkWASMSIMDSupport } from '@ai-village/core';

if (checkWASMSIMDSupport()) {
  const simd = new SIMDOpsWASM();
  await simd.initialize();

  // 2-4x faster for arrays > 1000 elements
  simd.addArrays(result, a, b, length);
}
```

When to use:
- ✅ Arrays > 1,000 elements
- ✅ Pure math operations
- ❌ Small operations (overhead dominates)

### 4.2 Web Workers

**Location:** `workers/WorkerPool.ts`, `workers/BatchProcessor.ts`

Use Web Workers for CPU-heavy tasks:

```typescript
import { WorkerPool, processBatch } from '@ai-village/core';

const pool = new WorkerPool(
  new URL('./my-worker.ts', import.meta.url),
  navigator.hardwareConcurrency,
  5000
);

// Process array in parallel
const results = await processBatch(items, pool, 'process_item', 100);
```

When to use:
- ✅ Chunk generation
- ✅ Pathfinding batches
- ✅ Perlin noise
- ❌ Entity manipulation (needs World access)
- ❌ Small operations (<5ms)

### 4.3 Parallel System Analysis (NEW)

**Location:** `ecs/ParallelSystemAnalyzer.ts`

Identify which systems can potentially run in parallel:

```typescript
import { ParallelSystemAnalyzer } from '@ai-village/core';

const analyzer = new ParallelSystemAnalyzer(allSystems);
const groups = analyzer.getParallelGroups();
console.log(analyzer.generateReport());
```

## Performance Debugging

### Enable Profiling

```typescript
gameLoop.enableProfiling();

// After running for a while:
const report = gameLoop.getProfilingReport();
console.log(gameLoop.exportProfilingMarkdown());
```

### System Validation

```typescript
import { SystemValidator } from '@ai-village/core';

if (import.meta.env.DEV) {
  const result = SystemValidator.validate(mySystem);
  SystemValidator.log(result);
}
```

### Tick Breakdown

When ticks are slow, console shows breakdown:
```
Tick 1234 took 85ms | sys:60 act:10 flush:5 time:10 | top3: AgentBrain:25, Movement:15, Memory:10
```

## Checklist for New Systems

1. [ ] Set appropriate `throttleInterval` (see THROTTLE constants)
2. [ ] Add `throttleOffset` if interval >= 50 ticks
3. [ ] Set `requiredComponents` to match ALL components you filter
4. [ ] Add `activationComponents` for O(1) early-exit
5. [ ] Use `ctx.activeEntities` (pre-filtered by SimulationScheduler)
6. [ ] Cache queries - don't call `world.query()` in loops
7. [ ] Use squared distance - avoid `Math.sqrt` in hot paths
8. [ ] Consider entity demotion for passive objects
