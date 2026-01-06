/**
 * UI widget type definitions for field rendering
 *
 * These widget types determine how a field is displayed and edited in the UI.
 */

/**
 * UI widget types for rendering and editing fields
 */
export type WidgetType =
  | 'text'      // Text input (single line)
  | 'textarea'  // Multi-line text input
  | 'number'    // Number input with optional range
  | 'slider'    // Range slider (requires range constraint)
  | 'dropdown'  // Select from enum/options
  | 'checkbox'  // Boolean toggle
  | 'color'     // Color picker (hex string)
  | 'readonly'  // Display only (no editing)
  | 'json'      // JSON editor for complex objects
  | 'custom';   // Use custom renderer from schema
