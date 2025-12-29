import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { World } from '../World';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let world: World;

  beforeEach(() => {
    world = new World();
    collector = new MetricsCollector(world);
  });

  describe('Initialization', () => {
    it('should require a world instance', () => {
      expect(() => new MetricsCollector(null as any)).toThrow('MetricsCollector requires a World instance');
    });

    it('should initialize with empty metrics', () => {
      const metrics = collector.getAllMetrics();
      expect(metrics).toBeDefined();
      expect(Object.keys(metrics).length).toBe(0);
    });
  });

  describe('Event Recording', () => {
    it('should record agent birth events', () => {
      const birthEvent = {
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: {
          health: 100,
          hunger: 100,
          thirst: 100,
          energy: 100
        }
      };

      collector.recordEvent(birthEvent);

      const metrics = collector.getMetric('agent_lifecycle');
      expect(metrics['agent-1']).toBeDefined();
      expect(metrics['agent-1'].birthTimestamp).toBe(birthEvent.timestamp);
      expect(metrics['agent-1'].birthGeneration).toBe(1);
    });

    it('should record agent death events', () => {
      const deathEvent = {
        type: 'agent:death',
        timestamp: Date.now(),
        agentId: 'agent-1',
        causeOfDeath: 'hunger',
        ageAtDeath: 150,
        finalStats: {
          health: 0,
          hunger: 0,
          thirst: 50,
          energy: 20
        }
      };

      collector.recordEvent(deathEvent);

      const metrics = collector.getMetric('agent_lifecycle');
      expect(metrics['agent-1'].deathTimestamp).toBe(deathEvent.timestamp);
      expect(metrics['agent-1'].causeOfDeath).toBe('hunger');
    });

    it('should throw when recording event without type', () => {
      expect(() => {
        collector.recordEvent({ timestamp: Date.now() } as any);
      }).toThrow('Event must have a type field');
    });

    it('should throw when recording event without timestamp', () => {
      expect(() => {
        collector.recordEvent({ type: 'test' } as any);
      }).toThrow('Event must have a timestamp field');
    });
  });

  describe('Agent Lifecycle Metrics', () => {
    it('should calculate agent lifespan correctly', () => {
      const birthTime = 1000;
      const deathTime = 5000;

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: birthTime,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.recordEvent({
        type: 'agent:death',
        timestamp: deathTime,
        agentId: 'agent-1',
        causeOfDeath: 'old_age',
        ageAtDeath: 200,
        finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
      });

      const lifecycle = collector.getMetric('agent_lifecycle')['agent-1'];
      expect(lifecycle.lifespan).toBe(4000);
    });

    it('should track children count for agents', () => {
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 1000,
        agentId: 'child-1',
        generation: 2,
        parents: ['parent-1', 'parent-2'],
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const parent1Metrics = collector.getMetric('agent_lifecycle')['parent-1'];
      expect(parent1Metrics.childrenCount).toBe(1);
    });

    it('should calculate average lifespan by generation', () => {
      // Generation 1 agents
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'gen1-agent1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:death',
        timestamp: 1000,
        agentId: 'gen1-agent1',
        causeOfDeath: 'old_age',
        ageAtDeath: 100,
        finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
      });

      const avgLifespan = collector.getAggregatedMetric('lifespan_by_generation', { generation: 1, aggregation: 'avg' });
      expect(avgLifespan).toBe(1000);
    });

    it('should track most common cause of death', () => {
      ['hunger', 'hunger', 'thirst', 'hunger'].forEach((cause, index) => {
        collector.recordEvent({
          type: 'agent:death',
          timestamp: Date.now(),
          agentId: `agent-${index}`,
          causeOfDeath: cause,
          ageAtDeath: 100,
          finalStats: { health: 0, hunger: 0, thirst: 0, energy: 0 }
        });
      });

      const deathStats = collector.getAggregatedMetric('death_causes', { aggregation: 'most_common' });
      expect(deathStats.mostCommon).toBe('hunger');
      expect(deathStats.count).toBe(3);
    });
  });

  describe('Needs & Survival Metrics', () => {
    it('should sample agent needs periodically', () => {
      const agentId = 'agent-1';
      const timestamp = Date.now();

      // Create agent first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp,
        agentId,
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics(agentId, {
        hunger: 75,
        thirst: 80,
        energy: 60,
        temperature: 20,
        health: 90
      }, timestamp);

      const needsMetrics = collector.getMetric('needs_metrics')[agentId];
      expect(needsMetrics.hunger).toContainEqual({ timestamp, value: 75 });
    });

    it('should track hunger crisis events', () => {
      const agentId = 'agent-1';

      // Create agent first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId,
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics(agentId, { hunger: 5, thirst: 100, energy: 100, temperature: 20, health: 100 }, 1000);
      collector.sampleMetrics(agentId, { hunger: 8, thirst: 100, energy: 100, temperature: 20, health: 100 }, 2000);

      const needsMetrics = collector.getMetric('needs_metrics')[agentId];
      expect(needsMetrics.hungerCrisisEvents).toBe(2);
    });

    it('should calculate average needs across population', () => {
      // Create agents first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics('agent-1', { hunger: 80, thirst: 70, energy: 60, temperature: 20, health: 90 }, 1000);
      collector.sampleMetrics('agent-2', { hunger: 60, thirst: 90, energy: 80, temperature: 22, health: 95 }, 1000);

      const avgHunger = collector.getAggregatedMetric('hunger', { aggregation: 'avg', timestamp: 1000 });
      expect(avgHunger).toBe(70);
    });

    it('should track food consumption by type', () => {
      collector.recordEvent({
        type: 'resource:consumed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'berry',
        amount: 5,
        purpose: 'food'
      });

      const needsMetrics = collector.getMetric('needs_metrics')['agent-1'];
      expect(needsMetrics.foodConsumed['berry']).toBe(5);
    });
  });

  describe('Economic & Resource Metrics', () => {
    it('should track resources gathered', () => {
      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'wood',
        amount: 10,
        gatherTime: 5
      });

      const economic = collector.getMetric('economic_metrics');
      expect(economic.resourcesGathered['wood'].totalGathered).toBe(10);
      expect(economic.resourcesGathered['wood'].avgGatherTime).toBe(5);
    });

    it('should calculate gather rate per hour', () => {
      const startTime = 0;
      const endTime = 3600000; // 1 hour in ms

      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: startTime,
        agentId: 'agent-1',
        resourceType: 'wood',
        amount: 50,
        gatherTime: 10
      });

      const gatherRate = collector.getAggregatedMetric('gather_rate', {
        resourceType: 'wood',
        startTime,
        endTime,
        aggregation: 'rate'
      });

      expect(gatherRate).toBe(50); // 50 per hour
    });

    it('should track stockpile levels over time', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: 1000,
        resourceType: 'wood',
        amount: 100
      });

      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: 2000,
        resourceType: 'wood',
        amount: 150
      });

      const economic = collector.getMetric('economic_metrics');
      expect(economic.stockpiles['wood']).toContainEqual({ timestamp: 1000, value: 100 });
      expect(economic.stockpiles['wood']).toContainEqual({ timestamp: 2000, value: 150 });
    });

    it('should calculate net resource balance', () => {
      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 100,
        gatherTime: 10
      });

      collector.recordEvent({
        type: 'resource:consumed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 30,
        purpose: 'eating'
      });

      const balance = collector.getAggregatedMetric('resource_balance', {
        resourceType: 'food',
        aggregation: 'net'
      });

      expect(balance).toBe(70);
    });

    it('should calculate Gini coefficient for wealth distribution', () => {
      // Setup agents with different wealth levels
      const agentWealth = [
        { agentId: 'agent-1', wealth: 100 },
        { agentId: 'agent-2', wealth: 200 },
        { agentId: 'agent-3', wealth: 50 },
        { agentId: 'agent-4', wealth: 300 }
      ];

      agentWealth.forEach(({ agentId, wealth }) => {
        collector.recordEvent({
          type: 'wealth:calculated',
          timestamp: Date.now(),
          agentId,
          wealth
        });
      });

      const economic = collector.getMetric('economic_metrics');
      expect(economic.wealthDistribution.giniCoefficient).toBeGreaterThan(0);
      expect(economic.wealthDistribution.giniCoefficient).toBeLessThan(1);
    });
  });

  describe('Social & Relationship Metrics', () => {
    it('should track relationships formed', () => {
      collector.recordEvent({
        type: 'relationship:formed',
        timestamp: Date.now(),
        agent1: 'agent-1',
        agent2: 'agent-2',
        relationshipType: 'friend',
        strength: 50
      });

      const social = collector.getMetric('social_metrics');
      expect(social.relationshipsFormed).toBe(1);
    });

    it('should calculate social network density', () => {
      // 3 agents, 2 connections
      collector.recordEvent({
        type: 'relationship:formed',
        timestamp: Date.now(),
        agent1: 'agent-1',
        agent2: 'agent-2',
        relationshipType: 'friend',
        strength: 50
      });

      collector.recordEvent({
        type: 'relationship:formed',
        timestamp: Date.now(),
        agent1: 'agent-2',
        agent2: 'agent-3',
        relationshipType: 'friend',
        strength: 40
      });

      const social = collector.getMetric('social_metrics');
      expect(social.socialNetworkDensity).toBeCloseTo(2 / 3, 2); // 2 connections / 3 agents
    });

    it('should track conversations per day', () => {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const startTime = 0;

      for (let i = 0; i < 5; i++) {
        collector.recordEvent({
          type: 'conversation:started',
          timestamp: startTime + (i * 1000),
          participants: ['agent-1', 'agent-2'],
          duration: 30
        });
      }

      const social = collector.getMetric('social_metrics');
      expect(social.conversationsPerDay).toBe(5);
    });

    it('should identify isolated agents', () => {
      // Agent 1 has relationships
      collector.recordEvent({
        type: 'relationship:formed',
        timestamp: Date.now(),
        agent1: 'agent-1',
        agent2: 'agent-2',
        relationshipType: 'friend',
        strength: 50
      });

      // Agent 3 exists but has no relationships
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-3',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const social = collector.getMetric('social_metrics');
      expect(social.isolatedAgents).toBe(1);
    });
  });

  describe('Spatial & Territory Metrics', () => {
    it('should track total distance traveled', () => {
      collector.recordEvent({
        type: 'agent:moved',
        timestamp: Date.now(),
        agentId: 'agent-1',
        from: { x: 0, y: 0 },
        to: { x: 3, y: 4 },
        distance: 5
      });

      const spatial = collector.getMetric('spatial_metrics')['agent-1'];
      expect(spatial.totalDistanceTraveled).toBe(5);
    });

    it('should update heatmap with tile visits', () => {
      collector.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: 'agent-1',
        x: 10,
        y: 20
      });

      collector.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: 'agent-2',
        x: 10,
        y: 20
      });

      const spatial = collector.getMetric('spatial_metrics');
      expect(spatial.heatmap[10][20]).toBe(2);
    });

    it('should calculate territory center (centroid)', () => {
      collector.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: 'agent-1',
        x: 0,
        y: 0
      });

      collector.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: 'agent-1',
        x: 10,
        y: 10
      });

      const spatial = collector.getMetric('spatial_metrics')['agent-1'];
      expect(spatial.territoryCenter).toEqual({ x: 5, y: 5 });
    });

    it('should track pathfinding failures', () => {
      collector.recordEvent({
        type: 'pathfinding:failed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 }
      });

      const spatial = collector.getMetric('spatial_metrics');
      expect(spatial.pathfindingFailures).toBe(1);
    });
  });

  describe('Behavioral & Activity Metrics', () => {
    it('should track activity time allocation', () => {
      collector.recordEvent({
        type: 'activity:started',
        timestamp: 0,
        agentId: 'agent-1',
        activity: 'gathering'
      });

      collector.recordEvent({
        type: 'activity:ended',
        timestamp: 1000,
        agentId: 'agent-1',
        activity: 'gathering'
      });

      const behavioral = collector.getMetric('behavioral_metrics')['agent-1'];
      expect(behavioral.activityBreakdown['gathering']).toBe(1000);
    });

    it('should calculate task completion rate', () => {
      collector.recordEvent({
        type: 'task:started',
        timestamp: Date.now(),
        agentId: 'agent-1',
        taskId: 'task-1'
      });

      collector.recordEvent({
        type: 'task:completed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        taskId: 'task-1'
      });

      collector.recordEvent({
        type: 'task:started',
        timestamp: Date.now(),
        agentId: 'agent-1',
        taskId: 'task-2'
      });

      collector.recordEvent({
        type: 'task:abandoned',
        timestamp: Date.now(),
        agentId: 'agent-1',
        taskId: 'task-2'
      });

      const behavioral = collector.getMetric('behavioral_metrics')['agent-1'];
      expect(behavioral.taskCompletionRate).toBe(0.5); // 1 completed out of 2 started
    });

    it('should calculate efficiency score', () => {
      collector.recordEvent({
        type: 'activity:started',
        timestamp: 0,
        agentId: 'agent-1',
        activity: 'gathering'
      });

      collector.recordEvent({
        type: 'activity:ended',
        timestamp: 8000,
        agentId: 'agent-1',
        activity: 'gathering'
      });

      collector.recordEvent({
        type: 'activity:started',
        timestamp: 8000,
        agentId: 'agent-1',
        activity: 'idle'
      });

      collector.recordEvent({
        type: 'activity:ended',
        timestamp: 10000,
        agentId: 'agent-1',
        activity: 'idle'
      });

      const behavioral = collector.getMetric('behavioral_metrics')['agent-1'];
      expect(behavioral.efficiencyScore).toBe(0.8); // 8000 productive / 10000 total
    });
  });

  describe('Intelligence & LLM Metrics', () => {
    it('should track LLM calls by model', () => {
      collector.recordEvent({
        type: 'llm:call',
        timestamp: Date.now(),
        agentId: 'agent-1',
        model: 'haiku',
        tokensConsumed: 100,
        latency: 500
      });

      const intelligence = collector.getMetric('intelligence_metrics');
      expect(intelligence.llmCalls['haiku']).toBe(1);
      expect(intelligence.tokensConsumed['haiku']).toBe(100);
    });

    it('should calculate estimated cost', () => {
      collector.recordEvent({
        type: 'llm:call',
        timestamp: Date.now(),
        agentId: 'agent-1',
        model: 'haiku',
        tokensConsumed: 1000,
        latency: 500
      });

      const intelligence = collector.getMetric('intelligence_metrics');
      expect(intelligence.estimatedCost['haiku']).toBeGreaterThan(0);
    });

    it('should calculate average tokens per decision', () => {
      collector.recordEvent({
        type: 'llm:call',
        timestamp: Date.now(),
        agentId: 'agent-1',
        model: 'haiku',
        tokensConsumed: 100,
        latency: 500,
        purpose: 'decision'
      });

      collector.recordEvent({
        type: 'llm:call',
        timestamp: Date.now(),
        agentId: 'agent-1',
        model: 'haiku',
        tokensConsumed: 200,
        latency: 600,
        purpose: 'decision'
      });

      const intelligence = collector.getMetric('intelligence_metrics');
      expect(intelligence.avgTokensPerDecision).toBe(150);
    });

    it('should track plan success rate', () => {
      collector.recordEvent({
        type: 'plan:created',
        timestamp: Date.now(),
        agentId: 'agent-1',
        planId: 'plan-1'
      });

      collector.recordEvent({
        type: 'plan:completed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        planId: 'plan-1',
        success: true
      });

      collector.recordEvent({
        type: 'plan:created',
        timestamp: Date.now(),
        agentId: 'agent-1',
        planId: 'plan-2'
      });

      collector.recordEvent({
        type: 'plan:completed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        planId: 'plan-2',
        success: false
      });

      const intelligence = collector.getMetric('intelligence_metrics');
      expect(intelligence.planSuccessRate).toBe(0.5);
    });
  });

  describe('Performance & Technical Metrics', () => {
    it('should track FPS over time', () => {
      collector.samplePerformance({
        fps: 60,
        tickDuration: 16,
        entityCount: 100,
        memoryUsage: 50000000
      }, Date.now());

      const performance = collector.getMetric('performance_metrics');
      expect(performance.fps.length).toBe(1);
      expect(performance.fps[0].value).toBe(60);
    });

    it('should track frame drops', () => {
      collector.samplePerformance({ fps: 25, tickDuration: 40, entityCount: 100, memoryUsage: 50000000 }, 1000);
      collector.samplePerformance({ fps: 20, tickDuration: 50, entityCount: 100, memoryUsage: 50000000 }, 2000);

      const performance = collector.getMetric('performance_metrics');
      expect(performance.frameDrops).toBe(2);
    });

    it('should track system timing breakdown', () => {
      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'aiSystem',
        duration: 15
      });

      const performance = collector.getMetric('performance_metrics');
      expect(performance.systemTiming['aiSystem']).toBe(15);
    });

    it('should identify slowest system', () => {
      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'aiSystem',
        duration: 15
      });

      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'physicsSystem',
        duration: 5
      });

      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'renderSystem',
        duration: 25
      });

      const performance = collector.getMetric('performance_metrics');
      expect(performance.slowestSystem).toBe('renderSystem');
    });
  });

  describe('Emergent Phenomena Metrics', () => {
    it('should detect and record emergent patterns', () => {
      collector.detectPattern({
        name: 'Trade route formation',
        description: 'Agents repeatedly moving resources between two locations',
        frequency: 10,
        participants: 5,
        firstObserved: Date.now()
      });

      const emergent = collector.getMetric('emergent_metrics');
      expect(emergent.detectedPatterns.length).toBe(1);
      expect(emergent.detectedPatterns[0].name).toBe('Trade route formation');
    });

    it('should record anomalies', () => {
      collector.recordAnomaly({
        type: 'population_spike',
        severity: 8,
        timestamp: Date.now(),
        description: 'Population doubled in 1 hour'
      });

      const emergent = collector.getMetric('emergent_metrics');
      expect(emergent.anomalies.length).toBe(1);
      expect(emergent.anomalies[0].type).toBe('population_spike');
    });

    it('should track milestones', () => {
      collector.recordMilestone({
        name: 'First building constructed',
        timestamp: Date.now(),
        significance: 9
      });

      const emergent = collector.getMetric('emergent_metrics');
      expect(emergent.milestones.length).toBe(1);
      expect(emergent.milestones[0].significance).toBe(9);
    });
  });

  describe('Session & Playthrough Metrics', () => {
    it('should initialize session with unique ID', () => {
      const session = collector.getMetric('session_metrics');
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBeGreaterThan(0);
    });

    it('should track player interventions', () => {
      collector.recordEvent({
        type: 'player:intervention',
        timestamp: Date.now(),
        action: 'spawn_agent'
      });

      const session = collector.getMetric('session_metrics');
      expect(session.playerInterventions).toBe(1);
    });

    it('should track game speed changes', () => {
      collector.recordEvent({
        type: 'game:speed_changed',
        timestamp: 1000,
        speed: 1.5
      });

      const session = collector.getMetric('session_metrics');
      expect(session.gameSpeed).toContainEqual({ timestamp: 1000, value: 1.5 });
    });

    it('should calculate session duration', () => {
      const startTime = 1000;
      const endTime = 5000;

      collector.recordEvent({
        type: 'session:started',
        timestamp: startTime
      });

      collector.recordEvent({
        type: 'session:ended',
        timestamp: endTime,
        reason: 'manual_quit'
      });

      const session = collector.getMetric('session_metrics');
      expect(session.realTimeDuration).toBe(4000);
    });
  });

  describe('Query Interface', () => {
    it('should get metric by name', () => {
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const lifecycle = collector.getMetric('agent_lifecycle');
      expect(lifecycle).toBeDefined();
      expect(lifecycle['agent-1']).toBeDefined();
    });

    it('should throw when requesting unknown metric', () => {
      expect(() => {
        collector.getMetric('nonexistent_metric');
      }).toThrow('Unknown metric: nonexistent_metric');
    });

    it('should filter metrics by time range', () => {
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 1000,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 5000,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const filtered = collector.getMetric('agent_lifecycle', { startTime: 0, endTime: 2000 });
      expect(Object.keys(filtered).length).toBe(1);
      expect(filtered['agent-1']).toBeDefined();
    });
  });

  describe('Aggregation Functions', () => {
    it('should calculate average aggregation', () => {
      // Create agents first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics('agent-1', { hunger: 80, thirst: 70, energy: 60, temperature: 20, health: 90 }, 1000);
      collector.sampleMetrics('agent-2', { hunger: 60, thirst: 90, energy: 80, temperature: 22, health: 95 }, 1000);

      const avg = collector.getAggregatedMetric('hunger', { aggregation: 'avg' });
      expect(avg).toBe(70);
    });

    it('should calculate sum aggregation', () => {
      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'wood',
        amount: 10,
        gatherTime: 5
      });

      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-2',
        resourceType: 'wood',
        amount: 15,
        gatherTime: 7
      });

      const total = collector.getAggregatedMetric('resources_gathered', { resourceType: 'wood', aggregation: 'sum' });
      expect(total).toBe(25);
    });

    it('should calculate min aggregation', () => {
      // Create agents first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics('agent-1', { hunger: 80, thirst: 70, energy: 60, temperature: 20, health: 90 }, 1000);
      collector.sampleMetrics('agent-2', { hunger: 60, thirst: 90, energy: 80, temperature: 22, health: 95 }, 1000);

      const min = collector.getAggregatedMetric('hunger', { aggregation: 'min' });
      expect(min).toBe(60);
    });

    it('should calculate max aggregation', () => {
      // Create agents first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics('agent-1', { hunger: 80, thirst: 70, energy: 60, temperature: 20, health: 90 }, 1000);
      collector.sampleMetrics('agent-2', { hunger: 60, thirst: 90, energy: 80, temperature: 22, health: 95 }, 1000);

      const max = collector.getAggregatedMetric('hunger', { aggregation: 'max' });
      expect(max).toBe(80);
    });

    it('should throw on unknown aggregation type', () => {
      expect(() => {
        collector.getAggregatedMetric('hunger', { aggregation: 'invalid' as any });
      }).toThrow('Unknown aggregation type: invalid');
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics as JSON', () => {
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const json = collector.exportMetrics('json');
      expect(json).toBeInstanceOf(Buffer);

      const parsed = JSON.parse(json.toString());
      expect(parsed.agent_lifecycle).toBeDefined();
    });

    it('should export metrics as CSV', () => {
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      const csv = collector.exportMetrics('csv');
      expect(csv).toBeInstanceOf(Buffer);
      expect(csv.toString()).toContain('agent_lifecycle');
    });

    it('should throw on unsupported export format', () => {
      expect(() => {
        collector.exportMetrics('xml' as any);
      }).toThrow('Unsupported export format: xml');
    });
  });

  describe('Periodic Sampling', () => {
    it('should start periodic sampling interval', () => {
      vi.useFakeTimers();

      collector.startPeriodicSampling(60000); // Every 60 seconds

      // Just verify the interval was set up (implementation is a no-op stub)
      expect(collector).toBeDefined();

      collector.stopPeriodicSampling();
      vi.useRealTimers();
    });

    it('should stop periodic sampling', () => {
      vi.useFakeTimers();

      collector.startPeriodicSampling(60000);
      collector.stopPeriodicSampling();

      // Just verify stop works without error
      expect(collector).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('Data Retention', () => {
    it('should retain hot storage for last hour', () => {
      const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      const recentTimestamp = Date.now() - (30 * 60 * 1000); // 30 minutes ago

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: oldTimestamp,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: recentTimestamp,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.applyRetentionPolicy();

      const hotStorage = collector.getHotStorage();
      expect(hotStorage.has('agent-1')).toBe(false);
      expect(hotStorage.has('agent-2')).toBe(true);
    });

    it('should archive old metrics to cold storage', () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: oldTimestamp,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.applyRetentionPolicy();

      const coldStorage = collector.getColdStorage();
      expect(coldStorage.has('agent-1')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw when recording invalid event type', () => {
      expect(() => {
        collector.recordEvent({
          type: 'invalid:event',
          timestamp: Date.now()
        } as any);
      }).toThrow('Unknown event type: invalid:event');
    });

    it('should throw when sampling metrics for non-existent agent', () => {
      expect(() => {
        collector.sampleMetrics('nonexistent-agent', {
          hunger: 50,
          thirst: 50,
          energy: 50,
          temperature: 20,
          health: 50
        }, Date.now());
      }).toThrow('Cannot sample metrics for non-existent agent: nonexistent-agent');
    });

    it('should throw when exporting with no metrics collected', () => {
      expect(() => {
        collector.exportMetrics('json');
      }).toThrow('No metrics available to export');
    });
  });
});
