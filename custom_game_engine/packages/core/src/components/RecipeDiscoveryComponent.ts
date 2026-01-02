/**
 * RecipeDiscoveryComponent - Tracks agent's recipe experimentation
 *
 * Agents can experiment with ingredient combinations to discover new recipes.
 * This component tracks:
 * - Experiments attempted
 * - Discoveries made
 * - Creativity score
 * - Failed combinations (to avoid repeating)
 */

import type { Component } from '../ecs/Component.js';
import type { RecipeType, ExperimentIngredient } from '../crafting/LLMRecipeGenerator.js';

/**
 * Record of a single experiment attempt
 */
export interface ExperimentAttempt {
  /** Tick when experiment was attempted */
  tick: number;
  /** Type of recipe attempted */
  recipeType: RecipeType;
  /** Ingredients used */
  ingredients: ExperimentIngredient[];
  /** Whether it was successful */
  success: boolean;
  /** ID of created recipe if successful */
  recipeId?: string;
  /** Creativity score awarded */
  creativityScore: number;
}

/**
 * A discovered recipe
 */
export interface DiscoveredRecipe {
  /** Recipe ID */
  recipeId: string;
  /** Display name */
  name: string;
  /** Tick when discovered */
  discoveredAt: number;
  /** Type of recipe */
  recipeType: RecipeType;
  /** Number of times crafted since discovery */
  timesCrafted: number;
}

/**
 * RecipeDiscoveryComponent tracks an agent's experimentation history
 */
export interface RecipeDiscoveryComponent extends Component {
  type: 'recipe_discovery';

  /** Total experiments attempted */
  totalExperiments: number;

  /** Successful discoveries */
  successfulDiscoveries: number;

  /** Cumulative creativity score */
  totalCreativityScore: number;

  /** List of all discovered recipes */
  discoveries: DiscoveredRecipe[];

  /** Recent experiment history (last 20) */
  recentExperiments: ExperimentAttempt[];

  /** Failed ingredient combinations (hashed) to avoid repeating */
  failedCombinations: Set<string>;

  /** Cooldown - ticks until next experiment allowed */
  experimentCooldown: number;

  /** Experiment specializations (bonus success chance per type) */
  specializations: Record<RecipeType, number>;
}

/**
 * Create a new RecipeDiscoveryComponent with default values
 */
export function createRecipeDiscoveryComponent(): RecipeDiscoveryComponent {
  return {
    type: 'recipe_discovery',
    version: 1,
    totalExperiments: 0,
    successfulDiscoveries: 0,
    totalCreativityScore: 0,
    discoveries: [],
    recentExperiments: [],
    failedCombinations: new Set(),
    experimentCooldown: 0,
    specializations: {
      food: 0,
      clothing: 0,
      art: 0,
      potion: 0,
      tool: 0,
      decoration: 0,
    },
  };
}

/**
 * Hash ingredients to create a unique combination key
 */
export function hashIngredients(ingredients: ExperimentIngredient[]): string {
  // Sort by itemId for consistent hashing
  const sorted = [...ingredients].sort((a, b) => a.itemId.localeCompare(b.itemId));
  return sorted.map(i => `${i.itemId}:${i.quantity}`).join('|');
}

/**
 * Check if a combination has already been tried and failed
 */
export function wasAlreadyTried(
  component: RecipeDiscoveryComponent,
  ingredients: ExperimentIngredient[]
): boolean {
  const hash = hashIngredients(ingredients);
  return component.failedCombinations.has(hash);
}

/**
 * Record an experiment attempt
 */
export function recordExperiment(
  component: RecipeDiscoveryComponent,
  attempt: ExperimentAttempt
): RecipeDiscoveryComponent {
  const newComponent = { ...component };

  // Update totals
  newComponent.totalExperiments = component.totalExperiments + 1;
  newComponent.totalCreativityScore = component.totalCreativityScore + attempt.creativityScore;

  if (attempt.success && attempt.recipeId) {
    newComponent.successfulDiscoveries = component.successfulDiscoveries + 1;

    // Add to discoveries
    newComponent.discoveries = [
      ...component.discoveries,
      {
        recipeId: attempt.recipeId,
        name: attempt.recipeId.replace(/_/g, ' ').replace(/^custom /, ''),
        discoveredAt: attempt.tick,
        recipeType: attempt.recipeType,
        timesCrafted: 0,
      },
    ];

    // Increase specialization for successful type
    newComponent.specializations = {
      ...component.specializations,
      [attempt.recipeType]: Math.min(100, component.specializations[attempt.recipeType] + 5),
    };
  } else {
    // Record failed combination
    const hash = hashIngredients(attempt.ingredients);
    newComponent.failedCombinations = new Set([...component.failedCombinations, hash]);
  }

  // Add to recent experiments (keep last 20)
  newComponent.recentExperiments = [...component.recentExperiments, attempt].slice(-20);

  // Set cooldown (higher for failures to discourage spam)
  newComponent.experimentCooldown = attempt.success ? 100 : 300;

  return newComponent;
}

/**
 * Record that a discovered recipe was crafted
 */
export function recordDiscoveryCrafted(
  component: RecipeDiscoveryComponent,
  recipeId: string
): RecipeDiscoveryComponent {
  const discoveryIndex = component.discoveries.findIndex(d => d.recipeId === recipeId);
  if (discoveryIndex === -1) {
    return component;
  }

  const existingDiscovery = component.discoveries[discoveryIndex];
  if (!existingDiscovery) {
    return component;
  }

  const newDiscoveries = [...component.discoveries];
  newDiscoveries[discoveryIndex] = {
    ...existingDiscovery,
    timesCrafted: existingDiscovery.timesCrafted + 1,
  };

  return {
    ...component,
    discoveries: newDiscoveries,
  };
}

/**
 * Decrease experiment cooldown
 */
export function decreaseCooldown(
  component: RecipeDiscoveryComponent,
  amount: number = 1
): RecipeDiscoveryComponent {
  if (component.experimentCooldown <= 0) {
    return component;
  }

  return {
    ...component,
    experimentCooldown: Math.max(0, component.experimentCooldown - amount),
  };
}

/**
 * Check if agent can experiment
 */
export function canExperiment(component: RecipeDiscoveryComponent): boolean {
  return component.experimentCooldown <= 0;
}

/**
 * Get success chance bonus from specialization
 */
export function getSpecializationBonus(
  component: RecipeDiscoveryComponent,
  recipeType: RecipeType
): number {
  return component.specializations[recipeType] / 100; // 0-1 range
}

/**
 * Get text description for LLM context
 */
export function getDiscoveryDescription(component: RecipeDiscoveryComponent): string {
  const parts: string[] = [];

  // Overall experience
  if (component.successfulDiscoveries >= 10) {
    parts.push('accomplished inventor');
  } else if (component.successfulDiscoveries >= 5) {
    parts.push('experienced experimenter');
  } else if (component.successfulDiscoveries >= 1) {
    parts.push('aspiring inventor');
  } else {
    parts.push('novice experimenter');
  }

  // Best specialization
  const specs = Object.entries(component.specializations) as [RecipeType, number][];
  const topSpec = specs.reduce((best, current) => (current[1] > best[1] ? current : best));
  if (topSpec[1] >= 30) {
    parts.push(`specializes in ${topSpec[0]} creation`);
  }

  // Recent successes
  const recentSuccesses = component.recentExperiments.filter(e => e.success).length;
  if (recentSuccesses >= 3) {
    parts.push('on a creative streak');
  }

  return parts.join(', ');
}

/**
 * Get list of notable discoveries for context
 */
export function getNotableDiscoveries(component: RecipeDiscoveryComponent, limit: number = 5): string[] {
  // Sort by times crafted (most popular first)
  return component.discoveries
    .sort((a, b) => b.timesCrafted - a.timesCrafted)
    .slice(0, limit)
    .map(d => d.name);
}
