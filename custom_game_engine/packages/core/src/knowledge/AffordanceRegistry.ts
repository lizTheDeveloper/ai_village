/**
 * AffordanceRegistry - Unified knowledge base for game object capabilities
 *
 * Provides structured data about what buildings, items, and recipes CAN DO.
 * Used by LLMs to reason about solutions to problems without hardcoded logic.
 *
 * Design principles:
 * - Affordances describe capabilities, not prescriptions
 * - LLM reasons about problem→solution, affordances provide ground truth
 * - Data-driven: add new items/buildings without changing reasoning code
 */

// ============================================================================
// Core Affordance Types
// ============================================================================

/**
 * What a game object provides or enables.
 */
export interface Affordance {
  /** Unique capability identifier */
  capability: string;
  /** Human-readable description for LLM context */
  description: string;
  /** Optional numeric value (capacity, bonus amount, etc.) */
  value?: number;
  /** Optional conditions or requirements */
  requires?: string[];
}

/**
 * Cost to create/build something.
 */
export interface AffordanceCost {
  resourceId: string;
  amount: number;
}

// ============================================================================
// Building Affordances
// ============================================================================

export interface BuildingAffordance {
  id: string;
  name: string;
  description: string;
  tier: number;
  cost: AffordanceCost[];
  provides: Affordance[];
  /** Problems this building solves */
  solves: string[];
}

export const BUILDING_AFFORDANCES: Record<string, BuildingAffordance> = {
  'workbench': {
    id: 'workbench',
    name: 'Workbench',
    description: 'A crafting station for making tools and basic items',
    tier: 1,
    cost: [{ resourceId: 'wood', amount: 20 }],
    provides: [
      { capability: 'crafting', description: 'Enables crafting basic tools and items', value: 1.0 },
      { capability: 'tool_making', description: 'Can craft axes, pickaxes, hoes, hammers' },
    ],
    solves: ['cannot_craft', 'need_tools', 'no_crafting_station'],
  },

  'storage-chest': {
    id: 'storage-chest',
    name: 'Storage Chest',
    description: 'A wooden chest for storing items safely',
    tier: 1,
    cost: [{ resourceId: 'wood', amount: 10 }],
    provides: [
      { capability: 'storage', description: 'Stores up to 20 item stacks', value: 20 },
      { capability: 'item_preservation', description: 'Items stored here persist and are protected' },
    ],
    solves: ['inventory_full', 'no_storage', 'losing_items', 'need_more_capacity'],
  },

  'campfire': {
    id: 'campfire',
    name: 'Campfire',
    description: 'A fire pit that provides warmth, light, and cooking',
    tier: 1,
    cost: [{ resourceId: 'wood', amount: 5 }, { resourceId: 'stone', amount: 10 }],
    provides: [
      { capability: 'warmth', description: 'Heats nearby area by 10 degrees', value: 10 },
      { capability: 'light', description: 'Illuminates area at night', value: 8 },
      { capability: 'cooking', description: 'Can cook raw food into cooked food' },
    ],
    solves: ['cold', 'freezing', 'need_warmth', 'dark_at_night', 'raw_food'],
  },

  'tent': {
    id: 'tent',
    name: 'Tent',
    description: 'A cloth shelter for sleeping with weather protection',
    tier: 1,
    cost: [{ resourceId: 'cloth', amount: 10 }, { resourceId: 'wood', amount: 5 }],
    provides: [
      { capability: 'shelter', description: 'Provides 70% weather protection' },
      { capability: 'sleeping', description: 'Improves sleep quality by 20%', value: 1.2 },
      { capability: 'insulation', description: 'Keeps interior warmer', value: 0.5 },
    ],
    solves: ['no_shelter', 'poor_sleep', 'exposed_to_weather', 'need_rest'],
  },

  'lean-to': {
    id: 'lean-to',
    name: 'Lean-to',
    description: 'A simple wooden shelter for basic rest',
    tier: 1,
    cost: [{ resourceId: 'wood', amount: 10 }, { resourceId: 'leaves', amount: 5 }],
    provides: [
      { capability: 'shelter', description: 'Provides basic weather protection' },
      { capability: 'sleeping', description: 'Improves sleep quality by 10%', value: 1.1 },
    ],
    solves: ['no_shelter', 'need_rest'],
  },

  'bed': {
    id: 'bed',
    name: 'Bed',
    description: 'A comfortable bed for the best sleep quality',
    tier: 1,
    cost: [{ resourceId: 'wood', amount: 10 }, { resourceId: 'fiber', amount: 15 }],
    provides: [
      { capability: 'sleeping', description: 'Best sleep quality, 50% bonus rest', value: 1.5 },
      { capability: 'comfort', description: 'Increases mood when well-rested' },
    ],
    solves: ['poor_sleep', 'exhaustion', 'need_rest', 'tired'],
  },

  'well': {
    id: 'well',
    name: 'Well',
    description: 'A stone well for drawing water',
    tier: 1,
    cost: [{ resourceId: 'stone', amount: 30 }],
    provides: [
      { capability: 'water_source', description: 'Provides unlimited water access' },
      { capability: 'irrigation', description: 'Can water nearby plants' },
    ],
    solves: ['no_water', 'thirsty', 'plants_dry', 'need_water'],
  },

  'forge': {
    id: 'forge',
    name: 'Forge',
    description: 'A metal forge for smelting ore and crafting metal items',
    tier: 2,
    cost: [{ resourceId: 'stone', amount: 40 }, { resourceId: 'iron_ingot', amount: 20 }],
    provides: [
      { capability: 'smelting', description: 'Converts ore into metal ingots' },
      { capability: 'metalworking', description: 'Crafts metal tools, weapons, and armor' },
      { capability: 'crafting_speed', description: '50% faster metal crafting', value: 1.5 },
    ],
    solves: ['cannot_smelt', 'need_metal_tools', 'have_ore_no_ingots'],
  },

  'farm_shed': {
    id: 'farm_shed',
    name: 'Farm Shed',
    description: 'Storage building specialized for farming supplies',
    tier: 2,
    cost: [{ resourceId: 'wood', amount: 30 }],
    provides: [
      { capability: 'storage', description: 'Stores 40 farming-related items', value: 40 },
      { capability: 'seed_storage', description: 'Keeps seeds fresh and organized' },
      { capability: 'tool_storage', description: 'Organized space for farming tools' },
    ],
    solves: ['seeds_scattered', 'farm_tools_lost', 'need_farm_storage'],
  },

  'workshop': {
    id: 'workshop',
    name: 'Workshop',
    description: 'An advanced crafting facility for complex items',
    tier: 3,
    cost: [{ resourceId: 'wood', amount: 60 }, { resourceId: 'iron_ingot', amount: 30 }],
    provides: [
      { capability: 'advanced_crafting', description: 'Enables complex item crafting' },
      { capability: 'machinery', description: 'Can build automated equipment' },
      { capability: 'crafting_speed', description: '30% faster crafting', value: 1.3 },
    ],
    solves: ['cannot_craft_advanced', 'need_machinery', 'complex_items'],
  },

  'barn': {
    id: 'barn',
    name: 'Barn',
    description: 'A large building for storing goods and housing animals',
    tier: 3,
    cost: [{ resourceId: 'wood', amount: 80 }, { resourceId: 'stone', amount: 40 }],
    provides: [
      { capability: 'storage', description: 'Massive storage of 100 item stacks', value: 100 },
      { capability: 'animal_housing', description: 'Houses cows, sheep, goats, pigs', value: 12 },
    ],
    solves: ['need_massive_storage', 'no_animal_housing', 'livestock_homeless'],
  },

  'chicken-coop': {
    id: 'chicken-coop',
    name: 'Chicken Coop',
    description: 'Housing for chickens and other poultry',
    tier: 2,
    cost: [{ resourceId: 'wood', amount: 25 }],
    provides: [
      { capability: 'animal_housing', description: 'Houses up to 8 chickens/ducks/turkeys', value: 8 },
      { capability: 'egg_production', description: 'Housed chickens produce eggs regularly' },
    ],
    solves: ['chickens_homeless', 'need_eggs', 'poultry_housing'],
  },

  'stable': {
    id: 'stable',
    name: 'Stable',
    description: 'Housing for horses and other equines',
    tier: 2,
    cost: [{ resourceId: 'wood', amount: 40 }, { resourceId: 'stone', amount: 20 }],
    provides: [
      { capability: 'animal_housing', description: 'Houses up to 4 horses/donkeys/mules', value: 4 },
      { capability: 'mount_storage', description: 'Keeps mounts rested and ready to ride' },
    ],
    solves: ['horses_homeless', 'need_mount_housing', 'equine_housing'],
  },

  'kennel': {
    id: 'kennel',
    name: 'Kennel',
    description: 'Housing for dogs and wolves',
    tier: 2,
    cost: [{ resourceId: 'wood', amount: 20 }, { resourceId: 'stone', amount: 10 }],
    provides: [
      { capability: 'animal_housing', description: 'Houses up to 6 dogs/wolves', value: 6 },
      { capability: 'guard_animals', description: 'Housed dogs can guard the village' },
    ],
    solves: ['dogs_homeless', 'need_guard_housing', 'canine_housing'],
  },
};

// ============================================================================
// Item Affordances
// ============================================================================

export interface ItemAffordance {
  id: string;
  name: string;
  description: string;
  category: 'resource' | 'food' | 'tool' | 'material' | 'seed';
  provides: Affordance[];
  /** Where this item comes from */
  sources: string[];
  /** What problems having this item solves */
  solves: string[];
}

export const ITEM_AFFORDANCES: Record<string, ItemAffordance> = {
  // === TOOLS ===
  'axe': {
    id: 'axe',
    name: 'Axe',
    description: 'A tool for chopping wood from trees',
    category: 'tool',
    provides: [
      { capability: 'wood_gathering', description: 'Enables gathering wood from trees' },
      { capability: 'tree_chopping', description: 'Can cut down trees' },
    ],
    sources: ['craft at workbench (2 wood + 3 stone)'],
    solves: ['cannot_gather_wood', 'need_wood', 'trees_blocking'],
  },

  'pickaxe': {
    id: 'pickaxe',
    name: 'Pickaxe',
    description: 'A tool for mining stone and ore',
    category: 'tool',
    provides: [
      { capability: 'stone_gathering', description: 'Enables gathering stone from rocks' },
      { capability: 'ore_mining', description: 'Enables mining iron, coal, gold, copper ore' },
    ],
    sources: ['craft at workbench (2 wood + 3 stone)'],
    solves: ['cannot_gather_stone', 'cannot_mine_ore', 'need_stone', 'need_ore'],
  },

  'hoe': {
    id: 'hoe',
    name: 'Hoe',
    description: 'A farming tool for tilling soil',
    category: 'tool',
    provides: [
      { capability: 'tilling', description: 'Enables tilling soil for planting' },
      { capability: 'farming', description: 'Required for preparing farmland' },
    ],
    sources: ['craft at workbench (2 wood + 2 stone)'],
    solves: ['cannot_till', 'cannot_farm', 'need_farmland'],
  },

  'fishing_rod': {
    id: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'A tool for catching fish',
    category: 'tool',
    provides: [
      { capability: 'fishing', description: 'Enables catching fish from water' },
    ],
    sources: ['craft at workbench (3 wood + 2 fiber)'],
    solves: ['cannot_fish', 'need_fish', 'want_food_from_water'],
  },

  'hammer': {
    id: 'hammer',
    name: 'Hammer',
    description: 'A tool for construction and repairs',
    category: 'tool',
    provides: [
      { capability: 'building', description: 'Required for constructing buildings' },
      { capability: 'repair', description: 'Can repair damaged structures' },
    ],
    sources: ['craft at workbench (1 wood + 2 stone)'],
    solves: ['cannot_build', 'need_construction', 'building_damaged'],
  },

  // === RESOURCES ===
  'wood': {
    id: 'wood',
    name: 'Wood',
    description: 'Basic building material from trees',
    category: 'resource',
    provides: [
      { capability: 'building_material', description: 'Used in most constructions' },
      { capability: 'fuel', description: 'Burns in campfires for heat' },
      { capability: 'crafting_material', description: 'Ingredient for tools and items' },
    ],
    sources: ['gather from trees (requires axe)'],
    solves: ['need_building_materials', 'need_fuel', 'need_crafting_materials'],
  },

  'stone': {
    id: 'stone',
    name: 'Stone',
    description: 'Sturdy building material from rocks',
    category: 'resource',
    provides: [
      { capability: 'building_material', description: 'Used in sturdy constructions' },
      { capability: 'crafting_material', description: 'Ingredient for tools' },
    ],
    sources: ['gather from rocks/boulders (requires pickaxe)'],
    solves: ['need_stone', 'need_sturdy_materials'],
  },

  'fiber': {
    id: 'fiber',
    name: 'Plant Fiber',
    description: 'Flexible material from plants',
    category: 'resource',
    provides: [
      { capability: 'crafting_material', description: 'Used for rope, cloth, bedding' },
    ],
    sources: ['gather from grass/plants/flax (no tool needed)'],
    solves: ['need_fiber', 'need_rope', 'need_cloth_materials'],
  },

  'iron_ore': {
    id: 'iron_ore',
    name: 'Iron Ore',
    description: 'Raw metal ore that can be smelted',
    category: 'resource',
    provides: [
      { capability: 'smelting_input', description: 'Smelts into iron ingots at forge' },
    ],
    sources: ['mine from iron deposits (requires pickaxe)'],
    solves: ['need_iron_ore', 'need_metal'],
  },

  'iron_ingot': {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    description: 'Refined metal for crafting',
    category: 'material',
    provides: [
      { capability: 'metal_crafting', description: 'Used for metal tools and weapons' },
      { capability: 'building_material', description: 'Required for advanced buildings' },
    ],
    sources: ['smelt iron_ore at forge (3 ore → 1 ingot)'],
    solves: ['need_iron_ingot', 'need_refined_metal'],
  },

  'cloth': {
    id: 'cloth',
    name: 'Cloth',
    description: 'Woven fabric for clothing and shelter',
    category: 'material',
    provides: [
      { capability: 'clothing_material', description: 'Used for making clothes' },
      { capability: 'shelter_material', description: 'Used for tents and bedding' },
    ],
    sources: ['craft from fiber (3 fiber → 1 cloth)'],
    solves: ['need_cloth', 'need_tent_materials', 'need_clothing'],
  },

  // === FOOD ===
  'berry': {
    id: 'berry',
    name: 'Berry',
    description: 'A small edible fruit',
    category: 'food',
    provides: [
      { capability: 'food', description: 'Restores 15 hunger when eaten', value: 15 },
    ],
    sources: ['gather from berry bushes (no tool needed)'],
    solves: ['hungry', 'need_food'],
  },

  'raw_meat': {
    id: 'raw_meat',
    name: 'Raw Meat',
    description: 'Uncooked meat from animals',
    category: 'food',
    provides: [
      { capability: 'food', description: 'Restores 15 hunger (risky uncooked)', value: 15 },
      { capability: 'cooking_input', description: 'Cooks into cooked_meat at campfire' },
    ],
    sources: ['hunting animals'],
    solves: ['need_meat', 'need_protein'],
  },

  'cooked_meat': {
    id: 'cooked_meat',
    name: 'Cooked Meat',
    description: 'Safely prepared meat',
    category: 'food',
    provides: [
      { capability: 'food', description: 'Restores 50 hunger when eaten', value: 50 },
    ],
    sources: ['cook raw_meat at campfire'],
    solves: ['hungry', 'need_good_food', 'need_protein'],
  },

  'bread': {
    id: 'bread',
    name: 'Bread',
    description: 'Baked grain product',
    category: 'food',
    provides: [
      { capability: 'food', description: 'Restores 40 hunger when eaten', value: 40 },
    ],
    sources: ['craft from wheat (3 wheat → 1 bread)'],
    solves: ['hungry', 'need_food'],
  },
};

// ============================================================================
// Recipe Affordances
// ============================================================================

export interface RecipeAffordance {
  id: string;
  name: string;
  description: string;
  inputs: AffordanceCost[];
  output: { itemId: string; amount: number };
  station: string | null; // null = hand-craftable
  craftingTime: number;
  provides: string; // What problem this recipe solves
}

export const RECIPE_AFFORDANCES: Record<string, RecipeAffordance> = {
  'stone_axe': {
    id: 'stone_axe',
    name: 'Craft Stone Axe',
    description: 'Create a basic axe for chopping wood',
    inputs: [{ resourceId: 'stone', amount: 2 }, { resourceId: 'wood', amount: 3 }, { resourceId: 'fiber', amount: 1 }],
    output: { itemId: 'axe', amount: 1 },
    station: null,
    craftingTime: 5,
    provides: 'Enables wood gathering from trees',
  },

  'stone_pickaxe': {
    id: 'stone_pickaxe',
    name: 'Craft Stone Pickaxe',
    description: 'Create a basic pickaxe for mining',
    inputs: [{ resourceId: 'stone', amount: 3 }, { resourceId: 'wood', amount: 2 }],
    output: { itemId: 'pickaxe', amount: 1 },
    station: null,
    craftingTime: 5,
    provides: 'Enables stone gathering and ore mining',
  },

  'wooden_hammer': {
    id: 'wooden_hammer',
    name: 'Craft Wooden Hammer',
    description: 'Create a basic hammer for building',
    inputs: [{ resourceId: 'wood', amount: 5 }],
    output: { itemId: 'hammer', amount: 1 },
    station: null,
    craftingTime: 3,
    provides: 'Enables construction of buildings',
  },

  'cloth': {
    id: 'cloth',
    name: 'Weave Cloth',
    description: 'Weave plant fiber into cloth',
    inputs: [{ resourceId: 'fiber', amount: 3 }],
    output: { itemId: 'cloth', amount: 1 },
    station: null,
    craftingTime: 10,
    provides: 'Creates cloth for tents and clothing',
  },

  'iron_ingot': {
    id: 'iron_ingot',
    name: 'Smelt Iron',
    description: 'Smelt iron ore into usable ingots',
    inputs: [{ resourceId: 'iron_ore', amount: 3 }],
    output: { itemId: 'iron_ingot', amount: 1 },
    station: 'forge',
    craftingTime: 20,
    provides: 'Refines ore into metal for crafting',
  },

  'cooked_meat': {
    id: 'cooked_meat',
    name: 'Cook Meat',
    description: 'Cook raw meat over fire',
    inputs: [{ resourceId: 'raw_meat', amount: 1 }],
    output: { itemId: 'cooked_meat', amount: 1 },
    station: 'campfire',
    craftingTime: 15,
    provides: 'Safe, nutritious food that restores more hunger',
  },

  'bread': {
    id: 'bread',
    name: 'Bake Bread',
    description: 'Bake wheat into bread',
    inputs: [{ resourceId: 'wheat', amount: 3 }],
    output: { itemId: 'bread', amount: 1 },
    station: null,
    craftingTime: 10,
    provides: 'Filling food from harvested wheat',
  },
};

// ============================================================================
// LLM Context Formatting
// ============================================================================

/**
 * Format building affordances for LLM context.
 */
export function formatBuildingsForLLM(filter?: { tier?: number; solves?: string }): string {
  let buildings = Object.values(BUILDING_AFFORDANCES);

  if (filter?.tier !== undefined) {
    const maxTier = filter.tier;
    buildings = buildings.filter(b => b.tier <= maxTier);
  }
  if (filter?.solves) {
    const problem = filter.solves;
    buildings = buildings.filter(b => b.solves.includes(problem));
  }

  const lines = buildings.map(b => {
    const cost = b.cost.map(c => `${c.amount} ${c.resourceId}`).join(', ');
    const provides = b.provides.map(p => p.description).join('; ');
    return `- ${b.name} (${cost}): ${b.description}. Provides: ${provides}`;
  });

  return 'Available Buildings:\n' + lines.join('\n');
}

/**
 * Format items for LLM context.
 */
export function formatItemsForLLM(category?: ItemAffordance['category']): string {
  let items = Object.values(ITEM_AFFORDANCES);

  if (category) {
    items = items.filter(i => i.category === category);
  }

  const lines = items.map(i => {
    const provides = i.provides.map(p => p.description).join('; ');
    return `- ${i.name}: ${i.description}. ${provides}`;
  });

  return 'Available Items:\n' + lines.join('\n');
}

/**
 * Format recipes for LLM context.
 */
export function formatRecipesForLLM(station?: string | null): string {
  let recipes = Object.values(RECIPE_AFFORDANCES);

  if (station !== undefined) {
    recipes = recipes.filter(r => r.station === station);
  }

  const lines = recipes.map(r => {
    const inputs = r.inputs.map(i => `${i.amount}x ${i.resourceId}`).join(' + ');
    const stationReq = r.station ? ` (at ${r.station})` : ' (by hand)';
    return `- ${r.name}${stationReq}: ${inputs} → ${r.output.amount}x ${r.output.itemId}. ${r.provides}`;
  });

  return 'Available Recipes:\n' + lines.join('\n');
}

/**
 * Get buildings that solve a specific problem.
 */
export function findBuildingsForProblem(problem: string): BuildingAffordance[] {
  return Object.values(BUILDING_AFFORDANCES).filter(b =>
    b.solves.some(s => s.includes(problem) || problem.includes(s))
  );
}

/**
 * Get items that solve a specific problem.
 */
export function findItemsForProblem(problem: string): ItemAffordance[] {
  return Object.values(ITEM_AFFORDANCES).filter(i =>
    i.solves.some(s => s.includes(problem) || problem.includes(s))
  );
}

/**
 * Format complete game knowledge for LLM.
 * This is the full context an agent needs to reason about what to do.
 */
export function formatGameKnowledgeForLLM(): string {
  return `
${formatBuildingsForLLM()}

${formatItemsForLLM('tool')}

${formatRecipesForLLM()}
`.trim();
}
