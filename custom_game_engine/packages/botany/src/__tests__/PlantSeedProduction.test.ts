import { describe, it, expect, beforeEach } from 'vitest';
import {
  World,
  PlantComponent,
  EntityImpl,
  createEntityId,
  EventBusImpl,
  ComponentType,
  type PlantSpecies,
} from '@ai-village/core';
import { PlantSystem } from '../systems/PlantSystem.js';
/**
 * Integration test for plant seed production
 * Tests that plants produce seeds correctly when transitioning through stages
 */
describe('PlantSeedProduction Integration', () => {
  let world: World;
  let plantSystem: PlantSystem;
  let eventBus: EventBusImpl;

  // Mock plant species with minimal lifecycle
  const testSpecies: PlantSpecies = {
    id: 'test-plant',
    name: 'Test Plant',
    category: 'grass',
    biomes: ['plains'],
    rarity: 'common',
    stageTransitions: [
      {
        from: 'vegetative',
        to: 'mature',
        baseDuration: 5,
        conditions: {},
        onTransition: [{ type: 'produce_seeds' }] // Should produce seeds here
      },
      {
        from: 'mature',
        to: 'seeding',
        baseDuration: 3,
        conditions: {},
        onTransition: [
          { type: 'produce_seeds' }, // Should produce MORE seeds here
          { type: 'drop_seeds', params: { radius: 3 } }
        ]
      }
    ],
    baseGenetics: {
      growthRate: 1.0,
      yieldAmount: 1.0, // 1:1 for easier calculation
      diseaseResistance: 50,
      droughtTolerance: 50,
      coldTolerance: 50,
      flavorProfile: 50,
      mutations: []
    },
    seedsPerPlant: 10, // Should produce 10 seeds per transition
    seedDispersalRadius: 3,
    requiresDormancy: false,
    optimalTemperatureRange: [10, 30],
    optimalMoistureRange: [30, 80],
    preferredSeasons: ['spring'],
    properties: {},
    sprites: {
      seed: 'test-seed',
      sprout: 'test-sprout',
      vegetative: 'test-vegetative',
      flowering: 'test-flowering',
      fruiting: 'test-fruiting',
      mature: 'test-mature',
      seeding: 'test-seeding',
      withered: 'test-withered'
    }
  };

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    plantSystem = new PlantSystem(eventBus);

    // Set species lookup
    plantSystem.setSpeciesLookup((id: string) => {
      if (id === 'test-plant') return testSpecies;
      throw new Error(`Unknown species: ${id}`);
    });

    // Note: WorldImpl doesn't have registerSystem, we'll call system.update directly
  });

  it('should produce seeds when transitioning vegetative → mature', () => {
    // Create plant in vegetative stage with NO seeds
    const plant = new PlantComponent({
      speciesId: 'test-plant',
      position: { x: 0, y: 0 },
      stage: 'vegetative',
      age: 5,
      health: 100,
      hydration: 100,
      nutrition: 100,
      genetics: { ...testSpecies.baseGenetics },
      seedsProduced: 0 // START WITH ZERO SEEDS
    });

    const entity = new EntityImpl(createEntityId(), 0);
    (entity as any).addComponent(plant);
    world.addEntity(entity);

    // Store entity ID on plant for logging
    (plant as any).entityId = entity.id;

    // Force plant to 100% progress so it transitions
    plant.stageProgress = 1.0;

    // Trigger day changed event to force update (use emitImmediate for synchronous execution)
    eventBus.emitImmediate({ type: 'time:day_changed', source: 'test', data: {} });

    // Run plant system update
    const entities = (world as any).query().with(ComponentType.Plant).executeEntities();
    plantSystem.update(world, entities, 0.1);

    // Plant should have transitioned to mature
    expect(plant.stage).toBe('mature');

    // Plant should have produced seeds
    expect(plant.seedsProduced).toBe(10); // seedsPerPlant * yieldAmount (10 * 1.0)
  });

  it('should produce MORE seeds when transitioning mature → seeding', () => {
    // Create plant already in mature stage WITH seeds from previous transition
    const plant = new PlantComponent({
      speciesId: 'test-plant',
      position: { x: 0, y: 0 },
      stage: 'mature',
      age: 10,
      health: 100,
      hydration: 100,
      nutrition: 100,
      genetics: { ...testSpecies.baseGenetics },
      seedsProduced: 10 // Already has 10 seeds from vegetative → mature
    });

    const entity = new EntityImpl(createEntityId(), 0);
    (entity as any).addComponent(plant);
    world.addEntity(entity);

    // Store entity ID on plant for logging
    (plant as any).entityId = entity.id;

    // Force plant to 100% progress
    plant.stageProgress = 1.0;

    // Trigger day changed event to force update
    eventBus.emitImmediate({ type: 'time:day_changed', source: 'test', data: {} });

    // Run plant system update
    const entities = (world as any).query().with(ComponentType.Plant).executeEntities();
    plantSystem.update(world, entities, 0.1);

    // Plant should have transitioned to seeding
    expect(plant.stage).toBe('seeding');

    // Plant should have produced MORE seeds (10 from before + 10 from this transition = 20)
    // BUT drop_seeds immediately disperses 30% of them (6 seeds), leaving 14
    expect(plant.seedsProduced).toBeGreaterThanOrEqual(14); // Approximately 70% of 20
    expect(plant.seedsProduced).toBeLessThanOrEqual(20); // Less than 20 due to dispersal
  });

  it('should produce seeds correctly through full lifecycle vegetative → mature → seeding', () => {
    // Create plant in vegetative stage starting from zero seeds
    const plant = new PlantComponent({
      speciesId: 'test-plant',
      position: { x: 0, y: 0 },
      stage: 'vegetative',
      age: 5,
      health: 100,
      hydration: 100,
      nutrition: 100,
      genetics: { ...testSpecies.baseGenetics },
      seedsProduced: 0 // Start with zero
    });

    const entity = new EntityImpl(createEntityId(), 0);
    (entity as any).addComponent(plant);
    world.addEntity(entity);

    // Store entity ID on plant for logging
    (plant as any).entityId = entity.id;

    // TRANSITION 1: vegetative → mature
    plant.stageProgress = 1.0;
    eventBus.emitImmediate({ type: 'time:day_changed', source: 'test', data: {} });
    let entities = (world as any).query().with(ComponentType.Plant).executeEntities();
    plantSystem.update(world, entities, 0.1);

    expect(plant.stage).toBe('mature');
    expect(plant.seedsProduced).toBe(10);

    // TRANSITION 2: mature → seeding
    plant.stageProgress = 1.0;
    eventBus.emitImmediate({ type: 'time:day_changed', source: 'test', data: {} });
    entities = (world as any).query().with(ComponentType.Plant).executeEntities();
    plantSystem.update(world, entities, 0.1);

    expect(plant.stage).toBe('seeding');

    // Should have 20 seeds total (10 from previous + 10 from this transition)
    // BUT drop_seeds disperses 30%, leaving approximately 14
    expect(plant.seedsProduced).toBeGreaterThanOrEqual(14);
    expect(plant.seedsProduced).toBeLessThanOrEqual(20);
  });
});
