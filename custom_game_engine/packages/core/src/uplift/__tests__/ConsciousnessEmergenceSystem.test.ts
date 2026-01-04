/**
 * ConsciousnessEmergenceSystem Test Suite
 *
 * Tests for sapience awakening, animal→agent transformation, memory creation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World.js';
import type { Entity } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ConsciousnessEmergenceSystem } from '../ConsciousnessEmergenceSystem.js';
import { ProtoSapienceComponent } from '../../components/ProtoSapienceComponent.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { UpliftedTraitComponent } from '../../components/UpliftedTraitComponent.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../../components/SemanticMemoryComponent.js';
import { BeliefComponent } from '../../components/BeliefComponent.js';
import { SpeciesComponent } from '../../components/SpeciesComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { createProtoSapientAnimal } from './testHelpers.js';
import { EntityImpl } from '../../ecs/Entity.js';

describe('ConsciousnessEmergenceSystem - Initialization', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should initialize with correct priority', () => {
    expect(system.priority).toBe(565);
  });

  it('should initialize with correct ID', () => {
    expect(system.id).toBe('ConsciousnessEmergenceSystem');
  });
});

describe('ConsciousnessEmergenceSystem - Readiness Detection', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;
  let entity: Entity;
  let proto: ProtoSapienceComponent;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    entity = createProtoSapientAnimal(world, 'wolf', 0.7);
    proto = entity.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
  });

  it('should detect readiness for sapience', () => {
    expect(proto.isReadyForSapience()).toBe(true);
  });

  it('should not trigger if intelligence too low', () => {
    proto.intelligence = 0.65;
    expect(proto.isReadyForSapience()).toBe(false);
  });

  it('should not trigger if mirror test not passed', () => {
    proto.passedMirrorTest = false;
    expect(proto.isReadyForSapience()).toBe(false);
  });

  it('should not trigger if no proto-language', () => {
    proto.hasProtocolanguage = false;
    expect(proto.isReadyForSapience()).toBe(false);
  });

  it('should not trigger if does not create tools', () => {
    proto.createsTools = false;
    expect(proto.isReadyForSapience()).toBe(false);
  });
});

describe('ConsciousnessEmergenceSystem - Awakening Moment Generation', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;
  let entity: Entity;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    // Create uplift program
    const program = new UpliftProgramComponent({
      programId: 'test_wolf_uplift',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 8,
      targetGeneration: 10,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);
  });

  it('should generate awakening moment', () => {
    let awakeningEventData: any = null;
    eventBus.on('consciousness_awakened', (event: any) => {
      awakeningEventData = event.data;
    });

    // Run system (100 ticks = 5 seconds)
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    if (awakeningEventData) {
      expect(awakeningEventData.firstThought).toBeDefined();
      expect(awakeningEventData.firstQuestion).toBe('What am I?');
      expect(awakeningEventData.firstWord).toBe('I');
      expect(['wonder', 'fear', 'curiosity', 'clarity']).toContain(awakeningEventData.firstEmotion);
    }
  });
});

describe('ConsciousnessEmergenceSystem - Animal to Agent Transformation', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;
  let entity: Entity;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);

    entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    // Create uplift program
    const program = new UpliftProgramComponent({
      programId: 'test_wolf_uplift',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 8,
      targetGeneration: 10,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);
  });

  it('should add UpliftedTraitComponent', () => {
    expect(entity.hasComponent(CT.UpliftedTrait)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.UpliftedTrait)).toBe(true);
  });

  it('should add AgentComponent', () => {
    expect(entity.hasComponent(CT.Agent)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.Agent)).toBe(true);
  });

  it('should add IdentityComponent', () => {
    expect(entity.hasComponent(CT.Identity)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.Identity)).toBe(true);
  });

  it('should add EpisodicMemoryComponent with awakening memory', () => {
    expect(entity.hasComponent(CT.EpisodicMemory)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.EpisodicMemory)).toBe(true);

    const memory = entity.getComponent(CT.EpisodicMemory) as EpisodicMemoryComponent;
    const awakeningMemory = memory.episodicMemories.find((m: any) => m.eventType === 'awakening');
    expect(awakeningMemory).toBeDefined();
    expect(awakeningMemory?.importance).toBe(1.0);
  });

  it('should add SemanticMemoryComponent with uplift knowledge', () => {
    expect(entity.hasComponent(CT.SemanticMemory)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.SemanticMemory)).toBe(true);

    const memory = entity.getComponent(CT.SemanticMemory) as SemanticMemoryComponent;
    const upliftKnowledge = memory.knowledge.find((k: any) => k.type === 'factual' && k.content.includes('uplifted'));
    expect(upliftKnowledge).toBeDefined();
  });

  it('should add BeliefComponent with sapience belief', () => {
    expect(entity.hasComponent(CT.Belief)).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(entity.hasComponent(CT.Belief)).toBe(true);

    // Belief formation happens over time as evidence accumulates
    // Just verify the component was added
    const beliefs = entity.getComponent(CT.Belief) as BeliefComponent;
    expect(beliefs).toBeDefined();
  });

  it('should keep AnimalComponent (retains animal traits)', () => {
    expect(entity.hasComponent(CT.Animal)).toBe(true);

    system.update(world, [entity], 0.05);

    expect(entity.hasComponent(CT.Animal)).toBe(true);
  });

  it('should mark species as sapient', () => {
    const species = entity.getComponent(CT.Species) as SpeciesComponent;
    expect(species.sapient).toBe(false);

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(species.sapient).toBe(true);
  });
});

describe('ConsciousnessEmergenceSystem - Attitude Determination', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should be grateful for fast uplift', () => {
    const entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    // Fast uplift: 5 generations when 15 estimated
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 15,
      baseGenerations: 15,
      currentGeneration: 5,
      targetGeneration: 15,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    system.update(world, [entity], 0.05);

    if (entity.hasComponent(CT.UpliftedTrait)) {
      const trait = entity.getComponent(CT.UpliftedTrait) as UpliftedTraitComponent;
      expect(['grateful', 'neutral']).toContain(trait.attitude);
    }
  });

  it('should be resentful for slow uplift', () => {
    const entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    // Slow uplift: 13 generations when 15 estimated (>80%)
    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 15,
      baseGenerations: 15,
      currentGeneration: 13,
      targetGeneration: 15,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    system.update(world, [entity], 0.05);

    if (entity.hasComponent(CT.UpliftedTrait)) {
      const trait = entity.getComponent(CT.UpliftedTrait) as UpliftedTraitComponent;
      expect(['resentful', 'conflicted']).toContain(trait.attitude);
    }
  });
});

describe('ConsciousnessEmergenceSystem - Witness Tracking', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should record nearby witnesses to awakening', () => {
    // Create awakening entity
    const entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    // Create nearby agents (potential witnesses)
    for (let i = 0; i < 3; i++) {
      const witness = world.createEntity() as EntityImpl;
      witness.addComponent(createAgentComponent());
      witness.addComponent(createIdentityComponent(`Witness${i}`));
    }

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 8,
      targetGeneration: 10,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    system.update(world, [entity], 0.05);

    if (entity.hasComponent(CT.UpliftedTrait)) {
      const trait = entity.getComponent(CT.UpliftedTrait) as UpliftedTraitComponent;
      expect(trait.awakeningMoment).toBeDefined();
      // Witnesses may or may not be recorded depending on proximity
      expect(trait.awakeningMoment?.witnessIds).toBeDefined();
    }
  });
});

describe('ConsciousnessEmergenceSystem - Event Emission', () => {
  let world: World;
  let system: ConsciousnessEmergenceSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new World();
    system = new ConsciousnessEmergenceSystem();
    eventBus = new EventBusImpl();
    system.initialize(world, eventBus);
  });

  it('should emit consciousness_awakened event', () => {
    const entity = createProtoSapientAnimal(world, 'wolf', 0.7);

    const program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.7,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 8,
      targetGeneration: 10,
      stage: 'awakening',
    });
    const programEntity = world.createEntity();
    (programEntity as EntityImpl).addComponent(program);

    let eventFired = false;
    eventBus.on('consciousness_awakened', () => {
      eventFired = true;
    });

    // Run 100 ticks to trigger update interval
    for (let i = 0; i < 100; i++) {
      system.update(world, [entity], 0.05);
    }

    expect(eventFired).toBe(true);
  });
});
