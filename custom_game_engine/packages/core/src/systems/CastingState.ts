/**
 * CastingState - Tracks active spell casts for multi-tick spells
 *
 * Supports spells with cast times from instant (0 ticks) to epic rituals (hours).
 * Handles interruption conditions (movement, damage, resource depletion, death).
 */

import type { SpellCost } from '../magic/costs/CostCalculator.js';

/**
 * State of an active spell cast.
 * Tracks progress, resource locks, and interruption conditions.
 */
export interface CastingState {
  /** Unique ID of the spell being cast */
  spellId: string;

  /** Entity ID of the caster */
  casterId: string;

  /** Target entity ID (if targeting an entity) */
  targetEntityId?: string;

  /** Target position (if targeting a location) */
  targetPosition?: { x: number; y: number };

  // =========================================================================
  // Timing
  // =========================================================================

  /** Game tick when cast began */
  startedAt: number;

  /** Total ticks required to complete cast */
  duration: number;

  /** Current tick progress (0 to duration) */
  progress: number;

  // =========================================================================
  // Resources
  // =========================================================================

  /** Resources locked during cast (will be restored if interrupted) */
  lockedResources: SpellCost[];

  // =========================================================================
  // State
  // =========================================================================

  /** Whether cast has failed due to interruption */
  failed: boolean;

  /** Reason for failure (if failed) */
  failureReason?: string;

  /** Whether cast completed successfully */
  completed: boolean;

  // =========================================================================
  // Interruption Tracking
  // =========================================================================

  /** Caster's position when cast started (for movement interruption) */
  casterMovedFrom?: { x: number; y: number };

  /** Damage taken during cast (for damage interruption) */
  damageTaken?: number;
}

/**
 * Interruption reasons for spell casts.
 */
export type InterruptionReason =
  | 'movement_interrupted'
  | 'damage_taken'
  | 'resource_depleted_during_cast'
  | 'caster_died'
  | 'target_lost'
  | 'target_died'
  | 'manually_cancelled';

/**
 * Create a new casting state for a spell.
 */
export function createCastingState(
  spellId: string,
  casterId: string,
  duration: number,
  startedAt: number,
  lockedResources: SpellCost[],
  targetEntityId?: string,
  targetPosition?: { x: number; y: number },
  casterPosition?: { x: number; y: number }
): CastingState {
  return {
    spellId,
    casterId,
    targetEntityId,
    targetPosition,
    startedAt,
    duration,
    progress: 0,
    lockedResources,
    failed: false,
    completed: false,
    casterMovedFrom: casterPosition,
    damageTaken: 0,
  };
}

/**
 * Check if a casting state is still active (not failed, not completed).
 */
export function isCastingActive(castState: CastingState): boolean {
  return !castState.failed && !castState.completed;
}

/**
 * Check if a casting state is finished (failed or completed).
 */
export function isCastingFinished(castState: CastingState): boolean {
  return castState.failed || castState.completed;
}
