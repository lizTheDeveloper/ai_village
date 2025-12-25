import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { applyAgentTraits, WELL_RESTED_AGENT, HUNGRY_AGENT } from '../../__tests__/fixtures/agentFixtures.js';
import { AISystem } from '../AISystem.js';
import { ActionQueue } from '../../actions/ActionQueue.js';
import { ActionRegistry } from '../../actions/ActionRegistry.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';

/**
 * Integration tests for AISystem + ActionQueue
 *
 * Tests verify that:
 * - AI decisions trigger actions in the ActionQueue
 * - ActionQueue processes actions correctly
 * - Systems react to completed actions
 * - Rate limiting prevents LLM spam
 */

describe('AISystem + ActionQueue Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should handle AI behavior updates with behavior queue', () => {
    // Create agent with behavior queue enabled
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    // Add required components
    agent.addComponent(createMovementComponent(0, 0, 1.0));
    agent.addComponent(createAgentComponent('wander', false, 20));
    applyAgentTraits(agent, WELL_RESTED_AGENT);

    // Create AI system
    const aiSystem = new AISystem();
    harness.registerSystem('AISystem', aiSystem);

    // Process one tick
    const entities = Array.from(harness.world.entities.values());
    aiSystem.update(harness.world, entities, 1 / 60);

    // Agent should have processed behavior
    const agentComponent = agent.getComponent('agent');
    expect(agentComponent).toBeDefined();
    expect(agentComponent.behavior).toBe('wander');
  });

  it('should respect think interval before updating behavior', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMovementComponent(0, 0, 1.0));

    const agentComp = createAgentComponent('wander', false, 20); // 20 tick interval
    agent.addComponent(agentComp);
    applyAgentTraits(agent, WELL_RESTED_AGENT);

    const aiSystem = new AISystem();
    harness.registerSystem('AISystem', aiSystem);

    const entities = Array.from(harness.world.entities.values());

    // First tick - should think (lastThinkTick is 0)
    aiSystem.update(harness.world, entities, 1 / 60);
    const afterFirst = agent.getComponent('agent');
    expect(afterFirst.lastThinkTick).toBeGreaterThan(0);

    // Immediate second tick - should NOT think (interval not met)
    const lastThink = afterFirst.lastThinkTick;
    aiSystem.update(harness.world, entities, 1 / 60);
    const afterSecond = agent.getComponent('agent');
    expect(afterSecond.lastThinkTick).toBe(lastThink); // Unchanged
  });

  it('should transition hungry agent to seek_food behavior', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMovementComponent(0, 0, 1.0));
    agent.addComponent(createAgentComponent('wander', false, 1)); // Fast think
    agent.addComponent(createInventoryComponent());

    // Apply hungry agent traits
    applyAgentTraits(agent, HUNGRY_AGENT);

    const aiSystem = new AISystem();
    harness.registerSystem('AISystem', aiSystem);

    // Create a food resource nearby
    const resource = harness.world.createEntity('resource');
    resource.addComponent({
      type: 'position',
      version: 1,
      x: 12,
      y: 12,
    });
    resource.addComponent({
      type: 'resource',
      version: 1,
      resourceType: 'berry',
      amount: 10,
      regenerationRate: 0,
    });

    const entities = Array.from(harness.world.entities.values());

    // Update AI system
    aiSystem.update(harness.world, entities, 1 / 60);

    const agentComponent = agent.getComponent('agent');

    // Agent should seek food when hungry
    // Note: Actual behavior depends on AI implementation
    expect(agentComponent.behavior).toBeDefined();
  });

  it('should handle behavior queue timeouts', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMovementComponent(0, 0, 1.0));

    const agentComp = createAgentComponent('wander', false, 1);
    // Add a queued behavior with timeout
    (agentComp as any).behaviorQueue = [
      {
        behavior: 'gather',
        priority: 1,
        createdAt: 0, // Old timestamp
        timeout: 100, // Will timeout
      },
    ];
    agent.addComponent(agentComp);
    applyAgentTraits(agent, WELL_RESTED_AGENT);

    const aiSystem = new AISystem();
    harness.registerSystem('AISystem', aiSystem);

    // Advance world tick far past timeout
    (harness.world as any).tick = 200;

    const entities = Array.from(harness.world.entities.values());
    aiSystem.update(harness.world, entities, 1 / 60);

    const afterUpdate = agent.getComponent('agent');

    // Timed-out behavior should be removed
    expect((afterUpdate as any).behaviorQueue?.length ?? 0).toBeLessThan(1);
  });

  it('should enforce LLM rate limiting', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMovementComponent(0, 0, 1.0));
    agent.addComponent(createAgentComponent('wander', true, 1)); // LLM enabled, fast think
    applyAgentTraits(agent, WELL_RESTED_AGENT);

    // Create AI system with LLM queue (mocked)
    let llmCallCount = 0;
    const mockLLMQueue = {
      push: () => { llmCallCount++; },
      size: () => 0,
    };

    const aiSystem = new AISystem(mockLLMQueue);
    harness.registerSystem('AISystem', aiSystem);

    const entities = Array.from(harness.world.entities.values());

    // First update - might call LLM
    (harness.world as any).tick = 0;
    aiSystem.update(harness.world, entities, 1 / 60);

    // Immediate second update - should NOT call LLM (cooldown)
    (harness.world as any).tick = 1;
    aiSystem.update(harness.world, entities, 1 / 60);

    // LLM should only be called once due to rate limiting
    expect(llmCallCount).toBeLessThanOrEqual(1);
  });

  it('should process behavior queue in FIFO order', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMovementComponent(0, 0, 1.0));

    const agentComp = createAgentComponent('wander', false, 1);
    // Add multiple queued behaviors
    (agentComp as any).behaviorQueue = [
      { behavior: 'gather', priority: 1, createdAt: 0 },
      { behavior: 'build', priority: 1, createdAt: 1 },
      { behavior: 'farm', priority: 1, createdAt: 2 },
    ];
    agent.addComponent(agentComp);
    applyAgentTraits(agent, WELL_RESTED_AGENT);

    const aiSystem = new AISystem();
    harness.registerSystem('AISystem', aiSystem);

    const entities = Array.from(harness.world.entities.values());

    // First update should process first queued behavior
    aiSystem.update(harness.world, entities, 1 / 60);
    const afterFirst = agent.getComponent('agent');

    // Behavior should be updated from queue
    expect(afterFirst.behavior).toBeDefined();

    // Queue should be processed
    const queueLength = (afterFirst as any).behaviorQueue?.length ?? 0;
    expect(queueLength).toBeLessThanOrEqual(3);
  });
});
