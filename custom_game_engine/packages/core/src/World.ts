/**
 * Test helper World that provides convenience methods for component creation.
 * This is used in tests to simplify entity/component creation.
 */

import { WorldImpl } from './ecs/World.js';
import { EventBusImpl } from './events/EventBus.js';
import type { EventBus } from './events/EventBus.js';
import type { Entity } from './ecs/Entity.js';
import { EntityImpl } from './ecs/Entity.js';
import type { Component } from './ecs/Component.js';

// Import component factory functions
import { createPositionComponent } from './components/PositionComponent.js';
import { createDominanceRankComponent } from './components/DominanceRankComponent.js';
import { createCombatStatsComponent } from './components/CombatStatsComponent.js';
import { createConflictComponent } from './components/ConflictComponent.js';
import { createGuardDutyComponent } from './components/GuardDutyComponent.js';
import { createInjuryComponent } from './components/InjuryComponent.js';

// Import navigation component classes
import { TrustNetworkComponent } from './components/TrustNetworkComponent.js';
import { SocialGradientComponent } from './components/SocialGradientComponent.js';
import { ExplorationStateComponent } from './components/ExplorationStateComponent.js';
import { SpatialMemoryComponent } from './components/SpatialMemoryComponent.js';
import { BeliefComponent } from './components/BeliefComponent.js';
import { EpisodicMemoryComponent } from './components/EpisodicMemoryComponent.js';
import { NeedsComponent } from './components/NeedsComponent.js';

// Type for component factory functions
type ComponentFactory = (data?: Record<string, unknown>) => Component;

// Component registry mapping strings to factory functions or classes
const componentRegistry: Record<string, ComponentFactory> = {
  'agent': (data = {}) => ({
    type: 'agent' as const,
    version: 1,
    behavior: (data.behavior as string) || 'wander',
    behaviorState: (data.behaviorState as Record<string, unknown>) || {},
    thinkInterval: (data.thinkInterval as number) || 20,
    lastThinkTick: (data.lastThinkTick as number) || 0,
    useLLM: (data.useLLM as boolean) || false,
    llmCooldown: (data.llmCooldown as number) || 0,
    ...data,
  }),
  'position': (data = {}) => createPositionComponent((data.x as number) || 0, (data.y as number) || 0),
  'velocity': (data = {}) => ({
    type: 'velocity' as const,
    version: 1,
    vx: (data.vx as number) || 0,
    vy: (data.vy as number) || 0,
  }),
  'resource': (data = {}) => ({
    type: 'resource' as const,
    version: 1,
    resourceType: (data.type as string) || (data.resourceType as string),
    amount: (data.amount as number) || 0,
    regenerationRate: (data.regenerationRate as number) || 0,
  }),
  'building': (data = {}) => ({
    type: 'building' as const,
    version: 1,
    buildingType: data.buildingType as string,
    ...data,
  }),
  'collision': (data = {}) => ({
    type: 'collision' as const,
    version: 1,
    radius: (data.radius as number) || 1.0,
  }),
  'trust_network': (data = {}) => new TrustNetworkComponent(data),
  'social_gradient': () => new SocialGradientComponent(),
  'spatial_memory': (data = {}) => new SpatialMemoryComponent(data),
  'belief': () => new BeliefComponent(),
  'steering': (data = {}) => ({
    type: 'steering' as const,
    version: 1,
    ...data,
  }),
  'exploration_state': (data = {}) => {
    // Support both class-based and ad-hoc exploration_state
    // Tests use ad-hoc objects with Sets, production might use the class
    if (data && typeof data === 'object' && !data.type) {
      // Ad-hoc object from tests - preserve all fields including Sets
      return {
        type: 'exploration_state' as const,
        version: 1,
        ...data,
      };
    }
    // Otherwise create the class
    return new ExplorationStateComponent();
  },
  'episodic_memory': (data = {}) => new EpisodicMemoryComponent(data),
  'dominance_rank': (data = {}) => createDominanceRankComponent(data),
  'combat_stats': (data = {}) => createCombatStatsComponent(data),
  'conflict': (data = {}) => createConflictComponent(data),
  'guard_duty': (data = {}) => createGuardDutyComponent(data),
  'skills': (data = {}) => ({
    type: 'skills' as const,
    version: 1,
    ...data,
  }),
  'animal': (data = {}) => ({
    type: 'animal' as const,
    version: 1,
    ...data,
  }),
  'territory': (data = {}) => ({
    type: 'territory' as const,
    version: 1,
    ...data,
  }),
  'injury': (data = {}) => createInjuryComponent(data),
  'inventory': (data = {}) => ({
    type: 'inventory' as const,
    version: 1,
    items: (data.items as Array<{type: string; quantity: number}>) || [],
    ...data,
  }),
  'relationship': (data = {}) => ({
    type: 'relationship' as const,
    version: 1,
    relationships: (data.relationships as Record<string, {opinion: number}>) || {},
    ...data,
  }),
  'reputation': (data = {}) => ({
    type: 'reputation' as const,
    version: 1,
    honor: (data.honor as number) || 0,
    violence: (data.violence as number) || 0,
    ...data,
  }),
  'needs': (data = {}) => new NeedsComponent(data),
  'movement': (data = {}) => ({
    type: 'movement' as const,
    version: 1,
    baseSpeed: (data.baseSpeed as number) || 1.0,
    currentSpeed: (data.currentSpeed as number) || 1.0,
    ...data,
  }),
  'environment': (data = {}) => ({
    type: 'environment' as const,
    version: 1,
    terrain: (data.terrain as string) || 'plains',
    weather: (data.weather as string) || 'clear',
    timeOfDay: (data.timeOfDay as string) || 'noon',
    ...data,
  }),
  'laws': (data = {}) => ({
    type: 'laws' as const,
    version: 1,
    murderIllegal: (data.murderIllegal as boolean) || false,
    assaultIllegal: (data.assaultIllegal as boolean) || false,
    selfDefenseLegal: (data.selfDefenseLegal as boolean) || true,
    ...data,
  }),
  'dead': (data = {}) => ({
    type: 'dead' as const,
    version: 1,
    cause: (data.cause as string) || 'unknown',
    time: (data.time as number) || 0,
    ...data,
  }),
  'pack_member': (data = {}) => ({
    type: 'pack_member' as const,
    version: 1,
    packId: (data.packId as string),
    ...data,
  }),
  'pack_combat': (data = {}) => ({
    type: 'pack_combat' as const,
    version: 1,
    coherence: (data.coherence as number) || 1.0,
    bodiesInPack: (data.bodiesInPack as string[]) || [],
    ...data,
  }),
  'hive_queen': (data = {}) => ({
    type: 'hive_queen' as const,
    version: 1,
    hiveId: (data.hiveId as string),
    ...data,
  }),
  'hive_combat': (data = {}) => ({
    type: 'hive_combat' as const,
    version: 1,
    queenDead: (data.queenDead as boolean) || false,
    collapseTriggered: (data.collapseTriggered as boolean) || false,
    ...data,
  }),

  // Backwards compatibility aliases (PascalCase → lowercase_with_underscores)
  'Velocity': (data) => componentRegistry['velocity']!(data),
  'Steering': (data) => componentRegistry['steering']!(data),
  'ExplorationState': (data) => componentRegistry['exploration_state']!(data),
  'SpatialMemory': (data) => componentRegistry['spatial_memory']!(data),
  'EpisodicMemory': (data) => componentRegistry['episodic_memory']!(data),
  'TrustNetwork': (data) => componentRegistry['trust_network']!(data),
  'SocialGradient': () => componentRegistry['social_gradient']!(),
  'Belief': () => componentRegistry['belief']!(),
  'Position': (data) => componentRegistry['position']!(data),
  'Resource': (data) => componentRegistry['resource']!(data),
  'Building': (data) => componentRegistry['building']!(data),
  'Collision': (data) => componentRegistry['collision']!(data),
  'Agent': (data) => componentRegistry['agent']!(data),
};

// Type for component class or string identifier
type ComponentClassOrString = string | { new(data?: unknown): Component } | { prototype: Component };

// Extend Entity interface with test convenience methods
interface TestEntity extends Entity {
  addComponent(ComponentClass: ComponentClassOrString, data?: Record<string, unknown>): Component;
  getComponent<T extends Component = Component>(ComponentClass: ComponentClassOrString): T | undefined;
}

export class World extends WorldImpl {
  constructor() {
    super(new EventBusImpl() as EventBus);
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
   * Note: WorldImpl has public readonly eventBus property, so we just delegate to parent
   */
  get eventBus(): EventBus {
    return super.eventBus;
  }

  createEntity(): TestEntity {
    const entity = super.createEntity() as unknown as TestEntity;

    // Add convenience method for tests
    // Store original addComponent from EntityImpl - it takes a Component
    const entityImpl = entity as unknown as EntityImpl;
    const originalAddComponent = entityImpl.addComponent.bind(entity);

    entity.addComponent = (ComponentClassOrInstance: ComponentClassOrString, data?: Record<string, unknown>): Component => {
      // If it's already a component instance, use it directly
      if (typeof ComponentClassOrInstance === 'object' && ComponentClassOrInstance !== null && 'type' in ComponentClassOrInstance) {
        const component = ComponentClassOrInstance as unknown as Component;
        originalAddComponent(component);
        return component;
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
        const ComponentClass = ComponentClassOrInstance as { new(data?: unknown): Component };
        const component = new ComponentClass(data);
        originalAddComponent(component);
        return component;
      } catch (error) {
        throw new Error(`Failed to create component from ${ComponentClassOrInstance}: ${error}`);
      }
    };

    // Add convenience getComponent that works with classes
    const originalGetComponent = entity.getComponent.bind(entity);
    entity.getComponent = <T extends Component = Component>(ComponentClass: ComponentClassOrString): T | undefined => {
      // If it's a string, try as-is first, then try snake_case conversion
      if (typeof ComponentClass === 'string') {
        // Try the string as-is first (for lowercase_with_underscores like 'steering', 'position')
        const direct = originalGetComponent<T>(ComponentClass);
        if (direct) return direct;

        // Fallback: Convert PascalCase to snake_case for backwards compatibility (e.g., 'TrustNetwork' -> 'trust_network')
        const typeString = ComponentClass
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, ''); // Remove leading underscore
        return originalGetComponent<T>(typeString);
      }

      // If it's a class with a prototype, get the type from an instance
      if ('prototype' in ComponentClass && ComponentClass.prototype) {
        // Create temporary instance to get type
        try {
          const ComponentConstructor = ComponentClass as { new(data?: unknown): Component };
          const temp = new ComponentConstructor({});
          return originalGetComponent<T>(temp.type);
        } catch {
          // Fallback: assume ComponentClass is the type string (shouldn't happen but be safe)
          return originalGetComponent<T>(String(ComponentClass));
        }
      }

      // Otherwise assume it's a type string
      return originalGetComponent<T>(String(ComponentClass));
    };

    return entity as TestEntity;
  }
}
