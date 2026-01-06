import type { FieldType, Visibility, UIHints } from './FieldTypes.js';

/**
 * Complete schema definition for a single component field
 */
export interface FieldSchema {
  // Type information
  /** Type of the field */
  readonly type: FieldType;

  /** Item type for arrays and maps */
  readonly itemType?: FieldType;

  /** Enum values for enum fields */
  readonly enumValues?: readonly string[];

  // Constraints
  /** Whether field is required */
  readonly required: boolean;

  /** Default value if not provided */
  readonly default?: unknown;

  /** Min/max range for numbers */
  readonly range?: readonly [number, number];

  /** Maximum length for strings/arrays */
  readonly maxLength?: number;

  // Documentation
  /** Field description */
  readonly description: string;

  /** Display name (defaults to field key) */
  readonly displayName?: string;

  // Consumer visibility
  /** Which consumers can see this field */
  readonly visibility: Visibility;

  // UI hints
  /** UI rendering hints */
  readonly ui?: UIHints;

  // Mutation
  /** Whether field can be edited */
  readonly mutable?: boolean;

  /** Use this mutator instead of direct set */
  readonly mutateVia?: string;
}
