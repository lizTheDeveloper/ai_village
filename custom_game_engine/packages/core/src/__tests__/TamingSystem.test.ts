import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { TamingSystem } from '../systems/TamingSystem.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ANIMAL_SPECIES } from '../data/animalSpecies.js';

describe('Taming System', () => {
  let world: WorldImpl;
  let tamingSystem: TamingSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    tamingSystem = new TamingSystem();
    tamingSystem.setWorld(world);
  });

  describe('Acceptance Criterion 5: Taming System - Feeding Method', () => {
    it('should calculate taming chance based on species tameDifficulty', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-1',
        speciesId: 'rabbit', // Easy to tame
        name: 'Wild Rabbit',
        position: { x: 0, y: 0 },
        age: 50,
        lifeStage: 'adult' as const,
        health: 100,
        size: 0.8,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 20,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 20,
      });
      entity.addComponent(component);

      const tameChance = tamingSystem.calculateTameChance(
        entity.id,
        'agent-1',
        'feeding',
        'carrot' // Preferred food
      );

      expect(tameChance).toBeGreaterThan(0);
      expect(tameChance).toBeLessThanOrEqual(100);
    });

    it('should have higher taming chance with preferred food', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-2',
        speciesId: 'horse',
        name: 'Wild Horse',
        position: { x: 10, y: 10 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 50,
        thirst: 0,
        energy: 80,
        stress: 30,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 10,
      });
      entity.addComponent(component);

      const preferredChance = tamingSystem.calculateTameChance(
        entity.id,
        'agent-1',
        'feeding',
        'apple' // Preferred by horses
      );

      const nonPreferredChance = tamingSystem.calculateTameChance(
        entity.id,
        'agent-1',
        'feeding',
        'grass' // Not preferred
      );

      expect(preferredChance).toBeGreaterThan(nonPreferredChance);
    });

    it('should have higher taming chance with higher trust level', () => {
      const lowTrustEntity = world.createEntity();
      const lowTrustComponent = new AnimalComponent({
        id: 'animal-3a',
        speciesId: 'horse',
        name: 'Wary Horse',
        position: { x: 0, y: 0 },
        age: 200,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 20,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 0, // Very low trust
      });
      lowTrustEntity.addComponent(lowTrustComponent);

      const highTrustEntity = world.createEntity();
      const highTrustComponent = new AnimalComponent({
        id: 'animal-3b',
        speciesId: 'horse',
        name: 'Trusting Horse',
        position: { x: 0, y: 0 },
        age: 200,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 20,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 40, // Moderate trust
      });
      highTrustEntity.addComponent(highTrustComponent);

      const lowTrustChance = tamingSystem.calculateTameChance(
        lowTrustEntity.id,
        'agent-1',
        'patience' // Lower method bonus (10) to avoid cap
      );

      const highTrustChance = tamingSystem.calculateTameChance(
        highTrustEntity.id,
        'agent-1',
        'patience' // Lower method bonus (10) to avoid cap
      );

      expect(highTrustChance).toBeGreaterThan(lowTrustChance);
    });

    it('should successfully tame animal when attempt succeeds', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('animal_tamed', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-4',
        speciesId: 'chicken',
        name: 'Wild Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 10,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 40,
      });
      entity.addComponent(component);

      // Force taming success by mocking random
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // Very low random = success

      const result = tamingSystem.attemptTame(
        entity.id,
        'agent-1',
        'feeding',
        'grain'
      );

      // Flush the event queue to dispatch events
      eventBus.flush();

      expect(result.success).toBe(true);

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.wild).toBe(false);
      expect(animal.ownerId).toBe('agent-1');
      expect(animal.bondLevel).toBeGreaterThan(0);
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'animal_tamed',
          source: 'agent-1',
          data: expect.objectContaining({
            animalId: 'animal-4',
            agentId: 'agent-1',
            method: 'feeding',
          }),
        })
      );
    });

    it('should increase trust level on failed taming attempt', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-5',
        speciesId: 'dog',
        name: 'Wild Wolf',
        position: { x: 0, y: 0 },
        age: 300,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.8,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 30,
        mood: 40,
        wild: true,
        bondLevel: 0,
        trustLevel: 5,
      });
      entity.addComponent(component);

      const initialAnimal = entity.getComponent('animal') as AnimalComponent;
      const initialTrust = initialAnimal.trustLevel;

      // Force taming failure
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // Very high random = failure

      const result = tamingSystem.attemptTame(
        entity.id,
        'agent-1',
        'feeding',
        'meat'
      );

      expect(result.success).toBe(false);

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.wild).toBe(true);
      expect(animal.trustLevel).toBeGreaterThan(initialTrust);
    });
  });

  describe('Acceptance Criterion 6: Bond System', () => {
    it('should increase bond level by 2 when feeding', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-6',
        speciesId: 'cow',
        name: 'Bessie',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.0,
        state: 'idle' as const,
        hunger: 40,
        thirst: 0,
        energy: 80,
        stress: 5,
        mood: 60,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 40,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const initialAnimal = entity.getComponent('animal') as AnimalComponent;
      const initialBond = initialAnimal.bondLevel;

      tamingSystem.performInteraction(entity.id, 'agent-1', 'feeding');

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.bondLevel).toBe(initialBond + 2);
    });

    it('should increase bond level by 3 when grooming', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-7',
        speciesId: 'horse',
        name: 'Thunder',
        position: { x: 0, y: 0 },
        age: 600,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 50,
        trustLevel: 60,
      });
      entity.addComponent(component);

      const initialAnimal = entity.getComponent('animal') as AnimalComponent;
      const initialBond = initialAnimal.bondLevel;

      tamingSystem.performInteraction(entity.id, 'agent-1', 'grooming');

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.bondLevel).toBe(initialBond + 3);
    });

    it('should increase bond level by 4 when playing', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-8',
        speciesId: 'dog',
        name: 'Buddy',
        position: { x: 0, y: 0 },
        age: 300,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 0,
        mood: 80,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 60,
        trustLevel: 70,
      });
      entity.addComponent(component);

      const initialAnimal = entity.getComponent('animal') as AnimalComponent;
      const initialBond = initialAnimal.bondLevel;

      tamingSystem.performInteraction(entity.id, 'agent-1', 'playing');

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.bondLevel).toBe(initialBond + 4);
    });

    it('should increase bond level by 10 when rescuing', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-9',
        speciesId: 'cat',
        name: 'Whiskers',
        position: { x: 0, y: 0 },
        age: 200,
        lifeStage: 'adult' as const,
        health: 50, // Injured
        size: 1.0,
        state: 'idle' as const,
        hunger: 60,
        thirst: 50,
        energy: 30,
        stress: 70,
        mood: 30,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 30,
        trustLevel: 40,
      });
      entity.addComponent(component);

      const initialAnimal = entity.getComponent('animal') as AnimalComponent;
      const initialBond = initialAnimal.bondLevel;

      tamingSystem.performInteraction(entity.id, 'agent-1', 'rescuing');

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.bondLevel).toBe(initialBond + 10);
    });

    it('should cap bond level at 100', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-10',
        speciesId: 'dog',
        name: 'Max Bond Dog',
        position: { x: 0, y: 0 },
        age: 400,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 90,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 98, // Close to max
        trustLevel: 100,
      });
      entity.addComponent(component);

      tamingSystem.performInteraction(entity.id, 'agent-1', 'playing'); // +4

      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(animal.bondLevel).toBe(100); // Capped
    });

    it('should emit bond_level_changed event when bond increases across threshold', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('bond_level_changed', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-11',
        speciesId: 'sheep',
        name: 'Fluffy',
        position: { x: 0, y: 0 },
        age: 150,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.3,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 5,
        mood: 60,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 39, // Just below threshold (21-40 is 'accepting')
        trustLevel: 55,
      });
      entity.addComponent(component);

      tamingSystem.performInteraction(entity.id, 'agent-1', 'feeding'); // +2 brings to 41 ('friendly')

      // Flush the event queue to dispatch events
      eventBus.flush();

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bond_level_changed',
          source: 'agent-1',
          data: expect.objectContaining({
            animalId: 'animal-11',
            agentId: 'agent-1',
            oldLevel: 'accepting',
            newLevel: 'friendly',
            bondLevel: 41,
          }),
        })
      );
    });
  });

  describe('Bond Level Categories', () => {
    it('should recognize wary bond level (0-20)', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-12',
        speciesId: 'rabbit',
        name: 'Wary Rabbit',
        position: { x: 0, y: 0 },
        age: 50,
        lifeStage: 'adult' as const,
        health: 100,
        size: 0.8,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 15,
        mood: 40,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 15,
        trustLevel: 20,
      });
      entity.addComponent(component);

      const bondCategory = tamingSystem.getBondCategory(entity.id);
      expect(bondCategory).toBe('wary');
    });

    it('should recognize accepting bond level (21-40)', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-13',
        speciesId: 'chicken',
        name: 'Accepting Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 10,
        mood: 50,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 30,
        trustLevel: 35,
      });
      entity.addComponent(component);

      const bondCategory = tamingSystem.getBondCategory(entity.id);
      expect(bondCategory).toBe('accepting');
    });

    it('should recognize friendly bond level (41-60)', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-14',
        speciesId: 'dog',
        name: 'Friendly Dog',
        position: { x: 0, y: 0 },
        age: 300,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 20,
        thirst: 0,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 50,
        trustLevel: 55,
      });
      entity.addComponent(component);

      const bondCategory = tamingSystem.getBondCategory(entity.id);
      expect(bondCategory).toBe('friendly');
    });

    it('should recognize loyal bond level (61-80)', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-15',
        speciesId: 'horse',
        name: 'Loyal Horse',
        position: { x: 0, y: 0 },
        age: 600,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 10,
        thirst: 0,
        energy: 90,
        stress: 0,
        mood: 80,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 70,
        trustLevel: 75,
      });
      entity.addComponent(component);

      const bondCategory = tamingSystem.getBondCategory(entity.id);
      expect(bondCategory).toBe('loyal');
    });

    it('should recognize bonded level (81-100)', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-16',
        speciesId: 'dog',
        name: 'Bonded Dog',
        position: { x: 0, y: 0 },
        age: 400,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 90,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 90,
        trustLevel: 95,
      });
      entity.addComponent(component);

      const bondCategory = tamingSystem.getBondCategory(entity.id);
      expect(bondCategory).toBe('bonded');
    });
  });

  describe('Error Handling', () => {
    it('should throw when attempting to tame animal with missing speciesId', () => {
      const entity = world.createEntity();
      const invalidAnimal = {
        id: 'invalid-animal',
        // speciesId missing
        name: 'Invalid',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
      };

      entity.components?.set('animal', invalidAnimal) || (() => { throw new Error('Invalid state'); })();

      expect(() => {
        tamingSystem.attemptTame(entity.id, 'agent-1', 'feeding', 'food');
      }).toThrow();
    });
  });
});
