import type { ComponentSchema, Component } from '../types/index.js';
import { ComponentRegistry } from './ComponentRegistry.js';

/**
 * Auto-register a component schema when imported
 * 
 * This function should be called at the end of each schema definition file
 * to automatically register the schema when the module is imported.
 * 
 * @param schema - The component schema to auto-register
 * @returns The same schema (for chaining)
 * 
 * @example
 * ```typescript
 * export const IdentitySchema = autoRegister(defineComponent<IdentityComponent>({
 *   type: 'identity',
 *   // ... schema definition
 * }));
 * ```
 */
export function autoRegister<T extends Component>(
  schema: ComponentSchema<T>
): ComponentSchema<T> {
  ComponentRegistry.register(schema);
  return schema;
}

/**
 * Decorator for auto-registering schemas (alternative pattern)
 * 
 * @example
 * ```typescript
 * @RegisterSchema
 * class IdentitySchemaClass implements ComponentSchema<IdentityComponent> {
 *   // ... schema implementation
 * }
 * ```
 */
export function RegisterSchema<T extends { new(...args: any[]): ComponentSchema<any> }>(
  constructor: T
): T {
  // Create instance and register
  const instance = new constructor();
  ComponentRegistry.register(instance);
  return constructor;
}
