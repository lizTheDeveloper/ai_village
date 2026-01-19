/**
 * DevRenderer - Auto-generates dev UI from component schemas
 *
 * Renders component fields to canvas based on schema metadata.
 * Handles grouping, ordering, and widget creation.
 */

import type { ComponentSchema, Component } from '../types/ComponentSchema.js';
import type { FieldSchema } from '../types/FieldSchema.js';
import { createWidget, type Widget, type WidgetRenderContext } from './widgets/index.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';

/**
 * Field with widget instance
 */
interface FieldWidget {
  fieldName: string;
  fieldSchema: FieldSchema;
  widget: Widget;
  group: string;
  order: number;
}

/**
 * Rendering options
 */
export interface DevRenderOptions {
  /** Whether to show group headers */
  showGroups?: boolean;
  /** Spacing between fields */
  fieldSpacing?: number;
  /** Spacing between groups */
  groupSpacing?: number;
}

/**
 * DevRenderer class
 */
export class DevRenderer {
  private widgets: Map<string, FieldWidget[]> = new Map();
  private focusedWidget: { componentType: string; fieldName: string } | null = null;

  constructor(
    private options: DevRenderOptions = {}
  ) {
    this.options = {
      showGroups: true,
      fieldSpacing: 4,
      groupSpacing: 12,
      ...options,
    };
  }

  /**
   * Initialize widgets for a component
   */
  initializeComponent<T extends Component>(
    componentType: string,
    componentData: T,
    onFieldChange: (fieldName: string, newValue: unknown) => void
  ): void {
    const schema = ComponentRegistry.get(componentType);
    if (!schema) {
      console.warn(`No schema found for component: ${componentType}`);
      return;
    }

    const fieldWidgets: FieldWidget[] = [];

    // Create widgets for all dev-visible fields
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      // Skip if not visible in dev panel
      const isVisible = fieldSchema.visibility.dev ?? true;
      if (!isVisible) continue;

      // Get current value from component data
      const currentValue = (componentData as Record<string, unknown>)[fieldName];

      // Create widget
      const widget = createWidget(
        fieldName,
        fieldSchema,
        currentValue,
        (newValue) => onFieldChange(fieldName, newValue)
      );

      fieldWidgets.push({
        fieldName,
        fieldSchema,
        widget,
        group: fieldSchema.ui?.group || 'default',
        order: fieldSchema.ui?.order ?? 999,
      });
    }

    // Sort by group, then order
    fieldWidgets.sort((a, b) => {
      if (a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }
      return a.order - b.order;
    });

    this.widgets.set(componentType, fieldWidgets);
  }

  /**
   * Render a component's fields
   */
  render(
    ctx: CanvasRenderingContext2D,
    componentType: string,
    x: number,
    y: number,
    width: number
  ): number {
    const fieldWidgets = this.widgets.get(componentType);
    if (!fieldWidgets || fieldWidgets.length === 0) {
      return 0;
    }

    let currentY = y;
    let currentGroup: string | null = null;

    for (const fieldWidget of fieldWidgets) {
      // Draw group header if changed
      if (this.options.showGroups && fieldWidget.group !== currentGroup) {
        if (currentGroup !== null) {
          currentY += this.options.groupSpacing!;
        }

        // Draw group header
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#FFAA00';
        ctx.fillText(fieldWidget.group.toUpperCase(), x, currentY + 12);
        currentY += 20;

        currentGroup = fieldWidget.group;
      }

      // Determine if this widget is focused/hovered
      const isFocused =
        this.focusedWidget?.componentType === componentType &&
        this.focusedWidget?.fieldName === fieldWidget.fieldName;

      // Render widget
      const widgetContext: WidgetRenderContext = {
        ctx,
        x,
        y: currentY,
        width,
        height: 24, // Standard height
        focused: isFocused,
        hovered: false, // TODO: Implement hover detection
      };

      const heightConsumed = fieldWidget.widget.render(widgetContext);
      currentY += heightConsumed + this.options.fieldSpacing!;
    }

    return currentY - y;
  }

  /**
   * Update a component's data (refresh widget values)
   */
  updateComponent<T extends Component>(componentType: string, componentData: T): void {
    const fieldWidgets = this.widgets.get(componentType);
    if (!fieldWidgets) return;

    for (const fieldWidget of fieldWidgets) {
      const currentValue = (componentData as Record<string, unknown>)[fieldWidget.fieldName];
      fieldWidget.widget.setValue(currentValue);
    }
  }

  /**
   * Handle click event
   */
  handleClick(
    componentType: string,
    x: number,
    y: number,
    componentX: number,
    componentY: number,
    componentWidth: number
  ): boolean {
    const fieldWidgets = this.widgets.get(componentType);
    if (!fieldWidgets) return false;

    let currentY = componentY;
    let currentGroup: string | null = null;

    for (const fieldWidget of fieldWidgets) {
      // Account for group headers
      if (this.options.showGroups && fieldWidget.group !== currentGroup) {
        if (currentGroup !== null) {
          currentY += this.options.groupSpacing!;
        }
        currentY += 20; // Group header height
        currentGroup = fieldWidget.group;
      }

      const widgetHeight = 24; // Standard height

      // Check if click is within this widget
      if (y >= currentY && y < currentY + widgetHeight) {
        // Set focus
        this.focusedWidget = { componentType, fieldName: fieldWidget.fieldName };

        // Handle widget click
        if (fieldWidget.widget.handleEvent) {
          const relativeX = x - componentX;
          fieldWidget.widget.handleEvent({
            type: 'click',
            x: relativeX,
            y: y - currentY,
          });
        }

        return true;
      }

      currentY += widgetHeight + this.options.fieldSpacing!;
    }

    return false;
  }

  /**
   * Clear all widgets
   */
  clear(): void {
    this.widgets.clear();
    this.focusedWidget = null;
  }

  /**
   * Get all registered component types
   */
  getComponentTypes(): string[] {
    return Array.from(this.widgets.keys());
  }
}
