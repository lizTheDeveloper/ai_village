import { describe, it, expect, beforeEach } from 'vitest';
import { Semaphore } from '../Semaphore.js';

describe('Semaphore', () => {
  let semaphore: Semaphore;

  beforeEach(() => {
    semaphore = new Semaphore(2);
  });

  describe('constructor', () => {
    it('should create semaphore with correct permits', () => {
      expect(semaphore.getAvailablePermits()).toBe(2);
      expect(semaphore.getMaxPermits()).toBe(2);
    });

    it('should throw error for invalid maxPermits', () => {
      expect(() => new Semaphore(0)).toThrow('maxPermits must be at least 1');
      expect(() => new Semaphore(-1)).toThrow('maxPermits must be at least 1');
    });
  });

  describe('acquire and release', () => {
    it('should acquire permits', async () => {
      await semaphore.acquire();
      expect(semaphore.getAvailablePermits()).toBe(1);

      await semaphore.acquire();
      expect(semaphore.getAvailablePermits()).toBe(0);
    });

    it('should release permits', async () => {
      await semaphore.acquire();
      await semaphore.acquire();
      expect(semaphore.getAvailablePermits()).toBe(0);

      semaphore.release();
      expect(semaphore.getAvailablePermits()).toBe(1);

      semaphore.release();
      expect(semaphore.getAvailablePermits()).toBe(2);
    });

    it('should not exceed max permits on release', () => {
      semaphore.release();
      semaphore.release();
      semaphore.release();
      expect(semaphore.getAvailablePermits()).toBe(2);
    });

    it('should queue waiters when all permits acquired', async () => {
      await semaphore.acquire();
      await semaphore.acquire();

      expect(semaphore.getQueueLength()).toBe(0);

      const promise = semaphore.acquire();
      expect(semaphore.getQueueLength()).toBe(1);

      semaphore.release();
      await promise;
      expect(semaphore.getQueueLength()).toBe(0);
    });
  });

  describe('tryAcquire', () => {
    it('should acquire if permits available', () => {
      const result = semaphore.tryAcquire();
      expect(result).toBe(true);
      expect(semaphore.getAvailablePermits()).toBe(1);
    });

    it('should fail if no permits available', async () => {
      await semaphore.acquire();
      await semaphore.acquire();

      const result = semaphore.tryAcquire();
      expect(result).toBe(false);
      expect(semaphore.getAvailablePermits()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await semaphore.acquire();

      const stats = semaphore.getStats();
      expect(stats.available).toBe(1);
      expect(stats.queued).toBe(0);
      expect(stats.capacity).toBe(2);
      expect(stats.utilization).toBe(0.5);
    });

    it('should show 100% utilization when full', async () => {
      await semaphore.acquire();
      await semaphore.acquire();

      const stats = semaphore.getStats();
      expect(stats.utilization).toBe(1.0);
    });
  });

  describe('isFull', () => {
    it('should return false when permits available', () => {
      expect(semaphore.isFull()).toBe(false);
    });

    it('should return true when no permits available', async () => {
      await semaphore.acquire();
      await semaphore.acquire();
      expect(semaphore.isFull()).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent acquire/release', async () => {
      const operations: Promise<void>[] = [];

      // Start 10 concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            await semaphore.acquire();
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 10));
            semaphore.release();
          })()
        );
      }

      await Promise.all(operations);

      // All permits should be released
      expect(semaphore.getAvailablePermits()).toBe(2);
      expect(semaphore.getQueueLength()).toBe(0);
    });
  });
});
