/**
 * DropdownWidget - Select from enum values
 */

import type { Widget, WidgetRenderContext, WidgetEvent } from './types.js';
import { CanvasUtils } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';

const COLORS = {
  label: '#AAAAAA',
  value: '#FFFFFF',
  background: 'rgba(30, 30, 40, 0.8)',
  backgroundHover: 'rgba(40, 40, 50, 0.9)',
  border: '#555555',
  borderHover: '#888888',
  arrow: '#AAAAAA',
};

export class DropdownWidget implements Widget {
  private isOpen = false;

  constructor(
    private fieldName: string,
    private fieldSchema: FieldSchema,
    private currentValue: unknown,
    private onChange: (newValue: unknown) => void
  ) {}

  render(ctx: WidgetRenderContext): number {
    const { ctx: canvas, x, y, width, hovered } = ctx;

    const labelWidth = width * 0.4;
    const valueWidth = width * 0.6;
    const height = 24;

    // Draw label
    canvas.font = '12px monospace';
    CanvasUtils.drawText(
      canvas,
      this.fieldSchema.displayName || this.fieldName,
      x,
      y + height / 2,
      labelWidth,
      COLORS.label
    );

    // Draw dropdown background
    CanvasUtils.drawBox(
      canvas,
      x + labelWidth + 5,
      y + 2,
      valueWidth - 5,
      height - 4,
      hovered ? COLORS.backgroundHover : COLORS.background,
      hovered ? COLORS.borderHover : COLORS.border
    );

    // Draw current value
    const valueStr = String(this.currentValue || '');
    CanvasUtils.drawText(
      canvas,
      valueStr,
      x + labelWidth + 10,
      y + height / 2,
      valueWidth - 30,
      COLORS.value
    );

    // Draw dropdown arrow
    const arrowX = x + labelWidth + valueWidth - 15;
    const arrowY = y + height / 2;
    canvas.fillStyle = COLORS.arrow;
    canvas.beginPath();
    canvas.moveTo(arrowX, arrowY - 3);
    canvas.lineTo(arrowX + 5, arrowY + 3);
    canvas.lineTo(arrowX - 5, arrowY + 3);
    canvas.closePath();
    canvas.fill();

    // If open, draw options (simplified - just cycle through on click)
    // Full dropdown would require modal/overlay rendering

    return height;
  }

  handleEvent(event: WidgetEvent): unknown | undefined {
    if (event.type === 'click') {
      // Cycle to next value
      const options = this.fieldSchema.enumValues || [];
      if (options.length === 0) return undefined;

      const currentIndex = options.indexOf(String(this.currentValue));
      const nextIndex = (currentIndex + 1) % options.length;
      const newValue = options[nextIndex];

      this.currentValue = newValue;
      this.onChange(newValue);
      return newValue;
    }

    return undefined;
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    // Validate that value is in enum
    const options = this.fieldSchema.enumValues || [];
    if (options.includes(String(value))) {
      this.currentValue = value;
    }
  }
}
