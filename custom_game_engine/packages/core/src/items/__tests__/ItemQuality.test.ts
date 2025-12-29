import { describe, it, expect, beforeEach } from 'vitest';
import type { ItemQuality } from '../ItemQuality';
import {
  getQualityTier,
  getQualityColor,
  getQualityDisplayName,
  getQualityPriceMultiplier,
  calculateCraftingQuality
} from '../ItemQuality';
import { createSkillsComponent } from '../../components/SkillsComponent';
import type { SkillsComponent, SkillId } from '../../components/SkillsComponent';

describe('ItemQuality', () => {
  describe('Quality Tier Mapping', () => {
    it('should map 0-30 to poor quality', () => {
      expect(getQualityTier(0)).toBe('poor');
      expect(getQualityTier(15)).toBe('poor');
      expect(getQualityTier(30)).toBe('poor');
    });

    it('should map 31-60 to normal quality', () => {
      expect(getQualityTier(31)).toBe('normal');
      expect(getQualityTier(45)).toBe('normal');
      expect(getQualityTier(60)).toBe('normal');
    });

    it('should map 61-85 to fine quality', () => {
      expect(getQualityTier(61)).toBe('fine');
      expect(getQualityTier(73)).toBe('fine');
      expect(getQualityTier(85)).toBe('fine');
    });

    it('should map 86-95 to masterwork quality', () => {
      expect(getQualityTier(86)).toBe('masterwork');
      expect(getQualityTier(90)).toBe('masterwork');
      expect(getQualityTier(95)).toBe('masterwork');
    });

    it('should map 96-100 to legendary quality', () => {
      expect(getQualityTier(96)).toBe('legendary');
      expect(getQualityTier(98)).toBe('legendary');
      expect(getQualityTier(100)).toBe('legendary');
    });

    it('should throw when quality is below 0', () => {
      expect(() => getQualityTier(-1)).toThrow('Quality must be between 0-100, got -1');
    });

    it('should throw when quality is above 100', () => {
      expect(() => getQualityTier(101)).toThrow('Quality must be between 0-100, got 101');
    });
  });

  describe('Quality Display Names', () => {
    it('should return correct display names for each tier', () => {
      expect(getQualityDisplayName('poor')).toBe('Poor');
      expect(getQualityDisplayName('normal')).toBe('Normal');
      expect(getQualityDisplayName('fine')).toBe('Fine');
      expect(getQualityDisplayName('masterwork')).toBe('Masterwork');
      expect(getQualityDisplayName('legendary')).toBe('Legendary');
    });
  });

  describe('Quality Color Mapping', () => {
    it('should return gray for poor quality', () => {
      expect(getQualityColor('poor')).toBe('#888888');
    });

    it('should return white for normal quality', () => {
      expect(getQualityColor('normal')).toBe('#ffffff');
    });

    it('should return green for fine quality', () => {
      expect(getQualityColor('fine')).toBe('#4CAF50');
    });

    it('should return blue for masterwork quality', () => {
      expect(getQualityColor('masterwork')).toBe('#2196F3');
    });

    it('should return gold for legendary quality', () => {
      expect(getQualityColor('legendary')).toBe('#FFD700');
    });
  });

  describe('Quality Economic Multiplier', () => {
    it('should calculate 0.5x multiplier for quality 0', () => {
      expect(getQualityPriceMultiplier(0)).toBeCloseTo(0.5, 2);
    });

    it('should calculate 0.8x multiplier for quality 20 (poor)', () => {
      expect(getQualityPriceMultiplier(20)).toBeCloseTo(0.8, 2);
    });

    it('should calculate 1.0x multiplier for quality 33 (normal)', () => {
      expect(getQualityPriceMultiplier(33)).toBeCloseTo(0.995, 2);
    });

    it('should calculate 1.25x multiplier for quality 50 (normal)', () => {
      expect(getQualityPriceMultiplier(50)).toBeCloseTo(1.25, 2);
    });

    it('should calculate 1.5x multiplier for quality 67 (fine)', () => {
      expect(getQualityPriceMultiplier(67)).toBeCloseTo(1.505, 2);
    });

    it('should calculate 1.8x multiplier for quality 87 (masterwork)', () => {
      expect(getQualityPriceMultiplier(87)).toBeCloseTo(1.805, 2);
    });

    it('should calculate 2.0x multiplier for quality 100 (legendary)', () => {
      expect(getQualityPriceMultiplier(100)).toBeCloseTo(2.0, 2);
    });

    it('should throw when quality is negative', () => {
      expect(() => getQualityPriceMultiplier(-5)).toThrow('Quality must be between 0-100, got -5');
    });

    it('should throw when quality exceeds 100', () => {
      expect(() => getQualityPriceMultiplier(105)).toThrow('Quality must be between 0-100, got 105');
    });
  });

  describe('Crafting Quality Calculation', () => {
    let skills: SkillsComponent;

    beforeEach(() => {
      // Create a real skills component using factory function
      skills = createSkillsComponent();
    });

    it('should calculate base quality for novice (skill level 1)', () => {
      skills.levels.crafting = 1;

      // Run multiple times to test variance
      const qualities: number[] = [];
      for (let i = 0; i < 100; i++) {
        const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread', 0.1);
        qualities.push(quality);
      }

      // Base multiplier: 0.7 + (1 * 0.1) = 0.8 -> 80 quality
      // Variance: ±10% -> range 70-90
      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      expect(avgQuality).toBeGreaterThanOrEqual(70);
      expect(avgQuality).toBeLessThanOrEqual(90);
    });

    it('should calculate higher quality for expert (skill level 5)', () => {
      skills.levels.crafting = 5;

      const qualities: number[] = [];
      for (let i = 0; i < 100; i++) {
        const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread', 0.1);
        qualities.push(quality);
      }

      // Base multiplier: 0.7 + (5 * 0.1) = 1.2 -> 120 quality, clamped to 100
      // With variance: range 100-100 (all clamped)
      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      expect(avgQuality).toBeGreaterThanOrEqual(95);
      expect(avgQuality).toBeLessThanOrEqual(100);
    });

    it('should clamp quality to minimum 0', () => {
      skills.levels.crafting = 0;

      const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread', 0);
      expect(quality).toBeGreaterThanOrEqual(0);
    });

    it('should clamp quality to maximum 100', () => {
      skills.levels.crafting = 5;

      const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread', 0);
      expect(quality).toBeLessThanOrEqual(100);
    });

    it('should produce consistent quality with no variance', () => {
      skills.levels.crafting = 3;

      const qualities: number[] = [];
      for (let i = 0; i < 10; i++) {
        const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread', 0);
        qualities.push(quality);
      }

      // All qualities should be identical with variance=0
      const first = qualities[0];
      for (const q of qualities) {
        expect(q).toBe(first);
      }
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should handle missing skill level gracefully', () => {
      const skills = createSkillsComponent();
      skills.levels.crafting = 0;

      const quality = calculateCraftingQuality(skills, 'crafting', 'wheat_bread');
      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(100);
    });
  });
});
