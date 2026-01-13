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
  BLUEBERRY_BUSH,
  RASPBERRY_BUSH,
  BLACKBERRY_BUSH,
  TREE,
  WILD_PLANTS,
} from '../wild-plants.js';

// Re-export individual plants
export {
  GRASS,
  WILDFLOWER,
  BLUEBERRY_BUSH,
  RASPBERRY_BUSH,
  BLACKBERRY_BUSH,
  TREE,
  WILD_PLANTS,
};

// Category groupings for easier access
export const BASIC_PLANTS = [GRASS, WILDFLOWER, BLUEBERRY_BUSH, TREE];
export const BERRY_BUSHES = [BLUEBERRY_BUSH, RASPBERRY_BUSH, BLACKBERRY_BUSH];

// Type helpers
export type BasicPlantId = 'grass' | 'wildflower' | 'blueberry-bush' | 'tree';
export type BerryBushId = 'blueberry-bush' | 'raspberry-bush' | 'blackberry-bush';
