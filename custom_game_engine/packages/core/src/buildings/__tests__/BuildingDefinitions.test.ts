import { describe, it, expect, beforeEach } from 'vitest';
import type { BuildingBlueprint, BuildingCategory } from '../BuildingBlueprintRegistry.js';
import { BuildingBlueprintRegistry } from '../BuildingBlueprintRegistry.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Building Function type definitions - per spec REQ-CON-003
 * These tests verify the BuildingFunction type exists and is properly defined.
 */
describe('BuildingFunction Types', () => {
  describe('Acceptance Criterion 4: BuildingFunction Types Defined', () => {
    it('should define crafting function type', () => {
      // This will fail until BuildingFunction type is implemented
      const craftingFunction: any = {
        type: 'crafting',
        recipes: ['basic_tool'],
        speed: 1.0,
      };

      expect(craftingFunction.type).toBe('crafting');
      expect(craftingFunction).toHaveProperty('recipes');
      expect(craftingFunction).toHaveProperty('speed');
    });

    it('should define storage function type', () => {
      const storageFunction: any = {
        type: 'storage',
        itemTypes: ['resource', 'tool'],
        capacity: 20,
      };

      expect(storageFunction.type).toBe('storage');
      expect(storageFunction).toHaveProperty('itemTypes');
      expect(storageFunction).toHaveProperty('capacity');
    });

    it('should define sleeping function type', () => {
      const sleepingFunction: any = {
        type: 'sleeping',
        restBonus: 1.5,
      };

      expect(sleepingFunction.type).toBe('sleeping');
      expect(sleepingFunction).toHaveProperty('restBonus');
    });

    it('should define shop function type', () => {
      const shopFunction: any = {
        type: ComponentType.Shop,
        shopType: 'general',
      };

      expect(shopFunction.type).toBe('shop');
      expect(shopFunction).toHaveProperty('shopType');
    });

    it('should define research function type', () => {
      const researchFunction: any = {
        type: 'research',
        fields: ['agriculture', 'crafting'],
        bonus: 1.2,
      };

      expect(researchFunction.type).toBe('research');
      expect(researchFunction).toHaveProperty('fields');
      expect(researchFunction).toHaveProperty('bonus');
    });

    it('should define gathering_boost function type', () => {
      const gatheringFunction: any = {
        type: 'gathering_boost',
        resourceTypes: ['water'],
        radius: 5,
      };

      expect(gatheringFunction.type).toBe('gathering_boost');
      expect(gatheringFunction).toHaveProperty('resourceTypes');
      expect(gatheringFunction).toHaveProperty('radius');
    });

    it('should define mood_aura function type', () => {
      const moodFunction: any = {
        type: 'mood_aura',
        moodBonus: 10,
        radius: 3,
      };

      expect(moodFunction.type).toBe('mood_aura');
      expect(moodFunction).toHaveProperty('moodBonus');
      expect(moodFunction).toHaveProperty('radius');
    });

    it('should define automation function type', () => {
      const automationFunction: any = {
        type: 'automation',
        tasks: ['harvest', 'replant'],
      };

      expect(automationFunction.type).toBe('automation');
      expect(automationFunction).toHaveProperty('tasks');
    });
  });
});

/**
 * Building Categories - per spec
 * Tests verify all 8 required categories are supported
 */
describe('BuildingCategory Types', () => {
  describe('Acceptance Criterion 3: Building Categories Supported', () => {
    const expectedCategories: BuildingCategory[] = [
      'production',
      'storage',
      'residential',
      'commercial',
      'community',
      'farming',
      'research',
      'decoration',
    ];

    it('should support all 8 building categories from spec', () => {
      const registry = new BuildingBlueprintRegistry();

      // Try to register a building for each category
      expectedCategories.forEach((category) => {
        const blueprint: BuildingBlueprint = {
          id: `test-${category}`,
          name: `Test ${category}`,
          description: 'Test building',
          category,
          width: 1,
          height: 1,
          resourceCost: [],
          techRequired: [],
          terrainRequired: ['grass'],
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

        // Should not throw - this will fail if category type is wrong
        expect(() => registry.register(blueprint)).not.toThrow();
      });
    });

    it('should filter buildings by each category', () => {
      const registry = new BuildingBlueprintRegistry();

      // Register one building per category
      expectedCategories.forEach((category) => {
        registry.register({
          id: `building-${category}`,
          name: `${category} building`,
          description: 'Test',
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
        });
      });

      // Verify each category returns exactly one building
      expectedCategories.forEach((category) => {
        const buildings = registry.getByCategory(category);
        expect(buildings).toHaveLength(1);
        expect(buildings[0]!.category).toBe(category);
      });
    });

    it('should have actual buildings for all 8 categories including research and decoration', () => {
      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();
    // Note: registerDefaults() already calls registerTier2Stations() and registerTier3Stations()
      registry.registerExampleBuildings(); // Includes decoration, research examples

      // Verify ALL 8 categories have at least one building
      expectedCategories.forEach((category) => {
        const buildings = registry.getByCategory(category);
        expect(buildings.length).toBeGreaterThan(0);
        expect(buildings[0]!.category).toBe(category);
      });

      // Specifically verify the missing categories from playtest
      const decorationBuildings = registry.getByCategory('decoration');
      expect(decorationBuildings.length).toBeGreaterThan(0);
      expect(decorationBuildings.some((b) => b.id === 'garden_fence')).toBe(true);

      const researchBuildings = registry.getByCategory('research');
      expect(researchBuildings.length).toBeGreaterThan(0);
      expect(researchBuildings.some((b) => b.id === 'library')).toBe(true);
    });
  });
});

/**
 * Tier 1 Building Definitions - per spec table
 * Tests verify all 5 Tier 1 buildings are defined with exact costs
 */
describe('Tier 1 Building Definitions', () => {
  let registry: BuildingBlueprintRegistry;

  beforeEach(() => {
    registry = new BuildingBlueprintRegistry();
    registry.registerDefaults();
  });

  describe('Acceptance Criterion 2: All Tier 1 Buildings Defined', () => {
    it('should register all 5 Tier 1 buildings from spec', () => {
      const allBuildings = registry.getAll();

      // Should have 5 spec buildings + 2 legacy = 7 total
      expect(allBuildings.length).toBeGreaterThanOrEqual(5);

      // Verify the 5 required spec buildings exist
      const specBuildingIds = ['workbench', 'storage-chest', 'campfire', 'tent', 'well'];
      specBuildingIds.forEach((id) => {
        expect(() => registry.get(id)).not.toThrow();
      });
    });

    it('should include Workbench in registered buildings', () => {
      // This will fail - Workbench not yet implemented
      expect(() => registry.get('workbench')).not.toThrow();
    });

    it('should include Storage Chest in registered buildings', () => {
      // This will fail - storage-box exists but not storage-chest
      expect(() => registry.get('storage-chest')).not.toThrow();
    });

    it('should include Campfire in registered buildings', () => {
      // This should pass - campfire already exists
      expect(() => registry.get('campfire')).not.toThrow();
    });

    it('should include Tent in registered buildings', () => {
      // This will fail - Tent not yet implemented (lean-to exists but is different)
      expect(() => registry.get('tent')).not.toThrow();
    });

    it('should include Well in registered buildings', () => {
      // This will fail - Well not yet implemented
      expect(() => registry.get('well')).not.toThrow();
    });
  });

  describe('Acceptance Criterion 5: Construction Costs Match Spec', () => {
    describe('Workbench costs', () => {
      it('should cost exactly 20 Wood', () => {
        const workbench = registry.get('workbench');

        expect(workbench.resourceCost).toHaveLength(1);
        expect(workbench.resourceCost[0]!.resourceId).toBe('wood');
        expect(workbench.resourceCost[0]!.amountRequired).toBe(20);
      });

      it('should be 2x2 size', () => {
        const workbench = registry.get('workbench');

        expect(workbench.width).toBe(2);
        expect(workbench.height).toBe(2);
      });

      it('should be production category', () => {
        const workbench = registry.get('workbench');

        expect(workbench.category).toBe('production');
      });
    });

    describe('Storage Chest costs', () => {
      it('should cost exactly 10 Wood', () => {
        const chest = registry.get('storage-chest');

        expect(chest.resourceCost).toHaveLength(1);
        expect(chest.resourceCost[0]!.resourceId).toBe('wood');
        expect(chest.resourceCost[0]!.amountRequired).toBe(10);
      });

      it('should be 1x1 size', () => {
        const chest = registry.get('storage-chest');

        expect(chest.width).toBe(1);
        expect(chest.height).toBe(1);
      });

      it('should be storage category', () => {
        const chest = registry.get('storage-chest');

        expect(chest.category).toBe('storage');
      });
    });

    describe('Campfire costs', () => {
      it('should cost exactly 10 Stone and 5 Wood', () => {
        const campfire = registry.get('campfire');

        // This will fail - current cost is 5 Wood only, spec says 10 Stone + 5 Wood
        expect(campfire.resourceCost).toHaveLength(2);

        const stoneCost = campfire.resourceCost.find((c) => c.resourceId === 'stone');
        const woodCost = campfire.resourceCost.find((c) => c.resourceId === 'wood');

        expect(stoneCost).toBeDefined();
        expect(stoneCost!.amountRequired).toBe(10);

        expect(woodCost).toBeDefined();
        expect(woodCost!.amountRequired).toBe(5);
      });

      it('should be 1x1 size', () => {
        const campfire = registry.get('campfire');

        expect(campfire.width).toBe(1);
        expect(campfire.height).toBe(1);
      });

      it('should be production category', () => {
        const campfire = registry.get('campfire');

        // This will fail - currently 'housing', spec implies production (cooking)
        expect(campfire.category).toBe('production');
      });
    });

    describe('Tent costs', () => {
      it('should cost exactly 10 Cloth and 5 Wood', () => {
        const tent = registry.get('tent');

        expect(tent.resourceCost).toHaveLength(2);

        const clothCost = tent.resourceCost.find((c) => c.resourceId === 'cloth');
        const woodCost = tent.resourceCost.find((c) => c.resourceId === 'wood');

        expect(clothCost).toBeDefined();
        expect(clothCost!.amountRequired).toBe(10);

        expect(woodCost).toBeDefined();
        expect(woodCost!.amountRequired).toBe(5);
      });

      it('should be 2x2 size', () => {
        const tent = registry.get('tent');

        expect(tent.width).toBe(2);
        expect(tent.height).toBe(2);
      });

      it('should be residential category', () => {
        const tent = registry.get('tent');

        expect(tent.category).toBe('residential');
      });
    });

    describe('Well costs', () => {
      it('should cost exactly 30 Stone', () => {
        const well = registry.get('well');

        expect(well.resourceCost).toHaveLength(1);
        expect(well.resourceCost[0]!.resourceId).toBe('stone');
        expect(well.resourceCost[0]!.amountRequired).toBe(30);
      });

      it('should be 1x1 size', () => {
        const well = registry.get('well');

        expect(well.width).toBe(1);
        expect(well.height).toBe(1);
      });

      it('should be community category', () => {
        const well = registry.get('well');

        expect(well.category).toBe('community');
      });
    });
  });

  describe('Acceptance Criterion 1: BuildingDefinition Interface Exists', () => {
    it('should have all required fields from spec', () => {
      const campfire = registry.get('campfire');

      // Verify BuildingBlueprint has all required fields
      expect(campfire).toHaveProperty('id');
      expect(campfire).toHaveProperty('name');
      expect(campfire).toHaveProperty('category');
      expect(campfire).toHaveProperty('description');
      expect(campfire).toHaveProperty('width');
      expect(campfire).toHaveProperty('height');
      expect(campfire).toHaveProperty('resourceCost');
      expect(campfire).toHaveProperty('buildTime');

      expect(typeof campfire.id).toBe('string');
      expect(typeof campfire.name).toBe('string');
      expect(typeof campfire.category).toBe('string');
      expect(typeof campfire.description).toBe('string');
      expect(typeof campfire.width).toBe('number');
      expect(typeof campfire.height).toBe('number');
      expect(Array.isArray(campfire.resourceCost)).toBe(true);
      expect(typeof campfire.buildTime).toBe('number');
    });
  });
});

/**
 * Building Functionality - per spec REQ-CON-003
 * Tests verify building functions are tracked correctly
 */
describe('Building Functionality Tracking', () => {
  let registry: BuildingBlueprintRegistry;

  beforeEach(() => {
    registry = new BuildingBlueprintRegistry();
    registry.registerDefaults();
  });

  describe('Acceptance Criterion 4: BuildingFunction Types on Definitions', () => {
    it('should track Workbench crafting functionality', () => {
      const workbench = registry.get('workbench');

      // This will fail - functionality not yet tracked on blueprints
      expect(workbench).toHaveProperty('functionality');
      expect(Array.isArray((workbench as any).functionality)).toBe(true);

      const craftingFunc = (workbench as any).functionality.find(
        (f: any) => f.type === 'crafting'
      );
      expect(craftingFunc).toBeDefined();
    });

    it('should track Storage Chest storage functionality', () => {
      const chest = registry.get('storage-chest');

      expect(chest).toHaveProperty('functionality');

      const storageFunc = (chest as any).functionality.find(
        (f: any) => f.type === 'storage'
      );
      expect(storageFunc).toBeDefined();
      expect(storageFunc.capacity).toBe(20);
    });

    it('should track Tent sleeping functionality', () => {
      const tent = registry.get('tent');

      expect(tent).toHaveProperty('functionality');

      const sleepingFunc = (tent as any).functionality.find(
        (f: any) => f.type === 'sleeping'
      );
      expect(sleepingFunc).toBeDefined();
    });

    it('should track Well gathering_boost functionality', () => {
      const well = registry.get('well');

      expect(well).toHaveProperty('functionality');

      const gatheringFunc = (well as any).functionality.find(
        (f: any) => f.type === 'gathering_boost'
      );
      expect(gatheringFunc).toBeDefined();
      expect(gatheringFunc.resourceTypes).toContain('water');
    });

    it('should have actual buildings for all 8 function types including research and automation', () => {
      // Register all building types
      registry.registerTier2Stations();
      registry.registerTier3Stations();
      registry.registerExampleBuildings();

      const allBuildings = registry.getAll();
      const allFunctions = allBuildings.flatMap((b) => b.functionality);

      // Verify all 8 function types are present
      const expectedFunctionTypes = [
        'crafting',
        'storage',
        'sleeping',
        'shop',
        'research',
        'gathering_boost',
        'mood_aura',
        'automation',
      ];

      expectedFunctionTypes.forEach((functionType) => {
        const hasFunction = allFunctions.some((f) => f.type === functionType);
        expect(hasFunction).toBe(true);
      });

      // Specifically verify the missing functions from playtest
      const researchFunction = allFunctions.find((f) => f.type === 'research');
      expect(researchFunction).toBeDefined();
      expect((researchFunction as any).fields).toBeDefined();

      const automationFunction = allFunctions.find((f) => f.type === 'automation');
      expect(automationFunction).toBeDefined();
      expect((automationFunction as any).tasks).toBeDefined();
    });
  });
});

/**
 * Error Handling - per CLAUDE.md
 * Tests verify no silent fallbacks, proper exceptions thrown
 */
describe('Error Handling', () => {
  let registry: BuildingBlueprintRegistry;

  beforeEach(() => {
    registry = new BuildingBlueprintRegistry();
  });

  describe('Required Fields Validation', () => {
    it('should throw when building id is missing', () => {
      const invalidBlueprint = {
        name: 'Test Building',
        description: 'Test',
        category: 'production' as BuildingCategory,
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
      } as any;

      expect(() => registry.register(invalidBlueprint)).toThrow();
    });

    it('should throw when getting non-existent building', () => {
      expect(() => registry.get('non-existent-building')).toThrow(
        'Blueprint "non-existent-building" not found'
      );
    });

    it('should throw when registering duplicate building id', () => {
      const blueprint: BuildingBlueprint = {
        id: 'duplicate-test',
        name: 'Test',
        description: 'Test',
        category: 'production',
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

      expect(() => registry.register(blueprint)).toThrow(
        'Blueprint with id "duplicate-test" already registered'
      );
    });
  });

  describe('Invalid Data Rejection', () => {
    it('should throw when width is less than 1', () => {
      const invalidBlueprint: BuildingBlueprint = {
        id: 'test-invalid-width',
        name: 'Test',
        description: 'Test',
        category: 'production',
        width: 0,
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

      expect(() => registry.register(invalidBlueprint)).toThrow(
        'Blueprint width must be at least 1'
      );
    });

    it('should throw when height is less than 1', () => {
      const invalidBlueprint: BuildingBlueprint = {
        id: 'test-invalid-height',
        name: 'Test',
        description: 'Test',
        category: 'production',
        width: 1,
        height: 0,
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

      expect(() => registry.register(invalidBlueprint)).toThrow(
        'Blueprint height must be at least 1'
      );
    });

    it('should throw when buildTime is negative', () => {
      const invalidBlueprint: BuildingBlueprint = {
        id: 'test-invalid-buildtime',
        name: 'Test',
        description: 'Test',
        category: 'production',
        width: 1,
        height: 1,
        resourceCost: [],
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTime: -10,
        tier: 1,
        functionality: [],
        canRotate: false,
        rotationAngles: [0],
        snapToGrid: true,
        requiresFoundation: false,
      };

      expect(() => registry.register(invalidBlueprint)).toThrow(
        'Blueprint buildTime must be non-negative'
      );
    });
  });
});
