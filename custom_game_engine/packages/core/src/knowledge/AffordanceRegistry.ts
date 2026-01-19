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

// Load data from JSON files (outside src/ directory)
import buildingsData from '../../data/affordances/buildings.json';
import itemsData from '../../data/affordances/items.json';
import recipesData from '../../data/affordances/recipes.json';

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

/**
 * Validate and load building affordances from JSON data.
 */
function loadBuildingAffordances(): Record<string, BuildingAffordance> {
  const data = buildingsData as Record<string, unknown>;
  const result: Record<string, BuildingAffordance> = {};

  for (const [key, value] of Object.entries(data)) {
    const building = value as BuildingAffordance;

    // Validate required fields
    if (!building.id || !building.name || !building.description) {
      throw new Error(`Invalid building affordance: ${key} missing required fields`);
    }
    if (typeof building.tier !== 'number') {
      throw new Error(`Invalid building affordance: ${key} missing tier`);
    }
    if (!Array.isArray(building.cost) || !Array.isArray(building.provides) || !Array.isArray(building.solves)) {
      throw new Error(`Invalid building affordance: ${key} missing required arrays`);
    }

    result[key] = building;
  }

  return result;
}

export const BUILDING_AFFORDANCES: Record<string, BuildingAffordance> = loadBuildingAffordances();

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

/**
 * Validate and load item affordances from JSON data.
 */
function loadItemAffordances(): Record<string, ItemAffordance> {
  const data = itemsData as Record<string, unknown>;
  const result: Record<string, ItemAffordance> = {};

  const validCategories = ['resource', 'food', 'tool', 'material', 'seed'];

  for (const [key, value] of Object.entries(data)) {
    const item = value as ItemAffordance;

    // Validate required fields
    if (!item.id || !item.name || !item.description) {
      throw new Error(`Invalid item affordance: ${key} missing required fields`);
    }
    if (!validCategories.includes(item.category)) {
      throw new Error(`Invalid item affordance: ${key} has invalid category: ${item.category}`);
    }
    if (!Array.isArray(item.provides) || !Array.isArray(item.sources) || !Array.isArray(item.solves)) {
      throw new Error(`Invalid item affordance: ${key} missing required arrays`);
    }

    result[key] = item;
  }

  return result;
}

export const ITEM_AFFORDANCES: Record<string, ItemAffordance> = loadItemAffordances();

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

/**
 * Validate and load recipe affordances from JSON data.
 */
function loadRecipeAffordances(): Record<string, RecipeAffordance> {
  const data = recipesData as Record<string, unknown>;
  const result: Record<string, RecipeAffordance> = {};

  for (const [key, value] of Object.entries(data)) {
    const recipe = value as RecipeAffordance;

    // Validate required fields
    if (!recipe.id || !recipe.name || !recipe.description) {
      throw new Error(`Invalid recipe affordance: ${key} missing required fields`);
    }
    if (!Array.isArray(recipe.inputs)) {
      throw new Error(`Invalid recipe affordance: ${key} missing inputs array`);
    }
    if (!recipe.output || typeof recipe.output.itemId !== 'string' || typeof recipe.output.amount !== 'number') {
      throw new Error(`Invalid recipe affordance: ${key} has invalid output`);
    }
    if (typeof recipe.craftingTime !== 'number') {
      throw new Error(`Invalid recipe affordance: ${key} missing craftingTime`);
    }
    if (typeof recipe.provides !== 'string') {
      throw new Error(`Invalid recipe affordance: ${key} missing provides description`);
    }

    result[key] = recipe;
  }

  return result;
}

export const RECIPE_AFFORDANCES: Record<string, RecipeAffordance> = loadRecipeAffordances();

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
