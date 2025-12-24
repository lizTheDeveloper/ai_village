import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { AnimalComponent } from '../components/AnimalComponent.js';

describe('Animal Component and Entity', () => {
  let world: WorldImpl;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
  });

  describe('Acceptance Criterion 1: Animal Component and Entity', () => {
    it('should have all required properties when created', () => {
      const entity = world.createEntity();

      const animalData = {
        id: 'animal-1',
        speciesId: 'chicken',
        name: 'Clucky',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'infant' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      };

      const component = new AnimalComponent(animalData);
      entity.addComponent(component);
      const animal = entity.getComponent('animal') as AnimalComponent;

      expect(animal).toBeDefined();
      expect(animal.id).toBe('animal-1');
      expect(animal.speciesId).toBe('chicken');
      expect(animal.name).toBe('Clucky');
      expect(animal.position).toEqual({ x: 0, y: 0 });
      expect(animal.age).toBe(0);
      expect(animal.lifeStage).toBe('infant');
      expect(animal.health).toBe(100);
      expect(animal.size).toBe(1.0);
      expect(animal.state).toBe('idle');
      expect(animal.hunger).toBe(0);
      expect(animal.thirst).toBe(0);
      expect(animal.energy).toBe(100);
      expect(animal.stress).toBe(0);
      expect(animal.mood).toBe(50);
      expect(animal.wild).toBe(false);
      expect(animal.bondLevel).toBe(50);
      expect(animal.trustLevel).toBe(50);
    });

    it('should throw when required field "health" is missing', () => {
      const entity = world.createEntity();

      const invalidData = {
        id: 'animal-1',
        speciesId: 'chicken',
        name: 'Clucky',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'infant' as const,
        // health is missing - should crash
        size: 1.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      };

      expect(() => {
        new AnimalComponent(invalidData as any);
      }).toThrow();
    });

    it('should throw when required field "speciesId" is missing', () => {
      const entity = world.createEntity();

      const invalidData = {
        id: 'animal-1',
        // speciesId is missing - should crash
        name: 'Clucky',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'infant' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      };

      expect(() => {
        new AnimalComponent(invalidData as any);
      }).toThrow();
    });

    it('should throw when required field "hunger" is missing', () => {
      const entity = world.createEntity();

      const invalidData = {
        id: 'animal-1',
        speciesId: 'chicken',
        name: 'Clucky',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'infant' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        // hunger is missing - should crash
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      };

      expect(() => {
        new AnimalComponent(invalidData as any);
      }).toThrow();
    });

    it('should create a wild animal with ownership tracking', () => {
      const entity = world.createEntity();

      const wildAnimalData = {
        id: 'animal-2',
        speciesId: 'deer',
        name: 'Wild Deer',
        position: { x: 100, y: 100 },
        age: 365,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.8,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 80,
        stress: 10,
        mood: 60,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
      };

      const component = new AnimalComponent(wildAnimalData);
      entity.addComponent(component);
      const animal = entity.getComponent('animal') as AnimalComponent;

      expect(animal.wild).toBe(true);
      expect(animal.bondLevel).toBe(0);
      expect(animal.trustLevel).toBe(0);
      expect(animal.ownerId).toBeUndefined();
    });

    it('should create a tamed animal with owner tracking', () => {
      const entity = world.createEntity();

      const tamedAnimalData = {
        id: 'animal-3',
        speciesId: 'dog',
        name: 'Buddy',
        position: { x: 50, y: 50 },
        age: 730,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 70,
        stress: 5,
        mood: 80,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 75,
        trustLevel: 80,
      };

      const component = new AnimalComponent(tamedAnimalData);
      entity.addComponent(component);
      const animal = entity.getComponent('animal') as AnimalComponent;

      expect(animal.wild).toBe(false);
      expect(animal.ownerId).toBe('agent-1');
      expect(animal.bondLevel).toBe(75);
      expect(animal.trustLevel).toBe(80);
    });
  });

  describe('Life Stages', () => {
    it('should support all life stages: infant, juvenile, adult, elder', () => {
      const stages: Array<'infant' | 'juvenile' | 'adult' | 'elder'> = [
        'infant',
        'juvenile',
        'adult',
        'elder',
      ];

      stages.forEach((stage) => {
        const entity = world.createEntity();
        const animalData = {
          id: `animal-${stage}`,
          speciesId: 'chicken',
          name: `Chicken ${stage}`,
          position: { x: 0, y: 0 },
          age: 0,
          lifeStage: stage,
          health: 100,
          size: 1.0,
          state: 'idle' as const,
          hunger: 0,
          thirst: 0,
          energy: 100,
          stress: 0,
          mood: 50,
          wild: false,
          bondLevel: 50,
          trustLevel: 50,
        };

        const component = new AnimalComponent(animalData);
        entity.addComponent(component);
        const animal = entity.getComponent('animal') as AnimalComponent;
        expect(animal.lifeStage).toBe(stage);
      });
    });
  });

  describe('Animal States', () => {
    it('should support all animal states', () => {
      const states: Array<'idle' | 'sleeping' | 'eating' | 'drinking' | 'foraging' | 'fleeing'> = [
        'idle',
        'sleeping',
        'eating',
        'drinking',
        'foraging',
        'fleeing',
      ];

      states.forEach((state) => {
        const entity = world.createEntity();
        const animalData = {
          id: `animal-${state}`,
          speciesId: 'chicken',
          name: `Chicken ${state}`,
          position: { x: 0, y: 0 },
          age: 0,
          lifeStage: 'adult' as const,
          health: 100,
          size: 1.0,
          state: state,
          hunger: 0,
          thirst: 0,
          energy: 100,
          stress: 0,
          mood: 50,
          wild: false,
          bondLevel: 50,
          trustLevel: 50,
        };

        const component = new AnimalComponent(animalData);
        entity.addComponent(component);
        const animal = entity.getComponent('animal') as AnimalComponent;
        expect(animal.state).toBe(state);
      });
    });
  });
});
