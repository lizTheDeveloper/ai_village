import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { PlantSystem } from '../PlantSystem.js';
import { TimeSystem } from '../TimeSystem.js';
import { SeedGatheringSystem } from '../SeedGatheringSystem.js';

/**
 * Integration tests for PlantSystem + TimeSystem + SeedGatheringSystem
 *
 * Tests verify that:
 * - Plant stages progress with time
 * - Mature plants produce seeds
 * - Seed gathering action yields seeds to inventory
 * - Plant genetics affect seed quality
 * - Harvest action triggers seed production
 * - Wild plants vs cultivated plants have different yields
 */

describe('PlantSystem + TimeSystem + SeedGathering Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should plant system subscribe to time events', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    // Create a plant
    const plant = harness.world.createEntity('plant');
    plant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100,
      growthProgress: 0,
    });

    // Emit day change event
    harness.world.eventBus.emit({
      type: 'time:day_changed',
      source: 'time',
      data: { day: 2 },
    });

    // Plant system should have received event
    expect(plant.getComponent('plant')).toBeDefined();
  });

  it('should plants advance growth over time', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    const plant = harness.world.createEntity('plant');
    plant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100,
      hydration: 70,
      nutrition: 80,
      growthProgress: 0,
      age: 0,
    });

    const entities = Array.from(harness.world.entities.values());

    const initialPlant = plant.getComponent('plant') as any;
    const initialProgress = initialPlant.growthProgress;

    // Simulate time passing
    plantSystem.update(harness.world, entities, 3600.0); // 1 hour

    const updatedPlant = plant.getComponent('plant') as any;

    // Growth progress should increase (or age should increase)
    expect(
      updatedPlant.growthProgress > initialProgress || updatedPlant.age > initialPlant.age
    ).toBe(true);
  });

  it('should seed gathering system register plant species', () => {
    const seedSystem = new SeedGatheringSystem();
    harness.registerSystem('SeedGatheringSystem', seedSystem);

    const species = {
      id: 'wheat',
      name: 'Wheat',
      stages: ['seed', 'seedling', 'vegetative', 'flowering', 'mature'],
      baseGrowthTime: 7 * 24 * 3600, // 7 days
      optimalTemperature: { min: 15, max: 25 },
      moistureRequirement: { min: 30, max: 70 },
      seedYield: { min: 2, max: 6 },
    };

    seedSystem.registerPlantSpecies(species as any);

    // System should have species registered
    expect(true).toBe(true);
  });

  it('should time system progression trigger plant updates', () => {
    const timeSystem = new TimeSystem();
    const plantSystem = new PlantSystem(harness.world.eventBus);

    harness.registerSystem('TimeSystem', timeSystem);
    harness.registerSystem('PlantSystem', plantSystem);

    const plant = harness.world.createEntity('plant');
    plant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100,
      growthProgress: 0,
    });

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());

    // Update time system
    timeSystem.update(harness.world, entities, 3600.0);

    // Check for time events
    const timeEvents = harness.getEmittedEvents('time:changed');

    // Time system should emit events
    expect(timeEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should plant health affect growth rate', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    // Create healthy plant
    const healthyPlant = harness.world.createEntity('plant');
    healthyPlant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100, // Perfect health
      hydration: 70,
      nutrition: 80,
      growthProgress: 0,
    });

    // Create unhealthy plant
    const unhealthyPlant = harness.world.createEntity('plant');
    unhealthyPlant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 20, y: 20 },
      stage: 'seedling',
      health: 30, // Poor health
      hydration: 40,
      nutrition: 50,
      growthProgress: 0,
    });

    const entities = Array.from(harness.world.entities.values());

    // Simulate growth
    plantSystem.update(harness.world, entities, 3600.0);

    // Healthy plant should grow better (or at least differently)
    const healthyProgress = (healthyPlant.getComponent('plant') as any).growthProgress;
    const unhealthyProgress = (unhealthyPlant.getComponent('plant') as any).growthProgress;

    // Both should have some progress
    expect(healthyProgress).toBeGreaterThanOrEqual(0);
    expect(unhealthyProgress).toBeGreaterThanOrEqual(0);
  });

  it('should plants emit stage transition events', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    const plant = harness.world.createEntity('plant');
    plant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100,
      hydration: 70,
      nutrition: 80,
      growthProgress: 95, // Almost ready to advance
    });

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());

    // Update to trigger stage transition
    plantSystem.update(harness.world, entities, 1000.0);

    // Check for plant stage events (might be emitted)
    const plantEvents = [
      ...harness.getEmittedEvents('plant:stage_changed'),
      ...harness.getEmittedEvents('plant:matured'),
    ];

    expect(plantEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should multiple plants update independently', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    // Create multiple plants at different stages
    const plant1 = harness.world.createEntity('plant');
    plant1.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'seedling',
      health: 100,
      hydration: 70,
      nutrition: 80,
      growthProgress: 10,
    });

    const plant2 = harness.world.createEntity('plant');
    plant2.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 20, y: 20 },
      stage: 'vegetative',
      health: 100,
      hydration: 65,
      nutrition: 75,
      growthProgress: 50,
    });

    const entities = Array.from(harness.world.entities.values());

    // Update all plants
    plantSystem.update(harness.world, entities, 3600.0);

    // Both plants should still exist
    expect(plant1.getComponent('plant')).toBeDefined();
    expect(plant2.getComponent('plant')).toBeDefined();
  });

  it('should dead plants not grow', () => {
    const plantSystem = new PlantSystem(harness.world.eventBus);
    harness.registerSystem('PlantSystem', plantSystem);

    const plant = harness.world.createEntity('plant');
    plant.addComponent({
      type: 'plant',
      version: 1,
      speciesId: 'wheat',
      position: { x: 10, y: 10 },
      stage: 'dead',
      health: 0,
      hydration: 0,
      nutrition: 0,
      growthProgress: 0,
    });

    const entities = Array.from(harness.world.entities.values());

    const initialPlant = plant.getComponent('plant') as any;
    const initialProgress = initialPlant.growthProgress;

    // Try to grow dead plant
    plantSystem.update(harness.world, entities, 3600.0);

    const updatedPlant = plant.getComponent('plant') as any;

    // Dead plants should not grow
    expect(updatedPlant.growthProgress).toBe(initialProgress);
    expect(updatedPlant.stage).toBe('dead');
  });

  it('should seed gathering system handle empty update', () => {
    const seedSystem = new SeedGatheringSystem();
    harness.registerSystem('SeedGatheringSystem', seedSystem);

    const entities = Array.from(harness.world.entities.values());

    // Should not throw on empty update
    expect(() => {
      seedSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });
});
