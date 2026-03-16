/**
 * Tick Pipeline Performance Smoke Test
 *
 * Verifies that the GameLoop tick pipeline completes within acceptable time
 * bounds when running 50 agent entities through the hot-path systems.
 *
 * Assertions:
 *   - Median tick duration < 100ms
 *   - No single system exceeds 50ms per tick
 */

import { describe, it, expect } from 'vitest';

// Mock browser APIs not available in Node.js test environment
global.requestAnimationFrame = (_cb: FrameRequestCallback): number => 0;
global.cancelAnimationFrame = (_id: number): void => {};

import { GameLoop } from '../loop/GameLoop.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { NeedsSystem } from '../systems/NeedsSystem.js';

describe('Tick Pipeline Performance Smoke Test', () => {
  it('should complete 10 ticks with 50 agents under 100ms median', () => {
    const gameLoop = new GameLoop();

    // Register representative hot-path systems
    gameLoop.systemRegistry.register(new MovementSystem());
    gameLoop.systemRegistry.register(new NeedsSystem());

    // Create 50 agent entities with full component sets
    const world = gameLoop.world;
    for (let i = 0; i < 50; i++) {
      const entity = world.createEntity();
      world.addComponent(entity.id, { type: CT.Position, x: Math.random() * 100, y: Math.random() * 100, version: 0 } as any);
      world.addComponent(entity.id, { type: CT.Agent, name: `Robot ${i}`, description: 'Test robot', age: 1, isAlive: true, version: 0 } as any);
      world.addComponent(entity.id, { type: CT.Velocity, dx: Math.random(), dy: Math.random(), version: 0 } as any);
      world.addComponent(entity.id, { type: CT.Needs, hunger: 50, thirst: 50, energy: 50, social: 50, version: 0 } as any);
    }

    // Add a Time singleton entity (NeedsSystem requires it)
    const timeEntity = world.createEntity();
    world.addComponent(timeEntity.id, { type: CT.Time, tick: 0, hours: 12, days: 0, speedMultiplier: 1, isPaused: false, version: 0 } as any);

    // Run 10 ticks and measure each duration
    const tickTimes: number[] = [];
    for (let t = 0; t < 10; t++) {
      const start = performance.now();
      gameLoop.tick();
      tickTimes.push(performance.now() - start);
    }

    // Calculate median
    const sorted = [...tickTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;

    // Assert median tick duration is under 100ms
    expect(median).toBeLessThan(100);

    // Assert no individual system exceeded 50ms on any tick
    const stats = gameLoop.getStats();
    for (const [_systemId, systemStats] of stats.systemStats) {
      expect(systemStats.maxTickTimeMs).toBeLessThan(50);
    }
  });
});
