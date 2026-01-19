/**
 * CastingStateComponent - Tracks active spell casting state
 *
 * Split from MagicComponent Phase 2 - focused component for casting mechanics.
 *
 * Handles:
 * - Whether currently casting
 * - Current spell being cast
 * - Cast progress tracking
 * - Active casting state (for multi-tick casts)
 */

import type { Component } from '../ecs/Component.js';
import type { CastingState } from '../systems/CastingState.js';

/**
 * Tracks active spell casting state.
 *
 * Supports both instant casts and multi-tick channeled spells.
 */
export interface CastingStateComponent extends Component {
  type: 'casting_state';

  /** Whether currently casting */
  casting: boolean;

  /** Current spell being cast (if any) */
  currentSpellId?: string;

  /** Cast progress (0-1) */
  castProgress?: number;

  /** Active casting state (null if not casting) */
  castingState?: CastingState | null;
}

/**
 * Create a default CastingStateComponent (not casting).
 */
export function createCastingStateComponent(): CastingStateComponent {
  return {
    type: 'casting_state',
    version: 1,
    casting: false,
  };
}

/**
 * Check if entity is currently casting.
 */
export function isCasting(component: CastingStateComponent): boolean {
  return component.casting && component.currentSpellId !== undefined;
}

/**
 * Get current cast progress (0-1).
 */
export function getCastProgress(component: CastingStateComponent): number {
  return component.castProgress ?? 0;
}
