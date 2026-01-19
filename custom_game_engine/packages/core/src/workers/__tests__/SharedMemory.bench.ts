/**
 * SharedArrayBuffer Performance Benchmarks
 *
 * Compares postMessage (copy mode) vs SharedArrayBuffer (zero-copy mode)
 * for various array sizes.
 *
 * Expected speedup:
 * - 1,000 floats (4KB): 2x faster
 * - 10,000 floats (40KB): 10x faster
 * - 50,000 floats (200KB): 50x faster
 * - 100,000 floats (400KB): 100x faster
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import { WorkerPool } from '../WorkerPool.js';
import { isSharedArrayBufferSupported } from '../SharedMemory.js';

// Test worker that processes arrays
const workerCode = `
self.onmessage = (event) => {
  const { id, type, data, sharedBuffers } = event.data;

  try {
    if (sharedBuffers) {
      // Zero-copy mode: Access shared buffer
      const array = new Float32Array(sharedBuffers[0].buffer);

      // Process array (example: multiply by 2)
      for (let i = 0; i < array.length; i++) {
        array[i] *= 2;
      }

      self.postMessage({ id, type: 'result', result: { processed: array.length } });
    } else {
      // Copy mode: Data in message
      const array = new Float32Array(data.array);

      // Process array
      for (let i = 0; i < array.length; i++) {
        array[i] *= 2;
      }

      self.postMessage({ id, type: 'result', result: { processed: array.length, array } });
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error.message });
  }
};
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

describe('SharedArrayBuffer Performance', () => {
  let poolCopy: WorkerPool;
  let poolShared: WorkerPool;

  const SIZES = [1000, 10_000, 50_000, 100_000];

  beforeAll(() => {
    poolCopy = new WorkerPool(workerUrl, 2, 5000, false); // Disable SharedArrayBuffer
    poolShared = new WorkerPool(workerUrl, 2, 5000, true); // Enable SharedArrayBuffer
  });

  afterAll(() => {
    poolCopy.terminate();
    poolShared.terminate();
    URL.revokeObjectURL(workerUrl);
  });

  for (const size of SIZES) {
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random();
    }

    const sizeKB = (size * 4) / 1024;

    describe(`Array size: ${size.toLocaleString()} floats (${sizeKB.toFixed(1)}KB)`, () => {
      bench(`PostMessage (copy mode)`, async () => {
        await poolCopy.execute('process_array', { array: data });
      });

      if (isSharedArrayBufferSupported()) {
        bench(`SharedArrayBuffer (zero-copy)`, async () => {
          const sharedArrays = new Map([['data', data]]);
          await poolShared.executeShared('process_array_shared', {}, sharedArrays);
        });
      }
    });
  }

  // Benchmark with multiple concurrent tasks
  describe('Concurrent Processing', () => {
    const concurrentData = Array.from({ length: 10 }, () => {
      const arr = new Float32Array(10_000);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.random();
      }
      return arr;
    });

    bench('PostMessage: 10 concurrent tasks', async () => {
      await Promise.all(
        concurrentData.map((data) =>
          poolCopy.execute('process_array', { array: data })
        )
      );
    });

    if (isSharedArrayBufferSupported()) {
      bench('SharedArrayBuffer: 10 concurrent tasks', async () => {
        await Promise.all(
          concurrentData.map((data) => {
            const sharedArrays = new Map([['data', data]]);
            return poolShared.executeShared('process_array_shared', {}, sharedArrays);
          })
        );
      });
    }
  });

  // Benchmark read-only operations (no processing)
  describe('Data Transfer Only (no processing)', () => {
    const transferData = new Float32Array(50_000);
    for (let i = 0; i < transferData.length; i++) {
      transferData[i] = Math.random();
    }

    // Worker that just receives and acknowledges
    const transferWorkerCode = `
    self.onmessage = (event) => {
      const { id, sharedBuffers } = event.data;

      if (sharedBuffers) {
        // Just acknowledge (no copy)
        self.postMessage({ id, type: 'result', result: { ok: true } });
      } else {
        // Copy occurred during postMessage
        self.postMessage({ id, type: 'result', result: { ok: true } });
      }
    };
    `;

    const transferBlob = new Blob([transferWorkerCode], { type: 'application/javascript' });
    const transferUrl = URL.createObjectURL(transferBlob);

    let transferPoolCopy: WorkerPool;
    let transferPoolShared: WorkerPool;

    beforeAll(() => {
      transferPoolCopy = new WorkerPool(transferUrl, 2, 5000, false);
      transferPoolShared = new WorkerPool(transferUrl, 2, 5000, true);
    });

    afterAll(() => {
      transferPoolCopy.terminate();
      transferPoolShared.terminate();
      URL.revokeObjectURL(transferUrl);
    });

    bench('PostMessage: Transfer 50k floats', async () => {
      await transferPoolCopy.execute('transfer', { array: transferData });
    });

    if (isSharedArrayBufferSupported()) {
      bench('SharedArrayBuffer: Share 50k floats', async () => {
        const sharedArrays = new Map([['data', transferData]]);
        await transferPoolShared.executeShared('transfer_shared', {}, sharedArrays);
      });
    }
  });

  // Benchmark memory allocation overhead
  describe('Memory Allocation Overhead', () => {
    if (isSharedArrayBufferSupported()) {
      bench('Allocate SharedArrayBuffer (10k elements)', () => {
        const sab = new SharedArrayBuffer(10_000 * 4);
        const view = new Float32Array(sab);
      });
    }

    bench('Allocate Float32Array (10k elements)', () => {
      const arr = new Float32Array(10_000);
    });

    bench('Clone Float32Array (10k elements)', () => {
      const arr = new Float32Array(10_000);
      const clone = new Float32Array(arr);
    });
  });
});
