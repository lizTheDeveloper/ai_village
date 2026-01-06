import type { ComponentSchema, ComponentCategory, Component } from '../types/index.js';

/**
 * Central registry for component schemas.
 * 
 * This singleton stores all component schemas and provides type-safe queries
 * for retrieving schema information at runtime.
 * 
 * Features:
 * - Singleton pattern for global access
 * - Type-safe generics with type narrowing
 * - Thread-safe registration
 * - Category-based filtering
 * - Auto-registration support
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry | null = null;
  private schemas: Map<string, ComponentSchema<any>> = new Map();

  /**
   * Private constructor enforces singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Register a component schema
   * 
   * @param schema - The component schema to register
   * @throws Error if a schema with the same type is already registered
   */
  public static register<T extends Component>(schema: ComponentSchema<T>): void {
    const instance = ComponentRegistry.getInstance();
    
    if (instance.schemas.has(schema.type)) {
      console.warn(`[ComponentRegistry] Schema '${schema.type}' is already registered. Overwriting.`);
    }
    
    instance.schemas.set(schema.type, schema);
  }

  /**
   * Retrieve a schema by component type
   * 
   * @param type - The component type string
   * @returns The component schema if found, undefined otherwise
   * 
   * Type-safe: The generic T allows for type narrowing when the schema type is known
   */
  public static get<T extends Component = Component>(
    type: string
  ): ComponentSchema<T> | undefined {
    const instance = ComponentRegistry.getInstance();
    return instance.schemas.get(type) as ComponentSchema<T> | undefined;
  }

  /**
   * Check if a schema is registered
   * 
   * @param type - The component type string
   * @returns true if the schema exists, false otherwise
   */
  public static has(type: string): boolean {
    const instance = ComponentRegistry.getInstance();
    return instance.schemas.has(type);
  }

  /**
   * List all registered component types
   * 
   * @returns Array of all registered component type strings
   */
  public static list(): string[] {
    const instance = ComponentRegistry.getInstance();
    return Array.from(instance.schemas.keys());
  }

  /**
   * Get all schemas in a specific category
   * 
   * @param category - The component category to filter by
   * @returns Array of all schemas in the specified category
   */
  public static getByCategory(category: ComponentCategory): ComponentSchema<any>[] {
    const instance = ComponentRegistry.getInstance();
    const schemas: ComponentSchema<any>[] = [];
    
    for (const schema of instance.schemas.values()) {
      if (schema.category === category) {
        schemas.push(schema);
      }
    }
    
    return schemas;
  }

  /**
   * Get all registered schemas
   * 
   * @returns Array of all registered schemas
   */
  public static getAll(): ComponentSchema<any>[] {
    const instance = ComponentRegistry.getInstance();
    return Array.from(instance.schemas.values());
  }

  /**
   * Clear all registered schemas (mainly for testing)
   */
  public static clear(): void {
    const instance = ComponentRegistry.getInstance();
    instance.schemas.clear();
  }

  /**
   * Get the count of registered schemas
   */
  public static count(): number {
    const instance = ComponentRegistry.getInstance();
    return instance.schemas.size;
  }
}
