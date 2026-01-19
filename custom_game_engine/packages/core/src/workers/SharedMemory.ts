/**
 * SharedMemory Manager
 *
 * Manages SharedArrayBuffer regions for zero-copy worker communication.
 * Provides allocation, deallocation, and access to shared memory regions.
 *
 * Performance:
 * - Zero-copy data transfer between main thread and workers
 * - 10-100x faster than postMessage for large arrays (10,000+ elements)
 * - Atomic operations for thread-safe synchronization
 *
 * Requirements:
 * - Secure context (HTTPS or localhost)
 * - COOP/COEP headers configured (see vite-sab-plugin.ts)
 *
 * Usage:
 * ```typescript
 * const manager = new SharedMemoryManager();
 *
 * // Allocate shared region
 * const region = manager.allocate('heightMap', 10000);
 *
 * // Write data (main thread)
 * region.float32View.set(heightData);
 *
 * // Send buffer to worker (zero-copy!)
 * worker.postMessage({ buffer: region.buffer });
 *
 * // Read data (worker thread)
 * const workerView = new Float32Array(buffer);
 * ```
 */

/**
 * Shared memory region with multiple typed views
 */
export interface SharedMemoryRegion {
  /** Underlying SharedArrayBuffer */
  buffer: SharedArrayBuffer;
  /** Float32 view for floating-point data */
  float32View: Float32Array;
  /** Int32 view for integer data */
  int32View: Int32Array;
  /** Atomic view for synchronization (last element) */
  atomics: Int32Array;
  /** Region name */
  name: string;
  /** Element count (excluding sync flag) */
  elementCount: number;
}

/**
 * SharedMemory Manager
 *
 * Allocates and manages SharedArrayBuffer regions for worker communication.
 */
export class SharedMemoryManager {
  private regions = new Map<string, SharedMemoryRegion>();

  /**
   * Allocate shared memory region.
   *
   * Creates a SharedArrayBuffer with space for:
   * - elementCount floats/ints
   * - 1 int32 sync flag at the end
   *
   * @param name - Unique region name
   * @param elementCount - Number of elements (floats/ints)
   * @returns SharedMemoryRegion with typed views
   * @throws Error if SharedArrayBuffer not supported
   */
  allocate(name: string, elementCount: number): SharedMemoryRegion {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error(
        '[SharedMemory] SharedArrayBuffer not supported. Ensure COOP/COEP headers are set.'
      );
    }

    if (this.regions.has(name)) {
      throw new Error(`[SharedMemory] Region "${name}" already exists`);
    }

    // Size: elementCount * 4 bytes + 4 bytes for sync flag
    const bufferSize = elementCount * 4 + 4;
    const buffer = new SharedArrayBuffer(bufferSize);

    const region: SharedMemoryRegion = {
      buffer,
      float32View: new Float32Array(buffer, 0, elementCount),
      int32View: new Int32Array(buffer, 0, elementCount),
      atomics: new Int32Array(buffer, elementCount * 4, 1), // Sync flag at end
      name,
      elementCount,
    };

    this.regions.set(name, region);
    return region;
  }

  /**
   * Get existing shared memory region.
   *
   * @param name - Region name
   * @returns SharedMemoryRegion or null if not found
   */
  get(name: string): SharedMemoryRegion | null {
    return this.regions.get(name) || null;
  }

  /**
   * Get or allocate region.
   *
   * Returns existing region if it exists and is large enough,
   * otherwise allocates a new region.
   *
   * @param name - Region name
   * @param elementCount - Required element count
   * @returns SharedMemoryRegion
   */
  getOrAllocate(name: string, elementCount: number): SharedMemoryRegion {
    const existing = this.regions.get(name);

    if (existing && existing.elementCount >= elementCount) {
      return existing;
    }

    if (existing) {
      // Free old region if too small
      this.free(name);
    }

    return this.allocate(name, elementCount);
  }

  /**
   * Free shared memory region.
   *
   * @param name - Region name
   * @returns true if region was freed, false if not found
   */
  free(name: string): boolean {
    return this.regions.delete(name);
  }

  /**
   * Free all shared memory regions.
   */
  freeAll(): void {
    this.regions.clear();
  }

  /**
   * Get total allocated size in bytes.
   *
   * @returns Total size of all shared buffers
   */
  getTotalSize(): number {
    let size = 0;
    for (const region of this.regions.values()) {
      size += region.buffer.byteLength;
    }
    return size;
  }

  /**
   * Get number of allocated regions.
   *
   * @returns Region count
   */
  getRegionCount(): number {
    return this.regions.size;
  }

  /**
   * Get list of allocated region names.
   *
   * @returns Array of region names
   */
  getRegionNames(): string[] {
    return Array.from(this.regions.keys());
  }

  /**
   * Get memory usage statistics.
   *
   * @returns Memory stats
   */
  getStats(): {
    regionCount: number;
    totalBytes: number;
    totalKB: number;
    totalMB: number;
    regions: Array<{ name: string; bytes: number; elementCount: number }>;
  } {
    const totalBytes = this.getTotalSize();
    const regions = Array.from(this.regions.values()).map((region) => ({
      name: region.name,
      bytes: region.buffer.byteLength,
      elementCount: region.elementCount,
    }));

    return {
      regionCount: this.regions.size,
      totalBytes,
      totalKB: totalBytes / 1024,
      totalMB: totalBytes / (1024 * 1024),
      regions,
    };
  }
}

/**
 * Check if SharedArrayBuffer is supported.
 *
 * @returns true if SharedArrayBuffer is available
 */
export function isSharedArrayBufferSupported(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  try {
    // Try to create a SharedArrayBuffer
    const sab = new SharedArrayBuffer(8);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Log SharedArrayBuffer support status.
 */
export function logSharedArrayBufferSupport(): void {
  if (!isSharedArrayBufferSupported()) {
    console.warn(
      '[SharedMemory] SharedArrayBuffer not supported or COOP/COEP headers not set.\n' +
        'To enable:\n' +
        '1. Ensure HTTPS or localhost\n' +
        '2. Set headers:\n' +
        '   Cross-Origin-Opener-Policy: same-origin\n' +
        '   Cross-Origin-Embedder-Policy: require-corp\n' +
        '3. Restart server\n' +
        'Falling back to postMessage (copy mode).'
    );
  } else {
    console.info('[SharedMemory] SharedArrayBuffer supported (zero-copy enabled)');
  }
}
