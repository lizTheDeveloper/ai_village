/**
 * Generic component serializer - handles most components via JSON serialization
 */

import type { Component } from '@ai-village/core';
import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';

/**
 * Generic serializer for components that don't need custom logic.
 * Just JSON serializes/deserializes the entire component.
 */
export class GenericComponentSerializer extends BaseComponentSerializer<Component> {
  constructor(componentType: string, currentVersion: number = 1) {
    super(componentType, currentVersion);
  }

  protected serializeData(component: Component): unknown {
    // Deep clone and remove the 'type' field (already in parent)
    const { type, ...data } = component;
    return data;
  }

  protected deserializeData(data: unknown): Component {
    if (typeof data !== 'object' || data === null) {
      throw new Error(`Invalid component data for ${this.componentType}`);
    }

    return {
      type: this.componentType,
      ...(data as Record<string, unknown>),
    } as Component;
  }

  validate(data: unknown): data is Component {
    // Minimal validation - just check it's an object
    if (typeof data !== 'object' || data === null) {
      throw new Error(`${this.componentType} data must be object`);
    }

    return true;
  }
}

/**
 * Factory to create generic serializers for all component types.
 */
export function createGenericSerializer(
  componentType: string,
  version: number = 1
): GenericComponentSerializer {
  return new GenericComponentSerializer(componentType, version);
}
