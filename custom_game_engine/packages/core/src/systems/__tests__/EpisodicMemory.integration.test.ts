import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { MemoryFormationSystem } from '../MemoryFormationSystem.js';
import { MemoryConsolidationSystem } from '../MemoryConsolidationSystem.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';
import type { EpisodicMemory } from '../../components/EpisodicMemoryComponent.js';

/**
 * Integration tests for Episodic Memory System
 *
 * These tests actually RUN the memory systems to verify:
 * - Memories form automatically from events
 * - Memories decay over time
 * - Memories consolidate during sleep
 * - Memory retrieval works during decision-making
 */

describe('Episodic Memory Integration', () => {
  let eventBus: EventBusImpl;
  let world: WorldImpl;
  let agent: EntityImpl;
  let memoryFormationSystem: MemoryFormationSystem;
  let memoryConsolidationSystem: MemoryConsolidationSystem;

  beforeEach(() => {
    // Create real world with EventBus
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create agent with episodic memory component
    agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(new EpisodicMemoryComponent());
    (world as any)._addEntity(agent);

    // Create memory systems
    memoryFormationSystem = new MemoryFormationSystem(eventBus);
    memoryConsolidationSystem = new MemoryConsolidationSystem(eventBus);
  });

  describe('Memory Formation from Events', () => {
    it('should automatically create memory when harvest event fires', () => {
      // Get initial memory count
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(memory.episodicMemories.length).toBe(0);

      // Fire harvest event
      eventBus.emit({
        type: 'agent:harvested',
        source: 'test',
        data: {
          agentId: agent.id,
          resourceType: 'wheat',
          amount: 5,
          location: { x: 10, y: 20 },
          emotionalIntensity: 0.6,
          goalRelevance: 0.8
        }
      });

      // Run memory formation system
      memoryFormationSystem.update(world, 0);

      // Memory should be created
      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories.length).toBe(1);

      const formed = updatedMemory.episodicMemories[0] as EpisodicMemory;
      expect(formed.eventType).toBe('agent:harvested');
      expect(formed.summary).toContain('wheat');
      expect(formed.location).toEqual({ x: 10, y: 20 });
    });

    it('should create memories for both participants in conversation', () => {
      // Create second agent (conversation partner)
      const listener = new EntityImpl(createEntityId(), 0);
      listener.addComponent(new EpisodicMemoryComponent());
      (world as any)._addEntity(listener);

      // Fire conversation event
      eventBus.emit({
        type: 'conversation:utterance',
        source: 'test',
        data: {
          speakerId: agent.id,
          listenerId: listener.id,
          text: 'Hello, how are you?',
          emotionalIntensity: 0.5
        }
      });

      // Run memory formation system
      memoryFormationSystem.update(world, 0);

      // Both agents should have memories
      const speakerMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const listenerMemory = listener.getComponent('episodic_memory') as EpisodicMemoryComponent;

      expect(speakerMemory.episodicMemories.length).toBe(1);
      expect(listenerMemory.episodicMemories.length).toBe(1);

      expect(speakerMemory.episodicMemories[0]?.eventType).toBe('conversation:utterance');
      expect(listenerMemory.episodicMemories[0]?.eventType).toBe('conversation:utterance');
    });

    it('should create high-importance memory for survival events', () => {
      // Fire survival threat event
      eventBus.emit({
        type: 'need:critical',
        source: 'test',
        data: {
          agentId: agent.id,
          needType: 'hunger',
          value: 5,
          emotionalIntensity: 0.9,
          emotionalValence: -0.9,
          survivalRelevance: 1.0
        }
      });

      // Run memory formation system
      memoryFormationSystem.update(world, 0);

      // Memory should be high importance
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const formed = memory.episodicMemories[0] as EpisodicMemory;

      expect(formed.importance).toBeGreaterThan(0.5);
      expect(formed.survivalRelevance).toBe(1.0);
      expect(formed.emotionalValence).toBeLessThan(0);
    });

    it('should handle multiple events in sequence', () => {
      // Fire multiple events
      const events = [
        { type: 'agent:harvested', resourceType: 'wheat' },
        { type: 'resource:gathered', resourceType: 'wood' },
        { type: 'agent:sleep_start', sleepLocation: { x: 5, y: 5 } }
      ];

      for (const event of events) {
        eventBus.emit({
          type: event.type,
          source: 'test',
          data: { agentId: agent.id, ...event }
        });
      }

      // Run memory formation system
      memoryFormationSystem.update(world, 0);

      // Should have 3 memories
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(memory.episodicMemories.length).toBe(3);
    });
  });

  describe('Memory Decay over Time', () => {
    it('should decay memory clarity over game days', () => {
      // Create a memory
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      memory.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now(),
        importance: 0.5
      });

      const initialClarity = memory.episodicMemories[0]?.clarity ?? 1.0;
      expect(initialClarity).toBe(1.0);

      // Simulate 10 game days (10 * 86400 seconds)
      const tenDays = 10 * 86400;
      memoryConsolidationSystem.update(world, tenDays);

      // Clarity should have decayed
      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const decayedClarity = updatedMemory.episodicMemories[0]?.clarity ?? 1.0;

      expect(decayedClarity).toBeLessThan(initialClarity);
      expect(decayedClarity).toBeGreaterThan(0); // Should not decay to 0 for medium importance
    });

    it('should decay low-importance memories faster than high-importance', () => {
      // Create two memories with different importance via emotional factors
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Low importance',
        timestamp: Date.now(),
        emotionalIntensity: 0.1, // Low emotion = low importance
        novelty: 0.0,
        goalRelevance: 0.1
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'High importance',
        timestamp: Date.now(),
        emotionalIntensity: 0.9, // High emotion = high importance
        novelty: 1.0,
        goalRelevance: 0.9,
        survivalRelevance: 0.8
      });

      // Verify importance difference before decay
      expect(memory.episodicMemories[1]?.importance).toBeGreaterThan(memory.episodicMemories[0]?.importance ?? 0);

      // Simulate 30 game days (longer period to see more difference)
      const thirtyDays = 30 * 86400;
      memoryConsolidationSystem.update(world, thirtyDays);

      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const lowImportanceClarity = updatedMemory.episodicMemories[0]?.clarity ?? 0;
      const highImportanceClarity = updatedMemory.episodicMemories[1]?.clarity ?? 0;

      expect(lowImportanceClarity).toBeLessThan(highImportanceClarity);
    });

    it('should preserve memory summary even after decay', () => {
      // Create an important memory that will be consolidated
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      memory.formMemory({
        eventType: 'test',
        summary: 'Original summary',
        timestamp: Date.now(),
        emotionalIntensity: 0.9, // Will trigger consolidation
        importance: 0.8,
        consolidated: false
      });

      const originalSummary = memory.episodicMemories[0]?.summary;

      // Consolidate the memory to protect it from forgetting
      memoryConsolidationSystem.update(world, 0);

      // Verify it's consolidated
      let updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories[0]?.consolidated).toBe(true);

      // Simulate 30 game days of decay
      const thirtyDays = 30 * 86400;
      memoryConsolidationSystem.update(world, thirtyDays);

      // Consolidated memory should survive and preserve summary
      updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories.length).toBeGreaterThan(0);
      expect(updatedMemory.episodicMemories[0]?.summary).toBe(originalSummary);
    });
  });

  describe('Memory Consolidation during Sleep', () => {
    it('should consolidate memories when agent sleeps', () => {
      // Create unconsolidated memories
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Memory 1',
        timestamp: Date.now(),
        emotionalIntensity: 0.9, // Triggers consolidation (> 0.8)
        markedForConsolidation: true,
        consolidated: false
      });

      expect(memory.episodicMemories[0]?.consolidated).toBe(false);

      // Fire sleep start event
      eventBus.emit({
        type: 'agent:sleep_start',
        source: 'test',
        data: { agentId: agent.id }
      });

      // Run consolidation system
      memoryConsolidationSystem.update(world, 0);

      // Memory should be consolidated
      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories[0]?.consolidated).toBe(true);
    });

    it('should only consolidate marked memories during sleep', () => {
      // Create one marked and one unmarked memory
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Marked memory',
        timestamp: Date.now(),
        emotionalIntensity: 0.9, // High emotion triggers consolidation
        markedForConsolidation: true,
        consolidated: false
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Unmarked memory',
        timestamp: Date.now(),
        emotionalIntensity: 0.2, // Low emotion, won't consolidate
        markedForConsolidation: false,
        consolidated: false
      });

      // Fire sleep start event
      eventBus.emit({
        type: 'agent:sleep_start',
        source: 'test',
        data: { agentId: agent.id }
      });

      // Run consolidation system
      memoryConsolidationSystem.update(world, 0);

      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories[0]?.consolidated).toBe(true);
      expect(updatedMemory.episodicMemories[1]?.consolidated).toBe(false);
    });
  });

  describe('Memory Retrieval for Decision-Making', () => {
    it('should prioritize memories with matching participants', () => {
      // Create memories with different participants
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Met Alice',
        timestamp: Date.now(),
        participants: ['Alice']
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Met Bob',
        timestamp: Date.now(),
        participants: ['Bob']
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Met Alice again',
        timestamp: Date.now(),
        participants: ['Alice']
      });

      // Retrieve top 2 memories about Alice - should prioritize Alice memories
      const aliceMemories = memory.retrieveRelevant({
        participants: ['Alice'],
        limit: 2
      });

      expect(aliceMemories.length).toBe(2);
      // Both retrieved memories should include Alice (participant matching gives higher score)
      expect(aliceMemories.every(m => m.participants?.includes('Alice'))).toBe(true);
    });

    it('should retrieve recent memories with higher priority', () => {
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const now = Date.now();

      memory.formMemory({
        eventType: 'test',
        summary: 'Old memory',
        timestamp: now - 1000000,
        importance: 0.5
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Recent memory',
        timestamp: now,
        importance: 0.5
      });

      // Retrieve with recency bias
      const memories = memory.retrieveRelevant({
        currentTime: now,
        limit: 1
      });

      expect(memories[0]?.summary).toBe('Recent memory');
    });

    it('should increment recall counter when memories retrieved', () => {
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now()
      });

      expect(memory.episodicMemories[0]?.timesRecalled).toBe(0);

      // Retrieve multiple times
      memory.retrieveRelevant({ limit: 1 });

      // Check component state after first retrieval
      let updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories[0]?.timesRecalled).toBe(1);

      memory.retrieveRelevant({ limit: 1 });
      memory.retrieveRelevant({ limit: 1 });

      // Check final state
      updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories[0]?.timesRecalled).toBe(3);
    });

    it('should retrieve memories by location proximity', () => {
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'At farm',
        timestamp: Date.now(),
        location: { x: 10, y: 20 }
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'At forest',
        timestamp: Date.now(),
        location: { x: 100, y: 200 }
      });

      // Retrieve memories near farm
      const farmMemories = memory.retrieveRelevant({
        location: { x: 10, y: 20 },
        limit: 1
      });

      expect(farmMemories[0]?.summary).toBe('At farm');
    });
  });

  describe('Full Memory Lifecycle', () => {
    it('should handle complete memory lifecycle: form -> recall -> consolidate -> decay', () => {
      // Step 1: Form memory from event
      eventBus.emit({
        type: 'agent:harvested',
        source: 'test',
        data: {
          agentId: agent.id,
          resourceType: 'wheat',
          emotionalIntensity: 0.9, // High emotion triggers consolidation
          goalRelevance: 0.9
        }
      });

      memoryFormationSystem.update(world, 0);

      let memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(memory.episodicMemories.length).toBe(1);
      expect(memory.episodicMemories[0]?.consolidated).toBe(false);

      // Step 2: Recall memory
      memory.retrieveRelevant({ limit: 1 });

      // Check component state after retrieval
      memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(memory.episodicMemories[0]?.timesRecalled).toBe(1);

      // Step 3: Consolidate during sleep
      eventBus.emit({
        type: 'agent:sleep_start',
        source: 'test',
        data: { agentId: agent.id }
      });

      memoryConsolidationSystem.update(world, 0);

      memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(memory.episodicMemories[0]?.consolidated).toBe(true);

      // Step 4: Decay over time
      const initialClarity = memory.episodicMemories[0]?.clarity ?? 1.0;
      const thirtyDays = 30 * 86400;
      memoryConsolidationSystem.update(world, thirtyDays);

      memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const finalClarity = memory.episodicMemories[0]?.clarity ?? 1.0;

      expect(finalClarity).toBeLessThan(initialClarity);
      expect(memory.episodicMemories[0]?.summary).toContain('wheat'); // Summary preserved
    });

    it('should handle multiple agents with independent memory systems', () => {
      // Create second agent
      const agent2 = new EntityImpl(createEntityId(), 0);
      agent2.addComponent(new EpisodicMemoryComponent());
      (world as any)._addEntity(agent2);

      // Fire events for different agents
      eventBus.emit({
        type: 'agent:harvested',
        source: 'test',
        data: {
          agentId: agent.id,
          resourceType: 'wheat'
        }
      });

      eventBus.emit({
        type: 'resource:gathered',
        source: 'test',
        data: {
          agentId: agent2.id,
          resourceType: 'wood'
        }
      });

      memoryFormationSystem.update(world, 0);

      // Each agent should have their own memory
      const memory1 = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      const memory2 = agent2.getComponent('episodic_memory') as EpisodicMemoryComponent;

      expect(memory1.episodicMemories.length).toBe(1);
      expect(memory2.episodicMemories.length).toBe(1);
      expect(memory1.episodicMemories[0]?.summary).toContain('wheat');
      expect(memory2.episodicMemories[0]?.summary).toContain('wood');
    });
  });

  describe('Error Handling', () => {
    it('should skip events with missing agentId without crashing', () => {
      // MemoryFormationSystem is resilient - logs error but doesn't crash
      // This prevents bad events from breaking the game
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      eventBus.emit({
        type: 'agent:harvested',
        source: 'test',
        data: {
          // Missing agentId
          resourceType: 'wheat'
        }
      });

      // Should not throw - just skip the invalid event
      expect(() => {
        memoryFormationSystem.update(world, 0);
      }).not.toThrow();

      // No memory should be formed
      const updatedMemory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;
      expect(updatedMemory.episodicMemories.length).toBe(0);
    });

    it('should throw when memory formation missing required fields', () => {
      const memory = agent.getComponent('episodic_memory') as EpisodicMemoryComponent;

      // Missing eventType
      expect(() => {
        memory.formMemory({
          summary: 'Test',
          timestamp: Date.now()
        } as any);
      }).toThrow(/eventType/);

      // Missing summary
      expect(() => {
        memory.formMemory({
          eventType: 'test',
          timestamp: Date.now()
        } as any);
      }).toThrow(/summary/);

      // Missing timestamp
      expect(() => {
        memory.formMemory({
          eventType: 'test',
          summary: 'Test'
        } as any);
      }).toThrow(/timestamp/);
    });
  });
});
