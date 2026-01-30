/**
 * Camera for 2D/2.5D world view.
 * Supports multiple view modes: top-down and side-view with parallax.
 */
import {
  ViewMode,
  VIEW_MODE_CYCLE,
  isSideViewMode,
  getDepthAxis,
  getDepthDirection,
  SideViewBackground,
  type ParallaxConfig,
  type ParallaxTransform,
  DEFAULT_PARALLAX_CONFIG,
  calculateParallaxTransform,
  isEntityInteractable,
  isEntityVisible,
} from './ViewMode.js';

// ============================================================================
// Enums
// ============================================================================

/**
 * Camera movement mode - how pan input is interpreted.
 */
export enum CameraPanMode {
  /** Free pan in any direction */
  Free = 'free',
  /** Locked to horizontal axis only */
  HorizontalOnly = 'horizontal_only',
  /** Locked to vertical axis only */
  VerticalOnly = 'vertical_only',
  /** Locked - no panning allowed */
  Locked = 'locked',
}

/**
 * Camera zoom constraints.
 */
export enum ZoomPreset {
  /** Minimum zoom (zoomed out) */
  Min = 0.1,
  /** Default zoom level */
  Default = 1.0,
  /** Maximum zoom (zoomed in) */
  Max = 4.0,
  /** Zoom for side-view mode (fixed) */
  SideView = 1.5,
}

/**
 * Z-depth scroll speed presets.
 */
export enum ZScrollSpeed {
  /** Slow scroll (0.25 units per scroll step) */
  Slow = 0.25,
  /** Normal scroll (0.5 units per scroll step) */
  Normal = 0.5,
  /** Fast scroll (1.0 units per scroll step) */
  Fast = 1.0,
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * World-to-screen conversion result with parallax info.
 */
export interface ScreenPosition {
  /** Screen X coordinate */
  readonly x: number;
  /** Screen Y coordinate */
  readonly y: number;
  /** Parallax transform applied (null in top-down mode) */
  readonly parallax: ParallaxTransform | null;
}

/**
 * Screen-to-world conversion result.
 */
export interface WorldPosition {
  /** World X coordinate */
  readonly x: number;
  /** World Y coordinate */
  readonly y: number;
  /** Focus Z depth (in side-view mode) */
  readonly z: number;
}

/**
 * Visible bounds in world coordinates.
 */
export interface VisibleBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  /** Visible z-range in side-view mode */
  readonly zMin: number;
  readonly zMax: number;
}

// ============================================================================
// Camera Class
// ============================================================================

/**
 * Camera for 2D world view with multi-mode support.
 * Handles pan, zoom, z-depth, and world-to-screen coordinate conversion.
 */
export class Camera {
  // Position state
  public x: number = 0;
  public y: number = 0;
  public z: number = 0; // Focus depth for side-view
  public zoom: number = ZoomPreset.Default;

  // Side-view vertical offset (for looking up at mountains or down underground)
  public sideViewVerticalOffset: number = 0;
  private targetSideViewVerticalOffset: number = 0;

  // Target state (for smoothing)
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZ: number = 0;
  private targetZoom: number = ZoomPreset.Default;

  // Smoothing (position/pan smoothing - slower for cinematic feel)
  private smoothing: number = 0.1;
  // Zoom smoothing (faster for responsive feel)
  private zoomSmoothing: number = 0.4;

  // View mode state
  public viewMode: ViewMode = ViewMode.TopDown;
  public panMode: CameraPanMode = CameraPanMode.Free;
  public parallaxConfig: ParallaxConfig = DEFAULT_PARALLAX_CONFIG;
  public backgroundStyle: SideViewBackground = SideViewBackground.SkyGradient;

  // Z-scroll configuration
  public zScrollSpeed: ZScrollSpeed = ZScrollSpeed.Normal;

  constructor(
    public viewportWidth: number,
    public viewportHeight: number
  ) {}

  // ==========================================================================
  // Position Control
  // ==========================================================================

  /**
   * Set camera position (with smoothing).
   */
  setPosition(x: number, y: number): void {
    if (this.panMode === CameraPanMode.Locked) return;
    if (this.panMode !== CameraPanMode.VerticalOnly) this.targetX = x;
    if (this.panMode !== CameraPanMode.HorizontalOnly) this.targetY = y;
  }

  /**
   * Set camera position immediately (no smoothing).
   */
  setPositionImmediate(x: number, y: number): void {
    if (this.panMode === CameraPanMode.Locked) return;
    if (this.panMode !== CameraPanMode.VerticalOnly) {
      this.x = x;
      this.targetX = x;
    }
    if (this.panMode !== CameraPanMode.HorizontalOnly) {
      this.y = y;
      this.targetY = y;
    }
  }

  /**
   * Pan the camera by screen pixels.
   */
  pan(dx: number, dy: number): void {
    if (this.panMode === CameraPanMode.Locked) return;
    if (this.panMode !== CameraPanMode.VerticalOnly) {
      this.targetX += dx / this.zoom;
    }
    if (this.panMode !== CameraPanMode.HorizontalOnly) {
      this.targetY += dy / this.zoom;
    }
  }

  // ==========================================================================
  // Zoom Control
  // ==========================================================================

  /**
   * Set camera zoom (with smoothing).
   */
  setZoom(zoom: number): void {
    this.targetZoom = Math.max(ZoomPreset.Min, Math.min(ZoomPreset.Max, zoom));
  }

  /**
   * Adjust zoom by multiplier.
   */
  adjustZoom(factor: number): void {
    this.setZoom(this.targetZoom * factor);
  }

  // ==========================================================================
  // Z-Depth Control (Side-View Mode)
  // ==========================================================================

  /**
   * Set focus depth for side-view mode (with smoothing).
   */
  setFocusDepth(z: number): void {
    const maxZ = this.parallaxConfig.maxZDistance;
    this.targetZ = Math.max(-maxZ, Math.min(maxZ, z));
  }

  /**
   * Set focus depth immediately (no smoothing).
   */
  setFocusDepthImmediate(z: number): void {
    const maxZ = this.parallaxConfig.maxZDistance;
    this.z = Math.max(-maxZ, Math.min(maxZ, z));
    this.targetZ = this.z;
  }

  /**
   * Adjust focus depth by delta (for scroll wheel).
   */
  adjustFocusDepth(delta: number): void {
    this.setFocusDepth(this.targetZ + delta * this.zScrollSpeed);
  }

  /**
   * Adjust depth slice (Y position) for side-view mode.
   * Shift+scroll changes which row of tiles we're viewing.
   */
  adjustDepthSlice(delta: number): void {
    // Move camera Y by delta tiles (scaled by tile size assumed to be factored in by caller)
    this.targetY += delta * this.zScrollSpeed * 16; // 16 = tile size
  }

  /**
   * Reset focus depth to surface level.
   */
  resetFocusDepth(): void {
    this.setFocusDepth(0);
  }

  // ==========================================================================
  // View Mode Control
  // ==========================================================================

  /**
   * Set the camera view mode.
   */
  setViewMode(mode: ViewMode): void {
    const previousMode = this.viewMode;
    this.viewMode = mode;

    const wasSideView = isSideViewMode(previousMode);
    const isSideView = isSideViewMode(mode);

    // Mode-specific adjustments
    if (isSideView && !wasSideView) {
      // Switching to side-view: set fixed zoom, reset vertical offset
      this.setZoom(ZoomPreset.SideView);
      this.sideViewVerticalOffset = 0;
      this.targetSideViewVerticalOffset = 0;
    } else if (!isSideView && wasSideView) {
      // Switching to top-down: restore default zoom
      this.setZoom(ZoomPreset.Default);
      this.sideViewVerticalOffset = 0;
      this.targetSideViewVerticalOffset = 0;
    }
  }

  /**
   * Toggle/cycle through view modes.
   * Order: TopDown -> FaceNorth -> FaceEast -> FaceSouth -> FaceWest -> TopDown
   */
  toggleViewMode(): ViewMode {
    const currentIndex = VIEW_MODE_CYCLE.indexOf(this.viewMode);
    // If current mode not found (shouldn't happen), start from beginning
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + 1) % VIEW_MODE_CYCLE.length;
    const newMode = VIEW_MODE_CYCLE[nextIndex] ?? ViewMode.TopDown;
    this.setViewMode(newMode);
    return newMode;
  }

  /**
   * Check if currently in any side-view mode (any directional facing).
   */
  isSideView(): boolean {
    return isSideViewMode(this.viewMode);
  }

  /**
   * Get the depth axis for the current view mode.
   * Returns 'y' for north/south, 'x' for east/west, null for top-down.
   */
  getDepthAxis(): 'x' | 'y' | null {
    return getDepthAxis(this.viewMode);
  }

  /**
   * Get the depth direction for the current view mode.
   * Positive means higher values are "in front", negative means lower values are "in front".
   */
  getDepthDirection(): number {
    return getDepthDirection(this.viewMode);
  }

  // ==========================================================================
  // Update
  // ==========================================================================

  /**
   * Update camera (apply smoothing to all values).
   * Uses a deadzone to prevent perpetual wiggling when values are close to target.
   */
  update(): void {
    const DEADZONE = 0.01; // Snap to target when within this distance

    // Smooth X with deadzone
    const dxTarget = this.targetX - this.x;
    if (Math.abs(dxTarget) < DEADZONE) {
      this.x = this.targetX;
    } else {
      this.x += dxTarget * this.smoothing;
    }

    // Smooth Y with deadzone
    const dyTarget = this.targetY - this.y;
    if (Math.abs(dyTarget) < DEADZONE) {
      this.y = this.targetY;
    } else {
      this.y += dyTarget * this.smoothing;
    }

    // Smooth Z with deadzone
    const dzTarget = this.targetZ - this.z;
    if (Math.abs(dzTarget) < DEADZONE) {
      this.z = this.targetZ;
    } else {
      this.z += dzTarget * this.smoothing;
    }

    // Smooth zoom with deadzone (uses faster zoomSmoothing for responsiveness)
    const dZoomTarget = this.targetZoom - this.zoom;
    if (Math.abs(dZoomTarget) < DEADZONE * 0.1) {
      this.zoom = this.targetZoom;
    } else {
      this.zoom += dZoomTarget * this.zoomSmoothing;
    }

    // Smooth vertical offset with deadzone
    const dOffsetTarget = this.targetSideViewVerticalOffset - this.sideViewVerticalOffset;
    if (Math.abs(dOffsetTarget) < DEADZONE) {
      this.sideViewVerticalOffset = this.targetSideViewVerticalOffset;
    } else {
      this.sideViewVerticalOffset += dOffsetTarget * this.smoothing;
    }
  }

  /**
   * Pan vertically in side-view mode (look up at mountains, down at caves).
   * Positive delta = look up (see higher terrain), negative = look down.
   */
  panSideViewVertical(delta: number): void {
    this.targetSideViewVerticalOffset += delta / this.zoom;
  }

  /**
   * Reset side-view vertical offset to default (ground level centered).
   */
  resetSideViewVertical(): void {
    this.targetSideViewVerticalOffset = 0;
  }

  // ==========================================================================
  // Coordinate Conversion
  // ==========================================================================

  /**
   * Convert world coordinates to screen coordinates.
   * In side-view mode, applies parallax based on z-distance.
   */
  worldToScreen(worldX: number, worldY: number, worldZ: number = 0): ScreenPosition {
    if (this.viewMode === ViewMode.TopDown) {
      // Top-down mode: ignore z, standard 2D projection
      const screenX = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
      const screenY = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
      return { x: screenX, y: screenY, parallax: null };
    }

    // Side-view mode: apply parallax based on z-distance
    const parallax = calculateParallaxTransform(worldZ, this.z, this.parallaxConfig);

    // Apply parallax scale to position offset
    const screenX = (worldX - this.x) * this.zoom * parallax.scale + this.viewportWidth / 2;
    const screenY = (worldY - this.y) * this.zoom * parallax.scale + this.viewportHeight / 2 + parallax.verticalOffset;

    return { x: screenX, y: screenY, parallax };
  }

  /**
   * Convert world coordinates to screen coordinates (simple version for compatibility).
   * Returns only x, y without parallax info.
   */
  worldToScreenSimple(worldX: number, worldY: number, worldZ: number = 0): { x: number; y: number } {
    const result = this.worldToScreen(worldX, worldY, worldZ);
    return { x: result.x, y: result.y };
  }

  /**
   * Convert world coordinates to screen coordinates, writing into provided result object.
   * Zero-allocation version for hot render paths.
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   * @param worldZ World Z coordinate
   * @param result Pre-allocated result object to write into
   * @returns The same result object (for chaining)
   */
  worldToScreenInto(
    worldX: number,
    worldY: number,
    worldZ: number,
    result: { x: number; y: number; parallax: ParallaxTransform | null }
  ): { x: number; y: number; parallax: ParallaxTransform | null } {
    if (this.viewMode === ViewMode.TopDown) {
      result.x = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
      result.y = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
      result.parallax = null;
    } else {
      const parallax = calculateParallaxTransform(worldZ, this.z, this.parallaxConfig);
      result.x = (worldX - this.x) * this.zoom * parallax.scale + this.viewportWidth / 2;
      result.y = (worldY - this.y) * this.zoom * parallax.scale + this.viewportHeight / 2 + parallax.verticalOffset;
      result.parallax = parallax;
    }
    return result;
  }

  /**
   * Convert screen coordinates to world coordinates.
   * Returns the focus z-level in side-view mode.
   */
  screenToWorld(screenX: number, screenY: number): WorldPosition {
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY, z: this.z };
  }

  // ==========================================================================
  // Visibility & Interaction Checks
  // ==========================================================================

  /**
   * Get visible world bounds.
   */
  getVisibleBounds(): VisibleBounds {
    const halfWidth = this.viewportWidth / (2 * this.zoom);
    const halfHeight = this.viewportHeight / (2 * this.zoom);

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
      zMin: this.z - this.parallaxConfig.maxZDistance,
      zMax: this.z + this.parallaxConfig.maxZDistance,
    };
  }

  /**
   * Check if an entity at the given z is interactable (clickable).
   * In top-down mode, always returns true.
   */
  isInteractable(entityZ: number): boolean {
    if (this.viewMode === ViewMode.TopDown) return true;
    return isEntityInteractable(entityZ, this.z, this.parallaxConfig);
  }

  /**
   * Check if an entity at the given z should be rendered.
   * In top-down mode, always returns true (no z-culling).
   */
  isVisible(entityZ: number): boolean {
    if (this.viewMode === ViewMode.TopDown) return true;
    return isEntityVisible(entityZ, this.z, this.parallaxConfig);
  }

  /**
   * Get parallax transform for an entity at the given z.
   * Returns null in top-down mode.
   */
  getParallaxTransform(entityZ: number): ParallaxTransform | null {
    if (this.viewMode === ViewMode.TopDown) return null;
    return calculateParallaxTransform(entityZ, this.z, this.parallaxConfig);
  }

  // ==========================================================================
  // Viewport
  // ==========================================================================

  /**
   * Update viewport size.
   */
  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set parallax configuration.
   */
  setParallaxConfig(config: Partial<ParallaxConfig>): void {
    this.parallaxConfig = { ...this.parallaxConfig, ...config };
  }

  /**
   * Set camera smoothing factor.
   */
  setSmoothing(smoothing: number): void {
    this.smoothing = Math.max(0.01, Math.min(1.0, smoothing));
  }

  /**
   * Set pan mode.
   */
  setPanMode(mode: CameraPanMode): void {
    this.panMode = mode;
  }
}

// Re-export ViewMode types for convenience
export { ViewMode, SideViewBackground, ParallaxConfig, ParallaxTransform };
