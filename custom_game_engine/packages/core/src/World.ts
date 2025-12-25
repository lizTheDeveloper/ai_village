/**
 * Test helper World that provides convenience methods for component creation.
 * This is used in tests to simplify entity/component creation.
 */

import { WorldImpl } from './ecs/World.js';
import { EventBusImpl } from './events/EventBus.js';
import type { Entity } from './ecs/Entity.js';

// Import component factory functions
import { createPositionComponent } from './components/PositionComponent.js';

// Import navigation component classes
import { TrustNetworkComponent } from './components/TrustNetworkComponent.js';
import { SocialGradientComponent } from './components/SocialGradientComponent.js';
import { ExplorationStateComponent } from './components/ExplorationStateComponent.js';
import { SpatialMemoryComponent } from './components/SpatialMemoryComponent.js';
import { BeliefComponent } from './components/BeliefComponent.js';
import { EpisodicMemoryComponent } from './components/EpisodicMemoryComponent.js';

// Component registry mapping strings to factory functions or classes
const componentRegistry: Record<string, any> = {
  'agent': (data: any) => ({
    type: 'agent',
    version: 1,
    behavior: data.behavior || 'wander',
    behaviorState: data.behaviorState || {},
    thinkInterval: data.thinkInterval || 20,
    lastThinkTick: data.lastThinkTick || 0,
    useLLM: data.useLLM || false,
    llmCooldown: data.llmCooldown || 0,
    ...data,
  }),
  'position': (data: any) => createPositionComponent(data.x || 0, data.y || 0),
  'velocity': (data: any) => ({
    type: 'velocity',
    version: 1,
    vx: data.vx || 0,
    vy: data.vy || 0,
  }),
  'resource': (data: any) => ({
    type: 'resource',
    version: 1,
    resourceType: data.type || data.resourceType,
    amount: data.amount || 0,
    regenerationRate: data.regenerationRate || 0,
  }),
  'building': (data: any) => ({
    type: 'building',
    version: 1,
    buildingType: data.buildingType,
    ...data,
  }),
  'collision': (data: any) => ({
    type: 'collision',
    version: 1,
    radius: data.radius || 1.0,
  }),
  'trust_network': (data: any) => new TrustNetworkComponent(data),
  'social_gradient': () => new SocialGradientComponent(),
  'spatial_memory': (data: any) => new SpatialMemoryComponent(data),
  'belief': () => new BeliefComponent(),
  'steering': (data: any) => ({
    type: 'steering',
    version: 1,
    ...data,
  }),
  'exploration_state': (data: any) => {
    // Support both class-based and ad-hoc exploration_state
    // Tests use ad-hoc objects with Sets, production might use the class
    if (data && typeof data === 'object' && !data.type) {
      // Ad-hoc object from tests - preserve all fields including Sets
      return {
        type: 'exploration_state',
        version: 1,
        ...data,
      };
    }
    // Otherwise create the class
    return new ExplorationStateComponent();
  },
  'episodic_memory': (data: any) => new EpisodicMemoryComponent(data),

  // Backwards compatibility aliases (PascalCase → lowercase_with_underscores)
  'Velocity': (data: any) => componentRegistry['velocity'](data),
  'Steering': (data: any) => componentRegistry['steering'](data),
  'ExplorationState': (data: any) => componentRegistry['exploration_state'](data),
  'SpatialMemory': (data: any) => componentRegistry['spatial_memory'](data),
  'EpisodicMemory': (data: any) => componentRegistry['episodic_memory'](data),
  'TrustNetwork': (data: any) => componentRegistry['trust_network'](data),
  'SocialGradient': () => componentRegistry['social_gradient'](),
  'Belief': () => componentRegistry['belief'](),
  'Position': (data: any) => componentRegistry['position'](data),
  'Resource': (data: any) => componentRegistry['resource'](data),
  'Building': (data: any) => componentRegistry['building'](data),
  'Collision': (data: any) => componentRegistry['collision'](data),
  'Agent': (data: any) => componentRegistry['agent'](data),
};

// Extend Entity interface with test convenience methods
interface TestEntity extends Entity {
  addComponent(ComponentClass: any, data: any): void;
  getComponent(ComponentClass: any): any;
}

export class World extends WorldImpl {
  constructor() {
    super(new EventBusImpl() as any);
  }

  /**
   * Helper method for tests to call system.update with the right signature
   * Converts entities Map to Array
   */
  getAllEntities(): ReadonlyArray<Entity> {
    return Array.from(this.entities.values());
  }

  /**
   * Expose eventBus for tests
   */
  get eventBus() {
    return (this as any)._eventBus;
  }

  createEntity(): TestEntity {
    const entity = super.createEntity() as any;

    // Add convenience method for tests
    const originalAddComponent = entity.addComponent.bind(entity);
    entity.addComponent = (ComponentClassOrInstance: any, data?: any) => {
      // If it's already a component instance, use it directly
      if (ComponentClassOrInstance?.type) {
        originalAddComponent(ComponentClassOrInstance);
        return ComponentClassOrInstance;
      }

      // If it's a string, look up in registry
      if (typeof ComponentClassOrInstance === 'string') {
        const factory = componentRegistry[ComponentClassOrInstance];
        if (!factory) {
          throw new Error(`Unknown component type: ${ComponentClassOrInstance}. Add it to the component registry in World.ts`);
        }
        const component = factory(data || {});
        originalAddComponent(component);
        return component;
      }

      // Otherwise, try to instantiate as a class
      try {
        const component = new ComponentClassOrInstance(data);
        originalAddComponent(component);
        return component;
      } catch (error) {
        throw new Error(`Failed to create component from ${ComponentClassOrInstance}: ${error}`);
      }
    };

    // Add convenience getComponent that works with classes
    const originalGetComponent = entity.getComponent.bind(entity);
    entity.getComponent = (ComponentClass: any) => {
      // If it's a string, try as-is first, then try snake_case conversion
      if (typeof ComponentClass === 'string') {
        // Try the string as-is first (for lowercase_with_underscores like 'steering', 'position')
        const direct = originalGetComponent(ComponentClass);
        if (direct) return direct;

        // Fallback: Convert PascalCase to snake_case for backwards compatibility (e.g., 'TrustNetwork' -> 'trust_network')
        const typeString = ComponentClass
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, ''); // Remove leading underscore
        return originalGetComponent(typeString);
      }

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
