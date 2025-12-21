import type { ComponentType } from '../types.js';
import type { Component, ComponentSchema } from './Component.js';

/**
 * Registry for component schemas.
 * Central place for component type management.
 */
export interface IComponentRegistry {
  /** Register a new component schema */
  register<T extends Component>(schema: ComponentSchema<T>): void;

  /** Get schema for a component type */
  getSchema<T extends Component>(type: ComponentType): ComponentSchema<T> | undefined;

  /** Check if component type is registered */
  has(type: ComponentType): boolean;

  /** Create component with default values */
  createDefault<T extends Component>(type: ComponentType): T;

  /** Migrate component data from old version */
  migrate<T extends Component>(
    type: ComponentType,
    data: unknown,
    fromVersion: number
  ): T;

  /** Get all registered component types */
  getTypes(): ReadonlyArray<ComponentType>;
}

/**
 * Implementation of ComponentRegistry.
 */
export class ComponentRegistry implements IComponentRegistry {
  private schemas = new Map<ComponentType, ComponentSchema>();

  register<T extends Component>(schema: ComponentSchema<T>): void {
    if (this.schemas.has(schema.type)) {
      throw new Error(`Component type "${schema.type}" is already registered`);
    }
    this.schemas.set(schema.type, schema);
  }

  getSchema<T extends Component>(type: ComponentType): ComponentSchema<T> | undefined {
    return this.schemas.get(type) as ComponentSchema<T> | undefined;
  }

  has(type: ComponentType): boolean {
    return this.schemas.has(type);
  }

  createDefault<T extends Component>(type: ComponentType): T {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`Component type "${type}" is not registered`);
    }
    return schema.createDefault() as T;
  }

  migrate<T extends Component>(
    type: ComponentType,
    data: unknown,
    fromVersion: number
  ): T {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`Component type "${type}" is not registered`);
    }

    if (!schema.migrateFrom) {
      throw new Error(
        `Component type "${type}" does not support migration from version ${fromVersion}`
      );
    }

    return schema.migrateFrom(data, fromVersion) as T;
  }

  getTypes(): ReadonlyArray<ComponentType> {
    return Array.from(this.schemas.keys());
  }
}
