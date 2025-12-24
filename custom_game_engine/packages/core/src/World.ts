/**
 * Test helper World that provides convenience methods for component creation.
 * This is used in tests to simplify entity/component creation.
 */

import { WorldImpl } from './ecs/World.js';
import { EventBusImpl } from './events/EventBus.js';
import type { Entity } from './ecs/Entity.js';

// Extend Entity interface with test convenience methods
interface TestEntity extends Entity {
  addComponent(ComponentClass: any, data: any): void;
  getComponent(ComponentClass: any): any;
}

export class World extends WorldImpl {
  constructor() {
    super(new EventBusImpl() as any);
  }

  createEntity(): TestEntity {
    const entity = super.createEntity() as any;

    // Add convenience method for tests
    const originalAddComponent = entity.addComponent.bind(entity);
    entity.addComponent = (ComponentClassOrInstance: any, data?: any) => {
      // If it's already a component instance, use it directly
      if (ComponentClassOrInstance.type) {
        originalAddComponent(ComponentClassOrInstance);
        return ComponentClassOrInstance;
      }

      // Otherwise, instantiate the class with data
      const component = new ComponentClassOrInstance(data);
      originalAddComponent(component);
      return component;
    };

    // Add convenience getComponent that works with classes
    const originalGetComponent = entity.getComponent.bind(entity);
    entity.getComponent = (ComponentClass: any) => {
      // If it's a class with a prototype, get the type from an instance
      if (ComponentClass.prototype) {
        // Create temporary instance to get type
        try {
          const temp = new ComponentClass({});
          return originalGetComponent(temp.type);
        } catch {
          // Fallback: assume ComponentClass is the type string
          return originalGetComponent(ComponentClass);
        }
      }
      // Otherwise assume it's a type string
      return originalGetComponent(ComponentClass);
    };

    return entity as TestEntity;
  }
}
