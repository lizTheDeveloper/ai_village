import { describe, it, expect, beforeEach } from 'vitest';
// NOTE: These imports will fail until the module is implemented (TDD red phase)
import {
  BuildingBlueprintRegistry,
  type BuildingBlueprint,
  type BuildingCategory,
} from '../BuildingBlueprintRegistry.js';

describe('BuildingBlueprintRegistry', () => {
  let registry: BuildingBlueprintRegistry;

  beforeEach(() => {
    registry = new BuildingBlueprintRegistry();
  });

  describe('REQ-BPLACE-001: Building Selection Menu - Blueprint Storage', () => {
    it('should register a building blueprint', () => {
      const blueprint: BuildingBlueprint = {
        id: 'campfire',
        name: 'Campfire',
        description: 'A simple fire for warmth and cooking',
        category: 'production',
        tier: 1,
        functionality: [],
        width: 1,
        height: 1,
        resourceCost: [{ resourceId: 'wood', amountRequired: 5 }],
        techRequired: [],
        terrainRequired: ['grass', 'dirt'],
        terrainForbidden: ['water', 'deep_water'],
        unlocked: true,
        buildTime: 30,
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      };

      registry.register(blueprint);

      expect(registry.get('campfire')).toEqual(blueprint);
    });

    it('should throw when registering duplicate blueprint id', () => {
      const blueprint: BuildingBlueprint = {
        id: 'campfire',
        name: 'Campfire',
        description: 'A fire',
        category: 'residential',
        tier: 1,
        functionality: [],
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTime: 30,
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      };

      registry.register(blueprint);

      expect(() => registry.register(blueprint)).toThrow(
        'Blueprint with id "campfire" already registered'
      );
    });

    it('should throw when getting non-existent blueprint', () => {
      expect(() => registry.get('nonexistent')).toThrow(
        'Blueprint "nonexistent" not found'
      );
    });

    it('should return undefined for tryGet on non-existent blueprint', () => {
      expect(registry.tryGet('nonexistent')).toBeUndefined();
    });
  });

  describe('REQ-BPLACE-001: Building Categories', () => {
    const categories: BuildingCategory[] = [
      'production',
      'storage',
      'residential',
      'commercial',
      'community',
      'farming',
      'research',
      'decoration',
    ];

    it('should support all required building categories', () => {
      for (const category of categories) {
        const blueprint: BuildingBlueprint = {
          id: `test-${category}`,
          name: `Test ${category}`,
          description: 'Test building',
          category,
          width: 1,
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: [],
          terrainForbidden: [],
          unlocked: true,
          buildTime: 10,
          tier: 1,
          functionality: [],
          canRotate: false,
          rotationAngles: [0],
          snapToGrid: true,
          requiresFoundation: false,
        };

        registry.register(blueprint);
        expect(registry.get(`test-${category}`).category).toBe(category);
      }
    });

    it('should filter blueprints by category', () => {
      registry.register({
        id: 'campfire',
        name: 'Campfire',
        description: 'Fire',
        category: 'production',
        tier: 1,
        functionality: [],
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTime: 10,
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      });

      registry.register({
        id: 'storage-box',
        name: 'Storage Box',
        description: 'Storage',
        category: 'storage',
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTime: 20,
        tier: 1,
        functionality: [],
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      });

      const productionBlueprints = registry.getByCategory('production');
      expect(productionBlueprints).toHaveLength(1);
      expect(productionBlueprints[0]?.id).toBe('campfire');

      const storageBlueprints = registry.getByCategory('storage');
      expect(storageBlueprints).toHaveLength(1);
      expect(storageBlueprints[0]?.id).toBe('storage-box');
    });

    it('should return empty array for category with no blueprints', () => {
      expect(registry.getByCategory('commercial')).toEqual([]);
    });
  });

  describe('REQ-BPLACE-001: Unlocked/Locked Filtering', () => {
    beforeEach(() => {
      registry.register({
        id: 'unlocked-building',
        name: 'Unlocked',
        description: 'Available',
        category: 'residential',
        tier: 1,
        functionality: [],
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTime: 10,
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      });

      registry.register({
        id: 'locked-building',
        name: 'Locked',
        description: 'Not available',
        category: 'residential',
        tier: 1,
        functionality: [],
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: ['advanced-construction'],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: false,
        buildTime: 30,
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      });
    });

    it('should filter to only unlocked blueprints', () => {
      const unlocked = registry.getUnlocked();
      expect(unlocked).toHaveLength(1);
      expect(unlocked[0]?.id).toBe('unlocked-building');
    });

    it('should get all blueprints including locked', () => {
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('Blueprint Validation', () => {
    it('should throw when blueprint has invalid dimensions', () => {
      expect(() =>
        registry.register({
          id: 'invalid',
          name: 'Invalid',
          description: 'Bad',
          category: 'residential',
        tier: 1,
        functionality: [],
          width: 0, // Invalid
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: [],
          terrainForbidden: [],
          unlocked: true,
          buildTime: 10,
          canRotate: false,
          rotationAngles: [0],
          snapToGrid: true,
          requiresFoundation: false,
        })
      ).toThrow('Blueprint width must be at least 1');
    });

    it('should throw when blueprint has negative build time', () => {
      expect(() =>
        registry.register({
          id: 'invalid',
          name: 'Invalid',
          description: 'Bad',
          category: 'residential',
        tier: 1,
        functionality: [],
          width: 1,
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: [],
          terrainForbidden: [],
          unlocked: true,
          buildTime: -10, // Invalid
          canRotate: false,
          rotationAngles: [0],
          snapToGrid: true,
          requiresFoundation: false,
        })
      ).toThrow('Blueprint buildTime must be non-negative');
    });

    it('should throw when blueprint has empty id', () => {
      expect(() =>
        registry.register({
          id: '', // Invalid
          name: 'Test',
          description: 'Bad',
          category: 'residential',
        tier: 1,
        functionality: [],
          width: 1,
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: [],
          terrainForbidden: [],
          unlocked: true,
          buildTime: 10,
          canRotate: false,
          rotationAngles: [0],
          snapToGrid: true,
          requiresFoundation: false,
        })
      ).toThrow('Blueprint id cannot be empty');
    });

    it('should throw when canRotate is true but rotationAngles is empty', () => {
      expect(() =>
        registry.register({
          id: 'invalid',
          name: 'Test',
          description: 'Bad',
          category: 'residential',
        tier: 1,
        functionality: [],
          width: 1,
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: [],
          terrainForbidden: [],
          unlocked: true,
          buildTime: 10,
          canRotate: true, // Says it can rotate
          rotationAngles: [], // But no angles provided
          snapToGrid: true,
          requiresFoundation: false,
        })
      ).toThrow('canRotate is true but rotationAngles is empty');
    });
  });

  describe('Default Blueprints (Phase 7 MVP)', () => {
    it('should provide campfire blueprint', () => {
      registry.registerDefaults();

      const campfire = registry.get('campfire');
      expect(campfire.name).toBe('Campfire');
      expect(campfire.category).toBe('production');
      expect(campfire.width).toBe(1);
      expect(campfire.height).toBe(1);
      expect(campfire.terrainForbidden).toContain('water');
    });

    it('should provide lean-to blueprint', () => {
      registry.registerDefaults();

      const leanTo = registry.get('lean-to');
      expect(leanTo.name).toBe('Lean-To');
      expect(leanTo.category).toBe('residential');
      expect(leanTo.width).toBeGreaterThanOrEqual(1);
      expect(leanTo.canRotate).toBe(true);
    });

    it('should provide storage-box blueprint', () => {
      registry.registerDefaults();

      const storageBox = registry.get('storage-box');
      expect(storageBox.name).toBe('Storage Box');
      expect(storageBox.category).toBe('storage');
    });
  });
});
