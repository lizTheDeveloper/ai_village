/**
 * Structure-of-Arrays (SoA) component storage for cache-efficient batch processing.
 *
 * Traditional Array-of-Structures (AoS) layout:
 * ```
 * positions = [
 *   { type: 'position', x: 1, y: 2, z: 0 },
 *   { type: 'position', x: 5, y: 7, z: 0 },
 *   ...
 * ]
 * ```
 *
 * SoA layout (this file):
 * ```
 * positions = {
 *   xs: [1, 5, ...],
 *   ys: [2, 7, ...],
 *   zs: [0, 0, ...],
 *   entityIds: ['id1', 'id2', ...]
 * }
 * ```
 *
 * Benefits:
 * - Better cache locality (sequential memory access)
 * - SIMD potential (process 4-8 elements at once)
 * - Smaller memory footprint (no object overhead)
 * - 1.5-2x speedup for batch operations
 *
 * Usage:
 * 1. SoASyncSystem keeps this in sync with component changes
 * 2. Systems can use getArrays() for batch processing
 * 3. Individual access via get/set for compatibility
 */

/**
 * Structure-of-Arrays storage for Position components.
 *
 * Stores position data in parallel typed arrays for cache-efficient batch processing.
 * Automatically grows capacity when needed (1.5x growth factor).
 */
export class PositionSoA {
  private xs: Float32Array;
  private ys: Float32Array;
  private zs: Float32Array;
  private chunkXs: Int32Array;
  private chunkYs: Int32Array;
  private entityIds: string[];
  private entityIndexMap: Map<string, number>;
  private capacity: number;
  private count: number = 0;

  constructor(initialCapacity: number = 1000) {
    this.capacity = initialCapacity;
    this.xs = new Float32Array(initialCapacity);
    this.ys = new Float32Array(initialCapacity);
    this.zs = new Float32Array(initialCapacity);
    this.chunkXs = new Int32Array(initialCapacity);
    this.chunkYs = new Int32Array(initialCapacity);
    this.entityIds = new Array(initialCapacity);
    this.entityIndexMap = new Map();
  }

  /**
   * Add a position component.
   * @returns Index where the position was stored
   */
  add(
    entityId: string,
    x: number,
    y: number,
    z: number = 0,
    chunkX: number,
    chunkY: number
  ): number {
    if (this.count >= this.capacity) {
      this.grow();
    }

    const index = this.count;
    this.xs[index] = x;
    this.ys[index] = y;
    this.zs[index] = z;
    this.chunkXs[index] = chunkX;
    this.chunkYs[index] = chunkY;
    this.entityIds[index] = entityId;
    this.entityIndexMap.set(entityId, index);
    this.count++;

    return index;
  }

  /**
   * Get position for entity.
   * @returns Position data or null if not found
   */
  get(
    entityId: string
  ): { x: number; y: number; z: number; chunkX: number; chunkY: number } | null {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return null;

    return {
      x: this.xs[index]!,
      y: this.ys[index]!,
      z: this.zs[index]!,
      chunkX: this.chunkXs[index]!,
      chunkY: this.chunkYs[index]!,
    };
  }

  /**
   * Update position for entity.
   * @returns true if updated, false if entity not found
   */
  set(
    entityId: string,
    x: number,
    y: number,
    z?: number,
    chunkX?: number,
    chunkY?: number
  ): boolean {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return false;

    this.xs[index] = x;
    this.ys[index] = y;
    if (z !== undefined) {
      this.zs[index] = z;
    }
    if (chunkX !== undefined) {
      this.chunkXs[index] = chunkX;
    }
    if (chunkY !== undefined) {
      this.chunkYs[index] = chunkY;
    }

    return true;
  }

  /**
   * Remove position for entity.
   * Uses swap-remove for O(1) deletion.
   * @returns true if removed, false if entity not found
   */
  remove(entityId: string): boolean {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return false;

    // Swap with last element (faster than shifting)
    const lastIndex = this.count - 1;
    if (index !== lastIndex) {
      this.xs[index] = this.xs[lastIndex]!;
      this.ys[index] = this.ys[lastIndex]!;
      this.zs[index] = this.zs[lastIndex]!;
      this.chunkXs[index] = this.chunkXs[lastIndex]!;
      this.chunkYs[index] = this.chunkYs[lastIndex]!;
      this.entityIds[index] = this.entityIds[lastIndex]!;
      this.entityIndexMap.set(this.entityIds[index]!, index);
    }

    this.entityIndexMap.delete(entityId);
    this.count--;

    return true;
  }

  /**
   * Get direct array access for batch operations.
   * WARNING: Arrays may contain uninitialized data beyond 'count'.
   * Always use 'count' to determine valid range.
   *
   * Example batch processing:
   * ```typescript
   * const arrays = soa.getArrays();
   * for (let i = 0; i < arrays.count; i++) {
   *   arrays.xs[i] += deltaX;
   *   arrays.ys[i] += deltaY;
   * }
   * ```
   */
  getArrays(): {
    xs: Float32Array;
    ys: Float32Array;
    zs: Float32Array;
    chunkXs: Int32Array;
    chunkYs: Int32Array;
    entityIds: string[];
    count: number;
  } {
    return {
      xs: this.xs,
      ys: this.ys,
      zs: this.zs,
      chunkXs: this.chunkXs,
      chunkYs: this.chunkYs,
      entityIds: this.entityIds,
      count: this.count,
    };
  }

  /**
   * Grow capacity by 1.5x.
   * Allocates new arrays and copies existing data.
   */
  private grow(): void {
    const newCapacity = Math.floor(this.capacity * 1.5);

    const newXs = new Float32Array(newCapacity);
    const newYs = new Float32Array(newCapacity);
    const newZs = new Float32Array(newCapacity);
    const newChunkXs = new Int32Array(newCapacity);
    const newChunkYs = new Int32Array(newCapacity);
    const newEntityIds = new Array(newCapacity);

    newXs.set(this.xs);
    newYs.set(this.ys);
    newZs.set(this.zs);
    newChunkXs.set(this.chunkXs);
    newChunkYs.set(this.chunkYs);
    for (let i = 0; i < this.count; i++) {
      newEntityIds[i] = this.entityIds[i];
    }

    this.xs = newXs;
    this.ys = newYs;
    this.zs = newZs;
    this.chunkXs = newChunkXs;
    this.chunkYs = newChunkYs;
    this.entityIds = newEntityIds;
    this.capacity = newCapacity;
  }

  /**
   * Get current number of stored positions.
   */
  size(): number {
    return this.count;
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.count = 0;
    this.entityIndexMap.clear();
  }

  /**
   * Check if entity has a position.
   */
  has(entityId: string): boolean {
    return this.entityIndexMap.has(entityId);
  }
}

/**
 * Structure-of-Arrays storage for Velocity components.
 *
 * Stores velocity data in parallel typed arrays for cache-efficient batch processing.
 * Automatically grows capacity when needed (1.5x growth factor).
 */
export class VelocitySoA {
  private vxs: Float32Array;
  private vys: Float32Array;
  private entityIds: string[];
  private entityIndexMap: Map<string, number>;
  private capacity: number;
  private count: number = 0;

  constructor(initialCapacity: number = 1000) {
    this.capacity = initialCapacity;
    this.vxs = new Float32Array(initialCapacity);
    this.vys = new Float32Array(initialCapacity);
    this.entityIds = new Array(initialCapacity);
    this.entityIndexMap = new Map();
  }

  /**
   * Add a velocity component.
   * @returns Index where the velocity was stored
   */
  add(entityId: string, vx: number, vy: number): number {
    if (this.count >= this.capacity) {
      this.grow();
    }

    const index = this.count;
    this.vxs[index] = vx;
    this.vys[index] = vy;
    this.entityIds[index] = entityId;
    this.entityIndexMap.set(entityId, index);
    this.count++;

    return index;
  }

  /**
   * Get velocity for entity.
   * @returns Velocity data or null if not found
   */
  get(entityId: string): { vx: number; vy: number } | null {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return null;

    return {
      vx: this.vxs[index]!,
      vy: this.vys[index]!,
    };
  }

  /**
   * Update velocity for entity.
   * @returns true if updated, false if entity not found
   */
  set(entityId: string, vx: number, vy: number): boolean {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return false;

    this.vxs[index] = vx;
    this.vys[index] = vy;

    return true;
  }

  /**
   * Remove velocity for entity.
   * Uses swap-remove for O(1) deletion.
   * @returns true if removed, false if entity not found
   */
  remove(entityId: string): boolean {
    const index = this.entityIndexMap.get(entityId);
    if (index === undefined || index >= this.count) return false;

    // Swap with last element (faster than shifting)
    const lastIndex = this.count - 1;
    if (index !== lastIndex) {
      this.vxs[index] = this.vxs[lastIndex]!;
      this.vys[index] = this.vys[lastIndex]!;
      this.entityIds[index] = this.entityIds[lastIndex]!;
      this.entityIndexMap.set(this.entityIds[index]!, index);
    }

    this.entityIndexMap.delete(entityId);
    this.count--;

    return true;
  }

  /**
   * Get direct array access for batch operations.
   * WARNING: Arrays may contain uninitialized data beyond 'count'.
   * Always use 'count' to determine valid range.
   *
   * Example batch processing:
   * ```typescript
   * const arrays = soa.getArrays();
   * for (let i = 0; i < arrays.count; i++) {
   *   arrays.vxs[i] *= damping;
   *   arrays.vys[i] *= damping;
   * }
   * ```
   */
  getArrays(): {
    vxs: Float32Array;
    vys: Float32Array;
    entityIds: string[];
    count: number;
  } {
    return {
      vxs: this.vxs,
      vys: this.vys,
      entityIds: this.entityIds,
      count: this.count,
    };
  }

  /**
   * Grow capacity by 1.5x.
   * Allocates new arrays and copies existing data.
   */
  private grow(): void {
    const newCapacity = Math.floor(this.capacity * 1.5);

    const newVxs = new Float32Array(newCapacity);
    const newVys = new Float32Array(newCapacity);
    const newEntityIds = new Array(newCapacity);

    newVxs.set(this.vxs);
    newVys.set(this.vys);
    for (let i = 0; i < this.count; i++) {
      newEntityIds[i] = this.entityIds[i];
    }

    this.vxs = newVxs;
    this.vys = newVys;
    this.entityIds = newEntityIds;
    this.capacity = newCapacity;
  }

  /**
   * Get current number of stored velocities.
   */
  size(): number {
    return this.count;
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.count = 0;
    this.entityIndexMap.clear();
  }

  /**
   * Check if entity has a velocity.
   */
  has(entityId: string): boolean {
    return this.entityIndexMap.has(entityId);
  }
}
