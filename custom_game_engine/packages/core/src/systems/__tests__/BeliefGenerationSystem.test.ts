import { beforeEach, describe, expect, it } from 'vitest';
import { World } from '../../ecs/World.js';
import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { BeliefGenerationSystem } from '../BeliefGenerationSystem.js';
import { DeityComponent } from '../../components/DeityComponent.js';
import { createSpiritualComponent } from '../../components/SpiritualComponent.js';
import { PersonalityComponent } from '../../components/PersonalityComponent.js';
import { SpeciesComponent } from '../../components/SpeciesComponent.js';

describe('BeliefGenerationSystem', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let system: BeliefGenerationSystem;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new BeliefGenerationSystem();
    await system.initialize(world, eventBus);
  });

  function createDeity(name: string): Entity {
    const deity = world.createEntity('deity') as EntityImpl;
    deity.addComponent(new DeityComponent(name, 'ai'));
    return deity;
  }

  function createBeliever(options: {
    deityId: string;
    speciesId?: string;
    faith?: number;
    hasReceivedVision?: boolean;
    answeredPrayers?: number;
    religiousLeader?: boolean;
  }): Entity {
    const believer = world.createEntity('agent') as EntityImpl;
    believer.addComponent(
      new PersonalityComponent({
        openness: 0.6,
        conscientiousness: 0.5,
        extraversion: 0.6,
        agreeableness: 0.6,
        neuroticism: 0.4,
        spirituality: 0.7,
      })
    );

    const spiritual = createSpiritualComponent(options.faith ?? 0.8, options.deityId);
    spiritual.hasReceivedVision = options.hasReceivedVision ?? false;
    spiritual.answeredPrayers = options.answeredPrayers ?? 0;
    spiritual.religiousLeader = options.religiousLeader ?? false;
    believer.addComponent(spiritual);

    if (options.speciesId) {
      believer.addComponent(new SpeciesComponent(options.speciesId, options.speciesId, 'humanoid'));
    }

    return believer;
  }

  function runSystem(): void {
    system.update(world, Array.from(world.entities.values()), 0.05);
  }

  function getTotalBeliefEarned(entity: Entity): number {
    const deity = entity.getComponent(CT.Deity) as DeityComponent | undefined;
    return deity?.belief.totalBeliefEarned ?? 0;
  }

  it('generates species-divergent belief from identical spiritual baselines', () => {
    const rakshaDeity = createDeity('Raksha Deity');
    const nornDeity = createDeity('Norn Deity');
    const quetzaliDeity = createDeity('Quetzali Deity');

    createBeliever({ deityId: rakshaDeity.id, speciesId: 'rakshasa' });
    createBeliever({ deityId: nornDeity.id, speciesId: 'norn' });
    createBeliever({ deityId: quetzaliDeity.id, speciesId: 'quetzali' });

    runSystem();

    const rakshaBelief = getTotalBeliefEarned(rakshaDeity);
    const nornBelief = getTotalBeliefEarned(nornDeity);
    const quetzaliBelief = getTotalBeliefEarned(quetzaliDeity);

    expect(rakshaBelief).toBeGreaterThan(0);
    expect(nornBelief).toBeGreaterThan(0);
    expect(quetzaliBelief).toBeGreaterThan(0);

    // Canon species should no longer collapse to identical belief outputs.
    expect(nornBelief).toBeGreaterThan(rakshaBelief);
    expect(quetzaliBelief).toBeGreaterThan(rakshaBelief);
    expect(nornBelief).not.toBeCloseTo(quetzaliBelief, 12);
  });

  it('boosts raksha belief when observed-power signals exist', () => {
    const baselineRakshaDeity = createDeity('Baseline Raksha');
    const observedPowerRakshaDeity = createDeity('Observed-Power Raksha');

    createBeliever({
      deityId: baselineRakshaDeity.id,
      speciesId: 'raksha',
      hasReceivedVision: false,
      answeredPrayers: 0,
    });
    createBeliever({
      deityId: observedPowerRakshaDeity.id,
      speciesId: 'raksha',
      hasReceivedVision: true,
      answeredPrayers: 6,
    });

    runSystem();

    const baselineBelief = getTotalBeliefEarned(baselineRakshaDeity);
    const observedPowerBelief = getTotalBeliefEarned(observedPowerRakshaDeity);

    expect(observedPowerBelief).toBeGreaterThan(baselineBelief);
  });

  it('falls back to neutral multiplier for unknown or missing species', () => {
    const unknownSpeciesDeity = createDeity('Unknown Species');
    const missingSpeciesDeity = createDeity('No Species');

    createBeliever({
      deityId: unknownSpeciesDeity.id,
      speciesId: 'totally_unknown_species',
    });
    createBeliever({
      deityId: missingSpeciesDeity.id,
    });

    runSystem();

    const unknownBelief = getTotalBeliefEarned(unknownSpeciesDeity);
    const missingBelief = getTotalBeliefEarned(missingSpeciesDeity);

    expect(unknownBelief).toBeGreaterThan(0);
    expect(missingBelief).toBeGreaterThan(0);
    expect(unknownBelief).toBeCloseTo(missingBelief, 12);
  });
});
