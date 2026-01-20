import type { Component } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Reason for entity corruption
 * Following Conservation of Game Matter principles - never delete, only mark corrupted
 */
export type CorruptionReason =
  | 'timeline_contamination'    // β-space timeline contamination
  | 'exceeded_time_threshold'   // Stranded too long in β-space
  | 'decoherence'              // Lost coherence in β-space
  | 'validation_failed'        // Failed validation checks
  | 'malformed_data'           // Data structure corruption
  | 'logic_error'              // Game logic error
  | 'reality_breaking';        // Physics/reality violation

// ============================================================================
// Interface
// ============================================================================

/**
 * CorruptedComponent - Marks an entity as corrupted but preserved for recovery
 *
 * Following Conservation of Game Matter principles:
 * **NEVER delete entities, souls, items, universes.** Mark as corrupted and preserve.
 *
 * Corrupted entities are preserved for:
 * - Future recovery via data fixer scripts
 * - Emergent gameplay (corrupted content becomes quests/items)
 * - No data loss (players never lose progress permanently)
 * - Debugging (inspect what went wrong)
 * - Lore integration ("Corrupted universes" become part of game world)
 * - Player archaeology (finding broken/old content becomes gameplay)
 *
 * Reference: CORRUPTION_SYSTEM.md
 */
export interface CorruptedComponent extends Component {
  type: 'corrupted';
  version: 1;

  /**
   * Why this entity was corrupted
   */
  corruption_reason: CorruptionReason;

  /**
   * When corruption occurred (world tick)
   */
  corruptedAt: number;

  /**
   * Whether this entity can be recovered/repaired
   */
  recoverable: boolean;

  /**
   * Optional context data specific to corruption type
   * - For ships: originalFleetId, originalSquadronId, contaminationRisk
   * - For data corruption: original_data, validation_errors
   * - For logic errors: error_message, stack_trace
   */
  context?: Record<string, any>;

  /**
   * Optional recovery requirements
   * e.g., ['temporal_anchor', 'coherence_restoration_spell']
   */
  recovery_requirements?: string[];

  /**
   * Danger level if entity is interacted with (0-10)
   * Used for corrupted universes, artifacts, etc.
   */
  danger_level?: number;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new CorruptedComponent
 *
 * @param reason - Why the entity was corrupted
 * @param tick - Current world tick
 * @param recoverable - Whether entity can be recovered (default: true)
 * @param context - Optional context data
 * @returns CorruptedComponent
 */
export function createCorruptedComponent(
  reason: CorruptionReason,
  tick: number,
  recoverable = true,
  context?: Record<string, any>
): CorruptedComponent {
  return {
    type: 'corrupted',
    version: 1,
    corruption_reason: reason,
    corruptedAt: tick,
    recoverable,
    context,
  };
}

/**
 * Create corrupted component for lost ship (straggler that couldn't be recovered)
 *
 * @param tick - Current world tick
 * @param originalFleetId - Fleet ship belonged to
 * @param originalSquadronId - Squadron ship belonged to
 * @param contaminationRisk - Timeline contamination risk (0-1)
 * @param decoherenceRate - Decoherence rate when lost
 * @returns CorruptedComponent configured for lost ship
 */
export function createCorruptedShipComponent(
  tick: number,
  originalFleetId: string,
  originalSquadronId: string,
  contaminationRisk: number,
  decoherenceRate: number
): CorruptedComponent {
  // Determine corruption reason based on contamination risk
  const reason: CorruptionReason =
    contaminationRisk > 0.8
      ? 'timeline_contamination'
      : decoherenceRate > 0.3
        ? 'decoherence'
        : 'exceeded_time_threshold';

  return {
    type: 'corrupted',
    version: 1,
    corruption_reason: reason,
    corruptedAt: tick,
    recoverable: contaminationRisk < 0.9, // Extremely contaminated ships are unrecoverable
    context: {
      originalFleetId,
      originalSquadronId,
      contaminationRisk,
      decoherenceRate,
      entity_type: 'ship',
    },
    recovery_requirements:
      contaminationRisk > 0.5
        ? ['temporal_anchor', 'timeline_cleansing']
        : ['coherence_restoration'],
    danger_level: Math.floor(contaminationRisk * 10),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if corrupted entity can be recovered
 *
 * @param corrupted - CorruptedComponent
 * @returns true if entity is marked as recoverable
 */
export function isRecoverable(corrupted: CorruptedComponent): boolean {
  return corrupted.recoverable;
}

/**
 * Get danger level (0-10)
 * Used to determine risks when interacting with corrupted entities
 *
 * @param corrupted - CorruptedComponent
 * @returns danger level (0-10, default 0)
 */
export function getDangerLevel(corrupted: CorruptedComponent): number {
  return corrupted.danger_level ?? 0;
}

/**
 * Check if entity requires specific recovery items/spells
 *
 * @param corrupted - CorruptedComponent
 * @returns true if recovery requirements exist
 */
export function hasRecoveryRequirements(corrupted: CorruptedComponent): boolean {
  return (corrupted.recovery_requirements?.length ?? 0) > 0;
}
