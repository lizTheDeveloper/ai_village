/**
 * Widget types and interfaces for canvas-based rendering
 */

import type { FieldSchema } from '../../types/FieldSchema.js';

/**
 * Canvas rendering context for widgets
 */
export interface WidgetRenderContext {
  /** Canvas 2D context */
  ctx: CanvasRenderingContext2D;
  /** X position to render at */
  x: number;
  /** Y position to render at */
  y: number;
  /** Available width */
  width: number;
  /** Widget height (for layout calculation) */
  height: number;
  /** Whether the widget is focused/active */
  focused?: boolean;
  /** Whether the widget is hovered */
  hovered?: boolean;
}

/**
 * Widget interaction event
 */
export interface WidgetEvent {
  /** Event type */
  type: 'click' | 'hover' | 'input' | 'change';
  /** Mouse X position (relative to widget) */
  x?: number;
  /** Mouse Y position (relative to widget) */
  y?: number;
  /** New value (for input/change events) */
  value?: unknown;
}

/**
 * Base widget interface
 * All widgets must implement this interface
 */
export interface Widget {
  /**
   * Render the widget to canvas
   * @returns Height consumed by rendering (for layout)
   */
  render(ctx: WidgetRenderContext): number;

  /**
   * Handle interaction events
   * @returns New value if changed, undefined otherwise
   */
  handleEvent?(event: WidgetEvent): unknown | undefined;

  /**
   * Get current value
   */
  getValue(): unknown;

  /**
   * Set current value
   */
  setValue(value: unknown): void;
}

/**
 * Widget factory function type
 */
export type WidgetFactory = (
  fieldName: string,
  fieldSchema: FieldSchema,
  currentValue: unknown,
  onChange: (newValue: unknown) => void
) => Widget;

/**
 * Canvas rendering utilities
 */
export const CanvasUtils = {
  /**
   * Draw text with truncation if needed
   */
  drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    color: string = '#FFFFFF'
  ): void {
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';

    // Measure and truncate if needed
    let displayText = text;
    let metrics = ctx.measureText(displayText);

    if (metrics.width > maxWidth) {
      while (displayText.length > 0 && metrics.width > maxWidth - 20) {
        displayText = displayText.slice(0, -1);
        metrics = ctx.measureText(displayText + '...');
      }
      displayText += '...';
    }

    ctx.fillText(displayText, x, y);
  },

  /**
   * Draw a box (for buttons, input fields, etc.)
   */
  drawBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    bgColor: string,
    borderColor?: string
  ): void {
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }
  },

  /**
   * Check if point is inside rect
   */
  isInside(
    px: number,
    py: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    return px >= x && px <= x + width && py >= y && py <= y + height;
  },
};
