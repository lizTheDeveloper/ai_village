import { describe, it, expect } from 'vitest';
import { QueryCache } from '../../ecs/QueryCache.js';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import type { Entity } from '../../ecs/Entity.js';

/**
 * QueryCache Performance Under Archetype Churn
 *
 * Tests that the cache maintains high hit rates even when
 * entities are frequently added/removed (archetype version changes).
 *
 * The failure mode we're guarding against: invalidated entries
 * accumulating as "ghost" slots, reducing effective cache capacity
 * and degrading hit rate over time.
 */
describe('QueryCache Performance Under Churn', () => {
  function createTestWorld() {
    const eventBus = new EventBusImpl();
    return new World(eventBus);
  }

  it('should maintain cache capacity after repeated invalidations', () => {
    // With 10 cache slots, simulate 100 version changes
    // Each version change invalidates all entries.
    // After re-populating, all slots should be usable.
    const cache = new QueryCache(10);
    const world = createTestWorld();
    const entity = world.createEntity();
    const entities: Entity[] = [entity];

    const QUERY_COUNT = 10;
    const VERSION_CHANGES = 100;

    for (let version = 1; version <= VERSION_CHANGES; version++) {
      // Populate all slots at current version
      for (let q = 0; q < QUERY_COUNT; q++) {
        cache.set(`query_${q}`, entities, version, version * 100 + q);
      }

      // All should hit at current version
      let hits = 0;
      for (let q = 0; q < QUERY_COUNT; q++) {
        if (cache.get(`query_${q}`, version, version * 100 + q) !== null) {
          hits++;
        }
      }
      expect(hits).toBe(QUERY_COUNT);

      // Invalidate by accessing with next version (simulates archetype change)
      for (let q = 0; q < QUERY_COUNT; q++) {
        cache.get(`query_${q}`, version + 1, version * 100 + q);
      }
    }

    // After 100 version changes, cache should still accept all 10 entries
    const finalVersion = VERSION_CHANGES + 1;
    for (let q = 0; q < QUERY_COUNT; q++) {
      cache.set(`query_${q}`, entities, finalVersion, finalVersion * 100 + q);
    }

    const stats = cache.getStats();
    // Cache should hold exactly QUERY_COUNT entries (no ghost bloat)
    expect(stats.size).toBe(QUERY_COUNT);

    // Final hit rate check: all should hit
    let finalHits = 0;
    for (let q = 0; q < QUERY_COUNT; q++) {
      if (cache.get(`query_${q}`, finalVersion, finalVersion * 100 + q) !== null) {
        finalHits++;
      }
    }
    expect(finalHits).toBe(QUERY_COUNT);
  });

  it('should not degrade lookup performance under churn', () => {
    // Measures that cache.get() stays fast even after many invalidation cycles.
    // Ghost entries would cause LRU eviction scans on every set(),
    // degrading set() from O(1) to O(n).
    const cache = new QueryCache(50);
    const world = createTestWorld();
    const entity = world.createEntity();
    const entities: Entity[] = [entity];

    // Warm up: fill cache, invalidate, refill - 50 cycles
    for (let version = 1; version <= 50; version++) {
      for (let q = 0; q < 50; q++) {
        cache.set(`q${q}`, entities, version, version * 100);
      }
      // Force invalidation by accessing at next version
      for (let q = 0; q < 50; q++) {
        cache.get(`q${q}`, version + 1);
      }
    }

    // Now measure: 1000 set+get cycles should complete quickly
    const measureVersion = 100;
    const start = performance.now();
    const ITERATIONS = 1000;

    for (let i = 0; i < ITERATIONS; i++) {
      const v = measureVersion + i;
      for (let q = 0; q < 50; q++) {
        cache.set(`q${q}`, entities, v, v * 100);
      }
      // Invalidate all for next iteration
      for (let q = 0; q < 50; q++) {
        cache.get(`q${q}`, v + 1);
      }
    }

    const elapsed = performance.now() - start;
    const perCycle = elapsed / ITERATIONS;

    // 50 set + 50 get = 100 cache ops per cycle
    // Should complete in <1ms per cycle (100k ops/sec minimum)
    expect(perCycle).toBeLessThan(1.0);

    // Verify cache is clean (no ghost accumulation)
    const stats = cache.getStats();
    // After invalidation, cache should be empty (all entries deleted on miss)
    expect(stats.size).toBe(0);
  });

  it('should maintain >80% hit rate in steady-state with occasional archetype changes', () => {
    // Simulates real gameplay: 20 systems querying per tick,
    // archetype changes every ~10 ticks (entity spawn/despawn).
    const cache = new QueryCache(30);
    const world = createTestWorld();
    const entity = world.createEntity();
    const entities: Entity[] = [entity];

    const SYSTEMS = 20;
    const TICKS = 500;
    const ARCHETYPE_CHANGE_INTERVAL = 10; // Every 10 ticks

    let version = 1;

    for (let tick = 0; tick < TICKS; tick++) {
      // Archetype change every N ticks
      if (tick > 0 && tick % ARCHETYPE_CHANGE_INTERVAL === 0) {
        version++;
      }

      // Each system queries once per tick
      for (let s = 0; s < SYSTEMS; s++) {
        const sig = `system_${s}`;
        const result = cache.get(sig, version, tick);
        if (result === null) {
          // Cache miss — re-execute query and store
          cache.set(sig, entities, version, tick);
        }
      }
    }

    const stats = cache.getStats();

    // With 500 ticks, 20 systems = 10,000 total queries
    // Archetype changes every 10 ticks = 50 invalidation events
    // After each invalidation: 20 misses to refill
    // Expected misses: 50 * 20 = 1,000 (from invalidation) + 20 (initial fill)
    // Expected hits: 10,000 - 1,020 = 8,980
    // Expected hit rate: ~89.8%
    expect(stats.hitRate).toBeGreaterThan(0.80);

    // Should be closer to 90% with proper ghost cleanup
    expect(stats.hitRate).toBeGreaterThan(0.85);
  });
});
