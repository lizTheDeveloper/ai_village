/**
 * Village Building Library
 *
 * A comprehensive collection of buildings for village simulation.
 * Organized by category and tagged for species compatibility.
 *
 * Run with: npx ts-node src/building-library.ts
 */

import { VoxelBuildingDefinition, BuilderSpecies } from './types';

// =============================================================================
// TINY SPECIES HOUSES (Fairy, Sprite - 0.5 voxel height)
// =============================================================================

export const FAIRY_COTTAGE: VoxelBuildingDefinition = {
  id: 'fairy_cottage',
  name: 'Petal Cottage',
  description: 'A delicate flower-shaped home for fairies.',
  category: 'residential',
  tier: 1,
  species: 'tiny',
  layout: [
    ' ### ',
    '##B##',
    '#...#',
    '##D##',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'cloth' },
  functionality: [{ type: 'sleeping', params: { beds: 1 } }],
  capacity: 2,
  style: 'whimsical',
};

export const FAIRY_TREEHOUSE: VoxelBuildingDefinition = {
  id: 'fairy_treehouse',
  name: 'Acorn Lodge',
  description: 'A tiny treehouse nestled in branches.',
  category: 'residential',
  tier: 2,
  species: 'tiny',
  layout: [
    '  ###  ',
    ' #...# ',
    '#..B..#',
    '#S...S#',
    ' ##D## ',
  ],
  floors: [{
    level: 1,
    name: 'Sleeping Loft',
    ceilingHeight: 1,
    layout: [
      '  ###  ',
      ' #.v.# ',
      '#.BB.#',
      ' ### ',
    ],
  }],
  materials: { wall: 'wood', floor: 'wood', door: 'cloth' },
  functionality: [{ type: 'sleeping', params: { beds: 3 } }],
  capacity: 4,
  style: 'whimsical',
};

export const SPRITE_POD: VoxelBuildingDefinition = {
  id: 'sprite_pod',
  name: 'Dewdrop Pod',
  description: 'A spherical dwelling that catches morning dew.',
  category: 'residential',
  tier: 1,
  species: 'tiny',
  layout: [
    ' ### ',
    '#.B.#',
    '#...D',
    ' ### ',
  ],
  materials: { wall: 'glass', floor: 'wood', door: 'cloth' },
  functionality: [{ type: 'sleeping', params: { beds: 1 } }],
  capacity: 1,
  style: 'whimsical',
};

// =============================================================================
// SMALL SPECIES HOUSES (Gnome, Halfling - 1 voxel height)
// =============================================================================

export const GNOME_BURROW: VoxelBuildingDefinition = {
  id: 'gnome_burrow',
  name: 'Tinkerer\'s Burrow',
  description: 'A cozy underground workshop-home for gnomes.',
  category: 'residential',
  tier: 2,
  species: 'small',
  layout: [
    '#########',
    '#BB#....#',
    '#..D.KK.#',
    '####....#',
    '#SS#....#',
    '#..D....W',
    '####..###',
    '   #..#  ',
    '   #D##  ',
  ],
  materials: { wall: 'mud_brick', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'crafting', params: { speed: 1.0 } },
  ],
  capacity: 3,
  style: 'rustic',
};

export const HALFLING_HOLE: VoxelBuildingDefinition = {
  id: 'halfling_hole',
  name: 'Green Door Smial',
  description: 'A comfortable hobbit hole with round door.',
  category: 'residential',
  tier: 2,
  species: 'small',
  layout: [
    '###########',
    '#BB.#.....#',
    '#...#..TT.#',
    '##D##.TT..#',
    '#SS.......W',
    '#..#..CC..#',
    '##D##.....#',
    '   ##..####',
    '    #..#   ',
    '    #D##   ',
  ],
  materials: { wall: 'mud_brick', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'storage', params: { capacity: 40 } },
  ],
  capacity: 4,
  style: 'rustic',
};

export const HALFLING_COTTAGE: VoxelBuildingDefinition = {
  id: 'halfling_cottage',
  name: 'Bramble Cottage',
  description: 'A above-ground cottage with garden view.',
  category: 'residential',
  tier: 2,
  species: 'small',
  layout: [
    '#######',
    '#BB.SS#',
    '#.....#',
    'W.....W',
    '#.TT..#',
    '#.....#',
    '###D###',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 2 } }],
  capacity: 3,
  style: 'rustic',
};

export const GNOME_WORKSHOP_HOME: VoxelBuildingDefinition = {
  id: 'gnome_workshop_home',
  name: 'Cogsworth Residence',
  description: 'A gnome home with integrated workshop.',
  category: 'residential',
  tier: 3,
  species: 'small',
  layout: [
    '###########',
    '#KKK#BB#SS#',
    '#...D..D..#',
    '#...#####.#',
    'W.........W',
    '#....TT...#',
    '#....TT...#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'crafting', params: { speed: 1.5, recipes: ['gadgets', 'tools'] } },
  ],
  capacity: 4,
  style: 'modern',
};

// =============================================================================
// SHORT SPECIES HOUSES (Dwarf, Goblin - 1.5 voxel height)
// =============================================================================

export const DWARF_STONEHOME: VoxelBuildingDefinition = {
  id: 'dwarf_stonehome',
  name: 'Granite Hold',
  description: 'A sturdy stone dwelling carved into rock.',
  category: 'residential',
  tier: 2,
  species: 'short',
  layout: [
    '###########',
    '#BB#..#SSS#',
    '#..D..D...#',
    '####..#####',
    '#.........#',
    'W....TT...W',
    '#....TT...#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'storage', params: { capacity: 60 } },
  ],
  capacity: 4,
  style: 'dwarven',
};

export const DWARF_CLAN_HALL: VoxelBuildingDefinition = {
  id: 'dwarf_clan_hall',
  name: 'Ironbeard Clan Hall',
  description: 'A large dwelling for an extended dwarf family.',
  category: 'residential',
  tier: 4,
  species: 'short',
  layout: [
    '#################',
    '#BB#BB#...#SSS#K#',
    '#..D..D...D...D.#',
    '################.#',
    '#...............W',
    '#...TTTTTTTT....#',
    'W...TTTTTTTT....#',
    '#...............#',
    '####....#...#####',
    '#BB#....#...#SSS#',
    '#..D....D...D...#',
    '####....#########',
    '   #....#        ',
    '   ##D###        ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 6 } },
    { type: 'storage', params: { capacity: 120 } },
    { type: 'mood_aura', params: { bonus: 10 } },
  ],
  capacity: 12,
  style: 'dwarven',
};

export const GOBLIN_SHANTY: VoxelBuildingDefinition = {
  id: 'goblin_shanty',
  name: 'Rustpile Shack',
  description: 'A ramshackle goblin dwelling made of salvage.',
  category: 'residential',
  tier: 1,
  species: 'short',
  layout: [
    '######',
    '#BB..#',
    '#....D',
    '#.SS.#',
    '######',
  ],
  materials: { wall: 'metal', floor: 'dirt', door: 'metal' },
  functionality: [{ type: 'sleeping', params: { beds: 2 } }],
  capacity: 4,
  style: 'rustic',
};

export const GOBLIN_WARREN: VoxelBuildingDefinition = {
  id: 'goblin_warren',
  name: 'Skullcap Warren',
  description: 'A chaotic goblin communal dwelling.',
  category: 'residential',
  tier: 2,
  species: 'short',
  layout: [
    '###########',
    '#BB#BB#BB##',
    '#..D..D..D#',
    '##########.#',
    '#..........#',
    '#.SSS..TT..D',
    '#..........#',
    '###D########',
  ],
  materials: { wall: 'mud_brick', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 6 } }],
  capacity: 12,
  style: 'rustic',
};

// =============================================================================
// MEDIUM SPECIES HOUSES (Human, Orc - 2 voxel height)
// =============================================================================

export const HUMAN_HUT_TINY: VoxelBuildingDefinition = {
  id: 'human_hut_tiny',
  name: 'Pioneer Hut',
  description: 'A basic one-room dwelling for settlers.',
  category: 'residential',
  tier: 1,
  species: 'medium',
  layout: [
    '#####',
    '#B..#',
    '#...D',
    '#.S.#',
    '#####',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 1 } }],
  capacity: 2,
  style: 'rustic',
};

export const HUMAN_COTTAGE_SMALL: VoxelBuildingDefinition = {
  id: 'human_cottage_small',
  name: 'Thatcher\'s Cottage',
  description: 'A small cottage with thatched roof.',
  category: 'residential',
  tier: 2,
  species: 'medium',
  layout: [
    '#######',
    '#BB#SS#',
    '#..D..#',
    'W.....W',
    '#..TT.#',
    '###D###',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 2 } }],
  capacity: 3,
  style: 'rustic',
};

export const HUMAN_HOUSE_MEDIUM: VoxelBuildingDefinition = {
  id: 'human_house_medium',
  name: 'Fieldstone House',
  description: 'A comfortable family home with multiple rooms.',
  category: 'residential',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#BB.#..#SS#',
    '#...D..D..#',
    '####...####',
    '#.........#',
    'W..TT.CC..W',
    '#..TT.....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'storage', params: { capacity: 50 } },
  ],
  capacity: 4,
  style: 'stone_craft',
};

export const HUMAN_HOUSE_LARGE: VoxelBuildingDefinition = {
  id: 'human_house_large',
  name: 'Merchant\'s Townhouse',
  description: 'A large two-story townhouse.',
  category: 'residential',
  tier: 4,
  species: 'medium',
  layout: [
    '###############',
    '#....#SS#....##',
    '#.CC.D..D.TT.##',
    '#....####....##',
    'W............W#',
    '#.....TT......#',
    '#.....TT..^...#',
    '#.............#',
    '#######D#######',
  ],
  floors: [{
    level: 1,
    name: 'Bedrooms',
    ceilingHeight: 4,
    layout: [
      '###############',
      '#BB.#BB.#BB.###',
      '#...D...D...###',
      '####.####...###',
      'W........v..W##',
      '#...........###',
      '###############',
    ],
  }],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 6 } },
    { type: 'storage', params: { capacity: 80 } },
  ],
  capacity: 8,
  style: 'stone_craft',
};

export const HUMAN_MANOR: VoxelBuildingDefinition = {
  id: 'human_manor',
  name: 'Oakwood Manor',
  description: 'An elegant manor house for wealthy families.',
  category: 'residential',
  tier: 5,
  species: 'medium',
  layout: [
    '###################',
    '#SSS#.....#.....#K#',
    '#...D.....D.....D.#',
    '####..TT..#...CC..#',
    '#....TT...#.......#',
    'W.........#.......W',
    '#.........####D####',
    '#....^....#.......#',
    '#.........D..TT...#',
    '####..#####..TT...#',
    '#BB#..#SSS#.......#',
    '#..D..D...D.......#',
    '####..#############',
    '  #....#           ',
    '  ##DD##           ',
  ],
  floors: [{
    level: 1,
    name: 'Master Suite',
    ceilingHeight: 5,
    layout: [
      '###################',
      '#BB...#.....#.....#',
      '#.....D.....D.....#',
      '####..#.....#.....#',
      'W..........v......W',
      '#.................#',
      '###################',
    ],
  }],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 4 } },
    { type: 'storage', params: { capacity: 150 } },
    { type: 'mood_aura', params: { bonus: 15 } },
  ],
  capacity: 10,
  style: 'stone_craft',
};

export const ORC_LONGHOUSE: VoxelBuildingDefinition = {
  id: 'orc_longhouse',
  name: 'Bloodaxe Longhouse',
  description: 'A traditional orc longhouse for warriors.',
  category: 'residential',
  tier: 3,
  species: 'medium',
  layout: [
    '###################',
    '#BB.BB.BB.BB.BB.SS#',
    '#.................#',
    'W.................W',
    '#....TTTTTTTT.....#',
    '#....TTTTTTTT.....#',
    'W.................W',
    '#.................#',
    '#BB.BB.BB.BB.BB.SS#',
    '#########D#########',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 10 } },
    { type: 'mood_aura', params: { bonus: 5 } },
  ],
  capacity: 20,
  style: 'rustic',
};

export const ORC_CHIEFTAIN_HUT: VoxelBuildingDefinition = {
  id: 'orc_chieftain_hut',
  name: 'Warchief\'s Hall',
  description: 'The impressive dwelling of an orc chieftain.',
  category: 'residential',
  tier: 4,
  species: 'medium',
  layout: [
    '  #########  ',
    ' ##.......## ',
    '##...SSS...##',
    '#....SSS....#',
    '#...........#',
    'W....TT.....W',
    '#....TT.....#',
    '#...........#',
    '##..BBBB...##',
    ' ##.......## ',
    '  ####D####  ',
  ],
  materials: { wall: 'wood', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 4 } },
    { type: 'mood_aura', params: { bonus: 20 } },
  ],
  capacity: 6,
  style: 'rustic',
};

// =============================================================================
// TALL SPECIES HOUSES (Elf, Alien - 2.5 voxel height)
// =============================================================================

export const ELF_TREEHOUSE: VoxelBuildingDefinition = {
  id: 'elf_treehouse',
  name: 'Silverleaf Aerie',
  description: 'An elegant treehouse with flowing architecture.',
  category: 'residential',
  tier: 3,
  species: 'tall',
  layout: [
    '  #######  ',
    ' ##.....## ',
    '##..BBB..##',
    '#.........#',
    'W....^....W',
    '#.........#',
    '##.......##',
    ' ##.....## ',
    '  ###D###  ',
  ],
  floors: [{
    level: 1,
    name: 'Sky Garden',
    ceilingHeight: 7,
    layout: [
      '  #######  ',
      ' ##.....## ',
      '##...v...##',
      '#.........#',
      'W.........W',
      '##.......##',
      ' ##.....## ',
      '  #######  ',
    ],
  }],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 3 } },
    { type: 'mood_aura', params: { bonus: 15 } },
  ],
  capacity: 4,
  style: 'elven',
};

export const ELF_SPIRE_HOME: VoxelBuildingDefinition = {
  id: 'elf_spire_home',
  name: 'Moonspire Residence',
  description: 'A tall crystalline spire home.',
  category: 'residential',
  tier: 4,
  species: 'tall',
  layout: [
    '  #####  ',
    ' ##...## ',
    '##.....##',
    '#...^...#',
    'W.......W',
    '#.......#',
    '##.....##',
    ' ##...## ',
    '  ##D##  ',
  ],
  floors: [
    {
      level: 1,
      name: 'Living Level',
      ceilingHeight: 6,
      layout: [
        '  #####  ',
        ' ##...## ',
        '##..S..##',
        '#...X...#',
        'W..TT..W',
        '#.......#',
        '##.....##',
        ' #######',
      ],
    },
    {
      level: 2,
      name: 'Sleeping Chamber',
      ceilingHeight: 6,
      layout: [
        '  #####  ',
        ' ##BBB## ',
        '##..v..##',
        '#.......#',
        'W.......W',
        '##.....##',
        ' #######',
      ],
    },
  ],
  materials: { wall: 'glass', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 3 } }],
  capacity: 4,
  style: 'elven',
};

export const ALIEN_DOME: VoxelBuildingDefinition = {
  id: 'alien_dome',
  name: 'Crystalline Habitat',
  description: 'A geodesic dome for alien visitors.',
  category: 'residential',
  tier: 3,
  species: 'tall',
  layout: [
    '   #####   ',
    '  ##...##  ',
    ' ##.....## ',
    '##...B...##',
    '#....B....#',
    'W....K....W',
    '#.........#',
    '##.......##',
    ' ##.....## ',
    '  ##...##  ',
    '   ##D##   ',
  ],
  materials: { wall: 'glass', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
    { type: 'research', params: { bonus: 1.5 } },
  ],
  capacity: 3,
  style: 'modern',
};

// =============================================================================
// LARGE SPECIES HOUSES (Ogre, Troll - 3 voxel height)
// =============================================================================

export const OGRE_CAVE_HOME: VoxelBuildingDefinition = {
  id: 'ogre_cave_home',
  name: 'Boulder Den',
  description: 'A crude but spacious cave dwelling.',
  category: 'residential',
  tier: 2,
  species: 'large',
  layout: [
    '############',
    '#..........#',
    '#..BBBB....#',
    '#..........#',
    'W..........W',
    '#....TT....#',
    '#....TT....#',
    '#..........#',
    '#..SSSS....#',
    '######D#####',
  ],
  materials: { wall: 'stone', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 4 } }],
  capacity: 4,
  style: 'rustic',
};

export const TROLL_BRIDGE_HOUSE: VoxelBuildingDefinition = {
  id: 'troll_bridge_house',
  name: 'Underbridge Lair',
  description: 'A dwelling built under a stone bridge.',
  category: 'residential',
  tier: 2,
  species: 'large',
  layout: [
    '#############',
    '#...........#',
    '#..BBBB.....#',
    '#...........#',
    'W...........W',
    '#...........#',
    '#..SSSS.TT..#',
    '#.......TT..#',
    '######D######',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'stone' },
  functionality: [{ type: 'sleeping', params: { beds: 4 } }],
  capacity: 4,
  style: 'dwarven',
};

// =============================================================================
// HUGE SPECIES HOUSES (Giant - 5+ voxel height)
// =============================================================================

export const GIANT_CABIN: VoxelBuildingDefinition = {
  id: 'giant_cabin',
  name: 'Thunderfoot Lodge',
  description: 'A massive log cabin for giants.',
  category: 'residential',
  tier: 3,
  species: 'huge',
  layout: [
    '##################',
    '#................#',
    '#..BBBBBB........#',
    '#..BBBBBB........#',
    '#................#',
    'W................W',
    '#................#',
    '#......TTTTTT....#',
    '#......TTTTTT....#',
    '#................#',
    '#..SSSSSS........#',
    '#................#',
    '########DD########',
  ],
  floors: [{
    level: 0,
    name: 'Main Hall',
    ceilingHeight: 12,
    layout: [
      '##################',
      '#................#',
      '#..BBBBBB........#',
      '#..BBBBBB........#',
      '#................#',
      'W................W',
      '#................#',
      '#......TTTTTT....#',
      '#......TTTTTT....#',
      '#................#',
      '#..SSSSSS........#',
      '#................#',
      '########DD########',
    ],
  }],
  materials: { wall: 'wood', floor: 'stone', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 6 } }],
  capacity: 4,
  style: 'rustic',
};

export const GIANT_CASTLE_KEEP: VoxelBuildingDefinition = {
  id: 'giant_castle_keep',
  name: 'Cloudpeak Keep',
  description: 'A fortress-home for giant nobility.',
  category: 'residential',
  tier: 5,
  species: 'huge',
  layout: [
    '######################',
    '#....................#',
    '#..SSSSSS....SSSSSS..#',
    '#....................#',
    '#....................#',
    'W....................W',
    '#....................#',
    '#....TTTTTTTTTT......#',
    '#....TTTTTTTTTT......#',
    '#....................#',
    '#..BBBBBBBB..^.......#',
    '#..BBBBBBBB..........#',
    '#....................#',
    '##########DD##########',
  ],
  floors: [{
    level: 1,
    name: 'Trophy Hall',
    ceilingHeight: 15,
    layout: [
      '######################',
      '#....................#',
      '#..SSSSSSSSSSSSSS....#',
      '#....................#',
      'W....................W',
      '#........v...........#',
      '#....................#',
      '######################',
    ],
  }],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 8 } },
    { type: 'storage', params: { capacity: 500 } },
    { type: 'mood_aura', params: { bonus: 25 } },
  ],
  capacity: 8,
  style: 'stone_craft',
};

// =============================================================================
// PRODUCTION BUILDINGS
// =============================================================================

export const BLACKSMITH_FORGE: VoxelBuildingDefinition = {
  id: 'blacksmith_forge',
  name: 'Anvil & Flame Smithy',
  description: 'A forge for metalworking and weapon crafting.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#KKK#SSSSS#',
    '#...D.....#',
    '#...#.....#',
    'W.........W',
    '#.........#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'crafting', params: { speed: 1.5, recipes: ['weapons', 'armor', 'tools'] } }],
  capacity: 3,
  style: 'dwarven',
};

export const CARPENTER_WORKSHOP: VoxelBuildingDefinition = {
  id: 'carpenter_workshop',
  name: 'Sawdust Workshop',
  description: 'A woodworking shop for furniture and construction.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KK.#.SSSS#',
    '#...D.....#',
    '#...######',
    'W.........W',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 1.2, recipes: ['furniture', 'tools'] } }],
  capacity: 2,
  style: 'rustic',
};

export const WEAVER_SHOP: VoxelBuildingDefinition = {
  id: 'weaver_shop',
  name: 'Silken Thread Weavery',
  description: 'A workshop for textiles and clothing.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '#########',
    '#KKK#SSS#',
    '#...D...#',
    'W.......W',
    '#.......#',
    '####D####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'cloth' },
  functionality: [{ type: 'crafting', params: { speed: 1.0, recipes: ['clothing', 'textiles'] } }],
  capacity: 2,
  style: 'rustic',
};

export const BAKERY: VoxelBuildingDefinition = {
  id: 'bakery',
  name: 'Golden Crust Bakery',
  description: 'A bakery producing bread and pastries.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#K.K#SSSSS#',
    '#...D.....#',
    '#...####..#',
    'W....CC...W',
    '#....CC...#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 1.0, recipes: ['bread', 'pastries'] } }],
  capacity: 3,
  style: 'rustic',
};

export const TANNERY: VoxelBuildingDefinition = {
  id: 'tannery',
  name: 'Leatherworks',
  description: 'A tannery for processing hides into leather.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#KKK......#',
    '#.........#',
    'W.........W',
    '#...SSSSS.#',
    '#...SSSSS.#',
    '#####D#####',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 0.8, recipes: ['leather', 'hides'] } }],
  capacity: 2,
  style: 'rustic',
};

export const POTTERY_KILN: VoxelBuildingDefinition = {
  id: 'pottery_kiln',
  name: 'Clay & Fire Pottery',
  description: 'A pottery with kiln for ceramics.',
  category: 'production',
  tier: 2,
  species: 'medium',
  layout: [
    '#########',
    '#KK#SSSS#',
    '#..D....#',
    'W.......W',
    '#..TT...#',
    '####D####',
  ],
  materials: { wall: 'mud_brick', floor: 'tile', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 1.0, recipes: ['pottery', 'tiles'] } }],
  capacity: 2,
  style: 'rustic',
};

export const BREWERY: VoxelBuildingDefinition = {
  id: 'brewery',
  name: 'Frothy Mug Brewery',
  description: 'A brewery for ales and spirits.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '#############',
    '#KKK#SSSSSSS#',
    '#...D.......#',
    '#...####....#',
    'W...........W',
    '#...........#',
    '#...........#',
    '######D######',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 0.5, recipes: ['ale', 'wine', 'mead'] } }],
  capacity: 3,
  style: 'dwarven',
};

export const WINDMILL: VoxelBuildingDefinition = {
  id: 'windmill',
  name: 'Hilltop Mill',
  description: 'A windmill for grinding grain.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '  #####  ',
    ' ##...## ',
    '##..K..##',
    '#...K...#',
    '#...^...#',
    'W.......W',
    '#..SSS..#',
    '##.....##',
    ' ##...## ',
    '  ##D##  ',
  ],
  floors: [{
    level: 1,
    name: 'Grinding Floor',
    ceilingHeight: 5,
    layout: [
      '  #####  ',
      ' ##KKK## ',
      '##..v..##',
      '#.......#',
      'W..SSS..W',
      '##.....##',
      ' #######',
    ],
  }],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 2.0, recipes: ['flour'] } }],
  capacity: 2,
  style: 'rustic',
};

// =============================================================================
// COMMERCIAL BUILDINGS
// =============================================================================

export const GENERAL_STORE: VoxelBuildingDefinition = {
  id: 'general_store',
  name: 'Provisions & Sundries',
  description: 'A general store selling various goods.',
  category: 'commercial',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#SSSS#SSSS#',
    '#....D....#',
    '#...####..#',
    'W..CC.....W',
    '#..CC.....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 100, itemTypes: ['trade_goods'] } }],
  capacity: 4,
  style: 'rustic',
};

export const TAVERN_SMALL: VoxelBuildingDefinition = {
  id: 'tavern_small',
  name: 'The Rusty Nail',
  description: 'A small neighborhood tavern.',
  category: 'commercial',
  tier: 2,
  species: 'medium',
  layout: [
    '###########',
    '#..CC#SSSS#',
    '#..CCD....#',
    '#....#....#',
    'W..TT.....W',
    '#..TT.....#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'mood_aura', params: { bonus: 10, radius: 5 } }],
  capacity: 15,
  style: 'rustic',
};

export const TAVERN_LARGE: VoxelBuildingDefinition = {
  id: 'tavern_large',
  name: 'The Gilded Flagon Inn',
  description: 'A large inn with rooms and dining.',
  category: 'commercial',
  tier: 4,
  species: 'medium',
  layout: [
    '#################',
    '#....CCCCCC#SSSS#',
    '#..........D....#',
    '#..TT..TT..#....#',
    'W..TT..TT..#....W',
    '#..........#..^.#',
    '#..TT..TT..#....#',
    '#..TT..TT..#....#',
    '#..........######',
    '#...............#',
    '########D########',
  ],
  floors: [{
    level: 1,
    name: 'Guest Rooms',
    ceilingHeight: 4,
    layout: [
      '#################',
      '#BB.#BB.#BB.#BB.#',
      '#...D...D...D...#',
      'W...#...#...#...W',
      '#...#...#...#.v.#',
      '#################',
    ],
  }],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'sleeping', params: { beds: 8 } },
    { type: 'mood_aura', params: { bonus: 15, radius: 8 } },
  ],
  capacity: 30,
  style: 'stone_craft',
};

export const TRADING_POST: VoxelBuildingDefinition = {
  id: 'trading_post',
  name: 'Crossroads Trading Post',
  description: 'A trading post for caravans and merchants.',
  category: 'commercial',
  tier: 3,
  species: 'medium',
  layout: [
    '#############',
    '#SSSSSSSSSSS#',
    '#...........#',
    '#.CCCC.CCCC.#',
    'D...........D',
    '#.CCCC.CCCC.#',
    '#...........#',
    '#SSSSSSSSSSS#',
    '######D######',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 200, itemTypes: ['trade_goods'] } }],
  capacity: 20,
  style: 'rustic',
};

// =============================================================================
// STORAGE BUILDINGS
// =============================================================================

export const GRAIN_SILO: VoxelBuildingDefinition = {
  id: 'grain_silo',
  name: 'Harvest Silo',
  description: 'A tall silo for storing grain.',
  category: 'storage',
  tier: 2,
  species: 'medium',
  layout: [
    ' ##### ',
    '##SSS##',
    '#SSSSS#',
    '#SSSSS#',
    '#SSSSS#',
    '##...##',
    ' ##D## ',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 200, itemTypes: ['grain', 'seeds'] } }],
  capacity: 1,
  style: 'rustic',
};

export const WAREHOUSE: VoxelBuildingDefinition = {
  id: 'warehouse',
  name: 'Dockside Warehouse',
  description: 'A large warehouse for bulk goods.',
  category: 'storage',
  tier: 3,
  species: 'medium',
  layout: [
    '###################',
    '#SSSSSSS#SSSSSSSSS#',
    '#.......D.........#',
    '#SSSSSSS#SSSSSSSSS#',
    '#.......D.........#',
    '#SSSSSSS#SSSSSSSSS#',
    '#.................#',
    '########DD#########',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 500 } }],
  capacity: 4,
  style: 'stone_craft',
};

export const COLD_STORAGE: VoxelBuildingDefinition = {
  id: 'cold_storage',
  name: 'Ice House',
  description: 'A cold storage for preserving food.',
  category: 'storage',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '##SSSSSSS##',
    '#SSSSSSSSS#',
    '#SSSSSSSSS#',
    '#SSSSSSSSS#',
    '##.......##',
    ' ####D#### ',
  ],
  materials: { wall: 'ice', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'storage', params: { capacity: 150, itemTypes: ['food', 'meat', 'fish'] } }],
  capacity: 1,
  style: 'dwarven',
};

export const BARN: VoxelBuildingDefinition = {
  id: 'barn',
  name: 'Red Oak Barn',
  description: 'A large barn for animals and hay.',
  category: 'storage',
  tier: 2,
  species: 'medium',
  layout: [
    '###############',
    '#SSSSS#.......#',
    '#SSSSS#.......#',
    '#.....D.......#',
    '#SSSSS#.......#',
    '#SSSSS#.......#',
    '#.....#.......#',
    '#######.......#',
    '#.............#',
    '######DD#######',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 200, itemTypes: ['hay', 'feed', 'animals'] } }],
  capacity: 2,
  style: 'rustic',
};

// =============================================================================
// COMMUNITY BUILDINGS
// =============================================================================

export const TOWN_HALL: VoxelBuildingDefinition = {
  id: 'town_hall',
  name: 'Village Hall',
  description: 'The administrative center of the village.',
  category: 'community',
  tier: 4,
  species: 'medium',
  layout: [
    '###############',
    '#....SSS......#',
    '#.............#',
    '#....TTT......#',
    'W....TTT......W',
    '#....TTT......#',
    '#.............#',
    '#.....^.......#',
    '#.............#',
    '#######D#######',
  ],
  floors: [{
    level: 1,
    name: 'Council Chamber',
    ceilingHeight: 6,
    layout: [
      '###############',
      '#.............#',
      '#...TTTTT.....#',
      'W...TTTTT.....W',
      '#....v........#',
      '#.............#',
      '###############',
    ],
  }],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [{ type: 'mood_aura', params: { bonus: 10, radius: 20 } }],
  capacity: 30,
  style: 'stone_craft',
};

export const TEMPLE_SMALL: VoxelBuildingDefinition = {
  id: 'temple_small',
  name: 'Shrine of Serenity',
  description: 'A small shrine for meditation and prayer.',
  category: 'community',
  tier: 2,
  species: 'medium',
  layout: [
    '  #####  ',
    ' ##...## ',
    '##..K..##',
    '#.......#',
    'W.......W',
    '#.......#',
    '##.....##',
    ' ##...## ',
    '  ##D##  ',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [{ type: 'mood_aura', params: { bonus: 20, radius: 10 } }],
  capacity: 15,
  style: 'ancient',
};

export const TEMPLE_LARGE: VoxelBuildingDefinition = {
  id: 'temple_large',
  name: 'Cathedral of Light',
  description: 'A grand cathedral for worship.',
  category: 'community',
  tier: 5,
  species: 'medium',
  layout: [
    '    #########    ',
    '   ##.......##   ',
    '  ##.........##  ',
    ' ##...........## ',
    '##.............##',
    '#......TTT......#',
    '#......TTT......#',
    'W...............W',
    '#...P.....P.....#',
    '#...............#',
    '#...P.....P.....#',
    'W...............W',
    '#.......K.......#',
    '##.............##',
    ' ##...........## ',
    '  ##.........##  ',
    '   ##.......##   ',
    '    ####D####    ',
  ],
  floors: [{
    level: 0,
    name: 'Nave',
    ceilingHeight: 10,
    layout: [
      '    #########    ',
      '   ##.......##   ',
      '  ##.........##  ',
      ' ##...........## ',
      '##.............##',
      '#......TTT......#',
      '#......TTT......#',
      'W...............W',
      '#...P.....P.....#',
      '#...............#',
      '#...P.....P.....#',
      'W...............W',
      '#.......K.......#',
      '##.............##',
      ' ##...........## ',
      '  ##.........##  ',
      '   ##.......##   ',
      '    ####D####    ',
    ],
  }],
  materials: { wall: 'stone', floor: 'tile', door: 'wood' },
  functionality: [{ type: 'mood_aura', params: { bonus: 30, radius: 25 } }],
  capacity: 100,
  style: 'ancient',
};

export const WELL: VoxelBuildingDefinition = {
  id: 'well',
  name: 'Village Well',
  description: 'A central well for water.',
  category: 'community',
  tier: 1,
  species: 'medium',
  layout: [
    ' ### ',
    '#...#',
    '#.K.#',
    '#...#',
    ' ### ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'stone' },
  functionality: [{ type: 'gathering_boost', params: { type: 'water', radius: 10 } }],
  capacity: 5,
  style: 'rustic',
};

export const SCHOOL: VoxelBuildingDefinition = {
  id: 'school',
  name: 'Village School',
  description: 'A school for educating children.',
  category: 'community',
  tier: 3,
  species: 'medium',
  layout: [
    '#############',
    '#...........#',
    '#..TT.TT.TT.#',
    'W..TT.TT.TT.W',
    '#...........#',
    '#.....K.....#',
    '#...........#',
    '######D######',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'research', params: { bonus: 1.0, fields: ['education'] } }],
  capacity: 20,
  style: 'stone_craft',
};

// =============================================================================
// MILITARY BUILDINGS
// =============================================================================

export const GUARD_POST: VoxelBuildingDefinition = {
  id: 'guard_post',
  name: 'Guard Post',
  description: 'A small guard station.',
  category: 'military',
  tier: 1,
  species: 'medium',
  layout: [
    '#####',
    '#...#',
    'W...W',
    '#.S.#',
    '##D##',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'gathering_boost', params: { type: 'visibility', radius: 15 } }],
  capacity: 2,
  style: 'rustic',
};

export const BARRACKS: VoxelBuildingDefinition = {
  id: 'barracks',
  name: 'Garrison Barracks',
  description: 'Barracks for soldiers and guards.',
  category: 'military',
  tier: 3,
  species: 'medium',
  layout: [
    '#################',
    '#BB.BB.BB.BB#SSS#',
    '#...........D...#',
    '#BB.BB.BB.BB#SSS#',
    '#...........#####',
    'W...............W',
    '#....TTTTTT.....#',
    '#....TTTTTT.....#',
    '#...............#',
    '########D########',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'sleeping', params: { beds: 8 } },
    { type: 'storage', params: { capacity: 80, itemTypes: ['weapons', 'armor'] } },
  ],
  capacity: 16,
  style: 'stone_craft',
};

export const ARMORY: VoxelBuildingDefinition = {
  id: 'armory',
  name: 'Steel Shield Armory',
  description: 'Storage for weapons and armor.',
  category: 'military',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#.........#',
    '#SSSSSSSSS#',
    'W.........W',
    '#SSSSSSSSS#',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'storage', params: { capacity: 200, itemTypes: ['weapons', 'armor'] } }],
  capacity: 2,
  style: 'dwarven',
};

export const TRAINING_YARD: VoxelBuildingDefinition = {
  id: 'training_yard',
  name: 'Combat Training Ground',
  description: 'An open yard for combat training.',
  category: 'military',
  tier: 2,
  species: 'medium',
  layout: [
    '#############',
    '#...........#',
    '#...........#',
    '#...........#',
    'W...........W',
    '#...........#',
    '#...........#',
    '#.....K.....#',
    '#...........#',
    '######D######',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'crafting', params: { speed: 1.0, recipes: ['training'] } }],
  capacity: 10,
  style: 'rustic',
};

// =============================================================================
// FARMING BUILDINGS
// =============================================================================

export const CHICKEN_COOP: VoxelBuildingDefinition = {
  id: 'chicken_coop',
  name: 'Featherdale Coop',
  description: 'A coop for chickens.',
  category: 'farming',
  tier: 1,
  species: 'medium',
  layout: [
    '#######',
    '#.....#',
    '#.SSS.#',
    '#.....#',
    '###D###',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'gathering_boost', params: { type: 'eggs', radius: 5 } }],
  capacity: 1,
  style: 'rustic',
};

export const STABLE: VoxelBuildingDefinition = {
  id: 'stable',
  name: 'Meadowbrook Stable',
  description: 'A stable for horses and livestock.',
  category: 'farming',
  tier: 2,
  species: 'medium',
  layout: [
    '###############',
    '#...#...#...#.#',
    '#...D...D...D.#',
    '#...#...#...#.#',
    '#...#...#...#.#',
    'D.............D',
    '#SSSSSSSSSSSS.#',
    '###############',
  ],
  materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'storage', params: { capacity: 50, itemTypes: ['horses', 'hay'] } }],
  capacity: 4,
  style: 'rustic',
};

export const GREENHOUSE: VoxelBuildingDefinition = {
  id: 'greenhouse',
  name: 'Crystal Greenhouse',
  description: 'A greenhouse for growing plants year-round.',
  category: 'farming',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#.........#',
    'W.........W',
    '#.........#',
    'W.........W',
    '#.........#',
    'W.........W',
    '#.........#',
    '#####D#####',
  ],
  materials: { wall: 'glass', floor: 'dirt', door: 'wood' },
  functionality: [{ type: 'gathering_boost', params: { type: 'plants', radius: 5 } }],
  capacity: 2,
  style: 'modern',
};

export const BEEHIVE_HOUSE: VoxelBuildingDefinition = {
  id: 'beehive_house',
  name: 'Honeycomb Apiary',
  description: 'An apiary for beekeeping.',
  category: 'farming',
  tier: 2,
  species: 'medium',
  layout: [
    '#######',
    '#K.K.K#',
    '#.....#',
    '#K.K.K#',
    '###D###',
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'gathering_boost', params: { type: 'honey', radius: 10 } }],
  capacity: 1,
  style: 'rustic',
};

// =============================================================================
// RESEARCH BUILDINGS
// =============================================================================

export const LIBRARY: VoxelBuildingDefinition = {
  id: 'library',
  name: 'Hall of Scrolls',
  description: 'A library for research and study.',
  category: 'research',
  tier: 3,
  species: 'medium',
  layout: [
    '#############',
    '#SSS#...#SSS#',
    '#...D...D...#',
    '#SSS#...#SSS#',
    '#...#...#...#',
    'W..TT...TT..W',
    '#..TT...TT..#',
    '#...........#',
    '######D######',
  ],
  materials: { wall: 'stone', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'research', params: { bonus: 2.0, fields: ['all'] } }],
  capacity: 10,
  style: 'ancient',
};

export const ALCHEMY_LAB: VoxelBuildingDefinition = {
  id: 'alchemy_lab',
  name: 'Bubbling Cauldron Lab',
  description: 'A laboratory for alchemical experiments.',
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
    '#####D#####',
  ],
  materials: { wall: 'stone', floor: 'tile', door: 'metal' },
  functionality: [
    { type: 'research', params: { bonus: 1.5, fields: ['alchemy'] } },
    { type: 'crafting', params: { speed: 1.0, recipes: ['potions'] } },
  ],
  capacity: 3,
  style: 'ancient',
};

export const OBSERVATORY: VoxelBuildingDefinition = {
  id: 'observatory',
  name: 'Starwatcher Tower',
  description: 'A tower for astronomical observations.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    ' ##### ',
    '##...##',
    '#..^..#',
    'W.....W',
    '#.....#',
    '##...##',
    ' ##D## ',
  ],
  floors: [
    {
      level: 1,
      name: 'Study',
      ceilingHeight: 5,
      layout: [
        ' ##### ',
        '##SSS##',
        '#..X..#',
        'W.TT.W',
        '#.....#',
        '##...##',
        ' ##### ',
      ],
    },
    {
      level: 2,
      name: 'Observation Deck',
      ceilingHeight: 6,
      layout: [
        ' ##### ',
        '##...##',
        '#..v..#',
        'W..K..W',
        '#.....#',
        '##...##',
        ' ##### ',
      ],
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'research', params: { bonus: 2.5, fields: ['astronomy', 'magic'] } }],
  capacity: 4,
  style: 'ancient',
};

// =============================================================================
// ALL BUILDINGS COLLECTION
// =============================================================================

export const ALL_HOUSES: VoxelBuildingDefinition[] = [
  // Tiny species
  FAIRY_COTTAGE,
  FAIRY_TREEHOUSE,
  SPRITE_POD,
  // Small species
  GNOME_BURROW,
  HALFLING_HOLE,
  HALFLING_COTTAGE,
  GNOME_WORKSHOP_HOME,
  // Short species
  DWARF_STONEHOME,
  DWARF_CLAN_HALL,
  GOBLIN_SHANTY,
  GOBLIN_WARREN,
  // Medium species
  HUMAN_HUT_TINY,
  HUMAN_COTTAGE_SMALL,
  HUMAN_HOUSE_MEDIUM,
  HUMAN_HOUSE_LARGE,
  HUMAN_MANOR,
  ORC_LONGHOUSE,
  ORC_CHIEFTAIN_HUT,
  // Tall species
  ELF_TREEHOUSE,
  ELF_SPIRE_HOME,
  ALIEN_DOME,
  // Large species
  OGRE_CAVE_HOME,
  TROLL_BRIDGE_HOUSE,
  // Huge species
  GIANT_CABIN,
  GIANT_CASTLE_KEEP,
];

export const ALL_PRODUCTION: VoxelBuildingDefinition[] = [
  BLACKSMITH_FORGE,
  CARPENTER_WORKSHOP,
  WEAVER_SHOP,
  BAKERY,
  TANNERY,
  POTTERY_KILN,
  BREWERY,
  WINDMILL,
];

export const ALL_COMMERCIAL: VoxelBuildingDefinition[] = [
  GENERAL_STORE,
  TAVERN_SMALL,
  TAVERN_LARGE,
  TRADING_POST,
];

export const ALL_STORAGE: VoxelBuildingDefinition[] = [
  GRAIN_SILO,
  WAREHOUSE,
  COLD_STORAGE,
  BARN,
];

export const ALL_COMMUNITY: VoxelBuildingDefinition[] = [
  TOWN_HALL,
  TEMPLE_SMALL,
  TEMPLE_LARGE,
  WELL,
  SCHOOL,
];

export const ALL_MILITARY: VoxelBuildingDefinition[] = [
  GUARD_POST,
  BARRACKS,
  ARMORY,
  TRAINING_YARD,
];

export const ALL_FARMING: VoxelBuildingDefinition[] = [
  CHICKEN_COOP,
  STABLE,
  GREENHOUSE,
  BEEHIVE_HOUSE,
];

export const ALL_RESEARCH: VoxelBuildingDefinition[] = [
  LIBRARY,
  ALCHEMY_LAB,
  OBSERVATORY,
];

export const ALL_BUILDINGS: VoxelBuildingDefinition[] = [
  ...ALL_HOUSES,
  ...ALL_PRODUCTION,
  ...ALL_COMMERCIAL,
  ...ALL_STORAGE,
  ...ALL_COMMUNITY,
  ...ALL_MILITARY,
  ...ALL_FARMING,
  ...ALL_RESEARCH,
];

// =============================================================================
// BUILDINGS BY SPECIES
// =============================================================================

export function getBuildingsForSpecies(species: BuilderSpecies): VoxelBuildingDefinition[] {
  return ALL_BUILDINGS.filter(b => b.species === species || !b.species);
}

export function getHousesForSpecies(species: BuilderSpecies): VoxelBuildingDefinition[] {
  return ALL_HOUSES.filter(b => b.species === species);
}

// =============================================================================
// DISPLAY SCRIPT
// =============================================================================

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  VILLAGE BUILDING LIBRARY');
  console.log(`  Total Buildings: ${ALL_BUILDINGS.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  // Summary by category
  console.log('BY CATEGORY:');
  console.log(`  Houses:     ${ALL_HOUSES.length}`);
  console.log(`  Production: ${ALL_PRODUCTION.length}`);
  console.log(`  Commercial: ${ALL_COMMERCIAL.length}`);
  console.log(`  Storage:    ${ALL_STORAGE.length}`);
  console.log(`  Community:  ${ALL_COMMUNITY.length}`);
  console.log(`  Military:   ${ALL_MILITARY.length}`);
  console.log(`  Farming:    ${ALL_FARMING.length}`);
  console.log(`  Research:   ${ALL_RESEARCH.length}`);
  console.log('');

  // Summary by species
  console.log('HOUSES BY SPECIES:');
  const speciesList: BuilderSpecies[] = ['tiny', 'small', 'short', 'medium', 'tall', 'large', 'huge'];
  for (const species of speciesList) {
    const houses = getHousesForSpecies(species);
    console.log(`  ${species.padEnd(8)}: ${houses.length} designs - ${houses.map(h => h.name).join(', ')}`);
  }
  console.log('');

  // List all buildings
  console.log('ALL BUILDINGS:');
  console.log('─'.repeat(90));
  console.log('Name'.padEnd(30) + '| Category'.padEnd(14) + '| Species'.padEnd(10) + '| Tier | Size');
  console.log('─'.repeat(90));

  for (const building of ALL_BUILDINGS) {
    const width = Math.max(...building.layout.map(r => r.length));
    const height = building.layout.length;
    const floors = 1 + (building.floors?.length || 0);
    const size = `${width}x${height}` + (floors > 1 ? ` (${floors}F)` : '');

    console.log(
      building.name.padEnd(30) + '| ' +
      building.category.padEnd(12) + '| ' +
      (building.species || 'any').padEnd(8) + '| ' +
      building.tier.toString().padEnd(4) + ' | ' +
      size
    );
  }
  console.log('');
}
