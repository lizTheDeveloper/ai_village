import { describe, it, expect, beforeEach } from 'vitest';
import { PositionSoA, VelocitySoA } from '../SoAStorage.js';

describe('PositionSoA', () => {
  let soa: PositionSoA;

  beforeEach(() => {
    soa = new PositionSoA(10);
  });

  describe('add', () => {
    it('should add a position and return the index', () => {
      const index = soa.add('entity1', 10, 20, 0, 0, 0);
      expect(index).toBe(0);
      expect(soa.size()).toBe(1);
    });

    it('should add multiple positions', () => {
      soa.add('entity1', 10, 20, 0, 0, 0);
      soa.add('entity2', 30, 40, 0, 1, 1);
      soa.add('entity3', 50, 60, 0, 1, 1);

      expect(soa.size()).toBe(3);
    });

    it('should grow capacity when needed', () => {
      // Add 11 items to exceed initial capacity of 10
      for (let i = 0; i < 11; i++) {
        soa.add(`entity${i}`, i, i * 2, 0, 0, 0);
      }

      expect(soa.size()).toBe(11);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 5, 0, 0);
      soa.add('entity2', 30, 40, 10, 1, 1);
    });

    it('should retrieve existing position', () => {
      const pos = soa.get('entity1');
      expect(pos).toEqual({ x: 10, y: 20, z: 5, chunkX: 0, chunkY: 0 });
    });

    it('should return null for non-existent entity', () => {
      const pos = soa.get('nonexistent');
      expect(pos).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 5, 0, 0);
    });

    it('should update existing position', () => {
      const success = soa.set('entity1', 100, 200, 50, 3, 6);
      expect(success).toBe(true);

      const pos = soa.get('entity1');
      expect(pos).toEqual({ x: 100, y: 200, z: 50, chunkX: 3, chunkY: 6 });
    });

    it('should update partial position (z, chunk optional)', () => {
      const success = soa.set('entity1', 100, 200);
      expect(success).toBe(true);

      const pos = soa.get('entity1');
      expect(pos).toEqual({ x: 100, y: 200, z: 5, chunkX: 0, chunkY: 0 });
    });

    it('should return false for non-existent entity', () => {
      const success = soa.set('nonexistent', 100, 200);
      expect(success).toBe(false);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 0, 0, 0);
      soa.add('entity2', 30, 40, 0, 1, 1);
      soa.add('entity3', 50, 60, 0, 1, 1);
    });

    it('should remove entity and maintain indices', () => {
      const success = soa.remove('entity2');
      expect(success).toBe(true);
      expect(soa.size()).toBe(2);

      // entity2 should be gone
      expect(soa.get('entity2')).toBeNull();

      // Other entities should still be accessible
      expect(soa.get('entity1')).toEqual({ x: 10, y: 20, z: 0, chunkX: 0, chunkY: 0 });
      expect(soa.get('entity3')).toEqual({ x: 50, y: 60, z: 0, chunkX: 1, chunkY: 1 });
    });

    it('should use swap-remove (last element fills gap)', () => {
      // Remove middle element - last element should fill its spot
      soa.remove('entity2');

      // entity3 should have taken entity2's place (swap-remove)
      // We can verify by checking size and that both entity1 and entity3 are still accessible
      expect(soa.size()).toBe(2);
      expect(soa.has('entity1')).toBe(true);
      expect(soa.has('entity3')).toBe(true);
      expect(soa.has('entity2')).toBe(false);
    });

    it('should return false for non-existent entity', () => {
      const success = soa.remove('nonexistent');
      expect(success).toBe(false);
    });
  });

  describe('getArrays', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 0, 0, 0);
      soa.add('entity2', 30, 40, 5, 1, 1);
    });

    it('should return direct array access', () => {
      const arrays = soa.getArrays();

      expect(arrays.count).toBe(2);
      expect(arrays.xs[0]).toBe(10);
      expect(arrays.ys[0]).toBe(20);
      expect(arrays.zs[0]).toBe(0);
      expect(arrays.xs[1]).toBe(30);
      expect(arrays.ys[1]).toBe(40);
      expect(arrays.zs[1]).toBe(5);
      expect(arrays.entityIds[0]).toBe('entity1');
      expect(arrays.entityIds[1]).toBe('entity2');
    });

    it('should allow batch processing via arrays', () => {
      const arrays = soa.getArrays();

      // Batch update all x coordinates
      for (let i = 0; i < arrays.count; i++) {
        arrays.xs[i] += 100;
      }

      // Verify updates
      expect(soa.get('entity1')?.x).toBe(110);
      expect(soa.get('entity2')?.x).toBe(130);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 0, 0, 0);
      soa.add('entity2', 30, 40, 0, 1, 1);
    });

    it('should remove all data', () => {
      soa.clear();

      expect(soa.size()).toBe(0);
      expect(soa.get('entity1')).toBeNull();
      expect(soa.get('entity2')).toBeNull();
    });
  });

  describe('has', () => {
    beforeEach(() => {
      soa.add('entity1', 10, 20, 0, 0, 0);
    });

    it('should return true for existing entity', () => {
      expect(soa.has('entity1')).toBe(true);
    });

    it('should return false for non-existent entity', () => {
      expect(soa.has('nonexistent')).toBe(false);
    });
  });
});

describe('VelocitySoA', () => {
  let soa: VelocitySoA;

  beforeEach(() => {
    soa = new VelocitySoA(10);
  });

  describe('add', () => {
    it('should add a velocity and return the index', () => {
      const index = soa.add('entity1', 1.5, 2.5);
      expect(index).toBe(0);
      expect(soa.size()).toBe(1);
    });

    it('should add multiple velocities', () => {
      soa.add('entity1', 1.5, 2.5);
      soa.add('entity2', 3.5, 4.5);
      soa.add('entity3', 5.5, 6.5);

      expect(soa.size()).toBe(3);
    });

    it('should grow capacity when needed', () => {
      // Add 11 items to exceed initial capacity of 10
      for (let i = 0; i < 11; i++) {
        soa.add(`entity${i}`, i * 0.5, i * 1.5);
      }

      expect(soa.size()).toBe(11);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
      soa.add('entity2', 3.5, 4.5);
    });

    it('should retrieve existing velocity', () => {
      const vel = soa.get('entity1');
      expect(vel).toEqual({ vx: 1.5, vy: 2.5 });
    });

    it('should return null for non-existent entity', () => {
      const vel = soa.get('nonexistent');
      expect(vel).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
    });

    it('should update existing velocity', () => {
      const success = soa.set('entity1', 10.5, 20.5);
      expect(success).toBe(true);

      const vel = soa.get('entity1');
      expect(vel).toEqual({ vx: 10.5, vy: 20.5 });
    });

    it('should return false for non-existent entity', () => {
      const success = soa.set('nonexistent', 10.5, 20.5);
      expect(success).toBe(false);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
      soa.add('entity2', 3.5, 4.5);
      soa.add('entity3', 5.5, 6.5);
    });

    it('should remove entity and maintain indices', () => {
      const success = soa.remove('entity2');
      expect(success).toBe(true);
      expect(soa.size()).toBe(2);

      // entity2 should be gone
      expect(soa.get('entity2')).toBeNull();

      // Other entities should still be accessible
      expect(soa.get('entity1')).toEqual({ vx: 1.5, vy: 2.5 });
      expect(soa.get('entity3')).toEqual({ vx: 5.5, vy: 6.5 });
    });

    it('should use swap-remove (last element fills gap)', () => {
      // Remove middle element - last element should fill its spot
      soa.remove('entity2');

      // entity3 should have taken entity2's place (swap-remove)
      expect(soa.size()).toBe(2);
      expect(soa.has('entity1')).toBe(true);
      expect(soa.has('entity3')).toBe(true);
      expect(soa.has('entity2')).toBe(false);
    });

    it('should return false for non-existent entity', () => {
      const success = soa.remove('nonexistent');
      expect(success).toBe(false);
    });
  });

  describe('getArrays', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
      soa.add('entity2', 3.5, 4.5);
    });

    it('should return direct array access', () => {
      const arrays = soa.getArrays();

      expect(arrays.count).toBe(2);
      expect(arrays.vxs[0]).toBe(1.5);
      expect(arrays.vys[0]).toBe(2.5);
      expect(arrays.vxs[1]).toBe(3.5);
      expect(arrays.vys[1]).toBe(4.5);
      expect(arrays.entityIds[0]).toBe('entity1');
      expect(arrays.entityIds[1]).toBe('entity2');
    });

    it('should allow batch processing via arrays', () => {
      const arrays = soa.getArrays();

      // Batch apply damping to all velocities
      const damping = 0.9;
      for (let i = 0; i < arrays.count; i++) {
        arrays.vxs[i] *= damping;
        arrays.vys[i] *= damping;
      }

      // Verify updates
      expect(soa.get('entity1')?.vx).toBeCloseTo(1.5 * damping);
      expect(soa.get('entity1')?.vy).toBeCloseTo(2.5 * damping);
      expect(soa.get('entity2')?.vx).toBeCloseTo(3.5 * damping);
      expect(soa.get('entity2')?.vy).toBeCloseTo(4.5 * damping);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
      soa.add('entity2', 3.5, 4.5);
    });

    it('should remove all data', () => {
      soa.clear();

      expect(soa.size()).toBe(0);
      expect(soa.get('entity1')).toBeNull();
      expect(soa.get('entity2')).toBeNull();
    });
  });

  describe('has', () => {
    beforeEach(() => {
      soa.add('entity1', 1.5, 2.5);
    });

    it('should return true for existing entity', () => {
      expect(soa.has('entity1')).toBe(true);
    });

    it('should return false for non-existent entity', () => {
      expect(soa.has('nonexistent')).toBe(false);
    });
  });
});
