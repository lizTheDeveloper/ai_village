/**
 * WebAssembly Pathfinding Wrapper
 *
 * Loads and manages the WASM pathfinding module for high-performance A* pathfinding.
 * Expected speedup: 1.5-2x over JavaScript for medium to complex paths.
 */

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathfindingOptions {
  maxPathLength?: number; // Default: 1000
}

/**
 * WASM module exports interface
 */
interface PathfindingWASMExports {
  memory: WebAssembly.Memory;
  findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    mapWidth: number,
    mapHeight: number,
    obstaclesPtr: number,
    outputXPtr: number,
    outputYPtr: number,
    maxPathLength: number
  ): number;
  allocateObstacles(size: number): number;
  allocateOutput(size: number): number;
  getMemorySize(): number;
}

export class PathfindingWASM {
  private instance: WebAssembly.Instance | null = null;
  private exports: PathfindingWASMExports | null = null;
  private initialized = false;

  // Memory layout (in bytes)
  private obstaclesPtr = 0;
  private outputXPtr = 0;
  private outputYPtr = 0;
  private allocatedMapSize = 0;
  private allocatedPathLength = 0;

  /**
   * Initialize WASM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load WASM module
      // In Vite, we can use ?url to get the file path
      const wasmPath = new URL('../../wasm/build/pathfinding.wasm', import.meta.url).href;
      const response = await fetch(wasmPath);

      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();

      // Instantiate WASM module
      const result = await WebAssembly.instantiate(buffer, {
        env: {
          abort: (msg: number, file: number, line: number, column: number) => {
            throw new Error(`WASM abort at ${file}:${line}:${column} - ${msg}`);
          },
        },
      });

      this.instance = result.instance;
      this.exports = this.instance.exports as unknown as PathfindingWASMExports;
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize WASM pathfinding module: ${error}`);
    }
  }

  /**
   * Allocate memory for pathfinding operations
   * Call this before the first findPath() or when map size/path length changes
   */
  private ensureMemoryAllocated(mapSize: number, maxPathLength: number): void {
    if (!this.exports) {
      throw new Error('WASM module not initialized');
    }

    // Allocate obstacles array if needed
    if (this.allocatedMapSize < mapSize) {
      this.obstaclesPtr = this.exports.allocateObstacles(mapSize);
      this.allocatedMapSize = mapSize;
    }

    // Allocate output arrays if needed
    if (this.allocatedPathLength < maxPathLength) {
      this.outputXPtr = this.exports.allocateOutput(maxPathLength);
      this.outputYPtr = this.exports.allocateOutput(maxPathLength);
      this.allocatedPathLength = maxPathLength;
    }
  }

  /**
   * Find path using A* algorithm
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
    if (!this.exports) {
      throw new Error('WASM module not initialized. Call initialize() first.');
    }

    const maxPathLength = options.maxPathLength ?? 1000;
    const mapSize = mapWidth * mapHeight;

    // Validate inputs
    if (mapSize !== obstacles.length) {
      throw new Error(
        `Obstacle array size mismatch: expected ${mapSize} but got ${obstacles.length}`
      );
    }

    if (startX < 0 || startX >= mapWidth || startY < 0 || startY >= mapHeight) {
      throw new Error(`Start position out of bounds: (${startX}, ${startY})`);
    }

    if (goalX < 0 || goalX >= mapWidth || goalY < 0 || goalY >= mapHeight) {
      throw new Error(`Goal position out of bounds: (${goalX}, ${goalY})`);
    }

    // Ensure memory is allocated
    this.ensureMemoryAllocated(mapSize, maxPathLength);

    // Copy obstacles to WASM memory
    const memory = this.exports.memory.buffer;
    const obstaclesView = new Uint8Array(memory, this.obstaclesPtr, mapSize);
    obstaclesView.set(obstacles);

    // Call WASM findPath
    const pathLength = this.exports.findPath(
      startX,
      startY,
      goalX,
      goalY,
      mapWidth,
      mapHeight,
      this.obstaclesPtr,
      this.outputXPtr,
      this.outputYPtr,
      maxPathLength
    );

    // No path found
    if (pathLength === 0) {
      return [];
    }

    // Read path from WASM memory
    const outputXView = new Int32Array(memory, this.outputXPtr, pathLength);
    const outputYView = new Int32Array(memory, this.outputYPtr, pathLength);

    const path: PathPoint[] = [];
    for (let i = 0; i < pathLength; i++) {
      path.push({
        x: outputXView[i],
        y: outputYView[i],
      });
    }

    return path;
  }

  /**
   * Check if WASM module is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get allocated memory size in bytes
   */
  getMemorySize(): number {
    if (!this.exports) {
      return 0;
    }
    return this.exports.getMemorySize();
  }
}

/**
 * Singleton instance for global use
 * Initialize it once at app startup with await pathfindingWASM.initialize()
 */
export const pathfindingWASM = new PathfindingWASM();
