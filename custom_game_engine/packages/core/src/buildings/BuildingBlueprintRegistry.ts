/**
 * BuildingBlueprintRegistry - Stores building definitions for placement UI.
 *
 * Implements: REQ-BPLACE-001 (Building Selection Menu - Blueprint Storage)
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid input.
 */

import type { BuildingFloor, Material, BuilderSpecies } from '@ai-village/building-designer';
import {
  SMALL_HOUSE,
  COZY_COTTAGE,
  STONE_HOUSE,
  LONGHOUSE,
  WORKSHOP,
  BARN,
  STORAGE_SHED,
  GUARD_TOWER,
} from './StandardVoxelBuildings.js';
import { TEMPLE_BLUEPRINTS } from './TempleBlueprints.js';
import { getFarmBlueprints } from './FarmBlueprints.js';
import { SHOP_BLUEPRINTS } from './ShopBlueprints.js';
import { MIDWIFERY_BLUEPRINTS } from './MidwiferyBlueprints.js';
import { GOVERNANCE_BLUEPRINTS } from './GovernanceBlueprints.js';
import { SHIPYARD_BLUEPRINTS } from './ShipyardBlueprints.js';

/**
 * Building categories per construction-system/spec.md
 * Extended to include governance category.
 */
export type BuildingCategory =
  | 'production'    // Crafting, processing
  | 'storage'       // Warehouses, silos
  | 'residential'   // Agent homes, tents, shelters
  | 'commercial'    // Shops, markets
  | 'community'     // Town hall, plaza, wells
  | 'farming'       // Barns, greenhouses
  | 'research'      // Labs, libraries
  | 'decoration'    // Fences, statues
  | 'governance'    // Information infrastructure
  | 'religious';    // Temples, shrines, sacred sites

/**
 * Building functionality types per construction-system/spec.md REQ-CON-003
 * Extended to include governance and other custom function types.
 */
export type BuildingFunction =
  | { type: 'crafting'; recipes: string[]; speed: number }
  | { type: 'storage'; itemTypes?: string[]; capacity: number }
  | { type: 'sleeping'; restBonus: number }
  | { type: 'shop'; shopType: string }
  | { type: 'research'; fields: string[]; bonus: number }
  | { type: 'gathering_boost'; resourceTypes: string[]; radius: number }
  | { type: 'mood_aura'; moodBonus: number; radius: number }
  | { type: 'automation'; tasks: string[] }
  | { type: 'governance'; governanceType: string }
  | { type: 'healing'; healingRate: number }
  | { type: 'social_hub'; radius: number }
  | { type: 'vision_extension'; radiusBonus: number }
  | { type: 'job_board' }
  | { type: 'knowledge_repository' }
  | { type: 'prayer_site'; beliefMultiplier: number; prayerCapacity: number; domainBonus?: string[] }
  | { type: 'ritual_site'; ritualTypes: string[] }
  | { type: 'priest_quarters'; priestCapacity: number }
  | { type: 'pilgrimage_site'; attractionRadius: number }
  | { type: 'meditation_site'; visionClarityBonus: number; meditationSpeedBonus: number }
  | { type: 'resource_generation'; resourceType: string; rate: number }
  // Farming-specific functions
  | { type: 'pest_deterrent'; pestTypes: string[]; radius: number; effectiveness: number }
  | { type: 'irrigation'; waterRate: number; radius: number }
  | { type: 'fertilizer_production'; outputRate: number; capacity: number }
  | { type: 'pollination'; radius: number; yieldBonus: number }
  | { type: 'climate_control'; temperatureModifier: number; radius: number }
  | { type: 'disease_prevention'; diseaseTypes: string[]; radius: number; effectiveness: number };

export interface ResourceCost {
  resourceId: string;
  amountRequired: number;
}

/**
 * Skill requirement for Progressive Skill Reveal System.
 */
export interface SkillRequirement {
  skill: 'building' | 'farming' | 'gathering' | 'cooking' | 'crafting' | 'social' | 'exploration' | 'combat' | 'animal_handling' | 'medicine';
  level: 0 | 1 | 2 | 3 | 4 | 5;
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
  skillRequired?: SkillRequirement;

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

  // Voxel/Layout fields (optional, for multi-tile buildings with furniture)
  layout?: string[];  // ASCII layout: ['#####', '#B.S#', ...]
  materials?: {
    wall: Material;
    floor: Material;
    door: Material;
  };
  floors?: BuildingFloor[];  // Multi-floor layouts
  species?: BuilderSpecies;   // Target species (affects ceiling heights)
  capacity?: number;          // Occupants/storage slots/beds
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
      skillRequired: { skill: 'building', level: 1 },
      unlocked: true,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['basic_tools', 'basic_items'],
          speed: 1.0,
        },
        {
          type: 'storage',
          itemTypes: ['wood', 'stone', 'iron'],
          capacity: 20,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Storage Chest - 20 item slots (1x1, 10 Wood)
    // Per progressive-skill-reveal spec: Level 0 building (no skill required)
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
      skillRequired: { skill: 'building', level: 0 },
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
    // Per progressive-skill-reveal spec: Level 0 building (no skill required)
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
      skillRequired: { skill: 'building', level: 0 },
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
        {
          type: 'storage',
          itemTypes: ['food', 'wood'],
          capacity: 10,
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
      skillRequired: { skill: 'building', level: 1 },
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
      skillRequired: { skill: 'building', level: 2 },
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
      skillRequired: { skill: 'building', level: 1 },
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
      skillRequired: { skill: 'building', level: 1 },
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
    // Per progressive-skill-reveal spec: Level 0 building (no skill required)
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
      skillRequired: { skill: 'building', level: 0 },
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
    // Per progressive-skill-reveal spec: Level 0 building (no skill required)
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
      skillRequired: { skill: 'building', level: 0 },
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

    // Register all tier 2+ buildings
    this.registerTier2Stations();
    this.registerTier3Stations();
    this.registerResearchBuildings();
    this.registerGovernanceBuildings();
    this.registerMediaBuildings();

    // Register specialized building types
    this.registerTempleBuildings();
    this.registerFarmBuildings();
    this.registerShopBuildings();
    this.registerMidwiferyBuildings();
    this.registerShipyardBuildings();
    // NOTE: Not registering GovernanceBlueprints.ts file because those buildings
    // are already registered inline in registerGovernanceBuildings() above

    // Register standard voxel buildings (houses, workshops, etc.)
    this.registerStandardVoxelBuildings();
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
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: ['iron_ingot', 'steel_sword', 'iron_tools', 'steel_ingot'],
          speed: 1.5, // +50% metalworking speed
        },
        {
          type: 'storage',
          itemTypes: ['iron', 'steel', 'coal'],
          capacity: 30,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Butchering Table - Process animals for meat (2x2, 25 Wood + 10 Stone)
    this.register({
      id: 'butchering_table',
      name: 'Butchering Table',
      description: 'A sturdy table for processing hunted animals and butchering livestock',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 25 },
        { resourceId: 'stone', amountRequired: 10 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'cooking', level: 1 },
      unlocked: true,
      buildTime: 60,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: [], // Butchering uses behavior system, not recipes
          speed: 1.0,
        },
        {
          type: 'storage',
          itemTypes: ['meat', 'hide', 'bone'],
          capacity: 15,
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
      skillRequired: { skill: 'building', level: 2 },
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
      skillRequired: { skill: 'building', level: 3 },
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
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 100,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: ['flour', 'grain_products'],
          speed: 1.0,
        },
        {
          type: 'storage',
          itemTypes: ['grain', 'flour'],
          capacity: 40,
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
      skillRequired: { skill: 'building', level: 1 },
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
      skillRequired: { skill: 'building', level: 3 },
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
      skillRequired: { skill: 'building', level: 3 },
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
      skillRequired: { skill: 'building', level: 3 },
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
      skillRequired: { skill: 'building', level: 3 },
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
   * Register buildings unlocked through research system.
   * Phase 13: Research & Discovery
   */
  registerResearchBuildings(): void {
    // === Tier 1 Research Buildings ===

    // Small Garden - Unlocked by agriculture_i
    this.register({
      id: 'small_garden',
      name: 'Small Garden',
      description: 'A small plot for growing basic crops',
      category: 'farming',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 10 },
        { resourceId: 'stone', amountRequired: 5 },
      ],
      techRequired: ['agriculture_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 1 },
      unlocked: false,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'gathering_boost',
          resourceTypes: ['vegetables', 'herbs'],
          radius: 2,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Loom - Unlocked by textiles_i
    this.register({
      id: 'loom',
      name: 'Loom',
      description: 'A weaving loom for creating cloth and textiles',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 30 },
        { resourceId: 'fiber', amountRequired: 10 },
      ],
      techRequired: ['textiles_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: false,
      buildTime: 75,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['cloth', 'simple_clothing', 'rope'],
          speed: 1.0,
        },
        {
          type: 'storage',
          itemTypes: ['fiber', 'cloth', 'rope'],
          capacity: 25,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Oven - Unlocked by cuisine_i
    this.register({
      id: 'oven',
      name: 'Oven',
      description: 'A brick oven for baking and advanced cooking',
      category: 'production',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 25 },
        { resourceId: 'clay', amountRequired: 15 },
      ],
      techRequired: ['cuisine_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 3 },
      unlocked: false,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['bread', 'pastries', 'dried_meat', 'preserved_food'],
          speed: 1.2,
        },
        {
          type: 'storage',
          itemTypes: ['flour', 'bread', 'food'],
          capacity: 20,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // === Tier 2 Research Buildings ===

    // Irrigation Channel - Unlocked by agriculture_ii
    this.register({
      id: 'irrigation_channel',
      name: 'Irrigation Channel',
      description: 'A water channel system for automatic crop watering',
      category: 'farming',
      width: 1,
      height: 4,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 20 },
        { resourceId: 'clay', amountRequired: 10 },
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['deep_water'],
      skillRequired: { skill: 'building', level: 3 },
      unlocked: false,
      buildTime: 90,
      tier: 2,
      functionality: [
        {
          type: 'automation',
          tasks: ['water_plants'],
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Warehouse - Unlocked by construction_ii
    this.register({
      id: 'warehouse',
      name: 'Warehouse',
      description: 'A large building for bulk storage',
      category: 'storage',
      width: 4,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'stone', amountRequired: 40 },
      ],
      techRequired: ['construction_ii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 150,
      tier: 2,
      functionality: [
        {
          type: 'storage',
          itemTypes: [],
          capacity: 200,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Monument - Unlocked by construction_ii
    this.register({
      id: 'monument',
      name: 'Monument',
      description: 'A decorative monument that boosts village morale',
      category: 'decoration',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 60 },
        { resourceId: 'gold', amountRequired: 5 },
      ],
      techRequired: ['construction_ii'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 180,
      tier: 2,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 15,
          radius: 8,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Alchemy Lab - Unlocked by alchemy_i
    this.register({
      id: 'alchemy_lab',
      name: 'Alchemy Lab',
      description: 'A laboratory for brewing potions and conducting experiments',
      category: 'research',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 40 },
        { resourceId: 'wood', amountRequired: 30 },
        { resourceId: 'glass', amountRequired: 15 },
      ],
      techRequired: ['alchemy_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'crafting',
          recipes: ['healing_potion', 'energy_potion', 'fertilizer', 'transmutations'],
          speed: 1.0,
        },
        {
          type: 'research',
          fields: ['alchemy'],
          bonus: 1.5,
        },
        {
          type: 'storage',
          itemTypes: ['herbs', 'potions', 'reagents'],
          capacity: 30,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Water Wheel - Unlocked by machinery_i
    this.register({
      id: 'water_wheel',
      name: 'Water Wheel',
      description: 'A water-powered wheel that provides automation power',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 50 },
        { resourceId: 'iron', amountRequired: 20 },
      ],
      techRequired: ['machinery_i'],
      terrainRequired: ['water', 'shallow_water'],
      terrainForbidden: ['deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'automation',
          tasks: ['grind_grain', 'power_machines'],
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // === Tier 3 Research Buildings ===

    // Greenhouse - Unlocked by agriculture_iii
    this.register({
      id: 'greenhouse',
      name: 'Greenhouse',
      description: 'A climate-controlled structure for growing exotic crops year-round',
      category: 'farming',
      width: 4,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 60 },
        { resourceId: 'glass', amountRequired: 40 },
        { resourceId: 'iron', amountRequired: 20 },
      ],
      techRequired: ['agriculture_iii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 180,
      tier: 3,
      functionality: [
        {
          type: 'gathering_boost',
          resourceTypes: ['exotic_crops', 'herbs', 'flowers'],
          radius: 4,
        },
        {
          type: 'automation',
          tasks: ['water_plants', 'control_temperature'],
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Grand Hall - Unlocked by construction_iii
    this.register({
      id: 'grand_hall',
      name: 'Grand Hall',
      description: 'A magnificent hall for gatherings and celebrations',
      category: 'community',
      width: 5,
      height: 4,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 100 },
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'gold', amountRequired: 10 },
      ],
      techRequired: ['construction_iii'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 300,
      tier: 3,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 25,
          radius: 15,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Conveyor System - Unlocked by construction_iii
    this.register({
      id: 'conveyor_system',
      name: 'Conveyor System',
      description: 'An automated system for moving items between buildings',
      category: 'production',
      width: 1,
      height: 3,
      resourceCost: [
        { resourceId: 'iron', amountRequired: 40 },
        { resourceId: 'wood', amountRequired: 20 },
      ],
      techRequired: ['construction_iii'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 90,
      tier: 3,
      functionality: [
        {
          type: 'automation',
          tasks: ['move_items', 'sort_items'],
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // === Tier 4 Research Buildings ===

    // Trading Post - Unlocked by society_i
    this.register({
      id: 'trading_post',
      name: 'Trading Post',
      description: 'A trading hub for commerce with other settlements',
      category: 'commercial',
      width: 4,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 70 },
        { resourceId: 'stone', amountRequired: 50 },
        { resourceId: 'gold', amountRequired: 20 },
      ],
      techRequired: ['society_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 200,
      tier: 4,
      functionality: [
        {
          type: 'shop',
          shopType: 'trading',
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Bank - Unlocked by society_i
    this.register({
      id: 'bank',
      name: 'Bank',
      description: 'A secure vault for storing currency and valuables',
      category: 'commercial',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 80 },
        { resourceId: 'iron', amountRequired: 50 },
        { resourceId: 'gold', amountRequired: 30 },
      ],
      techRequired: ['society_i'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 240,
      tier: 4,
      functionality: [
        {
          type: 'storage',
          itemTypes: ['currency', 'valuables', 'gems'],
          capacity: 1000,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // === Tier 5 Research Buildings ===

    // Arcane Tower - Unlocked by arcane_studies
    this.register({
      id: 'arcane_tower',
      name: 'Arcane Tower',
      description: 'A mystical tower for studying the arcane arts',
      category: 'research',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 100 },
        { resourceId: 'mithril_ingot', amountRequired: 20 },
        { resourceId: 'crystal', amountRequired: 30 },
      ],
      techRequired: ['arcane_studies'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 360,
      tier: 5,
      functionality: [
        {
          type: 'research',
          fields: ['arcane', 'experimental'],
          bonus: 2.0,
        },
        {
          type: 'crafting',
          recipes: ['enchanted_items', 'magical_artifacts'],
          speed: 1.0,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Inventor's Hall - Unlocked by experimental_research
    this.register({
      id: 'inventors_hall',
      name: "Inventor's Hall",
      description: 'A grand hall for experimental research and procedural invention',
      category: 'research',
      width: 5,
      height: 5,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 120 },
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'iron', amountRequired: 60 },
        { resourceId: 'gold', amountRequired: 40 },
      ],
      techRequired: ['experimental_research'],
      terrainRequired: ['grass', 'dirt', 'stone'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 480,
      tier: 5,
      functionality: [
        {
          type: 'research',
          fields: ['experimental', 'agriculture', 'construction', 'crafting', 'metallurgy', 'alchemy'],
          bonus: 2.5,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });
  }

  /**
   * Register governance buildings per governance-dashboard work order.
   * Phase 11: Governance Infrastructure & Information Systems
   *
   * These buildings provide data collection and analytics for population management.
   */
  registerGovernanceBuildings(): void {
    // Town Hall - Basic governance (3x3, 50 Wood + 20 Stone)
    this.register({
      id: 'town_hall',
      name: 'Town Hall',
      description: 'Central governance building providing basic population tracking',
      category: 'community',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 50 },
        { resourceId: 'stone', amountRequired: 20 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 240, // 4 hours = 240 minutes
      tier: 2,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 5,
          radius: 10,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Census Bureau - Demographics tracking (3x2, 100 Wood + 50 Stone + 20 Cloth)
    this.register({
      id: 'census_bureau',
      name: 'Census Bureau',
      description: 'Tracks demographics, birth/death rates, and population projections. Requires Town Hall.',
      category: 'community',
      width: 3,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 100 },
        { resourceId: 'stone', amountRequired: 50 },
        { resourceId: 'cloth', amountRequired: 20 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 480, // 8 hours
      tier: 3,
      functionality: [
        {
          type: 'governance',
          governanceType: 'demographics',
        },
        {
          type: 'knowledge_repository',
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Granary/Warehouse - Resource tracking (4x3, 80 Wood + 30 Stone)
    // Note: This is different from the research-unlocked warehouse
    this.register({
      id: 'granary',
      name: 'Granary',
      description: 'Tracks resource stockpiles, production/consumption rates, and days until depletion',
      category: 'storage',
      width: 4,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'stone', amountRequired: 30 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 360, // 6 hours
      tier: 2,
      functionality: [
        {
          type: 'storage',
          itemTypes: [],
          capacity: 1000,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Weather Station - Environmental monitoring (2x2, 60 Wood + 40 Stone + 10 Metal)
    this.register({
      id: 'weather_station',
      name: 'Weather Station',
      description: 'Provides weather forecasting and extreme weather warnings. Must be in open area.',
      category: 'community',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 60 },
        { resourceId: 'stone', amountRequired: 40 },
        { resourceId: 'iron', amountRequired: 10 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 300, // 5 hours
      tier: 2,
      functionality: [
        {
          type: 'vision_extension',
          radiusBonus: 20,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Health Clinic - Medical tracking (4x3, 100 Wood + 50 Stone + 30 Cloth)
    this.register({
      id: 'health_clinic',
      name: 'Health Clinic',
      description: 'Tracks population health, diseases, and mortality. Requires healers (1 per 20 agents).',
      category: 'community',
      width: 4,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 100 },
        { resourceId: 'stone', amountRequired: 50 },
        { resourceId: 'cloth', amountRequired: 30 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 600, // 10 hours
      tier: 3,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 10,
          radius: 8,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Meeting Hall - Social cohesion tracking (4x4, 120 Wood + 60 Stone)
    this.register({
      id: 'meeting_hall',
      name: 'Meeting Hall',
      description: 'Tracks social networks, relationships, and community cohesion',
      category: 'community',
      width: 4,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 120 },
        { resourceId: 'stone', amountRequired: 60 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 480, // 8 hours
      tier: 3,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 15,
          radius: 12,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Watchtower - Threat detection (2x2, 80 Wood + 60 Stone)
    this.register({
      id: 'watchtower',
      name: 'Watchtower',
      description: 'Detects threats and provides early warnings. Must be staffed by watchman.',
      category: 'community',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'stone', amountRequired: 60 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 360, // 6 hours
      tier: 2,
      functionality: [
        {
          type: 'vision_extension',
          radiusBonus: 30,
        },
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Labor Guild - Workforce management (3x3, 90 Wood + 40 Stone)
    this.register({
      id: 'labor_guild',
      name: 'Labor Guild',
      description: 'Tracks workforce allocation, skills, and labor efficiency. Requires Town Hall.',
      category: 'community',
      width: 3,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 90 },
        { resourceId: 'stone', amountRequired: 40 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: true,
      buildTime: 420, // 7 hours
      tier: 3,
      functionality: [
        {
          type: 'job_board',
        },
        {
          type: 'governance',
          governanceType: 'workforce',
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Archive/Library - Historical data (5x4, 150 Wood + 80 Stone + 50 Cloth)
    this.register({
      id: 'archive',
      name: 'Archive',
      description: 'Stores historical data and provides trend analysis. Requires Census Bureau + Town Hall.',
      category: 'research',
      width: 5,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 150 },
        { resourceId: 'stone', amountRequired: 80 },
        { resourceId: 'cloth', amountRequired: 50 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 3 },
      unlocked: true,
      buildTime: 720, // 12 hours
      tier: 4,
      functionality: [
        {
          type: 'research',
          fields: ['history', 'sociology', 'demographics'],
          bonus: 1.5,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });
  }

  /**
   * Register media buildings (TV station, radio station, newspaper)
   * These buildings provide information dissemination, entertainment, and news gathering.
   */
  registerMediaBuildings(): void {
    // TV Station - Television broadcasting (5x5, 120 Wood + 100 Stone + 80 Iron + 40 Glass)
    this.register({
      id: 'tv_station',
      name: 'TV Station',
      description: 'Television broadcasting facility staffed by agents. Provides entertainment and news to the population.',
      category: 'community',
      width: 5,
      height: 5,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 120 },
        { resourceId: 'stone', amountRequired: 100 },
        { resourceId: 'iron', amountRequired: 80 },
        { resourceId: 'glass', amountRequired: 40 },
      ],
      techRequired: ['electronics', 'broadcasting'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 5 },
      unlocked: false,
      buildTime: 600, // 10 hours
      tier: 4,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 15,
          radius: 30, // Wide broadcast range
        },
        {
          type: 'knowledge_repository',
        },
        {
          type: 'social_hub',
          radius: 20,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Radio Station - Audio broadcasting (4x4, 80 Wood + 60 Stone + 40 Iron)
    this.register({
      id: 'radio_station',
      name: 'Radio Station',
      description: 'Radio broadcasting facility with DJ personalities and music programming. Provides news and entertainment.',
      category: 'community',
      width: 4,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 80 },
        { resourceId: 'stone', amountRequired: 60 },
        { resourceId: 'iron', amountRequired: 40 },
      ],
      techRequired: ['radio_technology'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 4 },
      unlocked: false,
      buildTime: 480, // 8 hours
      tier: 3,
      functionality: [
        {
          type: 'mood_aura',
          moodBonus: 10,
          radius: 40, // Radio has wider range than TV
        },
        {
          type: 'knowledge_repository',
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true,
    });

    // Newspaper / Press Office (4x3, 70 Wood + 40 Stone + 30 Iron)
    this.register({
      id: 'newspaper',
      name: 'Newspaper Office',
      description: 'Newspaper publishing facility staffed by reporters, editors, and photographers. Investigates and publishes news articles.',
      category: 'community',
      width: 4,
      height: 3,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 70 },
        { resourceId: 'stone', amountRequired: 40 },
        { resourceId: 'iron', amountRequired: 30 },
      ],
      techRequired: ['printing_press'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 3 },
      unlocked: false,
      buildTime: 360, // 6 hours
      tier: 2,
      functionality: [
        {
          type: 'knowledge_repository',
        },
        {
          type: 'social_hub',
          radius: 15,
        },
        {
          type: 'storage',
          itemTypes: ['paper', 'ink', 'articles'],
          capacity: 50,
        },
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });
  }

  /**
   * Register temple/religious buildings (shrines, temples, sacred sites)
   */
  registerTempleBuildings(): void {
    for (const blueprint of TEMPLE_BLUEPRINTS) {
      this.register(blueprint);
    }
  }

  /**
   * Register farm buildings (scarecrows, sprinklers, compost bins, etc.)
   */
  registerFarmBuildings(): void {
    const farmBlueprints = getFarmBlueprints();
    for (const blueprint of farmBlueprints) {
      this.register(blueprint);
    }
  }

  /**
   * Register shop/commercial buildings (general store, blacksmith, etc.)
   */
  registerShopBuildings(): void {
    for (const blueprint of SHOP_BLUEPRINTS) {
      this.register(blueprint);
    }
  }

  /**
   * Register midwifery/maternal care buildings (birthing hut, nursery, etc.)
   */
  registerMidwiferyBuildings(): void {
    for (const blueprint of MIDWIFERY_BLUEPRINTS) {
      this.register(blueprint);
    }
  }

  /**
   * Register governance buildings from GovernanceBlueprints.ts
   * Note: This is separate from the inline governance buildings in registerGovernanceBuildings()
   */
  registerGovernanceBlueprintsFile(): void {
    for (const blueprint of GOVERNANCE_BLUEPRINTS) {
      this.register(blueprint);
    }
  }

  /**
   * Register shipyard/spaceflight buildings (shipyards, VR chambers, research labs)
   */
  registerShipyardBuildings(): void {
    for (const blueprint of SHIPYARD_BLUEPRINTS) {
      this.register(blueprint);
    }
  }

  /**
   * Register standard voxel buildings (houses, workshops, barns, towers)
   *
   * DISABLED: Voxel buildings with ASCII layout format are not compatible with
   * current rendering system. Causes beds/storage to spawn outside buildings.
   * Using legacy flat blueprints in registerTier3Stations() instead.
   */
  private registerStandardVoxelBuildings(): void {
    // DISABLED - See comment above
    // this.register(SMALL_HOUSE);
    // this.register(COZY_COTTAGE);
    // this.register(STONE_HOUSE);
    // this.register(LONGHOUSE);
    // this.register(WORKSHOP);  // Using legacy version from registerTier3Stations()
    // this.register(BARN);      // Using legacy version from registerTier3Stations()
    // this.register(STORAGE_SHED);
    // this.register(GUARD_TOWER);
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
