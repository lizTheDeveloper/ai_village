/**
 * BuildingBlueprintRegistry - Stores building definitions for placement UI.
 *
 * Implements: REQ-BPLACE-001 (Building Selection Menu - Blueprint Storage)
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid input.
 */

/**
 * Building categories per construction-system/spec.md
 * EXACTLY 8 categories as specified in spec.
 */
export type BuildingCategory =
  | 'production'    // Crafting, processing
  | 'storage'       // Warehouses, silos
  | 'residential'   // Agent homes, tents, shelters
  | 'commercial'    // Shops, markets
  | 'community'     // Town hall, plaza, wells
  | 'farming'       // Barns, greenhouses
  | 'research'      // Labs, libraries
  | 'decoration';   // Fences, statues

/**
 * Building functionality types per construction-system/spec.md REQ-CON-003
 */
export type BuildingFunction =
  | { type: 'crafting'; recipes: string[]; speed: number }
  | { type: 'storage'; itemTypes: string[]; capacity: number }
  | { type: 'sleeping'; restBonus: number }
  | { type: 'shop'; shopType: string }
  | { type: 'research'; fields: string[]; bonus: number }
  | { type: 'gathering_boost'; resourceTypes: string[]; radius: number }
  | { type: 'mood_aura'; moodBonus: number; radius: number }
  | { type: 'automation'; tasks: string[] };

export interface ResourceCost {
  resourceId: string;
  amountRequired: number;
}

export interface BuildingBlueprint {
  id: string;
  name: string;
  description: string;
  category: BuildingCategory;

  // Dimensions (in tiles)
  width: number;
  height: number;

  // Requirements
  resourceCost: ResourceCost[];
  techRequired: string[];
  terrainRequired: string[];
  terrainForbidden: string[];

  // Status
  unlocked: boolean;
  buildTime: number;

  // Functionality (per construction-system/spec.md)
  tier: number; // 1-5 power level
  functionality: BuildingFunction[];

  // Placement rules
  canRotate: boolean;
  rotationAngles: number[];
  snapToGrid: boolean;
  requiresFoundation: boolean;
}

/**
 * Registry for building blueprints.
 * Provides storage and lookup for building definitions used by the placement UI.
 */
export class BuildingBlueprintRegistry {
  private blueprints = new Map<string, BuildingBlueprint>();

  /**
   * Register a building blueprint.
   * @throws Error if blueprint with same id already exists
   * @throws Error if blueprint has invalid properties
   */
  register(blueprint: BuildingBlueprint): void {
    this.validateBlueprint(blueprint);

    if (this.blueprints.has(blueprint.id)) {
      throw new Error(`Blueprint with id "${blueprint.id}" already registered`);
    }

    this.blueprints.set(blueprint.id, blueprint);
  }

  /**
   * Get a blueprint by id.
   * @throws Error if blueprint not found
   */
  get(id: string): BuildingBlueprint {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) {
      throw new Error(`Blueprint "${id}" not found`);
    }
    return blueprint;
  }

  /**
   * Try to get a blueprint by id.
   * Returns undefined if not found (for optional lookups only).
   */
  tryGet(id: string): BuildingBlueprint | undefined {
    return this.blueprints.get(id);
  }

  /**
   * Get all blueprints in a category.
   */
  getByCategory(category: BuildingCategory): BuildingBlueprint[] {
    return Array.from(this.blueprints.values()).filter(
      (bp) => bp.category === category
    );
  }

  /**
   * Get all unlocked blueprints.
   */
  getUnlocked(): BuildingBlueprint[] {
    return Array.from(this.blueprints.values()).filter((bp) => bp.unlocked);
  }

  /**
   * Get all blueprints.
   */
  getAll(): BuildingBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  /**
   * Register the default Tier 1 blueprints per construction-system/spec.md
   */
  registerDefaults(): void {
    // Workbench - Basic crafting (2x2, 20 Wood)
    this.register({
      id: 'workbench',
      name: 'Workbench',
      description: 'A basic crafting station for simple tools and items',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [{ resourceId: 'wood', amountRequired: 20 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['basic_tools', 'basic_items'],
          speed: 1.0,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Storage Chest - 20 item slots (1x1, 10 Wood)
    this.register({
      id: 'storage-chest',
      name: 'Storage Chest',
      description: 'A wooden chest for storing items',
      category: 'storage',
      width: 1,
      height: 1,
      resourceCost: [{ resourceId: 'wood', amountRequired: 10 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'storage',
          itemTypes: [], // Empty = all types
          capacity: 20,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Campfire - Cooking, warmth (1x1, 10 Stone + 5 Wood)
    this.register({
      id: 'campfire',
      name: 'Campfire',
      description: 'A simple fire for warmth and cooking',
      category: 'production',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 10 },
        { resourceId: 'wood', amountRequired: 5 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 30,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['cooked_food'],
          speed: 1.0,
        },
        {
          type: 'mood_aura',
          moodBonus: 5,
          radius: 3,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Tent - Basic shelter (2x2, 10 Cloth + 5 Wood)
    this.register({
      id: 'tent',
      name: 'Tent',
      description: 'A simple tent for basic shelter and rest',
      category: 'residential',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'cloth', amountRequired: 10 },
        { resourceId: 'wood', amountRequired: 5 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'sleeping',
          restBonus: 1.2, // 20% faster rest recovery
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Bed - High-quality sleep (2x1, 10 Wood + 15 Plant Fiber)
    this.register({
      id: 'bed',
      name: 'Bed',
      description: 'A comfortable bed for restful sleep. Provides best sleep quality.',
      category: 'residential',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 10 },
        { resourceId: 'plant_fiber', amountRequired: 15 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'sleeping',
          restBonus: 1.5, // 50% faster energy recovery (best sleep quality)
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Bedroll - Portable sleep (2x1, 20 Plant Fiber + 5 Leather)
    this.register({
      id: 'bedroll',
      name: 'Bedroll',
      description: 'A portable bedroll that can be placed anywhere. Moderate sleep quality.',
      category: 'residential',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'plant_fiber', amountRequired: 20 },
        { resourceId: 'leather', amountRequired: 5 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'sleeping',
          restBonus: 1.3, // 30% faster energy recovery (moderate sleep quality)
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Well - Water source (1x1, 30 Stone)
    this.register({
      id: 'well',
      name: 'Well',
      description: 'A stone well providing fresh water',
      category: 'community',
      width: 1,
      height: 1,
      resourceCost: [{ resourceId: 'stone', amountRequired: 30 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 90,
      tier: 1,
      functionality: [
        {
          type: 'gathering_boost',
          resourceTypes: ['water'],
          radius: 0, // On-site only
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Legacy buildings for backward compatibility
    // Lean-to - maps to Tent conceptually but different materials
    this.register({
      id: 'lean-to',
      name: 'Lean-To',
      description: 'A simple shelter made from branches and leaves',
      category: 'residential',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 10 },
        { resourceId: 'leaves', amountRequired: 5 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'sleeping',
          restBonus: 1.1, // 10% faster rest recovery (worse than tent)
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Storage box - legacy, similar to storage-chest but smaller
    this.register({
      id: 'storage-box',
      name: 'Storage Box',
      description: 'A simple box for storing items',
      category: 'storage',
      width: 1,
      height: 1,
      resourceCost: [{ resourceId: 'wood', amountRequired: 8 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'storage',
          itemTypes: [], // Empty = all types
          capacity: 10, // Half of storage-chest
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });
  }

  /**
   * Register Tier 2 crafting stations per construction-system/spec.md
   * Phase 10: Crafting Stations
   */
  registerTier2Stations(): void {
    // Forge - Metal crafting (2x3, 40 Stone + 20 Iron)
    this.register({
      id: 'forge',
      name: 'Forge',
      description: 'A metal forge for smelting and metalworking',
      category: 'production',
      width: 2,
      height: 3,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 40 },
        { resourceId: 'iron', amountRequired: 20 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: ['iron_ingot', 'steel_sword', 'iron_tools', 'steel_ingot'],
          speed: 1.5, // +50% metalworking speed
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Farm Shed - Seed/tool storage (3x2, 30 Wood)
    this.register({
      id: 'farm_shed',
      name: 'Farm Shed',
      description: 'A shed for storing farming tools and seeds',
      category: 'farming',
      width: 3,
      height: 2,
      resourceCost: [{ resourceId: 'wood', amountRequired: 30 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 90,
      tier: 2,
      functionality: [
        {
          type: 'storage',
          itemTypes: ['seeds', 'tools', 'farming_supplies'],
          capacity: 40,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Market Stall - Basic trading (2x2, 25 Wood)
    this.register({
      id: 'market_stall',
      name: 'Market Stall',
      description: 'A simple market stall for trading goods',
      category: 'commercial',
      width: 2,
      height: 2,
      resourceCost: [{ resourceId: 'wood', amountRequired: 25 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 75,
      tier: 2,
      functionality: [
        {
          type: 'shop',
          shopType: 'general',
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Windmill - Grain processing (2x2, 40 Wood + 10 Stone)
    this.register({
      id: 'windmill',
      name: 'Windmill',
      description: 'A windmill for grinding grain into flour',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 40 },
        { resourceId: 'stone', amountRequired: 10 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 100,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: ['flour', 'grain_products'],
          speed: 1.0,
        },
      ],
      canRotate: false, // Windmills face specific direction
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });
  }

  /**
   * Register example buildings for missing categories/functions
   * Demonstrates all 8 categories and 8 function types are supported
   */
  registerExampleBuildings(): void {
    // Garden Fence - Decoration category example
    this.register({
      id: 'garden_fence',
      name: 'Garden Fence',
      description: 'A decorative wooden fence to beautify your village',
      category: 'decoration',
      width: 1,
      height: 1,
      resourceCost: [{ resourceId: 'wood', amountRequired: 5 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 15,
      tier: 1,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 2,
          radius: 2,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Library - Research category and function example
    this.register({
      id: 'library',
      name: 'Library',
      description: 'A simple library for basic research and learning',
      category: 'research',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 50 },
        { resourceId: 'stone', amountRequired: 30 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'research',
          fields: ['agriculture', 'construction', 'tools'],
          bonus: 1.2, // 20% research speed bonus
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Auto-Farm - Automation function example
    this.register({
      id: 'auto_farm',
      name: 'Automated Farm',
      description: 'An advanced farm that automatically plants and harvests crops',
      category: 'farming',
      width: 4,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'iron', amountRequired: 40 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 180,
      tier: 3,
      functionality: [
        {
          type: 'automation',
          tasks: ['plant_seeds', 'harvest_crops', 'water_plants'],
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });
  }

  /**
   * Register Tier 3+ crafting stations per construction-system/spec.md
   * Phase 10: Advanced Crafting Stations
   */
  registerTier3Stations(): void {
    // Workshop - Advanced crafting (3x4, 60 Wood + 30 Iron)
    this.register({
      id: 'workshop',
      name: 'Workshop',
      description: 'An advanced workshop for complex crafting',
      category: 'production',
      width: 3,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 60 },
        { resourceId: 'iron', amountRequired: 30 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 180,
      tier: 3,
      functionality: [
        {
          type: 'crafting',
          recipes: [
            'advanced_tools',
            'machinery',
            'furniture',
            'weapons',
            'armor',
            'complex_items',
          ],
          speed: 1.3, // +30% crafting speed
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Barn - Large storage + animal housing (4x3, 70 Wood)
    this.register({
      id: 'barn',
      name: 'Barn',
      description: 'A large barn for storing goods and housing animals',
      category: 'farming',
      width: 4,
      height: 3,
      resourceCost: [{ resourceId: 'wood', amountRequired: 70 }],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      unlocked: true,
      buildTime: 150,
      tier: 3,
      functionality: [
        {
          type: 'storage',
          itemTypes: [], // All types
          capacity: 100,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });
  }

  /**
   * Validate a blueprint before registration.
   * @throws Error if blueprint is invalid
   */
  private validateBlueprint(blueprint: BuildingBlueprint): void {
    if (!blueprint.id || blueprint.id.trim() === '') {
      throw new Error('Blueprint id cannot be empty');
    }

    if (blueprint.width < 1) {
      throw new Error('Blueprint width must be at least 1');
    }

    if (blueprint.height < 1) {
      throw new Error('Blueprint height must be at least 1');
    }

    if (blueprint.buildTime < 0) {
      throw new Error('Blueprint buildTime must be non-negative');
    }

    if (blueprint.canRotate && blueprint.rotationAngles.length === 0) {
      throw new Error('canRotate is true but rotationAngles is empty');
    }
  }
}
