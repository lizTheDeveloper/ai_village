/**
 * Player UI renderer interface
 *
 * Defines the contract for renderers that generate player-facing UI
 * from component schemas.
 */

import type { Component, ComponentSchema } from '../types/index.js';

/**
 * Rendering context for player renderers
 *
 * Provides the necessary information and DOM/Canvas context for rendering
 */
export interface RenderContext {
  /**
   * Canvas rendering context (for canvas renderers)
   */
  ctx?: CanvasRenderingContext2D;

  /**
   * X position for canvas rendering
   */
  x: number;

  /**
   * Y position for canvas rendering
   */
  y: number;

  /**
   * Width available for rendering
   */
  width: number;

  /**
   * Height available for rendering
   */
  height: number;

  /**
   * DOM container element (for DOM renderers)
   */
  container?: HTMLElement;

  /**
   * Use compact rendering (less spacing, smaller fonts)
   * @default false
   */
  compact?: boolean;

  /**
   * Show field labels
   * @default true
   */
  showLabels?: boolean;

  /**
   * Show icons if available
   * @default true
   */
  showIcons?: boolean;
}

/**
 * Result from rendering a component
 */
export interface RenderResult {
  /**
   * Whether rendering was successful
   */
  success: boolean;

  /**
   * Height consumed by rendering (for layout stacking)
   */
  heightUsed?: number;

  /**
   * Error message if rendering failed
   */
  error?: string;
}

/**
 * Base interface for player renderers
 *
 * Player renderers auto-generate UI from component schemas,
 * showing only fields with visibility.player === true
 */
export interface PlayerRenderer {
  /**
   * Render a single component to the current context
   *
   * @param component - The component data to render
   * @param schema - The component schema defining how to render
   * @param context - Rendering context (canvas/DOM)
   * @returns Render result with success status and height used
   */
  renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context: RenderContext
  ): RenderResult;

  /**
   * Render all player-visible components for an entity
   *
   * @param entity - Entity with components to render
   * @param context - Rendering context
   * @returns Render result
   */
  renderEntity(
    entity: { getComponent(type: string): Component | null; id: string },
    context: RenderContext
  ): RenderResult;

  /**
   * Clear any rendered output
   */
  clear(): void;
}
