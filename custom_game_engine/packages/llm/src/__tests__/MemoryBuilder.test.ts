import { describe, it, expect } from 'vitest';
import { MemoryBuilder } from '../prompt-builders/MemoryBuilder';
import type { EpisodicMemory, EpisodicMemoryComponent } from '@ai-village/core';

describe('MemoryBuilder', () => {
  const builder = new MemoryBuilder();

  // Helper to create a mock memory
  function createMockMemory(overrides: Partial<EpisodicMemory>): EpisodicMemory {
    return {
      id: `mem-${Math.random().toString(36).slice(2)}`,
      eventType: 'test:event',
      summary: 'Test memory',
      timestamp: Date.now(),
      emotionalValence: 0,
      emotionalIntensity: 0,
      surprise: 0,
      importance: 0.5,
      clarity: 1.0,
      consolidated: false,
      markedForConsolidation: false,
      timesRecalled: 0,
      ...overrides,
    };
  }

  // Helper to create mock episodic memory component
  function createMockEpisodicMemory(memories: EpisodicMemory[]): EpisodicMemoryComponent {
    return {
      type: 'episodic_memory',
      episodicMemories: memories,
    } as unknown as EpisodicMemoryComponent;
  }

  describe('deduplication', () => {
    it('should not show duplicate memories with identical summaries', () => {
      const memories = [
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 1000,
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 2000,
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 3000,
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 4000,
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 5000,
          survivalRelevance: 0.8,
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      // Should only show the memory ONCE, not 5 times
      const hungerMatches = result.match(/My hunger became critically low/g);
      expect(hungerMatches?.length || 0).toBe(1);
    });

    it('should show diverse memories from different categories', () => {
      const memories = [
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'conversation:utterance',
          summary: 'I said: Hello friend!',
          dialogueText: 'Hello friend!',
          socialSignificance: 0.7,
        }),
        createMockMemory({
          eventType: 'construction:started',
          summary: 'Started building a campfire',
          importance: 0.6,
        }),
        createMockMemory({
          eventType: 'agent:dreamed',
          summary: 'Had a strange dream about the forest',
          emotionalIntensity: 0.5,
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      // Should show memories from multiple categories
      expect(result).toContain('hunger');
      expect(result).toContain('Hello friend');
      expect(result).toContain('campfire');
      expect(result).toContain('dream');
    });

    it('should limit memories per category to prevent flooding', () => {
      const memories = [
        // 5 survival events
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My energy became critically low',
          survivalRelevance: 0.7,
        }),
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My thirst became critically low',
          survivalRelevance: 0.7,
        }),
        createMockMemory({
          eventType: 'agent:starved',
          summary: "I'm starving and exhausted",
          survivalRelevance: 1.0,
        }),
        createMockMemory({
          eventType: 'agent:collapsed',
          summary: 'I collapsed from exhaustion',
          survivalRelevance: 1.0,
        }),
        // 1 social event (should still appear)
        createMockMemory({
          eventType: 'conversation:utterance',
          summary: 'Alice said: "How are you?"',
          dialogueText: 'How are you?',
          socialSignificance: 0.6,
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      // Should include the social event despite survival events flooding
      expect(result).toContain('How are you');

      // Should limit survival category - not all 5 survival events should appear
      // Count survival-related content
      const survivalMatches = result.match(/(hunger|energy|thirst|starving|collapsed)/gi);
      expect((survivalMatches?.length || 0)).toBeLessThanOrEqual(3);
    });
  });

  describe('priority scoring', () => {
    it('should prioritize social interactions over repetitive survival events', () => {
      const memories = [
        createMockMemory({
          eventType: 'need:critical',
          summary: 'My hunger became critically low',
          timestamp: Date.now() - 1000,
          survivalRelevance: 0.8,
        }),
        createMockMemory({
          eventType: 'conversation:utterance',
          summary: 'Bob said something important',
          dialogueText: 'Let me tell you a secret',
          timestamp: Date.now() - 2000,
          socialSignificance: 0.7,
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      // Both should appear
      expect(result).toContain('hunger');
      expect(result).toContain('secret');

      // Social interaction should appear first (numbered 1.)
      const socialIndex = result.indexOf('secret');
      const hungerIndex = result.indexOf('hunger');
      expect(socialIndex).toBeLessThan(hungerIndex);
    });

    it('should give recent memories a boost', () => {
      const now = Date.now();
      const memories = [
        createMockMemory({
          eventType: 'resource:gathered',
          summary: 'Gathered 5 wood (old)',
          timestamp: now - 25 * 60 * 60 * 1000, // 25 hours ago
          importance: 0.3,
        }),
        createMockMemory({
          eventType: 'resource:gathered',
          summary: 'Gathered 3 berries (recent)',
          timestamp: now - 30 * 60 * 1000, // 30 minutes ago
          importance: 0.3,
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      // Recent memory should appear first if both appear
      if (result.includes('wood') && result.includes('berries')) {
        const recentIndex = result.indexOf('berries');
        const oldIndex = result.indexOf('wood');
        expect(recentIndex).toBeLessThan(oldIndex);
      }
    });
  });

  describe('empty and edge cases', () => {
    it('should handle empty memories gracefully', () => {
      const episodicMemory = createMockEpisodicMemory([]);
      const result = builder.buildEpisodicMemories(episodicMemory);

      expect(result).toContain('no significant recent memories');
    });

    it('should handle undefined episodic memory', () => {
      const result = builder.buildEpisodicMemories(undefined);

      expect(result).toContain('no significant recent memories');
    });

    it('should handle memories with missing optional fields', () => {
      const memories = [
        createMockMemory({
          eventType: 'test:event',
          summary: 'A basic memory',
          // No dialogueText, participants, etc.
        }),
      ];

      const episodicMemory = createMockEpisodicMemory(memories);
      const result = builder.buildEpisodicMemories(episodicMemory);

      expect(result).toContain('basic memory');
    });
  });
});
