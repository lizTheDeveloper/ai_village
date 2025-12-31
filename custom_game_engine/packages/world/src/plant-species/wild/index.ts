/**
 * Wild Plants - Organized by Category
 *
 * This module re-exports wild plants organized by their category
 * for easier navigation and maintainability.
 */

// Import all from the original file
import {
  GRASS,
  WILDFLOWER,
  BERRY_BUSH,
  TREE,
  WILD_PLANTS,
} from '../wild-plants.js';

// Re-export individual plants
export {
  GRASS,
  WILDFLOWER,
  BERRY_BUSH,
  TREE,
  WILD_PLANTS,
};

// Category groupings for easier access
export const BASIC_PLANTS = [GRASS, WILDFLOWER, BERRY_BUSH, TREE];

// Type helpers
export type BasicPlantId = 'grass' | 'wildflower' | 'berry-bush' | 'tree';
