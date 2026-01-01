/**
 * LLM Building Designer - Example Buildings
 *
 * These examples demonstrate valid building designs and can be used
 * for testing the validation system.
 */

import { VoxelBuildingDefinition } from './types';

// =============================================================================
// TIER 1 - BASIC BUILDINGS
// =============================================================================

export const SIMPLE_HUT: VoxelBuildingDefinition = {
  id: 'simple_hut',
  name: 'Simple Hut',
  description: 'A basic shelter providing minimal protection from the elements.',
  category: 'residential',
  tier: 1,
  layout: [
    '#####',
    '#...#',
    '#...D',
    '#...#',
    '#####',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 1, restBonus: 1.0 } },
  ],
  capacity: 1,
  style: 'rustic',
  lore: 'A humble dwelling for a single villager.',
};

export const STORAGE_SHED: VoxelBuildingDefinition = {
  id: 'storage_shed',
  name: 'Storage Shed',
  description: 'A small building for storing supplies and materials.',
  category: 'storage',
  tier: 1,
  layout: [
    '####',
    '#..#',
    '#..D',
    '####',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [
    { type: 'storage', params: { capacity: 50, itemTypes: ['all'] } },
  ],
  capacity: 50,
  style: 'rustic',
};

// =============================================================================
// TIER 2 - ESTABLISHED BUILDINGS
// =============================================================================

export const CABIN_WITH_WINDOWS: VoxelBuildingDefinition = {
  id: 'cabin_with_windows',
  name: 'Cozy Cabin',
  description: 'A comfortable cabin with windows for natural light.',
  category: 'residential',
  tier: 2,
  layout: [
    '#######',
    '#.....#',
    'W.....W',
    '#.....D',
    '#######',
  ],
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 2, restBonus: 1.2 } },
  ],
  capacity: 2,
  style: 'rustic',
  lore: 'A warm cabin with windows that let in morning light.',
};

export const WORKSHOP: VoxelBuildingDefinition = {
  id: 'workshop',
  name: 'Craftsman Workshop',
  description: 'A dedicated space for crafting and production.',
  category: 'production',
  tier: 2,
  layout: [
    '########',
    '#......#',
    '#......#',
    '#......D',
    '########',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'wood',
  },
  functionality: [
    { type: 'crafting', params: { speed: 1.2, recipes: ['basic', 'intermediate'] } },
  ],
  capacity: 2,
  style: 'stone_craft',
};

// =============================================================================
// TIER 3 - DEVELOPED BUILDINGS
// =============================================================================

export const HOUSE_WITH_ROOMS: VoxelBuildingDefinition = {
  id: 'house_with_rooms',
  name: 'Two-Room House',
  description: 'A house with separate bedroom and living area.',
  category: 'residential',
  tier: 3,
  layout: [
    '###########',
    '#....#....#',
    '#....D....#',
    'W....#....W',
    '#....#....#',
    '######D####',
  ],
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
  rooms: [
    { name: 'bedroom', purpose: 'sleeping', anchorTile: { x: 2, y: 2 } },
    { name: 'living_room', purpose: 'socializing', anchorTile: { x: 7, y: 2 } },
  ],
  functionality: [
    { type: 'sleeping', params: { beds: 2, restBonus: 1.5 } },
    { type: 'mood_aura', params: { bonus: 5, radius: 3 } },
  ],
  capacity: 2,
  style: 'rustic',
};

export const L_SHAPED_WORKSHOP: VoxelBuildingDefinition = {
  id: 'l_shaped_workshop',
  name: 'L-Shaped Workshop',
  description: 'A large workshop with an L-shaped floor plan for efficient workflow.',
  category: 'production',
  tier: 3,
  layout: [
    '#########',
    '#.......#',
    '#.......#',
    '#.......####',
    '#..........D',
    '############',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'metal',
  },
  functionality: [
    { type: 'crafting', params: { speed: 1.5, recipes: ['all'] } },
    { type: 'storage', params: { capacity: 100 } },
  ],
  capacity: 4,
  style: 'stone_craft',
};

export const BARN: VoxelBuildingDefinition = {
  id: 'barn',
  name: 'Storage Barn',
  description: 'A large barn for storing crops, tools, and materials.',
  category: 'storage',
  tier: 3,
  layout: [
    '##############',
    '#............#',
    '#............#',
    'D............D',
    '#............#',
    '#............#',
    '##############',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [
    { type: 'storage', params: { capacity: 500, itemTypes: ['crops', 'tools', 'materials'] } },
  ],
  capacity: 500,
  style: 'rustic',
  lore: 'A sturdy barn that protects the village harvest.',
};

// =============================================================================
// TIER 4 - ADVANCED BUILDINGS
// =============================================================================

export const MANOR: VoxelBuildingDefinition = {
  id: 'manor',
  name: 'Village Manor',
  description: 'An elegant manor house with multiple rooms and fine furnishings.',
  category: 'residential',
  tier: 4,
  layout: [
    '##################',
    '#......#.........#',
    '#......D.........#',
    'W......#.........W',
    '#......#.........#',
    '####D########D####',
    '#...........#....#',
    '#...........#....#',
    'W...........D....W',
    '#...........#....#',
    '########D#########',
  ],
  materials: {
    wall: 'stone',
    floor: 'wood',
    door: 'wood',
  },
  rooms: [
    { name: 'master_bedroom', purpose: 'sleeping', anchorTile: { x: 3, y: 2 } },
    { name: 'guest_room', purpose: 'sleeping', anchorTile: { x: 13, y: 2 } },
    { name: 'great_hall', purpose: 'socializing', anchorTile: { x: 5, y: 7 } },
    { name: 'study', purpose: 'research', anchorTile: { x: 14, y: 8 } },
  ],
  functionality: [
    { type: 'sleeping', params: { beds: 4, restBonus: 2.0 } },
    { type: 'mood_aura', params: { bonus: 10, radius: 5 } },
    { type: 'research', params: { bonus: 0.5 } },
  ],
  capacity: 4,
  style: 'stone_craft',
  lore: 'A stately manor befitting the village elder.',
};

export const TOWN_HALL: VoxelBuildingDefinition = {
  id: 'town_hall',
  name: 'Town Hall',
  description: 'The center of village governance and community gatherings.',
  category: 'community',
  tier: 4,
  layout: [
    '################',
    '#..............#',
    '#..............#',
    '#..............#',
    'W..............W',
    '#..............#',
    '#..............#',
    '#..............#',
    '#######D########',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'wood',
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 15, radius: 10 } },
  ],
  capacity: 50,
  style: 'stone_craft',
  lore: 'Where the village council meets to decide the fate of the community.',
};

// =============================================================================
// TIER 5 - LEGENDARY BUILDINGS
// =============================================================================

export const CATHEDRAL: VoxelBuildingDefinition = {
  id: 'cathedral',
  name: 'Grand Cathedral',
  description: 'A magnificent cathedral with soaring ceilings and stained glass.',
  category: 'community',
  tier: 5,
  layout: [
    '########WWW########',
    '#.................#',
    'W.................W',
    '#.................#',
    '#.................#',
    'W.................W',
    '#.................#',
    '#.................#',
    '#.....#####.......#',
    '#.....#...#.......#',
    '#.....D...D.......#',
    '#.....#...#.......#',
    '#.....#####.......#',
    '#.................#',
    'W.................W',
    '#.................#',
    '#########D#########',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'wood',
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 25, radius: 20 } },
  ],
  capacity: 100,
  style: 'ancient',
  lore: 'A sacred space that fills the hearts of villagers with hope and wonder.',
};

// =============================================================================
// INVALID EXAMPLES (FOR TESTING VALIDATION)
// =============================================================================

export const INVALID_NO_ENTRANCE: VoxelBuildingDefinition = {
  id: 'invalid_no_entrance',
  name: 'No Entrance Building',
  description: 'This building has no way in!',
  category: 'residential',
  tier: 1,
  layout: [
    '#####',
    '#...#',
    '#...#',
    '#...#',
    '#####',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [],
  capacity: 1,
};

export const INVALID_UNREACHABLE_ROOM: VoxelBuildingDefinition = {
  id: 'invalid_unreachable_room',
  name: 'Unreachable Room',
  description: 'This building has an isolated room.',
  category: 'residential',
  tier: 2,
  layout: [
    '###########',
    '#....#....#',
    '#....#....#',
    '#....#....D',
    '###########',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [],
  capacity: 2,
};

export const INVALID_HOLE_IN_WALL: VoxelBuildingDefinition = {
  id: 'invalid_hole_in_wall',
  name: 'Hole in Wall',
  description: 'This building has no entrance - walls are complete but no door.',
  category: 'residential',
  tier: 1,
  layout: [
    '#####',
    '#...#',
    '#...#',
    '#...#',
    '#####', // No door = no way in
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [],
  capacity: 1,
};

export const INVALID_DOOR_TO_WALL: VoxelBuildingDefinition = {
  id: 'invalid_door_to_wall',
  name: 'Door to Wall',
  description: 'This building has a door that leads to a wall.',
  category: 'residential',
  tier: 1,
  layout: [
    '#####',
    '#D..#',
    '#...#',
    '#...D',
    '#####',
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [],
  capacity: 1,
};

// =============================================================================
// EXAMPLE COLLECTIONS
// =============================================================================

export const ALL_VALID_EXAMPLES: VoxelBuildingDefinition[] = [
  SIMPLE_HUT,
  STORAGE_SHED,
  CABIN_WITH_WINDOWS,
  WORKSHOP,
  HOUSE_WITH_ROOMS,
  L_SHAPED_WORKSHOP,
  BARN,
  MANOR,
  TOWN_HALL,
  CATHEDRAL,
];

export const ALL_INVALID_EXAMPLES: VoxelBuildingDefinition[] = [
  INVALID_NO_ENTRANCE,
  INVALID_UNREACHABLE_ROOM,
  INVALID_HOLE_IN_WALL,
  INVALID_DOOR_TO_WALL,
];

export const EXAMPLES_BY_TIER: Record<number, VoxelBuildingDefinition[]> = {
  1: [SIMPLE_HUT, STORAGE_SHED],
  2: [CABIN_WITH_WINDOWS, WORKSHOP],
  3: [HOUSE_WITH_ROOMS, L_SHAPED_WORKSHOP, BARN],
  4: [MANOR, TOWN_HALL],
  5: [CATHEDRAL],
};

export const EXAMPLES_BY_CATEGORY: Record<string, VoxelBuildingDefinition[]> = {
  residential: [SIMPLE_HUT, CABIN_WITH_WINDOWS, HOUSE_WITH_ROOMS, MANOR],
  storage: [STORAGE_SHED, BARN],
  production: [WORKSHOP, L_SHAPED_WORKSHOP],
  community: [TOWN_HALL, CATHEDRAL],
};
