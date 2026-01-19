import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * MergeCompatibilityComponent - Track merge compatibility between universes
 *
 * Used by TimelineMergerSystem to determine if two timeline branches can be merged.
 * Branches can merge if they:
 * 1. Share a common ancestor
 * 2. Have divergence < 0.3
 * 3. All conflicts are resolvable
 *
 * Spec reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

/**
 * Result of compatibility check between two branches
 */
export interface BranchCompatibility {
  /** Can the branches be merged? */
  compatible: boolean;

  /** If incompatible, why? */
  reason?: string;

  /** List of conflicts found */
  conflicts: MergeConflict[];

  /** Divergence score (0-1, where 0 = identical) */
  divergenceScore: number;
}

/**
 * Conflict type when merging two branches
 */
export type MergeConflictType =
  | 'agent_state'          // Agent exists in both but with different state
  | 'building_exists'      // Building exists in one but not the other
  | 'item_quantity'        // Item has different quantities
  | 'terrain_difference';  // Terrain differs (usually unresolvable)

/**
 * Individual merge conflict
 */
export interface MergeConflict {
  /** Type of conflict */
  conflictType: MergeConflictType;

  /** Entity ID that conflicts */
  entityId: string;

  /** Value in parent branch (branch1) */
  parentValue: unknown;

  /** Value in fork branch (branch2) */
  forkValue: unknown;

  /** Can this conflict be automatically resolved? */
  resolvable: boolean;
}

/**
 * Result of merge operation
 */
export interface MergeResult {
  /** Did the merge succeed? */
  success: boolean;

  /** If failed, why? */
  reason?: string;

  /** ID of merged universe (if successful) */
  mergedUniverseId?: string;

  /** Number of conflicts resolved */
  conflictsResolved?: number;

  /** Required coherence for timeline_merger ship */
  requiredCoherence?: number;

  /** Actual coherence of ship */
  actualCoherence?: number;

  /** Conflicts that prevented merge (if failed) */
  conflicts?: MergeConflict[];
}

/**
 * MergeCompatibilityComponent - Attached to universe entity or timeline_merger ship
 * to track merge state and compatibility with other branches.
 */
export interface MergeCompatibilityComponent extends Component {
  type: 'merge_compatibility';

  /**
   * Last compatibility check performed
   */
  lastCheck?: {
    /** Target universe ID checked */
    targetUniverseId: string;

    /** When check was performed (tick) */
    checkedAt: number;

    /** Result of compatibility check */
    result: BranchCompatibility;
  };

  /**
   * Merge operation in progress
   */
  activeMerge?: {
    /** Branches being merged */
    branch1Id: string;
    branch2Id: string;

    /** When merge started (tick) */
    startedAt: number;

    /** Timeline merger ship performing merge */
    mergerShipId: string;

    /** Current merge status */
    status: 'checking_compatibility' | 'resolving_conflicts' | 'creating_merged_universe' | 'marking_branches_merged';
  };

  /**
   * Last merge result
   */
  lastMergeResult?: MergeResult;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMergeCompatibilityComponent(): MergeCompatibilityComponent {
  return {
    type: 'merge_compatibility',
    version: 1,
  };
}

// ============================================================================
// Schema
// ============================================================================

export const MergeCompatibilityComponentSchema: ComponentSchema<MergeCompatibilityComponent> = {
  type: 'merge_compatibility',
  version: 1,
  fields: [
    { name: 'lastCheck', type: 'object', required: false },
    { name: 'activeMerge', type: 'object', required: false },
    { name: 'lastMergeResult', type: 'object', required: false },
  ],
  validate: (data: unknown): data is MergeCompatibilityComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'merge_compatibility') return false;
    return true;
  },
  createDefault: () => createMergeCompatibilityComponent(),
};
