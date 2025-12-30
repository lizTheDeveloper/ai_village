/**
 * ComponentSerializerRegistry - Manages all component serializers
 */

import type { ComponentSerializer, VersionedComponent, MigrationContext } from './types.js';
import { SerializationError } from './types.js';
import { migrationRegistry } from './MigrationRegistry.js';

export class ComponentSerializerRegistry {
  private serializers: Map<string, ComponentSerializer<unknown>> = new Map();

  /**
   * Register a component serializer.
   */
  register<T>(componentType: string, serializer: ComponentSerializer<T>): void {
    if (this.serializers.has(componentType)) {
      throw new Error(`Serializer already registered for component: ${componentType}`);
    }

    this.serializers.set(componentType, serializer as ComponentSerializer<unknown>);
    console.log(`[ComponentSerializer] Registered serializer for: ${componentType}`);
  }

  /**
   * Get serializer for a component type.
   */
  get<T>(componentType: string): ComponentSerializer<T> | undefined {
    return this.serializers.get(componentType) as ComponentSerializer<T> | undefined;
  }

  /**
   * Serialize a component.
   */
  serialize<T>(component: T & { type: string }): VersionedComponent {
    const serializer = this.get(component.type);

    if (!serializer) {
      throw new SerializationError(
        `No serializer registered for component type: ${component.type}`,
        component.type,
        component
      );
    }

    return serializer.serialize(component);
  }

  /**
   * Deserialize a component.
   */
  deserialize<T>(
    data: VersionedComponent,
    context?: MigrationContext
  ): T {
    const serializer = this.get<T>(data.type);

    if (!serializer) {
      throw new SerializationError(
        `No serializer registered for component type: ${data.type}`,
        data.type,
        data
      );
    }

    return serializer.deserialize(data, context);
  }

  /**
   * Check if serializer exists for component type.
   */
  has(componentType: string): boolean {
    return this.serializers.has(componentType);
  }

  /**
   * Get all registered component types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.serializers.keys());
  }

  /**
   * Get statistics.
   */
  getStats(): {
    totalSerializers: number;
    componentTypes: string[];
  } {
    return {
      totalSerializers: this.serializers.size,
      componentTypes: this.getRegisteredTypes(),
    };
  }
}

/**
 * Base serializer implementation - provides common functionality.
 */
export abstract class BaseComponentSerializer<T extends { type: string }>
  implements ComponentSerializer<T> {

  constructor(
    protected readonly componentType: string,
    public readonly currentVersion: number
  ) {}

  /**
   * Serialize component to versioned format.
   */
  serialize(component: T): VersionedComponent {
    return {
      $schema: 'https://aivillage.dev/schemas/component/v1',
      $version: this.currentVersion,
      type: this.componentType,
      data: this.serializeData(component),
    };
  }

  /**
   * Deserialize from versioned format.
   */
  deserialize(
    data: VersionedComponent,
    context?: MigrationContext
  ): T {
    // Migrate if needed
    let current = data.data;

    if (data.$version < this.currentVersion) {
      current = migrationRegistry.migrate(
        this.componentType,
        current,
        data.$version,
        this.currentVersion,
        context
      );
    }

    // Validate
    if (!this.validate(current)) {
      throw new SerializationError(
        `Validation failed after migration`,
        this.componentType,
        current
      );
    }

    return this.deserializeData(current);
  }

  /**
   * Migrate data - delegates to migration registry.
   */
  migrate(
    from: number,
    data: unknown,
    context?: MigrationContext
  ): unknown {
    return migrationRegistry.migrate(
      this.componentType,
      data,
      from,
      this.currentVersion,
      context
    );
  }

  /**
   * Component-specific serialization logic.
   */
  protected abstract serializeData(component: T): unknown;

  /**
   * Component-specific deserialization logic.
   */
  protected abstract deserializeData(data: unknown): T;

  /**
   * Validate component data.
   */
  abstract validate(data: unknown): data is T;
}

// Global singleton instance
export const componentSerializerRegistry = new ComponentSerializerRegistry();
