# Web Worker Infrastructure

Parallel processing infrastructure for CPU-intensive tasks on multi-core systems.

## Overview

This module provides:
- **WorkerPool** - Generic worker pool manager
- **BatchProcessor** - Utilities for parallel batch processing
- **WorkerMonitorSystem** - Real-time worker pool health monitoring

## Quick Start

### Basic Usage

```typescript
import { WorkerPool } from '@ai-village/core';

// Create worker pool
const pool = new WorkerPool(
  new URL('./my-worker.ts', import.meta.url),
  4,     // Pool size (defaults to CPU cores)
  5000   // Timeout in ms
);

// Execute task
const result = await pool.execute('task_type', { data: 123 });

// Get statistics
const stats = pool.getStats();
console.log(stats); // { total: 4, active: 1, available: 3, ... }

// Clean up
pool.terminate();
```

### Worker Implementation

```typescript
// my-worker.ts
self.onmessage = (event) => {
  const { id, type, data } = event.data;

  try {
    let result;

    switch (type) {
      case 'task_type':
        result = expensiveCalculation(data);
        break;
    }

    self.postMessage({ id, type: 'result', result });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error.message });
  }
};
```

## Batch Processing

### Process Array in Parallel

```typescript
import { processBatch } from '@ai-village/core';

const items = [1, 2, 3, ..., 1000];

// Manual batch size
const results = await processBatch(
  items,
  workerPool,
  'process_item',
  100 // Batch size
);

// Auto-calculate batch size
const results = await processBatchAuto(items, workerPool, 'process_item');
```

### Progress Tracking

```typescript
import { processBatchWithProgress } from '@ai-village/core';

const results = await processBatchWithProgress(
  items,
  workerPool,
  'process_item',
  (completed, total) => {
    console.log(`Progress: ${(completed/total*100).toFixed(1)}%`);
  }
);
```

### Parallel Map/Filter

```typescript
import { mapParallel, filterParallel } from '@ai-village/core';

// Parallel Array.map()
const doubled = await mapParallel(numbers, workerPool, 'double');

// Parallel Array.filter()
const evens = await filterParallel(numbers, workerPool, 'is_even');
```

## Monitoring

### WorkerMonitorSystem

Automatically logs worker pool statistics every 5 minutes:

```typescript
// In registerAllSystems():
systems.push(new WorkerMonitorSystem());

// Logs:
// [WorkerMonitor] Worker Pool Statistics:
//   ChunkGeneration: { total: 2, active: 1, queued: 0, completed: 45, failed: 0 }
```

### Manual Monitoring

```typescript
const stats = pool.getStats();

if (stats.queued > 10) {
  console.warn('Queue growing - workers overloaded');
}

if (stats.failed > stats.completed * 0.1) {
  console.warn('High failure rate');
}
```

## Performance

### Expected Speedup

| Workload | Speedup (4 cores) |
|----------|-------------------|
| 1 task   | 0.8x (overhead)   |
| 4 tasks  | 2-3x              |
| 10 tasks | 3-4x              |
| 20+ tasks| 3.5-4x            |

### When to Use Workers

**Good Candidates:**
- ✅ Chunk/terrain generation (CPU-heavy, pure math)
- ✅ Batch pathfinding (independent calculations)
- ✅ Perlin noise generation (pure math)
- ✅ Distance calculations (vectorizable)

**Bad Candidates:**
- ❌ Entity creation (needs World access)
- ❌ Component updates (needs shared state)
- ❌ DOM manipulation
- ❌ Small/fast operations (<5ms)

## Best Practices

### Thread Safety

**Worker Thread (Safe):**
- Pure functions
- Math operations
- Data transformations
- No shared state
- No World access

**Main Thread (Required):**
- World.createEntity()
- Component mutations
- Event emission
- DOM manipulation

### Error Handling

```typescript
try {
  const result = await pool.execute('task', data);
  return result;
} catch (error) {
  if (error.message.includes('timeout')) {
    // Fallback to sync version
    return syncFallback(data);
  }
  throw error;
}
```

### Always Provide Fallback

```typescript
// GOOD: Works with or without workers
if (this.workerPool) {
  result = await this.workerPool.execute('task', data);
} else {
  result = this.syncVersion(data);
}

// BAD: Breaks if workers unavailable
result = await this.workerPool.execute('task', data);
```

## Browser Compatibility

**Supported:**
- Chrome 80+
- Firefox 76+
- Safari 14+
- Edge 80+

**Detection:**

```typescript
const supportsWorkers = typeof Worker !== 'undefined';

if (supportsWorkers) {
  this.workerPool = new WorkerPool(...);
} else {
  console.warn('Workers not supported - using single-threaded fallback');
}
```

## Existing Worker Implementations

### ChunkGenerationWorkerPool

Chunk terrain generation using workers:

```typescript
import { ChunkGenerationWorkerPool } from '@ai-village/world';

const pool = new ChunkGenerationWorkerPool(
  2,              // Workers
  'world-seed',   // Seed
  planetConfig    // Optional planet config
);

const tiles = await pool.generateChunk(chunkX, chunkY);
```

See `packages/world/src/workers/` for implementation.

## API Reference

### WorkerPool

```typescript
class WorkerPool {
  constructor(
    workerUrl: string | URL,
    poolSize?: number,      // Default: CPU cores
    timeout?: number        // Default: 5000ms
  );

  execute<T, R>(
    type: string,
    data: T,
    customTimeout?: number
  ): Promise<R>;

  getStats(): WorkerPoolStats;
  isIdle(): boolean;
  waitForIdle(timeout?: number): Promise<void>;
  terminate(): void;
}
```

### WorkerPoolStats

```typescript
interface WorkerPoolStats {
  total: number;       // Total workers in pool
  available: number;   // Workers available
  active: number;      // Workers processing tasks
  queued: number;      // Tasks waiting
  completed: number;   // Tasks completed
  failed: number;      // Tasks failed
}
```

### Batch Processing

```typescript
function processBatch<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string,
  batchSize?: number
): Promise<R[]>;

function processBatchAuto<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<R[]>;

function processBatchWithProgress<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string,
  onProgress: (completed: number, total: number) => void,
  batchSize?: number
): Promise<R[]>;

function mapParallel<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<R[]>;

function filterParallel<T>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<T[]>;
```

## Troubleshooting

### Workers Not Loading

**Symptom:** "Failed to load worker" error

**Fix:**
1. Check `vite.config.ts` has `worker: { format: 'es' }`
2. Verify worker URL uses `import.meta.url`
3. Check worker file exists

### Worker Timeout

**Symptom:** "Task timeout" errors

**Fix:**
1. Increase timeout: `new WorkerPool(url, 4, 10000)`
2. Check worker console errors
3. Profile worker code
4. Break into smaller tasks

### Memory Leaks

**Fix:**
```typescript
protected onDestroy() {
  this.workerPool?.terminate(); // Terminate workers when system destroyed
}
```

## See Also

- **[WORKER-THREADS-01-18.md](../../../../devlogs/WORKER-THREADS-01-18.md)** - Implementation details
- **[WORKER_IMPLEMENTATION.md](../../../../WORKER_IMPLEMENTATION.md)** - Chunk generation worker docs
- **[WICKED-FAST-OPPORTUNITIES-01-18.md](../../../../devlogs/WICKED-FAST-OPPORTUNITIES-01-18.md)** - Performance optimization roadmap
