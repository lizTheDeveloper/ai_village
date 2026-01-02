/**
 * @vitest-environment node
 *
 * ConversationQuality Tests - Phase 2 of Deep Conversation System
 *
 * Tests for conversation quality metrics, depth analysis, topic detection,
 * and overall quality calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeDepth,
  extractTopicsFromMessages,
  findSharedInterests,
  calculateTopicOverlap,
  analyzeInformationExchange,
  analyzeEmotionalContent,
  calculateConversationQuality,
  describeQuality,
  describeDepth,
  type ConversationQuality,
} from '../conversation/ConversationQuality.js';
import type { ConversationMessage } from '../components/ConversationComponent.js';
import type { Interest } from '../components/InterestsComponent.js';

// Helper to create a conversation message
function msg(speakerId: string, message: string, tick: number = 0): ConversationMessage {
  return { speakerId, message, tick };
}

// Helper to create an interest
function interest(topic: string, intensity: number = 0.5): Interest {
  return {
    topic: topic as any,
    category: 'philosophy',
    intensity,
    source: 'innate',
    lastDiscussed: null,
    discussionHunger: 0.5,
    knownEnthusiasts: [],
  };
}

describe('ConversationQuality', () => {
  describe('analyzeDepth', () => {
    it('should return neutral depth for empty conversation', () => {
      const depth = analyzeDepth([]);
      expect(depth).toBe(0.5);
    });

    it('should detect shallow conversation patterns', () => {
      const messages = [
        msg('a', 'Hello!'),
        msg('b', 'Hi there!'),
        msg('a', 'Nice weather today.'),
        msg('b', 'Yes, good morning!'),
      ];
      const depth = analyzeDepth(messages);
      expect(depth).toBeLessThan(0.5);
    });

    it('should detect medium depth conversation patterns', () => {
      const messages = [
        msg('a', 'I think we should discuss the harvest.'),
        msg('b', 'I feel the same way. Have you noticed the weather patterns?'),
        msg('a', 'I wonder if it will affect the crops.'),
      ];
      const depth = analyzeDepth(messages);
      expect(depth).toBeGreaterThan(0.5);
    });

    it('should detect deep conversation patterns', () => {
      const messages = [
        msg('a', 'I believe in the power of the gods.'),
        msg('b', 'What do you think is the meaning of life?'),
        msg('a', 'I wonder about the afterlife and what happens when we die.'),
        msg('b', 'The truth is, we all search for purpose.'),
      ];
      const depth = analyzeDepth(messages);
      expect(depth).toBeGreaterThan(0.7);
    });

    it('should clamp depth to 0-1 range', () => {
      // Very deep conversation
      const deepMessages = Array(20).fill(null).map((_, i) =>
        msg('a', 'I believe in meaning and purpose and the soul.')
      );
      expect(analyzeDepth(deepMessages)).toBeLessThanOrEqual(1.0);

      // Very shallow conversation
      const shallowMessages = Array(20).fill(null).map((_, i) =>
        msg('a', 'Hello! Nice weather. Good morning. Hi!')
      );
      expect(analyzeDepth(shallowMessages)).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('extractTopicsFromMessages', () => {
    it('should extract no topics from empty conversation', () => {
      const topics = extractTopicsFromMessages([]);
      expect(topics).toHaveLength(0);
    });

    it('should extract philosophy topics', () => {
      const messages = [
        msg('a', 'Do you think about the afterlife?'),
        msg('b', 'I pray to the gods every night.'),
      ];
      const topics = extractTopicsFromMessages(messages);
      expect(topics).toContain('afterlife');
      expect(topics).toContain('the_gods');
    });

    it('should extract craft topics', () => {
      const messages = [
        msg('a', 'The harvest this year was excellent.'),
        msg('b', 'My woodworking project needs more lumber.'),
      ];
      const topics = extractTopicsFromMessages(messages);
      expect(topics).toContain('farming');
      expect(topics).toContain('woodworking');
    });

    it('should extract nature topics', () => {
      const messages = [
        msg('a', 'The weather is changing with the seasons.'),
        msg('b', 'I saw a beautiful deer in the forest.'),
      ];
      const topics = extractTopicsFromMessages(messages);
      expect(topics).toContain('weather');
      expect(topics).toContain('animals');
      expect(topics).toContain('trees_and_forests');
    });

    it('should extract social topics', () => {
      const messages = [
        msg('a', 'My family is doing well.'),
        msg('b', 'I heard some gossip about the neighbors.'),
      ];
      const topics = extractTopicsFromMessages(messages);
      expect(topics).toContain('family');
      expect(topics).toContain('village_gossip');
    });

    it('should not duplicate topics', () => {
      const messages = [
        msg('a', 'I think about death often.'),
        msg('b', 'Death is something we all face.'),
        msg('a', 'When I die, what happens?'),
      ];
      const topics = extractTopicsFromMessages(messages);
      const mortalityCount = topics.filter(t => t === 'mortality').length;
      expect(mortalityCount).toBe(1);
    });
  });

  describe('findSharedInterests', () => {
    it('should return empty array when no shared interests', () => {
      const interests1 = [interest('farming'), interest('cooking')];
      const interests2 = [interest('woodworking'), interest('hunting')];
      const shared = findSharedInterests(interests1, interests2);
      expect(shared).toHaveLength(0);
    });

    it('should find shared interests', () => {
      const interests1 = [interest('farming'), interest('afterlife'), interest('family')];
      const interests2 = [interest('afterlife'), interest('farming'), interest('cooking')];
      const shared = findSharedInterests(interests1, interests2);
      expect(shared).toContain('afterlife');
      expect(shared).toContain('farming');
      expect(shared).toHaveLength(2);
    });

    it('should handle empty interest arrays', () => {
      expect(findSharedInterests([], [])).toHaveLength(0);
      expect(findSharedInterests([interest('farming')], [])).toHaveLength(0);
      expect(findSharedInterests([], [interest('farming')])).toHaveLength(0);
    });
  });

  describe('calculateTopicOverlap', () => {
    it('should return 0 when no shared interests', () => {
      const overlap = calculateTopicOverlap([], ['farming', 'cooking'] as any);
      expect(overlap).toBe(0);
    });

    it('should return 0 when topics not discussed', () => {
      const sharedInterests = ['afterlife', 'farming'] as any;
      const topicsDiscussed = ['cooking', 'weather'] as any;
      const overlap = calculateTopicOverlap(sharedInterests, topicsDiscussed);
      expect(overlap).toBe(0);
    });

    it('should calculate partial overlap', () => {
      const sharedInterests = ['afterlife', 'farming', 'cooking'] as any;
      const topicsDiscussed = ['afterlife', 'weather'] as any;
      const overlap = calculateTopicOverlap(sharedInterests, topicsDiscussed);
      expect(overlap).toBeCloseTo(1 / 3, 5);
    });

    it('should return 1 when all shared interests are discussed', () => {
      const sharedInterests = ['afterlife', 'farming'] as any;
      const topicsDiscussed = ['afterlife', 'farming', 'cooking'] as any;
      const overlap = calculateTopicOverlap(sharedInterests, topicsDiscussed);
      expect(overlap).toBe(1);
    });
  });

  describe('analyzeInformationExchange', () => {
    it('should return 0 for empty conversation', () => {
      expect(analyzeInformationExchange([])).toBe(0);
    });

    it('should detect information sharing patterns', () => {
      const messages = [
        msg('a', 'Did you know the harvest was early this year?'),
        msg('b', 'I heard that the river flooded last month.'),
        msg('a', 'Let me tell you about the new farming technique.'),
      ];
      const score = analyzeInformationExchange(messages);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should normalize to max of 1', () => {
      const messages = Array(10).fill(null).map((_, i) =>
        msg('a', 'Did you know that I discovered something? I learned a lot. I heard that they say...')
      );
      const score = analyzeInformationExchange(messages);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeEmotionalContent', () => {
    it('should return 0 for empty conversation', () => {
      expect(analyzeEmotionalContent([])).toBe(0);
    });

    it('should detect positive emotions', () => {
      const messages = [
        msg('a', 'I feel so happy today!'),
        msg('b', 'This is wonderful news!'),
      ];
      const score = analyzeEmotionalContent(messages);
      expect(score).toBeGreaterThan(0);
    });

    it('should detect negative emotions', () => {
      const messages = [
        msg('a', 'I feel sad about the news.'),
        msg('b', 'I am worried and anxious.'),
      ];
      const score = analyzeEmotionalContent(messages);
      expect(score).toBeGreaterThan(0);
    });

    it('should detect connection phrases', () => {
      const messages = [
        msg('a', 'I understand exactly how you feel.'),
        msg('b', 'I feel the same way too.'),
        msg('a', 'Yes, I agree with you.'),
      ];
      const score = analyzeEmotionalContent(messages);
      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe('calculateConversationQuality', () => {
    it('should return zero quality for empty conversation', () => {
      const quality = calculateConversationQuality([], [], [], 0);
      expect(quality.overallQuality).toBe(0);
      expect(quality.depth).toBe(0);
      expect(quality.topicsDiscussed).toHaveLength(0);
    });

    it('should calculate quality for shallow conversation', () => {
      const messages = [
        msg('a', 'Hello!', 0),
        msg('b', 'Hi, nice weather!', 10),
        msg('a', 'Yes, good day!', 20),
      ];
      const quality = calculateConversationQuality(messages, [], [], 20);
      expect(quality.depth).toBeLessThan(0.5);
      expect(quality.overallQuality).toBeLessThan(0.5);
    });

    it('should calculate higher quality for deep conversation with shared interests', () => {
      const messages = [
        msg('a', 'I believe in the afterlife.', 0),
        msg('b', 'What do you think happens when we die?', 10),
        msg('a', 'I understand your perspective. The truth is complex.', 20),
        msg('b', 'I feel the same way. I wonder about the gods.', 30),
        msg('a', 'Did you know the ancient texts speak of this?', 40),
        msg('b', 'I heard about that. Let me tell you what I learned.', 50),
      ];
      const interests1 = [interest('afterlife', 0.9), interest('the_gods', 0.7)];
      const interests2 = [interest('afterlife', 0.8), interest('mortality', 0.6)];

      const quality = calculateConversationQuality(messages, interests1, interests2, 50);
      expect(quality.depth).toBeGreaterThan(0.5);
      expect(quality.topicsDiscussed).toContain('afterlife');
      expect(quality.overallQuality).toBeGreaterThan(0.4);
    });

    it('should have topic resonance when discussing shared interests', () => {
      const messages = [
        msg('a', 'Let\'s talk about farming and crops.', 0),
        msg('b', 'Yes, I love discussing the harvest.', 10),
      ];
      const interests1 = [interest('farming', 0.9)];
      const interests2 = [interest('farming', 0.8)];

      const quality = calculateConversationQuality(messages, interests1, interests2, 10);
      expect(quality.topicResonance).toBeGreaterThan(0);
    });

    it('should weight metrics correctly for overall quality', () => {
      // Deep philosophical conversation with shared interests, information exchange, and emotion
      const messages = [
        msg('a', 'I believe we should understand the meaning of life.', 0),
        msg('b', 'I feel happy when discussing the soul and purpose.', 10),
        msg('a', 'Did you know the gods created us for a reason?', 20),
        msg('b', 'I understand, I agree with your wisdom.', 30),
        msg('a', 'The truth about mortality is something I learned.', 40),
        msg('b', 'I feel the same way about death and what happens after.', 50),
        msg('a', 'I heard that the afterlife is beautiful.', 60),
        msg('b', 'Yes, I believe that too.', 70),
        msg('a', 'Let me tell you what I discovered about fate.', 80),
        msg('b', 'I wonder about destiny myself.', 90),
      ];
      const interests1 = [
        interest('afterlife', 0.9),
        interest('mortality', 0.8),
        interest('meaning_of_life', 0.7),
      ];
      const interests2 = [
        interest('afterlife', 0.8),
        interest('the_gods', 0.7),
        interest('meaning_of_life', 0.9),
      ];

      const quality = calculateConversationQuality(messages, interests1, interests2, 90);

      // Should have high depth (deep philosophical content)
      expect(quality.depth).toBeGreaterThan(0.5);

      // Should have topic resonance (shared interests discussed)
      expect(quality.topicResonance).toBeGreaterThan(0);

      // Should have information exchange
      expect(quality.informationExchange).toBeGreaterThan(0);

      // Should have emotional connection
      expect(quality.emotionalConnection).toBeGreaterThan(0);

      // Duration factor should be 1 (10 messages)
      expect(quality.durationFactor).toBe(1);

      // Overall quality should be high
      expect(quality.overallQuality).toBeGreaterThan(0.5);
    });
  });

  describe('describeQuality', () => {
    it('should describe superficial quality', () => {
      const quality: ConversationQuality = {
        depth: 0.1,
        topicResonance: 0,
        informationExchange: 0,
        emotionalConnection: 0,
        durationFactor: 0.1,
        topicsDiscussed: [],
        overallQuality: 0.1,
      };
      expect(describeQuality(quality)).toBe('superficial');
    });

    it('should describe casual quality', () => {
      const quality: ConversationQuality = {
        depth: 0.3,
        topicResonance: 0.2,
        informationExchange: 0.2,
        emotionalConnection: 0.1,
        durationFactor: 0.3,
        topicsDiscussed: [],
        overallQuality: 0.3,
      };
      expect(describeQuality(quality)).toBe('casual');
    });

    it('should describe meaningful quality', () => {
      const quality: ConversationQuality = {
        depth: 0.5,
        topicResonance: 0.4,
        informationExchange: 0.4,
        emotionalConnection: 0.3,
        durationFactor: 0.5,
        topicsDiscussed: [],
        overallQuality: 0.5,
      };
      expect(describeQuality(quality)).toBe('meaningful');
    });

    it('should describe deep quality', () => {
      const quality: ConversationQuality = {
        depth: 0.7,
        topicResonance: 0.6,
        informationExchange: 0.6,
        emotionalConnection: 0.5,
        durationFactor: 0.8,
        topicsDiscussed: [],
        overallQuality: 0.7,
      };
      expect(describeQuality(quality)).toBe('deep');
    });

    it('should describe profound quality', () => {
      const quality: ConversationQuality = {
        depth: 0.9,
        topicResonance: 0.8,
        informationExchange: 0.8,
        emotionalConnection: 0.7,
        durationFactor: 1,
        topicsDiscussed: [],
        overallQuality: 0.85,
      };
      expect(describeQuality(quality)).toBe('profound');
    });
  });

  describe('describeDepth', () => {
    it('should describe small talk', () => {
      expect(describeDepth(0.2)).toBe('small talk');
    });

    it('should describe light discussion', () => {
      expect(describeDepth(0.4)).toBe('light discussion');
    });

    it('should describe thoughtful exchange', () => {
      expect(describeDepth(0.6)).toBe('thoughtful exchange');
    });

    it('should describe philosophical discourse', () => {
      expect(describeDepth(0.8)).toBe('philosophical discourse');
    });
  });
});

describe('NeedsComponent Social Sub-Needs', () => {
  // Tests for the new social sub-needs will go here
  // These are integration tests that require the full NeedsComponent

  it('should have socialContact, socialDepth, socialBelonging properties', async () => {
    const { NeedsComponent } = await import('../components/NeedsComponent.js');
    const needs = new NeedsComponent();

    expect(needs.socialContact).toBe(0.5);
    expect(needs.socialDepth).toBe(0.5);
    expect(needs.socialBelonging).toBe(0.5);
    expect(needs.social).toBe(0.5);
  });

  it('should calculate composite social from sub-needs', async () => {
    const { NeedsComponent, calculateSocialNeed } = await import('../components/NeedsComponent.js');
    const needs = new NeedsComponent({
      socialContact: 0.9,
      socialDepth: 0.6,
      socialBelonging: 0.3,
    });

    const composite = calculateSocialNeed(needs);
    expect(composite).toBeCloseTo((0.9 + 0.6 + 0.3) / 3, 5);
  });

  it('should update composite social correctly', async () => {
    const { NeedsComponent, updateCompositeSocial } = await import('../components/NeedsComponent.js');
    const needs = new NeedsComponent();

    needs.socialContact = 0.8;
    needs.socialDepth = 0.4;
    needs.socialBelonging = 0.6;

    updateCompositeSocial(needs);

    expect(needs.social).toBeCloseTo((0.8 + 0.4 + 0.6) / 3, 5);
  });

  it('should detect when agent craves depth', async () => {
    const { NeedsComponent, cravesDepth } = await import('../components/NeedsComponent.js');

    const needsDepth = new NeedsComponent({ socialDepth: 0.2 });
    expect(cravesDepth(needsDepth)).toBe(true);

    const satisfied = new NeedsComponent({ socialDepth: 0.8 });
    expect(cravesDepth(satisfied)).toBe(false);
  });

  it('should detect when agent feels isolated', async () => {
    const { NeedsComponent, feelsIsolated } = await import('../components/NeedsComponent.js');

    const isolated = new NeedsComponent({ socialBelonging: 0.2 });
    expect(feelsIsolated(isolated)).toBe(true);

    const belonging = new NeedsComponent({ socialBelonging: 0.7 });
    expect(feelsIsolated(belonging)).toBe(false);
  });

  it('should migrate legacy data with social sub-needs', async () => {
    const { migrateNeedsComponent } = await import('../components/NeedsComponent.js');

    // Legacy data without sub-needs
    const legacyData = {
      hunger: 0.8,
      energy: 0.7,
      health: 0.9,
      social: 0.6,
    };

    const needs = migrateNeedsComponent(legacyData);

    // Should initialize sub-needs from composite social
    expect(needs.socialContact).toBe(0.6);
    expect(needs.socialDepth).toBe(0.6);
    expect(needs.socialBelonging).toBe(0.6);
  });
});
