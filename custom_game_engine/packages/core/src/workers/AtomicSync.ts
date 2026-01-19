/**
 * Atomic Synchronization Utilities
 *
 * Provides atomic operations for thread-safe worker synchronization.
 * Uses Atomics API for wait/notify and lock/unlock patterns.
 *
 * Performance:
 * - Zero-overhead signaling between threads
 * - Blocking waits with timeout support
 * - Simple spinlock for critical sections
 *
 * Usage:
 * ```typescript
 * // Main thread: Signal data is ready
 * signalReady(region.atomics);
 *
 * // Worker thread: Wait for data
 * if (waitForReady(region.atomics, 0, 1000)) {
 *   // Process data
 * }
 * ```
 */

/**
 * Sync flag values
 */
export const SYNC_FLAG = {
  /** Flag is not set (waiting) */
  NOT_READY: 0,
  /** Flag is set (ready) */
  READY: 1,
  /** Lock is available */
  UNLOCKED: 0,
  /** Lock is held */
  LOCKED: 1,
} as const;

/**
 * Signal that data is ready.
 *
 * Sets atomic flag to READY and notifies one waiting thread.
 * Use this from the producer thread (e.g., main thread writing data).
 *
 * @param atomics - Int32Array view of sync flag
 * @param index - Index in atomics array (default: 0)
 */
export function signalReady(atomics: Int32Array, index: number = 0): void {
  Atomics.store(atomics, index, SYNC_FLAG.READY);
  Atomics.notify(atomics, index, 1); // Wake one waiter
}

/**
 * Signal that data is ready and wake all waiters.
 *
 * Use when multiple workers are waiting for the same data.
 *
 * @param atomics - Int32Array view of sync flag
 * @param index - Index in atomics array (default: 0)
 */
export function signalReadyAll(atomics: Int32Array, index: number = 0): void {
  Atomics.store(atomics, index, SYNC_FLAG.READY);
  Atomics.notify(atomics, index); // Wake all waiters
}

/**
 * Wait for data to be ready (blocking).
 *
 * Blocks until flag is set to READY or timeout occurs.
 * Automatically resets flag to NOT_READY after successful wait.
 *
 * Use this from consumer thread (e.g., worker waiting for data).
 *
 * @param atomics - Int32Array view of sync flag
 * @param index - Index in atomics array (default: 0)
 * @param timeout - Timeout in milliseconds (default: 1000)
 * @returns true if data ready, false if timeout
 */
export function waitForReady(
  atomics: Int32Array,
  index: number = 0,
  timeout: number = 1000
): boolean {
  const result = Atomics.wait(atomics, index, SYNC_FLAG.NOT_READY, timeout);

  if (result === 'ok') {
    // Reset flag for next use
    Atomics.store(atomics, index, SYNC_FLAG.NOT_READY);
    return true;
  }

  // 'timed-out' or 'not-equal'
  return false;
}

/**
 * Non-blocking check if data is ready.
 *
 * Checks flag without blocking. Does NOT reset flag.
 *
 * @param atomics - Int32Array view of sync flag
 * @param index - Index in atomics array (default: 0)
 * @returns true if flag is READY
 */
export function isReady(atomics: Int32Array, index: number = 0): boolean {
  return Atomics.load(atomics, index) === SYNC_FLAG.READY;
}

/**
 * Reset ready flag to NOT_READY.
 *
 * @param atomics - Int32Array view of sync flag
 * @param index - Index in atomics array (default: 0)
 */
export function resetReady(atomics: Int32Array, index: number = 0): void {
  Atomics.store(atomics, index, SYNC_FLAG.NOT_READY);
}

/**
 * Acquire lock (simple spinlock).
 *
 * Spins until lock is acquired. Use for very short critical sections only.
 * For longer critical sections, consider message passing instead.
 *
 * WARNING: Can cause performance issues if held for long periods.
 *
 * @param atomics - Int32Array view of lock flag
 * @param index - Index in atomics array (default: 0)
 * @param maxSpins - Maximum spin attempts before throwing (default: 10000)
 * @throws Error if lock cannot be acquired
 */
export function acquireLock(
  atomics: Int32Array,
  index: number = 0,
  maxSpins: number = 10000
): void {
  let spins = 0;

  while (Atomics.compareExchange(atomics, index, SYNC_FLAG.UNLOCKED, SYNC_FLAG.LOCKED) !== SYNC_FLAG.UNLOCKED) {
    spins++;
    if (spins > maxSpins) {
      throw new Error('[AtomicSync] Lock acquisition timeout (deadlock?)');
    }
  }
}

/**
 * Try to acquire lock without blocking.
 *
 * Returns immediately whether lock was acquired or not.
 *
 * @param atomics - Int32Array view of lock flag
 * @param index - Index in atomics array (default: 0)
 * @returns true if lock acquired, false if already locked
 */
export function tryAcquireLock(atomics: Int32Array, index: number = 0): boolean {
  return Atomics.compareExchange(atomics, index, SYNC_FLAG.UNLOCKED, SYNC_FLAG.LOCKED) === SYNC_FLAG.UNLOCKED;
}

/**
 * Release lock.
 *
 * @param atomics - Int32Array view of lock flag
 * @param index - Index in atomics array (default: 0)
 */
export function releaseLock(atomics: Int32Array, index: number = 0): void {
  Atomics.store(atomics, index, SYNC_FLAG.UNLOCKED);
  Atomics.notify(atomics, index, 1); // Wake one waiter
}

/**
 * Check if lock is held.
 *
 * Non-blocking check. Does not acquire lock.
 *
 * @param atomics - Int32Array view of lock flag
 * @param index - Index in atomics array (default: 0)
 * @returns true if lock is currently held
 */
export function isLocked(atomics: Int32Array, index: number = 0): boolean {
  return Atomics.load(atomics, index) === SYNC_FLAG.LOCKED;
}

/**
 * Execute function with lock held.
 *
 * Acquires lock, executes function, releases lock (even if function throws).
 *
 * @param atomics - Int32Array view of lock flag
 * @param fn - Function to execute with lock held
 * @param index - Index in atomics array (default: 0)
 * @returns Result of function
 */
export function withLock<T>(
  atomics: Int32Array,
  fn: () => T,
  index: number = 0
): T {
  acquireLock(atomics, index);
  try {
    return fn();
  } finally {
    releaseLock(atomics, index);
  }
}

/**
 * Atomic increment.
 *
 * Thread-safe increment operation.
 *
 * @param atomics - Int32Array view
 * @param index - Index in atomics array
 * @param delta - Amount to add (default: 1)
 * @returns Previous value
 */
export function atomicIncrement(
  atomics: Int32Array,
  index: number,
  delta: number = 1
): number {
  return Atomics.add(atomics, index, delta);
}

/**
 * Atomic decrement.
 *
 * Thread-safe decrement operation.
 *
 * @param atomics - Int32Array view
 * @param index - Index in atomics array
 * @param delta - Amount to subtract (default: 1)
 * @returns Previous value
 */
export function atomicDecrement(
  atomics: Int32Array,
  index: number,
  delta: number = 1
): number {
  return Atomics.sub(atomics, index, delta);
}

/**
 * Atomic compare-and-swap.
 *
 * Thread-safe conditional update.
 *
 * @param atomics - Int32Array view
 * @param index - Index in atomics array
 * @param expected - Expected current value
 * @param replacement - New value if current === expected
 * @returns Actual previous value
 */
export function atomicCompareExchange(
  atomics: Int32Array,
  index: number,
  expected: number,
  replacement: number
): number {
  return Atomics.compareExchange(atomics, index, expected, replacement);
}
