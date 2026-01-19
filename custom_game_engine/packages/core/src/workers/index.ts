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
