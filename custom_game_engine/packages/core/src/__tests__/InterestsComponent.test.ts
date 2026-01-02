import { describe, it, expect, beforeEach } from 'vitest';
import { InterestsComponent } from '../components/InterestsComponent';
import type { Interest, TopicId, InterestSource, TopicCategory } from '../components/InterestsComponent';

describe('InterestsComponent', () => {
  let component: InterestsComponent;

  beforeEach(() => {
    component = new InterestsComponent();
  });

  describe('component type', () => {
    it('should use lowercase type name', () => {
      expect(component.type).toBe('interests');
    });

    it('should have version 1', () => {
      expect(component.version).toBe(1);
    });
  });

  describe('interest creation', () => {
    it('should add a new interest', () => {
      const interest: Interest = {
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.7,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.0,
        knownEnthusiasts: [],
      };

      component.addInterest(interest);

      expect(component.interests).toHaveLength(1);
      expect(component.interests[0]).toEqual(interest);
    });

    it('should not allow more than maxInterests', () => {
      component.maxInterests = 5;

      for (let i = 0; i < 5; i++) {
        component.addInterest({
          topic: `topic-${i}` as TopicId,
          category: 'craft',
          intensity: 0.5,
          source: 'skill',
          lastDiscussed: null,
          discussionHunger: 0.0,
          knownEnthusiasts: [],
        });
      }

      // Adding 6th should replace lowest intensity
      component.addInterest({
        topic: 'farming',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.0,
        knownEnthusiasts: [],
      });

      expect(component.interests).toHaveLength(5);
      expect(component.interests.some(i => i.topic === 'farming')).toBe(true);
    });

    it('should throw when intensity is out of range', () => {
      expect(() => {
        component.addInterest({
          topic: 'woodworking',
          category: 'craft',
          intensity: 1.5, // Invalid: > 1.0
          source: 'skill',
          lastDiscussed: null,
          discussionHunger: 0.0,
          knownEnthusiasts: [],
        });
      }).toThrow('intensity must be in range 0-1');
    });

    it('should throw when intensity is negative', () => {
      expect(() => {
        component.addInterest({
          topic: 'woodworking',
          category: 'craft',
          intensity: -0.1, // Invalid: < 0
          source: 'skill',
          lastDiscussed: null,
          discussionHunger: 0.0,
          knownEnthusiasts: [],
        });
      }).toThrow('intensity must be in range 0-1');
    });

    it('should throw when discussionHunger is out of range', () => {
      expect(() => {
        component.addInterest({
          topic: 'woodworking',
          category: 'craft',
          intensity: 0.5,
          source: 'skill',
          lastDiscussed: null,
          discussionHunger: 1.5, // Invalid: > 1.0
          knownEnthusiasts: [],
        });
      }).toThrow('discussionHunger must be in range 0-1');
    });
  });

  describe('interest queries', () => {
    beforeEach(() => {
      component.addInterest({
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.3,
        knownEnthusiasts: [],
      });
      component.addInterest({
        topic: 'afterlife',
        category: 'philosophy',
        intensity: 0.6,
        source: 'experience',
        lastDiscussed: null,
        discussionHunger: 0.7,
        knownEnthusiasts: [],
      });
      component.addInterest({
        topic: 'farming',
        category: 'craft',
        intensity: 0.4,
        source: 'skill',
        lastDiscussed: 100,
        discussionHunger: 0.1,
        knownEnthusiasts: [],
      });
    });

    it('should get interest by topic', () => {
      const interest = component.getInterest('woodworking');
      expect(interest).toBeDefined();
      expect(interest?.intensity).toBe(0.8);
    });

    it('should return undefined for non-existent topic', () => {
      const interest = component.getInterest('stonecraft');
      expect(interest).toBeUndefined();
    });

    it('should get interests by category', () => {
      const craftInterests = component.getInterestsByCategory('craft');
      expect(craftInterests).toHaveLength(2);
      expect(craftInterests.every(i => i.category === 'craft')).toBe(true);
    });

    it('should get hungry interests sorted by hunger', () => {
      const hungry = component.getHungryInterests(0.5);
      expect(hungry).toHaveLength(1);
      expect(hungry[0].topic).toBe('afterlife');
    });

    it('should get top interests by intensity', () => {
      const top = component.getTopInterests(2);
      expect(top).toHaveLength(2);
      expect(top[0].intensity).toBeGreaterThanOrEqual(top[1].intensity);
      expect(top[0].topic).toBe('woodworking');
    });

    it('should check if has interest', () => {
      expect(component.hasInterest('woodworking')).toBe(true);
      expect(component.hasInterest('stonecraft')).toBe(false);
    });
  });

  describe('child questions', () => {
    it('should add question interest with question text', () => {
      component.addInterest({
        topic: 'afterlife',
        category: 'philosophy',
        intensity: 0.7,
        source: 'question',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
        question: 'Where do people go when they die?',
      });

      const interest = component.getInterest('afterlife');
      expect(interest?.source).toBe('question');
      expect(interest?.question).toBe('Where do people go when they die?');
    });

    it('should get all question interests', () => {
      component.addInterest({
        topic: 'afterlife',
        category: 'philosophy',
        intensity: 0.7,
        source: 'question',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
        question: 'Where do people go when they die?',
      });
      component.addInterest({
        topic: 'the_gods',
        category: 'philosophy',
        intensity: 0.6,
        source: 'question',
        lastDiscussed: null,
        discussionHunger: 0.4,
        knownEnthusiasts: [],
        question: 'Do the gods watch us?',
      });

      const questions = component.getQuestions();
      expect(questions).toHaveLength(2);
      expect(questions.every(i => i.source === 'question')).toBe(true);
    });
  });

  describe('discussion hunger updates', () => {
    beforeEach(() => {
      component.addInterest({
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
      });
    });

    it('should update discussion hunger', () => {
      component.updateDiscussionHunger('woodworking', 0.8);

      const interest = component.getInterest('woodworking');
      expect(interest?.discussionHunger).toBe(0.8);
    });

    it('should clamp discussion hunger to 0-1 range', () => {
      component.updateDiscussionHunger('woodworking', 1.5);
      expect(component.getInterest('woodworking')?.discussionHunger).toBe(1.0);

      component.updateDiscussionHunger('woodworking', -0.5);
      expect(component.getInterest('woodworking')?.discussionHunger).toBe(0.0);
    });

    it('should throw when updating non-existent interest', () => {
      expect(() => {
        component.updateDiscussionHunger('stonecraft', 0.5);
      }).toThrow('Interest not found');
    });

    it('should satisfy topic with last discussed tick', () => {
      component.satisfyTopic('woodworking', 1000, 0.6);

      const interest = component.getInterest('woodworking');
      expect(interest?.lastDiscussed).toBe(1000);
      // 0.5 - 0.6 = -0.1, clamped to 0
      expect(interest?.discussionHunger).toBe(0);
    });
  });

  describe('known enthusiasts', () => {
    beforeEach(() => {
      component.addInterest({
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
      });
    });

    it('should add known enthusiast', () => {
      component.addKnownEnthusiast('woodworking', 'agent-123');

      const interest = component.getInterest('woodworking');
      expect(interest?.knownEnthusiasts).toContain('agent-123');
    });

    it('should not duplicate enthusiasts', () => {
      component.addKnownEnthusiast('woodworking', 'agent-123');
      component.addKnownEnthusiast('woodworking', 'agent-123');

      const interest = component.getInterest('woodworking');
      expect(interest?.knownEnthusiasts).toHaveLength(1);
    });

    it('should limit enthusiasts to 5 (FIFO)', () => {
      for (let i = 0; i < 6; i++) {
        component.addKnownEnthusiast('woodworking', `agent-${i}`);
      }

      const interest = component.getInterest('woodworking');
      expect(interest?.knownEnthusiasts).toHaveLength(5);
      expect(interest?.knownEnthusiasts).not.toContain('agent-0'); // First one removed
      expect(interest?.knownEnthusiasts).toContain('agent-5'); // Latest one present
    });
  });

  describe('depth hunger', () => {
    it('should initialize depth hunger to 0', () => {
      expect(component.depthHunger).toBe(0);
    });

    it('should update depth hunger', () => {
      component.updateDepthHunger(0.5);
      expect(component.depthHunger).toBe(0.5);
    });

    it('should clamp depth hunger to 0-1 range', () => {
      component.updateDepthHunger(1.5);
      expect(component.depthHunger).toBe(1.0);

      component.updateDepthHunger(-0.5);
      expect(component.depthHunger).toBe(0.0);
    });

    it('should reduce depth hunger on satisfaction', () => {
      component.depthHunger = 0.8;
      component.satisfyDepthHunger(0.5);
      expect(component.depthHunger).toBeCloseTo(0.3, 10);
    });
  });

  describe('avoid topics', () => {
    it('should add avoid topic', () => {
      component.addAvoidTopic('village_gossip');
      expect(component.avoidTopics).toContain('village_gossip');
    });

    it('should check if topic is avoided', () => {
      component.addAvoidTopic('village_gossip');
      expect(component.isAvoidedTopic('village_gossip')).toBe(true);
      expect(component.isAvoidedTopic('woodworking')).toBe(false);
    });

    it('should remove avoid topic', () => {
      component.addAvoidTopic('village_gossip');
      component.removeAvoidTopic('village_gossip');
      expect(component.avoidTopics).not.toContain('village_gossip');
    });
  });

  describe('interest removal', () => {
    beforeEach(() => {
      component.addInterest({
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.3,
        knownEnthusiasts: [],
      });
      component.addInterest({
        topic: 'farming',
        category: 'craft',
        intensity: 0.4,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.1,
        knownEnthusiasts: [],
      });
    });

    it('should remove interest by topic', () => {
      component.removeInterest('woodworking');
      expect(component.interests).toHaveLength(1);
      expect(component.hasInterest('woodworking')).toBe(false);
    });

    it('should throw when removing non-existent interest', () => {
      expect(() => {
        component.removeInterest('stonecraft');
      }).toThrow('Interest not found');
    });

    it('should prune lowest intensity interests', () => {
      component.addInterest({
        topic: 'afterlife',
        category: 'philosophy',
        intensity: 0.9,
        source: 'experience',
        lastDiscussed: null,
        discussionHunger: 0.0,
        knownEnthusiasts: [],
      });

      // Prune to keep only top 2
      component.pruneToCount(2);

      expect(component.interests).toHaveLength(2);
      expect(component.hasInterest('farming')).toBe(false); // Lowest intensity removed
      expect(component.hasInterest('woodworking')).toBe(true);
      expect(component.hasInterest('afterlife')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      component.addInterest({
        topic: 'woodworking',
        category: 'craft',
        intensity: 0.8,
        source: 'skill',
        lastDiscussed: 100,
        discussionHunger: 0.3,
        knownEnthusiasts: ['agent-1'],
      });
      component.depthHunger = 0.5;
      component.addAvoidTopic('village_gossip');

      const json = component.toJSON();

      expect(json.interests).toHaveLength(1);
      expect(json.interests[0].topic).toBe('woodworking');
      expect(json.depthHunger).toBe(0.5);
      expect(json.avoidTopics).toContain('village_gossip');
    });

    it('should restore from JSON', () => {
      const data = {
        interests: [
          {
            topic: 'woodworking' as TopicId,
            category: 'craft' as TopicCategory,
            intensity: 0.8,
            source: 'skill' as InterestSource,
            lastDiscussed: 100,
            discussionHunger: 0.3,
            knownEnthusiasts: ['agent-1'],
          },
        ],
        depthHunger: 0.5,
        avoidTopics: ['village_gossip' as TopicId],
        maxInterests: 10,
      };

      component.fromJSON(data);

      expect(component.interests).toHaveLength(1);
      expect(component.getInterest('woodworking')).toBeDefined();
      expect(component.depthHunger).toBe(0.5);
      expect(component.avoidTopics).toContain('village_gossip');
    });
  });
});
