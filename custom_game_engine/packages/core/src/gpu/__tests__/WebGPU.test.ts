/**
 * WebGPU tests - Verify GPU acceleration correctness
 *
 * These tests verify that GPU compute shaders produce correct results
 * compared to CPU SIMD implementations.
 *
 * Browser requirement: Chrome 113+ (May 2023)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WebGPUManager } from '../WebGPUManager.js';
import { GPUPositionIntegrator } from '../PositionIntegrator.js';
import { GPUProximityQuery } from '../ProximityQuery.js';
import { SIMDOps } from '../../utils/SIMD.js';

describe('WebGPU', () => {
  let gpuManager: WebGPUManager;
  let gpuAvailable = false;

  beforeAll(async () => {
    gpuManager = new WebGPUManager();
    gpuAvailable = await gpuManager.initialize();

    if (!gpuAvailable) {
      console.warn('[WebGPU Tests] Skipping - WebGPU not available (requires Chrome 113+)');
    }
  });

  describe('WebGPUManager', () => {
    it('should detect WebGPU availability', () => {
      expect(gpuManager.isInitialized()).toBe(gpuAvailable);
    });

    it('should provide GPU device if available', () => {
      if (gpuAvailable) {
        const device = gpuManager.getDevice();
        expect(device).toBeTruthy();
        expect(device?.limits).toBeTruthy();
      }
    });

    it('should provide GPU adapter if available', () => {
      if (gpuAvailable) {
        const adapter = gpuManager.getAdapter();
        expect(adapter).toBeTruthy();
      }
    });
  });

  describe('GPUPositionIntegrator', () => {
    it('should produce correct position updates (small batch)', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const integrator = new GPUPositionIntegrator(device);

      // Small test case: 10 entities
      const count = 10;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const velX = new Float32Array(count);
      const velY = new Float32Array(count);
      const speedMultipliers = new Float32Array(count);

      // Initialize
      for (let i = 0; i < count; i++) {
        posX[i] = i * 10;
        posY[i] = i * 10;
        velX[i] = 1.5;
        velY[i] = 2.0;
        speedMultipliers[i] = 0.016; // deltaTime * speedMultiplier
      }

      // Expected results (CPU SIMD)
      const expectedX = new Float32Array(count);
      const expectedY = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        expectedX[i] = posX[i];
        expectedY[i] = posY[i];
      }
      SIMDOps.fma(expectedX, expectedX, velX, 0.016, count);
      SIMDOps.fma(expectedY, expectedY, velY, 0.016, count);

      // GPU update
      await integrator.updatePositions(posX, posY, velX, velY, speedMultipliers, 1.0, count);

      // Verify results match CPU
      for (let i = 0; i < count; i++) {
        expect(posX[i]).toBeCloseTo(expectedX[i]!, 5);
        expect(posY[i]).toBeCloseTo(expectedY[i]!, 5);
      }

      integrator.destroy();
    });

    it('should produce correct position updates (large batch)', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const integrator = new GPUPositionIntegrator(device);

      // Large test case: 5,000 entities
      const count = 5000;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const velX = new Float32Array(count);
      const velY = new Float32Array(count);
      const speedMultipliers = new Float32Array(count);

      // Initialize with varying values
      for (let i = 0; i < count; i++) {
        posX[i] = Math.random() * 1000;
        posY[i] = Math.random() * 1000;
        velX[i] = (Math.random() - 0.5) * 5;
        velY[i] = (Math.random() - 0.5) * 5;
        speedMultipliers[i] = 0.016;
      }

      // Expected results (CPU SIMD)
      const expectedX = new Float32Array(count);
      const expectedY = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        expectedX[i] = posX[i];
        expectedY[i] = posY[i];
      }
      SIMDOps.fma(expectedX, expectedX, velX, 0.016, count);
      SIMDOps.fma(expectedY, expectedY, velY, 0.016, count);

      // GPU update
      await integrator.updatePositions(posX, posY, velX, velY, speedMultipliers, 1.0, count);

      // Verify results match CPU (with tolerance for floating point)
      let maxError = 0;
      for (let i = 0; i < count; i++) {
        const errorX = Math.abs(posX[i]! - expectedX[i]!);
        const errorY = Math.abs(posY[i]! - expectedY[i]!);
        maxError = Math.max(maxError, errorX, errorY);
      }

      // GPU should match CPU within floating point tolerance
      expect(maxError).toBeLessThan(0.0001);

      integrator.destroy();
    });

    it('should handle zero speed multipliers (sleeping entities)', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const integrator = new GPUPositionIntegrator(device);

      const count = 100;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const velX = new Float32Array(count);
      const velY = new Float32Array(count);
      const speedMultipliers = new Float32Array(count);

      // Initialize - half sleeping (speed 0), half moving
      for (let i = 0; i < count; i++) {
        posX[i] = i * 10;
        posY[i] = i * 10;
        velX[i] = 1.5;
        velY[i] = 2.0;
        speedMultipliers[i] = i % 2 === 0 ? 0 : 0.016; // Every other entity sleeping
      }

      const originalX = Float32Array.from(posX);
      const originalY = Float32Array.from(posY);

      // GPU update
      await integrator.updatePositions(posX, posY, velX, velY, speedMultipliers, 1.0, count);

      // Verify sleeping entities didn't move
      for (let i = 0; i < count; i++) {
        if (speedMultipliers[i] === 0) {
          expect(posX[i]).toBe(originalX[i]);
          expect(posY[i]).toBe(originalY[i]);
        } else {
          expect(posX[i]).not.toBe(originalX[i]);
          expect(posY[i]).not.toBe(originalY[i]);
        }
      }

      integrator.destroy();
    });
  });

  describe('GPUProximityQuery', () => {
    it('should find entities within radius', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const query = new GPUProximityQuery(device);

      // Test case: 100 entities in grid
      const count = 100;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const entityIds: string[] = [];

      // Place entities in 10x10 grid
      for (let i = 0; i < count; i++) {
        const x = (i % 10) * 10;
        const y = Math.floor(i / 10) * 10;
        posX[i] = x;
        posY[i] = y;
        entityIds.push(`entity_${i}`);
      }

      // Query center of grid with radius 15
      const queryX = 45;
      const queryY = 45;
      const radius = 15;

      const nearby = await query.findNearby(queryX, queryY, radius, posX, posY, entityIds, count);

      // Verify results
      // Should find entities within 15 units of (45, 45)
      // Expected: entities at (40, 40), (40, 50), (50, 40), (50, 50) = 4 entities
      // Plus center entity at (40, 40) or (50, 50) depending on grid alignment
      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.length).toBeLessThan(10); // Shouldn't find all entities

      // Verify all returned entities are actually within radius
      for (const entityId of nearby) {
        const index = entityIds.indexOf(entityId);
        const dx = posX[index]! - queryX;
        const dy = posY[index]! - queryY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeLessThanOrEqual(radius);
      }

      query.destroy();
    });

    it('should find no entities when radius is very small', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const query = new GPUProximityQuery(device);

      const count = 100;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const entityIds: string[] = [];

      // Place entities far from query point
      for (let i = 0; i < count; i++) {
        posX[i] = i * 100 + 1000;
        posY[i] = i * 100 + 1000;
        entityIds.push(`entity_${i}`);
      }

      // Query at origin with tiny radius
      const nearby = await query.findNearby(0, 0, 0.1, posX, posY, entityIds, count);

      expect(nearby.length).toBe(0);

      query.destroy();
    });

    it('should find all entities when radius is very large', async () => {
      if (!gpuAvailable) return;

      const device = gpuManager.getDevice();
      if (!device) return;

      const query = new GPUProximityQuery(device);

      const count = 50;
      const posX = new Float32Array(count);
      const posY = new Float32Array(count);
      const entityIds: string[] = [];

      // Place entities in small area
      for (let i = 0; i < count; i++) {
        posX[i] = (i % 10) * 2;
        posY[i] = Math.floor(i / 10) * 2;
        entityIds.push(`entity_${i}`);
      }

      // Query with huge radius
      const nearby = await query.findNearby(10, 5, 1000, posX, posY, entityIds, count);

      expect(nearby.length).toBe(count); // Should find all entities

      query.destroy();
    });
  });
});
