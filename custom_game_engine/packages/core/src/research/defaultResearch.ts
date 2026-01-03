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

  // === Writing & Communication ===
  defineResearch(
    'pictographic_writing',
    'Pictographic Writing',
    'Develop symbols scratched in clay or carved in stone. Not quite words, but better than pointing at things.',
    'society',
    1,
    {
      progressRequired: 75,
      unlocks: [
        { type: 'ability', abilityId: 'create_clay_tablet' },
        { type: 'ability', abilityId: 'record_recipe_tablet' },
        { type: 'knowledge', knowledgeId: 'basic_symbols' },
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

  // === Writing & Communication Tier 2 ===
  defineResearch(
    'scrolls_and_ink',
    'Scrolls and Ink',
    'Develop papyrus, parchment, and proper writing implements. Finally, recipes longer than "cook until done."',
    'society',
    2,
    {
      progressRequired: 150,
      prerequisites: ['pictographic_writing', 'textiles_i'],
      unlocks: [
        { type: 'ability', abilityId: 'create_scroll' },
        { type: 'ability', abilityId: 'write_treatise' },
        { type: 'recipe', recipeId: 'ink' },
        { type: 'recipe', recipeId: 'parchment' },
        { type: 'building', buildingId: 'scriptorium' },
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

  defineResearch(
    'genetics_i',
    'Basic Genetics',
    'Study heredity, traits, and the fundamentals of biological inheritance.',
    'genetics',
    3,
    {
      progressRequired: 300,
      prerequisites: ['nature_i', 'alchemy_i'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'knowledge', knowledgeId: 'genetic_theory' },
        { type: 'knowledge', knowledgeId: 'trait_inheritance' },
        { type: 'ability', abilityId: 'analyze_genetics' },
      ],
    }
  ),

  // === Writing & Communication Tier 3 ===
  defineResearch(
    'bookbinding',
    'Bookbinding',
    'The art of binding pages into codices. Now your recipes can have chapters, indexes, and that new book smell.',
    'society',
    3,
    {
      progressRequired: 250,
      prerequisites: ['scrolls_and_ink', 'construction_ii'],
      unlocks: [
        { type: 'ability', abilityId: 'create_book' },
        { type: 'ability', abilityId: 'write_cookbook' },
        { type: 'ability', abilityId: 'write_chronicle' },
        { type: 'building', buildingId: 'library' },
        { type: 'recipe', recipeId: 'leather_binding' },
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

  defineResearch(
    'genetics_ii',
    'Selective Breeding',
    'Master controlled breeding programs to enhance desired traits.',
    'genetics',
    4,
    {
      progressRequired: 500,
      prerequisites: ['genetics_i', 'agriculture_iii'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'building', buildingId: 'breeding_facility' },
        { type: 'ability', abilityId: 'selective_breeding' },
        { type: 'ability', abilityId: 'trait_selection' },
        { type: 'knowledge', knowledgeId: 'pedigree_analysis' },
      ],
    }
  ),

  // === Writing & Communication Tier 4 ===
  defineResearch(
    'printing_press',
    'Printing Press',
    'Mass produce written works. Every cook can now be a published author. The world trembles.',
    'machinery',
    4,
    {
      progressRequired: 450,
      prerequisites: ['bookbinding', 'machinery_i', 'metallurgy_ii'],
      unlocks: [
        { type: 'building', buildingId: 'printing_press' },
        { type: 'ability', abilityId: 'mass_print' },
        { type: 'ability', abilityId: 'publish_newspaper' },
        { type: 'ability', abilityId: 'print_pamphlet' },
      ],
    }
  ),
];

// ============================================================================
// DISCOVERY NODES - Unlock LLM-generated technologies in sparse fields
// These allow agents to propose new research in under-developed areas
// ============================================================================

export const DISCOVERY_NODE_RESEARCH: ResearchDefinition[] = [
  // Alchemy Discovery Path
  defineResearch(
    'alchemy_foundations',
    'Alchemical Foundations',
    'Study the fundamental principles of transformation and transmutation, opening paths to new discoveries.',
    'alchemy',
    2,
    {
      progressRequired: 150,
      prerequisites: ['nature_i', 'cuisine_i'],
      unlocks: [
        { type: 'knowledge', knowledgeId: 'transmutation_theory' },
        { type: 'generated', generationType: 'alchemy_discovery' },
      ],
    }
  ),

  defineResearch(
    'alchemy_experimentation',
    'Alchemical Experimentation',
    'Master the art of combining reagents to discover new potions and transformations.',
    'alchemy',
    4,
    {
      progressRequired: 400,
      prerequisites: ['alchemy_i'],
      requiredBuilding: 'alchemy_lab',
      unlocks: [
        { type: 'ability', abilityId: 'alchemical_experiment' },
        { type: 'generated', generationType: 'advanced_alchemy' },
      ],
    }
  ),

  // Cuisine Discovery Path
  defineResearch(
    'culinary_arts',
    'Culinary Arts',
    'Elevate cooking from survival to art. Discover new flavor combinations and preservation techniques.',
    'cuisine',
    3,
    {
      progressRequired: 200,
      prerequisites: ['cuisine_i', 'alchemy_i'],
      unlocks: [
        { type: 'recipe', recipeId: 'spice_blend' },
        { type: 'recipe', recipeId: 'preserved_food' },
        { type: 'generated', generationType: 'cuisine_discovery' },
      ],
    }
  ),

  defineResearch(
    'fermentation_science',
    'Fermentation Science',
    'Harness the power of fermentation to create wines, cheeses, and medicinal cultures.',
    'cuisine',
    4,
    {
      progressRequired: 350,
      prerequisites: ['culinary_arts'],
      unlocks: [
        { type: 'building', buildingId: 'fermentation_vat' },
        { type: 'recipe', recipeId: 'wine' },
        { type: 'recipe', recipeId: 'cheese' },
        { type: 'generated', generationType: 'fermentation_discovery' },
      ],
    }
  ),

  // Nature/Herbalism Discovery Path
  defineResearch(
    'herbalism',
    'Herbalism',
    'Study the medicinal and magical properties of plants.',
    'nature',
    2,
    {
      progressRequired: 120,
      prerequisites: ['nature_i'],
      unlocks: [
        { type: 'knowledge', knowledgeId: 'herb_identification' },
        { type: 'recipe', recipeId: 'herbal_remedy' },
        { type: 'generated', generationType: 'herb_discovery' },
      ],
    }
  ),

  defineResearch(
    'animal_husbandry',
    'Animal Husbandry',
    'Learn to breed, train, and care for animals beyond mere hunting.',
    'nature',
    3,
    {
      progressRequired: 250,
      prerequisites: ['herbalism', 'agriculture_ii'],
      unlocks: [
        { type: 'building', buildingId: 'animal_pen' },
        { type: 'ability', abilityId: 'tame_animal' },
        { type: 'generated', generationType: 'animal_discovery' },
      ],
    }
  ),

  defineResearch(
    'ecology_mastery',
    'Ecology Mastery',
    'Understand the interconnected web of life and how to influence it.',
    'nature',
    4,
    {
      progressRequired: 400,
      prerequisites: ['animal_husbandry', 'genetics_i'],
      unlocks: [
        { type: 'ability', abilityId: 'ecosystem_analysis' },
        { type: 'generated', generationType: 'ecology_discovery' },
      ],
    }
  ),

  // Crafting Discovery Path
  defineResearch(
    'advanced_toolmaking',
    'Advanced Toolmaking',
    'Master the craft of creating specialized tools for every profession.',
    'crafting',
    2,
    {
      progressRequired: 130,
      prerequisites: ['crafting_i'],
      unlocks: [
        { type: 'recipe', recipeId: 'specialized_tools' },
        { type: 'generated', generationType: 'tool_invention' },
      ],
    }
  ),

  defineResearch(
    'jewelcraft',
    'Jewelcraft',
    'Learn to work precious metals and gems into beautiful and functional items.',
    'crafting',
    3,
    {
      progressRequired: 280,
      prerequisites: ['advanced_toolmaking', 'metallurgy_i'],
      unlocks: [
        { type: 'building', buildingId: 'jewelers_bench' },
        { type: 'recipe', recipeId: 'silver_ring' },
        { type: 'generated', generationType: 'jewelry_discovery' },
      ],
    }
  ),

  defineResearch(
    'master_craftsmanship',
    'Master Craftsmanship',
    'Achieve mastery over material and form, creating items of legendary quality.',
    'crafting',
    5,
    {
      progressRequired: 600,
      prerequisites: ['jewelcraft', 'metallurgy_ii'],
      unlocks: [
        { type: 'ability', abilityId: 'masterwork_creation' },
        { type: 'generated', generationType: 'mastercraft_discovery' },
      ],
    }
  ),

  // Arcane Discovery Path (pre-tier-5)
  defineResearch(
    'arcane_theory',
    'Arcane Theory',
    'Begin to understand the fundamental principles underlying magical phenomena.',
    'arcane',
    2,
    {
      progressRequired: 180,
      prerequisites: ['nature_i'],
      unlocks: [
        { type: 'knowledge', knowledgeId: 'mana_theory' },
        { type: 'generated', generationType: 'arcane_insight' },
      ],
    }
  ),

  defineResearch(
    'runecraft_basics',
    'Runecraft Basics',
    'Learn to inscribe magical symbols that store and channel power.',
    'arcane',
    3,
    {
      progressRequired: 300,
      prerequisites: ['arcane_theory', 'bookbinding'],
      unlocks: [
        { type: 'recipe', recipeId: 'rune_stone' },
        { type: 'ability', abilityId: 'inscribe_rune' },
        { type: 'generated', generationType: 'rune_discovery' },
      ],
    }
  ),

  defineResearch(
    'enchanting_fundamentals',
    'Enchanting Fundamentals',
    'Learn to imbue objects with lasting magical properties.',
    'arcane',
    4,
    {
      progressRequired: 450,
      prerequisites: ['runecraft_basics', 'alchemy_i'],
      requiredBuilding: 'alchemy_lab',
      unlocks: [
        { type: 'building', buildingId: 'enchanting_circle' },
        { type: 'ability', abilityId: 'basic_enchantment' },
        { type: 'generated', generationType: 'enchantment_discovery' },
      ],
    }
  ),

  // Textiles Discovery Path (tier 4-5)
  defineResearch(
    'magical_weaving',
    'Magical Weaving',
    'Weave enchantments directly into fabric, creating cloth with supernatural properties.',
    'textiles',
    4,
    {
      progressRequired: 380,
      prerequisites: ['textiles_ii', 'runecraft_basics'],
      unlocks: [
        { type: 'recipe', recipeId: 'enchanted_cloth' },
        { type: 'generated', generationType: 'magical_textile' },
      ],
    }
  ),

  // Medicine Discovery Path (new sub-field of nature/alchemy)
  defineResearch(
    'anatomy_studies',
    'Anatomy Studies',
    'Study the structure of living bodies to understand health and illness.',
    'nature',
    3,
    {
      progressRequired: 250,
      prerequisites: ['herbalism', 'alchemy_i'],
      requiredBuilding: 'library',
      unlocks: [
        { type: 'knowledge', knowledgeId: 'anatomy_basics' },
        { type: 'ability', abilityId: 'diagnose_illness' },
        { type: 'generated', generationType: 'medical_discovery' },
      ],
    }
  ),

  defineResearch(
    'surgery',
    'Surgery',
    'Learn to heal through precise intervention, treating wounds and ailments beyond medicine alone.',
    'nature',
    4,
    {
      progressRequired: 450,
      prerequisites: ['anatomy_studies', 'metallurgy_ii'],
      unlocks: [
        { type: 'building', buildingId: 'surgery_theater' },
        { type: 'recipe', recipeId: 'surgical_tools' },
        { type: 'generated', generationType: 'surgical_discovery' },
      ],
    }
  ),

  // Music/Art Discovery Path (new)
  defineResearch(
    'musical_instruments',
    'Musical Instruments',
    'Create and master instruments that produce sound and stir the soul.',
    'crafting',
    2,
    {
      progressRequired: 140,
      prerequisites: ['crafting_i', 'textiles_i'],
      unlocks: [
        { type: 'recipe', recipeId: 'drum' },
        { type: 'recipe', recipeId: 'flute' },
        { type: 'generated', generationType: 'instrument_discovery' },
      ],
    }
  ),

  defineResearch(
    'bardic_tradition',
    'Bardic Tradition',
    'Learn the ancient art of weaving magic through song and story.',
    'arcane',
    3,
    {
      progressRequired: 280,
      prerequisites: ['musical_instruments', 'arcane_theory'],
      unlocks: [
        { type: 'ability', abilityId: 'perform_song' },
        { type: 'knowledge', knowledgeId: 'song_magic_theory' },
        { type: 'generated', generationType: 'bardic_discovery' },
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

  defineResearch(
    'genetic_engineering',
    'Genetic Engineering',
    'Unlock the ability to directly modify genetic code and manipulate hereditary traits.',
    'genetics',
    5,
    {
      progressRequired: 1000,
      prerequisites: ['genetics_ii', 'alchemy_i', 'experimental_research'],
      requiredBuilding: 'inventors_hall',
      requiredItems: [
        { itemId: 'rare_essence', amount: 10 },
        { itemId: 'research_notes', amount: 50 },
      ],
      unlocks: [
        { type: 'building', buildingId: 'gene_lab' },
        { type: 'ability', abilityId: 'gene_splicing' },
        { type: 'ability', abilityId: 'modify_genome' },
        { type: 'knowledge', knowledgeId: 'genetic_code' },
      ],
    }
  ),

  defineResearch(
    'chimera_synthesis',
    'Chimera Synthesis',
    'Master the forbidden art of creating hybrid life forms by fusing multiple species.',
    'genetics',
    5,
    {
      progressRequired: 1500,
      prerequisites: ['genetic_engineering', 'arcane_studies'],
      requiredBuilding: 'gene_lab',
      requiredItems: [
        { itemId: 'mythical_essence', amount: 5 },
        { itemId: 'genetic_samples', amount: 20 },
      ],
      unlocks: [
        { type: 'ability', abilityId: 'create_chimera' },
        { type: 'ability', abilityId: 'species_fusion' },
        { type: 'recipe', recipeId: 'chimera_serum' },
        { type: 'knowledge', knowledgeId: 'multi_species_genetics' },
      ],
    }
  ),

  defineResearch(
    'trait_engineering',
    'Trait Engineering',
    'Design and install specific genetic traits with precision control.',
    'genetics',
    5,
    {
      progressRequired: 1200,
      prerequisites: ['genetic_engineering'],
      requiredBuilding: 'gene_lab',
      requiredItems: [
        { itemId: 'trait_catalyst', amount: 15 },
      ],
      unlocks: [
        { type: 'ability', abilityId: 'install_trait' },
        { type: 'ability', abilityId: 'remove_trait' },
        { type: 'ability', abilityId: 'enhance_trait' },
        { type: 'recipe', recipeId: 'trait_serum' },
      ],
    }
  ),

  defineResearch(
    'mutation_control',
    'Mutation Control',
    'Learn to trigger and direct beneficial mutations while suppressing harmful ones.',
    'genetics',
    5,
    {
      progressRequired: 1100,
      prerequisites: ['genetic_engineering'],
      requiredBuilding: 'gene_lab',
      unlocks: [
        { type: 'ability', abilityId: 'induced_mutation' },
        { type: 'ability', abilityId: 'mutation_suppression' },
        { type: 'ability', abilityId: 'directed_evolution' },
        { type: 'recipe', recipeId: 'mutagen' },
        { type: 'recipe', recipeId: 'stabilizer' },
      ],
    }
  ),

  defineResearch(
    'genetic_autonomy',
    'Genetic Autonomy',
    'The pinnacle of genetic mastery - enable beings to freely choose and modify their own genetic traits.',
    'genetics',
    5,
    {
      progressRequired: 2000,
      prerequisites: ['trait_engineering', 'mutation_control', 'chimera_synthesis'],
      requiredBuilding: 'gene_lab',
      requiredItems: [
        { itemId: 'divine_essence', amount: 3 },
        { itemId: 'genetic_template', amount: 1 },
      ],
      unlocks: [
        { type: 'ability', abilityId: 'genetic_self_modification' },
        { type: 'ability', abilityId: 'choose_traits' },
        { type: 'ability', abilityId: 'genetic_expression_control' },
        { type: 'knowledge', knowledgeId: 'autonomous_genetics' },
      ],
    }
  ),

  // === Writing & Communication Tier 5 ===
  defineResearch(
    'digital_networks',
    'Digital Networks',
    'Electronic communication and publishing. Food blogs become possible. History will not forgive us.',
    'experimental',
    5,
    {
      progressRequired: 800,
      prerequisites: ['printing_press', 'machinery_ii'],
      requiredBuilding: 'inventors_hall',
      unlocks: [
        { type: 'building', buildingId: 'server_room' },
        { type: 'ability', abilityId: 'create_blog' },
        { type: 'ability', abilityId: 'stream_content' },
        { type: 'ability', abilityId: 'post_video' },
        { type: 'knowledge', knowledgeId: 'digital_literacy' },
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
  ...DISCOVERY_NODE_RESEARCH,
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
