/**
 * Tests for WorkerPool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerPool } from '../WorkerPool.js';

// Mock worker for testing
const createMockWorkerUrl = () => {
  const workerCode = `
    self.onmessage = (event) => {
      const { id, type, data } = event.data;

      try {
        let result;

        switch (type) {
          case 'echo':
            result = data;
            break;
          case 'double':
            result = data * 2;
            break;
          case 'delay':
            // Simulate async work
            setTimeout(() => {
              self.postMessage({ id, type: 'result', result: data });
            }, data.delayMs || 10);
            return;
          case 'error':
            throw new Error('Test error');
          default:
            throw new Error('Unknown task type: ' + type);
        }

        self.postMessage({ id, type: 'result', result });
      } catch (error) {
        self.postMessage({ id, type: 'error', error: error.message });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

describe('WorkerPool', () => {
  let workerPool: WorkerPool | null = null;
  let workerUrl: string;

  beforeEach(() => {
    // Skip if Workers not available (Node.js test environment)
    if (typeof Worker === 'undefined') {
      return;
    }

    workerUrl = createMockWorkerUrl();
    workerPool = new WorkerPool(workerUrl, 2, 1000);
  });

  afterEach(() => {
    if (workerPool) {
      workerPool.terminate();
      workerPool = null;
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
    }
  });

  it.skipIf(typeof Worker === 'undefined')('should create worker pool', () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const stats = workerPool.getStats();
    expect(stats.total).toBe(2);
    expect(stats.available).toBe(2);
    expect(stats.active).toBe(0);
    expect(stats.queued).toBe(0);
  });

  it.skipIf(typeof Worker === 'undefined')('should execute task', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const result = await workerPool.execute('echo', 'hello');
    expect(result).toBe('hello');
  });

  it.skipIf(typeof Worker === 'undefined')('should execute multiple tasks', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const result1 = workerPool.execute('double', 5);
    const result2 = workerPool.execute('double', 10);
    const result3 = workerPool.execute('double', 15);

    const results = await Promise.all([result1, result2, result3]);
    expect(results).toEqual([10, 20, 30]);
  });

  it.skipIf(typeof Worker === 'undefined')('should handle task errors', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    await expect(workerPool.execute('error', null)).rejects.toThrow('Test error');
  });

  it.skipIf(typeof Worker === 'undefined')('should track statistics', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const task1 = workerPool.execute('delay', { delayMs: 50 });
    const task2 = workerPool.execute('delay', { delayMs: 50 });

    // Wait a bit for tasks to be assigned
    await new Promise((resolve) => setTimeout(resolve, 10));

    const stats = workerPool.getStats();
    expect(stats.active).toBe(2); // Both workers busy
    expect(stats.available).toBe(0);

    await Promise.all([task1, task2]);

    const finalStats = workerPool.getStats();
    expect(finalStats.active).toBe(0);
    expect(finalStats.available).toBe(2);
    expect(finalStats.completed).toBe(2);
  });

  it.skipIf(typeof Worker === 'undefined')('should queue tasks when all workers busy', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const task1 = workerPool.execute('delay', { delayMs: 100 });
    const task2 = workerPool.execute('delay', { delayMs: 100 });
    const task3 = workerPool.execute('delay', { delayMs: 100 });

    // Wait a bit for tasks to be assigned
    await new Promise((resolve) => setTimeout(resolve, 10));

    const stats = workerPool.getStats();
    expect(stats.active).toBe(2); // Both workers busy
    expect(stats.queued).toBe(1); // Third task queued

    await Promise.all([task1, task2, task3]);

    const finalStats = workerPool.getStats();
    expect(finalStats.completed).toBe(3);
    expect(finalStats.queued).toBe(0);
  });

  it.skipIf(typeof Worker === 'undefined')('should timeout tasks', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const shortTimeoutPool = new WorkerPool(workerUrl, 2, 50);

    await expect(
      shortTimeoutPool.execute('delay', { delayMs: 200 })
    ).rejects.toThrow('Task timeout');

    shortTimeoutPool.terminate();
  });

  it.skipIf(typeof Worker === 'undefined')('should check if idle', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    expect(workerPool.isIdle()).toBe(true);

    const task = workerPool.execute('delay', { delayMs: 50 });

    expect(workerPool.isIdle()).toBe(false);

    await task;

    expect(workerPool.isIdle()).toBe(true);
  });

  it.skipIf(typeof Worker === 'undefined')('should wait for idle', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const task1 = workerPool.execute('delay', { delayMs: 50 });
    const task2 = workerPool.execute('delay', { delayMs: 100 });

    const idlePromise = workerPool.waitForIdle();

    await Promise.all([task1, task2]);
    await idlePromise;

    expect(workerPool.isIdle()).toBe(true);
  });

  it.skipIf(typeof Worker === 'undefined')('should terminate workers', () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    workerPool.terminate();

    const stats = workerPool.getStats();
    expect(stats.total).toBe(0);
    expect(stats.available).toBe(0);
  });

  it.skipIf(typeof Worker === 'undefined')('should reject pending tasks on termination', async () => {
    if (!workerPool) throw new Error('Worker pool not initialized');
    const task1 = workerPool.execute('delay', { delayMs: 1000 });
    const task2 = workerPool.execute('delay', { delayMs: 1000 });
    const task3 = workerPool.execute('delay', { delayMs: 1000 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    workerPool.terminate();

    await expect(task1).rejects.toThrow('Worker pool terminated');
    await expect(task2).rejects.toThrow('Worker pool terminated');
    await expect(task3).rejects.toThrow('Worker pool terminated');
  });
});
