/**
 * Pathfinding Performance Benchmarks
 *
 * Compares WASM vs JavaScript implementation performance.
 *
 * Expected speedup:
 * - Simple paths (< 10 cells): ~1.2x
 * - Medium paths (10-50 cells): ~1.5x
 * - Complex paths (50-200 cells): ~2-3x
 */

import { describe, bench, beforeAll } from 'vitest';
import { pathfindingSystem } from '../PathfindingSystem.js';
import { pathfindingWASM } from '../PathfindingWASM.js';
import { pathfindingJS } from '../PathfindingJS.js';

describe('Pathfinding Performance', () => {
  beforeAll(async () => {
    await pathfindingSystem.initialize();
  });

  describe('Short Path (10 cells)', () => {
    const mapWidth = 20;
    const mapHeight = 20;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    bench('JavaScript: Short path', () => {
      pathfindingJS.findPath(0, 0, 10, 0, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: Short path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 10, 0, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): Short path', () => {
      pathfindingSystem.findPath(0, 0, 10, 0, mapWidth, mapHeight, obstacles);
    });
  });

  describe('Medium Path (30 cells)', () => {
    const mapWidth = 50;
    const mapHeight = 50;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    bench('JavaScript: Medium path', () => {
      pathfindingJS.findPath(0, 0, 30, 0, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: Medium path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 30, 0, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): Medium path', () => {
      pathfindingSystem.findPath(0, 0, 30, 0, mapWidth, mapHeight, obstacles);
    });
  });

  describe('Long Path (100 cells)', () => {
    const mapWidth = 100;
    const mapHeight = 100;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    bench('JavaScript: Long path', () => {
      pathfindingJS.findPath(0, 0, 99, 0, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: Long path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 99, 0, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): Long path', () => {
      pathfindingSystem.findPath(0, 0, 99, 0, mapWidth, mapHeight, obstacles);
    });
  });

  describe('Complex Path with Obstacles (50-100 cells)', () => {
    const mapWidth = 100;
    const mapHeight = 100;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    // Create maze-like obstacles
    for (let y = 10; y < 90; y += 10) {
      for (let x = 0; x < mapWidth; x++) {
        if (x % 20 !== 10) { // Leave openings
          obstacles[y * mapWidth + x] = 1;
        }
      }
    }

    bench('JavaScript: Complex path', () => {
      pathfindingJS.findPath(0, 0, 99, 99, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: Complex path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 99, 99, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): Complex path', () => {
      pathfindingSystem.findPath(0, 0, 99, 99, mapWidth, mapHeight, obstacles);
    });
  });

  describe('Very Complex Path (200+ cells)', () => {
    const mapWidth = 200;
    const mapHeight = 200;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    // Create dense maze
    for (let y = 0; y < mapHeight; y += 5) {
      for (let x = 0; x < mapWidth; x += 3) {
        if ((x + y) % 7 !== 0) { // Leave some openings
          obstacles[y * mapWidth + x] = 1;
        }
      }
    }

    bench('JavaScript: Very complex path', () => {
      pathfindingJS.findPath(0, 0, 199, 199, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: Very complex path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 199, 199, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): Very complex path', () => {
      pathfindingSystem.findPath(0, 0, 199, 199, mapWidth, mapHeight, obstacles);
    });
  });

  describe('Worst Case: No Path (exhaustive search)', () => {
    const mapWidth = 50;
    const mapHeight = 50;
    const obstacles = new Uint8Array(mapWidth * mapHeight);

    // Create wall separating start and goal
    for (let y = 0; y < mapHeight; y++) {
      obstacles[y * mapWidth + 25] = 1;
    }

    bench('JavaScript: No path', () => {
      pathfindingJS.findPath(0, 0, 49, 49, mapWidth, mapHeight, obstacles);
    });

    bench('WASM: No path', () => {
      if (pathfindingWASM.isInitialized()) {
        pathfindingWASM.findPath(0, 0, 49, 49, mapWidth, mapHeight, obstacles);
      }
    });

    bench('System (auto): No path', () => {
      pathfindingSystem.findPath(0, 0, 49, 49, mapWidth, mapHeight, obstacles);
    });
  });
});
