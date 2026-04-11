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
import {
  createMythologyComponent,
  getCanonicalTraits,
  type Myth,
  type MythologyComponent,
} from '../../components/MythComponent.js';

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

  // ===========================================================================
  // Myth Feedback Loop Tests (MUL-4698)
  // ===========================================================================

  function createTestMyth(deityId: string, traits: Array<{ trait: string; direction: 'positive' | 'negative'; strength: number }>): Myth {
    return {
      id: `myth_${Math.random().toString(36).slice(2)}`,
      title: 'Test Myth',
      fullText: 'A test myth for unit testing.',
      summary: 'A test myth.',
      currentVersion: 1,
      knownBy: ['agent1'],
      writtenIn: [],
      carvedAt: [],
      traitImplications: traits.map(t => ({
        trait: t.trait,
        direction: t.direction,
        strength: t.strength,
        extractedFrom: 'test',
      })),
      domainRelevance: new Map(),
      creationTime: 0,
      lastToldTime: 0,
      tellingCount: 10,
      status: 'canonical',
      contestedBy: [],
      deityId,
    };
  }

  function addMythologyToDeity(deityEntity: Entity, myths: Myth[]): void {
    const mythComp = createMythologyComponent();
    for (const myth of myths) {
      mythComp.myths.push(myth);
      mythComp.canonicalMyths.push(myth.id);
    }
    mythComp.totalMythsCreated = myths.length;
    (deityEntity as EntityImpl).addComponent(mythComp);
  }

  describe('myth feedback loop (MUL-4698)', () => {
    it('getCanonicalTraits aggregates benevolence from canonical myths', () => {
      const mythComp = createMythologyComponent();
      const myth: Myth = createTestMyth('deity1', [
        { trait: 'benevolence', direction: 'positive', strength: 0.2 },
        { trait: 'wisdom', direction: 'positive', strength: 0.3 },
      ]);
      mythComp.myths.push(myth);
      mythComp.canonicalMyths.push(myth.id);

      const traits = getCanonicalTraits(mythComp);

      expect(traits.get('benevolence')).toBe(0.2);
      expect(traits.get('wisdom')).toBe(0.3);
    });

    it('canonical myth traits modulate belief generation', () => {
      // Deity WITH benevolent canonical myths
      const mythDeity = createDeity('Myth Deity');
      const benevolentMyth = createTestMyth(mythDeity.id, [
        { trait: 'benevolence', direction: 'positive', strength: 0.8 },
        { trait: 'compassion', direction: 'positive', strength: 0.6 },
      ]);
      addMythologyToDeity(mythDeity, [benevolentMyth]);

      // Deity WITHOUT mythology
      const plainDeity = createDeity('Plain Deity');

      // Create believers with high agreeableness + spirituality (resonates with benevolence)
      const mythBeliever = world.createEntity('agent') as EntityImpl;
      mythBeliever.addComponent(
        new PersonalityComponent({
          openness: 0.6,
          conscientiousness: 0.5,
          extraversion: 0.6,
          agreeableness: 0.9,
          neuroticism: 0.2,
          spirituality: 0.9,
        })
      );
      mythBeliever.addComponent(createSpiritualComponent(0.8, mythDeity.id));

      const plainBeliever = world.createEntity('agent') as EntityImpl;
      plainBeliever.addComponent(
        new PersonalityComponent({
          openness: 0.6,
          conscientiousness: 0.5,
          extraversion: 0.6,
          agreeableness: 0.9,
          neuroticism: 0.2,
          spirituality: 0.9,
        })
      );
      plainBeliever.addComponent(createSpiritualComponent(0.8, plainDeity.id));

      runSystem();

      const mythBelief = getTotalBeliefEarned(mythDeity);
      const plainBelief = getTotalBeliefEarned(plainDeity);

      // Benevolent myths + high agreeableness/spirituality should BOOST belief
      expect(mythBelief).toBeGreaterThan(plainBelief);
    });

    it('myth multiplier is capped at [0.5, 1.5]', () => {
      // Create deity with extreme myth traits
      const extremeDeity = createDeity('Extreme Deity');
      const extremeMyth = createTestMyth(extremeDeity.id, [
        { trait: 'benevolence', direction: 'positive', strength: 1.0 },
        { trait: 'compassion', direction: 'positive', strength: 1.0 },
        { trait: 'mercy', direction: 'positive', strength: 1.0 },
      ]);
      addMythologyToDeity(extremeDeity, [extremeMyth]);

      // Create deity with no myths for baseline
      const baseDeity = createDeity('Base Deity');

      // Max-resonance believer
      createBeliever({ deityId: extremeDeity.id, faith: 0.8 });
      createBeliever({ deityId: baseDeity.id, faith: 0.8 });

      runSystem();

      const extremeBelief = getTotalBeliefEarned(extremeDeity);
      const baseBelief = getTotalBeliefEarned(baseDeity);

      // Even with extreme traits, multiplier can't exceed 1.5x (allow float precision)
      if (baseBelief > 0) {
        expect(extremeBelief / baseBelief).toBeLessThanOrEqual(1.5 + 1e-10);
      }
    });

    it('deities without mythology get neutral multiplier (no behavior change)', () => {
      const deity1 = createDeity('No Myth Deity 1');
      const deity2 = createDeity('No Myth Deity 2');

      createBeliever({ deityId: deity1.id, faith: 0.8 });
      createBeliever({ deityId: deity2.id, faith: 0.8 });

      runSystem();

      const belief1 = getTotalBeliefEarned(deity1);
      const belief2 = getTotalBeliefEarned(deity2);

      // Without myths, both should generate identical belief
      expect(belief1).toBeCloseTo(belief2, 12);
    });
  });
});
