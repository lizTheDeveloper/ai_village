/**
 * ReadonlyWidget - Display-only widget for non-editable fields
 */

import type { Widget, WidgetRenderContext } from './types.js';
import { CanvasUtils } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';

const COLORS = {
  label: '#AAAAAA',
  value: '#FFFFFF',
  background: 'rgba(30, 30, 40, 0.8)',
};

export class ReadonlyWidget implements Widget {
  constructor(
    private fieldName: string,
    private fieldSchema: FieldSchema,
    private currentValue: unknown
  ) {}

  render(ctx: WidgetRenderContext): number {
    const { ctx: canvas, x, y, width } = ctx;

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

    // Draw value background
    CanvasUtils.drawBox(
      canvas,
      x + labelWidth + 5,
      y + 2,
      valueWidth - 5,
      height - 4,
      COLORS.background,
      '#555555'
    );

    // Draw value
    const valueStr = this.formatValue(this.currentValue);
    CanvasUtils.drawText(
      canvas,
      valueStr,
      x + labelWidth + 10,
      y + height / 2,
      valueWidth - 15,
      COLORS.value
    );

    return height;
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    this.currentValue = value;
  }

  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }
}
