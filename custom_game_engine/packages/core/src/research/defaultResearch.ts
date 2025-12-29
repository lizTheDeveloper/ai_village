/**
 * Default Research Definitions - Tech Tree
 *
 * Defines the predefined tech tree for the Research & Discovery system.
 * Organized by tiers (1-5) from fundamentals to transcendence.
 *
 * Part of Phase 13: Research & Discovery
 */

import type { ResearchDefinition } from './types.js';
import { ResearchRegistry } from './ResearchRegistry.js';

/**
 * Helper to create a research definition with defaults.
 */
function defineResearch(
  id: string,
  name: string,
  description: string,
  field: ResearchDefinition['field'],
  tier: number,
  options: Partial<Omit<ResearchDefinition, 'id' | 'name' | 'description' | 'field' | 'tier' | 'type'>> = {}
): ResearchDefinition {
  return {
    id,
    name,
    description,
    field,
    tier,
    type: 'predefined',
    progressRequired: options.progressRequired ?? tier * 100,
    prerequisites: options.prerequisites ?? [],
    unlocks: options.unlocks ?? [],
    requiredItems: options.requiredItems,
    requiredBuilding: options.requiredBuilding,
  };
}

// ============================================================================
// TIER 1 - FUNDAMENTALS (no prerequisites)
// ============================================================================

export const TIER_1_RESEARCH: ResearchDefinition[] = [
  defineResearch(
    'agriculture_i',
    'Basic Agriculture',
    'Learn the fundamentals of farming, including tilling soil and planting seeds.',
    'agriculture',
    1,
    {
      progressRequired: 50,
      unlocks: [
        { type: 'recipe', recipeId: 'stone_hoe' },
        { type: 'building', buildingId: 'small_garden' },
      ],
    }
  ),

  defineResearch(
    'construction_i',
    'Basic Construction',
    'Learn to build simple structures using wood and stone.',
    'construction',
    1,
    {
      progressRequired: 50,
      unlocks: [
        { type: 'building', buildingId: 'workbench' },
        { type: 'building', buildingId: 'storage-chest' },
        { type: 'recipe', recipeId: 'wooden_hammer' },
      ],
    }
  ),

  defineResearch(
    'crafting_i',
    'Basic Crafting',
    'Learn to craft simple tools and items by hand.',
    'crafting',
    1,
    {
      progressRequired: 50,
      unlocks: [
        { type: 'recipe', recipeId: 'stone_axe' },
        { type: 'recipe', recipeId: 'stone_pickaxe' },
        { type: 'recipe', recipeId: 'rope' },
      ],
    }
  ),

  defineResearch(
    'nature_i',
    'Natural Studies',
    'Learn about the local flora and fauna.',
    'nature',
    1,
    {
      progressRequired: 50,
      unlocks: [
        { type: 'knowledge', knowledgeId: 'plant_identification' },
        { type: 'knowledge', knowledgeId: 'animal_behavior' },
      ],
    }
  ),
];

// ============================================================================
// TIER 2 - EXPANSION (requires Tier 1)
// ============================================================================

export const TIER_2_RESEARCH: ResearchDefinition[] = [
  defineResearch(
    'agriculture_ii',
    'Advanced Farming',
    'Learn irrigation techniques and basic fertilization.',
    'agriculture',
    2,
    {
      progressRequired: 150,
      prerequisites: ['agriculture_i'],
      unlocks: [
        { type: 'building', buildingId: 'irrigation_channel' },
        { type: 'recipe', recipeId: 'fertilizer' },
        { type: 'item', itemId: 'watering_can' },
      ],
    }
  ),

  defineResearch(
    'metallurgy_i',
    'Basic Metalworking',
    'Learn to smelt ore and forge basic metal tools.',
    'metallurgy',
    2,
    {
      progressRequired: 200,
      prerequisites: ['crafting_i'],
      unlocks: [
        { type: 'building', buildingId: 'forge' },
        { type: 'recipe', recipeId: 'iron_ingot' },
        { type: 'recipe', recipeId: 'copper_ingot' },
      ],
    }
  ),

  defineResearch(
    'textiles_i',
    'Basic Textiles',
    'Learn to process plant fibers into cloth.',
    'textiles',
    2,
    {
      progressRequired: 100,
      prerequisites: ['crafting_i'],
      unlocks: [
        { type: 'building', buildingId: 'loom' },
        { type: 'recipe', recipeId: 'cloth' },
        { type: 'recipe', recipeId: 'simple_clothing' },
      ],
    }
  ),

  defineResearch(
    'cuisine_i',
    'Basic Cooking',
    'Learn food preservation and simple recipes.',
    'cuisine',
    2,
    {
      progressRequired: 100,
      prerequisites: ['agriculture_i'],
      unlocks: [
        { type: 'building', buildingId: 'oven' },
        { type: 'recipe', recipeId: 'bread' },
        { type: 'recipe', recipeId: 'dried_meat' },
      ],
    }
  ),

  defineResearch(
    'construction_ii',
    'Structural Engineering',
    'Learn to build larger and more complex structures.',
    'construction',
    2,
    {
      progressRequired: 150,
      prerequisites: ['construction_i'],
      unlocks: [
        { type: 'building', buildingId: 'warehouse' },
        { type: 'building', buildingId: 'workshop' },
      ],
    }
  ),

  defineResearch(
    'society_i',
    'Social Organization',
    'Learn the basics of trade and community organization.',
    'society',
    2,
    {
      progressRequired: 100,
      prerequisites: ['nature_i'],
      unlocks: [
        { type: 'building', buildingId: 'market_stall' },
        { type: 'ability', abilityId: 'trade' },
      ],
    }
  ),
];

// ============================================================================
// TIER 3 - ADVANCEMENT (requires Tier 2)
// ============================================================================

export const TIER_3_RESEARCH: ResearchDefinition[] = [
  defineResearch(
    'agriculture_iii',
    'Greenhouse Cultivation',
    'Learn to grow crops in controlled environments.',
    'agriculture',
    3,
    {
      progressRequired: 300,
      prerequisites: ['agriculture_ii'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'building', buildingId: 'greenhouse' },
        { type: 'crop', cropId: 'hybrid_wheat' },
      ],
    }
  ),

  defineResearch(
    'metallurgy_ii',
    'Steel Forging',
    'Learn to create steel alloys for superior tools and weapons.',
    'metallurgy',
    3,
    {
      progressRequired: 350,
      prerequisites: ['metallurgy_i'],
      requiredBuilding: 'forge',
      unlocks: [
        { type: 'recipe', recipeId: 'steel_ingot' },
        { type: 'recipe', recipeId: 'steel_sword' },
        { type: 'recipe', recipeId: 'steel_pickaxe' },
      ],
    }
  ),

  defineResearch(
    'alchemy_i',
    'Basic Alchemy',
    'Learn to create potions and transform materials.',
    'alchemy',
    3,
    {
      progressRequired: 300,
      prerequisites: ['nature_i', 'cuisine_i'],
      unlocks: [
        { type: 'building', buildingId: 'alchemy_lab' },
        { type: 'recipe', recipeId: 'healing_potion' },
        { type: 'recipe', recipeId: 'energy_potion' },
      ],
    }
  ),

  defineResearch(
    'machinery_i',
    'Simple Machines',
    'Learn to build windmills and water wheels for automation.',
    'machinery',
    3,
    {
      progressRequired: 350,
      prerequisites: ['construction_ii', 'metallurgy_i'],
      unlocks: [
        { type: 'building', buildingId: 'windmill' },
        { type: 'building', buildingId: 'water_wheel' },
      ],
    }
  ),

  defineResearch(
    'textiles_ii',
    'Advanced Tailoring',
    'Learn to create fine clothing and protective gear.',
    'textiles',
    3,
    {
      progressRequired: 200,
      prerequisites: ['textiles_i'],
      unlocks: [
        { type: 'recipe', recipeId: 'leather_armor' },
        { type: 'recipe', recipeId: 'fine_clothing' },
      ],
    }
  ),
];

// ============================================================================
// TIER 4 - MASTERY (requires Tier 3)
// ============================================================================

export const TIER_4_RESEARCH: ResearchDefinition[] = [
  defineResearch(
    'agriculture_iv',
    'Legendary Crops',
    'Learn to cultivate rare and powerful plants.',
    'agriculture',
    4,
    {
      progressRequired: 500,
      prerequisites: ['agriculture_iii', 'alchemy_i'],
      requiredBuilding: 'greenhouse',
      unlocks: [
        { type: 'crop', cropId: 'moonflower' },
        { type: 'crop', cropId: 'sunfruit' },
      ],
    }
  ),

  defineResearch(
    'metallurgy_iii',
    'Legendary Alloys',
    'Learn to forge mythical metals.',
    'metallurgy',
    4,
    {
      progressRequired: 600,
      prerequisites: ['metallurgy_ii', 'alchemy_i'],
      requiredBuilding: 'forge',
      unlocks: [
        { type: 'recipe', recipeId: 'mithril_ingot' },
        { type: 'recipe', recipeId: 'adamantine_ingot' },
      ],
    }
  ),

  defineResearch(
    'society_ii',
    'Advanced Economics',
    'Master trade routes and market dynamics.',
    'society',
    4,
    {
      progressRequired: 400,
      prerequisites: ['society_i', 'construction_ii'],
      unlocks: [
        { type: 'building', buildingId: 'trading_post' },
        { type: 'building', buildingId: 'bank' },
        { type: 'ability', abilityId: 'establish_trade_route' },
      ],
    }
  ),

  defineResearch(
    'machinery_ii',
    'Complex Machinery',
    'Learn to build automated production lines.',
    'machinery',
    4,
    {
      progressRequired: 550,
      prerequisites: ['machinery_i', 'metallurgy_ii'],
      unlocks: [
        { type: 'building', buildingId: 'auto_farm' },
        { type: 'building', buildingId: 'conveyor_system' },
      ],
    }
  ),
];

// ============================================================================
// TIER 5 - TRANSCENDENCE (requires Tier 4)
// ============================================================================

export const TIER_5_RESEARCH: ResearchDefinition[] = [
  defineResearch(
    'experimental_research',
    'Experimental Methods',
    'Unlock the ability to conduct experiments and discover new things.',
    'experimental',
    5,
    {
      progressRequired: 1000,
      prerequisites: ['alchemy_i', 'metallurgy_ii', 'agriculture_iii'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'building', buildingId: 'inventors_hall' },
        { type: 'ability', abilityId: 'conduct_experiment' },
        { type: 'generated', generationType: 'procedural_invention' },
      ],
    }
  ),

  defineResearch(
    'arcane_studies',
    'Arcane Studies',
    'Delve into mysterious and magical phenomena.',
    'arcane',
    5,
    {
      progressRequired: 1200,
      prerequisites: ['alchemy_i', 'nature_i'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'building', buildingId: 'arcane_tower' },
        { type: 'item', itemId: 'enchanting_table' },
      ],
    }
  ),

  defineResearch(
    'master_architecture',
    'Master Architecture',
    'Design and build monumental structures.',
    'construction',
    5,
    {
      progressRequired: 800,
      prerequisites: ['construction_ii', 'machinery_ii'],
      unlocks: [
        { type: 'building', buildingId: 'grand_hall' },
        { type: 'building', buildingId: 'monument' },
        { type: 'ability', abilityId: 'design_custom_building' },
      ],
    }
  ),
];

// ============================================================================
// ALL DEFAULT RESEARCH
// ============================================================================

export const DEFAULT_RESEARCH: ResearchDefinition[] = [
  ...TIER_1_RESEARCH,
  ...TIER_2_RESEARCH,
  ...TIER_3_RESEARCH,
  ...TIER_4_RESEARCH,
  ...TIER_5_RESEARCH,
];

/**
 * Register all default research definitions to the registry.
 */
export function registerDefaultResearch(
  registry: ResearchRegistry = ResearchRegistry.getInstance()
): void {
  registry.registerAll(DEFAULT_RESEARCH);
}

/**
 * Get research definitions by tier.
 */
export function getResearchByTier(tier: number): ResearchDefinition[] {
  switch (tier) {
    case 1:
      return TIER_1_RESEARCH;
    case 2:
      return TIER_2_RESEARCH;
    case 3:
      return TIER_3_RESEARCH;
    case 4:
      return TIER_4_RESEARCH;
    case 5:
      return TIER_5_RESEARCH;
    default:
      return [];
  }
}

/**
 * Get the total number of predefined research projects.
 */
export function getTotalResearchCount(): number {
  return DEFAULT_RESEARCH.length;
}
