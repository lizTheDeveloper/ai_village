import { describe, it, expect, beforeEach } from 'vitest';
import { QueryCache } from '../QueryCache.js';
import { WorldImpl } from '../World.js';
import { EventBus } from '../../events/EventBus.js';
import type { Entity } from '../Entity.js';

function createTestWorld() {
  const eventBus = new EventBus();
  return new WorldImpl(eventBus);
}

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache(5); // Small cache for testing eviction
  });

  describe('basic caching', () => {
    it('should return null on cache miss', () => {
      const result = cache.get('position,agent', 1);
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should return cached results on cache hit', () => {
      const world = createTestWorld();
      const entity = world.createEntity();
      const entities: Entity[] = [entity];

      cache.set('position,agent', entities, 1, 100);

      const result = cache.get('position,agent', 1);
      expect(result).toBe(entities);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should track cache size correctly', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);
      expect(cache.getStats().size).toBe(1);

      cache.set('query2', [entity], 1, 100);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('version-based invalidation', () => {
    it('should invalidate cached results when version changes', () => {
      const world = createTestWorld();
      const entity = world.createEntity();
      const entities: Entity[] = [entity];

      // Cache at version 1
      cache.set('position,agent', entities, 1, 100);

      // Miss at version 2 (invalidated)
      const result = cache.get('position,agent', 2);
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.invalidations).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should track invalidations separately from regular misses', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);

      // Regular miss (never cached)
      cache.get('query2', 1);

      // Invalidation miss (version changed)
      cache.get('query1', 2);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2); // Both count as misses
      expect(stats.invalidations).toBe(1); // Only version mismatch counts as invalidation
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      // Fill cache to capacity (5 entries)
      cache.set('query1', [entity], 1, 100);
      cache.set('query2', [entity], 1, 200);
      cache.set('query3', [entity], 1, 300);
      cache.set('query4', [entity], 1, 400);
      cache.set('query5', [entity], 1, 500);

      expect(cache.getStats().size).toBe(5);

      // Add 6th entry - should evict query1 (oldest, tick 100)
      cache.set('query6', [entity], 1, 600);

      expect(cache.getStats().size).toBe(5); // Still at capacity
      expect(cache.get('query1', 1)).toBeNull(); // Evicted
      expect(cache.get('query6', 1)).not.toBeNull(); // New entry present
    });

    it('should not evict when updating existing entry', () => {
      const world = createTestWorld();
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      // Fill cache
      cache.set('query1', [entity1], 1, 100);
      cache.set('query2', [entity1], 1, 200);
      cache.set('query3', [entity1], 1, 300);
      cache.set('query4', [entity1], 1, 400);
      cache.set('query5', [entity1], 1, 500);

      // Update existing entry
      cache.set('query1', [entity2], 2, 600);

      expect(cache.getStats().size).toBe(5);
      expect(cache.get('query1', 2)).toEqual([entity2]);
    });
  });

  describe('statistics', () => {
    it('should calculate hit rate correctly', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);

      // 1 hit
      cache.get('query1', 1);

      // 1 miss
      cache.get('query2', 1);

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5); // 1 hit / 2 total = 50%
    });

    it('should return 0 hit rate when no accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should accumulate statistics over multiple operations', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);

      // 3 hits
      cache.get('query1', 1);
      cache.get('query1', 1);
      cache.get('query1', 1);

      // 2 misses
      cache.get('query2', 1);
      cache.get('query3', 1);

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6); // 3/5 = 60%
    });
  });

  describe('clear', () => {
    it('should clear all cached entries', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);
      cache.set('query2', [entity], 1, 200);

      expect(cache.getStats().size).toBe(2);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get('query1', 1)).toBeNull();
      expect(cache.get('query2', 1)).toBeNull();
    });

    it('should reset statistics on clear', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);
      cache.get('query1', 1); // Hit
      cache.get('query2', 1); // Miss

      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.invalidations).toBe(0);
    });
  });

  describe('multiple queries', () => {
    it('should cache different queries independently', () => {
      const world = createTestWorld();
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      cache.set('position,agent', [entity1], 1, 100);
      cache.set('building', [entity2], 1, 200);

      expect(cache.get('position,agent', 1)).toEqual([entity1]);
      expect(cache.get('building', 1)).toEqual([entity2]);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
    });

    it('should handle version changes for individual queries', () => {
      const world = createTestWorld();
      const entity = world.createEntity();

      cache.set('query1', [entity], 1, 100);
      cache.set('query2', [entity], 2, 200);

      // query1 invalidated at version 2
      expect(cache.get('query1', 2)).toBeNull();

      // query2 valid at version 2
      expect(cache.get('query2', 2)).not.toBeNull();
    });
  });
});
