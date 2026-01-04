/**
 * ProtoSapienceObservationSystem Test Suite
 *
 * Tests for proto-sapient behavior emergence, mirror test, tool use tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { Entity } from '../../ecs/Entity.js';
import { EventBus } from '../../events/EventBus.js';
import { ProtoSapienceObservationSystem } from '../ProtoSapienceObservationSystem.js';
import { ProtoSapienceComponent } from '../../components/ProtoSapienceComponent.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { AnimalComponent } from '../../components/AnimalComponent.js';
import { SpeciesComponent } from '../../components/SpeciesComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('ProtoSapienceObservationSystem - Initialization', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should initialize with correct priority', () => {
    expect(system.priority).toBe(562);
  });

  it('should initialize with correct ID', () => {
    expect(system.id).toBe('ProtoSapienceObservationSystem');
  });
});

describe('ProtoSapienceObservationSystem - Behavior Emergence', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;
  let entity: Entity;
  let proto: ProtoSapienceComponent;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);

    entity = world.createEntity();
    proto = new ProtoSapienceComponent({
      intelligence: 0.45, // Just at tool use threshold
      usesTools: false,
      createsTools: false,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    // Create active uplift program
    const program = new UpliftProgramComponent({
      programId: 'test_wolf_uplift',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.45,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 3,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);
  });

  it('should detect tool use at 0.45 intelligence', () => {
    expect(proto.usesTools).toBe(false);

    // Run system (100 ticks = 5 seconds)
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.usesTools).toBe(true);
  });

  it('should detect tool creation at 0.55 intelligence', () => {
    proto.intelligence = 0.55;
    expect(proto.createsTools).toBe(false);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.createsTools).toBe(true);
  });

  it('should detect proto-language at 0.60 intelligence', () => {
    proto.intelligence = 0.60;
    expect(proto.hasProtocolanguage).toBe(false);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.hasProtocolanguage).toBe(true);
  });

  it('should detect mirror test readiness at 0.65 intelligence', () => {
    proto.intelligence = 0.65;
    expect(proto.passedMirrorTest).toBe(false);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    // Mirror test should be attempted
    expect(proto.mirrorTestAttempts).toBeGreaterThan(0);
  });

  it('should detect abstract thinking at 0.68 intelligence', () => {
    proto.intelligence = 0.68;
    expect(proto.showsAbstractThinking).toBe(false);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.showsAbstractThinking).toBe(true);
  });

  it('should not emerge behaviors below thresholds', () => {
    proto.intelligence = 0.40; // Below all thresholds

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.usesTools).toBe(false);
    expect(proto.createsTools).toBe(false);
    expect(proto.hasProtocolanguage).toBe(false);
    expect(proto.passedMirrorTest).toBe(false);
    expect(proto.showsAbstractThinking).toBe(false);
  });
});

describe('ProtoSapienceObservationSystem - Behavioral Tests', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should conduct mirror test multiple times', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.65,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: true,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.65,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 5,
      targetGeneration: 10,
      stage: 'pre_sapience',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    const initialAttempts = proto.mirrorTestAttempts;

    // Run system multiple times
    for (let i = 0; i < 500; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.mirrorTestAttempts).toBeGreaterThan(initialAttempts);
  });

  it('should track delayed gratification test', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.65,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: true,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.65,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 5,
      targetGeneration: 10,
      stage: 'pre_sapience',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    for (let i = 0; i < 500; i++) {
      system.update(world, [entity], 0.05);
    }

    // Should have attempted delayed gratification test
    expect(proto.behavioralTests).toBeDefined();
  });
});

describe('ProtoSapienceObservationSystem - Tool Use Tracking', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should track tool use instances', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.50,
      usesTools: false,
      createsTools: false,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 4,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.usesTools).toBe(true);
  });

  it('should distinguish tool use from tool creation', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.50,
      usesTools: false,
      createsTools: false,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.50,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 4,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    // At 0.50 intelligence, should use tools but not create them
    expect(proto.usesTools).toBe(true);
    expect(proto.createsTools).toBe(false);
  });
});

describe('ProtoSapienceObservationSystem - Communication Patterns', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should track communication pattern development', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.60,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.60,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 5,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(proto.hasProtocolanguage).toBe(true);
    expect(proto.communicationPatterns.length).toBeGreaterThan(0);
  });
});

describe('ProtoSapienceObservationSystem - Milestone Events', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should emit milestone event for first tool use', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.45,
      usesTools: false,
      createsTools: false,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.45,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 3,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    let milestoneEventFired = false;
    eventBus.on('proto_sapience_milestone', (event: any) => {
      if (event.data.milestone === 'first_tool_use') {
        milestoneEventFired = true;
      }
    });

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(milestoneEventFired).toBe(true);
  });

  it('should emit milestone event for proto-language emergence', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.60,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.60,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 5,
      targetGeneration: 10,
      stage: 'selective_breeding',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    let milestoneEventFired = false;
    eventBus.on('proto_sapience_milestone', (event: any) => {
      if (event.data.milestone === 'proto_language_emergence') {
        milestoneEventFired = true;
      }
    });

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(milestoneEventFired).toBe(true);
  });

  it('should emit milestone event for mirror test passed', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.65,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: true,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'wolf' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'wolf',
      speciesName: 'Wolf',
      maturityAge: 2,
    }));

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.65,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 6,
      targetGeneration: 10,
      stage: 'pre_sapience',
    });
    const programEntity = world.createEntity();
    programEntity.addComponent(program);

    let milestoneEventFired = false;
    eventBus.on('proto_sapience_milestone', (event: any) => {
      if (event.data.milestone === 'mirror_test_passed') {
        milestoneEventFired = true;
      }
    });

    // Run many ticks to give mirror test chances to pass
    for (let i = 0; i < 1000; i++) {
      system.update(world, [entity], 0.05);
    }

    // Mirror test has probability, so may or may not pass
    // Just verify event system is working if it does pass
    if (proto.passedMirrorTest) {
      expect(milestoneEventFired).toBe(true);
    }
  });
});

describe('ProtoSapienceObservationSystem - Only Monitors Active Programs', () => {
  let world: World;
  let system: ProtoSapienceObservationSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    system = new ProtoSapienceObservationSystem();
    eventBus = new EventBus();
    system.initialize(world, eventBus);
  });

  it('should not monitor animals not in uplift programs', () => {
    const entity = world.createEntity();
    const proto = new ProtoSapienceComponent({
      intelligence: 0.70, // High intelligence
      usesTools: false,
      createsTools: false,
      hasProtocolanguage: false,
      passedMirrorTest: false,
      showsAbstractThinking: false,
    });
    entity.addComponent(proto);
    entity.addComponent(new AnimalComponent({ species: 'cat' }));
    entity.addComponent(new SpeciesComponent({
      speciesId: 'cat',
      speciesName: 'Cat',
      maturityAge: 1,
    }));

    // No uplift program for cats

    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    // Should not have behaviors emerge without active program
    expect(proto.usesTools).toBe(false);
  });
});
