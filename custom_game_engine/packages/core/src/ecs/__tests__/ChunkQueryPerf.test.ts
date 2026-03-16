/**
 * Chunk Query Performance Test
 *
 * Validates that getEntitiesInChunk returns cached results
 * and avoids per-call Array.from() allocation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('getEntitiesInChunk Performance', () => {
  let world: World;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
  });

  it('should return frozen empty array for empty chunks (zero allocation)', () => {
    const result1 = world.getEntitiesInChunk(99, 99);
    const result2 = world.getEntitiesInChunk(99, 99);

    expect(result1).toHaveLength(0);
    // Same reference = no allocation
    expect(result1).toBe(result2);
    expect(Object.isFrozen(result1)).toBe(true);
  });

  it('should return cached array for populated chunks (one allocation)', () => {
    // Create entities in the same chunk
    for (let i = 0; i < 10; i++) {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Position,
        version: 1,
        x: 5 + i * 0.1,
        y: 5,
        z: 0,
        chunkX: 0,
        chunkY: 0,
      });
    }

    const result1 = world.getEntitiesInChunk(0, 0);
    const result2 = world.getEntitiesInChunk(0, 0);

    expect(result1).toHaveLength(10);
    // Same reference = cached, no second allocation
    expect(result1).toBe(result2);
  });

  it('should invalidate cache when entity is added to chunk', () => {
    const entity1 = world.createEntity();
    entity1.addComponent({
      type: CT.Position,
      version: 1,
      x: 5, y: 5, z: 0,
      chunkX: 0, chunkY: 0,
    });

    const result1 = world.getEntitiesInChunk(0, 0);
    expect(result1).toHaveLength(1);

    // Add another entity to same chunk
    const entity2 = world.createEntity();
    entity2.addComponent({
      type: CT.Position,
      version: 1,
      x: 6, y: 6, z: 0,
      chunkX: 0, chunkY: 0,
    });

    const result2 = world.getEntitiesInChunk(0, 0);
    expect(result2).toHaveLength(2);
    // Should be different reference (cache was invalidated)
    expect(result1).not.toBe(result2);
  });

  it('should handle rapid repeated queries efficiently', () => {
    // Create entities spread across chunks
    for (let i = 0; i < 50; i++) {
      const entity = world.createEntity();
      const chunkX = Math.floor(i / 10);
      entity.addComponent({
        type: CT.Position,
        version: 1,
        x: chunkX * 32 + 5,
        y: 5,
        z: 0,
        chunkX,
        chunkY: 0,
      });
    }

    // Simulate 3x3 chunk query pattern (like MovementSystem soft collision)
    const ITERATIONS = 1000;
    const start = performance.now();
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const entities = world.getEntitiesInChunk(2 + dx, dy);
          // Just iterate (typical usage pattern)
          for (const _id of entities) {
            // no-op
          }
        }
      }
    }
    const elapsed = performance.now() - start;

    // 9000 chunk queries should complete in <50ms (was much slower with Array.from per call)
    expect(elapsed).toBeLessThan(50);
  });
});
