/**
 * Alien Generation Module
 *
 * Libraries for procedurally generating alien creatures, plants, and weather phenomena.
 *
 * Includes both high-level components and detailed libraries:
 * - creatures/ - Detailed creature generation components (body plans, locomotion, etc.)
 * - plants/ - Detailed plant generation components (growth, energy, defense, etc.)
 * - weather/ - Weather & natural phenomena components
 */

// High-level components
export * from './AlienCreatureComponents.js';
export * from './AlienPlantComponents.js';
export * from './WeatherPhenomenaComponents.js';

// Alien species generator (LLM-powered procedural generation)
export {
  type AlienGenerationConstraints,
  type GeneratedAlienSpecies,
  AlienSpeciesGenerator,
  createAlienSpeciesGenerator,
} from './AlienSpeciesGenerator.js';

// Granular creature components
export {
  BODY_PLANS,
  LOCOMOTION_METHODS,
  SENSORY_SYSTEMS,
  DIET_PATTERNS,
  SOCIAL_STRUCTURES,
  DEFENSIVE_SYSTEMS,
  REPRODUCTION_STRATEGIES,
  INTELLIGENCE_LEVELS,
} from './creatures/index.js';

// Granular plant components
export {
  GROWTH_PATTERNS,
  ENERGY_METHODS,
  DEFENSE_MECHANISMS,
  REPRODUCTION_METHODS,
} from './plants/index.js';

// Note: Weather components are already exported from WeatherPhenomenaComponents.js
// For granular weather access, import directly from './weather/index.js'
