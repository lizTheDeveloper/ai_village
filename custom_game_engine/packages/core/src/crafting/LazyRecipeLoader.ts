/**
 * Lazy Recipe Loader
 *
 * Defers recipe registration until first access to reduce startup time.
 * Recipes are only loaded when:
 * - Crafting UI opens
 * - Recipe query is made
 * - Crafting system needs recipe data
 */

import { RecipeRegistry, globalRecipeRegistry, initializeDefaultRecipes } from './RecipeRegistry.js';

// Track if recipes have been loaded
let recipesLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Ensure default recipes are loaded (idempotent).
 * Returns immediately if already loaded, otherwise loads recipes once.
 */
export async function ensureRecipesLoaded(registry: RecipeRegistry = globalRecipeRegistry): Promise<void> {
  if (recipesLoaded) {
    return;
  }

  // If already loading, wait for that promise
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = initializeDefaultRecipes(registry).then(() => {
    recipesLoaded = true;
    loadPromise = null;
  });

  return loadPromise;
}

/**
 * Check if recipes have been loaded (synchronous).
 */
export function areRecipesLoaded(): boolean {
  return recipesLoaded;
}

/**
 * Reset lazy loading state (for testing).
 */
export function resetRecipeLoader(): void {
  recipesLoaded = false;
  loadPromise = null;
}
