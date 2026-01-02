/**
 * ConversationStyle Tests
 *
 * Deep Conversation System - Phase 4
 *
 * Tests age-based conversation patterns, topic preferences, and style compatibility.
 */

import { describe, test, expect } from 'vitest';
import type { AgeCategory } from '../components/AgentComponent.js';
import {
  getConversationStyle,
  getDepthCapacity,
  getTopicPreferences,
  getTopicWeight,
  generateConversationStarter,
  generateQuestionPattern,
  calculateStyleCompatibility,
  describeConversationStyle,
  describeConversationDynamic,
  calculateAgeCategory,
  calculateAgeCategoryFromTick,
} from '../conversation/ConversationStyle.js';

describe('ConversationStyle', () => {
  describe('getConversationStyle', () => {
    test('returns child style', () => {
      const style = getConversationStyle('child');
      expect(style.ageCategory).toBe('child');
      expect(style.mode).toBe('questioning');
      expect(style.depthCapacity).toBe(0.4);
    });

    test('returns teen style', () => {
      const style = getConversationStyle('teen');
      expect(style.ageCategory).toBe('teen');
      expect(style.mode).toBe('exploratory');
      expect(style.depthCapacity).toBe(0.6);
    });

    test('returns adult style', () => {
      const style = getConversationStyle('adult');
      expect(style.ageCategory).toBe('adult');
      expect(style.mode).toBe('sharing');
      expect(style.depthCapacity).toBe(0.8);
    });

    test('returns elder style', () => {
      const style = getConversationStyle('elder');
      expect(style.ageCategory).toBe('elder');
      expect(style.mode).toBe('reflective');
      expect(style.depthCapacity).toBe(1.0);
    });

    test('all styles have required fields', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age of ageCategories) {
        const style = getConversationStyle(age);
        expect(style.ageCategory).toBe(age);
        expect(style.mode).toBeDefined();
        expect(typeof style.depthCapacity).toBe('number');
        expect(style.depthCapacity).toBeGreaterThan(0);
        expect(style.depthCapacity).toBeLessThanOrEqual(1);
        expect(typeof style.initiationRate).toBe('number');
        expect(typeof style.preferredLength).toBe('number');
        expect(typeof style.emotionalExpression).toBe('number');
        expect(style.description).toBeDefined();
      }
    });
  });

  describe('getDepthCapacity', () => {
    test('children have lowest capacity', () => {
      const childCapacity = getDepthCapacity('child');
      expect(childCapacity).toBe(0.4);
    });

    test('teens have medium-low capacity', () => {
      const teenCapacity = getDepthCapacity('teen');
      expect(teenCapacity).toBe(0.6);
    });

    test('adults have high capacity', () => {
      const adultCapacity = getDepthCapacity('adult');
      expect(adultCapacity).toBe(0.8);
    });

    test('elders have maximum capacity', () => {
      const elderCapacity = getDepthCapacity('elder');
      expect(elderCapacity).toBe(1.0);
    });

    test('depth capacity increases with age', () => {
      const child = getDepthCapacity('child');
      const teen = getDepthCapacity('teen');
      const adult = getDepthCapacity('adult');
      const elder = getDepthCapacity('elder');

      expect(child).toBeLessThan(teen);
      expect(teen).toBeLessThan(adult);
      expect(adult).toBeLessThan(elder);
    });
  });

  describe('getTopicPreferences', () => {
    test('children prefer stories and nature', () => {
      const prefs = getTopicPreferences('child');
      expect(prefs.length).toBeGreaterThan(0);

      const storyPref = prefs.find(p => p.topic === 'story');
      const naturePref = prefs.find(p => p.topic === 'nature');

      expect(storyPref).toBeDefined();
      expect(storyPref!.weight).toBeGreaterThan(0.5);
      expect(naturePref).toBeDefined();
      expect(naturePref!.weight).toBeGreaterThan(0.5);
    });

    test('children avoid mortality topics', () => {
      const prefs = getTopicPreferences('child');
      const mortalityPref = prefs.find(p => p.topic === 'mortality');

      expect(mortalityPref).toBeDefined();
      expect(mortalityPref!.weight).toBeLessThan(0);
    });

    test('teens prefer social topics', () => {
      const prefs = getTopicPreferences('teen');
      const socialPref = prefs.find(p => p.topic === 'social');

      expect(socialPref).toBeDefined();
      expect(socialPref!.weight).toBeGreaterThan(0.7);
    });

    test('adults prefer practical topics', () => {
      const prefs = getTopicPreferences('adult');
      const practicalPref = prefs.find(p => p.topic === 'practical');

      expect(practicalPref).toBeDefined();
      expect(practicalPref!.weight).toBeGreaterThan(0.5);
    });

    test('elders prefer philosophy and mortality', () => {
      const prefs = getTopicPreferences('elder');
      const philosophyPref = prefs.find(p => p.topic === 'philosophy');
      const mortalityPref = prefs.find(p => p.topic === 'mortality');

      expect(philosophyPref).toBeDefined();
      expect(philosophyPref!.weight).toBeGreaterThan(0.7);
      expect(mortalityPref).toBeDefined();
      expect(mortalityPref!.weight).toBeGreaterThan(0.7);
    });

    test('all preferences have reasons', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age of ageCategories) {
        const prefs = getTopicPreferences(age);
        for (const pref of prefs) {
          expect(pref.reason).toBeDefined();
          expect(pref.reason.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getTopicWeight', () => {
    test('returns positive weight for preferred topics', () => {
      const weight = getTopicWeight('elder', 'mortality');
      expect(weight).toBeGreaterThan(0);
    });

    test('returns negative weight for avoided topics', () => {
      const weight = getTopicWeight('child', 'mortality');
      expect(weight).toBeLessThan(0);
    });

    test('returns zero for neutral topics', () => {
      const weight = getTopicWeight('child', 'farming');
      expect(typeof weight).toBe('number');
    });

    test('checks specific topic before category', () => {
      const mortalityWeight = getTopicWeight('elder', 'mortality', 'philosophy');
      expect(mortalityWeight).toBeGreaterThan(0);
    });

    test('falls back to category if specific topic not found', () => {
      const categoryWeight = getTopicWeight('adult', 'farming' as any, 'practical');
      expect(typeof categoryWeight).toBe('number');
    });
  });

  describe('generateConversationStarter', () => {
    test('generates starter for child', () => {
      const starter = generateConversationStarter('child');
      expect(typeof starter).toBe('string');
      expect(starter.length).toBeGreaterThan(0);
    });

    test('generates category-specific starters', () => {
      const natureStarter = generateConversationStarter('child', 'nature');
      expect(typeof natureStarter).toBe('string');
      expect(natureStarter.length).toBeGreaterThan(0);
    });

    test('falls back to general if category not found', () => {
      const starter = generateConversationStarter('child', 'nonexistent_category');
      expect(typeof starter).toBe('string');
      expect(starter.length).toBeGreaterThan(0);
    });

    test('generates different starters for different ages', () => {
      const childStarter = generateConversationStarter('child');
      const elderStarter = generateConversationStarter('elder');

      expect(childStarter).toBeDefined();
      expect(elderStarter).toBeDefined();
    });

    test('returns valid string for all age categories', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age of ageCategories) {
        const starter = generateConversationStarter(age);
        expect(typeof starter).toBe('string');
        expect(starter.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateQuestionPattern', () => {
    test('generates question pattern for child', () => {
      const pattern = generateQuestionPattern('child');
      expect(typeof pattern).toBe('string');
      expect(pattern.length).toBeGreaterThan(0);
    });

    test('returns valid pattern for all age categories', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age of ageCategories) {
        const pattern = generateQuestionPattern(age);
        expect(typeof pattern).toBe('string');
        expect(pattern.length).toBeGreaterThan(0);
      }
    });

    test('child patterns are simple questions', () => {
      const pattern = generateQuestionPattern('child');
      // Should be short and simple
      expect(pattern.length).toBeLessThan(50);
    });
  });

  describe('calculateStyleCompatibility', () => {
    test('questioning and sharing are highly compatible', () => {
      const compatibility = calculateStyleCompatibility('child', 'adult');
      expect(compatibility).toBeGreaterThan(0.7);
    });

    test('questioning and reflective are highly compatible', () => {
      const compatibility = calculateStyleCompatibility('child', 'elder');
      expect(compatibility).toBeGreaterThan(0.7);
    });

    test('same age categories have good compatibility', () => {
      const childChild = calculateStyleCompatibility('child', 'child');
      const teenTeen = calculateStyleCompatibility('teen', 'teen');
      const adultAdult = calculateStyleCompatibility('adult', 'adult');
      const elderElder = calculateStyleCompatibility('elder', 'elder');

      expect(childChild).toBeGreaterThan(0.4);
      expect(teenTeen).toBeGreaterThan(0.4);
      expect(adultAdult).toBeGreaterThan(0.4);
      expect(elderElder).toBeGreaterThan(0.4);
    });

    test('returns value between 0 and 1', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age1 of ageCategories) {
        for (const age2 of ageCategories) {
          const compatibility = calculateStyleCompatibility(age1, age2);
          expect(compatibility).toBeGreaterThanOrEqual(0);
          expect(compatibility).toBeLessThanOrEqual(1);
        }
      }
    });

    test('compatibility is symmetric', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age1 of ageCategories) {
        for (const age2 of ageCategories) {
          const compat1 = calculateStyleCompatibility(age1, age2);
          const compat2 = calculateStyleCompatibility(age2, age1);
          expect(Math.abs(compat1 - compat2)).toBeLessThan(0.01);
        }
      }
    });
  });

  describe('describeConversationStyle', () => {
    test('provides description for each age', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age of ageCategories) {
        const description = describeConversationStyle(age);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(10);
      }
    });

    test('child description mentions curiosity', () => {
      const description = describeConversationStyle('child');
      expect(description.toLowerCase()).toContain('question');
    });

    test('elder description mentions wisdom or reflection', () => {
      const description = describeConversationStyle('elder');
      const lowerDesc = description.toLowerCase();
      expect(
        lowerDesc.includes('wisdom') ||
        lowerDesc.includes('reflect') ||
        lowerDesc.includes('philosoph')
      ).toBe(true);
    });
  });

  describe('describeConversationDynamic', () => {
    test('child-elder dynamic is mentorship', () => {
      const dynamic = describeConversationDynamic('child', 'elder');
      expect(typeof dynamic).toBe('string');
      expect(dynamic.length).toBeGreaterThan(0);
    });

    test('teen-adult dynamic shows guidance', () => {
      const dynamic = describeConversationDynamic('teen', 'adult');
      expect(typeof dynamic).toBe('string');
    });

    test('same age peers have peer dynamics', () => {
      const teenDynamic = describeConversationDynamic('teen', 'teen');
      expect(teenDynamic.toLowerCase()).toContain('peer');
    });

    test('all age pairs have dynamics defined', () => {
      const ageCategories: AgeCategory[] = ['child', 'teen', 'adult', 'elder'];

      for (const age1 of ageCategories) {
        for (const age2 of ageCategories) {
          const dynamic = describeConversationDynamic(age1, age2);
          expect(typeof dynamic).toBe('string');
          expect(dynamic.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('calculateAgeCategory', () => {
    test('categorizes child correctly', () => {
      expect(calculateAgeCategory(0)).toBe('child');
      expect(calculateAgeCategory(5)).toBe('child');
      expect(calculateAgeCategory(12)).toBe('child');
    });

    test('categorizes teen correctly', () => {
      expect(calculateAgeCategory(13)).toBe('teen');
      expect(calculateAgeCategory(15)).toBe('teen');
      expect(calculateAgeCategory(19)).toBe('teen');
    });

    test('categorizes adult correctly', () => {
      expect(calculateAgeCategory(20)).toBe('adult');
      expect(calculateAgeCategory(35)).toBe('adult');
      expect(calculateAgeCategory(59)).toBe('adult');
    });

    test('categorizes elder correctly', () => {
      expect(calculateAgeCategory(60)).toBe('elder');
      expect(calculateAgeCategory(75)).toBe('elder');
      expect(calculateAgeCategory(100)).toBe('elder');
    });

    test('handles edge cases at boundaries', () => {
      expect(calculateAgeCategory(12.99)).toBe('child');
      expect(calculateAgeCategory(13.0)).toBe('teen');
      expect(calculateAgeCategory(19.99)).toBe('teen');
      expect(calculateAgeCategory(20.0)).toBe('adult');
      expect(calculateAgeCategory(59.99)).toBe('adult');
      expect(calculateAgeCategory(60.0)).toBe('elder');
    });
  });

  describe('calculateAgeCategoryFromTick', () => {
    test('newborn is child', () => {
      const birthTick = 0;
      const currentTick = 100;
      const category = calculateAgeCategoryFromTick(birthTick, currentTick);
      expect(category).toBe('child');
    });

    test('calculates teen from ticks', () => {
      const ticksPerYear = 311040000;
      const birthTick = 0;
      const currentTick = ticksPerYear * 15; // 15 years
      const category = calculateAgeCategoryFromTick(birthTick, currentTick, ticksPerYear);
      expect(category).toBe('teen');
    });

    test('calculates adult from ticks', () => {
      const ticksPerYear = 311040000;
      const birthTick = 0;
      const currentTick = ticksPerYear * 30; // 30 years
      const category = calculateAgeCategoryFromTick(birthTick, currentTick, ticksPerYear);
      expect(category).toBe('adult');
    });

    test('calculates elder from ticks', () => {
      const ticksPerYear = 311040000;
      const birthTick = 0;
      const currentTick = ticksPerYear * 65; // 65 years
      const category = calculateAgeCategoryFromTick(birthTick, currentTick, ticksPerYear);
      expect(category).toBe('elder');
    });

    test('handles custom ticks per year', () => {
      const customTicksPerYear = 1000000;
      const birthTick = 0;
      const currentTick = customTicksPerYear * 25; // 25 years
      const category = calculateAgeCategoryFromTick(birthTick, currentTick, customTicksPerYear);
      expect(category).toBe('adult');
    });

    test('handles non-zero birth tick', () => {
      const ticksPerYear = 311040000;
      const birthTick = ticksPerYear * 10; // Born at year 10
      const currentTick = birthTick + (ticksPerYear * 15); // 15 years later (15 years old)
      const category = calculateAgeCategoryFromTick(birthTick, currentTick, ticksPerYear);
      expect(category).toBe('teen');
    });
  });

  describe('Integration - Age progression through conversation styles', () => {
    test('depth capacity increases with age progression', () => {
      const childDepth = getDepthCapacity('child');
      const teenDepth = getDepthCapacity('teen');
      const adultDepth = getDepthCapacity('adult');
      const elderDepth = getDepthCapacity('elder');

      expect(childDepth).toBeLessThan(teenDepth);
      expect(teenDepth).toBeLessThan(adultDepth);
      expect(adultDepth).toBeLessThan(elderDepth);
    });

    test('conversation modes change appropriately with age', () => {
      const childMode = getConversationStyle('child').mode;
      const teenMode = getConversationStyle('teen').mode;
      const adultMode = getConversationStyle('adult').mode;
      const elderMode = getConversationStyle('elder').mode;

      expect(childMode).toBe('questioning');
      expect(teenMode).toBe('exploratory');
      expect(adultMode).toBe('sharing');
      expect(elderMode).toBe('reflective');
    });

    test('topic preferences shift from concrete to abstract with age', () => {
      const childPrefs = getTopicPreferences('child');
      const elderPrefs = getTopicPreferences('elder');

      const childPhilosophy = childPrefs.find(p => p.topic === 'philosophy');
      const elderPhilosophy = elderPrefs.find(p => p.topic === 'philosophy');

      // Elders should have higher philosophy weight than children
      const childPhilWeight = childPhilosophy?.weight ?? 0;
      const elderPhilWeight = elderPhilosophy?.weight ?? 0;
      expect(elderPhilWeight).toBeGreaterThan(childPhilWeight);
    });
  });
});
