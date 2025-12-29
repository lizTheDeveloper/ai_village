import type { Component } from '../ecs/Component.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { ComponentType } from '../types.js';

/**
 * Safely update a component while preserving the prototype chain.
 *
 * CRITICAL: This utility exists because using spread operators ({...current})
 * in updateComponent destroys class prototypes, causing:
 * - Lost class methods
 * - instanceof checks to fail
 * - Component state corruption
 *
 * @example
 * // WRONG - destroys prototype:
 * entity.updateComponent('steering', c => ({ ...c, behavior: 'wander' }));
 *
 * // CORRECT - preserves prototype:
 * safeUpdateComponent(entity, 'steering', () => ({ behavior: 'wander' }));
 *
 * @param entity - The entity to update
 * @param componentType - The type of component to update
 * @param updater - Function returning partial updates (NOT a spread, just the changes)
 * @throws Error if the entity doesn't have the specified component
 */
export function safeUpdateComponent<T extends Component>(
  entity: EntityImpl,
  componentType: ComponentType,
  updater: (current: T) => Partial<T>
): void {
  entity.updateComponent<T>(componentType, (current: T) => {
    // Preserve prototype chain by creating from existing prototype
    const updated = Object.create(Object.getPrototypeOf(current)) as T;

    // Copy all existing properties
    Object.assign(updated, current);

    // Apply the changes from the updater
    const changes = updater(current);
    Object.assign(updated, changes);

    return updated;
  });
}

/**
 * Direct property update for simple scalar property changes.
 * More efficient than safeUpdateComponent for single property updates.
 *
 * @example
 * setComponentProperty(entity, 'velocity', 'vx', 5.0);
 *
 * @param entity - The entity to update
 * @param componentType - The type of component to update
 * @param property - The property name to update
 * @param value - The new value
 * @throws Error if the entity doesn't have the specified component
 */
export function setComponentProperty<
  T extends Component,
  K extends keyof T
>(
  entity: EntityImpl,
  componentType: ComponentType,
  property: K,
  value: T[K]
): void {
  entity.updateComponent<T>(componentType, (current: T) => {
    // For direct property updates, we can use the same object
    // This is safe because updateComponent replaces the component in the map
    const updated = Object.create(Object.getPrototypeOf(current)) as T;
    Object.assign(updated, current);
    (updated as Record<K, T[K]>)[property] = value;
    return updated;
  });
}

/**
 * Batch update multiple properties at once.
 *
 * @example
 * setComponentProperties(entity, 'velocity', { vx: 5.0, vy: 3.0 });
 *
 * @param entity - The entity to update
 * @param componentType - The type of component to update
 * @param properties - Object with properties to update
 * @throws Error if the entity doesn't have the specified component
 */
export function setComponentProperties<T extends Component>(
  entity: EntityImpl,
  componentType: ComponentType,
  properties: Partial<T>
): void {
  safeUpdateComponent<T>(entity, componentType, () => properties);
}
