import { describe, it, expect, beforeEach } from 'vitest';
import {
  vector2DPool,
  boundingBoxPool,
  distanceResultPool,
  entityListPool,
  calculateDistance,
  createVector,
  createBoundingBox,
} from '../CommonPools.js';

describe('CommonPools', () => {
  beforeEach(() => {
    vector2DPool.clear();
    boundingBoxPool.clear();
    distanceResultPool.clear();
    entityListPool.clear();
  });

  describe('vector2DPool', () => {
    it('should create and reset vectors correctly', () => {
      const v1 = vector2DPool.acquire();
      v1.x = 10;
      v1.y = 20;

      vector2DPool.release(v1);

      const v2 = vector2DPool.acquire();
      expect(v2.x).toBe(0);
      expect(v2.y).toBe(0);
      expect(v2).toBe(v1);
    });

    it('should have initial pool size', () => {
      const stats = vector2DPool.getStats();
      expect(stats.poolSize).toBeGreaterThan(0);
    });
  });

  describe('boundingBoxPool', () => {
    it('should create and reset bounding boxes correctly', () => {
      const b1 = boundingBoxPool.acquire();
      b1.minX = 1;
      b1.minY = 2;
      b1.maxX = 3;
      b1.maxY = 4;

      boundingBoxPool.release(b1);

      const b2 = boundingBoxPool.acquire();
      expect(b2.minX).toBe(0);
      expect(b2.minY).toBe(0);
      expect(b2.maxX).toBe(0);
      expect(b2.maxY).toBe(0);
      expect(b2).toBe(b1);
    });

    it('should have initial pool size', () => {
      const stats = boundingBoxPool.getStats();
      expect(stats.poolSize).toBeGreaterThan(0);
    });
  });

  describe('distanceResultPool', () => {
    it('should create and reset distance results correctly', () => {
      const d1 = distanceResultPool.acquire();
      d1.distance = 5;
      d1.distanceSquared = 25;
      d1.dx = 3;
      d1.dy = 4;

      distanceResultPool.release(d1);

      const d2 = distanceResultPool.acquire();
      expect(d2.distance).toBe(0);
      expect(d2.distanceSquared).toBe(0);
      expect(d2.dx).toBe(0);
      expect(d2.dy).toBe(0);
      expect(d2).toBe(d1);
    });

    it('should have initial pool size', () => {
      const stats = distanceResultPool.getStats();
      expect(stats.poolSize).toBeGreaterThan(0);
    });
  });

  describe('entityListPool', () => {
    it('should create and reset entity lists correctly', () => {
      const e1 = entityListPool.acquire();
      e1.entities.push('entity1', 'entity2');
      e1.count = 2;

      entityListPool.release(e1);

      const e2 = entityListPool.acquire();
      expect(e2.entities).toEqual([]);
      expect(e2.count).toBe(0);
      expect(e2).toBe(e1);
    });

    it('should have initial pool size', () => {
      const stats = entityListPool.getStats();
      expect(stats.poolSize).toBeGreaterThan(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const result = calculateDistance(0, 0, 3, 4);

      expect(result.dx).toBe(3);
      expect(result.dy).toBe(4);
      expect(result.distanceSquared).toBe(25);
      expect(result.distance).toBe(5);

      distanceResultPool.release(result);
    });

    it('should use pooled objects', () => {
      const initialStats = distanceResultPool.getStats();

      const r1 = calculateDistance(0, 0, 1, 1);
      distanceResultPool.release(r1);

      const r2 = calculateDistance(0, 0, 2, 2);
      distanceResultPool.release(r2);

      const finalStats = distanceResultPool.getStats();
      expect(finalStats.totalCreated).toBe(initialStats.totalCreated);
    });

    it('should handle negative coordinates', () => {
      const result = calculateDistance(5, 5, 2, 1);

      expect(result.dx).toBe(-3);
      expect(result.dy).toBe(-4);
      expect(result.distanceSquared).toBe(25);
      expect(result.distance).toBe(5);

      distanceResultPool.release(result);
    });
  });

  describe('createVector', () => {
    it('should create vector with correct values', () => {
      const v = createVector(42, 99);

      expect(v.x).toBe(42);
      expect(v.y).toBe(99);

      vector2DPool.release(v);
    });

    it('should use pooled objects', () => {
      const initialStats = vector2DPool.getStats();

      const v1 = createVector(1, 2);
      vector2DPool.release(v1);

      const v2 = createVector(3, 4);
      vector2DPool.release(v2);

      const finalStats = vector2DPool.getStats();
      expect(finalStats.totalCreated).toBe(initialStats.totalCreated);
    });
  });

  describe('createBoundingBox', () => {
    it('should create bounding box with correct values', () => {
      const b = createBoundingBox(10, 20, 30, 40);

      expect(b.minX).toBe(10);
      expect(b.minY).toBe(20);
      expect(b.maxX).toBe(30);
      expect(b.maxY).toBe(40);

      boundingBoxPool.release(b);
    });

    it('should use pooled objects', () => {
      const initialStats = boundingBoxPool.getStats();

      const b1 = createBoundingBox(0, 0, 10, 10);
      boundingBoxPool.release(b1);

      const b2 = createBoundingBox(5, 5, 15, 15);
      boundingBoxPool.release(b2);

      const finalStats = boundingBoxPool.getStats();
      expect(finalStats.totalCreated).toBe(initialStats.totalCreated);
    });
  });

  describe('pool statistics', () => {
    it('should track pool usage correctly', () => {
      const vectors = [
        vector2DPool.acquire(),
        vector2DPool.acquire(),
        vector2DPool.acquire(),
      ];

      const stats = vector2DPool.getStats();
      expect(stats.acquired).toBe(3);

      vector2DPool.releaseAll(vectors);

      const finalStats = vector2DPool.getStats();
      expect(finalStats.acquired).toBe(0);
      expect(finalStats.poolSize).toBeGreaterThanOrEqual(3);
    });
  });
});
