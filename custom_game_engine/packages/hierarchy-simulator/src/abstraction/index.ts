/**
 * Abstraction Tier Classes - Export all hierarchy abstraction tiers
 *
 * Phase 1: Core tiers (AbstractMegasegment, AbstractGigasegment)
 * Phase 1 Extended: Interstellar tiers (AbstractPlanet, AbstractSystem, AbstractSector, AbstractGalaxy)
 */

// Core abstraction tiers
export { AbstractMegasegment } from './AbstractMegasegment.js';
export { AbstractGigasegment } from './AbstractGigasegment.js';

// Interstellar abstraction tiers (Phase 1 Extended)
export { AbstractPlanet } from './AbstractPlanet.js';
export { AbstractSystem } from './AbstractSystem.js';
export { AbstractSector } from './AbstractSector.js';
export { AbstractGalaxy } from './AbstractGalaxy.js';

// Base class and types
export { AbstractTierBase } from './AbstractTierBase.js';
export type {
  UniversalAddress,
  Population,
  Technology,
  Resources,
  TradeRoute,
  Conflict,
} from './types.js';
