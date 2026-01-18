/**
 * Adapters - Bridge world.Planet with hierarchy-simulator abstractions
 *
 * Phase 2: Planet and System tier adapters
 *
 * These adapters convert between:
 * - Real Planet instances (from @ai-village/world) with terrain and entities
 * - Abstract tiers (from hierarchy-simulator) with statistical simulation
 *
 * Purpose: Enable grand strategy simulation to use actual planet data from the ECS world.
 */

export { PlanetTierAdapter } from './PlanetTierAdapter.js';
export type { ResourceSummary } from './PlanetTierAdapter.js';

export { SystemTierAdapter } from './SystemTierAdapter.js';
export type { SystemConfig, SystemResourceSummary } from './SystemTierAdapter.js';
