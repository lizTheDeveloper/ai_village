import { beforeEach } from 'vitest';
import {
  globalRecipeRegistry,
  initializeDefaultRecipes,
  itemRegistry,
  registerDefaultItems,
  registerDefaultSeeds,
} from '@ai-village/core';

// Polyfill ResizeObserver for jsdom (used by charting libraries)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Initialize default items and recipes before each test
// This ensures tests have access to standard items like wood, stone, berry, etc.
beforeEach(() => {
  // Clear any existing recipes
  (globalRecipeRegistry as any).recipes.clear();

  // Clear any existing items and re-register defaults
  itemRegistry.clear();
  registerDefaultItems(itemRegistry);
  registerDefaultSeeds(itemRegistry);

  // Initialize default recipes
  initializeDefaultRecipes();
});
