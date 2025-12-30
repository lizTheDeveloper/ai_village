import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { AnimalSystem } from '../systems/AnimalSystem.js';
import { ANIMAL_SPECIES } from '../data/animalSpecies.js';

import { ComponentType } from '../types/ComponentType.js';
describe('Animal System', () => {
  let world: WorldImpl;
  let animalSystem: AnimalSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    animalSystem = new AnimalSystem();
  });

  describe('Acceptance Criterion 2: Animal Species Definitions', () => {
    it('should have species data for chicken with all required properties', () => {
      const chicken = ANIMAL_SPECIES.chicken;

      expect(chicken).toBeDefined();
      expect(chicken.category).toBeDefined();
      expect(chicken.temperament).toBeDefined();
      expect(chicken.diet).toBeDefined();
      expect(chicken.socialStructure).toBeDefined();
      expect(chicken.activityPattern).toBeDefined();
      expect(chicken.canBeTamed).toBeDefined();
      expect(chicken.canBeRidden).toBeDefined();
      expect(chicken.canBeWorking).toBeDefined();
      expect(chicken.canBePet).toBeDefined();
    });

    it('should have species data for cow with all required properties', () => {
      const cow = ANIMAL_SPECIES.cow;

      expect(cow).toBeDefined();
      expect(cow.category).toBeDefined();
      expect(cow.temperament).toBeDefined();
      expect(cow.diet).toBeDefined();
      expect(cow.socialStructure).toBeDefined();
      expect(cow.activityPattern).toBeDefined();
      expect(cow.canBeTamed).toBeDefined();
    });

    it('should have species data for sheep with all required properties', () => {
      const sheep = ANIMAL_SPECIES.sheep;

      expect(sheep).toBeDefined();
      expect(sheep.category).toBeDefined();
      expect(sheep.temperament).toBeDefined();
      expect(sheep.diet).toBeDefined();
    });

    it('should have species data for horse with all required properties', () => {
      const horse = ANIMAL_SPECIES.horse;

      expect(horse).toBeDefined();
      expect(horse.category).toBeDefined();
      expect(horse.temperament).toBeDefined();
      expect(horse.diet).toBeDefined();
      expect(horse.canBeRidden).toBe(true);
    });

    it('should have species data for dog with all required properties', () => {
      const dog = ANIMAL_SPECIES.dog;

      expect(dog).toBeDefined();
      expect(dog.category).toBeDefined();
      expect(dog.temperament).toBeDefined();
      expect(dog.diet).toBeDefined();
      expect(dog.canBePet).toBe(true);
      expect(dog.canBeTamed).toBe(true);
    });

    it('should have at least 8 realistic animal species', () => {
      const speciesCount = Object.keys(ANIMAL_SPECIES).length;
      expect(speciesCount).toBeGreaterThanOrEqual(8);

      // Verify specific species exist
      expect(ANIMAL_SPECIES.chicken).toBeDefined();
      expect(ANIMAL_SPECIES.cow).toBeDefined();
      expect(ANIMAL_SPECIES.sheep).toBeDefined();
      expect(ANIMAL_SPECIES.horse).toBeDefined();
      expect(ANIMAL_SPECIES.dog).toBeDefined();
      expect(ANIMAL_SPECIES.cat).toBeDefined();
      expect(ANIMAL_SPECIES.rabbit).toBeDefined();
      expect(ANIMAL_SPECIES.deer).toBeDefined();
    });
  });

  describe('Acceptance Criterion 4: Animal AI - Basic Behaviors', () => {
    it('should transition to eating state when hunger is high', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-1',
        speciesId: 'chicken',
        name: 'Hungry Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 80, // High hunger
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const entities = [entity];
      animalSystem.update(world, entities, 1);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(animal.state).toBe('eating');
    });

    it('should transition to drinking state when thirst is high', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-2',
        speciesId: 'cow',
        name: 'Thirsty Cow',
        position: { x: 0, y: 0 },
        age: 200,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 85, // High thirst
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(animal.state).toBe('drinking');
    });

    it('should transition to sleeping state when energy is low', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-3',
        speciesId: 'dog',
        name: 'Tired Dog',
        position: { x: 0, y: 0 },
        age: 300,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 15, // Low energy
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(animal.state).toBe('sleeping');
    });

    it('should transition to fleeing state when stress is very high', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-4',
        speciesId: 'rabbit',
        name: 'Scared Rabbit',
        position: { x: 0, y: 0 },
        age: 50,
        lifeStage: 'adult' as const,
        health: 100,
        size: 0.8,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 80,
        stress: 95, // Very high stress
        mood: 20,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
      });
      entity.addComponent(component);

      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      expect(animal.state).toBe('fleeing');
    });
  });

  describe('Acceptance Criterion 10: Animal State Transitions', () => {
    it('should increase hunger over time', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-5',
        speciesId: 'sheep',
        name: 'Grazing Sheep',
        position: { x: 0, y: 0 },
        age: 150,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.3,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      const initialHunger = animal.hunger;

      // Update for multiple ticks (simulate time passing)
      for (let i = 0; i < 100; i++) {
        const entities = world.query().with(ComponentType.Animal).executeEntities();
        animalSystem.update(world, entities, 1);
      }

      const finalHunger = animal.hunger;
      expect(finalHunger).toBeGreaterThan(initialHunger);
    });

    it('should increase thirst over time', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-6',
        speciesId: 'horse',
        name: 'Running Horse',
        position: { x: 0, y: 0 },
        age: 400,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.5,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      const initialThirst = animal.thirst;

      // Update for multiple ticks
      for (let i = 0; i < 100; i++) {
        const entities = world.query().with(ComponentType.Animal).executeEntities();
        animalSystem.update(world, entities, 1);
      }

      const finalThirst = animal.thirst;
      expect(finalThirst).toBeGreaterThan(initialThirst);
    });

    it('should decrease energy over time when active', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-7',
        speciesId: 'dog',
        name: 'Active Dog',
        position: { x: 0, y: 0 },
        age: 200,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.5,
        state: 'foraging' as const, // Active state
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      const initialEnergy = animal.energy;

      // Update for multiple ticks
      for (let i = 0; i < 50; i++) {
        const entities = world.query().with(ComponentType.Animal).executeEntities();
        animalSystem.update(world, entities, 1);
      }

      const finalEnergy = animal.energy;
      expect(finalEnergy).toBeLessThan(initialEnergy);
    });

    it('should restore energy when sleeping', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-8',
        speciesId: 'cat',
        name: 'Sleeping Cat',
        position: { x: 0, y: 0 },
        age: 150,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'sleeping' as const,
        hunger: 0,
        thirst: 0,
        energy: 20, // Low energy (< 25 threshold) so animal stays sleeping
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      const initialEnergy = animal.energy;

      // Update for multiple ticks
      for (let i = 0; i < 50; i++) {
        const entities = world.query().with(ComponentType.Animal).executeEntities();
        animalSystem.update(world, entities, 1);
      }

      const finalEnergy = animal.energy;
      expect(finalEnergy).toBeGreaterThan(initialEnergy);
    });

    it('should emit life_stage_changed event when animal matures', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('life_stage_changed', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-9',
        speciesId: 'chicken',
        name: 'Young Chicken',
        position: { x: 0, y: 0 },
        age: 6.9, // Just before juvenile stage (chicken infantDuration is 7 days)
        lifeStage: 'infant' as const,
        health: 100,
        size: 0.5,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 50,
        wild: false,
        bondLevel: 50,
        trustLevel: 50,
      });
      entity.addComponent(component);

      // Advance time to trigger maturation (simulate 1 day passing)
      // deltaTime in seconds: 86400 seconds = 1 day
      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 86400);

      // Flush event queue to dispatch queued events
      world.eventBus.flush();

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('Acceptance Criterion 11: Wild Animal Reactions', () => {
    it('should make skittish animal flee when approached', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-10',
        speciesId: 'rabbit', // Skittish species
        name: 'Wild Rabbit',
        position: { x: 10, y: 10 },
        age: 50,
        lifeStage: 'adult' as const,
        health: 100,
        size: 0.8,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 80,
        stress: 0,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
      });
      entity.addComponent(component);

      // Simulate agent approaching (increase stress)
      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      animal.stress = 85; // High enough to trigger fleeing

      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);

      expect(animal.state).toBe('fleeing');
    });

    it('should make docile animal observe when approached', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'animal-11',
        speciesId: 'sheep', // Docile species
        name: 'Wild Sheep',
        position: { x: 20, y: 20 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.3,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 80,
        stress: 20, // Moderate stress from approach
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
      });
      entity.addComponent(component);

      const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);

      const animal = entity.getComponent(ComponentType.Animal) as AnimalComponent;
      // Docile animals should not flee at moderate stress
      expect(animal.state).not.toBe('fleeing');
    });
  });

  describe('Error Handling - Acceptance Criterion 12', () => {
    it('should throw when processing animal with missing health field', () => {
      const entity = world.createEntity();
      const invalidAnimal = {
        type: ComponentType.Animal, // Required for query to find it
        version: 1,
        id: 'invalid-animal',
        speciesId: 'chicken',
        name: 'Invalid',
        position: { x: 0, y: 0 },
        age: 0,
        lifeStage: 'adult' as const,
        // health is missing - this should trigger error
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

      // Force add invalid component for testing
      (entity as any).components.set('animal', invalidAnimal);

      expect(() => {
        const entities = world.query().with(ComponentType.Animal).executeEntities();
      animalSystem.update(world, entities, 1);
      }).toThrow();
    });
  });
});
