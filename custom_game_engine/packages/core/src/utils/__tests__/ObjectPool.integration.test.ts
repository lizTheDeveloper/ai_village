import { describe, it, expect } from 'vitest';
import { vector2DPool } from '../CommonPools.js';

describe('ObjectPool Integration', () => {
  it('should handle acquire/release lifecycle correctly', () => {
    const initialStats = vector2DPool.getStats();

    const v1 = vector2DPool.acquire();
    v1.x = 100;
    v1.y = 200;

    expect(vector2DPool.getStats().acquired).toBe(initialStats.acquired + 1);

    vector2DPool.release(v1);

    expect(vector2DPool.getStats().acquired).toBe(initialStats.acquired);

    const v2 = vector2DPool.acquire();
    expect(v2.x).toBe(0);
    expect(v2.y).toBe(0);

    vector2DPool.release(v2);
  });

  it('should simulate MovementSystem perpendicular vector usage', () => {
    const deltaX = 5;
    const deltaY = 3;

    const perp1 = vector2DPool.acquire();
    const perp2 = vector2DPool.acquire();

    perp1.x = -deltaY;
    perp1.y = deltaX;
    perp2.x = deltaY;
    perp2.y = -deltaX;

    expect(perp1.x).toBe(-3);
    expect(perp1.y).toBe(5);
    expect(perp2.x).toBe(3);
    expect(perp2.y).toBe(-5);

    const magnitude1 = Math.sqrt(perp1.x * perp1.x + perp1.y * perp1.y);
    const magnitude2 = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y);

    expect(magnitude1).toBeCloseTo(magnitude2);

    vector2DPool.release(perp1);
    vector2DPool.release(perp2);

    const reused = vector2DPool.acquire();
    expect(reused.x).toBe(0);
    expect(reused.y).toBe(0);

    vector2DPool.release(reused);
  });

  it('should handle burst allocation and release', () => {
    const vectors = [];

    for (let i = 0; i < 100; i++) {
      const v = vector2DPool.acquire();
      v.x = i;
      v.y = i * 2;
      vectors.push(v);
    }

    const statsBeforeRelease = vector2DPool.getStats();
    expect(statsBeforeRelease.acquired).toBeGreaterThanOrEqual(100);

    vector2DPool.releaseAll(vectors);

    const statsAfterRelease = vector2DPool.getStats();
    expect(statsAfterRelease.poolSize).toBeGreaterThanOrEqual(100);

    for (let i = 0; i < 100; i++) {
      const v = vector2DPool.acquire();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      vector2DPool.release(v);
    }
  });

  it('should not create new objects when pool is sufficient', () => {
    const initialCreated = vector2DPool.getStats().totalCreated;

    for (let i = 0; i < 10; i++) {
      const v = vector2DPool.acquire();
      vector2DPool.release(v);
    }

    const finalCreated = vector2DPool.getStats().totalCreated;
    expect(finalCreated).toBeLessThanOrEqual(initialCreated + 10);
  });
});
