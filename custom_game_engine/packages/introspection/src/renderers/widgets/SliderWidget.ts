/**
 * SliderWidget - Range slider for numeric fields with range constraints
 */

import type { Widget, WidgetRenderContext, WidgetEvent } from './types.js';
import { CanvasUtils } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';

const COLORS = {
  label: '#AAAAAA',
  value: '#FFFFFF',
  track: 'rgba(50, 50, 60, 0.8)',
  trackFill: '#4CAF50',
  thumb: '#66FF66',
  thumbHover: '#88FF88',
};

export class SliderWidget implements Widget {
  private isDragging = false;

  constructor(
    private fieldName: string,
    private fieldSchema: FieldSchema,
    private currentValue: unknown,
    private onChange: (newValue: unknown) => void
  ) {
    // Ensure value is a number
    if (typeof currentValue !== 'number') {
      this.currentValue = this.fieldSchema.default ?? 0;
    }
  }

  render(ctx: WidgetRenderContext): number {
    const { ctx: canvas, x, y, width, hovered } = ctx;

    const labelWidth = width * 0.3;
    const sliderWidth = width * 0.5;
    const valueWidth = width * 0.2;
    const height = 24;

    const [min, max] = this.fieldSchema.range || [0, 100];
    const value = Number(this.currentValue);

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

    // Draw slider track
    const trackX = x + labelWidth + 5;
    const trackY = y + height / 2 - 2;
    const trackHeight = 4;

    CanvasUtils.drawBox(
      canvas,
      trackX,
      trackY,
      sliderWidth,
      trackHeight,
      COLORS.track
    );

    // Draw filled portion
    const normalizedValue = (value - min) / (max - min);
    const fillWidth = sliderWidth * Math.max(0, Math.min(1, normalizedValue));

    CanvasUtils.drawBox(
      canvas,
      trackX,
      trackY,
      fillWidth,
      trackHeight,
      COLORS.trackFill
    );

    // Draw thumb
    const thumbX = trackX + fillWidth;
    const thumbY = y + height / 2;
    const thumbRadius = 6;

    canvas.fillStyle = hovered || this.isDragging ? COLORS.thumbHover : COLORS.thumb;
    canvas.beginPath();
    canvas.arc(thumbX, thumbY, thumbRadius, 0, Math.PI * 2);
    canvas.fill();

    // Draw value
    canvas.font = '11px monospace';
    const valueStr = value.toFixed(2);
    CanvasUtils.drawText(
      canvas,
      valueStr,
      x + labelWidth + sliderWidth + 10,
      y + height / 2,
      valueWidth,
      COLORS.value
    );

    return height;
  }

  handleEvent(event: WidgetEvent): unknown | undefined {
    const [min, max] = this.fieldSchema.range || [0, 100];

    if (event.type === 'click' && event.x !== undefined) {
      // Calculate new value from click position
      // Assume event.x is relative to the slider track start
      const trackWidth = 0.5; // Proportion of total width
      const normalizedX = Math.max(0, Math.min(1, event.x / trackWidth));
      const newValue = min + normalizedX * (max - min);

      this.currentValue = newValue;
      this.onChange(newValue);
      return newValue;
    }

    // Note: Dragging would require additional state management
    // For now, we support click-to-set

    return undefined;
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    if (typeof value === 'number') {
      const [min, max] = this.fieldSchema.range || [0, 100];
      this.currentValue = Math.max(min, Math.min(max, value));
    }
  }
}
