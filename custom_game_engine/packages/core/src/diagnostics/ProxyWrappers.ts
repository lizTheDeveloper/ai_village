/**
 * ProxyWrappers - Intercept property/method access to detect issues
 */

import { Entity } from '../ecs/Entity.js';
import { World } from '../ecs/World.js';
import { diagnosticsHarness, captureStackTrace } from './DiagnosticsHarness.js';

/**
 * List of safe properties that are allowed to be undefined
 * (e.g., optional fields, Symbol properties, internal Node.js stuff)
 */
const SAFE_UNDEFINED_PROPERTIES = new Set([
  'then',  // Promise detection
  'catch',
  'finally',
  'constructor',
  'prototype',
  '$$typeof',  // React internals
  'toJSON',
  'valueOf',
  'toString',
  Symbol.toStringTag,
  Symbol.iterator,
  Symbol.asyncIterator,
  'inspect',  // Node.js util.inspect
  'nodeType',  // DOM detection
]);

/**
 * Wrap an Entity to detect invalid property/method access
 */
export function wrapEntity(entity: Entity): Entity {
  if (!diagnosticsHarness.isEnabled()) return entity;

  return new Proxy(entity, {
    get(target: Entity, prop: string | symbol): any {
      // Skip safe properties
      if (SAFE_UNDEFINED_PROPERTIES.has(prop)) {
        return target[prop as keyof Entity];
      }

      const value = target[prop as keyof Entity];

      // Detect undefined property access
      if (value === undefined && typeof prop === 'string') {
        // Check if it's a common typo or wrong method
        const suggestions = findSimilarProperties(target, prop);

        diagnosticsHarness.reportIssue({
          type: 'undefined_property',
          severity: 'error',
          objectType: 'Entity',
          objectId: target.id,
          property: prop,
          stackTrace: captureStackTrace(),
          context: {
            suggestions,
            // Access Entity internal structure with type guard for diagnostics
            entityComponents: ('components' in target &&
                              target.components instanceof Map)
              ? Array.from(target.components.keys())
              : []
          }
        });
      }

      return value;
    },

    set(target: Entity, prop: string | symbol, value: any): boolean {
      // Detect setting properties that don't exist (potential typos)
      if (typeof prop === 'string' && !(prop in target)) {
        diagnosticsHarness.reportIssue({
          type: 'undefined_property',
          severity: 'warning',
          objectType: 'Entity',
          objectId: target.id,
          property: prop,
          stackTrace: captureStackTrace(),
          context: {
            attemptedValue: value,
            suggestions: findSimilarProperties(target, prop)
          }
        });
      }

      // Dynamic property assignment - necessary for Proxy set trap
      // Type guard ensures we only assign to valid object properties
      if (typeof prop === 'string' || typeof prop === 'symbol') {
        (target as Record<string | symbol, any>)[prop] = value;
      }
      return true;
    }
  });
}

/**
 * Wrap a Component to detect invalid access
 */
export function wrapComponent<T extends Record<string, any>>(
  component: T,
  componentType: string,
  entityId?: string
): T {
  if (!diagnosticsHarness.isEnabled()) return component;

  return new Proxy(component, {
    get(target: T, prop: string | symbol): any {
      if (SAFE_UNDEFINED_PROPERTIES.has(prop)) {
        return target[prop as keyof T];
      }

      const value = target[prop as keyof T];

      if (value === undefined && typeof prop === 'string' && prop !== 'type') {
        diagnosticsHarness.reportIssue({
          type: 'undefined_property',
          severity: 'warning',
          objectType: `Component:${componentType}`,
          objectId: entityId,
          property: prop,
          stackTrace: captureStackTrace(),
          context: {
            suggestions: findSimilarProperties(target, prop),
            availableFields: Object.keys(target)
          }
        });
      }

      return value;
    }
  });
}

/**
 * Wrap World queries to detect common mistakes
 */
export function wrapWorld(world: World): World {
  if (!diagnosticsHarness.isEnabled()) return world;

  return new Proxy(world, {
    get(target: World, prop: string | symbol): any {
      if (SAFE_UNDEFINED_PROPERTIES.has(prop)) {
        return target[prop as keyof World];
      }

      const value = target[prop as keyof World];

      // Detect undefined method calls
      if (value === undefined && typeof prop === 'string') {
        diagnosticsHarness.reportIssue({
          type: 'undefined_method',
          severity: 'error',
          objectType: 'World',
          property: prop,
          stackTrace: captureStackTrace(),
          context: {
            suggestions: findSimilarProperties(target, prop)
          }
        });
      }

      // Wrap methods that return entities to auto-wrap them
      if (typeof value === 'function' && (prop === 'getEntity' || prop === 'addEntity')) {
        // Wrapper function preserves 'this' context from caller or uses target
        // Cast to Function necessary here: we're creating a generic wrapper for multiple
        // method signatures (getEntity, addEntity). TypeScript can't infer a single type
        // that matches all possible World methods.
        const originalMethod = value as Function;
        return function(this: unknown, ...args: unknown[]): unknown {
          const result = originalMethod.apply(this || target, args);
          // Type guard: check if result looks like an Entity
          if (result && typeof result === 'object' && 'id' in result) {
            return wrapEntity(result as Entity);
          }
          return result;
        };
      }

      return value;
    }
  });
}

/**
 * Wrap any generic object for diagnostics
 */
export function wrapObject<T extends object>(
  obj: T,
  objectType: string,
  objectId?: string
): T {
  if (!diagnosticsHarness.isEnabled()) return obj;

  return new Proxy(obj, {
    get(target: T, prop: string | symbol): any {
      if (SAFE_UNDEFINED_PROPERTIES.has(prop)) {
        return target[prop as keyof T];
      }

      const value = target[prop as keyof T];

      if (value === undefined && typeof prop === 'string') {
        diagnosticsHarness.reportIssue({
          type: 'undefined_property',
          severity: 'warning',
          objectType,
          objectId,
          property: prop,
          stackTrace: captureStackTrace(),
          context: {
            suggestions: findSimilarProperties(target, prop)
          }
        });
      }

      return value;
    }
  });
}

/**
 * Find similar property names (for typo suggestions)
 *
 * @param obj - Object to search for similar properties (intentionally generic for diagnostics)
 * @param prop - Property name to find matches for
 * @returns Array of up to 3 similar property names
 */
function findSimilarProperties(obj: object, prop: string): string[] {
  const available = Object.keys(obj);
  const propLower = prop.toLowerCase();

  return available
    .filter(key => {
      const keyLower = key.toLowerCase();
      // Levenshtein distance or simple substring matching
      return keyLower.includes(propLower) ||
             propLower.includes(keyLower) ||
             levenshteinDistance(propLower, keyLower) <= 2;
    })
    .slice(0, 3);
}

/**
 * Simple Levenshtein distance for typo detection
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Initialize matrix with proper dimensions
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}
