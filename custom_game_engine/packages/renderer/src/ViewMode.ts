/**
 * View mode system for multi-perspective rendering.
 * Supports top-down (classic) and side-view (Starbound-style) modes.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Available camera view modes.
 * TopDown is the classic overhead view.
 * Directional views show a side-on perspective facing that direction.
 */
export enum ViewMode {
  /** Classic overhead view - X/Y plane, scroll zooms */
  TopDown = 'top_down',
  /** Looking north (-Y direction) - see things ahead, X is horizontal, Z is vertical */
  FaceNorth = 'face_north',
  /** Looking south (+Y direction) - see things behind, X is horizontal, Z is vertical */
  FaceSouth = 'face_south',
  /** Looking east (+X direction) - see things to the right, Y is horizontal, Z is vertical */
  FaceEast = 'face_east',
  /** Looking west (-X direction) - see things to the left, Y is horizontal, Z is vertical */
  FaceWest = 'face_west',
}

/**
 * Order of view modes when cycling with V key.
 */
export const VIEW_MODE_CYCLE: ViewMode[] = [
  ViewMode.TopDown,
  ViewMode.FaceNorth,
  ViewMode.FaceEast,
  ViewMode.FaceSouth,
  ViewMode.FaceWest,
];

/**
 * Check if a view mode is a side-view (any directional facing).
 */
export function isSideViewMode(mode: ViewMode): boolean {
  return mode !== ViewMode.TopDown;
}

/**
 * Get the depth axis for a view mode.
 * Returns 'y' for north/south facing (depth is Y), 'x' for east/west facing (depth is X).
 */
export function getDepthAxis(mode: ViewMode): 'x' | 'y' | null {
  switch (mode) {
    case ViewMode.FaceNorth:
    case ViewMode.FaceSouth:
      return 'y';
    case ViewMode.FaceEast:
    case ViewMode.FaceWest:
      return 'x';
    default:
      return null; // TopDown has no depth axis
  }
}

/**
 * Get the direction multiplier for depth filtering.
 * Positive means entities with higher values are "in front".
 * Negative means entities with lower values are "in front".
 */
export function getDepthDirection(mode: ViewMode): number {
  switch (mode) {
    case ViewMode.FaceNorth:
      return -1; // Looking north, lower Y values are in front
    case ViewMode.FaceSouth:
      return 1;  // Looking south, higher Y values are in front
    case ViewMode.FaceEast:
      return 1;  // Looking east, higher X values are in front
    case ViewMode.FaceWest:
      return -1; // Looking west, lower X values are in front
    default:
      return 0;
  }
}

/**
 * Parallax rendering layers based on Z-distance from camera focus.
 */
export enum ParallaxLayer {
  /** Very far background (z-delta > 8) */
  FarBackground = 'far_background',
  /** Mid background (z-delta 4-8) */
  MidBackground = 'mid_background',
  /** Near background (z-delta 1-4) */
  NearBackground = 'near_background',
  /** Focus plane - fully interactable (z-delta < 1) */
  Focus = 'focus',
  /** Near foreground (z-delta 1-4, in front of focus) */
  NearForeground = 'near_foreground',
  /** Far foreground (z-delta > 4, in front) */
  FarForeground = 'far_foreground',
}

/**
 * Interaction state for entities based on Z-distance.
 */
export enum InteractionState {
  /** Entity is at focus depth - fully interactable */
  Interactable = 'interactable',
  /** Entity is nearby - shows hover tooltip with distance */
  Hoverable = 'hoverable',
  /** Entity is too far - parallax only, no interaction */
  ViewOnly = 'view_only',
  /** Entity is beyond render distance */
  Hidden = 'hidden',
}

/**
 * Background style for side-view mode.
 */
export enum SideViewBackground {
  /** Sky-to-ground gradient */
  SkyGradient = 'sky_gradient',
  /** Solid color */
  Solid = 'solid',
  /** Parallax scrolling layers */
  ParallaxLayers = 'parallax_layers',
  /** No background (transparent) */
  None = 'none',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Configuration for parallax rendering in side-view mode.
 */
export interface ParallaxConfig {
  /** Scale multiplier at maximum z-distance (e.g., 0.4 = 40% size) */
  readonly minScale: number;
  /** Scale multiplier at focus plane (e.g., 1.2 = 120% size for slight pop) */
  readonly maxScale: number;
  /** Opacity at maximum z-distance (e.g., 0.2 = 20% opacity) */
  readonly minOpacity: number;
  /** Opacity at focus plane (e.g., 1.0 = fully opaque) */
  readonly maxOpacity: number;
  /** Maximum z-distance for rendering (entities beyond this are hidden) */
  readonly maxZDistance: number;
  /** Z tolerance for full interactivity (entities within this range are clickable) */
  readonly focusZTolerance: number;
  /** Z tolerance for hover/tooltip display */
  readonly hoverZTolerance: number;
  /** Whether to apply blur effect to distant entities (expensive) */
  readonly enableBlur: boolean;
  /** Whether to desaturate distant entities for depth fog effect */
  readonly enableDesaturation: boolean;
  /** Vertical offset factor - distant entities shift up slightly */
  readonly verticalOffsetFactor: number;
}

/**
 * Result of parallax calculation for a single entity.
 */
export interface ParallaxTransform {
  /** Scale multiplier to apply */
  readonly scale: number;
  /** Opacity to apply (0-1) */
  readonly opacity: number;
  /** Blur radius in pixels (0 = no blur) */
  readonly blur: number;
  /** Desaturation amount (0 = full color, 1 = grayscale) */
  readonly desaturation: number;
  /** Vertical offset in pixels */
  readonly verticalOffset: number;
  /** Which parallax layer this falls into */
  readonly layer: ParallaxLayer;
  /** Interaction state for this entity */
  readonly interactionState: InteractionState;
  /** Raw z-distance from focus plane */
  readonly zDistance: number;
  /** Whether entity is in front of (positive) or behind (negative) focus */
  readonly zDirection: number;
}

/**
 * Camera state snapshot for view mode.
 */
export interface ViewModeState {
  /** Current view mode */
  readonly mode: ViewMode;
  /** Camera focus z-depth (for side-view) */
  readonly focusZ: number;
  /** Current parallax configuration */
  readonly parallaxConfig: ParallaxConfig;
  /** Background style for side-view */
  readonly backgroundStyle: SideViewBackground;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default parallax configuration.
 */
export const DEFAULT_PARALLAX_CONFIG: ParallaxConfig = {
  minScale: 0.4,
  maxScale: 1.1,
  minOpacity: 0.25,
  maxOpacity: 1.0,
  maxZDistance: 12,
  focusZTolerance: 1.0,
  hoverZTolerance: 3.0,
  enableBlur: false,
  enableDesaturation: true,
  verticalOffsetFactor: 0.02,
} as const;

/**
 * Layer thresholds for parallax classification.
 */
export const PARALLAX_LAYER_THRESHOLDS = {
  [ParallaxLayer.Focus]: 1.0,
  [ParallaxLayer.NearBackground]: 4.0,
  [ParallaxLayer.MidBackground]: 8.0,
  [ParallaxLayer.FarBackground]: Infinity,
  [ParallaxLayer.NearForeground]: 4.0,
  [ParallaxLayer.FarForeground]: Infinity,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate parallax transform for an entity at a given z-position.
 */
export function calculateParallaxTransform(
  entityZ: number,
  focusZ: number,
  config: ParallaxConfig
): ParallaxTransform {
  const zDistance = Math.abs(entityZ - focusZ);
  const zDirection = entityZ - focusZ; // Positive = in front, negative = behind

  // Normalized distance (0 = at focus, 1 = at max distance)
  const normalizedDistance = Math.min(zDistance / config.maxZDistance, 1);

  // Calculate scale (lerp from max to min based on distance)
  const scale = config.maxScale - (config.maxScale - config.minScale) * normalizedDistance;

  // Calculate opacity (lerp from max to min based on distance)
  const opacity = config.maxOpacity - (config.maxOpacity - config.minOpacity) * normalizedDistance;

  // Calculate blur (only if enabled, increases with distance)
  const blur = config.enableBlur ? normalizedDistance * 4 : 0;

  // Calculate desaturation (only if enabled, increases with distance)
  const desaturation = config.enableDesaturation ? normalizedDistance * 0.6 : 0;

  // Calculate vertical offset (distant things appear slightly higher)
  const verticalOffset = zDistance * config.verticalOffsetFactor * -1; // Negative = up

  // Determine parallax layer
  const layer = getParallaxLayer(zDistance, zDirection);

  // Determine interaction state
  const interactionState = getInteractionState(zDistance, config);

  return {
    scale,
    opacity,
    blur,
    desaturation,
    verticalOffset,
    layer,
    interactionState,
    zDistance,
    zDirection,
  };
}

/**
 * Get the parallax layer for a given z-distance and direction.
 */
export function getParallaxLayer(zDistance: number, zDirection: number): ParallaxLayer {
  if (zDistance < PARALLAX_LAYER_THRESHOLDS[ParallaxLayer.Focus]) {
    return ParallaxLayer.Focus;
  }

  // Behind focus (negative direction = background)
  if (zDirection < 0) {
    if (zDistance < PARALLAX_LAYER_THRESHOLDS[ParallaxLayer.NearBackground]) {
      return ParallaxLayer.NearBackground;
    }
    if (zDistance < PARALLAX_LAYER_THRESHOLDS[ParallaxLayer.MidBackground]) {
      return ParallaxLayer.MidBackground;
    }
    return ParallaxLayer.FarBackground;
  }

  // In front of focus (positive direction = foreground)
  if (zDistance < PARALLAX_LAYER_THRESHOLDS[ParallaxLayer.NearForeground]) {
    return ParallaxLayer.NearForeground;
  }
  return ParallaxLayer.FarForeground;
}

/**
 * Get the interaction state for a given z-distance.
 */
export function getInteractionState(
  zDistance: number,
  config: ParallaxConfig
): InteractionState {
  if (zDistance <= config.focusZTolerance) {
    return InteractionState.Interactable;
  }
  if (zDistance <= config.hoverZTolerance) {
    return InteractionState.Hoverable;
  }
  if (zDistance <= config.maxZDistance) {
    return InteractionState.ViewOnly;
  }
  return InteractionState.Hidden;
}

/**
 * Check if an entity at the given z is interactable (clickable).
 */
export function isEntityInteractable(
  entityZ: number,
  focusZ: number,
  config: ParallaxConfig
): boolean {
  const zDistance = Math.abs(entityZ - focusZ);
  return zDistance <= config.focusZTolerance;
}

/**
 * Check if an entity at the given z should be rendered.
 */
export function isEntityVisible(
  entityZ: number,
  focusZ: number,
  config: ParallaxConfig
): boolean {
  const zDistance = Math.abs(entityZ - focusZ);
  return zDistance <= config.maxZDistance;
}
