/**
 * Herbalism and Cooking Research Sets
 *
 * Extensive herbal and culinary research trees that overlap with magical alchemy.
 * Progression from mundane to magical, from basic to masterful.
 *
 * Total: ~160 papers across herbal cultivation, medicinal herbalism, cooking techniques,
 * food preservation, and gastronomy.
 */

import type { ResearchSet } from './types.js';

// ============================================================================
// TIER 1: HERBAL CULTIVATION (20 papers)
// Growing, harvesting, and basic herb preparation
// ============================================================================

export const HERBAL_CULTIVATION_SET: ResearchSet = {
  setId: 'herbal_cultivation',
  name: 'The Herbalist\'s Garden',
  description: 'Cultivating, harvesting, and preparing medicinal herbs',
  field: 'nature',

  allPapers: [
    'herb_garden_planning',
    'soil_for_medicinal_plants',
    'herb_seed_selection',
    'perennial_herb_cultivation',
    'annual_herb_cultivation',
    'companion_planting_herbs',
    'herb_watering_requirements',
    'sunlight_shade_for_herbs',
    'herb_harvest_timing',
    'moon_phase_harvesting',  // Overlap with magical herbalism
    'morning_dew_collection',
    'root_harvest_techniques',
    'leaf_harvest_methods',
    'flower_harvest_practices',
    'seed_harvest_preservation',
    'herb_drying_fundamentals',
    'air_drying_techniques',
    'bundle_drying_methods',
    'herb_storage_containers',
    'long_term_herb_preservation'
  ],

  unlocks: [
    {
      technologyId: 'herb_garden',
      papersRequired: 5,
      mandatoryPapers: ['herb_garden_planning'],
      grants: [
        { type: 'building', buildingId: 'herb_garden' },
        { type: 'ability', abilityId: 'cultivate_herbs' }
      ]
    },
    {
      technologyId: 'herb_harvesting',
      papersRequired: 8,
      mandatoryPapers: ['herb_harvest_timing', 'herb_drying_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'herb_drying_shed' },
        { type: 'ability', abilityId: 'harvest_preserve_herbs' }
      ]
    },
    {
      technologyId: 'advanced_herb_cultivation',
      papersRequired: 12,
      mandatoryPapers: ['moon_phase_harvesting'],
      grants: [
        { type: 'ability', abilityId: 'optimal_harvest_timing' }
      ]
    },
    {
      technologyId: 'master_herb_cultivation',
      papersRequired: 15,
      mandatoryPapers: ['long_term_herb_preservation'],
      grants: [
        { type: 'building', buildingId: 'master_herb_garden' },
        { type: 'ability', abilityId: 'preserve_herbal_potency' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: MEDICINAL HERBALISM (25 papers)
// Healing herbs, remedies, and treatments
// Overlaps with alchemy (extraction, preparation)
// ============================================================================

export const MEDICINAL_HERBALISM_SET: ResearchSet = {
  setId: 'medicinal_herbalism',
  name: 'The Healer\'s Pharmacopoeia',
  description: 'Medicinal herbs for healing wounds, illnesses, and ailments',
  field: 'nature',

  allPapers: [
    'wound_healing_herbs',
    'antiseptic_plant_properties',
    'yarrow_for_bleeding',
    'calendula_skin_healing',
    'comfrey_bone_knitting',
    'fever_reducing_herbs',
    'willow_bark_pain_relief',
    'elderflower_fever_treatment',
    'digestive_herbs',
    'peppermint_stomach_soothing',
    'ginger_nausea_relief',
    'chamomile_digestive_aid',
    'respiratory_herbs',
    'thyme_cough_remedy',
    'mullein_lung_support',
    'eucalyptus_breathing_aid',
    'immune_supporting_herbs',
    'echinacea_immune_boost',
    'astragalus_vitality',
    'elderberry_antiviral',
    'nervine_herbs_anxiety',
    'valerian_sleep_aid',
    'lemon_balm_calming',
    'skullcap_nervous_tension',
    'herb_dosage_determination'  // Critical overlap with alchemy
  ],

  unlocks: [
    {
      technologyId: 'basic_herbalism',
      papersRequired: 6,
      mandatoryPapers: ['wound_healing_herbs'],
      grants: [
        { type: 'building', buildingId: 'herbalist_workshop' },
        { type: 'ability', abilityId: 'basic_herbal_healing' },
        { type: 'item', itemId: 'healing_poultice' }
      ]
    },
    {
      technologyId: 'herbal_remedies',
      papersRequired: 10,
      mandatoryPapers: ['antiseptic_plant_properties', 'herb_dosage_determination'],
      grants: [
        { type: 'ability', abilityId: 'create_herbal_remedies' },
        { type: 'item', itemId: 'medicinal_tea' }
      ]
    },
    {
      technologyId: 'intermediate_herbalism',
      papersRequired: 15,
      mandatoryPapers: ['digestive_herbs', 'respiratory_herbs'],
      grants: [
        { type: 'ability', abilityId: 'treat_common_ailments' },
        { type: 'item', itemId: 'herbal_tincture' }
      ]
    },
    {
      technologyId: 'master_herbalism',
      papersRequired: 19,
      mandatoryPapers: ['immune_supporting_herbs'],
      grants: [
        { type: 'building', buildingId: 'master_herbalist_clinic' },
        { type: 'ability', abilityId: 'advanced_herbal_healing' },
        { type: 'item', itemId: 'herbal_elixir' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: ADVANCED HERBAL PREPARATIONS (20 papers)
// Extraction, distillation, infusion - OVERLAPS HEAVILY WITH ALCHEMY
// ============================================================================

export const ADVANCED_HERBAL_PREPARATIONS_SET: ResearchSet = {
  setId: 'advanced_herbal_preparations',
  name: 'The Art of Extraction',
  description: 'Advanced techniques for extracting and concentrating herbal essences',
  field: 'alchemy',  // Field overlap - this is where herbalism meets alchemy

  allPapers: [
    'cold_infusion_techniques',
    'hot_infusion_methods',
    'decoction_for_roots_bark',
    'alcohol_extraction_tinctures',  // Alchemy overlap
    'glycerin_based_extracts',
    'vinegar_herbal_extraction',
    'oil_infusion_medicinal',
    'essential_oil_steam_distillation',  // Major alchemy overlap
    'hydrosol_production',
    'double_extraction_mushrooms',
    'percolation_method',
    'maceration_techniques',
    'pressing_herbal_juices',
    'fermentation_of_herbs',  // Overlap with cooking AND alchemy
    'oxidation_prevention',
    'herbal_powder_grinding',
    'capsule_filling_techniques',
    'salve_ointment_preparation',
    'poultice_compress_methods',
    'herbal_smoking_blends'
  ],

  unlocks: [
    {
      technologyId: 'extraction_basics',
      papersRequired: 6,
      mandatoryPapers: ['alcohol_extraction_tinctures'],
      grants: [
        { type: 'building', buildingId: 'extraction_laboratory' },
        { type: 'ability', abilityId: 'extract_essences' },
        { type: 'item', itemId: 'concentrated_extract' }
      ]
    },
    {
      technologyId: 'infusion_techniques',
      papersRequired: 9,
      mandatoryPapers: ['cold_infusion_techniques', 'hot_infusion_methods'],
      grants: [
        { type: 'ability', abilityId: 'create_infusions' }
      ]
    },
    {
      technologyId: 'distillation_mastery',
      papersRequired: 12,
      mandatoryPapers: ['essential_oil_steam_distillation'],
      grants: [
        { type: 'building', buildingId: 'distillation_apparatus' },  // Alchemy building!
        { type: 'ability', abilityId: 'distill_essences' },
        { type: 'item', itemId: 'essential_oil' }
      ]
    },
    {
      technologyId: 'advanced_preparations',
      papersRequired: 15,
      mandatoryPapers: ['salve_ointment_preparation'],
      grants: [
        { type: 'ability', abilityId: 'master_preparation' },
        { type: 'item', itemId: 'herbal_salve' },
        { type: 'item', itemId: 'fermented_remedy' }
      ]
    }
  ]
};

// ============================================================================
// TIER 4: MAGICAL HERBALISM (15 papers)
// Transition from mundane to magical - full alchemy overlap
// ============================================================================

export const MAGICAL_HERBALISM_SET: ResearchSet = {
  setId: 'magical_herbalism',
  name: 'The Arcane Garden',
  description: 'Where herbalism transcends into alchemy - cultivating magical properties',
  field: 'alchemy',  // Full alchemy field

  allPapers: [
    'moonlight_herb_charging',
    'planetary_herb_correspondences',
    'elemental_herb_associations',
    'magical_harvest_rituals',
    'consecration_of_herbs',
    'herb_spirit_communication',
    'enchanted_growing_methods',
    'aetheric_essence_extraction',  // Pure alchemy
    'transmutation_of_properties',  // Pure alchemy
    'philosopher_herb_theory',
    'quintessence_distillation',  // Advanced alchemy
    'herbal_spell_components',
    'potion_ingredient_preparation',
    'magical_preservation_methods',
    'living_elixir_cultivation'
  ],

  unlocks: [
    {
      technologyId: 'magical_herb_cultivation',
      papersRequired: 5,
      mandatoryPapers: ['moonlight_herb_charging'],
      grants: [
        { type: 'building', buildingId: 'enchanted_herb_garden' },
        { type: 'ability', abilityId: 'cultivate_magical_herbs' }
      ]
    },
    {
      technologyId: 'herb_enchantment',
      papersRequired: 7,
      mandatoryPapers: ['magical_harvest_rituals', 'elemental_herb_associations'],
      grants: [
        { type: 'ability', abilityId: 'enchant_herbs' }
      ]
    },
    {
      technologyId: 'alchemical_herbalism',
      papersRequired: 10,
      mandatoryPapers: ['aetheric_essence_extraction'],
      grants: [
        { type: 'building', buildingId: 'alchemical_herb_lab' },
        { type: 'ability', abilityId: 'extract_magical_essences' },
        { type: 'item', itemId: 'quintessence_extract' }
      ]
    },
    {
      technologyId: 'living_alchemy',
      papersRequired: 13,
      mandatoryPapers: ['living_elixir_cultivation'],
      grants: [
        { type: 'ability', abilityId: 'living_alchemy' },
        { type: 'item', itemId: 'living_elixir' }
      ]
    }
  ]
};

// ============================================================================
// TIER 1: COOKING FUNDAMENTALS (20 papers)
// Basic cooking techniques and food preparation
// ============================================================================

export const COOKING_FUNDAMENTALS_SET: ResearchSet = {
  setId: 'cooking_fundamentals',
  name: 'The Kitchen Arts',
  description: 'Fundamental cooking techniques from fire to flavor',
  field: 'cuisine',

  allPapers: [
    'fire_management_cooking',
    'heat_source_selection',
    'knife_skills_fundamentals',
    'chopping_dicing_techniques',
    'ingredient_preparation',
    'mise_en_place_organization',
    'boiling_simmering_basics',
    'roasting_techniques',
    'frying_fundamentals',
    'sauteing_methods',
    'grilling_basics',
    'steaming_techniques',
    'braising_principles',
    'stewing_methods',
    'seasoning_fundamentals',
    'salt_use_timing',
    'herb_spice_combinations',
    'flavor_balancing',
    'taste_testing_methods',
    'kitchen_safety_hygiene'
  ],

  unlocks: [
    {
      technologyId: 'basic_cooking',
      papersRequired: 5,
      mandatoryPapers: ['fire_management_cooking'],
      grants: [
        { type: 'building', buildingId: 'kitchen' },
        { type: 'ability', abilityId: 'cook_basic_meals' }
      ]
    },
    {
      technologyId: 'cooking_techniques',
      papersRequired: 8,
      mandatoryPapers: ['knife_skills_fundamentals', 'seasoning_fundamentals'],
      grants: [
        { type: 'ability', abilityId: 'use_cooking_techniques' }
      ]
    },
    {
      technologyId: 'intermediate_cooking',
      papersRequired: 12,
      mandatoryPapers: ['braising_principles'],
      grants: [
        { type: 'ability', abilityId: 'cook_complex_dishes' },
        { type: 'item', itemId: 'prepared_meal' }
      ]
    },
    {
      technologyId: 'culinary_proficiency',
      papersRequired: 15,
      mandatoryPapers: ['flavor_balancing'],
      grants: [
        { type: 'building', buildingId: 'professional_kitchen' },
        { type: 'ability', abilityId: 'professional_cooking' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: ADVANCED COOKING TECHNIQUES (25 papers)
// Advanced methods, chemistry, precision
// Overlaps with alchemy (temperature, transformation, chemistry)
// ============================================================================

export const ADVANCED_COOKING_TECHNIQUES_SET: ResearchSet = {
  setId: 'advanced_cooking_techniques',
  name: 'Culinary Chemistry',
  description: 'The science and art of advanced cooking methods',
  field: 'cuisine',

  allPapers: [
    'maillard_reaction_understanding',  // Chemistry overlap
    'caramelization_science',
    'emulsification_techniques',
    'reduction_sauce_making',
    'stock_broth_fundamentals',
    'mother_sauces_five',
    'compound_butter_creation',
    'temperature_precision_cooking',  // Alchemy overlap
    'sous_vide_principles',
    'confit_preservation_flavor',
    'smoking_techniques_flavor',
    'curing_brining_methods',  // Preservation overlap
    'marination_flavor_infusion',
    'fermentation_cooking',  // Major overlap with brewing/alchemy
    'bread_yeast_fermentation',
    'sourdough_culture_maintenance',
    'pasta_dough_techniques',
    'pastry_lamination',
    'chocolate_tempering',
    'sugar_work_fundamentals',
    'molecular_gastronomy_introduction',  // Science overlap
    'spherification_techniques',
    'foam_creation_methods',
    'gel_creation_techniques',
    'flavor_pairing_science'
  ],

  unlocks: [
    {
      technologyId: 'advanced_techniques',
      papersRequired: 7,
      mandatoryPapers: ['stock_broth_fundamentals'],
      grants: [
        { type: 'ability', abilityId: 'advanced_cooking_techniques' },
        { type: 'item', itemId: 'complex_sauce' }
      ]
    },
    {
      technologyId: 'sauce_making',
      papersRequired: 10,
      mandatoryPapers: ['mother_sauces_five', 'reduction_sauce_making'],
      grants: [
        { type: 'ability', abilityId: 'create_sauces' }
      ]
    },
    {
      technologyId: 'fermentation_mastery',
      papersRequired: 13,
      mandatoryPapers: ['fermentation_cooking'],
      grants: [
        { type: 'building', buildingId: 'fermentation_chamber' },
        { type: 'ability', abilityId: 'master_fermentation' },
        { type: 'item', itemId: 'fermented_food' }
      ]
    },
    {
      technologyId: 'pastry_baking',
      papersRequired: 15,
      mandatoryPapers: ['bread_yeast_fermentation', 'pastry_lamination'],
      grants: [
        { type: 'ability', abilityId: 'bake_pastries' }
      ]
    },
    {
      technologyId: 'molecular_gastronomy',
      papersRequired: 19,
      mandatoryPapers: ['molecular_gastronomy_introduction'],
      grants: [
        { type: 'building', buildingId: 'molecular_gastronomy_lab' },
        { type: 'ability', abilityId: 'molecular_cooking' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: FOOD PRESERVATION (15 papers)
// Preserving food through various methods
// Overlaps with alchemy (salt, acid, transformation)
// ============================================================================

export const FOOD_PRESERVATION_SET: ResearchSet = {
  setId: 'food_preservation',
  name: 'The Art of Preservation',
  description: 'Extending shelf life through salt, smoke, acid, and sugar',
  field: 'cuisine',

  allPapers: [
    'salt_preservation_fundamentals',
    'dry_salting_techniques',
    'brine_preservation',
    'smoking_preservation_flavor',
    'cold_smoking_methods',
    'hot_smoking_techniques',
    'drying_dehydration',
    'sun_drying_foods',
    'air_drying_methods',
    'pickling_fundamentals',
    'vinegar_preservation',
    'lacto_fermentation',  // Overlap with fermentation/alchemy
    'sugar_preservation',
    'jam_jelly_making',
    'long_term_food_storage'
  ],

  unlocks: [
    {
      technologyId: 'basic_preservation',
      papersRequired: 4,
      mandatoryPapers: ['salt_preservation_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'smokehouse' },
        { type: 'ability', abilityId: 'preserve_food' },
        { type: 'item', itemId: 'preserved_meat' }
      ]
    },
    {
      technologyId: 'smoking_drying',
      papersRequired: 6,
      mandatoryPapers: ['drying_dehydration', 'smoking_preservation_flavor'],
      grants: [
        { type: 'ability', abilityId: 'smoke_dry_foods' }
      ]
    },
    {
      technologyId: 'fermentation_preservation',
      papersRequired: 9,
      mandatoryPapers: ['lacto_fermentation'],
      grants: [
        { type: 'building', buildingId: 'pickling_house' },
        { type: 'ability', abilityId: 'ferment_preserve' },
        { type: 'item', itemId: 'pickled_vegetables' }
      ]
    },
    {
      technologyId: 'master_preservation',
      papersRequired: 12,
      mandatoryPapers: ['long_term_food_storage'],
      grants: [
        { type: 'building', buildingId: 'preservation_facility' },
        { type: 'ability', abilityId: 'preserve_all_foods' }
      ]
    }
  ]
};

// ============================================================================
// TIER 4: CULINARY ARTS & GASTRONOMY (20 papers)
// High-level culinary arts, plating, flavor theory
// ============================================================================

export const CULINARY_ARTS_GASTRONOMY_SET: ResearchSet = {
  setId: 'culinary_arts_gastronomy',
  name: 'The Culinary Masters',
  description: 'High culinary arts, flavor philosophy, and gastronomic excellence',
  field: 'cuisine',

  allPapers: [
    'flavor_theory_fundamentals',
    'taste_receptor_science',
    'umami_fifth_taste',
    'flavor_layering_techniques',
    'texture_contrast_theory',
    'temperature_contrast_plating',
    'color_theory_plating',
    'visual_presentation_techniques',
    'plating_composition',
    'garnish_selection_purpose',
    'seasonal_ingredient_selection',
    'terroir_flavor_impact',
    'ingredient_quality_assessment',
    'menu_design_principles',
    'course_progression_theory',
    'wine_food_pairing',
    'beverage_pairing_science',
    'culinary_creativity_theory',
    'recipe_development_methodology',
    'gastronomy_philosophy'
  ],

  unlocks: [
    {
      technologyId: 'culinary_artistry',
      papersRequired: 6,
      mandatoryPapers: ['flavor_theory_fundamentals'],
      grants: [
        { type: 'ability', abilityId: 'artistic_plating' },
        { type: 'item', itemId: 'gourmet_dish' }
      ]
    },
    {
      technologyId: 'presentation_skills',
      papersRequired: 9,
      mandatoryPapers: ['plating_composition', 'visual_presentation_techniques'],
      grants: [
        { type: 'ability', abilityId: 'plate_beautifully' }
      ]
    },
    {
      technologyId: 'haute_cuisine',
      papersRequired: 13,
      mandatoryPapers: ['menu_design_principles'],
      grants: [
        { type: 'building', buildingId: 'fine_dining_restaurant' },
        { type: 'ability', abilityId: 'haute_cuisine' }
      ]
    },
    {
      technologyId: 'gastronomic_mastery',
      papersRequired: 16,
      mandatoryPapers: ['gastronomy_philosophy'],
      grants: [
        { type: 'building', buildingId: 'culinary_academy' },
        { type: 'ability', abilityId: 'gastronomic_innovation' }
      ]
    }
  ]
};

// ============================================================================
// TIER 5: BREWING & BEVERAGES (15 papers)
// Alcoholic and non-alcoholic beverages
// MAJOR overlap with alchemy (fermentation, distillation)
// ============================================================================

export const BREWING_BEVERAGES_SET: ResearchSet = {
  setId: 'brewing_beverages',
  name: 'The Brewer\'s Art',
  description: 'Brewing beer, wine, spirits, and crafting beverages',
  field: 'alchemy',  // Field overlap - brewing is practical alchemy

  allPapers: [
    'yeast_fermentation_beverages',  // Alchemy overlap
    'beer_brewing_fundamentals',
    'malt_preparation',
    'hop_selection_preservation',
    'wort_creation',
    'fermentation_temperature_control',
    'wine_making_principles',
    'grape_juice_fermentation',
    'wine_aging_techniques',
    'distillation_spirits',  // MAJOR alchemy overlap
    'alcohol_purification',
    'spirit_aging_barrels',
    'herbal_beverage_infusion',
    'tea_preparation_art',
    'coffee_roasting_brewing'
  ],

  unlocks: [
    {
      technologyId: 'brewing_basics',
      papersRequired: 4,
      mandatoryPapers: ['yeast_fermentation_beverages'],
      grants: [
        { type: 'building', buildingId: 'brewery' },
        { type: 'ability', abilityId: 'brew_beer' },
        { type: 'item', itemId: 'beer' }
      ]
    },
    {
      technologyId: 'beer_brewing',
      papersRequired: 6,
      mandatoryPapers: ['beer_brewing_fundamentals', 'wort_creation'],
      grants: [
        { type: 'ability', abilityId: 'brew_quality_beer' }
      ]
    },
    {
      technologyId: 'wine_making',
      papersRequired: 8,
      mandatoryPapers: ['wine_making_principles'],
      grants: [
        { type: 'building', buildingId: 'winery' },
        { type: 'ability', abilityId: 'make_wine' },
        { type: 'item', itemId: 'wine' }
      ]
    },
    {
      technologyId: 'distillation_spirits',
      papersRequired: 11,
      mandatoryPapers: ['distillation_spirits'],
      grants: [
        { type: 'building', buildingId: 'distillery' },  // Alchemy building!
        { type: 'ability', abilityId: 'distill_spirits' },
        { type: 'item', itemId: 'distilled_spirit' }
      ]
    }
  ]
};

// Export all herbalism and cooking research sets
export const HERBALISM_COOKING_RESEARCH_SETS = [
  HERBAL_CULTIVATION_SET,                   // 20 papers
  MEDICINAL_HERBALISM_SET,                  // 25 papers
  ADVANCED_HERBAL_PREPARATIONS_SET,         // 20 papers - ALCHEMY OVERLAP
  MAGICAL_HERBALISM_SET,                    // 15 papers - FULL ALCHEMY
  COOKING_FUNDAMENTALS_SET,                 // 20 papers
  ADVANCED_COOKING_TECHNIQUES_SET,          // 25 papers - CHEMISTRY OVERLAP
  FOOD_PRESERVATION_SET,                    // 15 papers
  CULINARY_ARTS_GASTRONOMY_SET,             // 20 papers
  BREWING_BEVERAGES_SET                     // 15 papers - ALCHEMY OVERLAP
];

// Total: 175 papers
// Herbalism: 80 papers (20 + 25 + 20 + 15)
// Cooking: 95 papers (20 + 25 + 15 + 20 + 15)
