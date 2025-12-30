/**
 * ViewRegistry - Central registry for dashboard views
 *
 * Both the Player UI and LLM Dashboard consume views from this registry.
 * Views are registered once and automatically available to both dashboards.
 */

import type { DashboardView, ViewData, DashboardCategory } from './types.js';
import { hasTextFormatter, hasCanvasRenderer } from './types.js';

/**
 * Listener function called when views are registered
 */
export type ViewRegistryListener = () => void;

/**
 * Central registry for all dashboard views.
 * Both dashboards consume views from this registry.
 *
 * @example
 * ```typescript
 * import { viewRegistry } from '@ai-village/core';
 *
 * // Register a view
 * viewRegistry.register(ResourcesView);
 *
 * // Get all views
 * const views = viewRegistry.getAll();
 *
 * // Get view by ID
 * const resourcesView = viewRegistry.get('resources');
 * ```
 */
export class ViewRegistry {
  private views = new Map<string, DashboardView>();
  private listeners = new Set<ViewRegistryListener>();

  /**
   * Register a view definition.
   *
   * @param view - The view to register
   * @throws Error if view with same ID already exists
   * @throws Error if view is missing required fields
   */
  register<TData extends ViewData>(view: DashboardView<TData>): void {
    // Validate required fields (no silent fallbacks)
    if (!view) {
      throw new Error('View is required');
    }
    if (!view.id) {
      throw new Error('View must have an id');
    }
    if (typeof view.id !== 'string' || view.id.trim() === '') {
      throw new Error('View id must be a non-empty string');
    }
    if (!view.title) {
      throw new Error(`View '${view.id}' must have a title`);
    }
    if (!view.category) {
      throw new Error(`View '${view.id}' must have a category`);
    }
    if (typeof view.getData !== 'function') {
      throw new Error(`View '${view.id}' must have a getData function`);
    }

    // Check for duplicates
    if (this.views.has(view.id)) {
      throw new Error(`View with id '${view.id}' already registered`);
    }

    // Warn if view has no renderers (but still allow registration)
    if (!view.textFormatter && !view.canvasRenderer) {
      console.warn(`[ViewRegistry] View '${view.id}' has no textFormatter or canvasRenderer`);
    }

    this.views.set(view.id, view as unknown as DashboardView);
    this.notifyListeners();
  }

  /**
   * Unregister a view by ID.
   * Useful for testing or dynamic view management.
   *
   * @param id - The view ID to unregister
   * @returns true if view was found and removed, false otherwise
   */
  unregister(id: string): boolean {
    const existed = this.views.delete(id);
    if (existed) {
      this.notifyListeners();
    }
    return existed;
  }

  /**
   * Clear all registered views.
   * Primarily for testing purposes.
   */
  clear(): void {
    this.views.clear();
    this.notifyListeners();
  }

  /**
   * Get a view by ID.
   *
   * @param id - The view ID
   * @returns The view definition
   * @throws Error if view not found
   */
  get<TData extends ViewData = ViewData>(id: string): DashboardView<TData> {
    const view = this.views.get(id);
    if (!view) {
      const available = Array.from(this.views.keys()).join(', ') || '(none)';
      throw new Error(`View '${id}' not found. Available views: ${available}`);
    }
    return view as unknown as DashboardView<TData>;
  }

  /**
   * Try to get a view by ID without throwing.
   *
   * @param id - The view ID
   * @returns The view definition or undefined if not found
   */
  tryGet<TData extends ViewData = ViewData>(id: string): DashboardView<TData> | undefined {
    return this.views.get(id) as DashboardView<TData> | undefined;
  }

  /**
   * Check if a view exists
   *
   * @param id - The view ID
   * @returns true if view is registered
   */
  has(id: string): boolean {
    return this.views.has(id);
  }

  /**
   * Get all registered views
   *
   * @returns Array of all view definitions
   */
  getAll(): DashboardView[] {
    return Array.from(this.views.values());
  }

  /**
   * Get the number of registered views
   */
  get size(): number {
    return this.views.size;
  }

  /**
   * Get views by category
   *
   * @param category - The category to filter by
   * @returns Array of views in that category
   */
  getByCategory(category: DashboardCategory): DashboardView[] {
    return this.getAll().filter(v => v.category === category);
  }

  /**
   * Get views that have text formatters (for LLM dashboard)
   *
   * @returns Array of views with textFormatter defined
   */
  getTextViews(): DashboardView[] {
    return this.getAll().filter(v => hasTextFormatter(v));
  }

  /**
   * Get views that have canvas renderers (for player UI)
   *
   * @returns Array of views with canvasRenderer defined
   */
  getCanvasViews(): DashboardView[] {
    return this.getAll().filter(v => hasCanvasRenderer(v));
  }

  /**
   * Get views suitable for live gameplay (not historical-only)
   *
   * @returns Array of views that can show live data
   */
  getLiveViews(): DashboardView[] {
    return this.getAll().filter(v => !v.historicalOnly);
  }

  /**
   * Get views suitable for historical analysis (not live-only)
   *
   * @returns Array of views that can analyze session data
   */
  getHistoricalViews(): DashboardView[] {
    return this.getAll().filter(v => !v.liveOnly);
  }

  /**
   * Get all view IDs
   *
   * @returns Array of registered view IDs
   */
  getIds(): string[] {
    return Array.from(this.views.keys());
  }

  /**
   * Subscribe to registry changes.
   * Listener is called whenever views are registered or unregistered.
   *
   * @param listener - Function to call on changes
   * @returns Unsubscribe function
   */
  subscribe(listener: ViewRegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[ViewRegistry] Listener error:', error);
      }
    }
  }
}

/**
 * Global singleton registry instance.
 *
 * Use this for application-wide view registration.
 * For testing, create new ViewRegistry instances directly.
 */
export const viewRegistry = new ViewRegistry();
