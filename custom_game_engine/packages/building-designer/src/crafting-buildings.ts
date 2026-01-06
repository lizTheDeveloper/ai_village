/**
 * Crafting Stations & Research Buildings
 *
 * Buildings that match the game's crafting system and research tree.
 * Organized by tier and research requirements.
 */

import { VoxelBuildingDefinition } from './types';

// =============================================================================
// TIER 1 - BASIC CRAFTING (No Research Required)
// =============================================================================

export const CAMPFIRE_BASIC: VoxelBuildingDefinition = {
  id: 'campfire_basic',
  name: 'Campfire',
  description: 'A simple campfire for cooking basic meals.',
  category: 'production',
  tier: 1,
  species: 'medium',
  layout: [
    '#####',
    '#.K.#',
    '#...D',
    '#...#',
    '#####',
  ],
  materials: { wall: 'stone', floor: 'dirt', door: 'stone' },
  functionality: [
    { type: 'crafting', params: { station: 'campfire', speed: 1.0, recipes: ['cooked_meat', 'dried_meat'] } },
    { type: 'mood_aura', params: { bonus: 5, radius: 3 } },
  ],
  capacity: 3,
  style: 'rustic',
};

export const WORKBENCH_BASIC: VoxelBuildingDefinition = {
  id: 'workbench_basic',
  name: 'Workbench Shelter',
  description: 'A covered workbench for basic tool crafting.',
  category: 'production',
  tier: 1,
  species: 'medium',
  layout: [
    '######',
    '#KK..#',
    '#....D',
    '#.SS.#',
    '######',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'workbench', speed: 1.0, recipes: ['basic_tools', 'basic_items', 'stone_axe', 'stone_pickaxe', 'wooden_hammer'] } },
  ],
  capacity: 2,
  style: 'rustic',
};

export const STORAGE_CHEST_HUT: VoxelBuildingDefinition = {
  id: 'storage_chest_hut',
  name: 'Storage Hut',
  description: 'A small hut with storage chests.',
  category: 'storage',
  tier: 1,
  species: 'medium',
  layout: [
    '#####',
    '#SSS#',
    '#...D',
    '#SSS#',
    '#####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'storage', params: { capacity: 60, itemTypes: ['all'] } },
  ],
  capacity: 1,
  style: 'rustic',
};

// =============================================================================
// TIER 2 - EXPANDED CRAFTING (Requires Tier 1 Research)
// =============================================================================

// Requires: metallurgy_i research
export const FORGE_SMALL: VoxelBuildingDefinition = {
  id: 'forge_small',
  name: 'Village Forge',
  description: 'A forge for metalworking. Requires metallurgy_i research.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KKK#SSSSS#',
    '#...D.....#',
    '#...#.....#',
    'W.........W',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'crafting', params: {
      station: 'forge',
      speed: 1.5,
      recipes: ['iron_ingot', 'copper_ingot', 'steel_ingot', 'iron_sword', 'steel_sword', 'iron_tools', 'steel_pickaxe']
    }},
  ],
  capacity: 3,
  style: 'dwarven',
  lore: 'Unlocked by metallurgy_i research.',
};

export const FORGE_LARGE: VoxelBuildingDefinition = {
  id: 'forge_large',
  name: 'Master Forge',
  description: 'A large forge for advanced metalworking. Requires metallurgy_ii.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '###############',
    '#KKK#KKK#SSSSS#',
    '#...D...D.....#',
    '#...#...#.....#',
    'W.............W',
    '#.............#',
    '#...........###',
    '#SSSSS......#  ',
    '#...........D  ',
    '#############  ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'crafting', params: {
      station: 'forge',
      speed: 2.0,
      recipes: ['iron_ingot', 'copper_ingot', 'steel_ingot', 'mithril_ingot', 'adamantine_ingot', 'iron_sword', 'steel_sword']
    }},
    { type: 'storage', params: { capacity: 100, itemTypes: ['ore', 'ingots', 'metal'] } },
  ],
  capacity: 6,
  style: 'dwarven',
  lore: 'Unlocked by metallurgy_ii research. Can craft legendary alloys with metallurgy_iii.',
};

// Requires: textiles_i research
export const LOOM_WORKSHOP: VoxelBuildingDefinition = {
  id: 'loom_workshop',
  name: 'Weaver\'s Workshop',
  description: 'A workshop with looms for textile production. Requires textiles_i.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KKK#SSSSS#',
    '#...D.....#',
    '#...#.....#',
    'W.........W',
    '#..TT.....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'cloth' },
  functionality: [
    { type: 'crafting', params: {
      station: 'loom',
      speed: 1.0,
      recipes: ['cloth', 'simple_clothing', 'rope', 'fine_clothing', 'leather_armor']
    }},
  ],
  capacity: 3,
  style: 'rustic',
  lore: 'Unlocked by textiles_i research.',
};

// Requires: cuisine_i research
export const OVEN_BAKERY: VoxelBuildingDefinition = {
  id: 'oven_bakery',
  name: 'Village Bakery',
  description: 'A bakery with stone oven. Requires cuisine_i.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KK.#SSSSS#',
    '#...D.....#',
    '#...#.....#',
    'W...CC....W',
    '#...CC....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [
    { type: 'crafting', params: {
      station: 'oven',
      speed: 1.2,
      recipes: ['bread', 'pastries', 'dried_meat', 'preserved_food', 'pie']
    }},
  ],
  capacity: 3,
  style: 'rustic',
  lore: 'Unlocked by cuisine_i research.',
};

// Requires: construction_ii research
export const WAREHOUSE_LARGE: VoxelBuildingDefinition = {
  id: 'warehouse_large',
  name: 'District Warehouse',
  description: 'A large warehouse for bulk storage. Requires construction_ii.',
  category: 'storage',
  tier: 2,
  species: 'medium',
  layout: [
    '#####################',
    '#SSSSSSS.SSSSSSSSSSS#',
    '#...................#',
    '#SSSSSSS.SSSSSSSSSSS#',
    '#...................#',
    '#SSSSSSS.SSSSSSSSSSS#',
    '#...................#',
    '#########D#D#########',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'storage', params: { capacity: 200, itemTypes: ['all'] } },
  ],
  capacity: 4,
  style: 'stone_craft',
  lore: 'Unlocked by construction_ii research.',
};

// =============================================================================
// TIER 3 - ADVANCED CRAFTING (Requires Tier 2 Research)
// =============================================================================

// Requires: construction_ii research
export const WORKSHOP_ADVANCED: VoxelBuildingDefinition = {
  id: 'workshop_advanced',
  name: 'Master Workshop',
  description: 'An advanced workshop for complex crafting. Requires construction_ii.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '###############',
    '#KKK#KK#SSSSSS#',
    '#...D..D......#',
    '#...####......#',
    'W.............W',
    '#..TT.........#',
    '#..TT.........#',
    '#.............#',
    '#######D#######',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'metal' },
  functionality: [
    { type: 'crafting', params: {
      station: 'workshop',
      speed: 1.3,
      recipes: ['advanced_tools', 'machinery', 'furniture', 'weapons', 'armor', 'complex_items']
    }},
  ],
  capacity: 5,
  style: 'stone_craft',
  lore: 'Unlocked by construction_ii research.',
};

// Requires: alchemy_i research (nature_i + cuisine_i)
export const ALCHEMY_LAB_BUILDING: VoxelBuildingDefinition = {
  id: 'alchemy_lab_building',
  name: 'Alchemist\'s Laboratory',
  description: 'A laboratory for potions and transmutations. Requires alchemy_i.',
  category: 'research',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#KKK#SSSSS#',
    '#...D.....#',
    '#...###...#',
    'W.........W',
    '#..T..T...#',
    '#..T..T...#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'crafting', params: {
      station: 'alchemy_lab',
      speed: 1.0,
      recipes: ['healing_potion', 'energy_potion', 'fertilizer', 'transmutations']
    }},
    { type: 'research', params: { bonus: 1.5, fields: ['alchemy'] } },
  ],
  capacity: 3,
  style: 'ancient',
  lore: 'Unlocked by alchemy_i research (requires nature_i + cuisine_i).',
};

// Requires: machinery_i research (construction_ii + metallurgy_i)
export const WINDMILL_BUILDING: VoxelBuildingDefinition = {
  id: 'windmill_building',
  name: 'Grain Mill',
  description: 'A windmill for grinding grain. Requires machinery_i.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '  #######  ',
    ' ##.....## ',
    '##..KKK..##',
    '#.........#',
    '#....^....#',
    'W.........W',
    '#..SSSSS..#',
    '##.......##',
    ' ##.....## ',
    '  ###D###  ',
  ],
  floors: [{
    level: 1,
    name: 'Grinding Floor',
    ceilingHeight: 5,
    layout: [
      '  #######  ',
      ' ##KKK..## ',
      '##...v...##',
      '#.........#',
      'W..SSSSS..W',
      '##.......##',
      ' ####### ',
    ],
  }],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'windmill', speed: 2.0, recipes: ['flour', 'grain_products'] } },
  ],
  capacity: 2,
  style: 'rustic',
  lore: 'Unlocked by machinery_i research.',
};

// Requires: machinery_i research + water terrain
export const WATER_WHEEL_BUILDING: VoxelBuildingDefinition = {
  id: 'water_wheel_building',
  name: 'Water Wheel Mill',
  description: 'A water-powered mill. Requires machinery_i + water terrain.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '#########',
    '#KKK#SSS#',
    '#...D...#',
    '#...#...#',
    'W.......W',
    '#.......#',
    '####D####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'water_wheel', speed: 1.5, recipes: ['grind_grain', 'power_machines'] } },
  ],
  capacity: 2,
  style: 'rustic',
  lore: 'Unlocked by machinery_i. Must be built on water/shallow_water terrain.',
};

// Requires: agriculture_iii research
export const GREENHOUSE_BUILDING: VoxelBuildingDefinition = {
  id: 'greenhouse_building',
  name: 'Crystal Greenhouse',
  description: 'A greenhouse for year-round cultivation. Requires agriculture_iii.',
  category: 'farming',
  tier: 3,
  species: 'medium',
  layout: [
    '#############',
    '#...........#',
    'W...........W',
    '#...........#',
    'W...........W',
    '#...........#',
    'W...........W',
    '#...........#',
    '#...KK......#',
    '######D######',
  ],
  materials: { wall: 'glass', floor: 'dirt', door: 'wood' },
  functionality: [
    { type: 'gathering_boost', params: { type: 'exotic_crops', radius: 4 } },
    { type: 'gathering_boost', params: { type: 'herbs', radius: 4 } },
    { type: 'crafting', params: { station: 'greenhouse', recipes: ['hybrid_wheat', 'exotic_plants'] } },
  ],
  capacity: 3,
  style: 'modern',
  lore: 'Unlocked by agriculture_iii research.',
};

// =============================================================================
// TIER 2-3 - RESEARCH BUILDINGS
// =============================================================================

export const LIBRARY_BUILDING: VoxelBuildingDefinition = {
  id: 'library_building',
  name: 'Village Library',
  description: 'A library for research and study. Enables Tier 3+ research.',
  category: 'research',
  tier: 2,
  species: 'medium',
  layout: [
    '###############',
    '#SSSS#...#SSSS#',
    '#....D...D....#',
    '#SSSS#...#SSSS#',
    '#....#...#....#',
    'W....TT.TT....W',
    '#....TT.TT....#',
    '#.............#',
    '#######D#######',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'research', params: { bonus: 1.2, fields: ['agriculture', 'construction', 'tools', 'all'] } },
    { type: 'storage', params: { capacity: 100, itemTypes: ['books', 'scrolls'] } },
  ],
  capacity: 10,
  style: 'ancient',
  lore: 'Required for Tier 3+ research. Provides 1.2x research bonus.',
};

export const SCRIPTORIUM: VoxelBuildingDefinition = {
  id: 'scriptorium',
  name: 'Scriptorium',
  description: 'A writing room for scholars, attached to a library.',
  category: 'research',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#SSS#.....#',
    '#...D.TT..#',
    '#SSS#.TT..#',
    '#...#.....#',
    'W...#.TT..W',
    '#...D.TT..#',
    '#SSS#.....#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'research', params: { bonus: 1.3, fields: ['society', 'nature'] } },
  ],
  capacity: 6,
  style: 'ancient',
};

// =============================================================================
// TIER 4 - MASTERY BUILDINGS (Requires Tier 3 Research)
// =============================================================================

// Requires: society_ii research
export const TRADING_POST_BUILDING: VoxelBuildingDefinition = {
  id: 'trading_post_building',
  name: 'Trade Emporium',
  description: 'An advanced trading post. Requires society_ii.',
  category: 'commercial',
  tier: 4,
  species: 'medium',
  layout: [
    '#################',
    '#SSSSSSS.SSSSSSS#',
    '#...............#',
    '#.CCCC.....CCCC.#',
    'D...............D',
    '#.CCCC.....CCCC.#',
    '#...............#',
    '#SSSSSSS.SSSSSSS#',
    '#...............#',
    '########D########',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [
    { type: 'storage', params: { capacity: 300, itemTypes: ['trade_goods'] } },
  ],
  capacity: 20,
  style: 'stone_craft',
  lore: 'Unlocked by society_ii research. Enables trade routes.',
};

// Requires: society_ii research
export const BANK_BUILDING: VoxelBuildingDefinition = {
  id: 'bank_building',
  name: 'Village Bank',
  description: 'A secure bank for valuables. Requires society_ii.',
  category: 'commercial',
  tier: 4,
  species: 'medium',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#.........#',
    '#..CCCCC..#',
    'W.........W',
    '#..CCCCC..#',
    '#.........#',
    '#####D#####',
  ],
  floors: [{
    level: -1,
    name: 'Vault',
    ceilingHeight: 3,
    layout: [
      '###########',
      '#SSSSSSSSS#',
      '#SSSSSSSSS#',
      '#...^.....#',
      '#SSSSSSSSS#',
      '#SSSSSSSSS#',
      '###########',
    ],
  }],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'storage', params: { capacity: 1000, itemTypes: ['currency', 'valuables', 'gems'] } },
  ],
  capacity: 4,
  style: 'dwarven',
  lore: 'Unlocked by society_ii research.',
};

// Requires: machinery_ii research
export const AUTO_FARM_BUILDING: VoxelBuildingDefinition = {
  id: 'auto_farm_building',
  name: 'Automated Farm',
  description: 'A mechanized farm. Requires machinery_ii.',
  category: 'farming',
  tier: 4,
  species: 'medium',
  layout: [
    '#################',
    '#KKK............#',
    '#...............#',
    '#...............#',
    'W...............W',
    '#...............#',
    '#...............#',
    '#...............#',
    '#SSSSSS.........#',
    '#...............#',
    '#######D#D#######',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'metal' },
  functionality: [
    { type: 'crafting', params: { station: 'auto_farm', speed: 2.0, recipes: ['plant_seeds', 'harvest_crops', 'water_plants'] } },
    { type: 'gathering_boost', params: { type: 'crops', radius: 8 } },
  ],
  capacity: 2,
  style: 'modern',
  lore: 'Unlocked by machinery_ii research.',
};

// Requires: genetics_ii research
export const BREEDING_FACILITY: VoxelBuildingDefinition = {
  id: 'breeding_facility',
  name: 'Breeding Facility',
  description: 'A facility for selective breeding. Requires genetics_ii.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    '#############',
    '#KKK#.......#',
    '#...D.......#',
    '#...####....#',
    'W...........W',
    '#...........#',
    '#...........#',
    '#SSSS.......#',
    '######D######',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'research', params: { bonus: 1.5, fields: ['genetics'] } },
    { type: 'crafting', params: { station: 'breeding', recipes: ['selective_breeding', 'trait_selection'] } },
  ],
  capacity: 4,
  style: 'modern',
  lore: 'Unlocked by genetics_ii research.',
};

// =============================================================================
// TIER 5 - TRANSCENDENCE (Endgame Buildings)
// =============================================================================

// Requires: experimental_research
export const INVENTORS_HALL: VoxelBuildingDefinition = {
  id: 'inventors_hall',
  name: 'Inventor\'s Hall',
  description: 'A grand hall for experimental research. Requires experimental_research.',
  category: 'research',
  tier: 5,
  species: 'medium',
  layout: [
    '###################',
    '#KKK#KKK#KKK#SSSSS#',
    '#...D...D...D.....#',
    '#...#...#...#.....#',
    'W.................W',
    '#..TT.TT.TT.TT....#',
    '#..TT.TT.TT.TT....#',
    '#.................#',
    '#####.....#...#####',
    '    #..^..#...#    ',
    '    #.....#...#    ',
    '    #######D###    ',
  ],
  floors: [{
    level: 1,
    name: 'Experiment Chamber',
    ceilingHeight: 6,
    layout: [
      '###################',
      '#KKK.....KKK.SSSSS#',
      '#.................#',
      'W.......v.........W',
      '#.................#',
      '#SSSSSSSSSS.......#',
      '###################',
    ],
  }],
  materials: { wall: 'stone', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'research', params: { bonus: 2.5, fields: ['experimental', 'agriculture', 'construction', 'crafting', 'metallurgy', 'alchemy'] } },
    { type: 'crafting', params: { station: 'inventors_hall', recipes: ['procedural_invention', 'conduct_experiment'] } },
  ],
  capacity: 8,
  style: 'modern',
  lore: 'Unlocked by experimental_research. Provides 2.5x research bonus.',
};

// Requires: arcane_studies research
export const ARCANE_TOWER_BUILDING: VoxelBuildingDefinition = {
  id: 'arcane_tower_building',
  name: 'Arcane Tower',
  description: 'A tower for magical research and enchanting. Requires arcane_studies.',
  category: 'research',
  tier: 5,
  species: 'tall', // Built by mages (tall species)
  layout: [
    '  #######  ',
    ' ##.....## ',
    '##...K...##',
    '#.........#',
    '#....^....#',
    'W.........W',
    '#.........#',
    '##.......##',
    ' ##.....## ',
    '  ###D###  ',
  ],
  floors: [
    {
      level: 1,
      name: 'Library of Mysteries',
      ceilingHeight: 6,
      layout: [
        '  #######  ',
        ' ##SSSSS## ',
        '##S.....S##',
        '#S...X...S#',
        'W..T.T.T..W',
        '#.........#',
        '##S.....S##',
        ' ##SSSSS## ',
        '  #######  ',
      ],
    },
    {
      level: 2,
      name: 'Enchanting Chamber',
      ceilingHeight: 8,
      layout: [
        '  #######  ',
        ' ##.....## ',
        '##...K...##',
        '#....v....#',
        'W.........W',
        '#.........#',
        '##.......##',
        ' ##.....## ',
        '  #######  ',
      ],
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'research', params: { bonus: 2.0, fields: ['arcane', 'experimental'] } },
    { type: 'crafting', params: { station: 'arcane_tower', speed: 1.0, recipes: ['enchanted_items', 'magical_artifacts'] } },
  ],
  capacity: 5,
  style: 'ancient',
  lore: 'Unlocked by arcane_studies research. Contains enchanting table.',
};

// Requires: genetic_engineering research
export const GENE_LAB_BUILDING: VoxelBuildingDefinition = {
  id: 'gene_lab_building',
  name: 'Genetics Laboratory',
  description: 'A cutting-edge lab for genetic research. Requires genetic_engineering.',
  category: 'research',
  tier: 5,
  species: 'medium',
  layout: [
    '#################',
    '#KKK#KKK#SSSSSSS#',
    '#...D...D.......#',
    '#...#...########',
    'W.............W#',
    '#..TT.TT.TT...##',
    '#..TT.TT.TT..###',
    '#............###',
    '########D#######',
  ],
  materials: { wall: 'glass', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'research', params: { bonus: 2.0, fields: ['genetics'] } },
    { type: 'crafting', params: {
      station: 'gene_lab',
      recipes: ['gene_splicing', 'modify_genome', 'chimera_serum', 'trait_serum', 'mutagen', 'stabilizer']
    }},
  ],
  capacity: 6,
  style: 'modern',
  lore: 'Unlocked by genetic_engineering research. Required for advanced genetics research.',
};

// Requires: master_architecture research
export const GRAND_HALL_BUILDING: VoxelBuildingDefinition = {
  id: 'grand_hall_building',
  name: 'Grand Hall',
  description: 'A magnificent hall showcasing architectural mastery. Requires master_architecture.',
  category: 'community',
  tier: 5,
  species: 'medium',
  layout: [
    '#####################',
    '#...................#',
    '#..P...........P....#',
    '#...................#',
    'W...................W',
    '#....TTTTTTTTT......#',
    '#....TTTTTTTTT......#',
    'W...................W',
    '#..P...........P....#',
    '#...................#',
    '#.......^...........#',
    '#...................#',
    '#########D#D#########',
  ],
  floors: [{
    level: 1,
    name: 'Gallery',
    ceilingHeight: 8,
    layout: [
      '#####################',
      '#SSSS.........SSSSS##',
      '#.................###',
      'W.......v.........W##',
      '#.................###',
      '#SSSS.........SSSSS##',
      '#####################',
    ],
  }],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [
    { type: 'mood_aura', params: { bonus: 30, radius: 25 } },
  ],
  capacity: 100,
  style: 'stone_craft',
  lore: 'Unlocked by master_architecture research.',
};

export const MONUMENT: VoxelBuildingDefinition = {
  id: 'monument',
  name: 'Village Monument',
  description: 'A monument to village achievements. Requires master_architecture.',
  category: 'decoration',
  tier: 5,
  species: 'medium',
  layout: [
    '   ###   ',
    '  #####  ',
    ' ##...## ',
    '##.....##',
    '#...P...D',
    '##.....##',
    ' ##...## ',
    '  #####  ',
    '   ###   ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'stone' },
  functionality: [
    { type: 'mood_aura', params: { bonus: 20, radius: 30 } },
  ],
  capacity: 0,
  style: 'ancient',
  lore: 'Unlocked by master_architecture research.',
};

// =============================================================================
// COOKING SPECIALIZATION BUILDINGS
// =============================================================================

export const GRILL_STATION: VoxelBuildingDefinition = {
  id: 'grill_station',
  name: 'Grill Pit',
  description: 'An open grill for grilling meats.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '#######',
    '#KKK..#',
    '#.....D',
    '#..TT.#',
    '#######',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'grill', speed: 1.2, recipes: ['grilled_meat', 'kebabs', 'roasted_vegetables'] } },
  ],
  capacity: 2,
  style: 'rustic',
};

export const STEW_KITCHEN: VoxelBuildingDefinition = {
  id: 'stew_kitchen',
  name: 'Stew Kitchen',
  description: 'A kitchen with large cauldrons for stews and soups.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KKK#SSSSS#',
    '#...D.....#',
    '#...#.....#',
    'W..CC.....W',
    '#..CC.....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'cauldron', speed: 1.0, recipes: ['stew', 'soup', 'broth'] } },
  ],
  capacity: 3,
  style: 'rustic',
};

export const SMOKEHOUSE: VoxelBuildingDefinition = {
  id: 'smokehouse',
  name: 'Smokehouse',
  description: 'A building for smoking and preserving meats.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '#######',
    '#KK.SS#',
    '#.....#',
    'W.....W',
    '#.....#',
    '###D###',
  ],
  materials: { wall: 'wood', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'crafting', params: { station: 'smoker', speed: 0.8, recipes: ['smoked_meat', 'smoked_fish', 'preserved_food'] } },
    { type: 'storage', params: { capacity: 50, itemTypes: ['meat', 'fish'] } },
  ],
  capacity: 2,
  style: 'rustic',
};

// =============================================================================
// GRANARY (Governance Building)
// =============================================================================

export const GRANARY_BUILDING: VoxelBuildingDefinition = {
  id: 'granary_building',
  name: 'Royal Granary',
  description: 'A large granary for food reserves and resource tracking.',
  category: 'storage',
  tier: 2,
  species: 'medium',
  layout: [
    '#############',
    '#SSSSSSSSSSS#',
    '#...........#',
    '#SSSSSSSSSSS#',
    'W...........W',
    '#SSSSSSSSSSS#',
    '#...........#',
    '#SSSSSSSSSSS#',
    '#...........#',
    '#####D#D#####',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'storage', params: { capacity: 1000, itemTypes: ['grain', 'food', 'seeds'] } },
  ],
  capacity: 4,
  style: 'stone_craft',
};

// =============================================================================
// ALL CRAFTING BUILDINGS COLLECTION
// =============================================================================

export const TIER_1_CRAFTING: VoxelBuildingDefinition[] = [
  CAMPFIRE_BASIC,
  WORKBENCH_BASIC,
  STORAGE_CHEST_HUT,
];

export const TIER_2_CRAFTING: VoxelBuildingDefinition[] = [
  FORGE_SMALL,
  LOOM_WORKSHOP,
  OVEN_BAKERY,
  WAREHOUSE_LARGE,
  LIBRARY_BUILDING,
  SCRIPTORIUM,
  GRILL_STATION,
  STEW_KITCHEN,
  SMOKEHOUSE,
  GRANARY_BUILDING,
];

export const TIER_3_CRAFTING: VoxelBuildingDefinition[] = [
  FORGE_LARGE,
  WORKSHOP_ADVANCED,
  ALCHEMY_LAB_BUILDING,
  WINDMILL_BUILDING,
  WATER_WHEEL_BUILDING,
  GREENHOUSE_BUILDING,
];

export const TIER_4_CRAFTING: VoxelBuildingDefinition[] = [
  TRADING_POST_BUILDING,
  BANK_BUILDING,
  AUTO_FARM_BUILDING,
  BREEDING_FACILITY,
];

export const TIER_5_CRAFTING: VoxelBuildingDefinition[] = [
  INVENTORS_HALL,
  ARCANE_TOWER_BUILDING,
  GENE_LAB_BUILDING,
  GRAND_HALL_BUILDING,
  MONUMENT,
];

export const ALL_CRAFTING_BUILDINGS: VoxelBuildingDefinition[] = [
  ...TIER_1_CRAFTING,
  ...TIER_2_CRAFTING,
  ...TIER_3_CRAFTING,
  ...TIER_4_CRAFTING,
  ...TIER_5_CRAFTING,
];

// =============================================================================
// RESEARCH TREE SUMMARY
// =============================================================================

export const RESEARCH_BUILDING_REQUIREMENTS = {
  // Tier 1 - No requirements
  tier1: {
    buildings: ['campfire', 'workbench', 'storage_chest'],
    research: null,
  },
  // Tier 2 - Requires Tier 1 research
  tier2: {
    forge: { research: 'metallurgy_i', prereq: 'crafting_i' },
    loom: { research: 'textiles_i', prereq: 'crafting_i' },
    oven: { research: 'cuisine_i', prereq: 'agriculture_i' },
    warehouse: { research: 'construction_ii', prereq: 'construction_i' },
    library: { research: null, prereq: 'building skill 3' },
  },
  // Tier 3 - Requires Tier 2 research
  tier3: {
    workshop: { research: 'construction_ii', prereq: 'construction_i' },
    alchemy_lab: { research: 'alchemy_i', prereq: 'nature_i + cuisine_i' },
    windmill: { research: 'machinery_i', prereq: 'construction_ii + metallurgy_i' },
    water_wheel: { research: 'machinery_i', prereq: 'construction_ii + metallurgy_i' },
    greenhouse: { research: 'agriculture_iii', prereq: 'agriculture_ii + library' },
  },
  // Tier 4 - Requires Tier 3 research
  tier4: {
    trading_post: { research: 'society_ii', prereq: 'society_i + construction_ii' },
    bank: { research: 'society_ii', prereq: 'society_i + construction_ii' },
    auto_farm: { research: 'machinery_ii', prereq: 'machinery_i + metallurgy_ii' },
    breeding_facility: { research: 'genetics_ii', prereq: 'genetics_i + agriculture_iii' },
  },
  // Tier 5 - Requires Tier 4 research
  tier5: {
    inventors_hall: { research: 'experimental_research', prereq: 'alchemy_i + metallurgy_ii + agriculture_iii + library' },
    arcane_tower: { research: 'arcane_studies', prereq: 'alchemy_i + nature_i + library' },
    gene_lab: { research: 'genetic_engineering', prereq: 'genetics_ii + alchemy_i + experimental_research + inventors_hall' },
    grand_hall: { research: 'master_architecture', prereq: 'construction_ii + machinery_ii' },
  },
};

// =============================================================================
// DISPLAY SCRIPT
// =============================================================================

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  CRAFTING STATIONS & RESEARCH BUILDINGS');
  console.log(`  Total: ${ALL_CRAFTING_BUILDINGS.length} buildings`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  console.log('BY TIER:');
  console.log(`  Tier 1 (Basic):        ${TIER_1_CRAFTING.length} - ${TIER_1_CRAFTING.map(b => b.name).join(', ')}`);
  console.log(`  Tier 2 (Expanded):     ${TIER_2_CRAFTING.length} - ${TIER_2_CRAFTING.map(b => b.name).join(', ')}`);
  console.log(`  Tier 3 (Advanced):     ${TIER_3_CRAFTING.length} - ${TIER_3_CRAFTING.map(b => b.name).join(', ')}`);
  console.log(`  Tier 4 (Mastery):      ${TIER_4_CRAFTING.length} - ${TIER_4_CRAFTING.map(b => b.name).join(', ')}`);
  console.log(`  Tier 5 (Transcendent): ${TIER_5_CRAFTING.length} - ${TIER_5_CRAFTING.map(b => b.name).join(', ')}`);
  console.log('');

  console.log('CRAFTING STATIONS:');
  const craftingStations = ALL_CRAFTING_BUILDINGS.filter(b =>
    b.functionality.some(f => f.type === 'crafting')
  );
  for (const b of craftingStations) {
    const craft = b.functionality.find(f => f.type === 'crafting');
    const station = (craft?.params as { station?: string })?.station || 'unknown';
    const recipes = ((craft?.params as { recipes?: string[] })?.recipes || []).slice(0, 3).join(', ');
    console.log(`  ${b.name.padEnd(25)} | Station: ${station.padEnd(15)} | Recipes: ${recipes}...`);
  }
  console.log('');

  console.log('RESEARCH BUILDINGS:');
  const researchBuildings = ALL_CRAFTING_BUILDINGS.filter(b =>
    b.functionality.some(f => f.type === 'research')
  );
  for (const b of researchBuildings) {
    const research = b.functionality.find(f => f.type === 'research');
    const bonus = (research?.params as { bonus?: number })?.bonus || 1.0;
    const fields = ((research?.params as { fields?: string[] })?.fields || []).join(', ');
    console.log(`  ${b.name.padEnd(25)} | Bonus: ${bonus}x | Fields: ${fields}`);
  }
  console.log('');
}
