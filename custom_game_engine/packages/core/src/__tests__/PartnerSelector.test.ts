/**
 * Tests for PartnerSelector module.
 *
 * Deep Conversation System - Phase 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scorePartners,
  selectPartner,
  calculateSharedInterestScore,
  calculateComplementaryScore,
  calculateAgeCompatibility,
  describePartnerSelection,
  type PartnerSelectionContext,
  type PartnerScore,
} from '../conversation/PartnerSelector.js';
import type { InterestsComponent, Interest } from '../components/InterestsComponent.js';
import type { RelationshipComponent, Relationship } from '../components/RelationshipComponent.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';
import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// Mock entity factory
function createMockEntity(
  id: string,
  options: {
    position?: { x: number; y: number };
    interests?: Interest[];
    relationships?: Map<string, Relationship>;
    isInConversation?: boolean;
    ageCategory?: AgeCategory;
    depthHunger?: number;
  } = {}
): Entity {
  const components = new Map<string, unknown>();

  if (options.position) {
    components.set(CT.Position, options.position);
  }

  if (options.interests) {
    const interestsComponent: Partial<InterestsComponent> = {
      interests: options.interests,
      depthHunger: options.depthHunger ?? 0.5,
    };
    components.set(CT.Interests, interestsComponent);
  }

  if (options.relationships) {
    const relationshipComponent: Partial<RelationshipComponent> = {
      relationships: options.relationships,
    };
    components.set(CT.Relationship, relationshipComponent);
  }

  const conversationComponent: Partial<ConversationComponent> = {
    isActive: options.isInConversation ?? false,
  };
  components.set(CT.Conversation, conversationComponent);

  if (options.ageCategory) {
    const agentComponent: Partial<AgentComponent> = {
      ageCategory: options.ageCategory,
    };
    components.set(CT.Agent, agentComponent);
  }

  return {
    id,
    getComponent: <T>(type: string): T | null => {
      return (components.get(type) as T) ?? null;
    },
    hasComponent: (type: string): boolean => components.has(type),
  } as unknown as Entity;
}

// Helper to create an interest
function interest(
  topic: string,
  intensity: number = 0.5,
  discussionHunger: number = 0.5,
  source: 'innate' | 'learned' | 'question' = 'innate',
  knownEnthusiasts: string[] = []
): Interest {
  return {
    topic: topic as Interest['topic'],
    intensity,
    discussionHunger,
    source,
    knownEnthusiasts,
    lastDiscussed: 0,
    timesDiscussed: 0,
  };
}

// Helper to create a relationship
function relationship(
  targetId: string,
  affinity: number = 0,
  familiarity: number = 0
): Relationship {
  return {
    targetId,
    affinity,
    familiarity,
    type: 'acquaintance',
    trust: 0,
    sharedExperiences: [],
    lastInteraction: 0,
  };
}

// Mock world
const mockWorld: World = {
  query: () => ({
    with: () => ({
      with: () => ({
        with: () => ({
          executeEntities: () => [],
        }),
      }),
    }),
  }),
  getEntity: () => null,
  tick: 0,
} as unknown as World;

describe('PartnerSelector', () => {
  describe('calculateSharedInterestScore', () => {
    it('should return 0 when no shared interests', () => {
      const interests1: Partial<InterestsComponent> = {
        interests: [
          interest('farming', 0.8),
          interest('cooking', 0.6),
        ],
      };
      const interests2: Partial<InterestsComponent> = {
        interests: [
          interest('smithing', 0.7),
          interest('mining', 0.5),
        ],
      };

      const score = calculateSharedInterestScore(
        interests1 as InterestsComponent,
        interests2 as InterestsComponent
      );
      expect(score).toBe(0);
    });

    it('should return high score when many shared interests', () => {
      const interests1: Partial<InterestsComponent> = {
        interests: [
          interest('farming', 0.8),
          interest('cooking', 0.6),
          interest('philosophy', 0.4),
        ],
      };
      const interests2: Partial<InterestsComponent> = {
        interests: [
          interest('farming', 0.9),
          interest('cooking', 0.7),
          interest('philosophy', 0.5),
        ],
      };

      const score = calculateSharedInterestScore(
        interests1 as InterestsComponent,
        interests2 as InterestsComponent
      );
      expect(score).toBeGreaterThan(0.7);
    });

    it('should weight by intensity', () => {
      // Both share farming, but with different intensities
      const interests1: Partial<InterestsComponent> = {
        interests: [interest('farming', 0.9)],
      };
      const highIntensity: Partial<InterestsComponent> = {
        interests: [interest('farming', 0.9)],
      };
      const lowIntensity: Partial<InterestsComponent> = {
        interests: [interest('farming', 0.1)],
      };

      const highScore = calculateSharedInterestScore(
        interests1 as InterestsComponent,
        highIntensity as InterestsComponent
      );
      const lowScore = calculateSharedInterestScore(
        interests1 as InterestsComponent,
        lowIntensity as InterestsComponent
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should handle empty interests', () => {
      const empty: Partial<InterestsComponent> = { interests: [] };
      const nonEmpty: Partial<InterestsComponent> = {
        interests: [interest('farming', 0.8)],
      };

      const score1 = calculateSharedInterestScore(
        empty as InterestsComponent,
        nonEmpty as InterestsComponent
      );
      const score2 = calculateSharedInterestScore(
        nonEmpty as InterestsComponent,
        empty as InterestsComponent
      );

      expect(score1).toBe(0);
      expect(score2).toBe(0);
    });
  });

  describe('calculateComplementaryScore', () => {
    it('should return high score when partner knows what seeker wants', () => {
      const seekerInterests: Partial<InterestsComponent> = {
        interests: [
          interest('afterlife', 0.5, 0.9, 'question'), // High hunger question
        ],
      };
      const partnerInterests: Partial<InterestsComponent> = {
        interests: [
          interest('afterlife', 0.9, 0.2), // High intensity = knowledge
        ],
      };

      const score = calculateComplementaryScore(
        seekerInterests as InterestsComponent,
        partnerInterests as InterestsComponent
      );
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return 0 when no complementary knowledge', () => {
      const seekerInterests: Partial<InterestsComponent> = {
        interests: [
          interest('afterlife', 0.5, 0.9, 'question'),
        ],
      };
      const partnerInterests: Partial<InterestsComponent> = {
        interests: [
          interest('farming', 0.9, 0.2), // Different topic
        ],
      };

      const score = calculateComplementaryScore(
        seekerInterests as InterestsComponent,
        partnerInterests as InterestsComponent
      );
      expect(score).toBe(0);
    });

    it('should consider discussion hunger', () => {
      const highHunger: Partial<InterestsComponent> = {
        interests: [interest('philosophy', 0.5, 0.9, 'question')],
      };
      const lowHunger: Partial<InterestsComponent> = {
        interests: [interest('philosophy', 0.5, 0.2, 'question')],
      };
      const partner: Partial<InterestsComponent> = {
        interests: [interest('philosophy', 0.9, 0.2)],
      };

      const highScore = calculateComplementaryScore(
        highHunger as InterestsComponent,
        partner as InterestsComponent
      );
      const lowScore = calculateComplementaryScore(
        lowHunger as InterestsComponent,
        partner as InterestsComponent
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('calculateAgeCompatibility', () => {
    it('should prefer adults for children with questions', () => {
      const childInterests: Partial<InterestsComponent> = {
        interests: [interest('the_gods', 0.5, 0.8, 'question')],
      };

      const adultScore = calculateAgeCompatibility(
        'child',
        'adult',
        childInterests as InterestsComponent
      );
      const childScore = calculateAgeCompatibility(
        'child',
        'child',
        childInterests as InterestsComponent
      );

      expect(adultScore).toBeGreaterThan(childScore);
    });

    it('should prefer elders for children with questions', () => {
      const childInterests: Partial<InterestsComponent> = {
        interests: [interest('mortality', 0.5, 0.8, 'question')],
      };

      const elderScore = calculateAgeCompatibility(
        'child',
        'elder',
        childInterests as InterestsComponent
      );
      expect(elderScore).toBe(0.9);
    });

    it('should prefer peers for teens', () => {
      const teenPeerScore = calculateAgeCompatibility('teen', 'teen');
      const teenAdultScore = calculateAgeCompatibility('teen', 'adult');

      expect(teenPeerScore).toBeGreaterThan(teenAdultScore);
    });

    it('should prefer adult peers for adults', () => {
      const adultPeerScore = calculateAgeCompatibility('adult', 'adult');
      const adultChildScore = calculateAgeCompatibility('adult', 'child');

      expect(adultPeerScore).toBeGreaterThan(adultChildScore);
    });

    it('should make elders happy to talk to anyone', () => {
      const elderChildScore = calculateAgeCompatibility('elder', 'child');
      const elderAdultScore = calculateAgeCompatibility('elder', 'adult');
      const elderElderScore = calculateAgeCompatibility('elder', 'elder');

      expect(elderChildScore).toBeGreaterThan(0.5);
      expect(elderAdultScore).toBeGreaterThan(0.5);
      expect(elderElderScore).toBeGreaterThan(0.5);
    });

    it('should prefer teaching children for elders', () => {
      const elderChildScore = calculateAgeCompatibility('elder', 'child');
      const elderAdultScore = calculateAgeCompatibility('elder', 'adult');

      expect(elderChildScore).toBeGreaterThan(elderAdultScore);
    });
  });

  describe('scorePartners', () => {
    it('should skip entities already in conversation', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });
      const inConversation = createMockEntity('busy', {
        position: { x: 1, y: 1 },
        isInConversation: true,
      });
      const available = createMockEntity('available', {
        position: { x: 2, y: 2 },
        isInConversation: false,
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [inConversation, available],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      expect(scores.length).toBe(1);
      expect(scores[0]!.entityId).toBe('available');
    });

    it('should skip self', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [seeker],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      expect(scores.length).toBe(0);
    });

    it('should score proximity higher for nearby entities', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });
      const near = createMockEntity('near', {
        position: { x: 1, y: 1 },
      });
      const far = createMockEntity('far', {
        position: { x: 15, y: 15 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [near, far],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const nearScore = scores.find(s => s.entityId === 'near');
      const farScore = scores.find(s => s.entityId === 'far');

      expect(nearScore!.score).toBeGreaterThan(farScore!.score);
    });

    it('should add bonus for shared interests', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
        interests: [interest('farming', 0.9), interest('cooking', 0.8)],
      });
      const sharedInterests = createMockEntity('shared', {
        position: { x: 5, y: 5 },
        interests: [interest('farming', 0.8), interest('cooking', 0.7)],
      });
      const noSharedInterests = createMockEntity('different', {
        position: { x: 5, y: 5 },
        interests: [interest('smithing', 0.8), interest('mining', 0.7)],
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [sharedInterests, noSharedInterests],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const sharedScore = scores.find(s => s.entityId === 'shared');
      const differentScore = scores.find(s => s.entityId === 'different');

      expect(sharedScore!.score).toBeGreaterThan(differentScore!.score);
      expect(sharedScore!.reasons).toContain('shared interests');
    });

    it('should add bonus for good relationships', () => {
      const relationships = new Map<string, Relationship>();
      relationships.set('friend', relationship('friend', 80, 70));

      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
        relationships,
      });
      const friend = createMockEntity('friend', {
        position: { x: 5, y: 5 },
      });
      const stranger = createMockEntity('stranger', {
        position: { x: 5, y: 5 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [friend, stranger],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const friendScore = scores.find(s => s.entityId === 'friend');
      const strangerScore = scores.find(s => s.entityId === 'stranger');

      expect(friendScore!.score).toBeGreaterThan(strangerScore!.score);
      expect(friendScore!.reasons).toContain('friend');
    });

    it('should add bonus for known enthusiasts', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
        interests: [
          interest('philosophy', 0.8, 0.5, 'innate', ['enthusiast']),
        ],
      });
      const enthusiast = createMockEntity('enthusiast', {
        position: { x: 5, y: 5 },
      });
      const normal = createMockEntity('normal', {
        position: { x: 5, y: 5 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [enthusiast, normal],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const enthusiastScore = scores.find(s => s.entityId === 'enthusiast');
      const normalScore = scores.find(s => s.entityId === 'normal');

      expect(enthusiastScore!.score).toBeGreaterThan(normalScore!.score);
      expect(enthusiastScore!.reasons).toContain('known good conversationalist');
    });

    it('should sort by score descending', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });
      const near = createMockEntity('near', {
        position: { x: 1, y: 1 },
      });
      const medium = createMockEntity('medium', {
        position: { x: 8, y: 8 },
      });
      const far = createMockEntity('far', {
        position: { x: 18, y: 18 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [far, near, medium], // Shuffled order
        world: mockWorld,
      };

      const scores = scorePartners(context);
      expect(scores[0]!.entityId).toBe('near');
      expect(scores[1]!.entityId).toBe('medium');
      expect(scores[2]!.entityId).toBe('far');
    });
  });

  describe('selectPartner', () => {
    it('should return null when no candidates', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [],
        world: mockWorld,
      };

      const partner = selectPartner(context);
      expect(partner).toBeNull();
    });

    it('should return only available candidate', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });
      const onlyOption = createMockEntity('only', {
        position: { x: 5, y: 5 },
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [onlyOption],
        world: mockWorld,
      };

      const partner = selectPartner(context);
      expect(partner?.id).toBe('only');
    });

    it('should prefer high-scoring candidates', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
        interests: [interest('farming', 0.9)],
      });
      const bestMatch = createMockEntity('best', {
        position: { x: 1, y: 1 },
        interests: [interest('farming', 0.9)],
      });
      const poorMatch = createMockEntity('poor', {
        position: { x: 18, y: 18 },
        interests: [interest('smithing', 0.9)],
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [poorMatch, bestMatch],
        world: mockWorld,
      };

      // Run multiple times to check statistical preference
      const selections: Record<string, number> = { best: 0, poor: 0 };
      for (let i = 0; i < 100; i++) {
        const partner = selectPartner(context, 0); // No randomness
        if (partner) {
          selections[partner.id as 'best' | 'poor']++;
        }
      }

      // Best match should be selected every time with 0 randomness
      expect(selections['best']).toBe(100);
    });

    it('should add variety with randomness factor', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
      });
      const a = createMockEntity('a', { position: { x: 2, y: 2 } });
      const b = createMockEntity('b', { position: { x: 3, y: 3 } });
      const c = createMockEntity('c', { position: { x: 4, y: 4 } });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [a, b, c],
        world: mockWorld,
      };

      // Run many times with high randomness
      const selections = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const partner = selectPartner(context, 0.8);
        if (partner) {
          selections.add(partner.id);
        }
      }

      // With high randomness, we should see variety
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('describePartnerSelection', () => {
    it('should describe empty reasons', () => {
      const score: PartnerScore = {
        entityId: 'test',
        entity: {} as Entity,
        score: 10,
        reasons: [],
      };

      const description = describePartnerSelection(score);
      expect(description).toBe('available for conversation');
    });

    it('should join multiple reasons', () => {
      const score: PartnerScore = {
        entityId: 'test',
        entity: {} as Entity,
        score: 50,
        reasons: ['nearby', 'shared interests', 'friend'],
      };

      const description = describePartnerSelection(score);
      expect(description).toBe('nearby, shared interests, friend');
    });

    it('should handle single reason', () => {
      const score: PartnerScore = {
        entityId: 'test',
        entity: {} as Entity,
        score: 20,
        reasons: ['nearby'],
      };

      const description = describePartnerSelection(score);
      expect(description).toBe('nearby');
    });
  });

  describe('age-based scoring integration', () => {
    it('should score elder-child pairs highly when child has questions', () => {
      const child = createMockEntity('child', {
        position: { x: 0, y: 0 },
        ageCategory: 'child',
        interests: [interest('the_gods', 0.5, 0.8, 'question')],
      });
      const elder = createMockEntity('elder', {
        position: { x: 5, y: 5 },
        ageCategory: 'elder',
        interests: [interest('the_gods', 0.9)],
      });
      const otherChild = createMockEntity('otherChild', {
        position: { x: 5, y: 5 },
        ageCategory: 'child',
        interests: [interest('the_gods', 0.3)],
      });

      const context: PartnerSelectionContext = {
        seeker: child,
        candidates: [elder, otherChild],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const elderScore = scores.find(s => s.entityId === 'elder');
      const otherChildScore = scores.find(s => s.entityId === 'otherChild');

      expect(elderScore!.score).toBeGreaterThan(otherChildScore!.score);
    });

    it('should score teen peer conversations highly', () => {
      const teen = createMockEntity('teen', {
        position: { x: 0, y: 0 },
        ageCategory: 'teen',
      });
      const otherTeen = createMockEntity('otherTeen', {
        position: { x: 5, y: 5 },
        ageCategory: 'teen',
      });
      const adult = createMockEntity('adult', {
        position: { x: 5, y: 5 },
        ageCategory: 'adult',
      });

      const context: PartnerSelectionContext = {
        seeker: teen,
        candidates: [otherTeen, adult],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const teenScore = scores.find(s => s.entityId === 'otherTeen');
      const adultScore = scores.find(s => s.entityId === 'adult');

      expect(teenScore!.score).toBeGreaterThan(adultScore!.score);
    });
  });

  describe('complementary knowledge scoring', () => {
    it('should prefer partners who can teach what seeker wants to learn', () => {
      const seeker = createMockEntity('seeker', {
        position: { x: 0, y: 0 },
        interests: [
          interest('smithing', 0.3, 0.9, 'question'), // Wants to learn smithing
        ],
      });
      const expert = createMockEntity('expert', {
        position: { x: 5, y: 5 },
        interests: [
          interest('smithing', 0.95), // Expert at smithing
        ],
      });
      const novice = createMockEntity('novice', {
        position: { x: 5, y: 5 },
        interests: [
          interest('smithing', 0.2), // Also learning
        ],
      });

      const context: PartnerSelectionContext = {
        seeker,
        candidates: [expert, novice],
        world: mockWorld,
      };

      const scores = scorePartners(context);
      const expertScore = scores.find(s => s.entityId === 'expert');
      const noviceScore = scores.find(s => s.entityId === 'novice');

      expect(expertScore!.score).toBeGreaterThan(noviceScore!.score);
      expect(expertScore!.reasons).toContain('can teach me');
    });
  });
});
