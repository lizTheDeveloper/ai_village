/**
 * CookingSkillComponent - Tracks cooking-specific abilities
 *
 * @deprecated The `level` field is deprecated. Use `SkillsComponent.levels.cooking` instead.
 *
 * This component now supplements `SkillsComponent` by tracking cooking-specific data:
 * - Recipe familiarity = quality bonus for frequently made dishes
 * - Specializations = bonuses for specific cooking methods (baking, grilling, etc.)
 * - Signature dish tracking
 *
 * For base cooking skill level, use the unified `SkillsComponent`:
 * ```typescript
 * const skillsComp = entity.getComponent<SkillsComponent>('skills');
 * const cookingLevel = skillsComp?.levels.cooking ?? 0; // 0-5 scale
 * ```
 *
 * For cooking-specific bonuses, use this component:
 * ```typescript
 * const cookingSkill = entity.getComponent<CookingSkillComponent>('cooking_skill');
 * const familiarityBonus = cookingSkill?.recipeExperience[recipeId]?.qualityBonus ?? 0;
 * ```
 *
 * Part of Phase 4: Cooking Skill System
 */

import type { Component } from '../ecs/Component.js';

/**
 * Cooking method specializations.
 * Agents develop expertise in specific cooking techniques.
 */
export interface CookingSpecializations {
  /** Bread, pastries, pies */
  baking: number;
  /** Roasting, searing, BBQ */
  grilling: number;
  /** Soups, stews, boiling */
  stewing: number;
  /** Drying, smoking, pickling */
  preservation: number;
}

/**
 * Recipe complexity levels for experience tracking.
 */
export type RecipeComplexity = 'simple' | 'intermediate' | 'advanced' | 'masterwork';

/**
 * Experience tracking by recipe complexity.
 */
export interface CookingExperience {
  simple: number;
  intermediate: number;
  advanced: number;
  masterwork: number;
}

/**
 * Tracks experience with a specific recipe.
 */
export interface RecipeExperience {
  /** Number of times this recipe has been made */
  timesMade: number;
  /** Quality bonus from familiarity (increases with practice) */
  qualityBonus: number;
  /** Best quality ever achieved with this recipe */
  bestQuality: number;
  /** Last time this recipe was made (tick) */
  lastMade: number;
}

/**
 * CookingSkillComponent tracks an agent's cooking abilities.
 */
export interface CookingSkillComponent extends Component {
  type: 'cooking_skill';

  /**
   * Overall cooking skill level (0-100)
   * @deprecated Use SkillsComponent.levels.cooking (0-5 scale) instead.
   * This field is kept for backward compatibility with recipe familiarity tracking.
   */
  level: number;

  /** Total cooking XP accumulated */
  totalXp: number;

  /** Experience accumulated by recipe complexity */
  experience: CookingExperience;

  /** Specialization levels for different cooking methods */
  specializations: CookingSpecializations;

  /** Recipe IDs the agent knows how to cook */
  knownRecipes: string[];

  /** Experience with specific recipes */
  recipeExperience: Record<string, RecipeExperience>;

  /** Number of total dishes cooked */
  dishesCooked: number;

  /** Signature dish - recipe with highest quality bonus */
  signatureDish?: string;
}

/**
 * Create a new CookingSkillComponent with starting values.
 */
export function createCookingSkillComponent(): CookingSkillComponent {
  return {
    type: 'cooking_skill',
    version: 1,
    level: 1,
    totalXp: 0,
    experience: {
      simple: 0,
      intermediate: 0,
      advanced: 0,
      masterwork: 0,
    },
    specializations: {
      baking: 0,
      grilling: 0,
      stewing: 0,
      preservation: 0,
    },
    knownRecipes: [],
    recipeExperience: {},
    dishesCooked: 0,
    signatureDish: undefined,
  };
}

/**
 * XP required to reach each level (1-100).
 * Uses a simple quadratic curve.
 */
function xpForLevel(level: number): number {
  return level * level * 10;
}

/**
 * Calculate level from total XP.
 */
export function calculateLevelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp && level < 100) {
    level++;
  }
  return level;
}

/**
 * Add cooking XP and update level.
 */
export function addCookingXp(
  component: CookingSkillComponent,
  xp: number,
  complexity: RecipeComplexity
): CookingSkillComponent {
  const newTotalXp = component.totalXp + xp;
  const newLevel = calculateLevelFromXp(newTotalXp);

  return {
    ...component,
    totalXp: newTotalXp,
    level: newLevel,
    experience: {
      ...component.experience,
      [complexity]: component.experience[complexity] + xp,
    },
  };
}

/**
 * Record that a recipe was made and update familiarity.
 */
export function recordRecipeMade(
  component: CookingSkillComponent,
  recipeId: string,
  quality: number,
  tick: number
): CookingSkillComponent {
  const existing = component.recipeExperience[recipeId];

  const timesMade = (existing?.timesMade || 0) + 1;
  // Quality bonus increases logarithmically with practice, caps at 20
  const qualityBonus = Math.min(20, Math.floor(Math.log2(timesMade + 1) * 5));
  const bestQuality = Math.max(existing?.bestQuality || 0, quality);

  const newRecipeExperience = {
    ...component.recipeExperience,
    [recipeId]: {
      timesMade,
      qualityBonus,
      bestQuality,
      lastMade: tick,
    },
  };

  // Update signature dish if this has highest quality bonus
  let signatureDish = component.signatureDish;
  const currentSignatureBonus = signatureDish
    ? component.recipeExperience[signatureDish]?.qualityBonus || 0
    : 0;
  if (qualityBonus > currentSignatureBonus) {
    signatureDish = recipeId;
  }

  // Add to known recipes if not already known
  const knownRecipes = component.knownRecipes.includes(recipeId)
    ? component.knownRecipes
    : [...component.knownRecipes, recipeId];

  return {
    ...component,
    recipeExperience: newRecipeExperience,
    signatureDish,
    knownRecipes,
    dishesCooked: component.dishesCooked + 1,
  };
}

/**
 * Get the specialization type for a recipe based on its station.
 */
export function getSpecializationForStation(
  stationRequired: string | null
): keyof CookingSpecializations | null {
  switch (stationRequired) {
    case 'oven':
      return 'baking';
    case 'campfire':
    case 'grill':
      return 'grilling';
    case 'cauldron':
    case 'pot':
      return 'stewing';
    case 'smoker':
    case 'drying_rack':
      return 'preservation';
    default:
      return null;
  }
}

/**
 * Add specialization experience.
 */
export function addSpecializationXp(
  component: CookingSkillComponent,
  specialization: keyof CookingSpecializations,
  xp: number
): CookingSkillComponent {
  return {
    ...component,
    specializations: {
      ...component.specializations,
      [specialization]: Math.min(100, component.specializations[specialization] + xp),
    },
  };
}

/**
 * Calculate food quality when cooking.
 * Factors: base skill, recipe familiarity, specialization, mood.
 *
 * @deprecated Use CookingSystem.calculateCookingQuality() instead.
 * This function uses the old level-based calculation. The new system
 * uses SkillsComponent.levels.cooking for base quality and applies
 * skill synergy bonuses.
 */
export function calculateFoodQuality(
  component: CookingSkillComponent,
  recipeId: string,
  stationRequired: string | null,
  moodBonus: number = 0
): number {
  let quality = 50; // Base quality

  // Skill bonus (0-30 based on level 0-100)
  const skillBonus = (component.level / 100) * 30;
  quality += skillBonus;

  // Recipe familiarity bonus (0-20)
  const recipeExp = component.recipeExperience[recipeId];
  if (recipeExp) {
    quality += recipeExp.qualityBonus;
  }

  // Specialization bonus (0-10)
  const specialization = getSpecializationForStation(stationRequired);
  if (specialization) {
    const specLevel = component.specializations[specialization];
    quality += (specLevel / 100) * 10;
  }

  // Mood bonus (-10 to +10)
  quality += Math.max(-10, Math.min(10, moodBonus));

  // Random variance (-5 to +5)
  const variance = (Math.random() - 0.5) * 10;
  quality += variance;

  return Math.max(0, Math.min(100, Math.round(quality)));
}

/**
 * Get a text description of cooking skill for LLM context.
 */
export function getCookingSkillDescription(component: CookingSkillComponent): string {
  const levelDesc =
    component.level >= 80
      ? 'master chef'
      : component.level >= 60
        ? 'skilled cook'
        : component.level >= 40
          ? 'competent cook'
          : component.level >= 20
            ? 'novice cook'
            : 'beginner cook';

  const parts: string[] = [`${levelDesc} (level ${component.level})`];

  // Add signature dish if present
  if (component.signatureDish) {
    parts.push(`signature dish: ${component.signatureDish}`);
  }

  // Add top specialization
  const specs = Object.entries(component.specializations) as [keyof CookingSpecializations, number][];
  const topSpec = specs.reduce((best, current) => (current[1] > best[1] ? current : best));
  if (topSpec[1] >= 20) {
    parts.push(`specializes in ${topSpec[0]}`);
  }

  return parts.join(', ');
}

/**
 * Determine recipe complexity from crafting time and XP gain.
 */
export function determineRecipeComplexity(craftingTime: number, xpGain: number): RecipeComplexity {
  const score = craftingTime + xpGain;
  if (score >= 60) return 'masterwork';
  if (score >= 30) return 'advanced';
  if (score >= 15) return 'intermediate';
  return 'simple';
}
