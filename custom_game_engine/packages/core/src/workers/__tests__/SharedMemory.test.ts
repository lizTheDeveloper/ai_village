/**
 * SharedMemory Tests
 *
 * Tests SharedArrayBuffer allocation and management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SharedMemoryManager,
  isSharedArrayBufferSupported,
} from '../SharedMemory.js';

describe('SharedMemory', () => {
  describe('isSharedArrayBufferSupported', () => {
    it('should detect SharedArrayBuffer support', () => {
      const supported = isSharedArrayBufferSupported();
      // Should be boolean
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('SharedMemoryManager', () => {
    let manager: SharedMemoryManager;

    beforeEach(() => {
      manager = new SharedMemoryManager();
    });

    afterEach(() => {
      manager.freeAll();
    });

    it('should allocate shared memory region', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      const region = manager.allocate('test', 100);

      expect(region).toBeDefined();
      expect(region.name).toBe('test');
      expect(region.elementCount).toBe(100);
      expect(region.float32View.length).toBe(100);
      expect(region.int32View.length).toBe(100);
      expect(region.atomics.length).toBe(1);
      expect(region.buffer).toBeInstanceOf(SharedArrayBuffer);
    });

    it('should write and read from shared memory', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      const region = manager.allocate('data', 10);

      // Write float data
      region.float32View[0] = 1.5;
      region.float32View[1] = 2.5;
      region.float32View[2] = 3.5;

      // Read back
      expect(region.float32View[0]).toBe(1.5);
      expect(region.float32View[1]).toBe(2.5);
      expect(region.float32View[2]).toBe(3.5);

      // Write int data
      region.int32View[5] = 42;
      expect(region.int32View[5]).toBe(42);
    });

    it('should get existing region', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      const region1 = manager.allocate('test', 50);
      const region2 = manager.get('test');

      expect(region2).toBe(region1);
      expect(region2?.name).toBe('test');
    });

    it('should return null for non-existent region', () => {
      const region = manager.get('nonexistent');
      expect(region).toBeNull();
    });

    it('should get or allocate region', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // Allocate new region
      const region1 = manager.getOrAllocate('test', 100);
      expect(region1.elementCount).toBe(100);

      // Get existing region
      const region2 = manager.getOrAllocate('test', 50);
      expect(region2).toBe(region1); // Same region (large enough)

      // Reallocate if too small
      const region3 = manager.getOrAllocate('test', 200);
      expect(region3).not.toBe(region1); // New region (old was too small)
      expect(region3.elementCount).toBe(200);
    });

    it('should free region', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      manager.allocate('test', 100);
      expect(manager.get('test')).not.toBeNull();

      const freed = manager.free('test');
      expect(freed).toBe(true);
      expect(manager.get('test')).toBeNull();
    });

    it('should free all regions', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      manager.allocate('region1', 100);
      manager.allocate('region2', 200);
      manager.allocate('region3', 300);

      expect(manager.getRegionCount()).toBe(3);

      manager.freeAll();
      expect(manager.getRegionCount()).toBe(0);
    });

    it('should calculate total size', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // 100 elements * 4 bytes + 4 bytes sync flag = 404 bytes
      manager.allocate('region1', 100);
      // 200 elements * 4 bytes + 4 bytes sync flag = 804 bytes
      manager.allocate('region2', 200);

      const totalSize = manager.getTotalSize();
      expect(totalSize).toBe(404 + 804);
    });

    it('should get region names', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      manager.allocate('alpha', 100);
      manager.allocate('beta', 200);
      manager.allocate('gamma', 300);

      const names = manager.getRegionNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });

    it('should get memory stats', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      manager.allocate('region1', 1000);
      manager.allocate('region2', 2000);

      const stats = manager.getStats();

      expect(stats.regionCount).toBe(2);
      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.totalKB).toBeGreaterThan(0);
      expect(stats.totalMB).toBeGreaterThan(0);
      expect(stats.regions).toHaveLength(2);
      expect(stats.regions[0].name).toBe('region1');
      expect(stats.regions[0].elementCount).toBe(1000);
    });

    it('should throw on duplicate allocation', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      manager.allocate('test', 100);

      expect(() => {
        manager.allocate('test', 200);
      }).toThrow('already exists');
    });

    it('should handle zero-length allocation', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      const region = manager.allocate('empty', 0);
      expect(region.elementCount).toBe(0);
      expect(region.float32View.length).toBe(0);
      expect(region.atomics.length).toBe(1); // Sync flag still present
    });

    it('should handle large allocations', () => {
      if (!isSharedArrayBufferSupported()) {
        console.warn('SharedArrayBuffer not supported, skipping test');
        return;
      }

      // 10 million elements = 40MB + 4 bytes
      const region = manager.allocate('huge', 10_000_000);

      expect(region.elementCount).toBe(10_000_000);
      expect(region.float32View.length).toBe(10_000_000);

      const stats = manager.getStats();
      expect(stats.totalMB).toBeCloseTo(40, 1);
    });
  });
});
