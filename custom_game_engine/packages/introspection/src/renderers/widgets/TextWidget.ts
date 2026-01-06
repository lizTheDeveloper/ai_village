/**
 * TextWidget - Text input widget for string fields
 */

import type { Widget, WidgetRenderContext, WidgetEvent } from './types.js';
import { CanvasUtils } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';

const COLORS = {
  label: '#AAAAAA',
  value: '#FFFFFF',
  background: 'rgba(30, 30, 40, 0.8)',
  backgroundHover: 'rgba(40, 40, 50, 0.9)',
  backgroundFocus: 'rgba(50, 50, 60, 0.95)',
  border: '#555555',
  borderFocus: '#888888',
};

export class TextWidget implements Widget {
  private isEditing = false;
  private editBuffer = '';

  constructor(
    private fieldName: string,
    private fieldSchema: FieldSchema,
    private currentValue: unknown,
    private onChange: (newValue: unknown) => void
  ) {
    this.editBuffer = String(currentValue || '');
  }

  render(ctx: WidgetRenderContext): number {
    const { ctx: canvas, x, y, width, focused, hovered } = ctx;

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

    // Determine background color
    let bgColor = COLORS.background;
    let borderColor = COLORS.border;
    if (focused || this.isEditing) {
      bgColor = COLORS.backgroundFocus;
      borderColor = COLORS.borderFocus;
    } else if (hovered) {
      bgColor = COLORS.backgroundHover;
    }

    // Draw input background
    CanvasUtils.drawBox(
      canvas,
      x + labelWidth + 5,
      y + 2,
      valueWidth - 5,
      height - 4,
      bgColor,
      borderColor
    );

    // Draw value or edit buffer
    const displayValue = this.isEditing ? this.editBuffer : String(this.currentValue || '');
    CanvasUtils.drawText(
      canvas,
      displayValue,
      x + labelWidth + 10,
      y + height / 2,
      valueWidth - 15,
      COLORS.value
    );

    // Draw cursor if editing
    if (this.isEditing) {
      const textWidth = canvas.measureText(displayValue).width;
      canvas.fillStyle = COLORS.value;
      canvas.fillRect(
        x + labelWidth + 10 + textWidth + 2,
        y + 6,
        1,
        height - 12
      );
    }

    return height;
  }

  handleEvent(event: WidgetEvent): unknown | undefined {
    if (event.type === 'click') {
      // Start editing
      this.isEditing = true;
      this.editBuffer = String(this.currentValue || '');
      return undefined;
    }

    if (event.type === 'input' && this.isEditing) {
      // Update edit buffer (value is the new character or special key)
      if (event.value === 'Enter') {
        // Commit changes
        this.isEditing = false;
        const newValue = this.editBuffer;

        // Validate maxLength
        if (this.fieldSchema.maxLength && newValue.length > this.fieldSchema.maxLength) {
          console.warn(`Text exceeds maxLength: ${this.fieldSchema.maxLength}`);
          return undefined;
        }

        this.currentValue = newValue;
        this.onChange(newValue);
        return newValue;
      } else if (event.value === 'Escape') {
        // Cancel editing
        this.isEditing = false;
        this.editBuffer = String(this.currentValue || '');
        return undefined;
      } else if (event.value === 'Backspace') {
        // Delete last character
        this.editBuffer = this.editBuffer.slice(0, -1);
        return undefined;
      } else if (typeof event.value === 'string' && event.value.length === 1) {
        // Add character
        this.editBuffer += event.value;
        return undefined;
      }
    }

    return undefined;
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    this.currentValue = value;
    this.editBuffer = String(value || '');
  }
}
