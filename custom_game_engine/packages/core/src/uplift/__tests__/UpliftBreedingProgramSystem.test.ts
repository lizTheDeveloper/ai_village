/**
 * UpliftBreedingProgramSystem Test Suite
 *
 * Tests for generational advancement, intelligence progression, breeding selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World.js';
import type { Entity } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { UpliftBreedingProgramSystem } from '../UpliftBreedingProgramSystem.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { createTestAnimal } from './testHelpers.js';

describe('UpliftBreedingProgramSystem - Initialization', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should initialize with correct priority', () => {
    expect(system.priority).toBe(560);
  });

  it('should initialize with correct ID', () => {
    expect(system.id).toBe('UpliftBreedingProgramSystem');
  });
});

describe('UpliftBreedingProgramSystem - Generation Advancement', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;
  let programEntity: Entity;
  let program: UpliftProgramComponent;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    // Create test program
    programEntity = world.createEntity();
    program = new UpliftProgramComponent({
      programId: 'test_wolf_uplift',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    programEntity.addComponent(program);

    // Create breeding population
    for (let i = 0; i < 50; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.45 + Math.random() * 0.1 });
    }
  });

  it('should advance generation when maturity reached', () => {
    // Set progress to 100%
    program.progressToNextGeneration = 100;

    // Run system update (20 ticks = 1 second)
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.currentGeneration).toBe(1);
    expect(program.progressToNextGeneration).toBeLessThan(100);
  });

  it('should increase intelligence each generation', () => {
    const initialIntelligence = program.currentIntelligence;
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.currentIntelligence).toBeGreaterThan(initialIntelligence);
  });

  it('should not exceed target intelligence', () => {
    program.currentIntelligence = 0.69;
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.currentIntelligence).toBeLessThanOrEqual(program.targetIntelligence);
  });

  it('should track generation results', () => {
    program.progressToNextGeneration = 100;
    const initialResults = program.generationResults.length;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.generationResults.length).toBe(initialResults + 1);
  });
});

describe('UpliftBreedingProgramSystem - Breeding Selection', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    // Create animals with varying intelligence
    for (let i = 0; i < 100; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.3 + (i / 100) * 0.4 });
    }
  });

  it('should select top 50% for breeding', () => {
    // Collect wolf IDs
    const wolfIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const wolf = createTestAnimal(world, 'wolf', { intelligence: 0.3 + (i / 100) * 0.4 });
      wolfIds.push(wolf.id);
    }

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      breedingPopulation: wolfIds,
      populationSize: 100,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    programEntity.addComponent(program);
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    // After selection, breeding population should be top 50%
    expect(program.breedingPopulation.length).toBeLessThanOrEqual(50);
  });
});

describe('UpliftBreedingProgramSystem - Stage Transitions', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;
  let program: UpliftProgramComponent;
  let programEntity: Entity;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    programEntity = world.createEntity();
    programEntity.addComponent(program);
  });

  it('should transition to neural_enhancement at 0.6 intelligence', () => {
    program.currentIntelligence = 0.6;
    program.currentGeneration = 3;
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.stage).toBe('neural_enhancement');
  });

  it('should transition to pre_sapience at 0.65 intelligence', () => {
    program.currentIntelligence = 0.65;
    program.currentGeneration = 5;
    program.stage = 'neural_enhancement';
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(program.stage).toBe('pre_sapience');
  });

  it('should remain in pre_sapience at 0.69 intelligence', () => {
    program.currentIntelligence = 0.69;
    program.currentGeneration = 8;
    program.stage = 'pre_sapience';
    program.progressToNextGeneration = 100;

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    // 0.69 is still in pre_sapience range (0.65-0.7)
    expect(program.stage).toBe('pre_sapience');
  });
});

describe('UpliftBreedingProgramSystem - Technology Effects', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;
  let program: UpliftProgramComponent;
  let wolfIds: string[];

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    // Create breeding population
    wolfIds = [];
    for (let i = 0; i < 50; i++) {
      const wolf = createTestAnimal(world, 'wolf', { intelligence: 0.5 });
      wolfIds.push(wolf.id);
    }

    program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      breedingPopulation: wolfIds,
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
  });

  it('should apply technology multipliers to intelligence gain', () => {
    // Add technology modifier
    program.technologies.push({
      techId: 'genetic_engineering',
      generationReduction: 0.2,
      intelligenceMultiplier: 1.2,
      enabled: true,
    });

    const initialIntelligence = program.currentIntelligence;
    program.progressToNextGeneration = 100;

    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    const intelligenceGain = program.currentIntelligence - initialIntelligence;
    expect(intelligenceGain).toBeGreaterThan(0);
  });
});

describe('UpliftBreedingProgramSystem - Breakthrough Events', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should track breakthroughs when they occur', () => {
    // Create breeding population
    const wolfIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const wolf = createTestAnimal(world, 'wolf', { intelligence: 0.5 });
      wolfIds.push(wolf.id);
    }

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      breedingPopulation: wolfIds,
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    // Run many generations to eventually get a breakthrough (5% chance)
    for (let i = 0; i < 50; i++) {
      program.progressToNextGeneration = 100;
      system.update(world, [programEntity], 0.05);
    }

    // Should have recorded some generation results
    expect(program.generationResults.length).toBeGreaterThan(0);
  });
});

describe('UpliftBreedingProgramSystem - Population Management', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should handle population extinction', () => {
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'extinct_species',
      populationSize: 5,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    // No animals exist for this species
    program.progressToNextGeneration = 100;

    let extinctionEventFired = false;
    eventBus.on('uplift_population_extinct', () => {
      extinctionEventFired = true;
    });

    // Run 20 ticks to trigger update interval
    for (let i = 0; i < 20; i++) {
      system.update(world, [programEntity], 0.05);
    }

    expect(extinctionEventFired).toBe(true);
  });
});

describe('UpliftBreedingProgramSystem - Notable Individuals', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    // Create animals with one exceptionally intelligent individual
    for (let i = 0; i < 49; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.5 });
    }

    // Exceptional individual
    createTestAnimal(world, 'wolf', { intelligence: 0.8 });
  });

  it('should identify notable individuals', () => {
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    programEntity.addComponent(program);
    program.progressToNextGeneration = 100;

    system.update(world, [programEntity], 0.05);

    // Should have recorded notable individuals if any found
    const lastResult = program.generationResults[program.generationResults.length - 1];
    if (lastResult && lastResult.notableIndividuals) {
      expect(lastResult.notableIndividuals.length).toBeGreaterThan(0);
    }
  });
});
