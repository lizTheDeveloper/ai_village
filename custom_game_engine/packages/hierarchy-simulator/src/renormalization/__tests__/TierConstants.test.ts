import { describe, it, expect } from 'vitest';
import {
  TIME_SCALE,
  TIER_LEVEL_INDEX,
  getTimeScale,
  getTierIndex,
  isHigherTier,
  SUMMARIZATION_RULES,
  BELIEF_CONSTANTS,
  POPULATION_CONSTANTS,
} from '../TierConstants.js';
import type { TierLevel } from '../../abstraction/types.js';

describe('TierConstants', () => {
  describe('TIME_SCALE', () => {
    it('should have correct time scales for all tiers', () => {
      expect(TIME_SCALE.tile).toBe(1);
      expect(TIME_SCALE.chunk).toBe(1);
      expect(TIME_SCALE.zone).toBe(60);
      expect(TIME_SCALE.region).toBe(1440);
      expect(TIME_SCALE.subsection).toBe(10080);
      expect(TIME_SCALE.megasegment).toBe(43200);
      expect(TIME_SCALE.gigasegment).toBe(525600);
    });

    it('should have increasing time scales as tier level increases', () => {
      const tiers: TierLevel[] = ['tile', 'chunk', 'zone', 'region', 'subsection', 'megasegment', 'gigasegment'];
      for (let i = 1; i < tiers.length; i++) {
        expect(TIME_SCALE[tiers[i]]).toBeGreaterThanOrEqual(TIME_SCALE[tiers[i - 1]]);
      }
    });

    it('zone should represent 1 hour (60 minutes)', () => {
      expect(TIME_SCALE.zone).toBe(60);
    });

    it('region should represent 1 day (24 hours = 1440 minutes)', () => {
      expect(TIME_SCALE.region).toBe(1440);
    });

    it('gigasegment should represent 1 year (525600 minutes)', () => {
      expect(TIME_SCALE.gigasegment).toBe(525600);
    });
  });

  describe('TIER_LEVEL_INDEX', () => {
    it('should have sequential indices for all tiers', () => {
      expect(TIER_LEVEL_INDEX.tile).toBe(0);
      expect(TIER_LEVEL_INDEX.chunk).toBe(1);
      expect(TIER_LEVEL_INDEX.zone).toBe(2);
      expect(TIER_LEVEL_INDEX.region).toBe(3);
      expect(TIER_LEVEL_INDEX.subsection).toBe(4);
      expect(TIER_LEVEL_INDEX.megasegment).toBe(5);
      expect(TIER_LEVEL_INDEX.gigasegment).toBe(6);
    });
  });

  describe('getTimeScale', () => {
    it('should return correct time scale for valid tiers', () => {
      expect(getTimeScale('chunk')).toBe(1);
      expect(getTimeScale('zone')).toBe(60);
      expect(getTimeScale('gigasegment')).toBe(525600);
    });

    it('should return 1 for invalid tier', () => {
      expect(getTimeScale('invalid' as TierLevel)).toBe(1);
    });
  });

  describe('getTierIndex', () => {
    it('should return correct index for valid tiers', () => {
      expect(getTierIndex('tile')).toBe(0);
      expect(getTierIndex('gigasegment')).toBe(6);
    });

    it('should return 0 for invalid tier', () => {
      expect(getTierIndex('invalid' as TierLevel)).toBe(0);
    });
  });

  describe('isHigherTier', () => {
    it('should return true when first tier is higher', () => {
      expect(isHigherTier('gigasegment', 'chunk')).toBe(true);
      expect(isHigherTier('region', 'zone')).toBe(true);
      expect(isHigherTier('zone', 'tile')).toBe(true);
    });

    it('should return false when first tier is lower', () => {
      expect(isHigherTier('chunk', 'gigasegment')).toBe(false);
      expect(isHigherTier('zone', 'region')).toBe(false);
    });

    it('should return false when tiers are equal', () => {
      expect(isHigherTier('zone', 'zone')).toBe(false);
      expect(isHigherTier('chunk', 'chunk')).toBe(false);
    });
  });

  describe('SUMMARIZATION_RULES', () => {
    it('should have rules for all tier levels', () => {
      const tiers: TierLevel[] = ['tile', 'chunk', 'zone', 'region', 'subsection', 'megasegment', 'gigasegment'];
      for (const tier of tiers) {
        expect(SUMMARIZATION_RULES[tier]).toBeDefined();
        expect(SUMMARIZATION_RULES[tier].sum).toBeInstanceOf(Array);
        expect(SUMMARIZATION_RULES[tier].average).toBeInstanceOf(Array);
        expect(SUMMARIZATION_RULES[tier].computed).toBeInstanceOf(Array);
        expect(SUMMARIZATION_RULES[tier].preserved).toBeInstanceOf(Array);
        expect(SUMMARIZATION_RULES[tier].lost).toBeInstanceOf(Array);
      }
    });

    it('tile level should preserve all (full ECS)', () => {
      expect(SUMMARIZATION_RULES.tile.preserved).toContain('all');
      expect(SUMMARIZATION_RULES.tile.lost.length).toBe(0);
    });

    it('chunk level should preserve named NPCs and buildings', () => {
      expect(SUMMARIZATION_RULES.chunk.preserved).toContain('named_npcs');
      expect(SUMMARIZATION_RULES.chunk.preserved).toContain('buildings');
    });

    it('zone level should preserve governor and temples', () => {
      expect(SUMMARIZATION_RULES.zone.preserved).toContain('governor');
      expect(SUMMARIZATION_RULES.zone.preserved).toContain('temples');
    });

    it('megasegment level should preserve civilizations and megastructures', () => {
      expect(SUMMARIZATION_RULES.megasegment.preserved).toContain('civilizations');
      expect(SUMMARIZATION_RULES.megasegment.preserved).toContain('megastructures');
    });
  });

  describe('BELIEF_CONSTANTS', () => {
    it('should have positive word-of-mouth rate', () => {
      expect(BELIEF_CONSTANTS.WORD_OF_MOUTH_RATE).toBeGreaterThan(0);
    });

    it('should have positive temple bonus', () => {
      expect(BELIEF_CONSTANTS.TEMPLE_BONUS).toBeGreaterThan(0);
    });

    it('should have miracle bonus greater than temple bonus', () => {
      expect(BELIEF_CONSTANTS.MIRACLE_BONUS).toBeGreaterThan(BELIEF_CONSTANTS.TEMPLE_BONUS);
    });

    it('should have small natural decay rate', () => {
      expect(BELIEF_CONSTANTS.NATURAL_DECAY).toBeGreaterThan(0);
      expect(BELIEF_CONSTANTS.NATURAL_DECAY).toBeLessThan(0.01);
    });

    it('should have faith threshold between 0 and 1', () => {
      expect(BELIEF_CONSTANTS.FAITH_THRESHOLD).toBeGreaterThan(0);
      expect(BELIEF_CONSTANTS.FAITH_THRESHOLD).toBeLessThan(1);
    });
  });

  describe('POPULATION_CONSTANTS', () => {
    it('should have positive birth rate', () => {
      expect(POPULATION_CONSTANTS.BASE_BIRTH_RATE).toBeGreaterThan(0);
    });

    it('should have positive death rate', () => {
      expect(POPULATION_CONSTANTS.BASE_DEATH_RATE).toBeGreaterThan(0);
    });

    it('should have birth rate greater than death rate (population growth)', () => {
      expect(POPULATION_CONSTANTS.BASE_BIRTH_RATE).toBeGreaterThan(POPULATION_CONSTANTS.BASE_DEATH_RATE);
    });

    it('should have food production per worker greater than consumption per capita', () => {
      expect(POPULATION_CONSTANTS.FOOD_PRODUCTION_PER_WORKER).toBeGreaterThan(
        POPULATION_CONSTANTS.FOOD_CONSUMPTION_PER_CAPITA
      );
    });

    it('should have positive tech production bonus', () => {
      expect(POPULATION_CONSTANTS.TECH_PRODUCTION_BONUS).toBeGreaterThan(0);
    });
  });
});
