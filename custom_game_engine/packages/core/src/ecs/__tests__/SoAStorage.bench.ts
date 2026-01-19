import { describe, bench } from 'vitest';
import { PositionSoA, VelocitySoA } from '../SoAStorage.js';
import type { PositionComponent } from '../../components/PositionComponent.js';

/**
 * Performance benchmarks comparing AoS (Array-of-Structures) vs SoA (Structure-of-Arrays).
 *
 * Expected results:
 * - SoA should be 1.5-2x faster for batch operations (cache locality)
 * - SoA should have smaller memory footprint (no object overhead)
 * - SoA should enable SIMD vectorization potential
 */

describe('SoA Performance Benchmarks', () => {
  const ENTITY_COUNT = 1000;

  // Setup test data
  const entityIds = Array.from({ length: ENTITY_COUNT }, (_, i) => `entity${i}`);
  const positionData = Array.from({ length: ENTITY_COUNT }, (_, i) => ({
    x: i,
    y: i * 2,
    z: 0,
    chunkX: Math.floor(i / 32),
    chunkY: Math.floor((i * 2) / 32),
  }));
  const velocityData = Array.from({ length: ENTITY_COUNT }, (_, i) => ({
    vx: i * 0.5,
    vy: i * 1.5,
  }));

  describe('Position Updates', () => {
    bench('AoS: Update 1000 positions', () => {
      // Traditional Array-of-Structures approach
      const positions: PositionComponent[] = entityIds.map((_, i) => ({
        type: 'position',
        version: 1,
        x: positionData[i]!.x,
        y: positionData[i]!.y,
        z: positionData[i]!.z,
        chunkX: positionData[i]!.chunkX,
        chunkY: positionData[i]!.chunkY,
      }));

      // Simulate velocity integration
      const deltaX = 1.5;
      const deltaY = 2.0;
      for (let i = 0; i < positions.length; i++) {
        positions[i]!.x += deltaX;
        positions[i]!.y += deltaY;
        positions[i]!.chunkX = Math.floor(positions[i]!.x / 32);
        positions[i]!.chunkY = Math.floor(positions[i]!.y / 32);
      }
    });

    bench('SoA: Update 1000 positions', () => {
      // Structure-of-Arrays approach
      const soa = new PositionSoA(ENTITY_COUNT);

      // Add all positions
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        soa.add(entityIds[i]!, pos.x, pos.y, pos.z, pos.chunkX, pos.chunkY);
      }

      // Batch update via direct array access
      const arrays = soa.getArrays();
      const deltaX = 1.5;
      const deltaY = 2.0;
      for (let i = 0; i < arrays.count; i++) {
        arrays.xs[i] += deltaX;
        arrays.ys[i] += deltaY;
        arrays.chunkXs[i] = Math.floor(arrays.xs[i]! / 32);
        arrays.chunkYs[i] = Math.floor(arrays.ys[i]! / 32);
      }
    });
  });

  describe('Velocity Integration', () => {
    bench('AoS: Integrate 1000 velocities', () => {
      // Traditional approach with separate position and velocity objects
      const positions: Array<{ x: number; y: number }> = positionData.map((p) => ({
        x: p.x,
        y: p.y,
      }));
      const velocities: Array<{ vx: number; vy: number }> = velocityData.map((v) => ({
        vx: v.vx,
        vy: v.vy,
      }));

      // Velocity integration
      const deltaTime = 0.05; // 50ms frame
      for (let i = 0; i < positions.length; i++) {
        positions[i]!.x += velocities[i]!.vx * deltaTime;
        positions[i]!.y += velocities[i]!.vy * deltaTime;
      }
    });

    bench('SoA: Integrate 1000 velocities', () => {
      // Structure-of-Arrays approach
      const positionSoA = new PositionSoA(ENTITY_COUNT);
      const velocitySoA = new VelocitySoA(ENTITY_COUNT);

      // Setup
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        const vel = velocityData[i]!;
        positionSoA.add(entityIds[i]!, pos.x, pos.y, pos.z, pos.chunkX, pos.chunkY);
        velocitySoA.add(entityIds[i]!, vel.vx, vel.vy);
      }

      // Batch integration
      const posArrays = positionSoA.getArrays();
      const velArrays = velocitySoA.getArrays();
      const deltaTime = 0.05;

      for (let i = 0; i < velArrays.count; i++) {
        posArrays.xs[i] += velArrays.vxs[i]! * deltaTime;
        posArrays.ys[i] += velArrays.vys[i]! * deltaTime;
      }
    });
  });

  describe('Random Access', () => {
    bench('AoS: Random access 1000 lookups', () => {
      // Traditional approach using Map for entity lookup
      const positionMap = new Map<string, PositionComponent>();
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        positionMap.set(entityIds[i]!, {
          type: 'position',
          version: 1,
          ...pos,
        });
      }

      // Random lookups
      let sum = 0;
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionMap.get(entityIds[i]!);
        if (pos) {
          sum += pos.x + pos.y;
        }
      }
    });

    bench('SoA: Random access 1000 lookups', () => {
      // SoA approach with entity index map
      const soa = new PositionSoA(ENTITY_COUNT);
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        soa.add(entityIds[i]!, pos.x, pos.y, pos.z, pos.chunkX, pos.chunkY);
      }

      // Random lookups
      let sum = 0;
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = soa.get(entityIds[i]!);
        if (pos) {
          sum += pos.x + pos.y;
        }
      }
    });
  });

  describe('Add/Remove Operations', () => {
    bench('AoS: Add/remove 100 items', () => {
      // Traditional approach using Map
      const positionMap = new Map<string, PositionComponent>();

      // Add
      for (let i = 0; i < 100; i++) {
        const pos = positionData[i]!;
        positionMap.set(entityIds[i]!, {
          type: 'position',
          version: 1,
          ...pos,
        });
      }

      // Remove
      for (let i = 0; i < 50; i++) {
        positionMap.delete(entityIds[i]!);
      }
    });

    bench('SoA: Add/remove 100 items', () => {
      // SoA approach
      const soa = new PositionSoA(100);

      // Add
      for (let i = 0; i < 100; i++) {
        const pos = positionData[i]!;
        soa.add(entityIds[i]!, pos.x, pos.y, pos.z, pos.chunkX, pos.chunkY);
      }

      // Remove
      for (let i = 0; i < 50; i++) {
        soa.remove(entityIds[i]!);
      }
    });
  });

  describe('Memory Footprint (Proxy)', () => {
    // Note: These benchmarks measure allocation speed as a proxy for memory footprint
    // Lower times suggest less memory allocation overhead

    bench('AoS: Create 1000 position objects', () => {
      const positions: PositionComponent[] = [];
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        positions.push({
          type: 'position',
          version: 1,
          ...pos,
        });
      }
    });

    bench('SoA: Create storage for 1000 positions', () => {
      const soa = new PositionSoA(ENTITY_COUNT);
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const pos = positionData[i]!;
        soa.add(entityIds[i]!, pos.x, pos.y, pos.z, pos.chunkX, pos.chunkY);
      }
    });
  });
});
