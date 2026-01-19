import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World';
import { DeathTransitionSystem } from '../systems/DeathTransitionSystem';
import { EventBus } from '../events/EventBus';
import type { KnowledgeLossComponent } from '../components/KnowledgeLossComponent';

/**
 * Simple test for knowledge loss tracking
 */
describe('KnowledgeLoss', () => {
  let world: World;
  let system: DeathTransitionSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    system = new DeathTransitionSystem(eventBus);
  });

  it('should track unique memories as lost when agent dies', () => {
    // Create deceased agent
    const deceased = world.createEntity();
    deceased.addComponent({
      type: 'position',
      version: 1,
      x: 10,
      y: 10,
      z: 0,
    });
    deceased.addComponent({
      type: 'agent',
      version: 1,
      tier: 'autonomic',
      useLLM: false,
    });
    deceased.addComponent({
      type: 'identity',
      version: 1,
      name: 'Deceased',
    });
    deceased.addComponent({
      type: 'episodic_memory',
      version: 1,
      memories: [
        { id: 'unique1', shared: false, content: 'secret location' },
        { id: 'shared1', shared: true, content: 'village festival' },
      ],
    });
    deceased.addComponent({
      type: 'needs',
      version: 1,
      health: 0, // Dead
      hunger: 50,
      energy: 50,
      temperature: 37,
    });

    // Trigger death
    system.update(world, 1);

    // Check knowledge loss was tracked
    const knowledgeLoss = world.getComponent<KnowledgeLossComponent>('knowledge_loss');

    expect(knowledgeLoss).toBeDefined();
    expect(knowledgeLoss!.lostMemories).toHaveLength(1);
    expect(knowledgeLoss!.lostMemories[0]).toMatchObject({
      id: 'unique1',
      content: 'secret location',
      deceasedId: deceased.id,
    });
  });

  it('should not mark shared memories as lost', () => {
    const deceased = world.createEntity();
    deceased.addComponent({
      type: 'position',
      version: 1,
      x: 10,
      y: 10,
      z: 0,
    });
    deceased.addComponent({
      type: 'agent',
      version: 1,
      tier: 'autonomic',
      useLLM: false,
    });
    deceased.addComponent({
      type: 'identity',
      version: 1,
      name: 'Deceased',
    });
    deceased.addComponent({
      type: 'episodic_memory',
      version: 1,
      memories: [
        { id: 'unique1', shared: false, content: 'secret location' },
        { id: 'shared1', shared: true, content: 'village festival' },
      ],
    });
    deceased.addComponent({
      type: 'needs',
      version: 1,
      health: 0,
      hunger: 50,
      energy: 50,
      temperature: 37,
    });

    system.update(world, 1);

    const knowledgeLoss = world.getComponent<KnowledgeLossComponent>('knowledge_loss');

    expect(knowledgeLoss).toBeDefined();
    const sharedLost = knowledgeLoss!.lostMemories.some(m => m.id === 'shared1');
    expect(sharedLost).toBe(false);
  });
});
