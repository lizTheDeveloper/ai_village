/**
 * KnowledgeRepositoryComponent - Preserves knowledge during civilizational collapses
 *
 * This component tracks buildings that can preserve technologies during dark ages:
 * - Libraries, monasteries, universities preserve knowledge
 * - Each repository has a preservation capacity
 * - During collapse, repositories roll to preserve technologies
 * - Over time, repositories can rediscover lost knowledge
 * - Higher-tech eras add genetic/quantum archives for preservation
 *
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import type { Component } from '../ecs/Component.js';

/**
 * Repository type determines preservation capacity and discovery bonus
 */
export type RepositoryType =
  | 'library'            // Era 2+: Basic knowledge storage
  | 'monastery'          // Era 4+: Religious preservation
  | 'university'         // Era 3+: Advanced research and teaching
  | 'genetic_archive'    // Era 9+: DNA-encoded knowledge storage
  | 'quantum_archive';   // Era 12+: Quantum state knowledge preservation

/**
 * KnowledgeRepositoryComponent - Marks buildings that preserve knowledge
 *
 * Attached to building entities (Library, Monastery, University, etc.)
 */
export interface KnowledgeRepositoryComponent extends Component {
  type: 'knowledge_repository';

  // ========== Repository Identity ==========

  /** Type of repository (determines capacity and bonuses) */
  repositoryType: RepositoryType;

  /** Civilization ID this repository belongs to */
  civilizationId: string;

  // ========== Preservation Capacity ==========

  /**
   * Maximum number of technologies this repository can preserve.
   * Default values:
   * - library: 10
   * - monastery: 8
   * - university: 15
   * - genetic_archive: 50
   * - quantum_archive: 200
   */
  preservationCapacity: number;

  /**
   * Technologies currently preserved in this repository.
   * Populated during collapse events.
   */
  preservedTechnologies: string[];

  // ========== Discovery Mechanics ==========

  /**
   * Multiplier for rediscovery chance (base 1%).
   * - library: 1.0x
   * - monastery: 0.8x (slower but more reliable preservation)
   * - university: 1.5x (faster research)
   * - genetic_archive: 2.0x
   * - quantum_archive: 3.0x
   */
  discoveryBonus: number;

  /**
   * Tick when last rediscovery attempt was made.
   * Used to throttle rediscovery checks.
   */
  lastRediscoveryAttemptTick: number;

  // ========== Maintenance & Degradation ==========

  /**
   * Physical condition of the repository (0-100).
   * - 100: Perfect condition, full capacity
   * - 50: Half capacity, higher loss chance
   * - 0: Ruined, no preservation
   *
   * Degrades over time without maintenance.
   * Repairs restore condition.
   */
  conditionLevel: number;

  /**
   * Tick when condition was last updated.
   * Used to calculate degradation.
   */
  lastMaintenanceTick: number;

  // ========== Statistics ==========

  /** Number of technologies rediscovered by this repository */
  rediscoveriesCount: number;

  /** Number of technologies lost due to degradation */
  lostToDecayCount: number;

  /** Tick when repository was built */
  builtAtTick: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Repository type metadata for determining default values
 */
interface RepositoryTypeMetadata {
  preservationCapacity: number;
  discoveryBonus: number;
  description: string;
}

/**
 * Repository type metadata lookup
 */
export const REPOSITORY_TYPE_METADATA: Record<RepositoryType, RepositoryTypeMetadata> = {
  library: {
    preservationCapacity: 10,
    discoveryBonus: 1.0,
    description: 'Basic knowledge storage and lending',
  },
  monastery: {
    preservationCapacity: 8,
    discoveryBonus: 0.8,
    description: 'Religious preservation, slower but more reliable',
  },
  university: {
    preservationCapacity: 15,
    discoveryBonus: 1.5,
    description: 'Advanced research and teaching institution',
  },
  genetic_archive: {
    preservationCapacity: 50,
    discoveryBonus: 2.0,
    description: 'DNA-encoded knowledge storage (Era 9+)',
  },
  quantum_archive: {
    preservationCapacity: 200,
    discoveryBonus: 3.0,
    description: 'Quantum state knowledge preservation (Era 12+)',
  },
};

/**
 * Create a KnowledgeRepositoryComponent for a building
 */
export function createKnowledgeRepositoryComponent(
  repositoryType: RepositoryType,
  civilizationId: string,
  tick: number
): KnowledgeRepositoryComponent {
  const metadata = REPOSITORY_TYPE_METADATA[repositoryType];

  return {
    type: 'knowledge_repository',
    version: 1,

    // Identity
    repositoryType,
    civilizationId,

    // Capacity
    preservationCapacity: metadata.preservationCapacity,
    preservedTechnologies: [],

    // Discovery
    discoveryBonus: metadata.discoveryBonus,
    lastRediscoveryAttemptTick: tick,

    // Maintenance
    conditionLevel: 100, // Start at perfect condition
    lastMaintenanceTick: tick,

    // Statistics
    rediscoveriesCount: 0,
    lostToDecayCount: 0,
    builtAtTick: tick,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if repository can preserve knowledge (condition > 0)
 */
export function canPreserveKnowledge(component: KnowledgeRepositoryComponent): boolean {
  return component.conditionLevel > 0;
}

/**
 * Get effective preservation capacity based on condition
 */
export function getEffectiveCapacity(component: KnowledgeRepositoryComponent): number {
  const conditionMultiplier = component.conditionLevel / 100;
  return Math.floor(component.preservationCapacity * conditionMultiplier);
}

/**
 * Get effective discovery bonus based on condition
 */
export function getEffectiveDiscoveryBonus(component: KnowledgeRepositoryComponent): number {
  const conditionMultiplier = component.conditionLevel / 100;
  return component.discoveryBonus * conditionMultiplier;
}

/**
 * Add a preserved technology to the repository
 * Returns true if successfully added, false if at capacity
 */
export function preserveTechnology(
  component: KnowledgeRepositoryComponent,
  techId: string
): boolean {
  const effectiveCapacity = getEffectiveCapacity(component);

  // Already preserved?
  if (component.preservedTechnologies.includes(techId)) {
    return true;
  }

  // At capacity?
  if (component.preservedTechnologies.length >= effectiveCapacity) {
    return false;
  }

  component.preservedTechnologies.push(techId);
  return true;
}

/**
 * Remove a technology from preservation (due to decay or rediscovery)
 */
export function removeTechnology(
  component: KnowledgeRepositoryComponent,
  techId: string
): void {
  const index = component.preservedTechnologies.indexOf(techId);
  if (index !== -1) {
    component.preservedTechnologies.splice(index, 1);
  }
}

/**
 * Calculate degradation rate based on repository type and era
 * Returns condition points lost per 1000 ticks (~50 seconds)
 */
export function calculateDegradationRate(
  component: KnowledgeRepositoryComponent,
  currentEraIndex: number
): number {
  // Base degradation: 1 point per 1000 ticks
  let degradationRate = 1;

  // Monasteries degrade slower (religious care)
  if (component.repositoryType === 'monastery') {
    degradationRate *= 0.5;
  }

  // Advanced repositories degrade slower (better materials/tech)
  if (component.repositoryType === 'genetic_archive') {
    degradationRate *= 0.3;
  }
  if (component.repositoryType === 'quantum_archive') {
    degradationRate *= 0.1;
  }

  // During dark ages (era regression), degradation accelerates
  // This is approximated by checking if current era is low
  if (currentEraIndex <= 2) {
    degradationRate *= 2; // Double degradation during early eras
  }

  return degradationRate;
}
