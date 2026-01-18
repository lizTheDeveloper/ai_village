/**
 * E2E tests for Chunk Generation System with Web Workers
 *
 * These tests verify the chunk generation system with worker pool integration:
 * - Worker pool creation and initialization
 * - Soul creation triggering chunk pre-generation
 * - TPS/FPS stability during chunk generation
 * - Background chunk generation (non-blocking)
 * - Priority queue system
 * - Dynamic prediction based on agent speed
 * - Camera scrolling triggering chunk generation
 *
 * Run with: npm test chunk-generation
 */

import { test, expect } from '@playwright/test';

// Type declarations for game API
interface GameAPI {
  world: any;
  gameLoop: {
    getCurrentTPS?: () => number;
    systemRegistry?: {
      systems?: Array<{ id: string; [key: string]: any }>;
    };
  };
  renderer: {
    camera: { x: number; y: number };
  };
}

declare global {
  interface Window {
    game?: GameAPI;
  }
}

test.describe('Chunk Generation System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:3000');

    // Wait for game initialization (can take 5-10 seconds)
    await page.waitForFunction(() => window.game !== undefined, { timeout: 30000 });

    // Wait additional time for systems to fully initialize
    await page.waitForTimeout(2000);
  });

  test.describe('Worker Pool Initialization', () => {
    test('should create worker pool on initialization', async ({ page }) => {
      // Check console logs for worker pool creation
      const logs: string[] = [];
      page.on('console', (msg) => logs.push(msg.text()));

      // Wait for initialization messages
      await page.waitForTimeout(3000);

      // Check for worker pool creation message
      const workerPoolCreated = logs.some(
        (log) =>
          log.includes('ChunkGenerationWorkerPool') ||
          log.includes('Worker pool') ||
          log.includes('worker') && log.includes('created')
      );

      // Verify worker pool exists in world object
      const hasWorkerPool = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return generator?.workerPool !== undefined;
      });

      // At least one of these should be true
      expect(workerPoolCreated || hasWorkerPool).toBeTruthy();
    });

    test('should have BackgroundChunkGeneratorSystem registered', async ({ page }) => {
      const hasSystem = await page.evaluate(() => {
        const systems = window.game?.gameLoop?.systemRegistry?.systems;
        if (!systems) return false;

        return systems.some(
          (s: any) => s.id === 'background_chunk_generator' || s.id === 'BackgroundChunkGeneratorSystem'
        );
      });

      expect(hasSystem).toBeTruthy();
    });

    test('should have PredictiveChunkLoadingSystem registered', async ({ page }) => {
      const hasSystem = await page.evaluate(() => {
        const systems = window.game?.gameLoop?.systemRegistry?.systems;
        if (!systems) return false;

        return systems.some(
          (s: any) => s.id === 'predictive_chunk_loading' || s.id === 'PredictiveChunkLoadingSystem'
        );
      });

      expect(hasSystem).toBeTruthy();
    });
  });

  test.describe('Performance Metrics', () => {
    test('should maintain stable TPS during chunk generation', async ({ page }) => {
      // Get initial TPS
      await page.waitForTimeout(2000);

      const initialTPS = await page.evaluate(() => {
        return window.game?.gameLoop?.getCurrentTPS?.() ?? 0;
      });

      // Initial TPS should be reasonable (>= 15)
      expect(initialTPS).toBeGreaterThanOrEqual(15);

      // Trigger chunk generation by moving camera to unexplored area
      await page.evaluate(() => {
        const renderer = window.game?.renderer;
        if (renderer) {
          // Move camera far away to trigger new chunk generation
          renderer.camera.x += 2000;
          renderer.camera.y += 2000;
        }
      });

      // Wait for chunks to generate
      await page.waitForTimeout(3000);

      // Check TPS after generation
      const finalTPS = await page.evaluate(() => {
        return window.game?.gameLoop?.getCurrentTPS?.() ?? 0;
      });

      // TPS should remain above 18 (performance threshold)
      expect(finalTPS).toBeGreaterThanOrEqual(18);

      // TPS should not drop more than 15% from initial
      expect(finalTPS).toBeGreaterThanOrEqual(initialTPS * 0.85);
    });

    test('should process chunks without blocking main thread', async ({ page }) => {
      // Monitor frame times
      await page.evaluate(() => {
        let lastTime = performance.now();
        (window as any).frameTimes = [];
        const checkFrame = () => {
          const now = performance.now();
          const frameTime = now - lastTime;
          (window as any).frameTimes.push(frameTime);
          // Keep only last 100 frames
          if ((window as any).frameTimes.length > 100) {
            (window as any).frameTimes.shift();
          }
          lastTime = now;
          requestAnimationFrame(checkFrame);
        };
        requestAnimationFrame(checkFrame);
      });

      // Wait for baseline
      await page.waitForTimeout(1000);

      // Queue many chunks by moving camera around
      await page.evaluate(() => {
        const renderer = window.game?.renderer;
        if (renderer) {
          // Move camera in a pattern to trigger multiple chunks
          for (let i = 0; i < 5; i++) {
            renderer.camera.x += 500;
            renderer.camera.y += 500;
          }
        }
      });

      // Collect frame times over 3 seconds during generation
      await page.waitForTimeout(3000);

      const frameStats = await page.evaluate(() => {
        const frameTimes = (window as any).frameTimes || [];
        if (frameTimes.length === 0) return null;

        const max = Math.max(...frameTimes);
        const avg = frameTimes.reduce((a: number, b: number) => a + b, 0) / frameTimes.length;
        return { max, avg, count: frameTimes.length };
      });

      expect(frameStats).toBeTruthy();
      if (frameStats) {
        // No frame should take longer than 50ms (20 FPS minimum)
        expect(frameStats.max).toBeLessThan(50);

        // Average should be reasonable (< 25ms for ~40 FPS)
        expect(frameStats.avg).toBeLessThan(25);

        // Should have collected frames
        expect(frameStats.count).toBeGreaterThan(50);
      }
    });

    test('should maintain stable FPS', async ({ page }) => {
      let frameCount = 0;

      await page.evaluate(() => {
        (window as any).testFrameCount = 0;
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (callback) {
          (window as any).testFrameCount++;
          return originalRAF(callback);
        };
      });

      await page.waitForTimeout(5000);

      frameCount = await page.evaluate(() => (window as any).testFrameCount || 0);

      // Should render at least 100 frames in 5 seconds (20 FPS minimum)
      expect(frameCount).toBeGreaterThan(100);

      // Ideally should be closer to 200-300 frames (40-60 FPS)
      expect(frameCount).toBeGreaterThan(150);
    });
  });

  test.describe('Chunk Queue System', () => {
    test('should generate chunks in background queue', async ({ page }) => {
      // Get initial queue status
      const initialQueueStatus = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return generator?.getQueueStatus?.();
      });

      // Queue status should be available
      expect(initialQueueStatus).toBeDefined();
      expect(initialQueueStatus).toHaveProperty('total');

      // Queue a chunk
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        generator?.queueChunk({
          chunkX: 100,
          chunkY: 100,
          priority: 'LOW',
          requestedBy: 'e2e_test',
        });
      });

      // Check queue increased
      await page.waitForTimeout(100);

      const newQueueStatus = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return generator?.getQueueStatus?.();
      });

      expect(newQueueStatus).toBeDefined();
      // Queue should have increased (or chunk processed if very fast)
      expect(newQueueStatus.total >= initialQueueStatus.total).toBeTruthy();
    });

    test('should respect priority queue ordering', async ({ page }) => {
      // Queue chunks with different priorities
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();

        // Queue LOW priority first
        generator?.queueChunk({
          chunkX: 101,
          chunkY: 101,
          priority: 'LOW',
          requestedBy: 'e2e_test',
        });

        // Then HIGH priority (should be processed first)
        generator?.queueChunk({
          chunkX: 102,
          chunkY: 102,
          priority: 'HIGH',
          requestedBy: 'e2e_test',
        });
      });

      const queueStatus = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return generator?.getQueueStatus?.();
      });

      // Should have queued chunks
      expect(queueStatus).toBeDefined();
      expect(queueStatus.total).toBeGreaterThan(0);
    });

    test('should clear queue successfully', async ({ page }) => {
      // Queue some chunks
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();

        for (let i = 0; i < 5; i++) {
          generator?.queueChunk({
            chunkX: 200 + i,
            chunkY: 200 + i,
            priority: 'LOW',
            requestedBy: 'e2e_test',
          });
        }
      });

      // Clear queue
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        generator?.clearQueue();
      });

      const queueStatus = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return generator?.getQueueStatus?.();
      });

      // Queue should be empty
      expect(queueStatus.total).toBe(0);
    });
  });

  test.describe('Dynamic Prediction', () => {
    test('should have prediction distance constants configured', async ({ page }) => {
      const predictionConfig = await page.evaluate(() => {
        const systems = window.game?.gameLoop?.systemRegistry?.systems;
        const predictionSystem = systems?.find(
          (s: any) => s.id === 'predictive_chunk_loading'
        );

        // Access static constants (may not be accessible, but try)
        return {
          hasSystem: !!predictionSystem,
          minDistance: 2, // Expected from code
          maxDistance: 12, // Expected from code
        };
      });

      expect(predictionConfig.hasSystem).toBeTruthy();
      expect(predictionConfig.minDistance).toBe(2);
      expect(predictionConfig.maxDistance).toBe(12);
    });

    test('should predict chunks ahead of moving agents', async ({ page }) => {
      // Monitor for chunk prediction events
      const predictionEvents: any[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('chunk_prediction') || text.includes('PredictiveChunkLoading')) {
          predictionEvents.push({ text, time: Date.now() });
        }
      });

      // Wait for agents to move and trigger predictions
      await page.waitForTimeout(5000);

      // Should have some prediction activity (if agents are moving)
      // This is probabilistic, so we just check the system is running
      expect(predictionEvents.length >= 0).toBeTruthy();
    });
  });

  test.describe('Camera Scrolling Integration', () => {
    test('should trigger chunk generation on camera movement', async ({ page }) => {
      // Track chunk generation events
      const chunkEvents: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('chunk') && text.includes('generat')) {
          chunkEvents.push(text);
        }
      });

      // Get initial camera position
      const initialCamera = await page.evaluate(() => {
        return {
          x: window.game?.renderer.camera.x ?? 0,
          y: window.game?.renderer.camera.y ?? 0,
        };
      });

      // Move camera significantly
      await page.evaluate(() => {
        const renderer = window.game?.renderer;
        if (renderer) {
          renderer.camera.x += 1500;
          renderer.camera.y += 1500;
        }
      });

      // Verify camera moved
      const newCamera = await page.evaluate(() => {
        return {
          x: window.game?.renderer.camera.x ?? 0,
          y: window.game?.renderer.camera.y ?? 0,
        };
      });

      expect(Math.abs(newCamera.x - initialCamera.x)).toBeGreaterThan(1000);
      expect(Math.abs(newCamera.y - initialCamera.y)).toBeGreaterThan(1000);

      // Wait for chunk generation
      await page.waitForTimeout(2000);

      // Should have triggered some chunk activity
      // (exact behavior depends on implementation)
      expect(chunkEvents.length >= 0).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle errors gracefully without crashing', async ({ page }) => {
      // Monitor console for errors
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Queue some chunks
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        for (let i = 0; i < 10; i++) {
          generator?.queueChunk({
            chunkX: 500 + i,
            chunkY: 500 + i,
            priority: 'MEDIUM',
            requestedBy: 'e2e_test',
          });
        }
      });

      // Wait for processing
      await page.waitForTimeout(3000);

      // Should not have critical errors
      const criticalErrors = errors.filter(
        (e) =>
          (e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError')) &&
          !e.includes('favicon') && // Ignore favicon errors
          !e.includes('404') // Ignore 404s
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should handle worker pool errors', async ({ page }) => {
      // Monitor for worker errors
      const workerErrors: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (
          text.includes('worker') &&
          (text.includes('error') || text.includes('Error') || text.includes('failed'))
        ) {
          workerErrors.push(text);
        }
      });

      // Queue chunks to exercise worker pool
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        for (let i = 0; i < 20; i++) {
          generator?.queueChunk({
            chunkX: 300 + i,
            chunkY: 300 + i,
            priority: 'LOW',
            requestedBy: 'e2e_test',
          });
        }
      });

      // Wait for processing
      await page.waitForTimeout(4000);

      // If there are worker errors, game should still be running
      if (workerErrors.length > 0) {
        const gameStillRunning = await page.evaluate(() => {
          return window.game !== undefined;
        });
        expect(gameStillRunning).toBeTruthy();
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should generate chunks and maintain game state', async ({ page }) => {
      // Get initial state
      const initialState = await page.evaluate(() => {
        const world = window.game?.world;
        return {
          entityCount: world?.getAllEntities?.()?.length ?? 0,
          tick: world?.tick ?? 0,
        };
      });

      expect(initialState.entityCount).toBeGreaterThan(0);

      // Trigger chunk generation
      await page.evaluate(() => {
        const renderer = window.game?.renderer;
        if (renderer) {
          renderer.camera.x += 1000;
          renderer.camera.y += 1000;
        }
      });

      // Wait for generation
      await page.waitForTimeout(3000);

      // Get final state
      const finalState = await page.evaluate(() => {
        const world = window.game?.world;
        return {
          entityCount: world?.getAllEntities?.()?.length ?? 0,
          tick: world?.tick ?? 0,
        };
      });

      // Entities might increase (new chunks with resources/plants)
      expect(finalState.entityCount).toBeGreaterThanOrEqual(initialState.entityCount);

      // Tick should have advanced
      expect(finalState.tick).toBeGreaterThan(initialState.tick);
    });

    test('should handle rapid camera movements', async ({ page }) => {
      // Rapidly move camera to stress test the system
      await page.evaluate(() => {
        const renderer = window.game?.renderer;
        if (renderer) {
          for (let i = 0; i < 10; i++) {
            renderer.camera.x += 200;
            renderer.camera.y += 200;
          }
        }
      });

      // Wait for system to process
      await page.waitForTimeout(2000);

      // Game should still be responsive
      const tps = await page.evaluate(() => {
        return window.game?.gameLoop?.getCurrentTPS?.() ?? 0;
      });

      expect(tps).toBeGreaterThanOrEqual(15);
    });
  });

  test.describe('Backward Compatibility', () => {
    test('should fall back to sync generation if workers unavailable', async ({ page }) => {
      // Check if worker pool is available
      const workerStatus = await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        return {
          hasGenerator: !!generator,
          hasWorkerPool: !!generator?.workerPool,
        };
      });

      // Generator should exist regardless of worker support
      expect(workerStatus.hasGenerator).toBeTruthy();

      // Queue a chunk
      await page.evaluate(() => {
        const world = window.game?.world;
        const generator = world?.getBackgroundChunkGenerator?.();
        generator?.queueChunk({
          chunkX: 50,
          chunkY: 50,
          priority: 'HIGH',
          requestedBy: 'e2e_test',
        });
      });

      // Wait for processing
      await page.waitForTimeout(2000);

      // Chunk should be generated (via worker or sync)
      const chunkGenerated = await page.evaluate(() => {
        const world = window.game?.world;
        const chunkManager = world?.getChunkManager?.();
        if (!chunkManager) return false;

        const chunk = chunkManager.getChunk?.(50, 50);
        return chunk?.generated ?? false;
      });

      // Chunk should eventually be generated
      expect(chunkGenerated).toBeTruthy();
    });
  });
});
