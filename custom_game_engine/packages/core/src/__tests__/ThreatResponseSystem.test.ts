import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World';
import { ThreatResponseSystem } from '../systems/ThreatResponseSystem';
import {
  calculatePowerDifferential,
  isCriticalThreat,
  canLikelyWin,
  isEvenMatch,
} from '../components/ThreatDetectionComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import { Entity } from '../ecs/Entity';
import { EventBusImpl, type EventBus } from '../events/EventBus';

// ─── Utility function unit tests ────────────────────────────────────────────

describe('ThreatDetectionComponent utilities', () => {
  describe('calculatePowerDifferential', () => {
    it('returns negative when threat is stronger', () => {
      expect(calculatePowerDifferential(30, 60)).toBe(-30);
    });

    it('returns positive when agent is stronger', () => {
      expect(calculatePowerDifferential(50, 20)).toBe(30);
    });

    it('returns zero for equal power', () => {
      expect(calculatePowerDifferential(50, 50)).toBe(0);
    });
  });

  describe('isCriticalThreat', () => {
    it('identifies a critical threat (differential < -30)', () => {
      expect(isCriticalThreat(-31)).toBe(true);
      expect(isCriticalThreat(-40)).toBe(true);
    });

    it('does not flag moderate disadvantage as critical', () => {
      expect(isCriticalThreat(-30)).toBe(false);
      expect(isCriticalThreat(-15)).toBe(false);
    });
  });

  describe('canLikelyWin', () => {
    it('confirms win likelihood when differential > 15', () => {
      expect(canLikelyWin(16)).toBe(true);
      expect(canLikelyWin(30)).toBe(true);
    });

    it('does not confirm win on even or slight advantage', () => {
      expect(canLikelyWin(15)).toBe(false);
      expect(canLikelyWin(0)).toBe(false);
    });
  });

  describe('isEvenMatch', () => {
    it('identifies even match when differential is within ±15', () => {
      expect(isEvenMatch(0)).toBe(true);
      expect(isEvenMatch(15)).toBe(true);
      expect(isEvenMatch(-15)).toBe(true);
    });

    it('does not consider large differentials as even', () => {
      expect(isEvenMatch(16)).toBe(false);
      expect(isEvenMatch(-16)).toBe(false);
    });
  });
});

// ─── ThreatResponseSystem integration tests ──────────────────────────────────

/**
 * Helper: create a minimal agent entity with required components.
 * Personality: neuroticism and agreeableness control courage/aggression.
 * scanInterval: 0 ensures scan happens on tick 0.
 */
function createAgent(
  world: World,
  opts: {
    x?: number;
    y?: number;
    neuroticism?: number;
    agreeableness?: number;
  } = {}
): Entity {
  const { x = 0, y = 0, neuroticism = 0.5, agreeableness = 0.5 } = opts;
  const entity = world.createEntity();
  entity.addComponent('position', { x, y });
  entity.addComponent(new PersonalityComponent({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness,
    neuroticism,
  }));
  entity.addComponent({
    type: 'threat_detection' as const,
    version: 1 as const,
    threats: [],
    currentResponse: undefined,
    ownPowerLevel: 50,
    lastScanTime: 0,
    scanInterval: 0, // Always scan in tests
  });
  entity.addComponent('agent', { name: 'TestAgent' });
  return entity;
}

/** Helper: create a wild animal entity at given position with given danger level. */
function createAnimal(
  world: World,
  opts: { x?: number; y?: number; danger?: number; tamed?: boolean } = {}
): Entity {
  const { x = 5, y = 5, danger = 9, tamed = false } = opts;
  const entity = world.createEntity();
  entity.addComponent('position', { x, y });
  entity.addComponent('animal', { species: 'wolf', danger, tamed, hunger: 80 });
  return entity;
}

describe('ThreatResponseSystem', () => {
  let world: World;
  let system: ThreatResponseSystem;
  let eventBus: EventBus;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new ThreatResponseSystem();
    await system.initialize(world, eventBus);
  });

  describe('Auto-flee behavior (Criterion 2)', () => {
    it('cowardly agent flees critical threat (power diff < -30, courage < 0.9)', () => {
      // Agent power ≈ 50 (base, no skills), animal power = 90 (danger 9)
      // Differential = -40 → critical threat
      // Courage = 1 - neuroticism = 1 - 0.8 = 0.2 < 0.9 → flee
      const agent = createAgent(world, { neuroticism: 0.8 });
      createAnimal(world, { x: 5, y: 5, danger: 9 }); // power = 90, within 20 tiles

      system.update(world, Array.from(world.entities.values()), 0);

      const threatComp = agent.getComponent<any>('threat_detection');
      expect(threatComp.currentResponse).toBeDefined();
      expect(threatComp.currentResponse.action).toBe('flee');
    });

    it('flee direction is opposite to threat direction', () => {
      const agent = createAgent(world, { x: 0, y: 0, neuroticism: 0.8 });
      createAnimal(world, { x: 5, y: 0, danger: 9 }); // threat coming from +x

      system.update(world, Array.from(world.entities.values()), 0);

      const threatComp = agent.getComponent<any>('threat_detection');
      const fleeDir = threatComp.currentResponse?.fleeDirection;
      expect(fleeDir).toBeDefined();
      // Fleeing away from threat at +x → fleeDirection.x should be negative
      expect(fleeDir.x).toBeLessThan(0);
    });
  });

  describe('Auto-attack behavior (Criterion 3)', () => {
    it('aggressive agent attacks when it has power advantage (diff > +15)', () => {
      // Agent power ≈ 50 (base), animal power = 30 (danger 3)
      // Differential = +20 → canLikelyWin
      // Aggression = 1 - agreeableness = 1 - 0.2 = 0.8 > 0.5 → attack
      const agent = createAgent(world, { agreeableness: 0.2 });
      createAnimal(world, { x: 5, y: 5, danger: 3 }); // power = 30, within 20 tiles

      system.update(world, Array.from(world.entities.values()), 0);

      const threatComp = agent.getComponent<any>('threat_detection');
      expect(threatComp.currentResponse).toBeDefined();
      expect(threatComp.currentResponse.action).toBe('attack');
      expect(threatComp.currentResponse.targetId).toBeDefined();
    });

    it('non-aggressive agent stands ground despite power advantage', () => {
      // Agreeableness = 0.8 → aggression = 0.2 < 0.5 → stand_ground
      const agent = createAgent(world, { agreeableness: 0.8 });
      createAnimal(world, { x: 5, y: 5, danger: 3 });

      system.update(world, Array.from(world.entities.values()), 0);

      const threatComp = agent.getComponent<any>('threat_detection');
      expect(threatComp.currentResponse?.action).toBe('stand_ground');
    });
  });

  describe('Stand-ground response (Criterion 5)', () => {
    it('agent stands ground in an even matchup', () => {
      // Agent power ≈ 50, animal danger = 5 → power = 50, diff = 0 → even match
      // Default personality: courage = 0.5, aggression = 0.5 ≤ 0.6 → stand_ground
      const agent = createAgent(world);
      createAnimal(world, { x: 5, y: 5, danger: 5 }); // power = 50

      system.update(world, Array.from(world.entities.values()), 0);

      const threatComp = agent.getComponent<any>('threat_detection');
      expect(threatComp.currentResponse).toBeDefined();
      expect(threatComp.currentResponse.action).toBe('stand_ground');
    });
  });

  describe('Personality-driven decisions (Criterion 6)', () => {
    it('brave and cowardly agents respond differently to the same threat level', () => {
      // Both face a strong threat: animal danger=7, power=70. Agent base=50. Diff=-20.
      // Differential -20 is in "strong threat" range (< -10 but not critical)
      // Brave: neuroticism=0.2 → courage=0.8 ≥ 0.4 → stand_ground (melee, non-ranged)
      // Cowardly: neuroticism=0.8 → courage=0.2 < 0.4 → flee
      const braveAgent = createAgent(world, { x: 0, y: 0, neuroticism: 0.2 });
      const cowardlyAgent = createAgent(world, { x: 100, y: 100, neuroticism: 0.8 });

      // Two separate animals, each near one agent
      createAnimal(world, { x: 5, y: 0, danger: 7 }); // Near braveAgent (distance ~5)
      createAnimal(world, { x: 105, y: 100, danger: 7 }); // Near cowardlyAgent (distance = 5)

      system.update(world, Array.from(world.entities.values()), 0);

      const braveResponse = braveAgent.getComponent<any>('threat_detection').currentResponse;
      const cowardlyResponse = cowardlyAgent.getComponent<any>('threat_detection').currentResponse;

      expect(braveResponse?.action).toBe('stand_ground');
      expect(cowardlyResponse?.action).toBe('flee');
    });
  });

  describe('No threats - no response', () => {
    it('clears currentResponse when no threats are present', () => {
      const agent = createAgent(world);
      // Pre-set a stale response
      const threatComp = agent.getComponent<any>('threat_detection');
      threatComp.currentResponse = { action: 'flee', reason: 'stale' };

      // No animals in the world → no threats detected
      system.update(world, Array.from(world.entities.values()), 0);

      expect(threatComp.currentResponse).toBeUndefined();
    });
  });

  describe('Event emission', () => {
    it('emits threat:auto_response event when a response is triggered', () => {
      const emittedEvents: any[] = [];
      eventBus.subscribe('threat:auto_response' as any, (event: any) => {
        emittedEvents.push(event);
      });

      const agent = createAgent(world, { neuroticism: 0.8 });
      createAnimal(world, { x: 5, y: 5, danger: 9 }); // Critical threat → flee

      system.update(world, Array.from(world.entities.values()), 0);
      // Events are queued; flush to dispatch them to subscribers
      (eventBus as any).flush();

      expect(emittedEvents.length).toBeGreaterThan(0);
      const event = emittedEvents[0];
      expect(event.data.agentId).toBe(agent.id);
      expect(event.data.response).toBe('flee');
      expect(event.data.reason).toBeTruthy();
    });
  });

  describe('Scan throttling', () => {
    it('skips scan when scanInterval has not elapsed', () => {
      const agent = createAgent(world);
      const threatComp = agent.getComponent<any>('threat_detection');
      // Set a long scan interval and lastScanTime = current tick (0)
      threatComp.scanInterval = 10;
      threatComp.lastScanTime = 0;

      // Add an animal that would be detected if scan ran
      createAnimal(world, { x: 5, y: 5, danger: 9 });

      // world.tick = 0, lastScanTime = 0: 0 - 0 >= 10 = false → no scan
      system.update(world, Array.from(world.entities.values()), 0);

      // No scan happened → threats array empty, no response
      expect(threatComp.threats).toHaveLength(0);
      expect(threatComp.currentResponse).toBeUndefined();
    });
  });
});
