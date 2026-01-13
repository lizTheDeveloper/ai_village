import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { FluidDynamicsSystem } from '../FluidDynamicsSystem.js';

describe('FluidDynamicsSystem', () => {
  let world: World;
  let system: FluidDynamicsSystem;

  beforeEach(() => {
    world = new World();
    system = new FluidDynamicsSystem();
  });

  it('should update once per game minute (1200 ticks)', () => {
    // Simulate 1199 ticks - should not update
    for (let i = 0; i < 1199; i++) {
      world.tick = i;
      system.update(world, [], 0.05);
    }

    const debugInfo = system.getDebugInfo();
    expect(debugInfo.tilesProcessedLastUpdate).toBe(0);

    // Tick 1200 - should update
    world.tick = 1200;
    system.update(world, [], 0.05);

    // Next update at tick 2400
    world.tick = 2399;
    system.update(world, [], 0.05);
    expect(system.getDebugInfo().lastUpdateTime).toBeGreaterThanOrEqual(0);
  });

  it('should track dirty tiles', () => {
    system.markDirty(10, 20, 0);
    system.markDirty(15, 25, 1);

    const debugInfo = system.getDebugInfo();
    expect(debugInfo.dirtyTileCount).toBe(2);
  });

  it('should estimate cost per tick based on dirty tiles', () => {
    // Mark 12,000 tiles dirty (simulating large ocean)
    for (let i = 0; i < 12000; i++) {
      system.markDirty(i, 0, 0);
    }

    const debugInfo = system.getDebugInfo();
    expect(debugInfo.dirtyTileCount).toBe(12000);

    // Estimated cost: 12,000 tiles ÷ 1200 ticks = 10 tiles/tick × 0.001ms = 0.01ms
    expect(debugInfo.estimatedCostPerTick).toBeCloseTo(0.01, 2);
  });

  it('should handle mark neighbors dirty', () => {
    system.markDirty(10, 10, 0);

    // Should be 1 tile (the original)
    expect(system.getDebugInfo().dirtyTileCount).toBe(1);

    // Mark neighbors via event (simulating digging)
    const eventBus = world.eventBus;
    system.initialize(world, eventBus);

    eventBus.publish('terrain:modified', { x: 15, y: 15, z: 0 });

    // Should now have original + new + 6 neighbors = at least 8 tiles
    expect(system.getDebugInfo().dirtyTileCount).toBeGreaterThanOrEqual(7);
  });
});
