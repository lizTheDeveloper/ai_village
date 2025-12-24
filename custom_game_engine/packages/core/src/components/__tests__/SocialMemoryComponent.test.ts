import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World';
import { SocialMemoryComponent } from '../SocialMemoryComponent';

describe('SocialMemoryComponent', () => {
  let world: World;
  let entity: any;

  beforeEach(() => {
    world = new World();
    entity = world.createEntity();
  });

  // Criterion 12: Social Memory Updates
  describe('social memory updates', () => {
    it('should update social memory when interacting with another agent', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'alice-123',
        interactionType: 'conversation',
        sentiment: 0.5,
        timestamp: Date.now()
      });

      expect(memory.socialMemories.size).toBe(1);
      expect(memory.socialMemories.has('alice-123')).toBe(true);
    });

    it('should track overall sentiment toward agent', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'bob-456',
        interactionType: 'trade',
        sentiment: 0.7,
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('bob-456');
      expect(socialMem.overallSentiment).toBeGreaterThan(0);
      expect(socialMem.overallSentiment).toBeLessThanOrEqual(1);
    });

    it('should update sentiment based on interactions', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      // Positive interaction
      memory.recordInteraction({
        agentId: 'charlie-789',
        interactionType: 'help',
        sentiment: 0.8,
        timestamp: Date.now()
      });

      const initial = memory.socialMemories.get('charlie-789').overallSentiment;

      // Another positive interaction
      memory.recordInteraction({
        agentId: 'charlie-789',
        interactionType: 'gift',
        sentiment: 0.9,
        timestamp: Date.now()
      });

      const updated = memory.socialMemories.get('charlie-789').overallSentiment;
      expect(updated).toBeGreaterThan(initial);
    });

    it('should track trust separately from sentiment', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'david-012',
        interactionType: 'promise_kept',
        sentiment: 0.6,
        trustDelta: 0.2,
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('david-012');
      expect(socialMem.trust).toBeDefined();
      expect(socialMem.trust).toBeGreaterThan(0);
    });

    it('should decrease trust on betrayal', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'eve-345',
        interactionType: 'trade',
        sentiment: 0.7,
        trustDelta: 0.3,
        timestamp: Date.now()
      });

      const initial = memory.socialMemories.get('eve-345').trust;

      memory.recordInteraction({
        agentId: 'eve-345',
        interactionType: 'betrayal',
        sentiment: -0.9,
        trustDelta: -0.5,
        timestamp: Date.now()
      });

      const updated = memory.socialMemories.get('eve-345').trust;
      expect(updated).toBeLessThan(initial);
    });

    it('should add impression with timestamp', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      const timestamp = Date.now();
      memory.recordInteraction({
        agentId: 'frank-678',
        interactionType: 'first_meeting',
        sentiment: 0.5,
        impression: 'Seems quiet and reserved',
        timestamp
      });

      const socialMem = memory.socialMemories.get('frank-678');
      expect(socialMem.impressions).toHaveLength(1);
      expect(socialMem.impressions[0].text).toBe('Seems quiet and reserved');
      expect(socialMem.impressions[0].timestamp).toBe(timestamp);
    });

    it('should link significant memories to social memory', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'grace-901',
        interactionType: 'conflict',
        sentiment: -0.7,
        significantMemories: ['episodic-fight-1'],
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('grace-901');
      expect(socialMem.significantMemories).toContain('episodic-fight-1');
    });

    it('should track multiple impressions over time', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'henry-234',
        interactionType: 'conversation',
        sentiment: 0.5,
        impression: 'First impression: friendly',
        timestamp: Date.now() - 10000
      });

      memory.recordInteraction({
        agentId: 'henry-234',
        interactionType: 'trade',
        sentiment: 0.7,
        impression: 'Good trader, fair prices',
        timestamp: Date.now() - 5000
      });

      memory.recordInteraction({
        agentId: 'henry-234',
        interactionType: 'help',
        sentiment: 0.9,
        impression: 'Really helped me out, generous',
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('henry-234');
      expect(socialMem.impressions).toHaveLength(3);
    });
  });

  describe('relationship tracking', () => {
    it('should track relationship type (friend, rival, stranger, etc)', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'iris-567',
        interactionType: 'repeated_positive',
        sentiment: 0.8,
        timestamp: Date.now()
      });

      // After enough positive interactions, should classify as friend
      memory.updateRelationshipType('iris-567', 'friend');

      const socialMem = memory.socialMemories.get('iris-567');
      expect(socialMem.relationshipType).toBe('friend');
    });

    it('should track interaction count', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'jack-890',
        interactionType: 'conversation',
        sentiment: 0.5,
        timestamp: Date.now()
      });

      expect(memory.socialMemories.get('jack-890').interactionCount).toBe(1);

      memory.recordInteraction({
        agentId: 'jack-890',
        interactionType: 'trade',
        sentiment: 0.6,
        timestamp: Date.now()
      });

      expect(memory.socialMemories.get('jack-890').interactionCount).toBe(2);
    });

    it('should track last interaction time', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      const timestamp1 = Date.now() - 10000;
      memory.recordInteraction({
        agentId: 'kate-123',
        interactionType: 'conversation',
        sentiment: 0.5,
        timestamp: timestamp1
      });

      expect(memory.socialMemories.get('kate-123').lastInteraction).toBe(timestamp1);

      const timestamp2 = Date.now();
      memory.recordInteraction({
        agentId: 'kate-123',
        interactionType: 'help',
        sentiment: 0.8,
        timestamp: timestamp2
      });

      expect(memory.socialMemories.get('kate-123').lastInteraction).toBe(timestamp2);
    });

    it('should track first meeting', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      const firstMeeting = Date.now();
      memory.recordInteraction({
        agentId: 'leo-456',
        interactionType: 'first_meeting',
        sentiment: 0.5,
        timestamp: firstMeeting
      });

      const socialMem = memory.socialMemories.get('leo-456');
      expect(socialMem.firstMeeting).toBe(firstMeeting);

      // Subsequent interactions shouldn't change first meeting
      memory.recordInteraction({
        agentId: 'leo-456',
        interactionType: 'conversation',
        sentiment: 0.6,
        timestamp: Date.now()
      });

      expect(socialMem.firstMeeting).toBe(firstMeeting);
    });
  });

  describe('emotion and sentiment', () => {
    it('should track emotional valence of interactions', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.recordInteraction({
        agentId: 'maya-789',
        interactionType: 'conflict',
        sentiment: -0.8,
        emotionalValence: -0.9,
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('maya-789');
      expect(socialMem.lastEmotionalValence).toBeLessThan(0);
    });

    it('should differentiate sentiment (long-term) from emotion (immediate)', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      // First interaction: positive
      memory.recordInteraction({
        agentId: 'noah-012',
        interactionType: 'help',
        sentiment: 0.8,
        emotionalValence: 0.9,
        timestamp: Date.now() - 10000
      });

      // Recent interaction: negative emotion, but sentiment should average out
      memory.recordInteraction({
        agentId: 'noah-012',
        interactionType: 'minor_disagreement',
        sentiment: 0.6, // Still overall positive
        emotionalValence: -0.3, // But this specific interaction felt bad
        timestamp: Date.now()
      });

      const socialMem = memory.socialMemories.get('noah-012');
      expect(socialMem.overallSentiment).toBeGreaterThan(0);
      expect(socialMem.lastEmotionalValence).toBeLessThan(0);
    });
  });

  describe('knowledge about others', () => {
    it('should track known facts about other agents', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.learnAboutAgent({
        agentId: 'olivia-345',
        fact: 'Loves gardening',
        confidence: 0.9,
        source: 'conversation'
      });

      const socialMem = memory.socialMemories.get('olivia-345');
      expect(socialMem.knownFacts).toHaveLength(1);
      expect(socialMem.knownFacts[0].fact).toBe('Loves gardening');
    });

    it('should track confidence in knowledge about others', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.learnAboutAgent({
        agentId: 'peter-678',
        fact: 'Works as a blacksmith',
        confidence: 1.0,
        source: 'observation'
      });

      const socialMem = memory.socialMemories.get('peter-678');
      expect(socialMem.knownFacts[0].confidence).toBe(1.0);
    });

    it('should track where knowledge came from (source)', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      memory.learnAboutAgent({
        agentId: 'quinn-901',
        fact: 'Dislikes Bob',
        confidence: 0.6,
        source: 'gossip from Alice'
      });

      const socialMem = memory.socialMemories.get('quinn-901');
      expect(socialMem.knownFacts[0].source).toBe('gossip from Alice');
    });
  });

  // Error handling - per CLAUDE.md
  describe('error handling', () => {
    it('should throw when required agentId is missing', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      expect(() => {
        memory.recordInteraction({
          interactionType: 'conversation',
          sentiment: 0.5,
          timestamp: Date.now()
        } as any);
      }).toThrow();
    });

    it('should throw when required interactionType is missing', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      expect(() => {
        memory.recordInteraction({
          agentId: 'test-123',
          sentiment: 0.5,
          timestamp: Date.now()
        } as any);
      }).toThrow();
    });

    it('should throw when required timestamp is missing', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      expect(() => {
        memory.recordInteraction({
          agentId: 'test-123',
          interactionType: 'conversation',
          sentiment: 0.5
        } as any);
      }).toThrow();
    });

    it('should throw when sentiment is out of range', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      expect(() => {
        memory.recordInteraction({
          agentId: 'test-123',
          interactionType: 'conversation',
          sentiment: 2.5,
          timestamp: Date.now()
        });
      }).toThrow();
    });

    it('should NOT use fallback for missing sentiment', () => {
      const memory = entity.addComponent(SocialMemoryComponent, {});

      expect(() => {
        memory.recordInteraction({
          agentId: 'test-123',
          interactionType: 'conversation',
          timestamp: Date.now()
        } as any);
      }).toThrow();
    });
  });
});
