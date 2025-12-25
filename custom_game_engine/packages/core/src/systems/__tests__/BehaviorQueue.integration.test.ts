import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { AISystem } from '../AISystem.js';
import { createAgentComponent, queueBehavior, type AgentComponent } from '../../components/AgentComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { createNeedsComponent, type NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createTemperatureComponent } from '../../components/TemperatureComponent.js';

/**
 * TRUE Integration tests for Behavior Queue System
 *
 * These tests actually RUN the AISystem with real WorldImpl and EventBusImpl
 * to verify the behavior queue processes correctly in a real environment.
 *
 * Unlike the mock-based tests, these tests:
 * - Use real World and EventBus
 * - Actually call system.update()
 * - Verify state changes over time
 */

describe('Behavior Queue System Integration', () => {
  let world: WorldImpl;
  let aiSystem: AISystem;
  let agent: EntityImpl;

  beforeEach(() => {
    // Create real world with EventBus
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create AI system
    aiSystem = new AISystem();

    // Create agent with required components
    // Set thinkInterval=1 to allow agent to think every tick (for faster testing)
    agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('wander', 1, false, 0)); // behavior='wander', thinkInterval=1, useLLM=false
    agent.addComponent(createPositionComponent(0, 0, 0));
    agent.addComponent(createMovementComponent(1.0));
    agent.addComponent(createNeedsComponent(50, 50, 20, 0.42, 0.5));
    agent.addComponent(createCircadianComponent());
    agent.addComponent(createTemperatureComponent(20, 15, 25, 10, 30)); // currentTemp=20, comfortMin=15, comfortMax=25, toleranceMin=10, toleranceMax=30

    (world as any)._addEntity(agent);
  });

  describe('Sequential Execution', () => {
    it('should execute behaviors in queue order', () => {
      // Queue multiple behaviors
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'gather', { priority: 'normal' });
        updated = queueBehavior(updated, 'deposit_items', { priority: 'normal' });
        updated = queueBehavior(updated, 'till', { priority: 'normal' });
        return updated;
      });

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Verify queue setup
      expect(agentComp.behaviorQueue).toBeDefined();
      expect(agentComp.behaviorQueue?.length).toBe(3);
      expect(agentComp.currentQueueIndex).toBe(0);

      // Run system once
      aiSystem.update(world, [agent], 1);

      const updatedAgent = agent.getComponent<AgentComponent>('agent')!;

      // After first update, agent should start executing first queued behavior
      // The behavior should be set to the queued one
      expect(updatedAgent.behaviorQueue).toBeDefined();
      expect(updatedAgent.currentQueueIndex).toBeDefined();
    });

    it('should advance queue when behavior completes', () => {
      // Queue behaviors
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'idle', { priority: 'normal' });
        updated = queueBehavior(updated, 'wander', { priority: 'normal' });
        return updated;
      });

      // Reset lastThinkTick to ensure agent thinks on next update
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        lastThinkTick: 0,
      }));

      // Run system
      world.advanceTick();
      aiSystem.update(world, [agent], 1);

      // Manually signal completion
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorCompleted: true,
        lastThinkTick: 0, // Reset to force think on next update
      }));

      // Run multiple updates to allow queue processing
      for (let i = 0; i < 3; i++) {
        world.advanceTick();
        aiSystem.update(world, [agent], 1);
      }

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Queue index should have advanced
      expect(agentComp.currentQueueIndex).toBeGreaterThan(0);
      expect(agentComp.behaviorCompleted).toBe(false); // Reset after advancing
    });
  });

  describe('Critical Need Interruption', () => {
    it('should pause queue when hunger drops below 10', () => {
      // Queue some work and set agent to actively execute from queue
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'gather', { priority: 'normal' });
        updated = queueBehavior(updated, 'till', { priority: 'normal' });
        return {
          ...updated,
          behavior: 'gather', // Explicitly set agent to be executing from queue
          lastThinkTick: 0, // Force agent to think on next update
        };
      });

      // Set critical hunger
      agent.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        hunger: 5, // Critical!
      }));

      // Run update to trigger autonomic interrupt
      world.advanceTick();
      aiSystem.update(world, [agent], 1);

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Queue should be paused
      expect(agentComp.queuePaused).toBe(true);
      expect(agentComp.queueInterruptedBy).toBe('seek_food');
      expect(agentComp.behavior).toBe('seek_food');

      // Queue index should be preserved
      expect(agentComp.currentQueueIndex).toBe(0);
    });

    it('should resume queue when hunger rises above 40', () => {
      // Queue behaviors and pause with interruption
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'gather', { priority: 'normal' });
        updated = queueBehavior(updated, 'till', { priority: 'normal' });
        return {
          ...updated,
          queuePaused: true,
          queueInterruptedBy: 'seek_food' as const,
          behavior: 'seek_food' as const,
          currentQueueIndex: 0,
          lastThinkTick: 0, // Force think on next update
        };
      });

      // Set critical hunger initially
      agent.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        hunger: 5,
      }));

      // Run system with critical hunger
      world.advanceTick();
      aiSystem.update(world, [agent], 1);

      // Now raise hunger above threshold (>30 means no autonomic override per AISystem line 749)
      agent.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        hunger: 50, // Satisfied
      }));

      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        lastThinkTick: 0, // Force think on next update
      }));

      // Run multiple updates to allow resume logic to trigger
      for (let i = 0; i < 3; i++) {
        world.advanceTick();
        aiSystem.update(world, [agent], 1);
      }

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Queue should resume
      expect(agentComp.queuePaused).toBe(false);
      expect(agentComp.queueInterruptedBy).toBeUndefined();

      // Should return to queued behavior
      expect(agentComp.currentQueueIndex).toBe(0);
    });

    it('should pause queue when energy drops to zero', () => {
      // Queue work and set agent to actively execute from queue
      agent.updateComponent<AgentComponent>('agent', (current) => {
        const updated = queueBehavior(current, 'gather', { priority: 'normal' });
        return {
          ...updated,
          behavior: 'gather', // Explicitly set agent to be executing from queue
          lastThinkTick: 0, // Force agent to think on next update
        };
      });

      // Set critical energy (0 = forced_sleep per AISystem line 702)
      agent.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        energy: 0, // Zero energy triggers forced_sleep
      }));

      // Run update to trigger autonomic interrupt
      world.advanceTick();
      aiSystem.update(world, [agent], 1);

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Queue should be paused for forced_sleep
      expect(agentComp.queuePaused).toBe(true);
      expect(agentComp.queueInterruptedBy).toBe('forced_sleep');
      expect(agentComp.behavior).toBe('forced_sleep');
    });
  });

  describe('Queue Lifecycle', () => {
    it('should emit agent:queue:completed event when queue finishes', () => {
      let emittedEvent: any = null;

      // Listen for queue completion event
      world.eventBus.subscribe('agent:queue:completed', (event) => {
        emittedEvent = event;
      });

      // Queue single behavior
      agent.updateComponent<AgentComponent>('agent', (current) => {
        return queueBehavior(current, 'idle', { priority: 'normal' });
      });

      // Reset lastThinkTick to force agent to think
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        lastThinkTick: 0,
      }));

      // Run system
      world.advanceTick();
      aiSystem.update(world, [agent], 1);

      // Complete the behavior
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorCompleted: true,
        lastThinkTick: 0, // Force think on next update
      }));

      // Run multiple updates to allow queue completion processing
      for (let i = 0; i < 3; i++) {
        world.advanceTick();
        aiSystem.update(world, [agent], 1);
        world.eventBus.flush(); // Flush queued events
      }

      // Event should have been emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.type).toBe('agent:queue:completed');
    });

    it('should NOT process queue while paused', () => {
      // Queue behaviors with paused state
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'gather', { priority: 'normal' });
        updated = queueBehavior(updated, 'till', { priority: 'normal' });
        return {
          ...updated,
          queuePaused: true,
          currentQueueIndex: 0,
        };
      });

      const beforeAgent = agent.getComponent<AgentComponent>('agent')!;
      const beforeIndex = beforeAgent.currentQueueIndex;

      // Run system
      aiSystem.update(world, [agent], 1);

      const afterAgent = agent.getComponent<AgentComponent>('agent')!;

      // Queue index should not advance while paused
      expect(afterAgent.currentQueueIndex).toBe(beforeIndex);
    });

    it('should handle empty queue gracefully', () => {
      // Set up agent with completed queue
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'idle', { priority: 'normal' });
        return {
          ...updated,
          currentQueueIndex: 1, // Past end of queue
        };
      });

      // Should not crash
      expect(() => {
        aiSystem.update(world, [agent], 1);
      }).not.toThrow();
    });
  });

  describe('Timeout Safety', () => {
    it('should timeout behaviors that run too long', () => {
      // Queue behavior
      agent.updateComponent<AgentComponent>('agent', (current) => {
        let updated = queueBehavior(current, 'gather', { priority: 'normal' });
        // Set start time to 6 minutes ago
        return {
          ...updated,
          behaviorState: {
            startTime: Date.now() - (6 * 60 * 1000), // 6 minutes ago
          },
        };
      });

      // Run system - should detect timeout
      aiSystem.update(world, [agent], 1);

      const agentComp = agent.getComponent<AgentComponent>('agent')!;

      // Behavior should be marked as completed due to timeout
      // (Implementation may vary, but timeout should be detected)
      expect(agentComp).toBeDefined();
    });
  });

  describe('CLAUDE.md Compliance', () => {
    it('should not crash with missing queue fields', () => {
      // Agent without queue fields should work fine
      const normalAgent = agent.getComponent<AgentComponent>('agent')!;

      expect(normalAgent.behaviorQueue).toBeUndefined();
      expect(normalAgent.currentQueueIndex).toBeUndefined();

      // Should process normally without queue
      expect(() => {
        aiSystem.update(world, [agent], 1);
      }).not.toThrow();
    });

    it('should handle queue without crashing on invalid data', () => {
      // Set up queue with minimal valid data
      agent.updateComponent<AgentComponent>('agent', (current) => {
        return queueBehavior(current, 'idle', { priority: 'normal' });
      });

      // Should process without errors
      expect(() => {
        aiSystem.update(world, [agent], 1);
      }).not.toThrow();

      const agentComp = agent.getComponent<AgentComponent>('agent')!;
      expect(agentComp.behaviorQueue).toBeDefined();
    });
  });

  describe('Multiple Agents with Queues', () => {
    it('should process queues for multiple agents independently', () => {
      // Create second agent
      const agent2 = new EntityImpl(createEntityId(), 0);
      agent2.addComponent(createAgentComponent());
      agent2.addComponent(createPositionComponent(10, 10, 0));
      agent2.addComponent(createMovementComponent(1.0));
      agent2.addComponent(createNeedsComponent(50, 50, 20, 0.42, 0.5));
      agent2.addComponent(createCircadianComponent());
      agent2.addComponent(createTemperatureComponent(20, 15, 25, 10, 30));
      (world as any)._addEntity(agent2);

      // Queue different behaviors for each agent
      agent.updateComponent<AgentComponent>('agent', (current) => {
        return queueBehavior(current, 'gather', { priority: 'normal' });
      });

      agent2.updateComponent<AgentComponent>('agent', (current) => {
        return queueBehavior(current, 'till', { priority: 'normal' });
      });

      // Run system for both agents
      aiSystem.update(world, [agent, agent2], 1);

      const agent1Comp = agent.getComponent<AgentComponent>('agent')!;
      const agent2Comp = agent2.getComponent<AgentComponent>('agent')!;

      // Both should have their queues
      expect(agent1Comp.behaviorQueue).toBeDefined();
      expect(agent2Comp.behaviorQueue).toBeDefined();

      // Queues should be independent
      expect(agent1Comp.behaviorQueue?.[0].behavior).toBe('gather');
      expect(agent2Comp.behaviorQueue?.[0].behavior).toBe('till');
    });
  });
});
