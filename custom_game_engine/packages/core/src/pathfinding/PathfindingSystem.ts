/**
 * Pathfinding System
 *
 * Provides high-performance A* pathfinding using WebAssembly with automatic
 * fallback to JavaScript implementation.
 *
 * Usage:
 *   const path = await pathfindingSystem.findPath(startX, startY, goalX, goalY, obstacles);
 *
 * Expected performance:
 *   - Simple paths (< 10 cells): ~1.2x speedup with WASM
 *   - Medium paths (10-50 cells): ~1.5x speedup with WASM
 *   - Complex paths (50-200 cells): ~2-3x speedup with WASM
 */

import { PathfindingWASM, pathfindingWASM, type PathPoint, type PathfindingOptions } from './PathfindingWASM.js';
import { PathfindingJS, pathfindingJS } from './PathfindingJS.js';

export { PathPoint, PathfindingOptions };

export class PathfindingSystem {
  private wasmEnabled = false;
  private wasmInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize pathfinding system
   * Attempts to load WASM module, falls back to JS if it fails
   */
  async initialize(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeInternal();
    return this.initializationPromise;
  }

  private async _initializeInternal(): Promise<void> {
    try {
      await pathfindingWASM.initialize();
      this.wasmEnabled = true;
      this.wasmInitialized = true;
      console.info('[PathfindingSystem] WASM module initialized successfully');
    } catch (error) {
      this.wasmEnabled = false;
      this.wasmInitialized = false;
      console.warn('[PathfindingSystem] WASM initialization failed, using JS fallback:', error);
    }
  }

  /**
   * Find path from start to goal using A* algorithm
   *
   * @param startX - Start X coordinate
   * @param startY - Start Y coordinate
   * @param goalX - Goal X coordinate
   * @param goalY - Goal Y coordinate
   * @param mapWidth - Map width in tiles
   * @param mapHeight - Map height in tiles
   * @param obstacles - Obstacle map (0 = walkable, 1 = blocked), row-major order
   * @param options - Pathfinding options
   * @returns Array of path points from start to goal, or empty array if no path found
   */
  findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    mapWidth: number,
    mapHeight: number,
    obstacles: Uint8Array,
    options: PathfindingOptions = {}
  ): PathPoint[] {
    // Use WASM if available and initialized
    if (this.wasmEnabled && this.wasmInitialized) {
      try {
        return pathfindingWASM.findPath(
          startX,
          startY,
          goalX,
          goalY,
          mapWidth,
          mapHeight,
          obstacles,
          options
        );
      } catch (error) {
        console.warn('[PathfindingSystem] WASM pathfinding failed, falling back to JS:', error);
        this.wasmEnabled = false; // Disable WASM for future calls
      }
    }

    // Fallback to JavaScript implementation
    return pathfindingJS.findPath(
      startX,
      startY,
      goalX,
      goalY,
      mapWidth,
      mapHeight,
      obstacles,
      options
    );
  }

  /**
   * Check if WASM is enabled and initialized
   */
  isWASMEnabled(): boolean {
    return this.wasmEnabled && this.wasmInitialized;
  }

  /**
   * Get current implementation (for debugging)
   */
  getImplementation(): 'wasm' | 'js' {
    return this.wasmEnabled && this.wasmInitialized ? 'wasm' : 'js';
  }

  /**
   * Get WASM memory size (for debugging)
   */
  getWASMMemorySize(): number {
    if (this.wasmEnabled && this.wasmInitialized) {
      return pathfindingWASM.getMemorySize();
    }
    return 0;
  }
}

/**
 * Singleton instance for global use
 */
export const pathfindingSystem = new PathfindingSystem();

/**
 * Initialize pathfinding system at app startup
 * Call this once in your initialization code
 */
export async function initializePathfinding(): Promise<void> {
  await pathfindingSystem.initialize();
}
