import { describe, it, expect, beforeEach } from 'vitest';
import { generatePersonalGoal } from '../systems/GoalGenerationSystem';
import { PersonalityComponent } from '../components/PersonalityComponent';
import type { GoalCategory } from '../components/GoalsComponent';

describe('Goal Generation', () => {
  describe('personality-based goal selection', () => {
    it('should generate mastery goals for conscientious agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.9, // High conscientiousness
        extraversion: 0.4,
        agreeableness: 0.5,
        neuroticism: 0.3
      });

      const goals: GoalCategory[] = [];
      for (let i = 0; i < 200; i++) {
        const goal = generatePersonalGoal(personality, {});
        goals.push(goal.category);
      }

      const masteryCount = goals.filter(g => g === 'mastery').length;
      // With high conscientiousness (0.9), should get at least 20% mastery goals
      expect(masteryCount).toBeGreaterThanOrEqual(40);
    });

    it('should generate social goals for extraverted agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.9, // High extraversion
        agreeableness: 0.8, // High agreeableness
        neuroticism: 0.3
      });

      const goals: GoalCategory[] = [];
      for (let i = 0; i < 200; i++) {
        const goal = generatePersonalGoal(personality, {});
        goals.push(goal.category);
      }

      const socialCount = goals.filter(g => g === 'social').length;
      // With high extraversion and agreeableness, should get at least 20% social goals
      expect(socialCount).toBeGreaterThanOrEqual(40);
    });

    it('should generate creative goals for open agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.9, // High openness
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.3
      });

      const goals: GoalCategory[] = [];
      for (let i = 0; i < 100; i++) {
        const goal = generatePersonalGoal(personality, {});
        goals.push(goal.category);
      }

      const creativeCount = goals.filter(g => g === 'creative').length;
      // With high openness, should get at least 10% creative goals
      expect(creativeCount).toBeGreaterThanOrEqual(10);
    });

    it('should generate security goals for conscientious low-neuroticism agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.8,
        extraversion: 0.4,
        agreeableness: 0.5,
        neuroticism: 0.2 // Low neuroticism (stable)
      });

      const goals: GoalCategory[] = [];
      for (let i = 0; i < 50; i++) {
        const goal = generatePersonalGoal(personality, {});
        goals.push(goal.category);
      }

      const securityCount = goals.filter(g => g === 'security').length;
      // Expected ~8.3 security goals (16.6% probability), allow wider range for randomness
      expect(securityCount).toBeGreaterThan(3);
    });

    it('should generate exploration goals for open agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.85,
        conscientiousness: 0.4,
        extraversion: 0.6,
        agreeableness: 0.5,
        neuroticism: 0.4
      });

      const goals: GoalCategory[] = [];
      for (let i = 0; i < 100; i++) {
        const goal = generatePersonalGoal(personality, {});
        goals.push(goal.category);
      }

      const explorationCount = goals.filter(g => g === 'exploration').length;
      // With openness=0.85, expect ~20-25% exploration goals
      expect(explorationCount).toBeGreaterThanOrEqual(15);
    });
  });

  describe('goal structure validation', () => {
    it('should generate goal with all required fields', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      });

      const goal = generatePersonalGoal(personality, {});

      expect(goal.id).toBeDefined();
      expect(goal.category).toBeDefined();
      expect(goal.description).toBeDefined();
      expect(goal.motivation).toBeDefined();
      expect(goal.progress).toBe(0);
      expect(goal.milestones).toBeDefined();
      expect(Array.isArray(goal.milestones)).toBe(true);
      expect(goal.createdAt).toBeDefined();
      expect(goal.targetCompletionDays).toBeGreaterThan(0);
    });

    it('should generate goal with 2-4 milestones', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      });

      const goal = generatePersonalGoal(personality, {});

      expect(goal.milestones.length).toBeGreaterThanOrEqual(2);
      expect(goal.milestones.length).toBeLessThanOrEqual(4);
    });

    it('should generate unique goal IDs', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      });

      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const goal = generatePersonalGoal(personality, {});
        ids.add(goal.id);
      }

      expect(ids.size).toBe(100); // All unique
    });
  });

  describe('goal personalization', () => {
    it('should generate goals that read as personal aspirations', () => {
      const personality = new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      });

      const goal = generatePersonalGoal(personality, {});

      // Goals should not sound like game objectives
      expect(goal.description.toLowerCase()).not.toContain('task');
      expect(goal.description.toLowerCase()).not.toContain('objective');
      expect(goal.description.toLowerCase()).not.toContain('complete');

      // Should have personal language
      expect(goal.motivation).toBeDefined();
      expect(goal.motivation.length).toBeGreaterThan(10);
    });

    it('should set realistic target completion times', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      });

      const goal = generatePersonalGoal(personality, {});

      // 3-30 days seems reasonable for goals
      expect(goal.targetCompletionDays).toBeGreaterThanOrEqual(3);
      expect(goal.targetCompletionDays).toBeLessThanOrEqual(30);
    });
  });

  describe('skill-based goal customization', () => {
    it('should incorporate high skills into mastery goals', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.8,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.3
      });

      const skills = {
        building: 0.8,
        farming: 0.3,
        crafting: 0.2
      };

      const goals = [];
      for (let i = 0; i < 20; i++) {
        const goal = generatePersonalGoal(personality, skills);
        if (goal.category === 'mastery') {
          goals.push(goal);
        }
      }

      // At least some mastery goals should relate to building (highest skill)
      const buildingRelated = goals.filter(g =>
        g.description.toLowerCase().includes('build') ||
        g.description.toLowerCase().includes('construct')
      );
      expect(buildingRelated.length).toBeGreaterThan(0);
    });

    it('should suggest improving low skills for growth-oriented agents', () => {
      const personality = new PersonalityComponent({
        openness: 0.9, // Growth mindset
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.3
      });

      const skills = {
        building: 0.1,
        farming: 0.1,
        crafting: 0.1
      };

      const goals = [];
      for (let i = 0; i < 30; i++) {
        const goal = generatePersonalGoal(personality, skills);
        goals.push(goal);
      }

      // Some goals should be about learning new skills
      const learningGoals = goals.filter(g =>
        g.description.toLowerCase().includes('learn') ||
        g.description.toLowerCase().includes('improve') ||
        g.category === 'mastery'
      );
      expect(learningGoals.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should throw when personality is missing', () => {
      // Test validates that null personality throws expected error
      // Function signature accepts PersonalityComponent | null to enable this validation
      expect(() => {
        generatePersonalGoal(null, {});
      }).toThrow('missing required');
    });

    it('should handle empty skills object', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      });

      const goal = generatePersonalGoal(personality, {});
      expect(goal).toBeDefined();
    });
  });

  describe('goal category distribution', () => {
    it('should use all goal categories over many generations', () => {
      const personality = new PersonalityComponent({
        openness: 0.6,
        conscientiousness: 0.6,
        extraversion: 0.6,
        agreeableness: 0.6,
        neuroticism: 0.4
      });

      const categories = new Set<GoalCategory>();
      for (let i = 0; i < 200; i++) {
        const goal = generatePersonalGoal(personality, {});
        categories.add(goal.category);
      }

      // Should use at least 4 different categories
      expect(categories.size).toBeGreaterThanOrEqual(4);
    });
  });
});
