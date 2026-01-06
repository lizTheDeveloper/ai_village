/**
 * LLM prompt generation configuration
 *
 * Controls how components and fields are included in LLM prompts.
 */

/**
 * LLM-specific configuration for prompt generation
 *
 * Controls how this component appears in AI prompts
 */
export interface LLMConfig<T = any> {
  /**
   * Prompt section identifier
   * Groups related components in the prompt
   * @example 'identity', 'stats', 'inventory', 'relationships'
   */
  promptSection: string;

  /**
   * Summarization function for this component
   * Returns a concise text representation for LLM context
   * If not provided, fields are listed individually
   *
   * @param data - The component data to summarize
   * @returns Human-readable summary text
   *
   * @example
   * ```typescript
   * summarize: (data) => `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`
   * // Output: "Alice (human, 25 years old)"
   * ```
   */
  summarize?: (data: T) => string;

  /**
   * Priority in prompt (lower = earlier in prompt)
   * Controls order of sections in the final prompt
   * @default 100
   */
  priority?: number;

  /**
   * Whether to include this component in agent self-awareness prompts
   * (separate from field-level visibility.agent)
   * @default false
   */
  includeInAgentPrompt?: boolean;

  /**
   * Maximum length for summarized output (characters)
   * Useful for components with variable-length data
   * @default Infinity
   */
  maxLength?: number;

  /**
   * Whether to include field names in the prompt
   * @default true
   */
  includeFieldNames?: boolean;

  /**
   * Custom format template for this component
   * Uses {fieldName} placeholders
   * @example "Name: {name}, Age: {age}, Species: {species}"
   */
  template?: string;
}

/**
 * Field-level LLM configuration
 *
 * Controls how individual fields appear in prompts
 */
export interface FieldLLMConfig {
  /**
   * Custom label for this field in prompts
   * Overrides the field name
   * @example "Health Points" instead of "health"
   */
  promptLabel?: string;

  /**
   * Custom formatter for this field's value
   * @example (val) => `${val}%` for percentages
   */
  format?: (value: any) => string;

  /**
   * Whether to always include this field even if it's the default value
   * @default false
   */
  alwaysInclude?: boolean;

  /**
   * Hide this field if it matches this condition
   * @example (val) => val === 0 // Hide if zero
   */
  hideIf?: (value: any) => boolean;
}
