import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ReflectionSystem } from '../ReflectionSystem.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../../components/SemanticMemoryComponent.js';
import { ReflectionComponent } from '../../components/ReflectionComponent.js';

/**
 * Integration tests for ReflectionSystem
 *
 * These tests actually RUN the system to verify reflection triggers work correctly.
 * Unit tests verify calculations, integration tests verify behavior.
 */

describe('ReflectionSystem Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let reflectionSystem: ReflectionSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    reflectionSystem = new ReflectionSystem(eventBus);
  });

  it('should trigger daily reflection on sleep_start event', () => {
    // Create agent with memory components
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add a memory to reflect on
    episodicMem.formMemory({
      eventType: 'conversation',
      summary: 'Talked with Oak',
      timestamp: Date.now(),
      importance: 0.7,
      emotionalValence: 0.5,
      participants: [agent.id, 'oak'],
    });

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const reflectionHandler = vi.fn();
    eventBus.subscribe('reflection:completed', reflectionHandler);

    // Emit sleep_start event
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    // Run system to process the event
    reflectionSystem.update(world, [agent], 1);

    // Should have triggered reflection
    expect(reflectionHandler).toHaveBeenCalled();
    expect(reflectionComp.reflections.length).toBe(1);
    expect(reflectionComp.reflections[0].type).toBe('daily');
  });

  it('should trigger deep reflection on new_week event', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add multiple memories
    for (let i = 0; i < 5; i++) {
      episodicMem.formMemory({
        eventType: 'harvest',
        summary: `Harvested crops ${i}`,
        timestamp: Date.now() - i * 1000,
        importance: 0.6,
        emotionalValence: 0.4,
        participants: [agent.id],
      });
    }

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const reflectionHandler = vi.fn();
    eventBus.subscribe('reflection:completed', reflectionHandler);

    // Emit new_week event with agentId
    eventBus.emit({
      type: 'time:new_week',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    // Run system to process the event
    reflectionSystem.update(world, [agent], 1);

    // Should have triggered deep reflection
    expect(reflectionHandler).toHaveBeenCalled();
    expect(reflectionComp.reflections.length).toBe(1);
    expect(reflectionComp.reflections[0].type).toBe('deep');
  });

  it('should trigger reflection on high-importance memory formation', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const reflectionHandler = vi.fn();
    eventBus.subscribe('reflection:completed', reflectionHandler);

    // Emit memory:formed event with high importance
    eventBus.emit({
      type: 'memory:formed',
      source: 'test',
      data: {
        agentId: agent.id,
        memoryId: 'mem-important',
        importance: 0.8, // High importance > 0.7
        timestamp: Date.now(),
      },
    });

    // Add the memory that was just formed
    episodicMem.formMemory({
      eventType: 'significant_event',
      summary: 'Something important happened',
      timestamp: Date.now(),
      importance: 0.8,
      emotionalValence: 0.6,
      participants: [agent.id],
    });

    // Run system to process the event
    reflectionSystem.update(world, [agent], 1);

    // Should have triggered reflection
    expect(reflectionHandler).toHaveBeenCalled();
  });

  it('should NOT trigger reflection on low-importance memory formation', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const reflectionHandler = vi.fn();
    eventBus.subscribe('reflection:completed', reflectionHandler);

    // Emit memory:formed event with low importance
    eventBus.emit({
      type: 'memory:formed',
      source: 'test',
      data: {
        agentId: agent.id,
        memoryId: 'mem-minor',
        importance: 0.3, // Low importance < 0.7
        timestamp: Date.now(),
      },
    });

    // Run system to process the event
    reflectionSystem.update(world, [agent], 1);

    // Should NOT have triggered reflection
    expect(reflectionHandler).not.toHaveBeenCalled();
  });

  it('should extract themes from multiple related memories', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add multiple farming-related memories
    episodicMem.formMemory({
      id: 'mem-1',
      eventType: 'harvest',
      summary: 'Harvested wheat',
      timestamp: Date.now(),
      importance: 0.6,
      emotionalValence: 0.5,
      participants: [agent.id],
    });

    episodicMem.formMemory({
      id: 'mem-2',
      eventType: 'planting',
      summary: 'Planted seeds',
      timestamp: Date.now(),
      importance: 0.6,
      emotionalValence: 0.4,
      participants: [agent.id],
    });

    episodicMem.formMemory({
      id: 'mem-3',
      eventType: 'harvest',
      summary: 'Harvested carrots',
      timestamp: Date.now(),
      importance: 0.6,
      emotionalValence: 0.5,
      participants: [agent.id],
    });

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Should have identified farming theme
    const reflection = reflectionComp.reflections[0];
    expect(reflection.themes).toBeDefined();
    expect(reflection.themes).toContain('farming');
  });

  it('should generate insights from emotional patterns', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add mostly positive memories
    for (let i = 0; i < 5; i++) {
      episodicMem.formMemory({
        id: `mem-${i}`,
        eventType: 'conversation',
        summary: `Happy conversation ${i}`,
        timestamp: Date.now() - i * 1000,
        importance: 0.6,
        emotionalValence: 0.7, // Positive
        participants: [agent.id],
      });
    }

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Should have generated positive insight
    const reflection = reflectionComp.reflections[0];
    expect(reflection.insights).toBeDefined();
    expect(reflection.insights.length).toBeGreaterThan(0);
  });

  it('should mark important memories for consolidation', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add high-importance memory and capture it
    const importantMemory = episodicMem.formMemory({
      eventType: 'significant_event',
      summary: 'Important event',
      timestamp: Date.now(),
      importance: 0.8, // High importance > 0.5
      emotionalValence: 0.6,
      participants: [agent.id],
    });

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Memory should be marked for consolidation
    // Find the memory in the array since we can't use getMemory
    const memory = episodicMem.episodicMemories.find(m => m.id === importantMemory.id);
    expect(memory?.markedForConsolidation).toBe(true);
  });

  it('should form semantic beliefs from insights', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add social memories
    for (let i = 0; i < 3; i++) {
      episodicMem.formMemory({
        id: `mem-${i}`,
        eventType: 'conversation',
        summary: `Social interaction ${i}`,
        timestamp: Date.now() - i * 1000,
        importance: 0.6,
        emotionalValence: 0.5,
        participants: [agent.id],
      });
    }

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const initialBeliefCount = semanticMem.beliefs.length;

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Should have formed new beliefs
    expect(semanticMem.beliefs.length).toBeGreaterThan(initialBeliefCount);
  });

  it('should NOT reflect if there are no memories to reflect on', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent(); // Empty memories
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    const reflectionHandler = vi.fn();
    eventBus.subscribe('reflection:completed', reflectionHandler);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Should NOT have reflected (no memories)
    expect(reflectionHandler).not.toHaveBeenCalled();
    expect(reflectionComp.reflections.length).toBe(0);
  });

  it('should generate narrative for deep reflection', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    // Add memories
    for (let i = 0; i < 10; i++) {
      episodicMem.formMemory({
        id: `mem-${i}`,
        eventType: 'harvest',
        summary: `Event ${i}`,
        timestamp: Date.now() - i * 1000,
        importance: 0.6,
        emotionalValence: 0.5,
        participants: [agent.id],
      });
    }

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    // Trigger deep reflection with agentId
    eventBus.emit({
      type: 'time:new_week',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    reflectionSystem.update(world, [agent], 1);

    // Should have generated narrative
    const reflection = reflectionComp.reflections[0];
    expect(reflection.narrative).toBeDefined();
    expect(reflection.narrative.length).toBeGreaterThan(0);
  });

  it('should throw error if agent missing required components', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    // Missing memory components
    world.addEntity(agent);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    // Should throw when trying to reflect
    expect(() => {
      reflectionSystem.update(world, [agent], 1);
    }).toThrow();
  });

  it('should clear reflection triggers after processing', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    const episodicMem = new EpisodicMemoryComponent();
    const semanticMem = new SemanticMemoryComponent();
    const reflectionComp = new ReflectionComponent();

    episodicMem.formMemory({
      id: 'mem-1',
      eventType: 'conversation',
      summary: 'Test memory',
      timestamp: Date.now(),
      importance: 0.6,
      emotionalValence: 0.5,
      participants: [agent.id],
    });

    agent.addComponent(episodicMem);
    agent.addComponent(semanticMem);
    agent.addComponent(reflectionComp);
    world.addEntity(agent);

    // Trigger reflection
    eventBus.emit({
      type: 'agent:sleep_start',
      source: 'test',
      data: {
        agentId: agent.id,
        timestamp: Date.now(),
      },
    });

    // First update processes the trigger
    reflectionSystem.update(world, [agent], 1);
    expect(reflectionComp.reflections.length).toBe(1);

    // Second update should NOT process same trigger again
    reflectionSystem.update(world, [agent], 1);
    expect(reflectionComp.reflections.length).toBe(1); // Still 1, not 2
  });
});
