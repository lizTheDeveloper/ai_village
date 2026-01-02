import { ComponentType } from '../../types/ComponentType.js';
/**
 * Unit tests for AgentBrainSystem
 *
 * Tests the thin orchestrator that coordinates perception, decision, and behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { World } from '../../ecs/World.js';

import { AgentBrainSystem, createAgentBrainSystem } from '../AgentBrainSystem.js';
import { BehaviorRegistry } from '../../behavior/BehaviorRegistry.js';

// Helper to create a mock agent component
function createMockAgent(overrides: Partial<AgentComponent> = {}): AgentComponent {
  return {
    type: ComponentType.Agent,
    version: 1,
    name: 'TestAgent',
    behavior: 'idle',
    behaviorState: {},
    useLLM: false,
    llmCooldown: 0,
    thinkInterval: 1,
    lastThinkTick: 0,
    ...overrides,
  } as AgentComponent;
}

// Helper to create a mock world
function createMockWorld(tick: number = 100): World {
  return {
    tick,
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockReturnValue([]),
    }),
  } as unknown as World;
}

// Helper to create an agent entity
function createAgentEntity(agent: AgentComponent): EntityImpl {
  const entity = new EntityImpl(createEntityId(), 0);
  entity.addComponent(createPositionComponent(50, 50));
  entity.addComponent(createMovementComponent());
  entity.addComponent(agent);
  return entity;
}

describe('AgentBrainSystem', () => {
  let system: AgentBrainSystem;

  beforeEach(() => {
    system = new AgentBrainSystem();
  });

  describe('constructor', () => {
    it('has correct id and priority', () => {
      expect(system.id).toBe('agent-brain');
      expect(system.priority).toBe(10);
    });

    it('requires agent, position, and movement components', () => {
      expect(system.requiredComponents).toContain('agent');
      expect(system.requiredComponents).toContain('position');
      expect(system.requiredComponents).toContain('movement');
    });
  });

  describe('registerBehavior', () => {
    it('registers a behavior', () => {
      const handler = vi.fn();
      system.registerBehavior('test', handler);

      expect(system.getBehaviorRegistry().has('test')).toBe(true);
    });
  });

  describe('update', () => {
    it('skips entities without agent component', () => {
      const world = createMockWorld();
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent(createPositionComponent(50, 50));
      entity.addComponent(createMovementComponent());
      // No agent component

      // Should not throw
      system.update(world, [entity], 0.05);
    });

    it('respects think interval', () => {
      const handler = vi.fn();
      system.registerBehavior('idle', handler);

      const agent = createMockAgent({
        thinkInterval: 10,
        lastThinkTick: 95,
      });
      const entity = createAgentEntity(agent);
      const world = createMockWorld(100); // Only 5 ticks since last think

      system.update(world, [entity], 0.05);

      // Should not execute behavior (interval not reached)
      expect(handler).not.toHaveBeenCalled();
    });

    it('updates lastThinkTick when thinking', () => {
      const handler = vi.fn();
      system.registerBehavior('idle', handler);

      const agent = createMockAgent({
        thinkInterval: 5,
        lastThinkTick: 90,
      });
      const entity = createAgentEntity(agent);
      const world = createMockWorld(100);

      system.update(world, [entity], 0.05);

      const updatedAgent = entity.getComponent(ComponentType.Agent) as AgentComponent;
      expect(updatedAgent.lastThinkTick).toBe(100);
    });

    it('executes registered behavior', () => {
      const handler = vi.fn();
      system.registerBehavior('wander', handler);

      const agent = createMockAgent({
        behavior: 'wander',
        thinkInterval: 1,
        lastThinkTick: 0,
      });
      const entity = createAgentEntity(agent);
      const world = createMockWorld(100);

      system.update(world, [entity], 0.05);

      expect(handler).toHaveBeenCalledWith(entity, world);
    });
  });

  describe('autonomic override', () => {
    it('switches to seek_sleep when energy is critical', () => {
      const sleepHandler = vi.fn();
      const wanderHandler = vi.fn();
      system.registerBehavior('seek_sleep', sleepHandler);
      system.registerBehavior('wander', wanderHandler);

      const agent = createMockAgent({
        behavior: 'wander',
        thinkInterval: 1,
        lastThinkTick: 0,
      });
      const entity = createAgentEntity(agent);

      // Add critical needs
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.2; // Critical (below 0.3 threshold)
      entity.addComponent(needs);

      const world = createMockWorld(100);

      system.update(world, [entity], 0.05);

      // Should have switched to seek_sleep
      const updatedAgent = entity.getComponent(ComponentType.Agent) as AgentComponent;
      expect(updatedAgent.behavior).toBe('seek_sleep');
      expect(sleepHandler).toHaveBeenCalled();
    });

    it('switches to forced_sleep when energy is zero', () => {
      const forcedSleepHandler = vi.fn();
      system.registerBehavior('forced_sleep', forcedSleepHandler);
      system.registerBehavior('wander', vi.fn());

      const agent = createMockAgent({
        behavior: 'wander',
        thinkInterval: 1,
        lastThinkTick: 0,
      });
      const entity = createAgentEntity(agent);

      // Add exhausted needs
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0;
      entity.addComponent(needs);

      const world = createMockWorld(100);

      system.update(world, [entity], 0.05);

      const updatedAgent = entity.getComponent(ComponentType.Agent) as AgentComponent;
      expect(updatedAgent.behavior).toBe('forced_sleep');
    });
  });

  describe('behavior queue', () => {
    it('emits queue:interrupted when autonomic overrides', () => {
      system.registerBehavior('seek_sleep', vi.fn());
      system.registerBehavior('gather', vi.fn());

      const agent = createMockAgent({
        behavior: 'gather',
        thinkInterval: 1,
        lastThinkTick: 0,
        behaviorQueue: [
          { behavior: 'gather', behaviorState: {} },
          { behavior: 'deposit_items', behaviorState: {} },
        ],
        currentQueueIndex: 0,
      });
      const entity = createAgentEntity(agent);

      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.2;
      entity.addComponent(needs);

      const world = createMockWorld(100);

      system.update(world, [entity], 0.05);

      expect(world.eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:queue:interrupted',
          data: expect.objectContaining({
            reason: 'autonomic_override',
          }),
        })
      );
    });
  });
});

describe('createAgentBrainSystem factory', () => {
  it('creates system without options', () => {
    const system = createAgentBrainSystem();
    expect(system).toBeInstanceOf(AgentBrainSystem);
  });

  it('creates system with custom registry', () => {
    const registry = new BehaviorRegistry();
    registry.register('custom', vi.fn());

    const system = createAgentBrainSystem({ behaviorRegistry: registry });

    expect(system.getBehaviorRegistry().has('custom')).toBe(true);
  });
});
