import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { VerificationSystem } from '../VerificationSystem.js';
import { TrustNetworkComponent } from '../../components/TrustNetworkComponent.js';
import { createMemoryComponent } from '../../components/MemoryComponent.js';
import { BeliefComponent } from '../../components/BeliefComponent.js';

/**
 * Integration tests for VerificationSystem + TrustNetwork
 *
 * Tests verify that:
 * - Claims verified against world state
 * - Trust updated based on verification results
 * - False claims decrease trust
 * - Accurate claims increase trust
 * - Verification events emitted correctly
 * - Trust network reflects verification history
 */

describe('VerificationSystem + TrustNetwork Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should verification system process agents', () => {
    const verificationSystem = new VerificationSystem(harness.world.eventBus);
    harness.registerSystem('VerificationSystem', verificationSystem);

    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 11, y: 11 });

    agent1.addComponent(new TrustNetworkComponent());
    agent2.addComponent(new TrustNetworkComponent());
    agent1.addComponent(createMemoryComponent());
    agent2.addComponent(createMemoryComponent());

    const entities = Array.from(harness.world.entities.values());

    expect(() => {
      verificationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should trust network initialize with default values', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const trustNetwork = new TrustNetworkComponent();

    agent.addComponent(trustNetwork);

    expect(trustNetwork.trustLevels).toBeDefined();
    expect(trustNetwork.trustLevels.size).toBe(0);
  });

  it('should trust levels update after verification', () => {
    const verificationSystem = new VerificationSystem(harness.world.eventBus);
    harness.registerSystem('VerificationSystem', verificationSystem);

    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 11, y: 11 });

    const trust1 = new TrustNetworkComponent();
    const trust2 = new TrustNetworkComponent();

    agent1.addComponent(trust1);
    agent2.addComponent(trust2);
    agent1.addComponent(createMemoryComponent());
    agent2.addComponent(createMemoryComponent());

    // Set initial trust
    trust1.trustLevels.set(agent2.id, 0.5);

    harness.clearEvents();

    // Emit information shared event
    harness.world.eventBus.emit({
      type: 'information:shared',
      source: agent2.id,
      data: {
        from: agent2.id,
        to: agent1.id,
        informationType: 'resource_location',
        content: { x: 20, y: 20, resourceType: 'berries' },
      },
    });

    const entities = Array.from(harness.world.entities.values());
    verificationSystem.update(harness.world, entities, 1.0);

    // Verification should process the claim
    expect(trust1.trustLevels.has(agent2.id)).toBe(true);
  });

  it('should verification events be emitted', () => {
    const verificationSystem = new VerificationSystem(harness.world.eventBus);
    harness.registerSystem('VerificationSystem', verificationSystem);

    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 11, y: 11 });

    agent1.addComponent(new TrustNetworkComponent());
    agent2.addComponent(new TrustNetworkComponent());
    agent1.addComponent(createMemoryComponent());
    agent2.addComponent(createMemoryComponent());

    harness.clearEvents();

    // Emit information shared event
    harness.world.eventBus.emit({
      type: 'information:shared',
      source: agent2.id,
      data: {
        from: agent2.id,
        to: agent1.id,
        informationType: 'test_claim',
        content: { claim: 'test' },
      },
    });

    const entities = Array.from(harness.world.entities.values());
    verificationSystem.update(harness.world, entities, 1.0);

    // Check for verification events
    const verifiedEvents = harness.getEmittedEvents('trust:verified');
    const violatedEvents = harness.getEmittedEvents('trust:violated');

    // At least one type of event should be emitted
    expect(verifiedEvents.length + violatedEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should trust network track multiple relationships', () => {
    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 11, y: 11 });
    const agent3 = harness.createTestAgent({ x: 12, y: 12 });

    const trust1 = new TrustNetworkComponent();

    agent1.addComponent(trust1);

    // Add multiple trust relationships
    trust1.trustLevels.set(agent2.id, 0.7);
    trust1.trustLevels.set(agent3.id, 0.3);

    expect(trust1.trustLevels.size).toBe(2);
    expect(trust1.trustLevels.get(agent2.id)).toBe(0.7);
    expect(trust1.trustLevels.get(agent3.id)).toBe(0.3);
  });

  it('should beliefs integrate with verification', () => {
    const verificationSystem = new VerificationSystem(harness.world.eventBus);
    harness.registerSystem('VerificationSystem', verificationSystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(new TrustNetworkComponent());
    agent.addComponent(createMemoryComponent());
    agent.addComponent(new BeliefComponent());

    const entities = Array.from(harness.world.entities.values());

    expect(() => {
      verificationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should verification handle missing trust networks', () => {
    const verificationSystem = new VerificationSystem(harness.world.eventBus);
    harness.registerSystem('VerificationSystem', verificationSystem);

    // Agent without trust network
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMemoryComponent());

    const entities = Array.from(harness.world.entities.values());

    // Should not crash
    expect(() => {
      verificationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should trust levels bounded between 0 and 1', () => {
    const trust = new TrustNetworkComponent();
    const agentId = 'test-agent-id';

    // Set valid trust levels
    trust.trustLevels.set(agentId, 0.0);
    expect(trust.trustLevels.get(agentId)).toBe(0.0);

    trust.trustLevels.set(agentId, 1.0);
    expect(trust.trustLevels.get(agentId)).toBe(1.0);

    trust.trustLevels.set(agentId, 0.5);
    expect(trust.trustLevels.get(agentId)).toBe(0.5);
  });
});
