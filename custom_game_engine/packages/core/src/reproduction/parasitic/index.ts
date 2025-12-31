/**
 * Parasitic Hive Mind Module
 *
 * A complete system for simulating parasitic collective intelligences
 * that propagate through host bodies. Inspired by:
 *
 * - Body Snatchers (Invasion of the Body Snatchers)
 * - Yeerks (Animorphs)
 * - Goa'uld (Stargate)
 * - Cordyceps fungi
 * - The Pluribus concept
 *
 * Key concepts:
 * - Parasites colonize hosts, taking control of their bodies
 * - The collective consciousness coordinates all colonized hosts
 * - Host bodies still reproduce using their own genetics
 * - Offspring are colonized at or shortly after birth
 * - Two separate genetic lineages: host DNA and parasite DNA
 */

// Components
export {
  ParasiticColonizationComponent,
  createPotentialHost,
  createColonizedHost,
  createResistantHost,
  createPreviouslyColonizedHost,
} from './ParasiticColonizationComponent.js';

export type {
  ControlLevel,
  HostPersonalityState,
  ColonizationMethod,
  IntegrationProgress,
  ParasiteInfo,
  HostHistory,
} from './ParasiticColonizationComponent.js';

export {
  CollectiveMindComponent,
  createCollective,
  createExpansionistCollective,
  createInfiltratorCollective,
  createEugenicsCollective,
} from './CollectiveMindComponent.js';

export type {
  CollectiveStrategy,
  ColonizedHostRecord,
  BreedingAssignment,
  ExpansionTarget,
  ParasiteLineage,
} from './CollectiveMindComponent.js';

// Systems
export {
  ParasiticReproductionSystem,
  DEFAULT_PARASITIC_REPRODUCTION_CONFIG,
} from './ParasiticReproductionSystem.js';

export type {
  ParasiticReproductionConfig,
  BreedingAssignedEvent,
  HostOffspringBornEvent,
  ColonizationScheduledEvent,
} from './ParasiticReproductionSystem.js';

export {
  ColonizationSystem,
  DEFAULT_COLONIZATION_CONFIG,
} from './ColonizationSystem.js';

export type {
  ColonizationConfig,
  ColonizationAttemptEvent,
  IntegrationProgressEvent,
  ResistanceAttemptEvent,
  DecolonizationEvent,
  DetectionEvent,
} from './ColonizationSystem.js';
