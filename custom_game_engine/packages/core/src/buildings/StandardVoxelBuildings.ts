/**
 * Standard Building Definitions using BuildingBlueprint
 *
 * Migrated from TileBasedBlueprintRegistry to support:
 * - Furniture (beds, storage, tables, workstations)
 * - Multi-floor layouts (roofs, attics, basements)
 * - Side view visualization
 * - Proper validation
 *
 * Uses the unified BuildingBlueprint system with voxel/layout support
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingFloor } from '../../../building-designer/src/types.js';

// =============================================================================
// RESIDENTIAL BUILDINGS
// =============================================================================

/**
 * Small House (5x5) - Cozy single-room dwelling
 *
 * Features:
 * - Bed for sleeping
 * - Storage chest for items
 * - Window for natural light
 * - Centered door
 * - Peaked roof (auto-generated from floors)
 */
export const SMALL_HOUSE: BuildingBlueprint = {
  id: 'small_house',
  name: 'Small House',
  description: 'Cozy single-room dwelling with bed and storage',
  category: 'residential',
  tier: 1,

  // Dimensions (calculated from layout)
  width: 5,
  height: 5,

  // Requirements
  resourceCost: [
    { resourceId: 'wood', amountRequired: 50 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 120,

  // Functionality
  functionality: [
    { type: 'sleeping', restBonus: 10 },
  ],
  capacity: 2,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  // Voxel/Layout (ground floor with furniture)
  layout: [
    '#####',
    '#B.S#',  // Bed (B) and Storage chest (S)
    'W...D',  // Window (W) and Door (D)
    '#...#',
    '#####',
  ],

  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },

  // Attic/roof space
  floors: [
    {
      level: 1,
      name: 'Attic',
      layout: [
        '#####',
        '#S.S#',  // Storage attic
        '#...#',
        '#...#',
        '#####',
      ],
      ceilingHeight: 2,  // Low attic ceiling
    },
  ],
};

/**
 * Cozy Cottage (6x6) - Comfortable home with separate spaces
 *
 * Features:
 * - Two beds (can fit a couple or family)
 * - Storage chest
 * - Two tables (dining area)
 * - Symmetrical windows
 * - Centered door
 * - Proper attic with storage
 */
export const COZY_COTTAGE: BuildingBlueprint = {
  id: 'cozy_cottage',
  name: 'Cozy Cottage',
  description: 'Comfortable home with separate living and sleeping areas',
  category: 'residential',
  tier: 2,

  // Dimensions
  width: 6,
  height: 6,

  // Requirements
  resourceCost: [
    { resourceId: 'wood', amountRequired: 80 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 180,

  // Functionality
  functionality: [{ type: 'sleeping', restBonus: 10 }],
  capacity: 4,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  // Ground floor
  layout: [
    '######',
    '#B..S#',  // Bed and Storage
    'W....W',  // Windows on both sides
    '#T..T#',  // Two tables for dining
    '#....#',
    '###D##',  // Centered entrance
  ],

  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },

  floors: [
    {
      level: 1,
      name: 'Bedroom Loft',
      layout: [
        '######',
        '#B..B#',  // Two beds upstairs
        '#....#',
        '#.SS.#',  // Storage chests
        '#....#',
        '######',
      ],
      ceilingHeight: 3,
    },
  ],
};

/**
 * Stone House (5x5) - Durable dwelling with excellent insulation
 *
 * Features:
 * - Bed and storage
 * - Two symmetrical windows
 * - Stone construction (better insulation)
 * - Centered door
 */
export const STONE_HOUSE: BuildingBlueprint = {
  id: 'stone_house',
  name: 'Stone House',
  description: 'Durable dwelling with excellent insulation and stone construction',
  category: 'residential',
  tier: 3,

  // Dimensions
  width: 5,
  height: 5,

  // Requirements
  resourceCost: [
    { resourceId: 'stone', amountRequired: 60 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 200,

  // Functionality
  functionality: [{ type: 'sleeping', restBonus: 10 }],
  capacity: 3,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  layout: [
    '#####',
    'WB.SW',  // Windows, Bed, Storage
    '#...#',
    '#.T.#',  // Table in center
    '##D##',
  ],

  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'stone',
  },

  floors: [
    {
      level: 1,
      name: 'Upper Chamber',
      layout: [
        '#####',
        '#S.S#',
        '#...#',
        '#...#',
        '#####',
      ],
      ceilingHeight: 3,
    },
  ],
};

/**
 * Longhouse (8x4) - Large communal dwelling
 *
 * Features:
 * - Multiple beds for communal living
 * - Several storage chests
 * - Tables for communal dining
 * - Large windows for natural light
 * - Centered entrance
 */
export const LONGHOUSE: BuildingBlueprint = {
  id: 'longhouse',
  name: 'Longhouse',
  description: 'Large communal dwelling for extended families or groups',
  category: 'residential',
  tier: 3,

  // Dimensions
  width: 8,
  height: 4,

  // Requirements
  resourceCost: [
    { resourceId: 'wood', amountRequired: 120 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 240,

  // Functionality
  functionality: [{ type: 'sleeping', restBonus: 10 }, { type: 'storage', capacity: 100 }],
  capacity: 8,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  layout: [
    '########',
    'WB..T.BW',  // Beds, Table, Windows
    'W.SS.S.W',  // Storage chests
    '####D###',  // Centered door
  ],

  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },

  floors: [
    {
      level: 1,
      name: 'Sleeping Loft',
      layout: [
        '########',
        '#B.B.B.#',  // Multiple beds
        '#......#',
        '########',
      ],
      ceilingHeight: 2,
    },
  ],
};

// =============================================================================
// PRODUCTION BUILDINGS
// =============================================================================

/**
 * Workshop (5x5) - Crafting building with workstations
 *
 * Features:
 * - Two workstations (K) for crafting
 * - Storage chest for materials
 * - Table for planning/blueprints
 * - Windows for ventilation
 * - Centered door
 */
export const WORKSHOP: BuildingBlueprint = {
  id: 'workshop',
  name: 'Workshop',
  description: 'Crafting building with workstations and storage for materials',
  category: 'production',
  tier: 2,

  // Dimensions
  width: 5,
  height: 5,

  // Requirements
  resourceCost: [
    { resourceId: 'stone', amountRequired: 70 },
    { resourceId: 'wood', amountRequired: 30 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 200,

  // Functionality
  functionality: [{ type: 'crafting', recipes: [], speed: 1.0 }, { type: 'storage', capacity: 100 }],
  capacity: 4,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  layout: [
    '#####',
    'WK.SW',  // Workstation, Storage, Windows
    '#...#',
    '#.T.#',  // Table
    '##D##',
  ],

  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'stone',
  },

  floors: [
    {
      level: 1,
      name: 'Storage Loft',
      layout: [
        '#####',
        '#SSS#',  // Storage for materials
        '#...#',
        '#...#',
        '#####',
      ],
      ceilingHeight: 2,
    },
  ],
};

/**
 * Barn (6x5) - Large agricultural building
 *
 * Features:
 * - Double doors for animals/carts
 * - Storage chests for hay/grain
 * - Tables for sorting
 * - Windows for ventilation
 * - High ceiling for hay storage
 */
export const BARN: BuildingBlueprint = {
  id: 'barn',
  name: 'Barn',
  description: 'Large agricultural building for storage and animal husbandry',
  category: 'farming',
  tier: 3,

  // Dimensions
  width: 6,
  height: 5,

  // Requirements
  resourceCost: [
    { resourceId: 'wood', amountRequired: 150 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 300,

  // Functionality
  functionality: [{ type: 'storage', capacity: 100 }, { type: 'gathering_boost', resourceTypes: ['food', 'wood'], radius: 10 }],
  capacity: 20,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  layout: [
    '######',
    'WS..SW',  // Storage and Windows
    'D.TT.D',  // Double doors, Tables
    'WS..SW',
    '######',
  ],

  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },

  floors: [
    {
      level: 1,
      name: 'Hay Loft',
      layout: [
        '######',
        '#SSSS#',  // Lots of storage
        '#....#',
        '#SSSS#',
        '######',
      ],
      ceilingHeight: 4,  // Tall ceiling for hay storage
    },
  ],
};

// =============================================================================
// STORAGE BUILDINGS
// =============================================================================

/**
 * Storage Shed (3x2) - Simple storage
 *
 * Features:
 * - Storage chest
 * - Door for access
 * - Simple construction
 */
export const STORAGE_SHED: BuildingBlueprint = {
  id: 'storage_shed',
  name: 'Storage Shed',
  description: 'Simple storage structure for basic item storage',
  category: 'storage',
  tier: 1,

  // Dimensions
  width: 3,
  height: 2,

  // Requirements
  resourceCost: [
    { resourceId: 'wood', amountRequired: 30 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 60,

  // Functionality
  functionality: [{ type: 'storage', capacity: 100 }],
  capacity: 10,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  layout: [
    '###',
    'D.S',  // Door and Storage
  ],

  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
};

// =============================================================================
// COMMUNITY BUILDINGS
// =============================================================================

/**
 * Guard Tower (4x4) - Defensive structure with visibility
 *
 * Features:
 * - Four windows for 360° visibility
 * - Storage for weapons
 * - Table for maps/planning
 * - Multi-story for height advantage
 * - Stone construction for durability
 */
export const GUARD_TOWER: BuildingBlueprint = {
  id: 'guard_tower',
  name: 'Guard Tower',
  description: 'Defensive structure with visibility and height advantage',
  category: 'community',
  tier: 2,

  // Dimensions
  width: 4,
  height: 4,

  // Requirements
  resourceCost: [
    { resourceId: 'stone', amountRequired: 100 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],

  // Status
  unlocked: true,
  buildTime: 250,

  // Functionality
  functionality: [{ type: 'mood_aura', moodBonus: 5, radius: 10 }],
  capacity: 3,

  // Placement rules
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,

  // Ground floor
  layout: [
    '####',
    'WS.W',  // Windows and Storage
    'W..W',
    '##D#',
  ],

  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'stone',
  },

  floors: [
    {
      level: 1,
      name: 'Watch Level',
      layout: [
        '####',
        'W.TW',  // Table for maps
        'W..W',
        '####',
      ],
      ceilingHeight: 3,
    },
    {
      level: 2,
      name: 'Tower Top',
      layout: [
        'WWWW',  // Open observation deck with low walls
        'W..W',
        'W..W',
        'WWWW',
      ],
      ceilingHeight: 4,  // Tall ceiling for visibility
    },
  ],
};

// =============================================================================
// BUILDING COLLECTIONS
// =============================================================================

export const ALL_RESIDENTIAL = [
  SMALL_HOUSE,
  COZY_COTTAGE,
  STONE_HOUSE,
  LONGHOUSE,
];

export const ALL_PRODUCTION = [
  WORKSHOP,
  BARN,
];

export const ALL_STORAGE = [
  STORAGE_SHED,
];

export const ALL_COMMUNITY = [
  GUARD_TOWER,
];

export const ALL_STANDARD_VOXEL_BUILDINGS = [
  ...ALL_RESIDENTIAL,
  ...ALL_PRODUCTION,
  ...ALL_STORAGE,
  ...ALL_COMMUNITY,
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get buildings by category
 */
export function getBuildingsByCategory(category: string): BuildingBlueprint[] {
  return ALL_STANDARD_VOXEL_BUILDINGS.filter(b => b.category === category);
}

/**
 * Get buildings by tier
 */
export function getBuildingsByTier(tier: number): BuildingBlueprint[] {
  return ALL_STANDARD_VOXEL_BUILDINGS.filter(b => b.tier === tier);
}

/**
 * Get building by name
 */
export function getBuildingByName(name: string): BuildingBlueprint | undefined {
  return ALL_STANDARD_VOXEL_BUILDINGS.find(b => b.name === name);
}
