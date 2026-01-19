/**
 * Batch Processing Utilities for Worker Pools
 *
 * Provides utilities for processing arrays of items in parallel using worker pools.
 * Automatically splits work into batches and distributes across workers.
 */

import type { WorkerPool } from './WorkerPool.js';

/**
 * Process array in parallel using worker pool.
 *
 * Splits items into batches and processes them in parallel across available workers.
 *
 * @param items - Array of items to process
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @param batchSize - Number of items per batch (default: 100)
 * @returns Promise that resolves to array of results (maintains order)
 *
 * @example
 * ```typescript
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const results = await processBatch(
 *   items,
 *   workerPool,
 *   'process_numbers',
 *   3 // Batches of 3: [1,2,3], [4,5,6], [7,8,9], [10]
 * );
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches in parallel
  const promises = batches.map((batch) =>
    workerPool.execute<T[], R[]>(taskType, batch)
  );

  const batchResults = await Promise.all(promises);

  // Flatten results (maintains order)
  for (const batchResult of batchResults) {
    results.push(...batchResult);
  }

  return results;
}

/**
 * Process array with automatic batch size calculation.
 *
 * Calculates optimal batch size based on worker pool size and item count.
 *
 * @param items - Array of items to process
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @returns Promise that resolves to array of results
 *
 * @example
 * ```typescript
 * // With 4 workers and 100 items, creates 4 batches of 25 items
 * const results = await processBatchAuto(items, workerPool, 'process_items');
 * ```
 */
export async function processBatchAuto<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<R[]> {
  const stats = workerPool.getStats();
  const workerCount = stats.total;

  // Calculate optimal batch size
  // Aim for 2-4 batches per worker for good load balancing
  const batchSize = Math.ceil(items.length / (workerCount * 3));

  return processBatch(items, workerPool, taskType, batchSize);
}

/**
 * Process array with progress callback.
 *
 * Useful for long-running operations that need progress feedback.
 *
 * @param items - Array of items to process
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @param onProgress - Callback for progress updates
 * @param batchSize - Number of items per batch (default: 100)
 * @returns Promise that resolves to array of results
 *
 * @example
 * ```typescript
 * const results = await processBatchWithProgress(
 *   items,
 *   workerPool,
 *   'process_items',
 *   (completed, total) => {
 *     console.log(`Progress: ${completed}/${total} (${(completed/total*100).toFixed(1)}%)`);
 *   }
 * );
 * ```
 */
export async function processBatchWithProgress<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string,
  onProgress: (completed: number, total: number) => void,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  let completedBatches = 0;
  const totalBatches = batches.length;

  // Process batches in parallel with progress tracking
  const promises = batches.map(async (batch) => {
    const result = await workerPool.execute<T[], R[]>(taskType, batch);
    completedBatches++;
    onProgress(completedBatches, totalBatches);
    return result;
  });

  const batchResults = await Promise.all(promises);

  // Flatten results
  for (const batchResult of batchResults) {
    results.push(...batchResult);
  }

  return results;
}

/**
 * Process array with rate limiting.
 *
 * Limits number of concurrent batches to avoid overwhelming workers.
 *
 * @param items - Array of items to process
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @param maxConcurrent - Maximum number of concurrent batches (default: worker count)
 * @param batchSize - Number of items per batch (default: 100)
 * @returns Promise that resolves to array of results
 *
 * @example
 * ```typescript
 * // Process 1000 items but only 2 batches at a time
 * const results = await processBatchRateLimited(
 *   items,
 *   workerPool,
 *   'process_items',
 *   2, // Max 2 concurrent batches
 *   100 // 100 items per batch
 * );
 * ```
 */
export async function processBatchRateLimited<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string,
  maxConcurrent?: number,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Default to worker count if not specified
  const concurrentLimit = maxConcurrent ?? workerPool.getStats().total;

  // Process batches with rate limiting
  for (let i = 0; i < batches.length; i += concurrentLimit) {
    const batchSlice = batches.slice(i, i + concurrentLimit);

    const promises = batchSlice.map((batch) =>
      workerPool.execute<T[], R[]>(taskType, batch)
    );

    const batchResults = await Promise.all(promises);

    // Flatten results
    for (const batchResult of batchResults) {
      results.push(...batchResult);
    }
  }

  return results;
}

/**
 * Map array items using worker pool.
 *
 * Similar to Array.map() but runs in parallel using workers.
 *
 * @param items - Array of items to map
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @returns Promise that resolves to mapped array
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5];
 * const doubled = await mapParallel(numbers, workerPool, 'double_number');
 * // doubled = [2, 4, 6, 8, 10]
 * ```
 */
export async function mapParallel<T, R>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<R[]> {
  return processBatchAuto(items, workerPool, taskType);
}

/**
 * Filter array items using worker pool.
 *
 * Similar to Array.filter() but runs in parallel using workers.
 *
 * @param items - Array of items to filter
 * @param workerPool - Worker pool to use for processing
 * @param taskType - Task type identifier for workers
 * @returns Promise that resolves to filtered array
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5];
 * const evens = await filterParallel(numbers, workerPool, 'is_even');
 * // evens = [2, 4]
 * ```
 */
export async function filterParallel<T>(
  items: T[],
  workerPool: WorkerPool,
  taskType: string
): Promise<T[]> {
  const results = await processBatchAuto<T, { item: T; keep: boolean }>(
    items,
    workerPool,
    taskType
  );

  return results.filter((r) => r.keep).map((r) => r.item);
}
