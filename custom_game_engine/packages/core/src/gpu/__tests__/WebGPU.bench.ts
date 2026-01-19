/**
 * WebGPU Performance Benchmarks
 *
 * Compares GPU compute shaders vs CPU SIMD for various batch sizes.
 *
 * Expected results:
 * - 1,000 entities: CPU faster (GPU transfer overhead)
 * - 10,000 entities: GPU 5-10x faster
 * - 50,000 entities: GPU 20-30x faster
 * - 100,000 entities: GPU 50-100x faster
 *
 * Browser requirement: Chrome 113+ (May 2023)
 */

import { describe, bench, beforeAll } from 'vitest';
import { WebGPUManager } from '../WebGPUManager.js';
import { GPUPositionIntegrator } from '../PositionIntegrator.js';
import { GPUProximityQuery } from '../ProximityQuery.js';
import { SIMDOps } from '../../utils/SIMD.js';

describe('WebGPU Performance', () => {
  let gpuManager: WebGPUManager;
  let gpuIntegrator: GPUPositionIntegrator;
  let gpuQuery: GPUProximityQuery;
  let gpuAvailable = false;

  const SIZES = [1000, 10000, 50000];

  beforeAll(async () => {
    gpuManager = new WebGPUManager();
    gpuAvailable = await gpuManager.initialize();

    if (!gpuAvailable) {
      console.warn('[WebGPU Benchmarks] Skipping - WebGPU not available (requires Chrome 113+)');
      return;
    }

    const device = gpuManager.getDevice();
    if (device) {
      gpuIntegrator = new GPUPositionIntegrator(device);
      gpuQuery = new GPUProximityQuery(device);
    }
  });

  // Position update benchmarks
  for (const size of SIZES) {
    describe(`Position Update: ${size.toLocaleString()} entities`, () => {
      let posX: Float32Array;
      let posY: Float32Array;
      let velX: Float32Array;
      let velY: Float32Array;
      let speedMultipliers: Float32Array;

      beforeAll(() => {
        // Initialize test data
        posX = new Float32Array(size);
        posY = new Float32Array(size);
        velX = new Float32Array(size);
        velY = new Float32Array(size);
        speedMultipliers = new Float32Array(size);

        for (let i = 0; i < size; i++) {
          posX[i] = Math.random() * 1000;
          posY[i] = Math.random() * 1000;
          velX[i] = (Math.random() - 0.5) * 5;
          velY[i] = (Math.random() - 0.5) * 5;
          speedMultipliers[i] = 0.016;
        }
      });

      bench('CPU SIMD', () => {
        // CPU SIMD path (Tier 3)
        const tempX = new Float32Array(size);
        const tempY = new Float32Array(size);

        SIMDOps.multiplyArrays(tempX, velX, speedMultipliers, size);
        SIMDOps.multiplyArrays(tempY, velY, speedMultipliers, size);

        SIMDOps.addArrays(posX, posX, tempX, size);
        SIMDOps.addArrays(posY, posY, tempY, size);
      });

      bench('GPU', async () => {
        if (!gpuAvailable || !gpuIntegrator) return;

        // GPU path (Tier 4)
        await gpuIntegrator.updatePositions(
          posX,
          posY,
          velX,
          velY,
          speedMultipliers,
          1.0,
          size
        );
      });
    });
  }

  // Proximity query benchmarks
  for (const size of SIZES) {
    describe(`Proximity Query: ${size.toLocaleString()} entities`, () => {
      let posX: Float32Array;
      let posY: Float32Array;
      let entityIds: string[];
      const queryX = 500;
      const queryY = 500;
      const radius = 50;

      beforeAll(() => {
        // Initialize test data
        posX = new Float32Array(size);
        posY = new Float32Array(size);
        entityIds = [];

        for (let i = 0; i < size; i++) {
          posX[i] = Math.random() * 1000;
          posY[i] = Math.random() * 1000;
          entityIds.push(`entity_${i}`);
        }
      });

      bench('CPU SIMD', () => {
        // CPU SIMD path
        const radiusSq = radius * radius;
        const nearby: string[] = [];

        const dx = new Float32Array(size);
        const dy = new Float32Array(size);
        const distSq = new Float32Array(size);

        // Compute deltas
        for (let i = 0; i < size; i++) {
          dx[i] = posX[i]! - queryX;
          dy[i] = posY[i]! - queryY;
        }

        // Compute distance squared (SIMD)
        SIMDOps.distanceSquared(distSq, dx, dy, size);

        // Filter (scalar)
        for (let i = 0; i < size; i++) {
          if (distSq[i]! < radiusSq) {
            nearby.push(entityIds[i]!);
          }
        }
      });

      bench('GPU', async () => {
        if (!gpuAvailable || !gpuQuery) return;

        // GPU path
        await gpuQuery.findNearby(queryX, queryY, radius, posX, posY, entityIds, size);
      });
    });
  }

  // Scaling test: vary entity count to show GPU advantage
  describe('Scaling Analysis', () => {
    const scalingSizes = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];

    for (const size of scalingSizes) {
      bench(`CPU SIMD: ${size.toLocaleString()} entities`, () => {
        const posX = new Float32Array(size);
        const posY = new Float32Array(size);
        const velX = new Float32Array(size);
        const velY = new Float32Array(size);
        const speedMultipliers = new Float32Array(size);
        const tempX = new Float32Array(size);
        const tempY = new Float32Array(size);

        for (let i = 0; i < size; i++) {
          posX[i] = i * 10;
          posY[i] = i * 10;
          velX[i] = 1.5;
          velY[i] = 2.0;
          speedMultipliers[i] = 0.016;
        }

        SIMDOps.multiplyArrays(tempX, velX, speedMultipliers, size);
        SIMDOps.multiplyArrays(tempY, velY, speedMultipliers, size);
        SIMDOps.addArrays(posX, posX, tempX, size);
        SIMDOps.addArrays(posY, posY, tempY, size);
      });

      bench(`GPU: ${size.toLocaleString()} entities`, async () => {
        if (!gpuAvailable || !gpuIntegrator) return;

        const posX = new Float32Array(size);
        const posY = new Float32Array(size);
        const velX = new Float32Array(size);
        const velY = new Float32Array(size);
        const speedMultipliers = new Float32Array(size);

        for (let i = 0; i < size; i++) {
          posX[i] = i * 10;
          posY[i] = i * 10;
          velX[i] = 1.5;
          velY[i] = 2.0;
          speedMultipliers[i] = 0.016;
        }

        await gpuIntegrator.updatePositions(
          posX,
          posY,
          velX,
          velY,
          speedMultipliers,
          1.0,
          size
        );
      });
    }
  });
});
