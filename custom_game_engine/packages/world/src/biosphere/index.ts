/**
 * Biosphere System - Exports
 *
 * Procedural alien ecosystem generation for planets.
 */

// Types
export type {
  BiosphereData,
  EcologicalNiche,
  FoodWeb,
  PlanetConditions,
  SizeClass,
  EnergySource,
  VerticalZone,
  NicheCategory,
  ActivityPattern,
} from './BiosphereTypes.js';

// Core generators
export { BiosphereGenerator } from './BiosphereGenerator.js';
export { EcologicalNicheIdentifier } from './EcologicalNicheIdentifier.js';

// Sprite integration
export { queueBiosphereSprites, getQueueStats } from './queueBiosphereSprites.js';
