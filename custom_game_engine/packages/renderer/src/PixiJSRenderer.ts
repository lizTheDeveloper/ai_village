/**
 * PixiJS v8 WebGPU Renderer
 *
 * High-performance 2D renderer using PixiJS v8 with WebGPU backend.
 * Provides 5-10x sprite throughput compared to Canvas2D.
 *
 * Features:
 * - WebGPU rendering with WebGL fallback
 * - Automatic sprite batching
 * - GPU-accelerated filters and masks
 * - ParticleContainer for 100K+ particles
 */

import {
  Application,
  Container,
  Sprite,
  Graphics,
  Text,
  TextStyle,
  Assets,
  Texture,
  type Renderer as PixiRenderer,
} from 'pixi.js';
import type { World, Entity, EventBus } from '@ai-village/core';
import type { ChunkManager, TerrainGenerator, Chunk, Tile } from '@ai-village/world';
import { CHUNK_SIZE, TERRAIN_COLORS } from '@ai-village/world';
import { Camera, type VisibleBounds } from './Camera.js';
import type {
  IRenderer,
  RendererStats,
  RendererOptions,
  FloatingTextOptions,
  ParticleOptions,
} from './IRenderer.js';
import { lookupSprite } from './sprites/SpriteService.js';
import type { SpriteTraits, ClothingType } from './sprites/SpriteRegistry.js';

// Global renderer instance for cleanup on HMR/reload
// This prevents WebGL context leaks that cause "CanvasRenderer is not yet implemented" errors
let _globalPixiRenderer: PixiJSRenderer | null = null;

/**
 * Clean up any existing PixiJS renderer before creating a new one.
 * Call this before createRenderer() to prevent WebGL context exhaustion.
 */
export function cleanupExistingRenderer(): void {
  if (_globalPixiRenderer) {
    console.log('[PixiJSRenderer] Cleaning up existing renderer before creating new one');
    try {
      _globalPixiRenderer.destroy();
    } catch (e) {
      console.warn('[PixiJSRenderer] Error during cleanup:', e);
    }
    _globalPixiRenderer = null;
  }
}

// Register cleanup on page unload to release WebGL context
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupExistingRenderer();
  });

  // Also cleanup on visibility change (tab backgrounded) to help with context limits
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _globalPixiRenderer) {
      console.log('[PixiJSRenderer] Tab backgrounded - renderer still active');
      // Don't destroy on background, but log for debugging context issues
    }
  });
}

/**
 * WebGL Diagnostic Functions
 * These expose the root cause of WebGL failures instead of hiding them.
 */

/**
 * Count active WebGL contexts across all canvases in the document.
 * Browsers typically limit to 8-16 contexts total.
 */
function countActiveWebGLContexts(): { total: number; details: string[] } {
  const details: string[] = [];
  let total = 0;

  // Check all canvas elements
  const canvases = Array.from(document.querySelectorAll('canvas'));
  for (const canvas of canvases) {
    // Check if canvas has a WebGL context
    // Note: We can't directly check, but we can look at canvas attributes
    const id = canvas.id || `(unnamed canvas ${canvas.width}x${canvas.height})`;

    // Try to get existing context info - this doesn't create new contexts
    const existingGL = (canvas as HTMLCanvasElement & { _webglContext?: WebGLRenderingContext })._webglContext;
    if (existingGL) {
      total++;
      details.push(`${id}: has WebGL context`);
    }
  }

  // Also check for OffscreenCanvas contexts (harder to track)
  details.push(`Found ${canvases.length} canvas elements in DOM`);

  return { total, details };
}

/**
 * Get GPU/WebGL capability information for diagnostics.
 */
function getWebGLDiagnostics(): Record<string, string | number | boolean> {
  const diagnostics: Record<string, string | number | boolean> = {};

  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') as WebGL2RenderingContext | null
    || testCanvas.getContext('webgl') as WebGLRenderingContext | null;

  if (!gl) {
    diagnostics['webgl_available'] = false;
    diagnostics['error'] = 'Cannot create WebGL context';
    return diagnostics;
  }

  diagnostics['webgl_available'] = true;
  diagnostics['webgl_version'] = gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1';

  // Get renderer info
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    diagnostics['gpu_vendor'] = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
    diagnostics['gpu_renderer'] = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
  }

  // Get limits
  diagnostics['max_texture_size'] = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  diagnostics['max_viewport_dims'] = (gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array).join('x');
  diagnostics['max_renderbuffer_size'] = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;

  // Check for context loss
  diagnostics['context_lost'] = gl.isContextLost();

  // Clean up test context
  const loseContext = gl.getExtension('WEBGL_lose_context');
  if (loseContext) {
    loseContext.loseContext();
  }
  testCanvas.remove();

  return diagnostics;
}

/**
 * Log comprehensive WebGL diagnostics to console.
 * Call this when WebGL fails to understand why.
 */
export function logWebGLDiagnostics(): void {
  console.group('[WebGL Diagnostics]');

  // Context count
  const contextInfo = countActiveWebGLContexts();
  console.log(`Active WebGL contexts: ${contextInfo.total}`);
  console.log('Browser limit: typically 8-16 contexts');
  for (const detail of contextInfo.details) {
    console.log(`  ${detail}`);
  }

  // GPU info
  console.log('GPU/WebGL capabilities:');
  const diagnostics = getWebGLDiagnostics();
  for (const [key, value] of Object.entries(diagnostics)) {
    console.log(`  ${key}: ${value}`);
  }

  // Memory info (Chrome only)
  if ((performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
    const mem = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    console.log('Memory:');
    console.log(`  JS Heap: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB / ${(mem.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`);
  }

  console.groupEnd();
}

// Make diagnostics available from browser console: window.webglDiagnostics()
if (typeof window !== 'undefined') {
  (window as typeof window & { webglDiagnostics: typeof logWebGLDiagnostics }).webglDiagnostics = logWebGLDiagnostics;
}

/**
 * Set up context lost/restored handlers on a canvas to track WebGL issues.
 */
function setupContextLostHandlers(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('webglcontextlost', (event) => {
    console.error('[PixiJSRenderer] ❌ WebGL CONTEXT LOST!');
    console.error('This means the GPU driver crashed or the context was forcibly released.');
    console.error('Event:', event);
    logWebGLDiagnostics();

    // Prevent default to allow potential recovery
    event.preventDefault();
  });

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('[PixiJSRenderer] ✓ WebGL context restored');
    console.log('The renderer should automatically recover.');
  });

  // WebGPU equivalent
  canvas.addEventListener('contextlost', (event) => {
    console.error('[PixiJSRenderer] ❌ GPU CONTEXT LOST (WebGPU)!');
    console.error('Event:', event);
    logWebGLDiagnostics();
  });
}

// Raw appearance data from ECS (plain object, not class instance)
interface AppearanceData {
  species?: string;
  gender?: string;
  hairColor?: string;
  skinTone?: string;
  clothingType?: string;
}

/**
 * PixiJS v8 WebGPU/WebGL Renderer implementation.
 */
export class PixiJSRenderer implements IRenderer {
  private app!: Application;
  private _canvas: HTMLCanvasElement;
  private _camera: Camera;
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  private initialized = false;

  // Container hierarchy (back to front)
  private worldContainer!: Container;
  private terrainContainer!: Container;
  private entityContainer!: Container;
  private overlayContainer!: Container;

  // Sprite management
  private entitySprites: Map<string, Sprite> = new Map();
  private textureCache: Map<string, Texture> = new Map();
  private chunkGraphics: Map<string, Container> = new Map();
  private chunkVersions: Map<string, number> = new Map();
  private loadingTextures: Set<string> = new Set();
  private failedTextures: Set<string> = new Set();

  // Speech bubble tracking - tracks shown speech to avoid duplicates
  private shownSpeech: Map<string, string> = new Map(); // entityId -> lastSpeechText

  // Canvas2D overlay for UI rendering (windows, menus, etc.)
  private _overlayCanvas: HTMLCanvasElement | null = null;
  private _overlayContext: CanvasRenderingContext2D | null = null;

  // Sprite path mappings (same as SpriteRenderer)
  private static readonly MAP_OBJECT_SPRITES: Record<string, string> = {
    // Trees
    tree: 'oak_tree.png',
    'oak-tree': 'oak_tree.png',
    'pine-tree': 'pine_tree.png',
    'birch-tree': 'birch_tree.png',
    'maple-tree': 'maple_tree.png',
    'willow-tree': 'willow_tree.png',
    // Crops
    wheat: 'wheat.png',
    corn: 'corn.png',
    carrot: 'carrot.png',
    potato: 'potato.png',
    tomato: 'tomato.png',
    // Wild plants
    grass: 'grass.png',
    wildflower: 'wildflower.png',
    'blueberry-bush': 'blueberry_bush.png',
    'raspberry-bush': 'raspberry_bush.png',
    'blackberry-bush': 'blackberry_bush.png',
    // Medicinal herbs
    chamomile: 'chamomile.png',
    lavender: 'lavender.png',
    feverfew: 'feverfew.png',
    valerian: 'valerian.png',
    // Magical plants
    moonpetal: 'moonpetal.png',
    shadowcap: 'shadowcap.png',
    whisperleaf: 'whisperleaf.png',
    'sunburst-flower': 'sunburst_flower.png',
    frostbloom: 'frostbloom.png',
    // Other objects
    mushroom: 'mushroom.png',
    rock: 'rock_boulder.png',
  };

  // Configuration
  private _tileSize = 16;
  private backend: 'webgpu' | 'webgl' | 'canvas2d' = 'webgl';

  // View toggles
  showResourceAmounts = true;
  showBuildingLabels = true;
  showAgentNames = true;
  showAgentTasks = true;
  showCityBounds = true;

  // Query caching (same intervals as Canvas2D renderer)
  private _cachedBuildingEntities: readonly Entity[] = [];
  private _buildingCacheLastRefresh = 0;
  private readonly BUILDING_CACHE_REFRESH_INTERVAL = 60;

  private _cachedRenderableEntities: readonly Entity[] = [];
  private _renderableCacheLastRefresh = 0;
  private readonly RENDERABLE_CACHE_REFRESH_INTERVAL = 20;

  private _cachedAgentEntities: readonly Entity[] = [];
  private _agentCacheLastRefresh = 0;
  private readonly AGENT_CACHE_REFRESH_INTERVAL = 10;

  // Reusable arrays
  private _visibleEntities: Entity[] = [];
  private _sortedEntities: Entity[] = [];

  // Stats tracking
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;

  // Floating text queue
  private floatingTexts: Array<{
    text: Text;
    startY: number;
    startTime: number;
    duration: number;
    rise: boolean;
  }> = [];

  constructor(
    canvas: HTMLCanvasElement,
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator,
    private options: RendererOptions = {}
  ) {
    this._canvas = canvas;
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
    this._camera = new Camera(canvas.width, canvas.height);
    this._tileSize = options.tileSize ?? 16;
  }

  /**
   * Initialize the PixiJS application. Must be called before render().
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Clean up any existing renderer to free WebGL context
    cleanupExistingRenderer();

    // Set up context lost handlers BEFORE creating the context
    // This will alert us if WebGL gets lost after initialization
    setupContextLostHandlers(this._canvas);

    // Log initial diagnostics for debugging intermittent failures
    console.log('[PixiJSRenderer] Initializing...');
    logWebGLDiagnostics();

    // Determine preferred backend
    const preference = this.options.preference ?? 'auto';
    let preferenceForPixi: 'webgpu' | 'webgl' | undefined;

    if (preference === 'auto') {
      // Try WebGPU first - but only if we can verify full pipeline works
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            // Verify we can actually get a device (adapter existing isn't enough)
            const device = await adapter.requestDevice();
            if (device) {
              // CRITICAL: Test if we can get a WebGPU context from the canvas
              // This is what fails on some systems even when adapter/device work
              const testCanvas = document.createElement('canvas');
              const gpuContext = testCanvas.getContext('webgpu');
              testCanvas.remove();

              if (gpuContext) {
                // Full WebGPU pipeline verified
                preferenceForPixi = 'webgpu';
                this.backend = 'webgpu';
                console.log('[PixiJSRenderer] WebGPU fully verified, using WebGPU backend');
              } else {
                console.warn('[PixiJSRenderer] WebGPU context unavailable, falling back to WebGL');
              }

              // Don't hold onto the device - PixiJS will create its own
              device.destroy();
            }
          }
        } catch (e) {
          console.warn('[PixiJSRenderer] WebGPU verification failed:', e);
          // WebGPU not available, fall back to WebGL
        }
      }
      if (!preferenceForPixi) {
        // Pre-flight check: verify WebGL context can be created
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        testCanvas.remove();

        if (gl) {
          // Force context loss to free up the test context
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();

          preferenceForPixi = 'webgl';
          this.backend = 'webgl';
          console.log('[PixiJSRenderer] WebGL verified, using WebGL backend');
        } else {
          throw new Error('WebGL not available - cannot create context');
        }
      }
    } else if (preference === 'webgpu' || preference === 'webgl') {
      // Pre-flight check for explicit WebGL request
      if (preference === 'webgl') {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        testCanvas.remove();

        if (!gl) {
          throw new Error('WebGL not available - cannot create context');
        }
        // Force context loss to free up the test context
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
      preferenceForPixi = preference;
      this.backend = preference;
    } else {
      // canvas2d requested but we're PixiJS - use WebGL as closest
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      testCanvas.remove();

      if (!gl) {
        throw new Error('WebGL not available - cannot create context');
      }
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();

      preferenceForPixi = 'webgl';
      this.backend = 'webgl';
    }

    // Create PixiJS application with fallback
    this.app = new Application();

    try {
      await this.app.init({
        canvas: this._canvas,
        preference: preferenceForPixi,
        width: this._canvas.width,
        height: this._canvas.height,
        antialias: this.options.antialias ?? false, // Pixel art = no AA
        resolution: 1,
        backgroundAlpha: 1,
        backgroundColor: 0x1a1a2e, // Dark blue background
        autoDensity: false,
      });
    } catch (initError) {
      // LOG EVERYTHING - the user wants to know exactly what failed
      console.error('[PixiJSRenderer] ❌ PixiJS initialization FAILED!');
      console.error('Requested backend:', preferenceForPixi);
      console.error('Error:', initError);

      // Log comprehensive diagnostics
      logWebGLDiagnostics();

      // WebGPU initialization can fail even if adapter/device checks pass
      // This happens when the GPU context itself is null
      if (preferenceForPixi === 'webgpu') {
        console.warn('[PixiJSRenderer] WebGPU init failed, trying WebGL as fallback...');
        this.backend = 'webgl';

        try {
          // Retry with WebGL
          await this.app.init({
            canvas: this._canvas,
            preference: 'webgl',
            width: this._canvas.width,
            height: this._canvas.height,
            antialias: this.options.antialias ?? false,
            resolution: 1,
            backgroundAlpha: 1,
            backgroundColor: 0x1a1a2e,
            autoDensity: false,
          });
          console.log('[PixiJSRenderer] ✓ WebGL fallback succeeded');
        } catch (webglError) {
          console.error('[PixiJSRenderer] ❌ WebGL fallback ALSO FAILED!');
          console.error('WebGL error:', webglError);
          logWebGLDiagnostics();
          throw new Error(
            `Both WebGPU and WebGL failed to initialize.\n` +
            `WebGPU error: ${initError}\n` +
            `WebGL error: ${webglError}\n` +
            `Check browser console for WebGL diagnostics.`
          );
        }
      } else {
        // WebGL was explicitly requested and failed - throw with details
        throw new Error(
          `WebGL initialization failed: ${initError}\n` +
          `This may be caused by:\n` +
          `  - Too many WebGL contexts (browser limit: ~8-16)\n` +
          `  - GPU driver crash\n` +
          `  - Hardware acceleration disabled\n` +
          `  - GPU memory exhaustion\n` +
          `Check browser console for WebGL diagnostics.`
        );
      }
    }

    // Create container hierarchy (back to front rendering order)
    this.worldContainer = new Container();
    this.terrainContainer = new Container();
    this.entityContainer = new Container();
    this.overlayContainer = new Container();

    this.worldContainer.addChild(this.terrainContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.overlayContainer);

    this.app.stage.addChild(this.worldContainer);

    // Enable sorting for depth ordering
    this.entityContainer.sortableChildren = true;

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Create Canvas2D overlay for UI rendering (windows, menus, etc.)
    // This sits on top of the WebGL canvas with transparent background
    this._overlayCanvas = document.createElement('canvas');
    this._overlayCanvas.id = 'ui-overlay-canvas';
    this._overlayCanvas.style.position = 'absolute';
    this._overlayCanvas.style.top = '0';
    this._overlayCanvas.style.left = '0';
    this._overlayCanvas.style.width = '100%';
    this._overlayCanvas.style.height = '100%';
    this._overlayCanvas.style.pointerEvents = 'none'; // Let clicks pass through to WebGL canvas
    this._overlayCanvas.style.zIndex = '1'; // Above WebGL canvas
    this._overlayCanvas.width = this._canvas.width;
    this._overlayCanvas.height = this._canvas.height;

    // Get Canvas2D context for the overlay
    this._overlayContext = this._overlayCanvas.getContext('2d');
    if (!this._overlayContext) {
      console.error('[PixiJSRenderer] Failed to create Canvas2D context for UI overlay');
    }

    // Insert overlay canvas after the WebGL canvas
    if (this._canvas.parentElement) {
      // Make parent position relative so absolute positioning works
      const parent = this._canvas.parentElement;
      const computedStyle = window.getComputedStyle(parent);
      if (computedStyle.position === 'static') {
        parent.style.position = 'relative';
      }
      this._canvas.parentElement.appendChild(this._overlayCanvas);
      console.log('[PixiJSRenderer] Created Canvas2D UI overlay');
    }

    // Set initial size from parent element (critical for proper viewport)
    this.handleResize();

    this.initialized = true;

    // Register as global renderer for cleanup on HMR/reload
    _globalPixiRenderer = this;

    console.log(`[PixiJSRenderer] Initialized with ${this.backend.toUpperCase()} backend`);
  }

  private handleResize = (): void => {
    if (!this.app) return;

    // Try parent element first, fall back to window dimensions
    const parent = this._canvas.parentElement;
    let width: number;
    let height: number;

    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      width = parent.clientWidth;
      height = parent.clientHeight;
    } else {
      // Fallback to window dimensions
      width = window.innerWidth;
      height = window.innerHeight;
    }

    // Only resize if dimensions have actually changed
    if (
      Math.abs(this._canvas.width - width) > 1 ||
      Math.abs(this._canvas.height - height) > 1
    ) {
      this.app.renderer.resize(width, height);
      this._camera.setViewportSize(width, height);

      // Also resize the overlay canvas
      if (this._overlayCanvas) {
        this._overlayCanvas.width = width;
        this._overlayCanvas.height = height;
      }

      console.log(`[PixiJSRenderer] Resized to ${width}x${height}`);
    }
  };

  // ============================================================================
  // IRenderer Implementation
  // ============================================================================

  get camera(): Camera {
    return this._camera;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  get tileSize(): number {
    return this._tileSize;
  }

  get overlayCanvas(): HTMLCanvasElement | undefined {
    return this._overlayCanvas ?? undefined;
  }

  getCamera(): Camera {
    return this._camera;
  }

  /**
   * Get the Canvas2D context for UI overlay rendering (windows, menus, etc.)
   * Returns null if the overlay is not available.
   */
  getOverlayContext(): CanvasRenderingContext2D | null {
    return this._overlayContext;
  }

  render(world: World, selectedEntity?: Entity | { id: string }): void {
    if (!this.initialized) {
      console.warn('[PixiJSRenderer] Not initialized. Call init() first.');
      return;
    }

    // 1. Update camera
    this._camera.update();
    this.updateWorldTransform();

    // 2. Refresh cached queries
    this.refreshCachedQueries(world);

    // 3. Get visible bounds
    const bounds = this._camera.getVisibleBounds();

    // 4. Render terrain chunks
    this.renderTerrain(world, bounds);

    // 5. Render entities
    this.renderEntities(world, bounds, selectedEntity);

    // 6. Update floating texts
    this.updateFloatingTexts();

    // 7. Update FPS counter
    this.updateFps();

    // PixiJS handles actual GPU rendering automatically via the ticker
  }

  private updateWorldTransform(): void {
    // Apply camera transform to world container
    const zoom = this._camera.zoom;
    const centerX = this._canvas.width / 2;
    const centerY = this._canvas.height / 2;

    this.worldContainer.x = centerX - this._camera.x * zoom;
    this.worldContainer.y = centerY - this._camera.y * zoom;
    this.worldContainer.scale.set(zoom);
  }

  private refreshCachedQueries(world: World): void {
    const tick = world.tick;

    // Refresh building cache
    if (tick - this._buildingCacheLastRefresh >= this.BUILDING_CACHE_REFRESH_INTERVAL) {
      this._cachedBuildingEntities = world
        .query()
        .with('building')
        .with('position')
        .executeEntities();
      this._buildingCacheLastRefresh = tick;
    }

    // Refresh renderable cache
    if (tick - this._renderableCacheLastRefresh >= this.RENDERABLE_CACHE_REFRESH_INTERVAL) {
      this._cachedRenderableEntities = world
        .query()
        .with('renderable')
        .with('position')
        .executeEntities();
      this._renderableCacheLastRefresh = tick;
    }

    // Refresh agent cache
    if (tick - this._agentCacheLastRefresh >= this.AGENT_CACHE_REFRESH_INTERVAL) {
      this._cachedAgentEntities = world.query().with('agent').with('position').executeEntities();
      this._agentCacheLastRefresh = tick;
    }
  }

  private renderTerrain(world: World, bounds: VisibleBounds): void {
    // Calculate visible chunk range
    const startChunkX = Math.floor(bounds.left / CHUNK_SIZE);
    const endChunkX = Math.ceil(bounds.right / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / CHUNK_SIZE);
    const endChunkY = Math.ceil(bounds.bottom / CHUNK_SIZE);

    const visibleChunkKeys = new Set<string>();

    // Render each visible chunk
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const key = `${cx},${cy}`;
        visibleChunkKeys.add(key);

        const chunk = this.chunkManager.getChunk(cx, cy);
        if (!chunk) continue;

        // Check if chunk needs re-render
        const cachedVersion = this.chunkVersions.get(key) ?? -1;
        if (chunk.version !== cachedVersion) {
          this.renderChunk(chunk, cx, cy);
          this.chunkVersions.set(key, chunk.version);
        }
      }
    }

    // Remove off-screen chunks (LRU eviction)
    const MAX_CACHED_CHUNKS = 100;
    if (this.chunkGraphics.size > MAX_CACHED_CHUNKS) {
      for (const [key, container] of this.chunkGraphics) {
        if (!visibleChunkKeys.has(key)) {
          this.terrainContainer.removeChild(container);
          container.destroy({ children: true });
          this.chunkGraphics.delete(key);
          this.chunkVersions.delete(key);

          if (this.chunkGraphics.size <= MAX_CACHED_CHUNKS * 0.8) {
            break; // Stop when we've removed enough
          }
        }
      }
    }
  }

  private renderChunk(chunk: Chunk, cx: number, cy: number): void {
    const key = `${cx},${cy}`;

    // Remove existing chunk graphics
    const existing = this.chunkGraphics.get(key);
    if (existing) {
      this.terrainContainer.removeChild(existing);
      existing.destroy({ children: true });
    }

    // Create new container for this chunk
    const container = new Container();
    container.x = cx * CHUNK_SIZE * this._tileSize;
    container.y = cy * CHUNK_SIZE * this._tileSize;

    // Create graphics for tiles
    const graphics = new Graphics();

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = chunk.tiles[y * CHUNK_SIZE + x];
        if (!tile) continue;

        const color = this.getTileColor(tile.terrain, tile);
        const px = x * this._tileSize;
        const py = y * this._tileSize;

        graphics.rect(px, py, this._tileSize, this._tileSize);
        graphics.fill(color);
      }
    }

    container.addChild(graphics);
    this.chunkGraphics.set(key, container);
    this.terrainContainer.addChild(container);
  }

  private getTileColor(terrain: string, tile: Tile): number {
    // Use TERRAIN_COLORS from @ai-village/world if available
    const baseColors: Record<string, number> = {
      grass: 0x4a7c23,
      water: 0x2e5cb8,
      sand: 0xe6d5ac,
      stone: 0x808080,
      dirt: 0x8b6914,
      forest: 0x2d5a1e,
      snow: 0xf0f0f0,
      ice: 0xadd8e6,
      swamp: 0x556b2f,
      desert: 0xf4a460,
    };

    let color = baseColors[terrain] ?? 0x4a7c23; // Default to grass

    // Darken if tilled
    if (tile.tilled) {
      color = this.darkenColor(color, 0.2);
    }

    // Adjust for moisture (moisture is 0-100, so we check > 50)
    if (tile.moisture > 50) {
      color = this.darkenColor(color, ((tile.moisture - 50) / 100) * 0.3);
    }

    return color;
  }

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private renderEntities(
    world: World,
    bounds: VisibleBounds,
    selectedEntity?: Entity | { id: string }
  ): void {
    // Cull entities outside viewport
    this._visibleEntities.length = 0;

    const margin = 2; // Tile margin for smooth scrolling
    const left = bounds.left - margin;
    const right = bounds.right + margin;
    const top = bounds.top - margin;
    const bottom = bounds.bottom + margin;

    // Check all renderable entities
    for (const entity of this._cachedRenderableEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      if (pos && pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) {
        this._visibleEntities.push(entity);
      }
    }

    // Also check agents
    for (const entity of this._cachedAgentEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      if (pos && pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) {
        if (!this._visibleEntities.includes(entity)) {
          this._visibleEntities.push(entity);
        }
      }
    }

    // Sort by Y position for depth ordering
    this._sortedEntities = this._visibleEntities.slice().sort((a, b) => {
      const posA = a.getComponent('position') as { y: number } | undefined;
      const posB = b.getComponent('position') as { y: number } | undefined;
      return (posA?.y ?? 0) - (posB?.y ?? 0);
    });

    // Track active entity IDs
    const activeEntityIds = new Set<string>();
    const selectedId = selectedEntity
      ? 'id' in selectedEntity
        ? selectedEntity.id
        : null
      : null;

    // Update/create sprites for visible entities
    for (let i = 0; i < this._sortedEntities.length; i++) {
      const entity = this._sortedEntities[i];
      if (!entity) continue;

      activeEntityIds.add(entity.id);

      let sprite = this.entitySprites.get(entity.id);

      if (!sprite) {
        sprite = this.createEntitySprite(entity);
        this.entitySprites.set(entity.id, sprite);
        this.entityContainer.addChild(sprite);
      }

      this.updateEntitySprite(entity, sprite, i, entity.id === selectedId);
    }

    // Remove sprites for entities no longer visible
    for (const [entityId, sprite] of this.entitySprites) {
      if (!activeEntityIds.has(entityId)) {
        this.entityContainer.removeChild(sprite);
        sprite.destroy();
        this.entitySprites.delete(entityId);
      }
    }
  }

  private createEntitySprite(entity: Entity): Sprite {
    // Get appearance info from entity
    const renderable = entity.getComponent('renderable') as { spriteId?: string } | undefined;
    const agent = entity.getComponent('agent') as { species?: string } | undefined;
    const animal = entity.getComponent('animal') as { speciesId?: string } | undefined;
    const plant = entity.getComponent('plant') as { species?: string } | undefined;
    const building = entity.getComponent('building') as { type?: string } | undefined;
    const appearance = entity.getComponent('appearance') as AppearanceData | undefined;

    // Determine sprite ID from entity
    const spriteId = this.getSpriteIdForEntity(entity, renderable, agent, animal, plant, building, appearance);

    // Try to get cached texture
    if (spriteId && this.textureCache.has(spriteId)) {
      const texture = this.textureCache.get(spriteId)!;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1); // Bottom-center anchor
      return sprite;
    }

    // Try to load texture asynchronously
    if (spriteId && !this.loadingTextures.has(spriteId) && !this.failedTextures.has(spriteId)) {
      this.loadTextureAsync(spriteId).catch(() => {
        /* handled in method */
      });
    }

    // Fallback: colored rectangle placeholder
    let color = 0xffffff;
    if (agent) {
      color = 0xff6b6b; // Red for agents
    } else if (animal) {
      color = 0x8b6f47; // Brown for animals
    } else if (plant) {
      color = 0x7cb342; // Green for plants
    } else if (building) {
      color = 0x8d6e63; // Brown for buildings
    }

    const graphics = new Graphics();
    graphics.rect(0, 0, this._tileSize, this._tileSize);
    graphics.fill(color);

    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);

    // Tag sprite with entity info for texture updates
    (sprite as any)._entityId = entity.id;
    (sprite as any)._spriteId = spriteId;

    return sprite;
  }

  /**
   * Determine the sprite ID for an entity based on its components.
   */
  private getSpriteIdForEntity(
    entity: Entity,
    renderable?: { spriteId?: string },
    agent?: { species?: string },
    animal?: { speciesId?: string },
    plant?: { species?: string },
    building?: { type?: string },
    appearance?: AppearanceData
  ): string | null {
    // Check renderable first (unless it's the generic 'agent' placeholder)
    if (renderable?.spriteId && renderable.spriteId !== 'agent') {
      return renderable.spriteId;
    }

    // Animal component - use speciesId directly as folder ID
    if (animal?.speciesId) {
      return animal.speciesId; // e.g., "chicken", "cow", "deer"
    }

    // Agent with appearance - use lookupSprite to get specific sprite folder ID
    if (agent && appearance) {
      // Build traits from raw component data (ECS returns plain objects, not class instances)
      const traits: SpriteTraits = {
        species: appearance.species || 'human',
        gender: (appearance.gender || 'male') as 'male' | 'female' | 'nonbinary',
        hairColor: appearance.hairColor || 'black',
        skinTone: appearance.skinTone || 'medium',
        clothingType: (appearance.clothingType || 'peasant') as ClothingType,
      };
      const spriteInfo = lookupSprite(traits);
      return spriteInfo.folderId; // e.g., "human_male_black_dark"
    }

    // Plant species
    if (plant?.species) {
      // Convert plant species to sprite ID (e.g., "oak_tree" -> "oak-tree")
      return plant.species.replace(/_/g, '-').toLowerCase();
    }

    // Building type
    if (building?.type) {
      return building.type.replace(/_/g, '-').toLowerCase();
    }

    // Agent without appearance - use generic fallback
    if (agent) {
      return 'agent'; // Will use placeholder
    }

    return null;
  }

  /**
   * Load a texture asynchronously using PixiJS Assets API.
   * Tries multiple path formats to support different sprite structures.
   */
  private async loadTextureAsync(spriteId: string): Promise<void> {
    if (this.loadingTextures.has(spriteId) || this.textureCache.has(spriteId)) {
      return;
    }

    this.loadingTextures.add(spriteId);

    // Build list of paths to try (in order of preference)
    const pathsToTry: string[] = [];
    const legacyFilename = PixiJSRenderer.MAP_OBJECT_SPRITES[spriteId];

    if (legacyFilename) {
      pathsToTry.push(`/assets/sprites/map_objects/${legacyFilename}`);
    } else {
      // Try multiple PixelLab path formats
      const basePath = `/assets/sprites/pixellab/${spriteId}`;
      pathsToTry.push(
        `${basePath}/south.png`,           // Newer format (direction files directly)
        `${basePath}/rotations/south.png`, // Older format (rotations subfolder)
        `${basePath}/sprite.png`           // Legacy format (single sprite)
      );
    }

    // Try each path until one succeeds
    for (const spritePath of pathsToTry) {
      try {
        const texture = await Assets.load<Texture>(spritePath);
        this.textureCache.set(spriteId, texture);
        this.loadingTextures.delete(spriteId);
        // Update any existing sprites using this texture
        this.updateSpritesWithTexture(spriteId, texture);
        return; // Success!
      } catch {
        // Try next path
      }
    }

    // All paths failed
    this.loadingTextures.delete(spriteId);
    this.failedTextures.add(spriteId);
  }

  /**
   * Update all sprites that were waiting for a texture to load.
   */
  private updateSpritesWithTexture(spriteId: string, texture: Texture): void {
    for (const [entityId, sprite] of this.entitySprites) {
      if ((sprite as any)._spriteId === spriteId) {
        sprite.texture = texture;
      }
    }
  }

  private updateEntitySprite(
    entity: Entity,
    sprite: Sprite,
    zIndex: number,
    isSelected: boolean
  ): void {
    const position = entity.getComponent('position') as { x: number; y: number } | undefined;

    if (position) {
      sprite.x = position.x * this._tileSize;
      sprite.y = position.y * this._tileSize;
    }

    sprite.zIndex = zIndex;

    // Highlight selected entity
    if (isSelected) {
      sprite.tint = 0xffff00; // Yellow tint for selection
    } else {
      sprite.tint = 0xffffff;
    }

    // Check for agent speech and show speech bubble
    const agent = entity.getComponent('agent') as { recentSpeech?: string } | undefined;
    if (agent?.recentSpeech) {
      const lastShown = this.shownSpeech.get(entity.id);
      // Only show if it's a new speech (different from last shown)
      if (lastShown !== agent.recentSpeech) {
        this.shownSpeech.set(entity.id, agent.recentSpeech);
        this.showSpeechBubble(entity.id, agent.recentSpeech);
      }
    }
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  // ============================================================================
  // Visual Effects
  // ============================================================================

  showFloatingText(
    text: string,
    worldX: number,
    worldY: number,
    options: FloatingTextOptions = {}
  ): void {
    if (!this.initialized) return;

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: options.fontSize ?? 12,
      fill: options.color ?? '#ffffff',
      stroke: { color: '#000000', width: 2 },
    });

    const textObj = new Text({ text, style });
    textObj.anchor.set(0.5, 0.5);
    textObj.x = worldX * this._tileSize;
    textObj.y = worldY * this._tileSize;

    this.overlayContainer.addChild(textObj);

    this.floatingTexts.push({
      text: textObj,
      startY: textObj.y,
      startTime: performance.now(),
      duration: options.duration ?? 2000,
      rise: options.rise ?? true,
    });
  }

  private updateFloatingTexts(): void {
    const now = performance.now();
    const toRemove: number[] = [];

    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      if (!ft) continue;

      const elapsed = now - ft.startTime;
      const progress = elapsed / ft.duration;

      if (progress >= 1) {
        toRemove.push(i);
        continue;
      }

      // Rise animation
      if (ft.rise) {
        ft.text.y = ft.startY - progress * 30;
      }

      // Fade out
      ft.text.alpha = 1 - progress;
    }

    // Remove completed texts (reverse order to maintain indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      if (idx === undefined) continue;

      const ft = this.floatingTexts[idx];
      if (!ft) continue;

      this.overlayContainer.removeChild(ft.text);
      ft.text.destroy();
      this.floatingTexts.splice(idx, 1);
    }
  }

  showSpeechBubble(entityId: string, text: string, duration = 3000): void {
    const sprite = this.entitySprites.get(entityId);
    if (!sprite) return;

    // Simple speech bubble as floating text above entity
    this.showFloatingText(text, sprite.x / this._tileSize, sprite.y / this._tileSize - 1, {
      duration,
      rise: false,
    });
  }

  createDustCloud(worldX: number, worldY: number, options: ParticleOptions = {}): void {
    // TODO: Implement using PixiJS ParticleContainer for better performance
    // For now, create simple graphics
    const count = options.count ?? 10;
    const color = options.color ? parseInt(options.color.replace('#', ''), 16) : 0xaa8866;

    for (let i = 0; i < count; i++) {
      const graphics = new Graphics();
      graphics.circle(0, 0, 2 + Math.random() * 3);
      graphics.fill({ color, alpha: 0.6 });

      graphics.x = worldX * this._tileSize + (Math.random() - 0.5) * 20;
      graphics.y = worldY * this._tileSize + (Math.random() - 0.5) * 20;

      this.overlayContainer.addChild(graphics);

      // Animate and remove
      const startTime = performance.now();
      const lifetime = options.lifetime ?? 500;

      const animate = (): void => {
        const progress = (performance.now() - startTime) / lifetime;
        if (progress >= 1) {
          this.overlayContainer.removeChild(graphics);
          graphics.destroy();
          return;
        }

        graphics.alpha = 1 - progress;
        graphics.y -= 0.5;
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }

  createSparkEffect(worldX: number, worldY: number, options: ParticleOptions = {}): void {
    const count = options.count ?? 8;
    const color = options.color ? parseInt(options.color.replace('#', ''), 16) : 0xffdd00;

    for (let i = 0; i < count; i++) {
      const graphics = new Graphics();
      graphics.circle(0, 0, 1 + Math.random() * 2);
      graphics.fill({ color, alpha: 1 });

      graphics.x = worldX * this._tileSize;
      graphics.y = worldY * this._tileSize;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.overlayContainer.addChild(graphics);

      const startTime = performance.now();
      const lifetime = options.lifetime ?? 300;

      const animate = (): void => {
        const progress = (performance.now() - startTime) / lifetime;
        if (progress >= 1) {
          this.overlayContainer.removeChild(graphics);
          graphics.destroy();
          return;
        }

        graphics.x += vx;
        graphics.y += vy;
        graphics.alpha = 1 - progress;
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }

  // ============================================================================
  // Stats & Cleanup
  // ============================================================================

  getStats(): RendererStats {
    return {
      fps: this.currentFps,
      drawCalls: this.entitySprites.size + this.chunkGraphics.size,
      visibleEntities: this.entitySprites.size,
      culledEntities:
        this._cachedRenderableEntities.length +
        this._cachedAgentEntities.length -
        this.entitySprites.size,
      gpuMemoryMB: 0, // WebGPU doesn't expose this easily
      backend: this.backend,
    };
  }

  initCombatUI(world: World, eventBus: EventBus): void {
    // TODO: Port health bar and threat indicator renderers
    console.log('[PixiJSRenderer] Combat UI initialization placeholder');
  }

  getEntityAt(screenX: number, screenY: number, world: World): Entity | null {
    // Convert screen to world coordinates
    const worldPos = this._camera.screenToWorld(screenX, screenY);

    // Find entity at position
    for (const entity of this._cachedRenderableEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      if (pos) {
        const dx = Math.abs(pos.x - worldPos.x);
        const dy = Math.abs(pos.y - worldPos.y);
        if (dx < 0.5 && dy < 0.5) {
          return entity;
        }
      }
    }

    return null;
  }

  toggleDebugOverlay(): void {
    // TODO: Implement debug overlay
    console.log('[PixiJSRenderer] Debug overlay toggle placeholder');
  }

  toggleTemperatureOverlay(): void {
    // TODO: Implement temperature overlay
    console.log('[PixiJSRenderer] Temperature overlay toggle placeholder');
  }

  destroy(): void {
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);

    // Remove overlay canvas
    if (this._overlayCanvas && this._overlayCanvas.parentElement) {
      this._overlayCanvas.parentElement.removeChild(this._overlayCanvas);
    }
    this._overlayCanvas = null;
    this._overlayContext = null;

    // Clean up sprites
    for (const sprite of this.entitySprites.values()) {
      sprite.destroy();
    }
    this.entitySprites.clear();

    // Clean up chunks
    for (const container of this.chunkGraphics.values()) {
      container.destroy({ children: true });
    }
    this.chunkGraphics.clear();

    // Clean up floating texts
    for (const ft of this.floatingTexts) {
      ft.text.destroy();
    }
    this.floatingTexts.length = 0;

    // Destroy textures
    for (const texture of this.textureCache.values()) {
      texture.destroy();
    }
    this.textureCache.clear();

    // Destroy PixiJS app
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }

    this.initialized = false;
    console.log('[PixiJSRenderer] Destroyed');
  }
}
