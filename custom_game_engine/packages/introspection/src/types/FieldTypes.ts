/**
 * Primitive field types supported by the introspection system
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'map'
  | 'enum'
  | 'object'
  | 'entityId'
  | 'entityIdArray';

/**
 * Widget types for UI rendering
 */
export type WidgetType =
  | 'text'       // Text input
  | 'textarea'   // Multi-line text
  | 'number'     // Number input with optional range
  | 'slider'     // Range slider
  | 'dropdown'   // Select from options
  | 'checkbox'   // Boolean toggle
  | 'color'      // Color picker
  | 'readonly'   // Display only
  | 'json'       // JSON editor for complex objects
  | 'custom';    // Use custom renderer

/**
 * Component categories for logical grouping
 */
export type ComponentCategory =
  | 'core'        // identity, position, sprite
  | 'agent'       // personality, skills, needs
  | 'physical'    // health, inventory, equipment
  | 'social'      // relationships, reputation
  | 'cognitive'   // memory, goals, beliefs
  | 'magic'       // mana, spells, paradigms
  | 'world'       // time, weather, terrain
  | 'system';     // internal, debug

/**
 * Consumer visibility flags
 */
export interface Visibility {
  /** Show in player UI */
  player?: boolean;

  /** Include in LLM context */
  llm?: boolean | 'summarized';

  /** Include in agent self-awareness */
  agent?: boolean;

  /** Show in user settings */
  user?: boolean;

  /** Show in dev panel (default: true) */
  dev?: boolean;
}

/**
 * UI hints for field rendering
 */
export interface UIHints {
  /** Widget type to use */
  widget: WidgetType;

  /** Visual grouping */
  group?: string;

  /** Display order within group */
  order?: number;

  /** Icon identifier */
  icon?: string;

  /** Color for visual emphasis */
  color?: string;

  /** Minimum value (for slider/number widgets) */
  min?: number;

  /** Maximum value (for slider/number widgets) */
  max?: number;

  /** Step value (for slider/number widgets) */
  step?: number;
}

/**
 * LLM-specific configuration
 */
export interface LLMConfig {
  /** Which prompt section to include in */
  promptSection?: string;

  /** Custom summarization function */
  summarize?: (data: any) => string;

  /** Priority for ordering in prompt */
  priority?: number;
}

/**
 * UI-specific configuration
 */
export interface UIConfig {
  /** Icon for component */
  icon?: string;

  /** Color for component */
  color?: string;

  /** Priority for ordering in UI */
  priority?: number;
}

/**
 * Dev-specific configuration
 */
export interface DevConfig {
  /** Show in dev panel */
  visible?: boolean;

  /** Custom dev renderer */
  renderer?: (data: any) => HTMLElement;
}
