/**
 * Factory generation and blueprints for automation systems
 */

export * from './FactoryBlueprintGenerator.js';
export {
  FactoryBlueprintGenerator,
  generateFactory,
} from './FactoryBlueprintGenerator.js';
export type {
  FactoryBlueprint,
  MachinePlacement,
  BeltPlacement,
  PowerPlacement,
  FactoryGenerationResult,
} from './FactoryBlueprintGenerator.js';

export * from './DysonSwarmBlueprints.js';
export {
  IRON_PLATE_DISTRICT,
  STEEL_DISTRICT,
  CIRCUIT_DISTRICT,
  PROCESSING_UNIT_DISTRICT,
  ROCKET_FUEL_DISTRICT,
  SOLAR_SAIL_DISTRICT,
  DYSON_SWARM_FACTORY_CITY,
} from './DysonSwarmBlueprints.js';
