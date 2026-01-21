/**
 * Hierarchy Adapters - Bridge world.Planet with hierarchy-simulator abstractions
 *
 * These adapters convert between:
 * - Real Planet instances (from @ai-village/world) with terrain and entities
 * - Abstract tiers (from @ai-village/hierarchy-simulator) with statistical simulation
 *
 * Purpose: Enable grand strategy simulation to use actual planet data from the ECS world.
 *
 * NOTE: These adapters were moved from @ai-village/hierarchy-simulator to break
 * the circular dependency: core → hierarchy-simulator → world → core
 *
 * The world package is the correct location since:
 * - PlanetTierAdapter and SystemTierAdapter bridge world.Planet with abstract tiers
 * - world already depends on hierarchy-simulator for abstract tier classes
 * - This maintains a clean dependency graph without cycles
 */

export { PlanetTierAdapter } from './PlanetTierAdapter.js';
export type { ResourceSummary } from './PlanetTierAdapter.js';

export { SystemTierAdapter } from './SystemTierAdapter.js';
export type { SystemConfig, SystemResourceSummary } from './SystemTierAdapter.js';

export { SectorTierAdapter } from './SectorTierAdapter.js';
export type { SectorConfig, SectorResourceSummary } from './SectorTierAdapter.js';

export { GalaxyTierAdapter } from './GalaxyTierAdapter.js';
export type { GalaxyConfig, GalaxyResourceSummary } from './GalaxyTierAdapter.js';
