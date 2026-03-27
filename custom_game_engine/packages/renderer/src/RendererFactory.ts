/**
 * Renderer Factory
 *
 * Factory for creating renderers with automatic backend selection.
 * Supports WebGPU (via PixiJS), WebGL (via PixiJS), and Canvas2D (legacy).
 *
 * Usage:
 * ```typescript
 * import { createRenderer } from '@ai-village/renderer';
 *
 * const renderer = await createRenderer(canvas, chunkManager, terrainGenerator, {
 *   preference: 'auto', // or 'webgpu', 'webgl', 'canvas2d'
 * });
 *
 * // Render loop
 * function animate() {
 *   renderer.render(world);
 *   requestAnimationFrame(animate);
 * }
 * ```
 */

import type { ChunkManager, TerrainGenerator } from '@ai-village/world';
import type { IRenderer, RendererOptions, RendererFactory } from './IRenderer.js';
import { PixiJSRenderer } from './PixiJSRenderer.js';
import { Renderer as Canvas2DRenderer } from './Renderer.js';
import { getPixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';

/**
 * Feature flag for WebGPU renderer.
 * Can be set via localStorage for testing:
 *   localStorage.setItem('renderer', 'webgpu');
 *   localStorage.setItem('renderer', 'webgl');
 *   localStorage.setItem('renderer', 'canvas2d');
 *   localStorage.setItem('renderer', 'auto');
 */
function getRendererPreference(): 'webgpu' | 'webgl' | 'canvas2d' | 'auto' {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('renderer');
    if (stored === 'webgpu' || stored === 'webgl' || stored === 'canvas2d' || stored === 'auto') {
      return stored;
    }
  }

  // Check URL parameter: ?renderer=webgpu
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('renderer');
    if (param === 'webgpu' || param === 'webgl' || param === 'canvas2d' || param === 'auto') {
      return param;
    }
  }

  // Default to auto (try WebGPU/WebGL first via PixiJS)
  return 'auto';
}

/**
 * Detect best available renderer backend.
 *
 * Tries WebGPU, then WebGL2, then WebGL1, then falls back to Canvas2D.
 */
async function detectBestBackend(): Promise<'webgpu' | 'webgl' | 'canvas2d'> {
  // Try WebGPU — verify both adapter AND canvas context work
  // PixiJS v8 calls canvas.getContext('webgpu').configure() without a null check,
  // so we must verify getContext('webgpu') returns non-null before committing.
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter();
      if (adapter && typeof document !== 'undefined') {
        // Verify canvas WebGPU context is obtainable (prevents null.configure() crash in PixiJS)
        const testCanvas = document.createElement('canvas');
        const gpuContext = testCanvas.getContext('webgpu');
        if (gpuContext) {
          console.warn('[RendererFactory] WebGPU available, using WebGPU backend');
          return 'webgpu';
        } else {
          console.warn('[RendererFactory] WebGPU adapter exists but canvas context unavailable, skipping');
        }
      }
    } catch {
      // WebGPU not available, continue
    }
  }

  // Try WebGL2/WebGL1
  if (typeof document !== 'undefined') {
    const testCanvas = document.createElement('canvas');
    const gl2 = testCanvas.getContext('webgl2');
    if (gl2) {
      const loseContext = gl2.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
      console.warn('[RendererFactory] WebGL2 available, using WebGL backend');
      return 'webgl';
    }
    const gl1 = testCanvas.getContext('webgl');
    if (gl1) {
      const loseContext = gl1.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
      console.warn('[RendererFactory] WebGL1 available, using WebGL backend');
      return 'webgl';
    }
  }

  // Fallback to Canvas2D
  console.warn('[RendererFactory] No WebGPU or WebGL available, falling back to Canvas2D');
  return 'canvas2d';
}

/**
 * Create a renderer with automatic backend selection.
 *
 * @param canvas - The HTML canvas element to render to
 * @param chunkManager - Chunk manager for terrain
 * @param terrainGenerator - Terrain generator for new chunks
 * @param options - Renderer options including backend preference
 * @returns Promise resolving to the created renderer
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  chunkManager: ChunkManager,
  terrainGenerator: TerrainGenerator,
  options: RendererOptions = {}
): Promise<IRenderer> {
  // Determine preference from options, localStorage, or URL params
  const preference = options.preference ?? getRendererPreference();

  let backend: 'webgpu' | 'webgl' | 'canvas2d';

  if (preference === 'auto') {
    backend = await detectBestBackend();
  } else {
    backend = preference;
  }

  // Create the appropriate renderer
  if (backend === 'canvas2d') {
    console.warn('[RendererFactory] Using Canvas2D renderer');
    const renderer = new Canvas2DRenderer(canvas, chunkManager, terrainGenerator);
    return wrapCanvas2DRenderer(renderer);
  }

  // Try PixiJS renderer (WebGPU or WebGL) with fallback chain
  try {
    const renderer = new PixiJSRenderer(canvas, chunkManager, terrainGenerator, {
      ...options,
      preference: backend,
    });
    await renderer.init();
    console.warn(`[RendererFactory] Renderer initialized with ${backend} backend`);
    return renderer;
  } catch (primaryError) {
    console.warn(`[RendererFactory] ${backend} renderer failed, attempting fallback`);

    // If WebGPU failed, try WebGL
    if (backend === 'webgpu') {
      try {
        const renderer = new PixiJSRenderer(canvas, chunkManager, terrainGenerator, {
          ...options,
          preference: 'webgl',
        });
        await renderer.init();
        console.warn('[RendererFactory] Fallback to WebGL succeeded');
        return renderer;
      } catch (webglError) {
        console.warn('[RendererFactory] WebGL fallback also failed, using Canvas2D');
      }
    } else {
      console.warn(`[RendererFactory] ${backend} failed, falling back to Canvas2D`);
    }

    // Final fallback: Canvas2D
    console.warn('[RendererFactory] Using Canvas2D renderer as final fallback');
    const renderer = new Canvas2DRenderer(canvas, chunkManager, terrainGenerator);
    return wrapCanvas2DRenderer(renderer);
  }
}

/**
 * Wrap the existing Canvas2D Renderer to implement IRenderer interface.
 * This is a compatibility layer for the legacy renderer.
 */
function wrapCanvas2DRenderer(renderer: Canvas2DRenderer): IRenderer {
  return {
    // Core properties
    get camera() {
      return renderer.getCamera();
    },
    get canvas() {
      return (renderer as any).canvas as HTMLCanvasElement;
    },
    get tileSize() {
      return 16; // Default tile size
    },
    get pixelLabLoader() {
      return renderer.pixelLabLoader;
    },

    // View toggles
    showResourceAmounts: renderer.showResourceAmounts,
    showBuildingLabels: renderer.showBuildingLabels,
    showAgentNames: renderer.showAgentNames,
    showAgentTasks: renderer.showAgentTasks,
    showCityBounds: renderer.showCityBounds,

    // Core methods
    render(world, selectedEntity) {
      renderer.render(world, selectedEntity);
    },

    destroy() {
      renderer.destroy();
    },

    getCamera() {
      return renderer.getCamera();
    },

    // Combat UI
    initCombatUI(world, eventBus) {
      renderer.initCombatUI(world, eventBus);
    },

    // Stats
    getStats() {
      return {
        fps: 60, // Canvas2D doesn't track this
        drawCalls: 0,
        visibleEntities: 0,
        culledEntities: 0,
        gpuMemoryMB: 0,
        backend: 'canvas2d' as const,
      };
    },

    // These methods may not exist on Canvas2D renderer
    showFloatingText: undefined,
    showSpeechBubble: undefined,
    createDustCloud: undefined,
    createSparkEffect: undefined,
    getEntityAt: undefined,
    toggleDebugOverlay: undefined,
    toggleTemperatureOverlay: undefined,

    // For Canvas2D, the overlay canvas IS the main canvas
    get overlayCanvas() {
      return (renderer as any).canvas as HTMLCanvasElement;
    },
    getOverlayContext() {
      const canvas = (renderer as any).canvas as HTMLCanvasElement;
      return canvas.getContext('2d');
    },
  };
}

/**
 * Check if WebGPU is available in the current browser.
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return false;
  }

  try {
    const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter();
    if (!adapter) return false;

    // Also verify canvas context is obtainable (prevents PixiJS null.configure() crash)
    if (typeof document !== 'undefined') {
      const testCanvas = document.createElement('canvas');
      const gpuContext = testCanvas.getContext('webgpu');
      return gpuContext !== null;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get list of available renderer backends.
 */
export async function getAvailableBackends(): Promise<Array<'webgpu' | 'webgl' | 'canvas2d'>> {
  const backends: Array<'webgpu' | 'webgl' | 'canvas2d'> = [];

  // Check WebGPU
  if (await isWebGPUAvailable()) {
    backends.push('webgpu');
  }

  // Check WebGL2
  if (typeof document !== 'undefined') {
    const testCanvas = document.createElement('canvas');
    if (testCanvas.getContext('webgl2')) {
      backends.push('webgl');
    }
  }

  // Canvas2D is always available
  backends.push('canvas2d');

  return backends;
}

// Export default factory
export const rendererFactory: RendererFactory = createRenderer;

// Re-export types
export type { IRenderer, RendererOptions, RendererStats } from './IRenderer.js';
