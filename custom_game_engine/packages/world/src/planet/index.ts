/**
 * Planet System - Exports
 *
 * Planets are visitable locations within a universe with their own
 * terrain generation parameters, biome palettes, and chunk storage.
 */

// Types
export type {
  PlanetType,
  PlanetConfig,
  PlanetSnapshot,
  PlanetPreset,
  CreatePlanetOptions,
} from './PlanetTypes.js';

// Presets
export {
  PLANET_TERRAIN_PRESETS,
  getPlanetPreset,
  createPlanetConfigFromPreset,
  createHomeworldConfig,
  getRandomPlanetType,
} from './PlanetPresets.js';

// Planet class
export { Planet, createPlanet } from './Planet.js';

// Planet initialization
export type { PlanetInitializationOptions } from './PlanetInitializer.js';
export {
  initializePlanet,
  generateRandomPlanetConfig,
} from './PlanetInitializer.js';
