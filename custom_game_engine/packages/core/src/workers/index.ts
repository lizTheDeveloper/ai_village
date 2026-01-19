/**
 * Worker thread infrastructure for parallel processing
 */

export { WorkerPool } from './WorkerPool.js';
export type {
  WorkerTask,
  WorkerMessage,
  WorkerResponse,
  WorkerPoolStats,
} from './WorkerPool.js';

export {
  processBatch,
  processBatchAuto,
  processBatchWithProgress,
  processBatchRateLimited,
  mapParallel,
  filterParallel,
} from './BatchProcessor.js';

// Tier 4: SharedArrayBuffer support (zero-copy worker communication)
export {
  SharedMemoryManager,
  isSharedArrayBufferSupported,
  logSharedArrayBufferSupport,
} from './SharedMemory.js';
export type { SharedMemoryRegion } from './SharedMemory.js';

export {
  signalReady,
  signalReadyAll,
  waitForReady,
  isReady,
  resetReady,
  acquireLock,
  tryAcquireLock,
  releaseLock,
  isLocked,
  withLock,
  atomicIncrement,
  atomicDecrement,
  atomicCompareExchange,
  SYNC_FLAG,
} from './AtomicSync.js';
