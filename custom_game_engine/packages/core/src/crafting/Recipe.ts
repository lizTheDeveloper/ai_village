/**
 * Ingredient requirement for a recipe.
 */
export interface RecipeIngredient {
  /** Item ID of the ingredient */
  itemId: string;
  /** Quantity required */
  quantity: number;
}

/**
 * Output item from a recipe.
 */
export interface RecipeOutput {
  /** Item ID produced */
  itemId: string;
  /** Quantity produced */
  quantity: number;
}

/**
 * Skill requirement for a recipe.
 */
export interface SkillRequirement {
  /** Skill name (e.g., 'smithing', 'crafting') */
  skill: string;
  /** Minimum level required */
  level: number;
}

/**
 * Recipe definition for crafting items.
 * Based on items-system/spec.md REQ-ITM-004, REQ-ITM-005
 */
export interface Recipe {
  /** Unique recipe ID */
  id: string;
  /** Display name */
  name: string;
  /** Recipe category (Tools, Weapons, Food, Materials, etc.) */
  category: string;
  /** Description text */
  description: string;
  /** List of required ingredients */
  ingredients: RecipeIngredient[];
  /** Output item */
  output: RecipeOutput;
  /** Base crafting time in seconds */
  craftingTime: number;
  /** XP gained when crafted */
  xpGain: number;
  /** Required workstation type (null for hand crafting) */
  stationRequired: string | null;
  /** Skill requirements to unlock */
  skillRequirements: SkillRequirement[];
  /** Research requirements to unlock */
  researchRequirements: string[];
  /** Optional icon path */
  icon?: string;
  /** Tool types required for crafting (e.g., ['hammer', 'saw']) */
  requiredTools?: string[];
}

/**
 * Recipe category types.
 */
export type RecipeCategory = 'All' | 'Tools' | 'Weapons' | 'Food' | 'Materials' | 'Building' | 'Decorations';

/**
 * Valid recipe categories.
 */
export const RECIPE_CATEGORIES: RecipeCategory[] = [
  'All',
  'Tools',
  'Weapons',
  'Food',
  'Materials',
  'Building',
  'Decorations'
];
