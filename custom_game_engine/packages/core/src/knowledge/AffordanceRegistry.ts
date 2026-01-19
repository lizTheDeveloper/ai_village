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
 *
 * Uses lazy loading to defer JSON parsing and validation until first access.
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

// Lazy-loaded cache
let cachedBuildingAffordances: Record<string, BuildingAffordance> | null = null;

/**
 * Validate and load building affordances from JSON data (lazy).
 */
function loadBuildingAffordances(): Record<string, BuildingAffordance> {
  if (cachedBuildingAffordances) {
    return cachedBuildingAffordances;
  }

  const buildingsData = require('../../data/affordances/buildings.json');
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

  cachedBuildingAffordances = result;
  return result;
}

/**
 * Get building affordances (lazy-loaded)
 */
export function getBuildingAffordances(): Record<string, BuildingAffordance> {
  return loadBuildingAffordances();
}

// Deprecated: Use getBuildingAffordances() function instead

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

// Lazy-loaded cache
let cachedItemAffordances: Record<string, ItemAffordance> | null = null;

/**
 * Validate and load item affordances from JSON data (lazy).
 */
function loadItemAffordances(): Record<string, ItemAffordance> {
  if (cachedItemAffordances) {
    return cachedItemAffordances;
  }

  const itemsData = require('../../data/affordances/items.json');
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

  cachedItemAffordances = result;
  return result;
}

/**
 * Get item affordances (lazy-loaded)
 */
export function getItemAffordances(): Record<string, ItemAffordance> {
  return loadItemAffordances();
}

// Deprecated: Use getItemAffordances() function instead

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

// Lazy-loaded cache
let cachedRecipeAffordances: Record<string, RecipeAffordance> | null = null;

/**
 * Validate and load recipe affordances from JSON data (lazy).
 */
function loadRecipeAffordances(): Record<string, RecipeAffordance> {
  if (cachedRecipeAffordances) {
    return cachedRecipeAffordances;
  }

  const recipesData = require('../../data/affordances/recipes.json');
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

  cachedRecipeAffordances = result;
  return result;
}

/**
 * Get recipe affordances (lazy-loaded)
 */
export function getRecipeAffordances(): Record<string, RecipeAffordance> {
  return loadRecipeAffordances();
}

// Deprecated: Use getRecipeAffordances() function instead

// ============================================================================
// LLM Context Formatting
// ============================================================================

/**
 * Format building affordances for LLM context.
 */
export function formatBuildingsForLLM(filter?: { tier?: number; solves?: string }): string {
  let buildings = Object.values(getBuildingAffordances());

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
  let items = Object.values(getItemAffordances());

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
  let recipes = Object.values(getRecipeAffordances());

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
  return Object.values(getBuildingAffordances()).filter(b =>
    b.solves.some(s => s.includes(problem) || problem.includes(s))
  );
}

/**
 * Get items that solve a specific problem.
 */
export function findItemsForProblem(problem: string): ItemAffordance[] {
  return Object.values(getItemAffordances()).filter(i =>
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
