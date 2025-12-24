/**
 * @ai-village/core - Game engine core
 *
 * Entity-Component-System architecture with:
 * - Events for system communication
 * - Actions for agent intent
 * - Serialization for save/load
 * - Fixed 20 TPS game loop
 */

export * from './types.js';
export * from './ecs/index.js';
export * from './events/index.js';
export * from './actions/index.js';
export * from './serialization/index.js';
export * from './loop/index.js';
export * from './components/index.js';
export * from './systems/index.js';
export * from './buildings/index.js';
export * from './archetypes/index.js';
export * from './types/PlantSpecies.js';
export * from './genetics/PlantGenetics.js';
export * from './data/index.js';
export * from './metrics/events/index.js';
export * from './crafting/index.js';
