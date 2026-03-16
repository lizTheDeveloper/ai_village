import { describe, it, expect } from 'vitest';
import { generateAnimalPersonality, AnimalComponent } from '../components/AnimalComponent.js';
import { FleeBehavior } from '../behavior/animal-behaviors/FleeBehavior.js';

describe('Animal Personality Traits', () => {
  describe('generateAnimalPersonality', () => {
    it('should generate valid personality in range [0, 1] for all traits', () => {
      const personality = generateAnimalPersonality('neutral');
      expect(personality.fearfulness).toBeGreaterThanOrEqual(0);
      expect(personality.fearfulness).toBeLessThanOrEqual(1);
      expect(personality.aggressiveness).toBeGreaterThanOrEqual(0);
      expect(personality.aggressiveness).toBeLessThanOrEqual(1);
      expect(personality.curiosity).toBeGreaterThanOrEqual(0);
      expect(personality.curiosity).toBeLessThanOrEqual(1);
      expect(personality.sociability).toBeGreaterThanOrEqual(0);
      expect(personality.sociability).toBeLessThanOrEqual(1);
    });

    it('should produce skittish personalities with high fearfulness', () => {
      // Use deterministic RNG (always returns 0.5 = no variance)
      const personality = generateAnimalPersonality('skittish', () => 0.5);
      expect(personality.fearfulness).toBeGreaterThan(0.6);
    });

    it('should produce aggressive personalities with high aggressiveness', () => {
      const personality = generateAnimalPersonality('aggressive', () => 0.5);
      expect(personality.aggressiveness).toBeGreaterThan(0.6);
    });

    it('should produce friendly personalities with high sociability', () => {
      const personality = generateAnimalPersonality('friendly', () => 0.5);
      expect(personality.sociability).toBeGreaterThan(0.7);
    });

    it('should apply random variance within bounds', () => {
      // Always return max (1.0) from RNG
      const highPersonality = generateAnimalPersonality('neutral', () => 1.0);
      // Always return min (0.0) from RNG
      const lowPersonality = generateAnimalPersonality('neutral', () => 0.0);

      // All values should still be in [0, 1]
      expect(highPersonality.fearfulness).toBeLessThanOrEqual(1);
      expect(lowPersonality.fearfulness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AnimalComponent personality field', () => {
    it('should accept optional personality field', () => {
      const animal = new AnimalComponent({
        id: 'test-animal',
        speciesId: 'chicken',
        name: 'Test Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult',
        health: 100,
        size: 1.0,
        state: 'idle',
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 80,
        wild: false,
        bondLevel: 0,
        trustLevel: 0,
        personality: { fearfulness: 0.8, aggressiveness: 0.1, curiosity: 0.3, sociability: 0.5 },
      });
      expect(animal.personality).toBeDefined();
      expect(animal.personality!.fearfulness).toBe(0.8);
    });

    it('should work without personality field (backwards compatible)', () => {
      const animal = new AnimalComponent({
        id: 'test-animal-2',
        speciesId: 'chicken',
        name: 'Simple Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult',
        health: 100,
        size: 1.0,
        state: 'idle',
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 80,
        wild: false,
        bondLevel: 0,
        trustLevel: 0,
      });
      expect(animal.personality).toBeUndefined();
    });

    it('should accept groupId field', () => {
      const animal = new AnimalComponent({
        id: 'test-animal-3',
        speciesId: 'sheep',
        name: 'Group Sheep',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult',
        health: 100,
        size: 1.0,
        state: 'idle',
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 80,
        wild: true,
        bondLevel: 0,
        trustLevel: 0,
        groupId: 'sheep-group-0-5',
      });
      expect(animal.groupId).toBe('sheep-group-0-5');
    });
  });

  describe('FleeBehavior personality integration', () => {
    // Helper to create a minimal AnimalComponent with personality
    function makeAnimal(stress: number, fearfulness: number, wild = true, trustLevel = 10) {
      return new AnimalComponent({
        id: 'flee-test',
        speciesId: 'rabbit',
        name: 'Test Rabbit',
        position: { x: 0, y: 0 },
        age: 50,
        lifeStage: 'adult',
        health: 100,
        size: 0.5,
        state: 'idle',
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress,
        mood: 50,
        wild,
        bondLevel: 0,
        trustLevel,
        personality: { fearfulness, aggressiveness: 0.1, curiosity: 0.5, sociability: 0.6 },
      });
    }

    it('fearful animals should flee at lower stress thresholds', () => {
      const behavior = new FleeBehavior();
      const fearfulAnimal = makeAnimal(50, 0.9); // High fearfulness, moderate stress
      const braveAnimal = makeAnimal(50, 0.1);   // Low fearfulness, same stress

      // Fearful animal should want to flee at stress=50
      // Brave animal should NOT flee at stress=50
      expect(behavior.canStart({} as any, fearfulAnimal)).toBe(true);
      expect(behavior.canStart({} as any, braveAnimal)).toBe(false);
    });

    it('fearful animals should have higher flee priority', () => {
      const behavior = new FleeBehavior();
      const fearfulAnimal = makeAnimal(60, 0.9);
      const braveAnimal = makeAnimal(60, 0.1);

      const fearfulPriority = behavior.getPriority(fearfulAnimal);
      const bravePriority = behavior.getPriority(braveAnimal);

      expect(fearfulPriority).toBeGreaterThan(bravePriority);
    });

    it('animals without personality use neutral defaults', () => {
      const behavior = new FleeBehavior();
      const animal = new AnimalComponent({
        id: 'no-personality',
        speciesId: 'chicken',
        name: 'Basic Chicken',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult',
        health: 100,
        size: 1.0,
        state: 'idle',
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 75,
        mood: 50,
        wild: true,
        bondLevel: 0,
        trustLevel: 10,
      });
      // Should not throw, should use defaults
      expect(() => behavior.canStart({} as any, animal)).not.toThrow();
      expect(() => behavior.getPriority(animal)).not.toThrow();
    });
  });
});
