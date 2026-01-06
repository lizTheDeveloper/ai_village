/**
 * WidgetFactory - Creates appropriate widget based on field schema
 */

import type { Widget, WidgetFactory as WidgetFactoryType } from './types.js';
import type { FieldSchema } from '../../types/FieldSchema.js';
import { TextWidget } from './TextWidget.js';
import { SliderWidget } from './SliderWidget.js';
import { DropdownWidget } from './DropdownWidget.js';
import { CheckboxWidget } from './CheckboxWidget.js';
import { JsonWidget } from './JsonWidget.js';
import { ReadonlyWidget } from './ReadonlyWidget.js';

/**
 * Create a widget based on field schema
 */
export const createWidget: WidgetFactoryType = (
  fieldName: string,
  fieldSchema: FieldSchema,
  currentValue: unknown,
  onChange: (newValue: unknown) => void
): Widget => {
  // Check if field is mutable (default: false)
  const isMutable = fieldSchema.mutable ?? false;

  // Determine widget type from UI hints or infer from field type
  const widgetType = fieldSchema.ui?.widget;

  // If not mutable or marked readonly, use readonly widget
  if (!isMutable || widgetType === 'readonly') {
    return new ReadonlyWidget(fieldName, fieldSchema, currentValue);
  }

  // Explicit widget type
  if (widgetType) {
    switch (widgetType) {
      case 'text':
      case 'textarea':
        return new TextWidget(fieldName, fieldSchema, currentValue, onChange);

      case 'slider':
        return new SliderWidget(fieldName, fieldSchema, currentValue, onChange);

      case 'dropdown':
        return new DropdownWidget(fieldName, fieldSchema, currentValue, onChange);

      case 'checkbox':
        return new CheckboxWidget(fieldName, fieldSchema, currentValue, onChange);

      case 'json':
        return new JsonWidget(fieldName, fieldSchema, currentValue);

      case 'number':
        // Number widget - use slider if range is specified, otherwise text
        if (fieldSchema.range) {
          return new SliderWidget(fieldName, fieldSchema, currentValue, onChange);
        }
        return new TextWidget(fieldName, fieldSchema, currentValue, onChange);

      case 'custom':
        // Custom widgets not yet supported - fall through to readonly
        console.warn(`Custom widget requested for ${fieldName}, using readonly`);
        return new ReadonlyWidget(fieldName, fieldSchema, currentValue);

      case 'color':
        // Color picker not yet implemented - use text
        console.warn(`Color widget requested for ${fieldName}, using text`);
        return new TextWidget(fieldName, fieldSchema, currentValue, onChange);

      default:
        console.warn(`Unknown widget type: ${widgetType}, using readonly`);
        return new ReadonlyWidget(fieldName, fieldSchema, currentValue);
    }
  }

  // Infer widget from field type
  switch (fieldSchema.type) {
    case 'string':
      return new TextWidget(fieldName, fieldSchema, currentValue, onChange);

    case 'number':
      if (fieldSchema.range) {
        return new SliderWidget(fieldName, fieldSchema, currentValue, onChange);
      }
      return new TextWidget(fieldName, fieldSchema, currentValue, onChange);

    case 'boolean':
      return new CheckboxWidget(fieldName, fieldSchema, currentValue, onChange);

    case 'enum':
      return new DropdownWidget(fieldName, fieldSchema, currentValue, onChange);

    case 'array':
    case 'map':
    case 'object':
      return new JsonWidget(fieldName, fieldSchema, currentValue);

    case 'entityId':
    case 'entityIdArray':
      // Entity IDs shown as readonly for now
      return new ReadonlyWidget(fieldName, fieldSchema, currentValue);

    default:
      console.warn(`Unknown field type: ${fieldSchema.type}, using readonly`);
      return new ReadonlyWidget(fieldName, fieldSchema, currentValue);
  }
};
