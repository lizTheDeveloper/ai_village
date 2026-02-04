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
  ParticleContainer,
  type Renderer as PixiRenderer,
} from 'pixi.js';
import type { World, Entity, EventBus } from '@ai-village/core';
import { clamp, clamp01 } from '@ai-village/core';
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
import { getPixelLabSpriteLoader, type PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';

/**
 * Extended Sprite type with entity metadata for texture updates.
 * Used to tag sprites with their source entity/sprite info for later lookup.
 */
interface EntitySprite extends Sprite {
  _entityId: string;
  _spriteId: string;
}

/**
 * Type guard to check if a Sprite has entity metadata attached.
 */
function isEntitySprite(sprite: Sprite): sprite is EntitySprite {
  return '_entityId' in sprite && '_spriteId' in sprite;
}

// Global renderer instance for cleanup on HMR/reload
// This prevents WebGL context leaks that cause "CanvasRenderer is not yet implemented" errors
let _globalPixiRenderer: PixiJSRenderer | null = null;

/**
 * Clean up any existing PixiJS renderer before creating a new one.
 * Call this before createRenderer() to prevent WebGL context exhaustion.
 */
export function cleanupExistingRenderer(): void {
  if (_globalPixiRenderer) {
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
      // Don't destroy on background - renderer stays active
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
  // Context count
  const contextInfo = countActiveWebGLContexts();
  console.log(`[WebGL Diagnostics] Active WebGL contexts: ${contextInfo.total}`);
  console.log('[WebGL Diagnostics] Browser limit: typically 8-16 contexts');
  for (const detail of contextInfo.details) {
    console.log(`[WebGL Diagnostics]   ${detail}`);
  }

  // GPU info
  console.log('[WebGL Diagnostics] GPU/WebGL capabilities:');
  const diagnostics = getWebGLDiagnostics();
  for (const [key, value] of Object.entries(diagnostics)) {
    console.log(`[WebGL Diagnostics]   ${key}: ${value}`);
  }

  // Memory info (Chrome only)
  if ((performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
    const mem = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    console.log('[WebGL Diagnostics] Memory:');
    console.log(`[WebGL Diagnostics]   JS Heap: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB / ${(mem.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`);
  }
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
    // WebGL context restored - renderer should automatically recover
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

  // Particle system for effects (dust, sparks, etc.)
  private particleContainer!: ParticleContainer;
  private particleTexture!: Texture;
  private activeParticles: Array<{
    sprite: Sprite;
    startTime: number;
    lifetime: number;
    velocityX: number;
    velocityY: number;
  }> = [];

  // Sprite management
  private entitySprites: Map<string, Sprite> = new Map();
  private textureCache: Map<string, Texture> = new Map();
  private chunkGraphics: Map<string, Container> = new Map();
  private chunkVersions: Map<string, number> = new Map();
  private loadingTextures: Set<string> = new Set();
  private failedTextures: Set<string> = new Set();

  // Speech bubble tracking - tracks shown speech to avoid duplicates
  private shownSpeech: Map<string, string> = new Map(); // entityId -> lastSpeechText

  // Health bar graphics pool - reuse Graphics objects for performance
  private healthBarGraphics: Map<string, Graphics> = new Map();

  // Threat indicator tracking
  private threats: Map<string, { entityId: string; severity: string; timestamp: number }> = new Map();
  private threatIndicators: Map<string, Graphics> = new Map();

  // Event handler references for cleanup
  private conflictStartedHandler: ((event: any) => void) | null = null;
  private conflictResolvedHandler: ((event: any) => void) | null = null;
  private deathHandler: ((event: any) => void) | null = null;
  private eventBus: EventBus | null = null;

  // Health bar configuration
  private readonly HEALTH_BAR_WIDTH = 32;
  private readonly HEALTH_BAR_HEIGHT = 4;
  private readonly HEALTH_BAR_OFFSET_Y = -12;
  private readonly HEALTH_GOOD = 0.66;
  private readonly HEALTH_MODERATE = 0.33;

  // Threat indicator configuration
  private readonly THREAT_INDICATOR_SIZE = 16;
  private readonly PULSE_SPEED = 0.003;
  private readonly SEVERITY_COLORS: Record<string, number> = {
    low: 0xffff00,
    medium: 0xff9900,
    high: 0xff0000,
    critical: 0xcc0033,
  };

  // Debug overlay state
  private showDebugOverlay = false;
  private debugText: Text | null = null;
  private cityBoundaryGraphics: Graphics | null = null;

  // Temperature overlay state
  private showTemperatureOverlay = false;
  private temperatureTexts: Map<string, Text> = new Map();

  // Canvas2D overlay for UI rendering (windows, menus, etc.)
  private _overlayCanvas: HTMLCanvasElement | null = null;
  private _overlayContext: CanvasRenderingContext2D | null = null;

  // PixelLab sprite loader for loading character sprites
  private _pixelLabLoader: PixelLabSpriteLoader;

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
  // NOTE: lastRefresh initialized to -Infinity to ensure first-frame refresh
  private _cachedBuildingEntities: readonly Entity[] = [];
  private _buildingCacheLastRefresh = -Infinity;
  private readonly BUILDING_CACHE_REFRESH_INTERVAL = 60;

  private _cachedRenderableEntities: readonly Entity[] = [];
  private _renderableCacheLastRefresh = -Infinity;
  private readonly RENDERABLE_CACHE_REFRESH_INTERVAL = 20;

  private _cachedAgentEntities: readonly Entity[] = [];
  private _agentCacheLastRefresh = -Infinity;
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
    this._pixelLabLoader = getPixelLabSpriteLoader('/assets/sprites/pixellab');
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

    // Create particle container for high-performance particle effects
    // ParticleContainer uses WebGL batching for 10-100x better performance than Graphics
    // PixiJS v8 API: options object with dynamicProperties
    this.particleContainer = new ParticleContainer({
      dynamicProperties: {
        scale: true,
        position: true,
        rotation: false,
        alpha: true,
      },
    });
    this.overlayContainer.addChild(this.particleContainer);

    // Create shared particle texture (simple white circle)
    this.particleTexture = this.createParticleTexture();

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
    }

    // Set initial size from parent element (critical for proper viewport)
    this.handleResize();

    this.initialized = true;

    // Register as global renderer for cleanup on HMR/reload
    _globalPixiRenderer = this;
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

  get pixelLabLoader(): PixelLabSpriteLoader {
    return this._pixelLabLoader;
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

    // 7. Update particles
    this.updateParticles();

    // 8. Render health bars and threat indicators (combat UI)
    this.renderHealthBars();
    this.renderThreatIndicators(world);

    // 9. Render debug and temperature overlays
    this.renderDebugOverlay(world);
    this.renderTemperatureOverlay(world);

    // 10. Update FPS counter
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

    const sprite = new Sprite(texture) as EntitySprite;
    sprite.anchor.set(0.5, 1);

    // Tag sprite with entity info for texture updates
    sprite._entityId = entity.id;
    sprite._spriteId = spriteId;

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

    // All paths failed - log once and mark as failed
    console.warn(`[PixiJSRenderer] Failed to load texture for sprite '${spriteId}' - tried ${pathsToTry.length} paths`);
    this.loadingTextures.delete(spriteId);
    this.failedTextures.add(spriteId);
  }

  /**
   * Update all sprites that were waiting for a texture to load.
   */
  private updateSpritesWithTexture(spriteId: string, texture: Texture): void {
    for (const [entityId, sprite] of this.entitySprites) {
      if (isEntitySprite(sprite) && sprite._spriteId === spriteId) {
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

  /**
   * Create a reusable particle texture.
   * Creates a simple white circle that can be tinted to any color.
   * @returns Texture for particle sprites
   */
  private createParticleTexture(): Texture {
    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw white circle with soft edge
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }

    return Texture.from(canvas);
  }

  createDustCloud(worldX: number, worldY: number, options: ParticleOptions = {}): void {
    // Use ParticleContainer for better performance (10-100x faster than Graphics)
    const count = options.count ?? 10;
    const lifetime = options.lifetime ?? 500;
    const colorHex = options.color ? parseInt(options.color.replace('#', ''), 16) : 0xaa8866;
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      // Create sprite from shared particle texture
      const sprite = new Sprite(this.particleTexture);
      sprite.tint = colorHex;
      sprite.alpha = 0.6;
      sprite.anchor.set(0.5);
      sprite.scale.set(0.5 + Math.random() * 0.5);

      // Position with random spread
      sprite.x = worldX * this._tileSize + (Math.random() - 0.5) * 20;
      sprite.y = worldY * this._tileSize + (Math.random() - 0.5) * 20;

      // Add to particle container (WebGL batching)
      this.particleContainer.addChild(sprite);

      // Track particle for animation
      this.activeParticles.push({
        sprite,
        startTime,
        lifetime,
        velocityX: (Math.random() - 0.5) * 0.5,
        velocityY: -0.5 - Math.random() * 0.5,
      });
    }
  }

  /**
   * Update all active particles.
   * Called from render() every frame to animate particles.
   */
  private updateParticles(): void {
    const now = performance.now();
    const particlesToRemove: number[] = [];

    for (let i = 0; i < this.activeParticles.length; i++) {
      const particle = this.activeParticles[i];
      if (!particle) continue;

      const elapsed = now - particle.startTime;
      const progress = elapsed / particle.lifetime;

      if (progress >= 1) {
        // Particle expired - mark for removal
        particlesToRemove.push(i);
        this.particleContainer.removeChild(particle.sprite);
        particle.sprite.destroy();
        continue;
      }

      // Animate particle
      particle.sprite.alpha = 0.6 * (1 - progress); // Fade out
      particle.sprite.x += particle.velocityX;
      particle.sprite.y += particle.velocityY;
    }

    // Remove expired particles (reverse order to maintain indices)
    for (let i = particlesToRemove.length - 1; i >= 0; i--) {
      const idx = particlesToRemove[i];
      if (idx !== undefined) {
        this.activeParticles.splice(idx, 1);
      }
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
    this.eventBus = eventBus;

    // Set up event handlers for threat tracking
    this.conflictStartedHandler = (event: any) => {
      const data = event.data || event;
      if (!data.conflictId || !data.participants || !data.type) return;
      const threatLevel = data.threatLevel || 'medium';
      const attacker = data.participants[0];
      this.threats.set(data.conflictId, {
        entityId: attacker,
        severity: threatLevel,
        timestamp: Date.now(),
      });
    };

    this.conflictResolvedHandler = (event: any) => {
      const data = event.data || event;
      if (!data.conflictId) return;
      this.threats.delete(data.conflictId);
      // Remove threat indicator
      const indicator = this.threatIndicators.get(data.conflictId);
      if (indicator) {
        this.overlayContainer.removeChild(indicator);
        indicator.destroy();
        this.threatIndicators.delete(data.conflictId);
      }
    };

    this.deathHandler = (event: any) => {
      const data = event.data || event;
      if (!data.entityId) return;
      // Remove all threats for this entity
      for (const [id, threat] of this.threats.entries()) {
        if (threat.entityId === data.entityId) {
          this.threats.delete(id);
          const indicator = this.threatIndicators.get(id);
          if (indicator) {
            this.overlayContainer.removeChild(indicator);
            indicator.destroy();
            this.threatIndicators.delete(id);
          }
        }
      }
    };

    eventBus.on('conflict:started', this.conflictStartedHandler);
    eventBus.on('conflict:resolved', this.conflictResolvedHandler);
    eventBus.on('death:occurred', this.deathHandler);
  }

  /**
   * Render health bars for entities that need them.
   * Called from render() each frame.
   */
  private renderHealthBars(): void {
    const activeEntities = new Set<string>();

    // Check all cached agent entities for health display
    for (const entity of this._cachedAgentEntities) {
      const needs = entity.getComponent('needs') as { health?: number } | undefined;
      const combatStats = entity.getComponent('combat_stats') as object | undefined;
      const conflict = entity.getComponent('conflict') as object | undefined;
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;

      // Skip if no needs or combat stats
      if (!needs || !combatStats || !pos) continue;

      // Only show health bar if damaged or in combat
      const health = needs.health ?? 1.0;
      if (health >= 1.0 && !conflict) continue;

      activeEntities.add(entity.id);

      let graphics = this.healthBarGraphics.get(entity.id);
      if (!graphics) {
        graphics = new Graphics();
        this.overlayContainer.addChild(graphics);
        this.healthBarGraphics.set(entity.id, graphics);
      }

      // Position in world space
      const worldX = pos.x * this._tileSize;
      const worldY = pos.y * this._tileSize + this.HEALTH_BAR_OFFSET_Y;

      graphics.x = worldX - this.HEALTH_BAR_WIDTH / 2;
      graphics.y = worldY;

      // Clear and redraw
      graphics.clear();

      // Background (black)
      graphics.rect(0, 0, this.HEALTH_BAR_WIDTH, this.HEALTH_BAR_HEIGHT);
      graphics.fill(0x000000);

      // Border (white)
      graphics.rect(0, 0, this.HEALTH_BAR_WIDTH, this.HEALTH_BAR_HEIGHT);
      graphics.stroke({ color: 0xffffff, width: 1 });

      // Health fill
      const fillWidth = clamp01(health) * this.HEALTH_BAR_WIDTH;
      let fillColor: number;
      if (health >= this.HEALTH_GOOD) {
        fillColor = 0x00ff00; // Green
      } else if (health >= this.HEALTH_MODERATE) {
        fillColor = 0xffff00; // Yellow
      } else {
        fillColor = 0xff0000; // Red
      }
      graphics.rect(0, 0, fillWidth, this.HEALTH_BAR_HEIGHT);
      graphics.fill(fillColor);

      graphics.visible = true;
    }

    // Remove health bars for entities that no longer need them
    for (const [entityId, graphics] of this.healthBarGraphics) {
      if (!activeEntities.has(entityId)) {
        this.overlayContainer.removeChild(graphics);
        graphics.destroy();
        this.healthBarGraphics.delete(entityId);
      }
    }
  }

  /**
   * Render threat indicators for active threats.
   * Called from render() each frame.
   */
  private renderThreatIndicators(world: World): void {
    const bounds = this._camera.getVisibleBounds();
    const viewWidth = this._canvas.width;
    const viewHeight = this._canvas.height;

    for (const [conflictId, threat] of this.threats) {
      const entity = world.getEntity(threat.entityId);
      if (!entity) {
        this.threats.delete(conflictId);
        continue;
      }

      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      if (!pos) continue;

      let graphics = this.threatIndicators.get(conflictId);
      if (!graphics) {
        graphics = new Graphics();
        this.overlayContainer.addChild(graphics);
        this.threatIndicators.set(conflictId, graphics);
      }

      // Check if threat is on screen
      const screenX = (pos.x - bounds.left) * this._camera.zoom;
      const screenY = (pos.y - bounds.top) * this._camera.zoom;
      const isOnScreen = screenX >= 0 && screenX <= viewWidth && screenY >= 0 && screenY <= viewHeight;

      const color = this.SEVERITY_COLORS[threat.severity] ?? this.SEVERITY_COLORS['medium']!;

      // Pulsing for high/critical severity
      const pulseOffset = (threat.severity === 'high' || threat.severity === 'critical')
        ? Math.sin(Date.now() * this.PULSE_SPEED) * 3
        : 0;

      graphics.clear();

      if (isOnScreen) {
        // Draw in-world indicator (exclamation mark in circle)
        const size = this.THREAT_INDICATOR_SIZE + pulseOffset;
        const indicatorX = pos.x * this._tileSize;
        const indicatorY = pos.y * this._tileSize - 20;

        graphics.x = indicatorX;
        graphics.y = indicatorY;

        // Background circle
        graphics.circle(0, 0, size / 2);
        graphics.fill({ color, alpha: 0.8 });

        // No text in Graphics - just the indicator is enough
      } else {
        // Draw off-screen arrow pointing to threat
        const centerX = viewWidth / 2;
        const centerY = viewHeight / 2;
        const dx = screenX - centerX;
        const dy = screenY - centerY;
        const angle = Math.atan2(dy, dx);

        // Calculate arrow position on screen edge
        const arrowMargin = 20;
        let arrowX: number, arrowY: number;

        const absAngle = Math.abs(angle);
        const tanAngle = Math.tan(absAngle);

        if (absAngle < Math.atan2(viewHeight / 2, viewWidth / 2)) {
          arrowX = dx > 0 ? viewWidth - arrowMargin : arrowMargin;
          arrowY = centerY + (arrowX - centerX) * tanAngle * Math.sign(dy);
        } else {
          arrowY = dy > 0 ? viewHeight - arrowMargin : arrowMargin;
          arrowX = centerX + (arrowY - centerY) / tanAngle * Math.sign(dx);
        }

        arrowX = clamp(arrowX, arrowMargin, viewWidth - arrowMargin);
        arrowY = clamp(arrowY, arrowMargin, viewHeight - arrowMargin);

        // Position in screen space (convert to world space for container)
        // For off-screen arrows, we need screen coordinates relative to world container
        graphics.x = (arrowX + this._camera.x * this._camera.zoom - this._canvas.width / 2) / this._camera.zoom;
        graphics.y = (arrowY + this._camera.y * this._camera.zoom - this._canvas.height / 2) / this._camera.zoom;

        // Draw arrow shape
        const arrowSize = 12;
        graphics.moveTo(arrowSize * Math.cos(angle), arrowSize * Math.sin(angle));
        graphics.lineTo(-arrowSize / 2 * Math.cos(angle + Math.PI / 2), -arrowSize / 2 * Math.sin(angle + Math.PI / 2));
        graphics.lineTo(-arrowSize / 2 * Math.cos(angle - Math.PI / 2), -arrowSize / 2 * Math.sin(angle - Math.PI / 2));
        graphics.closePath();
        graphics.fill({ color, alpha: 0.9 });
        graphics.stroke({ color: 0x000000, width: 2 });
      }

      graphics.visible = true;
    }
  }

  /**
   * Debug function to log current agent positions and sprite states.
   * Call from browser console: window.game.renderer.debugAgentPositions()
   *
   * This function comprehensively checks all components required for movement:
   * - Position (required by MovementSystem + SteeringSystem)
   * - Velocity (required by SteeringSystem)
   * - Movement (required by MovementSystem)
   * - Steering (behavior + target)
   */
  debugAgentPositions(): void {
    console.log('[PixiJSRenderer] Agent Debug Info');
    console.log(`[PixiJSRenderer] Cached agents: ${this._cachedAgentEntities.length}`);
    console.log(`[PixiJSRenderer] Entity sprites: ${this.entitySprites.size}`);
    console.log(`[PixiJSRenderer] Visible entities: ${this._visibleEntities.length}`);
    console.log(`[PixiJSRenderer] Cache refresh ticks - agents: ${this._agentCacheLastRefresh}, renderables: ${this._renderableCacheLastRefresh}`);

    // Diagnostic counters
    let hasPosition = 0;
    let hasVelocity = 0;
    let hasMovement = 0;
    let hasSteering = 0;
    let hasSteeringTarget = 0;
    let hasNonZeroVelocity = 0;
    let steeringBehaviors: Record<string, number> = {};

    for (const entity of this._cachedAgentEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      const vel = entity.getComponent('velocity') as { vx: number; vy: number } | undefined;
      const movement = entity.getComponent('movement') as { velocityX: number; velocityY: number } | undefined;
      const steering = entity.getComponent('steering') as {
        behavior: string;
        target?: { x: number; y: number };
        maxSpeed?: number;
      } | undefined;

      if (pos) hasPosition++;
      if (vel) hasVelocity++;
      if (movement) hasMovement++;
      if (steering) {
        hasSteering++;
        steeringBehaviors[steering.behavior] = (steeringBehaviors[steering.behavior] || 0) + 1;
        if (steering.target) hasSteeringTarget++;
      }
      if (vel && (vel.vx !== 0 || vel.vy !== 0)) hasNonZeroVelocity++;
    }

    const total = this._cachedAgentEntities.length;
    console.log('[PixiJSRenderer] === COMPONENT COVERAGE ===');
    console.log(`[PixiJSRenderer] Position:  ${hasPosition}/${total} (${((hasPosition/total)*100).toFixed(0)}%)`);
    console.log(`[PixiJSRenderer] Velocity:  ${hasVelocity}/${total} (${((hasVelocity/total)*100).toFixed(0)}%) - REQUIRED for SteeringSystem`);
    console.log(`[PixiJSRenderer] Movement:  ${hasMovement}/${total} (${((hasMovement/total)*100).toFixed(0)}%) - REQUIRED for MovementSystem`);
    console.log(`[PixiJSRenderer] Steering:  ${hasSteering}/${total} (${((hasSteering/total)*100).toFixed(0)}%) - REQUIRED for SteeringSystem`);
    console.log(`[PixiJSRenderer]   - with target: ${hasSteeringTarget}/${hasSteering}`);
    console.log(`[PixiJSRenderer] Non-zero velocity: ${hasNonZeroVelocity}/${total}`);

    console.log('[PixiJSRenderer] === STEERING BEHAVIORS ===');
    for (const [behavior, count] of Object.entries(steeringBehaviors)) {
      console.log(`[PixiJSRenderer]   ${behavior}: ${count}`);
    }

    // DIAGNOSIS
    console.log('[PixiJSRenderer] === DIAGNOSIS ===');
    if (hasVelocity === 0) {
      console.error('[PixiJSRenderer] PROBLEM: No agents have Velocity component - SteeringSystem cannot run!');
    }
    if (hasMovement === 0) {
      console.error('[PixiJSRenderer] PROBLEM: No agents have Movement component - MovementSystem cannot run!');
    }
    if (hasSteering === 0) {
      console.error('[PixiJSRenderer] PROBLEM: No agents have Steering component - SteeringSystem will skip them!');
    }
    if (hasSteering > 0 && hasSteeringTarget === 0) {
      console.warn('[PixiJSRenderer] WARNING: Agents have Steering but no targets set - they may be wandering or idle');
    }
    if (steeringBehaviors['none'] === hasSteering) {
      console.error('[PixiJSRenderer] PROBLEM: All agents have steering.behavior = "none" - no movement calculated!');
    }
    if (hasVelocity > 0 && hasNonZeroVelocity === 0) {
      console.warn('[PixiJSRenderer] WARNING: Agents have Velocity component but all values are zero');
    }

    // Sample first 3 agents in detail
    console.log('[PixiJSRenderer] === SAMPLE AGENTS (first 3) ===');
    for (const entity of this._cachedAgentEntities.slice(0, 3)) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      const vel = entity.getComponent('velocity') as { vx: number; vy: number } | undefined;
      const movement = entity.getComponent('movement') as { velocityX: number; velocityY: number } | undefined;
      const steering = entity.getComponent('steering') as {
        behavior: string;
        target?: { x: number; y: number };
        maxSpeed?: number;
      } | undefined;
      const sprite = this.entitySprites.get(entity.id);

      console.log(`[PixiJSRenderer] Agent ${entity.id.slice(0, 8)}:`);
      console.log(`[PixiJSRenderer]   Position: ${pos ? `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})` : 'MISSING'}`);
      console.log(`[PixiJSRenderer]   Velocity: ${vel ? `vx=${vel.vx.toFixed(3)}, vy=${vel.vy.toFixed(3)}` : 'MISSING'}`);
      console.log(`[PixiJSRenderer]   Movement: ${movement ? `vX=${movement.velocityX.toFixed(3)}, vY=${movement.velocityY.toFixed(3)}` : 'MISSING'}`);
      console.log(`[PixiJSRenderer]   Steering: ${steering ? `behavior="${steering.behavior}", target=${steering.target ? `(${steering.target.x.toFixed(1)}, ${steering.target.y.toFixed(1)})` : 'none'}, maxSpeed=${steering.maxSpeed}` : 'MISSING'}`);
      console.log(`[PixiJSRenderer]   Sprite: ${sprite ? `visible=${sprite.visible}, pos=(${sprite.x.toFixed(1)}, ${sprite.y.toFixed(1)})` : 'no sprite'}`);
    }

    console.log('[PixiJSRenderer] === HOW TO FIX ===');
    if (hasVelocity === 0 || hasMovement === 0 || hasSteering === 0) {
      console.log('[PixiJSRenderer] Agents are missing required components. Check agent creation code.');
      console.log('[PixiJSRenderer] Required components for movement: Position, Velocity, Movement, Steering');
    } else if (steeringBehaviors['none'] === hasSteering || hasSteeringTarget === 0) {
      console.log('[PixiJSRenderer] Agents have components but no active steering behavior/target.');
      console.log('[PixiJSRenderer] Check AgentBrainSystem - it should set steering.behavior and steering.target.');
    } else if (hasNonZeroVelocity === 0) {
      console.log('[PixiJSRenderer] SteeringSystem may not be running or not computing velocity.');
      console.log('[PixiJSRenderer] Check system registry: window.game.gameLoop.systemRegistry.systems');
    } else {
      console.log('[PixiJSRenderer] Components look OK - check MovementSystem execution.');
    }
    console.log('[PixiJSRenderer] To check if simulation is running, run: window.game.gameLoop.world.tick');
  }

  getEntityAt(screenX: number, screenY: number, world: World): Entity | null {
    // Convert screen to world coordinates
    const worldPos = this._camera.screenToWorld(screenX, screenY);

    // Find entity at position - check agents first (priority for selection)
    for (const entity of this._cachedAgentEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
      if (pos) {
        const dx = Math.abs(pos.x - worldPos.x);
        const dy = Math.abs(pos.y - worldPos.y);
        if (dx < 0.5 && dy < 0.5) {
          return entity;
        }
      }
    }

    // Then check other renderable entities
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
    this.showDebugOverlay = !this.showDebugOverlay;

    if (this.showDebugOverlay) {
      // Create debug text if it doesn't exist
      if (!this.debugText) {
        const style = new TextStyle({
          fontFamily: 'monospace',
          fontSize: 12,
          fill: '#ffffff',
          stroke: { color: '#000000', width: 2 },
        });
        this.debugText = new Text({ text: '', style });
        this.debugText.x = 10;
        this.debugText.y = 10;
        // Add to stage (not world container) so it stays fixed on screen
        this.app.stage.addChild(this.debugText);
      }

      // Create city boundary graphics if it doesn't exist
      if (!this.cityBoundaryGraphics) {
        this.cityBoundaryGraphics = new Graphics();
        this.overlayContainer.addChild(this.cityBoundaryGraphics);
      }
    } else {
      // Hide debug elements
      if (this.debugText) {
        this.debugText.visible = false;
      }
      if (this.cityBoundaryGraphics) {
        this.cityBoundaryGraphics.visible = false;
      }
    }
  }

  toggleTemperatureOverlay(): void {
    this.showTemperatureOverlay = !this.showTemperatureOverlay;

    if (!this.showTemperatureOverlay) {
      // Clean up temperature texts
      for (const text of this.temperatureTexts.values()) {
        this.overlayContainer.removeChild(text);
        text.destroy();
      }
      this.temperatureTexts.clear();
    }
  }

  /**
   * Get current temperature overlay state.
   */
  isTemperatureOverlayEnabled(): boolean {
    return this.showTemperatureOverlay;
  }

  /**
   * Render debug overlay information.
   * Called from render() when showDebugOverlay is true.
   */
  private renderDebugOverlay(world: World): void {
    if (!this.showDebugOverlay) return;

    // Update debug text
    if (this.debugText) {
      // Get time component
      const timeEntities = world.query().with('time').executeEntities();
      let timeOfDayStr = 'N/A';
      let phaseStr = 'N/A';
      let lightLevelStr = 'N/A';

      if (timeEntities.length > 0 && timeEntities[0]) {
        const timeComp = timeEntities[0].components.get('time') as
          | { timeOfDay: number; phase: string; lightLevel: number }
          | undefined;
        if (timeComp) {
          const hours = Math.floor(timeComp.timeOfDay);
          const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
          timeOfDayStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          phaseStr = timeComp.phase;
          lightLevelStr = (timeComp.lightLevel * 100).toFixed(0) + '%';
        }
      }

      const lines = [
        `Tick: ${world.tick}`,
        `Time: ${timeOfDayStr} (${phaseStr}) Light: ${lightLevelStr}`,
        `Camera: (${this._camera.x.toFixed(1)}, ${this._camera.y.toFixed(1)}) zoom: ${this._camera.zoom.toFixed(2)}`,
        `Backend: ${this.backend.toUpperCase()}`,
        `Entities: ${world.entities.size}`,
        `Sprites: ${this.entitySprites.size}`,
        `FPS: ${this.currentFps}`,
      ];

      this.debugText.text = lines.join('\n');
      this.debugText.visible = true;
    }

    // Update city boundary graphics
    if (this.cityBoundaryGraphics) {
      this.cityBoundaryGraphics.clear();
      this.cityBoundaryGraphics.visible = true;

      const cityDirectors = world.query().with('city_director').executeEntities();
      for (const entity of cityDirectors) {
        const director = entity.getComponent('city_director') as
          | { bounds: { minX: number; minY: number; maxX: number; maxY: number }; cityName: string }
          | undefined;
        if (!director) continue;

        const bounds = director.bounds;
        const minX = bounds.minX * this._tileSize;
        const minY = bounds.minY * this._tileSize;
        const maxX = (bounds.maxX + 1) * this._tileSize;
        const maxY = (bounds.maxY + 1) * this._tileSize;

        // Draw dashed rectangle (PixiJS doesn't have setLineDash, so use solid)
        this.cityBoundaryGraphics.rect(minX, minY, maxX - minX, maxY - minY);
        this.cityBoundaryGraphics.stroke({ color: 0xffd700, width: 2, alpha: 0.8 });
      }
    }
  }

  /**
   * Render temperature overlay on terrain.
   * Called from render() when showTemperatureOverlay is true.
   */
  private renderTemperatureOverlay(world: World): void {
    if (!this.showTemperatureOverlay) return;

    const bounds = this._camera.getVisibleBounds();
    const activeKeys = new Set<string>();

    // Get visible tiles and show temperature
    for (let y = Math.floor(bounds.top); y <= Math.ceil(bounds.bottom); y++) {
      for (let x = Math.floor(bounds.left); x <= Math.ceil(bounds.right); x++) {
        const tile = world.getTileAt?.(x, y);
        if (!tile) continue;

        // Check if tile has temperature (from weather system)
        const temp = (tile as { temperature?: number }).temperature;
        if (temp === undefined) continue;

        const key = `${x},${y}`;
        activeKeys.add(key);

        let text = this.temperatureTexts.get(key);
        if (!text) {
          const style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 8,
            fill: '#ffffff',
            stroke: { color: '#000000', width: 1 },
          });
          text = new Text({ text: '', style });
          text.anchor.set(0.5, 0.5);
          this.overlayContainer.addChild(text);
          this.temperatureTexts.set(key, text);
        }

        text.text = `${temp.toFixed(0)}°`;
        text.x = x * this._tileSize + this._tileSize / 2;
        text.y = y * this._tileSize + this._tileSize / 2;
        text.visible = true;
      }
    }

    // Remove texts for tiles no longer visible
    for (const [key, text] of this.temperatureTexts) {
      if (!activeKeys.has(key)) {
        this.overlayContainer.removeChild(text);
        text.destroy();
        this.temperatureTexts.delete(key);
      }
    }
  }

  destroy(): void {
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);

    // Remove combat UI event handlers
    if (this.eventBus) {
      if (this.conflictStartedHandler) {
        this.eventBus.off('conflict:started', this.conflictStartedHandler);
      }
      if (this.conflictResolvedHandler) {
        this.eventBus.off('conflict:resolved', this.conflictResolvedHandler);
      }
      if (this.deathHandler) {
        this.eventBus.off('death:occurred', this.deathHandler);
      }
    }
    this.eventBus = null;
    this.conflictStartedHandler = null;
    this.conflictResolvedHandler = null;
    this.deathHandler = null;

    // Clean up health bar graphics
    for (const graphics of this.healthBarGraphics.values()) {
      graphics.destroy();
    }
    this.healthBarGraphics.clear();

    // Clean up threat indicators
    for (const graphics of this.threatIndicators.values()) {
      graphics.destroy();
    }
    this.threatIndicators.clear();
    this.threats.clear();

    // Clean up debug overlay
    if (this.debugText) {
      this.debugText.destroy();
      this.debugText = null;
    }
    if (this.cityBoundaryGraphics) {
      this.cityBoundaryGraphics.destroy();
      this.cityBoundaryGraphics = null;
    }

    // Clean up temperature overlay
    for (const text of this.temperatureTexts.values()) {
      text.destroy();
    }
    this.temperatureTexts.clear();

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
  }
}
