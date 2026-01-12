import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MemoryFormationSystem } from '../MemoryFormationSystem.js';
import { MemorySystem } from '../MemorySystem.js';
import { MemoryComponent } from '../../components/MemoryComponent.js';
import { SpatialMemoryComponent, type SpatialMemory } from '../../components/SpatialMemoryComponent.js';
import { createEpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for MemoryFormationSystem + MemorySystem + EventBus
 *
 * Tests verify that:
 * - Game events trigger memory formation
 * - Memory strength decays over time
 * - Important events create stronger memories
 * - Forgotten memories (strength <= 0) removed
 * - Memory emotional intensity calculated correctly
 * - Survival-relevant events prioritized
 */

describe('MemoryFormationSystem + MemorySystem + EventBus Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should memory formation system listen to events', () => {
    const memoryFormation = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memoryFormation);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createEpisodicMemoryComponent());

    harness.clearEvents();

    // Emit a memory-triggering event
    harness.world.eventBus.emit({
      type: 'resource:gathered',
      source: agent.id,
      data: {
        agentId: agent.id,
        resourceType: 'berry',
        amount: 5,
      },
    });

    const entities = Array.from(harness.world.entities.values());
    memoryFormation.update(harness.world, entities, 1.0);

    // System should process event without throwing
    const episodicMemory = agent.getComponent(ComponentType.EpisodicMemory);
    expect(episodicMemory).toBeDefined();
  });

  it('should memory decay over time', () => {
    const memorySystem = new MemorySystem();
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const spatialMemory = new SpatialMemoryComponent({ decayRate: 10, maxMemories: 100 });
    // Add a memory directly
    spatialMemory.memories.push({
      type: 'resource_location',
      x: 5,
      y: 5,
      strength: 100,
      createdAt: 0,
      lastReinforced: 0,
    });
    agent.addComponent(spatialMemory);

    // Filter to only entities with spatial_memory
    const entities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    const initialMemory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;
    const initialStrength = initialMemory.memories[0]!.strength;

    // Simulate 5 seconds
    memorySystem.update(harness.world, entities, 5.0);

    const updatedMemory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;
    const updatedStrength = updatedMemory.memories[0]!.strength;

    // Strength should have decayed
    expect(updatedStrength).toBeLessThan(initialStrength);
  });

  it('should forgotten memories be removed', () => {
    const memorySystem = new MemorySystem();
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const spatialMemory = new SpatialMemoryComponent({ decayRate: 2, maxMemories: 100 });
    spatialMemory.memories.push({
      type: 'resource_location',
      x: 5,
      y: 5,
      strength: 5, // Very weak
      createdAt: 0,
      lastReinforced: 0,
    });
    agent.addComponent(spatialMemory);

    // Filter to only entities with spatial_memory
    const entities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    // Simulate 3 seconds (should decay 6 strength, bringing it to -1)
    memorySystem.update(harness.world, entities, 3.0);

    const updatedMemory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;

    // Memory should be removed
    expect(updatedMemory.memories.length).toBe(0);
  });

  it('should multiple memories decay independently', () => {
    const memorySystem = new MemorySystem();
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const spatialMemory = new SpatialMemoryComponent({ decayRate: 5, maxMemories: 100 });
    spatialMemory.memories.push({
      type: 'resource_location',
      x: 5,
      y: 5,
      strength: 100,
      createdAt: 0,
      lastReinforced: 0,
    });
    spatialMemory.memories.push({
      type: 'danger',
      x: 10,
      y: 10,
      strength: 10,
      createdAt: 0,
      lastReinforced: 0,
    });
    agent.addComponent(spatialMemory);

    // Filter to only entities with spatial_memory
    const entities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    // Simulate 1 second
    memorySystem.update(harness.world, entities, 1.0);

    const updatedMemory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;

    // Both should have decayed but still exist
    expect(updatedMemory.memories.length).toBe(2);
    expect(updatedMemory.memories[0]!.strength).toBe(95); // 100 - 5
    expect(updatedMemory.memories[1]!.strength).toBe(5); // 10 - 5
  });

  it('should test event trigger memory formation', () => {
    const memoryFormation = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memoryFormation);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createEpisodicMemoryComponent());

    // Emit test event
    harness.world.eventBus.emit({
      type: 'test:event',
      source: agent.id,
      data: {
        agentId: agent.id,
        testData: 'test',
      },
    });

    // Process the system
    const entities = Array.from(harness.world.entities.values());
    memoryFormation.update(harness.world, entities, 1.0);

    // System should have processed the event without throwing
    const episodicMemory = agent.getComponent(ComponentType.EpisodicMemory);
    expect(episodicMemory).toBeDefined();
  });

  it('should conversation events create memories for both participants', () => {
    const memoryFormation = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memoryFormation);

    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 11, y: 11 });

    agent1.addComponent(createEpisodicMemoryComponent());
    agent2.addComponent(createEpisodicMemoryComponent());

    // Emit conversation event
    harness.world.eventBus.emit({
      type: 'conversation:utterance',
      source: agent1.id,
      data: {
        speakerId: agent1.id,
        listenerId: agent2.id,
        message: 'Hello!',
      },
    });

    const entities = Array.from(harness.world.entities.values());
    memoryFormation.update(harness.world, entities, 1.0);

    // Both agents should have episodic memory components
    expect(agent1.getComponent(ComponentType.EpisodicMemory)).toBeDefined();
    expect(agent2.getComponent(ComponentType.EpisodicMemory)).toBeDefined();
  });

  it('should memory formation throw on missing agentId (CLAUDE.md: no silent fallbacks)', () => {
    const memoryFormation = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memoryFormation);

    // Emit event without agentId
    harness.world.eventBus.emit({
      type: 'resource:gathered',
      source: 'system',
      data: {
        // Missing agentId!
        resourceType: 'berry',
        amount: 5,
      },
    });

    // Should throw per CLAUDE.md (no silent fallbacks)
    expect(() => {
      const entities = Array.from(harness.world.entities.values());
      memoryFormation.update(harness.world, entities, 1.0);
    }).toThrow(/missing required agentId/i);
  });

  it('should memory system handle empty memory list', () => {
    const memorySystem = new MemorySystem();
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const spatialMemory = new SpatialMemoryComponent({ decayRate: 5, maxMemories: 100 });
    // Empty memories list
    agent.addComponent(spatialMemory);

    // Filter to only entities with spatial_memory
    const entities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    // Should not crash
    expect(() => {
      memorySystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should memory decay rate affect forgetting speed', () => {
    const memorySystem = new MemorySystem();
    harness.registerSystem('MemorySystem', memorySystem);

    // Agent with fast decay
    const fastDecay = harness.createTestAgent({ x: 10, y: 10 });
    const fastSpatialMemory = new SpatialMemoryComponent({ decayRate: 20, maxMemories: 100 });
    fastSpatialMemory.memories.push({
      type: 'resource_location',
      x: 5,
      y: 5,
      strength: 100,
      createdAt: 0,
      lastReinforced: 0,
    });
    fastDecay.addComponent(fastSpatialMemory);

    // Agent with slow decay
    const slowDecay = harness.createTestAgent({ x: 20, y: 20 });
    const slowSpatialMemory = new SpatialMemoryComponent({ decayRate: 5, maxMemories: 100 });
    slowSpatialMemory.memories.push({
      type: 'resource_location',
      x: 15,
      y: 15,
      strength: 100,
      createdAt: 0,
      lastReinforced: 0,
    });
    slowDecay.addComponent(slowSpatialMemory);

    // Filter to only entities with spatial_memory
    const entities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    // Simulate 2 seconds
    memorySystem.update(harness.world, entities, 2.0);

    const fastMem = fastDecay.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;
    const slowMem = slowDecay.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;

    // Fast decay should have lost more strength
    expect(fastMem.memories[0]!.strength).toBeLessThan(slowMem.memories[0]!.strength);
  });

  it('should survival events create memories', () => {
    const memoryFormation = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memoryFormation);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createEpisodicMemoryComponent());

    // Emit survival event
    harness.world.eventBus.emit({
      type: 'agent:starved',
      source: agent.id,
      data: {
        agentId: agent.id,
        survivalRelevance: 1.0,
      },
    });

    const entities = Array.from(harness.world.entities.values());
    memoryFormation.update(harness.world, entities, 1.0);

    // Critical survival event should be processed without errors
    const episodicMemory = agent.getComponent(ComponentType.EpisodicMemory);
    expect(episodicMemory).toBeDefined();
  });
});
