/**
 * Showcase Buildings - Cool Designs for Village Simulation
 *
 * A collection of interesting, useful buildings designed by Claude.
 * Run with: npx ts-node src/showcase-buildings.ts
 */

import { VoxelBuildingDefinition } from './types';
import { visualizeAnalysis, visualizeAllFloors, visualizeCeilingComfort } from './visualizer';
import { validateBuilding } from './validator';

// =============================================================================
// 1. WIZARD TOWER - Multi-floor magical research
// =============================================================================

const WIZARD_TOWER: VoxelBuildingDefinition = {
  id: 'wizard_tower',
  name: 'The Astral Spire',
  description: 'A three-story tower for arcane research, with an observatory at the top.',
  category: 'research',
  tier: 5,
  species: 'tall', // Built by elven mages
  layout: [
    '  #######  ',
    ' ##.....## ',
    '##...S...##',
    '#...SSS...#',
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
      name: 'Library Floor',
      ceilingHeight: 6,
      layout: [
        '  #######  ',
        ' ##SSSSS## ',
        '##S.....S##',
        '#S.......S#',
        '#....X....#',
        'W..T.T.T..W',
        '#.........#',
        '##S.....S##',
        ' ##SSSSS## ',
        '  #######  ',
      ],
    },
    {
      level: 2,
      name: 'Observatory',
      ceilingHeight: 10, // Domed ceiling for stargazing
      layout: [
        '  #######  ',
        ' ##.....## ',
        '##.......##',
        '#....K....#',  // Arcane workstation
        '#....v....#',
        'W.........W',
        '#.........#',
        '##.......##',
        ' ##.....## ',
        '  #######  ',
      ],
    },
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'metal',
  },
  functionality: [
    { type: 'research', params: { bonus: 3.0, fields: ['magic', 'astronomy'] } },
    { type: 'storage', params: { capacity: 100, itemTypes: ['books', 'scrolls', 'reagents'] } },
  ],
  capacity: 5,
  style: 'ancient',
  lore: 'Built atop a ley line intersection, the Astral Spire channels magical energies that enhance research.',
};

// =============================================================================
// 2. DWARVEN FORGE COMPLEX - Industrial production
// =============================================================================

const DWARVEN_FORGE: VoxelBuildingDefinition = {
  id: 'dwarven_forge',
  name: 'Ironheart Foundry',
  description: 'A massive dwarven forge with multiple workstations and ore storage.',
  category: 'production',
  tier: 4,
  species: 'short', // Dwarves - 1.5 voxel height
  layout: [
    '##################',
    '#SSSS#....#....SS#',
    '#SSSS#.KK.#.KK.SS#',
    '#SSSSD....D....SS#',
    '######....#######',
    '#................#',
    'W................W',
    '#................#',
    '#####....D...#####',
    '#SSS#....#...#SSS#',
    '#SSS#.KK.#.KK#SSS#',
    '#SSSD....#....SSS#',
    '######...########',
    '     #...#       ',
    '     #...#       ',
    '     ##D##       ',
  ],
  floors: [
    {
      level: 0,
      name: 'Forge Floor',
      ceilingHeight: 3, // Cozy for dwarves
      layout: [
        '##################',
        '#SSSS#....#....SS#',
        '#SSSS#.KK.#.KK.SS#',
        '#SSSSD....D....SS#',
        '######....#######',
        '#................#',
        'W................W',
        '#................#',
        '#####....D...#####',
        '#SSS#....#...#SSS#',
        '#SSS#.KK.#.KK#SSS#',
        '#SSSD....#....SSS#',
        '######...########',
        '     #...#       ',
        '     #...#       ',
        '     ##D##       ',
      ],
    },
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'metal',
  },
  functionality: [
    { type: 'crafting', params: { speed: 2.0, recipes: ['weapons', 'armor', 'tools', 'jewelry'] } },
    { type: 'storage', params: { capacity: 200, itemTypes: ['ore', 'ingots', 'gems'] } },
  ],
  capacity: 8,
  style: 'dwarven',
  lore: 'The rhythmic pounding of hammers echoes through stone halls, as master smiths shape metal into art.',
};

// =============================================================================
// 3. FAIRY MUSHROOM HOUSE - Tiny creature dwelling
// =============================================================================

const FAIRY_MUSHROOM: VoxelBuildingDefinition = {
  id: 'fairy_mushroom',
  name: 'Dewdrop Cap',
  description: 'A cozy mushroom house for fairy folk, with multiple tiny rooms.',
  category: 'residential',
  tier: 2,
  species: 'tiny', // Fairies - 0.5 voxel height
  layout: [
    '  ###  ',
    ' #...# ',
    '#..B..#',
    '#S.D.S#',
    ' #...# ',
    '  #E#  ',
  ],
  floors: [
    {
      level: 0,
      name: 'Living Space',
      ceilingHeight: 1.5, // Perfect for 0.5 voxel creatures
      layout: [
        '  ###  ',
        ' #...# ',
        '#..B..#',
        '#S.D.S#',
        ' #...# ',
        '  #E#  ',
      ],
    },
    {
      level: 1,
      name: 'Attic Nook',
      ceilingHeight: 1,
      layout: [
        '  ###  ',
        ' #.v.# ',
        '#.....#',
        ' ##### ',
      ],
    },
  ],
  materials: {
    wall: 'wood', // Mushroom material
    floor: 'wood',
    door: 'cloth',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'mood_aura', params: { bonus: 15, radius: 3 } },
  ],
  capacity: 4,
  style: 'whimsical',
  lore: 'Grown from enchanted spores, these living homes pulse with gentle bioluminescence.',
};

// =============================================================================
// 4. MARKET HALL - Commercial trading hub
// =============================================================================

const MARKET_HALL: VoxelBuildingDefinition = {
  id: 'market_hall',
  name: 'Merchant\'s Bazaar',
  description: 'A large open market with vendor stalls and a central courtyard.',
  category: 'commercial',
  tier: 4,
  species: 'medium',
  layout: [
    '######################',
    '#CCCC#......#....CCCC#',
    '#....D......D....#...#',
    'W....#......#....#...W',
    '######......######...#',
    '#....................#',
    '#....................#',
    'D....................D',
    '#....................#',
    '#....................#',
    '######......######...#',
    'W....#......#....#...W',
    '#....D......D....#...#',
    '#CCCC#......#....CCCC#',
    '######################',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'wood',
  },
  functionality: [
    { type: 'storage', params: { capacity: 500, itemTypes: ['trade_goods'] } },
    { type: 'mood_aura', params: { bonus: 10, radius: 8 } },
  ],
  capacity: 50,
  style: 'stone_craft',
  lore: 'The heart of commerce, where exotic goods from distant lands change hands.',
};

// =============================================================================
// 5. TEMPLE OF THE ELEMENTS - Spiritual multi-chamber
// =============================================================================

const ELEMENTAL_TEMPLE: VoxelBuildingDefinition = {
  id: 'elemental_temple',
  name: 'Temple of the Four Winds',
  description: 'A temple with four chambers representing fire, water, earth, and air.',
  category: 'community',
  tier: 5,
  species: 'medium',
  layout: [
    '       #####       ',
    '      ##...##      ',
    '     ##..K..##     ',  // Fire shrine (K = altar)
    '    ##.......##    ',
    '   ##.........##   ',
    '  ###....^....###  ',
    ' ##...........##   ',
    '##....#####....##  ',
    '#K...##   ##...K#  ',  // Water & Earth shrines
    '#....#     #....#  ',
    'W....D     D....W  ',
    '#....#     #....#  ',
    '##...##   ##...##  ',
    ' ##...#####...##   ',
    '  ##.........##    ',
    '   ##.......##     ',
    '    ##..K..##      ',  // Air shrine
    '     ##...##       ',
    '      ##D##        ',
  ],
  floors: [
    {
      level: 1,
      name: 'Upper Sanctum',
      ceilingHeight: 8,
      layout: [
        '       #####       ',
        '      ##...##      ',
        '     ##.....##     ',
        '    ##...v...##    ',
        '   ##.........##   ',
        '  ###.........###  ',
        '   ############ ',
      ],
    },
  ],
  materials: {
    wall: 'stone',
    floor: 'tile',
    door: 'metal',
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 25, radius: 15 } },
    { type: 'research', params: { bonus: 1.5, fields: ['spirituality'] } },
  ],
  capacity: 40,
  style: 'ancient',
  lore: 'Where the four elements converge, seekers find balance and enlightenment.',
};

// =============================================================================
// 6. COZY HOBBIT HOLE - Underground dwelling
// =============================================================================

const HOBBIT_HOLE: VoxelBuildingDefinition = {
  id: 'hobbit_hole',
  name: 'Underhill Burrow',
  description: 'A comfortable underground home built into a hillside.',
  category: 'residential',
  tier: 3,
  species: 'small', // Halflings - 1 voxel height
  layout: [
    '#####################',
    '#SSSS#.....#BB#.....#',
    '#....D.....D..D.TT..#',
    'W....#.....####.....W',
    '#....#..............#',
    '#....#....CCCC......#',
    '######....CCCC......#',
    '     #..............#',
    '     #..TT..TT......#',
    '     W..TT..TT......W',
    '     #..............#',
    '     ######D#########',
  ],
  materials: {
    wall: 'mud_brick', // Earth walls
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'storage', params: { capacity: 80 } },
    { type: 'mood_aura', params: { bonus: 20, radius: 5 } },
  ],
  capacity: 6,
  style: 'rustic',
  lore: 'Snug and warm, with round doors and windows, perfect for second breakfasts.',
};

// =============================================================================
// 7. GIANT'S FEAST HALL - Huge species building
// =============================================================================

const GIANT_HALL: VoxelBuildingDefinition = {
  id: 'giant_hall',
  name: 'Thundertop Hall',
  description: 'A massive feast hall sized for giants, with towering ceilings.',
  category: 'community',
  tier: 5,
  species: 'huge', // Giants - 5 voxel height
  layout: [
    '############################',
    '#..........................#',
    '#..........................#',
    '#..TTTTTT......TTTTTT......#',
    '#..TTTTTT......TTTTTT......#',
    'W..........................W',
    '#..........................#',
    '#..TTTTTT......TTTTTT......#',
    '#..TTTTTT......TTTTTT......#',
    '#..........................#',
    'W..........................W',
    '#..........................#',
    '#..TTTTTT......TTTTTT......#',
    '#..TTTTTT......TTTTTT......#',
    '#..........................#',
    '#############DD############',
  ],
  floors: [
    {
      level: 0,
      name: 'Great Hall',
      ceilingHeight: 15, // Massive ceiling for 5-voxel giants
      layout: [
        '############################',
        '#..........................#',
        '#..........................#',
        '#..TTTTTT......TTTTTT......#',
        '#..TTTTTT......TTTTTT......#',
        'W..........................W',
        '#..........................#',
        '#..TTTTTT......TTTTTT......#',
        '#..TTTTTT......TTTTTT......#',
        '#..........................#',
        'W..........................W',
        '#..........................#',
        '#..TTTTTT......TTTTTT......#',
        '#..TTTTTT......TTTTTT......#',
        '#..........................#',
        '#############DD############',
      ],
    },
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'wood', // Massive wooden doors
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 30, radius: 20 } },
  ],
  capacity: 24, // 24 giants
  style: 'stone_craft',
  lore: 'When the giants feast, the mountains tremble with their laughter.',
};

// =============================================================================
// 8. APOTHECARY & HOSPITAL - Healing facility
// =============================================================================

const APOTHECARY: VoxelBuildingDefinition = {
  id: 'apothecary',
  name: 'Healer\'s Sanctuary',
  description: 'A hospital with patient rooms, herb storage, and a healing garden.',
  category: 'community',
  tier: 4,
  species: 'medium',
  layout: [
    '##################',
    '#SSSS#....#BB#BB##',
    '#SSSS#....D..D..##',
    '#....D....####..##',
    '######....#.....##',
    '#........K#.....##',
    'W........K#BB#BB##',
    '#........KD..D..##',
    '######....######.#',
    '#................#',
    '#.....    .......#',
    'W.....    .......W',  // Courtyard/garden (spaces = open)
    '#.....    .......#',
    '#................#',
    '########D#########',
  ],
  materials: {
    wall: 'stone',
    floor: 'tile',
    door: 'wood',
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 15, radius: 10 } },
    { type: 'storage', params: { capacity: 100, itemTypes: ['herbs', 'potions', 'medicine'] } },
  ],
  capacity: 12,
  style: 'elven',
  lore: 'Where the sick find rest and the wounded find healing, under the care of skilled herbalists.',
};

// =============================================================================
// 9. WATCHTOWER - Military defense
// =============================================================================

const WATCHTOWER: VoxelBuildingDefinition = {
  id: 'watchtower',
  name: 'Eagle\'s Perch',
  description: 'A tall watchtower for guards, with multiple observation levels.',
  category: 'military',
  tier: 3,
  species: 'medium',
  layout: [
    '#######',
    '#.....#',
    '#..^..#',
    'W.....W',
    '#.....#',
    '###D###',
  ],
  floors: [
    {
      level: 1,
      name: 'Guard Room',
      ceilingHeight: 4,
      layout: [
        '#######',
        '#SS...#',
        '#..X..#',
        'W.....W',
        '#BB...#',
        '#######',
      ],
    },
    {
      level: 2,
      name: 'Observation Deck',
      ceilingHeight: 5,
      layout: [
        '#######',
        '#.....#',
        '#..v..#',
        'W.....W',
        '#.....#',
        '#######',
      ],
    },
  ],
  materials: {
    wall: 'stone',
    floor: 'wood',
    door: 'metal',
  },
  functionality: [
    { type: 'gathering_boost', params: { type: 'visibility', radius: 30 } },
  ],
  capacity: 4,
  style: 'stone_craft',
  lore: 'From its heights, watchful eyes scan the horizon for threats.',
};

// =============================================================================
// 10. UNDERGROUND VAULT - Secure storage
// =============================================================================

const UNDERGROUND_VAULT: VoxelBuildingDefinition = {
  id: 'underground_vault',
  name: 'The Iron Vault',
  description: 'A secure underground vault for storing valuables.',
  category: 'storage',
  tier: 5,
  species: 'medium',
  layout: [
    '##D##',
    '#...#',
    '#.v.#',
    '#...#',
    '#####',
  ],
  floors: [
    {
      level: -1, // Underground!
      name: 'Vault Level 1',
      ceilingHeight: 4,
      layout: [
        '#########',
        '#SSS#SSS#',
        '#...D...#',
        '#.^...v.#',
        '#...D...#',
        '#SSS#SSS#',
        '#########',
      ],
    },
    {
      level: -2,
      name: 'Deep Vault',
      ceilingHeight: 3,
      layout: [
        '#########',
        '#SSSSSSS#',
        '#SSSSSSS#',
        '#..^....#',
        '#SSSSSSS#',
        '#SSSSSSS#',
        '#########',
      ],
    },
  ],
  materials: {
    wall: 'metal',
    floor: 'stone',
    door: 'metal',
  },
  functionality: [
    { type: 'storage', params: { capacity: 1000, itemTypes: ['valuables', 'gold', 'artifacts'] } },
  ],
  capacity: 2,
  style: 'dwarven',
  lore: 'Three levels deep, behind doors of dwarven steel, the village\'s treasures rest.',
};

// =============================================================================
// DISPLAY ALL BUILDINGS
// =============================================================================

const ALL_BUILDINGS = [
  WIZARD_TOWER,
  DWARVEN_FORGE,
  FAIRY_MUSHROOM,
  MARKET_HALL,
  ELEMENTAL_TEMPLE,
  HOBBIT_HOLE,
  GIANT_HALL,
  APOTHECARY,
  WATCHTOWER,
  UNDERGROUND_VAULT,
];

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  SHOWCASE BUILDINGS - Designed by Claude');
console.log('  10 Unique Buildings for Village Simulation');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');

for (const building of ALL_BUILDINGS) {
  console.log('━'.repeat(70));
  console.log(`  ${building.name.toUpperCase()}`);
  console.log(`  ${building.description}`);
  console.log(`  Category: ${building.category} | Tier: ${building.tier} | Species: ${building.species || 'medium'}`);
  console.log('━'.repeat(70));
  console.log('');

  // Show analysis
  console.log(visualizeAnalysis(building));
  console.log('');

  // Show multi-floor if applicable
  if (building.floors && building.floors.length > 0) {
    console.log('MULTI-FLOOR VIEW:');
    console.log(visualizeAllFloors(building));
    console.log('');
  }

  // Show ceiling comfort
  console.log(visualizeCeilingComfort(building));

  // Validation status
  const result = validateBuilding(building);
  if (!result.isValid) {
    console.log('⚠️  VALIDATION ISSUES:');
    for (const issue of result.issues.filter(i => i.severity === 'error')) {
      console.log(`    ✗ ${issue.message}`);
    }
    console.log('');
  }

  // Lore
  if (building.lore) {
    console.log(`📖 "${building.lore}"`);
  }
  console.log('');
  console.log('');
}

// Summary table
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  BUILDING SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Name                    | Category    | Species | Floors | Valid');
console.log('─'.repeat(70));

for (const building of ALL_BUILDINGS) {
  const result = validateBuilding(building);
  const floors = 1 + (building.floors?.length || 0);
  const valid = result.isValid ? '✓' : '✗';
  const name = building.name.padEnd(23);
  const cat = building.category.padEnd(11);
  const species = (building.species || 'medium').padEnd(7);
  console.log(`${name} | ${cat} | ${species} | ${floors.toString().padEnd(6)} | ${valid}`);
}
console.log('');
