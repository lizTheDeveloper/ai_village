import { beforeEach } from 'vitest';
import { globalRecipeRegistry, initializeDefaultRecipes } from '@ai-village/core';

// Initialize default recipes before each test
// This ensures tests have access to standard recipes like stone_axe, bread, etc.
beforeEach(() => {
  // Clear any existing recipes
  (globalRecipeRegistry as any).recipes.clear();

  // Initialize default recipes
  initializeDefaultRecipes();
});
