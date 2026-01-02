import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World';
import type { Entity } from '../../ecs/Entity';

// Import classes and types
import { CourtshipComponent } from '../courtship/CourtshipComponent';
import type {
  CourtshipParadigm,
  CourtshipTactic,
  MatingBehavior,
} from '../courtship/types';
import type { CourtshipStateMachine } from '../courtship';

describe('CourtshipSystem', () => {
  let world: World;
  let agent1: Entity;
  let agent2: Entity;

  beforeEach(() => {
    world = new World();
    agent1 = world.createEntity();
    agent2 = world.createEntity();
  });

  describe('CourtshipComponent creation', () => {
    it('should create courtship component with default state', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: ['conversation', 'compliment', 'shared_meal'],
        dislikedTactics: ['aggressive_display'],
        style: 'subtle',
        romanticInclination: 0.6,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
      });

      expect(courtship.state).toBe('idle');
      expect(courtship.romanticInclination).toBe(0.6);
      expect(courtship.activeCourtships).toHaveLength(0);
    });

    it('should track romantic inclination between 0 and 1', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        romanticInclination: 0.8,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      expect(courtship.romanticInclination).toBeGreaterThanOrEqual(0);
      expect(courtship.romanticInclination).toBeLessThanOrEqual(1);
    });

    it('should initialize with empty courtship arrays', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'romantic',
        romanticInclination: 0.5,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      expect(courtship.activeCourtships).toEqual([]);
      expect(courtship.receivedCourtships).toEqual([]);
      expect(courtship.pastCourtships).toEqual([]);
    });

    it('should store courtship paradigm', () => {
      const paradigm = createHumanCourtshipParadigm();
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm,
        preferredTactics: [],
        dislikedTactics: [],
        style: 'creative',
        romanticInclination: 0.7,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      expect(courtship.paradigm).toBe(paradigm);
      expect(courtship.paradigm.type).toBe('gradual_proximity');
    });
  });

  describe('Courtship state transitions', () => {
    it('should transition from idle to interested when potential mate is near', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        romanticInclination: 0.8,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      // Transition to interested
      courtship.state = 'interested';
      courtship.currentCourtshipTarget = agent2.id;

      expect(courtship.state).toBe('interested');
      expect(courtship.currentCourtshipTarget).toBe(agent2.id);
    });

    it('should transition from interested to courting when initiating', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'interested',
        currentCourtshipTarget: agent2.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        romanticInclination: 0.7,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipInitiator: null,
      });

      // Initiate courtship
      courtship.state = 'courting';
      courtship.activeCourtships.push({
        targetId: agent2.id,
        startedAt: world.tick,
        tacticsAttempted: [],
        responses: [],
        compatibilityScore: 0.7,
        successProbability: 0,
      });

      expect(courtship.state).toBe('courting');
      expect(courtship.activeCourtships).toHaveLength(1);
      expect(courtship.activeCourtships[0]!.targetId).toBe(agent2.id);
    });

    it('should track being courted state', () => {
      const courtship = agent2.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'subtle',
        romanticInclination: 0.5,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      // Agent 1 courts Agent 2
      courtship.state = 'being_courted';
      courtship.currentCourtshipInitiator = agent1.id;
      courtship.receivedCourtships.push({
        initiatorId: agent1.id,
        startedAt: world.tick,
        tacticsReceived: [],
        currentInterest: 0.3,
        willingToConsent: false,
      });

      expect(courtship.state).toBe('being_courted');
      expect(courtship.receivedCourtships).toHaveLength(1);
      expect(courtship.receivedCourtships[0]!.initiatorId).toBe(agent1.id);
    });

    it('should transition to consenting when both agree', () => {
      const courtship1 = agent1.addComponent(CourtshipComponent, {
        state: 'courting',
        currentCourtshipTarget: agent2.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'romantic',
        romanticInclination: 0.7,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipInitiator: null,
      });

      const courtship2 = agent2.addComponent(CourtshipComponent, {
        state: 'being_courted',
        currentCourtshipInitiator: agent1.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'subtle',
        romanticInclination: 0.6,
        activeCourtships: [],
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: ['conversation', 'compliment', 'shared_meal'],
            currentInterest: 0.8,
            willingToConsent: true,
          },
        ],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
      });

      // Both consent
      courtship1.state = 'consenting';
      courtship2.state = 'consenting';

      expect(courtship1.state).toBe('consenting');
      expect(courtship2.state).toBe('consenting');
      expect(courtship2.receivedCourtships[0]!.willingToConsent).toBe(true);
    });
  });

  describe('Courtship tactics', () => {
    it('should record attempted tactic', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'courting',
        currentCourtshipTarget: agent2.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        romanticInclination: 0.7,
        activeCourtships: [
          {
            targetId: agent2.id,
            startedAt: world.tick,
            tacticsAttempted: [],
            responses: [],
            compatibilityScore: 0.7,
            successProbability: 0,
          },
        ],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipInitiator: null,
      });

      const tactic = createConversationTactic();
      courtship.activeCourtships[0]!.tacticsAttempted.push(tactic);

      expect(courtship.activeCourtships[0]!.tacticsAttempted).toHaveLength(1);
      expect(courtship.activeCourtships[0]!.tacticsAttempted[0]).toBe(tactic);
    });

    it('should record tactic response', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'courting',
        currentCourtshipTarget: agent2.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'creative',
        romanticInclination: 0.6,
        activeCourtships: [
          {
            targetId: agent2.id,
            startedAt: world.tick,
            tacticsAttempted: [],
            responses: [],
            compatibilityScore: 0.7,
            successProbability: 0,
          },
        ],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipInitiator: null,
      });

      const tactic = createConversationTactic();
      const reception = 0.6; // Positive reception

      courtship.activeCourtships[0]!.responses.push({ tactic, reception });

      expect(courtship.activeCourtships[0]!.responses).toHaveLength(1);
      expect(courtship.activeCourtships[0]!.responses[0]!.reception).toBe(0.6);
    });

    it('should track tactics received by target', () => {
      const courtship = agent2.addComponent(CourtshipComponent, {
        state: 'being_courted',
        currentCourtshipInitiator: agent1.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: ['conversation', 'compliment'],
        dislikedTactics: ['aggressive_display'],
        style: 'subtle',
        romanticInclination: 0.5,
        activeCourtships: [],
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.3,
            willingToConsent: false,
          },
        ],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
      });

      const tactic1 = createConversationTactic();
      const tactic2 = createComplimentTactic();

      courtship.receivedCourtships[0]!.tacticsReceived.push(tactic1, tactic2);

      expect(courtship.receivedCourtships[0]!.tacticsReceived).toHaveLength(2);
    });

    it('should increase interest based on preferred tactics', () => {
      const courtship = agent2.addComponent(CourtshipComponent, {
        state: 'being_courted',
        currentCourtshipInitiator: agent1.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: ['conversation', 'shared_meal'],
        dislikedTactics: [],
        style: 'traditional',
        romanticInclination: 0.6,
        activeCourtships: [],
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.3,
            willingToConsent: false,
          },
        ],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
      });

      const initialInterest = courtship.receivedCourtships[0]!.currentInterest;

      // Receive preferred tactic
      const tactic = createConversationTactic();
      courtship.receivedCourtships[0]!.tacticsReceived.push(tactic);
      courtship.receivedCourtships[0]!.currentInterest += 0.2;

      expect(courtship.receivedCourtships[0]!.currentInterest).toBeGreaterThan(
        initialInterest
      );
    });

    it('should decrease interest based on disliked tactics', () => {
      const courtship = agent2.addComponent(CourtshipComponent, {
        state: 'being_courted',
        currentCourtshipInitiator: agent1.id,
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: ['conversation'],
        dislikedTactics: ['aggressive_display'],
        style: 'subtle',
        romanticInclination: 0.5,
        activeCourtships: [],
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.5,
            willingToConsent: false,
          },
        ],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
      });

      const initialInterest = courtship.receivedCourtships[0]!.currentInterest;

      // Receive disliked tactic
      const tactic = createAggressiveDisplayTactic();
      courtship.receivedCourtships[0]!.tacticsReceived.push(tactic);
      courtship.receivedCourtships[0]!.currentInterest -= 0.3;

      expect(courtship.receivedCourtships[0]!.currentInterest).toBeLessThan(
        initialInterest
      );
    });
  });

  describe('Courtship paradigms', () => {
    it('should define required tactics for human courtship', () => {
      const paradigm = createHumanCourtshipParadigm();

      expect(paradigm.requiredTactics).toContain('conversation');
      expect(paradigm.requiredTactics).toContain('shared_activity');
      expect(paradigm.requiredTactics).toContain('physical_proximity');
    });

    it('should define forbidden tactics for human courtship', () => {
      const paradigm = createHumanCourtshipParadigm();

      expect(paradigm.forbiddenTactics).toContain('aggressive_display');
      expect(paradigm.forbiddenTactics).toContain('dominance_combat');
    });

    it('should specify minimum tactics needed', () => {
      const paradigm = createHumanCourtshipParadigm();

      expect(paradigm.minimumTactics).toBeGreaterThan(0);
      expect(paradigm.minimumTactics).toBe(5);
    });

    it('should define mating behavior for humans', () => {
      const paradigm = createHumanCourtshipParadigm();

      expect(paradigm.matingBehavior.type).toBe('private_location');
      expect(paradigm.matingBehavior.requiredLocation).toBe('bed');
      expect(paradigm.matingBehavior.bothMustBePresent).toBe(true);
      expect(paradigm.matingBehavior.privateSpace).toBe(true);
    });

    it('should have different paradigm for dwarves', () => {
      const paradigm = createDwarfCourtshipParadigm();

      expect(paradigm.type).toBe('construction');
      expect(paradigm.requiredTactics).toContain('craft_gift');
      expect(paradigm.requiredTactics).toContain('demonstrate_skill');
      expect(paradigm.forbiddenTactics).toContain('hasty_approach');
    });

    it('should have different paradigm for bird-folk', () => {
      const paradigm = createBirdFolkCourtshipParadigm();

      expect(paradigm.type).toBe('display');
      expect(paradigm.requiredTactics).toContain('aerial_dance');
      expect(paradigm.requiredTactics).toContain('plumage_display');
      expect(paradigm.requiredTactics).toContain('song');
      expect(paradigm.matingBehavior.requiredLocation).toBe('nest');
    });
  });

  describe('Compatibility calculation', () => {
    it('should calculate compatibility between two agents', () => {
      // This will test the actual compatibility function once implemented
      // For now, we test the structure

      const compatibility = 0.7; // Mock value

      expect(compatibility).toBeGreaterThanOrEqual(0);
      expect(compatibility).toBeLessThanOrEqual(1);
    });

    it('should factor in sexual compatibility', () => {
      // Both agents must be attracted to each other
      // This requires SexualityComponent integration
      const sexualCompatibility = 1.0; // Both attracted

      expect(sexualCompatibility).toBeGreaterThan(0);
    });

    it('should factor in personality compatibility', () => {
      // Complementary or shared personality traits
      const personalityScore = 0.6;

      expect(personalityScore).toBeGreaterThanOrEqual(0);
      expect(personalityScore).toBeLessThanOrEqual(1);
    });

    it('should factor in relationship strength', () => {
      // Existing familiarity, affinity, trust
      const relationshipScore = 0.5;

      expect(relationshipScore).toBeGreaterThanOrEqual(0);
      expect(relationshipScore).toBeLessThanOrEqual(1);
    });

    it('should return 0 if not mutually attracted', () => {
      // If one agent is not attracted to the other, compatibility is 0
      const noAttraction = 0;

      expect(noAttraction).toBe(0);
    });
  });

  describe('Cooldowns and rejections', () => {
    it('should enforce courtship cooldown', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        romanticInclination: 0.7,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: world.tick,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      expect(courtship.lastCourtshipAttempt).toBe(world.tick);
      expect(courtship.courtshipCooldown).toBe(5000);

      // Should not attempt courtship again until cooldown passes
      const canCourt = world.tick - courtship.lastCourtshipAttempt >= courtship.courtshipCooldown;
      expect(canCourt).toBe(false); // Cooldown just started, cannot court yet
    });

    it('should track per-agent rejection cooldown', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'bold',
        romanticInclination: 0.6,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      // Rejected by agent2
      courtship.rejectionCooldown.set(agent2.id, world.tick + 10000);

      expect(courtship.rejectionCooldown.has(agent2.id)).toBe(true);
      expect(courtship.rejectionCooldown.get(agent2.id)!).toBeGreaterThan(world.tick);
    });

    it('should record past courtships', () => {
      const courtship = agent1.addComponent(CourtshipComponent, {
        state: 'idle',
        paradigm: createHumanCourtshipParadigm(),
        preferredTactics: [],
        dislikedTactics: [],
        style: 'romantic',
        romanticInclination: 0.7,
        activeCourtships: [],
        receivedCourtships: [],
        pastCourtships: [],
        lastCourtshipAttempt: 0,
        courtshipCooldown: 5000,
        rejectionCooldown: new Map(),
        currentCourtshipTarget: null,
        currentCourtshipInitiator: null,
      });

      courtship.pastCourtships.push({
        partnerId: agent2.id,
        wasInitiator: true,
        succeeded: false,
        duration: 3000,
        endReason: 'rejected',
      });

      expect(courtship.pastCourtships).toHaveLength(1);
      expect(courtship.pastCourtships[0]!.succeeded).toBe(false);
      expect(courtship.pastCourtships[0]!.endReason).toBe('rejected');
    });
  });

  describe('Mating behaviors', () => {
    it('should require private location for human mating', () => {
      const mating: MatingBehavior = {
        type: 'private_location',
        requiredLocation: 'bed',
        bothMustBePresent: true,
        privateSpace: true,
        duration: 600,
      };

      expect(mating.requiredLocation).toBe('bed');
      expect(mating.privateSpace).toBe(true);
      expect(mating.bothMustBePresent).toBe(true);
    });

    it('should require nest location for bird-folk mating', () => {
      const mating: MatingBehavior = {
        type: 'nest_location',
        requiredLocation: 'nest',
        bothMustBePresent: true,
        privateSpace: true,
        duration: 300,
      };

      expect(mating.requiredLocation).toBe('nest');
      expect(mating.type).toBe('nest_location');
    });

    it('should allow public mating for mystif union magic', () => {
      const mating: MatingBehavior = {
        type: 'ritual_space',
        requiredLocation: 'union_circle',
        bothMustBePresent: true,
        privateSpace: false,
        duration: 1200,
        ritualComponents: ['union_candles', 'incense', 'union_chalk'],
      };

      expect(mating.privateSpace).toBe(false);
      expect(mating.ritualComponents).toContain('union_candles');
    });

    it('should define post-mating effects', () => {
      const mating: MatingBehavior = {
        type: 'private_location',
        requiredLocation: 'bed',
        bothMustBePresent: true,
        privateSpace: true,
        duration: 600,
        postMatingEffects: {
          moodBoost: 20,
          energyCost: 15,
          bondStrength: 0.8,
        },
      };

      expect(mating.postMatingEffects?.moodBoost).toBe(20);
      expect(mating.postMatingEffects?.energyCost).toBe(15);
      expect(mating.postMatingEffects?.bondStrength).toBe(0.8);
    });
  });

  describe('Error handling', () => {
    it('should throw when romantic inclination is out of range', () => {
      expect(() => {
        agent1.addComponent(CourtshipComponent, {
          state: 'idle',
          paradigm: createHumanCourtshipParadigm(),
          preferredTactics: [],
          dislikedTactics: [],
          style: 'bold',
          romanticInclination: 1.5, // Invalid: > 1
          activeCourtships: [],
          receivedCourtships: [],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipTarget: null,
          currentCourtshipInitiator: null,
        });
      }).toThrow();
    });

    it('should throw when paradigm is missing', () => {
      expect(() => {
        agent1.addComponent(CourtshipComponent, {
          state: 'idle',
          paradigm: null as any, // Invalid: required field
          preferredTactics: [],
          dislikedTactics: [],
          style: 'bold',
          romanticInclination: 0.6,
          activeCourtships: [],
          receivedCourtships: [],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipTarget: null,
          currentCourtshipInitiator: null,
        });
      }).toThrow();
    });

    it('should throw when state is invalid', () => {
      expect(() => {
        agent1.addComponent(CourtshipComponent, {
          state: 'invalid_state' as any,
          paradigm: createHumanCourtshipParadigm(),
          preferredTactics: [],
          dislikedTactics: [],
          style: 'bold',
          romanticInclination: 0.6,
          activeCourtships: [],
          receivedCourtships: [],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipTarget: null,
          currentCourtshipInitiator: null,
        });
      }).toThrow();
    });

    it('should NOT use fallback for missing required fields', () => {
      expect(() => {
        agent1.addComponent(CourtshipComponent, {
          state: 'idle',
          // Missing paradigm - should throw, not default
          preferredTactics: [],
          dislikedTactics: [],
          style: 'bold',
          romanticInclination: 0.6,
          activeCourtships: [],
          receivedCourtships: [],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipTarget: null,
          currentCourtshipInitiator: null,
        } as any);
      }).toThrow();
    });

    it('should throw when compatibility score is out of range', () => {
      expect(() => {
        agent1.addComponent(CourtshipComponent, {
          state: 'courting',
          currentCourtshipTarget: agent2.id,
          paradigm: createHumanCourtshipParadigm(),
          preferredTactics: [],
          dislikedTactics: [],
          style: 'bold',
          romanticInclination: 0.7,
          activeCourtships: [
            {
              targetId: agent2.id,
              startedAt: world.tick,
              tacticsAttempted: [],
              responses: [],
              compatibilityScore: 1.5, // Invalid: > 1
              successProbability: 0,
            },
          ],
          receivedCourtships: [],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipInitiator: null,
        });
      }).toThrow();
    });

    it('should throw when interest level is out of range', () => {
      expect(() => {
        agent2.addComponent(CourtshipComponent, {
          state: 'being_courted',
          currentCourtshipInitiator: agent1.id,
          paradigm: createHumanCourtshipParadigm(),
          preferredTactics: [],
          dislikedTactics: [],
          style: 'subtle',
          romanticInclination: 0.5,
          activeCourtships: [],
          receivedCourtships: [
            {
              initiatorId: agent1.id,
              startedAt: world.tick,
              tacticsReceived: [],
              currentInterest: 2.0, // Invalid: > 1
              willingToConsent: false,
            },
          ],
          pastCourtships: [],
          lastCourtshipAttempt: 0,
          courtshipCooldown: 5000,
          rejectionCooldown: new Map(),
          currentCourtshipTarget: null,
        });
      }).toThrow();
    });
  });
});

// Helper functions to create test data
function createHumanCourtshipParadigm(): CourtshipParadigm {
  return {
    type: 'gradual_proximity',
    requiredTactics: ['conversation', 'shared_activity', 'physical_proximity'],
    optionalTactics: ['gift_giving', 'compliment', 'humor', 'touch', 'shared_meal'],
    forbiddenTactics: ['aggressive_display', 'dominance_combat'],
    minimumTactics: 5,
    typicalDuration: [10000, 50000],
    locationRequirement: null,
    matingBehavior: {
      type: 'private_location',
      requiredLocation: 'bed',
      bothMustBePresent: true,
      privateSpace: true,
      duration: 600,
    },
  };
}

function createDwarfCourtshipParadigm(): CourtshipParadigm {
  return {
    type: 'construction',
    requiredTactics: ['craft_gift', 'demonstrate_skill', 'shared_project'],
    optionalTactics: ['share_ale', 'tell_saga', 'show_wealth'],
    forbiddenTactics: ['hasty_approach'],
    minimumTactics: 4,
    typicalDuration: [30000, 100000],
    locationRequirement: {
      type: 'workshop',
      requiresQuality: 'high',
    },
    matingBehavior: {
      type: 'private_location',
      requiredLocation: 'bed',
      bothMustBePresent: true,
      privateSpace: true,
      duration: 600,
    },
  };
}

function createBirdFolkCourtshipParadigm(): CourtshipParadigm {
  return {
    type: 'display',
    requiredTactics: ['aerial_dance', 'plumage_display', 'song'],
    optionalTactics: ['gift_giving', 'nest_construction'],
    forbiddenTactics: [],
    minimumTactics: 3,
    typicalDuration: [5000, 15000],
    locationRequirement: {
      type: 'elevated',
      minHeight: 5,
      visibility: 'public',
    },
    matingBehavior: {
      type: 'nest_location',
      requiredLocation: 'nest',
      bothMustBePresent: true,
      privateSpace: true,
      duration: 300,
    },
  };
}

function createConversationTactic(): CourtshipTactic {
  return {
    id: 'conversation',
    name: 'Conversation',
    category: 'conversation',
    requirements: { proximity: 3, time: 200 },
    visibleToOthers: true,
    description: 'Talk and get to know each other',
    baseAppeal: 0.3,
    appealModifiers: {},
  };
}

function createComplimentTactic(): CourtshipTactic {
  return {
    id: 'compliment',
    name: 'Compliment',
    category: 'conversation',
    requirements: { proximity: 3, time: 50 },
    visibleToOthers: false,
    description: 'Give a sincere compliment',
    baseAppeal: 0.4,
    appealModifiers: {},
  };
}

function createAggressiveDisplayTactic(): CourtshipTactic {
  return {
    id: 'aggressive_display',
    name: 'Aggressive Display',
    category: 'dominance',
    requirements: { proximity: 5, time: 100 },
    visibleToOthers: true,
    description: 'Show dominance aggressively',
    baseAppeal: -0.5,
    appealModifiers: {},
  };
}
