/**
 * Alien Creature Component Library
 *
 * Mix-and-match components for generating infinite alien creature varieties.
 *
 * Each category is in its own file for easy expansion.
 */

export * from './BodyPlans.js';
export * from './Locomotion.js';
export * from './SensorySystems.js';
export * from './DietPatterns.js';
export * from './SocialStructures.js';
export * from './DefensiveSystems.js';
export * from './ReproductionStrategies.js';
export * from './IntelligenceLevels.js';

// Re-export for convenience
export { BODY_PLANS } from './BodyPlans.js';
export { LOCOMOTION_METHODS } from './Locomotion.js';
export { SENSORY_SYSTEMS } from './SensorySystems.js';
export { DIET_PATTERNS } from './DietPatterns.js';
export { SOCIAL_STRUCTURES } from './SocialStructures.js';
export { DEFENSIVE_SYSTEMS } from './DefensiveSystems.js';
export { REPRODUCTION_STRATEGIES } from './ReproductionStrategies.js';
export { INTELLIGENCE_LEVELS } from './IntelligenceLevels.js';
