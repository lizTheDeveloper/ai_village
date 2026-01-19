import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectPool } from '../ObjectPool.js';

interface TestObject {
  x: number;
  y: number;
  name: string;
}

describe('ObjectPool', () => {
  let pool: ObjectPool<TestObject>;
  let factoryCalls: number;
  let resetCalls: number;

  beforeEach(() => {
    factoryCalls = 0;
    resetCalls = 0;

    pool = new ObjectPool<TestObject>(
      () => {
        factoryCalls++;
        return { x: 0, y: 0, name: '' };
      },
      (obj) => {
        resetCalls++;
        obj.x = 0;
        obj.y = 0;
        obj.name = '';
      },
      0
    );
  });

  describe('acquire', () => {
    it('should create new object when pool is empty', () => {
      const obj = pool.acquire();

      expect(obj).toBeDefined();
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(factoryCalls).toBe(1);
    });

    it('should reuse objects from pool', () => {
      const obj1 = pool.acquire();
      obj1.x = 10;
      obj1.y = 20;
      obj1.name = 'test';

      pool.release(obj1);

      const obj2 = pool.acquire();

      expect(obj2).toBe(obj1);
      expect(obj2.x).toBe(0);
      expect(obj2.y).toBe(0);
      expect(obj2.name).toBe('');
      expect(factoryCalls).toBe(1);
    });

    it('should update acquired count', () => {
      pool.acquire();
      expect(pool.getStats().acquired).toBe(1);

      pool.acquire();
      expect(pool.getStats().acquired).toBe(2);
    });
  });

  describe('release', () => {
    it('should return object to pool', () => {
      const obj = pool.acquire();
      pool.release(obj);

      const stats = pool.getStats();
      expect(stats.poolSize).toBe(1);
      expect(stats.acquired).toBe(0);
    });

    it('should call reset function', () => {
      const obj = pool.acquire();
      obj.x = 42;
      obj.y = 99;

      pool.release(obj);

      expect(resetCalls).toBe(1);
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
    });

    it('should decrement acquired count', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();

      expect(pool.getStats().acquired).toBe(2);

      pool.release(obj1);
      expect(pool.getStats().acquired).toBe(1);

      pool.release(obj2);
      expect(pool.getStats().acquired).toBe(0);
    });
  });

  describe('releaseAll', () => {
    it('should release multiple objects at once', () => {
      const objects = [
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
      ];

      pool.releaseAll(objects);

      const stats = pool.getStats();
      expect(stats.poolSize).toBe(3);
      expect(stats.acquired).toBe(0);
      expect(resetCalls).toBe(3);
    });

    it('should handle empty array', () => {
      pool.releaseAll([]);

      const stats = pool.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.acquired).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();

      let stats = pool.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.acquired).toBe(2);
      expect(stats.totalCreated).toBe(2);

      pool.release(obj1);

      stats = pool.getStats();
      expect(stats.poolSize).toBe(1);
      expect(stats.acquired).toBe(1);
      expect(stats.totalCreated).toBe(2);

      pool.release(obj2);

      stats = pool.getStats();
      expect(stats.poolSize).toBe(2);
      expect(stats.acquired).toBe(0);
      expect(stats.totalCreated).toBe(2);
    });
  });

  describe('clear', () => {
    it('should empty the pool', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      pool.release(obj1);
      pool.release(obj2);

      expect(pool.getStats().poolSize).toBe(2);

      pool.clear();

      const stats = pool.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.acquired).toBe(0);
    });

    it('should allow pool to grow again after clear', () => {
      pool.acquire();
      pool.clear();

      const obj = pool.acquire();
      expect(obj).toBeDefined();
    });
  });

  describe('prewarm', () => {
    it('should pre-allocate objects', () => {
      const newPool = new ObjectPool<TestObject>(
        () => ({ x: 0, y: 0, name: '' }),
        (obj) => { obj.x = 0; obj.y = 0; obj.name = ''; },
        10
      );

      const stats = newPool.getStats();
      expect(stats.poolSize).toBe(10);
      expect(stats.totalCreated).toBe(10);
    });

    it('should allow additional prewarming', () => {
      pool.prewarm(5);

      let stats = pool.getStats();
      expect(stats.poolSize).toBe(5);

      pool.prewarm(3);

      stats = pool.getStats();
      expect(stats.poolSize).toBe(8);
    });
  });

  describe('automatic growth', () => {
    it('should grow pool when demand exceeds capacity', () => {
      const objects: TestObject[] = [];

      for (let i = 0; i < 100; i++) {
        objects.push(pool.acquire());
      }

      expect(pool.getStats().totalCreated).toBe(100);

      pool.releaseAll(objects);

      expect(pool.getStats().poolSize).toBe(100);

      for (let i = 0; i < 100; i++) {
        pool.acquire();
      }

      expect(pool.getStats().totalCreated).toBe(100);
    });
  });

  describe('reset function behavior', () => {
    it('should reset object state before returning from pool', () => {
      const obj = pool.acquire();
      obj.x = 123;
      obj.y = 456;
      obj.name = 'dirty';

      pool.release(obj);

      const reused = pool.acquire();
      expect(reused.x).toBe(0);
      expect(reused.y).toBe(0);
      expect(reused.name).toBe('');
    });
  });

  describe('memory efficiency', () => {
    it('should reuse objects instead of creating new ones', () => {
      pool.prewarm(10);

      const initialCreated = pool.getStats().totalCreated;

      for (let i = 0; i < 1000; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }

      expect(pool.getStats().totalCreated).toBe(initialCreated);
    });
  });
});
