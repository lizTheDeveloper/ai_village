/**
 * Semaphore for limiting concurrent operations
 *
 * A counting semaphore that limits the number of concurrent operations.
 * Used to prevent thundering herd problems with LLM API calls.
 *
 * @example
 * const semaphore = new Semaphore(2); // Max 2 concurrent operations
 *
 * async function doWork() {
 *   await semaphore.acquire();
 *   try {
 *     // Do work
 *   } finally {
 *     semaphore.release();
 *   }
 * }
 */
export class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  private queue: Array<() => void> = [];

  constructor(maxPermits: number) {
    if (maxPermits < 1) {
      throw new Error('Semaphore maxPermits must be at least 1');
    }

    this.permits = maxPermits;
    this.maxPermits = maxPermits;
  }

  /**
   * Acquire a permit (async, waits if none available)
   *
   * @returns Promise that resolves when permit is acquired
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  /**
   * Try to acquire a permit without waiting
   *
   * @returns true if permit acquired, false if none available
   */
  tryAcquire(): boolean {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }
    return false;
  }

  /**
   * Release a permit back to the pool
   *
   * If there are queued waiters, wakes the next one.
   * Otherwise increments available permits.
   */
  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.permits = Math.min(this.permits + 1, this.maxPermits);
    }
  }

  /**
   * Get number of available permits
   */
  getAvailablePermits(): number {
    return this.permits;
  }

  /**
   * Get number of queued waiters
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get max permits (capacity)
   */
  getMaxPermits(): number {
    return this.maxPermits;
  }

  /**
   * Check if semaphore is fully acquired
   */
  isFull(): boolean {
    return this.permits === 0;
  }

  /**
   * Get semaphore stats
   */
  getStats(): {
    available: number;
    queued: number;
    capacity: number;
    utilization: number;
  } {
    return {
      available: this.permits,
      queued: this.queue.length,
      capacity: this.maxPermits,
      utilization: (this.maxPermits - this.permits) / this.maxPermits,
    };
  }
}
