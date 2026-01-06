/**
 * DOM-based player renderer
 *
 * Renders component data to DOM elements for modal panels and detailed views.
 */

import type { Component, ComponentSchema, FieldSchema } from '../types/index.js';
import type { PlayerRenderer, RenderContext, RenderResult } from './PlayerRenderer.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';

/**
 * DOM renderer for player UI
 *
 * Auto-generates DOM UI from component schemas, rendering only player-visible fields.
 */
export class PlayerDOMRenderer implements PlayerRenderer {
  /**
   * Render a single component to DOM
   */
  public renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context: RenderContext
  ): RenderResult {
    const { container, showLabels = true, showIcons = true, compact = false } = context;

    if (!container) {
      return { success: false, error: 'DOM container not provided' };
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

    // Create component container
    const componentDiv = document.createElement('div');
    componentDiv.className = `player-component ${compact ? 'compact' : ''}`;

    // Add component title if not compact
    if (!compact && schema.ui?.title) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'player-component-title';
      if (schema.ui.icon) {
        titleDiv.innerHTML = `<span class="icon">${schema.ui.icon}</span> `;
      }
      titleDiv.innerHTML += schema.ui.title;
      if (schema.ui.color) {
        titleDiv.style.color = schema.ui.color;
      }
      componentDiv.appendChild(titleDiv);
    }

    // Create fields container
    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'player-fields';

    // Group fields by ui.group
    const groupedFields = new Map<string, [string, FieldSchema][]>();
    for (const entry of visibleFields) {
      const [_, field] = entry;
      const group = field.ui?.group || 'default';
      if (!groupedFields.has(group)) {
        groupedFields.set(group, []);
      }
      groupedFields.get(group)!.push(entry);
    }

    // Render each group
    for (const [groupName, fields] of groupedFields) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'player-field-group';
      groupDiv.dataset.group = groupName;

      // Add group label if not default
      if (groupName !== 'default' && !compact) {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'player-field-group-label';
        groupLabel.textContent = this.formatFieldName(groupName);
        groupDiv.appendChild(groupLabel);
      }

      // Render each field in group
      for (const [fieldName, field] of fields) {
        const value = (component as any)[fieldName];
        const fieldElement = this.createFieldElement(fieldName, field, value, {
          showLabels,
          showIcons,
          compact,
        });
        groupDiv.appendChild(fieldElement);
      }

      fieldsDiv.appendChild(groupDiv);
    }

    componentDiv.appendChild(fieldsDiv);
    container.appendChild(componentDiv);

    return { success: true, heightUsed: componentDiv.offsetHeight };
  }

  /**
   * Render using custom renderer from schema
   */
  private renderCustom<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context: RenderContext
  ): RenderResult {
    const { container } = context;

    if (!container) {
      return { success: false, error: 'DOM container not provided' };
    }

    try {
      const result = schema.renderers!.player!(component);

      if (typeof result === 'string') {
        // Render string to DOM
        const div = document.createElement('div');
        div.className = 'player-component-custom';
        div.textContent = result;
        if (schema.ui?.color) {
          div.style.color = schema.ui.color;
        }
        container.appendChild(div);
        return { success: true, heightUsed: div.offsetHeight };
      } else {
        // CanvasRenderable - create canvas and render
        const canvas = document.createElement('canvas');
        canvas.width = context.width;
        canvas.height = context.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          result.draw(ctx, 0, 0);
        }
        container.appendChild(canvas);
        return { success: true, heightUsed: canvas.offsetHeight };
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
    const { container } = context;

    if (!container) {
      return { success: false, error: 'DOM container not provided' };
    }

    const schemas = ComponentRegistry.getAll();
    let totalHeight = 0;

    for (const schema of schemas) {
      const component = entity.getComponent(schema.type);
      if (!component) continue;

      // Check if component has any player-visible fields
      const hasPlayerFields = Object.values(schema.fields).some(
        (field) => field.visibility?.player === true
      );

      if (!hasPlayerFields) continue;

      const result = this.renderComponent(component, schema, context);

      if (result.success && result.heightUsed) {
        totalHeight += result.heightUsed;
      }
    }

    return { success: true, heightUsed: totalHeight };
  }

  /**
   * Clear all rendered content from container
   */
  public clear(): void {
    // No-op: Clearing is done by the caller removing child elements
  }

  /**
   * Create a DOM element for a field
   */
  private createFieldElement(
    fieldName: string,
    field: FieldSchema,
    value: unknown,
    options: { showLabels: boolean; showIcons: boolean; compact: boolean }
  ): HTMLElement {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'player-field';

    // Add icon if present and enabled
    if (options.showIcons && field.ui?.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'player-field-icon';
      iconSpan.textContent = field.ui.icon;
      if (field.ui.color) {
        iconSpan.style.color = field.ui.color;
      }
      fieldDiv.appendChild(iconSpan);
    }

    // Add label if enabled
    if (options.showLabels) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'player-field-label';
      labelSpan.textContent = (field.displayName || this.formatFieldName(fieldName)) + ':';
      fieldDiv.appendChild(labelSpan);
    }

    // Add value
    const valueSpan = document.createElement('span');
    valueSpan.className = 'player-field-value';
    valueSpan.textContent = this.formatValue(value, field);
    if (field.ui?.color) {
      valueSpan.style.color = field.ui.color;
    }
    fieldDiv.appendChild(valueSpan);

    return fieldDiv;
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
        // Truncate long strings (DOM can handle longer than canvas)
        return str.length > 50 ? str.substring(0, 47) + '...' : str;

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
        return `[${ids.length} references]`;

      case 'object':
        return '[Object]';

      default:
        return String(value);
    }
  }
}
