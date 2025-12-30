/**
 * ViewPanelFactory - Factory functions to create WindowManager panels from DashboardViews
 *
 * This module provides convenience functions to:
 * - Create a single panel from a DashboardView
 * - Auto-generate panels for all views in the registry
 * - Map view categories to WindowManager menu categories
 */

import type { DashboardView, ViewData, DashboardCategory } from '@ai-village/core';
import { viewRegistry, hasCanvasRenderer } from '@ai-village/core';
import { ViewAdapter } from './ViewAdapter.js';
import type { IWindowPanel, WindowConfig, WindowMenuCategory } from '../types/WindowTypes.js';

/**
 * Map DashboardCategory to WindowMenuCategory.
 * They use the same enum values, but this function ensures type safety.
 */
export function mapViewCategoryToMenuCategory(category: DashboardCategory): WindowMenuCategory {
  // The types are compatible by design, but we validate to be safe
  const validCategories: WindowMenuCategory[] = [
    'info',
    'economy',
    'social',
    'farming',
    'animals',
    'magic',
    'divinity',
    'dev',
    'settings',
    'default',
  ];

  if (validCategories.includes(category as WindowMenuCategory)) {
    return category as WindowMenuCategory;
  }

  console.warn(`[ViewPanelFactory] Unknown category '${category}', using 'default'`);
  return 'default';
}

/**
 * Create a WindowConfig for a DashboardView.
 * Uses view metadata to configure the window.
 */
export function createWindowConfigForView<TData extends ViewData>(
  view: DashboardView<TData>
): WindowConfig {
  const adapter = new ViewAdapter(view);

  return {
    defaultX: 100,
    defaultY: 100,
    defaultWidth: adapter.getDefaultWidth(),
    defaultHeight: adapter.getDefaultHeight(),
    minWidth: view.defaultSize?.minWidth,
    minHeight: view.defaultSize?.minHeight,
    maxWidth: view.defaultSize?.maxWidth,
    maxHeight: view.defaultSize?.maxHeight,
    isResizable: true,
    isDraggable: true,
    showInWindowList: true,
    keyboardShortcut: view.keyboardShortcut,
    menuCategory: mapViewCategoryToMenuCategory(view.category),
  };
}

/**
 * Create a panel adapter from a DashboardView.
 *
 * @param view - The DashboardView to wrap
 * @returns An IWindowPanel implementation
 * @throws Error if view has no canvasRenderer
 */
export function createPanelFromView<TData extends ViewData>(
  view: DashboardView<TData>
): IWindowPanel {
  // Validate that view can be rendered in canvas
  if (!hasCanvasRenderer(view)) {
    throw new Error(
      `View '${view.id}' cannot be used as a panel - it has no canvasRenderer. ` +
      'Text-only views are not supported in the player UI.'
    );
  }

  // Views marked as historical-only should not appear in live UI
  if (view.historicalOnly) {
    throw new Error(
      `View '${view.id}' is marked as historicalOnly and cannot be used in the player UI.`
    );
  }

  return new ViewAdapter(view);
}

/**
 * Create panels for all canvas-capable views in the registry.
 *
 * This scans the global viewRegistry and creates a panel adapter for each view that:
 * - Has a canvasRenderer (can be shown in player UI)
 * - Is not historicalOnly (can be used with live data)
 *
 * @returns Array of panel adapters with their window configs
 */
export function createAllViewPanels(): Array<{
  panel: IWindowPanel;
  config: WindowConfig;
}> {
  const results: Array<{ panel: IWindowPanel; config: WindowConfig }> = [];

  // Get all views that can be rendered in canvas
  const canvasViews = viewRegistry.getCanvasViews();

  for (const view of canvasViews) {
    // Skip historical-only views
    if (view.historicalOnly) {
      continue;
    }

    try {
      const panel = createPanelFromView(view);
      const config = createWindowConfigForView(view);

      results.push({ panel, config });
    } catch (error) {
      console.error(`[ViewPanelFactory] Failed to create panel for view '${view.id}':`, error);
      // Continue processing other views (don't fail entire batch)
    }
  }

  return results;
}

/**
 * Get view-based panels grouped by menu category.
 * Useful for building menu structures.
 *
 * @returns Map of menu category to panels
 */
export function getViewPanelsByCategory(): Map<WindowMenuCategory, IWindowPanel[]> {
  const panels = createAllViewPanels();
  const categorized = new Map<WindowMenuCategory, IWindowPanel[]>();

  for (const { panel, config } of panels) {
    const category = config.menuCategory ?? 'default';

    if (!categorized.has(category)) {
      categorized.set(category, []);
    }

    categorized.get(category)!.push(panel);
  }

  return categorized;
}

/**
 * Find a view-based panel by view ID.
 *
 * @param viewId - The DashboardView ID
 * @returns Panel adapter or undefined if not found
 */
export function findPanelForView(viewId: string): IWindowPanel | undefined {
  try {
    const view = viewRegistry.get(viewId);

    // Check if view can be used as panel
    if (!hasCanvasRenderer(view) || view.historicalOnly) {
      return undefined;
    }

    return createPanelFromView(view);
  } catch (error) {
    // View not found or error creating panel
    return undefined;
  }
}
