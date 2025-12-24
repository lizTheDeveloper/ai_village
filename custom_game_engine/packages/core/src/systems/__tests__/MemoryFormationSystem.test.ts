import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../World';
import { MemoryFormationSystem } from '../MemoryFormationSystem';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent';
import { EventBus } from '../../EventBus';

describe('MemoryFormationSystem', () => {
  let world: World;
  let system: MemoryFormationSystem;
  let eventBus: EventBus;
  let agent: any;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    system = new MemoryFormationSystem(eventBus);
    agent = world.createEntity();
    agent.addComponent(EpisodicMemoryComponent, {});
  });

  // Criterion 1: Autonomic Memory Formation
  describe('autonomic memory formation', () => {
    it('should form memory automatically on significant event', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('harvest:first', {
        agentId: agent.id,
        cropType: 'wheat',
        emotionalIntensity: 0.8,
        novelty: 1.0
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
      expect(memComp.episodicMemories[0].eventType).toBe('harvest:first');
    });

    it('should form memory on high emotional intensity (>0.6)', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('social:conflict', {
        agentId: agent.id,
        otherId: 'bob-123',
        emotionalIntensity: 0.9,
        emotionalValence: -0.8
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should form memory on high novelty', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('discovery:location', {
        agentId: agent.id,
        location: { x: 100, y: 200 },
        novelty: 1.0,
        surprise: 0.9
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should form memory on survival threat', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('need:critical', {
        agentId: agent.id,
        needType: 'health',
        currentValue: 5,
        survivalRelevance: 1.0
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should NOT form memory for trivial events', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('action:walk', {
        agentId: agent.id,
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 },
        emotionalIntensity: 0.0,
        novelty: 0.0,
        importance: 0.1
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(0);
    });
  });

  // Criterion 2: Memory Formation Triggers
  describe('memory formation triggers', () => {
    it('should trigger on emotional intensity > 0.6', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('agent:emotion_peak', {
        agentId: agent.id,
        emotion: 'joy',
        intensity: 0.7
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should trigger on novelty > 0.7', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('event:novel', {
        agentId: agent.id,
        novelty: 0.8,
        eventType: 'first_time_fishing'
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should trigger on social significance > 0.5', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('social:interaction', {
        agentId: agent.id,
        otherId: 'alice-123',
        socialSignificance: 0.8,
        interactionType: 'first_meeting'
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should trigger on survival relevance > 0.5', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('survival:close_call', {
        agentId: agent.id,
        threat: 'starvation',
        survivalRelevance: 0.9
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });

    it('should trigger on goal relevance > 0.7', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('goal:progress', {
        agentId: agent.id,
        goalId: 'build-house',
        progress: 0.5,
        goalRelevance: 0.9
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
    });
  });

  // Criterion 4: Importance Calculation
  describe('importance calculation', () => {
    it('should weight emotional intensity at 30%', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 1.0,
        novelty: 0.0,
        goalRelevance: 0.0,
        socialSignificance: 0.0,
        survivalRelevance: 0.0
      });

      system.update(world, 1);

      const importance = memComp.episodicMemories[0].importance;
      expect(importance).toBeCloseTo(0.3, 1);
    });

    it('should weight novelty at 30%', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.0,
        novelty: 0.8, // Below boost threshold (0.9) to test base weighting
        goalRelevance: 0.0,
        socialSignificance: 0.0,
        survivalRelevance: 0.0
      });

      system.update(world, 1);

      const importance = memComp.episodicMemories[0].importance;
      // 0.8 * 0.3 = 0.24
      expect(importance).toBeCloseTo(0.24, 1);
    });

    it('should weight goal relevance at 20%', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.0,
        novelty: 0.0,
        goalRelevance: 0.8, // Below boost threshold (0.9) to test base weighting
        socialSignificance: 0.0,
        survivalRelevance: 0.0
      });

      system.update(world, 1);

      const importance = memComp.episodicMemories[0].importance;
      // 0.8 * 0.2 = 0.16
      expect(importance).toBeCloseTo(0.16, 1);
    });

    it('should weight social significance at 15%', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.0,
        novelty: 0.0,
        goalRelevance: 0.0,
        socialSignificance: 1.0,
        survivalRelevance: 0.0
      });

      system.update(world, 1);

      const importance = memComp.episodicMemories[0].importance;
      expect(importance).toBeCloseTo(0.15, 1);
    });

    it('should weight survival relevance at 25%', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.0,
        novelty: 0.0,
        goalRelevance: 0.0,
        socialSignificance: 0.0,
        survivalRelevance: 0.8 // Below boost threshold (0.9) to test base weighting
      });

      system.update(world, 1);

      const importance = memComp.episodicMemories[0].importance;
      // 0.8 * 0.25 = 0.20
      expect(importance).toBeCloseTo(0.20, 1);
    });

    it('should combine all factors correctly', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.8,
        novelty: 0.85, // Below boost threshold to test base calculation
        goalRelevance: 0.85, // Below boost threshold
        socialSignificance: 0.5,
        survivalRelevance: 0.3
      });

      system.update(world, 1);

      // With normalized weights (sum to 1.0):
      // 0.8*0.25 + 0.85*0.25 + 0.85*0.167 + 0.5*0.125 + 0.3*0.208
      // = 0.2 + 0.2125 + 0.142 + 0.0625 + 0.0624 = 0.6794
      const importance = memComp.episodicMemories[0].importance;
      expect(importance).toBeCloseTo(0.679, 1);
    });
  });

  // Criterion 9: Conversation Memory Formation
  describe('conversation memory formation', () => {
    it('should form memory when agent speaks', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('conversation:utterance', {
        speakerId: agent.id,
        listenerId: 'bob-123',
        text: 'Hello, how are you?',
        timestamp: Date.now()
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
      expect(memComp.episodicMemories[0].eventType).toContain('conversation');
      expect(memComp.episodicMemories[0].summary).toContain('Hello');
    });

    it('should form memory when agent listens', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('conversation:utterance', {
        speakerId: 'alice-456',
        listenerId: agent.id,
        text: 'Nice weather today',
        timestamp: Date.now()
      });

      system.update(world, 1);

      expect(memComp.episodicMemories.length).toBe(1);
      expect(memComp.episodicMemories[0].eventType).toContain('conversation');
    });

    it('should preserve dialogue text in memory', () => {
      const memComp = agent.getComponent(EpisodicMemoryComponent);

      eventBus.emit('conversation:utterance', {
        speakerId: agent.id,
        listenerId: 'charlie-789',
        text: 'I really love gardening',
        timestamp: Date.now()
      });

      system.update(world, 1);

      const memory = memComp.episodicMemories[0];
      expect(memory.dialogueText).toBe('I really love gardening');
    });

    it('should reference same conversation in both memories', () => {
      const speaker = world.createEntity();
      speaker.addComponent(EpisodicMemoryComponent, {});
      const listener = world.createEntity();
      listener.addComponent(EpisodicMemoryComponent, {});

      const conversationId = 'conv-123';
      eventBus.emit('conversation:utterance', {
        conversationId,
        speakerId: speaker.id,
        listenerId: listener.id,
        text: 'Test message',
        timestamp: Date.now()
      });

      system.update(world, 1);

      const speakerMem = speaker.getComponent(EpisodicMemoryComponent);
      const listenerMem = listener.getComponent(EpisodicMemoryComponent);

      expect(speakerMem.episodicMemories[0].conversationId).toBe(conversationId);
      expect(listenerMem.episodicMemories[0].conversationId).toBe(conversationId);
    });
  });

  // Event emission
  describe('event emission', () => {
    it('should emit memory:formed event when memory created', () => {
      const handler = vi.fn();
      eventBus.on('memory:formed', handler);

      eventBus.emit('harvest:first', {
        agentId: agent.id,
        emotionalIntensity: 0.8,
        novelty: 1.0
      });

      system.update(world, 1);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'memory:formed' })
      );
    });

    it('should include agent ID in memory:formed event', () => {
      const handler = vi.fn();
      eventBus.on('memory:formed', handler);

      eventBus.emit('test:event', {
        agentId: agent.id,
        emotionalIntensity: 0.7
      });

      system.update(world, 1);

      // Production EventBus format: { type, source, data }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'memory:formed',
          source: 'memory_formation',
          data: expect.objectContaining({ agentId: agent.id })
        })
      );
    });
  });

  // Error handling - per CLAUDE.md
  describe('error handling', () => {
    it('should log error and skip memory formation if event missing agentId', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Emit event without agentId
      eventBus.emit('test:event', {
        emotionalIntensity: 0.8
      });

      // Should NOT throw - should log error instead
      expect(() => {
        system.update(world, 1);
      }).not.toThrow();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event test:event missing required agentId'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should throw if agent has no EpisodicMemoryComponent', () => {
      const agentWithoutMemory = world.createEntity();

      expect(() => {
        eventBus.emit('test:event', {
          agentId: agentWithoutMemory.id,
          emotionalIntensity: 0.8
        });
        system.update(world, 1);
      }).toThrow();
    });

    it('should NOT silently skip invalid events', () => {
      const handler = vi.fn();
      eventBus.on('error:memory_formation', handler);

      eventBus.emit('test:event', {
        agentId: 'nonexistent-agent',
        emotionalIntensity: 0.8
      });

      expect(() => {
        system.update(world, 1);
      }).toThrow();
    });
  });
});
