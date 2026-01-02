/**
 * Consciousness Systems Module
 *
 * Alternative consciousness types beyond individual minds.
 * Based on consciousness-implementation-phases.md Phase 2 specification.
 *
 * "Consciousness is the universe's way of experiencing itself.
 * Hive minds are the universe's way of experiencing itself in bulk."
 *   - Dr. Wei Chen, Xenopsychology Quarterly
 *
 * Modules:
 * - HiveMindSystem: Tiered collective consciousness (Queen/Cerebrate/Worker)
 * - PackMindSystem: Single mind distributed across multiple bodies
 *
 * Integration with existing systems:
 * - CollectiveMindComponent (reproduction/parasitic): Use 'parasitic' species config
 *   for HiveMindSystem to match its range-based communication (1000 units)
 * - HiveCombatComponent: Coordinates with these systems for combat
 *
 * No arbitrary limits - all limits are species-based:
 * - Hive species define: maxCerebrates, workersPerCerebrate, telepathyRange
 * - Pack species define: maxBodies, minBodies, coherenceRange
 */

// Hive Mind System
export {
  HiveMindSystem,
  getHiveMindSystem,
  resetHiveMindSystem,
  // Species Configuration
  type HiveSpeciesConfig,
  HIVE_SPECIES_CONFIGS,
  getHiveSpeciesConfig,
  // Types
  HiveSimulationTier,
  type WorkerTask,
  type HiveRole,
  type HiveDirective,
  type HiveCollective,
  type HiveMemory,
  type HiveMemberComponent,
  // Content
  HIVE_NAMES,
  QUEEN_THOUGHTS,
  WORKER_STATUS_REPORTS,
  CEREBRATE_COMMENTARY,
} from './HiveMindSystem.js';

// Pack Mind System
export {
  PackMindSystem,
  getPackMindSystem,
  resetPackMindSystem,
  // Species Configuration
  type PackSpeciesConfig,
  PACK_SPECIES_CONFIGS,
  getPackSpeciesConfig,
  // Legacy Configuration (deprecated)
  PACK_LIMITS,
  // Types
  type PackFormation,
  type PackBodyRole,
  type PackBody,
  type PackMind,
  type PackMemory,
  type PackMemberComponent,
  // Content
  PACK_NAMES,
  BODY_NICKNAMES,
  PACK_THOUGHTS,
  BODY_LOSS_THOUGHTS,
  FORMATION_ANNOUNCEMENTS,
} from './PackMindSystem.js';
