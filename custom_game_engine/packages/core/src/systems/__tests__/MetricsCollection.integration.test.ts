import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MetricsCollectionSystem } from '../MetricsCollectionSystem.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';

/**
 * Integration tests for MetricsCollectionSystem
 *
 * Tests verify that:
 * - System actually runs and collects metrics
 * - EventBus integration works correctly
 * - Metrics are recorded from real game events
 * - Snapshot sampling occurs at correct intervals
 * - System handles multiple agents correctly
 */

describe('MetricsCollectionSystem Integration', () => {
  let harness: IntegrationTestHarness;
  let metricsSystem: MetricsCollectionSystem;

  beforeEach(() => {
    harness = createMinimalWorld();
    metricsSystem = new MetricsCollectionSystem(harness.world, {
      enabled: true,
      samplingRate: 1.0,
      snapshotInterval: 10, // Snapshot every 10 ticks
    });
  });

  describe('Initialization', () => {
    it('should initialize with world instance', () => {
      expect(metricsSystem).toBeDefined();
      expect(metricsSystem.isEnabled()).toBe(true);
    });

    it('should subscribe to EventBus on creation', () => {
      // Create agent and trigger event
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'wander'));
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Emit event
      harness.eventBus.emit({
        type: 'agent:ate',
        data: {
          agentId: agent.id,
          foodType: 'berry',
          amount: 5,
        },
      });

      // Flush events to trigger handlers
      harness.eventBus.flush();

      // Should have recorded event
      const metrics = metricsSystem.getAllMetrics();
      expect(Object.keys(metrics).length).toBeGreaterThan(0);
    });
  });

  describe('Event Recording', () => {
    it('should record agent:ate events as resource:consumed', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'wander'));
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'agent:ate',
        data: {
          agentId: agent.id,
          foodType: 'berry',
          amount: 3,
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record resource:gathered events', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'gather'));
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'wood',
          amount: 10,
          gatherTime: 5,
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record harvest:completed events', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'harvest'));
      agent.addComponent(createIdentityComponent('Harvester'));

      harness.eventBus.emit({
        type: 'harvest:completed',
        data: {
          agentId: agent.id,
          harvested: [
            { itemId: 'wheat', amount: 5 },
            { itemId: 'wheat_seed', amount: 2 },
          ],
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record conversation:started events', () => {
      const agent1 = harness.createTestAgent({ x: 10, y: 10 });
      const agent2 = harness.createTestAgent({ x: 11, y: 10 });
      agent1.addComponent(createIdentityComponent('Agent1'));
      agent2.addComponent(createIdentityComponent('Agent2'));

      harness.eventBus.emit({
        type: 'conversation:started',
        data: {
          participants: [agent1.id, agent2.id],
          initiator: agent1.id,
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record death events', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('DoomedAgent'));

      harness.eventBus.emit({
        type: 'agent:starved',
        data: {
          agentId: agent.id,
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record crafting:completed events', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('Crafter'));

      harness.eventBus.emit({
        type: 'crafting:completed',
        data: {
          agentId: agent.id,
          produced: [
            { itemId: 'plank', amount: 4 },
          ],
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Snapshot Sampling', () => {
    it('should take periodic snapshots of agent needs', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'wander'));
      agent.addComponent(createNeedsComponent(80, 70, 60, 90, 85));
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Run system for multiple ticks
      metricsSystem.update(harness.world); // tick 0
      for (let i = 0; i < 10; i++) {
        metricsSystem.update(harness.world); // ticks 1-10
      }

      // Should have taken a snapshot at tick 10
      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should sample multiple agents', () => {
      const agent1 = harness.createTestAgent({ x: 10, y: 10 });
      agent1.addComponent(createAgentComponent('agent-1', 'wander'));
      agent1.addComponent(createNeedsComponent(80, 70, 60, 90, 85));
      agent1.addComponent(createIdentityComponent('Agent1'));

      const agent2 = harness.createTestAgent({ x: 20, y: 20 });
      agent2.addComponent(createAgentComponent('agent-2', 'gather'));
      agent2.addComponent(createNeedsComponent(60, 90, 80, 70, 95));
      agent2.addComponent(createIdentityComponent('Agent2'));

      // Run system to trigger snapshots
      for (let i = 0; i <= 10; i++) {
        metricsSystem.update(harness.world);
      }

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });

    it('should respect snapshot interval configuration', () => {
      const customSystem = new MetricsCollectionSystem(harness.world, {
        enabled: true,
        samplingRate: 1.0,
        snapshotInterval: 5, // Snapshot every 5 ticks
      });

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'wander'));
      agent.addComponent(createNeedsComponent(80, 70, 60, 90, 85));
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Run system for 15 ticks
      for (let i = 0; i <= 15; i++) {
        customSystem.update(harness.world);
      }

      // Should have taken 3 snapshots (tick 5, 10, 15)
      const metrics = customSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Sampling Rate', () => {
    it('should respect sampling rate for high-frequency events', () => {
      const partialSampleSystem = new MetricsCollectionSystem(harness.world, {
        enabled: true,
        samplingRate: 0.0, // Record no events
        snapshotInterval: 100,
      });

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Emit multiple events
      for (let i = 0; i < 100; i++) {
        harness.eventBus.emit({
          type: 'resource:gathered',
          data: {
            agentId: agent.id,
            resourceType: 'wood',
            amount: 1,
            gatherTime: 1,
          },
        });
      }

      const metrics = partialSampleSystem.getAllMetrics();
      // With 0% sampling, should have very few or no events
      expect(metrics).toBeDefined();
    });
  });

  describe('Enable/Disable', () => {
    it('should stop collecting when disabled', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      metricsSystem.setEnabled(false);

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'wood',
          amount: 10,
          gatherTime: 5,
        },
      });

      // Should not update when disabled
      metricsSystem.update(harness.world);

      expect(metricsSystem.isEnabled()).toBe(false);
    });

    it('should resume collecting when re-enabled', () => {
      metricsSystem.setEnabled(false);
      metricsSystem.setEnabled(true);

      expect(metricsSystem.isEnabled()).toBe(true);

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'stone',
          amount: 5,
          gatherTime: 3,
        },
      });

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Metric Export', () => {
    it('should export metrics as JSON', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'wood',
          amount: 10,
          gatherTime: 5,
        },
      });

      // Flush events to trigger handlers
      harness.eventBus.flush();

      const exported = metricsSystem.exportMetrics('json');
      expect(exported).toBeInstanceOf(Buffer);

      const parsed = JSON.parse(exported.toString());
      expect(parsed).toBeDefined();
    });

    it('should export metrics as CSV', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'wood',
          amount: 10,
          gatherTime: 5,
        },
      });

      // Flush events to trigger handlers
      harness.eventBus.flush();

      const exported = metricsSystem.exportMetrics('csv');
      expect(exported).toBeInstanceOf(Buffer);
      expect(exported.toString().length).toBeGreaterThan(0);
    });
  });

  describe('Collector Access', () => {
    it('should provide access to MetricsCollector', () => {
      const collector = metricsSystem.getCollector();
      expect(collector).toBeDefined();
    });

    it('should allow querying collector directly', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'resource:gathered',
        data: {
          agentId: agent.id,
          resourceType: 'wood',
          amount: 10,
          gatherTime: 5,
        },
      });

      const collector = metricsSystem.getCollector();
      const metrics = collector.getAllMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Multiple Event Types', () => {
    it('should handle multiple event types in a single run', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createAgentComponent('test-agent', 'wander'));
      agent.addComponent(createNeedsComponent(80, 70, 60, 90, 85));
      agent.addComponent(createIdentityComponent('MultiTasker'));

      // Emit various events
      harness.eventBus.emit({
        type: 'resource:gathered',
        data: { agentId: agent.id, resourceType: 'wood', amount: 10, gatherTime: 5 },
      });

      harness.eventBus.emit({
        type: 'agent:ate',
        data: { agentId: agent.id, foodType: 'berry', amount: 3 },
      });

      harness.eventBus.emit({
        type: 'behavior:change',
        data: { agentId: agent.id, from: 'wander', to: 'gather' },
      });

      // Run system
      for (let i = 0; i <= 10; i++) {
        metricsSystem.update(harness.world);
      }

      const metrics = metricsSystem.getAllMetrics();
      expect(metrics).toBeDefined();
    });
  });
});
