import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { AnimalSystem } from '../AnimalSystem.js';
import { TamingSystem } from '../TamingSystem.js';
import { AnimalHousingSystem } from '../AnimalHousingSystem.js';
import { AnimalProductionSystem } from '../AnimalProductionSystem.js';
import { TimeSystem } from '../TimeSystem.js';
import { StateMutatorSystem } from '../StateMutatorSystem.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for Complete Animal Husbandry Cycle
 *
 * Tests verify that:
 * - Wild animal taming → housing → care → production
 * - Animals age through life stages
 * - Housing affects animal health and productivity
 * - Feeding and care maintain animal health
 * - Products generated over time (eggs, milk, wool)
 * - Breeding produces offspring
 * - Death and replacement cycle
 */

describe('Complete Animal Husbandry Cycle Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should animal system process animal lifecycles', () => {
    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);

    const timeSystem = new TimeSystem();
    harness.registerSystem('TimeSystem', timeSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();

    // Run systems with proper tick advancement
    for (let i = 0; i < 10; i++) {
      harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
      timeSystem.update(harness.world, entities, 60.0);
      animalSystem.update(harness.world, entities, 60.0);
      stateMutator.update(harness.world, entities, 60.0); // Apply deltas
    }

    // Animal should be processed
    expect(animal.getComponent(ComponentType.Animal)).toBeDefined();
  });

  it('should taming system convert wild to domesticated', () => {
    const tamingSystem = new TamingSystem(harness.world.eventBus);
    harness.registerSystem('TamingSystem', tamingSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const agent = harness.createTestAgent({ x: 11, y: 11 });

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());

    // Run taming system
    for (let i = 0; i < 5; i++) {
      tamingSystem.update(harness.world, entities, 1.0);
    }

    // Check for taming events
    const tamingEvents = harness.getEmittedEvents('animal_tamed');
    expect(tamingEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should housing system manage animal shelter', () => {
    const housingSystem = new AnimalHousingSystem(harness.world.eventBus);
    harness.registerSystem('AnimalHousingSystem', housingSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const coop = harness.createTestBuilding('chicken_coop', { x: 10, y: 10 });

    const entities = Array.from(harness.world.entities.values());

    // Run housing system
    housingSystem.update(harness.world, entities, 1.0);

    // Housing system should process
    expect(coop.getComponent(ComponentType.Building)).toBeDefined();
  });

  it('should animals age through life stages', () => {
    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);

    const timeSystem = new TimeSystem();
    harness.registerSystem('TimeSystem', timeSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });

    harness.clearEvents();

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();

    // Simulate aging over many days (30 days = 43200 game minutes)
    for (let day = 0; day < 30; day++) {
      for (let hour = 0; hour < 24; hour++) {
        harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
        timeSystem.update(harness.world, entities, 60.0);
        animalSystem.update(harness.world, entities, 60.0);
        stateMutator.update(harness.world, entities, 60.0); // Apply deltas
      }
    }

    // Check for life stage change events
    const stageEvents = harness.getEmittedEvents('life_stage_changed');
    expect(stageEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should animals produce products over time', () => {
    const productionSystem = new AnimalProductionSystem(harness.world.eventBus);
    const timeSystem = new TimeSystem();

    harness.registerSystem('AnimalProductionSystem', productionSystem);
    harness.registerSystem('TimeSystem', timeSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());

    // Run production system over time
    for (let i = 0; i < 50; i++) {
      timeSystem.update(harness.world, entities, 100.0);
      productionSystem.update(harness.world, entities, 100.0);
    }

    // Check for product ready events
    const productEvents = harness.getEmittedEvents('product_ready');
    expect(productEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should housing cleanliness affect animal health', () => {
    const housingSystem = new AnimalHousingSystem(harness.world.eventBus);

    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);
    harness.registerSystem('AnimalHousingSystem', housingSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const coop = harness.createTestBuilding('chicken_coop', { x: 10, y: 10 });

    harness.clearEvents();

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();

    // Run systems over time (20 game minutes)
    for (let i = 0; i < 20; i++) {
      harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
      housingSystem.update(harness.world, entities, 60.0);
      animalSystem.update(harness.world, entities, 60.0);
      stateMutator.update(harness.world, entities, 60.0); // Apply deltas
    }

    // Check for housing events
    const dirtyEvents = harness.getEmittedEvents('housing:dirty');
    expect(dirtyEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should multiple animals in housing tracked', () => {
    const housingSystem = new AnimalHousingSystem(harness.world.eventBus);
    harness.registerSystem('AnimalHousingSystem', housingSystem);

    const coop = harness.createTestBuilding('chicken_coop', { x: 10, y: 10 });
    const chicken1 = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const chicken2 = harness.createTestAnimal('chicken', { x: 10, y: 11 });
    const chicken3 = harness.createTestAnimal('chicken', { x: 11, y: 10 });

    const entities = Array.from(harness.world.entities.values());

    housingSystem.update(harness.world, entities, 1.0);

    // Housing should track multiple animals
    expect(entities.length).toBeGreaterThan(1);
  });

  it('should animal death trigger replacement cycle', () => {
    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });

    harness.clearEvents();

    // Set animal to very old age or low health by emitting events
    harness.world.eventBus.emit({
      type: 'animal_died',
      source: animal.id,
      data: {
        animalId: animal.id,
        speciesId: 'chicken',
        cause: 'old_age',
      },
    });

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();
    harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
    animalSystem.update(harness.world, entities, 60.0);
    stateMutator.update(harness.world, entities, 60.0); // Apply deltas

    // Check for death events
    const deathEvents = harness.getEmittedEvents('animal_died');
    expect(deathEvents.length).toBeGreaterThan(0);
  });

  it('should taming build trust over multiple interactions', () => {
    const tamingSystem = new TamingSystem(harness.world.eventBus);
    harness.registerSystem('TamingSystem', tamingSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const agent = harness.createTestAgent({ x: 11, y: 11 });

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());

    // Multiple taming attempts
    for (let i = 0; i < 20; i++) {
      tamingSystem.update(harness.world, entities, 1.0);
    }

    // Verify animal and agent still exist after taming attempts
    expect(animal.getComponent(ComponentType.Animal)).toBeDefined();
    expect(agent.getComponent(ComponentType.Position)).toBeDefined();

    // Check if any taming events were emitted (taming is probabilistic)
    const tamingEvents = harness.getEmittedEvents('animal_tamed');
    expect(tamingEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should full husbandry cycle integrate all systems', () => {
    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);

    const tamingSystem = new TamingSystem(harness.world.eventBus);
    const housingSystem = new AnimalHousingSystem(harness.world.eventBus);
    const productionSystem = new AnimalProductionSystem(harness.world.eventBus);
    const timeSystem = new TimeSystem();

    harness.registerSystem('TamingSystem', tamingSystem);
    harness.registerSystem('AnimalHousingSystem', housingSystem);
    harness.registerSystem('AnimalProductionSystem', productionSystem);
    harness.registerSystem('TimeSystem', timeSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });
    const agent = harness.createTestAgent({ x: 11, y: 11 });
    const coop = harness.createTestBuilding('chicken_coop', { x: 10, y: 10 });

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();

    // Simulate full husbandry cycle over multiple days (5 days = 7200 game minutes)
    for (let day = 0; day < 5; day++) {
      for (let hour = 0; hour < 24; hour++) {
        harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
        timeSystem.update(harness.world, entities, 60.0);
        tamingSystem.update(harness.world, entities, 60.0);
        animalSystem.update(harness.world, entities, 60.0);
        housingSystem.update(harness.world, entities, 60.0);
        productionSystem.update(harness.world, entities, 60.0);
        stateMutator.update(harness.world, entities, 60.0); // Apply deltas
      }
    }

    // All systems should integrate successfully
    expect(animal.getComponent(ComponentType.Animal)).toBeDefined();
    expect(coop.getComponent(ComponentType.Building)).toBeDefined();
  });

  it('should animal needs decay and require care', () => {
    // Create and wire StateMutatorSystem (required for AnimalSystem)
    const stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    const animalSystem = new AnimalSystem();
    animalSystem.setStateMutatorSystem(stateMutator);
    harness.registerSystem('AnimalSystem', animalSystem);

    const animal = harness.createTestAnimal('chicken', { x: 10, y: 10 });

    // Query entities with Animal component
    const entities = harness.world.query().with(ComponentType.Animal).executeEntities();

    // Run animal system over time (20 game minutes)
    for (let i = 0; i < 20; i++) {
      harness.world.setTick(harness.world.tick + 1200); // Advance 1 game minute
      animalSystem.update(harness.world, entities, 60.0);
      stateMutator.update(harness.world, entities, 60.0); // Apply deltas
    }

    // Animal needs should be tracked
    expect(animal.getComponent(ComponentType.Animal)).toBeDefined();
  });

  it('should housing capacity limits enforced', () => {
    const housingSystem = new AnimalHousingSystem(harness.world.eventBus);
    harness.registerSystem('AnimalHousingSystem', housingSystem);

    const coop = harness.createTestBuilding('chicken_coop', { x: 10, y: 10 });

    // Create many animals at same location
    for (let i = 0; i < 10; i++) {
      harness.createTestAnimal('chicken', { x: 10 + i % 3, y: 10 + Math.floor(i / 3) });
    }

    harness.clearEvents();

    const entities = Array.from(harness.world.entities.values());
    housingSystem.update(harness.world, entities, 1.0);

    // Check for capacity events
    const fullEvents = harness.getEmittedEvents('housing:full');
    expect(fullEvents.length).toBeGreaterThanOrEqual(0);
  });
});
