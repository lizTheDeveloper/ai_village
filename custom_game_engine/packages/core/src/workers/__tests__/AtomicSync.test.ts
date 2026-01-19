/**
 * AtomicSync Tests
 *
 * Tests atomic synchronization operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  signalReady,
  signalReadyAll,
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
} from '../AtomicSync.js';
import { isSharedArrayBufferSupported } from '../SharedMemory.js';

describe('AtomicSync', () => {
  let atomics: Int32Array;

  beforeEach(() => {
    if (isSharedArrayBufferSupported()) {
      const sab = new SharedArrayBuffer(16); // 4 int32s
      atomics = new Int32Array(sab);
    }
  });

  describe('Ready Signaling', () => {
    it('should signal ready and check status', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      expect(isReady(atomics)).toBe(false);

      signalReady(atomics);

      expect(isReady(atomics)).toBe(true);
    });

    it('should reset ready flag', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      signalReady(atomics);
      expect(isReady(atomics)).toBe(true);

      resetReady(atomics);
      expect(isReady(atomics)).toBe(false);
    });

    it('should signal ready to all waiters', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      signalReadyAll(atomics);
      expect(isReady(atomics)).toBe(true);
    });

    it('should work with different indices', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      signalReady(atomics, 0);
      signalReady(atomics, 1);
      signalReady(atomics, 2);

      expect(isReady(atomics, 0)).toBe(true);
      expect(isReady(atomics, 1)).toBe(true);
      expect(isReady(atomics, 2)).toBe(true);
      expect(isReady(atomics, 3)).toBe(false);
    });
  });

  describe('Locking', () => {
    it('should acquire and release lock', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      expect(isLocked(atomics)).toBe(false);

      acquireLock(atomics);
      expect(isLocked(atomics)).toBe(true);

      releaseLock(atomics);
      expect(isLocked(atomics)).toBe(false);
    });

    it('should try to acquire lock', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // First attempt should succeed
      expect(tryAcquireLock(atomics)).toBe(true);
      expect(isLocked(atomics)).toBe(true);

      // Second attempt should fail (already locked)
      expect(tryAcquireLock(atomics)).toBe(false);

      // After release, should succeed again
      releaseLock(atomics);
      expect(tryAcquireLock(atomics)).toBe(true);
    });

    it('should execute with lock held', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      let executed = false;

      const result = withLock(atomics, () => {
        expect(isLocked(atomics)).toBe(true);
        executed = true;
        return 42;
      });

      expect(executed).toBe(true);
      expect(result).toBe(42);
      expect(isLocked(atomics)).toBe(false); // Lock released after
    });

    it('should release lock even on error', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      expect(() => {
        withLock(atomics, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      expect(isLocked(atomics)).toBe(false); // Lock released despite error
    });

    it('should throw on lock timeout', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // Manually set lock to simulate deadlock
      atomics[0] = SYNC_FLAG.LOCKED;

      expect(() => {
        acquireLock(atomics, 0, 10); // Max 10 spins
      }).toThrow('timeout');
    });
  });

  describe('Atomic Operations', () => {
    it('should increment atomically', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = 100;

      const prev1 = atomicIncrement(atomics, 1);
      expect(prev1).toBe(100); // Returns previous value
      expect(atomics[1]).toBe(101);

      const prev2 = atomicIncrement(atomics, 1, 5);
      expect(prev2).toBe(101);
      expect(atomics[1]).toBe(106);
    });

    it('should decrement atomically', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = 100;

      const prev1 = atomicDecrement(atomics, 1);
      expect(prev1).toBe(100);
      expect(atomics[1]).toBe(99);

      const prev2 = atomicDecrement(atomics, 1, 5);
      expect(prev2).toBe(99);
      expect(atomics[1]).toBe(94);
    });

    it('should compare and exchange atomically', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = 42;

      // Successful exchange (expected matches)
      const prev1 = atomicCompareExchange(atomics, 1, 42, 100);
      expect(prev1).toBe(42);
      expect(atomics[1]).toBe(100);

      // Failed exchange (expected doesn't match)
      const prev2 = atomicCompareExchange(atomics, 1, 42, 200);
      expect(prev2).toBe(100); // Returns actual value
      expect(atomics[1]).toBe(100); // Value unchanged
    });

    it('should handle concurrent increments', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = 0;

      // Simulate concurrent increments
      for (let i = 0; i < 100; i++) {
        atomicIncrement(atomics, 1);
      }

      expect(atomics[1]).toBe(100);
    });
  });

  describe('Multiple Indices', () => {
    it('should support independent flags at different indices', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // Signal different flags
      signalReady(atomics, 0);
      acquireLock(atomics, 1);
      atomics[2] = 42;

      // Verify independence
      expect(isReady(atomics, 0)).toBe(true);
      expect(isReady(atomics, 1)).toBe(false);
      expect(isReady(atomics, 2)).toBe(false);

      expect(isLocked(atomics, 0)).toBe(false);
      expect(isLocked(atomics, 1)).toBe(true);
      expect(isLocked(atomics, 2)).toBe(false);

      expect(atomics[2]).toBe(42);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = 0;
      expect(atomics[1]).toBe(0);

      atomicIncrement(atomics, 1);
      expect(atomics[1]).toBe(1);

      atomicDecrement(atomics, 1);
      expect(atomics[1]).toBe(0);
    });

    it('should handle negative values', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      atomics[1] = -10;
      atomicIncrement(atomics, 1);
      expect(atomics[1]).toBe(-9);

      atomicDecrement(atomics, 1, 5);
      expect(atomics[1]).toBe(-14);
    });

    it('should handle integer overflow', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // Int32 max value
      atomics[1] = 2147483647;
      atomicIncrement(atomics, 1);

      // Overflows to min value
      expect(atomics[1]).toBe(-2147483648);
    });
  });
});
