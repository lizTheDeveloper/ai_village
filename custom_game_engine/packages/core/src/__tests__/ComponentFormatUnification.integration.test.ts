import { ComponentType } from '../types/ComponentType.js';
/**
 * Integration Tests for Component Format Unification
 *
 * These tests verify that systems using components work correctly
 * with the unified format (no legacy formats).
 *
 * Tests include:
 * - Systems that read/write NeedsComponent
 * - Systems that use helper functions
 * - Cross-system component interactions
 *
 * ALL TESTS SHOULD FAIL INITIALLY (TDD red phase)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { NeedsComponent, isHungry, isTired } from '../components/NeedsComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';

describe('Component Format Unification - Integration Tests', () => {
  let world: World;
  let entity: EntityImpl;

  beforeEach(() => {
    // Create a minimal world for testing
    world = new World({
      gameTime: { tick: 0, hour: 6, dayOfYear: 1, season: 'spring' as const, year: 1 },
      eventBus: {
        on: () => () => {},
        off: () => {},
        emit: () => {},
      } as any,
    });
    entity = world.createEntity();
  });

  describe('NeedsComponent in Systems', () => {
    it('should create entity with NeedsComponent using constructor', () => {
      const needs = new NeedsComponent();
      (entity as any).addComponent(needs);

      const retrieved = entity.getComponent(ComponentType.Needs) as NeedsComponent;

      expect(retrieved).toBeInstanceOf(NeedsComponent);
      expect(retrieved.hunger).toBe(1.0);
      expect(retrieved.energy).toBe(1.0);
    });

    it('should not use createNeedsComponent factory in system code', () => {
      // Systems should use `new NeedsComponent()`, not factory
      const needs = new NeedsComponent();
      (entity as any).addComponent(needs);

      const retrieved = entity.getComponent(ComponentType.Needs) as NeedsComponent;

      // Should be class instance, not plain object from factory
      expect(retrieved).toBeInstanceOf(NeedsComponent);
      expect(retrieved.constructor.name).toBe('NeedsComponent');
    });

    it('should modify NeedsComponent values in 0-1 scale', () => {
      const needs = new NeedsComponent();
      (entity as any).addComponent(needs);

      // Simulate system modifying hunger
      needs.hunger = 0.3; // 30%
      needs.energy = 0.5; // 50%

      expect(needs.hunger).toBe(0.3);
      expect(needs.energy).toBe(0.5);
    });

    it('helper functions should work with NeedsComponent from entity', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.35; // 35% - hungry
      needs.energy = 0.25; // 25% - tired
      (entity as any).addComponent(needs);

      const retrieved = entity.getComponent(ComponentType.Needs) as NeedsComponent;

      expect(isHungry(retrieved)).toBe(true);
      expect(isTired(retrieved)).toBe(true);
    });

    it('should not mix legacy 0-100 and new 0-1 scales', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.5; // 50% in 0-1 scale
      (entity as any).addComponent(needs);

      // Helper should treat this as 50% (0.5), NOT as starving (0.5 < 10)
      expect(isHungry(needs)).toBe(false); // 50% is not hungry
    });
  });

  describe('PersonalityComponent in Systems', () => {
    it('should create entity with PersonalityComponent using constructor', () => {
      const personality = new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.5,
        extraversion: 0.6,
        agreeableness: 0.8,
        neuroticism: 0.3,
      });
      (entity as any).addComponent(personality);

      const retrieved = entity.getComponent(ComponentType.Personality) as PersonalityComponent;

      expect(retrieved).toBeInstanceOf(PersonalityComponent);
      expect(retrieved.openness).toBe(0.7);
      expect(retrieved.extraversion).toBe(0.6);
    });

    it('should not use createPersonalityComponent factory in system code', () => {
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });
      (entity as any).addComponent(personality);

      const retrieved = entity.getComponent(ComponentType.Personality) as PersonalityComponent;

      // Should be class instance, not plain object from factory
      expect(retrieved).toBeInstanceOf(PersonalityComponent);
      expect(retrieved.constructor.name).toBe('PersonalityComponent');
    });

    it('derived traits should be calculated from Big Five traits', () => {
      const personality = new PersonalityComponent({
        openness: 0.8,
        conscientiousness: 0.9,
        extraversion: 0.7,
        agreeableness: 0.6,
        neuroticism: 0.4,
      });

      // workEthic should derive from conscientiousness
      expect(personality.workEthic).toBe(0.9);
      // creativity should derive from openness
      expect(personality.creativity).toBe(0.8);
      // generosity should derive from agreeableness
      expect(personality.generosity).toBe(0.6);
      // leadership should be weighted combination
      expect(personality.leadership).toBeGreaterThan(0);
      expect(personality.leadership).toBeLessThanOrEqual(1);
    });
  });

  describe('Cross-System Component Interactions', () => {
    it('should handle entity with both NeedsComponent and PersonalityComponent', () => {
      const needs = new NeedsComponent();
      const personality = new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.5,
        extraversion: 0.6,
        agreeableness: 0.8,
        neuroticism: 0.3,
      });

      (entity as any).addComponent(needs);
      (entity as any).addComponent(personality);

      const retrievedNeeds = entity.getComponent(ComponentType.Needs) as NeedsComponent;
      const retrievedPersonality = entity.getComponent(ComponentType.Personality) as PersonalityComponent;

      expect(retrievedNeeds).toBeInstanceOf(NeedsComponent);
      expect(retrievedPersonality).toBeInstanceOf(PersonalityComponent);
    });

    it('should use consistent 0-1 scale across all components', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.3;
      needs.energy = 0.7;

      const personality = new PersonalityComponent({
        openness: 0.8,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.7,
        neuroticism: 0.4,
      });

      (entity as any).addComponent(needs);
      (entity as any).addComponent(personality);

      // All values should be 0-1 scale
      expect(needs.hunger).toBeGreaterThanOrEqual(0);
      expect(needs.hunger).toBeLessThanOrEqual(1);
      expect(personality.openness).toBeGreaterThanOrEqual(0);
      expect(personality.openness).toBeLessThanOrEqual(1);
    });
  });

  describe('System-Level Helper Function Usage', () => {
    it('NeedsSystem should use helper functions without type guards', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.35; // Hungry
      (entity as any).addComponent(needs);

      // Helper should work directly without checking for legacy format
      const hungry = isHungry(needs);

      expect(hungry).toBe(true);
      expect(typeof hungry).toBe('boolean');
    });

    it('behavior system should use helper functions consistently', () => {
      const needs = new NeedsComponent();
      needs.energy = 0.25; // Tired
      needs.hunger = 0.35; // Hungry
      (entity as any).addComponent(needs);

      // Simulate behavior system checking needs
      const shouldSeekFood = isHungry(needs);
      const shouldRest = isTired(needs);

      expect(shouldSeekFood).toBe(true);
      expect(shouldRest).toBe(true);
    });

    it('should not have performance overhead from union type checks', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.5;

      // Helper should be simple comparison, not complex || logic
      const startTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        isHungry(needs);
      }
      const endTime = performance.now();

      // Should be fast (< 10ms for 10k calls)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Component Queries and Filters', () => {
    it('should query entities with NeedsComponent class only', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      entity1.addComponent(new NeedsComponent());
      entity2.addComponent(new NeedsComponent());
      // entity3 has no needs

      // Note: World doesn't have getEntities() - this test verifies system integration
      // In actual implementation, systems would query entities differently
      const entities = [entity1, entity2, entity3];
      const entitiesWithNeeds = entities.filter(e =>
        e.hasComponent(ComponentType.Needs)
      );

      expect(entitiesWithNeeds.length).toBe(2);
    });

    it('should filter entities by needs thresholds', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      const needs1 = new NeedsComponent();
      needs1.hunger = 0.3; // Hungry
      const needs2 = new NeedsComponent();
      needs2.hunger = 0.6; // Not hungry
      const needs3 = new NeedsComponent();
      needs3.hunger = 0.05; // Starving

      entity1.addComponent(needs1);
      entity2.addComponent(needs2);
      entity3.addComponent(needs3);

      const entities = [entity1, entity2, entity3];
      const hungryEntities = entities.filter(e => {
        const needs = e.getComponent(ComponentType.Needs) as NeedsComponent | undefined;
        return needs && isHungry(needs);
      });

      expect(hungryEntities.length).toBe(2); // entity1 and entity3
    });
  });

  describe('Save/Load Compatibility', () => {
    it('should serialize NeedsComponent with 0-1 scale', () => {
      const needs = new NeedsComponent();
      needs.hunger = 0.7;
      needs.energy = 0.8;

      // Simulate serialization
      const serialized = JSON.parse(JSON.stringify(needs));

      expect(serialized.hunger).toBe(0.7);
      expect(serialized.energy).toBe(0.8);
      // Should NOT have legacy 0-100 values
      expect(serialized.hunger).not.toBe(70);
    });

    it('should handle loading legacy save data with migration', async () => {
      // Simulate loading old save file with 0-100 scale
      const legacyData = {
        hunger: 80, // Legacy 0-100
        energy: 60,
        health: 90,
      };

      const NeedsModule = await import('../components/NeedsComponent.js');
      const { migrateNeedsComponent } = NeedsModule;

      // Migration should convert to 0-1 scale
      const migrated = migrateNeedsComponent(legacyData);

      expect(migrated.hunger).toBe(0.8);
      expect(migrated.energy).toBe(0.6);
      expect(migrated.health).toBe(0.9);
    });
  });

  describe('Error Handling in Systems (CLAUDE.md compliance)', () => {
    it('should throw when helper function receives null/undefined', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error
        isHungry(null);
      }).toThrow('needs parameter is required');
    });

    it('should throw when helper function receives invalid data', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error
        isHungry({ hunger: 'invalid' });
      }).toThrow();
    });

    it('should throw when PersonalityComponent created with invalid values', () => {
      expect(() => {
        new PersonalityComponent({
          openness: 1.5, // Invalid: should be 0-1
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        });
      }).toThrow();
    });
  });

  describe('Type System Integration', () => {
    it('should enforce NeedsComponent type at compile time', () => {
      const needs = new NeedsComponent();
      (entity as any).addComponent(needs);

      // TypeScript should enforce correct type
      const retrieved = entity.getComponent(ComponentType.Needs);

      // Runtime check that type is correct
      expect((retrieved as NeedsComponent).type).toBe('needs');
    });

    it('component type string should be lowercase', () => {
      const needs = new NeedsComponent();
      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });

      // Per CLAUDE.md: component type strings MUST be lowercase
      expect(needs.type).toBe('needs');
      expect(personality.type).toBe('personality');
      expect(needs.type).not.toContain('N');
      expect(personality.type).not.toContain('P');
    });
  });
});
