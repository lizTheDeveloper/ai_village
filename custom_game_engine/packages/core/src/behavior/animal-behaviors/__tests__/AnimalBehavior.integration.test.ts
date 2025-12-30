import { ComponentType } from '../../../types/ComponentType.js';
/**
 * Integration tests for Animal Behavior Module
 *
 * Tests animal behaviors in realistic scenarios with the full entity/world context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationTestHarness } from '../../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../../ecs/Entity.js';
import { createPositionComponent } from '../../../components/PositionComponent.js';
import { createMovementComponent } from '../../../components/MovementComponent.js';
import type { AnimalComponent } from '../../../components/AnimalComponent.js';

import {
  GrazeBehavior,
  FleeBehavior,
  RestBehavior,
  IdleBehavior,
  AnimalBrainSystem,
  createAnimalBrainSystem,
} from '../index.js';

// Helper to create an animal component
function createTestAnimalComponent(overrides: Partial<AnimalComponent> = {}): AnimalComponent {
  return {
    type: ComponentType.Animal,
    version: 1,
    id: `animal-${Math.random().toString(36).substr(2, 9)}`,
    speciesId: 'chicken',
    name: 'Test Chicken',
    position: { x: 50, y: 50 },
    age: 10,
    lifeStage: 'adult',
    health: 80,
    size: 1.0,
    state: 'idle',
    hunger: 30,
    thirst: 30,
    energy: 70,
    stress: 20,
    mood: 60,
    wild: false,
    bondLevel: 50,
    trustLevel: 60,
    ...overrides,
  } as AnimalComponent;
}

describe('Animal Behavior Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
  });

  describe('AnimalBrainSystem with World', () => {
    it('updates animal state based on needs', () => {
      const system = new AnimalBrainSystem();

      // Create a hungry animal
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        hunger: 60,
        state: 'idle',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Animal should have switched to foraging state
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('foraging');
    });

    it('prioritizes fleeing over grazing when stressed', () => {
      const system = new AnimalBrainSystem();

      // Create a stressed and hungry wild animal with low trust (so it will perceive agents as threats)
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        hunger: 80,
        stress: 75,
        wild: true,
        trustLevel: 20,
        state: 'idle',
      }));
      (harness.world as any)._addEntity(animal);

      // Create a threat (agent) nearby to trigger actual fleeing behavior
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(55, 55)); // 5 units away - within threat detection range
      agent.addComponent({
        type: ComponentType.Agent,
        version: 1,
        behavior: 'wander',
      });
      (harness.world as any)._addEntity(agent);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Animal should be fleeing (stress priority > hunger priority, and threat is present)
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('fleeing');
    });

    it('tired animal rests', () => {
      const system = new AnimalBrainSystem();

      // Create a tired animal
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        energy: 20,
        state: 'idle',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Animal should be sleeping
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('sleeping');
    });

    it('emits behavior_changed event when state changes', () => {
      const system = new AnimalBrainSystem();
      const emitSpy = vi.spyOn(harness.world.eventBus, 'emit');

      // Create an animal that will change state
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        hunger: 60,
        state: 'idle',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Should have emitted behavior changed event
      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'animal:behavior_changed',
        source: animal.id,
        data: expect.objectContaining({
          from: 'idle',
          to: 'foraging',
        }),
      }));
    });
  });

  describe('Multiple Animals', () => {
    it('processes each animal independently', () => {
      const system = new AnimalBrainSystem();

      // Create animals with different needs
      const hungryAnimal = new EntityImpl(createEntityId(), 0);
      hungryAnimal.addComponent(createPositionComponent(10, 10));
      hungryAnimal.addComponent(createMovementComponent());
      hungryAnimal.addComponent(createTestAnimalComponent({
        id: 'hungry',
        hunger: 70,
        state: 'idle',
      }));

      const tiredAnimal = new EntityImpl(createEntityId(), 0);
      tiredAnimal.addComponent(createPositionComponent(90, 90));
      tiredAnimal.addComponent(createMovementComponent());
      tiredAnimal.addComponent(createTestAnimalComponent({
        id: 'tired',
        energy: 15,
        state: 'idle',
      }));

      (harness.world as any)._addEntity(hungryAnimal);
      (harness.world as any)._addEntity(tiredAnimal);

      // Update the system with both animals
      system.update(harness.world, [hungryAnimal, tiredAnimal], 0.05);

      // Each animal should have appropriate state
      const hungry = hungryAnimal.getComponent(ComponentType.Animal) as AnimalComponent;
      const tired = tiredAnimal.getComponent(ComponentType.Animal) as AnimalComponent;

      expect(hungry.state).toBe('foraging');
      expect(tired.state).toBe('sleeping');
    });
  });

  describe('Factory Function', () => {
    it('createAnimalBrainSystem returns working system', () => {
      const system = createAnimalBrainSystem();

      expect(system).toBeInstanceOf(AnimalBrainSystem);
      expect(system.id).toBe('animal-brain');
    });

    it('createAnimalBrainSystem accepts custom behaviors', () => {
      const customBehavior = new IdleBehavior();
      const customBehaviors = new Map([['drinking' as const, customBehavior]]);

      const system = createAnimalBrainSystem(customBehaviors);
      const behaviors = system.getBehaviors();

      expect(behaviors.has('drinking')).toBe(true);
    });
  });

  describe('Behavior Transitions', () => {
    it('animal returns to idle after fleeing with no threat', () => {
      const system = new AnimalBrainSystem();

      // Animal in fleeing state but no actual threat
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        stress: 60,
        state: 'fleeing',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system - flee behavior finds no threat
      system.update(harness.world, [animal], 0.05);

      // Should transition back to idle
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('idle');
    });

    it('fully rested animal becomes idle', () => {
      const system = new AnimalBrainSystem();

      // Animal that was sleeping but now fully rested
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        energy: 98,
        state: 'sleeping',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Should transition to idle
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('idle');
    });

    it('full animal becomes idle after eating', () => {
      const system = new AnimalBrainSystem();

      // Animal that was eating but now full
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent(createPositionComponent(50, 50));
      animal.addComponent(createMovementComponent());
      animal.addComponent(createTestAnimalComponent({
        hunger: 15,
        state: 'eating',
      }));
      (harness.world as any)._addEntity(animal);

      // Update the system
      system.update(harness.world, [animal], 0.05);

      // Should transition to idle
      const updatedAnimal = animal.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(updatedAnimal.state).toBe('idle');
    });
  });
});
