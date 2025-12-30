/**
 * Dashboard View Type Definitions
 *
 * These types define the interfaces for the unified dashboard system.
 * Views can be rendered in both the Player UI (canvas) and LLM Dashboard (HTTP/curl).
 */

import type { World } from '../ecs/World.js';

/**
 * Menu category for organizing views in the UI.
 * Must match WindowMenuCategory in renderer for compatibility.
 */
export type DashboardCategory =
  | 'info'      // Agent info, population
  | 'economy'   // Resources, Economy, Shop, Crafting
  | 'social'    // Memory, Relationships, Governance
  | 'farming'   // Tile Inspector, Plant Info
  | 'animals'   // Animal Info
  | 'magic'     // Magic Systems, Spellbook
  | 'divinity'  // Divine Powers, Prayer, Angels
  | 'dev'       // Dev Panel - only shown in dev mode
  | 'settings'  // Settings, Notifications, Controls
  | 'default';  // Uncategorized views

/**
 * Base data returned by all view data providers.
 * Views extend this with their specific data shape.
 */
export interface ViewData {
  /** Timestamp when data was collected */
  timestamp: number;
  /** Whether the data source is currently available */
  available: boolean;
  /** Optional message if data is unavailable */
  unavailableReason?: string;
}

/**
 * Stored metric type for historical data access.
 * Matches the type used by MetricsStorage.
 */
export interface StoredMetric {
  type: string;
  timestamp: number;
  agentId?: string;
  sessionId?: string;
  data?: Record<string, unknown>;
}

/**
 * Context passed to data providers
 */
export interface ViewContext {
  /** Current game world (for live queries) - may be undefined if no game running */
  world?: World;
  /** Session metrics (for historical data) */
  sessionMetrics?: StoredMetric[];
  /** Selected entity ID (if applicable) */
  selectedEntityId?: string;
  /** Additional context parameters */
  params?: Record<string, unknown>;
}

/**
 * Options for text formatting
 */
export interface TextFormatOptions {
  /** Maximum width in characters (for wrapping) */
  maxWidth?: number;
  /** Whether to include ANSI colors */
  useColors?: boolean;
  /** Detail level */
  detail?: 'minimal' | 'normal' | 'verbose';
}

/**
 * Render bounds for canvas rendering
 */
export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Mutable state for interactive views
 */
export interface ViewState {
  scrollOffset?: number;
  selectedIndex?: number;
  expandedSections?: Set<string>;
  selectedEntityId?: string;
  [key: string]: unknown;
}

/**
 * Theme for canvas rendering (colors, fonts, etc.)
 */
export interface RenderTheme {
  colors: {
    background: string;
    text: string;
    textMuted: string;
    accent: string;
    warning: string;
    error: string;
    success: string;
    border: string;
  };
  fonts: {
    normal: string;
    bold: string;
    monospace: string;
  };
  spacing: {
    padding: number;
    lineHeight: number;
    sectionGap: number;
  };
}

/**
 * Default window size configuration
 */
export interface ViewSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Core view definition interface.
 *
 * A DashboardView defines what data to show and how to render it.
 * Both the Player UI and LLM Dashboard consume these definitions.
 *
 * @example
 * ```typescript
 * const ResourcesView: DashboardView<ResourcesViewData> = {
 *   id: 'resources',
 *   title: 'Village Stockpile',
 *   category: 'economy',
 *   getData: (ctx) => aggregateResources(ctx.world),
 *   textFormatter: (data) => formatResourcesAsText(data),
 *   canvasRenderer: (ctx, data, bounds, theme) => renderResourcesToCanvas(...),
 * };
 * ```
 */
export interface DashboardView<TData extends ViewData = ViewData> {
  /** Unique identifier for the view */
  id: string;

  /** Display title shown in UI */
  title: string;

  /** Menu category for organization */
  category: DashboardCategory;

  /** Optional keyboard shortcut (e.g., 'R' for resources) */
  keyboardShortcut?: string;

  /** Description shown in help/tooltips */
  description?: string;

  /**
   * Fetch data for this view.
   * Called by both dashboards before rendering.
   *
   * @param context - Context with world, session data, and parameters
   * @returns View data (sync or async)
   */
  getData(context: ViewContext): TData | Promise<TData>;

  /**
   * Format data as text for LLM/curl dashboard.
   * If not provided, view is canvas-only.
   *
   * @param data - Data from getData()
   * @param options - Formatting options
   * @returns Formatted text string
   */
  textFormatter?: (data: TData, options?: TextFormatOptions) => string;

  /**
   * Render data to canvas for player UI.
   * If not provided, view is text-only.
   *
   * @param ctx - Canvas 2D rendering context
   * @param data - Data from getData()
   * @param bounds - Rendering bounds (x, y, width, height)
   * @param theme - Colors, fonts, and spacing
   */
  canvasRenderer?: (
    ctx: CanvasRenderingContext2D,
    data: TData,
    bounds: RenderBounds,
    theme: RenderTheme
  ) => void;

  /**
   * Whether this view requires a live game connection.
   * If true, won't appear in historical session analysis.
   */
  liveOnly?: boolean;

  /**
   * Whether this view is for historical analysis only.
   * If true, won't appear in player UI.
   */
  historicalOnly?: boolean;

  /**
   * Default window dimensions for canvas rendering
   */
  defaultSize?: ViewSize;

  /**
   * Optional scroll handler for canvas rendering
   *
   * @param deltaY - Scroll amount (positive = down)
   * @param contentHeight - Total content height
   * @param state - Mutable view state
   * @returns true if scroll was handled
   */
  handleScroll?: (deltaY: number, contentHeight: number, state: ViewState) => boolean;

  /**
   * Optional click handler for canvas rendering
   *
   * @param x - Click X relative to view
   * @param y - Click Y relative to view
   * @param bounds - View bounds
   * @param data - Current view data
   * @returns true if click was handled
   */
  handleClick?: (x: number, y: number, bounds: RenderBounds, data: TData) => boolean;

  /**
   * Create initial state for interactive views.
   * Called once when view is first shown.
   */
  createInitialState?: () => ViewState;
}

/**
 * Type guard to check if a view has text formatting capability
 */
export function hasTextFormatter<TData extends ViewData>(
  view: DashboardView<TData>
): view is DashboardView<TData> & { textFormatter: NonNullable<DashboardView<TData>['textFormatter']> } {
  return typeof view.textFormatter === 'function';
}

/**
 * Type guard to check if a view has canvas rendering capability
 */
export function hasCanvasRenderer<TData extends ViewData>(
  view: DashboardView<TData>
): view is DashboardView<TData> & { canvasRenderer: NonNullable<DashboardView<TData>['canvasRenderer']> } {
  return typeof view.canvasRenderer === 'function';
}
