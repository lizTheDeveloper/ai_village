/**
 * Common renderer interface for both Canvas2D and PixiJS WebGPU implementations.
 * This allows the game to switch between renderers via feature flag.
 */

import type { World, Entity, EventBus } from '@ai-village/core';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';
import type { Camera, VisibleBounds, ScreenPosition, WorldPosition } from './Camera.js';

/**
 * Renderer statistics for debugging and performance monitoring.
 */
export interface RendererStats {
  /** Current frames per second */
  fps: number;
  /** Number of draw calls this frame */
  drawCalls: number;
  /** Number of entities actually rendered */
  visibleEntities: number;
  /** Number of entities culled (not rendered) */
  culledEntities: number;
  /** GPU memory usage in MB (if available) */
  gpuMemoryMB: number;
  /** Renderer backend type */
  backend: 'canvas2d' | 'webgl' | 'webgpu';
}

/**
 * Options for creating a renderer.
 */
export interface RendererOptions {
  /** Preferred renderer backend: 'webgpu', 'webgl', 'canvas2d', or 'auto' (default) */
  preference?: 'webgpu' | 'webgl' | 'canvas2d' | 'auto';
  /** Tile size in pixels (default: 16) */
  tileSize?: number;
  /** Enable debug overlay (default: false) */
  debug?: boolean;
  /** Anti-aliasing (default: false for pixel art) */
  antialias?: boolean;
}

/**
 * Text display options for floating text.
 */
export interface FloatingTextOptions {
  color?: string;
  fontSize?: number;
  duration?: number;
  rise?: boolean;
}

/**
 * Particle effect options.
 */
export interface ParticleOptions {
  count?: number;
  color?: string;
  spread?: number;
  lifetime?: number;
}

/**
 * Common interface that all renderers must implement.
 * This allows switching between Canvas2D and PixiJS WebGPU.
 */
export interface IRenderer {
  // ============================================================================
  // Core Properties
  // ============================================================================

  /** The camera for viewport management */
  readonly camera: Camera;

  /** The HTML canvas element */
  readonly canvas: HTMLCanvasElement;

  /** Tile size in pixels */
  readonly tileSize: number;

  // ============================================================================
  // View Toggle Properties
  // ============================================================================

  /** Show resource amounts on tiles */
  showResourceAmounts: boolean;

  /** Show building labels */
  showBuildingLabels: boolean;

  /** Show agent names above sprites */
  showAgentNames: boolean;

  /** Show agent current tasks */
  showAgentTasks: boolean;

  /** Show city boundary boxes */
  showCityBounds: boolean;

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Main render loop - called every frame.
   * @param world The game world to render
   * @param selectedEntity Currently selected entity (for highlighting)
   */
  render(world: World, selectedEntity?: Entity | { id: string }): void;

  /**
   * Clean up resources when renderer is no longer needed.
   */
  destroy(): void;

  // ============================================================================
  // Camera Methods
  // ============================================================================

  /**
   * Get the camera instance.
   */
  getCamera(): Camera;

  // ============================================================================
  // Combat UI (Optional)
  // ============================================================================

  /**
   * Initialize combat UI renderers (health bars, threat indicators).
   * @param world The game world
   * @param eventBus Event bus for combat events
   */
  initCombatUI?(world: World, eventBus: EventBus): void;

  // ============================================================================
  // Visual Effects (Optional)
  // ============================================================================

  /**
   * Show floating text at a world position.
   */
  showFloatingText?(
    text: string,
    worldX: number,
    worldY: number,
    options?: FloatingTextOptions
  ): void;

  /**
   * Show a speech bubble above an entity.
   */
  showSpeechBubble?(entityId: string, text: string, duration?: number): void;

  /**
   * Create a dust cloud particle effect.
   */
  createDustCloud?(worldX: number, worldY: number, options?: ParticleOptions): void;

  /**
   * Create a spark particle effect.
   */
  createSparkEffect?(worldX: number, worldY: number, options?: ParticleOptions): void;

  // ============================================================================
  // Performance
  // ============================================================================

  /**
   * Get renderer performance statistics.
   */
  getStats(): RendererStats;

  // ============================================================================
  // Entity Picking (Optional)
  // ============================================================================

  /**
   * Get entity at screen coordinates.
   */
  getEntityAt?(screenX: number, screenY: number, world: World): Entity | null;

  // ============================================================================
  // Debug (Optional)
  // ============================================================================

  /**
   * Toggle debug overlay visibility.
   */
  toggleDebugOverlay?(): void;

  /**
   * Toggle temperature overlay visibility.
   */
  toggleTemperatureOverlay?(): void;

  // ============================================================================
  // Canvas2D Overlay (for UI rendering on top of WebGL)
  // ============================================================================

  /**
   * Get the overlay canvas for Canvas2D UI rendering.
   * WebGL renderers create a separate transparent canvas layered on top.
   * Canvas2D renderers return the main canvas.
   */
  readonly overlayCanvas?: HTMLCanvasElement;

  /**
   * Get the Canvas2D context for UI overlay rendering.
   * Returns null if overlay is not available.
   */
  getOverlayContext?(): CanvasRenderingContext2D | null;
}

/**
 * Factory function type for creating renderers.
 */
export type RendererFactory = (
  canvas: HTMLCanvasElement,
  chunkManager: ChunkManager,
  terrainGenerator: TerrainGenerator,
  options?: RendererOptions
) => Promise<IRenderer>;
