/**
 * Core component schema interface
 * 
 * Defines the structure for component metadata used by the introspection system.
 */

import type { ComponentCategory } from './CategoryTypes.js';
import type { FieldSchema } from './FieldSchema.js';
import type { UIConfig } from './UIHints.js';
import type { LLMConfig } from './LLMConfig.js';

/**
 * Base component type
 * All components must have a type and version
 */
export interface Component {
  type: string;
  version: number;
}

/**
 * Developer-specific configuration (placeholder for future use)
 */
export interface DevConfig {
  [key: string]: unknown;
}

/**
 * Mutator function type for component mutations
 */
export type MutatorFunction<T> = (entity: any, ...args: any[]) => void;

/**
 * Renderable types for different consumers
 */
export type CanvasRenderable = {
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
};

/**
 * Main component schema interface
 * 
 * This is the central schema definition that powers the introspection system.
 * Defines metadata about components including fields, UI rendering, LLM prompts,
 * validation, and mutation.
 */
export interface ComponentSchema<T extends Component = Component> {
  /**
   * Component type identifier (must match component.type)
   */
  readonly type: string;

  /**
   * Schema version for migration support
   */
  readonly version: number;

  /**
   * Component category for grouping and filtering
   */
  readonly category: ComponentCategory;

  /**
   * Field definitions with full metadata
   */
  readonly fields: Record<string, FieldSchema>;

  /**
   * UI configuration (component-level)
   */
  readonly ui?: UIConfig;

  /**
   * LLM prompt configuration
   */
  readonly llm?: LLMConfig<T>;

  /**
   * Developer tools configuration
   */
  readonly dev?: DevConfig;

  /**
   * Custom renderers (optional overrides)
   */
  readonly renderers?: {
    /**
     * Player-facing renderer (in-game UI)
     */
    player?: (data: T) => string | CanvasRenderable;

    /**
     * Developer tools renderer
     */
    dev?: (data: T, mutate: any) => HTMLElement;

    /**
     * LLM prompt renderer
     */
    llm?: (data: T) => string;
  };

  /**
   * Mutation handlers for field updates
   * Keys correspond to mutateVia field values
   */
  readonly mutators?: Record<string, MutatorFunction<T>>;

  /**
   * Runtime validation function
   * 
   * @param data - Unknown data to validate
   * @returns Type predicate indicating if data is valid T
   */
  validate(data: unknown): data is T;

  /**
   * Create default instance of this component
   * 
   * @returns A valid instance with default values
   */
  createDefault(): T;
}

/**
 * Helper function for defining component schemas
 * 
 * Provides type inference and validation for schema definitions.
 * 
 * @param schema - The component schema definition
 * @returns The same schema with full type information
 * 
 * @example
 * ```typescript
 * export const IdentitySchema = defineComponent<IdentityComponent>({
 *   type: 'identity',
 *   version: 1,
 *   category: 'core',
 *   fields: {
 *     name: {
 *       type: 'string',
 *       required: true,
 *       description: 'Entity name',
 *       visibility: { player: true, llm: true, dev: true },
 *       ui: { widget: 'text' },
 *     },
 *   },
 *   validate: (data) => typeof data?.name === 'string',
 *   createDefault: () => ({ type: 'identity', version: 1, name: 'Unknown' }),
 * });
 * ```
 */
export function defineComponent<T extends Component>(
  schema: ComponentSchema<T>
): ComponentSchema<T> {
  return schema;
}
