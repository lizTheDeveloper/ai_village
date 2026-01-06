/**
 * UI metadata and hints for field rendering
 *
 * Provides visual styling and organization hints for UI renderers.
 */

import type { WidgetType } from './WidgetTypes.js';

/**
 * UI hints for field rendering
 *
 * Controls how fields appear in UI (widget type, grouping, styling)
 */
export interface UIHints {
  /**
   * Widget type for rendering this field
   * Determines the UI control used to display/edit the value
   */
  widget: WidgetType;

  /**
   * Visual grouping identifier
   * Fields with same group name are displayed together
   * @example 'basic', 'stats', 'advanced'
   */
  group?: string;

  /**
   * Display order within group
   * Lower numbers appear first
   * @default 0
   */
  order?: number;

  /**
   * Icon identifier for this field
   * Can be icon name, emoji, or icon path
   * @example 'heart', '❤️', '/icons/health.png'
   */
  icon?: string;

  /**
   * Color for this field (hex, rgb, or named color)
   * Used for highlights, borders, or icon tints
   * @example '#FF0000', 'rgb(255, 0, 0)', 'red'
   */
  color?: string;

  /**
   * Custom CSS class name(s) to apply
   */
  className?: string;

  /**
   * Tooltip text to show on hover
   */
  tooltip?: string;

  /**
   * Width hint in pixels or percentage
   * @example 200, '50%', 'full'
   */
  width?: number | string;

  /**
   * Whether this field should be highlighted/emphasized
   * @default false
   */
  emphasized?: boolean;
}

/**
 * Component-level UI configuration
 *
 * Applies to the entire component, not individual fields
 */
export interface UIConfig {
  /**
   * Icon for this component
   * @example 'person', '👤', '/icons/identity.png'
   */
  icon?: string;

  /**
   * Color for this component
   * @example '#4CAF50'
   */
  color?: string;

  /**
   * Display priority (lower = shown first)
   * @default 100
   */
  priority?: number;

  /**
   * Whether this component should be collapsed by default
   * @default false
   */
  collapsed?: boolean;

  /**
   * Custom title for this component (overrides type name)
   */
  title?: string;

  /**
   * Category/section for grouping multiple components
   * @example 'Agent Stats', 'Physical Attributes'
   */
  section?: string;

  /**
   * Whether this component should appear in the DevTools panel
   * @default false
   */
  devToolsPanel?: boolean;
}
