/**
 * Pathfinding System Tests
 *
 * Tests both WASM and JavaScript implementations to ensure correctness.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { pathfindingSystem } from '../PathfindingSystem.js';
import { pathfindingJS } from '../PathfindingJS.js';
import type { PathPoint } from '../PathfindingWASM.js';

describe('PathfindingSystem', () => {
  beforeAll(async () => {
    // Initialize WASM module
    await pathfindingSystem.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      const impl = pathfindingSystem.getImplementation();
      expect(impl === 'wasm' || impl === 'js').toBe(true);
    });

    it('should report implementation type', () => {
      const impl = pathfindingSystem.getImplementation();
      if (pathfindingSystem.isWASMEnabled()) {
        expect(impl).toBe('wasm');
      } else {
        expect(impl).toBe('js');
      }
    });
  });

  describe('Basic Pathfinding', () => {
    it('should find straight path (no obstacles)', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight); // All walkable

      const path = pathfindingSystem.findPath(
        0, 0,  // Start
        5, 0,  // Goal
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 }); // Start
      expect(path[path.length - 1]).toEqual({ x: 5, y: 0 }); // Goal
      expect(path.length).toBe(6); // Optimal path: 6 cells
    });

    it('should find path with simple obstacle', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      // Create vertical wall at x=2 (except y=5)
      for (let y = 0; y < mapHeight; y++) {
        if (y !== 5) {
          obstacles[y * mapWidth + 2] = 1;
        }
      }

      const path = pathfindingSystem.findPath(
        0, 0,  // Start
        5, 0,  // Goal
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 }); // Start
      expect(path[path.length - 1]).toEqual({ x: 5, y: 0 }); // Goal

      // Path should go around wall through opening at y=5
      const hasOpeningCell = path.some(p => p.x === 2 && p.y === 5);
      expect(hasOpeningCell).toBe(true);
    });

    it('should return empty array when no path exists', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      // Create complete wall at x=2 (no opening)
      for (let y = 0; y < mapHeight; y++) {
        obstacles[y * mapWidth + 2] = 1;
      }

      const path = pathfindingSystem.findPath(
        0, 0,  // Start
        5, 0,  // Goal
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path).toEqual([]);
    });

    it('should handle start == goal', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      const path = pathfindingSystem.findPath(
        3, 3,  // Start
        3, 3,  // Goal (same)
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path.length).toBe(1);
      expect(path[0]).toEqual({ x: 3, y: 3 });
    });

    it('should handle goal blocked', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      obstacles[5 * mapWidth + 5] = 1; // Block goal

      const path = pathfindingSystem.findPath(
        0, 0,  // Start
        5, 5,  // Goal (blocked)
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path).toEqual([]);
    });
  });

  describe('Path Validation', () => {
    function isPathValid(
      path: PathPoint[],
      startX: number,
      startY: number,
      goalX: number,
      goalY: number,
      obstacles: Uint8Array,
      mapWidth: number,
      mapHeight: number
    ): boolean {
      if (path.length === 0) return false;

      // Check start and goal
      if (path[0].x !== startX || path[0].y !== startY) return false;
      if (path[path.length - 1].x !== goalX || path[path.length - 1].y !== goalY) return false;

      // Check all cells are walkable and adjacent
      for (let i = 0; i < path.length; i++) {
        const { x, y } = path[i];

        // In bounds?
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false;

        // Walkable?
        if (obstacles[y * mapWidth + x] === 1) return false;

        // Adjacent to previous? (4-directional)
        if (i > 0) {
          const prev = path[i - 1];
          const dx = Math.abs(x - prev.x);
          const dy = Math.abs(y - prev.y);

          // Must move exactly 1 cell in one direction
          if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // Valid
          } else {
            return false;
          }
        }
      }

      return true;
    }

    it('should produce valid paths', () => {
      const mapWidth = 20;
      const mapHeight = 20;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      // Create maze-like obstacles
      for (let y = 0; y < mapHeight; y += 3) {
        for (let x = 0; x < mapWidth; x += 2) {
          if (x < mapWidth - 1) {
            obstacles[y * mapWidth + x] = 1;
          }
        }
      }

      const path = pathfindingSystem.findPath(
        0, 0,
        19, 19,
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path.length).toBeGreaterThan(0);
      expect(isPathValid(path, 0, 0, 19, 19, obstacles, mapWidth, mapHeight)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should throw on invalid map size', () => {
      const obstacles = new Uint8Array(50); // Wrong size

      expect(() => {
        pathfindingSystem.findPath(0, 0, 5, 5, 10, 10, obstacles);
      }).toThrow();
    });

    it('should throw on start out of bounds', () => {
      const obstacles = new Uint8Array(100);

      expect(() => {
        pathfindingSystem.findPath(-1, 0, 5, 5, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(0, -1, 5, 5, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(10, 0, 5, 5, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(0, 10, 5, 5, 10, 10, obstacles);
      }).toThrow();
    });

    it('should throw on goal out of bounds', () => {
      const obstacles = new Uint8Array(100);

      expect(() => {
        pathfindingSystem.findPath(0, 0, -1, 5, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(0, 0, 5, -1, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(0, 0, 10, 5, 10, 10, obstacles);
      }).toThrow();

      expect(() => {
        pathfindingSystem.findPath(0, 0, 5, 10, 10, 10, obstacles);
      }).toThrow();
    });

    it('should handle large maps', () => {
      const mapWidth = 100;
      const mapHeight = 100;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      const path = pathfindingSystem.findPath(
        0, 0,
        99, 99,
        mapWidth,
        mapHeight,
        obstacles
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 99, y: 99 });
    });

    it('should respect maxPathLength option', () => {
      const mapWidth = 10;
      const mapHeight = 10;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      const path = pathfindingSystem.findPath(
        0, 0,
        9, 9,
        mapWidth,
        mapHeight,
        obstacles,
        { maxPathLength: 5 } // Limit to 5 cells
      );

      // Path might be truncated or empty if too long
      expect(path.length).toBeLessThanOrEqual(5);
    });
  });

  describe('WASM vs JS Consistency', () => {
    it('should produce same results for both implementations', () => {
      const mapWidth = 20;
      const mapHeight = 20;
      const obstacles = new Uint8Array(mapWidth * mapHeight);

      // Create obstacles
      for (let y = 5; y < 15; y++) {
        obstacles[y * mapWidth + 10] = 1;
      }
      obstacles[10 * mapWidth + 10] = 0; // Opening

      // Get WASM path (if available)
      const wasmPath = pathfindingSystem.findPath(
        0, 0,
        19, 19,
        mapWidth,
        mapHeight,
        obstacles
      );

      // Get JS path
      const jsPath = pathfindingJS.findPath(
        0, 0,
        19, 19,
        mapWidth,
        mapHeight,
        obstacles
      );

      // Both should find a path
      expect(wasmPath.length).toBeGreaterThan(0);
      expect(jsPath.length).toBeGreaterThan(0);

      // Paths might differ slightly but should be similar length
      // (A* can produce different valid paths with same cost)
      const lengthDiff = Math.abs(wasmPath.length - jsPath.length);
      expect(lengthDiff).toBeLessThanOrEqual(2); // Allow small variation

      // Both should start at start and end at goal
      expect(wasmPath[0]).toEqual({ x: 0, y: 0 });
      expect(wasmPath[wasmPath.length - 1]).toEqual({ x: 19, y: 19 });
      expect(jsPath[0]).toEqual({ x: 0, y: 0 });
      expect(jsPath[jsPath.length - 1]).toEqual({ x: 19, y: 19 });
    });
  });
});
