import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../World';
import { MemoryConsolidationSystem } from '../MemoryConsolidationSystem';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent';
import { EventBus } from '../../EventBus';

describe('MemoryConsolidationSystem', () => {
  let world: World;
  let system: MemoryConsolidationSystem;
  let eventBus: EventBus;
  let agent: any;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    system = new MemoryConsolidationSystem(eventBus);
    agent = world.createEntity();
    agent.addComponent(EpisodicMemoryComponent, {});
  });

  // Criterion 5: Memory Decay
  describe('memory decay', () => {
    it('should decay unconsolidated memories faster (clarity *= 0.95 daily)', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Unconsolidated memory',
        timestamp: Date.now(),
        importance: 0.3,
        consolidated: false,
        clarity: 1.0
      });

      const initialClarity = memComp.episodicMemories[0].clarity;

      system.update(world, 86400); // 1 day passed

      const finalClarity = memComp.episodicMemories[0].clarity;
      expect(finalClarity).toBeCloseTo(initialClarity * 0.95, 2);
    });

    it('should decay consolidated memories slower (clarity *= 0.995 daily)', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Consolidated memory',
        timestamp: Date.now(),
        importance: 0.8,
        consolidated: true,
        clarity: 1.0
      });

      const initialClarity = memComp.episodicMemories[0].clarity;

      system.update(world, 86400); // 1 day passed

      const finalClarity = memComp.episodicMemories[0].clarity;
      expect(finalClarity).toBeCloseTo(initialClarity * 0.995, 3);
    });

    it('should decay high emotion memories slower', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      const lowEmotion = memComp.formMemory({
        eventType: 'test',
        summary: 'Low emotion memory',
        timestamp: Date.now(),
        emotionalIntensity: 0.2,
        consolidated: false,
        clarity: 1.0
      });

      const highEmotion = memComp.formMemory({
        eventType: 'test',
        summary: 'High emotion memory',
        timestamp: Date.now(),
        emotionalIntensity: 0.9,
        consolidated: false,
        clarity: 1.0
      });

      system.update(world, 86400); // 1 day passed

      const lowClarity = memComp.episodicMemories[0].clarity;
      const highClarity = memComp.episodicMemories[1].clarity;

      expect(highClarity).toBeGreaterThan(lowClarity);
    });

    it('should forget memories when clarity < 0.1', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Fading memory',
        timestamp: Date.now(),
        importance: 0.1,
        consolidated: false,
        clarity: 0.11
      });

      expect(memComp.episodicMemories.length).toBe(1);

      system.update(world, 86400 * 2); // 2 days

      // Clarity should drop below 0.1 and memory forgotten
      expect(memComp.episodicMemories.length).toBe(0);
    });

    it('should emit memory:forgotten event when forgetting', () => {
      const handler = vi.fn();
      eventBus.on('memory:forgotten', handler);

      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Fading memory',
        timestamp: Date.now(),
        importance: 0.1,
        consolidated: false,
        clarity: 0.11
      });

      system.update(world, 86400 * 2);

      expect(handler).toHaveBeenCalled();
    });
  });

  // Criterion 13: Memory Consolidation
  describe('memory consolidation', () => {
    it('should consolidate important memories (importance > 0.5)', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Important event',
        timestamp: Date.now(),
        importance: 0.8,
        markedForConsolidation: true,
        consolidated: false
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(true);
    });

    it('should consolidate frequently recalled memories (timesRecalled > 3)', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Frequently recalled',
        timestamp: Date.now(),
        importance: 0.3,
        timesRecalled: 5,
        consolidated: false
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(true);
    });

    it('should consolidate highly emotional memories', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Emotional event',
        timestamp: Date.now(),
        emotionalIntensity: 0.95,
        importance: 0.4,
        consolidated: false
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(true);
    });

    it('should consolidate during sleep', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now(),
        importance: 0.7,
        consolidated: false
      });

      eventBus.emit('agent:sleep_start', {
        agentId: agent.id,
        timestamp: Date.now()
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(true);
    });

    it('should consolidate during deep reflection', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now(),
        importance: 0.6,
        consolidated: false
      });

      eventBus.emit('reflection:completed', {
        agentId: agent.id,
        type: 'deep',
        timestamp: Date.now()
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(true);
    });

    it('should NOT consolidate unimportant, rarely recalled memories', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Unimportant memory',
        timestamp: Date.now(),
        importance: 0.2,
        timesRecalled: 0,
        emotionalIntensity: 0.1,
        consolidated: false
      });

      system.update(world, 86400 * 10); // Many days pass

      const memory = memComp.episodicMemories[0];
      expect(memory.consolidated).toBe(false);
    });

    it('should forget old unimportant memories', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Old unimportant memory',
        timestamp: Date.now() - 86400000 * 100, // 100 days ago
        importance: 0.1,
        timesRecalled: 0,
        consolidated: false,
        clarity: 1.0
      });

      // Simulate many days passing
      for (let i = 0; i < 50; i++) {
        system.update(world, 86400); // 1 day
      }

      // Memory should be forgotten
      expect(memComp.episodicMemories.length).toBe(0);
    });
  });

  describe('consolidation triggers', () => {
    it('should trigger on sleep', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        importance: 0.6,
        markedForConsolidation: true
      });

      eventBus.emit('agent:sleep_start', { agentId: agent.id });

      system.update(world, 1);

      expect(memComp.episodicMemories[0].consolidated).toBe(true);
    });

    it('should trigger on deep reflection', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        importance: 0.6,
        markedForConsolidation: true
      });

      eventBus.emit('reflection:completed', {
        agentId: agent.id,
        type: 'deep'
      });

      system.update(world, 1);

      expect(memComp.episodicMemories[0].consolidated).toBe(true);
    });
  });

  describe('memory strengthening', () => {
    it('should strengthen recalled memories', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Recalled memory',
        timestamp: Date.now(),
        importance: 0.5,
        clarity: 0.8,
        timesRecalled: 1
      });

      eventBus.emit('memory:recalled', {
        agentId: agent.id,
        memoryId: memComp.episodicMemories[0].id
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.clarity).toBeGreaterThan(0.8);
    });

    it('should increase importance of repeatedly recalled memories', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        importance: 0.5,
        timesRecalled: 0
      });

      const initialImportance = memComp.episodicMemories[0].importance;

      // Recall multiple times
      for (let i = 0; i < 5; i++) {
        eventBus.emit('memory:recalled', {
          agentId: agent.id,
          memoryId: memComp.episodicMemories[0].id
        });
        system.update(world, 1);
      }

      const finalImportance = memComp.episodicMemories[0].importance;
      expect(finalImportance).toBeGreaterThan(initialImportance);
    });
  });

  describe('decay calculation', () => {
    it('should calculate decay based on time delta', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        consolidated: false,
        clarity: 1.0
      });

      // 0.5 day
      system.update(world, 43200);

      const clarity1 = memComp.episodicMemories[0].clarity;

      // Another 0.5 day
      system.update(world, 43200);

      const clarity2 = memComp.episodicMemories[0].clarity;

      expect(clarity2).toBeLessThan(clarity1);
      expect(clarity1).toBeLessThan(1.0);
    });

    it('should apply decay correctly with varying deltaTime', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        consolidated: false,
        clarity: 1.0
      });

      // Large time jump
      system.update(world, 86400 * 10); // 10 days

      const clarity = memComp.episodicMemories[0].clarity;
      expect(clarity).toBeLessThan(0.6); // Should have decayed significantly
    });
  });

  // Error handling - per CLAUDE.md
  describe('error handling', () => {
    it('should throw if agent missing EpisodicMemoryComponent', () => {
      const agentWithoutMemory = world.createEntity();

      eventBus.emit('agent:sleep_start', {
        agentId: agentWithoutMemory.id
      });

      expect(() => {
        system.update(world, 1);
      }).toThrow();
    });

    it('should NOT silently skip consolidation failures', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      memComp.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        importance: 0.8
      });

      // Mock consolidation failure
      vi.spyOn(system as any, '_consolidateMemories').mockImplementation(() => {
        throw new Error('Consolidation failed');
      });

      eventBus.emit('agent:sleep_start', { agentId: agent.id });

      expect(() => {
        system.update(world, 1);
      }).toThrow();
    });

    it('should throw if memory missing required clarity field', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      // Manually add invalid memory
      (memComp as any)._episodicMemories.push({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now()
        // Missing clarity
      });

      expect(() => {
        system.update(world, 86400);
      }).toThrow();
    });
  });
});
