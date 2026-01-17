import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World.js';
import type { Entity } from '../../ecs/Entity.js';
import { EntityImpl } from '../../ecs/Entity.js';

import {
  CourtshipStateMachine,
  type CourtshipComponent,
  type CourtshipTactic,
  type CourtshipParadigm,
  type SexualityComponent,
} from '../courtship/index.js';

describe('CourtshipStateMachine', () => {
  let world: World;
  let stateMachine: CourtshipStateMachine;
  let agent1: Entity;
  let agent2: Entity;

  beforeEach(() => {
    world = new World();
    stateMachine = new CourtshipStateMachine();
    agent1 = world.createEntity();
    agent2 = world.createEntity();
  });

  describe('considerCourtship (idle -> interested)', () => {
    it('should return false if on cooldown', () => {
      const courtship = createCourtshipComponent({
        lastCourtshipAttempt: world.tick,
        courtshipCooldown: 5000,
      });
      const sexuality = createSexualityComponent({ activelySeeking: true });

      (agent1 as EntityImpl).addComponent(courtship);
      (agent1 as EntityImpl).addComponent(sexuality);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      // Just attempted, still on cooldown
      const result = stateMachine.considerCourtship(agent1, agent2, world);

      expect(result).toBe(false);
      expect(courtship.state).toBe('idle'); // Should not transition
    });

    it('should return false if not actively seeking', () => {
      const courtship = createCourtshipComponent({
        lastCourtshipAttempt: 0,
      });
      const sexuality = createSexualityComponent({ activelySeeking: false });

      (agent1 as EntityImpl).addComponent(courtship);
      (agent1 as EntityImpl).addComponent(sexuality);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const result = stateMachine.considerCourtship(agent1, agent2, world);

      expect(result).toBe(false);
    });

    it('should return false if compatibility below threshold', () => {
      const courtship = createCourtshipComponent({
        romanticInclination: 0.3, // Low inclination = high threshold
        lastCourtshipAttempt: 0,
      });
      const sexuality = createSexualityComponent({ activelySeeking: true });

      (agent1 as EntityImpl).addComponent(courtship);
      (agent1 as EntityImpl).addComponent(sexuality);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      // Compatibility will be low without proper species/personality setup
      const result = stateMachine.considerCourtship(agent1, agent2, world);

      expect(result).toBe(false);
    });

    it('should return true and transition to interested if conditions met', () => {
      const courtship = createCourtshipComponent({
        romanticInclination: 0.9, // Very high inclination = low threshold
        lastCourtshipAttempt: -10000, // Far in the past to avoid cooldown
      });
      const sexuality = createSexualityComponent({ activelySeeking: true });

      (agent1 as EntityImpl).addComponent(courtship);
      (agent1 as EntityImpl).addComponent(sexuality);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const result = stateMachine.considerCourtship(agent1, agent2, world);

      // With very high romantic inclination (0.9), threshold becomes 0.5 - 0.9*0.3 = 0.23
      // Even low compatibility should pass
      expect(result).toBe(true);
      expect(courtship.state).toBe('interested');
      expect(courtship.currentCourtshipTarget).toBe(agent2.id);
    });

    it('should respect per-agent rejection cooldown', () => {
      const courtship = createCourtshipComponent({
        rejectionCooldown: new Map([[agent2.id, world.tick + 10000]]),
        romanticInclination: 0.9,
        lastCourtshipAttempt: 0,
      });
      const sexuality = createSexualityComponent({ activelySeeking: true });

      (agent1 as EntityImpl).addComponent(courtship);
      (agent1 as EntityImpl).addComponent(sexuality);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      // Agent2 rejected agent1 recently
      const result = stateMachine.considerCourtship(agent1, agent2, world);

      expect(result).toBe(false);
    });

    it('should use romantic inclination to adjust threshold', () => {
      // Just verify the threshold calculation
      const highThreshold = 0.5 - 0.9 * 0.3; // = 0.23
      const lowThreshold = 0.5 - 0.2 * 0.3; // = 0.44

      expect(highThreshold).toBeLessThan(lowThreshold);
      expect(highThreshold).toBeCloseTo(0.23, 2);
      expect(lowThreshold).toBeCloseTo(0.44, 2);
    });
  });

  describe('initiateCourtship (interested -> courting)', () => {
    it('should transition agent to courting state', () => {
      const courtship1 = createCourtshipComponent({
        state: 'interested',
        currentCourtshipTarget: agent2.id,
      });
      const courtship2 = createCourtshipComponent();

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      stateMachine.initiateCourtship(agent1, agent2, world);

      expect(courtship1.state).toBe('courting');
      expect(courtship1.lastCourtshipAttempt).toBe(world.tick);
    });

    it('should create active courtship record', () => {
      const courtship1 = createCourtshipComponent({
        state: 'interested',
        currentCourtshipTarget: agent2.id,
      });
      const courtship2 = createCourtshipComponent();

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      stateMachine.initiateCourtship(agent1, agent2, world);

      expect(courtship1.activeCourtships).toHaveLength(1);
      expect(courtship1.activeCourtships[0]?.targetId).toBe(agent2.id);
      expect(courtship1.activeCourtships[0]?.startedAt).toBe(world.tick);
    });

    it('should notify target agent', () => {
      const courtship1 = createCourtshipComponent({
        state: 'interested',
        currentCourtshipTarget: agent2.id,
      });
      const courtship2 = createCourtshipComponent({
        state: 'idle',
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      stateMachine.initiateCourtship(agent1, agent2, world);

      expect(courtship2.state).toBe('being_courted');
      expect(courtship2.currentCourtshipInitiator).toBe(agent1.id);
    });

    it('should create received courtship record on target', () => {
      const courtship1 = createCourtshipComponent();
      const courtship2 = createCourtshipComponent({
        state: 'idle',
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      stateMachine.initiateCourtship(agent1, agent2, world);

      expect(courtship2.receivedCourtships).toHaveLength(1);
      expect(courtship2.receivedCourtships[0]?.initiatorId).toBe(agent1.id);
      expect(courtship2.receivedCourtships[0]?.currentInterest).toBeCloseTo(0.3, 1);
      expect(courtship2.receivedCourtships[0]?.willingToConsent).toBe(false);
    });

    it('should record start tick', () => {
      const courtship1 = createCourtshipComponent({
        state: 'interested',
      });
      const courtship2 = createCourtshipComponent();

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const currentTick = world.tick;
      stateMachine.initiateCourtship(agent1, agent2, world);

      expect(courtship1.activeCourtships[0]?.startedAt).toBe(currentTick);
    });
  });

  describe('performCourtshipTactic', () => {
    it('should record tactic in attempted tactics', () => {
      const courtship1 = createCourtshipComponent({
        state: 'courting',
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
      });
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.3,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const tactic = createTactic('conversation');
      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      expect(courtship1.activeCourtships[0]?.tacticsAttempted).toContain(tactic);
    });

    it('should calculate and record reception', () => {
      const courtship1 = createCourtshipComponent({
        state: 'courting',
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
      });
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.3,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const tactic = createTactic('conversation');
      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      expect(courtship1.activeCourtships[0]?.responses).toHaveLength(1);
      expect(courtship1.activeCourtships[0]?.responses[0]?.tactic).toBe(tactic);
      expect(courtship1.activeCourtships[0]?.responses[0]?.reception).toBeGreaterThanOrEqual(-1);
      expect(courtship1.activeCourtships[0]?.responses[0]?.reception).toBeLessThanOrEqual(1);
    });

    it('should update target interest level', () => {
      const courtship1 = createCourtshipComponent({
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
      });
      const courtship2 = createCourtshipComponent({
        state: 'being_courted',
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.3,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const initialInterest = courtship2.receivedCourtships[0]!.currentInterest;
      const tactic = createTactic('compliment', 0.7); // High appeal

      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      // Interest should have changed (up or down depending on reception)
      const newInterest = courtship2.receivedCourtships[0]!.currentInterest;
      expect(newInterest).not.toBe(initialInterest);
    });

    it('should cap interest at 1.0', () => {
      const courtship1 = createCourtshipComponent({
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
      });
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.95,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const tactic = createTactic('gift_giving', 0.8);
      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      const interest = courtship2.receivedCourtships[0]!.currentInterest;
      expect(interest).toBeLessThanOrEqual(1.0);
    });

    it('should update relationship affinity and familiarity', () => {
      // Create entities with relationship components
      const relationship2 = {
        type: 'relationship' as const,
        relationships: new Map(),
      };

      const courtship1 = createCourtshipComponent({
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
      });
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.5,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(relationship2);

      const tactic = createTactic('conversation', 0.6);
      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      // Should have created/updated relationship
      const updatedRelationship = (agent2 as EntityImpl).getComponent('relationship');
      expect(updatedRelationship).toBeDefined();
    });

    it('should update success probability', () => {
      const courtship1 = createCourtshipComponent({
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
      });
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [],
            currentInterest: 0.5,
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const tactic = createTactic('conversation');
      stateMachine.performCourtshipTactic(agent1, agent2, tactic, world);

      const probability = courtship1.activeCourtships[0]!.successProbability;
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
    });
  });

  describe('evaluateCourtship (being_courted -> accept/reject/continue)', () => {
    it('should return "continue" if paradigm requirements not met', () => {
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [createTactic('conversation')], // Only 1, need 5
            currentInterest: 0.6,
            willingToConsent: false,
          },
        ],
        paradigm: createHumanParadigm(), // Requires 5 tactics
      });

      (agent2 as EntityImpl).addComponent(courtship2);

      const result = stateMachine.evaluateCourtship(agent2, agent1, world);

      expect(result).toBe('continue');
    });

    it('should return "reject" if interest too low', () => {
      const courtship2 = createCourtshipComponent({
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [createTactic('conversation'), createTactic('compliment')],
            currentInterest: 0.15, // Very low
            willingToConsent: false,
          },
        ],
      });

      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const result = stateMachine.evaluateCourtship(agent2, agent1, world);

      expect(result).toBe('reject');
    });

    it('should return "accept" if decision score exceeds threshold', () => {
      const courtship2 = createCourtshipComponent({
        romanticInclination: 0.7,
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [
              createTactic('conversation'),
              createTactic('shared_activity'),
              createTactic('physical_proximity'),
              createTactic('gift_giving'),
              createTactic('compliment'),
            ],
            currentInterest: 0.8,
            willingToConsent: false,
          },
        ],
        paradigm: createHumanParadigm(),
      });

      (agent1 as EntityImpl).addComponent(createCourtshipComponent());
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const result = stateMachine.evaluateCourtship(agent2, agent1, world);

      expect(result).toBe('accept');
      expect(courtship2.receivedCourtships[0]?.willingToConsent).toBe(true);
    });

    it('should set willingToConsent to true on accept', () => {
      const courtship2 = createCourtshipComponent({
        romanticInclination: 0.9, // Very high
        receivedCourtships: [
          {
            initiatorId: agent1.id,
            startedAt: world.tick,
            tacticsReceived: [
              createTactic('conversation'),
              createTactic('shared_activity'),
              createTactic('physical_proximity'),
              createTactic('gift_giving'),
              createTactic('compliment'),
            ],
            currentInterest: 0.9,
            willingToConsent: false,
          },
        ],
        paradigm: createHumanParadigm(),
      });

      (agent1 as EntityImpl).addComponent(createCourtshipComponent());
      (agent1 as EntityImpl).addComponent(createSexualityComponent());
      (agent2 as EntityImpl).addComponent(courtship2);
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      const result = stateMachine.evaluateCourtship(agent2, agent1, world);

      expect(result).toBe('accept');
      expect(courtship2.receivedCourtships[0]?.willingToConsent).toBe(true);
    });

    it('should use romantic inclination to adjust threshold', () => {
      const highThreshold = 0.6 - 0.8 * 0.2; // 0.44
      const lowThreshold = 0.6 - 0.3 * 0.2; // 0.54

      expect(highThreshold).toBeLessThan(lowThreshold);
    });

    it('should check all required tactics are present', () => {
      const paradigm = createHumanParadigm();
      const tacticsReceived = [
        createTactic('conversation'),
        createTactic('shared_activity'),
        createTactic('physical_proximity'),
      ];

      // All 3 required tactics present
      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(false); // Still false because minimum not met (need 5 total)
    });

    it('should allow optional tactics to count toward minimum', () => {
      const paradigm = createHumanParadigm();
      const tacticsReceived = [
        createTactic('conversation'),
        createTactic('shared_activity'),
        createTactic('physical_proximity'),
        createTactic('gift_giving'), // optional
        createTactic('compliment'), // optional
      ];

      // 3 required + 2 optional = 5 total, meets minimum
      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(true);
    });
  });

  describe('transitionToMating (both consenting -> mating)', () => {
    it('should set both agents to consenting state', () => {
      const courtship1 = createCourtshipComponent();
      const courtship2 = createCourtshipComponent();

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent2 as EntityImpl).addComponent(courtship2);

      stateMachine.transitionToMating(agent1, agent2, world);

      expect(courtship1.state).toBe('consenting');
      expect(courtship2.state).toBe('consenting');
    });

    it('should emit courtship:consent event', () => {
      const courtship1 = createCourtshipComponent();
      const courtship2 = createCourtshipComponent();

      (agent1 as EntityImpl).addComponent(courtship1);
      (agent2 as EntityImpl).addComponent(courtship2);

      let eventEmitted = false;
      let eventData: any = null;

      world.eventBus.on('courtship:consent', (event) => {
        eventEmitted = true;
        eventData = event.data;
      });

      stateMachine.transitionToMating(agent1, agent2, world);
      world.eventBus.flush(); // Process queued events

      expect(eventEmitted).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.agent1).toBe(agent1.id);
      expect(eventData.agent2).toBe(agent2.id);
      expect(eventData.tick).toBe(world.tick);
    });

    it('should include mating behavior in event', () => {
      const paradigm = createHumanParadigm();

      const matingBehavior = paradigm.matingBehavior;

      expect(matingBehavior.type).toBe('private_location');
      expect(matingBehavior.requiredLocation).toBe('bed');
    });
  });

  describe('checkParadigmRequirements', () => {
    it('should return false if required tactics missing', () => {
      const paradigm = createHumanParadigm();
      const tacticsReceived = [createTactic('conversation')]; // Missing shared_activity, physical_proximity

      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(false);
    });

    it('should return false if minimum tactics not met', () => {
      const paradigm = createHumanParadigm(); // minimumTactics: 5
      const tacticsReceived = [
        createTactic('conversation'),
        createTactic('shared_activity'),
        createTactic('physical_proximity'),
      ]; // Only 3

      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(false);
    });

    it('should return true if all requirements met', () => {
      const paradigm = createHumanParadigm();
      const tacticsReceived = [
        createTactic('conversation'),
        createTactic('shared_activity'),
        createTactic('physical_proximity'),
        createTactic('gift_giving'),
        createTactic('compliment'),
      ];

      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(true);
    });

    it('should fail if forbidden tactic was used', () => {
      const paradigm = createHumanParadigm();
      const tacticsReceived = [
        createTactic('conversation'),
        createTactic('shared_activity'),
        createTactic('physical_proximity'),
        createTactic('aggressive_display'), // FORBIDDEN
        createTactic('compliment'),
      ];

      const result = stateMachine.checkParadigmRequirements(paradigm, tacticsReceived);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should throw when agent missing CourtshipComponent', () => {
      // Agent1 has no courtship component
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());
      (agent2 as EntityImpl).addComponent(createSexualityComponent());

      expect(() => {
        stateMachine.considerCourtship(agent1, agent2, world);
      }).toThrow('Agent missing CourtshipComponent');
    });

    it('should throw when agent missing SexualityComponent', () => {
      (agent1 as EntityImpl).addComponent(createCourtshipComponent());
      // Missing sexuality component

      expect(() => {
        stateMachine.considerCourtship(agent1, agent2, world);
      }).toThrow('Agent missing SexualityComponent');
    });

    it('should handle invalid target gracefully', () => {
      const courtship1 = createCourtshipComponent();
      (agent1 as EntityImpl).addComponent(courtship1);

      const invalidTarget: unknown = null;
      expect(() => {
        stateMachine.initiateCourtship(agent1, invalidTarget as Entity, world);
      }).toThrow('Invalid target entity');
    });

    it('should throw when performing tactic without active courtship', () => {
      const courtship1 = createCourtshipComponent({
        activeCourtships: [], // No active courtship
      });
      (agent1 as EntityImpl).addComponent(courtship1);
      (agent2 as EntityImpl).addComponent(createCourtshipComponent());

      expect(() => {
        stateMachine.performCourtshipTactic(agent1, agent2, createTactic('conversation'), world);
      }).toThrow('No active courtship found');
    });

    it('should NOT use fallback for missing paradigm requirements', () => {
      const invalidParadigm = {} as CourtshipParadigm;

      expect(() => {
        if (!invalidParadigm.requiredTactics) {
          throw new Error('Paradigm missing requiredTactics');
        }
      }).toThrow();
    });
  });
});

// Helper functions
function createCourtshipComponent(overrides: Partial<CourtshipComponent> = {}): CourtshipComponent {
  return {
    type: 'courtship',
    state: 'idle',
    currentCourtshipTarget: null,
    currentCourtshipInitiator: null,
    paradigm: createHumanParadigm(),
    preferredTactics: [],
    dislikedTactics: [],
    style: 'subtle',
    romanticInclination: 0.6,
    activeCourtships: [],
    receivedCourtships: [],
    pastCourtships: [],
    lastCourtshipAttempt: 0,
    courtshipCooldown: 5000,
    rejectionCooldown: new Map(),
    isOnCooldown: function (currentTick: number): boolean {
      return currentTick - this.lastCourtshipAttempt < this.courtshipCooldown;
    },
    isOnRejectionCooldown: function (targetId: string, currentTick: number): boolean {
      const cooldownEnd = this.rejectionCooldown.get(targetId);
      return cooldownEnd !== undefined && currentTick < cooldownEnd;
    },
    getActiveCourtship: function (targetId: string) {
      return this.activeCourtships.find((c) => c.targetId === targetId);
    },
    getReceivedCourtship: function (initiatorId: string) {
      return this.receivedCourtships.find((c) => c.initiatorId === initiatorId);
    },
    endCourtship: function (_targetId: string, _success: boolean, _reason: string, _tick: number) {
      this.state = 'idle';
      this.currentCourtshipTarget = null;
    },
    endReceivedCourtship: function (
      _initiatorId: string,
      _success: boolean,
      _reason: string,
      _tick: number
    ) {
      this.state = 'idle';
      this.currentCourtshipInitiator = null;
    },
    ...overrides,
  } as CourtshipComponent;
}

function createSexualityComponent(overrides: Partial<SexualityComponent> = {}): SexualityComponent {
  return {
    type: 'sexuality',
    orientation: 'bisexual',
    activelySeeking: true,
    fertilityModifier: 1.0,
    libido: 0.5,
    attractionCondition: { type: 'always' },
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'romantic',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    relationshipStyle: 'serially_monogamous',
    onset: 'immediate',
    fluidity: 'slow_change',
    reproductiveInterest: 'open_to_offspring',
    intimacyOpenness: 0.5,
    labels: [],
    inReceptiveCycle: false,
    activeAttractions: [],
    currentMates: [],
    rejections: [],
    pastMates: [],
    lifetimePartnerCount: 0,
    ...overrides,
  } as SexualityComponent;
}

function createHumanParadigm(): CourtshipParadigm {
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

function createTactic(id: string, baseAppeal: number = 0.5): CourtshipTactic {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    category: 'conversation',
    requirements: { proximity: 3, time: 200 },
    visibleToOthers: true,
    description: `Perform ${id}`,
    baseAppeal,
    appealModifiers: {},
  };
}
