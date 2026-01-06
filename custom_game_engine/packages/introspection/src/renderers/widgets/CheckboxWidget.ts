/**
 * CheckboxWidget - Boolean toggle widget
 */

import type { Widget, WidgetRenderContext, WidgetEvent } from './types.js';
import { CanvasUtils } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';

const COLORS = {
  label: '#AAAAAA',
  boxBg: 'rgba(30, 30, 40, 0.8)',
  boxBgHover: 'rgba(40, 40, 50, 0.9)',
  border: '#555555',
  borderHover: '#888888',
  check: '#66FF66',
};

export class CheckboxWidget implements Widget {
  constructor(
    private fieldName: string,
    private fieldSchema: FieldSchema,
    private currentValue: unknown,
    private onChange: (newValue: unknown) => void
  ) {
    // Ensure value is boolean
    if (typeof currentValue !== 'boolean') {
      this.currentValue = Boolean(this.fieldSchema.default ?? false);
    }
  }

  render(ctx: WidgetRenderContext): number {
    const { ctx: canvas, x, y, width, hovered } = ctx;

    const labelWidth = width * 0.7;
    const boxSize = 16;
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

    // Draw checkbox box
    const boxX = x + labelWidth + 5;
    const boxY = y + (height - boxSize) / 2;

    CanvasUtils.drawBox(
      canvas,
      boxX,
      boxY,
      boxSize,
      boxSize,
      hovered ? COLORS.boxBgHover : COLORS.boxBg,
      hovered ? COLORS.borderHover : COLORS.border
    );

    // Draw check if true
    if (this.currentValue === true) {
      // Draw checkmark
      canvas.strokeStyle = COLORS.check;
      canvas.lineWidth = 2;
      canvas.beginPath();
      canvas.moveTo(boxX + 3, boxY + boxSize / 2);
      canvas.lineTo(boxX + boxSize / 2 - 1, boxY + boxSize - 4);
      canvas.lineTo(boxX + boxSize - 3, boxY + 4);
      canvas.stroke();
    }

    return height;
  }

  handleEvent(event: WidgetEvent): unknown | undefined {
    if (event.type === 'click') {
      // Toggle value
      const newValue = !this.currentValue;
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
    this.currentValue = Boolean(value);
  }
}
