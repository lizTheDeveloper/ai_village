/**
 * WebGPU Manager - Manages GPU device initialization and lifecycle
 *
 * WebGPU is cutting-edge technology (Chrome 113+, May 2023)
 * Provides GPU-accelerated compute shaders for massively parallel operations
 *
 * Browser support:
 * - Chrome/Edge 113+ (May 2023)
 * - Firefox Nightly (experimental flag)
 * - Safari Technology Preview (experimental)
 *
 * Always provide SIMD fallback for browsers without WebGPU support.
 *
 * @see https://www.w3.org/TR/webgpu/
 */

export class WebGPUManager {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private initialized = false;

  /**
   * Initialize WebGPU device.
   * Returns true if successful, false if WebGPU not available.
   *
   * Call this once at startup before using GPU operations.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Check if WebGPU is supported
    if (!navigator.gpu) {
      console.warn('[WebGPU] Not supported in this browser (requires Chrome 113+)');
      return false;
    }

    try {
      // Request GPU adapter
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        console.warn('[WebGPU] No GPU adapter available');
        return false;
      }

      // Request GPU device
      this.device = await this.adapter.requestDevice();
      this.initialized = true;

      // Log GPU info (basic info only - requestAdapterInfo may not be available)
      console.info('[WebGPU] Initialized successfully:', {
        limits: {
          maxComputeWorkgroupsPerDimension: this.device.limits.maxComputeWorkgroupsPerDimension,
          maxComputeInvocationsPerWorkgroup: this.device.limits.maxComputeInvocationsPerWorkgroup,
          maxStorageBufferBindingSize: this.device.limits.maxStorageBufferBindingSize,
        },
      });

      return true;
    } catch (error) {
      console.error('[WebGPU] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get GPU device.
   * Returns null if not initialized.
   */
  getDevice(): GPUDevice | null {
    return this.device;
  }

  /**
   * Check if WebGPU is initialized and ready.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get GPU adapter.
   * Returns null if not initialized.
   */
  getAdapter(): GPUAdapter | null {
    return this.adapter;
  }

  /**
   * Destroy GPU device and release resources.
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.initialized = false;
  }
}
