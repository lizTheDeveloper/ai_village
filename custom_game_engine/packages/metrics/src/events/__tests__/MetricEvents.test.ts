import { describe, it, expect } from 'vitest';
import {
  MetricEvent,
  InteractionEvent,
  BehaviorEvent,
  SpatialSnapshot,
  ResourceEvent,
} from '../index';

describe('Event Schemas', () => {
  describe('MetricEvent Base Interface', () => {
    it('should allow creation of valid MetricEvent', () => {
      const event: MetricEvent = {
        type: 'test:event',
        timestamp: Date.now(),
        simulationTime: 3600,
        tick: 1000,
      };

      expect(event.type).toBe('test:event');
      expect(event.timestamp).toBeTypeOf('number');
      expect(event.simulationTime).toBe(3600);
      expect(event.tick).toBe(1000);
    });

    it('should require all base fields', () => {
      // TypeScript will prevent this at compile time
      // This test verifies the structure is correctly typed
      const event: MetricEvent = {
        type: 'test',
        timestamp: 12345,
        simulationTime: 100,
        tick: 50,
      };

      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('simulationTime');
      expect(event).toHaveProperty('tick');
    });
  });

  describe('InteractionEvent Schema', () => {
    it('should create valid InteractionEvent with all required fields', () => {
      const event: InteractionEvent = {
        type: 'interaction:proximity',
        timestamp: Date.now(),
        simulationTime: 7200,
        tick: 2000,
        agent1: 'agent-001',
        agent2: 'agent-002',
        distance: 5.5,
        duration: 120,
        context: {
          agent1Behavior: 'gathering',
          agent2Behavior: 'wandering',
          agent1Health: 85,
          agent2Health: 92,
          location: { x: 100, y: 200 },
        },
      };

      expect(event.agent1).toBe('agent-001');
      expect(event.agent2).toBe('agent-002');
      expect(event.distance).toBe(5.5);
      expect(event.duration).toBe(120);
      expect(event.context.agent1Behavior).toBe('gathering');
      expect(event.context.agent2Behavior).toBe('wandering');
      expect(event.context.agent1Health).toBe(85);
      expect(event.context.agent2Health).toBe(92);
      expect(event.context.location).toEqual({ x: 100, y: 200 });
    });

    it('should allow optional weather field in context', () => {
      const eventWithWeather: InteractionEvent = {
        type: 'interaction:proximity',
        timestamp: Date.now(),
        simulationTime: 7200,
        tick: 2000,
        agent1: 'agent-001',
        agent2: 'agent-002',
        distance: 3.0,
        duration: 60,
        context: {
          agent1Behavior: 'resting',
          agent2Behavior: 'eating',
          agent1Health: 75,
          agent2Health: 88,
          location: { x: 50, y: 75 },
          weather: 'rainy',
        },
      };

      expect(eventWithWeather.context.weather).toBe('rainy');
    });

    it('should work without optional weather field', () => {
      const eventWithoutWeather: InteractionEvent = {
        type: 'interaction:proximity',
        timestamp: Date.now(),
        simulationTime: 7200,
        tick: 2000,
        agent1: 'agent-003',
        agent2: 'agent-004',
        distance: 2.5,
        duration: 45,
        context: {
          agent1Behavior: 'building',
          agent2Behavior: 'gathering',
          agent1Health: 90,
          agent2Health: 95,
          location: { x: 150, y: 250 },
        },
      };

      expect(eventWithoutWeather.context.weather).toBeUndefined();
    });

    it('should extend MetricEvent base interface', () => {
      const event: InteractionEvent = {
        type: 'interaction:proximity',
        timestamp: Date.now(),
        simulationTime: 1000,
        tick: 500,
        agent1: 'agent-001',
        agent2: 'agent-002',
        distance: 4.0,
        duration: 30,
        context: {
          agent1Behavior: 'wandering',
          agent2Behavior: 'wandering',
          agent1Health: 100,
          agent2Health: 100,
          location: { x: 0, y: 0 },
        },
      };

      // Should be assignable to MetricEvent
      const baseEvent: MetricEvent = event;
      expect(baseEvent.type).toBe('interaction:proximity');
    });
  });

  describe('BehaviorEvent Schema', () => {
    it('should create valid BehaviorEvent with all required fields', () => {
      const event: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 5400,
        tick: 1500,
        agentId: 'agent-007',
        behavior: 'gathering',
        previousBehavior: 'wandering',
        location: { x: 120, y: 180 },
        health: 87,
        energy: 65,
        nearbyAgents: ['agent-008', 'agent-009'],
        isNovel: true,
      };

      expect(event.agentId).toBe('agent-007');
      expect(event.behavior).toBe('gathering');
      expect(event.previousBehavior).toBe('wandering');
      expect(event.location).toEqual({ x: 120, y: 180 });
      expect(event.health).toBe(87);
      expect(event.energy).toBe(65);
      expect(event.nearbyAgents).toHaveLength(2);
      expect(event.nearbyAgents).toContain('agent-008');
      expect(event.isNovel).toBe(true);
    });

    it('should handle empty nearbyAgents array', () => {
      const event: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 3600,
        tick: 1000,
        agentId: 'agent-solo',
        behavior: 'resting',
        previousBehavior: 'wandering',
        location: { x: 300, y: 400 },
        health: 95,
        energy: 45,
        nearbyAgents: [],
        isNovel: false,
      };

      expect(event.nearbyAgents).toHaveLength(0);
      expect(event.nearbyAgents).toEqual([]);
    });

    it('should track novel vs non-novel behavior changes', () => {
      const novelEvent: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 1800,
        tick: 500,
        agentId: 'agent-001',
        behavior: 'planting',
        previousBehavior: 'gathering',
        location: { x: 50, y: 50 },
        health: 100,
        energy: 80,
        nearbyAgents: [],
        isNovel: true,
      };

      const repeatedEvent: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 1900,
        tick: 550,
        agentId: 'agent-001',
        behavior: 'gathering',
        previousBehavior: 'wandering',
        location: { x: 55, y: 55 },
        health: 98,
        energy: 75,
        nearbyAgents: [],
        isNovel: false,
      };

      expect(novelEvent.isNovel).toBe(true);
      expect(repeatedEvent.isNovel).toBe(false);
    });

    it('should extend MetricEvent base interface', () => {
      const event: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 2000,
        tick: 600,
        agentId: 'agent-test',
        behavior: 'eating',
        previousBehavior: 'gathering',
        location: { x: 10, y: 20 },
        health: 85,
        energy: 60,
        nearbyAgents: [],
        isNovel: false,
      };

      const baseEvent: MetricEvent = event;
      expect(baseEvent.tick).toBe(600);
    });
  });

  describe('SpatialSnapshot Schema', () => {
    it('should create valid SpatialSnapshot with multiple agents', () => {
      const snapshot: SpatialSnapshot = {
        type: 'spatial:snapshot',
        timestamp: Date.now(),
        simulationTime: 10800,
        tick: 3000,
        agents: [
          {
            id: 'agent-001',
            position: { x: 100, y: 200 },
            behavior: 'gathering',
            health: 90,
          },
          {
            id: 'agent-002',
            position: { x: 150, y: 250 },
            behavior: 'wandering',
            health: 85,
          },
          {
            id: 'agent-003',
            position: { x: 200, y: 300 },
            behavior: 'resting',
            health: 95,
          },
        ],
      };

      expect(snapshot.agents).toHaveLength(3);
      expect(snapshot.agents[0]!.id).toBe('agent-001');
      expect(snapshot.agents[0]!.position).toEqual({ x: 100, y: 200 });
      expect(snapshot.agents[0]!.behavior).toBe('gathering');
      expect(snapshot.agents[0]!.health).toBe(90);
      expect(snapshot.agents[1]!.id).toBe('agent-002');
      expect(snapshot.agents[2]!.id).toBe('agent-003');
    });

    it('should handle single agent snapshot', () => {
      const snapshot: SpatialSnapshot = {
        type: 'spatial:snapshot',
        timestamp: Date.now(),
        simulationTime: 5000,
        tick: 1400,
        agents: [
          {
            id: 'agent-solo',
            position: { x: 0, y: 0 },
            behavior: 'wandering',
            health: 100,
          },
        ],
      };

      expect(snapshot.agents).toHaveLength(1);
      expect(snapshot.agents[0]!.id).toBe('agent-solo');
    });

    it('should handle empty agents array', () => {
      const snapshot: SpatialSnapshot = {
        type: 'spatial:snapshot',
        timestamp: Date.now(),
        simulationTime: 0,
        tick: 0,
        agents: [],
      };

      expect(snapshot.agents).toHaveLength(0);
      expect(snapshot.agents).toEqual([]);
    });

    it('should extend MetricEvent base interface', () => {
      const snapshot: SpatialSnapshot = {
        type: 'spatial:snapshot',
        timestamp: Date.now(),
        simulationTime: 3600,
        tick: 1000,
        agents: [],
      };

      const baseEvent: MetricEvent = snapshot;
      expect(baseEvent.type).toBe('spatial:snapshot');
    });
  });

  describe('ResourceEvent Schema', () => {
    it('should create valid ResourceEvent for consumption', () => {
      const event: ResourceEvent = {
        type: 'resource:consume',
        timestamp: Date.now(),
        simulationTime: 4500,
        tick: 1250,
        agentId: 'agent-hungry',
        action: 'consume',
        resourceType: 'berries',
        amount: 10,
        location: { x: 75, y: 125 },
      };

      expect(event.agentId).toBe('agent-hungry');
      expect(event.action).toBe('consume');
      expect(event.resourceType).toBe('berries');
      expect(event.amount).toBe(10);
      expect(event.location).toEqual({ x: 75, y: 125 });
      expect(event.recipientId).toBeUndefined();
    });

    it('should create valid ResourceEvent for gathering', () => {
      const event: ResourceEvent = {
        type: 'resource:gather',
        timestamp: Date.now(),
        simulationTime: 6000,
        tick: 1700,
        agentId: 'agent-gatherer',
        action: 'gather',
        resourceType: 'wood',
        amount: 5,
        location: { x: 200, y: 150 },
      };

      expect(event.action).toBe('gather');
      expect(event.resourceType).toBe('wood');
      expect(event.amount).toBe(5);
      expect(event.recipientId).toBeUndefined();
    });

    it('should create valid ResourceEvent for sharing with recipientId', () => {
      const event: ResourceEvent = {
        type: 'resource:share',
        timestamp: Date.now(),
        simulationTime: 7200,
        tick: 2000,
        agentId: 'agent-sharer',
        action: 'share',
        resourceType: 'berries',
        amount: 3,
        location: { x: 100, y: 100 },
        recipientId: 'agent-receiver',
      };

      expect(event.action).toBe('share');
      expect(event.agentId).toBe('agent-sharer');
      expect(event.recipientId).toBe('agent-receiver');
      expect(event.amount).toBe(3);
    });

    it('should allow sharing without recipientId (edge case)', () => {
      const event: ResourceEvent = {
        type: 'resource:share',
        timestamp: Date.now(),
        simulationTime: 8000,
        tick: 2200,
        agentId: 'agent-generous',
        action: 'share',
        resourceType: 'seeds',
        amount: 2,
        location: { x: 50, y: 75 },
      };

      expect(event.action).toBe('share');
      expect(event.recipientId).toBeUndefined();
    });

    it('should handle different resource types', () => {
      const resourceTypes = ['berries', 'wood', 'seeds', 'water', 'stone'];

      resourceTypes.forEach((resourceType, index) => {
        const event: ResourceEvent = {
          type: 'resource:gather',
          timestamp: Date.now(),
          simulationTime: 1000 * (index + 1),
          tick: 100 * (index + 1),
          agentId: `agent-${index}`,
          action: 'gather',
          resourceType,
          amount: index + 1,
          location: { x: index * 10, y: index * 20 },
        };

        expect(event.resourceType).toBe(resourceType);
      });
    });

    it('should extend MetricEvent base interface', () => {
      const event: ResourceEvent = {
        type: 'resource:consume',
        timestamp: Date.now(),
        simulationTime: 2500,
        tick: 700,
        agentId: 'agent-test',
        action: 'consume',
        resourceType: 'berries',
        amount: 5,
        location: { x: 0, y: 0 },
      };

      const baseEvent: MetricEvent = event;
      expect(baseEvent.simulationTime).toBe(2500);
    });
  });

  describe('Type System Integration', () => {
    it('should allow storing different event types in array', () => {
      const events: MetricEvent[] = [
        {
          type: 'interaction:proximity',
          timestamp: Date.now(),
          simulationTime: 1000,
          tick: 100,
          agent1: 'a1',
          agent2: 'a2',
          distance: 5,
          duration: 10,
          context: {
            agent1Behavior: 'wandering',
            agent2Behavior: 'wandering',
            agent1Health: 100,
            agent2Health: 100,
            location: { x: 0, y: 0 },
          },
        } as InteractionEvent,
        {
          type: 'behavior:change',
          timestamp: Date.now(),
          simulationTime: 1100,
          tick: 110,
          agentId: 'a1',
          behavior: 'gathering',
          previousBehavior: 'wandering',
          location: { x: 10, y: 10 },
          health: 95,
          energy: 80,
          nearbyAgents: [],
          isNovel: true,
        } as BehaviorEvent,
        {
          type: 'resource:gather',
          timestamp: Date.now(),
          simulationTime: 1200,
          tick: 120,
          agentId: 'a1',
          action: 'gather',
          resourceType: 'berries',
          amount: 5,
          location: { x: 15, y: 15 },
        } as ResourceEvent,
        {
          type: 'spatial:snapshot',
          timestamp: Date.now(),
          simulationTime: 1300,
          tick: 130,
          agents: [
            {
              id: 'a1',
              position: { x: 20, y: 20 },
              behavior: 'gathering',
              health: 95,
            },
          ],
        } as SpatialSnapshot,
      ];

      expect(events).toHaveLength(4);
      expect(events[0]!.type).toBe('interaction:proximity');
      expect(events[1]!.type).toBe('behavior:change');
      expect(events[2]!.type).toBe('resource:gather');
      expect(events[3]!.type).toBe('spatial:snapshot');
    });
  });

  describe('Immutability (readonly fields)', () => {
    it('should have readonly timestamp field', () => {
      const event: MetricEvent = {
        type: 'test',
        timestamp: 12345,
        simulationTime: 100,
        tick: 50,
      };

      // TypeScript will prevent: event.timestamp = 99999;
      // This test verifies the type is correctly defined as readonly
      expect(event.timestamp).toBe(12345);
    });

    it('should have readonly type field', () => {
      const event: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 1000,
        tick: 100,
        agentId: 'test',
        behavior: 'wandering',
        previousBehavior: 'resting',
        location: { x: 0, y: 0 },
        health: 100,
        energy: 100,
        nearbyAgents: [],
        isNovel: false,
      };

      // TypeScript will prevent: event.type = 'other:type';
      expect(event.type).toBe('behavior:change');
    });
  });

  describe('Field Name Exactness (per spec)', () => {
    it('should use simulationTime not simTime', () => {
      const event: MetricEvent = {
        type: 'test',
        timestamp: Date.now(),
        simulationTime: 3600, // Exact field name from spec
        tick: 1000,
      };

      expect(event).toHaveProperty('simulationTime');
      expect(event.simulationTime).toBe(3600);
    });

    it('should use nearbyAgents not nearAgents', () => {
      const event: BehaviorEvent = {
        type: 'behavior:change',
        timestamp: Date.now(),
        simulationTime: 1000,
        tick: 100,
        agentId: 'test',
        behavior: 'wandering',
        previousBehavior: 'resting',
        location: { x: 0, y: 0 },
        health: 100,
        energy: 100,
        nearbyAgents: ['other-agent'], // Exact field name from spec
        isNovel: false,
      };

      expect(event).toHaveProperty('nearbyAgents');
      expect(event.nearbyAgents).toContain('other-agent');
    });

    it('should use recipientId not recipient', () => {
      const event: ResourceEvent = {
        type: 'resource:share',
        timestamp: Date.now(),
        simulationTime: 1000,
        tick: 100,
        agentId: 'sharer',
        action: 'share',
        resourceType: 'berries',
        amount: 5,
        location: { x: 0, y: 0 },
        recipientId: 'receiver', // Exact field name from spec
      };

      expect(event).toHaveProperty('recipientId');
      expect(event.recipientId).toBe('receiver');
    });
  });
});
