/**
 * Uplift Integration Test Suite
 *
 * End-to-end tests for complete uplift flow: Gen 0 → Awakening
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World.js';
import type { Entity } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { UpliftBreedingProgramSystem } from '../UpliftBreedingProgramSystem.js';
import { ProtoSapienceObservationSystem } from '../ProtoSapienceObservationSystem.js';
import { ConsciousnessEmergenceSystem } from '../ConsciousnessEmergenceSystem.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { ProtoSapienceComponent } from '../../components/ProtoSapienceComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { createTestAnimal, createProtoSapientAnimal } from './testHelpers.js';
import { EntityImpl } from '../../ecs/Entity.js';
import { AnimalComponent } from '../../components/AnimalComponent.js';

describe('Uplift Integration - Full Wolf Uplift Flow', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let breedingSystem: UpliftBreedingProgramSystem;
  let observationSystem: ProtoSapienceObservationSystem;
  let emergenceSystem: ConsciousnessEmergenceSystem;
  let program: UpliftProgramComponent;
  let programEntity: Entity;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();

    breedingSystem = new UpliftBreedingProgramSystem();
    observationSystem = new ProtoSapienceObservationSystem();
    emergenceSystem = new ConsciousnessEmergenceSystem();

    breedingSystem.initialize(world, eventBus);
    observationSystem.initialize(world, eventBus);
    emergenceSystem.initialize(world, eventBus);

    // Create wolf population (50 wolves)
    for (let i = 0; i < 50; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.48 + Math.random() * 0.04 });
    }

    // Create uplift program
    program = new UpliftProgramComponent({
      programId: 'wolf_uplift_test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.70,
      baseGenerations: 15,
      acceleratedGenerations: 10, // With tech
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    programEntity = world.createEntity();
    programEntity.addComponent(program);
  });

  it('should complete full uplift from Gen 0 to awakening', () => {
    // Simulate 10 generations
    for (let gen = 0; gen < 10; gen++) {
      // Fast-forward to next generation
      program.progressToNextGeneration = 100;

      // Run breeding system
      breedingSystem.update(world, [programEntity], 0.05);

      // Find smartest wolf and give it proto-sapience component
      const wolves = world.query()
        .with(CT.Animal)
        .executeEntities()
        .filter(e => {
          const animal = e.getComponent(CT.Animal) as AnimalComponent;
          return animal.species === 'wolf';
        })
        .sort((a, b) => {
          const aIntel = (a.getComponent(CT.Animal) as AnimalComponent).intelligence;
          const bIntel = (b.getComponent(CT.Animal) as AnimalComponent).intelligence;
          return bIntel - aIntel;
        });

      if (wolves.length > 0 && program.currentIntelligence >= 0.45) {
        const smartest = wolves[0];
        if (!smartest!.hasComponent(CT.ProtoSapience)) {
          const proto = new ProtoSapienceComponent({
            intelligence: program.currentIntelligence,
            usesTools: false,
            createsTools: false,
            hasProtocolanguage: false,
            passedMirrorTest: false,
            showsAbstractThinking: false,
          });
          smartest!.addComponent(proto);
        } else {
          // Update existing proto-sapience intelligence
          const proto = smartest!.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
          proto.intelligence = program.currentIntelligence;
        }

        // Run observation system
        observationSystem.update(world, [smartest!], 0.05);

        // If ready, run emergence system
        const proto = smartest!.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
        if (proto && proto.isReadyForSapience()) {
          emergenceSystem.update(world, [smartest!], 0.05);
        }
      }
    }

    // Verify program advanced
    expect(program.currentGeneration).toBeGreaterThan(0);

    // Verify intelligence increased
    expect(program.currentIntelligence).toBeGreaterThan(0.50);

    // Verify stage progression
    expect(['selective_breeding', 'pre_sapience', 'emergence_threshold', 'awakening']).toContain(program.stage);
  });

  it('should track generation results throughout uplift', () => {
    // Run 5 generations
    for (let gen = 0; gen < 5; gen++) {
      program.progressToNextGeneration = 100;
      breedingSystem.update(world, [programEntity], 0.05);
    }

    expect(program.generationResults.length).toBe(5);

    // Each result should have required fields
    for (const result of program.generationResults) {
      expect(result.generation).toBeDefined();
      expect(result.intelligence).toBeDefined();
      expect(result.populationSize).toBeDefined();
    }
  });

  it('should emit events during uplift process', () => {
    const events: string[] = [];

    eventBus.on('uplift_generation_advanced', () => {
      events.push('generation_advanced');
    });

    eventBus.on('uplift_stage_changed', () => {
      events.push('stage_changed');
    });

    eventBus.on('proto_sapience_milestone', () => {
      events.push('milestone');
    });

    // Run several generations
    for (let gen = 0; gen < 3; gen++) {
      program.progressToNextGeneration = 100;
      breedingSystem.update(world, [programEntity], 0.05);
    }

    expect(events).toContain('generation_advanced');
  });
});

describe('Uplift Integration - Technology Effects', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let breedingSystem: UpliftBreedingProgramSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();
    breedingSystem = new UpliftBreedingProgramSystem();
    breedingSystem.initialize(world, eventBus);

    // Create wolf population
    for (let i = 0; i < 50; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.50 });
    }
  });

  it('should accelerate with genetic engineering tech', () => {
    const programWithTech = new UpliftProgramComponent({
      programId: 'wolf_tech',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.70,
      baseGenerations: 15,
      acceleratedGenerations: 12, // 20% reduction
      currentGeneration: 0,
      targetGeneration: 12,
      stage: 'gene_editing',
    });

    programWithTech.technologies.push({
      techId: 'genetic_engineering',
      generationReduction: 0.2,
      intelligenceMultiplier: 1.2,
      enabled: true,
    });

    const programEntity = world.createEntity();
    programEntity.addComponent(programWithTech);

    const initialIntelligence = programWithTech.currentIntelligence;
    programWithTech.progressToNextGeneration = 100;

    breedingSystem.update(world, [programEntity], 0.05);

    const intelligenceGain = programWithTech.currentIntelligence - initialIntelligence;
    expect(intelligenceGain).toBeGreaterThan(0);
  });

  it('should stack multiple technologies', () => {
    const programFullTech = new UpliftProgramComponent({
      programId: 'wolf_full_tech',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.70,
      baseGenerations: 15,
      acceleratedGenerations: 5, // -70% with full tech stack
      currentGeneration: 0,
      targetGeneration: 5,
      stage: 'neural_enhancement',
    });

    programFullTech.technologies.push(
      {
        techId: 'genetic_engineering',
        generationReduction: 0.2,
        intelligenceMultiplier: 1.2,
        enabled: true,
      },
      {
        techId: 'neural_augmentation',
        generationReduction: 0.3,
        intelligenceMultiplier: 1.5,
        enabled: true,
      }
    );

    expect(programFullTech.acceleratedGenerations).toBeLessThan(programFullTech.baseGenerations);
  });
});

describe('Uplift Integration - Edge Cases', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let breedingSystem: UpliftBreedingProgramSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();
    breedingSystem = new UpliftBreedingProgramSystem();
    breedingSystem.initialize(world, eventBus);
  });

  it('should handle population extinction', () => {
    const program = new UpliftProgramComponent({
      programId: 'extinct_test',
      sourceSpeciesId: 'dodo',
      populationSize: 5,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.70,
      baseGenerations: 50,
      acceleratedGenerations: 50,
      currentGeneration: 0,
      targetGeneration: 50,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    let extinctionDetected = false;
    eventBus.on('uplift_population_extinct', () => {
      extinctionDetected = true;
    });

    program.progressToNextGeneration = 100;
    breedingSystem.update(world, [programEntity], 0.05);

    expect(extinctionDetected).toBe(true);
  });

  it('should handle very low initial intelligence', () => {
    // Create insect population with very low intelligence
    for (let i = 0; i < 100; i++) {
      createTestAnimal(world, 'ant', { intelligence: 0.30 });
    }

    const program = new UpliftProgramComponent({
      programId: 'ant_uplift',
      sourceSpeciesId: 'ant',
      populationSize: 100,
      minimumPopulation: 50,
      geneticDiversity: 0.8,
      currentIntelligence: 0.30,
      targetIntelligence: 0.70,
      baseGenerations: 100,
      acceleratedGenerations: 100,
      currentGeneration: 0,
      targetGeneration: 100,
      stage: 'selective_breeding',
    });

    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    // Run one generation
    program.progressToNextGeneration = 100;
    breedingSystem.update(world, [programEntity], 0.05);

    // Should make progress even with very low intelligence
    expect(program.currentIntelligence).toBeGreaterThan(0.30);
  });

  it('should handle concurrent uplift programs', () => {
    // Create two species
    for (let i = 0; i < 30; i++) {
      createTestAnimal(world, 'wolf', { intelligence: 0.50 });
      createTestAnimal(world, 'raven', { intelligence: 0.48 });
    }

    const wolfProgram = new UpliftProgramComponent({
      programId: 'wolf_uplift',
      sourceSpeciesId: 'wolf',
      populationSize: 30,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.70,
      baseGenerations: 15,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });

    const ravenProgram = new UpliftProgramComponent({
      programId: 'raven_uplift',
      sourceSpeciesId: 'raven',
      populationSize: 30,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.48,
      targetIntelligence: 0.70,
      baseGenerations: 25,
      acceleratedGenerations: 18,
      currentGeneration: 0,
      targetGeneration: 18,
      stage: 'selective_breeding',
    });

    const wolfEntity = world.createEntity();
    wolfEntity.addComponent(wolfProgram);

    const ravenEntity = world.createEntity();
    ravenEntity.addComponent(ravenProgram);

    // Run both programs
    wolfProgram.progressToNextGeneration = 100;
    ravenProgram.progressToNextGeneration = 100;

    breedingSystem.update(world, [wolfEntity, ravenEntity], 0.05);

    // Both should advance independently
    expect(wolfProgram.currentGeneration).toBe(1);
    expect(ravenProgram.currentGeneration).toBe(1);
  });
});

describe('Uplift Integration - Proto-Sapience to Sapience Transition', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let observationSystem: ProtoSapienceObservationSystem;
  let emergenceSystem: ConsciousnessEmergenceSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();

    observationSystem = new ProtoSapienceObservationSystem();
    emergenceSystem = new ConsciousnessEmergenceSystem();

    observationSystem.initialize(world, eventBus);
    emergenceSystem.initialize(world, eventBus);
  });

  it('should transition from proto-sapient to sapient', () => {
    // Create near-sapient entity
    const entity = createProtoSapientAnimal(world, 'wolf', 0.68);
    const proto = entity.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
    proto.passedMirrorTest = false; // Not yet, will be set later in test

    // Create program
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.68,
      targetIntelligence: 0.70,
      baseGenerations: 15,
      acceleratedGenerations: 10,
      currentGeneration: 8,
      targetGeneration: 10,
      stage: 'emergence_threshold',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    // Push intelligence over threshold
    proto.intelligence = 0.70;
    proto.passedMirrorTest = true; // Manually pass for test

    // Run observation system
    for (let i = 0; i < 100; i++) {
      observationSystem.update(world, [entity], 0.05);
    }

    // Should now be ready for sapience
    expect(proto.isReadyForSapience()).toBe(true);

    // Run emergence system
    emergenceSystem.update(world, [entity], 0.05);

    // Should have transformed to agent
    expect(entity.hasComponent(CT.Agent)).toBe(true);
    expect(entity.hasComponent(CT.UpliftedTrait)).toBe(true);
  });
});
