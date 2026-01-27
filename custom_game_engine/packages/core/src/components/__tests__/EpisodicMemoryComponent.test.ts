import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import { EpisodicMemoryComponent } from '../EpisodicMemoryComponent.js';

describe('EpisodicMemoryComponent', () => {
  let world: World;
  let entity: EntityImpl;

  beforeEach(() => {
    world = new World();
    entity = world.createEntity() as EntityImpl;
  });

  // Criterion 1: Autonomic Memory Formation
  describe('autonomic memory formation', () => {
    it('should automatically create episodic memory when significant event occurs', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      // Simulate significant event (first harvest)
      memory.formMemory({
        eventType: 'harvest:first',
        summary: 'Harvested first wheat crop',
        timestamp: Date.now(),
        emotionalIntensity: 0.8,
        novelty: 1.0,
        goalRelevance: 0.9
      });

      expect(memory.episodicMemories.length).toBe(1);
      const formed = memory.episodicMemories[0];
      expect(formed.summary).toBe('Harvested first wheat crop');
      expect(formed.emotionalValence).toBeDefined();
      expect(formed.emotionalIntensity).toBeDefined();
      expect(formed.importance).toBeDefined();
    });

    it('should not require agent choice to form memory', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      // Memory formation is automatic, no "chooseToRemember" parameter
      memory.formMemory({
        eventType: 'conflict:verbal',
        summary: 'Argued with Bob about garden boundaries',
        timestamp: Date.now(),
        emotionalIntensity: 0.7
      });

      expect(memory.episodicMemories.length).toBe(1);
    });

    it('should form memory for emotionally intense events (intensity > 0.6)', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'social:conflict',
        summary: 'Major disagreement with Alice',
        timestamp: Date.now(),
        emotionalIntensity: 0.9,
        emotionalValence: -0.8
      });

      expect(memory.episodicMemories.length).toBe(1);
      expect(memory.episodicMemories[0].emotionalIntensity).toBeGreaterThan(0.6);
    });

    it('should form memory for novel events', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'discovery:location',
        summary: 'Found a hidden cave',
        timestamp: Date.now(),
        novelty: 1.0,
        surprise: 0.9
      });

      expect(memory.episodicMemories.length).toBe(1);
      expect(memory.episodicMemories[0].surprise).toBeGreaterThan(0.5);
    });

    it('should form memory for survival-relevant events', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'survival:threat',
        summary: 'Nearly froze to death during storm',
        timestamp: Date.now(),
        survivalRelevance: 1.0,
        emotionalIntensity: 0.9,
        emotionalValence: -0.9
      });

      expect(memory.episodicMemories.length).toBe(1);
      const formed = memory.episodicMemories[0];
      // With normalized weights: survivalRelevance(1.0)*0.208 + emotionalIntensity(0.9)*0.25 + survival boost(0.15) = 0.583
      expect(formed.importance).toBeGreaterThan(0.5);
    });
  });

  // Criterion 2: Memory Immutability
  describe('memory immutability', () => {
    it('should prevent editing memory content', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'harvest:first',
        summary: 'Original event description',
        timestamp: Date.now()
      });

      const formed = memory.episodicMemories[0];
      const originalSummary = formed.summary;

      // Attempt to modify should throw or have no effect
      expect(() => {
        (formed as { -readonly [K in keyof typeof formed]: typeof formed[K] }).summary = 'Changed description';
      }).toThrow();

      // Alternatively, if using Object.freeze:
      // formed.summary should still be original
      expect(memory.episodicMemories[0].summary).toBe(originalSummary);
    });

    it('should prevent deletion of memories', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now()
      });

      expect(memory.episodicMemories.length).toBe(1);

      // Should not have delete method
      expect((memory as Record<string, unknown>).deleteMemory).toBeUndefined();
      expect((memory as Record<string, unknown>).removeMemory).toBeUndefined();
    });

    it('should only allow natural decay, not manual deletion', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now()
      });

      // Decay is allowed
      memory.applyDecay(1); // 1 day passed

      // But direct removal is not
      expect(() => {
        memory.episodicMemories.splice(0, 1);
      }).toThrow();
    });

    it('should preserve original event summary forever', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Original event',
        timestamp: Date.now()
      });

      // Apply decay multiple times
      for (let i = 0; i < 100; i++) {
        memory.applyDecay(1);
      }

      // Summary should still be original even if clarity is low
      expect(memory.episodicMemories[0].summary).toBe('Original event');
    });
  });

  // Criterion 3: Emotional Encoding
  describe('emotional encoding', () => {
    it('should encode positive events with positive valence', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'harvest:abundant',
        summary: 'Amazing harvest, the best ever!',
        timestamp: Date.now(),
        emotionalValence: 0.9
      });

      expect(memory.episodicMemories[0].emotionalValence).toBeGreaterThan(0);
    });

    it('should encode negative events with negative valence', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'conflict:physical',
        summary: 'Got into a fight with Charlie',
        timestamp: Date.now(),
        emotionalValence: -0.8
      });

      expect(memory.episodicMemories[0].emotionalValence).toBeLessThan(0);
    });

    it('should encode emotional intensity from 0 to 1', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'social:celebration',
        summary: 'Festival was incredibly fun',
        timestamp: Date.now(),
        emotionalIntensity: 0.95
      });

      const formed = memory.episodicMemories[0];
      expect(formed.emotionalIntensity).toBeGreaterThanOrEqual(0);
      expect(formed.emotionalIntensity).toBeLessThanOrEqual(1);
      expect(formed.emotionalIntensity).toBeGreaterThan(0.6);
    });

    it('should encode surprise for novel events', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'discovery:strange',
        summary: 'Found mysterious artifact',
        timestamp: Date.now(),
        novelty: 1.0,
        surprise: 0.9
      });

      expect(memory.episodicMemories[0].surprise).toBeGreaterThan(0.5);
    });

    it('should clamp emotional values to valid ranges', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        emotionalValence: 2.5, // Invalid, should clamp to 1
        emotionalIntensity: -0.5, // Invalid, should clamp to 0
        surprise: 1.5 // Invalid, should clamp to 1
      });

      const formed = memory.episodicMemories[0];
      expect(formed.emotionalValence).toBeGreaterThanOrEqual(-1);
      expect(formed.emotionalValence).toBeLessThanOrEqual(1);
      expect(formed.emotionalIntensity).toBeGreaterThanOrEqual(0);
      expect(formed.emotionalIntensity).toBeLessThanOrEqual(1);
      expect(formed.surprise).toBeLessThanOrEqual(1);
    });
  });

  // Criterion 4: Importance Calculation
  describe('importance calculation', () => {
    it('should calculate importance from weighted factors', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'harvest:first',
        summary: 'First harvest',
        timestamp: Date.now(),
        emotionalIntensity: 0.8, // 30% weight
        novelty: 1.0, // 30% weight
        goalRelevance: 0.9, // 20% weight
        socialSignificance: 0.5, // 15% weight
        survivalRelevance: 0.3 // 25% weight
      });

      const importance = memory.episodicMemories[0].importance;

      // Approximate expected: 0.8*0.3 + 1.0*0.3 + 0.9*0.2 + 0.5*0.15 + 0.3*0.25
      // = 0.24 + 0.3 + 0.18 + 0.075 + 0.075 = 0.87
      expect(importance).toBeGreaterThan(0.8);
      expect(importance).toBeLessThanOrEqual(1.0);
    });

    it('should give novelty boost to first-time events', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'harvest:first',
        summary: 'First time harvesting',
        timestamp: Date.now(),
        novelty: 1.0,
        emotionalIntensity: 0.5
      });

      // novelty(1.0)*0.25 + emotionalIntensity(0.5)*0.25 + novelty boost(0.1) = 0.475
      expect(memory.episodicMemories[0].importance).toBeGreaterThan(0.45);
    });

    it('should give goal-relevance boost', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'goal:progress',
        summary: 'Made progress on building house',
        timestamp: Date.now(),
        goalRelevance: 1.0,
        emotionalIntensity: 0.6
      });

      // With normalized weights: goalRelevance(1.0)*0.167 + emotionalIntensity(0.6)*0.25 + goal boost(0.1) = 0.417
      expect(memory.episodicMemories[0].importance).toBeGreaterThan(0.4);
    });

    it('should give survival boost to life-threatening events', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'survival:threat',
        summary: 'Almost died from hunger',
        timestamp: Date.now(),
        survivalRelevance: 1.0,
        emotionalIntensity: 0.9,
        emotionalValence: -0.9
      });

      // With normalized weights: survivalRelevance(1.0)*0.208 + emotionalIntensity(0.9)*0.25 + survival boost(0.1) = 0.533
      expect(memory.episodicMemories[0].importance).toBeGreaterThan(0.5);
    });

    it('should clamp final importance to [0, 1]', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test',
        timestamp: Date.now(),
        emotionalIntensity: 1.0,
        novelty: 1.0,
        goalRelevance: 1.0,
        socialSignificance: 1.0,
        survivalRelevance: 1.0
      });

      const importance = memory.episodicMemories[0].importance;
      expect(importance).toBeGreaterThanOrEqual(0);
      expect(importance).toBeLessThanOrEqual(1);
    });
  });

  // Criterion 8: Memory Retrieval for Decisions
  describe('memory retrieval', () => {
    it('should retrieve top N most relevant memories based on context', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      // Add multiple memories
      memory.formMemory({
        eventType: 'harvest',
        summary: 'Harvested wheat',
        timestamp: Date.now() - 1000,
        participants: ['Alice'],
        location: { x: 10, y: 20 }
      });

      memory.formMemory({
        eventType: 'conversation',
        summary: 'Talked with Alice about farming',
        timestamp: Date.now() - 500,
        participants: ['Alice'],
        location: { x: 10, y: 20 }
      });

      memory.formMemory({
        eventType: 'building',
        summary: 'Built fence',
        timestamp: Date.now() - 2000,
        participants: ['Bob'],
        location: { x: 50, y: 50 }
      });

      // Retrieve memories relevant to Alice and farming location
      const relevant = memory.retrieveRelevant({
        participants: ['Alice'],
        location: { x: 10, y: 20 },
        limit: 2
      });

      expect(relevant.length).toBe(2);
      expect(relevant[0].participants).toContain('Alice');
      expect(relevant[1].participants).toContain('Alice');
    });

    it('should score by recency (20% weight)', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      const oldMemory = memory.formMemory({
        eventType: 'test',
        summary: 'Old event',
        timestamp: Date.now() - 10000000,
        importance: 0.5
      });

      const recentMemory = memory.formMemory({
        eventType: 'test',
        summary: 'Recent event',
        timestamp: Date.now(),
        importance: 0.5
      });

      const relevant = memory.retrieveRelevant({ limit: 2 });

      // Recent should rank higher
      expect(relevant[0].summary).toBe('Recent event');
    });

    it('should score by importance (25% weight)', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Minor event',
        timestamp: Date.now(),
        importance: 0.2
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Major event',
        timestamp: Date.now(),
        importance: 0.9
      });

      const relevant = memory.retrieveRelevant({ limit: 1 });

      expect(relevant[0].summary).toBe('Major event');
    });

    it('should prioritize memories with same participants (20% weight)', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Event with Alice',
        timestamp: Date.now(),
        participants: ['Alice']
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Event with Bob',
        timestamp: Date.now(),
        participants: ['Bob']
      });

      const relevant = memory.retrieveRelevant({
        participants: ['Alice'],
        limit: 1
      });

      expect(relevant[0].summary).toBe('Event with Alice');
    });

    it('should prioritize memories at same location (10% weight)', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Event at farm',
        timestamp: Date.now(),
        location: { x: 10, y: 20 }
      });

      memory.formMemory({
        eventType: 'test',
        summary: 'Event at forest',
        timestamp: Date.now(),
        location: { x: 100, y: 200 }
      });

      const relevant = memory.retrieveRelevant({
        location: { x: 10, y: 20 },
        limit: 1
      });

      expect(relevant[0].summary).toBe('Event at farm');
    });

    it('should increment timesRecalled when memory retrieved', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      memory.formMemory({
        eventType: 'test',
        summary: 'Test memory',
        timestamp: Date.now()
      });

      expect(memory.episodicMemories[0].timesRecalled).toBe(0);

      memory.retrieveRelevant({ limit: 1 });
      expect(memory.episodicMemories[0].timesRecalled).toBe(1);

      memory.retrieveRelevant({ limit: 1 });
      expect(memory.episodicMemories[0].timesRecalled).toBe(2);
    });
  });

  // Error handling - per CLAUDE.md
  describe('error handling', () => {
    it('should throw when required eventType is missing', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      expect(() => {
        memory.formMemory({
          summary: 'Test',
          timestamp: Date.now()
        } as Parameters<typeof memory.formMemory>[0]);
      }).toThrow();
    });

    it('should throw when required summary is missing', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      expect(() => {
        memory.formMemory({
          eventType: 'test',
          timestamp: Date.now()
        } as Parameters<typeof memory.formMemory>[0]);
      }).toThrow();
    });

    it('should throw when required timestamp is missing', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      expect(() => {
        memory.formMemory({
          eventType: 'test',
          summary: 'Test'
        } as Parameters<typeof memory.formMemory>[0]);
      }).toThrow();
    });

    it('should NOT use fallback values for critical missing fields', () => {
      const memory = entity.addComponent(EpisodicMemoryComponent, {}) as EpisodicMemoryComponent;

      // Critical fields like eventType, summary, timestamp must be provided
      // Emotional values CAN default to 0 (neutral) - semantically valid

      // Should throw when missing critical field (eventType)
      expect(() => {
        memory.formMemory({
          summary: 'Test',
          timestamp: Date.now()
        } as Parameters<typeof memory.formMemory>[0]);
      }).toThrow(/eventType/);

      // Should NOT throw when emotionalIntensity missing (defaults to 0)
      expect(() => {
        memory.formMemory({
          eventType: 'test',
          summary: 'Test',
          timestamp: Date.now()
          // emotionalIntensity defaults to 0 - this is OK
        });
      }).not.toThrow();
    });
  });
});
