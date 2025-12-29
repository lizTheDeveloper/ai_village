/**
 * Unit tests for Animal Behavior Module
 *
 * Tests the individual behavior classes and the AnimalBrainSystem.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '../../../ecs/Entity.js';
import { createPositionComponent } from '../../../components/PositionComponent.js';
import { createMovementComponent } from '../../../components/MovementComponent.js';
import type { AnimalComponent, AnimalState } from '../../../components/AnimalComponent.js';
import type { World } from '../../../ecs/World.js';

import {
  GrazeBehavior,
  FleeBehavior,
  RestBehavior,
  IdleBehavior,
  AnimalBrainSystem,
} from '../index.js';

// Helper to create a mock animal component
function createMockAnimal(overrides: Partial<AnimalComponent> = {}): AnimalComponent {
  return {
    type: 'animal',
    version: 1,
    id: 'test-animal',
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

// Helper to create a mock world
function createMockWorld(): World {
  return {
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockReturnValue([]),
    }),
    getEntity: vi.fn(),
  } as unknown as World;
}

// Helper to create an animal entity
function createAnimalEntity(animal: AnimalComponent): EntityImpl {
  const entity = new EntityImpl(createEntityId(), 0);
  entity.addComponent(createPositionComponent(50, 50));
  entity.addComponent(createMovementComponent());
  entity.addComponent(animal);
  return entity;
}

describe('AnimalBehavior Unit Tests', () => {
  describe('GrazeBehavior', () => {
    let graze: GrazeBehavior;

    beforeEach(() => {
      graze = new GrazeBehavior();
    });

    it('has correct name', () => {
      expect(graze.name).toBe('foraging');
    });

    it('canStart returns true when animal is hungry', () => {
      const entity = createAnimalEntity(createMockAnimal({ hunger: 60 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(graze.canStart(entity, animal)).toBe(true);
    });

    it('canStart returns false when animal is not hungry', () => {
      const entity = createAnimalEntity(createMockAnimal({ hunger: 30 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(graze.canStart(entity, animal)).toBe(false);
    });

    it('getPriority increases with hunger', () => {
      const lowHunger = createMockAnimal({ hunger: 45 });
      const highHunger = createMockAnimal({ hunger: 85 });

      const lowPriority = graze.getPriority(lowHunger);
      const highPriority = graze.getPriority(highHunger);

      expect(highPriority).toBeGreaterThan(lowPriority);
    });

    it('getPriority is zero when not hungry', () => {
      const notHungry = createMockAnimal({ hunger: 30 });
      expect(graze.getPriority(notHungry)).toBe(0);
    });

    it('execute completes when no longer hungry', () => {
      const entity = createAnimalEntity(createMockAnimal({ hunger: 15 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = graze.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('idle');
    });
  });

  describe('FleeBehavior', () => {
    let flee: FleeBehavior;

    beforeEach(() => {
      flee = new FleeBehavior();
    });

    it('has correct name', () => {
      expect(flee.name).toBe('fleeing');
    });

    it('canStart returns true when animal is stressed', () => {
      const entity = createAnimalEntity(createMockAnimal({ stress: 60 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(flee.canStart(entity, animal)).toBe(true);
    });

    it('canStart returns true for wild animal with low trust', () => {
      const entity = createAnimalEntity(createMockAnimal({ wild: true, trustLevel: 20, stress: 30 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(flee.canStart(entity, animal)).toBe(true);
    });

    it('canStart returns false for calm tame animal', () => {
      const entity = createAnimalEntity(createMockAnimal({ wild: false, trustLevel: 60, stress: 20 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(flee.canStart(entity, animal)).toBe(false);
    });

    it('getPriority increases with stress', () => {
      const lowStress = createMockAnimal({ stress: 30 });
      const highStress = createMockAnimal({ stress: 90 });

      const lowPriority = flee.getPriority(lowStress);
      const highPriority = flee.getPriority(highStress);

      expect(highPriority).toBeGreaterThan(lowPriority);
    });

    it('execute returns idle when no threat', () => {
      const entity = createAnimalEntity(createMockAnimal({ stress: 60 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = flee.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('idle');
    });
  });

  describe('RestBehavior', () => {
    let rest: RestBehavior;

    beforeEach(() => {
      rest = new RestBehavior();
    });

    it('has correct name', () => {
      expect(rest.name).toBe('sleeping');
    });

    it('canStart returns true when animal is tired', () => {
      const entity = createAnimalEntity(createMockAnimal({ energy: 30 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(rest.canStart(entity, animal)).toBe(true);
    });

    it('canStart returns false when animal has energy', () => {
      const entity = createAnimalEntity(createMockAnimal({ energy: 60 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(rest.canStart(entity, animal)).toBe(false);
    });

    it('getPriority increases as energy decreases', () => {
      const highEnergy = createMockAnimal({ energy: 35 });
      const lowEnergy = createMockAnimal({ energy: 10 });

      const highEnergyPriority = rest.getPriority(highEnergy);
      const lowEnergyPriority = rest.getPriority(lowEnergy);

      expect(lowEnergyPriority).toBeGreaterThan(highEnergyPriority);
    });

    it('getPriority is zero when not tired', () => {
      const rested = createMockAnimal({ energy: 60 });
      expect(rest.getPriority(rested)).toBe(0);
    });

    it('execute completes when fully rested', () => {
      const entity = createAnimalEntity(createMockAnimal({ energy: 96 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = rest.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('idle');
    });
  });

  describe('IdleBehavior', () => {
    let idle: IdleBehavior;

    beforeEach(() => {
      idle = new IdleBehavior();
    });

    it('has correct name', () => {
      expect(idle.name).toBe('idle');
    });

    it('canStart always returns true', () => {
      const entity = createAnimalEntity(createMockAnimal());
      const animal = entity.getComponent('animal') as AnimalComponent;
      expect(idle.canStart(entity, animal)).toBe(true);
    });

    it('getPriority is always 0', () => {
      const animal = createMockAnimal();
      expect(idle.getPriority(animal)).toBe(0);
    });

    it('execute transitions to foraging when hungry', () => {
      const entity = createAnimalEntity(createMockAnimal({ hunger: 60 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = idle.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('foraging');
    });

    it('execute transitions to sleeping when tired', () => {
      const entity = createAnimalEntity(createMockAnimal({ energy: 20 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = idle.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('sleeping');
    });

    it('execute transitions to drinking when thirsty', () => {
      const entity = createAnimalEntity(createMockAnimal({ thirst: 70 }));
      const animal = entity.getComponent('animal') as AnimalComponent;
      const world = createMockWorld();

      const result = idle.execute(entity, world, animal);

      expect(result.complete).toBe(true);
      expect(result.newState).toBe('drinking');
    });
  });

  describe('AnimalBrainSystem', () => {
    let system: AnimalBrainSystem;

    beforeEach(() => {
      system = new AnimalBrainSystem();
    });

    it('has correct id and priority', () => {
      expect(system.id).toBe('animal-brain');
      expect(system.priority).toBe(12);
    });

    it('requires animal, position, and movement components', () => {
      expect(system.requiredComponents).toContain('animal');
      expect(system.requiredComponents).toContain('position');
      expect(system.requiredComponents).toContain('movement');
    });

    it('has behaviors for all core states', () => {
      const behaviors = system.getBehaviors();
      expect(behaviors.has('idle')).toBe(true);
      expect(behaviors.has('sleeping')).toBe(true);
      expect(behaviors.has('foraging')).toBe(true);
      expect(behaviors.has('eating')).toBe(true);
      expect(behaviors.has('fleeing')).toBe(true);
    });

    it('can register custom behaviors', () => {
      const customBehavior = new IdleBehavior();
      system.registerBehavior('drinking', customBehavior);

      const behaviors = system.getBehaviors();
      expect(behaviors.has('drinking')).toBe(true);
    });
  });
});

describe('Behavior Priority Tests', () => {
  it('flee has higher priority than graze when stressed', () => {
    const animal = createMockAnimal({ hunger: 80, stress: 70 });

    const graze = new GrazeBehavior();
    const flee = new FleeBehavior();

    expect(flee.getPriority(animal)).toBeGreaterThan(graze.getPriority(animal));
  });

  it('rest has higher priority than idle when tired', () => {
    const animal = createMockAnimal({ energy: 15 });

    const rest = new RestBehavior();
    const idle = new IdleBehavior();

    expect(rest.getPriority(animal)).toBeGreaterThan(idle.getPriority(animal));
  });

  it('graze has higher priority than rest when hungrier than tired', () => {
    const animal = createMockAnimal({ hunger: 85, energy: 35 });

    const graze = new GrazeBehavior();
    const rest = new RestBehavior();

    expect(graze.getPriority(animal)).toBeGreaterThan(rest.getPriority(animal));
  });
});
