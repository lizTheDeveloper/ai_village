import type { TechnologyDefinition } from './types.js';

/**
 * Technology Definitions
 *
 * Technologies are unlocked when ALL required papers have been published.
 * Each technology grants specific abilities, recipes, buildings, or other benefits.
 */

// ============================================================================
// AGRICULTURE TECHNOLOGIES
// ============================================================================

export const AGRICULTURE_I: TechnologyDefinition = {
  id: 'agriculture_i',
  name: 'Basic Agriculture',
  description: 'Foundational farming knowledge: seed selection and soil preparation enable sustainable food production.',
  requiredPapers: ['seed_selection', 'soil_preparation'],
  unlocks: [
    { type: 'building', buildingId: 'farm_plot' },
    { type: 'crop', cropId: 'wheat' },
    { type: 'crop', cropId: 'carrot' },
    { type: 'ability', abilityId: 'plant_crops' }
  ]
};

export const AGRICULTURE_II: TechnologyDefinition = {
  id: 'agriculture_ii',
  name: 'Advanced Farming',
  description: 'Irrigation and fertilization techniques dramatically improve crop yields and reliability.',
  requiredPapers: ['irrigation_principles', 'fertilization_theory'],
  unlocks: [
    { type: 'building', buildingId: 'irrigation_channel' },
    { type: 'building', buildingId: 'compost_heap' },
    { type: 'recipe', recipeId: 'fertilizer' },
    { type: 'crop', cropId: 'potato' },
    { type: 'crop', cropId: 'corn' }
  ]
};

export const AGRICULTURE_III: TechnologyDefinition = {
  id: 'agriculture_iii',
  name: 'Sustainable Agriculture',
  description: 'Crop rotation maintains soil health indefinitely, enabling permanent settlements.',
  requiredPapers: ['crop_rotation'],
  unlocks: [
    { type: 'ability', abilityId: 'plan_crop_rotation' },
    { type: 'crop', cropId: 'beans' },
    { type: 'crop', cropId: 'clover' }
  ]
};

export const GREENHOUSE_CULTIVATION: TechnologyDefinition = {
  id: 'greenhouse_cultivation',
  name: 'Greenhouse Cultivation',
  description: 'Climate control and year-round growing liberate agriculture from seasonal constraints.',
  requiredPapers: ['climate_control', 'year_round_growing'],
  unlocks: [
    { type: 'building', buildingId: 'greenhouse' },
    { type: 'building', buildingId: 'heated_greenhouse' },
    { type: 'crop', cropId: 'tomato' },
    { type: 'crop', cropId: 'pepper' },
    { type: 'ability', abilityId: 'year_round_farming' }
  ]
};

// ============================================================================
// METALLURGY TECHNOLOGIES
// ============================================================================

export const BASIC_METALLURGY: TechnologyDefinition = {
  id: 'basic_metallurgy',
  name: 'Basic Metallurgy',
  description: 'Ore identification, smelting, and basic iron working form the foundation of metal crafting.',
  requiredPapers: ['ore_identification', 'smelting_fundamentals', 'iron_working'],
  unlocks: [
    { type: 'building', buildingId: 'furnace' },
    { type: 'building', buildingId: 'smithy' },
    { type: 'recipe', recipeId: 'iron_ingot' },
    { type: 'recipe', recipeId: 'iron_tools' },
    { type: 'item', itemId: 'iron_ore' }
  ]
};

export const STEEL_FORGING: TechnologyDefinition = {
  id: 'steel_forging',
  name: 'Steel Forging',
  description: 'Carbon infusion and heat treatment transform iron into superior steel.',
  requiredPapers: ['iron_working', 'carbon_infusion', 'quenching_theory'],
  unlocks: [
    { type: 'recipe', recipeId: 'steel_ingot' },
    { type: 'recipe', recipeId: 'steel_tools' },
    { type: 'recipe', recipeId: 'steel_weapons' },
    { type: 'recipe', recipeId: 'steel_armor' }
  ]
};

export const ADVANCED_METALLURGY: TechnologyDefinition = {
  id: 'advanced_metallurgy',
  name: 'Advanced Metallurgy',
  description: 'Alloy theory and advanced steel techniques unlock superior materials.',
  requiredPapers: ['carbon_infusion', 'alloy_theory'],
  unlocks: [
    { type: 'recipe', recipeId: 'bronze' },
    { type: 'recipe', recipeId: 'brass' },
    { type: 'recipe', recipeId: 'high_carbon_steel' },
    { type: 'building', buildingId: 'advanced_forge' }
  ]
};

export const LEGENDARY_METALS: TechnologyDefinition = {
  id: 'legendary_metals',
  name: 'Legendary Metalworking',
  description: 'Master techniques produce metals of extraordinary quality, bordering on the magical.',
  requiredPapers: ['alloy_theory', 'legendary_metallurgy'],
  unlocks: [
    { type: 'recipe', recipeId: 'masterwork_tools' },
    { type: 'recipe', recipeId: 'legendary_weapons' },
    { type: 'recipe', recipeId: 'legendary_armor' },
    { type: 'ability', abilityId: 'masterwork_smithing' }
  ]
};

// ============================================================================
// ALCHEMY TECHNOLOGIES
// ============================================================================

export const BASIC_ALCHEMY: TechnologyDefinition = {
  id: 'basic_alchemy',
  name: 'Basic Alchemy',
  description: 'Substance identification and extraction methods enable safe alchemical experimentation.',
  requiredPapers: ['substance_identification', 'extraction_methods'],
  unlocks: [
    { type: 'building', buildingId: 'alchemy_lab' },
    { type: 'recipe', recipeId: 'distilled_water' },
    { type: 'recipe', recipeId: 'alcohol' },
    { type: 'ability', abilityId: 'basic_alchemy' }
  ]
};

export const ADVANCED_ALCHEMY: TechnologyDefinition = {
  id: 'advanced_alchemy',
  name: 'Advanced Alchemy',
  description: 'Mixture theory enables prediction and control of alchemical reactions.',
  requiredPapers: ['mixture_theory'],
  unlocks: [
    { type: 'recipe', recipeId: 'acid' },
    { type: 'recipe', recipeId: 'alkali' },
    { type: 'recipe', recipeId: 'volatile_compounds' },
    { type: 'building', buildingId: 'advanced_laboratory' }
  ]
};

export const MEDICINE: TechnologyDefinition = {
  id: 'medicine',
  name: 'Practical Medicine',
  description: 'Potion formulation transforms alchemy into healing science.',
  requiredPapers: ['potion_formulation'],
  unlocks: [
    { type: 'recipe', recipeId: 'healing_potion' },
    { type: 'recipe', recipeId: 'antidote' },
    { type: 'recipe', recipeId: 'medicine' },
    { type: 'building', buildingId: 'apothecary' }
  ]
};

export const TRANSMUTATION: TechnologyDefinition = {
  id: 'transmutation',
  name: 'Transmutation',
  description: 'The ability to fundamentally transform substances, rarely but reproducibly.',
  requiredPapers: ['transmutation_principles'],
  unlocks: [
    { type: 'recipe', recipeId: 'transmute_metal' },
    { type: 'recipe', recipeId: 'purify_substance' },
    { type: 'building', buildingId: 'transmutation_circle' }
  ]
};

export const LEGENDARY_ALCHEMY: TechnologyDefinition = {
  id: 'legendary_alchemy',
  name: 'Grand Alchemy',
  description: 'The synthesis of all alchemical knowledge, approaching the legendary Philosopher\'s Stone.',
  requiredPapers: ['grand_alchemy'],
  unlocks: [
    { type: 'recipe', recipeId: 'universal_solvent' },
    { type: 'recipe', recipeId: 'elixir_of_life' },
    { type: 'recipe', recipeId: 'philosophers_stone_fragment' },
    { type: 'ability', abilityId: 'grand_alchemy' }
  ]
};

// ============================================================================
// EXPORTS
// ============================================================================

export const ALL_TECHNOLOGIES = [
  // Agriculture
  AGRICULTURE_I,
  AGRICULTURE_II,
  AGRICULTURE_III,
  GREENHOUSE_CULTIVATION,
  // Metallurgy
  BASIC_METALLURGY,
  STEEL_FORGING,
  ADVANCED_METALLURGY,
  LEGENDARY_METALS,
  // Alchemy
  BASIC_ALCHEMY,
  ADVANCED_ALCHEMY,
  MEDICINE,
  TRANSMUTATION,
  LEGENDARY_ALCHEMY
];

/**
 * Helper function to get technology by ID
 */
export function getTechnology(id: string): TechnologyDefinition | undefined {
  return ALL_TECHNOLOGIES.find(tech => tech.id === id);
}

/**
 * Helper function to get all technologies that require a specific paper
 */
export function getTechnologiesRequiringPaper(paperId: string): TechnologyDefinition[] {
  return ALL_TECHNOLOGIES.filter(tech =>
    tech.requiredPapers.includes(paperId)
  );
}

/**
 * Helper function to check if a technology is unlocked given a set of published papers
 */
export function isTechnologyUnlocked(
  technologyId: string,
  publishedPapers: Set<string>
): boolean {
  const tech = getTechnology(technologyId);
  if (!tech) return false;

  return tech.requiredPapers.every(paperId => publishedPapers.has(paperId));
}
