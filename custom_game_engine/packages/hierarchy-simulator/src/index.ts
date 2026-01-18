/**
 * Hierarchy Simulator - Package Exports
 *
 * Grand strategy abstraction layer for simulating massive-scale civilizations
 * with statistical renormalization and multi-tier simulation.
 */

// ============================================================================
// Abstraction Tiers
// ============================================================================

export {
  AbstractTierBase,
  AbstractMegasegment,
  AbstractGigasegment,
  AbstractPlanet,
  AbstractSystem,
  AbstractSector,
  AbstractGalaxy,
} from './abstraction/index.js';

export type {
  UniversalAddress,
  TradeRoute,
  TierLevel,
  SimulationMode,
  PopulationStats,
  EconomicState,
  AbstractTier,
  TransportHub,
  ProductionFacility,
  CulturalIdentity,
  ResourceType,
  ResourceFlow,
  StabilityMetrics,
  TechProgress,
  GameEvent,
  EventType,
  SimulationStats,
} from './abstraction/types.js';

export { TIER_SCALES, RESOURCE_TYPES } from './abstraction/types.js';

// ============================================================================
// Adapters (Phase 2)
// ============================================================================

export {
  PlanetTierAdapter,
  SystemTierAdapter,
} from './adapters/index.js';

export type {
  ResourceSummary,
  SystemConfig,
  SystemResourceSummary,
} from './adapters/index.js';

// ============================================================================
// Renormalization Engine
// ============================================================================

export { RenormalizationEngine } from './renormalization/RenormalizationEngine.js';
export { TIER_CONSTANTS } from './renormalization/TierConstants.js';

// ============================================================================
// Simulation Controller
// ============================================================================

export { SimulationController } from './simulation/SimulationController.js';

// ============================================================================
// Renderers
// ============================================================================

export { HierarchyDOMRenderer } from './renderers/HierarchyDOMRenderer.js';

// ============================================================================
// Research System
// ============================================================================

export type {
  ResearchPaper,
  ResearchField,
  ScientistTier,
} from './research/ResearchTypes.js';

export { ScientistEmergence } from './research/ScientistEmergence.js';

// ============================================================================
// Mock Data Generator (for testing)
// ============================================================================

export { DataGenerator } from './mock/DataGenerator.js';
