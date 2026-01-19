/**
 * Canvas-based player renderer
 *
 * Renders component data to HTML5 canvas for game overlays, tooltips, and HUD elements.
 */

import type { Component, ComponentSchema, FieldSchema } from '../types/index.js';
import type { PlayerRenderer, RenderContext, RenderResult } from './PlayerRenderer.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';

/**
 * Canvas renderer for player UI
 *
 * Auto-generates canvas UI from component schemas, rendering only player-visible fields.
 */
export class PlayerCanvasRenderer implements PlayerRenderer {
  private defaultFontSize = 12;
  private compactFontSize = 10;
  private lineHeight = 16;
  private compactLineHeight = 14;
  private labelColor = '#FFFFFF';
  private valueColor = '#AAAAAA';
  private iconSize = 14;

  /**
   * Render a single component to canvas
   */
  public renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context: RenderContext
  ): RenderResult {
    const { ctx, x, y, showLabels = true, showIcons = true, compact = false } = context;

    if (!ctx) {
      return { success: false, error: 'Canvas context not provided' };
    }

    // Use custom renderer if provided
    if (schema.renderers?.player) {
      return this.renderCustom(component, schema, context);
    }

    // Filter to player-visible fields only
    const visibleFields = Object.entries(schema.fields).filter(
      ([_, field]) => field.visibility?.player === true
    );

    if (visibleFields.length === 0) {
      return { success: true, heightUsed: 0 };
    }

    // Sort by order if specified
    visibleFields.sort(([_a, fieldA], [_b, fieldB]) => {
      const orderA = fieldA.ui?.order ?? 999;
      const orderB = fieldB.ui?.order ?? 999;
      return orderA - orderB;
    });

    const fontSize = compact ? this.compactFontSize : this.defaultFontSize;
    const lineHeight = compact ? this.compactLineHeight : this.lineHeight;

    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    let currentY = y;

    // Render component title if not compact
    if (!compact && schema.ui?.title) {
      ctx.fillStyle = schema.ui?.color || this.labelColor;
      ctx.font = `bold ${fontSize + 2}px monospace`;
      ctx.fillText(schema.ui.title, x, currentY);
      currentY += lineHeight + 4;
      ctx.font = `${fontSize}px monospace`;
    }

    // Render each field
    for (const [fieldName, field] of visibleFields) {
      const value = (component as Record<string, unknown>)[fieldName];

      // Render icon if present and enabled
      let offsetX = x;
      if (showIcons && field.ui?.icon) {
        ctx.fillStyle = field.ui.color || this.labelColor;
        ctx.font = `${this.iconSize}px monospace`;
        ctx.fillText(field.ui.icon, offsetX, currentY);
        offsetX += this.iconSize + 4;
        ctx.font = `${fontSize}px monospace`;
      }

      // Render label if enabled
      if (showLabels) {
        const label = field.displayName || this.formatFieldName(fieldName);
        ctx.fillStyle = field.ui?.color || this.labelColor;
        ctx.fillText(label + ':', offsetX, currentY);
        offsetX += ctx.measureText(label + ': ').width;
      }

      // Render value
      const formattedValue = this.formatValue(value, field);
      ctx.fillStyle = this.valueColor;
      ctx.fillText(formattedValue, offsetX, currentY);

      currentY += lineHeight;
    }

    ctx.restore();

    return { success: true, heightUsed: currentY - y };
  }

  /**
   * Render using custom renderer from schema
   */
  private renderCustom<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context: RenderContext
  ): RenderResult {
    const { ctx, x, y } = context;

    if (!ctx) {
      return { success: false, error: 'Canvas context not provided' };
    }

    try {
      const result = schema.renderers!.player!(component);

      if (typeof result === 'string') {
        // Render string to canvas
        ctx.save();
        ctx.font = `${this.defaultFontSize}px monospace`;
        ctx.fillStyle = schema.ui?.color || this.labelColor;
        ctx.textBaseline = 'top';
        ctx.fillText(result, x, y);
        ctx.restore();
        return { success: true, heightUsed: this.lineHeight };
      } else {
        // CanvasRenderable with draw method
        result.draw(ctx, x, y);
        return { success: true, heightUsed: this.lineHeight };
      }
    } catch (error) {
      return {
        success: false,
        error: `Custom renderer failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Render all player-visible components for an entity
   */
  public renderEntity(
    entity: { getComponent(type: string): Component | null; id: string },
    context: RenderContext
  ): RenderResult {
    const { ctx, x, y, compact = false } = context;

    if (!ctx) {
      return { success: false, error: 'Canvas context not provided' };
    }

    const schemas = ComponentRegistry.getAll();
    let currentY = y;

    for (const schema of schemas) {
      const component = entity.getComponent(schema.type);
      if (!component) continue;

      // Check if component has any player-visible fields
      const hasPlayerFields = Object.values(schema.fields).some(
        (field) => field.visibility?.player === true
      );

      if (!hasPlayerFields) continue;

      const result = this.renderComponent(component, schema, {
        ...context,
        y: currentY,
      });

      if (result.success && result.heightUsed) {
        currentY += result.heightUsed + (compact ? 4 : 8);
      }
    }

    return { success: true, heightUsed: currentY - y };
  }

  /**
   * Clear canvas (no-op for canvas renderer - caller manages clear)
   */
  public clear(): void {
    // No-op: Canvas clearing is managed by the caller
  }

  /**
   * Format a field name for display (camelCase -> Title Case)
   */
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format a field value for display
   */
  private formatValue(value: unknown, field: FieldSchema): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    switch (field.type) {
      case 'boolean':
        return value ? '✓' : '✗';

      case 'number':
        // Check if it's a percentage (range 0-1)
        if (field.range && field.range[0] === 0 && field.range[1] === 1) {
          return `${Math.round((value as number) * 100)}%`;
        }
        // Round to 2 decimal places if fractional
        const num = value as number;
        return num % 1 === 0 ? String(num) : num.toFixed(2);

      case 'string':
        const str = value as string;
        // Truncate long strings
        return str.length > 30 ? str.substring(0, 27) + '...' : str;

      case 'array':
        const arr = value as unknown[];
        return `[${arr.length} items]`;

      case 'map':
        const map = value as Map<unknown, unknown>;
        return `{${map.size} entries}`;

      case 'enum':
        // Capitalize first letter
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);

      case 'entityId':
        // Show shortened entity ID
        const id = value as string;
        return id.length > 12 ? id.substring(0, 8) + '...' : id;

      case 'entityIdArray':
        const ids = value as string[];
        return `[${ids.length} refs]`;

      case 'object':
        return '[Object]';

      default:
        return String(value);
    }
  }
}
