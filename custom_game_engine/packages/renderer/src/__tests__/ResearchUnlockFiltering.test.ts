/**
 * Research Unlock Filtering Tests
 *
 * Tests that UI components (RecipeListSection, BuildingPlacementUI)
 * correctly filter content based on research unlock status.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecipeListSection } from '../RecipeListSection';
import { BuildingPlacementUI } from '../BuildingPlacementUI';
import { Camera } from '../Camera';
import {
  World,
  EventBusImpl,
  ResearchRegistry,
  UnlockQueryService,
  createResearchStateComponent,
  BuildingBlueprintRegistry,
} from '@ai-village/core';
import type { BuildingBlueprint, ResearchStateComponent } from '@ai-village/core';

// Mock building blueprint for testing
function createMockBlueprint(id: string, options: Partial<BuildingBlueprint> = {}): BuildingBlueprint {
  return {
    id,
    name: options.name ?? `Building ${id}`,
    description: options.description ?? `Description for ${id}`,
    category: options.category ?? 'production',
    width: options.width ?? 2,
    height: options.height ?? 2,
    tier: options.tier ?? 1,
    buildTime: options.buildTime ?? 5,
    resourceCost: options.resourceCost ?? [],
    functionality: options.functionality ?? [],
    techRequired: options.techRequired ?? [],
    unlocked: options.unlocked ?? true,
    canRotate: options.canRotate ?? false,
    rotationAngles: options.rotationAngles ?? [0],
    placementRules: options.placementRules ?? [],
    sprites: options.sprites ?? {},
  } as BuildingBlueprint;
}

describe('RecipeListSection - Research Unlock Filtering', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let recipeListSection: RecipeListSection;
  let researchState: ResearchStateComponent;
  let unlockService: UnlockQueryService;
  let researchRegistry: ResearchRegistry;

  beforeEach(() => {
    // Reset research registry
    ResearchRegistry.resetInstance();
    researchRegistry = ResearchRegistry.getInstance();

    // Register test research
    researchRegistry.register({
      id: 'metallurgy_i',
      name: 'Basic Metallurgy',
      description: 'Learn to work with metals',
      field: 'metallurgy',
      tier: 1,
      type: 'predefined',
      progressRequired: 100,
      prerequisites: [],
      unlocks: [{ type: 'recipe', recipeId: 'iron_sword' }],
    });

    researchRegistry.register({
      id: 'metallurgy_ii',
      name: 'Advanced Metallurgy',
      description: 'Master metalworking',
      field: 'metallurgy',
      tier: 2,
      type: 'predefined',
      progressRequired: 200,
      prerequisites: ['metallurgy_i'],
      unlocks: [],
    });

    // Setup world and services
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    researchState = createResearchStateComponent();
    unlockService = new UnlockQueryService(researchState, researchRegistry);

    // Create RecipeListSection
    recipeListSection = new RecipeListSection(world, 0, 0, 300, 400);
    recipeListSection.setAgentId(1);
  });

  describe('Without UnlockService', () => {
    it('should return true for isRecipeUnlocked when no unlock service is set', () => {
      // Create a mock recipe with research requirements
      const mockRecipe = {
        id: 'iron_sword',
        name: 'Iron Sword',
        description: 'A sword',
        category: 'weapons',
        researchRequirements: ['metallurgy_i'],
        outputs: [],
        ingredients: [],
        craftingTime: 1000,
        stationRequired: null,
        skillRequirements: {},
      };

      // Without unlock service, all recipes should be treated as unlocked
      expect(recipeListSection.isRecipeUnlocked(mockRecipe as any)).toBe(true);
    });
  });

  describe('With UnlockService', () => {
    beforeEach(() => {
      recipeListSection.setUnlockService(unlockService);
    });

    it('should check research requirements when service is set', () => {
      const unlockedRecipe = {
        id: 'stone_axe',
        name: 'Stone Axe',
        researchRequirements: [],
      };

      const lockedRecipe = {
        id: 'iron_sword',
        name: 'Iron Sword',
        researchRequirements: ['metallurgy_i'],
      };

      expect(recipeListSection.isRecipeUnlocked(unlockedRecipe as any)).toBe(true);
      expect(recipeListSection.isRecipeUnlocked(lockedRecipe as any)).toBe(false);
    });

    it('should unlock recipes when research is completed', () => {
      const lockedRecipe = {
        id: 'iron_sword',
        name: 'Iron Sword',
        researchRequirements: ['metallurgy_i'],
      };

      // Initially locked
      expect(recipeListSection.isRecipeUnlocked(lockedRecipe as any)).toBe(false);

      // Complete metallurgy_i
      researchState.completed.add('metallurgy_i');
      unlockService.updateResearchState(researchState);

      // Now unlocked
      expect(recipeListSection.isRecipeUnlocked(lockedRecipe as any)).toBe(true);
    });

    it('should require all research requirements to be met', () => {
      const multiRequirementRecipe = {
        id: 'steel_blade',
        name: 'Steel Blade',
        researchRequirements: ['metallurgy_i', 'metallurgy_ii'],
      };

      // Initially locked
      expect(recipeListSection.isRecipeUnlocked(multiRequirementRecipe as any)).toBe(false);

      // Complete only metallurgy_i
      researchState.completed.add('metallurgy_i');
      unlockService.updateResearchState(researchState);

      // Still locked (needs metallurgy_ii)
      expect(recipeListSection.isRecipeUnlocked(multiRequirementRecipe as any)).toBe(false);

      // Complete metallurgy_ii
      researchState.completed.add('metallurgy_ii');
      unlockService.updateResearchState(researchState);

      // Now unlocked
      expect(recipeListSection.isRecipeUnlocked(multiRequirementRecipe as any)).toBe(true);
    });
  });

  describe('Clearing UnlockService', () => {
    it('should revert to all unlocked when service is cleared', () => {
      recipeListSection.setUnlockService(unlockService);

      const lockedRecipe = {
        id: 'iron_sword',
        name: 'Iron Sword',
        researchRequirements: ['metallurgy_i'],
      };

      // Initially locked with service
      expect(recipeListSection.isRecipeUnlocked(lockedRecipe as any)).toBe(false);

      // Clear the unlock service
      recipeListSection.setUnlockService(null);

      // Now treated as unlocked
      expect(recipeListSection.isRecipeUnlocked(lockedRecipe as any)).toBe(true);
    });
  });
});

describe('BuildingPlacementUI - Research Unlock Filtering', () => {
  let eventBus: EventBusImpl;
  let buildingRegistry: BuildingBlueprintRegistry;
  let researchState: ResearchStateComponent;
  let unlockService: UnlockQueryService;
  let buildingUI: BuildingPlacementUI;
  let camera: Camera;
  let researchRegistry: ResearchRegistry;

  beforeEach(() => {
    // Reset research registry
    ResearchRegistry.resetInstance();
    researchRegistry = ResearchRegistry.getInstance();

    // Register test research
    researchRegistry.register({
      id: 'construction_ii',
      name: 'Advanced Construction',
      description: 'Build advanced structures',
      field: 'construction',
      tier: 2,
      type: 'predefined',
      progressRequired: 150,
      prerequisites: [],
      unlocks: [{ type: 'building', buildingId: 'advanced_forge' }],
    });

    researchRegistry.register({
      id: 'construction_iii',
      name: 'Master Construction',
      description: 'Build legendary structures',
      field: 'construction',
      tier: 3,
      type: 'predefined',
      progressRequired: 250,
      prerequisites: ['construction_ii'],
      unlocks: [],
    });

    // Setup building registry (local instance for testing)
    buildingRegistry = new BuildingBlueprintRegistry();

    // Register test buildings
    buildingRegistry.register(createMockBlueprint('workbench', {
      name: 'Workbench',
      techRequired: [], // Always unlocked
      unlocked: true,
    }));
    buildingRegistry.register(createMockBlueprint('advanced_forge', {
      name: 'Advanced Forge',
      techRequired: ['construction_ii'], // Requires construction_ii
      unlocked: false,
    }));
    buildingRegistry.register(createMockBlueprint('legendary_smithy', {
      name: 'Legendary Smithy',
      techRequired: ['construction_ii', 'construction_iii'],
      unlocked: false,
    }));

    // Setup services
    eventBus = new EventBusImpl();
    researchState = createResearchStateComponent();
    unlockService = new UnlockQueryService(researchState, researchRegistry);

    // Setup camera and validator mocks
    camera = new Camera();
    const mockValidator = {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      snapToGrid: vi.fn((x, y) => ({ x, y })),
    };

    // Create BuildingPlacementUI
    buildingUI = new BuildingPlacementUI({
      registry: buildingRegistry,
      validator: mockValidator as any,
      camera,
      eventBus,
    });
  });

  describe('Without UnlockService', () => {
    it('should fall back to static unlocked flag when no unlock service', () => {
      const workbench = buildingRegistry.get('workbench');
      const advancedForge = buildingRegistry.get('advanced_forge');

      expect(buildingUI.isBuildingUnlocked(workbench)).toBe(true);
      expect(buildingUI.isBuildingUnlocked(advancedForge)).toBe(false);
    });
  });

  describe('With UnlockService', () => {
    beforeEach(() => {
      buildingUI.setUnlockService(unlockService);
    });

    it('should check research requirements when service is set', () => {
      const workbench = buildingRegistry.get('workbench');
      const advancedForge = buildingRegistry.get('advanced_forge');
      const legendarySmithy = buildingRegistry.get('legendary_smithy');

      expect(buildingUI.isBuildingUnlocked(workbench)).toBe(true);
      expect(buildingUI.isBuildingUnlocked(advancedForge)).toBe(false);
      expect(buildingUI.isBuildingUnlocked(legendarySmithy)).toBe(false);
    });

    it('should unlock buildings when research is completed', () => {
      // Complete construction_ii
      researchState.completed.add('construction_ii');
      unlockService.updateResearchState(researchState);

      const advancedForge = buildingRegistry.get('advanced_forge');
      const legendarySmithy = buildingRegistry.get('legendary_smithy');

      expect(buildingUI.isBuildingUnlocked(advancedForge)).toBe(true);
      expect(buildingUI.isBuildingUnlocked(legendarySmithy)).toBe(false); // Still needs construction_iii
    });

    it('should require all tech requirements to be met', () => {
      const legendarySmithy = buildingRegistry.get('legendary_smithy');

      // Initially locked
      expect(buildingUI.isBuildingUnlocked(legendarySmithy)).toBe(false);

      // Complete only construction_ii
      researchState.completed.add('construction_ii');
      unlockService.updateResearchState(researchState);

      // Still locked
      expect(buildingUI.isBuildingUnlocked(legendarySmithy)).toBe(false);

      // Complete construction_iii
      researchState.completed.add('construction_iii');
      unlockService.updateResearchState(researchState);

      // Now unlocked
      expect(buildingUI.isBuildingUnlocked(legendarySmithy)).toBe(true);
    });
  });

  describe('Clearing UnlockService', () => {
    it('should revert to static flag when service is cleared', () => {
      buildingUI.setUnlockService(unlockService);

      // Complete research
      researchState.completed.add('construction_ii');
      unlockService.updateResearchState(researchState);

      const advancedForge = buildingRegistry.get('advanced_forge');
      expect(buildingUI.isBuildingUnlocked(advancedForge)).toBe(true);

      // Clear the unlock service
      buildingUI.setUnlockService(null);

      // Should fall back to static unlocked flag (which is false)
      expect(buildingUI.isBuildingUnlocked(advancedForge)).toBe(false);
    });
  });
});

describe('Research Unlock Service Integration', () => {
  let researchRegistry: ResearchRegistry;
  let researchState: ResearchStateComponent;
  let unlockService: UnlockQueryService;

  beforeEach(() => {
    ResearchRegistry.resetInstance();
    researchRegistry = ResearchRegistry.getInstance();

    researchRegistry.register({
      id: 'tier1_research',
      name: 'Tier 1 Research',
      description: 'Basic research',
      field: 'agriculture',
      tier: 1,
      type: 'predefined',
      progressRequired: 100,
      prerequisites: [],
      unlocks: [
        { type: 'recipe', recipeId: 'advanced_item' },
        { type: 'building', buildingId: 'advanced_building' },
      ],
    });

    researchState = createResearchStateComponent();
    unlockService = new UnlockQueryService(researchState, researchRegistry);
  });

  it('should track completed research correctly', () => {
    expect(unlockService.isResearchCompleted('tier1_research')).toBe(false);

    researchState.completed.add('tier1_research');
    unlockService.updateResearchState(researchState);

    expect(unlockService.isResearchCompleted('tier1_research')).toBe(true);
  });

  it('should unlock content when research is completed', () => {
    // Initially, content requiring research is locked
    expect(unlockService.isRecipeUnlocked(['tier1_research'])).toBe(false);
    expect(unlockService.isBuildingUnlocked(['tier1_research'])).toBe(false);

    // Complete research
    researchState.completed.add('tier1_research');
    unlockService.updateResearchState(researchState);

    // Now content is unlocked
    expect(unlockService.isRecipeUnlocked(['tier1_research'])).toBe(true);
    expect(unlockService.isBuildingUnlocked(['tier1_research'])).toBe(true);
  });

  it('should always unlock content with no requirements', () => {
    expect(unlockService.isRecipeUnlocked([])).toBe(true);
    expect(unlockService.isBuildingUnlocked([])).toBe(true);
  });
});
