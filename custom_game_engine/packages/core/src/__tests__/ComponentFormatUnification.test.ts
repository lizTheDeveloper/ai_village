/**
 * Tests for Component Format Unification
 *
 * These tests verify the acceptance criteria for unifying component formats:
 * 1. Single format per component (class-based only)
 * 2. Helper functions use single type (not union types)
 * 3. 0-1 scale standardized (not 0-100)
 * 4. No factory functions for legacy formats
 * 5. Memory components clarified
 *
 * ALL TESTS SHOULD FAIL INITIALLY (TDD red phase)
 */

import { describe, it, expect } from 'vitest';
import {
  NeedsComponent,
  isHungry,
  isStarving,
  isTired,
  isHealthCritical,
  isDying,
} from '../components/NeedsComponent.js';
import {
  PersonalityComponent,
  getPersonalityDescription,
} from '../components/PersonalityComponent.js';

describe('Component Format Unification', () => {
  describe('Criterion 1: Single Format Per Component', () => {
    describe('NeedsComponent', () => {
      it('should not export NeedsComponentLegacy interface', () => {
        // Attempt to import the legacy interface should fail after migration
        // @ts-expect-error - NeedsComponentLegacy should not exist
        const shouldNotExist: typeof import('../components/NeedsComponent.js').NeedsComponentLegacy = undefined;
        expect(shouldNotExist).toBeUndefined();
      });

      it('should not export createNeedsComponent factory function', async () => {
        // Check that the factory function doesn't exist in the module
        const module = await import('../components/NeedsComponent.js');
        expect(module.createNeedsComponent).toBeUndefined();
      });

      it('should only have class-based NeedsComponent', () => {
        const needs = new NeedsComponent();
        expect(needs).toBeInstanceOf(NeedsComponent);
        expect(needs.type).toBe('needs');
      });
    });

    describe('PersonalityComponent', () => {
      it('should not export PersonalityComponentLegacy interface', () => {
        // @ts-expect-error - PersonalityComponentLegacy should not exist
        const shouldNotExist: typeof import('../components/PersonalityComponent.js').PersonalityComponentLegacy = undefined;
        expect(shouldNotExist).toBeUndefined();
      });

      it('should not export createPersonalityComponent factory function', async () => {
        const module = await import('../components/PersonalityComponent.js');
        expect(module.createPersonalityComponent).toBeUndefined();
      });

      it('should not export generateRandomPersonality factory function', async () => {
        const module = await import('../components/PersonalityComponent.js');
        expect(module.generateRandomPersonality).toBeUndefined();
      });

      it('should only have class-based PersonalityComponent', () => {
        const personality = new PersonalityComponent({
          openness: 0.7,
          conscientiousness: 0.5,
          extraversion: 0.6,
          agreeableness: 0.8,
          neuroticism: 0.3,
        });
        expect(personality).toBeInstanceOf(PersonalityComponent);
        expect(personality.type).toBe('personality');
      });
    });
  });

  describe('Criterion 2: Helper Functions Use Single Type', () => {
    describe('NeedsComponent helper functions', () => {
      it('isHungry should accept only NeedsComponent, not union type', () => {
        const needs = new NeedsComponent();
        needs.hunger = 0.3; // 30% - should be hungry

        const result = isHungry(needs);

        expect(result).toBe(true);
        // Should NOT handle legacy 0-100 scale with || logic
        expect(result).not.toBe(needs.hunger < 40 || needs.hunger < 0.4);
      });

      it('isHungry should not use || fallback logic', () => {
        const needs = new NeedsComponent();
        needs.hunger = 0.5; // 50% - not hungry

        // If helper still has || logic, this would incorrectly return true
        // because 0.5 < 40 (treating it as legacy 0-100 scale)
        const result = isHungry(needs);

        expect(result).toBe(false); // Should be false, not true
      });

      it('isStarving should only check 0-1 scale', () => {
        const needs = new NeedsComponent();
        needs.hunger = 0.05; // 5% - starving

        const result = isStarving(needs);

        expect(result).toBe(true);
      });

      it('isTired should only check 0-1 scale', () => {
        const needs = new NeedsComponent();
        needs.energy = 0.2; // 20% - tired

        const result = isTired(needs);

        expect(result).toBe(true);
      });

      it('isHealthCritical should only check 0-1 scale', () => {
        const needs = new NeedsComponent();
        needs.health = 0.15; // 15% - critical

        const result = isHealthCritical(needs);

        expect(result).toBe(true);
      });

      it('isDying should only check 0-1 scale', () => {
        const needs = new NeedsComponent();
        needs.health = 0.03; // 3% - dying

        const result = isDying(needs);

        expect(result).toBe(true);
      });
    });

    describe('PersonalityComponent helper functions', () => {
      it('getPersonalityDescription should accept only PersonalityComponent', () => {
        const personality = new PersonalityComponent({
          openness: 0.8,
          conscientiousness: 0.5,
          extraversion: 0.7,
          agreeableness: 0.6,
          neuroticism: 0.4,
        });

        const description = getPersonalityDescription(personality);

        expect(description).toContain('curious'); // openness > 0.7
        expect(description).toContain('outgoing'); // extraversion > 0.7
      });

      it('getPersonalityDescription should use 0-1 scale thresholds', () => {
        const personality = new PersonalityComponent({
          openness: 0.75, // Should trigger "curious" (> 0.7)
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        });

        const description = getPersonalityDescription(personality);

        // Should use 0.7 threshold, not 70
        expect(description).toContain('curious');
      });
    });
  });

  describe('Criterion 3: 0-1 Scale Standardized', () => {
    it('NeedsComponent should initialize with 0-1 scale values', () => {
      const needs = new NeedsComponent();

      expect(needs.hunger).toBeGreaterThanOrEqual(0);
      expect(needs.hunger).toBeLessThanOrEqual(1);
      expect(needs.energy).toBeGreaterThanOrEqual(0);
      expect(needs.energy).toBeLessThanOrEqual(1);
      expect(needs.health).toBeGreaterThanOrEqual(0);
      expect(needs.health).toBeLessThanOrEqual(1);
      expect(needs.thirst).toBeGreaterThanOrEqual(0);
      expect(needs.thirst).toBeLessThanOrEqual(1);
      expect(needs.social).toBeGreaterThanOrEqual(0);
      expect(needs.social).toBeLessThanOrEqual(1);
      expect(needs.stimulation).toBeGreaterThanOrEqual(0);
      expect(needs.stimulation).toBeLessThanOrEqual(1);
    });

    it('NeedsComponent default values should be in 0-1 range', () => {
      const needs = new NeedsComponent();

      // Default should be 1.0 (full), not 100
      expect(needs.hunger).toBe(1.0);
      expect(needs.energy).toBe(1.0);
      expect(needs.health).toBe(1.0);
      expect(needs.thirst).toBe(1.0);
    });

    it('PersonalityComponent should use 0-1 scale values', () => {
      const personality = new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.5,
        extraversion: 0.6,
        agreeableness: 0.8,
        neuroticism: 0.3,
      });

      expect(personality.openness).toBe(0.7);
      expect(personality.conscientiousness).toBe(0.5);
      expect(personality.extraversion).toBe(0.6);
      expect(personality.agreeableness).toBe(0.8);
      expect(personality.neuroticism).toBe(0.3);
    });

    it('PersonalityComponent derived traits should be in 0-1 range', () => {
      const personality = new PersonalityComponent({
        openness: 0.8,
        conscientiousness: 0.7,
        extraversion: 0.6,
        agreeableness: 0.5,
        neuroticism: 0.4,
      });

      expect(personality.workEthic).toBeGreaterThanOrEqual(0);
      expect(personality.workEthic).toBeLessThanOrEqual(1);
      expect(personality.creativity).toBeGreaterThanOrEqual(0);
      expect(personality.creativity).toBeLessThanOrEqual(1);
      expect(personality.generosity).toBeGreaterThanOrEqual(0);
      expect(personality.generosity).toBeLessThanOrEqual(1);
      expect(personality.leadership).toBeGreaterThanOrEqual(0);
      expect(personality.leadership).toBeLessThanOrEqual(1);
    });
  });

  describe('Criterion 4: No Factory Functions for Legacy', () => {
    it('should not have createNeedsComponent factory', async () => {
      const module = await import('../components/NeedsComponent.js');

      expect(module.createNeedsComponent).toBeUndefined();
    });

    it('should create NeedsComponent using constructor only', () => {
      const needs = new NeedsComponent();

      expect(needs).toBeInstanceOf(NeedsComponent);
      expect(needs.type).toBe('needs');
    });

    it('should not have createPersonalityComponent factory', async () => {
      const module = await import('../components/PersonalityComponent.js');

      expect(module.createPersonalityComponent).toBeUndefined();
    });

    it('should not have generateRandomPersonality factory', async () => {
      const module = await import('../components/PersonalityComponent.js');

      expect(module.generateRandomPersonality).toBeUndefined();
    });

    it('should create PersonalityComponent using constructor only', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });

      expect(personality).toBeInstanceOf(PersonalityComponent);
      expect(personality.type).toBe('personality');
    });
  });

  describe('Criterion 5: Memory Components Clarified', () => {
    it('should not have MemoryComponentClass.ts file', () => {
      // After migration, MemoryComponentClass.ts should be renamed or merged
      // This test will pass when the file is removed/renamed
      expect(() => {
        require('../components/MemoryComponentClass.js');
      }).toThrow();
    });

    it('should have single Memory component with clear purpose', async () => {
      // After migration, there should be only one Memory component
      const MemoryModule = await import('../components/MemoryComponent.js');

      // Should export only one Memory component type
      expect(MemoryModule.MemoryComponent).toBeDefined();
      // Should not have confusion between two different implementations
    });
  });

  describe('Error Handling: No Silent Fallbacks (CLAUDE.md compliance)', () => {
    it('NeedsComponent should not silently handle missing fields', () => {
      // Per CLAUDE.md, NO silent fallbacks
      // If constructor accepts parameters in future, it should throw on missing required fields
      expect(() => {
        const needs = new NeedsComponent();
        // Should be valid - no parameters required currently
        expect(needs).toBeInstanceOf(NeedsComponent);
      }).not.toThrow();
    });

    it('PersonalityComponent should throw on missing required traits', () => {
      // Per CLAUDE.md, NO silent fallbacks
      expect(() => {
        // @ts-expect-error - Testing runtime error handling
        new PersonalityComponent({
          openness: 0.5,
          // Missing required fields
        });
      }).toThrow();
    });

    it('PersonalityComponent should throw on invalid trait values', () => {
      expect(() => {
        new PersonalityComponent({
          openness: 1.5, // Invalid: > 1.0
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        });
      }).toThrow(/invalid|range|0-1/i);
    });

    it('helper functions should throw on invalid input, not use fallbacks', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error handling
        isHungry(null);
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing runtime error handling
        isHungry(undefined);
      }).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('NeedsComponent type should be lowercase string', () => {
      const needs = new NeedsComponent();

      expect(needs.type).toBe('needs');
      expect(needs.type).not.toBe('Needs');
      expect(needs.type).not.toBe('NEEDS');
    });

    it('PersonalityComponent type should be lowercase string', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });

      expect(personality.type).toBe('personality');
      expect(personality.type).not.toBe('Personality');
    });
  });

  describe('Migration Compatibility', () => {
    it('should provide migration function for legacy NeedsComponent data', async () => {
      // After implementation, should have migration helper
      const module = await import('../components/NeedsComponent.js');

      expect(module.migrateNeedsComponent).toBeDefined();
      expect(typeof module.migrateNeedsComponent).toBe('function');
    });

    it('migrateNeedsComponent should convert 0-100 scale to 0-1 scale', async () => {
      const module = await import('../components/NeedsComponent.js');
      const { migrateNeedsComponent } = module;

      const legacyData = {
        hunger: 80, // 0-100 scale
        energy: 60,
        health: 90,
        thirst: 70,
      };

      const migrated = migrateNeedsComponent(legacyData);

      expect(migrated.hunger).toBe(0.8);
      expect(migrated.energy).toBe(0.6);
      expect(migrated.health).toBe(0.9);
      expect(migrated.thirst).toBe(0.7);
    });

    it('migrateNeedsComponent should preserve already-migrated 0-1 scale data', async () => {
      const module = await import('../components/NeedsComponent.js');
      const { migrateNeedsComponent } = module;

      const alreadyMigrated = {
        hunger: 0.8, // Already 0-1 scale
        energy: 0.6,
        health: 0.9,
        thirst: 0.7,
      };

      const migrated = migrateNeedsComponent(alreadyMigrated);

      expect(migrated.hunger).toBe(0.8);
      expect(migrated.energy).toBe(0.6);
      expect(migrated.health).toBe(0.9);
      expect(migrated.thirst).toBe(0.7);
    });
  });
});
