/**
 * Dashboard Module
 *
 * Unified dashboard system for both Player UI and LLM Dashboard.
 *
 * Usage:
 * ```typescript
 * import { viewRegistry, ResourcesView, defaultTheme } from '@ai-village/core';
 *
 * // Views are auto-registered on import
 * const allViews = viewRegistry.getAll();
 *
 * // Get a specific view
 * const resources = viewRegistry.get('resources');
 *
 * // Create custom view
 * const myView: DashboardView<MyViewData> = {
 *   id: 'my-view',
 *   title: 'My View',
 *   category: 'info',
 *   getData: (ctx) => ({ ... }),
 *   textFormatter: (data) => 'text...',
 * };
 * viewRegistry.register(myView);
 * ```
 */

// Core types
export type {
  ViewData,
  ViewContext,
  ViewState,
  TextFormatOptions,
  RenderBounds,
  RenderTheme,
  ViewSize,
  DashboardView,
  DashboardCategory,
  StoredMetric,
} from './types.js';

// Type guards
export { hasTextFormatter, hasCanvasRenderer } from './types.js';

// Registry
export { ViewRegistry, viewRegistry, type ViewRegistryListener } from './ViewRegistry.js';

// Theme
export {
  defaultTheme,
  resourceColors,
  resourceIcons,
  statusColors,
  getResourceColor,
  getResourceIcon,
  getStatusColor,
  formatNumber,
  createProgressBar,
} from './theme.js';

// Views and their data types
export {
  ResourcesView,
  type ResourcesViewData,
  PopulationView,
  type PopulationViewData,
  WeatherView,
  type WeatherViewData,
  builtInViews,
  registerBuiltInViews,
} from './views/index.js';
