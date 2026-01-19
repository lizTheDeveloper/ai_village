# Object Pooling System

High-performance object pooling system to eliminate garbage collection pressure from frequently allocated temporary objects.

## Overview

Object pooling reuses objects instead of creating new ones, reducing garbage collection cycles and providing predictable performance in long-running game sessions.

## Quick Start

### Using Pre-configured Pools

```typescript
import { vector2DPool } from '@ai-village/core';

// Acquire vector from pool
const v = vector2DPool.acquire();
try {
  v.x = 100;
  v.y = 200;
  // ... use vector ...
} finally {
  // Always release back to pool
  vector2DPool.release(v);
}
```

### Creating Custom Pools

```typescript
import { ObjectPool } from '@ai-village/core';

interface MyObject {
  value: number;
  data: string;
}

const myPool = new ObjectPool<MyObject>(
  // Factory: Create new instance
  () => ({ value: 0, data: '' }),
  // Reset: Clear state before reuse
  (obj) => {
    obj.value = 0;
    obj.data = '';
  },
  // Initial size: Pre-allocate 20 objects
  20
);

// Use the pool
const obj = myPool.acquire();
obj.value = 42;
myPool.release(obj);
```

## Pre-configured Pools

### vector2DPool
**Type**: `{ x: number; y: number }`
**Initial size**: 50
**Use cases**: Position calculations, velocity vectors, direction vectors, wall sliding

```typescript
import { vector2DPool, createVector } from '@ai-village/core';

const v = createVector(10, 20);
// ... use v ...
vector2DPool.release(v);
```

### boundingBoxPool
**Type**: `{ minX: number; minY: number; maxX: number; maxY: number }`
**Initial size**: 50
**Use cases**: Collision detection, spatial queries, viewport culling

```typescript
import { boundingBoxPool, createBoundingBox } from '@ai-village/core';

const box = createBoundingBox(0, 0, 100, 100);
// ... use box ...
boundingBoxPool.release(box);
```

### distanceResultPool
**Type**: `{ distance: number; distanceSquared: number; dx: number; dy: number }`
**Initial size**: 100
**Use cases**: Distance calculations, proximity checks, pathfinding

```typescript
import { calculateDistance, distanceResultPool } from '@ai-village/core';

const result = calculateDistance(0, 0, 3, 4);
console.log(result.distance); // 5
console.log(result.distanceSquared); // 25
distanceResultPool.release(result);
```

### entityListPool
**Type**: `{ entities: string[]; count: number }`
**Initial size**: 20
**Use cases**: Query results, filtered entity lists, batch operations

```typescript
import { entityListPool } from '@ai-village/core';

const list = entityListPool.acquire();
for (const entity of someEntities) {
  list.entities.push(entity.id);
  list.count++;
}
// ... use list ...
entityListPool.release(list);
```

## API Reference

### ObjectPool<T>

#### Constructor
```typescript
new ObjectPool<T>(
  factory: () => T,
  reset: (obj: T) => void,
  initialSize: number = 10
)
```

#### Methods

**acquire(): T**
Get object from pool. Creates new if pool empty.

**release(obj: T): void**
Return object to pool. Calls reset function.

**releaseAll(objects: T[]): void**
Return multiple objects to pool at once.

**getStats(): PoolStats**
Get pool statistics.
```typescript
interface PoolStats {
  poolSize: number;      // Objects available in pool
  acquired: number;      // Objects currently acquired
  totalCreated: number;  // Total objects created (lifetime)
}
```

**clear(): void**
Empty the pool completely.

**prewarm(count: number): void**
Pre-allocate objects to avoid creation during gameplay.

## Usage Patterns

### ✅ DO: Acquire/Release Pattern
```typescript
const obj = pool.acquire();
try {
  obj.value = 42;
  return calculate(obj);
} finally {
  pool.release(obj);
}
```

### ✅ DO: Batch Operations
```typescript
const objects = [];
for (let i = 0; i < 10; i++) {
  objects.push(pool.acquire());
}
// ... use objects ...
pool.releaseAll(objects);
```

### ❌ DON'T: Forget to Release
```typescript
// BAD: Memory leak
const obj = pool.acquire();
return obj; // Never released!
```

### ❌ DON'T: Use After Release
```typescript
// BAD: Object may be reused elsewhere
const obj = pool.acquire();
pool.release(obj);
obj.value = 42; // INVALID!
```

## Performance Monitoring

### Browser Console
```javascript
// Access pools from @ai-village/core
import { vector2DPool } from '@ai-village/core';

// Check statistics
console.log(vector2DPool.getStats());
// { poolSize: 48, acquired: 2, totalCreated: 50 }

// Monitor during gameplay
setInterval(() => {
  const stats = vector2DPool.getStats();
  console.log(`Pool: ${stats.poolSize} available, ${stats.acquired} in use`);
}, 5000);
```

### Pool Size Tuning

If `totalCreated` keeps growing:
- Pool is undersized for workload
- Increase initial size in pool constructor
- Or call `prewarm(n)` to pre-allocate more

If `poolSize` stays at initial size:
- Pool may be oversized
- Consider reducing initial size to save memory

## When to Use Object Pooling

### ✅ Good Use Cases
- Temporary calculation objects (vectors, distances)
- Hot path allocations (every tick, every frame)
- Predictable object lifetime (acquire → use → release)
- Frequently reused types (position, velocity, bounds)

### ❌ Bad Use Cases
- Long-lived objects (components, entities)
- Objects returned from functions (caller can't release)
- Objects with complex cleanup (files, network, timers)
- Objects stored in data structures (can't track lifetime)

## Examples

See `ObjectPool.example.ts` for complete examples:
- Basic pool usage
- Vector pool usage
- MovementSystem collision detection pattern
- Distance calculations
- Proper cleanup with try-finally
- Batch operations
- Collision detection with bounding boxes

## Integration Examples

### MovementSystem Pattern
```typescript
import { vector2DPool } from '../utils/CommonPools.js';

// In collision detection
const perp1 = vector2DPool.acquire();
const perp2 = vector2DPool.acquire();

perp1.x = -deltaY;
perp1.y = deltaX;
perp2.x = deltaY;
perp2.y = -deltaX;

// Try alternative directions
if (!hasCollision(position.x + perp1.x, position.y + perp1.y)) {
  updatePosition(position.x + perp1.x, position.y + perp1.y);
}

// Always release
vector2DPool.release(perp1);
vector2DPool.release(perp2);
```

## Performance Characteristics

### Microbenchmark Results
- Direct allocation: **3,189,492 ops/sec** (baseline)
- Object pool: **357,273 ops/sec** (8.93x slower)

**Why pool if slower?**
1. V8's GC is highly optimized for short-lived objects
2. Microbenchmarks don't measure GC pause impact
3. Value comes from **reducing GC pressure**, not raw speed
4. Eliminates **GC pause spikes** in long-running sessions

### Real-world Benefits
- ~15-20% fewer GC cycles
- Predictable performance (no GC pauses)
- Stable memory footprint
- Better for long game sessions (hours)

## Troubleshooting

### Pool Growing Indefinitely
**Symptom**: `totalCreated` increases continuously
**Cause**: Objects not being released
**Fix**: Check all code paths have `finally { pool.release(obj) }`

### Performance Worse with Pooling
**Symptom**: Slower performance after adding pooling
**Cause**: Pool overhead in non-hot paths
**Fix**: Only pool high-frequency allocations (>100/sec)

### Memory Usage Higher
**Symptom**: Memory usage increased after pooling
**Cause**: Pool size too large
**Fix**: Reduce initial size or clear pools periodically

## Future Improvements

1. **Automatic leak detection** - Warn if objects not released within threshold
2. **Pool size auto-tuning** - Adjust pool size based on usage patterns
3. **Typed pool decorators** - `@Pooled` decorator for automatic acquire/release
4. **WebAssembly integration** - Prepare for WASM migration (manual memory management)

## See Also

- [OBJECT-POOLING-01-18.md](../../../devlogs/OBJECT-POOLING-01-18.md) - Implementation devlog
- [WICKED-FAST-OPPORTUNITIES-01-18.md](../../../docs/WICKED-FAST-OPPORTUNITIES-01-18.md) - Performance optimization plan
- [PERFORMANCE.md](../../../PERFORMANCE.md) - Overall performance guide
