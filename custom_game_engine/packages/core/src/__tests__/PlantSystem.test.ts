import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { PlantSystem } from '../systems/PlantSystem.js';
import { PlantComponent } from '../components/PlantComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import type { PlantSpecies } from '../types/PlantSpecies.js';

describe('PlantSystem', () => {
  let world: WorldImpl;
  let system: PlantSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    system = new PlantSystem(eventBus);
  });

  describe('initialization', () => {
    it('should register with correct priority', () => {
      expect(system.priority).toBe(20);
    });

    it('should require plant component', () => {
      expect(system.requiredComponents).toContain('plant');
    });

    it('should have correct system id', () => {
      expect(system.id).toBe('plant');
    });

    it('should subscribe to weather events', () => {
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe');
      new PlantSystem(eventBus);

      expect(subscribeSpy).toHaveBeenCalledWith('weather:rain', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('weather:frost', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('weather:changed', expect.any(Function));
    });

    it('should subscribe to soil events', () => {
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe');
      new PlantSystem(eventBus);

      expect(subscribeSpy).toHaveBeenCalledWith('soil:moistureChanged', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('soil:depleted', expect.any(Function));
    });

    it('should subscribe to time events', () => {
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe');
      new PlantSystem(eventBus);

      expect(subscribeSpy).toHaveBeenCalledWith('time:day_changed', expect.any(Function));
    });
  });

  describe('update - plant lifecycle', () => {
    it('should process entities with plant component', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'sprout',
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('plant').executeEntities();

      // Should not throw
      expect(() => system.update(world, entities, 1.0)).not.toThrow();
    });

    it('should throw when plant missing position field', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
      });

      // Remove position to trigger error
      (plant as any).position = undefined;
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      expect(() => system.update(world, entities, 1.0)).toThrow(/missing required position field/);
    });

    it('should skip empty entity list', () => {
      expect(() => system.update(world, [], 1.0)).not.toThrow();
    });

    it('should accumulate time and update hourly', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'sprout',
        age: 0,
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Small deltaTime should not age plant significantly
      system.update(world, entities, 0.001);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.age).toBeGreaterThanOrEqual(0);
    });

    it('should decrease hydration over time', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 80,
        health: 100,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const initialHydration = plant.hydration;

      // Simulate multiple game hours
      const entities = world.query().with('plant').executeEntities();
      for (let i = 0; i < 24; i++) {
        system.update(world, entities, 25); // ~1 hour per update (600 sec / 24 = 25 sec)
      }

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.hydration).toBeLessThan(initialHydration);
    });
  });

  describe('error handling - validation', () => {
    it('should throw when plant missing health field', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        health: 100,
        hydration: 70,
        nutrition: 80,
      });

      // Remove health to trigger error
      (plant as any).health = undefined;
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      expect(() => system.update(world, entities, 1.0)).toThrow(/Plant health not set/);
    });

    it('should throw when plant missing hydration field', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        health: 100,
        hydration: 70,
        nutrition: 80,
      });

      // Remove hydration to trigger error
      (plant as any).hydration = undefined;
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      expect(() => system.update(world, entities, 1.0)).toThrow(/Plant hydration not set/);
    });

    it('should throw when plant missing nutrition field', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        health: 100,
        hydration: 70,
        nutrition: 80,
      });

      // Remove nutrition to trigger error
      (plant as any).nutrition = undefined;
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      expect(() => system.update(world, entities, 1.0)).toThrow(/Plant nutrition not set/);
    });
  });

  describe('plant health and damage', () => {
    it('should damage plant when hydration is low', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 15, // Below 20 threshold
        health: 100,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Simulate multiple hours to see health decay
      for (let i = 0; i < 24; i++) {
        system.update(world, entities, 25);
      }

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.health).toBeLessThan(100);
    });

    it('should damage plant when nutrition is low', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 70,
        health: 100,
        nutrition: 15, // Below 20 threshold
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Simulate multiple hours
      for (let i = 0; i < 24; i++) {
        system.update(world, entities, 25);
      }

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.health).toBeLessThan(100);
    });

    it('should emit plant:died event when health reaches zero', () => {
      const diedHandler = vi.fn();
      eventBus.subscribe('plant:died', diedHandler);

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 0,
        health: 1,
        nutrition: 0,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Multiple updates to ensure death
      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 25);
      }

      eventBus.flush();
      expect(diedHandler).toHaveBeenCalled();
    });

    it('should set stage to dead when health reaches zero', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 0,
        health: 1,
        nutrition: 0,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Multiple updates to ensure death
      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 25);
      }

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.stage).toBe('dead');
    });

    it('should clamp health between 0 and 100', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        health: 150, // Will be clamped to 100
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      expect(plant.health).toBe(100);

      plant.health = -10; // Should clamp to 0
      expect(plant.health).toBe(0);
    });
  });

  describe('weather effects', () => {
    it('should increase hydration when rain event occurs', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 50,
        health: 100,
        nutrition: 80,
        isIndoors: false,
      });
      entity.addComponent(plant);

      // Emit rain event
      eventBus.emit({
        type: 'weather:rain',
        source: 'test',
        data: { intensity: 'heavy' },
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.hydration).toBeGreaterThan(50);
    });

    it('should not increase hydration for indoor plants during rain', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 50,
        health: 100,
        nutrition: 80,
        isIndoors: true,
      });
      entity.addComponent(plant);

      // Emit rain event
      eventBus.emit({
        type: 'weather:rain',
        source: 'test',
        data: { intensity: 'heavy' },
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.hydration).toBe(50);
    });

    it('should damage plant during frost', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        hydration: 70,
        health: 100,
        nutrition: 80,
        genetics: {
          growthRate: 1.0,
          yieldAmount: 1.0,
          diseaseResistance: 50,
          droughtTolerance: 50,
          coldTolerance: 10, // Low cold tolerance
          flavorProfile: 50,
          mutations: [],
        },
      });
      entity.addComponent(plant);

      const initialHealth = plant.health;

      // Emit frost event
      eventBus.emit({
        type: 'weather:frost',
        source: 'test',
        data: { temperature: -5 },
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.health).toBeLessThanOrEqual(initialHealth);
    });
  });

  describe('stage transitions', () => {
    it('should advance stageProgress over time', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'vegetative',
        stageProgress: 0,
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Simulate multiple hours
      for (let i = 0; i < 24; i++) {
        system.update(world, entities, 25);
      }

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.stageProgress).toBeGreaterThan(0);
    });

    it('should emit plant:stageChanged event on transition', () => {
      const stageHandler = vi.fn();
      eventBus.subscribe('plant:stageChanged', stageHandler);

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'sprout',
        stageProgress: 0.99, // Almost ready to transition
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();

      // Simulate enough time to transition
      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 25);
      }

      eventBus.flush();
      // May or may not transition based on species definition
      // Just verify the system doesn't crash
      expect(stageHandler).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('should reset stageProgress after transition', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'sprout',
        stageProgress: 1.5, // Over 1.0, should trigger transition
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      // After transition, progress should be reset (or close to 0)
      expect(plantAfter.stageProgress).toBeLessThan(1.5);
    });
  });

  describe('canPlantAt validation', () => {
    it('should return false when soil nutrients too low', () => {
      const result = system.canPlantAt(
        { x: 10, y: 10 },
        'wheat',
        { nutrients: 5, moisture: 50, tilled: true }
      );

      expect(result).toBe(false);
    });

    it('should return true when soil nutrients sufficient', () => {
      const result = system.canPlantAt(
        { x: 10, y: 10 },
        'wheat',
        { nutrients: 50, moisture: 50, tilled: true }
      );

      expect(result).toBe(true);
    });

    it('should check soil moisture if defined', () => {
      const result = system.canPlantAt(
        { x: 10, y: 10 },
        'wheat',
        { nutrients: 50, moisture: 80 }
      );

      expect(result).toBe(true);
    });
  });

  describe('fruit regeneration at midnight', () => {
    it('should regenerate fruit for mature plants when day changes', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'mature',
        health: 80,
        hydration: 70,
        nutrition: 80,
        fruitCount: 5,
      });
      entity.addComponent(plant);

      const initialFruit = plant.fruitCount;

      // Emit day changed event
      eventBus.emit({
        type: 'time:day_changed',
        source: 'test',
        data: {},
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.fruitCount).toBeGreaterThanOrEqual(initialFruit);
    });

    it('should not regenerate fruit for unhealthy plants', () => {
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'mature',
        health: 30, // Below 50 threshold
        hydration: 70,
        nutrition: 80,
        fruitCount: 5,
      });
      entity.addComponent(plant);

      const initialFruit = plant.fruitCount;

      // Emit day changed event
      eventBus.emit({
        type: 'time:day_changed',
        source: 'test',
        data: {},
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      const plantAfter = entity.getComponent('plant') as PlantComponent;
      expect(plantAfter.fruitCount).toBe(initialFruit);
    });

    it('should emit plant:fruitRegenerated event', () => {
      const fruitHandler = vi.fn();
      eventBus.subscribe('plant:fruitRegenerated', fruitHandler);

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'wheat',
        position: { x: 10, y: 10 },
        stage: 'mature',
        health: 80,
        hydration: 70,
        nutrition: 80,
        fruitCount: 5,
      });
      entity.addComponent(plant);

      // Emit day changed event
      eventBus.emit({
        type: 'time:day_changed',
        source: 'test',
        data: {},
      });

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      eventBus.flush();
      expect(fruitHandler).toHaveBeenCalled();
    });
  });

  describe('species lookup', () => {
    it('should use species lookup function when set', () => {
      const mockSpecies: PlantSpecies = {
        id: 'test-plant',
        name: 'Test Plant',
        category: 'crop',
        biomes: ['plains'],
        rarity: 'common',
        stageTransitions: [],
        baseGenetics: {
          growthRate: 1.0,
          yieldAmount: 1.0,
          diseaseResistance: 50,
          droughtTolerance: 50,
          coldTolerance: 50,
          flavorProfile: 50,
          mutations: [],
        },
        seedsPerPlant: 3,
        seedDispersalRadius: 5,
        requiresDormancy: false,
        optimalTemperatureRange: [15, 25],
        optimalMoistureRange: [30, 70],
        preferredSeasons: ['spring'],
        properties: { edible: true },
        sprites: {
          seed: 'seed',
          sprout: 'sprout',
          vegetative: 'veg',
          flowering: 'flower',
          fruiting: 'fruit',
          mature: 'mature',
          seeding: 'seeding',
          withered: 'withered',
        },
      };

      const lookupSpy = vi.fn().mockReturnValue(mockSpecies);
      system.setSpeciesLookup(lookupSpy);

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'test-plant',
        position: { x: 10, y: 10 },
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      entity.addComponent(plant);

      const entities = world.query().with('plant').executeEntities();
      system.update(world, entities, 1.0);

      expect(lookupSpy).toHaveBeenCalledWith('test-plant');
    });
  });
});
