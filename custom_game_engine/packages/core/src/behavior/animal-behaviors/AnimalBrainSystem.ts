/**
 * AnimalBrainSystem - Behavior selection and execution for animals
 *
 * This system uses the modular behavior classes (GrazeBehavior, FleeBehavior, etc.)
 * to determine and execute animal actions each tick.
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { System } from '../../ecs/System.js';
import type { SystemId, ComponentType } from '../../types.js';
import type { World } from '../../ecs/World.js';
import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { AnimalComponent, AnimalState } from '../../components/AnimalComponent.js';
import type { IAnimalBehavior, AnimalBehaviorResult } from './AnimalBehavior.js';

import { GrazeBehavior } from './GrazeBehavior.js';
import { FleeBehavior } from './FleeBehavior.js';
import { RestBehavior, IdleBehavior } from './RestBehavior.js';

/**
 * Registry of animal behaviors by state.
 * Maps AnimalState to the behavior that handles it.
 */
export interface BehaviorRegistry {
  behaviors: Map<AnimalState, IAnimalBehavior>;
  defaultBehavior: IAnimalBehavior;
}

/**
 * AnimalBrainSystem handles behavior selection and execution for animal entities.
 *
 * Priority: 12 (runs after core systems, before AnimalSystem at 15)
 *
 * The system evaluates all available behaviors each tick and selects
 * the highest priority behavior that can start. Unlike agents, animals
 * operate on instinct rather than planning.
 *
 * @dependencies None - Behavior selection system that reads animal state
 */
export class AnimalBrainSystem implements System {
  public readonly id: SystemId = 'animal-brain';
  public readonly priority: number = 12;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['animal', 'position', 'movement'];
  public readonly dependsOn = [] as const;

  private readonly registry: BehaviorRegistry;

  constructor() {
    // Initialize behavior registry with all available behaviors
    const behaviors = new Map<AnimalState, IAnimalBehavior>();

    const grazeBehavior = new GrazeBehavior();
    const fleeBehavior = new FleeBehavior();
    const restBehavior = new RestBehavior();
    const idleBehavior = new IdleBehavior();

    // Map states to behaviors
    behaviors.set('foraging', grazeBehavior);
    behaviors.set('eating', grazeBehavior); // Same behavior handles eating
    behaviors.set('fleeing', fleeBehavior);
    behaviors.set('sleeping', restBehavior);
    behaviors.set('idle', idleBehavior);
    // drinking state handled separately (needs DrinkBehavior)

    this.registry = {
      behaviors,
      defaultBehavior: idleBehavior,
    };
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const animal = entity.components.get('animal') as AnimalComponent | undefined;
      if (!animal) {
        continue;
      }

      // Validate required fields (per CLAUDE.md - crash if missing)
      if (animal.state === undefined || animal.state === null) {
        throw new Error(`Animal ${animal.id} missing required 'state' field`);
      }

      // Process this animal's behavior
      this.processAnimalBehavior(entity as EntityImpl, world, animal);
    }
  }

  /**
   * Process a single animal's behavior for this tick.
   */
  private processAnimalBehavior(
    entity: EntityImpl,
    world: World,
    animal: AnimalComponent
  ): void {
    // Get current behavior based on state
    const currentBehavior = this.registry.behaviors.get(animal.state)
      ?? this.registry.defaultBehavior;

    // Check if we should switch to a higher priority behavior
    const bestBehavior = this.selectBestBehavior(entity, animal);

    // If a higher priority behavior wants to take over, switch to it
    if (bestBehavior !== currentBehavior) {
      const newState = bestBehavior.name;

      // Update animal state
      entity.updateComponent('animal', (current: AnimalComponent) => ({
        ...current,
        state: newState,
      }));

      // Emit state change event
      world.eventBus.emit({
        type: 'animal:behavior_changed',
        source: entity.id,
        data: {
          animalId: animal.id,
          from: animal.state,
          to: newState,
          reason: 'priority_switch',
        },
      });
    }

    // Execute current behavior
    const behaviorToExecute = bestBehavior !== currentBehavior
      ? bestBehavior
      : currentBehavior;

    const result = behaviorToExecute.execute(entity, world, animal);

    // Handle behavior result
    this.handleBehaviorResult(entity, world, animal, result);
  }

  /**
   * Select the best behavior based on priority evaluation.
   */
  private selectBestBehavior(
    entity: EntityImpl,
    animal: AnimalComponent
  ): IAnimalBehavior {
    let bestBehavior: IAnimalBehavior = this.registry.defaultBehavior;
    let highestPriority = -1;

    for (const behavior of this.registry.behaviors.values()) {
      // Skip if behavior can't start
      if (!behavior.canStart(entity, animal)) {
        continue;
      }

      const priority = behavior.getPriority(animal);

      if (priority > highestPriority) {
        highestPriority = priority;
        bestBehavior = behavior;
      }
    }

    return bestBehavior;
  }

  /**
   * Handle the result of executing a behavior.
   */
  private handleBehaviorResult(
    entity: EntityImpl,
    world: World,
    animal: AnimalComponent,
    result: AnimalBehaviorResult
  ): void {
    // If behavior is complete and requests a state change
    if (result.complete && result.newState && result.newState !== animal.state) {
      entity.updateComponent('animal', (current: AnimalComponent) => ({
        ...current,
        state: result.newState!,
      }));

      world.eventBus.emit({
        type: 'animal:behavior_changed',
        source: entity.id,
        data: {
          animalId: animal.id,
          from: animal.state,
          to: result.newState,
          reason: result.reason ?? 'behavior_complete',
        },
      });
    }

    // If behavior is not complete but suggests a state change, apply it
    if (!result.complete && result.newState && result.newState !== animal.state) {
      entity.updateComponent('animal', (current: AnimalComponent) => ({
        ...current,
        state: result.newState!,
      }));
    }
  }

  /**
   * Register a custom behavior for a state.
   * Allows extending the animal brain with new behaviors.
   */
  registerBehavior(state: AnimalState, behavior: IAnimalBehavior): void {
    this.registry.behaviors.set(state, behavior);
  }

  /**
   * Get all registered behaviors.
   */
  getBehaviors(): ReadonlyMap<AnimalState, IAnimalBehavior> {
    return this.registry.behaviors;
  }
}

/**
 * Factory function for creating an AnimalBrainSystem with custom behaviors.
 */
export function createAnimalBrainSystem(
  customBehaviors?: Map<AnimalState, IAnimalBehavior>
): AnimalBrainSystem {
  const system = new AnimalBrainSystem();

  if (customBehaviors) {
    for (const [state, behavior] of customBehaviors) {
      system.registerBehavior(state, behavior);
    }
  }

  return system;
}
