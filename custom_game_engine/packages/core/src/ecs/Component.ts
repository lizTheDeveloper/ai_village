import type { ComponentType } from '../types.js';

/**
 * Base interface for all components.
 * Components are pure data - no methods, no logic.
 */
export interface Component {
  /** Identifies the component type */
  readonly type: ComponentType;

  /** Schema version for migrations */
  readonly version: number;
}

/**
 * Schema definition for a component type.
 */
export interface ComponentSchema<T extends Component = Component> {
  readonly type: ComponentType;
  readonly version: number;
  readonly fields: ReadonlyArray<FieldSchema>;

  /** Validate that data conforms to schema */
  validate(data: unknown): data is T;

  /** Create instance with all defaults */
  createDefault(): T;

  /** Migrate from previous version */
  migrateFrom?(data: unknown, fromVersion: number): T;
}

export interface FieldSchema {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'entityId'
  | 'entityIdArray'
  | 'stringArray'
  | 'numberArray'
  | 'object'
  | 'map';
