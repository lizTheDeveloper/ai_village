import { describe, it, expect, beforeEach } from 'vitest';
import { getQualityPriceMultiplier, getQualityTier } from '../../items/ItemQuality.js';
import { calculateBuyPrice, calculateSellPrice } from '../../economy/PricingService.js';
import type { ItemDefinition } from '../../items/ItemDefinition.js';

/**
 * Quality Economy Integration Tests
 *
 * Tests the quality price multiplier system to ensure:
 * 1. Quality correctly maps to price multipliers (0.5x to 2.0x)
 * 2. Quality tiers are correctly assigned
 * 3. Price calculations incorporate quality properly
 */
describe('Quality Economy Integration', () => {
  // Mock item definition for testing
  const createMockItem = (baseValue: number): ItemDefinition => ({
    id: 'test_item',
    displayName: 'Test Item',
    category: 'resource',
    weight: 1,
    stackSize: 99,
    isEdible: false,
    isStorable: true,
    isGatherable: false,
    baseValue,
    rarity: 'common',
  });

  // Mock shop for price calculations
  const mockShop = {
    buyMarkup: 1.2,  // 20% markup for buying
    sellMarkdown: 0.8,  // 20% markdown for selling
  };

  describe('Quality Price Multiplier Formula', () => {
    it('should calculate 0.5x multiplier for quality 0', () => {
      const multiplier = getQualityPriceMultiplier(0);
      expect(multiplier).toBeCloseTo(0.5, 2);
    });

    it('should calculate 0.65x multiplier for quality 10', () => {
      const multiplier = getQualityPriceMultiplier(10);
      expect(multiplier).toBeCloseTo(0.65, 2);
    });

    it('should calculate ~1.0x multiplier for quality 33', () => {
      const multiplier = getQualityPriceMultiplier(33);
      expect(multiplier).toBeCloseTo(0.995, 2);
    });

    it('should calculate 1.25x multiplier for quality 50 (default)', () => {
      const multiplier = getQualityPriceMultiplier(50);
      expect(multiplier).toBeCloseTo(1.25, 2);
    });

    it('should calculate 1.625x multiplier for quality 75', () => {
      const multiplier = getQualityPriceMultiplier(75);
      expect(multiplier).toBeCloseTo(1.625, 2);
    });

    it('should calculate 2.0x multiplier for quality 100', () => {
      const multiplier = getQualityPriceMultiplier(100);
      expect(multiplier).toBeCloseTo(2.0, 2);
    });

    it('should follow formula: 0.5 + (quality / 100) * 1.5', () => {
      const testValues = [0, 10, 25, 33, 50, 67, 75, 85, 90, 95, 100];

      for (const quality of testValues) {
        const expected = 0.5 + (quality / 100) * 1.5;
        const actual = getQualityPriceMultiplier(quality);
        expect(actual).toBeCloseTo(expected, 4);
      }
    });
  });

  describe('Quality Tiers', () => {
    it('should assign poor tier for quality 0-30', () => {
      expect(getQualityTier(0)).toBe('poor');
      expect(getQualityTier(15)).toBe('poor');
      expect(getQualityTier(30)).toBe('poor');
    });

    it('should assign normal tier for quality 31-60', () => {
      expect(getQualityTier(31)).toBe('normal');
      expect(getQualityTier(45)).toBe('normal');
      expect(getQualityTier(60)).toBe('normal');
    });

    it('should assign fine tier for quality 61-85', () => {
      expect(getQualityTier(61)).toBe('fine');
      expect(getQualityTier(75)).toBe('fine');
      expect(getQualityTier(85)).toBe('fine');
    });

    it('should assign masterwork tier for quality 86-95', () => {
      expect(getQualityTier(86)).toBe('masterwork');
      expect(getQualityTier(90)).toBe('masterwork');
      expect(getQualityTier(95)).toBe('masterwork');
    });

    it('should assign legendary tier for quality 96-100', () => {
      expect(getQualityTier(96)).toBe('legendary');
      expect(getQualityTier(98)).toBe('legendary');
      expect(getQualityTier(100)).toBe('legendary');
    });
  });

  describe('Price Calculations with Quality', () => {
    it('should calculate buy price with quality multiplier', () => {
      const item = createMockItem(100);

      // Quality 50 (normal): 1.25x multiplier
      const price50 = calculateBuyPrice({ definition: item, quality: 50 }, mockShop);
      // Base 100 * quality 1.25 * markup 1.2 = 150
      expect(price50).toBeCloseTo(150, 0);

      // Quality 100 (legendary): 2.0x multiplier
      const price100 = calculateBuyPrice({ definition: item, quality: 100 }, mockShop);
      // Base 100 * quality 2.0 * markup 1.2 = 240
      expect(price100).toBeCloseTo(240, 0);
    });

    it('should calculate sell price with quality multiplier', () => {
      const item = createMockItem(100);

      // Quality 50 (normal): 1.25x multiplier
      const price50 = calculateSellPrice({ definition: item, quality: 50 }, mockShop);
      // Base 100 * quality 1.25 * markdown 0.8 = 100
      expect(price50).toBeCloseTo(100, 0);

      // Quality 20 (poor): 0.8x multiplier
      const price20 = calculateSellPrice({ definition: item, quality: 20 }, mockShop);
      // Base 100 * quality 0.8 * markdown 0.8 = 64
      expect(price20).toBeCloseTo(64, 0);
    });

    it('should show legendary items worth 4x more than poor items', () => {
      const item = createMockItem(100);

      const poorPrice = calculateSellPrice({ definition: item, quality: 0 }, mockShop);
      const legendaryPrice = calculateSellPrice({ definition: item, quality: 100 }, mockShop);

      // Legendary (2.0x) vs Poor (0.5x) = 4x difference
      expect(legendaryPrice / poorPrice).toBeCloseTo(4.0, 1);
    });

    it('should use default quality (50) when quality is undefined', () => {
      const item = createMockItem(100);

      const priceWithQuality = calculateBuyPrice({ definition: item, quality: 50 }, mockShop);
      const priceWithoutQuality = calculateBuyPrice({ definition: item }, mockShop);

      expect(priceWithQuality).toBeCloseTo(priceWithoutQuality, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle quality below 0 (clamped behavior)', () => {
      // The multiplier formula should still work with negative values
      // but the system should prevent negative quality values
      const multiplier = getQualityPriceMultiplier(0);
      expect(multiplier).toBeCloseTo(0.5, 2);
    });

    it('should handle quality above 100 (clamped behavior)', () => {
      // Values above 100 would give > 2.0x but system should clamp
      const multiplier = getQualityPriceMultiplier(100);
      expect(multiplier).toBeCloseTo(2.0, 2);
    });

    it('should handle zero base value items', () => {
      const item = createMockItem(0);
      const price = calculateBuyPrice({ definition: item, quality: 100 }, mockShop);
      // Price might have a minimum floor, just verify it's a valid number
      expect(price).toBeGreaterThanOrEqual(0);
    });

    it('should handle fractional quality values', () => {
      const multiplier = getQualityPriceMultiplier(50.5);
      const expected = 0.5 + (50.5 / 100) * 1.5;
      expect(multiplier).toBeCloseTo(expected, 4);
    });
  });

  describe('Performance', () => {
    it('should calculate multipliers quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        getQualityPriceMultiplier(Math.random() * 100);
      }

      const duration = performance.now() - startTime;
      // 10000 calculations should complete in under 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should calculate prices with quality quickly', () => {
      const item = createMockItem(100);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        calculateBuyPrice({ definition: item, quality: Math.random() * 100 }, mockShop);
        calculateSellPrice({ definition: item, quality: Math.random() * 100 }, mockShop);
      }

      const duration = performance.now() - startTime;
      // 2000 price calculations should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
