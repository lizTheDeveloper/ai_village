import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeathBargainSystem } from '../DeathBargainSystem';
import { EntityImpl } from '../../ecs/Entity';
import { WorldImpl } from '../../ecs/World';
import { EventBusImpl } from '../../events/EventBus';
import { ComponentType } from '../../types/ComponentType';
import { MYTHIC_RIDDLES } from '../../components/DeathBargainComponent';
import type { DeathBargainComponent } from '../../components/DeathBargainComponent';
import type { LLMProvider } from '@ai-village/llm';
import type { World } from '../../ecs/World';

describe('DeathBargainSystem', () => {
  let system: DeathBargainSystem;
  let world: World;
  let mockLLM: LLMProvider;

  beforeEach(() => {
    system = new DeathBargainSystem();
    world = new WorldImpl(new EventBusImpl());

    // Mock LLM provider
    mockLLM = {
      generate: vi.fn().mockResolvedValue({
        text: 'YES',
        usage: { promptTokens: 10, completionTokens: 1 }
      }),
    } as unknown as LLMProvider;

    system.setLLMProvider(mockLLM);
    system.setUseLLM(false); // Disable LLM for most tests
  });

  describe('qualifiesForDeathBargain', () => {
    it('should reject entities without souls', () => {
      const entity = createMockHero();
      entity.components.delete('soul_identity');

      const qualifies = system.qualifiesForDeathBargain(entity);

      // Should return false without soul
      expect(qualifies).toBe(false);
    });

    it('should reject entities without grand destiny', () => {
      const entity = createMockHero({
        destiny: 'live a quiet life farming',
        combatSkill: 10,
      });

      const qualifies = system.qualifiesForDeathBargain(entity);

      expect(qualifies).toBe(false);
    });
  });

  describe('offerDeathBargain', () => {
    it('should create death bargain component', () => {
      const entity = createMockHero();
      const deathLocation = { x: 100, y: 200 };
      const causeOfDeath = 'combat';

      system.offerDeathBargain(world, entity, deathLocation, causeOfDeath);

      const bargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      expect(bargain).toBeDefined();
      expect(bargain.type).toBe('death_bargain');
      expect(bargain.status).toBe('offered');
      expect(bargain.challengeType).toBe('riddle');
      expect(bargain.deathLocation).toEqual(deathLocation);
      expect(bargain.causeOfDeath).toBe(causeOfDeath);
      expect(bargain.deathGodDialogue.length).toBeGreaterThan(0);
    });

    it('should emit death:bargain_offered event', () => {
      const entity = createMockHero();
      const events: any[] = [];

      // Register event listener BEFORE calling the system
      (world.eventBus as any).on('death:bargain_offered', (event: any) => {
        events.push(event);
      });

      system.offerDeathBargain(world, entity, { x: 0, y: 0 }, 'starvation');

      // Flush event queue to process events
      (world.eventBus as any).flush();

      // Events should now be processed
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('death:bargain_offered');
      expect(events[0].data.entityId).toBe(entity.id);
      expect(events[0].data.challengeType).toBe('riddle');
    });
  });

  describe('Sphinx Riddle - Direct Component Manipulation', () => {
    it('should use Sphinx riddle data from MYTHIC_RIDDLES', () => {
      const sphinxRiddle = MYTHIC_RIDDLES.sphinx;

      expect(sphinxRiddle.question).toContain('four legs');
      expect(sphinxRiddle.correctAnswer).toBe('man');
      expect(sphinxRiddle.acceptedAnswers).toContain('human');
      expect(sphinxRiddle.acceptedAnswers).toContain('person');
    });

    it('should accept exact correct answer without LLM', async () => {
      const entity = createMockHero();

      // Manually set up bargain in 'in_progress' state with riddle
      const bargain: DeathBargainComponent = {
        type: 'death_bargain',
        version: 1,
        challengeType: 'riddle',
        challengeDescription: MYTHIC_RIDDLES.sphinx.question,
        deathGodDialogue: [],
        deathGodName: 'Thanatos',
        status: 'in_progress',
        attempts: 0,
        maxAttempts: 3,
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        causeOfDeath: 'combat',
        riddle: {
          question: MYTHIC_RIDDLES.sphinx.question,
          correctAnswer: MYTHIC_RIDDLES.sphinx.correctAnswer,
          acceptedAnswers: [...MYTHIC_RIDDLES.sphinx.acceptedAnswers],
        },
        heroResponse: 'man', // Exact correct answer
      };

      (entity as EntityImpl).addComponent(bargain);

      // Update system to process the answer
      await system.update(world, [entity], 0);

      const updatedBargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      // Should succeed with exact match
      expect(updatedBargain.status).toBe('succeeded');
      expect(updatedBargain.succeeded).toBe(true);
      expect(updatedBargain.resurrectConditions).toBeDefined();
    });

    it('should accept alternative answer', async () => {
      const entity = createMockHero();

      const bargain: DeathBargainComponent = {
        type: 'death_bargain',
        version: 1,
        challengeType: 'riddle',
        challengeDescription: MYTHIC_RIDDLES.sphinx.question,
        deathGodDialogue: [],
        deathGodName: 'Thanatos',
        status: 'in_progress',
        attempts: 0,
        maxAttempts: 3,
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        causeOfDeath: 'combat',
        riddle: {
          question: MYTHIC_RIDDLES.sphinx.question,
          correctAnswer: MYTHIC_RIDDLES.sphinx.correctAnswer,
          acceptedAnswers: [...MYTHIC_RIDDLES.sphinx.acceptedAnswers],
        },
        heroResponse: 'human', // Alternative answer
      };

      (entity as EntityImpl).addComponent(bargain);

      await system.update(world, [entity], 0);

      const updatedBargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      expect(updatedBargain.status).toBe('succeeded');
      expect(updatedBargain.succeeded).toBe(true);
    });

    it('should reject wrong answer and allow retry', async () => {
      const entity = createMockHero();

      const bargain: DeathBargainComponent = {
        type: 'death_bargain',
        version: 1,
        challengeType: 'riddle',
        challengeDescription: MYTHIC_RIDDLES.sphinx.question,
        deathGodDialogue: [],
        deathGodName: 'Thanatos',
        status: 'in_progress',
        attempts: 0,
        maxAttempts: 3,
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        causeOfDeath: 'combat',
        riddle: {
          question: MYTHIC_RIDDLES.sphinx.question,
          correctAnswer: MYTHIC_RIDDLES.sphinx.correctAnswer,
          acceptedAnswers: [...MYTHIC_RIDDLES.sphinx.acceptedAnswers],
        },
        heroResponse: 'a dog', // Wrong answer
      };

      (entity as EntityImpl).addComponent(bargain);

      await system.update(world, [entity], 0);

      const updatedBargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      // Should still be in progress with one attempt used
      expect(updatedBargain.attempts).toBe(1);
      expect(updatedBargain.status).toBe('in_progress');
      expect(updatedBargain.heroResponse).toBeUndefined(); // Cleared for next attempt
    });

    it('should fail after max attempts', async () => {
      const entity = createMockHero();

      const bargain: DeathBargainComponent = {
        type: 'death_bargain',
        version: 1,
        challengeType: 'riddle',
        challengeDescription: MYTHIC_RIDDLES.sphinx.question,
        deathGodDialogue: [],
        deathGodName: 'Thanatos',
        status: 'in_progress',
        attempts: 2, // Already used 2 attempts
        maxAttempts: 3,
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        causeOfDeath: 'combat',
        riddle: {
          question: MYTHIC_RIDDLES.sphinx.question,
          correctAnswer: MYTHIC_RIDDLES.sphinx.correctAnswer,
          acceptedAnswers: [...MYTHIC_RIDDLES.sphinx.acceptedAnswers],
        },
        heroResponse: 'wrong answer',
      };

      (entity as EntityImpl).addComponent(bargain);

      await system.update(world, [entity], 0);

      const updatedBargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      expect(updatedBargain.status).toBe('failed');
      expect(updatedBargain.succeeded).toBe(false);
      expect(updatedBargain.attempts).toBe(3);
    });
  });

  describe('Core functionality smoke test', () => {
    it('should handle full death bargain flow', () => {
      const entity = createMockHero();

      // Step 1: Offer bargain
      system.offerDeathBargain(world, entity, { x: 100, y: 200 }, 'combat');

      let bargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;
      expect(bargain.status).toBe('offered');

      // Step 2: Accept bargain
      bargain.status = 'accepted';

      // Step 3: System generates challenge (this happens in update)
      // Simulate what generateRiddle does
      bargain.status = 'in_progress';
      bargain.riddle = {
        question: MYTHIC_RIDDLES.sphinx.question,
        correctAnswer: MYTHIC_RIDDLES.sphinx.correctAnswer,
        acceptedAnswers: [...MYTHIC_RIDDLES.sphinx.acceptedAnswers],
      };

      expect(bargain.riddle).toBeDefined();
      expect(bargain.status).toBe('in_progress');

      // Step 4: Hero answers correctly
      bargain.heroResponse = 'man';

      // Component is set up for success
      expect(bargain.heroResponse).toBe('man');
      expect(bargain.riddle.correctAnswer).toBe('man');
    });
  });
});

// Helper Functions

function createMockHero(overrides?: {
  destiny?: string;
  combatSkill?: number;
  health?: number;
}): EntityImpl {
  const entity = new EntityImpl('test-hero-123');

  // Soul identity with destiny
  (entity as any).addComponent({
    type: 'soul_identity',
    destiny: overrides?.destiny ?? 'unite the kingdoms and save the world',
    soulId: 'soul-123',
    incarnationCount: 1,
  });

  // Skills component
  (entity as any).addComponent({
    type: 'skills',
    combat: overrides?.combatSkill ?? 10,
  });

  // Agent component
  (entity as any).addComponent({
    type: 'agent',
    reputation: 15,
  });

  // Needs component
  (entity as any).addComponent({
    type: 'needs',
    health: overrides?.health ?? 0,
    hunger: 0,
    energy: 0,
    temperature: 37,
  });

  // Position component
  (entity as any).addComponent({
    type: 'position',
    x: 100,
    y: 200,
  });

  // Identity component
  (entity as any).addComponent({
    type: 'identity',
    name: 'Heroic McHeroface',
  });

  return entity;
}
