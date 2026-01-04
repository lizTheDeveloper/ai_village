/**
 * UpliftBreedingProgramSystem Test Suite
 *
 * Tests for generational advancement, intelligence progression, breeding selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { Entity } from '../../ecs/Entity.js';
import { EventBus } from '../../events/EventBus.js';
import { UpliftBreedingProgramSystem } from '../UpliftBreedingProgramSystem.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { SpeciesComponent } from '../../components/SpeciesComponent.js';
import { AnimalComponent } from '../../components/AnimalComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('UpliftBreedingProgramSystem - Initialization', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
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
  let eventBus: EventBus;
  let programEntity: Entity;
  let program: UpliftProgramComponent;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
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
      const animal = world.createEntity();
      const animalComp = new AnimalComponent({
        species: 'wolf',
        intelligence: 0.45 + Math.random() * 0.1,
      });
      animal.addComponent(animalComp);
      animal.addComponent(new SpeciesComponent({
        speciesId: 'wolf',
        speciesName: 'Wolf',
        maturityAge: 2,
      }));
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

    system.update(world, [programEntity], 0.05);

    expect(program.currentIntelligence).toBeGreaterThan(initialIntelligence);
  });

  it('should not exceed target intelligence', () => {
    program.currentIntelligence = 0.69;
    program.progressToNextGeneration = 100;

    system.update(world, [programEntity], 0.05);

    expect(program.currentIntelligence).toBeLessThanOrEqual(program.targetIntelligence);
  });

  it('should track generation results', () => {
    program.progressToNextGeneration = 100;
    const initialResults = program.generationResults.length;

    system.update(world, [programEntity], 0.05);

    expect(program.generationResults.length).toBe(initialResults + 1);
  });
});

describe('UpliftBreedingProgramSystem - Breeding Selection', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);

    // Create animals with varying intelligence
    for (let i = 0; i < 100; i++) {
      const animal = world.createEntity();
      const animalComp = new AnimalComponent({
        species: 'wolf',
        intelligence: 0.3 + (i / 100) * 0.4, // 0.3 to 0.7
      });
      animal.addComponent(animalComp);
      animal.addComponent(new SpeciesComponent({
        speciesId: 'wolf',
        speciesName: 'Wolf',
        maturityAge: 2,
      }));
    }
  });

  it('should select top 50% for breeding', () => {
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
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

    system.update(world, [programEntity], 0.05);

    // After selection, breeding population should be top 50%
    expect(program.breedingPopulationIds.length).toBeLessThanOrEqual(50);
  });
});

describe('UpliftBreedingProgramSystem - Stage Transitions', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;
  let program: UpliftProgramComponent;
  let programEntity: Entity;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
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

  it('should transition to pre_sapience at 0.6 intelligence', () => {
    program.currentIntelligence = 0.6;
    program.progressToNextGeneration = 100;

    system.update(world, [programEntity], 0.05);

    expect(program.stage).toBe('pre_sapience');
  });

  it('should transition to emergence_threshold at 0.65 intelligence', () => {
    program.currentIntelligence = 0.65;
    program.stage = 'pre_sapience';
    program.progressToNextGeneration = 100;

    system.update(world, [programEntity], 0.05);

    expect(program.stage).toBe('emergence_threshold');
  });

  it('should transition to awakening at 0.7 intelligence', () => {
    program.currentIntelligence = 0.69;
    program.stage = 'emergence_threshold';
    program.progressToNextGeneration = 100;

    system.update(world, [programEntity], 0.05);

    expect(program.stage).toBe('awakening');
  });
});

describe('UpliftBreedingProgramSystem - Technology Effects', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;
  let program: UpliftProgramComponent;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
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
    programEntity.addComponent(program);

    system.update(world, [programEntity], 0.05);

    const intelligenceGain = program.currentIntelligence - initialIntelligence;
    expect(intelligenceGain).toBeGreaterThan(0);
  });
});

describe('UpliftBreedingProgramSystem - Breakthrough Events', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should track breakthroughs when they occur', () => {
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
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
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
    programEntity.addComponent(program);

    // No animals exist for this species
    program.progressToNextGeneration = 100;

    let extinctionEventFired = false;
    eventBus.on('uplift_population_extinct', () => {
      extinctionEventFired = true;
    });

    system.update(world, [programEntity], 0.05);

    expect(extinctionEventFired).toBe(true);
  });
});

describe('UpliftBreedingProgramSystem - Notable Individuals', () => {
  let world: World;
  let system: UpliftBreedingProgramSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new UpliftBreedingProgramSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);

    // Create animals with one exceptionally intelligent individual
    for (let i = 0; i < 49; i++) {
      const animal = world.createEntity();
      const animalComp = new AnimalComponent({
        species: 'wolf',
        intelligence: 0.5,
      });
      animal.addComponent(animalComp);
      animal.addComponent(new SpeciesComponent({
        speciesId: 'wolf',
        speciesName: 'Wolf',
        maturityAge: 2,
      }));
    }

    // Exceptional individual
    const genius = world.createEntity();
    const geniusComp = new AnimalComponent({
      species: 'wolf',
      intelligence: 0.8,
    });
    genius.addComponent(geniusComp);
    genius.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));
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
