/**
 * ViewAdapter - Bridges DashboardView definitions to WindowManager's IWindowPanel interface
 *
 * This adapter wraps DashboardView instances from @ai-village/core and makes them
 * compatible with the renderer's WindowManager panel system.
 *
 * It handles:
 * - Calling view.getData(context) to fetch data
 * - Calling view.canvasRenderer(ctx, data, bounds, theme) to render
 * - Forwarding scroll events to view.handleScroll if defined
 * - Forwarding click events to view.handleClick if defined
 * - Managing view state (scroll offset, selections, etc.)
 */

import type { IWindowPanel } from '../types/WindowTypes.js';
import type {
  DashboardView,
  ViewData,
  ViewContext,
  ViewState,
  RenderBounds,
} from '@ai-village/core';
import { defaultTheme, hasCanvasRenderer } from '@ai-village/core';
import type { World } from '@ai-village/core';

/**
 * Adapter that wraps a DashboardView for use with WindowManager.
 *
 * The ViewAdapter:
 * 1. Fetches data via view.getData(context)
 * 2. Renders via view.canvasRenderer(ctx, data, bounds, theme)
 * 3. Manages view state (scroll, selections, etc.)
 * 4. Forwards interaction events to the view
 *
 * @example
 * ```typescript
 * import { viewRegistry } from '@ai-village/core';
 * import { ViewAdapter } from './adapters/ViewAdapter';
 *
 * const resourcesView = viewRegistry.get('resources');
 * const adapter = new ViewAdapter(resourcesView);
 * windowManager.registerWindow(adapter.getId(), adapter, {
 *   defaultX: 100,
 *   defaultY: 100,
 *   defaultWidth: adapter.getDefaultWidth(),
 *   defaultHeight: adapter.getDefaultHeight(),
 * });
 * ```
 */
/** Async data loading state */
interface AsyncDataState<TData> {
  loading: boolean;
  error: Error | null;
  data: TData | null;
  timestamp: number;
}

export class ViewAdapter<TData extends ViewData = ViewData> implements IWindowPanel {
  private view: DashboardView<TData>;
  private visible: boolean = false;
  private viewState: ViewState;
  private world: World | null = null;
  private cachedData: TData | null = null;
  private lastDataFetchTime: number = 0;
  private readonly DATA_CACHE_MS = 100; // Cache data for 100ms to avoid redundant fetches
  private asyncState: AsyncDataState<TData> = {
    loading: false,
    error: null,
    data: null,
    timestamp: 0,
  };
  private pendingAsyncFetch: Promise<TData> | null = null;

  constructor(view: DashboardView<TData>) {
    // Validate view (no silent fallbacks per CLAUDE.md)
    if (!view) {
      throw new Error('ViewAdapter: view is required');
    }
    if (!view.id) {
      throw new Error('ViewAdapter: view.id is required');
    }
    if (!view.title) {
      throw new Error('ViewAdapter: view.title is required');
    }
    if (typeof view.getData !== 'function') {
      throw new Error(`ViewAdapter: view '${view.id}' must have a getData function`);
    }

    // Warn if view has no canvas renderer (but still allow it - might be text-only)
    if (!hasCanvasRenderer(view)) {
      console.warn(`[ViewAdapter] View '${view.id}' has no canvasRenderer - will render nothing`);
    }

    this.view = view;

    // Initialize view state
    if (view.createInitialState) {
      this.viewState = view.createInitialState();
    } else {
      this.viewState = {
        scrollOffset: 0,
      };
    }
  }

  /**
   * Set the world instance for data fetching
   */
  setWorld(world: World | null): void {
    this.world = world;
    // Invalidate cache when world changes
    this.cachedData = null;
  }

  /**
   * Get the underlying DashboardView
   */
  getView(): DashboardView<TData> {
    return this.view;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return this.view.id;
  }

  getTitle(): string {
    return this.view.title;
  }

  getDefaultWidth(): number {
    return this.view.defaultSize?.width ?? 400;
  }

  getDefaultHeight(): number {
    return this.view.defaultSize?.height ?? 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;

    // Invalidate cache when visibility changes
    if (visible) {
      this.cachedData = null;
      this.asyncState.data = null;
    }
  }

  /**
   * Render the view to canvas
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: unknown
  ): void {
    if (!this.visible) {
      return;
    }

    // Update world if provided
    if (world && typeof world === 'object' && 'getEntity' in world) {
      this.world = world as World;
    }

    // Fetch data
    const data = this.fetchData();

    // Handle async loading state
    if (this.asyncState.loading) {
      ctx.fillStyle = defaultTheme.colors.textMuted;
      ctx.font = defaultTheme.fonts.normal;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Handle async error state
    if (this.asyncState.error) {
      ctx.fillStyle = defaultTheme.colors.error;
      ctx.font = defaultTheme.fonts.bold;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Error loading data', x + width / 2, y + height / 2 - 10);
      ctx.fillStyle = defaultTheme.colors.textMuted;
      ctx.font = '12px monospace';
      ctx.fillText(this.asyncState.error.message, x + width / 2, y + height / 2 + 10);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    if (!data) {
      // Render "Loading..." or error message
      ctx.fillStyle = defaultTheme.colors.textMuted;
      ctx.font = defaultTheme.fonts.normal;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Check if data is unavailable
    if (!data.available) {
      const message = data.unavailableReason ?? 'Data unavailable';
      ctx.fillStyle = defaultTheme.colors.textMuted;
      ctx.font = defaultTheme.fonts.normal;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Render using view's canvas renderer if available
    if (hasCanvasRenderer(this.view)) {
      const bounds: RenderBounds = { x, y, width, height };

      // Apply scroll offset to bounds if view uses scrolling
      const scrollY = this.viewState.scrollOffset ?? 0;
      ctx.save();
      ctx.translate(0, -scrollY);

      try {
        this.view.canvasRenderer(ctx, data, bounds, defaultTheme);
      } catch (error) {
        console.error(`[ViewAdapter] Error rendering view '${this.view.id}':`, error);

        // Render error message
        ctx.restore();
        ctx.fillStyle = defaultTheme.colors.error;
        ctx.font = defaultTheme.fonts.normal;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Render Error', x + width / 2, y + height / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        return;
      }

      ctx.restore();
    }
  }

  /**
   * Handle scroll events (if view supports scrolling)
   */
  handleScroll?(deltaY: number, contentHeight: number): boolean {
    if (this.view.handleScroll) {
      // Calculate total content height if needed (would require rendering to measure)
      // For now, pass contentHeight as provided
      const handled = this.view.handleScroll(deltaY, contentHeight, this.viewState);
      return handled;
    }

    // Default scroll behavior - update scroll offset
    const currentScroll = this.viewState.scrollOffset ?? 0;
    const newScroll = Math.max(0, currentScroll + deltaY);

    // Limit scroll to prevent scrolling past content
    // This is a simple implementation - views can override via handleScroll
    const maxScroll = Math.max(0, contentHeight - contentHeight);
    this.viewState.scrollOffset = Math.min(newScroll, maxScroll);

    return true;
  }

  /**
   * Handle clicks on panel content (if view supports clicks)
   */
  handleContentClick?(x: number, y: number, width: number, height: number): boolean {
    if (this.view.handleClick) {
      const data = this.fetchData();
      if (!data) {
        return false;
      }

      const bounds: RenderBounds = { x: 0, y: 0, width, height };
      return this.view.handleClick(x, y, bounds, data);
    }

    return false;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Fetch data from the view with caching and async state management
   */
  private fetchData(): TData | null {
    const now = Date.now();

    // Return cached sync data if fresh
    if (this.cachedData && (now - this.lastDataFetchTime) < this.DATA_CACHE_MS) {
      return this.cachedData;
    }

    // Return cached async data if fresh and not loading
    if (this.asyncState.data && !this.asyncState.loading && (now - this.asyncState.timestamp) < this.DATA_CACHE_MS) {
      return this.asyncState.data;
    }

    // Build view context
    const context: ViewContext = {
      world: this.world ?? undefined,
      selectedEntityId: this.viewState.selectedEntityId,
      params: {},
    };

    try {
      const result = this.view.getData(context);

      // Handle async data fetch
      if (result instanceof Promise) {
        // Don't start a new fetch if one is already pending
        if (this.pendingAsyncFetch === result) {
          return this.asyncState.data;
        }

        this.pendingAsyncFetch = result;
        this.asyncState.loading = true;
        this.asyncState.error = null;

        result
          .then(data => {
            // Only update if this is still the pending fetch
            if (this.pendingAsyncFetch === result) {
              this.asyncState.data = data;
              this.asyncState.timestamp = Date.now();
              this.asyncState.loading = false;
              this.asyncState.error = null;
              this.pendingAsyncFetch = null;
            }
          })
          .catch(error => {
            // Only update if this is still the pending fetch
            if (this.pendingAsyncFetch === result) {
              console.error(`[ViewAdapter] Error fetching data for view '${this.view.id}':`, error);
              this.asyncState.loading = false;
              this.asyncState.error = error instanceof Error ? error : new Error(String(error));
              this.pendingAsyncFetch = null;
            }
          });

        // Return existing data while loading (or null if no data yet)
        return this.asyncState.data;
      }

      // Sync data fetch
      this.cachedData = result;
      this.lastDataFetchTime = now;
      // Clear async state since we got sync data
      this.asyncState.data = null;
      this.asyncState.loading = false;
      this.asyncState.error = null;
      this.pendingAsyncFetch = null;
      return result;
    } catch (error) {
      console.error(`[ViewAdapter] Error fetching data for view '${this.view.id}':`, error);
      this.asyncState.error = error instanceof Error ? error : new Error(String(error));
      this.asyncState.loading = false;
      return null;
    }
  }
}

